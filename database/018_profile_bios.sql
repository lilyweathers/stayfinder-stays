-- Add an optional public bio and fictional descriptions for the demo accounts.
begin;
create or replace function public.get_public_profile(p_user_id text)
returns jsonb language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'name', coalesce(
      nullif(btrim(case when jsonb_typeof(u.raw_user_meta_data->'display_name') = 'string' then u.raw_user_meta_data->>'display_name' end), ''),
      nullif(btrim(case when jsonb_typeof(u.raw_user_meta_data->'full_name') = 'string' then u.raw_user_meta_data->>'full_name' end), ''),
      'StayFinder member'),
    'bio', case when jsonb_typeof(u.raw_user_meta_data->'bio') = 'string' then left(u.raw_user_meta_data->>'bio', 1000) else null end,
    'avatar_url', case when jsonb_typeof(u.raw_user_meta_data->'avatar_url') = 'string'
      and u.raw_user_meta_data->>'avatar_url' like 'https://%'
      then u.raw_user_meta_data->>'avatar_url' else null end
  ) from auth.users u where u.id::text = p_user_id;
$$;
revoke all on function public.get_public_profile(text) from public;
grant execute on function public.get_public_profile(text) to anon, authenticated;

-- Match existing demo accounts by their saved display names; keep existing bios.
update auth.users as u
set raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('bio', bios.bio)
from (values
  ('Emma Lindström', 'Hi, I am Emma! I enjoy sharing welcoming places to stay and helping guests discover a different side of Sweden. In my free time, I love quiet mornings, walks by the water, and finding a cozy café. I hope your next stay feels relaxed and memorable.'),
  ('Oliver Berglund', 'Hi, I am Oliver! I enjoy weekend getaways, exploring new cities, and spending time outdoors. My favorite trips combine a comfortable place to stay with good coffee and a little adventure. I am always looking forward to discovering somewhere new in Sweden.')
) as bios(name, bio)
where coalesce(nullif(btrim(u.raw_user_meta_data->>'display_name'), ''), btrim(u.raw_user_meta_data->>'full_name')) = bios.name
  and coalesce(nullif(btrim(u.raw_user_meta_data->>'bio'), ''), '') = ''
returning u.id, u.raw_user_meta_data->>'display_name' as name, u.raw_user_meta_data->>'bio' as bio;

commit;
notify pgrst, 'reload schema';
