-- Putopia Collective — Seed v2
-- Run AFTER schema_v2.sql
-- Seeds: devices, worlds, intel, stories from existing mock/content data

-- ─────────────────────────────────────────
-- devices
-- ─────────────────────────────────────────

insert into public.devices (id, name, batch_id, knowledge, location, description, image_path, status, current_user_name, exploration_progress) values
  ('uk-1', 'Signal Source Alpha',       null,       'unknown', 'Northern Europe',  'Intermittent transmissions detected. Source confirmed organic in origin. No direct contact established.',                                                                    null, null,          null,     23),
  ('uk-2', 'Batch 7 — Eastern Cluster', 'BATCH-07', 'unknown', 'East Asia',        'Three units detected operating in proximity. Signal patterns suggest coordinated activity.',                                                                                   null, null,          null,     61),
  ('uk-3', 'Deep Channel Emitter',      null,       'unknown', 'South America',    'High-frequency emissions from an unidentified unit. Quantum signature does not match known models.',                                                                           null, null,          null,      8),
  ('kn-1', 'Unit 001 — The Originator', null,       'known',   'Berlin, Germany',  'The oldest known Console in the Collective''s records. Previously held for 20 years by a German Voyager. Now in active rotation.',                                            null, 'in_use',      'Voyager Luke', 0),
  ('kn-2', 'Unit 012 — The Observer',   null,       'known',   'Shanghai, China',  'Gifted between friends. Established the first confirmed cross-temporal quantum link on record.',                                                                               null, 'in_use',      'Voyager Page', 0),
  ('kn-3', 'Unit 019 — The Wanderer',   null,       'known',   'Tokyo, Japan',     'Recovered from an abandoned postal locker. Functional. Awaiting assignment.',                                                                                                  null, 'available',   null,      0),
  ('kn-4', 'Unit 023 — The Broken Eye', null,       'known',   'London, UK',       'Screen calibration failure after extended deep-channel exposure. Under restoration.',                                                                                          null, 'needs_repair',null,      0);

-- ─────────────────────────────────────────
-- worlds
-- ─────────────────────────────────────────

insert into public.worlds (id, name, name_en, discoverer_id, discoverer_name, discovery_date, gradient_from, gradient_to, description, is_verified) values
  ('WLD-001', 'Amber Zenith',        'Amber Zenith',        null, 'Mira Volkov',    '2024-01-15', '#E8A020', '#C43020', 'Eternal orange sky with vertical light column structures. Physical laws are highly similar to our own world.',                                              true),
  ('WLD-002', 'Mirror-Seven',        'Mirror-Seven',        null, 'Lu Mingyuan',    '2024-03-29', '#C4A96A', '#7A6A40', 'Speed of light is 0.003% slower. Life forms exist but operate under a completely different symbolic language system.',                                     true),
  ('WLD-003', 'The Silent Realm',    'The Silent Realm',    null, 'Shen Zhimeng',   '2024-06-10', '#3D3010', '#0F0A00', 'A soundless world. Vibration data is complete but the visible light spectrum carries no signal. Mountain ranges form syntactic structures.',              true),
  ('WLD-004', 'Fold South',          'Fold South',          null, 'Hoshino Nozomu', '2025-04-04', '#4D8C3F', '#E8A020', 'A node in the Southern Hemisphere blind spot. Pronounced spatial folding characteristics, presenting as a static snapshot state.',                        true),
  ('WLD-005', 'Dark Current Omega',  'Dark Current Omega',  null, 'Lingbo',         '2025-09-18', '#221800', '#5C4A1E', 'Discovered within the ECHO-7 frequency drift. Communicates using an entirely new symbol system.',                                                         true),
  ('WLD-006', 'Prism Refraction Zone','Prism Refraction Zone',null,'Selene Marsh',  '2025-02-22', '#D4601A', '#C43020', 'A multiple-refraction signal source. Visual data presents rainbow-like interference patterns. Signs of life remain uncertain.',                            true),
  ('WLD-007', 'Twin Constellation World','Twin Constellation World',null,'Tariq Osei','2025-11-07','#E8A020','#4D8C3F','A world with two closely neighboring stars. Biological evolutionary paths have diverged significantly from our own.',                                        true),
  ('WLD-008', 'Eye of the Void',     'Eye of the Void',     null, 'Lu Mingyuan',    '2026-01-30', '#0F0A00', '#E8A020', 'A deep dark-matter region. Suspected observation window near the origin of the universe. Data is exceptionally rare.',                                      true);

-- ─────────────────────────────────────────
-- intel
-- ─────────────────────────────────────────

