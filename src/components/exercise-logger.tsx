import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { FontFamily, palette } from '@/constants/theme';
import { logExerciseSets } from '@/data/repos';
import { attemptFrom, type ExerciseLogEntry, type Suggestion } from '@/program/estimator';
import { parseSetsReps } from '@/program/lifts';

interface Props {
  name: string;
  detail: string; // "4×5"
  suggestion: Suggestion;
  logs: ExerciseLogEntry[]; // this exercise's history, date desc
  dateKey: string;
  week: number;
  phase: string;
}

interface SetRow {
  weight: string;
  reps: string;
  done: boolean;
}

// Tap the exercise row to expand set-by-set logging: weight × reps + a ✓ per
// set. Every ✓ persists the whole entry (one atomic exercise_logs row), which
// feeds the next session's suggestion.
export function ExerciseLogger({ name, detail, suggestion, logs, dateKey, week, phase }: Props) {
  const target = parseSetsReps(detail) ?? { sets: 3, reps: 8 };
  const todayLog = logs.find((e) => e.date === dateKey);
  const lastEntry = logs.find((e) => e.date < dateKey && e.sets.some((s) => s.done));
  const lastAttempt = lastEntry ? attemptFrom(lastEntry) : null;

  const [expanded, setExpanded] = useState(false);
  const [rows, setRows] = useState<SetRow[]>(() =>
    Array.from({ length: target.sets }, (_, i) => {
      const saved = todayLog?.sets[i];
      return {
        weight: String(saved?.weight ?? suggestion.weightLb),
        reps: String(saved?.reps ?? target.reps),
        done: saved?.done ?? false,
      };
    }),
  );

  const doneCount = rows.filter((r) => r.done).length;

  const persist = (next: SetRow[]) => {
    logExerciseSets({
      logDate: dateKey,
      exerciseId: suggestion.exerciseId,
      exerciseName: name,
      week,
      phase,
      repTarget: target.reps,
      setTarget: target.sets,
      suggestedWeightLb: suggestion.weightLb,
      sets: next.map((r, i) => ({
        set: i + 1,
        weight: parseFloat(r.weight) || 0,
        reps: parseInt(r.reps, 10) || 0,
        done: r.done,
      })),
    });
  };

  const update = (i: number, patch: Partial<SetRow>, save = false) => {
    const next = rows.map((r, j) => (j === i ? { ...r, ...patch } : r));
    setRows(next);
    if (save) persist(next);
  };

  const lastLine = lastAttempt
    ? 'LAST · ' +
      lastEntry!.sets
        .filter((s) => s.done)
        .map((s) => `${s.weight}×${s.reps}`)
        .join(' · ')
    : 'FIRST SESSION · SEED ESTIMATE';

  return (
    <View style={styles.wrap}>
      <Pressable onPress={() => setExpanded(!expanded)} style={styles.headRow}>
        <Text style={styles.name}>{name}</Text>
        <View style={styles.headRight}>
          <Text style={styles.detail}>{detail}</Text>
          <Text style={styles.weight}>{suggestion.label}</Text>
          <Text
            style={[
              styles.doneMark,
              { color: doneCount >= target.sets ? palette.green : palette.faint },
            ]}>
            {doneCount > 0 ? `${doneCount}/${target.sets}` : expanded ? '▾' : '▸'}
          </Text>
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.body}>
          <Text style={styles.lastLine}>{lastLine}</Text>
          {rows.map((r, i) => (
            <View key={i} style={styles.setRow}>
              <Text style={styles.setLabel}>S{i + 1}</Text>
              <TextInput
                value={r.weight}
                onChangeText={(t) => update(i, { weight: t })}
                onEndEditing={() => persist(rows)}
                keyboardType="decimal-pad"
                style={[styles.input, styles.weightInput]}
              />
              <Text style={styles.times}>×</Text>
              <TextInput
                value={r.reps}
                onChangeText={(t) => update(i, { reps: t })}
                onEndEditing={() => persist(rows)}
                keyboardType="number-pad"
                style={[styles.input, styles.repsInput]}
              />
              <View style={{ flex: 1 }} />
              <Pressable
                onPress={() => update(i, { done: !r.done }, true)}
                style={[
                  styles.check,
                  {
                    borderColor: r.done ? palette.green : palette.faint,
                    backgroundColor: r.done ? palette.green : 'transparent',
                  },
                ]}>
                <Text style={{ fontSize: 13, lineHeight: 15, color: r.done ? palette.bg : palette.faint }}>
                  ✓
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  headRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
    paddingVertical: 9,
  },
  name: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 14,
    color: palette.text,
  },
  headRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  detail: {
    fontFamily: FontFamily.mono,
    fontSize: 12.5,
    color: palette.textDim,
  },
  weight: {
    fontFamily: FontFamily.monoBold,
    fontSize: 12.5,
    color: palette.gold,
  },
  doneMark: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    width: 28,
    textAlign: 'right',
  },
  body: {
    paddingBottom: 10,
    gap: 6,
  },
  lastLine: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: palette.muted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: palette.faint,
    width: 22,
  },
  input: {
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.line,
    color: palette.text,
    fontFamily: FontFamily.mono,
    fontSize: 13,
    paddingVertical: 6,
    paddingHorizontal: 8,
    textAlign: 'center',
  },
  weightInput: { width: 68 },
  repsInput: { width: 48 },
  times: { fontFamily: FontFamily.mono, fontSize: 11, color: palette.faint },
  check: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
