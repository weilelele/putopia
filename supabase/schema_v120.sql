-- Preserve source identity for one-Pack historical Voyager orders imported into Shopify.
begin;

create table public.voyager_shopify_imports (
  order_id uuid primary key references public.voyager_orders(id),
  stripe_payment_intent text not null unique,
  shop text not null check (shop ~ '^[a-z0-9-]+\.myshopify\.com$'),
  shopify_order_id text check (shopify_order_id ~ '^[0-9]+$'),
  reserved_at timestamptz not null default now(),
  unique (shop,shopify_order_id)
);
alter table public.voyager_shopify_imports enable row level security;
revoke all on public.voyager_shopify_imports from public,anon,authenticated;
grant select,insert,update on public.voyager_shopify_imports to service_role;

create function public.reserve_shopify_legacy_order_import(p_order uuid,p_shop text)
returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
declare o voyager_orders;
begin
  select * into strict o from voyager_orders where id=p_order for update;
  if o.product_type is distinct from 'voyager_pack' or o.amount is distinct from 1200
    or lower(o.currency) is distinct from 'usd' or o.pack_count is distinct from 1
    or o.status not in ('paid','preparing','shipped','delivered') or o.paid_at is null
    or coalesce(o.stripe_session_id,'') !~ '^cs_live_[A-Za-z0-9]+$'
    or coalesce(o.stripe_payment_intent,'') !~ '^pi_[A-Za-z0-9]+$'
    or exists(select 1 from initiation_refund_state where payment_intent=o.stripe_payment_intent and (disputed or refunded_amount>0)) then
    raise exception 'Order is not an eligible historical Voyager purchase';
  end if;
  insert into voyager_shopify_imports(order_id,stripe_payment_intent,shop)
    values(o.id,o.stripe_payment_intent,p_shop) on conflict(order_id) do nothing;
  return found;
end
$$;

create function public.link_shopify_legacy_order_import(p_order uuid,p_shop text,p_shopify_id text)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  if coalesce(p_shopify_id,'') !~ '^[0-9]+$' then raise exception 'Invalid Shopify order ID'; end if;
  update voyager_shopify_imports set shopify_order_id=p_shopify_id
    where order_id=p_order and shop=p_shop and (shopify_order_id is null or shopify_order_id=p_shopify_id);
  if not found then raise exception 'Legacy order has no matching reservation'; end if;
end
$$;

revoke all on function public.reserve_shopify_legacy_order_import(uuid,text),
  public.link_shopify_legacy_order_import(uuid,text,text) from public,anon,authenticated;
grant execute on function public.reserve_shopify_legacy_order_import(uuid,text),
  public.link_shopify_legacy_order_import(uuid,text,text) to service_role;
notify pgrst,'reload schema';
commit;
