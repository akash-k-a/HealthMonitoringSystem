import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryPlatformDataStore } from '../src/data-store.js';

describe('Platform Data Store Tests', () => {
  let store: InMemoryPlatformDataStore;

  beforeEach(() => {
    store = new InMemoryPlatformDataStore();
  });

  it('initializes with seed data correctly', () => {
    expect(store.elderlyProfiles.size).toBe(1);
    const profile = Array.from(store.elderlyProfiles.values())[0];
    expect(profile.fullName).toBe('Amitabh Bachchan');
    expect(profile.allergies).toContain('Penicillin');

    // 2 seed medications
    expect(store.medications.size).toBe(2);

    // Dose events generated for today + 6 days
    expect(store.doseEvents.size).toBeGreaterThan(0);

    // 1 appointment
    expect(store.appointments.size).toBe(1);
  });

  it('records elderly dose confirmation and allows 30-second undo', () => {
    const events = Array.from(store.doseEvents.values());
    const morningEvent = events.find((e) => e.routineCategory === 'morning');
    expect(morningEvent).toBeDefined();

    if (!morningEvent) return;

    // Elderly self-confirms
    const res = store.recordDoseAction(
      morningEvent.id,
      'usr-margaret',
      'Amitabh Bachchan',
      'self_confirmed'
    );

    expect(res.doseEvent.status).toBe('taken');
    expect(res.doseEvent.resolutionMethod).toBe('self_confirmed');
    expect(res.doseEvent.resolvedByName).toBe('Amitabh Bachchan');

    // Elderly hits undo
    const undoRes = store.undoDoseAction(
      morningEvent.id,
      'usr-margaret',
      'Amitabh Bachchan',
      'Accidentally pressed taken'
    );

    expect(undoRes.doseEvent.status).toBe('scheduled');
    expect(undoRes.doseEvent.resolutionMethod).toBe('undone');
    expect(undoRes.doseEvent.resolvedByName).toBeUndefined();

    // Verify history preserved in doseActions
    const actions = Array.from(store.doseActions.values()).filter((a) => a.doseEventId === morningEvent.id);
    expect(actions).toHaveLength(2); // confirmed + undone
  });

  it('records caregiver administration with full audit trail', () => {
    const events = Array.from(store.doseEvents.values());
    const eveningEvent = events.find((e) => e.routineCategory === 'evening');
    expect(eveningEvent).toBeDefined();
    if (!eveningEvent) return;

    const res = store.recordDoseAction(
      eveningEvent.id,
      'usr-sarah',
      'Sarah Jenkins',
      'caregiver_administered',
      'Given with dinner'
    );

    expect(res.doseEvent.status).toBe('taken');
    expect(res.doseEvent.resolutionMethod).toBe('caregiver_administered');
    expect(res.doseEvent.resolvedByName).toBe('Sarah Jenkins');

    const lastAudit = store.auditEvents[store.auditEvents.length - 1];
    expect(lastAudit.action).toBe('RECORD_DOSE_ACTION');
    expect(lastAudit.actorUserId).toBe('usr-sarah');
  });

  it('detects and flags duplicate administration when two users report taking the same dose', () => {
    const events = Array.from(store.doseEvents.values());
    const testEvent = events[0];

    // Caregiver administers
    store.recordDoseAction(
      testEvent.id,
      'usr-sarah',
      'Sarah Jenkins',
      'caregiver_administered'
    );

    // Elderly also reports self-confirmed later
    const duplicateRes = store.recordDoseAction(
      testEvent.id,
      'usr-margaret',
      'Amitabh Bachchan',
      'self_confirmed'
    );

    expect(duplicateRes.duplicateWarning).toBe(true);
    expect(duplicateRes.doseEvent.hasDuplicateWarning).toBe(true);

    // Verify urgent notification logged
    const alertNotif = store.notifications.find((n) => n.type === 'duplicate_warning');
    expect(alertNotif).toBeDefined();
    expect(alertNotif?.title).toContain('Duplicate');
  });

  it('updates medication schedule and preserves schedule history', () => {
    const med = Array.from(store.medications.values())[0];

    store.updateMedicationSchedule(
      med.id,
      {
        scheduleType: 'daily',
        doseTimes: ['09:00', '21:00'],
        startDate: '2026-11-15'
      },
      'usr-sarah',
      'Sarah Jenkins',
      'Dr. Mehta adjusted dosage times'
    );

    expect(store.medicationScheduleHistories).toHaveLength(1);
    expect(store.medicationScheduleHistories[0].reasonForChange).toBe('Dr. Mehta adjusted dosage times');
    expect(store.medicationScheduleHistories[0].changedByName).toBe('Sarah Jenkins');
  });
});
