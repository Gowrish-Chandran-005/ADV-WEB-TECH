# LENDR — Project Instructions

## 1. Project Overview

LENDR is a VIT-campus-exclusive equipment sharing and rental platform.

The platform allows VIT students, student clubs, project teams, and authorized campus communities to discover, lend, borrow, rent, and manage equipment within the VIT campus.

The core workflow is:

Discover → Check Availability → Request → Approve → Pickup → Use → Return → Review

LENDR is NOT a generic public marketplace. The product must remain focused on the VIT campus environment, trusted student identity, equipment availability, borrowing/rental workflows, and campus-specific use cases.

---

# 2. Technology Stack

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS

## Backend

- Node.js
- Express.js
- REST API

## Database

- PostgreSQL

## Authentication

- JWT
- bcrypt
- VIT student email verification

## Validation

- Zod where appropriate

## AI / ML

LENDR contains two genuine intelligent features:

1. SmartMatch AI
2. Demand Prediction ML

## Other

- Git / GitHub
- Cloud image storage such as Cloudinary may be used
- Deployment provider will be decided later

### Important

Do NOT replace PostgreSQL with:

- MongoDB
- Firebase
- Supabase
- Another database

Do NOT replace Express.js with another backend framework unless explicitly approved.

Do NOT introduce unnecessary libraries or external services.

---

# 3. User Roles

LENDR has four primary user roles.

## 3.1 Student / Borrower

Students can:

- Register and log in
- Browse equipment
- Search equipment
- Filter and sort equipment
- View equipment details
- Check availability
- Request equipment
- Track bookings
- Manage active rentals
- Request returns
- Review completed rentals
- Save favorite equipment
- Receive notifications
- Use SmartMatch AI

---

## 3.2 Lender

A normal student can become a lender simply by listing equipment.

There should NOT be a completely separate lender account creation system.

Lenders can:

- Add equipment
- Edit equipment
- Unpublish equipment
- Manage equipment availability
- Set rental price
- Set security deposit
- Approve booking requests
- Reject booking requests
- Manage active rentals
- Confirm returns
- View ratings
- View rental value/revenue
- View utilization
- Manage maintenance
- Review damage reports
- View demand prediction insights

---

## 3.3 Club / Organization

VIT clubs can own and manage shared equipment.

Club functionality should remain simple.

Treat clubs primarily as equipment-owning/lending entities.

Do NOT create a complex enterprise organization management system unless explicitly required later.

---

## 3.4 Admin

Admins can:

- Manage users
- Moderate equipment
- Monitor bookings
- Review damage reports
- Monitor maintenance
- Monitor transactions
- View platform analytics
- View demand prediction
- Manage categories
- Handle platform-level issues

Do NOT invent additional roles without approval.

---

# 4. Campus Identity

LENDR is VIT-only.

Expected student email domain:

`@vitstudent.ac.in`

Authentication should eventually support:

- Registration
- Login
- Logout
- Email verification
- JWT-based authentication
- User profile

During development, a mock/development verification mechanism may be used before real email infrastructure is configured.

Backend authorization is mandatory.

Never rely only on frontend route protection.

Users must only be able to modify resources they own or are authorized to manage.

---

# 5. Equipment

Equipment is the central entity of LENDR.

Each equipment listing should support rich information.

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
- Rental price per day
- Security deposit
- Free/paid status
- Pickup location
- Availability status
- Owner/lender
- Rating

The `use_cases` field is particularly important because it will be used by SmartMatch AI.

Example use cases:

- Filmmaking
- Low-light photography
- Interviews
- Outdoor shooting
- Presentations
- Electronics projects
- Hackathons
- Sports events
- Academic projects

Never invent capabilities that an equipment item does not actually have.

---

# 6. Equipment Categories

Initial categories:

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

The category system should remain extensible.

---

# 7. Campus Pickup Locations

Equipment pickup should use campus-oriented locations.

Examples:

- TT
- SMV
- MB
- SJT
- Library
- Hostels
- Labs
- Clubs
- Other common campus locations

