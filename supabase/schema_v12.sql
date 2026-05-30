-- schema_v12: add UTM tracking + landing page variant to applications

alter table public.applications
  add column if not exists utm_source          text,
  add column if not exists utm_medium          text,
  add column if not exists utm_campaign        text,
  add column if not exists utm_content         text,
  add column if not exists fbclid              text,
  add column if not exists landing_page_variant text;
