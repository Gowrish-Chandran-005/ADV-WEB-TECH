-- Security audit helper script
-- This script does not alter data. It reports whether the key tables and functions have the expected protections.

SELECT
    n.nspname AS table_schema,
    c.relname AS table_name,
    c.relrowsecurity AS rls_enabled,
    c.relforcerowsecurity AS rls_forced,
    COALESCE(pc.policy_count, 0) AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN (
    SELECT schemaname, tablename, COUNT(*) AS policy_count
    FROM pg_policies
    GROUP BY schemaname, tablename
) pc ON pc.schemaname = n.nspname AND pc.tablename = c.relname
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
      'profiles',
      'categories',
      'equipment',
      'equipment_images',
      'equipment_availability',
      'bookings',
      'maintenance_records',
      'damage_reports',
      'reviews',
      'notifications',
      'payments'
  )
ORDER BY c.relname;

SELECT
    n.nspname AS schema_name,
    p.proname AS function_name,
    p.prosecdef AS security_definer,
    pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
      'create_damage_report',
      'create_review',
      'create_notification',
      'create_mock_payment',
      'create_mock_refund',
      'admin_update_user_status',
      'admin_update_user_role',
      'admin_update_equipment_status',
      'admin_update_equipment_visibility',
      'get_platform_statistics',
      'get_admin_booking_overview'
  )
ORDER BY p.proname;

SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
      'profiles',
      'categories',
      'equipment',
      'equipment_images',
      'equipment_availability',
      'bookings',
      'maintenance_records',
      'damage_reports',
      'reviews',
      'notifications',
      'payments'
  )
ORDER BY tablename, policyname;

SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
      'equipment',
      'equipment_availability',
      'bookings',
      'maintenance_records',
      'damage_reports',
      'reviews',
      'notifications',
      'payments'
  )
ORDER BY tablename, indexname;

-- Manual review checklist:
-- 1. Verify every operational table has RLS enabled.
-- 2. Verify policies are scoped to auth.uid() and ownership.
-- 3. Verify admin-only functions do not allow arbitrary role escalation.
-- 4. Verify payments use trusted database functions rather than client-side updates.
-- 5. Verify notification generation is driven by triggers and not ad hoc inserts.
-- 6. Verify all status and role values are constrained to allowed enums or checks.
