# LENDR — Design Structure

## 1. Purpose

This document defines the **initial structural design** of LENDR.

For this version, the document intentionally contains only:

* Sitemap
* Screen structure
* Wireframes
* Feature-to-screen mapping
* Navigation structure
* Frontend/backend integration expectations

This is **NOT the final visual design system**.

The final UI/UX, visual language, colors, typography, illustrations, animations, spacing, and component styling will be updated later.

When an updated `DESIGN.md` is provided, the new design should become the primary design reference.

---

# 2. Design Ownership

The frontend is developed separately in **Google AI Studio**.

Claude Code is responsible for:

* Backend
* PostgreSQL
* APIs
* Authentication
* AI/ML
* Backend integration support

Claude must NOT create the frontend based on this initial document.

The initial wireframes are provided only to establish:

* what screens exist
* what information each screen needs
* how features connect
* what backend APIs will eventually support them

---

# 3. Core Navigation

LENDR should have three major navigation experiences.

### Student

```text
Home
Explore
SmartMatch
Bookings
Favorites
Notifications
Profile
```

### Lender

```text
Dashboard
My Equipment
Requests
Active Rentals
Returns
Demand Insights
Notifications
Profile
```

### Admin

```text
Dashboard
Users
Equipment
Bookings
Reports
Transactions
Demand
Categories
```

Navigation can later be redesigned visually.

---

# 4. Global Sitemap

```text
LENDR
│
├── Authentication
│   ├── Login
│   ├── Register
│   └── Verification
│
├── Student
│   ├── Home
│   ├── Explore
│   │   ├── All Equipment
│   │   ├── Categories
│   │   ├── Search Results
│   │   └── Equipment Details
│   │
│   ├── SmartMatch
│   │   ├── Requirement Input
│   │   └── Match Results
│   │
│   ├── Bookings
│   │   ├── Upcoming
│   │   ├── Active
│   │   ├── Completed
│   │   └── Cancelled
│   │
│   ├── Favorites
│   ├── Notifications
│   └── Profile
│
├── Lender
│   ├── Dashboard
│   ├── My Equipment
│   │   ├── All Listings
│   │   ├── Add Equipment
│   │   ├── Edit Equipment
│   │   └── Equipment Details
│   │
│   ├── Booking Requests
│   │   ├── Pending
│   │   ├── Approved
│   │   └── Rejected
│   │
│   ├── Active Rentals
│   ├── Return Requests
│   ├── Damage Reports
│   ├── Maintenance
│   └── Demand Insights
│
└── Admin
    ├── Dashboard
    ├── Users
    ├── Equipment
    ├── Bookings
    ├── Damage Reports
    ├── Maintenance
    ├── Transactions
    ├── Categories
    └── Demand Analytics
```

---

# 5. Student Sitemap

```text
Student
│
├── Home
│
├── Explore
│   ├── Search
│   ├── Filters
│   ├── Categories
│   └── Equipment Details
│
├── SmartMatch
│
├── Bookings
│   ├── Upcoming
│   ├── Active
│   ├── Completed
│   └── Cancelled
│
├── Favorites
│
├── Notifications
│
└── Profile
```

---

# 6. Lender Sitemap

A student becomes a lender when they list equipment.

```text
Lender
│
├── Dashboard
│
├── My Equipment
│   ├── Listings
│   ├── Add Equipment
│   ├── Edit Equipment
│   └── Listing Details
│
├── Requests
│   ├── Pending
│   ├── Approved
│   └── Rejected
│
├── Active Rentals
│
├── Returns
│
├── Damage Reports
│
├── Maintenance
│
└── Demand Insights
```

---

# 7. Admin Sitemap

```text
Admin
│
├── Dashboard
│
├── Users
│
├── Equipment
│
├── Bookings
│
├── Transactions
│
├── Damage Reports
│
├── Maintenance
│
├── Categories
│
└── Demand Analytics
```

---

# 8. Wireframe Conventions

The following wireframes are structural only.

```text
[ HEADER ]

[ PAGE TITLE ]

[ PRIMARY CONTENT ]

[ SECONDARY CONTENT ]

[ ACTIONS ]

[ FOOTER / NAVIGATION ]
```

