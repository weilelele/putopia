-- Seed activity_events with realistic data drawn from existing DB records
-- Run once to bootstrap the feed. Future events auto-insert via action hooks.

INSERT INTO activity_events
  (created_at, actor_id, actor_name, actor_role, event_type,
   target_id, target_title, target_image, target_href, vote_option, group_key, is_visible)
VALUES

-- intel published ──────────────────────────────────────────────────────────
(now() - interval '2 hours',
 '6fc6e5cd-35fe-4812-ac04-f9074c6ee0c7', 'Weile Yang', 'architect',
 'intel_published',
 'INT-628013',
 '[NOTICE] Console Distribution Temporarily Limited Due to Survival Challenge Enrollment Surge',
 NULL,
 '/intel/INT-628013',
 NULL, NULL, true),

(now() - interval '3 days',
 'd1e7f1ce-19c1-4422-b8e8-a1dcd64234c2', 'Tariq Osei', 'voyager',
 'intel_published',
 '9c6fdc60-385e-4cec-8e69-aef016a08037',
 'Rumor: The Field Effect',
 NULL,
 '/intel/9c6fdc60-385e-4cec-8e69-aef016a08037',
 NULL, NULL, true),

-- device updated ───────────────────────────────────────────────────────────
(now() - interval '1 day',
 'f7c9af6e-b5d4-4937-9a51-848b3f6fbd69', 'Voyager Page', 'voyager',
 'device_updated',
 'kn-2',
 'MC-NANA',
 'https://oxwfnmcwovxnrvagxzdz.supabase.co/storage/v1/object/public/devices/1779061680642.jpg',
 '/devices',
 NULL, NULL, true),

(now() - interval '4 days',
 'a4c6b43a-6c0f-409a-a962-0b2b9cd861ad', 'Luke Brandner', 'voyager',
 'device_updated',
 'kn-1',
 'MC-Cologne',
 'https://oxwfnmcwovxnrvagxzdz.supabase.co/storage/v1/object/public/devices/1779061310398.png',
 '/devices',
 NULL, NULL, true),

-- world added ──────────────────────────────────────────────────────────────
(now() - interval '5 days',
 '6fc6e5cd-35fe-4812-ac04-f9074c6ee0c7', 'Weile Yang', 'architect',
 'world_added',
 'WLD-999',
 'Can I stay a child forever with you, Peter Pan?',
 'https://cdn-youhuamian.pufflearn.com/resources/images/1779270291.jpg',
 '/worlds/WLD-999',
 NULL, NULL, true),

-- vote opened ──────────────────────────────────────────────────────────────
(now() - interval '6 days',
 '6fc6e5cd-35fe-4812-ac04-f9074c6ee0c7', 'Weile Yang', 'architect',
 'vote_opened',
 'eb9fd9f4-4210-4af8-ab4b-a99ef5ff34ea',
 'Applicant Orientation: Preferred Schedule',
 NULL,
 '/vote',
 NULL,
 'vote-eb9fd9f4-4210-4af8-ab4b-a99ef5ff34ea',
 true),

-- vote cast ────────────────────────────────────────────────────────────────
(now() - interval '6 days' + interval '30 minutes',
 'a4c6b43a-6c0f-409a-a962-0b2b9cd861ad', 'Luke Brandner', 'voyager',
 'vote_cast',
 'eb9fd9f4-4210-4af8-ab4b-a99ef5ff34ea',
 'Applicant Orientation: Preferred Schedule',
 NULL,
 '/vote',
 'Weekends',
 'vote-eb9fd9f4-4210-4af8-ab4b-a99ef5ff34ea',
 true),

(now() - interval '6 days' + interval '2 hours',
 'f7c9af6e-b5d4-4937-9a51-848b3f6fbd69', 'Voyager Page', 'voyager',
 'vote_cast',
 'eb9fd9f4-4210-4af8-ab4b-a99ef5ff34ea',
 'Applicant Orientation: Preferred Schedule',
 NULL,
 '/vote',
 'Weekday evenings',
 'vote-eb9fd9f4-4210-4af8-ab4b-a99ef5ff34ea',
 true),

-- member joined ────────────────────────────────────────────────────────────
(now() - interval '6 days' + interval '4 hours',
 'a4c6b43a-6c0f-409a-a962-0b2b9cd861ad', 'Luke Brandner', 'voyager',
 'member_joined',
 'a4c6b43a-6c0f-409a-a962-0b2b9cd861ad',
 NULL, NULL,
 '/voyagers',
 NULL, NULL, true);
