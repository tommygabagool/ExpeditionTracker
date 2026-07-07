import { db } from '@/lib/db';
import { workoutFor, type Workout } from './builder';

// Program reads: the synced program_days table is authoritative once seeded
// (scripts/seed-program.ts); before the first sync the in-code builder serves
// identical output so the app works offline out of the box.

export function getWorkout(week: number, dow: number): Workout {
  try {
    const row = db.getFirstSync<{ title: string; blocks: string }>(
      `select pd.title, pd.blocks from program_days pd
       join programs p on p.id = pd.program_id
       where pd.week = ? and pd.day = ?
         and p.version = (select max(version) from programs)
       limit 1`,
      [week, dow],
    );
    if (row) {
      const blocks = JSON.parse(row.blocks) as Pick<Workout, 'type' | 'exercises'>;
      return { title: row.title, type: blocks.type, exercises: blocks.exercises };
    }
  } catch (err) {
    console.warn('[program] table read failed, using builder fallback', err);
  }
  return workoutFor(week, dow);
}
