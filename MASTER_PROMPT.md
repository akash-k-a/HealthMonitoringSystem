# MASTER BUILD PROMPT
## Collaborative Elderly Healthcare Management Platform

**Instructions for the AI coding agent:** Read this entire document and the accompanying `references/UI_Design_Goal_Original.txt` before making changes. Treat both as project requirements. The original UI design reference contains specific screen flows, examples, accessibility requirements, and success metrics; preserve their intent. Where this master prompt adds later decisions from the project discussions, use the more recent decision.

---

# 1. Your role and working method

Act as a senior product architect, full-stack engineer, mobile engineer, database designer, security engineer, accessibility specialist, and QA engineer.

Build a functional, phased healthcare management platform. This is not a static mockup and not merely a medication reminder app.

**Build Phase 1 only at first.** Understand the complete roadmap so the architecture can accommodate later phases, but do not prematurely implement all future features. Begin by presenting a concise architecture, data model, screen map, and Phase 1 implementation plan. Wait for approval before major implementation.

Work incrementally. After each feature, run it, test it, check database persistence and authorization, fix defects, and update `DEVELOPMENT_STATUS.md`. Never claim something works unless it has been tested. Do not replace real functionality with non-working buttons or hardcoded mock data.

Ask before major changes to the agreed architecture. Explain technical choices in accessible language.

# 2. Product vision

Create an elderly-centred collaborative healthcare platform that helps elderly individuals manage medication routines and appointments while allowing authorized family members, caregivers, and clinicians to coordinate care through one shared record.

The platform should support:
- Elderly individuals primarily through a simple, accessible mobile experience.
- Caregivers and family members through mobile and desktop web experiences.
- Clinicians through a focused web experience for information explicitly shared with them.

**Core principle: one elderly person's shared care profile, multiple authorized contributors, one consistent source of truth.**

All interfaces must use the same backend and database. A change made by an authorized caregiver on the web must appear on the elderly person's mobile device and other authorized members' interfaces.

# 3. Platform and recommended technology

Build two client experiences over one shared backend:

## Mobile
- React Native, Expo, TypeScript, Expo Router.
- Prioritize Android for the first working demonstration; keep iOS compatibility in mind.
- Design primarily for elderly users, with large controls and a calm “Today” companion experience.
- Caregivers and family members may also use the mobile app.

## Web
- Next.js, React, TypeScript.
- Responsive desktop-first dashboard for caregivers, family members, and clinicians.
- The web dashboard can be denser than the elderly mobile interface, but must remain accessible and responsive.

## Backend
- Supabase: PostgreSQL, Authentication, Realtime, Edge Functions, and Storage where appropriate.
- Use server-side functions for sensitive workflows and scheduled jobs.
- Use database Row Level Security (RLS) for actual authorization. Hiding UI controls is not security.
- Keep secrets in environment variables. Never expose service-role keys in client code.

## Repository
Use a maintainable monorepo, for example:

```text
/apps
  /mobile
  /web
/packages
  /shared
  /types
  /validation
/supabase
  /migrations
  /functions
/docs
```

Share domain types, validation, and business rules where appropriate. Do not force every UI component to be shared if the mobile and desktop experiences have different interaction needs.

Document setup, environment variables, migrations, and deployment. Do not invent credentials or claim integrations are configured when they are not.

# 4. Users, shared access, and autonomy

Support these user types:
1. Elderly individual / profile owner.
2. Family member.
3. Caregiver.
4. Clinician.

## Shared editing decision

The project owner has explicitly chosen this default: **every invited and authorized member can view and edit shared care information.**

This includes adding and updating medication information, schedules, dose records, appointments, and care notes, subject to the safety and authorization rules below.

Do not silently restrict all edits to a single primary caregiver. Do not give anonymous users access. Every action must be tied to an authenticated individual.

The elderly profile owner must be able to:
- Approve or reject invitations.
- See who has access.
- Revoke access.
- Review access and activity history.
- Configure notification preferences and quiet hours.

Keep a permission model extensible so that more granular permissions can be introduced in Phase 3. A clinician only sees information explicitly shared with them and relevant to their involvement. A family member or caregiver can record a clinician's instruction, but recording an instruction does not make that person a prescriber.

For situations where a legally authorized representative is required, record the basis of representation and consent appropriately. Use least-privilege access.

## Auditability

