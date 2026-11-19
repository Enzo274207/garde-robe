-- =========================================================
-- Migration 004 — Plusieurs accessoires dans une tenue (non destructive)
-- Prérequis : 003_synchro.sql. Annulation : 004_accessoires_down.sql
--
-- Le premier accessoire reste dans accessory_id (rien ne change pour les tenues
-- et l'historique déjà enregistrés). Les suivants (2e bague, bracelets…) vont dans
-- une nouvelle liste extra_accessory_ids, vide par défaut.
-- Aucune ligne existante n'est modifiée, aucune colonne n'est retirée ni renommée.
-- =========================================================

-- 1) Liste des accessoires en plus (12 au plus, comme dans l'app)
alter table public.outfits add column if not exists extra_accessory_ids uuid[] not null default '{}';
alter table public.wears   add column if not exists extra_accessory_ids uuid[] not null default '{}';

alter table public.outfits drop constraint if exists outfits_extra_accessories_max;
alter table public.outfits add constraint outfits_extra_accessories_max
  check (cardinality(extra_accessory_ids) <= 12);
alter table public.wears drop constraint if exists wears_extra_accessories_max;
alter table public.wears add constraint wears_extra_accessories_max
  check (cardinality(extra_accessory_ids) <= 12);

-- 2) Sécurité : les accessoires en plus doivent aussi appartenir au même utilisateur
--    (même fonction que la migration 001, avec la nouvelle liste en plus)
create or replace function public.check_items_owner()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  j jsonb := to_jsonb(new);
  ids uuid[];
  bad int;
begin
  ids := array_remove(array[
    nullif(j ->> 'top_id', '')::uuid,
    nullif(j ->> 'bottom_id', '')::uuid,
    nullif(j ->> 'shoes_id', '')::uuid,
    nullif(j ->> 'accessory_id', '')::uuid,
    nullif(j ->> 'jacket_id', '')::uuid
  ], null)
  || coalesce(array(select x::uuid from jsonb_array_elements_text(
       case when jsonb_typeof(j -> 'extra_accessory_ids') = 'array' then j -> 'extra_accessory_ids' else '[]'::jsonb end) as t(x)), '{}');
  select count(*) into bad
    from unnest(ids) as x(id)
    where not exists (select 1 from public.items i where i.id = x.id and i.user_id = new.user_id);
  if bad > 0 then
    raise exception 'Une pièce de la tenue est introuvable ou appartient à un autre utilisateur'
      using errcode = '42501';
  end if;
  return new;
end $$;

-- 3) Nombre de ports : chaque accessoire porté compte (même fonction que la migration 002, liste en plus)
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
        nullif(r ->> 'jacket_id', '')::uuid], null)
        || coalesce(array(select x::uuid from jsonb_array_elements_text(
             case when jsonb_typeof(r -> 'extra_accessory_ids') = 'array' then r -> 'extra_accessory_ids' else '[]'::jsonb end) as t(x)), '{}');
    end if;
  end loop;
  update public.items i set
    wear_count = (select count(*) from public.wears w
                   where w.user_id = i.user_id
                     and (i.id in (w.top_id, w.bottom_id, w.shoes_id, w.accessory_id, w.jacket_id)
                          or i.id = any(w.extra_accessory_ids))),
    last_worn_on = (select max(w.worn_on) from public.wears w
                   where w.user_id = i.user_id
                     and (i.id in (w.top_id, w.bottom_id, w.shoes_id, w.accessory_id, w.jacket_id)
                          or i.id = any(w.extra_accessory_ids)))
  where i.id = any(ids);
  return null;
end $$;

-- 4) Pièce supprimée : on la retire aussi des listes (comme « on delete set null » pour les autres colonnes).
--    Seules les tenues et l'historique de son propriétaire qui la contenaient sont touchés.
create or replace function public.forget_deleted_accessory()
returns trigger language plpgsql as $$
begin
  update public.outfits set extra_accessory_ids = array_remove(extra_accessory_ids, old.id)
   where user_id = old.user_id and old.id = any(extra_accessory_ids);
  update public.wears set extra_accessory_ids = array_remove(extra_accessory_ids, old.id)
   where user_id = old.user_id and old.id = any(extra_accessory_ids);
  return null;
end $$;

drop trigger if exists items_forget_accessory on public.items;
create trigger items_forget_accessory after delete on public.items
  for each row execute function public.forget_deleted_accessory();
