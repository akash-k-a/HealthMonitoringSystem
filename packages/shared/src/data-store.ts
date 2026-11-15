import type {
  UserProfile,
  ElderlyProfile,
  CareCircle,
  CareCircleMember,
  CircleInvitation,
  Medication,
  MedicationSchedule,
  MedicationScheduleHistory,
  DoseEvent,
  DoseAction,
  Appointment,
  CareNote,
  EmergencyContact,
  NotificationRecord,
  AuditEvent,
  DoseStatus,
  DoseActionType
} from '@elderly-care/types';
import { generateDoseEventsForDateRange, detectDuplicateAdministration } from './schedule-engine';

export class InMemoryPlatformDataStore {
  public userProfiles: Map<string, UserProfile> = new Map();
  public elderlyProfiles: Map<string, ElderlyProfile> = new Map();
  public careCircles: Map<string, CareCircle> = new Map();
  public careCircleMembers: Map<string, CareCircleMember> = new Map();
  public circleInvitations: Map<string, CircleInvitation> = new Map();
  public medications: Map<string, Medication> = new Map();
  public medicationSchedules: Map<string, MedicationSchedule> = new Map();
  public medicationScheduleHistories: MedicationScheduleHistory[] = [];
  public doseEvents: Map<string, DoseEvent> = new Map();
  public doseActions: Map<string, DoseAction> = new Map();
  public appointments: Map<string, Appointment> = new Map();
  public careNotes: Map<string, CareNote> = new Map();
  public emergencyContacts: Map<string, EmergencyContact> = new Map();
  public notifications: NotificationRecord[] = [];
  public auditEvents: AuditEvent[] = [];

  private listeners: Array<(event: { type: string; payload: any }) => void> = [];

  constructor() {
    this.seedDefaultData();
  }

  public subscribe(callback: (event: { type: string; payload: any }) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private broadcast(type: string, payload: any) {
    for (const listener of this.listeners) {
      listener({ type, payload });
    }
  }

  private logAudit(
    actorId: string,
    actorName: string,
    action: string,
    resourceType: string,
    resourceId: string,
    elderlyProfileId?: string,
    prev?: any,
    next?: any,
    reason?: string
  ) {
    const audit: AuditEvent = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      actorUserId: actorId,
      actorName,
      action,
      resourceType,
      resourceId,
      elderlyProfileId,
      previousValue: prev,
      newValue: next,
      reason,
      createdAt: new Date().toISOString()
    };
    this.auditEvents.push(audit);
  }

  // --- Profiles & Circles ---
  public createUser(profile: UserProfile): UserProfile {
    this.userProfiles.set(profile.id, profile);
    this.logAudit(profile.id, profile.fullName, 'CREATE_USER', 'user_profile', profile.id);
    return profile;
  }

  public createElderlyProfile(
    ownerUserId: string,
    data: Omit<ElderlyProfile, 'id' | 'ownerUserId' | 'createdAt' | 'updatedAt'>
  ): { elderlyProfile: ElderlyProfile; careCircle: CareCircle } {
    const owner = this.userProfiles.get(ownerUserId);
    const profileId = `elderly-${Date.now()}`;
    const now = new Date().toISOString();

    const profile: ElderlyProfile = {
      id: profileId,
      ownerUserId,
      ...data,
      createdAt: now,
      updatedAt: now
    };
    this.elderlyProfiles.set(profileId, profile);

    const circleId = `circle-${profileId}`;
    const circle: CareCircle = {
      id: circleId,
      elderlyProfileId: profileId,
      name: `${data.fullName}'s Care Circle`,
      createdAt: now
    };
    this.careCircles.set(circleId, circle);

    // Add owner as circle member
    const memberId = `member-${ownerUserId}-${circleId}`;
    const member: CareCircleMember = {
      id: memberId,
      circleId,
      userId: ownerUserId,
      user: owner,
      role: 'owner',
      canEdit: true,
      status: 'active',
      joinedAt: now
    };
    this.careCircleMembers.set(memberId, member);

    this.logAudit(ownerUserId, owner?.fullName || 'Owner', 'CREATE_ELDERLY_PROFILE', 'elderly_profile', profileId, profileId);
    return { elderlyProfile: profile, careCircle: circle };
  }

