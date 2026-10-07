CREATE TABLE IF NOT EXISTS public.reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE RESTRICT,
    equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE RESTRICT,
    reviewer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    reviewee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title text,
    comment text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_equipment_id
    ON public.reviews (equipment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id
    ON public.reviews (reviewee_id, created_at DESC);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own review activity and owner records"
    ON public.reviews FOR SELECT
    USING (
        reviewer_id = auth.uid()
        OR reviewee_id = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'ADMIN'
        )
    );

CREATE POLICY "Reviewers can create a review for completed bookings"
    ON public.reviews FOR INSERT
    WITH CHECK (
        reviewer_id = auth.uid()
        AND reviewee_id IS NOT NULL
    );

CREATE POLICY "Reviewers can update only their own reviews"
    ON public.reviews FOR UPDATE
    USING (reviewer_id = auth.uid())
    WITH CHECK (reviewer_id = auth.uid());

CREATE OR REPLACE FUNCTION public.create_review(
    p_booking_id uuid,
    p_rating integer,
    p_title text DEFAULT NULL,
    p_comment text DEFAULT NULL
)
RETURNS public.reviews
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_booking public.bookings;
    v_review public.reviews;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to create a review.';
    END IF;

    IF p_booking_id IS NULL THEN
        RAISE EXCEPTION 'Booking is required.';
    END IF;

    SELECT *
    INTO v_booking
    FROM public.bookings
    WHERE id = p_booking_id;

    IF v_booking.id IS NULL THEN
        RAISE EXCEPTION 'Booking does not exist.';
    END IF;

    IF v_booking.status <> 'COMPLETED' THEN
        RAISE EXCEPTION 'Reviews can only be created for completed bookings.';
    END IF;

    IF v_booking.renter_id <> v_user_id THEN
        RAISE EXCEPTION 'Only the renter can review a completed booking.';
    END IF;

    IF p_rating < 1 OR p_rating > 5 THEN
        RAISE EXCEPTION 'Rating must be between 1 and 5.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.reviews r
        WHERE r.booking_id = p_booking_id
    ) THEN
        RAISE EXCEPTION 'A review for this booking already exists.';
    END IF;

    INSERT INTO public.reviews (
        booking_id,
        equipment_id,
        reviewer_id,
        reviewee_id,
        rating,
        title,
        comment
    )
    VALUES (
        v_booking.id,
        v_booking.equipment_id,
        v_user_id,
        v_booking.owner_id,
        p_rating,
        p_title,
        p_comment
    )
    RETURNING * INTO v_review;

    RETURN v_review;
END;
$$;

CREATE OR REPLACE VIEW public.equipment_review_summary AS
SELECT
    e.id AS equipment_id,
    ROUND(AVG(r.rating)::numeric, 2) AS average_rating,
    COUNT(r.id)::int AS review_count
FROM public.equipment e
LEFT JOIN public.reviews r ON r.equipment_id = e.id
GROUP BY e.id;

CREATE TRIGGER reviews_set_updated_at
    BEFORE UPDATE ON public.reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
