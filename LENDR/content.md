# LENDR — Content and Data Specification

## 1. Purpose

This document defines the content, terminology, categories, labels, seed data principles, statuses, descriptions, and AI-related text used throughout LENDR.

The purpose is to keep the product consistent across:

* Frontend
* Backend
* Database
* Seed data
* AI/ML
* API responses
* Demonstration

LENDR should feel like a real VIT campus platform rather than a generic rental marketplace.

---

# 2. Product Name

## Primary Name

**LENDR**

## Product Description

> VIT's campus-exclusive platform for discovering, sharing, borrowing, renting, and managing equipment.

## Short Description

> Find the equipment you need. Borrow from the campus community.

## Product Concept

LENDR connects VIT students, project teams, and campus clubs with equipment available within the campus.

---

# 3. Core Product Language

Use these terms consistently.

| Term              | Meaning                                                 |
| ----------------- | ------------------------------------------------------- |
| Equipment         | Any physical item listed on LENDR                       |
| Borrower          | Student requesting/using equipment                      |
| Lender            | Student or organization that owns/list equipment        |
| Booking           | Request/reservation for equipment                       |
| Rental            | Actual usage period of approved equipment               |
| Listing           | Equipment made available on LENDR                       |
| Pickup            | Collecting equipment from the specified campus location |
| Return            | Returning equipment after usage                         |
| Deposit           | Security amount associated with an equipment booking    |
| SmartMatch        | AI-powered equipment recommendation                     |
| Demand Prediction | ML-based equipment/category demand forecasting          |
| Organization      | VIT club or campus organization                         |
| Maintenance       | Period during which equipment cannot be booked          |

Do not randomly alternate between "item", "asset", "product", and "equipment".

Use **equipment** as the primary term.

---

# 4. User Types

## Student

A VIT student who can:

* Browse equipment
* Borrow equipment
* Rent equipment
* List personal equipment
* Manage bookings
* Review completed rentals
* Save favorites

## Lender

A student who has listed equipment.

Lender is a functional role, not necessarily a separate account type.

## Organization

A VIT club or campus organization that owns equipment.

## Admin

Responsible for platform moderation and monitoring.

---

# 5. Equipment Categories

Use these primary categories:

### Cameras

Examples:

* DSLR
* Mirrorless camera
* Action camera
* Camera body

### Audio

Examples:

* Wireless microphone
* Condenser microphone
* Audio recorder
* Lavalier microphone
* Speaker

### Electronics

Examples:

* Arduino
* ESP32
* Raspberry Pi
* Sensors
* Multimeter
* Breadboard
* Electronic components

### Project Kits

Examples:

* Robotics kit
* IoT kit
* Embedded systems kit
* Automation kit

### Computing

Examples:

* Laptop
* Monitor
* Raspberry Pi
* External storage
* Presentation equipment

### Lighting

Examples:

* LED panel
* Softbox
* Ring light
* Portable light

### Event Equipment

Examples:

* Projector
* Speaker
* Extension board
* Presentation equipment

### Sports

Examples:

* Football
* Basketball
* Badminton equipment
* Cricket equipment

### Tools

Examples:

* Soldering iron
* Multimeter
* Screwdriver kit
* Hand tools

### Academic

Examples:

* Scientific calculator
* Lab kit
* Measurement equipment
* Academic demonstration equipment

### Other

For legitimate equipment that does not fit another category.

---

# 6. Equipment Content Fields

Every equipment listing should contain useful metadata.

## Required

* Name
* Category
* Description
* Condition
* Availability
* Pickup location
* Owner
* Pricing information

## Recommended

* Brand
* Model
* Features
* Tags
* Use cases
* Images
* Rating
* Review count

---

# 7. Equipment Description Style

Descriptions should be:

* Concise
* Realistic
* Informative
* Student-friendly
* Technically accurate

Avoid marketing language such as:

