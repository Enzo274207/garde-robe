-- Annulation de la migration 001 (ne supprime aucune donnée)
drop trigger if exists outfits_items_owner on public.outfits;
drop trigger if exists wears_items_owner on public.wears;
drop function if exists public.check_items_owner();
drop function if exists public.delete_my_account();
alter table public.items drop constraint if exists items_color_hex_format;
alter table public.items drop constraint if exists items_name_length;
alter table public.profiles drop constraint if exists profiles_username_length;
update storage.buckets set file_size_limit = null, allowed_mime_types = null where id = 'photos';