insert into public.intel (id, title, content, timestamp, tag, classified, created_by) values
  ('INT-001',
   'Parallel World Signal — First Confirmed Detection',
   'The intercepted signal operates at a variant band of 7.83Hz. Preliminary analysis confirms the existence of a parallel world node. The signal origin region has been flagged as Priority A for observation. All Voyagers must complete device calibration within 72 hours.',
   '2026-04-28T09:00:00Z', 'DEVICE', true, null),

  ('INT-002',
   'Putopia Collective — Q3 Architect Council Meeting Notes',
   'The Architect Council has approved three new known device nodes, located in Shanghai, Taipei, and Seoul. The Council also resolved to extend the next application window through the end of June 2026. New candidates must meet a minimum of 30 observation days on record.',
   '2026-04-15T14:30:00Z', 'ORG', false, null),

  ('INT-003',
   'Device ECHO-7 — Anomalous Activity Report',
   'The ECHO-7 unit in Beijing recorded frequency drift between April 3 and April 7. Drift amplitude exceeded the threshold of ±0.04Hz. The Voyager currently operating the device has submitted an anomaly log. The technical team is assessing whether temporary suspension of use is required.',
   '2026-04-10T11:15:00Z', 'DEVICE', true, null),

  ('INT-004',
   'New Member Briefing — Joining the Putopia Collective',
   'Welcome to all new applicants. The Collective was established in 2023 with a mission of systematic observation and documentation of parallel worlds. Applicants must complete the basic questionnaire before entering the candidate queue. Upon becoming a Voyager, you will receive device access rights and log publication privileges.',
   '2026-03-20T08:00:00Z', 'NOTICE', false, null),

  ('INT-005',
   'World Archive Expansion — Phase Two Announcement',
   'With catalogued parallel worlds now exceeding 200 nodes, the archive system will complete its Phase Two expansion in May 2026. All Voyagers will be able to upload high-resolution observation data to the new nodes. Legacy format files must be migrated before April 30.',
   '2026-03-05T16:45:00Z', 'ORG', false, null),

  ('INT-006',
   'URGENT: VEIL-3 Zone Access Lockdown',
   'Following an unexplained mass of anomalous material detected in the VEIL-3 region, the Council has suspended all device access to that zone effective immediately. Affected Voyagers will receive alternative device assignment plans. The lockdown is expected to remain in effect until the anomaly assessment is complete.',
   '2026-05-01T03:30:00Z', 'DEVICE', true, null);

-- ─────────────────────────────────────────
-- stories  (is_published = true for existing content)
-- ─────────────────────────────────────────

