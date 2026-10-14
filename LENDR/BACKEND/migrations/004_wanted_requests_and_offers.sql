-- Migration 004: Student Gear Wanted Board and Equipment Offers
-- Purpose: Persistent storage for wanted requests and peer equipment offers.

-- ── 1. Create table: wanted_requests ──────────────────────────────────────────

CREATE TABLE wanted_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL,
  location_block text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  urgency text NOT NULL DEFAULT 'MEDIUM'
    CHECK (urgency IN ('HIGH', 'MEDIUM')),
  status text NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'FULFILLED', 'WITHDRAWN', 'EXPIRED')),
  expires_at timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT wanted_requests_title_nonempty CHECK (
    length(btrim(title)) > 0 AND length(title) <= 150
  ),
  CONSTRAINT wanted_requests_description_nonempty CHECK (
    length(btrim(description)) > 0 AND length(description) <= 2000
  ),
  CONSTRAINT wanted_requests_location_block_length CHECK (
    location_block IS NULL OR (length(btrim(location_block)) > 0 AND length(location_block) <= 100)
  ),
  CONSTRAINT wanted_requests_valid_date_range CHECK (
    end_date >= start_date
  )
);

CREATE INDEX wanted_requests_user_idx ON wanted_requests (user_id);
CREATE INDEX wanted_requests_status_created_idx ON wanted_requests (status, created_at DESC);
CREATE INDEX wanted_requests_category_status_idx ON wanted_requests (category_id, status)
  WHERE category_id IS NOT NULL;
CREATE INDEX wanted_requests_dates_idx ON wanted_requests (start_date, end_date);
CREATE INDEX wanted_requests_expires_at_idx ON wanted_requests (expires_at)
  WHERE status = 'OPEN';

CREATE TRIGGER wanted_requests_set_updated_at
  BEFORE UPDATE ON wanted_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 2. Create table: wanted_offers ────────────────────────────────────────────

CREATE TABLE wanted_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wanted_request_id uuid NOT NULL REFERENCES wanted_requests(id) ON DELETE CASCADE,
  offerer_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  equipment_id uuid NOT NULL REFERENCES equipment(id) ON DELETE RESTRICT,
  message text,
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN')),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT wanted_offers_message_length CHECK (
    message IS NULL OR (length(btrim(message)) > 0 AND length(message) <= 1000)
  )
);

CREATE INDEX wanted_offers_request_idx ON wanted_offers (wanted_request_id, created_at DESC);
CREATE INDEX wanted_offers_offerer_idx ON wanted_offers (offerer_user_id, created_at DESC);
CREATE INDEX wanted_offers_equipment_idx ON wanted_offers (equipment_id);
CREATE INDEX wanted_offers_status_idx ON wanted_offers (status);

-- Prevent duplicate pending offers for the same equipment on the same request
CREATE UNIQUE INDEX wanted_offers_unique_pending_offer
  ON wanted_offers (wanted_request_id, offerer_user_id, equipment_id)
  WHERE status = 'PENDING';

-- Prevent multiple accepted offers for the same request
CREATE UNIQUE INDEX wanted_offers_single_accepted
  ON wanted_offers (wanted_request_id)
  WHERE status = 'ACCEPTED';

CREATE TRIGGER wanted_offers_set_updated_at
  BEFORE UPDATE ON wanted_offers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 3. Integrity Triggers ─────────────────────────────────────────────────────

-- Prevent self-offers: A student cannot offer gear on their own wanted request
CREATE FUNCTION enforce_no_self_wanted_offer()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  request_author_id uuid;
BEGIN
  SELECT user_id INTO request_author_id
  FROM wanted_requests
  WHERE id = NEW.wanted_request_id;

  IF request_author_id = NEW.offerer_user_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'wanted_offers_no_self_offer',
      MESSAGE = 'Students cannot offer gear on their own wanted request.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER wanted_offers_enforce_no_self_offer
  BEFORE INSERT OR UPDATE OF offerer_user_id, wanted_request_id ON wanted_offers
  FOR EACH ROW EXECUTE FUNCTION enforce_no_self_wanted_offer();

-- Prevent offering equipment that the student does not own or that is inactive
CREATE FUNCTION enforce_offered_equipment_ownership()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  eq_owner_id uuid;
  eq_status text;
BEGIN
  SELECT owner_user_id, status INTO eq_owner_id, eq_status
  FROM equipment
  WHERE id = NEW.equipment_id;

  IF eq_owner_id IS DISTINCT FROM NEW.offerer_user_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'wanted_offers_equipment_must_be_owned',
      MESSAGE = 'You can only offer equipment that you own.';
  END IF;

  IF eq_status <> 'ACTIVE' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'wanted_offers_equipment_must_be_active',
      MESSAGE = 'Offered equipment must be active.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER wanted_offers_enforce_equipment_ownership
  BEFORE INSERT OR UPDATE OF offerer_user_id, equipment_id ON wanted_offers
  FOR EACH ROW EXECUTE FUNCTION enforce_offered_equipment_ownership();