Do not interpret these wireframes as final styling.

---

# 9. Authentication — Login

```text
┌───────────────────────────────────────────┐
│                  LENDR                    │
│                                           │
│             Welcome back                  │
│                                           │
│  VIT Email                                │
│  ┌─────────────────────────────────────┐  │
│  │ yourname@vitstudent.ac.in           │  │
│  └─────────────────────────────────────┘  │
│                                           │
│  Password                                 │
│  ┌─────────────────────────────────────┐  │
│  │ •••••••••                           │  │
│  └─────────────────────────────────────┘  │
│                                           │
│            [ Sign In ]                    │
│                                           │
│        Create an account                  │
└───────────────────────────────────────────┘
```

Backend requirements:

* Login API
* JWT authentication
* Session handling
* VIT email validation

---

# 10. Authentication — Register

```text
┌───────────────────────────────────────────┐
│              Create Account               │
│                                           │
│  Name                                     │
│  [____________________________________]   │
│                                           │
│  VIT Email                                │
│  [____________________________________]   │
│                                           │
│  Password                                 │
│  [____________________________________]   │
│                                           │
│  Confirm Password                         │
│  [____________________________________]   │
│                                           │
│              [ Register ]                 │
│                                           │
└───────────────────────────────────────────┘
```

---

# 11. Student Home

Purpose:

Quick access to discovery and active activity.

```text
┌──────────────────────────────────────────────────┐
│ LENDR          Explore  SmartMatch  Bookings     │
├──────────────────────────────────────────────────┤
│                                                  │
│  Find equipment for your next project            │
│                                                  │
│  [ Search equipment...                     ]      │
│                                                  │
│  [ SmartMatch ]                                  │
│                                                  │
├──────────────────────────────────────────────────┤
│ Categories                                       │
│                                                  │
│ Cameras | Audio | Electronics | Project Kits     │
│ Computing | Lighting | Sports | Tools            │
│                                                  │
├──────────────────────────────────────────────────┤
│ Recommended / Popular Equipment                  │
│                                                  │
│ [ Equipment ] [ Equipment ] [ Equipment ]        │
│                                                  │
├──────────────────────────────────────────────────┤
│ Upcoming Booking                                 │
│ [ Booking summary ]                              │
└──────────────────────────────────────────────────┘
```

---

# 12. Explore Equipment

```text
┌──────────────────────────────────────────────────┐
│ Explore Equipment                                │
│                                                  │
│ [ Search equipment, brand, category... ]         │
│                                                  │
│ Filters:                                         │
│ [Category] [Price] [Availability] [Rating]       │
│ [Condition] [Pickup] [Free/Paid]                 │
│                                                  │
│ Sort: [ Recommended ▼ ]                          │
├──────────────────────────────────────────────────┤
│                                                  │
│ [Equipment Card]   [Equipment Card]              │
│                                                  │
│ [Equipment Card]   [Equipment Card]              │
│                                                  │
│ [Equipment Card]   [Equipment Card]              │
│                                                  │
└──────────────────────────────────────────────────┘
```

Equipment card should expose enough information for discovery:

```text
Image
Name
Category
Rating
Price/day
Availability
Pickup location
Favorite
```

---

# 13. Equipment Details

```text
┌─────────────────────────────────────────────────────┐
│ ← Back                                               │
├───────────────────────┬─────────────────────────────┤
│                       │ Equipment Name               │
│                       │ Category                     │
│     IMAGE GALLERY     │ Rating ★                     │
│                       │                              │
│                       │ Price / Day                  │
│                       │ Security Deposit             │
│                       │                              │
│                       │ Availability                 │
│                       │ Pickup Location               │
│                       │                              │
│                       │ [ Request / Book ]           │
│                       │ [ ♡ Favorite ]               │
├───────────────────────┴─────────────────────────────┤
│ Description                                         │
│                                                     │
├─────────────────────────────────────────────────────┤
│ Features                                            │
│                                                     │
├─────────────────────────────────────────────────────┤
│ Use Cases                                           │
│                                                     │
├─────────────────────────────────────────────────────┤
│ Owner                                               │
│                                                     │
├─────────────────────────────────────────────────────┤
│ Reviews                                             │
└─────────────────────────────────────────────────────┘
```

