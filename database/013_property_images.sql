-- Representative stock photos, not photographs of the actual properties.
-- Existing custom image URLs are preserved when this migration is rerun.
begin;
alter table public.properties add column if not exists image_url text;
alter table public.properties drop constraint if exists properties_image_url_https;
alter table public.properties add constraint properties_image_url_https
  check (image_url is null or image_url ~ '^https://[^[:space:]]+$');

update public.properties as p
set image_url = photos.image_url
from (values
  ('dcd91068-9f88-496f-a239-305f54fdc957'::uuid, 'Gothenburg Harbor Loft', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80'),
  ('bc22ac54-09f5-4fd8-bb1d-55cb0313602a'::uuid, 'Dalarna Forest Cabin', 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1200&q=80'),
  ('ba3c820e-739e-434e-92eb-9d4d9fbbb4a0'::uuid, 'Lakeside Cottage', 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=80'),
  ('a2d293be-6dbe-40d2-ae89-0c215ab2a103'::uuid, 'Old Town Studio', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80'),
  ('a86a72d7-6a61-49cf-81c1-cd173f7e81ad'::uuid, 'Mountain Chalet', 'https://images.unsplash.com/photo-1715791711669-35cb2c017f48?auto=format&fit=crop&w=1200&q=80'),
  ('6e2689e7-c6d4-4d4f-a384-1bedd7d8f664'::uuid, 'Stockholm Garden Studio', 'https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=1200&q=80')
) as photos(property_id, title, image_url)
where p.property_id = photos.property_id and p.title = photos.title
  and p.deleted_at is null and p.image_url is null;
commit;

select property_id, title, image_url from public.properties
where deleted_at is null order by title;
