-- Renames the five fuzzy official worlds to a place or a scene instead of a first-time viewer's remark.
-- Reversible: originals are in worlds_rename_fuzzy_2026_10.rollback.sql. Nothing is deleted.
begin;
update public.worlds set name = '营养超市', name_en = 'Nutrient Market' where id = 'WLD-3021';
update public.worlds set name = '办公楼后的海滩', name_en = 'The Beach Behind the Office' where id = 'WLD-111';
update public.worlds set name = '无人的村庄', name_en = 'The Unattended Village' where id = 'WLD-100';
update public.worlds set name = '玻璃后的炉火', name_en = 'The Hearth Behind the Glass' where id = 'WLD-199';
update public.worlds set name = '微光草地', name_en = 'The Meadow of Small Lights' where id = 'WLD-999';
commit;
