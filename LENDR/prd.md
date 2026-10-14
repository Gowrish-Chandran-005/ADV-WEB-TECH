# LENDR — Product Requirements Document (PRD)

## 1. Product Overview

### Product Name

LENDR

### Product Type

VIT Campus Equipment Sharing & Rental Platform

### Product Description

LENDR is a campus-exclusive platform that allows VIT students, student clubs, project teams, and authorized campus communities to discover, lend, borrow, rent, and manage equipment within the VIT campus.

Students often need equipment for:

- Academic projects
- Hackathons
- Club activities
- Photography
- Videography
- Events
- Presentations
- Electronics projects
- Sports activities
- Research and experiments

The required equipment may already exist within the campus, but students often do not know:

- Who owns it
- Whether it is available
- When it can be borrowed
- How much it costs
- Where to collect it
- Whether it is suitable for their specific requirement
- Whether the owner is trustworthy
- Whether similar equipment is available

LENDR solves this by creating a trusted campus equipment ecosystem.

The core experience is:

Discover → Evaluate → Check Availability → Request → Approve → Pickup → Use → Return → Review

---

# 2. Problem Statement

Students frequently need equipment temporarily but purchasing equipment is expensive and often unnecessary.

At the same time, many students, clubs, and project teams own equipment that remains unused for significant periods.

The current campus environment lacks a centralized system for:

- Discovering available equipment
- Finding suitable equipment for a specific need
- Checking availability
- Requesting equipment
- Managing lending
- Tracking rentals
- Handling returns
- Managing deposits
- Reviewing equipment
- Tracking damage and maintenance
- Understanding equipment demand

LENDR aims to improve equipment utilization by connecting campus demand with existing campus supply.

---

# 3. Product Vision

Create a trusted digital equipment ecosystem for VIT where students can easily find the right equipment, borrow it when needed, and manage the entire rental lifecycle through one platform.

The platform should feel like a practical campus utility rather than a generic marketplace.

---

# 4. Product Goals

## Primary Goals

1. Centralize campus equipment discovery.
2. Make equipment availability transparent.
3. Simplify borrowing and rental requests.
4. Give equipment owners a structured lending workflow.
5. Improve equipment utilization within campus.
6. Build trust using VIT identity, ratings, booking history, and clear ownership.
7. Provide intelligent equipment recommendations through SmartMatch AI.
8. Provide demand insights using Demand Prediction ML.
9. Create a complete end-to-end rental lifecycle.
10. Provide meaningful dashboards for students, lenders, and administrators.

---

# 5. Success Criteria

LENDR should be considered successful when a user can complete the following workflow without manual intervention:

1. Register using VIT identity.
2. Browse equipment.
3. Search/filter equipment.
4. Open an equipment listing.
5. Select rental dates.
6. Check availability.
7. Submit a booking request.
8. Lender receives the request.
9. Lender approves the request.
10. Rental becomes active.
11. Borrower requests return.
12. Lender confirms return.
13. Booking becomes completed.
14. Borrower submits a review.

The platform should additionally demonstrate:

- SmartMatch AI recommendations
- Demand Prediction ML
- Lender analytics
- Admin analytics
- Damage reporting
- Maintenance management
- Mock transaction handling

---

# 6. Target Users

## 6.1 Student Borrower

A VIT student who needs equipment temporarily.

Typical requirements:

- Find a camera for a project
- Borrow a microphone for an event
- Rent a projector for a presentation
- Find an Arduino/ESP32 kit
- Borrow sports equipment
- Find lighting for filmmaking

---

## 6.2 Student Lender

A student who owns equipment and wants to make it available to other students.

Examples:

- Personal camera
- Tripod
- Microphone
- Projector
- Electronics kit
- Laptop/accessory
- Sports equipment

A student does not need a separate lender account.

Listing equipment automatically gives the user lender capabilities.

---

## 6.3 Club / Organization

A VIT club or campus organization that owns equipment.

Examples:

- Cameras
- Speakers
- Projectors
- Event equipment
- Lighting
- Electronics kits

Clubs should have the ability to manage equipment without introducing complex enterprise-level organization management.

