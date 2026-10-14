# LENDR — Backend + Database + AI/ML Master Prompt

You are working on the backend and intelligence layer of a project called **LENDR**.

## 1. PROJECT CONTEXT

LENDR is a **VIT campus-exclusive equipment sharing and rental platform**.

Students, project teams, and campus clubs can:

* Discover equipment available within VIT
* Borrow or rent equipment
* List their own equipment for others
* Manage booking requests
* Track active rentals and returns
* Review equipment/lenders
* Report damage
* Manage maintenance
* Save/favorite equipment
* Receive notifications
* Use SmartMatch AI to find suitable equipment
* View demand intelligence and predictions

The platform is specifically designed for the VIT campus.

This is NOT a generic global rental marketplace.

---

# 2. YOUR RESPONSIBILITY

You are responsible ONLY for:

1. Backend API
2. PostgreSQL database
3. Authentication and authorization
4. Backend business logic
5. AI/ML services and integration
6. Database seed/demo data
7. Backend validation
8. Backend testing
9. API documentation
10. Integration-ready contracts for the independently developed frontend

## VERY IMPORTANT — FRONTEND IS NOT YOUR RESPONSIBILITY

The frontend is being developed separately in **Google AI Studio**.

DO NOT:

* Build React pages
* Build UI components
* Build Tailwind layouts
* Build frontend dashboards
* Build frontend routing
* Create frontend mockups
* Create frontend design systems
* Modify frontend code
* Replace the AI Studio frontend

Your APIs must simply be designed so that the AI Studio frontend can consume them later.

---

# 3. TECHNOLOGY STACK

Use:

### Backend

* Node.js
* Express.js
* TypeScript

### Database

* PostgreSQL

### Authentication

* JWT
* bcrypt
* VIT student email validation

Expected student email domain:

`@vitstudent.ac.in`

### Validation

Use Zod or another clean TypeScript validation approach where appropriate.

### Testing

Use a suitable Node/TypeScript testing framework.

### AI/ML

Implement the AI/ML layer in a way that can later evolve into separate Python services if necessary.

Initial intelligent features:

1. SmartMatch AI
2. Demand Prediction ML

Do not introduce unnecessary AI features.

---

# 4. ARCHITECTURAL PRINCIPLE

Use a clean layered backend architecture:

```text
Client / AI Studio Frontend
            ↓
        REST API
            ↓
      Controllers
            ↓
        Services
            ↓
       Repositories
            ↓
       PostgreSQL
```

AI/ML:

```text
REST API
   ↓
AI/ML Service
   ├── SmartMatch
   └── Demand Prediction
```

Keep business logic out of route handlers.

Controllers should be thin.

Services should contain business logic.

Database access should be isolated.

---

# 5. EXPECTED PROJECT STRUCTURE

Create a backend structure similar to:

