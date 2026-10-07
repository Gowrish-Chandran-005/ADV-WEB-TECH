CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type text NOT NULL CHECK (
        type IN (
            'BOOKING_REQUESTED',
            'BOOKING_APPROVED',
            'BOOKING_REJECTED',
            'BOOKING_CANCELLED',
            'BOOKING_COMPLETED',
            'DAMAGE_REPORTED',
            'DAMAGE_RESOLVED',
            'MAINTENANCE_SCHEDULED',
            'MAINTENANCE_STARTED',
            'MAINTENANCE_COMPLETED',
            'REVIEW_RECEIVED',
            'SYSTEM'
        )
    ),
    title text NOT NULL,
    message text NOT NULL,
    related_booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
    related_equipment_id uuid REFERENCES public.equipment(id) ON DELETE SET NULL,
    related_damage_report_id uuid REFERENCES public.damage_reports(id) ON DELETE SET NULL,
    is_read boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    read_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id
    ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
    ON public.notifications (user_id, is_read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select only their own notifications"
    ON public.notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update only their own notifications"
    ON public.notifications FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users cannot create notifications for others directly"
    ON public.notifications FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id uuid,
    p_type text,
    p_title text,
    p_message text,
    p_related_booking_id uuid DEFAULT NULL,
    p_related_equipment_id uuid DEFAULT NULL,
    p_related_damage_report_id uuid DEFAULT NULL
)
RETURNS public.notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_notification public.notifications;
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'Notification user is required.';
    END IF;

    IF p_type IS NULL OR p_title IS NULL OR p_message IS NULL THEN
        RAISE EXCEPTION 'Notification type, title, and message are required.';
    END IF;

    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        related_booking_id,
        related_equipment_id,
        related_damage_report_id
    )
    VALUES (
        p_user_id,
        p_type,
        p_title,
        p_message,
        p_related_booking_id,
        p_related_equipment_id,
        p_related_damage_report_id
    )
    RETURNING * INTO v_notification;

    RETURN v_notification;
END;
$$;
