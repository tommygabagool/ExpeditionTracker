# Weight-suggestion system — numbers & sources

Everything here is implemented in `src/program/lifts.ts` + `src/program/estimator.ts`.
Locked 2026-07-07 after research; conservative by design (start too light, progress up).

## Seed working-max

- **Calibrated** (onboarding, "~8 reps with 2–3 in the tank"): Epley `1RM ≈ w × (1 + 8/30)`,
  then ×0.90 for `new` only (form-under-load cushion; the RIR self-report and
  submaximal Epley already under-estimate, so a deeper cut would triple-discount).
- **Uncalibrated**: bodyweight ratio (experience baked into the column — no extra modifier):

| Lift | New | Returning | Trained |
|---|---|---|---|
| Back Squat | 0.50 | 0.65 | 0.80 |
| Deadlift | 0.60 | 0.75 | 0.90 |
| Overhead Press | 0.30 | 0.38 | 0.45 |
| Barbell Row | 0.40 | 0.50 | 0.60 |

Calibrated ratios land New ≈ "untrained", Trained ≈ "novice" on the ExRx /
Strength Level standards tables for a heavy (~260 lb) male — ratios compress at
high bodyweight, which is why these sit below population-median tables.

## % of working-max by rep target

The RPE-8 / 2-reps-in-reserve column of the standard RPE→%1RM chart
(Helms/Zourdos RIR model) — matching the calibration prompt semantics:

| Reps | ≤5 | 6 | 7–8 | 9–10 | 11–12 | 13+ |
|---|---|---|---|---|---|---|
| % | 80 | 77.5 | 72.5 | 67.5 | 62.5 | 57.5 |

## Movement ratios & load types

| Exercise | Anchor × factor | Load |
|---|---|---|
| Back Squat / Deadlift / OHP / Row | anchor × 1.00 | barbell |
| Front Squat | squat × 0.80 | barbell |
| Romanian Deadlift | deadlift × 0.80 | barbell |
| Incline DB Bench | press × 1.15 ÷ 2 | per-hand (rough) |
| Single-Arm DB Row | row × 0.55 | one DB (rough) |
| Weighted Pull-Up / Dip | — | added load, starts at BW |

Front squat ≈ 80% of back squat for back-squat-dominant lifters; RDL working
weight lands ~72% of deadlift working weight (inside the 50–75% guidance).

## Progression (real logs override the seed)

- Hit every prescribed rep at the working weight → next session **+10 lb lower / +5 lb upper**
  (StrongLifts / Starting Strength convention).
- Any miss → **hold**. Bad miss (<50% of prescribed reps) → **−10%**.
- Deload weeks (5/9/14/18/23) → **×0.85** always (program already halves volume those weeks).
- Rounding: nearest 5 lb; barbell floor 45 (empty bar); added-load floor 0 (= bodyweight).
- Today's suggestion reads the last attempt **strictly before** the viewed date, so an
  in-progress session never feeds its own suggestion.

## Sources

- RPE→%1RM / RIR: Helms et al. 2016 (Strength & Conditioning Journal); chart via
  fitnesscalcs.com/rpe-percentage-calculator
- Standards: exrx.net/Testing/WeightLifting/StrengthStandards, strengthlevel.com/strength-standards
- Front squat ratio: christianbosse.com/back-squat-front-squat-ratio
- RDL ratio: strengthlevel.com/strength-standards/romanian-deadlift-vs-deadlift
- Increments: stronglifts.com/stronglifts-5x5/progress (SL 5×5 / Starting Strength)
- Deload magnitude: PMC10948666 (deloading practices survey) + practitioner guides (10–15% load cut)