---

# 14. Booking Request

```text
┌──────────────────────────────────────────────┐
│ Request Equipment                            │
├──────────────────────────────────────────────┤
│ Equipment                                    │
│ [ Equipment summary ]                        │
│                                              │
│ Start Date                                   │
│ [____________]                               │
│                                              │
│ End Date                                     │
│ [____________]                               │
│                                              │
│ Purpose                                      │
│ [________________________________________]   │
│                                              │
│ Notes                                        │
│ [________________________________________]   │
│                                              │
├──────────────────────────────────────────────┤
│ Rental Amount        ₹XXX                    │
│ Security Deposit     ₹XXX                    │
│ Total                ₹XXX                    │
├──────────────────────────────────────────────┤
│             [ Submit Request ]               │
└──────────────────────────────────────────────┘
```

---

# 15. Booking Details

```text
┌──────────────────────────────────────────────┐
│ Booking Details                              │
├──────────────────────────────────────────────┤
│ Equipment                                    │
│ Status: PENDING / APPROVED / ACTIVE          │
│                                              │
│ Dates                                        │
│ Start → End                                  │
│                                              │
│ Pickup Location                              │
│                                              │
│ Purpose                                      │
│                                              │
│ Price                                        │
│ Deposit                                      │
│ Total                                        │
│                                              │
│ [ Cancel ]                                   │
│ [ Request Return ]                           │
└──────────────────────────────────────────────┘
```

Available actions depend on booking state.

---

# 16. Student Bookings

```text
┌────────────────────────────────────────────────┐
│ My Bookings                                    │
│                                                │
│ [Upcoming] [Active] [Completed] [Cancelled]    │
├────────────────────────────────────────────────┤
│                                                │
│ Booking Card                                   │
│ Equipment                                      │
│ Dates                                          │
│ Status                                         │
│ [View Details]                                 │
│                                                │
├────────────────────────────────────────────────┤
│ Booking Card                                   │
│ ...                                            │
└────────────────────────────────────────────────┘
```

---

# 17. Favorites

```text
┌────────────────────────────────────────────────┐
│ Saved Equipment                               │
├────────────────────────────────────────────────┤
│                                                │
│ [Equipment] [Equipment] [Equipment]            │
│                                                │
│ Availability                                   │
│ Price                                           │
│ Rating                                          │
│                                                │
│ [View] [Remove]                                │
└────────────────────────────────────────────────┘
```

---

# 18. SmartMatch

SmartMatch must NOT look like a chatbot.

```text
┌────────────────────────────────────────────────┐
│ SmartMatch                                     │
│                                                │
│ Find equipment that fits your requirement.     │
│                                                │
│ Describe what you need:                       │
│                                                │
│ ┌────────────────────────────────────────────┐ │
│ │ I need a camera for a short film at night │ │
│ │                                            │ │
│ └────────────────────────────────────────────┘ │
│                                                │
│ Category [ Optional ▼ ]                        │
│ Budget   [ Optional ]                          │
│ Dates    [ Start ] → [ End ]                   │
│                                                │
│              [ Find Equipment ]                │
└────────────────────────────────────────────────┘
```

---

# 19. SmartMatch Results

```text
┌────────────────────────────────────────────────┐
│ SmartMatch Results                             │
│                                                │
│ Requirement:                                   │
│ "Camera for a short film at night"             │
├────────────────────────────────────────────────┤
│                                                │
│ 94% MATCH                                      │
│ Sony A7 III                                    │
│ ★ 4.8                                          │
│ ₹800/day                                       │
│ Available                                      │
│                                                │
│ Why it matches:                                │
│ • Filmmaking use case                          │
│ • Low-light capability                         │
│ • Available for selected dates                 │
│                                                │
│ [View Equipment]                               │
├────────────────────────────────────────────────┤
│                                                │
│ 87% MATCH                                      │
│ Another Equipment                              │
│ ...                                            │
└────────────────────────────────────────────────┘
```

---

# 20. Student Dashboard

