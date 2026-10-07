# GearLoop Backend Documentation

This directory contains the complete backend foundation for the GearLoop Equipment Rental & Sharing Platform.

## Scope

This backend phase covers the final operational foundation before frontend integration:

- Maintenance management
- Damage reporting
- Reviews and ratings
- Notifications
- Mock payments
- Admin moderation and oversight
- Platform statistics
- Seed and demo data
- Final security audit

The existing Vite frontend remains unchanged and is not connected in this phase.

## Backend structure

- database/ — SQL migrations, trigger scripts, and seed files
- database/schema/ — phase-based schema and trigger scripts
- database/seed/ — demo seed data for realistic project testing
- services/ — TypeScript service layer for Supabase integration
- types/ — shared backend-facing model definitions
- utils/ — Supabase client helper utilities

## Preserved database foundation

The following live tables were left intact and were used as the basis for the new backend logic:

- profiles
- categories
- equipment
- equipment_images
- equipment_availability
- bookings

The existing helper and booking RPCs remain in place:

- update_updated_at()
- has_booking_conflict(...)
- create_booking(...)

## Execution order for Supabase

Run the scripts in this order from the Supabase SQL editor:

1. database/schema/04_phase4_maintenance.sql
2. database/schema/04_phase4_damage_reports.sql
3. database/schema/04_phase4_reviews.sql
4. database/schema/04_phase4_notifications.sql
5. database/schema/05_phase4_triggers_and_rpcs.sql
6. database/06_phase5_payments.sql
7. database/07_phase5_admin.sql
8. database/08_phase5_stats.sql
9. database/seed/09_phase5_seed.sql
10. database/10_phase5_security_audit.sql

## New Phase 5 tables

- payments
- admin moderation helpers and views
- statistics function outputs

## Security model

- All new tables use row-level security.
- Policies are scoped to authenticated users and ownership relations.
- Sensitive administrative actions are protected by admin-only RPCs.
- Security definer functions are created with restricted search paths.
- Payment logic is handled by trusted database functions instead of direct client updates.

## Notification workflow

The trigger layer creates notifications for important booking, maintenance, review, and damage events while preventing duplicate updates for unchanged statuses.

## Frontend integration point

The services are prepared for a future frontend integration phase, but no frontend file was modified as part of this backend pass.

## Important boundaries

- No frontend files were touched.
- No new runtime server was added.
- No new auth provider or role system was introduced.
- No live Supabase execution was performed from this environment.