> "The ultimate revolutionary professional-grade solution for every student."

Prefer:

> "Mirrorless camera suitable for short films, photography, interviews, and campus event coverage. Supports interchangeable lenses and low-light shooting."

---

# 8. Use Cases

Use cases are important for SmartMatch.

Examples:

```text
filmmaking
photography
low-light photography
interviews
event coverage
podcasting
presentations
project documentation
IoT development
Arduino projects
embedded systems
robotics
academic experiments
sports events
club events
hackathons
```

Equipment can have multiple use cases.

---

# 9. Tags

Tags should be concise searchable concepts.

Examples:

```text
camera
mirrorless
4k
low-light
video
photography
wireless
audio
microphone
arduino
esp32
iot
robotics
presentation
projector
sports
lighting
```

Avoid long sentences as tags.

---

# 10. Condition Values

Use:

```text
EXCELLENT
GOOD
FAIR
```

Optional description can explain visible wear.

Do not use misleading terms such as "brand new" unless the owner explicitly provides that information.

---

# 11. Equipment Availability Status

Use:

```text
AVAILABLE
UNAVAILABLE
MAINTENANCE
```

Descriptions:

### Available

> Equipment can currently be requested.

### Unavailable

> Equipment is temporarily unavailable.

### Maintenance

> Equipment is currently under maintenance and cannot be booked.

---

# 12. Pricing

Use two concepts separately:

### Rental Price

The amount charged per rental day.

### Security Deposit

A refundable/security amount associated with the equipment.

Example:

```text
₹500/day
Security deposit: ₹1,000
```

Free equipment:

```text
Free
Security deposit: ₹500
```

Do not describe a deposit as rental income.

---

# 13. Pickup Locations

Use campus-oriented locations rather than street addresses.

Suggested values:

```text
TT
SMV
MB
SJT
Library
Hostels
Labs
Club Area
Campus Common Area
```

Additional locations may be added if required.

Do not introduce GPS coordinates or maps.

---

# 14. Booking Statuses

Use:

```text
PENDING
APPROVED
REJECTED
CANCELLED
ACTIVE
RETURN_REQUESTED
COMPLETED
```

## PENDING

> Waiting for the equipment owner to review the request.

## APPROVED

> Booking has been approved and is awaiting pickup.

## ACTIVE

> Equipment has been picked up and is currently being used.

## RETURN_REQUESTED

> Borrower has requested to return the equipment.

## COMPLETED

> Equipment has been returned and the rental is complete.

## REJECTED

> Equipment owner rejected the request.

## CANCELLED

> Booking was cancelled.

---

# 15. Booking UI Messages

Use clear language.

### Successful booking request

> Booking request submitted successfully.

### Conflict

> These dates are no longer available.

### Approval

> Your booking request has been approved.

### Rejection

> Your booking request was rejected.

### Return

> Return request submitted.

### Completion

> Rental completed successfully.

Avoid technical database terminology in user-facing messages.

---

# 16. Review Content

Review structure:

```text
Rating
Comment
Date
Reviewer
```

Example realistic reviews:

> "Camera was in excellent condition and worked well for our short-film shoot."

> "Tripod was easy to use and pickup was convenient."

> "ESP32 kit had everything we needed for our IoT prototype."

Avoid exaggerated fake reviews such as:

> "Absolutely life-changing!!! Best product ever!!!"

---

# 17. Damage Report Content

Damage reports should describe observable problems.

Examples:

> "Small crack noticed near the tripod locking mechanism."

> "Microphone cable stopped working during the rental."

> "One sensor module was missing when the kit was returned."

Severity:

```text
LOW
MEDIUM
HIGH
```

Keep the workflow simple.

---

# 18. Maintenance Content

Examples:

### Camera

> Lens cleaning and sensor inspection.

### Microphone

> Cable and battery inspection.

### Arduino Kit

> Component inventory check.

### Projector

