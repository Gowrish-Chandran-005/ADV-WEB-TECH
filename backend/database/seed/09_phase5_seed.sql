-- Phase 5 demo seed
-- This seed is intentionally safe and will only insert data when the required demo identities exist in the live project.
-- Replace the demo UUID values below with real profile IDs from your Supabase project before running the script.

DO $$
DECLARE
    v_renter_1 uuid := '11111111-1111-1111-1111-111111111111';
    v_owner_1 uuid := '22222222-2222-2222-2222-222222222222';
    v_owner_2 uuid := '33333333-3333-3333-3333-333333333333';
    v_category_cameras uuid;
    v_category_audio uuid;
    v_category_drones uuid;
    v_category_lighting uuid;
    v_category_computing uuid;
    v_category_tools uuid;
    v_category_event uuid;
    v_category_sports uuid;
    v_category_other uuid;
    v_camera_1 uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    v_camera_2 uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    v_mic_kit uuid := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    v_led_light uuid := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
    v_drone uuid := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
    v_projector uuid := 'ffffffff-ffff-ffff-ffff-ffffffffffff';
    v_tool_kit uuid := '11111111-2222-3333-4444-555555555555';
    v_laptop uuid := '66666666-7777-8888-9999-aaaaaaaaaaaa';
    v_speaker uuid := 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff';
    v_booking_1 uuid := '12345678-1234-1234-1234-123456789abc';
    v_booking_2 uuid := '22345678-2234-2234-2234-223456789abc';
    v_booking_3 uuid := '32345678-3234-3234-3234-323456789abc';
    v_maintenance_1 uuid := '43345678-4334-4334-4334-433456789abc';
    v_damage_1 uuid := '53345678-5334-5334-5334-533456789abc';
    v_review_1 uuid := '63345678-6334-6334-6334-633456789abc';
    v_payment_1 uuid := '73345678-7334-7334-7334-733456789abc';
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_renter_1)
       OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_owner_1)
       OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_owner_2) THEN
        RAISE NOTICE 'Seed skipped: required demo profiles are missing. Create real profiles and rerun this script.';
        RETURN;
    END IF;

    INSERT INTO public.categories (id, name, description, icon)
    SELECT gen_random_uuid(), 'Cameras', 'Photography and video capture', 'camera'
    WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Cameras');

    INSERT INTO public.categories (id, name, description, icon)
    SELECT gen_random_uuid(), 'Audio', 'Microphones and sound gear', 'mic'
    WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Audio');

    INSERT INTO public.categories (id, name, description, icon)
    SELECT gen_random_uuid(), 'Drones', 'Aerial capture and inspection', 'drone'
    WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Drones');

    INSERT INTO public.categories (id, name, description, icon)
    SELECT gen_random_uuid(), 'Lighting', 'Video, event, and location lighting', 'lightbulb'
    WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Lighting');

    INSERT INTO public.categories (id, name, description, icon)
    SELECT gen_random_uuid(), 'Computing', 'Laptops and mobile computing', 'laptop'
    WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Computing');

    INSERT INTO public.categories (id, name, description, icon)
    SELECT gen_random_uuid(), 'Tools', 'Hand, power, and field tools', 'tool'
    WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Tools');

    INSERT INTO public.categories (id, name, description, icon)
    SELECT gen_random_uuid(), 'Event Equipment', 'Audio visual support', 'event'
    WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Event Equipment');

    INSERT INTO public.categories (id, name, description, icon)
    SELECT gen_random_uuid(), 'Sports', 'Action and recreation gear', 'sports'
    WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Sports');

    INSERT INTO public.categories (id, name, description, icon)
    SELECT gen_random_uuid(), 'Other', 'Miscellaneous equipment', 'box'
    WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Other');

    SELECT id INTO v_category_cameras FROM public.categories WHERE name = 'Cameras';
    SELECT id INTO v_category_audio FROM public.categories WHERE name = 'Audio';
    SELECT id INTO v_category_drones FROM public.categories WHERE name = 'Drones';
    SELECT id INTO v_category_lighting FROM public.categories WHERE name = 'Lighting';
    SELECT id INTO v_category_computing FROM public.categories WHERE name = 'Computing';
    SELECT id INTO v_category_tools FROM public.categories WHERE name = 'Tools';
    SELECT id INTO v_category_event FROM public.categories WHERE name = 'Event Equipment';
    SELECT id INTO v_category_sports FROM public.categories WHERE name = 'Sports';
    SELECT id INTO v_category_other FROM public.categories WHERE name = 'Other';

    INSERT INTO public.equipment (
        id, owner_id, category_id, name, description, brand, model, condition, status, price_per_day, security_deposit, location, is_published
    )
    SELECT v_camera_1, v_owner_1, v_category_cameras, 'Professional Camera', 'Full-frame production camera for photography and video.', 'Sony', 'A7 IV', 'EXCELLENT', 'AVAILABLE', 1800, 20000, 'Media Lab', true
    WHERE NOT EXISTS (SELECT 1 FROM public.equipment WHERE id = v_camera_1);

    INSERT INTO public.equipment (
        id, owner_id, category_id, name, description, brand, model, condition, status, price_per_day, security_deposit, location, is_published
    )
    SELECT v_camera_2, v_owner_1, v_category_cameras, 'Mirrorless Camera', 'Compact travel camera for photo and short-form video.', 'Canon', 'R6 Mark II', 'GOOD', 'AVAILABLE', 1400, 18000, 'Studio West', true
    WHERE NOT EXISTS (SELECT 1 FROM public.equipment WHERE id = v_camera_2);

    INSERT INTO public.equipment (
        id, owner_id, category_id, name, description, brand, model, condition, status, price_per_day, security_deposit, location, is_published
    )
    SELECT v_mic_kit, v_owner_2, v_category_audio, 'Wireless Microphone Kit', 'Dual wireless microphone system with transmitters and bag.', 'Shure', 'SLX-D', 'GOOD', 'AVAILABLE', 700, 8000, 'Audio Room', true
    WHERE NOT EXISTS (SELECT 1 FROM public.equipment WHERE id = v_mic_kit);

    INSERT INTO public.equipment (
        id, owner_id, category_id, name, description, brand, model, condition, status, price_per_day, security_deposit, location, is_published
    )
    SELECT v_led_light, v_owner_1, v_category_lighting, 'LED Video Light', 'Bright portable lighting fixture for interviews and shoots.', 'Aputure', 'Amaran 100x', 'EXCELLENT', 'AVAILABLE', 550, 7000, 'Lighting Booth', true
    WHERE NOT EXISTS (SELECT 1 FROM public.equipment WHERE id = v_led_light);

    INSERT INTO public.equipment (
        id, owner_id, category_id, name, description, brand, model, condition, status, price_per_day, security_deposit, location, is_published
    )
    SELECT v_drone, v_owner_2, v_category_drones, 'Drone', '4K aerial camera with stabilized gimbal for travel work.', 'DJI', 'Mini 4 Pro', 'GOOD', 'AVAILABLE', 1650, 22000, 'Rooftop Hangar', true
    WHERE NOT EXISTS (SELECT 1 FROM public.equipment WHERE id = v_drone);

    INSERT INTO public.equipment (
        id, owner_id, category_id, name, description, brand, model, condition, status, price_per_day, security_deposit, location, is_published
    )
    SELECT v_projector, v_owner_1, v_category_event, 'Projector', '1080p projector for classrooms and events.', 'Epson', 'EB-X06', 'VERY_GOOD', 'AVAILABLE', 1000, 12000, 'Education Hub', true
    WHERE NOT EXISTS (SELECT 1 FROM public.equipment WHERE id = v_projector);

    INSERT INTO public.equipment (
        id, owner_id, category_id, name, description, brand, model, condition, status, price_per_day, security_deposit, location, is_published
    )
    SELECT v_tool_kit, v_owner_2, v_category_tools, 'Power Tool Kit', 'Compact field-ready tool kit for assembly and repairs.', 'Makita', 'Cordless Kit', 'GOOD', 'AVAILABLE', 900, 12000, 'Workshop Bay', true
    WHERE NOT EXISTS (SELECT 1 FROM public.equipment WHERE id = v_tool_kit);

    INSERT INTO public.equipment (
        id, owner_id, category_id, name, description, brand, model, condition, status, price_per_day, security_deposit, location, is_published
    )
    SELECT v_laptop, v_owner_1, v_category_computing, 'Laptop', 'Creator-focused portable workstation for editing and streaming.', 'Apple', 'MacBook Pro 14', 'EXCELLENT', 'AVAILABLE', 2000, 25000, 'Innovation Center', true
    WHERE NOT EXISTS (SELECT 1 FROM public.equipment WHERE id = v_laptop);

    INSERT INTO public.equipment (
        id, owner_id, category_id, name, description, brand, model, condition, status, price_per_day, security_deposit, location, is_published
    )
    SELECT v_speaker, v_owner_2, v_category_event, 'Event Speaker System', 'Portable powered PA system for lectures and gatherings.', 'QSC', 'K12.2', 'GOOD', 'AVAILABLE', 1300, 15000, 'Event Deck', true
    WHERE NOT EXISTS (SELECT 1 FROM public.equipment WHERE id = v_speaker);

    IF NOT EXISTS (SELECT 1 FROM public.equipment WHERE id = v_camera_1)
       OR NOT EXISTS (SELECT 1 FROM public.equipment WHERE id = v_camera_2)
       OR NOT EXISTS (SELECT 1 FROM public.equipment WHERE id = v_mic_kit)
       OR NOT EXISTS (SELECT 1 FROM public.equipment WHERE id = v_led_light)
       OR NOT EXISTS (SELECT 1 FROM public.equipment WHERE id = v_drone)
       OR NOT EXISTS (SELECT 1 FROM public.equipment WHERE id = v_projector)
       OR NOT EXISTS (SELECT 1 FROM public.equipment WHERE id = v_tool_kit)
       OR NOT EXISTS (SELECT 1 FROM public.equipment WHERE id = v_laptop)
       OR NOT EXISTS (SELECT 1 FROM public.equipment WHERE id = v_speaker) THEN
        RAISE NOTICE 'Seed skipped: required demo equipment rows missing after insert attempt.';
        RETURN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.equipment_availability WHERE equipment_id = v_camera_1 AND start_date = CURRENT_DATE + INTERVAL '1 day' AND end_date = CURRENT_DATE + INTERVAL '3 day') THEN
        INSERT INTO public.equipment_availability (equipment_id, start_date, end_date, is_available)
        VALUES (v_camera_1, CURRENT_DATE + INTERVAL '1 day', CURRENT_DATE + INTERVAL '3 day', true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.equipment_availability WHERE equipment_id = v_camera_2 AND start_date = CURRENT_DATE + INTERVAL '4 day' AND end_date = CURRENT_DATE + INTERVAL '7 day') THEN
        INSERT INTO public.equipment_availability (equipment_id, start_date, end_date, is_available)
        VALUES (v_camera_2, CURRENT_DATE + INTERVAL '4 day', CURRENT_DATE + INTERVAL '7 day', true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.equipment_availability WHERE equipment_id = v_mic_kit AND start_date = CURRENT_DATE + INTERVAL '2 day' AND end_date = CURRENT_DATE + INTERVAL '5 day') THEN
        INSERT INTO public.equipment_availability (equipment_id, start_date, end_date, is_available)
        VALUES (v_mic_kit, CURRENT_DATE + INTERVAL '2 day', CURRENT_DATE + INTERVAL '5 day', true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.equipment_availability WHERE equipment_id = v_led_light AND start_date = CURRENT_DATE + INTERVAL '1 day' AND end_date = CURRENT_DATE + INTERVAL '2 day') THEN
        INSERT INTO public.equipment_availability (equipment_id, start_date, end_date, is_available)
        VALUES (v_led_light, CURRENT_DATE + INTERVAL '1 day', CURRENT_DATE + INTERVAL '2 day', true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.equipment_availability WHERE equipment_id = v_drone AND start_date = CURRENT_DATE + INTERVAL '5 day' AND end_date = CURRENT_DATE + INTERVAL '9 day') THEN
        INSERT INTO public.equipment_availability (equipment_id, start_date, end_date, is_available)
        VALUES (v_drone, CURRENT_DATE + INTERVAL '5 day', CURRENT_DATE + INTERVAL '9 day', true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = v_booking_1) THEN
        INSERT INTO public.bookings (
            id, equipment_id, renter_id, owner_id, start_date, end_date, total_days, price_per_day, total_amount, security_deposit, status, renter_notes, rejection_reason, created_at, updated_at
        )
        VALUES (
            v_booking_1, v_camera_1, v_renter_1, v_owner_1,
            CURRENT_DATE + INTERVAL '10 day', CURRENT_DATE + INTERVAL '12 day', 2, 1800, 3600, 20000,
            'APPROVED', 'Need gear for school event coverage.', NULL,
            now() - INTERVAL '7 day', now() - INTERVAL '7 day'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = v_booking_2) THEN
        INSERT INTO public.bookings (
            id, equipment_id, renter_id, owner_id, start_date, end_date, total_days, price_per_day, total_amount, security_deposit, status, renter_notes, rejection_reason, created_at, updated_at
        )
        VALUES (
            v_booking_2, v_mic_kit, v_renter_1, v_owner_2,
            CURRENT_DATE + INTERVAL '14 day', CURRENT_DATE + INTERVAL '17 day', 3, 700, 2100, 8000,
            'COMPLETED', NULL, NULL,
            now() - INTERVAL '20 day', now() - INTERVAL '2 day'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = v_booking_3) THEN
        INSERT INTO public.bookings (
            id, equipment_id, renter_id, owner_id, start_date, end_date, total_days, price_per_day, total_amount, security_deposit, status, renter_notes, rejection_reason, created_at, updated_at
        )
        VALUES (
            v_booking_3, v_drone, v_renter_1, v_owner_2,
            CURRENT_DATE + INTERVAL '18 day', CURRENT_DATE + INTERVAL '21 day', 3, 1650, 4950, 22000,
            'PENDING', 'Need to inspect a campus event route.', NULL,
            now() - INTERVAL '4 day', now() - INTERVAL '4 day'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = v_booking_1)
       OR NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = v_booking_2)
       OR NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = v_booking_3) THEN
        RAISE NOTICE 'Seed skipped: required demo bookings are missing after insert attempt.';
        RETURN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.maintenance_records WHERE id = v_maintenance_1) THEN
        INSERT INTO public.maintenance_records (
            id, equipment_id, reported_by, maintenance_type, title, description, scheduled_date, started_at, completed_at, cost, status, notes, created_at, updated_at
        )
        VALUES (
            v_maintenance_1, v_camera_2, v_owner_1, 'PREVENTIVE', 'Sensor calibration',
            'Clean sensor and do a focus calibration check.', CURRENT_DATE + INTERVAL '3 day',
            now() - INTERVAL '2 day', now() - INTERVAL '1 day', 1500.00, 'COMPLETED',
            'Calibration completed in-house.', now() - INTERVAL '9 day', now() - INTERVAL '1 day'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.damage_reports WHERE id = v_damage_1) THEN
        INSERT INTO public.damage_reports (
            id, equipment_id, booking_id, reported_by, description, severity, status, estimated_cost, actual_cost, resolution_notes, resolved_by, reported_at, resolved_at, created_at, updated_at
        )
        VALUES (
            v_damage_1, v_mic_kit, v_booking_2, v_renter_1,
            'Microphone capsule was slightly dented after transport.', 'MEDIUM', 'RESOLVED', 2500.00, 2100.00,
            'Replaced capsule and cleaned housing.', v_owner_2, now() - INTERVAL '3 day', now() - INTERVAL '1 day',
            now() - INTERVAL '3 day', now() - INTERVAL '1 day'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.reviews WHERE id = v_review_1) THEN
        INSERT INTO public.reviews (
            id, booking_id, equipment_id, reviewer_id, reviewee_id, rating, title, comment, created_at, updated_at
        )
        VALUES (
            v_review_1, v_booking_2, v_mic_kit, v_renter_1, v_owner_2, 5,
            'Excellent gear quality', 'The microphone kit was clean, reliable, and easy to use during our event.',
            now() - INTERVAL '1 day', now() - INTERVAL '1 day'
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.notifications
        WHERE user_id = v_owner_1
          AND type = 'BOOKING_APPROVED'
          AND related_booking_id = v_booking_1
          AND title = 'Booking approved'
    ) THEN
        INSERT INTO public.notifications (
            id, user_id, type, title, message, related_booking_id, related_equipment_id, related_damage_report_id, is_read, created_at, read_at
        )
        VALUES (
            gen_random_uuid(), v_owner_1, 'BOOKING_APPROVED', 'Booking approved',
            'Your approved booking request is ready to proceed.', v_booking_1, v_camera_1, NULL, false,
            now() - INTERVAL '4 day', NULL
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.notifications
        WHERE user_id = v_owner_2
          AND type = 'REVIEW_RECEIVED'
          AND related_booking_id = v_booking_2
    ) THEN
        INSERT INTO public.notifications (
            id, user_id, type, title, message, related_booking_id, related_equipment_id, related_damage_report_id, is_read, created_at, read_at
        )
        VALUES (
            gen_random_uuid(), v_owner_2, 'REVIEW_RECEIVED', 'Review received',
            'A renter left a review for your microphone equipment.', v_booking_2, v_mic_kit, NULL, false,
            now() - INTERVAL '1 day', NULL
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.notifications
        WHERE user_id = v_renter_1
          AND type = 'BOOKING_COMPLETED'
          AND related_booking_id = v_booking_2
    ) THEN
        INSERT INTO public.notifications (
            id, user_id, type, title, message, related_booking_id, related_equipment_id, related_damage_report_id, is_read, created_at, read_at
        )
        VALUES (
            gen_random_uuid(), v_renter_1, 'BOOKING_COMPLETED', 'Booking completed',
            'Your rental has been marked as completed.', v_booking_2, v_mic_kit, NULL, false,
            now() - INTERVAL '2 day', NULL
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.payments WHERE id = v_payment_1) THEN
        INSERT INTO public.payments (
            id, booking_id, payer_id, amount, payment_type, status, transaction_reference, paid_at, refunded_at, refund_amount, created_at, updated_at
        )
        VALUES (
            v_payment_1, v_booking_2, v_renter_1, 2100.00, 'RENTAL', 'SUCCESS', 'MOCK-SEED-RENTAL-001',
            now() - INTERVAL '15 day', NULL, 0.00, now() - INTERVAL '15 day', now() - INTERVAL '15 day'
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.payments
        WHERE booking_id = v_booking_2 AND payment_type = 'SECURITY_DEPOSIT' AND transaction_reference = 'MOCK-SEED-DEPOSIT-001'
    ) THEN
        INSERT INTO public.payments (
            id, booking_id, payer_id, amount, payment_type, status, transaction_reference, paid_at, refunded_at, refund_amount, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), v_booking_2, v_renter_1, 8000.00, 'SECURITY_DEPOSIT', 'SUCCESS', 'MOCK-SEED-DEPOSIT-001',
            now() - INTERVAL '15 day', NULL, 0.00, now() - INTERVAL '15 day', now() - INTERVAL '15 day'
        );
    END IF;
END $$;
