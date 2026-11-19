-- =========================================================
-- Migration 005 — Amis : voir le dressing de ses amis (non destructive)
-- Prérequis : 004_accessoires.sql. Annulation : 005_amis_down.sql
--
-- - Chaque profil reçoit un « code ami » (6 caractères) à donner à ses potes.
-- - Une nouvelle table friendships garde les demandes (en attente / acceptées).
-- - Un ami accepté peut VOIR les pièces et les photos de l'autre, jamais les modifier.
--   Les tenues et l'historique restent privés.
-- Les règles existantes ne sont ni retirées ni assouplies : la lecture des pièces d'un ami
-- passe par une fonction qui vérifie l'amitié, et une règle de lecture des photos est AJOUTÉE.
-- Aucune ligne existante n'est modifiée (sauf l'ajout du code ami), rien n'est supprimé.
-- =========================================================

-- 1) Code ami (sans 0/O ni 1/I pour éviter les confusions)
create or replace function public.new_friend_code()
returns text language sql volatile as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
    from generate_series(1, 6)
$$;

alter table public.profiles add column if not exists friend_code text default public.new_friend_code();
update public.profiles set friend_code = public.new_friend_code() where friend_code is null;
create unique index if not exists profiles_friend_code_idx on public.profiles (friend_code);

-- 2) Amitiés : une ligne par paire, demandée par requester, acceptée par addressee
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester uuid not null default auth.uid() references auth.users (id) on delete cascade,
  addressee uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (requester <> addressee)
);
create unique index if not exists friendships_pair_idx
  on public.friendships (least(requester, addressee), greatest(requester, addressee));

alter table public.friendships enable row level security;
grant select, delete on public.friendships to authenticated;
-- Lire ou retirer une amitié : seulement les deux personnes concernées.
-- Pas de règle d'ajout ni de modification : ça passe par add_friend / accept_friend.
drop policy if exists "amitiés lecture" on public.friendships;
create policy "amitiés lecture" on public.friendships
  for select to authenticated using (auth.uid() in (requester, addressee));
drop policy if exists "amitiés retrait" on public.friendships;
create policy "amitiés retrait" on public.friendships
  for delete to authenticated using (auth.uid() in (requester, addressee));

-- 3) Est-ce un ami accepté ? (identifiant en texte : sert aussi pour les dossiers de photos)
create or replace function public.is_friend(other text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.friendships f
     where f.status = 'accepted'
       and ((f.requester = auth.uid() and f.addressee::text = other)
         or (f.addressee = auth.uid() and f.requester::text = other))
  )
$$;

-- 4) Ajouter un ami avec son code. Si cette personne m'avait déjà demandé, c'est accepté directement.
create or replace function public.add_friend(code text)
returns text language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  other uuid;
  f public.friendships;
begin
  if me is null then raise exception 'Non connecté' using errcode = '42501'; end if;
  select id into other from public.profiles where friend_code = upper(btrim(code));
  if other is null then raise exception 'Code ami introuvable' using errcode = 'P0002'; end if;
  if other = me then raise exception 'C''est ton propre code ami' using errcode = '22023'; end if;
  select * into f from public.friendships
   where least(requester, addressee) = least(me, other) and greatest(requester, addressee) = greatest(me, other);
  if found then
    if f.status = 'accepted' then return 'already'; end if;
    if f.addressee = me then
      update public.friendships set status = 'accepted' where id = f.id;
      return 'accepted';
    end if;
    return 'pending';
  end if;
  insert into public.friendships (requester, addressee) values (me, other);
  return 'pending';
end $$;

-- 5) Accepter une demande reçue
create or replace function public.accept_friend(fid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.friendships set status = 'accepted'
   where id = fid and addressee = auth.uid() and status = 'pending';
  if not found then raise exception 'Demande introuvable' using errcode = 'P0002'; end if;
end $$;

-- 6) Mon code + mes amis et demandes (pseudo, avatar, nombre de pièces)
create or replace function public.my_friends()
returns table (id uuid, friend_id uuid, username text, avatar jsonb, status text, incoming boolean, items_count bigint)
language sql stable security definer set search_path = public as $$
  select f.id, p.id, p.username, p.avatar, f.status, f.addressee = auth.uid(),
         case when f.status = 'accepted' then (select count(*) from public.items i where i.user_id = p.id) else 0 end
    from public.friendships f
    join public.profiles p on p.id = case when f.requester = auth.uid() then f.addressee else f.requester end
   where auth.uid() in (f.requester, f.addressee)
   order by f.status desc, p.username
$$;

create or replace function public.my_friend_code()
returns text language sql stable security definer set search_path = public as $$
  select friend_code from public.profiles where id = auth.uid()
$$;

-- 7) Les pièces d'un ami (lecture seule ; rien si ce n'est pas un ami accepté)
create or replace function public.friend_items(friend uuid)
returns setof public.items language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_friend(friend::text) then
    raise exception 'Cette personne n''est pas (ou plus) dans tes amis' using errcode = '42501';
  end if;
  return query select * from public.items where user_id = friend order by created_at desc;
end $$;

revoke all on function public.is_friend(text) from public, anon;
revoke all on function public.add_friend(text) from public, anon;
revoke all on function public.accept_friend(uuid) from public, anon;
revoke all on function public.my_friends() from public, anon;
revoke all on function public.my_friend_code() from public, anon;
revoke all on function public.friend_items(uuid) from public, anon;
grant execute on function public.is_friend(text) to authenticated;
grant execute on function public.add_friend(text) to authenticated;
grant execute on function public.accept_friend(uuid) to authenticated;
grant execute on function public.my_friends() to authenticated;
grant execute on function public.my_friend_code() to authenticated;
grant execute on function public.friend_items(uuid) to authenticated;

-- 8) Photos : un ami accepté peut les afficher (lecture seule ; ajout, modification et
--    suppression restent réservés au propriétaire grâce aux règles déjà en place).
drop policy if exists "photos lecture amis" on storage.objects;
create policy "photos lecture amis" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and public.is_friend((storage.foldername(name))[1]));
