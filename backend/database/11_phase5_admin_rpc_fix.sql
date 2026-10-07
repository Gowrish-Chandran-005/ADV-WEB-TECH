CREATE OR REPLACE FUNCTION public.get_admin_booking_overview()
RETURNS TABLE (
    id uuid,
    equipment_id uuid,
    renter_id uuid,
    owner_id uuid,
    start_date date,
    end_date date,
    status text,
    total_amount numeric,
    security_deposit numeric,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_role text;
BEGIN
    SELECT p.role INTO v_actor_role
    FROM public.profiles AS p
    WHERE p.id = auth.uid();

    IF v_actor_role IS DISTINCT FROM 'ADMIN' THEN
        RAISE EXCEPTION 'Only administrators can view booking oversight records.';
    END IF;

    RETURN QUERY
    SELECT
        b.id AS id,
        b.equipment_id AS equipment_id,
        b.renter_id AS renter_id,
        b.owner_id AS owner_id,
        b.start_date AS start_date,
        b.end_date AS end_date,
        b.status AS status,
        b.total_amount AS total_amount,
        b.security_deposit AS security_deposit,
        b.created_at AS created_at,
        b.updated_at AS updated_at
    FROM public.bookings AS b
    ORDER BY b.created_at DESC;
END;
$$;
