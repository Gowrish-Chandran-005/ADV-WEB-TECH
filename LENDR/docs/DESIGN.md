# Design Structure

This document defines the early information architecture and functional screen structure for LENDR. It is not a final visual design specification and does not lock colors or branding decisions.

## 1. Design objective

The product should feel campus-oriented, clean, and practical. The interface should help a user answer these questions immediately:

- What equipment is available?
- Can I use it on my dates?
- How much does it cost?
- Where do I pick it up?
- Who owns it?
- How do I request it?
- What happens after I request it?

## 2. User journeys

### Student journey

Home -> Explore -> Equipment detail -> Booking request -> Approval -> Active rental -> Return -> Review

### Lender journey

Dashboard -> My equipment -> Booking requests -> Approval -> Active rentals -> Return confirmation -> Demand insights

### Admin journey

Dashboard -> User moderation -> Equipment oversight -> Booking monitoring -> Damage reports -> Maintenance -> Demand analytics

## 3. Screen structure

### Student screens

- Home
- Explore
- Search and filters
- Equipment detail
- SmartMatch
- Bookings
- Favorites
- Notifications
- Profile

### Lender screens

- Dashboard
- My equipment
- Add/edit equipment
- Booking requests
- Active rentals
- Return requests
- Damage reports
- Maintenance
- Demand insights

### Admin screens

- Dashboard
- Users
- Equipment moderation
- Bookings
- Transactions
- Damage reports
- Maintenance
- Categories
- Demand analytics

## 4. Sitemap

```text
LENDR
├── Authentication
│   ├── Login
│   ├── Register
│   └── Verification
├── Student
│   ├── Home
│   ├── Explore
│   │   ├── Search
│   │   ├── Filters
│   │   └── Equipment Detail
│   ├── SmartMatch
│   ├── Bookings
│   ├── Favorites
│   ├── Notifications
│   └── Profile
├── Lender
│   ├── Dashboard
│   ├── My Equipment
│   ├── Requests
│   ├── Active Rentals
│   ├── Return Requests
│   ├── Damage Reports
│   ├── Maintenance
│   └── Demand Insights
└── Admin
    ├── Dashboard
    ├── Users
    ├── Equipment
    ├── Bookings
    ├── Transactions
    ├── Damage Reports
    ├── Maintenance
    ├── Categories
    └── Demand Analytics
```

## 5. Information hierarchy

The core information should always be visible near the top of key pages:

- equipment title
- category
- availability status
- pricing and deposit
- pickup location
- owner info
- booking CTA

This prevents confusion and supports the core product value proposition.

## 6. Design constraints for this phase

- No final palette is required yet
- No final icon system is required yet
- No final animations or premium motion direction is required yet
- The design should support future frontend implementation without locking final product aesthetics prematurely

## 7. Frontend/backend fit

The frontend will eventually consume backend APIs for:

- auth and profiles
- equipment listing and detail
- booking creation and status tracking
- favorites and notifications
- lender dashboard metrics
- admin analytics
- AI recommendation results

The design is therefore a product map, not a sign that the frontend has already been implemented.