```text
backend/
├── src/
│   ├── config/
│   │   ├── env.ts
│   │   └── database.ts
│   │
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── equipment.controller.ts
│   │   ├── booking.controller.ts
│   │   ├── review.controller.ts
│   │   ├── favorite.controller.ts
│   │   ├── notification.controller.ts
│   │   ├── damage.controller.ts
│   │   ├── maintenance.controller.ts
│   │   ├── payment.controller.ts
│   │   ├── smartMatch.controller.ts
│   │   ├── demand.controller.ts
│   │   └── admin.controller.ts
│   │
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── equipment.routes.ts
│   │   ├── booking.routes.ts
│   │   ├── review.routes.ts
│   │   ├── favorite.routes.ts
│   │   ├── notification.routes.ts
│   │   ├── damage.routes.ts
│   │   ├── maintenance.routes.ts
│   │   ├── payment.routes.ts
│   │   ├── smartMatch.routes.ts
│   │   ├── demand.routes.ts
│   │   └── admin.routes.ts
│   │
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── equipment.service.ts
│   │   ├── booking.service.ts
│   │   ├── review.service.ts
│   │   ├── notification.service.ts
│   │   ├── damage.service.ts
│   │   ├── maintenance.service.ts
│   │   ├── payment.service.ts
│   │   ├── smartMatch.service.ts
│   │   └── demand.service.ts
│   │
│   ├── repositories/
│   │   ├── user.repository.ts
│   │   ├── equipment.repository.ts
│   │   ├── booking.repository.ts
│   │   ├── review.repository.ts
│   │   ├── notification.repository.ts
│   │   └── ...
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── role.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── validation.middleware.ts
│   │
│   ├── validators/
│   │   ├── auth.validator.ts
│   │   ├── equipment.validator.ts
│   │   ├── booking.validator.ts
│   │   └── ...
│   │
│   ├── ai/
│   │   ├── smartmatch/
│   │   └── demand/
│   │
│   ├── utils/
│   │   ├── jwt.ts
│   │   ├── password.ts
│   │   ├── dates.ts
│   │   └── errors.ts
│   │
│   ├── types/
│   ├── app.ts
│   └── server.ts
│
├── database/
│   ├── migrations/
│   ├── seeds/
│   └── schema.sql
│
├── tests/
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

You may improve this structure if there is a strong architectural reason.

Do not over-engineer it.

---

# 6. DATABASE

Use PostgreSQL.

Do NOT use:

* MongoDB
* Firebase
* Supabase
* SQLite as the actual production database

The application should be designed around PostgreSQL from the beginning.

Potential core entities:

```text
users
categories
equipment
equipment_images
availability_blocks
bookings
reviews
favorites
notifications
damage_reports
maintenance_records
payments
organizations
organization_members
demand_predictions
```

You may add supporting tables where genuinely necessary.

---

# 7. USERS AND ROLES

Primary user roles:

```text
STUDENT
ADMIN
```

A normal student can become a lender simply by listing equipment.

Do NOT create a separate mandatory "LENDER ACCOUNT".

A student may simultaneously:

* Borrow equipment
* List equipment
* Manage their listings
* Approve requests
* Rent equipment to other students

VIT clubs/organizations can also own equipment.

Organizations should be represented as entities rather than creating an unnecessarily complicated separate authentication system.

---

# 8. AUTHENTICATION

Implement:

### Registration

Required:

* Name
* VIT email
* Password
* Optional profile information

Only allow:

```text
@vitstudent.ac.in
```

for normal student registration.

### Password

Hash using bcrypt.

Never store plaintext passwords.

### Login

Return JWT.

### Protected routes

Use JWT middleware.

### Authorization

Implement role-based authorization for:

* Student
* Admin

Users should only be allowed to modify resources they own unless they are administrators.

---

# 9. EQUIPMENT

Equipment should contain rich metadata because SmartMatch depends on it.

Recommended fields:

```text
id
owner_id
organization_id nullable
category_id
name
brand
model
description
condition
status
pricing_type
price_per_day
security_deposit
pickup_location
features
tags
use_cases
rating
review_count
created_at
updated_at
```

Important:

`use_cases` must be stored.

Examples:

```text
filmmaking
low-light photography
interviews
outdoor shooting
podcasting
presentations
Arduino projects
IoT development
sports events
academic experiments
```

This metadata will later be used by SmartMatch.

---

# 10. EQUIPMENT STATUS

Support statuses such as:

```text
AVAILABLE
UNAVAILABLE
MAINTENANCE
```

Equipment under maintenance must not be bookable.

Unpublished equipment should not appear in normal discovery.

---

# 11. CATEGORIES

Initial categories:

```text
Cameras
Audio
Electronics
Project Kits
Computing
Lighting
Event Equipment
Sports
Tools
Academic
Other
```

Seed realistic examples.

---

# 12. BOOKING SYSTEM

Booking lifecycle:

```text
PENDING
APPROVED
REJECTED
CANCELLED
ACTIVE
RETURN_REQUESTED
COMPLETED
```

Workflow:

```text
Borrower
   ↓
Select equipment
   ↓
Select dates
   ↓
Check availability
   ↓
Submit request
   ↓
PENDING
   ↓
Owner approves/rejects
   ↓
APPROVED
   ↓
Pickup
   ↓
ACTIVE
   ↓
Return request
   ↓
RETURN_REQUESTED
   ↓
Owner confirms
   ↓
COMPLETED
```

---

# 13. BOOKING CONFLICT RULE

This is critical.

The following statuses block overlapping dates:

```text
PENDING
APPROVED
ACTIVE
RETURN_REQUESTED
```

Do not allow another booking to overlap these periods.

The backend must enforce this.

Do not rely only on frontend availability checks.

Use PostgreSQL-safe transaction logic where appropriate.

---

# 14. PRICE CALCULATION

For paid equipment:

```text
rental amount = number of rental days × price per day
```

Security deposit is separate.

Example:

```text
Rental = ₹500
Deposit = ₹1,000

