-- Run as administrator after 018. Fixtures roll back.
begin;
insert into auth.users (id,email,raw_user_meta_data) values
('a1700000-0000-4000-8000-000000000001','private@example.invalid','{"display_name":"Oliver Berglund","avatar_url":"https://example.com/photo.jpg","bio":"Weekend explorer","private_note":"secret"}');
set local role anon;
do $$ declare result jsonb; begin
  result := public.get_public_profile('a1700000-0000-4000-8000-000000000001');
  if result is distinct from '{"name":"Oliver Berglund","avatar_url":"https://example.com/photo.jpg","bio":"Weekend explorer"}'::jsonb then
    raise exception 'Public profile missing or contains private account information';
  end if;
  if public.get_public_profile('missing') is not null then raise exception 'Missing account returned a profile'; end if;
end $$;
reset role;
rollback;
select 'PASS: public profile exposes only name/photo/bio; fixtures rolled back' as result;
