CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  registration_number text,
  phone text,
  role text NOT NULL DEFAULT 'STUDENT'
    CHECK (role IN ('STUDENT', 'ADMIN')),
  status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DEACTIVATED')),
  email_verified_at timestamptz,
  token_version integer NOT NULL DEFAULT 0 CHECK (token_version >= 0),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT users_email_normalized_vit CHECK (
    email = lower(btrim(email))
    AND email ~ '^[a-z0-9._%+-]+@vitstudent[.]ac[.]in$'
  ),
  CONSTRAINT users_full_name_nonempty CHECK (length(btrim(full_name)) > 0),
  CONSTRAINT users_password_hash_nonempty CHECK (length(password_hash) > 0)
);

CREATE UNIQUE INDEX users_registration_number_unique
  ON users (registration_number)
  WHERE registration_number IS NOT NULL;

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT categories_name_nonempty CHECK (length(btrim(name)) > 0),
  CONSTRAINT categories_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

INSERT INTO categories (name, slug) VALUES
  ('Cameras', 'cameras'),
  ('Audio', 'audio'),
  ('Electronics', 'electronics'),
  ('Project Kits', 'project-kits'),
  ('Computing', 'computing'),
  ('Lighting', 'lighting'),
  ('Event Equipment', 'event-equipment'),
  ('Sports', 'sports'),
  ('Tools', 'tools'),
  ('Academic', 'academic'),
  ('Other', 'other')
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'SUSPENDED', 'ARCHIVED')),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT organizations_name_nonempty CHECK (length(btrim(name)) > 0),
  CONSTRAINT organizations_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE TABLE organization_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  membership_role text NOT NULL DEFAULT 'MEMBER'
    CHECK (membership_role IN ('OWNER', 'ADMIN', 'MEMBER')),
  status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'SUSPENDED', 'LEFT')),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT organization_memberships_unique_member UNIQUE (organization_id, user_id)
);

CREATE INDEX organization_memberships_user_idx ON organization_memberships (user_id);

CREATE TABLE equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  features text[] NOT NULL DEFAULT '{}',
  use_cases text[] NOT NULL DEFAULT '{}',
  specifications jsonb NOT NULL DEFAULT '{}'::jsonb,
  image_urls text[] NOT NULL DEFAULT '{}',
  daily_rental_price numeric(10,2) NOT NULL DEFAULT 0 CHECK (daily_rental_price >= 0),
  security_deposit numeric(10,2) CHECK (security_deposit IS NULL OR security_deposit >= 0),
  max_rental_days integer NOT NULL DEFAULT 30 CHECK (max_rental_days BETWEEN 1 AND 365),
  pickup_location text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'ARCHIVED')),
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT equipment_title_nonempty CHECK (length(btrim(title)) > 0),
  CONSTRAINT equipment_description_nonempty CHECK (length(btrim(description)) > 0),
  CONSTRAINT equipment_pickup_location_nonempty CHECK (length(btrim(pickup_location)) > 0),
  CONSTRAINT equipment_specifications_object CHECK (jsonb_typeof(specifications) = 'object')
);

