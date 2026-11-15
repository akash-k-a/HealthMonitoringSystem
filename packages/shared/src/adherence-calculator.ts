import type { DoseEvent } from '@elderly-care/types';

export interface AdherenceStats {
  totalScheduled: number;
  totalTaken: number;
  totalSkipped: number;
  totalUnconfirmed: number;
  adherencePercentage: number;
  skipReasonsSummary: Record<string, number>;
  statusRating: 'Excellent' | 'Good' | 'Needs Attention';
}

export function calculateAdherenceStats(events: DoseEvent[]): AdherenceStats {
  const totalScheduled = events.length;
  if (totalScheduled === 0) {
    return {
      totalScheduled: 0,
      totalTaken: 0,
      totalSkipped: 0,
      totalUnconfirmed: 0,
      adherencePercentage: 100,
      skipReasonsSummary: {},
      statusRating: 'Excellent'
    };
  }

  let totalTaken = 0;
  let totalSkipped = 0;
  let totalUnconfirmed = 0;
  const skipReasonsSummary: Record<string, number> = {};

  for (const ev of events) {
    if (ev.status === 'taken') {
      totalTaken++;
    } else if (ev.status === 'skipped') {
      totalSkipped++;
    } else if (ev.status === 'unconfirmed') {
      totalUnconfirmed++;
    }
  }

  const adherencePercentage = Math.round((totalTaken / totalScheduled) * 100);

  let statusRating: 'Excellent' | 'Good' | 'Needs Attention' = 'Excellent';
  if (adherencePercentage < 75) {
    statusRating = 'Needs Attention';
  } else if (adherencePercentage < 90) {
    statusRating = 'Good';
  }

  return {
    totalScheduled,
    totalTaken,
    totalSkipped,
    totalUnconfirmed,
    adherencePercentage,
    skipReasonsSummary,
    statusRating
  };
}
