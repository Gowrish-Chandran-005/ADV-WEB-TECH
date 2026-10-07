# GearLoop Backend Architecture Overview

## Core model

The backend remains database-first and uses Supabase PostgreSQL as the system of record.

The relationship graph follows this shape:

profiles
↓
equipment
↓
- equipment_images
- equipment_availability
- maintenance_records
- damage_reports
- reviews
- notifications

bookings
↓
- payments
- damage_reports
- reviews
- notifications

## Principal roles

- RENTER
- OWNER
- ADMIN

## Access control

RLS is enabled on all operational tables and the policies are based on:

- auth.uid()
- equipment.owner_id
- bookings.renter_id
- bookings.owner_id
- profile role checks

## Phase 5 additions

### Payments

The mock payments layer stores rental and security deposit flows using a controlled database function and a refund workflow.

### Admin management

Admins can review and moderate user status, equipment visibility, and operational records without bypassing the ownership model.

### Statistics

Platform-wide aggregates are exposed through admin-only functions to avoid exposing sensitive operational totals to normal users.

### Seed data

The seed script intentionally checks for real profile UUIDs before inserting demo values, preventing invalid foreign key insertion.

### Security audit

A verification SQL script checks RLS, policy coverage, and privileged function exposure for the final backend layer.

## Integration readiness

The backend is structured for a later frontend integration pass. At this stage, the database and access rules are ready, while the Vite React UI remains unchanged.
