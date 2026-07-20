import { Platform } from 'react-native';

import { logWeight } from '@/data/repos';
import { db } from '@/lib/db';
import { keyOf, todayDate } from '@/program/schedule';

// Apple Health integration (@kingstinct/react-native-healthkit — iOS only,
// dev-client only, real device only).
//
// CRITICAL ORDERING: HealthKit crashes the app if data is requested before
// authorization has been requested. So this module enforces one flow:
//   1. requestHealthAuth() is the ONLY place that requests authorization,
//      and only runs from an explicit user tap (Week tab).
//   2. Every read/write first awaits healthAuthState() and bails unless the
//      request has already happened ('granted'). Reads NEVER run in the same
//      code path that requests permission.
// Note: HealthKit privacy means a denied READ looks identical to "no data" —
// 'granted' here means "the permission dialog has been shown", not "allowed".

const READ_TYPES = [
  'HKQuantityTypeIdentifierBodyMass',
  'HKQuantityTypeIdentifierRestingHeartRate',
  'HKCategoryTypeIdentifierSleepAnalysis',
] as const;
const SHARE_TYPES = ['HKWorkoutTypeIdentifier'] as const;

type HealthKitModule = typeof import('@kingstinct/react-native-healthkit');

let mod: HealthKitModule | null | undefined;

/** Lazy, platform-gated module access so non-iOS bundles never touch Nitro. */
function hk(): HealthKitModule | null {
  if (mod !== undefined) return mod;
  if (Platform.OS !== 'ios') {
    mod = null;
    return mod;
  }
  try {
    // A static import would load the Nitro native module on platforms without it.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const m = require('@kingstinct/react-native-healthkit') as HealthKitModule;
    mod = m.isHealthDataAvailable() ? m : null;
  } catch {
    mod = null; // Expo Go / simulator without HealthKit — feature simply off.
  }
  return mod;
}

export type HealthAuthState = 'unavailable' | 'shouldRequest' | 'granted';

export async function healthAuthState(): Promise<HealthAuthState> {
  const m = hk();
  if (!m) return 'unavailable';
  try {
    const status = await m.getRequestStatusForAuthorization({
      toRead: READ_TYPES,
      toShare: SHARE_TYPES,
    });
    // 'unnecessary' = the dialog has been shown; reads are safe from here on.
    return status === m.AuthorizationRequestStatus.unnecessary ? 'granted' : 'shouldRequest';
  } catch {
    return 'unavailable';
  }
}

/** Show the HealthKit permission sheet. Call ONLY from an explicit user tap. */
export async function requestHealthAuth(): Promise<HealthAuthState> {
  const m = hk();
  if (!m) return 'unavailable';
  try {
    await m.requestAuthorization({ toRead: READ_TYPES, toShare: SHARE_TYPES });
  } catch {
    // Sheet dismissed or unavailable — state below reports the truth.
  }
  return healthAuthState();
}

/** Pull bodyweight from Health (smart-scale imports) into the weight log —
 *  which also drives the adaptive fuel targets. Manual check-ins win: days
 *  that already have an entry are left alone. Safe to call every launch. */
export async function importHealthWeight(): Promise<void> {
  const m = hk();
  if (!m || (await healthAuthState()) !== 'granted') return;
  try {
    const since = new Date(todayDate());
    since.setDate(since.getDate() - 14);
    const samples = await m.queryQuantitySamples('HKQuantityTypeIdentifierBodyMass', {
      unit: 'lb',
      filter: { date: { startDate: since } },
      limit: 0,
      ascending: true,
    });
    // Last sample per local day wins (matches the one-entry-per-day model).
    const byDay = new Map<string, number>();
    for (const s of samples) {
      byDay.set(keyOf(new Date(s.endDate)), Math.round(s.quantity * 10) / 10);
    }
    for (const [dateKey, lb] of byDay) {
      const existing = db.getFirstSync<{ id: string }>(
        'select id from weight_entries where measured_on = ? and deleted_at is null',
        [dateKey],
      );
      if (!existing && lb > 50 && lb < 1000) {
        logWeight(dateKey, lb);
      }
    }
  } catch {
    // Never let a Health read break launch.
  }
}

export interface Recovery {
  /** Most recent resting heart rate, bpm. */
  restingHr: number | null;
  /** Asleep hours since 18:00 yesterday. */
  sleepHours: number | null;
}

// HKCategoryValueSleepAnalysis: 1 asleepUnspecified, 3 core, 4 deep, 5 REM.
const ASLEEP_VALUES = new Set([1, 3, 4, 5]);

/** Last night's recovery signals for the Today tab. Null fields when Health
 *  has no data (or read access was denied — indistinguishable by design). */
export async function getRecovery(): Promise<Recovery | null> {
  const m = hk();
  if (!m || (await healthAuthState()) !== 'granted') return null;
  try {
    const rhr = await m.getMostRecentQuantitySample(
      'HKQuantityTypeIdentifierRestingHeartRate',
      'count/min',
    );

    const from = new Date(todayDate());
    from.setDate(from.getDate() - 1);
    from.setHours(18, 0, 0, 0);
    const sleep = await m.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
      filter: { date: { startDate: from } },
      limit: 0,
      ascending: true,
    });
    let asleepMs = 0;
    for (const s of sleep) {
      if (ASLEEP_VALUES.has(s.value)) {
        asleepMs += new Date(s.endDate).getTime() - new Date(s.startDate).getTime();
      }
    }

    const restingHr = rhr ? Math.round(rhr.quantity) : null;
    const sleepHours = asleepMs > 0 ? Math.round((asleepMs / 3_600_000) * 10) / 10 : null;
    return restingHr === null && sleepHours === null ? null : { restingHr, sleepHours };
  } catch {
    return null;
  }
}

/** Write a just-finished session back to Health as a workout ending now. */
export async function saveWorkoutToHealth(
  kind: 'strength' | 'cardio' | 'ruck',
  durationSec: number,
): Promise<void> {
  const m = hk();
  if (!m || (await healthAuthState()) !== 'granted') return;
  if (durationSec < 60) return; // implausible session
  try {
    const end = new Date();
    const start = new Date(end.getTime() - durationSec * 1000);
    const activityType =
      kind === 'ruck'
        ? m.WorkoutActivityType.hiking
        : kind === 'cardio'
          ? m.WorkoutActivityType.other
          : m.WorkoutActivityType.traditionalStrengthTraining;
    await m.saveWorkoutSample(activityType, [], start, end);
  } catch {
    // Write denied or Health unavailable — the in-app log is the record.
  }
}
