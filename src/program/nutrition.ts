import { GOAL_WEIGHT_LB, CALORIE_TARGET, MAINTENANCE_CALORIES } from './goals';
import { dateOf, programWeeks, todayDate } from './schedule';

// Fuel targets computed from the onboarding stats instead of the design's
// frozen constants. Maintenance = Mifflin-St Jeor BMR × an activity factor
// that already includes the program's six weekly sessions (the picker asks
// about the rest of the day). The deficit is paced to reach GOAL_WEIGHT_LB by
// the program's final week from the CURRENT logged weight, so falling behind
// widens it and being ahead relaxes it — clamped to a sane band either way.

export type Sex = 'male' | 'female';
export type Activity = 'desk' | 'active' | 'hard';

/** Includes the program's training load; options describe the day job. */
export const ACTIVITY_FACTOR: Record<Activity, number> = {
  desk: 1.45,
  active: 1.6,
  hard: 1.75,
};

export interface FuelStats {
  weightLb: number;
  heightIn: number;
  ageYears: number;
  sex: Sex;
  activity: Activity;
}

/** Mifflin-St Jeor basal metabolic rate, kcal/day. */
export function mifflinBmr(s: FuelStats): number {
  const kg = s.weightLb * 0.4536;
  const cm = s.heightIn * 2.54;
  return 10 * kg + 6.25 * cm - 5 * s.ageYears + (s.sex === 'male' ? 5 : -161);
}

const DEFICIT_MIN = 250;
const DEFICIT_MAX = 900;
const KCAL_PER_LB = 3500;

export interface FuelPlan {
  /** 'profile' = computed from stats; 'default' = the design's frozen numbers. */
  source: 'profile' | 'default';
  maintenance: number;
  target: number;
  deficit: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** Projected loss at this deficit, lb/week (0 in maintenance mode). */
  lbPerWeek: number;
  /** True once the goal is reached (or the program is over): eat at maintenance. */
  maintain: boolean;
}

const round25 = (x: number) => Math.round(x / 25) * 25;
const round5 = (x: number) => Math.round(x / 5) * 5;

function macros(targetKcal: number): Pick<FuelPlan, 'proteinG' | 'carbsG' | 'fatG'> {
  // 1 g protein / lb of GOAL weight, ~30% of kcal from fat, carbs fill the rest.
  const proteinG = round5(GOAL_WEIGHT_LB);
  const fatG = round5((targetKcal * 0.3) / 9);
  const carbsG = round5(Math.max(0, (targetKcal - proteinG * 4 - fatG * 9) / 4));
  return { proteinG, carbsG, fatG };
}

/** The design-artifact numbers, used until the profile has fuel stats. */
export function defaultFuelPlan(): FuelPlan {
  return {
    source: 'default',
    maintenance: MAINTENANCE_CALORIES,
    target: CALORIE_TARGET,
    deficit: MAINTENANCE_CALORIES - CALORIE_TARGET,
    ...macros(CALORIE_TARGET),
    lbPerWeek: ((MAINTENANCE_CALORIES - CALORIE_TARGET) * 7) / KCAL_PER_LB,
    maintain: false,
  };
}

/**
 * Fuel plan for the current weight. Pass null stats (any field missing) to get
 * the default plan.
 */
export function fuelPlan(stats: FuelStats | null): FuelPlan {
  if (!stats) return defaultFuelPlan();

  const bmr = mifflinBmr(stats);
  const maintenance = round25(bmr * ACTIVITY_FACTOR[stats.activity]);

  const lbToGo = stats.weightLb - GOAL_WEIGHT_LB;
  const end = dateOf(programWeeks(), 6);
  const daysLeft = Math.max(1, Math.round((end.getTime() - todayDate().getTime()) / 86400000));
  const maintain = lbToGo <= 0 || daysLeft <= 1;

  let deficit = 0;
  if (!maintain) {
    const paced = (lbToGo * KCAL_PER_LB) / daysLeft;
    deficit = Math.min(DEFICIT_MAX, Math.max(DEFICIT_MIN, paced));
  }
  // Never prescribe eating below basal.
  const target = round25(Math.max(bmr, maintenance - deficit));

  return {
    source: 'profile',
    maintenance,
    target,
    deficit: maintenance - target,
    ...macros(target),
    lbPerWeek: ((maintenance - target) * 7) / KCAL_PER_LB,
    maintain,
  };
}
