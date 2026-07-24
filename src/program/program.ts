import { db } from '@/lib/db';
import { workoutFor, type Workout } from './builder';
import { enrolledProgramId } from './schedule';
import { personalizeWorkout } from './trip';

// Program reads: the synced program_days table is authoritative once seeded
// (scripts/seed-program.ts); before the first sync the in-code builder serves
// identical output so the app works offline out of the box. Reads are pinned
// to the enrollment's program version (enrolledProgramId) so a re-seed never
// changes prescriptions under a mid-program user; unpinned falls back to the
// latest seeded version, then the builder. Both paths run through
// personalizeWorkout — the trip never re-seeds program_days.

type DayRow = { title: string; blocks: string };

function readDay(week: number, dow: number): DayRow | null {
  const programId = enrolledProgramId();
  if (programId) {
    return db.getFirstSync<DayRow>(
      'select title, blocks from program_days where program_id = ? and week = ? and day = ? limit 1',
      [programId, week, dow],
    );
  }
  return db.getFirstSync<DayRow>(
    `select pd.title, pd.blocks from program_days pd
     join programs p on p.id = pd.program_id
     where pd.week = ? and pd.day = ?
       and p.version = (select max(version) from programs)
     limit 1`,
    [week, dow],
  );
}

export function getWorkout(week: number, dow: number): Workout {
  try {
    const row = readDay(week, dow);
    if (row) {
      const blocks = JSON.parse(row.blocks) as Pick<Workout, 'type' | 'exercises'>;
      return personalizeWorkout(week, { title: row.title, type: blocks.type, exercises: blocks.exercises });
    }
  } catch (err) {
    console.warn('[program] table read failed, using builder fallback', err);
  }
  return personalizeWorkout(week, workoutFor(week, dow));
}

/** Engine entry point: the enrolled user's full week of prescriptions
 *  (day 0=Sun … 6=Sat), read from the pinned program version and personalized
 *  read-time. Working-weight suggestions are layered on per exercise at the UI
 *  (suggestForExercise), which needs the logged history to progress. */
export function buildWeek(week: number): Workout[] {
  return [0, 1, 2, 3, 4, 5, 6].map((dow) => getWorkout(week, dow));
}
