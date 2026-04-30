---
name: Travel Clothing Rental Startup
description: Green startup renting clothes to travelers in Paris with delivery, lifecycle tracking, and carbon footprint calculation
type: project
---

Core concept: Rent clothes to travelers, deliver to their destination, collect after use, clean, re-circulate. Lifecycle tracked per item, donated at end-of-life.

**Why:** Reduce carbon footprint while traveling — lighter luggage, reused clothes, end-of-life donation.

**How to apply:** All technical decisions should optimize for this rental-specific flow (not generic e-commerce). Date-based availability, lifecycle tracking, and return logistics are the core differentiators.

Key details:

- Starting in Paris only, expanding later
- Inventory sourced from Vinted (low cost, branded items)
- Pricing: ~30 EUR / 5 days for a complete set
- Delivery: personal delivery first, then Mondial Relay / Chronopost
- Languages: EN, FR, ES
- No brand name decided yet
- MVP includes: user accounts, order history, admin dashboard, carbon calculator
- Tech: Fastify + TypeScript + Prisma + PostgreSQL (Supabase Docker) + Redis + Stripe
- Has GitHub Student Pack (Heroku, etc.) for hosting options
