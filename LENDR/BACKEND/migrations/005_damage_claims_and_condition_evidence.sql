-- Migration 005: Damage claims, return condition evidence, and complaints
-- Purpose: Audit trail for return condition, 24h damage disputes, proposed fines, and complaints.

-- 1. Add return_recorded_at column to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS return_recorded_at timestamptz;

-- Backfill return_recorded_at from booking_status_history where return was first recorded
UPDATE bookings b
SET return_recorded_at = sub.first_return
FROM (
  SELECT booking_id, min(created_at) AS first_return
  FROM booking_status_history
  WHERE new_status IN ('RETURN_REQUESTED', 'COMPLETED')
  GROUP BY booking_id
) sub
WHERE b.id = sub.booking_id AND b.return_recorded_at IS NULL;

-- 2. Expand damage_reports with fine proposals, borrower responses, and admin review fields
ALTER TABLE damage_reports DROP CONSTRAINT IF EXISTS damage_reports_status_check;
ALTER TABLE damage_reports ADD CONSTRAINT damage_reports_status_check
  CHECK (status IN ('SUBMITTED', 'AWAITING_BORROWER_RESPONSE', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED', 'OPEN'));

ALTER TABLE damage_reports
  ADD COLUMN IF NOT EXISTS proposed_fine_amount numeric(10,2) CHECK (proposed_fine_amount IS NULL OR proposed_fine_amount >= 0),
  ADD COLUMN IF NOT EXISTS fine_explanation text,
  ADD COLUMN IF NOT EXISTS borrower_response text,
  ADD COLUMN IF NOT EXISTS borrower_disputed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS borrower_evidence_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS borrower_responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS reopened_by_admin_id uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reopened_at timestamptz,
  ADD COLUMN IF NOT EXISTS reopened_reason text,
  ADD COLUMN IF NOT EXISTS resolved_by_admin_id uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_decision_notes text,
  ADD COLUMN IF NOT EXISTS final_approved_fine numeric(10,2) CHECK (final_approved_fine IS NULL OR final_approved_fine >= 0);

-- Prevent duplicate active claims on the same booking
CREATE UNIQUE INDEX IF NOT EXISTS damage_reports_one_active_per_booking
  ON damage_reports (booking_id)
  WHERE status NOT IN ('RESOLVED', 'DISMISSED');

-- 3. Create booking_condition_reports table (handover & return condition audit trail)
CREATE TABLE IF NOT EXISTS booking_condition_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  reporter_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  report_type text NOT NULL CHECK (report_type IN ('HANDOVER', 'RETURN', 'DAMAGE_INSPECTION')),
  condition text NOT NULL CHECK (condition IN ('NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR')),
  notes text NOT NULL DEFAULT '',
  evidence_urls text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS booking_condition_reports_booking_idx
  ON booking_condition_reports (booking_id, created_at DESC);
CREATE INDEX IF NOT EXISTS booking_condition_reports_reporter_idx
  ON booking_condition_reports (reporter_id, created_at DESC);

CREATE TRIGGER booking_condition_reports_set_updated_at
  BEFORE UPDATE ON booking_condition_reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. Create damage_report_status_history table
CREATE TABLE IF NOT EXISTS damage_report_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  damage_report_id uuid NOT NULL REFERENCES damage_reports(id) ON DELETE CASCADE,
  previous_status text,
  new_status text NOT NULL,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS damage_report_status_history_report_idx
  ON damage_report_status_history (damage_report_id, created_at DESC);

-- 5. Create complaints table
CREATE TABLE IF NOT EXISTS complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  complainant_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  category text NOT NULL,
  description text NOT NULL,
  evidence_urls text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED')),
  admin_notes text,
  resolved_by_admin_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT complaints_category_nonempty CHECK (length(btrim(category)) > 0),
  CONSTRAINT complaints_description_nonempty CHECK (length(btrim(description)) > 0)
);

CREATE INDEX IF NOT EXISTS complaints_booking_idx ON complaints (booking_id, created_at DESC);
CREATE INDEX IF NOT EXISTS complaints_complainant_idx ON complaints (complainant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS complaints_status_idx ON complaints (status, created_at DESC);

CREATE TRIGGER complaints_set_updated_at
  BEFORE UPDATE ON complaints
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
