-- Worlds content curation, 2026-10-02. Reversible: nothing is deleted.
--  1. Hide 8 weak NPC comments (20% of the 41 NPC comments on the 13 established worlds).
--  2. Official worlds (WLD-100/111/199/999/3021) become fuzzy signals again: hide the seed reports
--     (so they have no observer) and take their pre-designed images down.
--  3. Retire WLD-103 from public listings (is_test = true; its comments are kept).
-- Real users' comments and real-user worlds are untouched.
-- Undo: supabase/worlds_curation_2026_10.rollback.sql
begin;
update public.comments set is_visible = false
where subject_type = 'world' and id in ('0ce67d15-1bb5-4ebc-ae00-b7f1152cfe80', '4f79d3ec-196e-4996-bf47-0085023b9dca', '25f75352-6be1-48aa-873f-16a2a713b639', '3428539d-564e-5da2-9635-d1ca4822cca1', 'df4cf40e-79ca-5f85-aedd-7831aeed68ac', '89128ab8-10d3-519d-a4df-b532b57c15e2', '93ffc3ac-93ae-5869-a9e6-00a86bad7db8', 'df8f331e-a111-5376-bcde-ea6b70bc1abe');

update public.world_reports set is_visible = false
where source = 'seed' and world_id in ('WLD-100', 'WLD-111', 'WLD-199', 'WLD-999', 'WLD-3021');

update public.worlds set image_path = null where id in ('WLD-100', 'WLD-111', 'WLD-199', 'WLD-999', 'WLD-3021');

update public.worlds set is_test = true where id = 'WLD-103';
commit;
