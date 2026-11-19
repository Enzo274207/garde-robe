-- Annulation de la migration 004
-- ATTENTION : supprime les accessoires « en plus » des tenues et de l'historique
-- (seul le premier accessoire de chaque tenue est conservé). À n'exécuter qu'avec l'accord d'Enzo.
-- Les fonctions reprennent leur version des migrations 001 et 002.

drop trigger if exists items_forget_accessory on public.items;
drop function if exists public.forget_deleted_accessory();

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
  ], null);
  select count(*) into bad
    from unnest(ids) as x(id)
    where not exists (select 1 from public.items i where i.id = x.id and i.user_id = new.user_id);
  if bad > 0 then
    raise exception 'Une pièce de la tenue est introuvable ou appartient à un autre utilisateur'
      using errcode = '42501';
  end if;
  return new;
end $$;

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

alter table public.outfits drop constraint if exists outfits_extra_accessories_max;
alter table public.wears drop constraint if exists wears_extra_accessories_max;
alter table public.outfits drop column if exists extra_accessory_ids;
alter table public.wears drop column if exists extra_accessory_ids;
