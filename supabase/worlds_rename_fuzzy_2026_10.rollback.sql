-- Restores the original names of the five fuzzy official worlds.
begin;
update public.worlds set name = '应许之地', name_en = 'The Promised Land' where id = 'WLD-100';
update public.worlds set name = '让人忍不住躺平的地方', name_en = 'A place that makes you want to just lie down' where id = 'WLD-111';
update public.worlds set name = '震惊！恐怖至极！', name_en = 'Ewww...it''s so terrible!' where id = 'WLD-199';
update public.worlds set name = '也许是未来的超市？', name_en = 'Maybe it''s a supermarket of the future?' where id = 'WLD-3021';
update public.worlds set name = '我能和你一起不长大吗？彼得潘？', name_en = 'Can I stay a child forever with you, Peter Pan?' where id = 'WLD-999';
commit;
