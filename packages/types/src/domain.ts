export type UserRole = 'elderly' | 'family' | 'caregiver' | 'clinician';

export type CircleRole = 'owner' | 'caregiver' | 'family' | 'clinician';

export type CircleMemberStatus = 'active' | 'pending' | 'revoked';

export type SupportedLanguage = 'en' | 'ml'; // English and Malayalam

export type MedicationForm = 
  | 'tablet' 
  | 'capsule' 
  | 'liquid' 
  | 'injection' 
  | 'drops' 
  | 'inhaler' 
  | 'patch' 
  | 'other';

export type ScheduleType = 
  | 'daily' 
  | 'specific_days' 
  | 'interval' 
  | 'as_needed';

export type DayOfWeek = 
  | 'monday' 
  | 'tuesday' 
  | 'wednesday' 
  | 'thursday' 
  | 'friday' 
  | 'saturday' 
  | 'sunday';

export type DoseStatus = 
  | 'scheduled' 
  | 'due' 
  | 'taken' 
  | 'skipped' 
  | 'snoozed' 
  | 'unconfirmed' 
  | 'needs_help';

export type DoseActionType = 
  | 'self_confirmed' 
  | 'caregiver_administered' 
  | 'proxy_confirmed' 
  | 'skipped' 
  | 'snoozed' 
  | 'undone' 
  | 'corrected';

export type SkipReason = 
  | 'feeling_unwell' 
  | 'doctor_instructed' 
  | 'forgot' 
  | 'fasting' 
  | 'side_effects' 
  | 'other';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface ElderlyProfile {
  id: string;
  ownerUserId: string;
  fullName: string;
  preferredName?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  allergies: string[];
  medicalConditions: string[];
  careNotes?: string;
  quietHoursStart?: string; // e.g. "22:00"
  quietHoursEnd?: string;   // e.g. "07:00"
  preferredLanguage?: SupportedLanguage;
  createdAt: string;
  updatedAt: string;
}

export interface CareCircle {
  id: string;
  elderlyProfileId: string;
  name: string;
  createdAt: string;
}

export interface CirclePermissions {
  canEditMedications: boolean;
  canAdministerDoses: boolean;
  canEditAppointments: boolean;
  canViewVitals: boolean;
  canManageCircle: boolean;
}

export interface CareCircleMember {
  id: string;
  circleId: string;
  userId: string;
  user?: UserProfile;
  role: CircleRole;
  canEdit: boolean;
  permissions?: CirclePermissions;
  status: CircleMemberStatus;
  joinedAt: string;
}

export interface CircleInvitation {
  id: string;
  circleId: string;
  invitedByUserId: string;
  invitedEmail: string;
  invitedRole: CircleRole;
  invitationCode: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: string;
  createdAt: string;
}

export interface MedicationEducation {
  purposePlainLanguage: string;
  howItWorks: string;
  commonSideEffects: string[];
  foodAndDrinkAdvice: string;
  missedDoseInstructions?: string;
  missedDoseAdvice?: string;
}

export interface MedicationInventory {
  id: string;
  medicationId: string;
  currentStock: number; // pill count
  unit: string; // 'tablets', 'capsules', 'ml', 'puffs'
  lowStockThreshold: number; // e.g. 7 days
  reorderQuantity: number;
  lastRefilledDate?: string;
  pharmacyName?: string;
  pharmacyPhone?: string;
}

export interface Medication {
  id: string;
  elderlyProfileId: string;
  name: string;
  genericName?: string;
  strength: string; // e.g. "500 mg"
  form: MedicationForm;
  doseAmount: string; // e.g. "1 tablet"
  instructions?: string;
  foodInstructions?: 'with_food' | 'before_food' | 'after_food' | 'no_food_restriction';
  prescriberName?: string;
  instructionSource?: string;
  purpose?: string;
  isActive: boolean;
  education?: MedicationEducation;
  inventory?: MedicationInventory;
  createdAt: string;
  updatedAt: string;
  activeSchedule?: MedicationSchedule;
}

export interface MedicationSchedule {
  id: string;
  medicationId: string;
  scheduleType: ScheduleType;
  doseTimes: string[]; // ['08:00', '20:00']
  daysOfWeek?: DayOfWeek[];
  intervalDays?: number;
  startDate: string; // 'YYYY-MM-DD'
  endDate?: string;   // 'YYYY-MM-DD'
  routineLabels?: Record<string, 'morning' | 'afternoon' | 'evening' | 'night'>;
  createdAt: string;
}

export interface MedicationScheduleHistory {
  id: string;
  medicationId: string;
  previousSchedule: Record<string, any>;
  newSchedule: Record<string, any>;
  changedByUserId: string;
  changedByName: string;
  reasonForChange: string;
  effectiveFrom: string;
  createdAt: string;
}

