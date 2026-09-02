-- schema_v63.sql -- Two-stage Story Lab review, scheduling, and publication.
--
-- Internal workflow tables are service-role only. Approved content is copied
-- into story_publications when it is published; only that final registry is
-- publicly readable.

create table if not exists public.device_batch_story_workflows (
  id                           uuid primary key default gen_random_uuid(),
  workspace_slug               text not null unique,
  batch_name                   text not null,
  location                     text not null default '',
  source_story                 text not null,
  source_version               integer not null default 1,
  adaptation                   jsonb,
  adaptation_status            text not null default 'draft',
  adaptation_revision          integer not null default 0,
  adaptation_approved_revision integer,
  review_note                  text not null default '',
  version                      integer not null default 1,
  created_by                   uuid references auth.users(id) on delete set null,
  updated_by                   uuid references auth.users(id) on delete set null,
  approved_by                  uuid references auth.users(id) on delete set null,
  approved_at                  timestamptz,
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now(),
  constraint story_workflows_slug_check
    check (workspace_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint story_workflows_source_length_check
    check (char_length(btrim(source_story)) between 20 and 20000),
  constraint story_workflows_source_version_check
    check (source_version > 0),
  constraint story_workflows_adaptation_revision_check
    check (adaptation_revision >= 0),
  constraint story_workflows_version_check
    check (version > 0),
  constraint story_workflows_adaptation_object_check
    check (adaptation is null or jsonb_typeof(adaptation) = 'object'),
  constraint story_workflows_status_check
    check (adaptation_status in ('draft', 'in_review', 'changes_requested', 'approved')),
  constraint story_workflows_approval_check
    check (
      adaptation_status <> 'approved'
      or (
        adaptation is not null
        and adaptation_approved_revision = adaptation_revision
        and approved_at is not null
      )
    )
);

create index if not exists story_workflows_updated_idx
  on public.device_batch_story_workflows (updated_at desc);

create table if not exists public.device_batch_story_content_items (
  id                     uuid primary key default gen_random_uuid(),
  workflow_id            uuid not null references public.device_batch_story_workflows(id) on delete cascade,
  position               integer not null,
  title                  text not null,
  channel                text not null,
  content_type           text not null,
  body                   text not null,
  narrative_purpose      text not null,
  facts                  jsonb not null default '[]'::jsonb,
  required_assets        jsonb not null default '[]'::jsonb,
  recommended_publish_at timestamptz,
  timing_rationale       text not null default '',
  dependencies           jsonb not null default '[]'::jsonb,
  follow_up              text not null default '',
  status                 text not null default 'draft',
  review_note            text not null default '',
  story_revision         integer not null,
  version                integer not null default 1,
  scheduled_for          timestamptz,
  approved_by            uuid references auth.users(id) on delete set null,
  approved_at            timestamptz,
  published_by           uuid references auth.users(id) on delete set null,
  published_at           timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (workflow_id, position),
  constraint story_content_position_check check (position > 0),
  constraint story_content_story_revision_check check (story_revision > 0),
  constraint story_content_version_check check (version > 0),
  constraint story_content_facts_array_check check (jsonb_typeof(facts) = 'array'),
  constraint story_content_assets_array_check check (jsonb_typeof(required_assets) = 'array'),
  constraint story_content_dependencies_array_check check (jsonb_typeof(dependencies) = 'array'),
  constraint story_content_status_check
    check (status in (
      'draft',
      'in_review',
      'changes_requested',
      'approved',
      'scheduled',
      'published',
      'needs_re_review'
    )),
  constraint story_content_schedule_check
    check (status <> 'scheduled' or scheduled_for is not null),
  constraint story_content_publication_check
    check (status <> 'published' or published_at is not null)
);

create index if not exists story_content_workflow_position_idx
  on public.device_batch_story_content_items (workflow_id, position);
create index if not exists story_content_workflow_status_idx
  on public.device_batch_story_content_items (workflow_id, status);
create index if not exists story_content_due_idx
  on public.device_batch_story_content_items (scheduled_for)
  where status = 'scheduled';

create table if not exists public.story_publications (
  id            uuid primary key default gen_random_uuid(),
  source_item_id uuid not null unique references public.device_batch_story_content_items(id) on delete restrict,
  workflow_id   uuid not null references public.device_batch_story_workflows(id) on delete restrict,
  batch_name    text not null,
  title         text not null,
  channel       text not null,
  content_type  text not null,
  body          text not null,
  context       jsonb not null default '{}'::jsonb,
  scheduled_for timestamptz,
  published_by  uuid references auth.users(id) on delete set null,
  published_at  timestamptz not null default now(),
  constraint story_publications_context_object_check
    check (jsonb_typeof(context) = 'object')
);

create index if not exists story_publications_published_idx
  on public.story_publications (published_at desc);
create index if not exists story_publications_workflow_idx
  on public.story_publications (workflow_id, published_at desc);

alter table public.device_batch_story_workflows enable row level security;
alter table public.device_batch_story_content_items enable row level security;
alter table public.story_publications enable row level security;

revoke all on public.device_batch_story_workflows from anon, authenticated;
revoke all on public.device_batch_story_content_items from anon, authenticated;
grant select, insert, update, delete on public.device_batch_story_workflows to service_role;
grant select, insert, update, delete on public.device_batch_story_content_items to service_role;

drop policy if exists "story_publications_public_read" on public.story_publications;
create policy "story_publications_public_read"
  on public.story_publications for select
  to anon, authenticated
  using (true);

grant select on public.story_publications to anon, authenticated;
grant select, insert, update on public.story_publications to service_role;
revoke delete on public.story_publications from service_role;

create or replace function public.replace_story_content_plan(
  p_workflow_id uuid,
  p_story_revision integer,
  p_expected_workflow_version integer,
  p_updated_by uuid,
  p_items jsonb
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  workflow_record public.device_batch_story_workflows%rowtype;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Content plan must be a non-empty JSON array';
  end if;

  select *
    into workflow_record
    from public.device_batch_story_workflows
    where id = p_workflow_id
    for update;

  if not found or workflow_record.version <> p_expected_workflow_version then
    raise exception 'Story workflow changed while the content plan was generated';
  end if;
  if workflow_record.adaptation_status <> 'approved'
    or workflow_record.adaptation_approved_revision <> p_story_revision then
    raise exception 'Story adaptation is not approved at the requested revision';
  end if;

  if exists (
    select 1
    from public.device_batch_story_content_items
    where workflow_id = p_workflow_id
      and status in ('approved', 'scheduled', 'published')
  ) then
    raise exception 'Approved, scheduled, or published content cannot be replaced';
  end if;

  delete from public.device_batch_story_content_items
  where workflow_id = p_workflow_id;

  insert into public.device_batch_story_content_items (
    workflow_id,
    position,
    title,
    channel,
    content_type,
    body,
    narrative_purpose,
    facts,
    required_assets,
    recommended_publish_at,
    timing_rationale,
    dependencies,
    follow_up,
    status,
    story_revision
  )
  select
    p_workflow_id,
    (item->>'position')::integer,
    btrim(item->>'title'),
    btrim(item->>'channel'),
    btrim(item->>'contentType'),
    btrim(item->>'body'),
    btrim(item->>'narrativePurpose'),
    coalesce(item->'facts', '[]'::jsonb),
    coalesce(item->'requiredAssets', '[]'::jsonb),
    nullif(item->>'recommendedPublishAt', '')::timestamptz,
    btrim(item->>'timingRationale'),
    coalesce(item->'dependencies', '[]'::jsonb),
    btrim(coalesce(item->>'followUp', '')),
    'draft',
    p_story_revision
  from jsonb_array_elements(p_items) as item;

  update public.device_batch_story_workflows
    set version = version + 1,
        updated_by = p_updated_by,
        updated_at = now()
    where id = p_workflow_id;
end;
$$;

revoke all on function public.replace_story_content_plan(uuid, integer, integer, uuid, jsonb) from public;
grant execute on function public.replace_story_content_plan(uuid, integer, integer, uuid, jsonb) to service_role;

create or replace function public.invalidate_story_content_after_upstream_change()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if old.source_story is distinct from new.source_story
    or old.adaptation is distinct from new.adaptation then
    update public.device_batch_story_content_items
      set status = 'needs_re_review',
          scheduled_for = null,
          approved_at = null,
          approved_by = null,
          review_note = 'The approved story structure changed. Review this item against the new version.',
          updated_at = now()
      where workflow_id = new.id
        and status <> 'published';
  end if;
  return new;
end;
$$;

revoke all on function public.invalidate_story_content_after_upstream_change() from public;

drop trigger if exists story_workflow_invalidate_content
  on public.device_batch_story_workflows;
create trigger story_workflow_invalidate_content
after update of source_story, adaptation on public.device_batch_story_workflows
for each row
execute function public.invalidate_story_content_after_upstream_change();