```text
┌────────────────────────────────────────────────┐
│ Dashboard                                      │
├────────────────────────────────────────────────┤
│                                                │
│ Upcoming       Active Rental       Favorites   │
│    X               X                  X        │
│                                                │
├────────────────────────────────────────────────┤
│ Upcoming Booking                               │
│ [Booking Card]                                 │
│                                                │
├────────────────────────────────────────────────┤
│ Recent Activity                                │
│ • Booking approved                             │
│ • Rental completed                             │
│ • Review available                             │
│                                                │
├────────────────────────────────────────────────┤
│ Recommended Equipment                          │
│ [Equipment] [Equipment] [Equipment]            │
└────────────────────────────────────────────────┘
```

---

# 21. Lender Dashboard

```text
┌────────────────────────────────────────────────┐
│ Lender Dashboard                               │
├────────────────────────────────────────────────┤
│                                                │
│ Listed     Active     Requests     Rating      │
│   X          X           X          X          │
│                                                │
├────────────────────────────────────────────────┤
│ Pending Requests                               │
│                                                │
│ [Request Card]                                 │
│ [Approve] [Reject]                             │
│                                                │
├────────────────────────────────────────────────┤
│ Active Rentals                                 │
│                                                │
│ [Rental Card]                                  │
│                                                │
├────────────────────────────────────────────────┤
│ Demand Insights                                │
│                                                │
│ [Demand Summary / Chart]                       │
└────────────────────────────────────────────────┘
```

---

# 22. My Equipment

```text
┌────────────────────────────────────────────────┐
│ My Equipment                      [+ Add]       │
├────────────────────────────────────────────────┤
│                                                │
│ [Equipment]                                    │
│ Status: AVAILABLE                              │
│ Price: ₹XXX/day                                │
│                                                │
│ [Edit] [Manage]                                │
│                                                │
├────────────────────────────────────────────────┤
│                                                │
│ [Equipment]                                    │
│ Status: MAINTENANCE                            │
│                                                │
└────────────────────────────────────────────────┘
```

---

# 23. Add Equipment

```text
┌────────────────────────────────────────────────┐
│ Add Equipment                                  │
├────────────────────────────────────────────────┤
│ Equipment Name                                 │
│ [____________________________]                 │
│                                                │
│ Category                                       │
│ [____________________________]                 │
│                                                │
│ Brand                                          │
│ [____________________________]                 │
│                                                │
│ Model                                          │
│ [____________________________]                 │
│                                                │
│ Description                                    │
│ [____________________________]                 │
│                                                │
│ Condition                                      │
│ [____________________________]                 │
│                                                │
│ Features                                       │
│ [____________________________]                 │
│                                                │
│ Tags                                           │
│ [____________________________]                 │
│                                                │
│ Use Cases                                      │
│ [____________________________]                 │
│                                                │
│ Price / Day                                    │
│ [____________________________]                 │
│                                                │
│ Security Deposit                               │
│ [____________________________]                 │
│                                                │
│ Pickup Location                                │
│ [____________________________]                 │
│                                                │
│ Images                                         │
│ [ Upload ]                                     │
│                                                │
│              [ Publish Equipment ]              │
└────────────────────────────────────────────────┘
```

---

# 24. Booking Requests — Lender

```text
┌────────────────────────────────────────────────┐
│ Booking Requests                               │
├────────────────────────────────────────────────┤
│ [Pending] [Approved] [Rejected]                │
├────────────────────────────────────────────────┤
│                                                │
│ Borrower: Student Name                         │
│ Equipment: Sony A7 III                         │
│ Dates: 20 Oct → 22 Oct                         │
│ Purpose: Short film                            │
│ Total: ₹2,600                                  │
│                                                │
│ [Approve]              [Reject]                │
│                                                │
└────────────────────────────────────────────────┘
```

---

# 25. Active Rentals — Lender

```text
┌────────────────────────────────────────────────┐
│ Active Rentals                                │
├────────────────────────────────────────────────┤
│ Equipment                                      │
│ Borrower                                       │
│ Pickup Date                                    │
│ Return Date                                    │
│ Status                                         │
│                                                │
│ [View Booking]                                 │
└────────────────────────────────────────────────┘
```

---

# 26. Return Requests

