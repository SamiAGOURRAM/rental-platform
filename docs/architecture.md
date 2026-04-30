# Backend Architecture — Travel Clothing Rental Platform

> **Status:** Implemented (see code under `packages/backend/src/modules/*` for current truth)  
> **Last updated:** 2026-04-28  
> **Audience:** Technical founders, future developers

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Principles](#2-architecture-principles)
3. [Technology Stack](#3-technology-stack)
4. [Module Structure](#4-module-structure)
5. [Database Design](#5-database-design)
6. [Core Domain Models & Interfaces](#6-core-domain-models--interfaces)
7. [Service Layer Architecture](#7-service-layer-architecture)
8. [Order Lifecycle & State Machine](#8-order-lifecycle--state-machine)
9. [Inventory Management System](#9-inventory-management-system)
10. [Delivery & Return System](#10-delivery--return-system)
11. [Payment Integration](#11-payment-integration)
12. [Authentication & Authorization](#12-authentication--authorization)
13. [Carbon Footprint Engine](#13-carbon-footprint-engine)
14. [Internationalization (i18n)](#14-internationalization-i18n)
15. [API Design](#15-api-design)
16. [Use Cases & Flows](#16-use-cases--flows)
17. [Infrastructure & Containers](#17-infrastructure--containers)
18. [Future Features (Placeholders)](#18-future-features-placeholders)
19. [Error Handling Strategy](#19-error-handling-strategy)
20. [Testing Strategy](#20-testing-strategy)

---

## 1. System Overview

### What We're Building

A modular monolith backend for a clothing rental platform targeting travelers. The system handles:

- Product catalog with lifecycle tracking (cycle count, condition, donation threshold)
- Date-based availability and booking
- Order management with full state machine
- Inventory management with cleaning/inspection workflows
- Stripe payment processing with deposits and refunds
- User accounts with order history and carbon savings
- Admin dashboard APIs
- Carbon footprint calculation per order and per user (cumulative)
- Multi-language support (EN, FR, ES)

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                         │
│              (Future: Next.js / Mobile App)                  │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS / REST + JSON
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                       │
│         Rate Limiting · Auth Middleware · i18n · CORS         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                        │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ Catalog   │ │ Order    │ │ User     │ │ Admin         │  │
│  │ Module    │ │ Module   │ │ Module   │ │ Module        │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬────────┘  │
│       │             │            │               │           │
│  ┌────┴─────┐ ┌────┴─────┐ ┌───┴──────┐ ┌─────┴────────┐  │
│  │ Inventory│ │ Payment  │ │ Auth     │ │ Carbon       │  │
│  │ Module   │ │ Module   │ │ Module   │ │ Module       │  │
│  └────┬─────┘ └────┬─────┘ └───┬──────┘ └─────┬────────┘  │
│       │             │            │               │           │
│  ┌────┴─────┐ ┌────┴─────┐     │          ┌────┴────────┐  │
│  │ Delivery │ │ Notif.   │     │          │ Analytics   │  │
│  │ Module   │ │ Module   │     │          │ Module      │  │
│  └──────────┘ └──────────┘     │          └─────────────┘  │
│                                │                            │
└────────────────────────────────┼────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                              │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ PostgreSQL   │  │ Redis        │  │ Object Storage   │   │
│  │ (Supabase)   │  │ (Sessions,   │  │ (Product Images) │   │
│  │              │  │  Cache)      │  │                  │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Modular Monolith — Why Not Microservices

At 4-5 rentals growing to hundreds, microservices add deployment complexity with zero benefit. A modular monolith gives us:

- **Clear boundaries** between modules via interfaces (can extract to services later)
- **Single deployment** — one container, simple ops
- **Shared database** with schema-level isolation per module
- **Transaction guarantees** across modules (critical for order + payment + inventory atomicity)
- **Easy refactoring** — modules communicate through typed interfaces, not HTTP

Each module has its own directory, its own repository layer, its own service layer, and exposes only a typed public interface. Internal implementation details are private. When/if a module needs to become a service, the interface is already defined.

---

## 2. Architecture Principles

| Principle                       | Meaning in This Project                                                                                                                                              |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Clean Architecture**          | Dependencies point inward: Routes → Services → Repositories → Domain. Domain has zero dependencies on frameworks.                                                    |
| **Interface Segregation**       | Modules expose narrow, typed interfaces. No module reaches into another's internals.                                                                                 |
| **Repository Pattern**          | All database access goes through repositories. Services never write raw SQL.                                                                                         |
| **Domain-Driven Design (lite)** | Core domain logic (order state machine, availability, pricing, carbon calc) lives in pure domain objects, not in route handlers.                                     |
| **Strategy Pattern**            | Delivery methods, payment providers, and carbon calculation formulas are interchangeable strategies behind a common interface.                                       |
| **State Machine Pattern**       | Order and inventory item lifecycles are explicit state machines with validated transitions.                                                                          |
| **Event-Driven (internal)**     | Modules communicate side effects through an internal event bus. Order confirmed → triggers inventory reservation, payment capture, notification, carbon calculation. |
| **Fail-Safe Defaults**          | Every external call (Stripe, email, delivery API) has retry logic, timeouts, and graceful degradation.                                                               |
| **Idempotency**                 | All payment and order operations are idempotent. Stripe webhook retries don't create duplicate orders.                                                               |

---

## 3. Technology Stack

| Layer                | Technology                       | Rationale                                                                                                                                    |
| -------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Runtime**          | Node.js 20+ (LTS)                | Ecosystem, async I/O for API workloads, your familiarity                                                                                     |
| **Language**         | TypeScript (strict mode)         | Type safety across the entire stack, catch errors at compile time                                                                            |
| **Framework**        | Fastify                          | Faster than Express, schema-based validation, plugin architecture maps to our module structure, built-in TypeBox for runtime type validation |
| **ORM**              | Prisma                           | Type-safe queries generated from schema, excellent migration tooling, works perfectly with Supabase PostgreSQL                               |
| **Database**         | PostgreSQL 15+ (Supabase Docker) | ACID transactions, JSONB for flexible metadata, full-text search, row-level security                                                         |
| **Cache**            | Redis (Docker)                   | Session storage, rate limiting, availability cache, idempotency keys                                                                         |
| **Payments**         | Stripe SDK                       | Industry standard, Checkout Sessions for trust, webhooks for async events                                                                    |
| **Auth**             | Supabase Auth                    | User/admin role separation, refresh token rotation                                                                                           |
| **Image Storage**    | Supabase Storage (S3-compatible) | Already have Supabase, avoids extra service                                                                                                  |
| **Email**            | Resend or Nodemailer + SMTP      | Transactional emails (order confirmation, return reminders)                                                                                  |
| **Validation**       | Zod                              | Runtime schema validation for all API inputs, shared with TypeBox for Fastify                                                                |
| **Testing**          | Vitest + Supertest               | Fast, TypeScript-native, API integration tests                                                                                               |
| **Containerization** | Docker + Docker Compose          | Consistent dev/prod environments, single compose file for all services                                                                       |
| **Migrations**       | Prisma Migrate                   | Versioned, reviewable, rollback-capable                                                                                                      |

### Why Fastify Over Next.js API Routes for Backend

Next.js API routes are convenient for frontend-coupled backends, but for a standalone backend that needs to be framework-agnostic:

- Fastify has built-in schema validation, serialization, and plugin encapsulation
- Better performance under load (important as we scale)
- Clean plugin system maps 1:1 to our module architecture
- The frontend can be anything — Next.js, mobile app, third-party integration — the backend doesn't care
- When you build the frontend, it simply consumes this API

---

## 4. Module Structure

```
src/
├── app.ts                          # Fastify app factory, plugin registration
├── server.ts                       # Entry point, starts server
├── config/
│   ├── index.ts                    # Environment config loader (validated with Zod)
│   ├── database.ts                 # Prisma client singleton
│   └── redis.ts                    # Redis client singleton
│
├── common/                         # Shared kernel — used by all modules
│   ├── interfaces/
│   │   ├── repository.ts           # Base repository interface
│   │   ├── service.ts              # Base service interface
│   │   └── event-bus.ts            # Event bus interface
│   ├── errors/
│   │   ├── app-error.ts            # Base application error
│   │   ├── not-found.ts
│   │   ├── validation-error.ts
│   │   ├── conflict-error.ts
│   │   └── unauthorized-error.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts       # JWT verification + role extraction
│   │   ├── rate-limit.middleware.ts
│   │   ├── i18n.middleware.ts       # Accept-Language parsing
│   │   └── error-handler.ts        # Global error handler
│   ├── events/
│   │   ├── event-bus.ts            # In-process event bus implementation
│   │   └── event-types.ts          # All domain event type definitions
│   ├── utils/
│   │   ├── pagination.ts           # Cursor-based pagination helpers
│   │   ├── date.ts                 # Date range utilities (rental period math)
│   │   └── slug.ts                 # URL-safe slug generation
│   └── types/
│       ├── branded.ts              # Branded types (UserId, ProductId, etc.)
│       └── result.ts               # Result<T, E> type for error handling
│
├── modules/
│   ├── auth/                       # Authentication & authorization
│   │   ├── auth.interface.ts       # Public module interface
│   │   ├── auth.routes.ts
│   │   ├── auth.service.ts
│   │   ├── auth.repository.ts
│   │   ├── token.service.ts        # JWT generation, refresh rotation
│   │   └── schemas/
│   │       ├── register.schema.ts
│   │       └── login.schema.ts
│   │
│   ├── user/                       # User profiles & account management
│   │   ├── user.interface.ts
│   │   ├── user.routes.ts
│   │   ├── user.service.ts
│   │   ├── user.repository.ts
│   │   └── schemas/
│   │       ├── update-profile.schema.ts
│   │       └── user-response.schema.ts
│   │
│   ├── catalog/                    # Product browsing, search, filtering
│   │   ├── catalog.interface.ts
│   │   ├── catalog.routes.ts
│   │   ├── catalog.service.ts
│   │   ├── catalog.repository.ts
│   │   ├── availability.service.ts # Date-range availability checking
│   │   └── schemas/
│   │       ├── product-filter.schema.ts
│   │       ├── product-response.schema.ts
│   │       └── capsule-response.schema.ts
│   │
│   ├── inventory/                  # Stock management, lifecycle, condition
│   │   ├── inventory.interface.ts
│   │   ├── inventory.routes.ts     # Admin-only routes
│   │   ├── inventory.service.ts
│   │   ├── inventory.repository.ts
│   │   ├── lifecycle.service.ts    # Cycle counting, donation threshold
│   │   ├── condition.enum.ts       # NEW, EXCELLENT, GOOD, FAIR, DONATE
│   │   └── schemas/
│   │       ├── add-product.schema.ts
│   │       ├── update-product.schema.ts
│   │       └── inventory-filter.schema.ts
│   │
│   ├── order/                      # Order creation, lifecycle, history
│   │   ├── order.interface.ts
│   │   ├── order.routes.ts
│   │   ├── order.service.ts
│   │   ├── order.repository.ts
│   │   ├── order-state-machine.ts  # Explicit state transitions
│   │   ├── pricing.service.ts      # Price calculation (base + condition discount + duration)
│   │   └── schemas/
│   │       ├── create-order.schema.ts
│   │       ├── order-response.schema.ts
│   │       └── order-filter.schema.ts
│   │
│   ├── payment/                    # Stripe integration
│   │   ├── payment.interface.ts
│   │   ├── payment.routes.ts       # Webhook endpoint
│   │   ├── payment.service.ts
│   │   ├── payment.repository.ts
│   │   ├── stripe.adapter.ts       # Stripe SDK wrapper (Strategy pattern)
│   │   └── schemas/
│   │       └── payment-response.schema.ts
│   │
│   ├── delivery/                   # Delivery & return logistics
│   │   ├── delivery.interface.ts
│   │   ├── delivery.routes.ts
│   │   ├── delivery.service.ts
│   │   ├── delivery.repository.ts
│   │   ├── strategies/
│   │   │   ├── delivery-strategy.interface.ts
│   │   │   ├── personal-delivery.strategy.ts
│   │   │   ├── mondial-relay.strategy.ts
│   │   │   └── chronopost.strategy.ts
│   │   └── schemas/
│   │       └── delivery-response.schema.ts
│   │
│   ├── carbon/                     # Carbon footprint calculation & tracking
│   │   ├── carbon.interface.ts
│   │   ├── carbon.routes.ts
│   │   ├── carbon.service.ts
│   │   ├── carbon.repository.ts
│   │   ├── formulas/
│   │   │   ├── carbon-formula.interface.ts
│   │   │   ├── luggage-weight.formula.ts    # CO2 saved by not carrying luggage
│   │   │   └── reuse-savings.formula.ts     # CO2 saved by not buying new
│   │   └── schemas/
│   │       └── carbon-response.schema.ts
│   │
│   ├── admin/                      # Admin dashboard API
│   │   ├── admin.interface.ts
│   │   ├── admin.routes.ts
│   │   ├── admin.service.ts
│   │   └── schemas/
│   │       └── dashboard-stats.schema.ts
│   │
│   └── notification/               # Email & future push notifications
│       ├── notification.interface.ts
│       ├── notification.service.ts
│       ├── templates/
│       │   ├── order-confirmed.ts
│       │   ├── delivery-scheduled.ts
│       │   └── return-reminder.ts
│       └── channels/
│           ├── notification-channel.interface.ts
│           └── email.channel.ts
│
├── prisma/
│   ├── schema.prisma               # Database schema
│   ├── migrations/                  # Versioned migrations
│   └── seed.ts                      # Dev seed data
│
└── docker/
    └── docker-compose.yml           # PostgreSQL, Redis, app
```

### Module Interface Contract

Every module exposes exactly one public interface file. Other modules import ONLY from this interface. Example:

```typescript
// modules/inventory/inventory.interface.ts

export interface InventoryModule {
  // Queries
  getAvailableProducts(filters: ProductFilter, dateRange: DateRange): Promise<Product[]>;
  getProductById(id: ProductId): Promise<Product | null>;
  checkAvailability(productIds: ProductId[], dateRange: DateRange): Promise<AvailabilityResult>;

  // Commands
  reserveProducts(productIds: ProductId[], orderId: OrderId): Promise<ReservationResult>;
  releaseReservation(orderId: OrderId): Promise<void>;
  markAsReturned(orderId: OrderId): Promise<InspectionRequired[]>;
  recordInspection(productId: ProductId, result: InspectionResult): Promise<void>;
  incrementCycle(productId: ProductId): Promise<CycleResult>; // May trigger donation
}
```

No module ever imports from another module's service, repository, or internal files. Only from the `.interface.ts`.

---

## 5. Database Design

### Schema Diagram

```
┌──────────────────────┐       ┌──────────────────────────┐
│       users           │       │      addresses            │
├──────────────────────┤       ├──────────────────────────┤
│ id          UUID PK   │──┐    │ id            UUID PK     │
│ email       TEXT UQ    │  │    │ user_id       UUID FK     │──┐
│ password_hash TEXT     │  │    │ label         TEXT         │  │
│ role        ENUM       │  │    │ line1         TEXT         │  │
│ first_name  TEXT       │  │    │ line2         TEXT NULL    │  │
│ last_name   TEXT       │  │    │ city          TEXT         │  │
│ phone       TEXT NULL  │  │    │ postal_code   TEXT         │  │
│ locale      TEXT       │  │    │ country_code  TEXT         │  │
│ created_at  TIMESTAMP  │  │    │ instructions  TEXT NULL    │  │
│ updated_at  TIMESTAMP  │  │    │ is_default    BOOLEAN      │  │
│ deleted_at  TIMESTAMP  │  │    │ created_at    TIMESTAMP    │  │
│ (soft delete)         │  │    └──────────────────────────┘  │
└──────────────────────┘  │                                    │
                           │                                    │
                           │    ┌──────────────────────────┐   │
                           │    │      orders               │   │
                           │    ├──────────────────────────┤   │
                           ├───▶│ id            UUID PK     │   │
                           │    │ user_id       UUID FK     │   │
                           │    │ address_id    UUID FK     │◀──┘
                           │    │ order_number  TEXT UQ      │
                           │    │ status        ENUM         │
                           │    │ rental_start  DATE         │
                           │    │ rental_end    DATE         │
                           │    │ delivery_method ENUM       │
                           │    │ subtotal      DECIMAL      │
                           │    │ delivery_fee  DECIMAL      │
                           │    │ deposit_amount DECIMAL     │
                           │    │ total         DECIMAL      │
                           │    │ currency      TEXT         │
                           │    │ carbon_saved_kg DECIMAL    │
                           │    │ locale        TEXT         │
                           │    │ notes         TEXT NULL    │
                           │    │ created_at    TIMESTAMP    │
                           │    │ updated_at    TIMESTAMP    │
                           │    └──────────┬───────────────┘
                           │               │
                           │               │ 1:N
                           │               ▼
                           │    ┌──────────────────────────┐
                           │    │    order_items            │
                           │    ├──────────────────────────┤
                           │    │ id            UUID PK     │
                           │    │ order_id      UUID FK     │
                           │    │ product_id    UUID FK     │──────┐
                           │    │ price_at_time DECIMAL     │      │
                           │    │ condition_at_rent ENUM    │      │
                           │    │ cycle_at_rent INT         │      │
                           │    └──────────────────────────┘      │
                           │                                       │
                           │    ┌──────────────────────────┐      │
                           │    │    order_status_history   │      │
                           │    ├──────────────────────────┤      │
                           │    │ id            UUID PK     │      │
                           │    │ order_id      UUID FK     │      │
                           │    │ from_status   ENUM NULL   │      │
                           │    │ to_status     ENUM        │      │
                           │    │ changed_by    UUID FK     │      │
                           │    │ reason        TEXT NULL   │      │
                           │    │ created_at    TIMESTAMP    │      │
                           │    └──────────────────────────┘      │
                           │                                       │
┌──────────────────────┐   │    ┌──────────────────────────┐      │
│    categories         │   │    │      products             │      │
├──────────────────────┤   │    ├──────────────────────────┤      │
│ id          UUID PK   │   │    │ id            UUID PK     │◀─────┘
│ slug        TEXT UQ    │   │    │ category_id   UUID FK     │
│ name_en     TEXT       │   │    │ sku           TEXT UQ      │
│ name_fr     TEXT       │   │    │ name_en       TEXT         │
│ name_es     TEXT       │   │    │ name_fr       TEXT         │
│ parent_id   UUID FK   │   │    │ name_es       TEXT         │
│ sort_order  INT        │   │    │ description_en TEXT        │
│ icon        TEXT NULL  │   │    │ description_fr TEXT        │
└──────────────────────┘   │    │ description_es TEXT        │
         ▲                  │    │ brand         TEXT         │
         │                  │    │ size_eu       TEXT         │
         │                  │    │ size_uk       TEXT NULL    │
         └──────────────────┼────│ size_us       TEXT NULL    │
                            │    │ color         TEXT         │
                            │    │ material      TEXT NULL    │
                            │    │ weight_grams  INT          │
                            │    │ gender        ENUM         │
                            │    │ season        ENUM         │
                            │    │ condition     ENUM         │
                            │    │ cycle_count   INT DEFAULT 0│
                            │    │ max_cycles    INT          │
                            │    │ purchase_price DECIMAL     │
                            │    │ rental_price_per_day DECIMAL│
                            │    │ source        ENUM         │
                            │    │ status        ENUM         │
                            │    │ city          TEXT         │
                            │    │ metadata      JSONB NULL   │
                            │    │ created_at    TIMESTAMP    │
                            │    │ updated_at    TIMESTAMP    │
                            │    │ retired_at    TIMESTAMP NULL│
                            │    └──────────┬───────────────┘
                            │               │
                            │               │ 1:N
                            │               ▼
                            │    ┌──────────────────────────┐
                            │    │   product_images          │
                            │    ├──────────────────────────┤
                            │    │ id            UUID PK     │
                            │    │ product_id    UUID FK     │
                            │    │ url           TEXT         │
                            │    │ alt_text      TEXT NULL    │
                            │    │ sort_order    INT          │
                            │    │ is_primary    BOOLEAN      │
                            │    │ created_at    TIMESTAMP    │
                            │    └──────────────────────────┘
                            │
                            │    ┌──────────────────────────┐
                            │    │   product_lifecycle_log   │
                            │    ├──────────────────────────┤
                            │    │ id            UUID PK     │
                            │    │ product_id    UUID FK     │
                            │    │ event_type    ENUM         │
                            │    │ order_id      UUID FK NULL│
                            │    │ notes         TEXT NULL    │
                            │    │ performed_by  UUID FK     │
                            │    │ created_at    TIMESTAMP    │
                            │    └──────────────────────────┘
                            │
                            │    ┌──────────────────────────┐
                            │    │   capsule_wardrobes       │
                            │    ├──────────────────────────┤
                            │    │ id            UUID PK     │
                            │    │ slug          TEXT UQ      │
                            │    │ name_en       TEXT         │
                            │    │ name_fr       TEXT         │
                            │    │ name_es       TEXT         │
                            │    │ description_en TEXT        │
                            │    │ description_fr TEXT        │
                            │    │ description_es TEXT        │
                            │    │ category_type ENUM         │
                            │    │ season        ENUM         │
                            │    │ gender        ENUM         │
                            │    │ base_price    DECIMAL      │
                            │    │ image_url     TEXT NULL    │
                            │    │ is_active     BOOLEAN      │
                            │    │ created_at    TIMESTAMP    │
                            │    └──────────────────────────┘
                            │
                            │    ┌──────────────────────────┐
                            │    │ capsule_wardrobe_items    │
                            │    ├──────────────────────────┤
                            │    │ id            UUID PK     │
                            │    │ capsule_id    UUID FK     │
                            │    │ category_id   UUID FK     │
                            │    │ quantity      INT          │
                            │    │ is_required   BOOLEAN      │
                            │    └──────────────────────────┘
                            │
                            │    ┌──────────────────────────┐
                            │    │      payments             │
                            │    ├──────────────────────────┤
                            │    │ id            UUID PK     │
                            │    │ order_id      UUID FK     │
                            │    │ stripe_session_id TEXT UQ  │
                            │    │ stripe_payment_intent TEXT │
                            │    │ type          ENUM         │
                            │    │ amount        DECIMAL      │
                            │    │ currency      TEXT         │
                            │    │ status        ENUM         │
                            │    │ idempotency_key TEXT UQ    │
                            │    │ metadata      JSONB NULL   │
                            │    │ created_at    TIMESTAMP    │
                            │    │ updated_at    TIMESTAMP    │
                            │    └──────────────────────────┘
                            │
                            │    ┌──────────────────────────┐
                            │    │      deliveries           │
                            │    ├──────────────────────────┤
                            │    │ id            UUID PK     │
                            │    │ order_id      UUID FK     │
                            │    │ type          ENUM         │
                            │    │ direction     ENUM         │
                            │    │ status        ENUM         │
                            │    │ tracking_code TEXT NULL    │
                            │    │ carrier       TEXT NULL    │
                            │    │ scheduled_at  TIMESTAMP    │
                            │    │ picked_up_at  TIMESTAMP NULL│
                            │    │ delivered_at  TIMESTAMP NULL│
                            │    │ fee           DECIMAL      │
                            │    │ notes         TEXT NULL    │
                            │    │ created_at    TIMESTAMP    │
                            │    │ updated_at    TIMESTAMP    │
                            │    └──────────────────────────┘
                            │
                            │    ┌──────────────────────────┐
                            │    │   carbon_savings          │
                            │    ├──────────────────────────┤
                            │    │ id            UUID PK     │
                            │    │ user_id       UUID FK     │
                            │    │ order_id      UUID FK     │
                            │    │ luggage_co2_kg DECIMAL    │
                            │    │ reuse_co2_kg  DECIMAL     │
                            │    │ total_co2_kg  DECIMAL     │
                            │    │ items_reused  INT          │
                            │    │ weight_avoided_kg DECIMAL │
                            │    │ calculation_version INT   │
                            │    │ created_at    TIMESTAMP    │
                            │    └──────────────────────────┘
                            │
                            │    ┌──────────────────────────┐
                            │    │   refresh_tokens          │
                            │    ├──────────────────────────┤
                            │    │ id            UUID PK     │
                            │    │ user_id       UUID FK     │
                            │    │ token_hash    TEXT         │
                            │    │ expires_at    TIMESTAMP    │
                            │    │ revoked_at    TIMESTAMP NULL│
                            │    │ created_at    TIMESTAMP    │
                            │    └──────────────────────────┘
```

### Enum Definitions

```sql
-- User roles
CREATE TYPE user_role AS ENUM ('customer', 'admin', 'super_admin');

-- Product enums
CREATE TYPE product_condition AS ENUM ('new', 'excellent', 'good', 'fair', 'end_of_life');
CREATE TYPE product_status AS ENUM ('available', 'reserved', 'rented', 'in_cleaning', 'in_inspection', 'retired', 'donated');
CREATE TYPE product_source AS ENUM ('vinted', 'wholesale', 'donated_in', 'direct_purchase');
CREATE TYPE product_gender AS ENUM ('men', 'women', 'unisex');
CREATE TYPE product_season AS ENUM ('spring_summer', 'fall_winter', 'all_season');

-- Order enums
CREATE TYPE order_status AS ENUM (
  'pending_payment',    -- Created, waiting for Stripe confirmation
  'confirmed',          -- Payment successful
  'preparing',          -- Staff packing the order
  'out_for_delivery',   -- In transit to customer
  'delivered',          -- Customer received the clothes
  'active_rental',      -- Customer is using the clothes
  'return_initiated',   -- Customer started return process
  'return_in_transit',  -- Return shipment on the way
  'returned',           -- Items received back
  'inspecting',         -- Checking condition of returned items
  'completed',          -- Fully closed, deposit released
  'cancelled',          -- Cancelled before delivery
  'refunded'            -- Refund processed
);

-- Delivery enums
CREATE TYPE delivery_method AS ENUM ('personal', 'mondial_relay', 'chronopost', 'colissimo');
CREATE TYPE delivery_direction AS ENUM ('outbound', 'return');
CREATE TYPE delivery_status AS ENUM ('scheduled', 'picked_up', 'in_transit', 'delivered', 'failed');

-- Payment enums
CREATE TYPE payment_type AS ENUM ('rental', 'deposit', 'damage_fee', 'refund');
CREATE TYPE payment_status AS ENUM ('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded');

-- Lifecycle log
CREATE TYPE lifecycle_event_type AS ENUM (
  'added_to_inventory',
  'rented',
  'returned',
  'cleaned',
  'inspected',
  'condition_changed',
  'repaired',
  'marked_for_donation',
  'donated'
);

-- Capsule types
CREATE TYPE capsule_category AS ENUM ('beach', 'business', 'city', 'winter', 'wedding', 'casual');
```

### Key Indexes

```sql
-- Products: availability queries (most frequent query in the system)
CREATE INDEX idx_products_status_city ON products (status, city);
CREATE INDEX idx_products_category_gender_season ON products (category_id, gender, season);
CREATE INDEX idx_products_size_eu ON products (size_eu);

-- Orders: date range queries for availability
CREATE INDEX idx_orders_rental_dates ON orders (rental_start, rental_end) WHERE status NOT IN ('cancelled', 'refunded', 'completed');
CREATE INDEX idx_orders_user_id ON orders (user_id);
CREATE INDEX idx_order_items_product_id ON order_items (product_id);

-- Deliveries: scheduling queries
CREATE INDEX idx_deliveries_scheduled_at ON deliveries (scheduled_at) WHERE status = 'scheduled';

-- Payments: lookup by Stripe identifiers
CREATE INDEX idx_payments_stripe_session ON payments (stripe_session_id);
CREATE INDEX idx_payments_idempotency ON payments (idempotency_key);

-- Carbon savings: user aggregation
CREATE INDEX idx_carbon_user_id ON carbon_savings (user_id);
```

### Database Design Decisions

**Why separate `order_items` with `price_at_time` and `condition_at_rent`?**  
Prices and conditions change over time. When a customer views their order history, they must see the exact state at rental time, not current values. This is an immutable snapshot.

**Why `product_lifecycle_log` as a separate table?**  
The lifecycle log is an append-only audit trail. It answers questions like "how many times was this shirt rented?", "when was it last cleaned?", "who inspected it?". Critical for operational tracking and eventual donation decisions.

**Why `order_status_history`?**  
Every status transition is logged with who triggered it and why. Essential for debugging customer issues and operational auditing.

**Why `addresses` as a separate table (not embedded in orders)?**  
Users may have multiple addresses (home, hotel, Airbnb) and reuse them. Orders reference an address at creation time. If the user later updates their address, historical orders are unaffected because the address row itself is immutable once referenced by an order (copy-on-write pattern for address edits).

**Why JSONB `metadata` on products?**  
Future-proofing for attributes we haven't anticipated — specific garment measurements, care instructions, compatibility tags. Keeps the schema stable while allowing flexibility.

**Why `calculation_version` on carbon_savings?**  
Our carbon formulas will improve over time. Versioning lets us know which formula produced each calculation, and optionally recalculate historical data.

**Why `city` on products?**  
Inventory is location-specific. When we expand beyond Paris, we need to filter by city. Indexed from day one.

**Soft deletes on users only.** Products are never deleted — they transition to `retired` → `donated`. Orders are never deleted — they're financial records.

---

## 6. Core Domain Models & Interfaces

### Branded Types (Type Safety)

```typescript
// common/types/branded.ts
// Prevent accidentally passing a UserId where a ProductId is expected

type Brand<T, B> = T & { __brand: B };

export type UserId = Brand<string, 'UserId'>;
export type ProductId = Brand<string, 'ProductId'>;
export type OrderId = Brand<string, 'OrderId'>;
export type AddressId = Brand<string, 'AddressId'>;
export type CategoryId = Brand<string, 'CategoryId'>;
export type CapsuleId = Brand<string, 'CapsuleId'>;
export type PaymentId = Brand<string, 'PaymentId'>;
export type DeliveryId = Brand<string, 'DeliveryId'>;
```

### Result Type (No thrown exceptions for business logic)

```typescript
// common/types/result.ts

type Success<T> = { ok: true; value: T };
type Failure<E> = { ok: false; error: E };
export type Result<T, E = AppError> = Success<T> | Failure<E>;

export const ok = <T>(value: T): Success<T> => ({ ok: true, value });
export const fail = <E>(error: E): Failure<E> => ({ ok: false, error });
```

### Base Repository Interface

```typescript
// common/interfaces/repository.ts

export interface BaseRepository<T, Id> {
  findById(id: Id): Promise<T | null>;
  findMany(
    filter: Record<string, unknown>,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<T>>;
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  update(id: Id, data: Partial<T>): Promise<T>;
}

export interface PaginationParams {
  cursor?: string;
  limit: number; // Max 50, default 20
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  totalCount: number;
}
```

### Module Interface Examples

```typescript
// modules/catalog/catalog.interface.ts

export interface CatalogModule {
  /** Browse products with filters, respecting date-based availability */
  searchProducts(params: ProductSearchParams): Promise<PaginatedResult<ProductListItem>>;

  /** Full product detail including images and lifecycle info */
  getProduct(id: ProductId, locale: Locale): Promise<ProductDetail | null>;

  /** Get all active capsule wardrobes for a given context */
  getCapsuleWardrobes(params: CapsuleSearchParams): Promise<CapsuleWardrobe[]>;

  /** Check real-time availability for a set of products over a date range */
  checkAvailability(productIds: ProductId[], dateRange: DateRange): Promise<AvailabilityMap>;
}

export interface ProductSearchParams {
  dateRange: DateRange; // Required: when does the customer need the clothes?
  city: string; // Required: where (Paris for now)
  categorySlug?: string;
  gender?: Gender;
  season?: Season;
  sizes?: string[]; // EU sizes
  brands?: string[];
  maxPricePerDay?: number;
  condition?: ProductCondition[]; // Filter by condition
  locale: Locale;
  pagination: PaginationParams;
}

export interface ProductListItem {
  id: ProductId;
  name: string; // Localized
  brand: string;
  category: string; // Localized
  primaryImageUrl: string;
  size: string;
  color: string;
  condition: ProductCondition;
  cycleCount: number;
  maxCycles: number;
  rentalPricePerDay: number;
  available: boolean;
}

export interface ProductDetail extends ProductListItem {
  description: string; // Localized
  material: string | null;
  weightGrams: number;
  images: ProductImage[];
  sizeUk: string | null;
  sizeUs: string | null;
  gender: Gender;
  season: Season;
  lifecyclePercentage: number; // cycleCount / maxCycles * 100
}
```

```typescript
// modules/order/order.interface.ts

export interface OrderModule {
  /** Create a new order (validates availability, calculates price) */
  createOrder(userId: UserId, params: CreateOrderParams): Promise<Result<Order, OrderError>>;

  /** Get order by ID (user can only see their own, admin can see all) */
  getOrder(orderId: OrderId, requesterId: UserId): Promise<Order | null>;

  /** Get user's order history */
  getUserOrders(
    userId: UserId,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<OrderSummary>>;

  /** Transition order status (with validation) */
  transitionStatus(
    orderId: OrderId,
    newStatus: OrderStatus,
    actor: UserId,
    reason?: string,
  ): Promise<Result<Order, TransitionError>>;

  /** Cancel an order (only if not yet delivered) */
  cancelOrder(orderId: OrderId, userId: UserId): Promise<Result<void, CancelError>>;
}

export interface CreateOrderParams {
  items: ProductId[];
  rentalStart: Date;
  rentalEnd: Date;
  deliveryMethod: DeliveryMethod;
  addressId: AddressId;
  locale: Locale;
  notes?: string;
}

export type OrderError =
  | { type: 'PRODUCT_UNAVAILABLE'; productIds: ProductId[] }
  | { type: 'INVALID_DATE_RANGE'; reason: string }
  | { type: 'MIN_RENTAL_DAYS'; minimum: number }
  | { type: 'MAX_RENTAL_DAYS'; maximum: number }
  | { type: 'DELIVERY_NOT_AVAILABLE'; method: DeliveryMethod; reason: string };
```

```typescript
// modules/payment/payment.interface.ts

export interface PaymentModule {
  /** Create a Stripe Checkout Session for an order */
  createCheckoutSession(
    orderId: OrderId,
    locale: Locale,
  ): Promise<Result<CheckoutSession, PaymentError>>;

  /** Handle incoming Stripe webhook events */
  handleWebhook(payload: Buffer, signature: string): Promise<void>;

  /** Process a refund for an order */
  refundOrder(
    orderId: OrderId,
    amount?: number,
    reason?: string,
  ): Promise<Result<Refund, RefundError>>;

  /** Capture or release the security deposit */
  processDeposit(
    orderId: OrderId,
    action: 'capture' | 'release',
  ): Promise<Result<void, DepositError>>;
}
```

```typescript
// modules/delivery/delivery.interface.ts

export interface DeliveryModule {
  /** Schedule outbound delivery for an order */
  scheduleDelivery(
    orderId: OrderId,
    method: DeliveryMethod,
  ): Promise<Result<Delivery, DeliveryError>>;

  /** Schedule return pickup/dropoff */
  scheduleReturn(
    orderId: OrderId,
    method: DeliveryMethod,
  ): Promise<Result<Delivery, DeliveryError>>;

  /** Update delivery status (webhook from carrier, or manual) */
  updateStatus(deliveryId: DeliveryId, status: DeliveryStatus): Promise<void>;

  /** Get available delivery methods for a given address and date */
  getAvailableMethods(address: Address, date: Date): Promise<DeliveryMethodOption[]>;

  /** Calculate delivery fee */
  calculateFee(method: DeliveryMethod, direction: DeliveryDirection): Promise<number>;
}
```

```typescript
// modules/carbon/carbon.interface.ts

export interface CarbonModule {
  /** Calculate carbon savings for a specific order */
  calculateForOrder(orderId: OrderId): Promise<CarbonSavings>;

  /** Get cumulative carbon savings for a user */
  getUserCarbonStats(userId: UserId): Promise<UserCarbonStats>;

  /** Get platform-wide aggregate stats (for public page) */
  getPlatformStats(): Promise<PlatformCarbonStats>;
}

export interface UserCarbonStats {
  totalCo2SavedKg: number;
  totalItemsReused: number;
  totalWeightAvoidedKg: number;
  orderCount: number;
  equivalents: CarbonEquivalents; // "equivalent to X car trips" etc.
}

export interface CarbonEquivalents {
  carKmAvoided: number; // 1 kg CO2 ≈ 4.6 km driving
  treeDaysAbsorbed: number; // 1 tree absorbs ~22 kg CO2/year → ~0.06 kg/day
  smartphoneCharges: number; // 1 charge ≈ 0.008 kg CO2
}
```

---

## 7. Service Layer Architecture

### Internal Event Bus

Modules don't call each other directly for side effects. Instead, domain events are emitted and handled asynchronously (but still in-process).

```typescript
// common/events/event-types.ts

export type DomainEvent =
  | { type: 'ORDER_CONFIRMED'; payload: { orderId: OrderId; userId: UserId; items: ProductId[] } }
  | { type: 'ORDER_CANCELLED'; payload: { orderId: OrderId; reason: string } }
  | {
      type: 'PAYMENT_SUCCEEDED';
      payload: { orderId: OrderId; paymentId: PaymentId; amount: number };
    }
  | { type: 'PAYMENT_FAILED'; payload: { orderId: OrderId; reason: string } }
  | { type: 'DELIVERY_COMPLETED'; payload: { orderId: OrderId; deliveryId: DeliveryId } }
  | { type: 'RETURN_RECEIVED'; payload: { orderId: OrderId; items: ProductId[] } }
  | { type: 'INSPECTION_DONE'; payload: { productId: ProductId; result: InspectionResult } }
  | { type: 'PRODUCT_END_OF_LIFE'; payload: { productId: ProductId; cycleCount: number } }
  | { type: 'ORDER_COMPLETED'; payload: { orderId: OrderId; userId: UserId } };
```

**Event flow example — Order Confirmation:**

```
Stripe Webhook (payment.succeeded)
  → PaymentModule.handleWebhook()
      → Emits PAYMENT_SUCCEEDED
          → OrderModule handles: transitions order to 'confirmed'
              → Emits ORDER_CONFIRMED
                  → InventoryModule handles: reserves products (status → 'reserved')
                  → DeliveryModule handles: schedules outbound delivery
                  → CarbonModule handles: calculates and stores carbon savings
                  → NotificationModule handles: sends confirmation email
```

### Service Dependencies (Allowed)

```
auth       → (none)
user       → auth
catalog    → inventory (via interface, for availability)
inventory  → (none — core domain, no outward deps)
order      → catalog, inventory, payment, delivery, carbon (all via interfaces)
payment    → (none — called by order, listens to Stripe)
delivery   → (none — called by order)
carbon     → inventory (for product weights)
admin      → order, inventory, user, carbon (read-only aggregation)
notification → (none — listens to events)
```

No circular dependencies. The event bus breaks what would otherwise be cycles.

---

## 8. Order Lifecycle & State Machine

### State Transition Diagram

```
                    ┌───────────────┐
                    │ pending_payment│
                    └───────┬───────┘
                            │ payment.succeeded
                            ▼
                    ┌───────────────┐     payment.failed
           ┌───────│   confirmed    │────────────────────┐
           │       └───────┬───────┘                     │
           │               │ admin.prepare               │
           │               ▼                             ▼
           │       ┌───────────────┐             ┌──────────┐
           │       │   preparing    │             │ cancelled │
           │       └───────┬───────┘             └──────────┘
           │               │ admin.dispatch
           │               ▼
           │       ┌───────────────────┐
           │       │ out_for_delivery   │
           │       └───────┬───────────┘
           │               │ delivery.confirmed
           │               ▼
           │       ┌───────────────┐
           │       │   delivered    │
           │       └───────┬───────┘
           │               │ auto (rental_start reached)
           │               ▼
           │       ┌───────────────┐
           │       │ active_rental  │
           │       └───────┬───────┘
           │               │ user.initiate_return
           │               ▼
           │       ┌───────────────────┐
           │       │ return_initiated   │
           │       └───────┬───────────┘
           │               │ carrier.pickup / user.dropoff
           │               ▼
           │       ┌───────────────────┐
           │       │ return_in_transit  │
           │       └───────┬───────────┘
           │               │ admin.receive
           │               ▼
           │       ┌───────────────┐
           │       │   returned     │
           │       └───────┬───────┘
           │               │ admin.start_inspection
           │               ▼
           │       ┌───────────────┐
           │       │  inspecting    │
           │       └───────┬───────┘
           │               │ admin.complete_inspection
           │               ▼
           │       ┌───────────────┐
           │       │  completed     │ ──── deposit released
           │       └───────────────┘
           │
           │  (cancel allowed before 'out_for_delivery')
           └──────────────────────────────────► cancelled ──► refunded
```

### State Machine Implementation Pattern

```typescript
// modules/order/order-state-machine.ts

interface Transition {
  from: OrderStatus[];
  to: OrderStatus;
  guard?: (order: Order, actor: Actor) => Result<void, TransitionError>;
  onTransition?: (order: Order) => DomainEvent[];
}

const TRANSITIONS: Record<string, Transition> = {
  confirm: {
    from: ['pending_payment'],
    to: 'confirmed',
    onTransition: (order) => [
      {
        type: 'ORDER_CONFIRMED',
        payload: { orderId: order.id, userId: order.userId, items: order.itemIds },
      },
    ],
  },
  prepare: {
    from: ['confirmed'],
    to: 'preparing',
    guard: (_, actor) => (actor.role === 'admin' ? ok(undefined) : fail({ type: 'UNAUTHORIZED' })),
  },
  cancel: {
    from: ['pending_payment', 'confirmed', 'preparing'],
    to: 'cancelled',
    onTransition: (order) => [
      { type: 'ORDER_CANCELLED', payload: { orderId: order.id, reason: 'user_cancelled' } },
    ],
  },
  // ... all other transitions
};
```

Every transition is:

1. **Validated** — can only happen from allowed states
2. **Guarded** — optional business rule check (e.g., only admin can mark as preparing)
3. **Event-producing** — triggers downstream side effects
4. **Logged** — written to `order_status_history`

---

## 9. Inventory Management System

### Product Lifecycle

```
added_to_inventory (new or from Vinted)
        │
        ▼
   ┌─────────┐    order confirmed    ┌──────────┐
   │available │──────────────────────▶│ reserved  │
   └─────────┘                       └────┬─────┘
        ▲                                  │ order delivered
        │                                  ▼
        │                            ┌──────────┐
        │                            │  rented   │
        │                            └────┬─────┘
        │                                  │ return received
        │                                  ▼
        │                            ┌──────────────┐
        │                            │ in_inspection │
        │                            └────┬─────────┘
        │                                  │ inspection passed
        │                                  ▼
        │                            ┌──────────────┐
        │                            │ in_cleaning   │
        │   cleaning done            └────┬─────────┘
        │◀────────────────────────────────┘
        │
        │   (if cycle_count >= max_cycles OR condition = end_of_life)
        │
        ▼
   ┌──────────┐                      ┌──────────┐
   │ retired   │─────────────────────▶│ donated   │
   └──────────┘                      └──────────┘
```

### Availability Query Logic

This is the most performance-critical query. A product is "available" for a date range if:

1. `product.status = 'available'`
2. `product.city = requested_city`
3. No overlapping active order exists for that product in the requested date range

```sql
-- Core availability query (will be wrapped in Prisma)
SELECT p.* FROM products p
WHERE p.status = 'available'
  AND p.city = $1
  AND p.id NOT IN (
    SELECT oi.product_id
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.status NOT IN ('cancelled', 'refunded', 'completed')
      AND o.rental_start <= $3   -- requested_end
      AND o.rental_end >= $2     -- requested_start
  )
```

**Caching strategy:** Cache availability results in Redis with a short TTL (60 seconds). Invalidate on order creation/cancellation. At 4-5 concurrent rentals this is overkill, but the pattern is correct for scaling.

### Cycle Counting & Condition Degradation

```typescript
// modules/inventory/lifecycle.service.ts

interface LifecycleRules {
  // Condition degrades based on cycle count relative to max
  conditionThresholds: {
    excellent: 0.25; // 0-25% of max cycles
    good: 0.5; // 25-50%
    fair: 0.75; // 50-75%
    end_of_life: 1.0; // 75-100% → triggers retirement
  };

  // Max cycles vary by product type
  defaultMaxCycles: {
    shoes: 12;
    outerwear: 20;
    pants: 18;
    shirts: 15;
    accessories: 30; // Sunglasses, belts etc. last longer
    suits: 15;
    swimwear: 10;
  };
}
```

After each rental cycle (return + inspection + cleaning), the system:

1. Increments `cycle_count`
2. Recalculates `condition` based on thresholds
3. If `condition = end_of_life`, transitions to `retired` and flags for donation
4. Logs the event in `product_lifecycle_log`
5. Adjusts `rental_price_per_day` (optional: lower price for higher cycle count)

### Pricing by Condition

```
new:        100% of base rental price
excellent:  90%
good:       75%
fair:       60%
```

This gives customers a reason to rent used items (lower price) while maintaining revenue on new inventory.

---

## 10. Delivery & Return System

### Strategy Pattern for Delivery Methods

```typescript
// modules/delivery/strategies/delivery-strategy.interface.ts

export interface DeliveryStrategy {
  readonly method: DeliveryMethod;

  /** Can this method deliver to the given address by the given date? */
  canDeliver(address: Address, date: Date): Promise<boolean>;

  /** Calculate fee for this delivery method */
  calculateFee(direction: DeliveryDirection): Promise<number>;

  /** Create the delivery (book carrier, schedule pickup, etc.) */
  createDelivery(order: Order, direction: DeliveryDirection): Promise<DeliveryResult>;

  /** Get tracking info if available */
  getTracking(trackingCode: string): Promise<TrackingInfo | null>;

  /** Estimated delivery time in hours */
  estimatedDeliveryHours(): number;
}
```

**Implementations:**

| Strategy       | `PersonalDeliveryStrategy` | `MondialRelayStrategy`     | `ChronopostStrategy`       |
| -------------- | -------------------------- | -------------------------- | -------------------------- |
| Fee (outbound) | 0 EUR                      | 4.50 EUR                   | 9.90 EUR                   |
| Fee (return)   | 0 EUR                      | 4.50 EUR                   | 8.90 EUR                   |
| Tracking       | Manual status updates      | API integration (future)   | API integration (future)   |
| Coverage       | Paris only                 | France-wide (relay points) | France-wide (door-to-door) |
| Speed          | Same day                   | 2-3 days                   | Next day                   |

For MVP: `PersonalDeliveryStrategy` is fully implemented. Mondial Relay and Chronopost start with manual tracking (admin updates status), with carrier API integration as a future enhancement.

### Return Flow

1. Customer initiates return via their order page → status: `return_initiated`
2. System provides return instructions based on original delivery method:
   - **Personal:** Schedule a pickup time slot
   - **Mondial Relay:** Pre-paid return label with nearest relay point
   - **Chronopost:** Pre-paid return label, courier pickup scheduled
3. Customer drops off / hands over → status: `return_in_transit`
4. Admin receives items → status: `returned`
5. Admin inspects each item → status: `inspecting`
6. Items pass inspection → items go to `in_cleaning`, order to `completed`
7. Items cleaned → items back to `available`, deposit released

---

## 11. Payment Integration

### Stripe Integration Architecture

```
Customer                    Our Backend                     Stripe
   │                            │                              │
   │  POST /orders              │                              │
   │  (items, dates, address)   │                              │
   │───────────────────────────▶│                              │
   │                            │                              │
   │                            │  Validate availability       │
   │                            │  Calculate total             │
   │                            │  Create order (pending)      │
   │                            │                              │
   │                            │  Create Checkout Session     │
   │                            │─────────────────────────────▶│
   │                            │                              │
   │                            │◀─ session_url ──────────────│
   │◀── redirect to Stripe ─────│                              │
   │                            │                              │
   │  ──── Customer pays on Stripe hosted page ───────────────▶│
   │                            │                              │
   │                            │◀── webhook: payment_intent   │
   │                            │    .succeeded                │
   │                            │                              │
   │                            │  Verify webhook signature    │
   │                            │  Check idempotency key       │
   │                            │  Transition order → confirmed│
   │                            │  Emit ORDER_CONFIRMED event  │
   │                            │                              │
   │◀── redirect to success ────│                              │
   │    page with order details │                              │
```

### Payment Types Per Order

Each order generates up to 3 payment records:

1. **Rental payment** — the 30 EUR (or calculated total) for the rental period
2. **Security deposit** — a held amount (e.g., 50 EUR) captured only if damage occurs. Using Stripe's `capture_method: 'manual'` on a separate PaymentIntent. Auto-released after successful inspection.
3. **Damage fee** (conditional) — if inspection finds damage beyond normal wear, partial deposit capture.

### Idempotency

Every payment operation uses an idempotency key: `{orderId}:{paymentType}:{attempt}`. Stripe webhooks may fire multiple times — the handler checks if the payment was already processed before taking action.

### Refund Logic

```
Cancel before delivery     → Full refund (rental + release deposit hold)
Cancel during preparation  → Full refund minus 5 EUR admin fee
After delivery             → No rental refund, deposit released on return
Damage found               → Partial deposit capture, remainder released
```

---

## 12. Authentication & Authorization

### JWT-Based Auth with Refresh Token Rotation

```
Register/Login
     │
     ▼
┌─────────────────────────────────────────────┐
│ Server generates:                            │
│  - Access Token (JWT, 15 min expiry)         │
│    Contains: userId, role, locale            │
│  - Refresh Token (opaque, 30 day expiry)     │
│    Stored: hashed in DB (refresh_tokens)     │
│  Both sent to client (access in body,        │
│  refresh in httpOnly secure cookie)          │
└─────────────────────────────────────────────┘
     │
     ▼ (on every API request)
┌─────────────────────────────────────────────┐
│ Auth Middleware:                              │
│  1. Extract access token from Authorization  │
│  2. Verify JWT signature + expiry            │
│  3. Attach user context to request           │
│  4. If expired → client uses refresh token   │
└─────────────────────────────────────────────┘
     │
     ▼ (refresh flow)
┌─────────────────────────────────────────────┐
│ POST /auth/refresh                           │
│  1. Extract refresh token from cookie        │
│  2. Look up hash in DB                       │
│  3. Verify not expired, not revoked          │
│  4. Issue NEW access token + NEW refresh     │
│  5. Revoke old refresh token (rotation)      │
│  6. If old token was already revoked →       │
│     REVOKE ALL user tokens (theft detected)  │
└─────────────────────────────────────────────┘
```

### Role-Based Access Control

```typescript
type Role = 'customer' | 'admin' | 'super_admin';

const PERMISSIONS: Record<string, Role[]> = {
  // Customer routes
  'order:create': ['customer', 'admin', 'super_admin'],
  'order:read_own': ['customer', 'admin', 'super_admin'],
  'order:cancel_own': ['customer', 'admin', 'super_admin'],
  'user:read_own': ['customer', 'admin', 'super_admin'],
  'user:update_own': ['customer', 'admin', 'super_admin'],

  // Admin routes
  'order:read_all': ['admin', 'super_admin'],
  'order:transition': ['admin', 'super_admin'],
  'inventory:manage': ['admin', 'super_admin'],
  'delivery:manage': ['admin', 'super_admin'],
  'admin:dashboard': ['admin', 'super_admin'],

  // Super admin
  'user:manage_all': ['super_admin'],
  'admin:manage_roles': ['super_admin'],
};
```

---

## 13. Carbon Footprint Engine

### Calculation Formulas

Two independent components, summed per order:

#### A. Luggage Weight Savings

```
luggage_co2_kg = total_weight_kg × avg_flight_distance_km × emission_factor

Where:
  total_weight_kg    = SUM(product.weight_grams) / 1000 for all items in order
  avg_flight_distance = 1500 km (default, can be refined per user or destination later)
  emission_factor    = 0.000255 kg CO2 per kg per km (ICAO standard for passenger luggage)
```

**Example:** 5 kg of clothes × 1500 km × 0.000255 = **1.91 kg CO2 saved**

#### B. Reuse vs. New Purchase Savings

```
reuse_co2_kg = SUM(per_item_saving) for all items in order

Where per_item_saving depends on garment type:
  t-shirt / shirt    = 8 kg CO2   (source: WRAP UK lifecycle data)
  pants / jeans      = 12 kg CO2
  jacket / coat      = 15 kg CO2
  dress              = 10 kg CO2
  shoes              = 14 kg CO2
  suit               = 20 kg CO2
  accessories        = 3 kg CO2
  swimwear           = 5 kg CO2
```

These are conservative estimates from peer-reviewed textile lifecycle analysis. We use the lower bound to maintain credibility.

#### C. Equivalents (for user-facing display)

```
car_km_avoided      = total_co2_kg / 0.21        (avg car emits 0.21 kg CO2/km)
tree_days_absorbed  = total_co2_kg / 0.06         (one tree absorbs ~22 kg/year)
smartphone_charges  = total_co2_kg / 0.008
flights_equivalent  = total_co2_kg / 255          (avg short-haul flight per passenger)
```

#### D. Platform Aggregate

```typescript
interface PlatformCarbonStats {
  totalCo2SavedKg: number; // SUM all orders
  totalItemsReused: number; // COUNT all order items
  totalOrdersCompleted: number;
  totalItemsDonated: number; // Products that completed their lifecycle
  equivalents: CarbonEquivalents;
}
```

Displayed on a public `/carbon` or `/impact` page — social proof + marketing.

### Versioning

All calculations store a `calculation_version` integer. When formulas are updated (better data, different sources), we bump the version. Old calculations remain as-is. Optionally, a background job can recalculate historical data with the new formula.

---

## 14. Internationalization (i18n)

### Strategy

Database-level i18n for content, application-level i18n for UI strings.

**Database content** (product names, descriptions, categories, capsule wardrobes):

- Stored as separate columns: `name_en`, `name_fr`, `name_es`
- The repository layer accepts a `locale` parameter and returns the correct column
- This avoids JOIN-heavy translation tables and keeps queries fast

**API responses** include only the requested locale's content. The `locale` is determined by:

1. `Accept-Language` header (primary)
2. User's stored `locale` preference (fallback)
3. `fr` (default — Paris-first business)

**Application strings** (error messages, email templates, status labels):

- JSON translation files: `locales/en.json`, `locales/fr.json`, `locales/es.json`
- Loaded at startup, keyed by dot notation: `errors.order.unavailable`
- Used in error responses and notification templates

### API Response Localization

```typescript
// Request
GET /api/v1/catalog/products?locale=fr

// Response — only French content returned
{
  "id": "...",
  "name": "Chemise en lin blanche",
  "description": "Chemise légère parfaite pour l'été...",
  "brand": "Zara",
  ...
}
```

---

## 15. API Design

### REST Conventions

- **Versioned:** All routes under `/api/v1/`
- **Resource-oriented:** nouns, not verbs
- **Consistent responses:** `{ data: T }` for success, `{ error: { code, message, details? } }` for errors
- **Pagination:** Cursor-based via `?cursor=xxx&limit=20`
- **Filtering:** Query parameters for simple filters, POST body for complex search
- **Status codes:** 200, 201, 204, 400, 401, 403, 404, 409, 422, 429, 500

### Route Map

```
AUTH
  POST   /api/v1/auth/register          # Create account
  POST   /api/v1/auth/login             # Login, get tokens
  POST   /api/v1/auth/refresh           # Refresh access token
  POST   /api/v1/auth/logout            # Revoke refresh token
  POST   /api/v1/auth/forgot-password   # Send reset email
  POST   /api/v1/auth/reset-password    # Reset with token

USER
  GET    /api/v1/users/me               # Get current user profile
  PATCH  /api/v1/users/me               # Update profile
  GET    /api/v1/users/me/addresses     # List saved addresses
  POST   /api/v1/users/me/addresses     # Add address
  PATCH  /api/v1/users/me/addresses/:id # Update address
  DELETE /api/v1/users/me/addresses/:id # Remove address
  GET    /api/v1/users/me/carbon        # Get user carbon stats

CATALOG
  GET    /api/v1/catalog/products       # Browse/search products (with date range)
  GET    /api/v1/catalog/products/:id   # Product detail
  GET    /api/v1/catalog/categories     # List categories
  GET    /api/v1/catalog/capsules       # List capsule wardrobes
  GET    /api/v1/catalog/capsules/:id   # Capsule detail
  POST   /api/v1/catalog/availability   # Check availability for product set

ORDERS
  POST   /api/v1/orders                 # Create order
  GET    /api/v1/orders                 # List user's orders
  GET    /api/v1/orders/:id             # Order detail
  POST   /api/v1/orders/:id/cancel      # Cancel order
  POST   /api/v1/orders/:id/return      # Initiate return

PAYMENTS
  POST   /api/v1/payments/checkout      # Create Stripe session for order
  POST   /api/v1/payments/webhook       # Stripe webhook endpoint (no auth)
  GET    /api/v1/payments/:orderId      # Payment status for order

DELIVERY
  GET    /api/v1/delivery/methods       # Available methods for address/date
  GET    /api/v1/delivery/:orderId      # Delivery status for order

CARBON (PUBLIC)
  GET    /api/v1/carbon/platform        # Platform-wide impact stats

ADMIN
  GET    /api/v1/admin/dashboard        # Stats overview
  GET    /api/v1/admin/orders           # All orders (filterable)
  PATCH  /api/v1/admin/orders/:id/status # Transition order status
  GET    /api/v1/admin/inventory        # All products (filterable)
  POST   /api/v1/admin/inventory        # Add product
  PATCH  /api/v1/admin/inventory/:id    # Update product
  POST   /api/v1/admin/inventory/:id/inspect  # Record inspection result
  GET    /api/v1/admin/deliveries       # Upcoming deliveries
  PATCH  /api/v1/admin/deliveries/:id   # Update delivery status
```

### Standard Response Envelope

```typescript
// Success
{
  "data": { ... },
  "meta": {
    "pagination": {
      "nextCursor": "abc123",
      "totalCount": 42
    }
  }
}

// Error
{
  "error": {
    "code": "PRODUCT_UNAVAILABLE",
    "message": "One or more products are not available for the selected dates.",
    "details": [
      { "productId": "xxx", "reason": "Already reserved for 2026-04-15 to 2026-04-20" }
    ]
  }
}
```

---

## 16. Use Cases & Flows

### UC1: Customer Browses and Rents Clothes

```
1. Customer visits catalog
   GET /api/v1/catalog/products?city=paris&rentalStart=2026-05-01&rentalEnd=2026-05-05&gender=women&locale=fr

2. Customer browses results, clicks a product
   GET /api/v1/catalog/products/abc123

3. Customer adds items to cart (client-side state, no API call)

4. Customer checks availability for their selection
   POST /api/v1/catalog/availability
   Body: { productIds: [...], dateRange: { start, end } }

5. Customer proceeds to order
   POST /api/v1/orders
   Body: { items: [...], rentalStart, rentalEnd, deliveryMethod: "personal", addressId: "..." }
   → Server validates availability (atomic check + reserve)
   → Server calculates price (base prices × days × condition discounts + delivery fee)
   → Server creates order with status 'pending_payment'
   → Returns orderId

6. Customer redirected to payment
   POST /api/v1/payments/checkout
   Body: { orderId: "..." }
   → Server creates Stripe Checkout Session
   → Returns redirectUrl to Stripe hosted page

7. Customer pays on Stripe

8. Stripe fires webhook → POST /api/v1/payments/webhook
   → Server verifies signature
   → Server transitions order to 'confirmed'
   → Event bus fires ORDER_CONFIRMED
   → Inventory marks items as 'reserved'
   → Carbon savings calculated and stored
   → Confirmation email sent

9. Customer views their order
   GET /api/v1/orders/xyz789
   → Shows status timeline, carbon savings, delivery info
```

### UC2: Admin Processes an Order

```
1. Admin views today's orders
   GET /api/v1/admin/orders?status=confirmed&sort=rental_start

2. Admin prepares an order (packs the box)
   PATCH /api/v1/admin/orders/xyz789/status
   Body: { status: "preparing" }

3. Admin dispatches the order
   PATCH /api/v1/admin/orders/xyz789/status
   Body: { status: "out_for_delivery" }

4. Admin confirms delivery (or customer confirms)
   PATCH /api/v1/admin/orders/xyz789/status
   Body: { status: "delivered" }

5. System auto-transitions to 'active_rental' when rental_start date arrives
   (Scheduled job or on-demand check)
```

### UC3: Return & Inspection

```
1. Customer initiates return
   POST /api/v1/orders/xyz789/return
   → Server provides return instructions based on delivery method
   → Order status → 'return_initiated'

2. Customer drops off at Mondial Relay (or personal pickup)
   → Admin updates: status → 'return_in_transit'

3. Admin receives the returned box
   PATCH /api/v1/admin/orders/xyz789/status
   Body: { status: "returned" }

4. Admin inspects each item
   POST /api/v1/admin/inventory/product123/inspect
   Body: { condition: "good", notes: "Minor fade on collar", damageFound: false }
   → System increments cycle_count
   → System recalculates condition (may degrade)
   → If max_cycles reached → product status → 'retired', event PRODUCT_END_OF_LIFE
   → If OK → product status → 'in_cleaning'

5. Admin marks item as cleaned
   → Product status → 'available' (ready for next rental)
   → Order status → 'inspecting' → 'completed'
   → Security deposit released via Stripe
```

### UC4: Customer Views Carbon Impact

```
1. Customer views their profile
   GET /api/v1/users/me/carbon

   Response:
   {
     "data": {
       "totalCo2SavedKg": 47.3,
       "totalItemsReused": 12,
       "totalWeightAvoidedKg": 8.5,
       "orderCount": 3,
       "equivalents": {
         "carKmAvoided": 225,
         "treeDaysAbsorbed": 789,
         "smartphoneCharges": 5913
       }
     }
   }
```

### UC5: Capsule Wardrobe Rental

```
1. Customer browses capsules
   GET /api/v1/catalog/capsules?season=spring_summer&gender=women&locale=en

2. Customer selects "Beach Holiday - 5 days"
   GET /api/v1/catalog/capsules/beach-holiday
   → Returns: capsule description + required category slots
     (e.g., 2× swimwear, 3× tops, 2× shorts, 1× sandals, 1× sunglasses)

3. Customer picks specific items for each slot from available inventory
   (Client-side UX: guided selection per slot)

4. Customer adds all selected items → proceeds to order (same as UC1 step 4+)
```

---

## 17. Infrastructure & Containers

### Docker Compose Architecture

```yaml
# docker-compose.yml (structure, not final)

services:
  app:
    # Our Fastify backend
    build: .
    ports: ['3000:3000']
    depends_on: [postgres, redis]
    environment:
      DATABASE_URL: postgresql://...
      REDIS_URL: redis://redis:6379
      STRIPE_SECRET_KEY: sk_...
      STRIPE_WEBHOOK_SECRET: whsec_...
      JWT_SECRET: ...
      JWT_REFRESH_SECRET: ...
    volumes:
      - ./src:/app/src # Dev hot reload

  postgres:
    # Supabase PostgreSQL or plain postgres:15
    image: supabase/postgres:15
    ports: ['5432:5432']
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: rental_platform
      POSTGRES_USER: ...
      POSTGRES_PASSWORD: ...

  redis:
    image: redis:7-alpine
    ports: ['6379:6379']
    volumes:
      - redisdata:/data

  # Supabase Storage (S3-compatible, for product images)
  storage:
    image: supabase/storage-api
    depends_on: [postgres]
    # Config for local S3-compatible storage

volumes:
  pgdata:
  redisdata:
```

### Environment Configuration

```typescript
// config/index.ts — validated with Zod at startup

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().default(3000),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url(),

  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('30d'),

  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  STRIPE_CURRENCY: z.string().default('eur'),

  // Storage
  STORAGE_BUCKET_URL: z.string().url(),

  // App
  DEFAULT_CITY: z.string().default('paris'),
  DEFAULT_LOCALE: z.enum(['en', 'fr', 'es']).default('fr'),
  CORS_ORIGINS: z.string(), // comma-separated
});
```

Startup fails fast if any required config is missing or invalid. No silent defaults for secrets.

---

## 18. Future Features (Placeholders)

These are NOT implemented in the MVP but the architecture explicitly accommodates them. The relevant module interfaces and database schema have extension points.

### AI Virtual Try-On

- **Where it plugs in:** `CatalogModule` — new method `getVirtualTryOn(productId, userPhoto)`
- **Database:** `user_measurements` table (future), `product_images` already stores multiple angles
- **Integration point:** Google Virtual Try-On API or similar — wrapped in a `TryOnAdapter` (Strategy pattern) under `modules/catalog/adapters/`

### Review System

- **Database:** `reviews` table (user_id, order_id, product_id, rating, comment, created_at)
- **Where it plugs in:** `CatalogModule` for displaying ratings, `OrderModule` for prompting reviews after completion
- **Event:** `ORDER_COMPLETED` → trigger review request notification

### Multi-City Expansion

- **Already handled:** `products.city` column, all queries filter by city
- **Future additions:** `cities` table with delivery options, pricing rules, and operating hours per city
- **Inventory module** already scoped by city in all queries

### Subscription / Loyalty Program

- **Database:** `subscriptions` table, `loyalty_points` table
- **Where it plugs in:** `modules/subscription/` new module with its own interface
- **Pricing service** already separated — can apply subscription discounts

### Collaborative Wardrobe (Peer-to-Peer)

- **Database:** `product.source` already has an enum that can be extended with `'peer'`
- **New module:** `modules/peer/` for listing, approval, revenue sharing
- **Insurance/trust:** separate from core rental flow

### Mobile App

- **Already handled:** Backend is a pure REST API. Mobile app consumes the same endpoints as the web frontend.

### Real-Time Notifications (Push / WebSocket)

- **Notification module** already has a channel interface. Add `push.channel.ts`, `websocket.channel.ts` alongside `email.channel.ts`.

### Analytics & Reporting

- **Admin module** already exposes basic stats. Future: dedicated `modules/analytics/` with time-series queries, export functionality.
- **Database:** Consider read replicas or materialized views for heavy analytics queries as data grows.

---

## 19. Error Handling Strategy

### Layered Error Handling

```
Route Handler
  │ catches service errors → maps to HTTP status codes
  │
  ▼
Service Layer
  │ returns Result<T, E> — never throws for business logic errors
  │ throws only for unexpected/infrastructure failures
  │
  ▼
Repository Layer
  │ catches Prisma errors → wraps in domain errors
  │ PrismaClientKnownRequestError P2002 → ConflictError
  │ PrismaClientKnownRequestError P2025 → NotFoundError
  │
  ▼
Global Error Handler (Fastify onError hook)
  │ catches anything uncaught
  │ logs full stack trace
  │ returns sanitized error to client (no internal details in production)
```

### Error Response Format

```typescript
interface ApiError {
  code: string; // Machine-readable: 'PRODUCT_UNAVAILABLE'
  message: string; // Human-readable, localized
  details?: unknown[]; // Optional specifics
  requestId: string; // For support/debugging
}
```

Every response includes a `requestId` header. If a customer reports an issue, the admin can trace the exact request through logs.

---

## 20. Testing Strategy

### Test Pyramid

```
                    ┌─────────┐
                    │  E2E    │  Few: critical user flows only
                    │ (later) │  (order creation + payment + delivery)
                    ├─────────┤
                    │  Integ. │  Moderate: API routes + DB
                    │  Tests  │  (real PostgreSQL via testcontainers)
                    ├─────────┤
                    │  Unit   │  Many: domain logic, state machine,
                    │  Tests  │  pricing, carbon calc, availability
                    └─────────┘
```

### What to Test (MVP)

| Layer                      | What                                                             | How                              |
| -------------------------- | ---------------------------------------------------------------- | -------------------------------- |
| **Order state machine**    | All valid transitions succeed, all invalid transitions fail      | Unit test with pure functions    |
| **Pricing service**        | Price calculations for different conditions, durations, capsules | Unit test                        |
| **Carbon calculator**      | Correct CO2 values for various order compositions                | Unit test                        |
| **Availability logic**     | Products correctly excluded when reserved for overlapping dates  | Integration test (real DB)       |
| **Stripe webhook handler** | Idempotency, correct state transitions, signature verification   | Integration test (mocked Stripe) |
| **Auth flow**              | Register, login, refresh, token rotation, revocation on reuse    | Integration test                 |
| **Order creation API**     | Full flow: create → check availability → reserve → respond       | Integration test                 |
| **Admin transitions**      | Status updates work, unauthorized users blocked                  | Integration test                 |

### Test Database

Use a separate PostgreSQL instance (or schema) for tests. Prisma migrations run before the test suite. Each test file gets a transaction that rolls back after the test — fast, isolated, no cleanup needed.

---

## Appendix: Key Design Decisions Log

| Decision       | Chosen           | Alternative Considered         | Why                                                                                                                               |
| -------------- | ---------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Architecture   | Modular monolith | Microservices                  | Scale doesn't justify distributed complexity yet. Module interfaces allow future extraction.                                      |
| Framework      | Fastify          | Express, NestJS                | Fastify: faster, schema validation built-in, plugin system fits module architecture. NestJS too opinionated/heavy for this stage. |
| Database       | PostgreSQL       | MongoDB                        | Relational data (orders → items → products), ACID transactions critical for payment + inventory atomicity.                        |
| ORM            | Prisma           | TypeORM, Drizzle               | Best migration tooling, type safety, Supabase integration. Drizzle is lighter but Prisma's ecosystem is more mature.              |
| Auth           | Custom JWT       | Supabase Auth, Auth0           | Full control over token lifecycle, refresh rotation, role system. No vendor dependency. Can switch later.                         |
| i18n (content) | Multi-column     | Translation table, JSON column | Fastest queries, no JOINs. 3 languages is manageable. If we add more, migrate to a translations table.                            |
| Payments       | Stripe Checkout  | Stripe Elements, custom form   | Checkout is hosted by Stripe — maximum trust, PCI compliance handled, minimal frontend work.                                      |
| Event bus      | In-process       | RabbitMQ, Redis Pub/Sub        | At this scale, an in-memory event emitter is sufficient. Interface is defined — can swap to message queue later.                  |
| Image storage  | Supabase Storage | Cloudinary, S3                 | Already running Supabase. S3-compatible. Can add Cloudinary transformations layer later if needed.                                |
| Pagination     | Cursor-based     | Offset-based                   | Cursor is more performant for large datasets and doesn't break when items are added/removed between pages.                        |
