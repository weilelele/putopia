-- schema_v58.sql — grant backend (service_role) access to the push tables
-- Additive and idempotent. Run after schema_v57.sql.
--
-- Root cause fix: schema_v57 granted the iOS push tables to the `authenticated`
-- role but never to `service_role`, which the API routes use via the admin
-- client. Device registration therefore failed with
--   "permission denied for table push_devices" (SQLSTATE 42501)
-- and no device was ever recorded, so pushes reported attempted:0/delivered:0.

grant select, insert, update, delete on public.push_devices to service_role;
grant select, insert, update, delete on public.push_preferences to service_role;
grant select, insert, update, delete on public.push_delivery_log to service_role;
