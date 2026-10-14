# LENDR — Product & Engineering Decisions

This document records decisions that have been explicitly made for LENDR.

These decisions should be treated as locked unless a new decision is explicitly documented and approved.

When implementing features, do not silently change these rules.

---

# 1. Project Identity

## Decision

LENDR is a VIT-campus-exclusive equipment sharing and rental platform.

## Rationale

The product is designed specifically around the needs of VIT students, clubs, project teams, and campus communities.

It is not intended to be a generic public rental marketplace.

---

# 2. Campus Scope

## Decision

LENDR operates within the VIT campus environment.

The platform should use campus-specific concepts such as:

- VIT student identity
- VIT email
- Campus pickup locations
- Student-owned equipment
- Club-owned equipment
- Academic projects
- Hackathons
- Campus events

## Consequence

Do not build global marketplace functionality.

---

# 3. Authentication

## Decision

Users authenticate using VIT student identity.

Expected email domain:

`@vitstudent.ac.in`

Authentication uses:

- JWT
- bcrypt

Email verification is part of the product requirement.

## Development Exception

During development, a mock/development email verification mechanism may be used.

Real email infrastructure can be added later.

---

# 4. User Roles

## Decision

LENDR has four primary roles:

1. Student / Borrower
2. Lender
3. Club / Organization
4. Admin

## Important Decision

A lender is NOT a separate account type that requires a different registration process.

Any student can become a lender by listing equipment.

---

# 5. Club Model

## Decision

VIT clubs are treated primarily as equipment-owning/lending entities.

## Consequence

Do not build a complicated enterprise organization system.

Club functionality should remain simple unless future requirements explicitly expand it.

---

# 6. Backend Stack

## Decision

Backend:

- Node.js
- Express.js
- REST API

## Consequence

Do not replace Express with:

- Next.js backend
- NestJS
- Django
- FastAPI
- Another backend framework

unless explicitly approved.

---

# 7. Database

## Decision

PostgreSQL is the primary and authoritative database.

## Explicitly Rejected

Do not replace PostgreSQL with:

- MongoDB
- Firebase
- Supabase
- SQLite as the production database
- Another database

unless explicitly approved.

---

# 8. Frontend Stack

## Decision

Frontend:

- React
- TypeScript
- Vite
- Tailwind CSS

## Consequence

Do not replace the frontend stack with another framework without approval.

---

# 9. ORM / Database Access

## Decision

The application should use PostgreSQL directly through a practical Node.js PostgreSQL access layer.

Do not introduce a heavy ORM unless there is a clear architectural reason and it is explicitly approved.

Database schema and SQL should remain understandable.

---

# 10. Validation

## Decision

Backend input validation is mandatory.

Zod may be used for request validation.

## Consequence

Never rely solely on frontend validation.

The backend is responsible for validating incoming data.

---

# 11. Equipment Ownership

## Decision

Every equipment item must have an owner/lender.

The owner may be:

- Individual student
- VIT club/organization

## Consequence

Users cannot modify equipment they do not own or manage.

---

# 12. Equipment Information

## Decision

Equipment listings must contain meaningful information.

Important fields include:

- Name
- Category
- Brand
- Model
- Description
- Condition
- Features
- Tags
- Use cases
- Images
- Rental price
- Security deposit
- Pickup location
- Availability
- Owner

## Important

The `use_cases` field is required because SmartMatch uses it to understand what equipment is appropriate for a particular requirement.

---

# 13. Equipment Categories

## Decision

Initial categories are:

- Cameras
- Audio
- Electronics
- Project Kits
- Computing
- Lighting
- Event Equipment
- Sports
- Tools
- Academic
- Other

Categories should be database-driven.

---

# 14. Equipment Availability Status

## Decision

Equipment can have states such as:

- AVAILABLE
- UNAVAILABLE
- MAINTENANCE

## Important Rule

Equipment under maintenance cannot be booked.

---

# 15. Booking Statuses

## Decision

The booking lifecycle uses:

- PENDING
- APPROVED
- REJECTED
- CANCELLED
- ACTIVE
- RETURN_REQUESTED
- COMPLETED