insert into public.stories (id, title, author_id, author_name, date, tags, excerpt, content, is_published) values
  (
    'i-will-keep-the-secret',
    'I Will Keep the Secret',
    null,
    'Voyager Luke',
    '2026-04-12',
    array['FIRST CONTACT', 'DISCOVERY'],
    'I first heard about the Putopia Collective a week ago, in a retro game console shop. At first, I thought it was just a joke. But when the shop owner spoke of the organization in a tone both dead-serious and mysterious, I suddenly felt a kind of calling.',
    'I first heard about the organization known as the Putopia Collective a week ago, in a retro game console shop.

At first, I thought it was just a joke—a prank played by the shop owner, who had always been a cynical yet humorous character. But when he spoke of the organization and the new members they were currently recruiting in a tone that was both dead-serious and mysterious, I suddenly felt a kind of calling. I thought to myself: perhaps maintaining parallel worlds is something I could do too.

In the time that followed, I submitted my application and waited for the organization''s approval. Truthfully, I had no idea how many people were in this organization or what the approval process entailed, but the shop owner seemed very certain he could get it sorted for me.

Then, three days ago, I received this device for the first time. Yes, this—the Multiverse Console. Its look and physical form don''t remind me of anything from my daily life: you could say it''s a bit like a radio, but it has a very peculiar screen; you could say it''s a television, but it doesn''t tune like a traditional TV, nor does it have any "smart" features; you could call it a monitor, yet the content it displays is unreal, even filled with uncertainty.

When I placed it on my desk, I realized it had become the central focus of the entire room, appearing utterly distinct.

And when I turned it on, twisting the knobs to search for a signal, my scalp went numb. It felt as though I was truly seeing images of worlds I was never meant to see—worlds I wasn''t even allowed to see. Just like that, it became the object I cared about most these past few days, a platform for me to communicate with other worlds.

More importantly, I am a Voyager of parallel worlds, a guardian of the multiverse. I need to explore more parallel worlds and try to interact with them; only then can I protect the peace and order of our existing world.

Over these three days, I''ve found four or five brand-new parallel worlds on the Multiverse Console. I tried to interact with the people in these worlds, but they all seemed unable to perceive my existence at first.

Until this morning. A person in a parallel world from the future looked straight at me. The moment he looked my way, I got goosebumps; my head felt tight, and I didn''t know what to do next. But right then, the device issued a warning—it trembled slightly, and a red light began to flash.

I knew I had done it right. I was establishing a stronger connection with the parallel world.

To be honest, I don''t know if I should share this story.

Perhaps I should help our organization find more suitable Voyagers, or perhaps I should just use this device alone and in silence, doing my best to find more. After all, when I received this device, there was a letter inside from the previous owner. He was from Germany and had used this device for twenty years. He must have discovered many parallel worlds; perhaps I can do the same.

I will slowly guard my relationship with it. I won''t let anyone take it away, and I certainly won''t let anyone know my secret.',
    true
  ),
  (
    'when-he-looked-at-me',
    'When He Looked at Me',
    null,
    'Voyager Page',
    '2026-04-28',
    array['PERSONAL', 'CONNECTION', 'QUANTUM EVENT'],
    'The Parallel World Observer on my desk was a gift from a friend. During a difficult period in my life, when I felt the entire world was abandoning me, a mysterious black box arrived that would change everything.',
    'The "Parallel World Observer" on my desk was actually a gift from a friend. During that period, due to changes in my job and my family, I had become extremely anxious. I felt as if the entire world was abandoning me. My friend, Tiantian, seemed to sense all of this. So, on a day that was neither a holiday nor a birthday or anniversary, he pushed a mysterious—or rather, very strange—black box in front of me.

He told me, "From this moment on, you will have a new identity: an Observer of Parallel Worlds."

When he said that, I couldn''t help but laugh out loud. Was this another one of his strange tricks? Yes, he was someone who often liked to play pranks and joke around, though never with any ill intent.

Under his watchful eye, I opened the device. Unbelievably, the packaging required a password to unlock. I entered the code, opened the case, and what met my eyes was something I couldn''t quite identify. It looked unique, as if it came from the past, yet also from the future—at the very least, it didn''t belong to the present. I always found it hard to pin down exactly what its functions were, but the knobs on either side gave me a clear signal: maybe if I turned them, I''d find something.

And so, I began my own exploration of parallel worlds. Oh, right—from that moment, I also became a member of the Putopia Collective, though I have no idea where the organization actually is.

Since then, I would occasionally spend time on the Multiverse Console, looking for new content and excitement; after all, I was really bored during that time. But as the exploration went deeper, I realized that this process—even just the simple act of staring at the device—could calm my mind. Yes, it seemed to have a strange healing power.

During this process, I found a world on the observer. There was a person in that world who looked a bit like me, but according to the time displayed on the screen, he was from 121 years in the future. Yes, he was from the future. I often saw him spacing out at his desk, reading, doing something with his brainwaves, or tossing and turning in bed. Occasionally he would disappear from the screen, but he always appeared every night.

Consequently, he became my most non-intrusive, wordless companion. I knew I could send signals to these parallel worlds through the device, or even interfere with their lives, but I didn''t want to do that.

Until one day—last night, to be precise. My mother called me again. The conversation was just as suffocating as usual; she said a lot to me, seemingly blaming all her recent misfortunes on me.

I felt incredibly sad, but I knew no one wanted to listen to me vent these bitter feelings, because everyone was having a hard time.

At that moment, I went to my desk, originally intending to scroll through my phone to kill time, but my gaze fell upon the "Parallel World Observer." He—the future him—was spacing out at that moment. I often watched him space out; it was actually quite interesting. He''d space out for a bit, stretch, and sometimes lean his head back against a cushion, looking very relaxed. Seeing him there, I had the urge for the first time to interact with him, or to make something happen between us.

So, I pressed and held the "Quantum Energy Button." With a "beep," I knew it was the prompt for recording, but for a moment, I didn''t know what to say.

After I let go, I suddenly realized he seemed to know I was there. He raised his head and looked at me, tilted his head slightly, and watched me for a long time. Perhaps because he didn''t hear any sound, he turned his head back.

I knew he had discovered me. Was this a failure of duty for a Parallel World Observer?

At that moment, a red light on the device lit up—it was the first time I had ever seen it turn on. My friend Tiantian had told me that when it lights up, it means I have truly established a connection across the universal parallel worlds.

So, I pressed the Quantum Energy Button once more. This time, after the "beep," I left my first message cast into the parallel world. I said, "Hey, how are you? I haven''t been doing well lately. Can you talk to me?"

He looked at me again. This time he frowned slightly, and then he began to laugh. His mouth didn''t move, but I clearly heard the thoughts in his mind.

He said, "Sure. Since you''re here, let''s talk. Tell me, which world are you from?"',
    true
  );
