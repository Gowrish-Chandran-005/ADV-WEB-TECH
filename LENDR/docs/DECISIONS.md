# Product and Engineering Decisions

This document captures the decisions that are intentionally locked for LENDR. They define the system boundary and help avoid scope drift.

## 1. Campus scope

LENDR is a VIT-only platform. It is not a generic public rental marketplace.

Decision: all major business rules, identities, and pickup semantics remain aligned with VIT campus usage.

## 2. Identity and auth

- Valid student emails must end with `@vitstudent.ac.in`
- Passwords are hashed with bcrypt
- Sessions use JWT
- Email verification may use a mock implementation during the development phase
- Authorization is mandatory on the backend

## 3. Roles

LENDR supports four primary roles:

1. Student / borrower
2. Lender
3. Club / organization
4. Admin

A student becomes a lender by listing equipment; there is no separate lender sign-up flow.

## 4. Backend and database stack

- Node.js
- Express.js
- TypeScript
- PostgreSQL
- REST API
- Parameterized SQL access

Rejected alternatives include MongoDB, Firebase, Supabase, and SQLite as the authoritative database.

## 5. Data and validation strategy

- Database fields must support normalized ownership, status, and booking logic
- Backend validation is mandatory; frontend validation is convenience only
- Use secure database patterns and schema constraints where practical

## 6. Equipment rules

Every equipment listing is owned by a user or organization and must include meaningful metadata such as category, availability, location, and rental terms.

## 7. Booking rules

- Date conflicts are enforced for pending, approved, and active rentals
- Client-side date checks are not sufficient as the source of truth
- Security deposits are separate from rental price
- Booking states are explicit and must be handled consistently

## 8. AI rules

SmartMatch and Demand Prediction are real features, not fake AI UI elements. They must be based on stored metadata, booking patterns, and explainable logic.

## 9. Demo data policy

Synthetic or demo data may be used to simulate historical demand and feature behavior, but it must be clearly labelled as demo/synthetic and must never be represented as actual institutional usage.

## 10. Frontend boundary

The frontend is intentionally separated from this phase. The backend must provide API contracts that are ready for a later UI implementation.

## 11. Scope guardrails

The following are explicitly outside the current product scope unless approved later:

- Real-time chat
- GPS or delivery tracking
- General global marketplace features
- Real payment gateway implementation
- Complex enterprise organization management
- AI-generated equipment descriptions
- Unapproved extra roles or platform complexity

These decisions should be treated as locked unless a new change is explicitly documented and approved.
