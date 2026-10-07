CREATE TABLE IF NOT EXISTS public.damage_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE RESTRICT,
    booking_id uuid REFERENCES public.bookings(id) ON DELETE RESTRICT,
    reported_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    description text NOT NULL,
    severity text NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED')),
    estimated_cost numeric(10,2) DEFAULT 0 CHECK (estimated_cost >= 0),
    actual_cost numeric(10,2) DEFAULT 0 CHECK (actual_cost >= 0),
    resolution_notes text,
    resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    reported_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_damage_reports_equipment_id
    ON public.damage_reports (equipment_id, reported_at DESC);

CREATE INDEX IF NOT EXISTS idx_damage_reports_booking_id
    ON public.damage_reports (booking_id);

CREATE INDEX IF NOT EXISTS idx_damage_reports_status
    ON public.damage_reports (status, reported_at DESC);

ALTER TABLE public.damage_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and reporters can read relevant damage reports"
    ON public.damage_reports FOR SELECT
    USING (
        reported_by = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM public.equipment e
            WHERE e.id = damage_reports.equipment_id
              AND e.owner_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'ADMIN'
        )
    );

CREATE POLICY "Users can create damage reports when involved in the booking"
    ON public.damage_reports FOR INSERT
    WITH CHECK (
        reported_by = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM public.bookings b
            WHERE b.id = booking_id
              AND b.equipment_id = equipment_id
              AND (b.renter_id = auth.uid() OR b.owner_id = auth.uid())
        )
    );

CREATE POLICY "Owners and reporters can update relevant damage reports"
    ON public.damage_reports FOR UPDATE
    USING (
        reported_by = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM public.equipment e
            WHERE e.id = damage_reports.equipment_id
              AND e.owner_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'ADMIN'
        )
    )
    WITH CHECK (
        reported_by = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM public.equipment e
            WHERE e.id = equipment_id
              AND e.owner_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'ADMIN'
        )
    );

CREATE OR REPLACE FUNCTION public.create_damage_report(
    p_equipment_id uuid,
    p_booking_id uuid,
    p_description text,
    p_severity text,
    p_estimated_cost numeric DEFAULT 0
)
RETURNS public.damage_reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_booking public.bookings;
    v_report public.damage_reports;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to report damage.';
    END IF;

    IF p_equipment_id IS NULL OR p_booking_id IS NULL THEN
        RAISE EXCEPTION 'Equipment and booking are required.';
    END IF;

    SELECT *
    INTO v_booking
    FROM public.bookings
    WHERE id = p_booking_id;

    IF v_booking.id IS NULL THEN
        RAISE EXCEPTION 'Booking does not exist.';
    END IF;

    IF v_booking.equipment_id <> p_equipment_id THEN
        RAISE EXCEPTION 'The booking does not belong to the selected equipment.';
    END IF;

    IF v_booking.renter_id <> v_user_id AND v_booking.owner_id <> v_user_id THEN
        RAISE EXCEPTION 'Only the renter or equipment owner can report damage.';
    END IF;

    INSERT INTO public.damage_reports (
        equipment_id,
        booking_id,
        reported_by,
        description,
        severity,
        status,
        estimated_cost
    )
    VALUES (
        p_equipment_id,
        p_booking_id,
        v_user_id,
        p_description,
        p_severity,
        'OPEN',
        p_estimated_cost
    )
    RETURNING * INTO v_report;

    RETURN v_report;
END;
$$;

CREATE TRIGGER damage_reports_set_updated_at
    BEFORE UPDATE ON public.damage_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
