-- Annulation de la migration 005
-- ATTENTION : efface toutes les amitiés et les codes amis. À n'exécuter qu'avec l'accord d'Enzo.
-- Les pièces, photos, tenues et l'historique ne sont pas touchés.

drop policy if exists "photos lecture amis" on storage.objects;
drop function if exists public.friend_items(uuid);
drop function if exists public.my_friend_code();
drop function if exists public.my_friends();
drop function if exists public.accept_friend(uuid);
drop function if exists public.add_friend(text);
drop function if exists public.is_friend(text);
drop table if exists public.friendships;
drop index if exists public.profiles_friend_code_idx;
alter table public.profiles drop column if exists friend_code;
drop function if exists public.new_friend_code();
