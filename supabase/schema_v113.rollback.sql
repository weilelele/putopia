-- Roll back v113's schedule. The payment functions keep calling the helper, which returns the old months again.
-- Kyoto One's whole batch content is restored from the backup, so re-apply any admin edits made since v113.
begin;
select 1 from public.initiation_batches where label='S26' for update;

create or replace function public.initiation_pack_month(p_position integer) returns text
language sql immutable set search_path=public,pg_temp as $$
 select case p_position when 1 then '2026-10' when 2 then '2026-11' when 3 then '2026-12' when 4 then '2027-01' end
$$;

update public.initiation_shipments set scheduled_month=public.initiation_pack_month(position)
where status in ('planned','preparing')
 and scheduled_month=case position when 1 then '2026-12' when 2 then '2027-01' when 3 then '2027-02' when 4 then '2027-03' end;

update public.device_batches b set content=k.value->'content',published_content=k.value->'published_content'
from public.s26_dispatch_shift_v113_backup k where k.kind='batch' and k.ref=b.slug;

update public.device_order_packs p set expected_window=k.value#>>'{}'
from public.s26_dispatch_shift_v113_backup k where k.kind='pack' and k.ref=p.id::text and p.status in ('planned','preparing');

drop table public.s26_dispatch_shift_v113_backup;
commit;