For every meaningful create, update, confirmation, correction, and access event, record:
- Actor/user ID.
- Action.
- Resource type and ID.
- Timestamp.
- Previous and new values when applicable.
- Reason/source when applicable.
- Device or request metadata only where appropriate and privacy-conscious.

Do not silently erase history.

# 5. Product design and UX requirements

Read `references/UI_Design_Goal_Original.txt` carefully. Its screen examples and interaction flows are design requirements, not decorative inspiration.

## 5.1 Elderly mobile experience: “Today” companion

The elderly user should open into a calm **Today** screen, not a dense medical dashboard.

The main question the screen answers is: **“What do I need to do now?”**

Show:
- A friendly greeting and date.
- The current or next medication task prominently.
- Plain-language medication instruction.
- One obvious primary action.
- “Need help” and “Not today” as secondary actions.
- The next upcoming task, visually secondary.
- The next appointment, if relevant.
- Simple navigation such as Today, Medicines, Appointments, Help (and Family if needed).

Do not show the entire medication catalogue on the home screen. Avoid information overload.

Use plain language such as “Take 1 blood-pressure tablet with breakfast,” rather than unexplained clinical terminology. Medication descriptions and purposes must come from entered or verified information; do not invent them.

## 5.2 Accessibility

- Default body text approximately 18–20 pt where practical.
- Allow text and icon enlargement up to 200%.
- High contrast: target at least 4.5:1 for normal text and 3:1 for large text.
- Large, forgiving controls; mobile primary buttons around 56–64 px high.
- At least 44 × 44 CSS-pixel touch targets.
- Pair color with icons and text; never use color alone to communicate status.
- Support screen readers with meaningful labels.
- Do not require swipe-only or multi-finger gestures.
- Provide dark mode, high-contrast mode, reduced motion, adjustable text size.
- Provide clear save/error feedback and recovery instructions.
- Optional sound and vibration should be user-configurable.
- Avoid unnecessary animation, dense forms, jargon, and tiny controls.

Test with older adults where possible, including people with reduced vision, tremor, arthritis, mild cognitive impairment, and limited smartphone experience. Do not assume every older person has the same abilities.

## 5.3 Medication confirmation interaction

The original UI reference proposes a fast confirmation with a visible success state and a 30-second undo period. Implement this carefully:

1. User taps “I took it”.
2. Show a clear confirmation, including medication and recorded time.
3. Provide Undo for approximately 30 seconds.
4. Persist the action and its audit record.
5. If undone, record the correction; do not erase the original event.

A brief confirmation step may be used if user testing shows it prevents accidental taps without making the experience burdensome. Do not add unnecessary confirmation dialogs to every action.

“Not today” should record a skipped dose and can offer simple reasons such as feeling unwell, doctor instructed to skip, or forgot. Do not infer medical advice from the reason.

For a relevant food instruction, the interface may ask whether the user followed it, but “I’m not sure” must lead to contacting a caregiver/pharmacist, not a dosage recommendation.

## 5.4 Medication list

Present medicines as routines rather than a dense clinical table:
- Morning / with breakfast.
- Afternoon.
- Evening / after dinner.
- Night / before bed.

Each medicine card can show name, strength, dose, verified purpose if available, schedule, instructions, and current status.

A future “Why am I taking this?” card may show verified purpose, common side effects, and an “Ask my doctor or pharmacist” action. Do not invent medicine purposes or side-effect information.

## 5.5 Appointment screen

Show appointment date/time, clinician, location, purpose, transport arrangement if entered, and preparation checklist. Include actions such as viewing details, adding to calendar where supported, sharing details with authorized family, and setting a reminder.

Automatic appointment preparation PDFs belong to a later phase, not Phase 1.

## 5.6 Caregiver web dashboard

Provide operational clarity:
- Select an elderly profile the user is authorized to access.
- Today's dose summary.
- Unconfirmed or missed-dose events needing attention.
- Next important dose.
- Upcoming appointments.
- Recent care notes and updates.
- Refill or other alerts only when implemented.
- Actions such as mark dose administered, add note, contact, and future shift handoff.

Caregiver actions must identify who administered a dose and when. Do not send caregivers every routine event.

## 5.7 Family view

Provide reassurance without alert overload:
- Daily medication summary.
- Upcoming appointments.
- Important recent updates.
- Urgent alerts when configured.
- View history, contact caregiver, and encouragement actions where appropriate.