  public inviteMember(
    circleId: string,
    invitedByUserId: string,
    email: string,
    role: 'caregiver' | 'family' | 'clinician'
  ): CircleInvitation {
    const inviter = this.userProfiles.get(invitedByUserId);
    const code = `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const invite: CircleInvitation = {
      id: `invite-${Date.now()}`,
      circleId,
      invitedByUserId,
      invitedEmail: email.toLowerCase(),
      invitedRole: role,
      invitationCode: code,
      status: 'pending',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    };
    this.circleInvitations.set(invite.id, invite);
    this.logAudit(invitedByUserId, inviter?.fullName || 'Inviter', 'INVITE_MEMBER', 'circle_invitation', invite.id);
    return invite;
  }

  public acceptInvitation(invitationCode: string, acceptingUser: UserProfile): CareCircleMember {
    const invite = Array.from(this.circleInvitations.values()).find(
      (inv) => inv.invitationCode === invitationCode && inv.status === 'pending'
    );
    if (!invite) {
      throw new Error('Invalid or expired invitation code');
    }

    invite.status = 'accepted';
    this.createUser(acceptingUser);

    const memberId = `member-${acceptingUser.id}-${invite.circleId}`;
    const member: CareCircleMember = {
      id: memberId,
      circleId: invite.circleId,
      userId: acceptingUser.id,
      user: acceptingUser,
      role: invite.invitedRole,
      canEdit: true,
      status: 'active',
      joinedAt: new Date().toISOString()
    };
    this.careCircleMembers.set(memberId, member);

    this.logAudit(acceptingUser.id, acceptingUser.fullName, 'ACCEPT_INVITATION', 'care_circle_member', memberId);
    return member;
  }

  // --- Medications & Schedules ---
  public addMedication(
    elderlyProfileId: string,
    medData: Omit<Medication, 'id' | 'elderlyProfileId' | 'createdAt' | 'updatedAt' | 'activeSchedule'>,
    scheduleData: Omit<MedicationSchedule, 'id' | 'medicationId' | 'createdAt'>,
    actorId: string,
    actorName: string
  ): { medication: Medication; schedule: MedicationSchedule; doseEvents: DoseEvent[] } {
    const medId = `med-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    const now = new Date().toISOString();

    const medication: Medication = {
      id: medId,
      elderlyProfileId,
      ...medData,
      createdAt: now,
      updatedAt: now
    };
    this.medications.set(medId, medication);

    const schedId = `sched-${medId}`;
    const schedule: MedicationSchedule = {
      id: schedId,
      medicationId: medId,
      ...scheduleData,
      createdAt: now
    };
    this.medicationSchedules.set(schedId, schedule);
    medication.activeSchedule = schedule;

    // Generate dose events for today + next 6 days
    const todayStr = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const generated = generateDoseEventsForDateRange(elderlyProfileId, medId, schedule, todayStr, nextWeek);

    const createdDoseEvents: DoseEvent[] = [];
    for (const g of generated) {
      const eventId = `dose-${g.deterministicKey}`;
      const doseEvent: DoseEvent = {
        id: eventId,
        elderlyProfileId,
        medicationId: medId,
        medication,
        scheduledDate: g.scheduledDate,
        scheduledTime: g.scheduledTime,
        routineCategory: g.routineCategory,
        status: g.status,
        createdAt: now,
        updatedAt: now
      };
      this.doseEvents.set(eventId, doseEvent);
      createdDoseEvents.push(doseEvent);
    }

    this.logAudit(actorId, actorName, 'CREATE_MEDICATION', 'medication', medId, elderlyProfileId, null, medication);
    this.broadcast('MEDICATION_ADDED', { medication, schedule, doseEvents: createdDoseEvents });

    return { medication, schedule, doseEvents: createdDoseEvents };
  }