Do not introduce unnecessary booking states unless the business workflow requires them.

---

# 16. Pending Booking Date Blocking

## Decision

PENDING bookings block the requested dates.

## Rationale

This prevents multiple borrowers from requesting the same equipment for the same dates while the owner is deciding.

## Example

Equipment:

Camera A

Existing request:

June 10 → June 12

Another student attempting:

June 11 → June 13

must not be allowed to create a conflicting request.

---

# 17. Approved Booking Date Blocking

## Decision

APPROVED bookings block their requested dates.

---

# 18. Active Rental Date Blocking

## Decision

ACTIVE rentals block the equipment.

---

# 19. Booking Conflict Validation

## Decision

Booking conflict validation must happen on the backend.

Frontend availability checks are only convenience functionality.

The backend is the final source of truth.

---

# 20. Booking Price Calculation

## Decision

Rental price and security deposit are separate concepts.

Example:

```text
Rental:
₹100/day × 3 days = ₹300

Security deposit:
₹500

Total:
₹800

The backend must calculate authoritative totals.

The frontend must not be trusted for final pricing.

21. Free Equipment
Decision

An equipment item can have:

Rental price = ₹0

while still requiring:

Security deposit > ₹0

Therefore:

FREE does not necessarily mean ZERO deposit.

22. Security Deposit
Decision

Security deposits are supported in the product model.

The initial version does not require a real payment gateway.

The deposit may be represented through the mock transaction system.

23. Payment System
Decision

LENDR v1 does NOT integrate a real payment gateway.

Instead, transactions are simulated for demonstration.

Supported transaction states:

PENDING
SUCCESS
FAILED
REFUNDED
Consequence

Do not integrate:

Razorpay
Stripe
PayPal
UPI gateway
Credit card gateway

unless explicitly approved later.

24. Late Returns
Decision

Late returns should be tracked.

There is no monetary late-return penalty in v1.

Consequence

Do not automatically charge fines.

25. Return Workflow
Decision

The return lifecycle is:

ACTIVE
    ↓
RETURN_REQUESTED
    ↓
COMPLETED

The borrower requests return.

The lender confirms the return.

Only then does the booking become completed.

26. Reviews
Decision

Reviews are only allowed for completed bookings.

A user must have actually completed a rental before reviewing the equipment.

Consequence

The backend must verify booking ownership and completion before accepting a review.

27. Damage Reports
Decision

Damage reports are associated with the relevant:

Equipment
Booking
Reporter

Initial statuses:

OPEN
UNDER_REVIEW
RESOLVED
28. Damage System Scope
Decision

Damage reporting is a practical tracking feature.

It is NOT an insurance/legal management system.

Consequence

Do not build:

Insurance claims
Legal case management
Automated compensation calculation
Complex dispute arbitration

unless explicitly approved.

29. Maintenance
Decision

Equipment can be marked under maintenance.

Maintenance records contain:

Reason
Start date
Expected completion
Status
Notes
Important

Equipment under maintenance cannot be booked.

30. Notifications
Decision

Notifications are event-driven.

Important events include:

Booking request
Approval
Rejection
Cancellation
Rental activation
Return request
Return completion
Damage report
Maintenance
Review availability
Consequence

Do not create notifications for insignificant UI actions.

31. Favorites
Decision

Users can save equipment as favorites.

Favorites are user-specific.

A user cannot see or modify another user's private favorites.

32. SmartMatch AI
Decision

SmartMatch is a recommendation system, NOT a chatbot.

Primary Purpose

Allow a student to describe what they need in natural language and receive relevant equipment recommendations.

Example:

I need a camera for shooting a short film at night.

33. SmartMatch Algorithm
Decision

A lightweight NLP approach is acceptable.

The initial implementation may use:

TF-IDF
Cosine similarity

The recommendation system can compare the user's query against:

Equipment name
Category
Description
Features
Tags
Use cases
34. SmartMatch Explainability
Decision

SmartMatch must provide understandable reasons for recommendations.

Example:

94% Match

Why:
• Suitable for filmmaking
• Strong low-light capability
• Matches the requested use case
• Available for your selected dates
Consequence

Do not output unexplained match scores only.

35. SmartMatch Capability Accuracy
Decision

SmartMatch must only use information present in the equipment data.

Consequence

The AI must not invent:

Camera capabilities
Features
Compatibility
Performance
Availability
36. Demand Prediction
Decision

Demand Prediction is a genuine ML component.

Its purpose is to predict future equipment/category demand using historical booking information.

Potential inputs:

Equipment
Category
Booking count
Request count
Day
Month
Rental duration
Popularity
Historical demand
37. Synthetic ML Data
Decision

LENDR initially has no real historical campus rental dataset.

Therefore, synthetic/seeded historical data may be used for development and demonstration.

Critical Rule

Synthetic data MUST be clearly labelled.

Example:

Synthetic / Demo Historical Data

Never present synthetic records as actual VIT student usage.

38. Demand Prediction Audience
Decision

Demand Prediction is primarily useful to:

Lenders
Admins

Students do not need access to detailed platform-wide demand analytics.

39. AI/ML Scope
Approved AI/ML

Only the following AI/ML systems are part of the current product:

SmartMatch AI
Demand Prediction ML
Not Approved

Do not add:

AI chatbot
AI-generated equipment descriptions
Random sentiment analysis
Facial recognition
Unnecessary generative AI
40. Campus Pickup
Decision

Pickup locations are represented using campus locations.

Examples:

TT
SMV
MB
SJT
Library
Hostels
Labs
Clubs
Consequence

Do not introduce street-address-based logistics.

41. Delivery
Decision

Delivery is out of scope.

Borrowers are responsible for campus pickup/return according to the platform workflow.

42. GPS and Maps
Decision

GPS tracking and maps are out of scope.

The platform only needs campus pickup location information.

43. Real-Time Chat
Decision

Real-time chat is out of scope.

Communication should be handled through structured booking information and notifications.

44. Social Features
Decision

LENDR is not a social network.

Do not introduce:

Followers
Social feeds
Likes
Posts
Public messaging
Social profiles beyond useful trust information
45. Marketplace Scope
Decision

LENDR is a VIT campus marketplace only.

It is not intended to become:

Public marketplace
Global marketplace
Multi-campus marketplace

unless explicitly approved in the future.

46. Dashboard Philosophy
Decision

Dashboards must prioritize useful information.

Do not add charts simply to make the interface look like a dashboard.

Each metric should answer a practical question.

47. Student Dashboard

The student dashboard should prioritize:

Upcoming bookings
Active rentals
Recent activity
Favorites
Notifications
Recommendations
48. Lender Dashboard

The lender dashboard should prioritize:

Pending requests
Active rentals
Equipment
Utilization
Ratings
Rental value/revenue
Demand insights
49. Admin Dashboard

The admin dashboard should prioritize:

Users
Equipment
Bookings
Transactions
Damage reports
Maintenance
Platform analytics
Demand prediction
50. Design Philosophy
Decision

The UI should be:

Modern
Premium
Clean
Simple
Professional
Campus-oriented
Intuitive
Avoid
Excessive gradients
Excessive glassmorphism
Overly dark dashboards
Generic SaaS aesthetics
Excessive animations
Overcrowded layouts
Amazon clones
Airbnb clones
Fake AI visual effects

The final visual system will be defined in DESIGN.md.

51. Backend Authority
Decision

The backend is the authority for business logic.

The frontend must not be trusted for:

User identity
Ownership
Role
Permissions
Booking availability
Price calculation
Booking state
52. Security
Decision

The system must:

Hash passwords
Validate JWTs
Validate request data
Enforce ownership
Enforce role permissions
Protect environment secrets
Prevent unauthorized resource access

Never expose secrets to the client.

53. Database Philosophy
Decision

PostgreSQL is the source of truth.

Core entities may include:

users
categories
equipment
equipment_images
availability
bookings
reviews
damage_reports
maintenance_records
notifications
favorites
payments

Only create additional tables when they support a confirmed requirement.

54. Data Normalization
Decision

The database should remain reasonably normalized.

Use:

Foreign keys
Constraints
Indexes
Appropriate relationships
Timestamps

Do not denormalize data prematurely for hypothetical scale.

55. API Philosophy
Decision

The backend uses REST APIs.

Expected areas:

/api/auth
/api/equipment
/api/bookings
/api/reviews
/api/damage-reports
/api/notifications
/api/admin
/api/ai

The final endpoint structure will be documented in ARCHITECTURE.md.

56. Error Handling
Decision

Errors should be meaningful to users.

Examples:

This equipment is already requested for the selected dates.
This equipment is currently under maintenance.
You are not authorized to perform this action.

Do not expose raw SQL/database errors to users.

57. Demo Data
Decision

The application will contain seeded data for demonstration.

Seed data may include:

Users
Equipment
Categories
Bookings
Reviews
Notifications
Maintenance
Damage reports
Transactions
Historical demand data

Synthetic data must be distinguishable from real production data.

58. Academic Demonstration
Decision

The system should demonstrate a complete end-to-end workflow rather than isolated pages.

The preferred demonstration sequence is:

Student Login
↓
Discover Equipment
↓
View Details
↓
Check Availability
↓
Request Booking
↓
Lender Approval
↓
Active Rental
↓
Return
↓
Review
↓
SmartMatch AI
↓
Demand Prediction
↓
Admin Analytics
59. Scope Control
Decision

If a feature is not explicitly defined in:

CLAUDE.md
PRD.md
DECISIONS.md

it should not automatically become part of the implementation.

If a new feature appears necessary:

Explain why it is needed.
Identify its impact.
Get approval.
Record the decision.
60. No Silent Product Changes

Claude Code must NOT silently change a locked business rule.

Examples:

Do not change:

PENDING blocks dates

to:

Only APPROVED blocks dates

without an explicit decision.

Do not change:

No late fee in v1

to:

Automatic late fee

without approval.

Do not change:

Mock payments

to:

Real payment gateway

without approval.

61. Decision Change Process

If a locked decision needs to change:

Identify the existing decision.
Explain why it needs to change.
Explain the technical/product impact.
Get explicit approval.
Update this document.
Update affected documentation.
Then modify the implementation.

Never modify implementation first and documentation later.

62. Current Locked Product Decisions

The following decisions are currently considered locked:

Area	Decision
Product scope	VIT campus only
Frontend	React + TypeScript + Vite + Tailwind
Backend	Node.js + Express
Database	PostgreSQL
Authentication	JWT + bcrypt
Identity	VIT student email
Lender	Student can become lender by listing
Clubs	Simple equipment-owning entities
Pending bookings	Block dates
Approved bookings	Block dates
Active rentals	Block equipment
Free equipment	Can still require deposit
Late fees	None in v1
Payments	Mock only
Reviews	Completed rentals only
Maintenance	Equipment becomes unbookable
SmartMatch	Real NLP recommendation
SmartMatch chatbot	Not allowed
Demand prediction	Real ML component
ML history	Synthetic/demo data initially
GPS	Out of scope
Maps	Out of scope
Delivery	Out of scope
Real-time chat	Out of scope
Blockchain	Out of scope
Facial recognition	Out of scope
Global marketplace	Out of scope
Real payment gateway	Out of scope for v1
63. Priority of Documents

When implementing the project, use the following hierarchy:

Explicit user-approved decisions
DECISIONS.md
PRD.md
ARCHITECTURE.md
DESIGN.md
CONTENT.md
TASKS.md

If two documents conflict, do not silently choose one.

Identify the conflict and resolve it before implementation.

64. Final Principle

LENDR should remain:

Campus-focused
Technically realistic
Simple to understand
Strong in core workflows
Secure
Data-driven
AI/ML-enhanced
Maintainable
Academically demonstrable

Feature count is not the goal.

A coherent, working product is the goal.


Once you've saved this, we'll move to **`ARCHITECTURE.md`**. That one will be the technical blueprint: exact frontend/backend structure, PostgreSQL schema, API structure, authentication flow, SmartMatch architecture, ML architecture, folder structure, and how everything connects.
This might also interest you.