---

## 6.4 Administrator

Responsible for maintaining the platform and handling exceptional cases.

Admin responsibilities include:

- User management
- Equipment moderation
- Booking monitoring
- Damage reports
- Maintenance
- Transactions
- Platform analytics
- Demand insights

---

# 7. User Identity and Authentication

## Registration

Users should register using their VIT student email.

Expected domain:

`@vitstudent.ac.in`

Registration should collect appropriate profile information such as:

- Name
- VIT email
- Password
- Optional profile information required by the final design

Passwords must be securely hashed.

---

## Login

Users can log in using their registered credentials.

The system should create an authenticated JWT session.

---

## Email Verification

VIT email verification is part of the product requirement.

During development, a mock/development verification flow may be used.

Real email infrastructure can be integrated later.

---

## Authorization

The backend must enforce role and ownership permissions.

Examples:

- A borrower cannot approve another user's booking.
- A user cannot edit another user's equipment.
- A user cannot modify another user's profile.
- A normal user cannot access admin functionality.
- A user cannot manipulate booking prices from the frontend.

---

# 8. User Roles and Permissions

| Capability | Student | Lender | Club | Admin |
|---|---:|---:|---:|---:|
| Browse equipment | Yes | Yes | Yes | Yes |
| Search equipment | Yes | Yes | Yes | Yes |
| Book equipment | Yes | Yes | Yes | Yes |
| List equipment | Yes | Yes | Yes | Yes |
| Manage own equipment | No | Yes | Yes | Yes |
| Approve own equipment requests | No | Yes | Yes | Yes |
| Manage active rentals | No | Yes | Yes | Yes |
| Submit reviews | Yes | Yes | Yes | Yes |
| Submit damage reports | Yes | Yes | Yes | Yes |
| Manage maintenance | No | Yes | Yes | Yes |
| View own dashboard | Yes | Yes | Yes | Yes |
| View platform-wide analytics | No | No | No | Yes |
| Manage users | No | No | No | Yes |
| Moderate equipment | No | No | No | Yes |
| Manage categories | No | No | No | Yes |

A student who lists equipment gains lender capabilities.

---

# 9. Equipment Discovery

## Equipment Marketplace

The main discovery experience should allow users to browse campus equipment.

Discovery sections can include:

- All Equipment
- Recently Added
- Popular
- Highly Rated
- Available Now
- Recommended

The discovery experience should prioritize useful information rather than decorative UI.

---

## Search

Users should be able to search across:

- Equipment name
- Brand
- Model
- Category
- Description
- Tags

Example:

Search:

`camera`

Possible results:

- Sony A7 III
- Canon EOS R
- Sony A6400

---

## Filters

Supported filters:

- Category
- Price
- Availability
- Condition
- Rating
- Pickup location
- Free/paid

---

## Sorting

Supported sorting:

- Price: Low to High
- Price: High to Low
- Rating
- Popularity
- Newest

---

# 10. Equipment Categories

Initial categories:

1. Cameras
2. Audio
3. Electronics
4. Project Kits
5. Computing
6. Lighting
7. Event Equipment
8. Sports
9. Tools
10. Academic
11. Other

Categories should be database-driven and extensible.

---

# 11. Equipment Listing

A lender should be able to create an equipment listing.

Required/important fields:

- Equipment name
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
- Free/paid
- Pickup location
- Availability status

---

## Equipment Condition

The system should support practical condition states such as:

- Excellent
- Good
- Fair
- Needs Maintenance

The exact final values should be confirmed in the architecture/data model.

---

## Equipment Availability Status

Equipment can be:

- AVAILABLE
- UNAVAILABLE
- MAINTENANCE

Equipment under maintenance cannot be booked.

---

# 12. Equipment Details Page

The equipment details page should clearly communicate:

### Basic Information

- Name
- Category
- Brand
- Model

### Description

Detailed description of the equipment.

### Features

Important capabilities and specifications.

### Use Cases

Examples of what the equipment is suitable for.

### Pricing

- Price per day
- Security deposit
- Free/paid indicator

### Availability

