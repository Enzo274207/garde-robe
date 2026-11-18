-- =========================================================
-- Migration 002 — Fiches enrichies, favoris, nombre de ports (non destructive)
-- Prérequis : 001_securite.sql. Annulation : 002_fiches_down.sql
--
-- Toutes les nouvelles colonnes sont facultatives ou ont une valeur par défaut :
-- les pièces, tenues et historiques existants restent intacts.
-- =========================================================

-- 1) Nouvelle catégorie « veste » (vestes et manteaux)
alter table public.items drop constraint if exists items_category_check;
alter table public.items add constraint items_category_check
  check (category in ('haut', 'bas', 'chaussures', 'veste', 'accessoire'));

-- 2) Caractéristiques facultatives des pièces
alter table public.items
  add column if not exists secondary_colors text[] not null default '{}',
  add column if not exists style text,
  add column if not exists seasons text[] not null default '{}',
  add column if not exists material text,
  add column if not exists warmth smallint,
  add column if not exists formality smallint,
  add column if not exists brand text,
  add column if not exists size text,
  add column if not exists favorite boolean not null default false,
  add column if not exists wear_count integer not null default 0,
  add column if not exists last_worn_on date,
  add column if not exists updated_at timestamptz not null default now();

alter table public.items drop constraint if exists items_levels_range;
alter table public.items add constraint items_levels_range
  check ((warmth is null or warmth between 1 and 5) and (formality is null or formality between 1 and 5));
alter table public.items drop constraint if exists items_text_lengths;
alter table public.items add constraint items_text_lengths
  check (coalesce(char_length(material), 0) <= 40 and coalesce(char_length(brand), 0) <= 40
     and coalesce(char_length(size), 0) <= 12 and coalesce(char_length(style), 0) <= 30
     and cardinality(secondary_colors) <= 4 and cardinality(seasons) <= 4);

-- 3) Tenues : veste, favori, avis (1 = aimée, -1 = refusée), occasion
alter table public.outfits
  add column if not exists jacket_id uuid references public.items (id) on delete set null,
  add column if not exists favorite boolean not null default false,
  add column if not exists rating smallint check (rating in (-1, 1)),
  add column if not exists occasion text,
  add column if not exists updated_at timestamptz not null default now();

-- 4) Historique : veste et lien vers la tenue enregistrée
alter table public.wears
  add column if not exists jacket_id uuid references public.items (id) on delete set null,
  add column if not exists outfit_id uuid references public.outfits (id) on delete set null;

-- 5) Préférences de style dans le profil
alter table public.profiles
  add column if not exists style_prefs jsonb not null default '{}'::jsonb;

-- 6) updated_at automatique (servira à la synchronisation hors connexion)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists items_updated_at on public.items;
create trigger items_updated_at before update on public.items
  for each row execute function public.set_updated_at();
drop trigger if exists outfits_updated_at on public.outfits;
create trigger outfits_updated_at before update on public.outfits
  for each row execute function public.set_updated_at();

-- 7) Nombre de ports et dernière date, recalculés à chaque changement d'historique
create or replace function public.recount_wears()
returns trigger language plpgsql as $$
declare
  ids uuid[] := '{}';
  r jsonb;
begin
  foreach r in array array[to_jsonb(old), to_jsonb(new)] loop
    if r is not null then
      ids := ids || array_remove(array[
        nullif(r ->> 'top_id', '')::uuid, nullif(r ->> 'bottom_id', '')::uuid,
        nullif(r ->> 'shoes_id', '')::uuid, nullif(r ->> 'accessory_id', '')::uuid,
        nullif(r ->> 'jacket_id', '')::uuid], null);
    end if;
  end loop;
  update public.items i set
    wear_count = (select count(*) from public.wears w
                   where w.user_id = i.user_id
                     and i.id in (w.top_id, w.bottom_id, w.shoes_id, w.accessory_id, w.jacket_id)),
    last_worn_on = (select max(w.worn_on) from public.wears w
                   where w.user_id = i.user_id
                     and i.id in (w.top_id, w.bottom_id, w.shoes_id, w.accessory_id, w.jacket_id))
  where i.id = any(ids);
  return null;
end $$;

drop trigger if exists wears_recount on public.wears;
create trigger wears_recount after insert or update or delete on public.wears
  for each row execute function public.recount_wears();

-- 8) Recalcul initial pour l'historique déjà présent
update public.items i set
  wear_count = (select count(*) from public.wears w where w.user_id = i.user_id
                 and i.id in (w.top_id, w.bottom_id, w.shoes_id, w.accessory_id, w.jacket_id)),
  last_worn_on = (select max(w.worn_on) from public.wears w where w.user_id = i.user_id
                 and i.id in (w.top_id, w.bottom_id, w.shoes_id, w.accessory_id, w.jacket_id));
