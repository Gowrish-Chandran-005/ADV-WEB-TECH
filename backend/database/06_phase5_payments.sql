CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
    payer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
    payment_type text NOT NULL CHECK (payment_type IN ('RENTAL', 'SECURITY_DEPOSIT', 'REFUND')),
    status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED')),
    transaction_reference text UNIQUE,
    paid_at timestamptz,
    refunded_at timestamptz,
    refund_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (refund_amount >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id
    ON public.payments (booking_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_payer_id
    ON public.payments (payer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_status
    ON public.payments (status, created_at DESC);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Renters can view their own payments"
    ON public.payments FOR SELECT
    USING (
        payer_id = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'ADMIN'
        )
    );

CREATE POLICY "Owners can view payments tied to their equipment"
    ON public.payments FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.bookings b
            WHERE b.id = payments.booking_id
              AND b.owner_id = auth.uid()
        )
    );

CREATE POLICY "No direct payment deletion"
    ON public.payments FOR DELETE
    USING (false);

CREATE OR REPLACE FUNCTION public.create_mock_payment(
    p_booking_id uuid,
    p_payment_type text
)
RETURNS public.payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_booking public.bookings;
    v_payment public.payments;
    v_amount numeric(10,2);
    v_reference text;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication is required to create a payment.';
    END IF;

    IF p_payment_type NOT IN ('RENTAL', 'SECURITY_DEPOSIT') THEN
        RAISE EXCEPTION 'Unsupported mock payment type.';
    END IF;

    SELECT * INTO v_booking
    FROM public.bookings
    WHERE id = p_booking_id;

    IF v_booking.id IS NULL THEN
        RAISE EXCEPTION 'Booking not found.';
    END IF;

    IF v_booking.renter_id <> v_user_id THEN
        RAISE EXCEPTION 'Only the renter can create a payment for this booking.';
    END IF;

    IF v_booking.status NOT IN ('APPROVED', 'COMPLETED') THEN
        RAISE EXCEPTION 'This booking is not currently in a payable state.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.payments p
        WHERE p.booking_id = p_booking_id
          AND p.payment_type = p_payment_type
          AND p.status IN ('SUCCESS', 'PARTIALLY_REFUNDED')
    ) THEN
        RAISE EXCEPTION 'A successful payment already exists for this booking and payment type.';
    END IF;

    v_amount := CASE p_payment_type
        WHEN 'RENTAL' THEN v_booking.total_amount
        WHEN 'SECURITY_DEPOSIT' THEN v_booking.security_deposit
    END;

    v_reference := 'MOCK-' || to_char(now(), 'YYYYMMDDHH24MISSMS') || '-' || replace(gen_random_uuid()::text, '-', '');

    INSERT INTO public.payments (
        booking_id,
        payer_id,
        amount,
        payment_type,
        status,
        transaction_reference,
        paid_at
    )
    VALUES (
        p_booking_id,
        v_user_id,
        v_amount,
        p_payment_type,
        'SUCCESS',
        v_reference,
        now()
    )
    RETURNING * INTO v_payment;

    RETURN v_payment;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_mock_refund(
    p_payment_id uuid,
    p_refund_amount numeric
)
RETURNS public.payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_payment public.payments;
    v_booking public.bookings;
    v_is_owner boolean := false;
    v_is_admin boolean := false;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication is required to process a refund.';
    END IF;

    SELECT * INTO v_payment
    FROM public.payments
    WHERE id = p_payment_id;

    IF v_payment.id IS NULL THEN
        RAISE EXCEPTION 'Payment not found.';
    END IF;

    IF p_refund_amount <= 0 THEN
        RAISE EXCEPTION 'Refund amount must be greater than zero.';
    END IF;

    IF v_payment.status = 'REFUNDED' THEN
        RAISE EXCEPTION 'This payment has already been fully refunded.';
    END IF;

    IF v_payment.refund_amount + p_refund_amount > v_payment.amount THEN
        RAISE EXCEPTION 'Refund amount cannot exceed the original payment amount.';
    END IF;

    SELECT * INTO v_booking
    FROM public.bookings
    WHERE id = v_payment.booking_id;

    IF v_booking.id IS NULL THEN
        RAISE EXCEPTION 'Booking associated with the payment could not be found.';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = v_user_id
          AND p.role = 'ADMIN'
    ) INTO v_is_admin;

    IF v_booking.owner_id = v_user_id THEN
        v_is_owner := true;
    END IF;

    IF NOT (v_is_owner OR v_is_admin) THEN
        RAISE EXCEPTION 'Only the owner or an admin can process a refund.';
    END IF;

    UPDATE public.payments
    SET
        refund_amount = v_payment.refund_amount + p_refund_amount,
        refunded_at = now(),
        status = CASE
            WHEN v_payment.refund_amount + p_refund_amount >= v_payment.amount THEN 'REFUNDED'
            ELSE 'PARTIALLY_REFUNDED'
        END,
        updated_at = now()
    WHERE id = p_payment_id
    RETURNING * INTO v_payment;

    RETURN v_payment;
END;
$$;

CREATE TRIGGER payments_set_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
