CREATE OR REPLACE FUNCTION public.sync_maintenance_equipment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_has_active_booking boolean;
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.status IN ('SCHEDULED', 'IN_PROGRESS') THEN
            SELECT EXISTS (
                SELECT 1
                FROM public.bookings b
                WHERE b.equipment_id = NEW.equipment_id
                  AND b.status IN ('PENDING', 'APPROVED')
                  AND b.start_date <= CURRENT_DATE
                  AND b.end_date >= CURRENT_DATE
            ) INTO v_has_active_booking;

            IF v_has_active_booking THEN
                RAISE EXCEPTION 'Equipment has an active booking and cannot be moved into maintenance.';
            END IF;

            UPDATE public.equipment
            SET status = 'MAINTENANCE', updated_at = now()
            WHERE id = NEW.equipment_id;

            RETURN NEW;
        END IF;

        IF NEW.status IN ('COMPLETED', 'CANCELLED') THEN
            UPDATE public.equipment
            SET status = 'AVAILABLE', updated_at = now()
            WHERE id = NEW.equipment_id;

            RETURN NEW;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER maintenance_records_sync_equipment_status
    AFTER INSERT OR UPDATE OF status ON public.maintenance_records
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_maintenance_equipment_status();

CREATE OR REPLACE FUNCTION public.handle_booking_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.status = 'PENDING' THEN
            PERFORM public.create_notification(
                NEW.owner_id,
                'BOOKING_REQUESTED',
                'New booking request',
                'A renter has submitted a booking request for your equipment.',
                NEW.id,
                NEW.equipment_id,
                NULL
            );
        END IF;
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            CASE NEW.status
                WHEN 'APPROVED' THEN
                    PERFORM public.create_notification(
                        NEW.renter_id,
                        'BOOKING_APPROVED',
                        'Booking approved',
                        'Your booking request has been approved.',
                        NEW.id,
                        NEW.equipment_id,
                        NULL
                    );
                WHEN 'REJECTED' THEN
                    PERFORM public.create_notification(
                        NEW.renter_id,
                        'BOOKING_REJECTED',
                        'Booking rejected',
                        'Your booking request was not approved.',
                        NEW.id,
                        NEW.equipment_id,
                        NULL
                    );
                WHEN 'CANCELLED' THEN
                    PERFORM public.create_notification(
                        NEW.owner_id,
                        'BOOKING_CANCELLED',
                        'Booking cancelled',
                        'A booking associated with your equipment was cancelled.',
                        NEW.id,
                        NEW.equipment_id,
                        NULL
                    );
                WHEN 'COMPLETED' THEN
                    PERFORM public.create_notification(
                        NEW.renter_id,
                        'BOOKING_COMPLETED',
                        'Booking completed',
                        'Your rental has been marked as completed.',
                        NEW.id,
                        NEW.equipment_id,
                        NULL
                    );
            END CASE;
        END IF;
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER booking_status_notifications
    AFTER INSERT OR UPDATE OF status ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_booking_notifications();

CREATE OR REPLACE FUNCTION public.handle_damage_report_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.create_notification(
            (SELECT e.owner_id FROM public.equipment e WHERE e.id = NEW.equipment_id),
            'DAMAGE_REPORTED',
            'Damage report created',
            'A new damage report has been filed for your equipment.',
            NEW.booking_id,
            NEW.equipment_id,
            NEW.id
        );
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'RESOLVED' THEN
            PERFORM public.create_notification(
                NEW.reported_by,
                'DAMAGE_RESOLVED',
                'Damage report resolved',
                'Your damage report has been reviewed and resolved.',
                NEW.booking_id,
                NEW.equipment_id,
                NEW.id
            );
        END IF;
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER damage_report_notifications
    AFTER INSERT OR UPDATE OF status ON public.damage_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_damage_report_notifications();

CREATE OR REPLACE FUNCTION public.handle_review_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.create_notification(
            NEW.reviewee_id,
            'REVIEW_RECEIVED',
            'New review received',
            'You received a new review for your equipment.',
            NEW.booking_id,
            NEW.equipment_id,
            NULL
        );
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER review_notifications
    AFTER INSERT ON public.reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_review_notifications();

CREATE OR REPLACE FUNCTION public.handle_maintenance_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        CASE NEW.status
            WHEN 'SCHEDULED' THEN
                PERFORM public.create_notification(
                    (SELECT e.owner_id FROM public.equipment e WHERE e.id = NEW.equipment_id),
                    'MAINTENANCE_SCHEDULED',
                    'Maintenance scheduled',
                    'A maintenance record has been scheduled for your equipment.',
                    NULL,
                    NEW.equipment_id,
                    NULL
                );
            WHEN 'IN_PROGRESS' THEN
                PERFORM public.create_notification(
                    (SELECT e.owner_id FROM public.equipment e WHERE e.id = NEW.equipment_id),
                    'MAINTENANCE_STARTED',
                    'Maintenance in progress',
                    'Maintenance work has started for your equipment.',
                    NULL,
                    NEW.equipment_id,
                    NULL
                );
            WHEN 'COMPLETED' THEN
                PERFORM public.create_notification(
                    (SELECT e.owner_id FROM public.equipment e WHERE e.id = NEW.equipment_id),
                    'MAINTENANCE_COMPLETED',
                    'Maintenance completed',
                    'Maintenance work for your equipment has been completed.',
                    NULL,
                    NEW.equipment_id,
                    NULL
                );
        END CASE;
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            CASE NEW.status
                WHEN 'IN_PROGRESS' THEN
                    PERFORM public.create_notification(
                        (SELECT e.owner_id FROM public.equipment e WHERE e.id = NEW.equipment_id),
                        'MAINTENANCE_STARTED',
                        'Maintenance in progress',
                        'Maintenance work has started for your equipment.',
                        NULL,
                        NEW.equipment_id,
                        NULL
                    );
                WHEN 'COMPLETED' THEN
                    PERFORM public.create_notification(
                        (SELECT e.owner_id FROM public.equipment e WHERE e.id = NEW.equipment_id),
                        'MAINTENANCE_COMPLETED',
                        'Maintenance completed',
                        'Maintenance work for your equipment has been completed.',
                        NULL,
                        NEW.equipment_id,
                        NULL
                    );
            END CASE;
        END IF;
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER maintenance_notifications
    AFTER INSERT OR UPDATE OF status ON public.maintenance_records
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_maintenance_notifications();
