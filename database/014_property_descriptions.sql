-- Expanded descriptions for the six existing sample properties.
-- Match both ID and title so unrelated properties are never changed.
begin;
update public.properties as p
set description = descriptions.description
from (values
  ('dcd91068-9f88-496f-a239-305f54fdc957'::uuid, 'Gothenburg Harbor Loft', 'Enjoy a relaxed city break in this spacious Gothenburg loft, with the harbor and local restaurants nearby. Spend your days exploring the waterfront and discovering places to eat, then return to a comfortable base for an evening together. With room for up to four guests, the loft suits a getaway with friends or a family visit to the city.'),
  ('bc22ac54-09f5-4fd8-bb1d-55cb0313602a'::uuid, 'Dalarna Forest Cabin', 'Take a break from the everyday in this peaceful family cabin surrounded by the forests of Dalarna. The woodland setting invites slower mornings, time together, and a chance to enjoy the outdoors at your own pace. Accommodating up to six guests, the cabin is a welcoming choice for families or friends looking for a restful escape into nature.'),
  ('ba3c820e-739e-434e-92eb-9d4d9fbbb4a0'::uuid, 'Lakeside Cottage', 'Unwind at this comfortable cottage in Växjö, where lake views and a private terrace set the scene for an easygoing stay. Start the day with a quiet moment outdoors or settle on the terrace after a day of exploring. With space for up to four guests, the cottage suits a small family or friends who want to spend time together in a lakeside setting.'),
  ('a2d293be-6dbe-40d2-ae89-0c215ab2a103'::uuid, 'Old Town Studio', 'Discover Stockholm from this bright studio close to cafés and historic streets. Head out for a coffee, wander through the surrounding streets, and make the most of a city break at your own pace. Designed for up to two guests, the studio offers a comfortable base for a solo trip or a getaway for two.'),
  ('a86a72d7-6a61-49cf-81c1-cd173f7e81ad'::uuid, 'Mountain Chalet', 'Make the most of an outdoor getaway in Åre with this spacious chalet near hiking trails and ski slopes. Whether your plans involve exploring on foot or spending time on the slopes, the chalet provides a comfortable place to return to and share the day’s stories. With room for up to six guests, it suits families or friends planning a mountain escape together.'),
  ('6e2689e7-c6d4-4d4f-a384-1bedd7d8f664'::uuid, 'Stockholm Garden Studio', 'Enjoy a gentler pace in Stockholm at this cozy studio overlooking a quiet courtyard. The peaceful outlook offers a pleasant place to start the morning or unwind after a day in the city. Accommodating up to two guests, the studio suits solo travelers or couples looking for a calm base for their Stockholm stay.')
) as descriptions(property_id, title, description)
where p.property_id = descriptions.property_id
  and p.title = descriptions.title and p.deleted_at is null
returning p.property_id, p.title, p.description;
commit;
