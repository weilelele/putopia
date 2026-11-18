-- Extend the durable analytics outbox with non-payment Shopify browser stages.
begin;
alter table public.initiation_analytics_outbox
  add column capture_source text not null default 'server' check(capture_source in ('server','shopify_pixel'));
alter table public.initiation_analytics_outbox drop constraint initiation_analytics_outbox_event_check;
alter table public.initiation_analytics_outbox add constraint initiation_analytics_outbox_event_check check(event in (
  'initiation_checkout_started','initiation_purchase_completed','initiation_checkout_viewed',
  'initiation_checkout_contact_submitted','initiation_checkout_address_submitted',
  'initiation_checkout_shipping_submitted','initiation_checkout_payment_submitted','initiation_checkout_completed_viewed'
));
alter table public.initiation_analytics_outbox add constraint initiation_analytics_source_check check(
  (capture_source='server' and event in ('initiation_checkout_started','initiation_purchase_completed'))
  or (capture_source='shopify_pixel' and event not in ('initiation_checkout_started','initiation_purchase_completed'))
);
notify pgrst,'reload schema';
commit;
