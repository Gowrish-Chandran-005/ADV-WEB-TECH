# Architecture Overview

## 1. System goal

LENDR is a campus equipment sharing platform with a secure backend, relational data model, and explainable AI services. The backend is the source of truth for user identity, account permissions, booking integrity, pricing, and ownership.

## 2. High-level architecture

```text
Client / frontend (later)
        |
        v
REST API
        |
        v
Route layer
        |
        v
Controller layer
        |
        v
Service layer
        |
        v
Repository / data access layer
        |
        v
PostgreSQL
        |
        +--> AI / ML services
```

## 3. Layer responsibilities

### API layer

Responsible for HTTP routing, request parsing, and response serialization.

### Controller layer

Thin handlers that map requests to service calls and normalize responses.

### Service layer

Contains business rules for authentication, booking validation, price calculation, lending operations, moderation, and AI features.

### Repository layer

Encapsulates SQL queries, transactional coordination, and data access logic.

### PostgreSQL

Stores users, equipment, bookings, reviews, favorites, notifications, damage reports, maintenance, and analytics-oriented tables.

## 4. Core entities

The schema should support at least the following entities:

- users
- categories
- equipment
- equipment_images
- availability
- bookings
- reviews
- favorites
- notifications
- damage_reports
- maintenance_records
- payments

## 5. Key business rules in the architecture

- Ownership is enforced by the backend
- Availability checks happen server-side
- Booking conflicts are blocked by status-aware logic
- Security deposits are tracked independently from rental fees
- Equipment under maintenance is not bookable
- Review creation is tied to completed rentals
- AI features use stored metadata, not fabricated capabilities

## 6. API surface direction

The backend exposes the following implemented REST areas:

- `/api/v1/auth`
- `/api/v1/users`
- `/api/v1/categories`
- `/api/v1/equipment`
- `/api/v1/bookings`

Booking routes support request creation, renter and lender views, authorized booking detail, approval, rejection, cancellation, pickup activation, return request, and return confirmation. Equipment routes expose date-range availability and lender-managed maintenance blocks. The remaining areas below are planned:

- `/api/reviews`
- `/api/damage-reports`
- `/api/notifications`
- `/api/admin`
- AI/ML endpoints for SmartMatch and demand prediction

Booking dates are inclusive campus calendar dates in `Asia/Kolkata`; the database stores them as half-open timestamp ranges. Price and deposit are calculated from the equipment listing and snapshotted on each booking. Booking creation, availability checks, maintenance changes, and equipment status changes serialize on the equipment row. Pending requests block dates for 48 hours, and the database enforces both overlapping-booking exclusion and the maximum of three unexpired pending requests per student. A repeatable development command expires stale requests; creation and availability also expire stale requests for the locked equipment.

## 7. Security expectations

- Hash passwords with bcrypt
- Validate JWTs on protected routes
- Enforce role-based access control for admin and lender flows
- Validate all incoming user input
- Refuse client-supplied ownership or pricing claims
- Store secrets in environment variables
- Ensure database queries are parameterized and safe

### Authentication implementation status

The current backend supports VIT student-domain registration and password-based login with short-lived JWT access tokens. Protected requests reload the account status and token version from PostgreSQL; logout increments the token version to invalidate issued tokens. Registration validates the exact `@vitstudent.ac.in` domain, but this does not prove mailbox ownership. Email verification is not implemented yet, so new accounts remain unverified (`email_verified_at` is `NULL`) until a future verification flow is added. The `AUTH_JWT_SECRET` must be set to a strong, private value in each runtime environment.

## 8. AI/ML component placement

The AI layer should sit behind the backend service layer to keep logic explainable and testable.

### SmartMatch

- Accepts a natural-language request
- Scores relevant equipment by attributes such as use-case alignment, category, tags, features, and availability
- Produces explainable matches with reasons

### Demand Prediction

- Uses historical or seeded demand data
- Generates per-equipment or per-category demand estimates
- Supports lender and admin dashboards

## 9. Data and demo policy

Synthetic or seeded data may be used for prototyping, but it must be explicitly labelled as demo or synthetic historical data. The platform must not imply that the synthetic data reflects real VIT usage.

## 10. Implementation sequencing

The backend should be implemented incrementally in this order:

1. Auth and user model
2. Equipment and category model
3. Booking and conflict validation
4. Pickup-return workflow
5. Reviews and favorites
6. Damage and maintenance
7. Notifications and transactions
8. Admin analytics and moderation
9. SmartMatch
10. Demand prediction

This ordering keeps the core workflow stable before expanding to analytics and AI.
