import { describe, it, expect } from 'vitest';
import { InMemoryPlatformDataStore } from '../src/data-store.js';

describe('Phase 1 E2E Collaborative Healthcare Journey', () => {
  it('executes the full multi-persona care coordination lifecycle', () => {
    const store = new InMemoryPlatformDataStore();

    // 1. Verify elderly user & profile setup
    const elderlyProfile = Array.from(store.elderlyProfiles.values())[0];
    expect(elderlyProfile).toBeDefined();
    expect(elderlyProfile.fullName).toBe('Amitabh Bachchan');

    // 2. Care circle contains elderly owner, caregiver Sarah, and family Ramesh
    const circle = Array.from(store.careCircles.values()).find(
      (c) => c.elderlyProfileId === elderlyProfile.id
    );
    expect(circle).toBeDefined();

    const members = Array.from(store.careCircleMembers.values()).filter(
      (m) => m.circleId === circle?.id
    );
    expect(members).toHaveLength(3);
    const roles = members.map((m) => m.role);
    expect(roles).toContain('owner');
    expect(roles).toContain('caregiver');
    expect(roles).toContain('family');

    // 3. Invite a clinician to the circle
    const invite = store.inviteMember(
      circle!.id,
      'usr-sarah',
      'dr.mehta@cityhospital.org',
      'clinician'
    );
    expect(invite.status).toBe('pending');
    expect(invite.invitationCode).toMatch(/^INV-/);

    // Clinician accepts
    const clinicianMember = store.acceptInvitation(invite.invitationCode, {
      id: 'usr-mehta',
      email: 'dr.mehta@cityhospital.org',
      fullName: 'Dr. Mehta',
      role: 'clinician',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    expect(clinicianMember.role).toBe('clinician');
    expect(clinicianMember.status).toBe('active');

    // 4. Caregiver records a new medication with twice-daily schedule
    const medResult = store.addMedication(
      elderlyProfile.id,
      {
        name: 'Atorvastatin',
        genericName: 'Atorvastatin Calcium',
        strength: '10 mg',
        form: 'tablet',
        doseAmount: '1 tablet',
        instructions: 'Take once daily before bedtime',
        foodInstructions: 'no_food_restriction',
        prescriberName: 'Dr. Mehta',
        purpose: 'Cholesterol control',
        isActive: true
      },
      {
        scheduleType: 'daily',
        doseTimes: ['21:00'],
        startDate: new Date().toISOString().split('T')[0]
      },
      'usr-sarah',
      'Sarah Jenkins'
    );

    expect(medResult.medication.name).toBe('Atorvastatin');
    expect(medResult.doseEvents.length).toBeGreaterThan(0);
    expect(medResult.doseEvents[0].routineCategory).toBe('night');

    // 5. Elderly user confirms morning Metformin dose on mobile
    const todayStr = new Date().toISOString().split('T')[0];
    const todayEvents = Array.from(store.doseEvents.values()).filter(
      (e) => e.elderlyProfileId === elderlyProfile.id && e.scheduledDate === todayStr
    );
    const morningDose = todayEvents.find((e) => e.routineCategory === 'morning');
    expect(morningDose).toBeDefined();

    const selfConfirmRes = store.recordDoseAction(
      morningDose!.id,
      'usr-margaret',
      'Amitabh Bachchan',
      'self_confirmed'
    );
    expect(selfConfirmRes.doseEvent.status).toBe('taken');
    expect(selfConfirmRes.doseEvent.resolvedByName).toBe('Amitabh Bachchan');

    // 6. Caregiver administers evening dose on web dashboard
    const eveningDose = todayEvents.find((e) => e.routineCategory === 'evening');
    expect(eveningDose).toBeDefined();

    const caregiverAdminRes = store.recordDoseAction(
      eveningDose!.id,
      'usr-sarah',
      'Sarah Jenkins',
      'caregiver_administered',
      'Administered with dinner'
    );
    expect(caregiverAdminRes.doseEvent.status).toBe('taken');
    expect(caregiverAdminRes.doseEvent.resolutionMethod).toBe('caregiver_administered');
    expect(caregiverAdminRes.doseEvent.resolvedByName).toBe('Sarah Jenkins');

    // 7. Duplicate administration test: Margaret accidentally clicks taken again on the evening dose
    const dupRes = store.recordDoseAction(
      eveningDose!.id,
      'usr-margaret',
      'Amitabh Bachchan',
      'self_confirmed'
    );
    expect(dupRes.duplicateWarning).toBe(true);
    expect(dupRes.doseEvent.hasDuplicateWarning).toBe(true);

    // Verify alert notification raised for circle
    const dupNotif = store.notifications.find((n) => n.type === 'duplicate_warning');
    expect(dupNotif).toBeDefined();

    // 8. Care note with vital signs recorded
    const note = store.addCareNote(elderlyProfile.id, {
      authorUserId: 'usr-sarah',
      authorName: 'Sarah Jenkins',
      category: 'vital_signs',
      content: 'Blood pressure checked after evening walk: 128/82, heart rate 72 bpm',
      vitalSigns: {
        bloodPressureSystolic: 128,
        bloodPressureDiastolic: 82,
        heartRate: 72
      }
    });
    expect(note.category).toBe('vital_signs');

    // 9. Appointment scheduling with preparation checklist
    const apt = store.addAppointment(elderlyProfile.id, {
      doctorName: 'Dr. Sen',
      specialty: 'Ophthalmologist',
      facilityName: 'Vision Eye Hospital',
      locationAddress: 'Brigade Road',
      appointmentTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      purpose: 'Annual glaucoma screening',
      preparationChecklist: ['Bring sunglasses', 'Do not drive yourself'],
      status: 'scheduled',
      createdByUserId: 'usr-sarah'
    });
    expect(apt.preparationChecklist).toHaveLength(2);

    // 10. Audit trail verification: every action was recorded
    const audits = store.auditEvents.filter((a) => a.elderlyProfileId === elderlyProfile.id);
    expect(audits.length).toBeGreaterThan(5);
    const auditActions = audits.map((a) => a.action);
    expect(auditActions).toContain('CREATE_MEDICATION');
    expect(auditActions).toContain('RECORD_DOSE_ACTION');
    expect(auditActions).toContain('CREATE_CARE_NOTE');
  });
});
