# Content and Data Specification

## 1. Product language

Use consistent terminology across backend, frontend, seed data, APIs, and documentation.

- Equipment: the primary term for physical items
- Borrower: the user requesting and using equipment
- Lender: the user or organization listing equipment
- Booking: the request or reservation
- Rental: the active usage period
- Listing: the equipment offered on the platform
- Pickup: collection from a campus location
- Return: handback after usage
- Deposit: security amount attached to a booking
- SmartMatch: AI-powered equipment matching
- Demand Prediction: ML-based forecasting

## 2. Product name and summary

- Name: LENDR
- Summary: VIT's campus-exclusive platform for discovering, borrowing, renting, and managing equipment

## 3. Equipment categories

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

## 4. Example use cases

The platform should support use-case-driven search and matching for problems such as:

- Filmmaking
- Low-light photography
- Interviews
- Outdoor shooting
- Presentations
- Electronics projects
- Hackathons
- Sports events
- Academic projects

## 5. Booking states

- `PENDING`
- `APPROVED`
- `REJECTED`
- `CANCELLED`
- `ACTIVE`
- `RETURN_REQUESTED`
- `COMPLETED`

## 6. Maintenance and damage states

### Maintenance

- active
- scheduled
- completed

### Damage report

- `OPEN`
- `UNDER_REVIEW`
- `RESOLVED`

## 7. Mock and demo data policy

Any synthetic data used during development should be labelled clearly as:

`Demo / Synthetic Historical Data`

This rule should be applied to AI model demos and demand forecasting seed data.

## 8. Content guideline

LENDR language should feel practical and campus-specific. Content should emphasize trust, availability, safety, and clear ownership. Avoid generic marketplace language and avoid inventing capabilities that are not supported by the equipment metadata.

## 9. Content rules for AI outputs

- Recommendations must be explainable
- The system must not invent equipment capabilities
- The system should use availability and metadata that already exist in the database
- Synthetic historical demand should never be presented as real VIT activity
