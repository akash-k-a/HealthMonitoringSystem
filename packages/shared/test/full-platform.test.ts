import { describe, it, expect } from 'vitest';
import {
  calculateAdherenceStats,
  checkMedicationRisks,
  getMedicationEducation,
  getTranslation,
  InMemoryPlatformDataStore
} from '../src/index';

describe('Full Platform Phased Capabilities Tests', () => {
  it('calculates adherence statistics and ratings accurately', () => {
    const mockEvents: any[] = [
      { id: '1', status: 'taken' },
      { id: '2', status: 'taken' },
      { id: '3', status: 'taken' },
      { id: '4', status: 'skipped' }
    ];

    const stats = calculateAdherenceStats(mockEvents);
    expect(stats.totalScheduled).toBe(4);
    expect(stats.totalTaken).toBe(3);
    expect(stats.adherencePercentage).toBe(75);
    expect(stats.statusRating).toBe('Good');
  });

  it('detects low inventory alerts and raises safety risk flags', () => {
    const store = new InMemoryPlatformDataStore();
    const profile = Array.from(store.elderlyProfiles.values())[0];
    const medications = Array.from(store.medications.values()).filter(
      (m) => m.elderlyProfileId === profile.id
    );

    const risks = checkMedicationRisks(profile.id, medications);
    expect(risks.length).toBeGreaterThan(0);
    const lowStockRisk = risks.find((r) => r.riskType === 'expiring_refill');
    expect(lowStockRisk).toBeDefined();
    expect(lowStockRisk?.title).toContain('Low Refill Supply');
  });

  it('provides verified educational advice for elderly patients', () => {
    const edu = getMedicationEducation('Metformin 500mg');
    expect(edu.purposePlainLanguage).toContain('blood sugar');
    expect(edu.commonSideEffects.length).toBeGreaterThan(0);
    expect(edu.foodAndDrinkAdvice).toContain('breakfast');
  });

  it('translates UI strings correctly into Malayalam (മലയാളം)', () => {
    expect(getTranslation('en', 'iTookIt')).toBe('I TOOK IT');
    expect(getTranslation('ml', 'iTookIt')).toBe('ഞാൻ മരുന്ന് കഴിച്ചു');
    expect(getTranslation('ml', 'needHelp')).toBe('സഹായം വേണം');
    expect(getTranslation('ml', 'doctorVisit')).toBe('ഡോക്ടർ സന്ദർശനം');
  });

  it('creates and acknowledges caregiver shift handoffs', () => {
    const store = new InMemoryPlatformDataStore();
    const profile = Array.from(store.elderlyProfiles.values())[0];

    const handoff = store.createShiftHandoff(
      profile.id,
      'usr-sarah',
      'Sarah Jenkins',
      'Priya Nair',
      'Patient had peaceful afternoon. Vitals stable.',
      'Amlodipine refill needed tomorrow.',
      ['Check evening BP', 'Give dinner dose']
    );

    expect(handoff.isAcknowledged).toBe(false);
    expect(handoff.observationsSummary).toContain('peaceful afternoon');

    const ack = store.acknowledgeShiftHandoff(handoff.id, 'Priya Nair');
    expect(ack.isAcknowledged).toBe(true);
    expect(ack.incomingCaregiverName).toBe('Priya Nair');
  });

  it('records daily health check-ins and tracks smart pillbox opens', () => {
    const store = new InMemoryPlatformDataStore();
    const profile = Array.from(store.elderlyProfiles.values())[0];

    const checkin = store.recordDailyCheckin(profile.id, {
      date: '2026-11-15',
      mood: 'great',
      painLevel: 1,
      energyLevel: 'high',
      sleepQuality: 'well_rested',
      notes: 'Feeling energetic today'
    });
    expect(checkin.mood).toBe('great');

    // Smart pillbox open
    store.simulatePillboxDispense(profile.id, 2);
    const box = store.smartPillboxes.get(profile.id);
    expect(box?.lastOpenedTime).toBeDefined();
  });
});