  public updateMedicationSchedule(
    medicationId: string,
    newScheduleData: Omit<MedicationSchedule, 'id' | 'medicationId' | 'createdAt'>,
    actorId: string,
    actorName: string,
    reasonForChange: string
  ): MedicationSchedule {
    const med = this.medications.get(medicationId);
    if (!med) throw new Error('Medication not found');

    const oldSched = Array.from(this.medicationSchedules.values()).find((s) => s.medicationId === medicationId);
    const now = new Date().toISOString();

    // Preserve schedule history
    if (oldSched) {
      this.medicationScheduleHistories.push({
        id: `hist-${Date.now()}`,
        medicationId,
        previousSchedule: { ...oldSched },
        newSchedule: { ...newScheduleData },
        changedByUserId: actorId,
        changedByName: actorName,
        reasonForChange,
        effectiveFrom: now,
        createdAt: now
      });
    }

    // Save new schedule
    const newSchedId = `sched-${Date.now()}`;
    const newSchedule: MedicationSchedule = {
      id: newSchedId,
      medicationId,
      ...newScheduleData,
      createdAt: now
    };
    this.medicationSchedules.set(newSchedId, newSchedule);
    med.activeSchedule = newSchedule;

    // Remove future un-taken dose events and regenerate
    const todayStr = new Date().toISOString().split('T')[0];
    for (const [key, event] of this.doseEvents.entries()) {
      if (event.medicationId === medicationId && event.scheduledDate >= todayStr && event.status === 'scheduled') {
        this.doseEvents.delete(key);
      }
    }

    const nextWeek = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const generated = generateDoseEventsForDateRange(med.elderlyProfileId, medicationId, newSchedule, todayStr, nextWeek);
    for (const g of generated) {
      const eventId = `dose-${g.deterministicKey}`;
      if (!this.doseEvents.has(eventId)) {
        this.doseEvents.set(eventId, {
          id: eventId,
          elderlyProfileId: med.elderlyProfileId,
          medicationId,
          medication: med,
          scheduledDate: g.scheduledDate,
          scheduledTime: g.scheduledTime,
          routineCategory: g.routineCategory,
          status: g.status,
          createdAt: now,
          updatedAt: now
        });
      }
    }

    this.logAudit(actorId, actorName, 'UPDATE_SCHEDULE', 'medication_schedule', newSchedId, med.elderlyProfileId, oldSched, newSchedule, reasonForChange);
    this.broadcast('SCHEDULE_UPDATED', { medication: med, newSchedule });
    return newSchedule;
  }