Total = ₹1,500
```

Free equipment can still require a security deposit.

Do not treat deposit as rental revenue.

---

# 15. MOCK PAYMENTS

Real payment gateway integration is OUT OF SCOPE for v1.

Create a transaction/payment model capable of representing:

```text
PENDING
SUCCESS
FAILED
REFUNDED
```

The system should clearly identify these as demo/mock transactions.

Do not integrate Razorpay/Stripe/etc. unless explicitly requested later.

---

# 16. RETURNS

Borrower can request return.

Owner confirms return.

On completion:

```text
booking → COMPLETED
```

After completion:

* review becomes available
* rental history is updated
* demand/history data can be updated

For v1:

Do not create monetary late penalties.

Late returns can instead be tracked as a status/flag.

---

# 17. REVIEWS

Reviews should only be allowed for completed bookings.

A review can contain:

```text
rating
comment
created_at
```

Prevent duplicate reviews for the same completed booking unless explicitly designed otherwise.

Calculate:

* average rating
* review count

---

# 18. FAVORITES

Students can:

* Add equipment to favorites
* Remove favorites
* Retrieve favorite equipment

Prevent duplicate favorites.

---

# 19. NOTIFICATIONS

Create notifications for events such as:

* Booking request received
* Booking approved
* Booking rejected
* Booking cancelled
* Rental becoming active
* Return requested
* Return confirmed
* Review available
* Damage report
* Maintenance status
* Other important system events

Support:

```text
read
unread
timestamp
reference entity
```

---

# 20. DAMAGE REPORTS

Damage report fields can include:

```text
booking_id
equipment_id
reported_by
description
severity
status
photos/reference data
created_at
resolved_at
```

Statuses:

```text
OPEN
UNDER_REVIEW
RESOLVED
```

Do not build complicated insurance/legal workflows.

---

# 21. MAINTENANCE

Equipment can be placed under maintenance.

Fields:

```text
equipment_id
reason
start_date
expected_completion
status
notes
```

Maintenance equipment must become unavailable for booking.

---

# 22. ORGANIZATIONS / CLUBS

VIT clubs can own equipment.

Support:

```text
organizations
organization_members
```

Keep this simple.

Do not create an enterprise organization-management platform.

---

# 23. SMARTMATCH AI

SmartMatch is one of LENDR's major differentiating features.

It is NOT a chatbot.

The user provides a natural-language requirement.

Example:

> "I need something to shoot a short film at night."

The system should return ranked equipment.

Example:

```text
Sony A7 III
Match: 94%

Why:
- Strong low-light capability
- Suitable for filmmaking
- Available during requested dates
- Matches camera requirement
```

---

# 24. SMARTMATCH IMPLEMENTATION

Initial implementation can use lightweight NLP.

A practical approach:

```text
Equipment metadata
        ↓
description + tags + features + use_cases
        ↓
TF-IDF vectorization
        ↓
User requirement vector
        ↓
Cosine similarity
        ↓
