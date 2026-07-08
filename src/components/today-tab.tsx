import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Altimeter } from '@/components/altimeter';
import { FontFamily, goldTint, palette } from '@/constants/theme';
import { completeWorkout, uncompleteWorkout } from '@/data/repos';
import type { AppData } from '@/data/store';
import type { Ascent } from '@/program/ascent';
import { CAMP_DEFS, type BadgeComputed } from '@/program/badges';
import { suggestForExercise } from '@/program/estimator';
import { slugFor } from '@/program/exercise-library';
import { getWorkout } from '@/program/program';
import {
  currentWeek,
  DAY_NAMES,
  fmtShort,
  isDeloadWeek,
  keyOf,
  phaseOf,
  todayDate,
} from '@/program/schedule';

import { BadgeMedal } from './badge-medal';

interface Props {
  data: AppData;
  badges: BadgeComputed[];
  ascent: Ascent;
  onOpenSummit: () => void;
  onStartSession: () => void;
}

export function TodayTab({ data, badges, ascent, onOpenSummit, onStartSession }: Props) {
  const today = todayDate();
  const todayKey = keyOf(today);
  const dow = today.getDay();
  const week = currentWeek();
  const phase = phaseOf(week);
  const workout = getWorkout(week, dow);
  const done = !!data.completions[todayKey];
  const deload = isDeloadWeek(week);

  const locked = badges.filter((b) => !b.earned);
  const next = [...locked].sort((a, b) => b.cur / b.goal - a.cur / a.goal)[0] || badges[0];
  const ratio = Math.min(1, next.cur / next.goal);
  const ringColor = ratio > 0 ? palette.orange : palette.lock;
  const iconColor = ratio > 0 ? palette.gold : palette.lock;
  const progText = next.goal > 1 ? `${next.cur} / ${next.goal}` : CAMP_DEFS[next.camp].name;

  return (
    <View style={styles.container}>
      <Altimeter ascent={ascent} />

      <View style={[styles.card, { borderTopColor: phase.color, borderTopWidth: 3, marginTop: 14 }]}>
        <View style={styles.cardHead}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.dateLine}>
              {DAY_NAMES[dow]} · {fmtShort(today)} · WK {String(week).padStart(2, '0')}/26
            </Text>
            <Text style={styles.workoutTitle}>{workout.title.toUpperCase()}</Text>
          </View>
          <View style={{ gap: 6, alignItems: 'flex-end' }}>
            <Text style={[styles.pill, { color: phase.color, borderColor: phase.color }]}>{phase.name}</Text>
            {deload && <Text style={[styles.pill, { color: palette.gold, borderColor: palette.gold }]}>DELOAD</Text>}
          </View>
        </View>

        {deload && (
          <Text style={styles.deloadNote}>
            Deload week — cut all sets to 2, keep loads light, prioritize recovery.
          </Text>
        )}

        {/* Read-only preview — logging lives in Session Mode. */}
        <View style={styles.exercises}>
          {workout.exercises.map((ex) => {
            const sug = suggestForExercise(
              ex.name,
              ex.detail,
              data.profile,
              week,
              data.exerciseLogs,
              todayKey,
            );
            const exId = sug?.exerciseId ?? slugFor(ex.name);
            const todayLog = data.exerciseLogs[exId]?.find((e) => e.date === todayKey);
            const doneSets = todayLog?.sets.filter((s) => s.done).length ?? 0;
            const setTarget = todayLog?.setTarget ?? 0;
            return (
              <View key={ex.name} style={styles.exerciseRow}>
                <Text style={styles.exerciseName} numberOfLines={1}>
                  {ex.name}
                </Text>
                <View style={styles.exerciseRight}>
                  <Text style={styles.exerciseDetail}>{ex.detail}</Text>
                  {sug && <Text style={styles.exerciseWeight}>{sug.label}</Text>}
                  {doneSets > 0 && (
                    <Text
                      style={[
                        styles.exerciseProg,
                        { color: setTarget > 0 && doneSets >= setTarget ? palette.green : palette.muted },
                      ]}>
                      {doneSets}/{setTarget || doneSets}✓
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <Pressable onPress={onStartSession} style={styles.startBtn}>
          <Text style={styles.startText}>{done ? 'REVIEW SESSION ▶' : 'START SESSION ▶'}</Text>
        </Pressable>

        <View style={styles.doneWrap}>
          <Pressable
            onPress={() => (done ? uncompleteWorkout(todayKey) : completeWorkout(todayKey))}
            style={[
              styles.doneBtn,
              {
                borderColor: done ? palette.green : palette.faint,
                backgroundColor: done ? palette.green : 'transparent',
              },
            ]}>
            <Text style={{ fontSize: 28, lineHeight: 35, color: done ? palette.bg : palette.faint }}>✓</Text>
          </Pressable>
          <Text style={[styles.doneLabel, { color: done ? palette.green : palette.muted }]}>
            {done ? 'COMPLETE' : 'MARK COMPLETE'}
          </Text>
        </View>
      </View>

      {/* Next milestone teaser */}
      <Pressable onPress={onOpenSummit} style={styles.milestone}>
        <BadgeMedal
          iconPaths={next.iconPaths}
          ring={ringColor}
          icon={iconColor}
          bg={palette.bg}
          innerOpacity={0.45}
          size={52}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.msKicker}>NEXT MILESTONE</Text>
          <Text style={styles.msTitle}>{next.title.toUpperCase()}</Text>
          <View style={styles.msProgressRow}>
            <View style={styles.msTrack}>
              <View style={{ height: '100%', width: `${Math.round(ratio * 100)}%`, backgroundColor: palette.orange }} />
            </View>
            <Text style={styles.msProgText}>{progText}</Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  card: {
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.line,
  },
  cardHead: {
    paddingTop: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  dateLine: {
    fontFamily: FontFamily.mono,
    fontSize: 13,
    color: palette.muted,
    letterSpacing: 1,
  },
  workoutTitle: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 28,
    letterSpacing: 1,
    marginTop: 6,
    lineHeight: 34,
    color: palette.text,
  },
  pill: {
    fontFamily: FontFamily.display,
    fontSize: 12,
    letterSpacing: 1.5,
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
  deloadNote: {
    marginTop: 12,
    marginHorizontal: 16,
    fontFamily: FontFamily.body,
    fontSize: 14,
    color: palette.gold,
    backgroundColor: goldTint,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  exercises: {
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  exerciseName: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 16,
    color: palette.text,
    flexShrink: 1,
  },
  exerciseRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  exerciseDetail: {
    fontFamily: FontFamily.mono,
    fontSize: 14,
    color: palette.textDim,
  },
  exerciseWeight: {
    fontFamily: FontFamily.monoBold,
    fontSize: 14,
    color: palette.gold,
  },
  exerciseProg: {
    fontFamily: FontFamily.monoBold,
    fontSize: 13,
  },
  startBtn: {
    height: 54,
    backgroundColor: palette.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  startText: {
    fontFamily: FontFamily.display,
    fontSize: 15,
    letterSpacing: 2,
    color: palette.bg,
  },
  doneWrap: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 6,
    paddingBottom: 22,
    paddingHorizontal: 16,
  },
  doneBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneLabel: {
    fontFamily: FontFamily.display,
    fontSize: 12,
    letterSpacing: 2,
  },
  milestone: {
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.line,
    borderLeftWidth: 3,
    borderLeftColor: palette.gold,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    marginTop: 14,
  },
  msKicker: {
    fontFamily: FontFamily.display,
    fontSize: 12,
    letterSpacing: 2,
    color: palette.gold,
  },
  msTitle: {
    fontFamily: FontFamily.displayMedium,
    fontSize: 17,
    letterSpacing: 0.5,
    marginTop: 2,
    lineHeight: 20,
    color: palette.text,
  },
  msProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  msTrack: {
    flex: 1,
    height: 5,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.line,
  },
  msProgText: {
    fontFamily: FontFamily.mono,
    fontSize: 13,
    color: palette.textDim,
  },
});