Do NOT introduce:

- GPS tracking
- Delivery
- Maps
- Street-address based logistics

These are outside the core product.

---

# 8. Booking Lifecycle

Booking statuses are:

- `PENDING`
- `APPROVED`
- `REJECTED`
- `CANCELLED`
- `ACTIVE`
- `RETURN_REQUESTED`
- `COMPLETED`

Core workflow:

1. Borrower selects equipment.
2. Borrower selects start and end dates.
3. Backend checks availability.
4. Borrower enters purpose/notes.
5. System calculates rental amount and security deposit.
6. Borrower submits request.
7. Booking becomes `PENDING`.
8. Owner approves or rejects.
9. Approved booking proceeds toward pickup.
10. Rental becomes `ACTIVE`.
11. Borrower requests return.
12. Owner confirms return.
13. Booking becomes `COMPLETED`.
14. Borrower can submit a review.

---

# 9. Booking Rules

These rules are mandatory.

## Date conflicts

`PENDING` bookings block the requested dates.

`APPROVED` bookings block the requested dates.

`ACTIVE` bookings block the requested dates.

The backend MUST prevent overlapping bookings.

Availability checking must happen server-side.

Frontend availability checks are only for user convenience and must never be treated as the source of truth.

---

## Rental Price and Deposit

Rental price and security deposit are separate.

A free equipment item may still require a security deposit.

Example:

Rental price: ₹0/day  
Security deposit: ₹500

The total payable amount must correctly account for both.

---

## Late Returns

Late returns should be tracked.

There is NO monetary late-return penalty in v1.

Do not invent a penalty system.

---

# 10. Mock Transactions

LENDR v1 does NOT use a real payment gateway.

The system may contain a mock transaction system for demonstration.

Transaction information can include:

- Rental amount
- Security deposit
- Total amount
- Transaction status

Possible statuses:

- `PENDING`
- `SUCCESS`
- `FAILED`
- `REFUNDED`

The UI and documentation must clearly indicate that these are mock/demo transactions.

Never claim that real payment processing exists unless it has actually been implemented and tested.

---

# 11. Equipment Discovery

The discovery system should support:

- All equipment
- Recent equipment
- Popular equipment
- Highly rated equipment
- Available now
- Recommended equipment

Search should consider:

- Name
- Brand
- Model
- Category
- Description
- Tags

Filters may include:

- Category
- Price
- Availability
- Condition
- Rating
- Pickup location
- Free/paid

Sorting may include:

- Price low to high
- Price high to low
- Rating
- Popularity
- Newest

---

# 12. Equipment Details

The equipment details page should provide useful information such as:

- Equipment images
- Name
- Category
- Brand
- Model
- Description
- Condition
- Features
- Tags
- Use cases
- Rental price
- Security deposit
- Availability
- Pickup location
- Owner/lender information
- Owner rating where appropriate
- Equipment rating
- Reviews

Users should be able to:

- Save equipment
- View availability
- Select rental dates
- Request equipment

---

# 13. SmartMatch AI

SmartMatch is a genuine AI/NLP recommendation feature.

It is NOT a chatbot.

The user describes what they need using natural language.

Example:

> I need something to shoot a short film at night.

The system should analyze the request and rank relevant equipment.

Example output:

1. Sony A7 III — 94% match
2. Canon EOS R — 87% match
3. Sony A6400 — 79% match

The system should explain why an item matches.

Example reasons:

- Suitable for filmmaking
- Strong low-light capability
- Matches requested use case
- Relevant features
- Available for requested dates

Results should also show useful information such as:

- Availability
- Price
- Security deposit
- Rating
- Relevant features

A lightweight implementation such as:

- TF-IDF
- Cosine similarity

is acceptable.

The system must be explainable.

Do NOT build:

- AI chatbot
- AI-generated equipment descriptions
- Fake AI recommendations
- Recommendations based on information not present in the database

Never invent equipment capabilities.

---

# 14. Demand Prediction ML

Demand Prediction is the second major AI/ML component.

The system should predict equipment/category demand using historical booking/rental data.