> Lamp and connectivity inspection.

### Sports Equipment

> Condition and safety inspection.

---

# 19. Notification Content

Notifications should be concise.

Examples:

### Booking request

> New booking request for Sony A7 III.

### Booking approved

> Your booking for Sony A7 III has been approved.

### Booking rejected

> Your booking request for Sony A7 III was rejected.

### Return request

> A return has been requested for Sony A7 III.

### Return completed

> Your Sony A7 III rental has been marked as completed.

### Review

> Your rental is complete. Share your experience with a review.

### Maintenance

> Sony A7 III has been marked unavailable for maintenance.

---

# 20. SmartMatch Content

SmartMatch should feel intelligent but transparent.

Do not call it:

* AI Chat
* LENDR Bot
* LENDR Assistant

Use:

**SmartMatch**

Suggested heading:

> Find the right equipment

Suggested supporting text:

> Describe what you need and SmartMatch will recommend suitable equipment from the campus.

Input placeholder:

> "I need a camera for shooting a short film at night..."

---

# 21. SmartMatch Result Language

Each result can contain:

```text
Match: 94%
Available
₹800/day
4.7 ★
```

Reasons:

> Matches filmmaking use case

> Suitable for low-light shooting

> Available for your selected dates

> Within your budget

Do not claim capabilities that are not present in the equipment metadata.

---

# 22. SmartMatch Empty State

If no suitable result exists:

> No strong matches found.

Supporting text:

> Try changing your dates, budget, category, or describing your requirement differently.

Do not fabricate equipment.

---

# 23. Demand Prediction Content

Use terminology:

**Demand Insights**

or

**Demand Prediction**

Avoid vague phrases like:

> AI Magic

or

> Future AI Score

Suggested description:

> Understand which equipment and categories are likely to receive higher demand.

---

# 24. Demand Labels

Use:

```text
LOW
MEDIUM
HIGH
```

Optional trend:

```text
INCREASING
STABLE
DECREASING
```

Example:

> High demand expected for cameras next week.

---

# 25. Demo Data Disclosure

When synthetic data is used:

Use wording such as:

> Demo data

or:

> Based on simulated historical bookings

or:

> Prediction generated from demonstration data

Never claim:

> "VIT students booked this equipment 200 times"

unless the data is actually real.

---

# 26. Dashboard Content

## Student Dashboard

Possible sections:

* Upcoming bookings
* Active rental
* Favorites
* Recent activity
* Recommended equipment
* Notifications

Example greeting:

> Welcome back.

Supporting text:

> Find equipment for your next project, event, or idea.

---

# 27. Lender Dashboard

Suggested metrics:

* Listed equipment
* Active rentals
* Pending requests
* Completed rentals
* Average rating
* Rental value
* Utilization
* Demand insights

Use meaningful labels.

Avoid vanity metrics.

---

# 28. Admin Dashboard

Suggested metrics:

* Total students
* Total equipment
* Active bookings
* Completed rentals
* Pending requests
* Damage reports
* Equipment under maintenance
* Popular categories
* Demand trends

---

# 29. Search Content

Search placeholder:

> Search equipment, brands, categories...

Examples:

```text
Sony camera
Arduino
wireless microphone
projector
tripod
ESP32
```

---

# 30. Filters

Possible filter labels:

```text
Category
Price
Availability
Condition
Rating
Pickup location
Free / Paid
```

Sorting:

```text
Newest
Price: Low to High
Price: High to Low
Highest Rated
Most Popular
```

---

# 31. Empty States

### No equipment

> No equipment found.

Supporting text:

> Try changing your search or filters.

### No bookings

> No bookings yet.

Supporting text:

> Find equipment for your next project or event.

### No favorites

> No saved equipment.

Supporting text:

> Save equipment here to find it quickly later.

### No notifications

> You're all caught up.

---

# 32. Error Messages

Keep errors understandable.

Examples:

> Something went wrong. Please try again.

> These dates are no longer available.

> You don't have permission to perform this action.

> Equipment could not be found.

> Please enter a valid VIT student email.

> Your session has expired. Please log in again.

Avoid exposing:

* SQL errors
* stack traces
* internal IDs
* server implementation details

---

# 33. Authentication Content

Registration heading:

> Create your LENDR account

Supporting text:

> Use your VIT student email to join the campus equipment community.

Email placeholder:

> [yourname@vitstudent.ac.in](mailto:yourname@vitstudent.ac.in)

Login heading:

> Welcome back

Supporting text:

> Sign in to manage your equipment and bookings.

---

# 34. Equipment Listing Content

Suggested fields:

```text
Equipment name
Category
Brand
Model
Description
Condition
Features
Tags
Use cases
Price per day
Security deposit
Pickup location
Availability
Images
```

Listing guidance:

> Add clear information so students know exactly what the equipment can be used for.

---

# 35. Equipment Examples

Use realistic seed examples.

## Example 1

Name:

**Sony A7 III**

Category:

Cameras

Use cases:

```text
filmmaking
low-light photography
interviews
event coverage
```

## Example 2

Name:

**DJI Ronin-S**

Category:

Cameras

Use cases:

```text
filmmaking
cinematography
event coverage
```

## Example 3

Name:

**Rode Wireless GO II**

Category:

Audio

Use cases:

```text
interviews
podcasting
video production
event coverage
```

## Example 4

Name:

**ESP32 IoT Starter Kit**

Category:

Electronics

Use cases:

```text
IoT development
embedded systems
academic projects
hackathons
```

## Example 5

Name:

**Epson Projector**

Category:

Event Equipment

Use cases:

```text
presentations
club events
project demonstrations
academic presentations
```

---

# 36. Club Equipment

Club-owned equipment should be identifiable.

Example:

> Robotics Club

or:

> Photography Club

Do not invent official VIT club names unless they are confirmed.

Use demonstration organization names where necessary and clearly label them as demo data.

---

# 37. AI/ML Terminology

Use technically accurate terminology.

SmartMatch:

> NLP-based equipment matching using text similarity.

Demand Prediction:

> ML-based demand forecasting using historical booking patterns.

Avoid claiming:

> "Advanced AGI-powered recommendation engine"

or similar unsupported marketing language.

---

# 38. Technical Data vs User Content

Internal database/API terminology may be technical.

User-facing terminology should remain simple.

Example:

Backend:

```text
RETURN_REQUESTED
```

Frontend:

> Return requested

Backend:

```text
BOOKING_CONFLICT
```

Frontend:

> These dates are no longer available.

---

# 39. Demo Data Rules

Seed data should look realistic.

Do not use:

```text
Test User 1
Test User 2
Equipment ABC
Equipment XYZ
Lorem ipsum
```

Prefer realistic demonstration records.

However, do not represent fictional data as real VIT usage.

---

# 40. Content Quality Rules

All content should be:

* Clear
* Concise
* Consistent
* Campus-oriented
* Realistic
* Technically accurate
* Easy for students to understand

Avoid:

* Excessive marketing language
* Generic startup jargon
* Fake statistics
* Fake AI claims
* Fake VIT claims
* Overly long descriptions
* Unnecessary technical terms in UI

---

# 41. Core Brand Message

Primary:

> **Find it. Borrow it. LENDR.**

Alternative supporting line:

> Equipment from the campus community, for the campus community.

Use these selectively rather than repeating them everywhere.

---

# 42. Content Principle

Every piece of content should help the student answer one of these questions:

1. What is this equipment?
2. Can I use it for my purpose?
3. Is it available?
4. How much does it cost?
5. Where do I pick it up?
6. Who owns it?
7. Can I trust the listing?
8. What happens after I request it?

If content does not help with discovery, trust, booking, usage, or management, it should generally not be added.
