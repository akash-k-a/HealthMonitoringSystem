import { NextResponse } from 'next/server';
import { platformDataStore } from '@elderly-care/shared';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get('profileId') || 'elderly-default';

  // Get active elderly profile or first
  const profiles = Array.from(platformDataStore.elderlyProfiles.values());
  const currentProfile = profiles.find((p) => p.id === profileId) || profiles[0];

  if (!currentProfile) {
    return NextResponse.json({ error: 'No profile found' }, { status: 404 });
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const allEvents = Array.from(platformDataStore.doseEvents.values());
  const todayEvents = allEvents.filter(
    (e) => e.elderlyProfileId === currentProfile.id && e.scheduledDate === todayStr
  );

  const medications = Array.from(platformDataStore.medications.values()).filter(
    (m) => m.elderlyProfileId === currentProfile.id
  );

  const appointments = Array.from(platformDataStore.appointments.values()).filter(
    (a) => a.elderlyProfileId === currentProfile.id
  );

  const careNotes = Array.from(platformDataStore.careNotes.values()).filter(
    (n) => n.elderlyProfileId === currentProfile.id
  );

  const emergencyContacts = Array.from(platformDataStore.emergencyContacts.values()).filter(
    (c) => c.elderlyProfileId === currentProfile.id
  );

  const careCircle = Array.from(platformDataStore.careCircles.values()).find(
    (c) => c.elderlyProfileId === currentProfile.id
  );

  const circleMembers = careCircle
    ? Array.from(platformDataStore.careCircleMembers.values()).filter((m) => m.circleId === careCircle.id)
    : [];

  const invitations = careCircle
    ? Array.from(platformDataStore.circleInvitations.values()).filter((i) => i.circleId === careCircle.id)
    : [];

  const auditEvents = platformDataStore.auditEvents.filter(
    (a) => !a.elderlyProfileId || a.elderlyProfileId === currentProfile.id
  );

  const notifications = platformDataStore.notifications;

  return NextResponse.json({
    profile: currentProfile,
    allProfiles: profiles,
    todayEvents,
    medications,
    appointments,
    careNotes,
    emergencyContacts,
    careCircle,
    circleMembers,
    invitations,
    auditEvents: auditEvents.slice(-20).reverse(),
    notifications
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, payload } = body;

    switch (action) {
      case 'RECORD_DOSE': {
        const { doseEventId, actorId, actorName, actionType, notes, adminTime } = payload;
        const result = platformDataStore.recordDoseAction(
          doseEventId,
          actorId,
          actorName,
          actionType,
          notes,
          adminTime
        );
        return NextResponse.json({ success: true, ...result });
      }

      case 'UNDO_DOSE': {
        const { doseEventId, actorId, actorName, reason } = payload;
        const result = platformDataStore.undoDoseAction(doseEventId, actorId, actorName, reason);
        return NextResponse.json({ success: true, ...result });
      }

      case 'ADD_MEDICATION': {
        const { elderlyProfileId, medication, schedule, actorId, actorName } = payload;
        const result = platformDataStore.addMedication(
          elderlyProfileId,
          medication,
          schedule,
          actorId,
          actorName
        );
        return NextResponse.json({ success: true, ...result });
      }

      case 'UPDATE_SCHEDULE': {
        const { medicationId, newSchedule, actorId, actorName, reason } = payload;
        const result = platformDataStore.updateMedicationSchedule(
          medicationId,
          newSchedule,
          actorId,
          actorName,
          reason
        );
        return NextResponse.json({ success: true, schedule: result });
      }

      case 'ADD_APPOINTMENT': {
        const { elderlyProfileId, appointment } = payload;
        const result = platformDataStore.addAppointment(elderlyProfileId, appointment);
        return NextResponse.json({ success: true, appointment: result });
      }

      case 'ADD_CARE_NOTE': {
        const { elderlyProfileId, note } = payload;
        const result = platformDataStore.addCareNote(elderlyProfileId, note);
        return NextResponse.json({ success: true, note: result });
      }

      case 'INVITE_MEMBER': {
        const { circleId, invitedByUserId, email, role } = payload;
        const result = platformDataStore.inviteMember(circleId, invitedByUserId, email, role);
        return NextResponse.json({ success: true, invitation: result });
      }

      case 'CREATE_PATIENT': {
        const { ownerUserId, fullName, preferredName, dateOfBirth, bloodGroup, allergies, medicalConditions } = payload;
        const result = platformDataStore.createElderlyProfile(ownerUserId || 'usr-sarah', {
          fullName,
          preferredName,
          dateOfBirth,
          bloodGroup,
          allergies: allergies || [],
          medicalConditions: medicalConditions || [],
          quietHoursStart: '22:00',
          quietHoursEnd: '07:00'
        });
        return NextResponse.json({ success: true, ...result });
      }

      default:
        return NextResponse.json({ error: `Unknown action ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