Potential features include:

- Equipment
- Category
- Booking frequency
- Request frequency
- Day
- Month
- Rental duration
- Popularity
- Historical demand

The system can provide:

- Current demand
- Predicted demand
- Expected requests
- Demand trend
- Popular categories
- Popular equipment

Primary users:

- Lenders
- Admins

Because a new platform does not initially have real historical VIT usage, development/demo data may contain seeded or synthetic historical booking data.

This data MUST be clearly labelled as:

`Demo / Synthetic Historical Data`

Never present synthetic data as real VIT usage.

---

# 15. Dashboards

## Student Dashboard

Should prioritize:

- Upcoming bookings
- Active rentals
- Recent bookings
- Saved equipment
- Notifications
- Recommendations/activity

---

## Lender Dashboard

Should provide:

- Total equipment
- Active rentals
- Pending requests
- Completed rentals
- Rental value/revenue
- Average rating
- Utilization
- Equipment overview
- Pending requests
- Active rentals
- Recent activity
- Demand insights

Charts should communicate useful information.

Do not add charts merely for visual decoration.

---

## Admin Dashboard

Should provide:

- Users
- Equipment
- Bookings
- Categories
- Transactions
- Damage reports
- Maintenance
- Analytics
- Demand prediction

---

# 16. Reviews and Ratings

Reviews can only be submitted after a completed rental.

A review may contain:

- Star rating
- Comment

The system should support:

- Average rating
- Rating distribution
- Review list

Users must NOT be allowed to review equipment they have not successfully completed a booking for.

---

# 17. Damage Reports

Damage reports should be associated with:

- Equipment
- Booking
- Reporter
- Description
- Photos
- Date
- Severity
- Status

Initial statuses:

- `OPEN`
- `UNDER_REVIEW`
- `RESOLVED`

Do not create a complex insurance/legal system.

---

# 18. Maintenance

Equipment can be placed under maintenance.

Maintenance records should support:

- Equipment
- Reason
- Start date
- Expected completion
- Status
- Notes

Equipment under maintenance MUST NOT be bookable.

---

# 19. Notifications

Notifications should cover meaningful system events such as:

- Booking request received
- Booking approved
- Booking rejected
- Booking cancelled
- Rental activated
- Return requested
- Return completed
- Damage report
- Maintenance update
- Review availability
- Relevant availability updates

Notifications should support:

- Read/unread state
- Timestamp
- Related entity/reference where useful

Do not create unnecessary notifications for trivial UI actions.

---

# 20. Favorites

Users can save equipment.

Favorite functionality should support:

- Save equipment
- Remove equipment
- View saved equipment
- View current availability
- View price
- View rating

---

# 21. Database

PostgreSQL is the source of truth.

Potential core tables/entities include:

- users
- categories
- equipment
- equipment_images
- availability
- bookings
- reviews
- damage_reports
- maintenance_records
- notifications
- favorites
- payments

Organizations/club membership tables may be introduced only if required by the approved product architecture.

Do not create unnecessary tables.

Use:

- Foreign keys
- Appropriate constraints
- Indexes
- Timestamps
- Proper normalization

Booking conflicts and ownership rules should be enforced as strongly as practical at the database/backend level.

---

# 22. REST API

The application will use a REST API.

Expected API areas include:

- `/api/auth`
- `/api/equipment`
- `/api/bookings`
- `/api/reviews`
- `/api/damage-reports`
- `/api/notifications`
- `/api/admin`
- AI/ML endpoints

The complete API contract should be finalized in `ARCHITECTURE.md`.

Do not prematurely invent endpoints before the product requirements and architecture are finalized.

---

# 23. Security

Security must be implemented on the backend.

Required principles:

- Hash passwords with bcrypt
- Validate JWTs
- Enforce authorization
- Validate input
- Check resource ownership
- Use safe database queries
- Store secrets in environment variables
- Never hardcode credentials
- Never expose sensitive secrets to the frontend
- Handle errors safely

Never trust client-supplied:

- User identity
- Ownership
- Role
- Permissions
- Price calculations
- Availability
- Booking status

The backend must determine these values.

---

# 24. UI/UX Direction

The product should feel:

- Modern
- Premium
- Clean
- Simple
- Campus-oriented
- Professional
- Intuitive
- Polished

Avoid:

- Generic SaaS templates
- Overly dark dashboards
- Excessive gradients
- Excessive glassmorphism
- Overcrowded screens
- Meaningless animations
- Huge decorative sections
- Amazon clone aesthetics
- Airbnb clone aesthetics
- Fake AI-looking interfaces

The most important things should be immediately understandable:

1. What equipment is available?
2. Can I use it on my dates?
3. How much does it cost?
4. Where do I pick it up?
5. Who owns it?
6. How do I request it?
7. What happens after I request it?

The final visual system will be defined in `DESIGN.md`.

Do not lock a final color palette in this document.

---

# 25. Development Principles

Before implementing any feature:

1. Understand the requirement.
2. Read the relevant documentation.
3. Check the current architecture.
4. Avoid unnecessary changes.
5. Implement the smallest maintainable solution.
6. Validate inputs.
7. Implement authorization.
8. Test the feature.
9. Update documentation when behavior or architecture changes.

Always prioritize correctness and maintainability over unnecessary complexity.

---

# 26. Do Not Invent Features

Do NOT add features simply because they are common in marketplaces.

The following are explicitly OUT OF SCOPE unless separately approved:

- Global marketplace
- Delivery
- GPS tracking
- Maps
- Real-time chat
- Blockchain
- Cryptocurrency
- Facial recognition
- AI chatbot
- AI-generated equipment descriptions
- Complex social networking
- Complex enterprise organization management
- Real payment gateway
- Marketplace integrations
- Unnecessary recommendation systems
- Random sentiment analysis

If a feature is not documented or clearly required, do not silently add it.

Ask before expanding scope.

---

# 27. MVP Priority

The MVP must first prove the complete core workflow:

VIT Identity
→ Equipment Discovery
→ Equipment Details
→ Availability
→ Booking Request
→ Lender Approval
→ Active Rental
→ Return
→ Review

After this core workflow works, the project should demonstrate:

1. SmartMatch AI
2. Demand Prediction ML

Secondary functionality should never delay the core workflow.

---

# 28. Academic Demonstration

The final project should be strong enough for an academic project demonstration.

The demo should clearly demonstrate:

1. VIT student registration/login
2. Equipment discovery
3. Equipment details
4. Availability checking
5. Booking request
6. Lender approval
7. Active rental
8. Return flow
9. Review
10. Lender dashboard
11. SmartMatch AI
12. Demand Prediction ML
13. Admin analytics
14. Damage/maintenance workflow
15. Mock transaction flow

The demonstration should use clearly labelled seeded/demo data where real production data does not exist.

---

# 29. Documentation Structure

The project documentation will eventually follow:

LENDR/
├── CLAUDE.md
├── docs/
│   ├── PRD.md
│   ├── DESIGN.md
│   ├── ARCHITECTURE.md
│   ├── CONTENT.md
│   ├── TASKS.md
│   └── DECISIONS.md
└── assets/

Documentation should be created and reviewed before major implementation begins.

---

# 30. Current Development Rule

At the current stage, do NOT start implementing the application yet.

First establish and review the project documentation:

1. CLAUDE.md
2. PRD.md
3. DECISIONS.md
4. ARCHITECTURE.md
5. DESIGN.md
6. CONTENT.md
7. TASKS.md

Each document should have a clear purpose and should not duplicate the others unnecessarily.

---

# 31. Final Rule

Build LENDR as a realistic, maintainable VIT campus platform.

Prioritize:

- Correct workflows
- Strong backend logic
- Reliable PostgreSQL data model
- Secure authentication/authorization
- Real AI/ML functionality
- Excellent usability
- Clear campus-specific value
- Clean architecture
- Good academic demonstration quality

Do not optimize for feature count.

Optimize for a product that actually works end-to-end and can be convincingly demonstrated.