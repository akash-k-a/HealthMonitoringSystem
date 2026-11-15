import type { DayOfWeek, DoseStatus, Medication, MedicationSchedule } from '@elderly-care/types';

export type RoutineCategory = 'morning' | 'afternoon' | 'evening' | 'night' | 'as_needed';

export interface GeneratedDoseEvent {
  deterministicKey: string;
  elderlyProfileId: string;
  medicationId: string;
  scheduledDate: string; // 'YYYY-MM-DD'
  scheduledTime: string; // 'HH:MM:SS'
  routineCategory: RoutineCategory;
  status: DoseStatus;
}

const DAY_NAMES: DayOfWeek[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday'
];

/**
 * Maps a dose time (e.g. "08:00") into a human-friendly routine category.
 */
export function categorizeRoutineTime(timeStr: string): RoutineCategory {
  const parts = timeStr.split(':');
  const hour = parseInt(parts[0], 10);
  if (isNaN(hour)) return 'morning';

  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/**
 * Creates plain language medication instructions.
 * E.g., "Take 1 Metformin 500mg tablet with breakfast"
 */
export function formatPlainLanguageInstruction(
  medication: Pick<Medication, 'name' | 'strength' | 'form' | 'doseAmount' | 'foodInstructions' | 'instructions'>,
  timeStr?: string
): string {
  const routine = timeStr ? categorizeRoutineTime(timeStr) : 'morning';
  
  let mealTiming = '';
  switch (medication.foodInstructions) {
    case 'with_food':
      mealTiming = routine === 'morning' ? 'with breakfast' : (routine === 'evening' || routine === 'night' ? 'with dinner' : 'with food');
      break;
    case 'before_food':
      mealTiming = routine === 'morning' ? 'before breakfast' : 'before meals';
      break;
    case 'after_food':
      mealTiming = routine === 'morning' ? 'after breakfast' : (routine === 'evening' || routine === 'night' ? 'after dinner' : 'after meals');
      break;
    default:
      mealTiming = '';
  }

  const base = `Take ${medication.doseAmount} ${medication.name} (${medication.strength} ${medication.form})`;
  const full = mealTiming ? `${base} ${mealTiming}` : base;
  return full;
}

/**
 * Generates deterministic DoseEvent payloads for a given schedule across a date range.
 * Does not generate mandatory doses for 'as_needed' medications.
 */
export function generateDoseEventsForDateRange(
  elderlyProfileId: string,
  medicationId: string,
  schedule: MedicationSchedule,
  startDateStr: string, // 'YYYY-MM-DD'
  endDateStr: string    // 'YYYY-MM-DD'
): GeneratedDoseEvent[] {
  if (schedule.scheduleType === 'as_needed') {
    return [];
  }

  const events: GeneratedDoseEvent[] = [];
  const current = new Date(startDateStr + 'T00:00:00Z');
  const end = new Date(endDateStr + 'T23:59:59Z');
  const schedStart = new Date(schedule.startDate + 'T00:00:00Z');
  const schedEnd = schedule.endDate ? new Date(schedule.endDate + 'T23:59:59Z') : null;

  while (current <= end) {
    const curDateStr = current.toISOString().split('T')[0];
    
    // Check if within schedule active window
    if (current >= schedStart && (!schedEnd || current <= schedEnd)) {
      let isScheduledToday = false;

      if (schedule.scheduleType === 'daily') {
        isScheduledToday = true;
      } else if (schedule.scheduleType === 'specific_days' && schedule.daysOfWeek) {
        const dayName = DAY_NAMES[current.getUTCDay()];
        isScheduledToday = schedule.daysOfWeek.includes(dayName);
      } else if (schedule.scheduleType === 'interval') {
        const interval = schedule.intervalDays || 1;
        const diffTime = current.getTime() - schedStart.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        isScheduledToday = diffDays >= 0 && (diffDays % interval === 0);
      }

      if (isScheduledToday) {
        for (const rawTime of schedule.doseTimes) {
          const normalizedTime = rawTime.length === 5 ? `${rawTime}:00` : rawTime;
          const routine = categorizeRoutineTime(rawTime);
          const key = `${elderlyProfileId}_${medicationId}_${curDateStr}_${normalizedTime}`;

          events.push({
            deterministicKey: key,
            elderlyProfileId,
            medicationId,
            scheduledDate: curDateStr,
            scheduledTime: normalizedTime,
            routineCategory: routine,
            status: 'scheduled'
          });
        }
      }
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return events;
}

/**
 * Evaluates whether an unconfirmed dose requires escalation based on grace period.
 */
export function evaluateEscalationStatus(
  scheduledDate: string,
  scheduledTime: string,
  currentStatus: DoseStatus,
  now: Date,
  gracePeriodMinutes = 30
): 'none' | 'due' | 'unconfirmed_caregiver' | 'escalate_backup' {
  if (['taken', 'skipped'].includes(currentStatus)) {
    return 'none';
  }

  const [h, m] = scheduledTime.split(':').map((s) => parseInt(s, 10));
  const doseTime = new Date(`${scheduledDate}T${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00Z`);

  const diffMs = now.getTime() - doseTime.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 0) {
    return 'none'; // Not due yet
  }
  if (diffMinutes <= gracePeriodMinutes) {
    return 'due';
  }
  if (diffMinutes <= gracePeriodMinutes * 2) {
    return 'unconfirmed_caregiver';
  }
  return 'escalate_backup';
}

/**
 * Detects potential duplicate physical administration
 * (e.g. Grandma confirmed on mobile and caretaker administered on web without coordinating).
 */
export function detectDuplicateAdministration(
  currentStatus: DoseStatus,
  newActionType: string,
  existingActorId?: string,
  newActorId?: string
): boolean {
  const isTakingAction = ['self_confirmed', 'caregiver_administered', 'proxy_confirmed'].includes(newActionType);
  if (currentStatus === 'taken' && isTakingAction && existingActorId && newActorId && existingActorId !== newActorId) {
    return true;
  }
  return false;
}
