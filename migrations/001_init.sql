-- Food Lens v2 schema
-- Requires pgvector (available on Neon, Supabase, and any modern Postgres).

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_sub   text UNIQUE NOT NULL,
  email        text,
  name         text,
  picture_url  text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id          text PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS dishes (
  id           text PRIMARY KEY,
  name         text NOT NULL,
  type         text NOT NULL DEFAULT '',
  origin       text NOT NULL DEFAULT '',
  description  text NOT NULL DEFAULT '',
  is_curated   boolean NOT NULL DEFAULT true,
  created_by   uuid REFERENCES users(id) ON DELETE SET NULL,
  embedding    vector(1536),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dishes_embedding_idx
  ON dishes USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
CREATE INDEX IF NOT EXISTS dishes_name_idx ON dishes (lower(name));

CREATE TABLE IF NOT EXISTS enrichments (
  dish_id       text PRIMARY KEY REFERENCES dishes(id) ON DELETE CASCADE,
  ingredients   text[] NOT NULL DEFAULT '{}',
  history       text NOT NULL DEFAULT '',
  model         text,
  generated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS saved_dishes (
  user_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dish_id   text NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  note      text,
  saved_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, dish_id)
);
CREATE INDEX IF NOT EXISTS saved_dishes_user_idx ON saved_dishes(user_id);

CREATE TABLE IF NOT EXISTS corrections (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid REFERENCES users(id) ON DELETE SET NULL,
  original_name       text NOT NULL,
  corrected_name      text NOT NULL,
  resulting_dish_id   text REFERENCES dishes(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS corrections_user_idx ON corrections(user_id);
CREATE INDEX IF NOT EXISTS corrections_dish_idx ON corrections(resulting_dish_id);
