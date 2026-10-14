# LENDR — Frontend Implementation Tasks

## 1. Development Strategy

Build LENDR in small verified stages.

Do not attempt to create the entire application in one pass.

The order is:

```text
Foundation
↓
Design system
↓
Public experience
↓
Equipment discovery
↓
Equipment detail
↓
Booking
↓
Student dashboard
↓
Lender dashboard
↓
SmartMatch
↓
Demand intelligence
↓
Admin
↓
Mobile
↓
Polish
```

---

# 2. Phase 0 — Project Setup

## Tasks

* [ ] Create React + TypeScript + Vite application
* [ ] Configure Tailwind CSS
* [ ] Configure React Router
* [ ] Configure Lucide icons
* [ ] Configure project aliases if useful
* [ ] Create base CSS
* [ ] Create global typography
* [ ] Create color tokens
* [ ] Create spacing tokens
* [ ] Create radius/shadow tokens
* [ ] Create folder structure
* [ ] Create mock data folders
* [ ] Create type definitions
* [ ] Create service layer
* [ ] Verify production build

---

# 3. Phase 1 — Design System

Create reusable components.

## Navigation

* [ ] Desktop navbar
* [ ] Mobile navbar
* [ ] Sidebar
* [ ] Mobile bottom navigation

## UI

* [ ] Button
* [ ] Secondary button
* [ ] Icon button
* [ ] Input
* [ ] Search input
* [ ] Select
* [ ] Date picker
* [ ] Badge
* [ ] Status badge
* [ ] Card
* [ ] Modal
* [ ] Drawer
* [ ] Tabs
* [ ] Tooltip
* [ ] Avatar
* [ ] Rating
* [ ] Progress bar
* [ ] Empty state
* [ ] Loading skeleton
* [ ] Error state
* [ ] Toast

Do not duplicate these components across pages.

---

# 4. Phase 2 — Landing Page

Build:

* [ ] Hero
* [ ] Navigation
* [ ] Equipment preview
* [ ] Category section
* [ ] How it works
* [ ] SmartMatch introduction
* [ ] Campus trust section
* [ ] Featured equipment
* [ ] CTA
* [ ] Footer

Interactions:

* [ ] Browse CTA
* [ ] SmartMatch CTA
* [ ] List equipment CTA
* [ ] Navigation
* [ ] Responsive layout

---

# 5. Phase 3 — Equipment Discovery

Build:

* [ ] Browse page
* [ ] Search
* [ ] Category filter
* [ ] Price filter
* [ ] Rating filter
* [ ] Condition filter
* [ ] Availability filter
* [ ] Pickup location filter
* [ ] Sorting
* [ ] Equipment cards
* [ ] Favorites
* [ ] Pagination/load more
* [ ] Empty state
* [ ] Loading state

Search should support:

```text
name
brand
model
category
description
tags
use cases
```

---

# 6. Phase 4 — Equipment Detail

Build:

* [ ] Image gallery
* [ ] Equipment information
* [ ] Condition
* [ ] Features
* [ ] Use cases
* [ ] Owner information
* [ ] Rating
* [ ] Reviews
* [ ] Pickup location
* [ ] Availability calendar
* [ ] Rental pricing
* [ ] Security deposit
* [ ] Booking CTA
* [ ] Favorite button

---

# 7. Phase 5 — Booking

Build:

* [ ] Date selection
* [ ] Availability validation
* [ ] Booking purpose
* [ ] Notes
* [ ] Price calculation
* [ ] Deposit display
* [ ] Booking confirmation
* [ ] Booking status
* [ ] Booking detail
* [ ] Timeline
* [ ] Cancellation UI

Use mock booking state transitions.

---

# 8. Phase 6 — Return & Condition

Build:

* [ ] Pickup state
* [ ] Active rental
* [ ] Return request
* [ ] Condition checklist
* [ ] Photo upload UI
* [ ] Return confirmation
* [ ] Completed state
* [ ] Damage report UI

Frontend-only file upload can use mock image previews.

Do not connect real storage yet.

---

# 9. Phase 7 — Student Dashboard

Build:

* [ ] Dashboard overview
* [ ] Active rental
* [ ] Upcoming bookings
* [ ] Pending requests
* [ ] Completed rentals
* [ ] Saved equipment
* [ ] Notifications
* [ ] Reviews to write
* [ ] Profile

---

# 10. Phase 8 — Lender Experience

Build:

* [ ] Lender dashboard
* [ ] Equipment overview
* [ ] Pending booking requests
* [ ] Approve request
* [ ] Reject request
* [ ] Active rentals
* [ ] Earnings/rental value
* [ ] Utilization
* [ ] Equipment management

---

# 11. Phase 9 — Equipment Listing

Build wizard:

```text
Basics
↓
Specifications
↓
Photos
↓
Pricing
↓
Availability
↓
Review
↓
Publish
```

Fields:

* [ ] Name
* [ ] Category
* [ ] Brand
* [ ] Model
* [ ] Description
* [ ] Features
* [ ] Tags
* [ ] Use cases
* [ ] Condition
* [ ] Images
* [ ] Price/day
* [ ] Deposit
* [ ] Pickup location
* [ ] Availability

---

# 12. Phase 10 — Calendar & Maintenance

Build:

* [ ] Equipment calendar
* [ ] Booking dates
* [ ] Pending dates
* [ ] Maintenance blocks
* [ ] Owner availability blocks
* [ ] Maintenance creation
* [ ] Maintenance history
* [ ] Conflict warning

---

# 13. Phase 11 — SmartMatch

Build dedicated SmartMatch page.

Required:

* [ ] Natural-language input
* [ ] Category selector
* [ ] Budget selector
* [ ] Date selector
* [ ] Search button
* [ ] Loading state
* [ ] Match results
* [ ] Match percentage
* [ ] Match reasons
* [ ] Availability
* [ ] Price
* [ ] Rating
* [ ] Equipment details CTA

Do NOT create:

* [ ] chatbot
* [ ] conversational AI
* [ ] fake AI typing animation
* [ ] generic AI assistant

---

# 14. Phase 12 — Demand Intelligence

Build lender/admin analytics.

Required:

* [ ] Current demand
* [ ] Predicted demand
* [ ] Expected requests
* [ ] Demand trend
* [ ] Category demand
* [ ] Equipment demand
* [ ] Historical vs predicted chart
* [ ] Top demanded equipment
* [ ] Insight cards

Clearly label synthetic/demo data.

---

# 15. Phase 13 — Reviews

Build:

* [ ] Rating input
* [ ] Comment input
* [ ] Review submission
* [ ] Review list
* [ ] Rating summary
* [ ] Rating distribution

Only show review action for completed bookings.

---

# 16. Phase 14 — Favorites

Build:

* [ ] Save equipment
* [ ] Remove equipment
* [ ] Favorites page
* [ ] Favorite state on cards
* [ ] Empty state

---

# 17. Phase 15 — Notifications

Build:

* [ ] Notification dropdown
* [ ] Notifications page
* [ ] Read/unread state
* [ ] Timestamp
* [ ] Notification categories
* [ ] Empty state

---

# 18. Phase 16 — Admin

Build:

* [ ] Admin dashboard
* [ ] User management
* [ ] Equipment overview
* [ ] Booking overview
* [ ] Damage reports
* [ ] Payment overview
* [ ] Categories
* [ ] Demand analytics
* [ ] System statistics

Admin UI should be denser than the student experience while retaining the same design system.

---

# 19. Phase 17 — Authentication UI

Build:

* [ ] Login
* [ ] Register
* [ ] VIT email validation UI
* [ ] Verification
* [ ] Forgot password UI
* [ ] Session state
* [ ] Logout

Authentication remains mocked during frontend phase.

---

# 20. Phase 18 — Mobile

Test at:

```text
375px
390px
768px
1024px
1440px
```

Required mobile screens:

* [ ] Home
* [ ] Browse
* [ ] Equipment detail
* [ ] SmartMatch
* [ ] Booking
* [ ] Active rental
* [ ] Return
* [ ] Dashboard
* [ ] Lender dashboard
* [ ] Notifications
* [ ] Profile

---

# 21. Phase 19 — UX States

Every important feature needs:

```text
Loading
Success
Empty
Error
Disabled
```

Examples:

```text
No equipment
No bookings
No notifications
No favorites
No SmartMatch results
Booking conflict
Equipment unavailable
Maintenance
Suspended account
404
```

---

# 22. Phase 20 — Polish

Final pass:

* [ ] Typography consistency
* [ ] Spacing consistency
* [ ] Button consistency
* [ ] Card consistency
* [ ] Icon consistency
* [ ] Responsive behavior
* [ ] Hover states
* [ ] Focus states
* [ ] Keyboard navigation
* [ ] Accessibility
* [ ] Image optimization
* [ ] Remove placeholder content
* [ ] Remove console errors
* [ ] Remove unused imports
* [ ] TypeScript cleanup
* [ ] Production build

---

# 23. Phase 21 — Backend Integration Preparation

Before backend integration:

* [ ] All mock data goes through service layer
* [ ] No page directly imports mock arrays
* [ ] Types are centralized
* [ ] API request/response structures documented
* [ ] Loading/error states already exist
* [ ] Authentication UI is isolated
* [ ] Booking state logic is isolated
* [ ] SmartMatch response structure defined
* [ ] Demand response structure defined

---

# 24. Definition of Done

The frontend is ready for backend integration when:

```text
npm run build
```

works successfully.

All major routes work.

All major interactions work using mock data.

The application is responsive.

The UI is visually consistent.

No major feature depends directly on mock arrays.

The API service boundary is ready.

SmartMatch has a complete frontend experience.

Demand Prediction has a complete frontend experience.

Booking lifecycle is visually complete.

Student, lender and admin experiences are complete.

No unapproved features have been added.
