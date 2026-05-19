-- schema_v7: add youtube_id to stories table
ALTER TABLE stories ADD COLUMN IF NOT EXISTS youtube_id TEXT DEFAULT NULL;