Ranking
```

Do NOT pretend this is a large language model.

The API should return explainable matching information.

Potential result:

```json
{
  "equipmentId": "...",
  "matchScore": 94,
  "reasons": [
    "Matches filmmaking use case",
    "Strong low-light capability",
    "Available for requested dates"
  ]
}
```

You may improve the ranking using:

* category match
* use-case match
* feature match
* availability
* price constraints
* rating

But keep the implementation explainable.

---

# 25. SMARTMATCH API

Design an endpoint such as:

```text
POST /api/smart-match
```

Input:

```json
{
  "query": "I need something for shooting a short film at night",
  "category": "Cameras",
  "budgetPerDay": 1000,
  "startDate": "2026-10-20",
  "endDate": "2026-10-22"
}
```

Return ranked equipment with:

* match score
* reasons
* availability
* price
* rating
* important matching features

---

# 26. DEMAND PREDICTION ML

Second major intelligent feature.

Purpose:

Help lenders/admin understand which equipment or categories are likely to be in demand.

Use historical booking/rental information.

Potential features:

```text
category
equipment
booking frequency
day
month
duration
historical popularity
previous request count
seasonality
```

Output can include:

```text
current demand
predicted demand
expected requests
trend
popular categories
popular equipment
```

---

# 27. DEMAND DATA RULE

Initially there may not be real historical VIT usage data.

Therefore:

Use clearly labeled **synthetic/demo historical data** for development and academic demonstration.

Never present synthetic data as actual VIT student usage.

The API/database should make it possible to distinguish:

```text
REAL
DEMO
```

data sources where appropriate.

---

# 28. DEMAND MODEL

Do not over-engineer the first version.

Start with a practical baseline model.

Possible approaches:

* Linear regression
* Random forest regression
* Time-series baseline

Choose based on the available feature structure.

The implementation should expose:

```text
training
prediction
evaluation
```

where practical.

Store predictions in:

```text
demand_predictions
```

Include enough information to understand:

* prediction date
* target period
* equipment/category
* predicted demand
* model/version if useful
* data source

---

# 29. DEMAND API

Example:

```text
GET /api/demand
```

and/or:

```text
GET /api/demand/equipment/:id
GET /api/demand/categories
```

Return data suitable for charts in the independently developed frontend.

Example:

```json
{
  "equipmentId": "...",
  "currentDemand": 18,
  "predictedDemand": 24,
  "trend": "INCREASING",
  "dataSource": "DEMO"
}
```

---

# 30. ADMIN

Admin APIs should support:

### Users

* list
* view
* deactivate where appropriate

### Equipment

* review
* moderate
* manage

### Bookings

* monitor
* inspect

### Damage

* inspect
* resolve

### Payments

* inspect mock transactions

### Categories

* create
* update
* manage

### Demand

* view analytics/predictions

Do not build frontend admin pages.

Only provide APIs.

---

# 31. API DESIGN

Use RESTful APIs.

Example structure:

```text
/api/auth/*
/api/users/*
/api/equipment/*
/api/bookings/*
/api/reviews/*
/api/favorites/*
/api/notifications/*
/api/damage/*
/api/maintenance/*
/api/payments/*
/api/smart-match/*
/api/demand/*
/api/admin/*
```

Use appropriate HTTP methods:

```text
GET
POST
PATCH
DELETE
```

Use consistent response formats.

Use appropriate HTTP status codes.

---

# 32. ERROR HANDLING

Implement centralized error handling.

Errors should return useful structured responses.

Example:

```json
{
  "success": false,
  "error": {
    "code": "BOOKING_CONFLICT",
    "message": "Equipment is already requested for the selected dates."
  }
}
```

Do not expose stack traces in production responses.

---

# 33. SECURITY

Implement basic production-quality security:

* Password hashing
* JWT authentication
* Authorization middleware
* Input validation
* SQL injection protection
* Environment variables
* Secure CORS configuration
* Rate limiting where appropriate
* Do not expose secrets
* Do not store plaintext passwords
* Validate ownership before modification

---

# 34. API DOCUMENTATION

Create clear backend documentation.

Document:

* authentication
* endpoints
* request bodies
* response structures
* error codes
* authorization requirements

Make it easy for another developer building the frontend in AI Studio to integrate with the API.

If useful, provide an OpenAPI/Swagger specification.

---

# 35. SEED DATA

Create realistic development/demo data.

Include:

### Users

8–12 users.

### Equipment

At least 15–25 pieces of equipment across multiple categories.

Examples:

* Sony camera
* Canon camera
* tripod
* gimbal
* wireless microphone
* audio recorder
* Arduino kit
* ESP32 kit
* Raspberry Pi
* projector
* LED light
* speaker
* multimeter
* sports equipment
* presentation equipment

### Bookings

At least 10 realistic bookings covering:

* pending
* approved
* active
* completed
* cancelled

### Reviews

At least 15.

### Notifications

Multiple realistic examples.

### Demand data

Synthetic historical data clearly marked as demo.

---

# 36. API CONTRACT FOR AI STUDIO

The frontend will be developed separately.

Therefore the API must be predictable.

Document examples like:

```text
GET /api/equipment
GET /api/equipment/:id

POST /api/bookings
GET /api/bookings
GET /api/bookings/:id

PATCH /api/bookings/:id/approve
PATCH /api/bookings/:id/reject
PATCH /api/bookings/:id/cancel

POST /api/bookings/:id/return-request
PATCH /api/bookings/:id/complete

POST /api/reviews

POST /api/favorites/:equipmentId
DELETE /api/favorites/:equipmentId

GET /api/notifications

POST /api/smart-match

GET /api/demand
```

The exact endpoint naming can be improved if consistency requires it.

---

# 37. DO NOT BUILD THESE

Explicitly out of scope:

* AI chatbot
* Blockchain
* GPS tracking
* Maps
* Delivery system
* Real-time chat
* Facial recognition
* AI-generated equipment descriptions
* Social-media feed
* Complex recommendation social graph
* Real payment gateway
* Insurance platform
* Enterprise organization management
* Unnecessary microservices
* Kubernetes
* Complex cloud infrastructure
* Over-engineered distributed architecture

This is a serious academic project, not a fake enterprise startup.

---

# 38. DEVELOPMENT PRINCIPLES

Prioritize:

1. Correctness
2. Clean architecture
3. Database integrity
4. Security
5. Testability
6. Explainability
7. Maintainability
8. Simple implementation
9. Good API contracts

Avoid unnecessary abstraction.

Avoid creating files just for the sake of architecture.

---

# 39. IMPLEMENTATION ORDER

Do NOT attempt to generate the entire backend blindly in one step.

Work incrementally.

Recommended order:

### Phase 1

Project setup

* Node
* Express
* TypeScript
* environment configuration
* PostgreSQL connection
* basic server
* health endpoint

### Phase 2

Database

* schema
* migrations
* relationships
* indexes
* seed system

### Phase 3

Authentication

* registration
* VIT email validation
* bcrypt
* login
* JWT
* middleware
* roles

### Phase 4

Equipment

* categories
* equipment CRUD
* search
* filtering
* ownership

### Phase 5

Booking

* availability
* conflict prevention
* booking lifecycle
* price calculation
* approval/rejection
* transactions

### Phase 6

Rental lifecycle

* pickup
* active rental
* return request
* completion

### Phase 7

Reviews/Favorites/Notifications

### Phase 8

Damage + Maintenance

### Phase 9

Mock Payments

### Phase 10

SmartMatch AI

### Phase 11

Demand Prediction ML

### Phase 12

Admin APIs

### Phase 13

Testing + API documentation

### Phase 14

Frontend integration readiness

---

# 40. IMPORTANT WORKFLOW

Before writing code:

1. Inspect the repository.
2. Read all existing project documentation.
3. Identify existing files.
4. Do not destroy useful existing work.
5. Determine what has already been implemented.
6. Follow the project's documentation as the source of truth.
7. Tell me what you plan to implement before making major architectural changes.

After each phase:

1. Implement the phase.
2. Run the application.
3. Run tests.
4. Fix errors.
5. Verify database behavior.
6. Report exactly what changed.
7. Stop before moving to the next major phase.

Do NOT silently jump through the entire project.

---

# 41. FRONTEND SEPARATION RULE

The frontend is being built independently using Google AI Studio.

Therefore:

```text
Claude Code
    ↓
Backend + PostgreSQL + AI/ML

Google AI Studio
    ↓
Frontend/UI/UX
```

Do not create duplicate frontend implementations.

Do not assume the frontend's internal implementation.

Instead, provide:

* REST API
* API documentation
* request/response schemas
* authentication flow
* predictable error responses
* CORS configuration
* integration instructions

---

# 42. FINAL GOAL

The completed backend should support this complete flow:

```text
VIT Student
     ↓
Register with VIT email
     ↓
Login
     ↓
Browse equipment
     ↓
Search/filter
     ↓
View equipment
     ↓
Check availability
     ↓
Create booking
     ↓
Owner approves
     ↓
Mock transaction
     ↓
Pickup
     ↓
Active rental
     ↓
Return request
     ↓
Owner confirms
     ↓
Completed
     ↓
Review
```

And independently:

```text
Student requirement
       ↓
SmartMatch AI
       ↓
Ranked equipment
       ↓
Explainable match
```

And:

```text
Historical booking data
       ↓
Demand Prediction ML
       ↓
Predicted demand
       ↓
Lender/Admin analytics
```

Build LENDR as a **realistic, technically defensible VIT campus project**.

Do not fake functionality.

Do not claim ML is real if it is only demo data.

Do not invent unsupported features.

Do not build the frontend.

Follow the project documentation and implement the backend systematically.
