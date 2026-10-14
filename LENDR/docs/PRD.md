# Product Requirements Document (PRD)

## 1. Product overview

LENDR is a VIT-campus-exclusive equipment sharing and rental platform designed for students, clubs, project teams, and authorized campus communities. It focuses on helping members discover gear that already exists on campus, check whether it is available, request access, complete rental workflows, and return equipment without friction.

The product is intentionally not a general public marketplace. It exists to solve a campus-specific problem: underutilized equipment on VIT premises being difficult to locate, book, and return.

## 2. Core workflow

The central workflow is:

Discover -> Check availability -> Request -> Approve -> Pickup -> Use -> Return -> Review

This lifecycle should remain consistent across the platform and across backend APIs.

## 3. Primary users

### 3.1 Student / borrower

A VIT student who needs equipment for academic, extracurricular, or campus activity use. They can browse equipment, filter listings, view details, request bookings, manage active rentals, and write reviews after completion.

### 3.2 Lender

A student who lists their own equipment. Lender capability is granted by listing equipment; it is not a separate account type or registration flow.

### 3.3 Club / organization

A VIT club or campus organization that owns shared equipment and wants to manage it through the platform.

### 3.4 Admin

Responsible for moderation, user oversight, analytics, maintenance, damage reporting, and policy enforcement.

## 4. Product goals

1. Make equipment discoverable within VIT
2. Reduce friction in booking and return processes
3. Build trust with role-based ownership and approval flow
4. Support lender operations without forcing a separate account process
5. Demonstrate useful AI features grounded in actual data
6. Provide realistic demand and analytics insights for lenders and admins
7. Support campus-specific asset lifecycles including maintenance and damage handling

## 5. Business requirements

### Campus scope

- Platform is limited to VIT campus users and VIT-related equipment usage
- Pickup location data must be campus-oriented and configurable
- Data and demo users should remain fictional and clearly labelled
- No global marketplace behavior or non-campus inventory should be present

### Student identity

- Users must register using a VIT email domain such as `@vitstudent.ac.in`
- Backend validation must enforce the domain, regardless of frontend input
- Email verification can use a mock or development mechanism during the early stages
- Auth is JWT-based with password hashing using bcrypt

### Authorization and ownership

- The backend is the source of truth for permission checks
- Users must only manage equipment, bookings, or other resources they own or are otherwise authorized to manage
- Frontend route protection alone is not acceptable

## 6. Functional requirements

### Equipment discovery

Users can:

- browse all equipment
- filter by category, price, condition, rating, availability, and pickup location
- search by name, brand, model, description, tags, and use case
- sort by price, rating, popularity, or newest

### Equipment details

Each listing should show:

- name, category, brand, model
- description, condition, features, tags, use cases
- images
- price and deposit
- pickup location
- owner metadata
- availability
- reviews and rating

### Booking lifecycle

The booking status model includes:

- `PENDING`
- `APPROVED`
- `REJECTED`
- `CANCELLED`
- `ACTIVE`
- `RETURN_REQUESTED`
- `COMPLETED`

Rules:

- `PENDING`, `APPROVED`, and `ACTIVE` bookings block conflicting dates
- Availability checks must be enforced server-side
- Rental price and security deposit are separate values
- Late returns should be tracked but no monetary late penalty is required in v1

### Reviews and rating

- Reviews are only allowed after successful completion of a rental
- Ratings and comments must be tied to evidence of a completed booking

### Damage and maintenance

- Damage reports can be associated with equipment and active booking context
- Maintenance records mark equipment as unavailable for booking
- Equipment under maintenance must not be bookable

### Notifications

Notifications should cover meaningful events such as booking requests, approval/rejection, pickup/return flows, damage updates, and maintenance changes.

### Favorites

Users can save and remove equipment from favorites and then review saved items.

## 7. AI/ML requirements

### SmartMatch AI

SmartMatch is an explainable recommendation engine that helps students identify suitable equipment based on natural-language need descriptions. It must use only information that exists in the system and explain reasons such as:

- relevant use case match
- features that align with the need
- current availability on relevant dates
- category or tag match

### Demand Prediction ML

The platform must support demand forecasting for equipment categories and individual equipment listings using historical or seeded booking behavior. Synthetic/demo data may be used at early stages but must be clearly marked as such.

## 8. Non-functional requirements

- Backend must be secure and role-aware
- Validation must happen on the backend
- Database queries must be safe and parameterized
- API responses must be structured for frontend consumption
- Demo data must be clearly labelled as synthetic
- Core workflows must be testable and repeatable

## 9. MVP priority

The MVP should prove the full core flow before secondary features are expanded:

1. VIT identity
2. Equipment discovery
3. Detailed listing
4. Availability checking
5. Booking request
6. Lender approval
7. Active rental
8. Return flow
9. Review

Only after this is stable should the project expand into SmartMatch, demand prediction, and admin analytics.

## 10. Success criteria

The project is successful when a user can complete the canonical workflow end to end without manual workaround and without unsupported assumptions about the frontend. The system must demonstrate campus relevance, realistic booking logic, secure access, and explainable AI features.
