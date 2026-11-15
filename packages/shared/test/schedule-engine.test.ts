import { describe, it, expect } from 'vitest';
import {
  categorizeRoutineTime,
  formatPlainLanguageInstruction,
  generateDoseEventsForDateRange,
  evaluateEscalationStatus,
  detectDuplicateAdministration
} from '../src/schedule-engine.js';
import type { Medication, MedicationSchedule } from '@elderly-care/types';

describe('Schedule Engine Unit Tests', () => {
  describe('categorizeRoutineTime', () => {
    it('categorizes 08:00 as morning', () => {
      expect(categorizeRoutineTime('08:00')).toBe('morning');
      expect(categorizeRoutineTime('11:30')).toBe('morning');
    });

    it('categorizes 13:00 as afternoon', () => {
      expect(categorizeRoutineTime('13:00')).toBe('afternoon');
      expect(categorizeRoutineTime('15:45')).toBe('afternoon');
    });

    it('categorizes 19:30 as evening', () => {
      expect(categorizeRoutineTime('19:30')).toBe('evening');
      expect(categorizeRoutineTime('20:00')).toBe('evening');
    });

    it('categorizes 22:00 and 02:00 as night', () => {
      expect(categorizeRoutineTime('22:00')).toBe('night');
      expect(categorizeRoutineTime('02:00')).toBe('night');
    });
  });

  describe('formatPlainLanguageInstruction', () => {
    it('creates plain morning instruction with breakfast', () => {
      const med: Pick<Medication, 'name' | 'strength' | 'form' | 'doseAmount' | 'foodInstructions' | 'instructions'> = {
        name: 'Metformin',
        strength: '500 mg',
        form: 'tablet',
        doseAmount: '1 tablet',
        foodInstructions: 'with_food'
      };
      const text = formatPlainLanguageInstruction(med, '08:00');
      expect(text).toBe('Take 1 tablet Metformin (500 mg tablet) with breakfast');
    });

    it('creates evening instruction with dinner', () => {
      const med: Pick<Medication, 'name' | 'strength' | 'form' | 'doseAmount' | 'foodInstructions' | 'instructions'> = {
        name: 'Amlodipine',
        strength: '5 mg',
        form: 'tablet',
        doseAmount: '1 tablet',
        foodInstructions: 'with_food'
      };
      const text = formatPlainLanguageInstruction(med, '20:00');
      expect(text).toBe('Take 1 tablet Amlodipine (5 mg tablet) with dinner');
    });
  });

  describe('generateDoseEventsForDateRange', () => {
    const profileId = 'prof-123';
    const medId = 'med-456';

    it('generates twice-daily events for 3 days', () => {
      const schedule: MedicationSchedule = {
        id: 'sched-1',
        medicationId: medId,
        scheduleType: 'daily',
        doseTimes: ['08:00', '20:00'],
        startDate: '2026-11-15',
        createdAt: new Date().toISOString()
      };

      const events = generateDoseEventsForDateRange(
        profileId,
        medId,
        schedule,
        '2026-11-15',
        '2026-11-17'
      );

      // 3 days * 2 doses/day = 6 events
      expect(events).toHaveLength(6);
      expect(events[0].scheduledDate).toBe('2026-11-15');
      expect(events[0].scheduledTime).toBe('08:00:00');
      expect(events[0].routineCategory).toBe('morning');
      expect(events[1].scheduledTime).toBe('20:00:00');
      expect(events[1].routineCategory).toBe('evening');
    });

    it('returns empty array for PRN / as_needed medications', () => {
      const schedule: MedicationSchedule = {
        id: 'sched-prn',
        medicationId: medId,
        scheduleType: 'as_needed',
        doseTimes: [],
        startDate: '2026-11-15',
        createdAt: new Date().toISOString()
      };

      const events = generateDoseEventsForDateRange(
        profileId,
        medId,
        schedule,
        '2026-11-15',
        '2026-11-20'
      );

      expect(events).toHaveLength(0);
    });

    it('generates specific days of week only', () => {
      // 2026-11-15 is Sunday, 2026-11-16 is Monday, 2026-11-17 is Tuesday
      const schedule: MedicationSchedule = {
        id: 'sched-mwf',
        medicationId: medId,
        scheduleType: 'specific_days',
        daysOfWeek: ['monday', 'wednesday'],
        doseTimes: ['09:00'],
        startDate: '2026-11-15',
        createdAt: new Date().toISOString()
      };

      const events = generateDoseEventsForDateRange(
        profileId,
        medId,
        schedule,
        '2026-11-15',
        '2026-11-17'
      );

      // Only Monday 2026-11-16 matches
      expect(events).toHaveLength(1);
      expect(events[0].scheduledDate).toBe('2026-11-16');
    });
  });

  describe('evaluateEscalationStatus', () => {
    it('returns none if already taken', () => {
      const now = new Date('2026-11-15T10:00:00Z');
      const status = evaluateEscalationStatus('2026-11-15', '08:00', 'taken', now);
      expect(status).toBe('none');
    });

    it('returns due during initial 30 minute window', () => {
      const now = new Date('2026-11-15T08:15:00Z');
      const status = evaluateEscalationStatus('2026-11-15', '08:00', 'scheduled', now, 30);
      expect(status).toBe('due');
    });

    it('escalates to caregiver after grace period (30-60m)', () => {
      const now = new Date('2026-11-15T08:45:00Z');
      const status = evaluateEscalationStatus('2026-11-15', '08:00', 'scheduled', now, 30);
      expect(status).toBe('unconfirmed_caregiver');
    });

    it('escalates to backup contact after double grace period (>60m)', () => {
      const now = new Date('2026-11-15T09:30:00Z');
      const status = evaluateEscalationStatus('2026-11-15', '08:00', 'scheduled', now, 30);
      expect(status).toBe('escalate_backup');
    });
  });

  describe('detectDuplicateAdministration', () => {
    it('flags duplicate when different actors report taken', () => {
      const isDuplicate = detectDuplicateAdministration('taken', 'caregiver_administered', 'user-elderly', 'user-caregiver');
      expect(isDuplicate).toBe(true);
    });

    it('does not flag duplicate when same actor repeats or amends', () => {
      const isDuplicate = detectDuplicateAdministration('taken', 'self_confirmed', 'user-elderly', 'user-elderly');
      expect(isDuplicate).toBe(false);
    });

    it('does not flag duplicate when previous status was scheduled', () => {
      const isDuplicate = detectDuplicateAdministration('scheduled', 'self_confirmed', undefined, 'user-elderly');
      expect(isDuplicate).toBe(false);
    });
  });
});
