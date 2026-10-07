CREATE OR REPLACE FUNCTION public.get_platform_statistics()
RETURNS TABLE (
    total_users bigint,
    total_renters bigint,
    total_owners bigint,
    total_equipment bigint,
    published_equipment bigint,
    total_bookings bigint,
    pending_bookings bigint,
    approved_bookings bigint,
    completed_bookings bigint,
    cancelled_bookings bigint,
    total_reviews bigint,
    average_rating numeric,
    open_damage_reports bigint,
    active_maintenance_records bigint,
    successful_payments bigint,
    total_rental_revenue numeric,
    security_deposits_collected numeric
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
        RAISE EXCEPTION 'Only administrators can access platform statistics.';
    END IF;

    RETURN QUERY
    SELECT
        (SELECT count(*) FROM public.profiles)::bigint AS total_users,
        (SELECT count(*) FROM public.profiles WHERE role = 'RENTER')::bigint AS total_renters,
        (SELECT count(*) FROM public.profiles WHERE role = 'OWNER')::bigint AS total_owners,
        (SELECT count(*) FROM public.equipment)::bigint AS total_equipment,
        (SELECT count(*) FROM public.equipment WHERE is_published = true)::bigint AS published_equipment,
        (SELECT count(*) FROM public.bookings)::bigint AS total_bookings,
        (SELECT count(*) FROM public.bookings WHERE status = 'PENDING')::bigint AS pending_bookings,
        (SELECT count(*) FROM public.bookings WHERE status = 'APPROVED')::bigint AS approved_bookings,
        (SELECT count(*) FROM public.bookings WHERE status = 'COMPLETED')::bigint AS completed_bookings,
        (SELECT count(*) FROM public.bookings WHERE status = 'CANCELLED')::bigint AS cancelled_bookings,
        (SELECT count(*) FROM public.reviews)::bigint AS total_reviews,
        (SELECT round(avg(rating)::numeric, 2) FROM public.reviews) AS average_rating,
        (SELECT count(*) FROM public.damage_reports WHERE status = 'OPEN')::bigint AS open_damage_reports,
        (SELECT count(*) FROM public.maintenance_records WHERE status IN ('SCHEDULED', 'IN_PROGRESS'))::bigint AS active_maintenance_records,
        (SELECT count(*) FROM public.payments WHERE status = 'SUCCESS')::bigint AS successful_payments,
        (SELECT COALESCE(sum(amount), 0) FROM public.payments WHERE status = 'SUCCESS' AND payment_type = 'RENTAL')::numeric(12,2) AS total_rental_revenue,
        (SELECT COALESCE(sum(amount), 0) FROM public.payments WHERE status = 'SUCCESS' AND payment_type = 'SECURITY_DEPOSIT')::numeric(12,2) AS security_deposits_collected;
END;
$$;

CREATE VIEW public.platform_statistics_view AS
SELECT *
FROM public.get_platform_statistics();

-- The view is intentionally paired with the function and should be used by admins only.
-- Access can be limited via policies if your Supabase project requires it.