Do not default to a noisy continuous feed or send every routine dose confirmation. Daily digest is a later-phase feature unless needed for the Phase 1 demonstration.

## 5.8 Onboarding

Use a caregiver-assisted but elderly-controlled onboarding flow:
1. Explain the app in plain language.
2. Create account and secure access (PIN/biometric options where supported).
3. Add trusted people and obtain the elderly person's approval.
4. Configure preferred reminders.
5. Set an emergency contact.
6. Provide a guided practice using a sample dose.
7. Explain that trusted people can help only with the access granted.

Do not use a sample dose as a real medication event.

# 6. Phase roadmap

Implement only Phase 1 now. Keep the architecture ready for the later phases.

## PHASE 1 — Core healthcare management MVP

### A. Authentication
- Registration, login, logout.
- Password recovery.
- Secure sessions.
- Profile management.
- PIN/passcode or biometric unlock where supported by the chosen platform and implemented securely.
- Role and profile association.

### B. Elderly healthcare profile
Fields may include:
- Name and date of birth.
- Contact details and address.
- Medical conditions.
- Allergies.
- Doctor information.
- Emergency contacts.
- Care preferences.

Collect only information needed for the prototype. Protect all health information.

### C. Care circle
- Create a shared care circle for an elderly profile.
- Invite family, caregivers, and clinicians.
- Invitation accept/reject.
- List authorized members and their roles.
- Revoke access.
- Show membership and access status.
- Every invited and authorized member can update shared care information by default, subject to the clinical safety boundaries and access revocation.

### D. Medication management
Implement create, read, update, and archive/deactivate operations for:
- Medication name.
- Strength.
- Form (tablet, capsule, liquid, etc.).
- Dose amount.
- Prescriber.
- Instructions.
- Food instructions.
- Start and end dates.
- Source of instruction.
- Active/inactive state.
- Notes.

Support daily, weekly, interval-based, and as-needed schedules. Support multiple dose times in a day. PRN/as-needed medication must not be treated as a mandatory scheduled dose.

### E. Schedule history
When an authorized member records a schedule change:
- Capture who made the change.
- Capture date/time.
- Capture previous and new schedule.
- Capture reason/source and effective date.
- Preserve old schedule versions.
- Do not rewrite past dose events.
- Regenerate future events according to the new effective schedule.

A user may record a doctor's instruction, but the app must not represent an unverified change as a clinician-approved prescription. The UI should make the source clear.

### F. Dose events and statuses
Generate one DoseEvent for each scheduled dose.

Statuses:
- Taken.
- Skipped.
- Snoozed.
- Unconfirmed.
- Needs help.

Distinguish confirmation method:
- Elderly person self-confirmed.
- Caregiver administered and recorded.
- Another authorized member recorded the event.

Store scheduled time, actual administration time if known, status, confirming member, method, notes, and correction history.

Do not automatically equate “unconfirmed” with “missed”. Do not tell users to take an extra dose.

### G. Caregiver administration
Provide an explicit “I administered this medication” action.

On recording:
- Save the caregiver's identity.
- Save actual administration time.
- Update the shared DoseEvent.
- Cancel/suppress further reminders for that dose when appropriate.
- Broadcast the updated status to all connected interfaces.
- Show who recorded it and when.

The elderly user's interface must not prompt them to take a dose already recorded as administered.

### H. Undo and correction
- Immediate, clear feedback.
- Approximately 30-second undo opportunity for a dose confirmation.
- Allow authorized correction after that period through a controlled correction flow.
- Preserve the original action and correction history.
- Record actor, timestamp, and reason where appropriate.

### I. Duplicate-dose safeguards
A scheduled dose has one stable, unique DoseEvent ID.

- All members see the same shared status.
- Use atomic state transitions and idempotent requests.
- If a second member attempts to record an already-resolved event, show who recorded it and when.
- Handle simultaneous requests safely.
- Do not create duplicate dose records from repeated taps or network retries.

Important: software can prevent duplicate records but cannot guarantee that two people did not physically administer the medicine. If two members report separate physical administrations for the same scheduled dose, preserve both reports, flag possible duplicate administration, and prompt appropriate human/clinical follow-up. Never silently overwrite or declare the situation safe.

### J. Reminders and escalation
Implement a testable, configurable workflow:
1. Generate DoseEvent from an active schedule.
2. Optionally remind the elderly person 10–15 minutes before.
3. Remind at dose time if still relevant.
4. Wait a configurable grace period.
5. If unresolved, notify a designated caregiver.
6. If still unresolved, escalate to a designated backup contact.
7. Stop escalation once acknowledged/resolved.

