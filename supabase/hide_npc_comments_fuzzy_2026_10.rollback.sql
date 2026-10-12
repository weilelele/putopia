-- Undo supabase/hide_npc_comments_fuzzy_2026_10.sql.
begin;
update public.comments set is_visible = true where id in ('5870cae5-c0c6-5a83-b3f7-2402d4822f72', '9ede1e3c-707a-529a-8e66-0bcc0bb935a5', '2c927632-452e-5e86-a032-2550a99ecf7a', 'cf390643-a696-5a65-bdbc-fe71b72f9112', '623315f5-3bb7-5b2a-a1cf-5345e1bd1ee8', '63318d0d-d087-5f79-8445-31cbf18742da', 'dbb5be4f-c6bb-4b86-ae69-90b0b0a9ae15', '7de245c0-d6ba-5649-92e4-c209c8046cc3', '55b87f71-0dc4-5f8b-b9a5-1c68129ad348', 'bf124290-ff63-5d37-930a-b00ab27cd25c', 'f2cb8036-6f2f-5f54-b8df-200d54480b03');
update public.comments set parent_id = '0ce67d15-1bb5-4ebc-ae00-b7f1152cfe80' where id = '4730d725-d0f0-4cf2-ae4b-535b13d8e08a';
commit;