```text
┌────────────────────────────────────────────────┐
│ Return Requests                                │
├────────────────────────────────────────────────┤
│                                                │
│ Equipment                                      │
│ Borrower                                       │
│ Return Date                                    │
│                                                │
│ [Inspect]              [Confirm Return]        │
│                                                │
└────────────────────────────────────────────────┘
```

---

# 27. Damage Reports

```text
┌────────────────────────────────────────────────┐
│ Damage Reports                                 │
├────────────────────────────────────────────────┤
│                                                │
│ Equipment                                      │
│ Booking                                        │
│ Severity                                       │
│ Description                                    │
│ Status                                         │
│                                                │
│ [View Report]                                  │
└────────────────────────────────────────────────┘
```

---

# 28. Maintenance

```text
┌────────────────────────────────────────────────┐
│ Maintenance                                    │
├────────────────────────────────────────────────┤
│                                                │
│ Equipment                                      │
│ Reason                                         │
│ Start Date                                     │
│ Expected Completion                            │
│ Status                                         │
│                                                │
│ [Update]                                       │
└────────────────────────────────────────────────┘
```

---

# 29. Demand Insights

```text
┌────────────────────────────────────────────────┐
│ Demand Insights                                │
├────────────────────────────────────────────────┤
│                                                │
│ Current Demand     Predicted Demand            │
│      X                   X                     │
│                                                │
├────────────────────────────────────────────────┤
│ Demand Trend                                   │
│                                                │
│          [ CHART ]                             │
│                                                │
├────────────────────────────────────────────────┤
│ Popular Categories                             │
│                                                │
│ Cameras          HIGH                          │
│ Audio            MEDIUM                        │
│ Electronics      HIGH                          │
│                                                │
├────────────────────────────────────────────────┤
│ Prediction                                     │
│                                                │
│ Expected requests: X                           │
│ Trend: INCREASING                              │
│                                                │
│ Data source: DEMO                              │
└────────────────────────────────────────────────┘
```

---

# 30. Admin Dashboard

```text
┌────────────────────────────────────────────────┐
│ Admin Dashboard                                │
├────────────────────────────────────────────────┤
│                                                │
│ Users     Equipment    Bookings    Rentals     │
│   X          X            X           X        │
│                                                │
├────────────────────────────────────────────────┤
│ Platform Activity                              │
│                                                │
│ [Analytics]                                    │
│                                                │
├────────────────────────────────────────────────┤
│ Demand                                         │
│ [Demand Summary]                               │
│                                                │
├────────────────────────────────────────────────┤
│ Issues                                         │
│ Damage Reports | Maintenance | Pending         │
└────────────────────────────────────────────────┘
```

---

# 31. Admin Users

```text
┌────────────────────────────────────────────────┐
│ Users                                          │
├────────────────────────────────────────────────┤
│ Search [____________________]                  │
├────────────────────────────────────────────────┤
│ Name       Email       Role       Status       │
│                                                │
│ Student    VIT email   STUDENT    Active       │
│ Student    VIT email   STUDENT    Active       │
│                                                │
└────────────────────────────────────────────────┘
```

---

# 32. Admin Equipment

```text
┌────────────────────────────────────────────────┐
│ Equipment                                      │
├────────────────────────────────────────────────┤
│ Search / Filter                                │
├────────────────────────────────────────────────┤
│ Equipment     Owner       Status      Category │
│                                                │
│ Camera        Student     Available   Camera   │
│ Projector     Club        Maintenance Event    │
│                                                │
└────────────────────────────────────────────────┘
```

---

# 33. Admin Bookings

```text
┌────────────────────────────────────────────────┐
│ Bookings                                       │
├────────────────────────────────────────────────┤
│                                                │
│ Booking ID                                     │
│ Borrower                                       │
│ Equipment                                      │
│ Dates                                          │
│ Status                                         │
│                                                │
│ [View Details]                                 │
└────────────────────────────────────────────────┘
```

---

# 34. Notifications

```text
┌────────────────────────────────────────────────┐
│ Notifications                                 │
├────────────────────────────────────────────────┤
│                                                │
│ ● Booking approved                            │
│   Your camera booking has been approved.       │
│                                                │
│ ○ Return requested                             │
│   A return request needs your attention.       │
│                                                │
│ ○ Review available                             │
│   Your rental is complete.                     │
│                                                │
└────────────────────────────────────────────────┘
```

