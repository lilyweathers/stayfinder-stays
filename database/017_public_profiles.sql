-- A public profile contains display information only, never email/account details.
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
    'avatar_url', case when jsonb_typeof(u.raw_user_meta_data->'avatar_url') = 'string'
      and u.raw_user_meta_data->>'avatar_url' like 'https://%'
      then u.raw_user_meta_data->>'avatar_url' else null end
  ) from auth.users u where u.id::text = p_user_id;
$$;
revoke all on function public.get_public_profile(text) from public;
grant execute on function public.get_public_profile(text) to anon, authenticated;
commit;
notify pgrst, 'reload schema';
