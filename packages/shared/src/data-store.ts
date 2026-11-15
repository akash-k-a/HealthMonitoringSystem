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
  DoseActionType,
  DailyHealthCheckin,
  ShiftHandoff,
  MedicationInventory,
  MedicationRiskFlag,
  AbdmProfile,
  SmartPillbox,
  SupportedLanguage
} from '@elderly-care/types';
import { generateDoseEventsForDateRange, detectDuplicateAdministration } from './schedule-engine';
import { getMedicationEducation, checkMedicationRisks } from './safety-checker';

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

  // Phase 2, 3, 4, 5 Collections
  public dailyHealthCheckins: Map<string, DailyHealthCheckin> = new Map();
  public shiftHandoffs: Map<string, ShiftHandoff> = new Map();
  public medicationInventories: Map<string, MedicationInventory> = new Map();
  public abdmProfiles: Map<string, AbdmProfile> = new Map();
  public smartPillboxes: Map<string, SmartPillbox> = new Map();

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
      preferredLanguage: data.preferredLanguage || 'en',
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

    // Initialize ABDM Profile
    const abdm: AbdmProfile = {
      id: `abdm-${profileId}`,
      elderlyProfileId: profileId,
      abhaNumber: `91-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
      abhaAddress: `${(data.preferredName || data.fullName).toLowerCase().replace(/\s+/g, '')}@abdm`,
      verificationStatus: 'verified',
      linkedFacilities: ['City Care Hospital', 'Kerala Health Mission Clinic'],
      linkedRecordsCount: 4
    };
    this.abdmProfiles.set(profileId, abdm);

    // Initialize Smart Pillbox
    const pillbox: SmartPillbox = {
      id: `box-${profileId}`,
      elderlyProfileId: profileId,
      deviceName: 'MedMinder Smart Dispenser Pro',
      serialNumber: `MM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      batteryPercentage: 92,
      connectionStatus: 'connected',
      compartmentCount: 7
    };
    this.smartPillboxes.set(profileId, pillbox);

    this.logAudit(ownerUserId, owner?.fullName || 'Owner', 'CREATE_ELDERLY_PROFILE', 'elderly_profile', profileId, profileId);
    return { elderlyProfile: profile, careCircle: circle };
  }

  public setPreferredLanguage(profileId: string, lang: SupportedLanguage) {
    const profile = this.elderlyProfiles.get(profileId);
    if (profile) {
      profile.preferredLanguage = lang;
      this.broadcast('LANGUAGE_CHANGED', { profileId, language: lang });
    }
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

  // --- Medications, Schedules & Inventory ---
  public addMedication(
    elderlyProfileId: string,
    medData: Omit<Medication, 'id' | 'elderlyProfileId' | 'createdAt' | 'updatedAt' | 'activeSchedule' | 'education' | 'inventory'>,
    scheduleData: Omit<MedicationSchedule, 'id' | 'medicationId' | 'createdAt'>,
    actorId: string,
    actorName: string,
    initialStock = 30
  ): { medication: Medication; schedule: MedicationSchedule; doseEvents: DoseEvent[] } {
    const medId = `med-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    const now = new Date().toISOString();

    const education = getMedicationEducation(medData.name);

    const inventory: MedicationInventory = {
      id: `inv-${medId}`,
      medicationId: medId,
      currentStock: initialStock,
      unit: medData.form === 'liquid' ? 'ml' : 'tablets',
      lowStockThreshold: 7,
      reorderQuantity: 30,
      pharmacyName: 'Apollo City Pharmacy',
      pharmacyPhone: '+91 80 2345 6789'
    };
    this.medicationInventories.set(medId, inventory);

    const medication: Medication = {
      id: medId,
      elderlyProfileId,
      ...medData,
      education,
      inventory,
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

  public refillMedicationStock(medicationId: string, addedQuantity: number, actorName = 'Caregiver') {
    const inv = this.medicationInventories.get(medicationId);
    if (inv) {
      inv.currentStock += addedQuantity;
      inv.lastRefilledDate = new Date().toISOString().split('T')[0];
      const med = this.medications.get(medicationId);
      if (med) med.inventory = inv;
      this.logAudit('caregiver', actorName, 'REFILL_MEDICATION', 'medication_inventory', inv.id, med?.elderlyProfileId);
      this.broadcast('INVENTORY_UPDATED', inv);
    }
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

    const newSchedId = `sched-${Date.now()}`;
    const newSchedule: MedicationSchedule = {
      id: newSchedId,
      medicationId,
      ...newScheduleData,
      createdAt: now
    };
    this.medicationSchedules.set(newSchedId, newSchedule);
    med.activeSchedule = newSchedule;

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
      // Decrement inventory stock on successful dose take
      const inv = this.medicationInventories.get(event.medicationId);
      if (inv && inv.currentStock > 0 && event.status !== 'taken') {
        inv.currentStock -= 1;
        if (event.medication) event.medication.inventory = inv;
      }
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

    // Restore stock if undoing taken
    if (event.status === 'taken') {
      const inv = this.medicationInventories.get(event.medicationId);
      if (inv) {
        inv.currentStock += 1;
        if (event.medication) event.medication.inventory = inv;
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

  // --- Phase 2: Daily Health Check-ins ---
  public recordDailyCheckin(
    elderlyProfileId: string,
    data: Omit<DailyHealthCheckin, 'id' | 'elderlyProfileId' | 'recordedAt'>
  ): DailyHealthCheckin {
    const checkinId = `checkin-${Date.now()}`;
    const checkin: DailyHealthCheckin = {
      id: checkinId,
      elderlyProfileId,
      ...data,
      recordedAt: new Date().toISOString()
    };
    this.dailyHealthCheckins.set(checkin.date, checkin);
    this.logAudit('elderly', 'Elderly Patient', 'RECORD_HEALTH_CHECKIN', 'daily_health_checkin', checkinId, elderlyProfileId);
    this.broadcast('HEALTH_CHECKIN_RECORDED', checkin);
    return checkin;
  }

  // --- Phase 3: Caregiver Shift Handoff ---
  public createShiftHandoff(
    elderlyProfileId: string,
    outgoingCaregiverId: string,
    outgoingCaregiverName: string,
    incomingCaregiverName: string,
    observationsSummary: string,
    concernsOrAlerts: string,
    nextShiftActions: string[]
  ): ShiftHandoff {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayEvents = Array.from(this.doseEvents.values()).filter(
      (e) => e.elderlyProfileId === elderlyProfileId && e.scheduledDate === todayStr
    );

    const takenCount = todayEvents.filter((e) => e.status === 'taken').length;
    const pendingCount = todayEvents.filter((e) => e.status === 'scheduled' || e.status === 'due').length;
    const missedCount = todayEvents.filter((e) => e.status === 'skipped').length;

    // Check low refills
    const lowRefills = Array.from(this.medications.values())
      .filter((m) => m.elderlyProfileId === elderlyProfileId && m.inventory && m.inventory.currentStock <= m.inventory.lowStockThreshold)
      .map((m) => `${m.name} (${m.inventory?.currentStock} remaining)`);

    const handoffId = `handoff-${Date.now()}`;
    const handoff: ShiftHandoff = {
      id: handoffId,
      elderlyProfileId,
      outgoingCaregiverId,
      outgoingCaregiverName,
      incomingCaregiverName,
      shiftStart: `${todayStr}T08:00:00Z`,
      shiftEnd: `${todayStr}T18:00:00Z`,
      dosesAdministeredCount: takenCount,
      pendingDosesCount: pendingCount,
      missedDosesCount: missedCount,
      observationsSummary,
      concernsOrAlerts,
      refillsNeeded: lowRefills,
      nextShiftActions,
      isAcknowledged: false,
      createdAt: new Date().toISOString()
    };

    this.shiftHandoffs.set(handoffId, handoff);
    this.logAudit(outgoingCaregiverId, outgoingCaregiverName, 'CREATE_SHIFT_HANDOFF', 'shift_handoff', handoffId, elderlyProfileId);
    this.broadcast('SHIFT_HANDOFF_CREATED', handoff);
    return handoff;
  }

  public acknowledgeShiftHandoff(handoffId: string, acknowledgedByName: string): ShiftHandoff {
    const handoff = this.shiftHandoffs.get(handoffId);
    if (!handoff) throw new Error('Handoff not found');
    handoff.isAcknowledged = true;
    handoff.acknowledgedAt = new Date().toISOString();
    handoff.incomingCaregiverName = acknowledgedByName;
    this.logAudit('caregiver', acknowledgedByName, 'ACKNOWLEDGE_SHIFT_HANDOFF', 'shift_handoff', handoffId, handoff.elderlyProfileId);
    this.broadcast('SHIFT_HANDOFF_ACKNOWLEDGED', handoff);
    return handoff;
  }

  // --- Phase 5: Smart Pillbox Simulation ---
  public simulatePillboxDispense(elderlyProfileId: string, compartmentNumber = 1) {
    const pillbox = this.smartPillboxes.get(elderlyProfileId);
    if (pillbox) {
      pillbox.lastOpenedTime = new Date().toISOString();
      pillbox.batteryPercentage = Math.max(10, pillbox.batteryPercentage - 1);
      this.broadcast('PILLBOX_OPENED', { pillbox, compartmentNumber });
    }
  }

  // --- Appointments & Care Notes ---
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

  public addCareNote(
    elderlyProfileId: string,
    data: Omit<CareNote, 'id' | 'elderlyProfileId' | 'createdAt'>
  ): CareNote {
    const noteId = `note-${Date.now()}`;
    const note: CareNote = {
      id: noteId,
      elderlyProfileId,
      ...data,
      visibility: data.visibility || 'circle_all',
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
      fullName: 'Amitabh Bachchan',
      role: 'elderly',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.userProfiles.set(elderlyUser.id, elderlyUser);

    const caregiverUser: UserProfile = {
      id: 'usr-sarah',
      email: 'sarah.caregiver@example.com',
      fullName: 'Aishwarya Rai',
      role: 'caregiver',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.userProfiles.set(caregiverUser.id, caregiverUser);

    const familyUser: UserProfile = {
      id: 'usr-ramesh',
      email: 'ramesh.sharma@example.com',
      fullName: 'Rohit Sharma',
      role: 'family',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.userProfiles.set(familyUser.id, familyUser);

    const { elderlyProfile, careCircle } = this.createElderlyProfile(elderlyUser.id, {
      fullName: 'Amitabh Bachchan',
      preferredName: 'Amitabh',
      dateOfBirth: '1948-06-12',
      bloodGroup: 'O+',
      allergies: ['Penicillin', 'Sulfa drugs'],
      medicalConditions: ['Type 2 Diabetes', 'Hypertension'],
      careNotes: 'Mild tremor in right hand. Prefer large text buttons.',
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      preferredLanguage: 'en'
    });

    const ccmCaregiver: CareCircleMember = {
      id: `member-${caregiverUser.id}`,
      circleId: careCircle.id,
      userId: caregiverUser.id,
      user: caregiverUser,
      role: 'caregiver',
      canEdit: true,
      permissions: {
        canEditMedications: true,
        canAdministerDoses: true,
        canEditAppointments: true,
        canViewVitals: true,
        canManageCircle: true
      },
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
      permissions: {
        canEditMedications: true,
        canAdministerDoses: false,
        canEditAppointments: true,
        canViewVitals: true,
        canManageCircle: false
      },
      status: 'active',
      joinedAt: new Date().toISOString()
    };
    this.careCircleMembers.set(ccmFamily.id, ccmFamily);

    // Add Emergency Contact
    const emg: EmergencyContact = {
      id: 'emg-1',
      elderlyProfileId: elderlyProfile.id,
      name: 'Rohit Sharma (Son)',
      relationship: 'Son',
      phoneNumber: '+91 98765 43210',
      priorityOrder: 1,
      isPrimary: true,
      canReceiveAlerts: true,
      createdAt: new Date().toISOString()
    };
    this.emergencyContacts.set(emg.id, emg);

    // Initial Medications with inventory & education
    this.addMedication(
      elderlyProfile.id,
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
      caregiverUser.fullName,
      14 // 14 tablets remaining
    );

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
      caregiverUser.fullName,
      4 // 4 tablets remaining -> triggers low stock alert!
    );

    // Doctor appointment
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    tomorrow.setHours(10, 30, 0, 0);

    this.addAppointment(elderlyProfile.id, {
      doctorName: 'Dr. Mehta',
      specialty: 'Cardiologist',
      facilityName: 'City Care Hospital',
      locationAddress: 'Room 204, City Care Hospital, MG Road',
      appointmentTime: tomorrow.toISOString(),
      purpose: 'Routine heart check-up & BP review',
      transportNotes: 'Rohit will pick up at 9:45 AM',
      preparationChecklist: [
        'Bring printed medicine list',
        'Bring blood-pressure readings',
        'Do not eat after 9:00 PM if fasting instructed'
      ],
      status: 'scheduled',
      createdByUserId: caregiverUser.id
    });

    // Seed Daily Health Checkin
    this.recordDailyCheckin(elderlyProfile.id, {
      date: new Date().toISOString().split('T')[0],
      mood: 'good',
      painLevel: 2,
      energyLevel: 'normal',
      sleepQuality: 'well_rested',
      notes: 'Rested well overnight, slight knee stiffness'
    });

    // Seed Care Note with Vitals
    this.addCareNote(elderlyProfile.id, {
      authorUserId: caregiverUser.id,
      authorName: caregiverUser.fullName,
      category: 'vital_signs',
      content: 'Morning blood pressure checked: 130/84 mmHg, Heart rate: 74 bpm, Blood Sugar fasting: 112 mg/dL',
      visibility: 'circle_all',
      vitalSigns: {
        bloodPressureSystolic: 130,
        bloodPressureDiastolic: 84,
        heartRate: 74,
        bloodSugar: 112,
        temperature: 98.4,
        spO2: 98
      }
    });

    // Seed Shift Handoff
    this.createShiftHandoff(
      elderlyProfile.id,
      caregiverUser.id,
      caregiverUser.fullName,
      'Priya (Night Nurse)',
      'Margaret had a peaceful day. Breakfast and lunch taken on time. Afternoon walk 20 minutes.',
      'Amlodipine supply is low (4 tablets left). Refill request dispatched to Apollo Pharmacy.',
      ['Check evening blood pressure at 7:30 PM', 'Give Amlodipine 5mg after dinner', 'Ensure glass of water at bedside']
    );
  }
}

export const platformDataStore = new InMemoryPlatformDataStore();
