# GearLoop Database Overview

## Phase 1

- profiles
  - user account and role data
  - links to Supabase auth

## Phase 2

- categories
- equipment
- equipment_images
- equipment_availability

These tables define gear inventory, listing visibility, photographs, and availability windows.

## Phase 3

- bookings
- has_booking_conflict(...)
- create_booking(...)

This phase stores booking lifecycle and conflict protection.

## Phase 4

### Maintenance

- maintenance_records
- tracks scheduled and completed maintenance work
- preserves operational history without deleting records

### Damage reports

- damage_reports
- stores issue reporting, severity, resolution, and costs

### Reviews

- reviews
- one review per completed booking
- aggregate view for equipment rating calculation

### Notifications

- notifications
- stores user activity and operational updates

## Phase 5

### Payments

- payments
- mock payment and refund records for rental and deposit flows

### Admin

- admin status and role change routines
- moderation of equipment and oversight of bookings

### Statistics

- platform statistics function
- admin-only reporting layer

### Seed data

- realistic demo data script for categories, equipment, maintenance, damage reports, reviews, notifications, and payments

## Relationship map

profiles
↓
equipment
├── equipment_images
├── equipment_availability
├── maintenance_records
├── damage_reports
└── notifications

profiles
↓
bookings
├── payments
├── damage_reports
├── reviews
├── notifications
└── owner / renter relations

## RLS strategy

Policies enforce ownership rules and admin checks based on:

- auth.uid()
- equipment.owner_id
- bookings.renter_id
- bookings.owner_id
- profile role values

The design avoids exposing private records to arbitrary users and restricts status changes to trusted database functions.

## Notification workflow

Key actions generate notifications at the database layer:

- booking created → owner
- booking approved → renter
- booking rejected → renter
- booking cancelled → relevant party
- booking completed → renter
- damage reported → owner
- damage resolved → reporter
- review created → owner
- maintenance scheduled or updated → owner

## Payment and admin controls

- create_mock_payment(...) creates successful mock transactions only from the booking renter
- create_mock_refund(...) validates the original amount and refund cap
- admin_update_user_status(...) and admin_update_user_role(...) are admin-only
- admin moderation functions update equipment visibility and status without changing ownership

## Future integration

The services in the backend layer are prepared for the later frontend integration pass. The frontend itself remains untouched in this phase.
