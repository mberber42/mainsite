CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_users_email_unique ON admin_users (lower(email));

CREATE TABLE IF NOT EXISTS cms_sessions (
  sid varchar NOT NULL PRIMARY KEY,
  sess json NOT NULL,
  expire timestamp(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS cms_sessions_expire_idx ON cms_sessions (expire);

CREATE TABLE IF NOT EXISTS content_entries (
  id uuid PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('blog', 'lab', 'services', 'faqs', 'testimonials', 'social-links', 'hero', 'seo')),
  slug text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL CHECK (status IN ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, slug)
);
CREATE INDEX IF NOT EXISTS content_entries_public_idx
  ON content_entries (kind, status, published_at DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  read_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contact_messages_recent_idx ON contact_messages (created_at DESC);

CREATE TABLE IF NOT EXISTS stored_files (
  id uuid PRIMARY KEY,
  storage_key text NOT NULL UNIQUE,
  original_name text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image/png', 'image/jpeg', 'image/webp', 'application/pdf')),
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  purpose text NOT NULL CHECK (purpose IN ('image', 'cv')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
