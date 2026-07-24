import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExerciseFigure } from '@/components/exercise-figure';
import { RestTimer } from '@/components/rest-timer';
import { SnowBurst } from '@/components/snow-burst';
import { SparkLine } from '@/components/spark-line';
import { SwitchbackRail } from '@/components/switchback-rail';
import { FontFamily, goldTint, palette } from '@/constants/theme';
import { completeWorkout, logExerciseSets } from '@/data/repos';
import type { AppData } from '@/data/store';
import { saveWorkoutToHealth } from '@/lib/health';
import { cancelRestDone, ensureRestNotifications, scheduleRestDone } from '@/lib/rest-notify';
import { keepAwakeOff, keepAwakeOn, successFx, tapFx } from '@/lib/session-fx';
import type { Ascent } from '@/program/ascent';
import { suggestForExercise, type ExerciseLogEntry, type Suggestion } from '@/program/estimator';
import { infoFor, slugFor, type ExerciseInfo } from '@/program/exercise-library';
import { platesPerSide, warmupRamp } from '@/program/loading';
import { getWorkout } from '@/program/program';
import { currentWeek, DAY_NAMES, fmtShort, isDeloadWeek, isTaperWeek, keyOf, phaseOf, todayDate } from '@/program/schedule';

// Session Mode — the full-screen space a workout deserves. One exercise
// ("pitch") at a time: field-guide figure and cues, warm-up ramp and plate
// math for the bar lifts, big set logging, auto rest timer, and a summit
// summary that banks the day.

const SETS_RE = /^(\d+)\s*[×x]\s*(\d+)\b/;

interface SetRow {
  weight: string;
  reps: string;
  done: boolean;
}

interface Pitch {
  name: string;
  detail: string;
  info: ExerciseInfo | null;
  suggestion: Suggestion | null;
  exerciseId: string;
  /** null → protocol/cardio card with a single done-check. */
  target: { sets: number; reps: number; suffix: string } | null;
  restSec: number;
}

interface Props {
  data: AppData;
  ascent: Ascent;
  onExit: () => void;
}

function repsLabel(suffix: string): string {
  if (suffix === '/leg') return 'REPS / LEG';
  if (suffix === '/side') return 'REPS / SIDE';
  if (suffix === 'm') return 'METERS';
  if (suffix === 's') return 'SECONDS';
  if (suffix === 's/side') return 'SEC / SIDE';
  return 'REPS';
}

function weightLabel(s: Suggestion | null): string {
  if (s?.load === 'db_pair') return 'LB / HAND';
  if (s?.load === 'added') return 'ADDED LB';
  return 'LB';
}

/** Max weight actually moved in an entry's completed sets (0 when none). */
function bestOf(entry: ExerciseLogEntry): number {
  return entry.sets.reduce((m, s) => (s.done && s.weight > m ? s.weight : m), 0);
}