The example timing is configurable, not a clinical recommendation. Keep “unconfirmed” distinct from “confirmed missed”. Log notification attempts, delivery/acknowledgement where available, and manual actions.

Use a reliable server-side scheduler/background mechanism. Do not rely on a browser tab remaining open. If the chosen backend cannot support the intended scheduling directly, explain and implement a suitable documented alternative.

### K. Notification policy
Default priorities:
- Elderly person: medication reminders, appointment reminders, important updates.
- Caregiver: unresolved/unconfirmed doses needing attention, missed-dose alerts, appointment changes, medication schedule changes, emergency alerts.
- Family: important missed-medication alerts, upcoming or changed appointments, emergencies, and important medication changes.

Do not send all family members every routine confirmation. Support member-specific preferences and quiet hours. Avoid sensitive medical details in email subject lines or lock-screen previews.

### L. Appointments
- Create, view, update, cancel appointments.
- Clinician/doctor name.
- Clinic/hospital and location.
- Date/time.
- Purpose.
- Preparation notes.
- Reminder settings.
- History.
- Notify relevant authorized members of important changes.

### M. Emergency information
Provide a prominent Help/Emergency area with:
- Emergency contacts.
- Allergies.
- Current medication list.
- Relevant conditions.
- A prepared message.
- Location sharing only where supported and explicitly permitted.

Clearly distinguish displaying emergency details from actually sending a message. Never claim emergency services were contacted unless a real integration confirms it.

## PHASE 2 — Adherence, insights, and basic offline support
- One-tap confirmation refinements.
- Smart timeline.
- Daily/weekly adherence dashboard.
- Missed/skipped dose reports.
- Medication inventory and refill reminders.
- Health check-ins.
- Family reassurance feed/daily digest.
- Caregiver activity feed.
- Basic offline dose recording.

Offline requirements:
- Cache today's medication schedule, relevant upcoming appointments, and emergency contacts.
- Allow dose recording offline.
- Queue actions locally with unique operation IDs.
- Preserve event time and actor.
- Synchronize when connection returns.
- Make server processing idempotent.
- Resolve conflicts transparently.
- Do not issue stale missed-dose alerts after reconnecting if the dose was recorded offline.
- Explain that email/SMS/remote push cannot be guaranteed while offline.

## PHASE 3 — Advanced collaboration and safety
- Granular permissions.
- Full audit/access history.
- Caregiver shift handoff.
- Structured handoff of doses, concerns, observations, refills, and next actions.
- Caregiver task assignment and responsibility per dose/shift.
- Advanced offline synchronization and conflict resolution.
- Notification delivery/acknowledgement tracking.
- Care notes with visibility settings.
- Advanced emergency workflows.

## PHASE 4 — Verified healthcare assistance
- Medication risk flags for duplicate therapies, expired prescriptions, missing refill information, potential interactions, and poor adherence.
- Use a verified medication database, licensed interaction service, or pharmacist-reviewed rules.
- “Why this medicine?” cards using verified content.
- Appointment preparation PDF with medication list, adherence summary, symptoms/observations, questions, and document checklist.
- Voice-assisted check-ins.
- Multilingual support, initially English and Malayalam.
- Daily family summaries.

Never present raw generative AI output as medical advice. Never diagnose, prescribe, discontinue, or alter treatment.

## PHASE 5 — Integrations
- Bluetooth pillbox or dispenser.
- Wearables.
- Health platform integrations.
- ABHA/ABDM where appropriate, authorized, and technically feasible.
- Pharmacy and teleconsultation integrations.

These are future possibilities, not Phase 1 requirements.

# 7. Reminder and event state rules

Implement explicit, documented state transitions. A useful conceptual model is:

- Scheduled → Due → Taken
- Scheduled/Due → Skipped
- Scheduled/Due → Snoozed → Due
- Scheduled/Due → Unconfirmed
- Unconfirmed → Acknowledged by caregiver / resolved
- Any recorded state → Corrected through an auditable correction action

Do not force a dose into “missed” solely because no one responded. A missed-dose classification should follow an explicitly configured policy and remain distinguishable from uncertainty.

A caregiver acknowledgement (“I am checking on the person”) should be distinguishable from confirmation that the medication was administered.