  // --- Dose Actions & Realtime Status Transitions ---
  public recordDoseAction(
    doseEventId: string,
    actorId: string,
    actorName: string,
    actionType: DoseActionType,
    notes?: string,
    adminTime?: string
  ): { doseEvent: DoseEvent; doseAction: DoseAction; duplicateWarning: boolean } {
    const event = this.doseEvents.get(doseEventId);
    if (!event) throw new Error(`Dose event ${doseEventId} not found`);

    const now = new Date().toISOString();
    let newStatus: DoseStatus = event.status;

    if (['self_confirmed', 'caregiver_administered', 'proxy_confirmed'].includes(actionType)) {
      newStatus = 'taken';
    } else if (actionType === 'skipped') {
      newStatus = 'skipped';
    } else if (actionType === 'snoozed') {
      newStatus = 'snoozed';
    }

    const duplicateWarning = detectDuplicateAdministration(
      event.status,
      actionType,
      event.resolvedByUserId,
      actorId
    );

    const actionId = `action-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const action: DoseAction = {
      id: actionId,
      doseEventId,
      actorUserId: actorId,
      actorName,
      actionType,
      statusApplied: newStatus,
      recordedAt: now,
      actualAdministrationTime: adminTime || now,
      reasonOrNotes: notes,
      isUndone: false
    };
    this.doseActions.set(actionId, action);

    event.status = newStatus;
    event.lastActionId = actionId;
    event.resolvedAt = now;
    event.resolvedByUserId = actorId;
    event.resolvedByName = actorName;
    event.resolutionMethod = actionType;
    event.hasDuplicateWarning = event.hasDuplicateWarning || duplicateWarning;
    event.updatedAt = now;

    if (duplicateWarning) {
      const alert: NotificationRecord = {
        id: `notif-${Date.now()}`,
        elderlyProfileId: event.elderlyProfileId,
        recipientUserId: actorId,
        title: 'Possible Duplicate Administration Alert',
        body: `Dose for ${event.medication?.name || 'Medication'} was already marked taken by ${event.resolvedByName}. Please confirm with the care circle.`,
        type: 'duplicate_warning',
        relatedEntityId: doseEventId,
        relatedEntityType: 'dose_event',
        isRead: false,
        sentAt: now
      };
      this.notifications.push(alert);
    }

    this.logAudit(actorId, actorName, 'RECORD_DOSE_ACTION', 'dose_event', doseEventId, event.elderlyProfileId, null, { action, duplicateWarning });
    this.broadcast('DOSE_EVENT_UPDATED', { doseEvent: event, action, duplicateWarning });

    return { doseEvent: event, doseAction: action, duplicateWarning };
  }

  public undoDoseAction(
    doseEventId: string,
    actorId: string,
    actorName: string,
    reason = 'Accidental tap undone'
  ): { doseEvent: DoseEvent; undoAction: DoseAction } {
    const event = this.doseEvents.get(doseEventId);
    if (!event) throw new Error('Dose event not found');

    const now = new Date().toISOString();

    if (event.lastActionId) {
      const prevAction = this.doseActions.get(event.lastActionId);
      if (prevAction) {
        prevAction.isUndone = true;
        prevAction.undoneAt = now;
        prevAction.undoneByUserId = actorId;
      }
    }

    const undoActionId = `action-undo-${Date.now()}`;
    const undoAction: DoseAction = {
      id: undoActionId,
      doseEventId,
      actorUserId: actorId,
      actorName,
      actionType: 'undone',
      statusApplied: 'scheduled',
      recordedAt: now,
      reasonOrNotes: reason,
      isUndone: false
    };
    this.doseActions.set(undoActionId, undoAction);

    event.status = 'scheduled';
    event.lastActionId = undoActionId;
    event.resolvedAt = undefined;
    event.resolvedByUserId = undefined;
    event.resolvedByName = undefined;
    event.resolutionMethod = 'undone';
    event.updatedAt = now;

    this.logAudit(actorId, actorName, 'UNDO_DOSE_ACTION', 'dose_event', doseEventId, event.elderlyProfileId, null, undoAction, reason);
    this.broadcast('DOSE_EVENT_UPDATED', { doseEvent: event, action: undoAction });

    return { doseEvent: event, undoAction };
  }

  // --- Appointments ---
  public addAppointment(
    elderlyProfileId: string,
    data: Omit<Appointment, 'id' | 'elderlyProfileId' | 'createdAt' | 'updatedAt'>
  ): Appointment {
    const aptId = `apt-${Date.now()}`;
    const now = new Date().toISOString();
    const apt: Appointment = {
      id: aptId,
      elderlyProfileId,
      ...data,
      createdAt: now,
      updatedAt: now
    };
    this.appointments.set(aptId, apt);
    this.logAudit(data.createdByUserId, 'User', 'CREATE_APPOINTMENT', 'appointment', aptId, elderlyProfileId);
    this.broadcast('APPOINTMENT_ADDED', apt);
    return apt;
  }

  // --- Care Notes ---
  public addCareNote(
    elderlyProfileId: string,
    data: Omit<CareNote, 'id' | 'elderlyProfileId' | 'createdAt'>
  ): CareNote {
    const noteId = `note-${Date.now()}`;
    const note: CareNote = {
      id: noteId,
      elderlyProfileId,
      ...data,
      createdAt: new Date().toISOString()
    };
    this.careNotes.set(noteId, note);
    this.logAudit(data.authorUserId, data.authorName, 'CREATE_CARE_NOTE', 'care_note', noteId, elderlyProfileId);
    this.broadcast('CARE_NOTE_ADDED', note);
    return note;
  }

  // --- Seed Initial Test Data ---
  private seedDefaultData() {
    const elderlyUser: UserProfile = {
      id: 'usr-margaret',
      email: 'margaret.sharma@example.com',
      fullName: 'Margaret Sharma',
      role: 'elderly',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.userProfiles.set(elderlyUser.id, elderlyUser);

    const caregiverUser: UserProfile = {
      id: 'usr-sarah',
      email: 'sarah.caregiver@example.com',
      fullName: 'Sarah Jenkins',
      role: 'caregiver',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.userProfiles.set(caregiverUser.id, caregiverUser);

    const familyUser: UserProfile = {
      id: 'usr-ramesh',
      email: 'ramesh.sharma@example.com',
      fullName: 'Ramesh Sharma',
      role: 'family',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.userProfiles.set(familyUser.id, familyUser);

    const { elderlyProfile, careCircle } = this.createElderlyProfile(elderlyUser.id, {
      fullName: 'Margaret Sharma',
      preferredName: 'Margaret',
      dateOfBirth: '1948-06-12',
      bloodGroup: 'O+',
      allergies: ['Penicillin', 'Sulfa drugs'],
      medicalConditions: ['Type 2 Diabetes', 'Hypertension'],
      careNotes: 'Mild tremor in right hand. Prefer large text buttons.',
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00'
    });

    // Add caregiver and family to circle
    const ccmCaregiver: CareCircleMember = {
      id: `member-${caregiverUser.id}`,
      circleId: careCircle.id,
      userId: caregiverUser.id,
      user: caregiverUser,
      role: 'caregiver',
      canEdit: true,
      status: 'active',
      joinedAt: new Date().toISOString()
    };
    this.careCircleMembers.set(ccmCaregiver.id, ccmCaregiver);

    const ccmFamily: CareCircleMember = {
      id: `member-${familyUser.id}`,
      circleId: careCircle.id,
      userId: familyUser.id,
      user: familyUser,
      role: 'family',
      canEdit: true,
      status: 'active',
      joinedAt: new Date().toISOString()
    };
    this.careCircleMembers.set(ccmFamily.id, ccmFamily);

    // Add Emergency Contact
    const emg: EmergencyContact = {
      id: 'emg-1',
      elderlyProfileId: elderlyProfile.id,
      name: 'Ramesh Sharma (Son)',
      relationship: 'Son',
      phoneNumber: '+91 98765 43210',
      priorityOrder: 1,
      isPrimary: true,
      canReceiveAlerts: true,
      createdAt: new Date().toISOString()
    };
    this.emergencyContacts.set(emg.id, emg);

    // Add Initial Medications (from design brief)
    // 1. Metformin 500mg Morning
    this.addMedication(
      elderlyProfileId(elderlyProfile.id),
      {
        name: 'Metformin',
        genericName: 'Metformin Hydrochloride',
        strength: '500 mg',
        form: 'tablet',
        doseAmount: '1 tablet',
        instructions: 'Take with morning breakfast',
        foodInstructions: 'with_food',
        prescriberName: 'Dr. Mehta',
        purpose: 'For blood sugar control',
        isActive: true
      },
      {
        scheduleType: 'daily',
        doseTimes: ['08:00'],
        startDate: new Date().toISOString().split('T')[0]
      },
      caregiverUser.id,
      caregiverUser.fullName
    );

    // 2. Amlodipine 5mg Evening
    this.addMedication(
      elderlyProfile.id,
      {
        name: 'Amlodipine',
        genericName: 'Amlodipine Besylate',
        strength: '5 mg',
        form: 'tablet',
        doseAmount: '1 tablet',
        instructions: 'Take after dinner',
        foodInstructions: 'after_food',
        prescriberName: 'Dr. Mehta',
        purpose: 'For blood pressure control',
        isActive: true
      },
      {
        scheduleType: 'daily',
        doseTimes: ['20:00'],
        startDate: new Date().toISOString().split('T')[0]
      },
      caregiverUser.id,
      caregiverUser.fullName
    );

    // 3. Appointment tomorrow with Dr. Mehta
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    tomorrow.setHours(10, 30, 0, 0);

    this.addAppointment(elderlyProfile.id, {
      doctorName: 'Dr. Mehta',
      specialty: 'Heart Specialist / Cardiology',
      facilityName: 'City Care Hospital',
      locationAddress: 'Room 204, City Care Hospital, MG Road',
      appointmentTime: tomorrow.toISOString(),
      purpose: 'Routine heart check-up & BP review',
      transportNotes: 'Ramesh will pick up at 9:45 AM',
      preparationChecklist: [
        'Bring medicine list',
        'Bring blood-pressure readings',
        'Do not eat after 9:00 PM if fasting instructed'
      ],
      status: 'scheduled',
      createdByUserId: caregiverUser.id
    });
  }
}

function elderlyProfileId(id: string): string {
  return id;
}

// Global singleton instance for local runtime and tests
export const platformDataStore = new InMemoryPlatformDataStore();
