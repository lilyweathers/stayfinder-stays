-- Run as administrator after 016. Fixtures roll back.
begin;
insert into auth.users (id, email, raw_user_meta_data) values
('a1600000-0000-4000-8000-000000000001', 'host-profile@example.invalid', '{"display_name":"Emma Lindström","avatar_url":"https://example.com/avatar.jpg","private_note":"must not be exposed"}');
insert into public.properties (property_id, owner_id, title, description, location, price_per_night, max_guests) values
('b1600000-0000-4000-8000-000000000001','a1600000-0000-4000-8000-000000000001','Host fixture','Rollback only','Test',100,2);
set local role anon;
do $$ declare result jsonb; begin
  result := public.get_property_host('b1600000-0000-4000-8000-000000000001');
  if result is distinct from '{"name":"Emma Lindström","avatar_url":"https://example.com/avatar.jpg"}'::jsonb then
    raise exception 'Public host output missing or contains unexpected account data: %', result;
  end if;
  if public.get_property_host('nonexistent') is not null then raise exception 'Missing property returned host'; end if;
end $$;
reset role;
update auth.users set raw_user_meta_data = '{"display_name":"Updated Host","avatar_url":null}'
where id='a1600000-0000-4000-8000-000000000001';
set local role anon;
do $$ begin
  if public.get_property_host('b1600000-0000-4000-8000-000000000001')->>'name' <> 'Updated Host' then
    raise exception 'Host changes not reflected';
  end if;
end $$;
reset role;
update public.properties set deleted_at=now() where property_id='b1600000-0000-4000-8000-000000000001';
set local role anon;
do $$ begin
  if public.get_property_host('b1600000-0000-4000-8000-000000000001') is not null then raise exception 'Deleted property exposed host'; end if;
end $$;
reset role;
rollback;
select 'PASS: public host display, private-field exclusion, updates, and missing/deleted properties; fixtures rolled back' as result;