Users should be able to select dates and check whether the equipment can be booked.

### Pickup

Show campus pickup location.

### Owner

Show appropriate lender/club information.

### Trust

Show ratings/reviews where available.

### Actions

Users should be able to:

- Save
- Select dates
- Request equipment

---

# 13. Booking System

The booking system is one of the core product workflows.

## Booking Input

A borrower provides:

- Equipment
- Start date
- End date
- Purpose
- Optional notes

The system calculates:

- Rental duration
- Rental amount
- Security deposit
- Total amount

---

# 14. Booking Status Lifecycle

Supported statuses:

```text
PENDING
    ↓
APPROVED
    ↓
ACTIVE
    ↓
RETURN_REQUESTED
    ↓
COMPLETED

15. Booking Rules
Pending Requests

A PENDING booking blocks the requested dates.

This prevents multiple users from simultaneously requesting the same equipment for the same dates.

Approved Bookings

An APPROVED booking blocks the requested dates.

Active Rentals

An ACTIVE rental blocks the equipment.

Overlap Prevention

The backend must prevent overlapping bookings.

Example:

Existing booking:

June 10 → June 12

A new request for:

June 11 → June 13

must be rejected because the dates overlap.

Availability conflict checking must be server-side.

16. Booking Approval

When a borrower submits a request:

Booking is created as PENDING.
Lender receives a notification.
Lender views request details.
Lender can approve or reject.

The lender should see:

Borrower
Equipment
Start date
End date
Purpose
Notes
Rental amount
Deposit
Total amount
Relevant borrower trust information where appropriate
17. Booking Rejection

If the lender rejects a request, the system should allow a rejection reason.

The borrower receives a notification.

The booking becomes:

REJECTED

Rejected bookings no longer block the dates.

18. Booking Cancellation

Users should be able to cancel bookings according to the final cancellation rules.

Cancellation must update the booking state and release the blocked dates where appropriate.

The exact cancellation timing/refund rules should be finalized in the architecture/decision documentation.

Do not invent complex refund policies.

19. Rental Activation

Once the borrower receives the equipment, the rental can become:

ACTIVE

The system should maintain:

Pickup information
Rental dates
Equipment
Borrower
Lender
Current rental status
20. Return Workflow

When the borrower is finished:

Borrower requests return.
Booking becomes RETURN_REQUESTED.
Lender receives notification.
Lender verifies the equipment.
Lender confirms the return.
Booking becomes COMPLETED.
21. Late Returns

Late returns should be identifiable and trackable.

However:

There is no monetary late-return penalty in v1.

Do not introduce automatic fines unless explicitly approved later.

22. Reviews and Ratings

Reviews are allowed only after a booking reaches:

COMPLETED

A review contains:

Rating
Comment

The system should calculate:

Average rating
Rating distribution
Review count

Reviews help future borrowers evaluate equipment and lenders.

23. Favorites

Users can save equipment to favorites.

Users should be able to:

Add favorite
Remove favorite
View favorites
See availability
See price
See rating
24. Notifications

The notification system should inform users about important events.

Examples:

Borrower
Booking approved
Booking rejected
Booking cancelled
Rental active
Return request
Return completed
Review available
Damage/maintenance updates
Lender
New booking request
Booking cancelled
Return request
Damage report
Relevant maintenance event

Notifications should support:

Message
Timestamp
Read/unread state
Related entity where appropriate
25. Damage Reporting

Damage reports provide a structured way to record equipment issues.

A damage report should contain:

Equipment
Booking
Reporter
Description
Photos where supported
Date
Severity
Status

Statuses:

OPEN
UNDER_REVIEW
RESOLVED

Damage reporting should be available to relevant users and admins.

26. Maintenance Management

Equipment may need maintenance.

A maintenance record should include:

Equipment
Reason
Start date
Expected completion
Status
Notes

Equipment under maintenance cannot be booked.

Maintenance status should affect equipment availability immediately.

27. Mock Transactions

LENDR v1 does not integrate a real payment gateway.

The system should still model transaction information for demonstration.

Transaction information:

Rental amount
Security deposit
Total amount
Status

Statuses:

PENDING
SUCCESS
FAILED
REFUNDED

The UI must clearly communicate that the transaction system is a demonstration/mock implementation.

28. Lender Dashboard

The lender dashboard is focused on equipment ownership and rental activity.

Summary Metrics

Possible metrics:

Total equipment
Active rentals
Pending requests
Completed rentals
Rental value/revenue
Average rating
Utilization
Equipment Overview

Show:

Equipment name
Status
Current availability
Rating
Rental activity
Pending Requests

Show:

Borrower
Equipment
Dates
Purpose
Amount
Approve/reject actions
Active Rentals

Show:

Borrower
Equipment
Start date
End date
Rental status
Return state
Demand Insights

Show:

Current demand
Predicted demand
Popular equipment
Popular categories
Demand trend
29. Student Dashboard

The student dashboard should provide a useful overview of the user's activity.

Sections may include:

Upcoming bookings
Active rentals
Recent bookings
Saved equipment
Notifications
Recommended equipment
Listed equipment if the student is also a lender

The dashboard should remain simple and useful.

30. Admin Dashboard

The admin dashboard should provide platform-level visibility.

Important areas:

Total users
Total equipment
Active bookings
Completed bookings
Pending requests
Transactions
Damage reports
Maintenance
Popular categories
Popular equipment
Demand prediction

Admins should also be able to manage:

Users
Equipment
Categories
Bookings
Reports
31. SmartMatch AI

SmartMatch is one of the primary differentiating features of LENDR.

It should allow users to describe what they need in natural language.

Example:

I need a camera for shooting a short film at night.

The system analyzes the request against equipment information.

Relevant equipment data includes:

Name
Category
Description
Features
Tags
Use cases
SmartMatch Output

Results should be ranked.

Example:

94% Match — Sony A7 III

Reasons:

Strong low-light capability
Suitable for filmmaking
Matches requested use case
Available for selected dates

Also display:

Price
Deposit
Rating
Availability
SmartMatch Implementation

A lightweight NLP approach is acceptable.

Potential implementation:

Build a searchable text representation for each equipment item.
Combine relevant fields.
Convert equipment descriptions into TF-IDF vectors.
Convert the user's natural-language request into a vector.
Calculate cosine similarity.
Rank equipment by similarity.
Combine similarity with practical filters such as availability.
Generate explainable reasons from matching metadata.

The exact algorithm can be finalized in ARCHITECTURE.md.

SmartMatch must not claim unsupported capabilities.

32. Demand Prediction ML

Demand Prediction is the second primary intelligent feature.

The purpose is to help lenders and admins understand future equipment demand.

Input Data

Potential features:

Equipment
Category
Historical booking count
Request count
Day
Month
Rental duration
Popularity
Previous demand
Output

The system may provide:

Predicted demand
Expected requests
Demand trend
High-demand categories
High-demand equipment
Current vs predicted demand
Demo Data

Because a new LENDR deployment initially lacks real historical booking data, the development environment may use seeded/synthetic historical booking records.

This data must be explicitly labelled:

Synthetic / Demo Historical Data

It must never be described as actual VIT student behavior.

33. AI/ML Explainability

The project should make its AI/ML features understandable during demonstration.

For SmartMatch:

Show why equipment matched the query.

For Demand Prediction:

Show the relevant historical trend and predicted demand.

Avoid black-box presentation where the system simply outputs a number with no explanation.

34. Campus-Specific Features

LENDR must clearly feel like a VIT platform.

Campus-specific elements include:

VIT email verification
Campus pickup locations
Student-focused equipment
Club equipment
Academic project equipment
Hackathon equipment
Campus events
VIT-specific identity and trust

Do not make the interface look like a generic global rental marketplace.

35. Equipment Ownership

Equipment can belong to:

Individual students
VIT clubs/organizations

The platform should clearly identify the lender/owner.

Users must not be able to modify equipment they do not own/manage.

36. Trust and Safety

The platform should encourage trust through:

VIT identity
Equipment information
Condition
Ratings
Reviews
Booking history
Clear ownership
Security deposits
Damage reports

Do not introduce complicated identity verification systems beyond the approved VIT identity flow.

37. Search and Recommendation Relationship

Search and SmartMatch serve different purposes.

Search

Used when the user knows approximately what they want.

Example:

DSLR camera

SmartMatch

Used when the user knows their requirement but may not know the exact equipment.

Example:

I need something for recording a two-person interview indoors.

Both experiences should coexist.

38. Equipment Utilization

A major product objective is improving utilization of equipment that already exists on campus.

Useful lender/admin metrics can include:

Booking frequency
Rental days
Utilization rate
Popularity
Demand trend

These metrics should be based on available booking data.

39. Out of Scope

The following are explicitly outside the current product scope:

Marketplace Expansion
Public/global marketplace
External rental platforms
Cross-campus marketplace
Logistics
Delivery
GPS tracking
Live location
Maps
Communication
Real-time chat
Messaging platform
Payments
Real payment gateway
Credit card processing
UPI gateway integration
AI
AI chatbot
AI-generated descriptions
Facial recognition
Random sentiment analysis
Unnecessary generative AI features
Technology
Blockchain
Cryptocurrency
Social Features
Social feeds
Followers
Complex social networking
Enterprise Features
Complex organization hierarchy
Enterprise permission systems

These may only be reconsidered through a documented product decision.

40. MVP Definition

The MVP must contain the following.

Must Have
Authentication
VIT registration
Login
JWT authentication
User profile
Discovery
Equipment listing
Search
Filters
Sorting
Equipment details
Equipment Management
Add equipment
Edit equipment
Unpublish equipment
Availability status
Images
Pricing
Deposit
Booking
Date selection
Availability checking
Booking request
Approval
Rejection
Cancellation
Active rental
Return
Completion
Reviews
Rating
Comment
Completed-booking restriction
Notifications
Booking events
Return events
Important equipment events
Lender
Equipment management
Booking requests
Active rentals
Basic analytics
AI/ML
SmartMatch AI
Demand Prediction ML
Admin
User management
Equipment management
Booking monitoring
Reports
Analytics
Campus
VIT identity
Campus pickup locations
Club equipment
41. Should Have

These can be implemented after the core MVP is stable:

Favorites
Advanced lender analytics
Advanced demand insights
Damage photos
Maintenance workflow improvements
More advanced notification states
Better recommendation explanations
Richer admin analytics
42. Future Possibilities

Potential future features, not part of the current MVP:

Real payment gateway
Real email notification infrastructure
Mobile application
Advanced demand forecasting
Smart price recommendation
QR-based pickup/return
Advanced organization management
Cross-campus expansion

These must not be implemented during the MVP unless explicitly approved.

43. Non-Functional Requirements
Performance

The system should provide responsive interactions for common actions.

Important areas:

Equipment search
Equipment listing
Availability checks
Booking requests
Dashboard loading
Security

The system must:

Hash passwords
Validate authentication
Enforce authorization
Validate requests
Protect secrets
Prevent unauthorized resource access
Reliability

The system should handle:

Invalid booking dates
Overlapping bookings
Missing equipment
Unauthorized actions
Invalid transactions
Failed requests
Database errors

Graceful error handling is required.

Maintainability

Frontend, backend, database, and AI/ML logic should remain logically separated.

Avoid unnecessary coupling.

Scalability

The architecture should be capable of handling increasing:

Users
Equipment listings
Bookings
Reviews
Notifications

However, do not over-engineer the MVP for massive scale.

44. Error Handling

The application should provide meaningful errors.

Examples:

Booking Conflict

This equipment is already requested for the selected dates.

Unauthorized Action

You are not authorized to perform this action.

Equipment Unavailable

This equipment is currently unavailable.

Maintenance

This equipment is currently under maintenance.

Invalid Dates

End date must be after the start date.

Errors should be understandable to users.

Do not expose raw database errors to the frontend.

45. Empty States

Important empty states should be designed intentionally.

Examples:

No Equipment

No equipment found matching your filters.

No Bookings

You don't have any bookings yet.

No Favorites

You haven't saved any equipment yet.

No Pending Requests

No booking requests are waiting for your approval.

No Notifications

You're all caught up.

Empty states should guide the user when useful.

46. Demo Dataset

The project should include realistic seeded data for demonstration.

Seed data should contain:

Users
Categories
Equipment
Equipment images
Historical bookings
Current bookings
Reviews
Notifications
Maintenance records
Damage reports
Mock transactions

The dataset should contain enough variety to demonstrate the application properly.

Historical ML data must be clearly labelled as synthetic/demo data.

47. Example Equipment Dataset

Examples of equipment that may be seeded:

Cameras
Sony A7 III
Canon EOS R
Sony A6400
Audio
Rode Wireless GO
Zoom H5
Condenser Microphone
Electronics
Arduino Uno Kit
ESP32 Development Kit
Raspberry Pi Kit
Multimeter
Project / Presentation
Projector
HDMI Adapter
Extension Board
Lighting
LED Panel
Softbox Light
RGB Tube Light
Event
Portable Speaker
Wireless Microphone
Sports
Football
Badminton Racket
Basketball

These are examples for seeded/demo data and do not represent real VIT inventory.

48. Core User Journey — Borrower
Scenario

A student wants to shoot a short film.

Step 1

Student logs into LENDR using VIT credentials.

Step 2

Student opens SmartMatch.

Step 3

Student enters:

I need a camera for a short film at night.

Step 4

SmartMatch returns ranked equipment.

Step 5

Student opens a recommended camera.

Step 6

Student selects rental dates.

Step 7

System checks availability.

Step 8

Student enters purpose.

Step 9

Student submits booking request.

Step 10

Lender receives notification.

Step 11

Lender approves request.

Step 12

Student receives approval notification.

Step 13

Rental becomes active after pickup.

Step 14

Student returns equipment.

Step 15

Lender confirms return.

Step 16

Booking becomes completed.

Step 17

Student submits rating/review.

49. Core User Journey — Lender
Scenario

A student owns a camera.

Step 1

Student logs into LENDR.

Step 2

Student chooses to list equipment.

Step 3

Student enters:

Camera name
Brand
Model
Description
Features
Use cases
Condition
Price
Deposit
Pickup location
Images
Step 4

Equipment becomes available.

Step 5

Another student submits a booking request.

Step 6

Lender receives notification.

Step 7

Lender reviews:

Borrower
Dates
Purpose
Amount
Equipment
Step 8

Lender approves request.

Step 9

Rental becomes active after pickup.

Step 10

Borrower requests return.

Step 11

Lender confirms return.

Step 12

Booking becomes completed.

Step 13

Lender sees updated analytics and utilization.

50. Core User Journey — Admin
Step 1

Admin logs into admin dashboard.

Step 2

Admin views platform metrics.

Step 3

Admin monitors:

Users
Equipment
Bookings
Transactions
Damage reports
Maintenance
Step 4

Admin reviews platform demand insights.

Step 5

Admin can moderate or manage problematic records.

51. SmartMatch Demo Journey

Example query:

I need something to record a two-person interview indoors.

SmartMatch should identify relevant equipment using:

Category
Description
Features
Tags
Use cases

The result should show:

Match percentage
Equipment
Match reasons
Availability
Price
Rating

The system should explain why the result is relevant.

52. Demand Prediction Demo Journey

The lender opens the demand analytics section.

The system displays:

Historical demand
Predicted demand
Demand trend
Popular equipment
Popular categories

Example:

Category: Cameras

Historical Requests:
42

Predicted Next Period:
51

Trend:
Increasing

Demand Level:
High

The exact ML model and forecasting period will be finalized in ARCHITECTURE.md.

53. Dashboard Principles

Dashboards should answer practical questions.

Student
What do I have booked?
What am I currently borrowing?
What equipment did I save?
What should I consider next?
Lender
What equipment do I own?
What requests need my attention?
What is currently rented?
How well is my equipment being used?
What equipment is likely to be in demand?
Admin
What is happening across the platform?
How many users/equipment/bookings exist?
What problems need attention?
What equipment/categories are in demand?

Do not create dashboards that only display decorative metrics.

54. Product Principles

LENDR should follow these principles:

Campus First

Every major feature should make sense within a VIT campus environment.

Utility Over Decoration

Useful functionality is more important than visual complexity.

Trust

Users should understand who owns equipment and what they are booking.

Availability First

Users should quickly know whether equipment can actually be used on their required dates.

Explainable Intelligence

AI/ML features should provide understandable reasons and insights.

Simple Workflows

Booking and lending should require as few unnecessary steps as possible.

Realistic Engineering

The system should use practical, maintainable technology instead of unnecessary complexity.

55. Data Integrity Rules

The backend must enforce important business rules.

Examples:

Equipment must belong to a valid owner.
Booking must reference valid equipment.
Booking dates must be valid.
Booking end date must not precede start date.
Overlapping bookings must be prevented.
Equipment under maintenance cannot be booked.
Reviews require completed bookings.
Users cannot modify resources they do not own.
Transaction totals must be calculated server-side.
Synthetic ML data must remain distinguishable from real operational data.
56. Testing Requirements

The final application should include testing for critical workflows.

Important tests include:

Authentication
Registration
Login
Invalid credentials
Authorization
Equipment
Create
Update
Delete/unpublish
Ownership checks
Booking
Valid booking
Invalid dates
Overlapping booking
Approval
Rejection
Cancellation
Return
Reviews
Completed booking review
Invalid review attempt
Maintenance
Maintenance equipment cannot be booked
AI
SmartMatch returns ranked results
Demand prediction processes expected input data
Security
Unauthorized access
Ownership violations
Invalid requests
57. Academic Evaluation Focus

The project should demonstrate more than a basic CRUD marketplace.

Important differentiators are:

VIT-exclusive identity
Campus equipment ecosystem
Complete rental lifecycle
Real booking conflict handling
Lender analytics
Damage and maintenance management
SmartMatch AI
Demand Prediction ML
Explainable recommendations
Practical campus use case

The AI/ML components should be integrated into the actual product workflow rather than being disconnected demonstrations.

58. MVP Demo Flow

A polished academic demonstration should follow this sequence:

Part 1 — Student
Login
Browse equipment
Search/filter
Open equipment
Check dates
Submit booking
Part 2 — Lender
Login as lender
View pending request
Approve booking
Part 3 — Student
View approval
Show active rental
Request return
Part 4 — Lender
Confirm return
Booking becomes completed
Part 5 — Review
Student submits review
Part 6 — SmartMatch
Enter natural-language requirement
Show ranked equipment
Explain match
Part 7 — Demand Prediction
Open lender/admin analytics
Show historical demand
Show predicted demand
Explain trend
Part 8 — Admin
Show users
Show equipment
Show bookings
Show reports
Show analytics
59. Product Scope Summary

LENDR is fundamentally composed of five layers:

Layer 1 — Identity

VIT authentication and user profiles.

Layer 2 — Equipment Marketplace

Discovery, search, filtering, equipment details, listing management.

Layer 3 — Rental Workflow

Availability, booking, approval, active rental, return, reviews.

Layer 4 — Trust and Management

Ratings, damage reports, maintenance, notifications, transactions.

Layer 5 — Intelligence

SmartMatch AI and Demand Prediction ML.

These layers should work together as one coherent product.

60. Final Product Definition

LENDR is a VIT-campus-exclusive equipment sharing and rental platform that enables students and campus organizations to discover and utilize existing equipment efficiently.

Its core value comes from combining:

Trusted VIT identity
Equipment discovery
Availability management
Structured borrowing/rental
Owner approval
Return management
Ratings and reviews
Damage and maintenance tracking
Lender analytics
SmartMatch AI
Demand Prediction ML

The product should remain focused, practical, and technically credible.

The goal is not to build the largest possible feature set.

The goal is to build a complete, polished, intelligent campus equipment platform that works end-to-end.


### After this

Once you've saved `PRD.md`, **don't start coding yet**.

The next document should be **`DECISIONS.md`**. That one will lock the business rules and prevent Claude 