export interface DoseEvent {
  id: string;
  elderlyProfileId: string;
  medicationId: string;
  medication?: Medication;
  scheduledDate: string; // 'YYYY-MM-DD'
  scheduledTime: string; // 'HH:MM:SS' or 'HH:MM'
  routineCategory: 'morning' | 'afternoon' | 'evening' | 'night' | 'as_needed';
  status: DoseStatus;
  lastActionId?: string;
  resolvedAt?: string;
  resolvedByUserId?: string;
  resolvedByName?: string;
  resolutionMethod?: DoseActionType;
  hasDuplicateWarning?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DoseAction {
  id: string;
  doseEventId: string;
  actorUserId: string;
  actorName: string;
  actionType: DoseActionType;
  statusApplied: DoseStatus;
  recordedAt: string;
  actualAdministrationTime?: string;
  reasonOrNotes?: string;
  isUndone: boolean;
  undoneAt?: string;
  undoneByUserId?: string;
}

export interface Appointment {
  id: string;
  elderlyProfileId: string;
  doctorName: string;
  specialty?: string;
  facilityName: string;
  locationAddress?: string;
  appointmentTime: string; // ISO string
  purpose: string;
  transportNotes?: string;
  preparationChecklist: string[];
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CareNote {
  id: string;
  elderlyProfileId: string;
  authorUserId: string;
  authorName: string;
  category: 'general' | 'vital_signs' | 'mood' | 'meal' | 'mobility' | 'concern' | 'handoff';
  content: string;
  visibility: 'circle_all' | 'caregivers_only';
  vitalSigns?: {
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    heartRate?: number;
    bloodSugar?: number;
    temperature?: number;
    spO2?: number; // Blood oxygen %
  };
  createdAt: string;
}

export interface DailyHealthCheckin {
  id: string;
  elderlyProfileId: string;
  date: string; // YYYY-MM-DD
  mood: 'great' | 'good' | 'okay' | 'low' | 'unwell';
  painLevel: number; // 0 to 10
  energyLevel: 'high' | 'normal' | 'tired' | 'exhausted';
  sleepQuality: 'well_rested' | 'interrupted' | 'poor';
  notes?: string;
  recordedAt: string;
}

export interface ShiftHandoff {
  id: string;
  elderlyProfileId: string;
  outgoingCaregiverId: string;
  outgoingCaregiverName: string;
  incomingCaregiverName?: string;
  shiftStart: string;
  shiftEnd: string;
  dosesAdministeredCount: number;
  pendingDosesCount: number;
  missedDosesCount: number;
  observationsSummary: string;
  concernsOrAlerts: string;
  refillsNeeded: string[];
  nextShiftActions: string[];
  isAcknowledged: boolean;
  acknowledgedAt?: string;
  createdAt: string;
}

export interface MedicationRiskFlag {
  id: string;
  medicationId: string;
  elderlyProfileId: string;
  riskType: 'duplicate_therapy' | 'food_timing_conflict' | 'low_adherence_risk' | 'expiring_refill';
  severity: 'low' | 'moderate' | 'high';
  title: string;
  description: string;
  recommendation: string;
  createdAt: string;
}

export interface AbdmProfile {
  id: string;
  elderlyProfileId: string;
  abhaNumber: string; // e.g. 14-digit ABHA number
  abhaAddress: string; // e.g. margaret@abdm
  verificationStatus: 'verified' | 'pending';
  linkedFacilities: string[];
  linkedRecordsCount: number;
}

export interface SmartPillbox {
  id: string;
  elderlyProfileId: string;
  deviceName: string;
  serialNumber: string;
  batteryPercentage: number;
  connectionStatus: 'connected' | 'disconnected' | 'syncing';
  lastOpenedTime?: string;
  compartmentCount: number;
}

export interface EmergencyContact {
  id: string;
  elderlyProfileId: string;
  name: string;
  relationship: string;
  phoneNumber: string;
  alternatePhoneNumber?: string;
  priorityOrder: number;
  isPrimary: boolean;
  canReceiveAlerts: boolean;
  createdAt: string;
}

export interface NotificationRecord {
  id: string;
  elderlyProfileId: string;
  recipientUserId: string;
  title: string;
  body: string;
  type: 'dose_reminder' | 'unconfirmed_escalation' | 'appointment_reminder' | 'duplicate_warning' | 'emergency' | 'refill_alert' | 'handoff';
  relatedEntityId?: string;
  relatedEntityType?: 'dose_event' | 'appointment' | 'emergency' | 'inventory' | 'handoff';
  isRead: boolean;
  sentAt: string;
}

export interface AuditEvent {
  id: string;
  elderlyProfileId?: string;
  actorUserId: string;
  actorName?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  previousValue?: Record<string, any>;
  newValue?: Record<string, any>;
  reason?: string;
  ipAddress?: string;
  createdAt: string;
}
