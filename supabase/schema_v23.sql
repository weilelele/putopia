-- schema_v23: comment replies (threading) + architect identity impersonation
--
-- Two additions to the flat `comments` table (created in schema_v18):
--   1. parent_id    — turns the flat thread into a reply tree. A reply points at
--                     the comment it answers; deleting a parent cascades to its
--                     replies so no orphans linger.
--   2. posted_by_id — audit trail for architect impersonation. When an architect
--                     posts AS another member (author_id = the impersonated voyager/
--                     architect), posted_by_id records the REAL architect who hit
--                     send. NULL means the author posted as themselves. Public reads
--                     never expose this column (server actions don't select it into
--                     the client payload); it exists for accountability only.

alter table comments
  add column if not exists parent_id    uuid references comments(id) on delete cascade,
  add column if not exists posted_by_id uuid references voyager_profiles(id) on delete set null;

-- replies are fetched per-parent; index the lookup
create index if not exists comments_parent_idx on comments (parent_id);
