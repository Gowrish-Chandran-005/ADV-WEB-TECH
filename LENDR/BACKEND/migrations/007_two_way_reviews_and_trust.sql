-- Migration 007: Two-way trust reviews, review directions, and double-blind visibility
-- Purpose: Support Direction A (renter reviews owner) and Direction B (owner reviews renter),
-- with fair double-blind review reveal policy and student trust reputation tracking.

-- 1. Drop old single-review-per-booking constraint and renter-only foreign key & trigger
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_one_per_booking;
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_booking_equipment_renter_fk;
DROP TRIGGER IF EXISTS reviews_require_completed_booking ON reviews;
DROP FUNCTION IF EXISTS enforce_review_for_completed_booking();

-- 2. Add direction, status, and reveal_at columns
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'RENTER_TO_OWNER'
    CHECK (direction IN ('RENTER_TO_OWNER', 'OWNER_TO_RENTER')),
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'PENDING_REVEAL'
    CHECK (status IN ('PENDING_REVEAL', 'REVEALED')),
  ADD COLUMN IF NOT EXISTS reveal_at timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP + interval '7 days');

-- 3. Add explicit foreign keys
ALTER TABLE reviews
  DROP CONSTRAINT IF EXISTS reviews_booking_id_fkey,
  ADD CONSTRAINT reviews_booking_id_fkey
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT;

ALTER TABLE reviews
  DROP CONSTRAINT IF EXISTS reviews_equipment_id_fkey,
  ADD CONSTRAINT reviews_equipment_id_fkey
    FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE RESTRICT;

-- 4. Unique constraint: exactly one review per booking per direction
CREATE UNIQUE INDEX IF NOT EXISTS reviews_booking_direction_unique
  ON reviews (booking_id, direction);

-- 5. Mark any existing historical reviews as REVEALED
UPDATE reviews
SET status = 'REVEALED'
WHERE status = 'PENDING_REVEAL';

-- 6. Indexes for efficient lookup of reputation and double-blind visibility
CREATE INDEX IF NOT EXISTS reviews_reviewed_user_direction_idx
  ON reviews (reviewed_user_id, direction, status, reveal_at);

CREATE INDEX IF NOT EXISTS reviews_booking_idx
  ON reviews (booking_id);

CREATE INDEX IF NOT EXISTS reviews_equipment_direction_idx
  ON reviews (equipment_id, direction, status, reveal_at);

-- 7. Trigger enforcing two-way review rules:
-- - Booking must be COMPLETED
-- - For RENTER_TO_OWNER: reviewer must be booking.renter_id, reviewed_user must be equipment.owner_user_id
-- - For OWNER_TO_RENTER: reviewer must be equipment.owner_user_id, reviewed_user must be booking.renter_id
-- - reviewer <> reviewed_user (no self-reviews)
CREATE OR REPLACE FUNCTION enforce_two_way_review_rules()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  b_status text;
  b_renter_id uuid;
  e_owner_id uuid;
  reciprocal_count integer;
BEGIN
  SELECT b.status, b.renter_id, e.owner_user_id
  INTO b_status, b_renter_id, e_owner_id
  FROM bookings b
  JOIN equipment e ON e.id = b.equipment_id
  WHERE b.id = NEW.booking_id;

  IF b_status IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      CONSTRAINT = 'reviews_booking_fkey',
      MESSAGE = 'The booking does not exist.';
  END IF;

  IF b_status <> 'COMPLETED' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'reviews_booking_must_be_completed',
      MESSAGE = 'Reviews can only be submitted for completed bookings.';
  END IF;

  IF NEW.direction = 'RENTER_TO_OWNER' THEN
    IF NEW.reviewer_id <> b_renter_id THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'reviews_renter_mismatch',
        MESSAGE = 'Only the renter can submit a renter-to-owner review.';
    END IF;
    IF NEW.reviewed_user_id <> e_owner_id THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'reviews_reviewed_owner_mismatch',
        MESSAGE = 'Renter review must target the equipment owner.';
    END IF;
  ELSIF NEW.direction = 'OWNER_TO_RENTER' THEN
    IF NEW.reviewer_id <> e_owner_id THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'reviews_owner_mismatch',
        MESSAGE = 'Only the equipment owner can submit an owner-to-renter review.';
    END IF;
    IF NEW.reviewed_user_id <> b_renter_id THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'reviews_reviewed_renter_mismatch',
        MESSAGE = 'Owner review must target the renter.';
    END IF;
  END IF;

  IF NEW.reviewer_id = NEW.reviewed_user_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'reviews_no_self_review',
      MESSAGE = 'Students cannot review themselves.';
  END IF;

  -- Check if reciprocal review exists for mutual reveal
  SELECT count(*) INTO reciprocal_count
  FROM reviews
  WHERE booking_id = NEW.booking_id
    AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF reciprocal_count > 0 THEN
    NEW.status := 'REVEALED';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_enforce_two_way ON reviews;
CREATE TRIGGER reviews_enforce_two_way
  BEFORE INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION enforce_two_way_review_rules();

-- 8. Auto-reveal reciprocal review when second review is submitted
CREATE OR REPLACE FUNCTION reveal_reciprocal_review()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE reviews
  SET status = 'REVEALED'
  WHERE booking_id = NEW.booking_id
    AND status = 'PENDING_REVEAL';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_auto_reveal_reciprocal ON reviews;
CREATE TRIGGER reviews_auto_reveal_reciprocal
  AFTER INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION reveal_reciprocal_review();
