-- Undo supabase/worlds_curation_2026_10.sql (restores original images and visibility).
begin;
update public.comments set is_visible = true where subject_type = 'world' and id in ('0ce67d15-1bb5-4ebc-ae00-b7f1152cfe80', '4f79d3ec-196e-4996-bf47-0085023b9dca', '25f75352-6be1-48aa-873f-16a2a713b639', '3428539d-564e-5da2-9635-d1ca4822cca1', 'df4cf40e-79ca-5f85-aedd-7831aeed68ac', '89128ab8-10d3-519d-a4df-b532b57c15e2', '93ffc3ac-93ae-5869-a9e6-00a86bad7db8', 'df8f331e-a111-5376-bcde-ea6b70bc1abe');
update public.world_reports set is_visible = true where source = 'seed' and world_id in ('WLD-100', 'WLD-111', 'WLD-199', 'WLD-999', 'WLD-3021');
update public.worlds set image_path = 'https://oxwfnmcwovxnrvagxzdz.supabase.co/storage/v1/object/public/world-images/WLD-100/cover.jpg' where id = 'WLD-100';
update public.worlds set is_test = false where id = 'WLD-103';
update public.worlds set image_path = 'https://oxwfnmcwovxnrvagxzdz.supabase.co/storage/v1/object/public/world-images/WLD-111/cover.webp' where id = 'WLD-111';
update public.worlds set image_path = 'https://oxwfnmcwovxnrvagxzdz.supabase.co/storage/v1/object/public/world-images/WLD-199/cover.webp' where id = 'WLD-199';
update public.worlds set image_path = 'https://oxwfnmcwovxnrvagxzdz.supabase.co/storage/v1/object/public/world-images/WLD-3021/cover.webp' where id = 'WLD-3021';
update public.worlds set image_path = 'https://oxwfnmcwovxnrvagxzdz.supabase.co/storage/v1/object/public/world-images/WLD-999/cover.jpg' where id = 'WLD-999';
commit;
