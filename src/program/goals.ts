import { activeGoals } from './schedule';

// Weight targets. These used to be fixed module constants (260 → 230 for every
// user); they now read the signed-in user's enrollment goal_params via
// activeGoals(), falling back to the DEFAULT_* below when no enrollment is
// loaded. Call the accessors at use sites — do not cache the value, since the
// active enrollment changes on profile read / user switch.

export const DEFAULT_START_WEIGHT_LB = 260;
export const DEFAULT_GOAL_WEIGHT_LB = 230;

/** Program start weight for the active enrollment (chart anchor, "lb down"). */
export function startWeightLb(): number {
  return activeGoals().startWeightLb;
}

/** Goal weight for the active enrollment (macro protein, fuel pacing, badges). */
export function goalWeightLb(): number {
  return activeGoals().goalWeightLb;
}

// Fallback fuel numbers only: once the profile has fuel stats (onboarding),
// src/program/nutrition.ts computes maintenance/target/macros instead.
export const CALORIE_TARGET = 2350;
export const MAINTENANCE_CALORIES = 3100;