CREATE INDEX equipment_owner_idx ON equipment (owner_user_id);
CREATE INDEX equipment_organization_idx ON equipment (organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX equipment_category_status_idx ON equipment (category_id, status);
CREATE INDEX equipment_status_created_idx ON equipment (status, created_at DESC);
CREATE INDEX equipment_tags_gin_idx ON equipment USING gin (tags);
CREATE INDEX equipment_use_cases_gin_idx ON equipment USING gin (use_cases);
CREATE INDEX equipment_search_vector_gin_idx ON equipment USING gin (search_vector);

CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES equipment(id) ON DELETE RESTRICT,
  renter_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN (
      'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED',
      'ACTIVE', 'RETURN_REQUESTED', 'COMPLETED'
    )),
  rental_days integer NOT NULL CHECK (rental_days > 0),
  daily_rental_price_snapshot numeric(10,2) NOT NULL CHECK (daily_rental_price_snapshot >= 0),
  security_deposit_snapshot numeric(10,2) NOT NULL DEFAULT 0
    CHECK (security_deposit_snapshot >= 0),
  total_price numeric(10,2) NOT NULL CHECK (total_price >= 0),
  notes text,
  expires_at timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP + interval '48 hours'),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT bookings_valid_range CHECK (end_at > start_at),
  CONSTRAINT bookings_start_ist_midnight CHECK (
    start_at = ((start_at AT TIME ZONE 'Asia/Kolkata')::date::timestamp AT TIME ZONE 'Asia/Kolkata')
  ),
  CONSTRAINT bookings_end_ist_midnight CHECK (
    end_at = ((end_at AT TIME ZONE 'Asia/Kolkata')::date::timestamp AT TIME ZONE 'Asia/Kolkata')
  ),
  CONSTRAINT bookings_rental_days_match_dates CHECK (
    rental_days = (
      (end_at AT TIME ZONE 'Asia/Kolkata')::date
      - (start_at AT TIME ZONE 'Asia/Kolkata')::date
    )
  ),
  CONSTRAINT bookings_total_matches_snapshot CHECK (
    total_price = rental_days * daily_rental_price_snapshot + security_deposit_snapshot
  ),
  CONSTRAINT bookings_pending_expiry_required CHECK (status <> 'PENDING' OR expires_at IS NOT NULL),
  CONSTRAINT bookings_id_equipment_renter_unique UNIQUE (id, equipment_id, renter_id),
  CONSTRAINT bookings_no_overlapping_blocking_equipment
    EXCLUDE USING gist (
      equipment_id WITH =,
      tstzrange(start_at, end_at, '[)') WITH &&
    )
    WHERE (status IN ('PENDING', 'APPROVED', 'ACTIVE', 'RETURN_REQUESTED'))
);

CREATE INDEX bookings_renter_created_idx ON bookings (renter_id, created_at DESC);
CREATE INDEX bookings_equipment_start_idx ON bookings (equipment_id, start_at, end_at);
CREATE INDEX bookings_status_expiry_idx ON bookings (status, expires_at)
  WHERE status = 'PENDING';
CREATE INDEX bookings_renter_pending_expiry_idx ON bookings (renter_id, expires_at)
  WHERE status = 'PENDING';
CREATE INDEX bookings_status_idx ON bookings (status);

CREATE FUNCTION enforce_pending_booking_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  pending_count integer;
BEGIN
  IF NEW.status <> 'PENDING' OR NEW.expires_at <= CURRENT_TIMESTAMP THEN
    RETURN NEW;
  END IF;

  PERFORM 1
  FROM users
  WHERE id = NEW.renter_id
  FOR UPDATE;

  SELECT count(*) INTO pending_count
  FROM bookings
  WHERE renter_id = NEW.renter_id
    AND status = 'PENDING'
    AND expires_at > CURRENT_TIMESTAMP
    AND id <> NEW.id;

  IF pending_count >= 3 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'bookings_pending_limit',
      MESSAGE = 'A student may have at most three unexpired pending bookings.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER bookings_enforce_pending_limit
  BEFORE INSERT OR UPDATE OF status, renter_id, expires_at ON bookings
  FOR EACH ROW EXECUTE FUNCTION enforce_pending_booking_limit();

CREATE TABLE booking_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  previous_status text CHECK (
    previous_status IS NULL OR previous_status IN (
      'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED',
      'ACTIVE', 'RETURN_REQUESTED', 'COMPLETED'
    )
  ),
  new_status text NOT NULL CHECK (new_status IN (
    'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED',
    'ACTIVE', 'RETURN_REQUESTED', 'COMPLETED'
  )),
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX booking_status_history_booking_idx
  ON booking_status_history (booking_id, created_at);

CREATE TABLE maintenance_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES equipment(id) ON DELETE RESTRICT,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  reason text NOT NULL,
  created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT maintenance_blocks_valid_range CHECK (end_at > start_at),
  CONSTRAINT maintenance_blocks_reason_nonempty CHECK (length(btrim(reason)) > 0),
  CONSTRAINT maintenance_blocks_no_overlap
    EXCLUDE USING gist (
      equipment_id WITH =,
      tstzrange(start_at, end_at, '[)') WITH &&
    )
);

CREATE INDEX maintenance_blocks_equipment_time_idx
  ON maintenance_blocks (equipment_id, start_at, end_at);

CREATE TABLE favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT favorites_user_equipment_unique UNIQUE (user_id, equipment_id)
);

