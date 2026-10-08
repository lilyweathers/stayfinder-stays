-- Public display information for the owner of an active property.
-- Reads current Auth metadata so profile edits are reflected immediately.
begin;
create or replace function public.get_property_host(p_property_id text)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'name', coalesce(
      nullif(btrim(case when jsonb_typeof(u.raw_user_meta_data->'display_name') = 'string' then u.raw_user_meta_data->>'display_name' end), ''),
      nullif(btrim(case when jsonb_typeof(u.raw_user_meta_data->'full_name') = 'string' then u.raw_user_meta_data->>'full_name' end), ''),
      'Your host'),
    'avatar_url', case when jsonb_typeof(u.raw_user_meta_data->'avatar_url') = 'string'
      and u.raw_user_meta_data->>'avatar_url' like 'https://%'
      then u.raw_user_meta_data->>'avatar_url' else null end
  )
  from public.properties p join auth.users u on u.id = p.owner_id
  where p.property_id::text = p_property_id and p.deleted_at is null;
$$;
revoke all on function public.get_property_host(text) from public;
grant execute on function public.get_property_host(text) to anon, authenticated;
commit;
