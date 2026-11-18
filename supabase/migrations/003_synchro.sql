-- =========================================================
-- Migration 003 — Dates de modification pour la synchronisation hors connexion
-- Prérequis : 002_fiches.sql. Annulation : 003_synchro_down.sql (non destructive)
--
-- L'app compare ces dates avant d'envoyer une modification faite hors connexion :
-- si la donnée a changé ailleurs entre-temps, rien n'est écrasé sans ton accord.
-- =========================================================

alter table public.profiles add column if not exists updated_at timestamptz not null default now();
alter table public.wears    add column if not exists updated_at timestamptz not null default now();

-- La date ne bouge que pour une vraie modification de l'utilisateur :
-- le recalcul automatique du nombre de ports ne compte pas.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  if (to_jsonb(new) - 'updated_at' - 'wear_count' - 'last_worn_on')
     is distinct from (to_jsonb(old) - 'updated_at' - 'wear_count' - 'last_worn_on') then
    new.updated_at := now();
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end $$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
drop trigger if exists wears_updated_at on public.wears;
create trigger wears_updated_at before update on public.wears
  for each row execute function public.set_updated_at();
