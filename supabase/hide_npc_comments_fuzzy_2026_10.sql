-- Removes (hides) the NPC discussion comments on the five fuzzy official worlds.
-- Reversible: only sets is_visible. A real user's reply under an NPC comment is first
-- re-attached to the NPC comment's own parent, so it stays visible. Nothing is deleted.
-- Undo: supabase/hide_npc_comments_fuzzy_2026_10.rollback.sql
begin;
update public.comments ch set parent_id = p.parent_id
from public.comments p
join public.voyager_profiles pa on pa.id = p.author_id
where ch.parent_id = p.id and pa.account_kind = 'npc'
  and p.subject_type = 'world' and p.subject_id in ('WLD-100','WLD-111','WLD-199','WLD-999','WLD-3021')
  and exists (select 1 from public.voyager_profiles ca where ca.id = ch.author_id and ca.account_kind <> 'npc');

update public.comments c set is_visible = false
from public.voyager_profiles a
where a.id = c.author_id and a.account_kind = 'npc'
  and c.subject_type = 'world' and c.subject_id in ('WLD-100','WLD-111','WLD-199','WLD-999','WLD-3021') and c.is_visible;
commit;
