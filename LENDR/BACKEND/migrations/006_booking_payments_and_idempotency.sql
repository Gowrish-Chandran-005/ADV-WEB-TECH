-- Migration 006: Booking payments, payment status tracking, and payment idempotency
-- Purpose: Support database-backed mock payment simulation with strict idempotency and audit trail.

-- 1. Add payment_status to bookings table
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'UNPAID'
  CHECK (payment_status IN ('UNPAID', 'PENDING', 'PAID', 'FAILED'));

CREATE INDEX IF NOT EXISTS bookings_payment_status_idx ON bookings (payment_status);

-- 2. Add payer_id to payments table
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS payer_id uuid REFERENCES users(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS payments_payer_idx ON payments (payer_id, created_at DESC);

-- 3. Enforce exactly one successful payment per booking (prevents double charging / duplicate payments)
CREATE UNIQUE INDEX IF NOT EXISTS payments_one_success_per_booking
  ON payments (booking_id)
  WHERE (status = 'SUCCESS');

-- 4. Backfill any existing payments with payer from booking
UPDATE payments p
SET payer_id = b.renter_id
FROM bookings b
WHERE p.booking_id = b.id AND p.payer_id IS NULL;

-- 5. Backfill payment_status on bookings based on existing successful payments
UPDATE bookings b
SET payment_status = 'PAID'
WHERE EXISTS (
  SELECT 1 FROM payments p
  WHERE p.booking_id = b.id AND p.status = 'SUCCESS'
);