# 8. Database design

Use PostgreSQL with migrations, foreign keys, indexes, constraints, and transactions.

Core entities:
- User
- ElderlyProfile
- CareCircle
- CareCircleMember
- Invitation
- Medication
- MedicationSchedule
- MedicationScheduleHistory
- DoseEvent
- DoseAction
- Appointment
- CareNote
- EmergencyContact
- Notification
- AuditEvent
- ConsentRecord

Add entities only when justified, for example notification preferences, escalation rules, or offline operation tracking.

Key invariants:
1. A profile has a stable unique ID.
2. A profile can have multiple authorized members.
3. One medication may have multiple schedule versions over time.
4. Each scheduled occurrence has a stable unique DoseEvent ID.
5. Past DoseEvents are immutable in history; corrections are appended.
6. Every change has an actor.
7. Schedule changes preserve old versions and effective dates.
8. Notification events are traceable.
9. RLS protects every private record.
10. Repeated requests must not create duplicate dose actions.

Create an ER diagram and explain the important relationships.

# 9. Security, privacy, and medical safety

Implement:
- Secure authentication.
- Server-side authorization.
- RLS policies.
- Secure session handling.
- Consent and access revocation.
- Audit logs.
- Environment variable management.
- Input validation.
- Privacy-conscious logging.
- Backup and recovery documentation.

Do not expose sensitive health information unnecessarily in notifications. Minimize collected data.

This is a prototype, not a certified medical device or a claim of legal compliance. For an India-focused project, consider the Digital Personal Data Protection framework and applicable health-data requirements. Do not claim HIPAA compliance merely because access controls or audit logs exist.

Medical safety:
- The app is not a doctor.
- Do not diagnose.
- Do not prescribe.
- Do not recommend extra doses.
- Do not independently change treatment.
- Clearly distinguish entered information from verified clinical information.
- Escalate uncertainty to an appropriate human professional/contact.

# 10. Testing and acceptance criteria

Test real workflows, not just page rendering.

At minimum test:
1. Registration and login.
2. Elderly profile creation.
3. Invitation and acceptance.
4. Authorized member edits a medication.
5. Update appears on another device/interface.
6. Schedule creates correct DoseEvents.
7. Elderly person confirms a dose.
8. Caregiver records administration.
9. Another caregiver sees the shared resolved state.
10. Accidental confirmation can be undone.
11. Schedule change preserves old and past records.
12. Unconfirmed event triggers the configured escalation.
13. Family does not receive routine dose-confirmation noise.
14. Unauthorized access is denied by RLS.
15. Revoked member loses access.
16. Appointment update synchronizes.
17. Duplicate network submission does not duplicate the event.
18. Simultaneous updates are handled safely.

Phase 1 is complete only when:
- Authentication works.
- Profile and care-circle workflows work.
- Authorized members can update shared information.
- Medication CRUD and schedule management work.
- DoseEvents and statuses work.
- Caregiver administration works.
- Undo/correction history works.
- Duplicate submission protection works.
- Appointments work.
- Reminder/escalation workflow is testable.
- Emergency information is available.
- Data persists in the real database.
- Mobile and web show consistent shared data.
- RLS prevents unauthorized access.
- Setup and test instructions are documented.

# 11. Development deliverables

Maintain:
- `README.md`
- `DEVELOPMENT_STATUS.md`
- Database migrations.
- ER diagram.
- Architecture notes.
- Environment variable example file with placeholders only.
- Automated tests.
- Manual test checklist.
- Setup and run instructions.
- Known limitations.

After each feature, update the development status. Do not mark incomplete or untested work as complete.

# 12. First action required

Before coding:
1. Read this master prompt and the original UI design reference.
2. Summarize the requirements and identify any conflicts or ambiguities.
3. Present the proposed architecture and monorepo structure.
4. Present the database entities and relationships.
5. Present the Phase 1 screen map for mobile and web.
6. Present the Phase 1 implementation sequence and testing plan.
7. Identify any external services, credentials, or deployment choices that require my input.

Do not start implementing the entire application before presenting this plan.

After approval, implement Phase 1 incrementally. At the end of Phase 1, demonstrate the complete shared-care journey and wait for approval before Phase 2.

**Final product goal:** a safe, accessible, elderly-centred collaborative healthcare platform where authorized people can coordinate care through one shared, auditable, synchronized system.