export function SessionMode({ data, ascent, onExit }: Props) {
  const insets = useSafeAreaInsets();
  const today = todayDate();
  const todayKey = keyOf(today);
  const week = currentWeek();
  const phase = phaseOf(week);
  const deload = isDeloadWeek(week);
  const taper = isTaperWeek(week);
  const workout = getWorkout(week, today.getDay());

  // Pitches + seeded set rows are frozen at session start: suggestions read
  // only pre-today history, so mid-session writes must not reshuffle them.
  const [pitches] = useState<Pitch[]>(() =>
    workout.exercises.map((ex) => {
      const info = infoFor(ex.name);
      const suggestion = suggestForExercise(ex.name, ex.detail, data.profile, week, data.exerciseLogs, todayKey);
      const m = ex.detail.match(SETS_RE);
      const isLoggable = !!m && info?.kind !== 'protocol' && info?.kind !== 'cardio' && info?.kind !== 'mobility';
      return {
        name: ex.name,
        detail: ex.detail,
        info,
        suggestion,
        exerciseId: suggestion?.exerciseId ?? slugFor(ex.name),
        target: isLoggable
          ? { sets: parseInt(m![1], 10), reps: parseInt(m![2], 10), suffix: ex.detail.slice(m![0].length).trim() }
          : null,
        restSec: info?.restSec ?? 90,
      };
    }),
  );

  const [rows, setRows] = useState<Record<string, SetRow[]>>(() => {
    const out: Record<string, SetRow[]> = {};
    for (const p of pitches) {
      if (!p.target) continue;
      const saved = data.exerciseLogs[p.exerciseId]?.find((e) => e.date === todayKey);
      const count = Math.max(deload ? Math.min(2, p.target.sets) : p.target.sets, saved?.sets.length ?? 0);
      out[p.name] = Array.from({ length: count }, (_, i) => {
        const s = saved?.sets[i];
        return {
          weight: String(s?.weight ?? p.suggestion?.weightLb ?? 0),
          reps: String(s?.reps ?? p.target!.reps),
          done: s?.done ?? false,
        };
      });
    }
    return out;
  });

  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [idx, setIdx] = useState(0);
  const [onSummary, setOnSummary] = useState(false);
  const [rest, setRest] = useState<{ endsAt: number; total: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [railH, setRailH] = useState(480);
  const [startAt] = useState(() => Date.now());

  // Lock-screen "rest over" notification. The token guards the async schedule
  // against a skip/extend racing it; a fired id cancels as a harmless no-op.
  const restNotif = useRef<{ token: number; id: string | null }>({ token: 0, id: null });
  const setRestNotification = (seconds: number | null) => {
    cancelRestDone(restNotif.current.id);
    restNotif.current = { token: restNotif.current.token + 1, id: null };
    if (seconds == null) return;
    const token = restNotif.current.token;
    scheduleRestDone(seconds).then((id) => {
      if (restNotif.current.token === token) restNotif.current.id = id;
      else cancelRestDone(id);
    });
  };

  useEffect(() => {
    keepAwakeOn();
    ensureRestNotifications();
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => {
      keepAwakeOff();
      clearInterval(t);
      // Read restNotif.current at cleanup time, not a mount-time snapshot:
      // setRestNotification() replaces .current with a new object on every
      // set completion, so a captured reference here would always point at
      // the original {id: null} and never actually cancel a pending notif.
      cancelRestDone(restNotif.current.id);
    };
  }, []);

  const restRemaining = rest ? Math.max(0, Math.ceil((rest.endsAt - now) / 1000)) : 0;
  // Fire completion on a timer keyed to the rest itself, not the 500ms tick, so
  // it lands exactly at endsAt and the state update happens in the timeout
  // callback (never synchronously in the effect body).
  useEffect(() => {
    if (!rest) return;
    const to = setTimeout(() => {
      successFx();
      setRest(null);
    }, Math.max(0, rest.endsAt - Date.now()));
    return () => clearTimeout(to);
  }, [rest]);

  const persist = (p: Pitch, next: SetRow[]) => {
    logExerciseSets({
      logDate: todayKey,
      exerciseId: p.exerciseId,
      exerciseName: p.name,
      week,
      phase: phase.name,
      repTarget: p.target?.reps ?? 0,
      setTarget: next.length,
      suggestedWeightLb: p.suggestion?.weightLb ?? null,
      sets: next.map((r, i) => ({
        set: i + 1,
        weight: parseFloat(r.weight) || 0,
        reps: parseInt(r.reps, 10) || 0,
        done: r.done,
      })),
    });
  };

  const updateRow = (p: Pitch, i: number, patch: Partial<SetRow>, save = false) => {
    setRows((cur) => {
      const next = { ...cur, [p.name]: cur[p.name].map((r, j) => (j === i ? { ...r, ...patch } : r)) };
      if (save) persist(p, next[p.name]);
      return next;
    });
  };

  const toggleSet = (p: Pitch, i: number) => {
    const turningOn = !rows[p.name][i].done;
    updateRow(p, i, { done: turningOn }, true);
    if (turningOn) {
      tapFx();
      // `now` (the 500ms ticking clock) is close enough for a rest timer and
      // keeps the handler pure; the completion effect self-corrects off the
      // real clock anyway.
      setRest({ endsAt: now + p.restSec * 1000, total: p.restSec });
      setRestNotification(p.restSec);
    }
  };

  const pitchDone = (p: Pitch): boolean =>
    p.target ? rows[p.name].length > 0 && rows[p.name].every((r) => r.done) : !!checked[p.name];

  const doneFlags = pitches.map(pitchDone);
  const goTo = (i: number) => {
    setIdx(Math.max(0, Math.min(pitches.length - 1, i)));
    setOnSummary(false);
  };

  // ---- summary stats ---------------------------------------------------------
  const elapsedSec = Math.floor((now - startAt) / 1000);
  const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  const setPitches = pitches.filter((p) => p.target);
  const setsDone = setPitches.reduce((n, p) => n + rows[p.name].filter((r) => r.done).length, 0);
  const setsTotal = setPitches.reduce((n, p) => n + rows[p.name].length, 0);
  const volume = setPitches.reduce(
    (v, p) => v + rows[p.name].reduce((s, r) => (r.done ? s + (parseFloat(r.weight) || 0) * (parseInt(r.reps, 10) || 0) : s), 0),
    0,
  );
  const prs = setPitches.flatMap((p) => {
    const todayBest = rows[p.name].reduce((m, r) => (r.done ? Math.max(m, parseFloat(r.weight) || 0) : m), 0);
    const history = (data.exerciseLogs[p.exerciseId] ?? []).filter((e) => e.date < todayKey);
    const bestBefore = history.reduce((m, e) => Math.max(m, bestOf(e)), 0);
    return bestBefore > 0 && todayBest > bestBefore ? [{ name: p.name, weight: todayBest }] : [];
  });
  const alreadyBanked = !!data.completions[todayKey];

  const bank = () => {
    if (!alreadyBanked) {
      completeWorkout(todayKey, {
        session: { durationSec: elapsedSec, volumeLb: Math.round(volume), setsDone },
      });
      // Mirror the session into Apple Health (no-op unless connected).
      void saveWorkoutToHealth(workout.type, elapsedSec);
      successFx();
    }
    onExit();
  };

  // ---- pitch content ----------------------------------------------------------
  const p = pitches[idx];
  const kicker = `PITCH ${String(idx + 1).padStart(2, '0')} / ${String(pitches.length).padStart(2, '0')} · ${p.detail.toUpperCase()}`;

  const lastEntry = (data.exerciseLogs[p.exerciseId] ?? []).find((e) => e.date < todayKey && e.sets.some((s) => s.done));
  const lastLine = lastEntry
    ? 'LAST · ' +
      lastEntry.sets
        .filter((s) => s.done)
        .map((s) => `${s.weight}×${s.reps}`)
        .join(' · ')
    : p.suggestion
      ? 'FIRST SESSION · SEED ESTIMATE'
      : null;

  const workLb = p.target ? parseFloat(rows[p.name]?.[0]?.weight ?? '') || p.suggestion?.weightLb || 0 : 0;
  const showBar = p.suggestion?.load === 'barbell';
  const ramp = showBar ? warmupRamp(workLb) : [];
  const plates = showBar ? platesPerSide(workLb) : null;

  const progressionEntries = [...(data.exerciseLogs[p.exerciseId] ?? [])]
    .filter((e) => e.sets.some((s) => s.done))
    .reverse()
    .slice(-12);
  const progressionByWeight = progressionEntries.some((e) => bestOf(e) > 0);
  const progression = progressionEntries.map((e) =>
    progressionByWeight ? bestOf(e) : e.sets.reduce((n, s) => n + (s.done ? s.reps : 0), 0),
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={onExit} style={styles.exitBtn} hitSlop={6}>
          <Text style={styles.exitText}>✕</Text>
        </Pressable>
        <View style={{ flex: 1, minWidth: 0, alignItems: 'center' }}>
          <Text style={styles.topTitle} numberOfLines={1}>
            {workout.title.toUpperCase()} · {DAY_NAMES[today.getDay()]} {fmtShort(today)}
          </Text>
          <Text style={[styles.topPhase, { color: phase.color }]}>
            {phase.name}
            {taper ? ' · TAPER' : deload ? ' · DELOAD' : ''}
          </Text>
        </View>
        <Text style={styles.elapsed}>{clock(elapsedSec)}</Text>
      </View>

      <View style={styles.body} onLayout={(e) => setRailH(e.nativeEvent.layout.height)}>
        <View style={styles.railWrap}>
          <SwitchbackRail
            count={pitches.length}
            current={onSummary ? -1 : idx}
            done={doneFlags}
            height={railH}
            onSelect={goTo}
          />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={{ paddingBottom: 170, paddingRight: 16 }}>
          {onSummary ? (
            /* ---- summit summary ---- */
            <View>
              <Text style={styles.summitKicker}>SUMMIT REACHED</Text>
              <Text style={styles.slab}>SESSION{'\n'}COMPLETE</Text>
              <View style={styles.statGrid}>
                <View style={styles.statCell}>
                  <Text style={styles.statLabel}>DURATION</Text>
                  <Text style={styles.statValue}>{clock(elapsedSec)}</Text>
                </View>
                <View style={styles.statCell}>
                  <Text style={styles.statLabel}>SETS</Text>
                  <Text style={styles.statValue}>
                    {setsDone}/{setsTotal}
                  </Text>
                </View>
                <View style={styles.statCell}>
                  <Text style={styles.statLabel}>VOLUME</Text>
                  <Text style={styles.statValue}>{Math.round(volume).toLocaleString('en-US')} LB</Text>
                </View>
                <View style={styles.statCell}>
                  <Text style={styles.statLabel}>WORTH</Text>
                  <Text style={[styles.statValue, { color: palette.orange }]}>+{ascent.todayWorthFt} FT</Text>
                </View>
              </View>

              {prs.map((pr) => (
                <View key={pr.name} style={styles.prRow}>
                  <Text style={styles.prText}>
                    ★ NEW BEST · {pr.name.toUpperCase()} — {pr.weight} LB
                  </Text>
                </View>
              ))}

              <Pressable
                onPress={bank}
                style={[
                  styles.bankBtn,
                  alreadyBanked
                    ? { backgroundColor: 'transparent', borderColor: palette.green }
                    : { backgroundColor: palette.orange, borderColor: palette.orange },
                ]}>
                <Text style={[styles.bankText, { color: alreadyBanked ? palette.green : palette.bg }]}>
                  {alreadyBanked ? '✓ DAY BANKED · DESCEND' : `BANK +${ascent.todayWorthFt} FT · COMPLETE`}
                </Text>
              </Pressable>
              <Pressable onPress={() => goTo(pitches.length - 1)} style={styles.backLink} hitSlop={8}>
                <Text style={styles.backLinkText}>▼ BACK TO THE SETS</Text>
              </Pressable>
            </View>
          ) : (
            /* ---- one pitch ---- */
            <View>
              <Text style={[styles.kicker, { color: phase.color }]}>{kicker}</Text>
              <Text style={styles.slab}>{p.name.toUpperCase()}</Text>
              {p.info && <Text style={styles.muscles}>{p.info.muscles}</Text>}
              {p.info && <Text style={styles.descText}>{p.info.description}</Text>}
              {deload && p.target && (
                <Text style={styles.deloadNote}>
                  {taper ? 'TAPER — 2 SETS · STAY SHARP' : 'DELOAD — 2 SETS · KEEP IT LIGHT'}
                </Text>
              )}

              {p.suggestion && (
                <View style={styles.targetRow}>
                  <Text style={styles.targetWeight}>{p.suggestion.label}</Text>
                  {lastLine && <Text style={styles.lastLine}>{lastLine}</Text>}
                </View>
              )}
              {!p.suggestion && lastLine && <Text style={[styles.lastLine, { marginTop: 10 }]}>{lastLine}</Text>}

              {ramp.length > 0 && (
                <View style={styles.rampBox}>
                  <Text style={styles.boxKicker}>WARM-UP RAMP</Text>
                  {ramp.map((r) => (
                    <Text key={r.label} style={styles.rampLine}>
                      {r.label.padEnd(4)} ×{r.reps}  —  {r.weight} LB
                    </Text>
                  ))}
                  <Text style={styles.plateLine}>
                    {plates ? `PLATES / SIDE · ${plates.join(' · ')}` : 'EMPTY BAR'}
                  </Text>
                </View>
              )}
              {showBar && ramp.length === 0 && (
                <Text style={[styles.plateLine, { marginTop: 8 }]}>
                  {plates ? `PLATES / SIDE · ${plates.join(' · ')}` : 'EMPTY BAR'}
                </Text>
              )}

              {p.info?.images && p.info.images.length > 0 ? (
                <View style={styles.figurePanel}>
                  <View style={styles.photoRow}>
                    {p.info.images.map((src, i) => (
                      <Image key={i} source={src} style={styles.photo} contentFit="cover" />
                    ))}
                  </View>
                  <Text style={styles.figCaption}>FIG · {p.name.toUpperCase()}</Text>
                </View>
              ) : p.info?.figure ? (
                <View style={styles.figurePanel}>
                  <ExerciseFigure name={p.info.figure} />
                  <Text style={styles.figCaption}>FIG · {p.name.toUpperCase()}</Text>
                  <View style={styles.legendRow}>
                    <View style={styles.legendSwatch} />
                    <Text style={styles.legendText}>WORKING MUSCLES</Text>
                    <View style={styles.legendDash} />
                    <Text style={styles.legendText}>LOAD PATH</Text>
                  </View>
                </View>
              ) : null}

              {p.info && (
                <View style={styles.cues}>
                  {p.info.cues.map((c) => (
                    <Text key={c} style={styles.cueLine}>
                      <Text style={{ color: palette.orange }}>◆ </Text>
                      {c}
                    </Text>
                  ))}
                </View>
              )}

              {p.target ? (
                <View style={styles.setBlock}>
                  <View style={styles.setHeader}>
                    <Text style={[styles.setHeadText, { width: 34 }]}>SET</Text>
                    <Text style={[styles.setHeadText, { width: 96, textAlign: 'center' }]}>{weightLabel(p.suggestion)}</Text>
                    <Text style={[styles.setHeadText, { width: 18 }]} />
                    <Text style={[styles.setHeadText, { width: 72, textAlign: 'center' }]}>{repsLabel(p.target.suffix)}</Text>
                  </View>
                  {rows[p.name].map((r, i) => (
                    <View key={i} style={styles.setRow}>
                      <Text style={styles.setLabel}>S{i + 1}</Text>
                      <TextInput
                        value={r.weight}
                        onChangeText={(t) => updateRow(p, i, { weight: t })}
                        onEndEditing={() => persist(p, rows[p.name])}
                        keyboardType="decimal-pad"
                        style={[styles.input, { width: 96 }]}
                      />
                      <Text style={styles.times}>×</Text>
                      <TextInput
                        value={r.reps}
                        onChangeText={(t) => updateRow(p, i, { reps: t })}
                        onEndEditing={() => persist(p, rows[p.name])}
                        keyboardType="number-pad"
                        style={[styles.input, { width: 72 }]}
                      />
                      <View style={{ flex: 1 }} />
                      <Pressable
                        onPress={() => toggleSet(p, i)}
                        hitSlop={6}
                        style={[
                          styles.check,
                          {
                            borderColor: r.done ? palette.green : palette.faint,
                            backgroundColor: r.done ? palette.green : 'transparent',
                          },
                        ]}>
                        <Text style={{ fontSize: 18, lineHeight: 22, color: r.done ? palette.bg : palette.faint }}>✓</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : (
                <Pressable
                  onPress={() => {
                    tapFx();
                    setChecked((c) => ({ ...c, [p.name]: !c[p.name] }));
                  }}
                  style={[
                    styles.protocolBtn,
                    checked[p.name]
                      ? { backgroundColor: palette.green, borderColor: palette.green }
                      : { borderColor: palette.faint },
                  ]}>
                  <Text style={[styles.protocolBtnText, { color: checked[p.name] ? palette.bg : palette.textDim }]}>
                    {checked[p.name] ? '✓ DONE' : 'MARK DONE'}
                  </Text>
                </Pressable>
              )}

              {p.info && (
                <View style={styles.notes}>
                  {p.info.why.length > 0 && (
                    <View>
                      <Text style={styles.noteHead}>WHY WE DO IT</Text>
                      <Text style={styles.why}>{p.info.why}</Text>
                    </View>
                  )}
                  <View>
                    <Text style={styles.noteHead}>FORM</Text>
                    {p.info.how.map((h, i) => (
                      <Text key={i} style={styles.noteLine}>
                        <Text style={styles.noteNum}>{i + 1}. </Text>
                        {h}
                      </Text>
                    ))}
                  </View>
                  {p.info.faults.length > 0 && (
                    <View>
                      <Text style={styles.noteHead}>WATCH FOR</Text>
                      {p.info.faults.map((f) => (
                        <Text key={f} style={styles.noteLine}>
                          <Text style={{ color: palette.orange }}>✕ </Text>
                          {f}
                        </Text>
                      ))}
                    </View>
                  )}
                  {p.info.safety && p.info.safety.length > 0 && (
                    <View style={styles.safetyBox}>
                      <Text style={[styles.noteHead, { color: palette.gold }]}>SAFETY</Text>
                      {p.info.safety.map((s) => (
                        <Text key={s} style={styles.noteLine}>
                          <Text style={{ color: palette.gold, fontFamily: FontFamily.monoBold }}>! </Text>
                          {s}
                        </Text>
                      ))}
                    </View>
                  )}
                  {progression.length >= 2 && (
                    <View>
                      <Text style={styles.noteHead}>PROGRESSION · {progressionByWeight ? 'LB' : 'REPS'}</Text>
                      <View style={styles.sparkRow}>
                        <SparkLine values={progression} />
                        <Text style={styles.sparkText}>
                          {progression[0]} → {progression[progression.length - 1]}
                          {' · '}
                          {progression.length} SESSIONS
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>

      {/* rest timer + pager */}
      <View style={[styles.bottomDock, { paddingBottom: insets.bottom }]}>
        {rest && (
          <RestTimer
            remainingSec={restRemaining}
            totalSec={rest.total}
            onExtend={() => {
              const endsAt = rest.endsAt + 30000;
              setRest({ endsAt, total: rest.total + 30 });
              setRestNotification((endsAt - Date.now()) / 1000);
            }}
            onSkip={() => {
              setRest(null);
              setRestNotification(null);
            }}
          />
        )}
        {!onSummary && (
          <View style={styles.pager}>
            <Pressable onPress={() => goTo(idx - 1)} disabled={idx === 0} style={styles.pagerBtn}>
              <Text style={[styles.pagerText, { color: idx === 0 ? palette.barTextDim : palette.barText }]}>◀ PREV</Text>
            </Pressable>
            <View style={styles.pagerDivider} />
            <Pressable
              onPress={() => (idx === pitches.length - 1 ? setOnSummary(true) : goTo(idx + 1))}
              style={[styles.pagerBtn, { flex: 1.3 }]}>
              <Text style={[styles.pagerText, { color: idx === pitches.length - 1 ? palette.gold : palette.barText }]}>
                {idx === pitches.length - 1 ? 'SUMMIT ▲' : 'NEXT ▶'}
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {onSummary && <SnowBurst />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  exitBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitText: { fontSize: 20, color: palette.muted },
  topTitle: {
    fontFamily: FontFamily.display,
    fontSize: 12,
    letterSpacing: 1.5,
    color: palette.text,
  },
  topPhase: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    letterSpacing: 1,
    marginTop: 2,
  },
  elapsed: {
    fontFamily: FontFamily.monoBold,
    fontSize: 15,
    color: palette.textDim,
    minWidth: 52,
    textAlign: 'right',
    marginRight: 4,
  },
  body: { flex: 1, flexDirection: 'row' },
  railWrap: { paddingLeft: 2 },

  kicker: {
    fontFamily: FontFamily.display,
    fontSize: 12,
    letterSpacing: 1.5,
    marginTop: 16,
  },
  slab: {
    fontFamily: FontFamily.displayBold,
    fontSize: 30,
    lineHeight: 37,
    color: palette.text,
    marginTop: 6,
  },
  muscles: {
    fontFamily: FontFamily.display,
    fontSize: 11,
    letterSpacing: 1.5,
    color: palette.muted,
    marginTop: 6,
  },
  descText: {
    fontFamily: FontFamily.body,
    fontSize: 15,
    lineHeight: 22,
    color: palette.textDim,
    marginTop: 8,
  },
  deloadNote: {
    fontFamily: FontFamily.monoBold,
    fontSize: 12,
    color: palette.gold,
    backgroundColor: goldTint,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 10,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    marginTop: 12,
  },
  targetWeight: {
    fontFamily: FontFamily.monoBold,
    fontSize: 24,
    color: palette.gold,
  },
  lastLine: {
    fontFamily: FontFamily.mono,
    fontSize: 12,
    color: palette.muted,
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  rampBox: {
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.line,
    borderLeftWidth: 3,
    borderLeftColor: palette.gold,
    padding: 12,
    marginTop: 14,
    gap: 3,
  },
  boxKicker: {
    fontFamily: FontFamily.display,
    fontSize: 11,
    letterSpacing: 2,
    color: palette.gold,
    marginBottom: 3,
  },
  rampLine: {
    fontFamily: FontFamily.mono,
    fontSize: 14,
    color: palette.textDim,
  },
  plateLine: {
    fontFamily: FontFamily.mono,
    fontSize: 12,
    color: palette.muted,
    marginTop: 5,
  },
  figurePanel: {
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.panel,
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 14,
  },
  figCaption: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    letterSpacing: 1.5,
    color: palette.faint,
    marginTop: 4,
  },
  photoRow: {
    flexDirection: 'row',
    gap: 1,
    paddingHorizontal: 12,
  },
  photo: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: palette.panelDeep,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  legendSwatch: {
    width: 14,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: palette.orange,
    opacity: 0.45,
  },
  legendDash: {
    width: 16,
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: palette.muted,
    marginLeft: 8,
  },
  legendText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    color: palette.muted,
    letterSpacing: 0.5,
  },
  cues: { marginTop: 12, gap: 5 },
  cueLine: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 15,
    lineHeight: 21,
    color: palette.text,
  },
  setBlock: { marginTop: 16 },
  setHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  setHeadText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    letterSpacing: 0.5,
    color: palette.faint,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  setLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 13,
    color: palette.faint,
    width: 34,
  },
  input: {
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.line,
    color: palette.text,
    fontFamily: FontFamily.mono,
    fontSize: 18,
    height: 52,
    paddingHorizontal: 8,
    textAlign: 'center',
  },
  times: { fontFamily: FontFamily.mono, fontSize: 14, color: palette.faint, width: 18, textAlign: 'center' },
  check: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  protocolBtn: {
    marginTop: 18,
    height: 56,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  protocolBtnText: {
    fontFamily: FontFamily.display,
    fontSize: 15,
    letterSpacing: 2,
  },
  notes: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: palette.line,
    paddingTop: 16,
    gap: 16,
  },
  safetyBox: {
    backgroundColor: goldTint,
    padding: 10,
  },
  why: {
    fontFamily: FontFamily.body,
    fontSize: 15,
    lineHeight: 22,
    color: palette.textDim,
  },
  noteHead: {
    fontFamily: FontFamily.display,
    fontSize: 11,
    letterSpacing: 2,
    color: palette.muted,
    marginBottom: 5,
  },
  noteLine: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 21,
    color: palette.textDim,
    marginBottom: 3,
  },
  noteNum: { fontFamily: FontFamily.monoBold, fontSize: 13, color: palette.muted },
  sparkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sparkText: {
    fontFamily: FontFamily.mono,
    fontSize: 12,
    color: palette.muted,
    flexShrink: 1,
  },

  summitKicker: {
    fontFamily: FontFamily.display,
    fontSize: 13,
    letterSpacing: 3,
    color: palette.gold,
    marginTop: 26,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 18,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.panel,
  },
  statCell: {
    width: '50%',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderColor: palette.line,
    borderWidth: 0.5,
  },
  statLabel: {
    fontFamily: FontFamily.display,
    fontSize: 11,
    letterSpacing: 1.5,
    color: palette.muted,
  },
  statValue: {
    fontFamily: FontFamily.monoBold,
    fontSize: 20,
    color: palette.text,
    marginTop: 3,
  },
  prRow: {
    backgroundColor: goldTint,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 10,
  },
  prText: {
    fontFamily: FontFamily.monoBold,
    fontSize: 13,
    color: palette.gold,
  },
  bankBtn: {
    marginTop: 22,
    height: 58,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankText: {
    fontFamily: FontFamily.display,
    fontSize: 15,
    letterSpacing: 1.5,
  },
  backLink: {
    marginTop: 16,
    alignSelf: 'center',
    paddingVertical: 8,
  },
  backLinkText: {
    fontFamily: FontFamily.display,
    fontSize: 12,
    letterSpacing: 2,
    color: palette.muted,
  },

  bottomDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: palette.barBg,
  },
  pager: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: 58,
  },
  pagerBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagerDivider: { width: 1, backgroundColor: 'rgba(242, 236, 220, 0.18)' },
  pagerText: {
    fontFamily: FontFamily.display,
    fontSize: 15,
    letterSpacing: 2,
  },
});
