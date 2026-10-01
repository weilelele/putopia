-- Renames the five fuzzy official worlds to a place or a scene instead of a first-time viewer's remark.
-- Reversible: originals are in worlds_rename_fuzzy_2026_10.rollback.sql. Nothing is deleted.
begin;
update public.worlds set name = '机器人超市', name_en = 'Robot Supermarket' where id = 'WLD-3021';
update public.worlds set name = '办公楼后的海滩', name_en = 'Beach Behind the Office' where id = 'WLD-111';
update public.worlds set name = '无人的村庄', name_en = 'Unattended Village' where id = 'WLD-100';
update public.worlds set name = '有炉火的老屋', name_en = 'Firelit House' where id = 'WLD-199';
update public.worlds set name = '微光草地', name_en = 'Meadow of Small Lights' where id = 'WLD-999';
commit;
