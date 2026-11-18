-- =========================================================
-- Migration 001 — Sécurité et intégrité (non destructive)
-- À exécuter une fois dans Supabase > SQL Editor.
-- Annulation : 001_securite_down.sql
--
-- 1. Vérifie le format des données (couleur, longueurs) côté serveur.
-- 2. Empêche une tenue / un historique de pointer vers la pièce d'un autre utilisateur.
-- 3. Limite les photos à 5 Mo et aux formats JPEG / PNG / WebP.
-- 4. Ajoute la suppression complète de son propre compte.
-- =========================================================

-- 1) Contraintes de format (NOT VALID puis VALIDATE : aucune donnée existante n'est modifiée)
alter table public.items drop constraint if exists items_color_hex_format;
alter table public.items add constraint items_color_hex_format
  check (color_hex ~ '^#[0-9A-Fa-f]{6}$') not valid;
alter table public.items validate constraint items_color_hex_format;

alter table public.items drop constraint if exists items_name_length;
alter table public.items add constraint items_name_length
  check (char_length(name) between 1 and 80 and char_length(type) between 1 and 40) not valid;
alter table public.items validate constraint items_name_length;

alter table public.profiles drop constraint if exists profiles_username_length;
alter table public.profiles add constraint profiles_username_length
  check (char_length(username) <= 40) not valid;
alter table public.profiles validate constraint profiles_username_length;

-- 2) Une tenue ou un jour d'historique ne peut contenir que des pièces du même utilisateur
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

drop trigger if exists outfits_items_owner on public.outfits;
create trigger outfits_items_owner before insert or update on public.outfits
  for each row execute function public.check_items_owner();

drop trigger if exists wears_items_owner on public.wears;
create trigger wears_items_owner before insert or update on public.wears
  for each row execute function public.check_items_owner();

-- 3) Limites du stockage des photos
update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'photos';

-- 4) Suppression complète du compte (les lignes partent en cascade ;
--    l'app supprime d'abord les photos via l'API Storage)
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then
    raise exception 'Non connecté' using errcode = '42501';
  end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
