import type { FigureName } from '@/data/figures';

// Field-guide content for every movement the builder emits — what Session
// Mode teaches. Keyed by the EXACT exercise name from src/program/builder.ts.
// Ids match src/program/lifts.ts where a lift has one (so logs line up with
// the estimator); everything else gets its own slug so accessories build
// history too.

export type ExerciseKind =
  | 'lift' // suggestion-backed strength work
  | 'accessory' // strength work without a weight suggestion
  | 'core'
  | 'carry'
  | 'cardio'
  | 'mobility'
  | 'protocol'; // ruck-day prescription lines, HR caps — read, don't log

export interface ExerciseInfo {
  id: string;
  kind: ExerciseKind;
  /** Small-caps muscle / focus line, e.g. "QUADS · GLUTES · ERECTORS". */
  muscles: string;
  /** Why it's in an alpine program — one or two sentences. */
  why: string;
  /** Execution, numbered. */
  how: string[];
  /** The 2–3 cues that matter mid-set. */
  cues: string[];
  /** Common faults to watch for. */
  faults: string[];
  /** Line-art demo, when one exists. */
  figure?: FigureName;
  /** Rest between sets, seconds. Unset = not set-based. */
  restSec?: number;
}

export const EXERCISE_INFO: Record<string, ExerciseInfo> = {
  // ---- Lower A ---------------------------------------------------------------
  'Back Squat': {
    id: 'back_squat',
    kind: 'lift',
    muscles: 'QUADS · GLUTES · ERECTORS',
    why: 'The single biggest strength base for steep travel under load. Every uphill step is a one-leg quarter squat — build the pattern heavy here so it feels light on the mountain.',
    how: [
      'Bar on upper traps, hands just outside shoulders, elbows down.',
      'Feet shoulder-width, toes out 15–30°. Big breath, brace.',
      'Sit down and slightly back until hip crease passes the knee.',
      'Drive the floor apart and stand — exhale at the top.',
    ],
    cues: ['Brace before you bend', 'Knees track over toes', 'Whole foot planted'],
    faults: ['Heels lifting or knees caving in', 'Chest collapsing out of the hole', 'Cutting depth as the weight climbs'],
    figure: 'back_squat',
    restSec: 180,
  },
  'Romanian Deadlift': {
    id: 'romanian_deadlift',
    kind: 'lift',
    muscles: 'HAMSTRINGS · GLUTES · LOW BACK',
    why: 'Loads the hinge that controls every descent. Strong hamstrings are your brakes on the way down — the muscle group that fails first on big descent days.',
    how: [
      'Start standing, bar at the thigh, knees soft and fixed.',
      'Push the hips straight back, bar sliding down the leg.',
      'Stop when the hamstrings load hard — mid-shin at most.',
      'Drive hips forward to stand. The knees never travel.',
    ],
    cues: ['Hips back, not down', 'Bar stays on the leg', 'Flat back the whole way'],
    faults: ['Bending the knees into a half deadlift', 'Rounding the low back at the bottom', 'Bar drifting off the thigh'],
    figure: 'romanian_deadlift',
    restSec: 180,
  },
  'Weighted Step-Up': {
    id: 'weighted_step_up',
    kind: 'accessory',
    muscles: 'QUADS · GLUTES · BALANCE',
    why: 'The most mountain-specific lift in the gym — one leg lifting body plus pack onto a high step, exactly what a boulder field asks for.',
    how: [
      'Dumbbells at your sides, full foot on a knee-height box.',
      'Drive through the top heel until the leg is straight.',
      'Bring the trailing knee up — no push off the floor foot.',
      'Lower under control. All reps one side, then switch.',
    ],
    cues: ['Top leg does all the work', 'Stand fully tall each rep', 'Quiet, controlled descent'],
    faults: ['Bouncing off the back foot', 'Torso pitching forward', 'Box too high to control'],
    figure: 'step_up',
    restSec: 90,
  },
  'Standing Calf Raise': {
    id: 'standing_calf_raise',
    kind: 'accessory',
    muscles: 'CALVES · ACHILLES',
    why: 'Calves fire on every uphill step and cramp first at altitude. Full-range work here also armors the Achilles for thousands of loaded steps.',
    how: [
      'Balls of feet on an edge, heels hanging, weight in hand.',
      'Drop the heels below the step for a full stretch.',
      'Drive up as high as you can and pause one second.',
      'Lower slow — three seconds down.',
    ],
    cues: ['Full stretch, full height', 'Pause at the top', 'No bouncing'],
    faults: ['Short pumpy reps', 'Bent knees turning it into nothing', 'Rushing the negative'],
    figure: 'calf_raise',
    restSec: 90,
  },
  'Hanging Knee Raise': {
    id: 'hanging_knee_raise',
    kind: 'core',
    muscles: 'ABS · HIP FLEXORS · GRIP',
    why: 'Hip flexors lift your boot over every rock and up every high step; the hang doubles as grip work for axe and fixed line.',
    how: [
      'Dead hang from the bar, shoulders packed down.',
      'Curl the knees up past the hips, pelvis tucking under.',
      'Lower with control to a full hang.',
    ],
    cues: ['Curl the pelvis, not just knees', 'No swing between reps', 'Dead stop at the bottom'],
    faults: ['Kipping momentum', 'Stopping at 90° — get the tuck', 'Shrugged, loose shoulders'],
    figure: 'knee_raise',
    restSec: 90,
  },

  // ---- Upper Pull B ----------------------------------------------------------
  'Weighted Pull-Up': {
    id: 'weighted_pull_up',
    kind: 'lift',
    muscles: 'LATS · BICEPS · GRIP',
    why: 'Pound-for-pound upper-body strength — hauling yourself plus pack over a ledge is a weighted pull-up. Added load comes only after clean bodyweight sets.',
    how: [
      'Grip just outside shoulders, plate on a belt once earned.',
      'Start from a dead hang, shoulders engaged.',
      'Pull until the chin clears the bar.',
      'Lower all the way — every rep starts from straight arms.',
    ],
    cues: ['Chest to the bar', 'Elbows drive to the ribs', 'Full hang every rep'],
    faults: ['Half-range reps at the top or bottom', 'Kicking and swinging', 'Adding load before owning bodyweight'],
    figure: 'pull_up',
    restSec: 120,
  },
  'Barbell Row': {
    id: 'barbell_row',
    kind: 'lift',
    muscles: 'MID-BACK · LATS · REAR DELTS',
    why: 'Builds the pulling mass that carries a pack: a strong upper back keeps shoulder straps from grinding you down over a seven-hour day.',
    how: [
      'Hinge to ~45°, bar hanging at arm’s length, back flat.',
      'Row the bar to the lower ribs.',
      'Pause a beat, lower under control without standing up.',
    ],
    cues: ['Torso stays frozen', 'Pull with the elbows', 'Squeeze the blades together'],
    faults: ['Heaving upright to move the bar', 'Bouncing reps off the floor', 'Elbows flaring to 90°'],
    figure: 'barbell_row',
    restSec: 180,
  },
  'Single-Arm DB Row': {
    id: 'single_arm_db_row',
    kind: 'lift',
    muscles: 'LATS · MID-BACK · CORE',
    why: 'Unilateral pulling evens out left–right gaps and hits the lat through a longer arc than the barbell allows.',
    how: [
      'One hand and knee braced on the bench, back flat.',
      'Let the dumbbell hang and stretch the lat.',
      'Row to the hip pocket, pause, lower long.',
    ],
    cues: ['Pull to the hip, not the armpit', 'Shoulders square to the floor', 'Long stretch at the bottom'],
    faults: ['Twisting the torso open for extra reps', 'Short choppy strokes', 'Yanking with the biceps only'],
    figure: 'db_row',
    restSec: 90,
  },
  'Face Pull': {
    id: 'face_pull',
    kind: 'accessory',
    muscles: 'REAR DELTS · ROTATOR CUFF · TRAPS',
    why: 'Insurance work. Balances all the pressing and pack-hunching with strong external rotators — the difference between sore and injured shoulders in week 20.',
    how: [
      'Rope at face height, arms long, palms in.',
      'Pull toward the bridge of your nose, elbows high and wide.',
      'Finish with knuckles beside your ears, pause, return slow.',
    ],
    cues: ['Elbows high and wide', 'Thumbs point behind you', 'Light weight, perfect reps'],
    faults: ['Loading it like a row', 'Elbows dropping into a curl', 'Leaning back to cheat'],
    figure: 'face_pull',
    restSec: 90,
  },
  'Farmer Carry': {
    id: 'farmer_carry',
    kind: 'carry',
    muscles: 'GRIP · TRAPS · FULL-BODY BRACE',
    why: 'Loaded carry under fatigue is the job description. Grip, posture, and gait under heavy hands transfer to hauling duffels and water up to camp.',
    how: [
      'Heavy dumbbell or kettlebell in each hand.',
      'Stand tall, shoulders down and back.',
      'Walk the distance in controlled, even steps.',
      'Set the weight down with a flat back — that’s a rep.',
    ],
    cues: ['Tall spine, proud chest', 'Knuckles forward', 'Smooth heel-to-toe steps'],
    faults: ['Shuffling with short steps', 'One shoulder sagging', 'Death-gripping so hard you hold your breath'],
    figure: 'farmer_carry',
    restSec: 90,
  },

  // ---- Lower / Full C ---------------------------------------------------------
  Deadlift: {
    id: 'deadlift',
    kind: 'lift',
    muscles: 'POSTERIOR CHAIN · GRIP · TRAPS',
    why: 'Total-body strength in one lift — the pattern for lifting a haul bag, a partner, or yourself off the deck. Nothing raises your ceiling faster.',
    how: [
      'Bar over mid-foot, shins an inch away.',
      'Hinge down, grip just outside the legs, flat back, chest up.',
      'Pull the slack out, then drive the floor away.',
      'Lock hips and knees together. Return down the same path.',
    ],
    cues: ['Slack out before you pull', 'Bar drags up the leg', 'Hips and shoulders rise together'],
    faults: ['Hips shooting up first', 'Rounding the low back off the floor', 'Jerking the bar at the start'],
    figure: 'deadlift',
    restSec: 180,
  },
  'Front Squat': {
    id: 'front_squat',
    kind: 'lift',
    muscles: 'QUADS · UPPER BACK · CORE',
    why: 'Squatting with the load in front is carrying a pack in reverse — it hammers the quads and forces the upright brace that a heavy pack demands.',
    how: [
      'Bar on the front delts, elbows driven high, relaxed grip.',
      'Feet shoulder-width. Brace hard.',
      'Sit straight down between the heels, torso vertical.',
      'Stand while keeping the elbows up the whole way.',
    ],
    cues: ['Elbows up, always', 'Torso stays vertical', 'Sit between the heels'],
    faults: ['Elbows dropping and dumping the bar', 'Turning it into a back-squat lean', 'Rising onto the toes'],
    figure: 'front_squat',
    restSec: 180,
  },
  'Walking Lunge': {
    id: 'walking_lunge',
    kind: 'accessory',
    muscles: 'QUADS · GLUTES · BALANCE',
    why: 'Alternating single-leg work with a moving center of mass — the gym version of talus-hopping. Builds the stability that keeps ankles honest off-trail.',
    how: [
      'Dumbbells at your sides, long step forward.',
      'Lower until the back knee kisses the floor.',
      'Drive through the front heel and step straight into the next rep.',
    ],
    cues: ['Torso tall between steps', 'Front knee over the laces', 'Soft touch, no knee slam'],
    faults: ['Short steps that jam the knee', 'Wobbling on a tightrope — keep the feet hip-width', 'Pushing off the back leg'],
    figure: 'lunge',
    restSec: 90,
  },
  'Box Step-Down': {
    id: 'box_step_down',
    kind: 'accessory',
    muscles: 'QUADS · GLUTES · KNEE CONTROL',
    why: 'Eccentric single-leg strength is downhill strength. Controlling a slow lower from a box is exactly what 3,000 ft of descent asks of each knee.',
    how: [
      'Stand on a box on one leg, hands out for balance.',
      'Bend the standing knee and lower the free foot to the floor — slow.',
      'Barely touch the heel down, then drive back to the top.',
    ],
    cues: ['Three seconds down', 'Knee tracks over the toes', 'Touch — don’t rest — at the bottom'],
    faults: ['Dropping the last few inches', 'Knee diving inward', 'Cheating with a push off the floor foot'],
    figure: 'step_down',
    restSec: 90,
  },
  'Weighted Plank': {
    id: 'weighted_plank',
    kind: 'core',
    muscles: 'DEEP CORE · SHOULDERS · GLUTES',
    why: 'A pack tries to fold you at the waist all day; the plank is that fight in isolation. Load on the back makes it honest.',
    how: [
      'Forearms down, plate centered on the upper back.',
      'One straight line from ear to ankle.',
      'Squeeze glutes and abs; breathe shallow and steady for the full time.',
    ],
    cues: ['Ribs down, tailbone tucked', 'Push the floor away', 'Keep breathing'],
    faults: ['Hips sagging into the low back', 'Butt hiking up to hide from the load', 'Holding your breath'],
    figure: 'plank',
    restSec: 90,
  },

  // ---- Upper Push + Core D ------------------------------------------------------
  'Overhead Press': {
    id: 'overhead_press',
    kind: 'lift',
    muscles: 'SHOULDERS · TRICEPS · CORE',
    why: 'Hauling a pack overhead onto a ledge, pressing off rock — vertical pushing strength with a braced trunk under it.',
    how: [
      'Bar at the collarbone, grip just outside shoulders.',
      'Brace glutes and abs — no back-bend.',
      'Press straight up, pulling the chin back out of the way.',
      'Finish with the bar over the ears, elbows locked.',
    ],
    cues: ['Squeeze glutes before you press', 'Bar path straight up', 'Head through at the top'],
    faults: ['Leaning back into a standing bench press', 'Pressing around the chin', 'Soft lockout'],
    figure: 'overhead_press',
    restSec: 180,
  },
  'Incline DB Bench': {
    id: 'incline_db_bench',
    kind: 'lift',
    muscles: 'UPPER CHEST · FRONT DELTS · TRICEPS',
    why: 'The pressing angle that matches mantling and high-hand moves; dumbbells make each side earn its own share.',
    how: [
      'Bench at 30–45°, dumbbells at the shoulders.',
      'Feet planted, upper back tight on the bench.',
      'Press up and slightly in until arms are long.',
      'Lower for a full stretch at the chest.',
    ],
    cues: ['Elbows about 45° from the ribs', 'Touch the chest, no bounce', 'Wrists stacked over elbows'],
    faults: ['Flaring elbows straight out', 'Arching into a flat press', 'Clanging the bells and cutting the stretch'],
    figure: 'incline_bench',
    restSec: 90,
  },
  'Weighted Dip': {
    id: 'weighted_dip',
    kind: 'lift',
    muscles: 'CHEST · TRICEPS · SHOULDERS',
    why: 'The mantle move itself: pressing your entire bodyweight-plus through your palms until your arms lock. Nothing mimics topping out a boulder better.',
    how: [
      'Arms locked on the bars, plate on a belt once earned.',
      'Lean slightly forward, bend to shoulders-level-with-elbows.',
      'Press back to a full lockout.',
    ],
    cues: ['Shoulders down away from ears', 'Slight forward lean', 'Depth to 90° — no lower needed'],
    faults: ['Diving too deep for the shoulders', 'Half-rep lockouts', 'Swinging the legs for momentum'],
    figure: 'dip',
    restSec: 120,
  },
  'Pallof Press': {
    id: 'pallof_press',
    kind: 'core',
    muscles: 'OBLIQUES · DEEP CORE',
    why: 'Anti-rotation under load: the cable tries to twist you, you refuse. That is a loaded traverse with poles in one hand and rock in the other.',
    how: [
      'Cable at chest height, stand side-on, hands clasped at the sternum.',
      'Press the hands straight out until arms are long.',
      'Hold two seconds against the pull, return. All reps, then face the other way.',
    ],
    cues: ['Hips and shoulders stay square', 'Press slow, resist slower', 'Breathe through the hold'],
    faults: ['Letting the cable rotate you', 'Standing too close — no tension', 'Rushing the reps'],
    figure: 'pallof',
    restSec: 90,
  },
  'Weighted Sit-Up': {
    id: 'weighted_sit_up',
    kind: 'core',
    muscles: 'ABS · HIP FLEXORS',
    why: 'Loaded trunk flexion for a core that does more than hold still — sitting up in a bag with a pack on your chest, kicking steps on steep snow.',
    how: [
      'Knees bent, plate hugged to the chest.',
      'Curl up until the torso is vertical.',
      'Lower slowly — don’t crash back to the floor.',
    ],
    cues: ['Curl, don’t hinge', 'Plate stays on the chest', 'Slow negative'],
    faults: ['Yanking the neck forward', 'Dropping the descent', 'Feet flying up'],
    figure: 'sit_up',
    restSec: 90,
  },

  // ---- Cardio days ---------------------------------------------------------------
  'Incline Treadmill': {
    id: 'incline_treadmill',
    kind: 'cardio',
    muscles: 'AEROBIC BASE · CALVES · HIP FLEXORS',
    why: 'Zone 2 on a grade is the engine work: mitochondria, capillaries, and fat metabolism — the systems that let you move for seven hours at altitude without blowing up.',
    how: [
      'Set the grade first (10–12%), then speed to hit the heart-rate band.',
      'Hands off the rails — holding on erases the incline.',
      'Nose-breathing pace: you should be able to speak full sentences.',
    ],
    cues: ['Conversational effort, always', 'No hands on the rails', 'Short choppy uphill steps'],
    faults: ['Creeping into zone 3 because it feels too easy', 'Rail-holding', 'Skipping it when strength feels more fun'],
    figure: 'hiker',
  },
  'Heart Rate Cap': {
    id: 'hr_cap',
    kind: 'protocol',
    muscles: 'PACING DISCIPLINE',
    why: 'The cap is the workout. Going harder trains a different (already strong) system and steals recovery from the lifts.',
    how: ['Stay inside the band for the whole block.', 'If HR drifts over, slow down or drop the grade — no ego.'],
    cues: ['Slower is the point'],
    faults: ['Treating the ceiling as a target to bounce off'],
  },
  'Hip + Ankle Mobility': {
    id: 'hip_ankle_mobility',
    kind: 'mobility',
    muscles: 'HIPS · ANKLES',
    why: 'Squat depth and downhill control both live here. Stiff ankles steal knee range on descents; stiff hips steal stride length on steeps.',
    how: [
      'Couch stretch: 90 s per side.',
      'Deep goblet-squat hold, prying knees out: 2 min total.',
      'Knee-over-toe ankle rocks against a wall: 15 per side.',
    ],
    cues: ['Long exhales into each stretch', 'Work the edge, not pain'],
    faults: ['Bouncing instead of breathing', 'Skipping it — this is the session'],
    figure: 'stretch',
  },
  Stairmill: {
    id: 'stairmill',
    kind: 'cardio',
    muscles: 'THRESHOLD ENGINE · QUADS · CALVES',
    why: 'Threshold work raises the pace you can hold when the route demands it — the col before the storm, the summit push window.',
    how: [
      'Warm up 5 min easy, then settle into the prescribed band.',
      'Full steps, standing tall — no leaning on the console.',
      'It should feel hard but repeatable: 3–4 word answers max.',
    ],
    cues: ['Tall posture, full steps', 'Hard but steady', 'Hands free'],
    faults: ['Propping bodyweight on the rails', 'Sprint-and-die pacing', 'Toe-tapping half steps'],
    figure: 'hiker',
  },
  'Cooldown Walk': {
    id: 'cooldown_walk',
    kind: 'protocol',
    muscles: 'RECOVERY',
    why: 'Ten easy minutes clears the legs and starts recovery before you even leave the gym.',
    how: ['Flat, easy pace until the heart rate is back under ~100.'],
    cues: ['Genuinely easy'],
    faults: ['Skipping straight to the car'],
  },
  'Calf + Quad Stretch': {
    id: 'calf_quad_stretch',
    kind: 'mobility',
    muscles: 'CALVES · QUADS',
    why: 'The two muscle groups the stairmill just shortened. Long holds now mean less morning-after hobble.',
    how: [
      'Wall calf stretch, straight knee then bent knee: 60 s each per side.',
      'Standing quad pull with squeezed glute: 60 s per side.',
    ],
    cues: ['Long holds, easy breathing'],
    faults: ['Ten-second token stretches'],
    figure: 'stretch',
  },

  // ---- Saturday ruck -----------------------------------------------------------
  'Ruck Pack': {
    id: 'ruck_pack',
    kind: 'protocol',
    muscles: 'THE WHOLE MACHINE',
    why: 'The long day is the keystone session — everything else exists to make Saturday bigger. Load the pack to spec; water counts and can be dumped at the turnaround.',
    how: ['Weigh the loaded pack before you leave.', 'Heaviest items high and close to the spine.', 'Cinch the hip belt hard — the hips carry, the straps steer.'],
    cues: ['Weight on hips, not shoulders'],
    faults: ['Guessing the pack weight', 'Everything dangling low and loose'],
    figure: 'hiker',
  },
  Duration: {
    id: 'ruck_duration',
    kind: 'protocol',
    muscles: 'TIME ON FEET',
    why: 'Time under the pack is the adaptation — not speed. Long, steady, boring hours build the durability that summit day spends.',
    how: ['Hit the prescribed hours door-to-door.', 'Steady sustainable pace; snack and sip on a timer, not on thirst.'],
    cues: ['All-day pace'],
    faults: ['Racing the first hour and limping the last'],
  },
  'Elevation Gain': {
    id: 'ruck_gain',
    kind: 'protocol',
    muscles: 'VERTICAL BUDGET',
    why: 'Gain is the currency the mountain charges in. Match the prescription with real trail — the Trails tab suggests routes that fit this week.',
    how: ['Pick a route that meets the target gain.', 'Poles out for the descents — save the knees for next week.'],
    cues: ['Descend as deliberately as you climb'],
    faults: ['Flat-route rucks that skip the vertical'],
  },
  'Fuel on the Move': {
    id: 'ruck_fuel',
    kind: 'protocol',
    muscles: 'GUT TRAINING',
    why: 'Eating while moving is a trainable skill; summit day requires it. Practice the exact foods you’ll carry on the mountain.',
    how: ['200–300 kcal every hour, starting in hour one.', 'Sip water every 15–20 min; add electrolytes past two hours.'],
    cues: ['Eat before you’re hungry'],
    faults: ['Waiting for the bonk to start eating', 'Testing brand-new foods on the long day'],
  },
};

/** Info lookup with a safe empty fallback for names not in the library. */
export function infoFor(name: string): ExerciseInfo | null {
  return EXERCISE_INFO[name] ?? null;
}

/** Fallback slug for exercises missing from the library (future program edits). */
export function slugFor(name: string): string {
  return (
    EXERCISE_INFO[name]?.id ??
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
  );
}
