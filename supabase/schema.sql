-- =========================================================
-- Garde-robe : schéma Supabase (V1)
-- À coller dans Supabase > SQL Editor > New query, puis "Run".
-- =========================================================

-- 1) Profils (pseudo + réglages de l'avatar)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null default '',
  avatar jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Crée automatiquement le profil à l'inscription
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2) Pièces de la garde-robe
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category text not null check (category in ('haut', 'bas', 'chaussures', 'accessoire')),
  type text not null,
  name text not null,
  color_name text,
  color_hex text not null default '#8C8C8C',
  fit text default '',
  front_path text,
  back_path text,
  is_shared boolean not null default false,   -- prévu pour le partage entre amis (V2)
  created_at timestamptz not null default now()
);
create index if not exists items_user_idx on public.items (user_id, category);

-- 3) Tenues enregistrées
create table if not exists public.outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text,
  top_id uuid references public.items (id) on delete set null,
  bottom_id uuid references public.items (id) on delete set null,
  shoes_id uuid references public.items (id) on delete set null,
  accessory_id uuid references public.items (id) on delete set null,
  created_at timestamptz not null default now()
);

-- 4) Historique : une tenue portée par jour
create table if not exists public.wears (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  worn_on date not null default current_date,
  top_id uuid references public.items (id) on delete set null,
  bottom_id uuid references public.items (id) on delete set null,
  shoes_id uuid references public.items (id) on delete set null,
  accessory_id uuid references public.items (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, worn_on)
);

-- 5) Sécurité : chacun ne voit et ne modifie que ses propres données
alter table public.profiles enable row level security;
alter table public.items    enable row level security;
alter table public.outfits  enable row level security;
alter table public.wears    enable row level security;

drop policy if exists "profil perso" on public.profiles;
create policy "profil perso" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "pièces perso" on public.items;
create policy "pièces perso" on public.items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tenues perso" on public.outfits;
create policy "tenues perso" on public.outfits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "historique perso" on public.wears;
create policy "historique perso" on public.wears
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 6) Stockage des photos : bucket privé, un dossier par utilisateur
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

drop policy if exists "photos lecture perso" on storage.objects;
create policy "photos lecture perso" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "photos ajout perso" on storage.objects;
create policy "photos ajout perso" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "photos modif perso" on storage.objects;
create policy "photos modif perso" on storage.objects
  for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "photos suppression perso" on storage.objects;
create policy "photos suppression perso" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
