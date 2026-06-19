-- schema_v43: re-engagement email dedup log
--
-- Tracks churn / owner-absence emails so each disengagement EPISODE triggers at
-- most one email. episode_key encodes the streak anchor (the user's last
-- participation point), so a fresh episode after they return can fire again.
CREATE TABLE IF NOT EXISTS signal_engagement_log (
  user_id     UUID NOT NULL,
  rule        TEXT NOT NULL,           -- 'owner_absent' | 'voter_churn'
  episode_key TEXT NOT NULL,           -- thread + streak anchor
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, rule, episode_key)
);