CREATE INDEX favorites_equipment_idx ON favorites (equipment_id);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT notifications_type_nonempty CHECK (length(btrim(type)) > 0),
  CONSTRAINT notifications_title_nonempty CHECK (length(btrim(title)) > 0),
  CONSTRAINT notifications_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX notifications_user_unread_idx ON notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  reviewer_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reviewed_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  equipment_id uuid NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT reviews_one_per_booking UNIQUE (booking_id),
  CONSTRAINT reviews_booking_equipment_renter_fk
    FOREIGN KEY (booking_id, equipment_id, reviewer_id)
    REFERENCES bookings (id, equipment_id, renter_id)
    ON DELETE RESTRICT
);

CREATE FUNCTION enforce_review_for_completed_booking()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  booking_status text;
BEGIN
  SELECT status INTO booking_status
  FROM bookings
  WHERE id = NEW.booking_id
    AND equipment_id = NEW.equipment_id
    AND renter_id = NEW.reviewer_id;

  IF booking_status IS DISTINCT FROM 'COMPLETED' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'reviews_booking_must_be_completed',
      MESSAGE = 'A review can only be created for a completed booking by its renter.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER reviews_require_completed_booking
  BEFORE INSERT OR UPDATE OF booking_id, equipment_id, reviewer_id ON reviews
  FOR EACH ROW EXECUTE FUNCTION enforce_review_for_completed_booking();

CREATE INDEX reviews_equipment_created_idx ON reviews (equipment_id, created_at DESC);
CREATE INDEX reviews_reviewed_user_created_idx ON reviews (reviewed_user_id, created_at DESC);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  amount numeric(10,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  provider text NOT NULL DEFAULT 'MOCK' CHECK (provider = 'MOCK'),
  provider_reference text,
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT payments_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX payments_booking_created_idx ON payments (booking_id, created_at DESC);
CREATE UNIQUE INDEX payments_mock_reference_unique
  ON payments (provider_reference)
  WHERE provider_reference IS NOT NULL;

CREATE TABLE damage_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  reporter_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED')),
  evidence_urls text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT damage_reports_description_nonempty CHECK (length(btrim(description)) > 0)
);

CREATE INDEX damage_reports_booking_idx ON damage_reports (booking_id, created_at DESC);
CREATE INDEX damage_reports_status_idx ON damage_reports (status, created_at DESC);

CREATE TABLE demand_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id) ON DELETE RESTRICT,
  date_bucket date NOT NULL,
  duration_days integer CHECK (duration_days IS NULL OR duration_days > 0),
  demand_count integer NOT NULL CHECK (demand_count >= 0),
  source text NOT NULL CHECK (source IN ('REAL', 'DEMO')),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX demand_history_category_date_source_idx
  ON demand_history (category_id, date_bucket, source);

CREATE TABLE admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT admin_audit_action_nonempty CHECK (length(btrim(action)) > 0),
  CONSTRAINT admin_audit_target_type_nonempty CHECK (length(btrim(target_type)) > 0),
  CONSTRAINT admin_audit_metadata_object CHECK (
    jsonb_typeof(metadata) = 'object'
    AND NOT (metadata ?| ARRAY['password', 'password_hash', 'token', 'secret', 'authorization'])
  )
);

CREATE INDEX admin_audit_log_admin_created_idx
  ON admin_audit_log (admin_user_id, created_at DESC);
CREATE INDEX admin_audit_log_target_idx
  ON admin_audit_log (target_type, target_id, created_at DESC);

CREATE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER categories_set_updated_at
  BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER organizations_set_updated_at
  BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER organization_memberships_set_updated_at
  BEFORE UPDATE ON organization_memberships FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER equipment_set_updated_at
  BEFORE UPDATE ON equipment FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER bookings_set_updated_at
  BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER maintenance_blocks_set_updated_at
  BEFORE UPDATE ON maintenance_blocks FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER reviews_set_updated_at
  BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER payments_set_updated_at
  BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER damage_reports_set_updated_at
  BEFORE UPDATE ON damage_reports FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER demand_history_set_updated_at
  BEFORE UPDATE ON demand_history FOR EACH ROW EXECUTE FUNCTION set_updated_at();
