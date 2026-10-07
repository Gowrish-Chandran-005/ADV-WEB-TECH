CREATE OR REPLACE FUNCTION public.admin_update_user_status(
    target_user_id uuid,
    new_status text
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_role text;
    v_profile public.profiles;
BEGIN
    SELECT role INTO v_actor_role
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_actor_role IS DISTINCT FROM 'ADMIN' THEN
        RAISE EXCEPTION 'Only administrators can update user status.';
    END IF;

    IF new_status NOT IN ('ACTIVE', 'SUSPENDED') THEN
        RAISE EXCEPTION 'Unsupported account status.';
    END IF;

    UPDATE public.profiles
    SET account_status = new_status,
        updated_at = now()
    WHERE id = target_user_id
    RETURNING * INTO v_profile;

    IF v_profile.id IS NULL THEN
        RAISE EXCEPTION 'Target user not found.';
    END IF;

    RETURN v_profile;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_user_role(
    target_user_id uuid,
    new_role text
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_role text;
    v_profile public.profiles;
BEGIN
    SELECT role INTO v_actor_role
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_actor_role IS DISTINCT FROM 'ADMIN' THEN
        RAISE EXCEPTION 'Only administrators can update user roles.';
    END IF;

    IF new_role NOT IN ('RENTER', 'OWNER', 'ADMIN') THEN
        RAISE EXCEPTION 'Unsupported role value.';
    END IF;

    UPDATE public.profiles
    SET role = new_role,
        updated_at = now()
    WHERE id = target_user_id
    RETURNING * INTO v_profile;

    IF v_profile.id IS NULL THEN
        RAISE EXCEPTION 'Target user not found.';
    END IF;

    RETURN v_profile;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_equipment_status(
    p_equipment_id uuid,
    p_new_status text
)
RETURNS public.equipment
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_role text;
    v_equipment public.equipment;
BEGIN
    SELECT role INTO v_actor_role
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_actor_role IS DISTINCT FROM 'ADMIN' THEN
        RAISE EXCEPTION 'Only administrators can modify equipment status.';
    END IF;

    IF p_new_status NOT IN ('AVAILABLE', 'UNAVAILABLE', 'MAINTENANCE') THEN
        RAISE EXCEPTION 'Unsupported equipment status.';
    END IF;

    UPDATE public.equipment
    SET status = p_new_status,
        updated_at = now()
    WHERE id = p_equipment_id
    RETURNING * INTO v_equipment;

    IF v_equipment.id IS NULL THEN
        RAISE EXCEPTION 'Equipment not found.';
    END IF;

    RETURN v_equipment;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_equipment_visibility(
    p_equipment_id uuid,
    p_is_published boolean
)
RETURNS public.equipment
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_role text;
    v_equipment public.equipment;
BEGIN
    SELECT role INTO v_actor_role
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_actor_role IS DISTINCT FROM 'ADMIN' THEN
        RAISE EXCEPTION 'Only administrators can update equipment visibility.';
    END IF;

    UPDATE public.equipment
    SET is_published = p_is_published,
        updated_at = now()
    WHERE id = p_equipment_id
    RETURNING * INTO v_equipment;

    IF v_equipment.id IS NULL THEN
        RAISE EXCEPTION 'Equipment not found.';
    END IF;

    RETURN v_equipment;
END;
$$;

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
    SELECT role INTO v_actor_role
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_actor_role IS DISTINCT FROM 'ADMIN' THEN
        RAISE EXCEPTION 'Only administrators can view booking oversight records.';
    END IF;

    RETURN QUERY
    SELECT
        b.id,
        b.equipment_id,
        b.renter_id,
        b.owner_id,
        b.start_date,
        b.end_date,
        b.status,
        b.total_amount,
        b.security_deposit,
        b.created_at,
        b.updated_at
    FROM public.bookings b
    ORDER BY b.created_at DESC;
END;
$$;
