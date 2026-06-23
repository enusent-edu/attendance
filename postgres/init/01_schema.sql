CREATE SCHEMA IF NOT EXISTS attendance;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS attendance.orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES attendance.orgs(id),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES attendance.orgs(id),
  member_no TEXT,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  meta JSONB DEFAULT '{}',
  photo_url TEXT,
  face_encoding JSONB,
  qr_code TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES attendance.orgs(id),
  name TEXT NOT NULL,
  description TEXT,
  attendance_method TEXT DEFAULT 'face',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance.member_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES attendance.members(id) ON DELETE CASCADE,
  group_id UUID REFERENCES attendance.groups(id) ON DELETE CASCADE,
  UNIQUE(member_id, group_id)
);

CREATE TABLE IF NOT EXISTS attendance.logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES attendance.orgs(id),
  member_id UUID REFERENCES attendance.members(id),
  group_id UUID REFERENCES attendance.groups(id),
  date DATE NOT NULL,
  time_in TIMESTAMPTZ,
  time_out TIMESTAMPTZ,
  method TEXT,
  status TEXT DEFAULT 'present',
  remarks TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(member_id, date)
);

INSERT INTO attendance.orgs (id, name) VALUES ('00000000-0000-0000-0000-000000000001', 'Default Org')
  ON CONFLICT DO NOTHING;

INSERT INTO attendance.users (org_id, email, full_name, role, password_hash)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@attendance.demo',
  'Admin User',
  'admin',
  encode(digest('admin123', 'sha256'), 'hex')
) ON CONFLICT (email) DO NOTHING;
