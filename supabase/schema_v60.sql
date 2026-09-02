-- schema_v60.sql -- Treat payment review as an active Device Batch claim.
-- This closes the short window where a payment under review could otherwise
-- allow the same holder to start a second claim for the same Batch.

drop index if exists public.voyager_orders_one_active_device_claim;

create unique index voyager_orders_one_active_device_claim
  on public.voyager_orders (user_id, device_batch_slug)
  where product_type = 'device_batch_claim'
    and status in (
      'pending',
      'payment_review',
      'paid',
      'preparing',
      'shipped',
      'delivered'
    );