---

# 35. Profile

```text
┌────────────────────────────────────────────────┐
│ Profile                                        │
├────────────────────────────────────────────────┤
│                                                │
│ Name                                           │
│ VIT Email                                      │
│ Role                                           │
│                                                │
│ Listed Equipment                               │
│ Completed Rentals                              │
│ Reviews                                        │
│                                                │
│ [Edit Profile]                                 │
│ [Logout]                                       │
└────────────────────────────────────────────────┘
```

---

# 36. Feature-to-Screen Mapping

| Feature                  | Primary Screen     |
| ------------------------ | ------------------ |
| Authentication           | Login / Register   |
| Equipment discovery      | Explore            |
| Search                   | Explore            |
| Filters                  | Explore            |
| Equipment details        | Equipment Details  |
| Booking                  | Booking Request    |
| Booking tracking         | Bookings           |
| Active rental            | Bookings           |
| Return                   | Booking Details    |
| Favorites                | Favorites          |
| Reviews                  | Equipment Details  |
| Add equipment            | My Equipment       |
| Manage equipment         | My Equipment       |
| Booking requests         | Requests           |
| Active lender rentals    | Active Rentals     |
| Damage reports           | Damage Reports     |
| Maintenance              | Maintenance        |
| Notifications            | Notifications      |
| SmartMatch               | SmartMatch         |
| Demand prediction        | Demand Insights    |
| User administration      | Admin Users        |
| Equipment administration | Admin Equipment    |
| Booking administration   | Admin Bookings     |
| Transactions             | Admin Transactions |
| Category management      | Admin Categories   |

---

# 37. Backend Integration Requirements

Every major screen should eventually map to backend APIs.

Example:

```text
Explore
   ↓
GET /api/equipment

Equipment Details
   ↓
GET /api/equipment/:id

Booking Request
   ↓
POST /api/bookings

My Bookings
   ↓
GET /api/bookings/my

Lender Requests
   ↓
GET /api/bookings/lender

Approve
   ↓
PATCH /api/bookings/:id/approve

SmartMatch
   ↓
POST /api/smart-match

Demand
   ↓
GET /api/demand
```

The exact endpoint names are defined by `BACKEND.md` and `ARCHITECTURE.md`.

---

# 38. Design Update Rule

This is an important project rule.

This document is only the **initial structural design**.

A future version of `DESIGN.md` may contain:

* Final visual design
* Color palette
* Typography
* Layout rules
* Component specifications
* Illustrations
* Animations
* Responsive behavior
* Detailed page designs
* Updated wireframes
* AI Studio implementation references

When an updated `DESIGN.md` is provided:

1. Treat the updated document as the primary design reference.
2. Preserve existing backend functionality.
3. Preserve existing API contracts unless the new design genuinely requires a change.
4. Map new UI screens to existing APIs where possible.
5. Add new APIs only when the updated design introduces an approved feature that requires backend support.
6. Do not remove backend functionality simply because the UI changed.
7. Do not rebuild unrelated backend systems.
8. Do not create duplicate implementations.
9. Keep the frontend and backend responsibilities separate.

---

# 39. Claude Integration Rule

Claude Code must understand that the design can evolve independently.

When a new `DESIGN.md` is supplied, Claude should:

```text
Read updated DESIGN.md
        ↓
Compare with current implementation
        ↓
Identify required API/data changes
        ↓
Preserve existing functionality
        ↓
Implement only required backend changes
```

Claude must NOT:

* Build the frontend
* Recreate AI Studio screens
* Replace the frontend stack
* Rewrite working backend functionality unnecessarily
* Invent features from visual designs alone

---

# 40. Final Design Principle

The design should prioritize:

```text
Discovery
   ↓
Suitability
   ↓
Availability
   ↓
Trust
   ↓
Booking
   ↓
Usage
   ↓
Return
```

SmartMatch should improve **suitability**.

Demand Prediction should improve **equipment utilization and planning**.

The UI should make the complete process easy to understand without overwhelming the student.
