# Collaborative Elderly Healthcare Management Platform

CareConnect is an elderly-centred collaborative healthcare platform where authorized family members, caregivers, and clinicians coordinate care through one consistent, auditable, shared record.

---

## Core Product Vision & Key Invariants

1. **Elderly Experience ("Today" Companion)**:
   - Calm, high-contrast mobile interface focused on: *"What do I need to do now?"*
   - Minimum 56–64 px button height, ≥44×44 CSS px touch targets, WCAG AAA contrast.
   - Plain language instructions (e.g., *"Take 1 Metformin tablet with breakfast"*).
   - Large primary **I TOOK IT** action with an immediate **30-second live Undo countdown**.
   - Accessible **Need help** and **Not today** actions.
2. **Care Circle Experience (Web & Mobile)**:
   - **Universal Shared Editing**: Every invited and authorized care circle member can view and update shared care information (medications, dose records, schedules, appointments, care notes) with non-destructive audit attribution.
   - **Operational Caregiver Dashboard**: Schedule tracking, **Mark as Administered** logging, care note / vitals entry, alert queues, and shift handoff preparation.
   - **Family Reassurance View**: Peaceful daily digest (e.g., *"7 of 8 medicines taken"*, upcoming appointment) without routine notification noise.
   - **Duplicate Administration Protection**: Deterministic `DoseEvent` IDs prevent duplicate creation. If multiple users report physical administrations for the same scheduled dose, both records are preserved and an urgent warning is flagged for the care circle.

---

## Monorepo Architecture

```text
elderly-care-platform/
├── apps/
│   ├── mobile/                    # React Native / Expo Mobile App (Expo Router)
│   │   ├── app/(elderly)/         # Today companion, Medicines routine, Emergency
│   │   └── package.json
│   └── web/                       # Next.js 15 Web Dashboard
│       ├── app/                   # App Router pages and API route handlers
│       ├── components/            # ElderlyTodayView, CaregiverDashboardView, FamilyReassuranceView
│       └── package.json
├── packages/
│   ├── shared/                    # Recurrence schedule engine, data store & business logic
│   ├── types/                     # Shared TypeScript domain models & database contracts
│   └── validation/                # Zod schemas for medications, appointments & circles
├── supabase/
│   └── migrations/                # PostgreSQL schema with Row-Level Security & RPCs
├── DEVELOPMENT_STATUS.md          # Phased feature tracking & test verification
└── README.md
```

---

## Quick Start & Running Locally

### Prerequisites
- Node.js v20+ LTS
- npm or pnpm

### 1. Install & Build Shared Packages
```bash
# Build domain types and shared schedule engine
npm run build --workspace=packages/types
npm run build --workspace=packages/validation
npm run build --workspace=packages/shared
```

### 2. Run Automated Test Suite
```bash
cd packages/shared && npx vitest run
```
*Executes all 22 unit and end-to-end integration tests covering schedule recurrence, atomic transitions, 30s live undo, duplicate administration safeguards, and care circle collaboration.*

### 3. Launch Web Dashboard
```bash
cd apps/web && npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the interactive platform.
Use the top persona switcher to instantly toggle between:
- 👵 **Margaret (Elderly Mobile Experience)**: Simulated mobile viewport with full "Today" companion controls.
- 👩‍⚕️ **Sarah (Caregiver Web Dashboard)**: Schedule tracking, administration actions, shift notes, audit log.
- 👨‍💼 **Ramesh (Family Peace-of-Mind Digest)**: Non-intrusive reassurance view.

---

## Database & Supabase Migrations
The database migration is located in [`supabase/migrations/20261115000000_initial_schema.sql`](supabase/migrations/20261115000000_initial_schema.sql).
It configures:
- Row Level Security (RLS) policies ensuring only active circle members can access or edit health records.
- Deterministic unique constraint `(elderly_profile_id, medication_id, scheduled_date, scheduled_time)` on `dose_events`.
- Stored procedures `record_dose_action` and `undo_dose_action` for race-condition-free atomic state changes.
- Append-only `dose_actions` and `audit_events` tables for complete compliance and historical integrity.
