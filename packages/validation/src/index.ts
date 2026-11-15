import { z } from 'zod';

export const userRoleEnum = z.enum(['elderly', 'family', 'caregiver', 'clinician']);

export const circleRoleEnum = z.enum(['owner', 'caregiver', 'family', 'clinician']);

export const medicationFormEnum = z.enum([
  'tablet',
  'capsule',
  'liquid',
  'injection',
  'drops',
  'inhaler',
  'patch',
  'other'
]);

export const scheduleTypeEnum = z.enum([
  'daily',
  'specific_days',
  'interval',
  'as_needed'
]);

export const dayOfWeekEnum = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
]);

export const foodInstructionsEnum = z.enum([
  'with_food',
  'before_food',
  'after_food',
  'no_food_restriction'
]);

export const timeStringRegex = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;

export const elderlyProfileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  preferredName: z.string().optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD').optional(),
  bloodGroup: z.string().max(5).optional(),
  allergies: z.array(z.string()).default([]),
  medicalConditions: z.array(z.string()).default([]),
  careNotes: z.string().max(2000).optional(),
  quietHoursStart: z.string().regex(timeStringRegex, 'Invalid time format (HH:MM)').default('22:00'),
  quietHoursEnd: z.string().regex(timeStringRegex, 'Invalid time format (HH:MM)').default('07:00')
});

export const medicationSchema = z.object({
  name: z.string().min(1, 'Medication name is required'),
  genericName: z.string().optional(),
  strength: z.string().min(1, 'Strength is required (e.g. 500 mg)'),
  form: medicationFormEnum,
  doseAmount: z.string().min(1, 'Dose amount is required (e.g. 1 tablet)'),
  instructions: z.string().optional(),
  foodInstructions: foodInstructionsEnum.default('no_food_restriction'),
  prescriberName: z.string().optional(),
  instructionSource: z.string().optional(),
  purpose: z.string().optional(),
  isActive: z.boolean().default(true)
});

export const medicationScheduleSchema = z.object({
  scheduleType: scheduleTypeEnum,
  doseTimes: z.array(z.string().regex(timeStringRegex, 'Invalid time format (HH:MM)')).min(1, 'At least one dose time required'),
  daysOfWeek: z.array(dayOfWeekEnum).optional(),
  intervalDays: z.number().int().min(1).default(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD').optional(),
  routineLabels: z.record(z.enum(['morning', 'afternoon', 'evening', 'night'])).optional()
}).refine((data) => {
  if (data.scheduleType === 'specific_days' && (!data.daysOfWeek || data.daysOfWeek.length === 0)) {
    return false;
  }
  return true;
}, {
  message: "Days of week required when scheduleType is 'specific_days'",
  path: ['daysOfWeek']
});

export const scheduleUpdateWithHistorySchema = z.object({
  newSchedule: medicationScheduleSchema,
  reasonForChange: z.string().min(3, 'A clear clinical or operational reason is required for schedule updates')
});

export const appointmentSchema = z.object({
  doctorName: z.string().min(2, 'Doctor name is required'),
  specialty: z.string().optional(),
  facilityName: z.string().min(2, 'Facility or clinic name is required'),
  locationAddress: z.string().optional(),
  appointmentTime: z.string().datetime({ message: 'Must be a valid ISO datetime' }),
  purpose: z.string().min(3, 'Purpose of visit is required'),
  transportNotes: z.string().optional(),
  preparationChecklist: z.array(z.string()).default([])
});

export const circleInvitationSchema = z.object({
  invitedEmail: z.string().email('Valid email address required'),
  invitedRole: z.enum(['caregiver', 'family', 'clinician'])
});

export const doseActionInputSchema = z.object({
  actionType: z.enum(['self_confirmed', 'caregiver_administered', 'proxy_confirmed', 'skipped', 'snoozed', 'undone', 'corrected']),
  reasonOrNotes: z.string().max(500).optional(),
  actualAdministrationTime: z.string().datetime().optional()
});
