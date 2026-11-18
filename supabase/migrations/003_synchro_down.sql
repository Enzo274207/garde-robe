-- Annulation de la migration 003
drop trigger if exists profiles_updated_at on public.profiles;
drop trigger if exists wears_updated_at on public.wears;
alter table public.profiles drop column if exists updated_at;
alter table public.wears drop column if exists updated_at;
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
