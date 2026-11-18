-- Annulation de la migration 002
-- ATTENTION : supprime les informations saisies dans les nouvelles colonnes
-- (saisons, chaleur, favoris, nombre de ports…). Les pièces elles-mêmes sont conservées.
-- Échoue volontairement s'il existe des pièces de catégorie « veste » :
-- recatégorise-les d'abord (update public.items set category = 'haut' where category = 'veste').

drop trigger if exists wears_recount on public.wears;
drop function if exists public.recount_wears();
drop trigger if exists items_updated_at on public.items;
drop trigger if exists outfits_updated_at on public.outfits;
drop function if exists public.set_updated_at();

alter table public.wears drop column if exists jacket_id, drop column if exists outfit_id;
alter table public.outfits drop column if exists jacket_id, drop column if exists favorite,
  drop column if exists rating, drop column if exists occasion, drop column if exists updated_at;
alter table public.items drop constraint if exists items_levels_range;
alter table public.items drop constraint if exists items_text_lengths;
alter table public.items drop column if exists secondary_colors, drop column if exists style,
  drop column if exists seasons, drop column if exists material, drop column if exists warmth,
  drop column if exists formality, drop column if exists brand, drop column if exists size,
  drop column if exists favorite, drop column if exists wear_count, drop column if exists last_worn_on,
  drop column if exists updated_at;
alter table public.profiles drop column if exists style_prefs;

alter table public.items drop constraint if exists items_category_check;
alter table public.items add constraint items_category_check
  check (category in ('haut', 'bas', 'chaussures', 'accessoire'));
