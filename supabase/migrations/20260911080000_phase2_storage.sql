-- Phase 2 — Storage setup (BLUEPRINT.md §2 architecture diagram: Storage
-- holds work media + avatars). Two public-read buckets; writes restricted
-- to the site owner via the is_site_owner() helper from the Phase 1
-- migration. "Public" here means public *read* via the CDN URL — write
-- access still goes through these RLS policies, same as every other
-- table (CLAUDE.md: no table/bucket ships open).

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('work-media', 'work-media', true)
on conflict (id) do nothing;

create policy "avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "owner can manage avatar uploads"
  on storage.objects for all
  using (bucket_id = 'avatars' and public.is_site_owner())
  with check (bucket_id = 'avatars' and public.is_site_owner());

create policy "work media is publicly readable"
  on storage.objects for select
  using (bucket_id = 'work-media');

create policy "owner can manage work media uploads"
  on storage.objects for all
  using (bucket_id = 'work-media' and public.is_site_owner())
  with check (bucket_id = 'work-media' and public.is_site_owner());
