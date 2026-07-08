# Fuel targets — sources and rationale

Companion to `weight-suggestions.md`. Documents where every number in
`src/program/nutrition.ts` comes from, verified against the literature
July 8, 2026. No external APIs are involved — everything computes locally
from onboarding stats + the latest logged weight, which fits the app's
offline-first architecture.

## The chain

```
BMR (Mifflin-St Jeor) × activity factor = maintenance
maintenance − paced deficit            = daily target   (floored at BMR)
protein 1 g/lb goal · fat 30% kcal · carbs remainder = macros
```

## 1. BMR — Mifflin-St Jeor (1990)

`10·kg + 6.25·cm − 5·age + (male +5 / female −161)`

Chosen because the Academy of Nutrition and Dietetics recommends it (using
actual body weight) for overweight/obese adults, and a systematic review
found it the most reliable predictive equation — within 10% of measured RMR
for more individuals (87% non-obese / 75% obese) than any alternative, with
the narrowest error range.

- ADA evidence library: https://www.andeal.org/template.cfm?template=guide_summary&key=621
- Frankenfield systematic review (J Am Diet Assoc 2005): https://www.jandonline.org/article/S0002-8223(05)00149-5/abstract

Known limitation: ±10% individual error is common. Mitigated by the pacing
loop (below), which corrects against actual logged weight rather than
trusting the estimate.

## 2. Activity factors — desk 1.45 / active 1.6 / hard 1.75

Standard TDEE multipliers, positioned to already include the program's six
weekly sessions; the onboarding picker asks only about the day job. Sanity
anchor: 260 lb male, 6'2", mid-30s, desk → BMR ≈ 2185 × 1.45 ≈ 3170, in
line with the design artifact's hand-picked 3,100 maintenance.

## 3. Deficit — paced to goal, clamped 250–900 kcal

`(current − goal) × 3500 / days to end of week 26`, recomputed from the
LATEST logged weight every render.

- Rate check (Garthe et al., IJSNEM 2011): elite athletes cutting at
  **0.7% bodyweight/week** kept/gained lean mass and outperformed a 1.4%/wk
  group. Our max clamp (900 kcal ≈ 1.8 lb/wk) is ≈ 0.7%/wk at 260 lb — the
  system cannot exceed the evidence-backed rate for this bodyweight; the
  typical paced value (~575 kcal, ~1.15 lb/wk ≈ 0.44%/wk) sits comfortably
  under it. https://pubmed.ncbi.nlm.nih.gov/21558571/
- The 3500 kcal/lb rule (Wishnofsky 1958) is known to OVERESTIMATE loss
  over long horizons because expenditure falls as weight falls (Hall &
  Chow, Int J Obes 2013: https://pmc.ncbi.nlm.nih.gov/articles/PMC3859816/).
  We use it only as a short-horizon pacing heuristic between weigh-ins: the
  weekly re-pace from real weight absorbs the metabolic-adaptation error
  the static rule ignores. (A full dynamic model — Hall's NIH Body Weight
  Planner — would be more exact but is overkill for this loop.)
- Floor: target never below BMR (standard coaching guardrail).
- At/below goal weight or past week 26 → maintenance mode, deficit 0.

## 4. Protein — 1 g/lb of GOAL weight (230 g)

Helms et al. systematic review (IJSNEM 2014): energy-restricted,
resistance-trained athletes need **2.3–3.1 g/kg of fat-free mass**, scaled
up with leanness/deficit severity. At 260 lb and ~30% BF, FFM ≈ 82 kg →
189–254 g/day; 230 g sits mid-band, and the "goal-weight" anchor keeps it
there as bodyweight falls. https://pubmed.ncbi.nlm.nih.gov/24092765/

Fat at 30% of target kcal (hormonal floor convention), carbs fill the
remainder — biased around training per the Fuel tab's food guide.

## APIs considered and rejected (for now)

- "Coach"/TDEE service APIs: nothing credible exists that beats a local
  formula; targets are arithmetic, not data.
- Food-database APIs (USDA FoodData Central, Open Food Facts, Nutritionix,
  FatSecret): only relevant if per-food logging with barcode scan ever
  replaces the one-number daily calorie log. USDA FDC + Open Food Facts are
  the free options to start with.
- **Apple HealthKit** (react-native-health, native module → EAS rebuild):
  the one integration that would genuinely improve accuracy — real Apple
  Watch energy expenditure instead of activity factors, and auto-synced
  smart-scale weigh-ins feeding the pacing loop. Worth revisiting after
  a few weeks of manual data.
