-- Signal voting: 36 hours for new publications; extend every open 24-hour round.
-- Requested by owner on 2026-10-06. Does not resend previously sent mail.
begin;
select pg_advisory_xact_lock(770027);
do $migration$
declare definition text;
begin
  definition := pg_get_functiondef('public.advance_dreamcatcher_rounds()'::regprocedure);
  if position('closes_at=publication_at+interval ''24 hours''' in definition)>0 then
    execute replace(definition, 'closes_at=publication_at+interval ''24 hours''', 'closes_at=publication_at+interval ''36 hours''');
  elsif position('closes_at=publication_at+interval ''36 hours''' in definition)=0 then
    raise exception 'Unexpected publication function: review before changing voting duration';
  end if;
end $migration$;
update public.dreamcatcher_rounds
set closes_at = opened_at + interval '36 hours'
where status = 'voting_open'
  and opened_at is not null
  and closes_at = opened_at + interval '24 hours';
commit;
