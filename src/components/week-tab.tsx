import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { FontFamily, palette } from '@/constants/theme';
import { logWeight } from '@/data/repos';
import type { AppData } from '@/data/store';
import { weightChart } from '@/lib/geometry';
import { GOAL_WEIGHT_LB, START_WEIGHT_LB } from '@/program/goals';
import { getWorkout } from '@/program/program';
import {
  DAY_NAMES,
  dateOf,
  fmtShort,
  isDeloadWeek,
  keyOf,
  phaseOf,
  todayDate,
} from '@/program/schedule';

interface Props {
  data: AppData;
  week: number;
  onChangeWeek: (week: number) => void;
}

export function WeekTab({ data, week, onChangeWeek }: Props) {
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [wtInput, setWtInput] = useState('');

  const phase = phaseOf(week);
  const selStart = dateOf(week, 0);
  const selEnd = dateOf(week, 6);

  const sorted = [...data.weights].sort((a, b) => (a.date < b.date ? -1 : 1));
  const currentW = sorted.length ? sorted[sorted.length - 1].lb : START_WEIGHT_LB;
  const wc = weightChart(data.weights);
  const wtRows = [...sorted]
    .reverse()
    .slice(0, 10)
    .map((e, i, arr) => {
      const prev = arr[i + 1];
      const delta = prev ? Math.round((e.lb - prev.lb) * 10) / 10 : null;
      const d = new Date(e.date + 'T00:00:00');
      return {
        key: e.date,
        date: DAY_NAMES[d.getDay()] + ' ' + fmtShort(d),
        lb: e.lb.toFixed(1),
        delta: delta == null ? '' : (delta > 0 ? '+' : '') + delta.toFixed(1),
        deltaColor: delta == null ? palette.faint : delta > 0 ? palette.orange : palette.green,
      };
    });

  const submitWeight = () => {
    const v = parseFloat(wtInput);
    if (!v || v < 80 || v > 500) return;
    logWeight(keyOf(todayDate()), Math.round(v * 10) / 10);
    setWtInput('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.weekNav}>
        <Pressable onPress={() => onChangeWeek(Math.max(1, week - 1))} style={styles.navBtn}>
          <Text style={styles.navGlyph}>‹</Text>
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.weekTitle, { color: phase.color }]}>
              WEEK {String(week).padStart(2, '0')}/26
            </Text>
            {isDeloadWeek(week) && <Text style={styles.deloadPill}>DELOAD</Text>}
          </View>
          <Text style={styles.weekSub}>
            {phase.name} · {fmtShort(selStart)}–{fmtShort(selEnd)}
          </Text>
        </View>
        <Pressable onPress={() => onChangeWeek(Math.min(26, week + 1))} style={styles.navBtn}>
          <Text style={styles.navGlyph}>›</Text>
        </Pressable>
      </View>

      <View style={{ gap: 8 }}>
        {Array.from({ length: 7 }, (_, d) => {
          const date = dateOf(week, d);
          const key = keyOf(date);
          const w = getWorkout(week, d);
          const done = !!data.completions[key];
          const expanded = expandedDay === d;
          const color = w.type === 'strength' ? phase.color : w.type === 'cardio' ? palette.faint : palette.gold;
          return (
            <View key={d} style={[styles.dayCard, { borderLeftColor: color }]}>
              <Pressable onPress={() => setExpandedDay(expanded ? null : d)} style={styles.dayHead}>
                <Text style={styles.dayAbbr}>
                  {DAY_NAMES[d]}
                  {'\n'}
                  {fmtShort(date)}
                </Text>
                <Text style={styles.dayTitle}>{w.title.toUpperCase()}</Text>
                <Text style={[styles.doneMark, { color: done ? palette.green : palette.faint }]}>
                  {done ? '✓' : '·'}
                </Text>
                <Text style={styles.chev}>{expanded ? '▾' : '▸'}</Text>
              </Pressable>
              {expanded && (
                <View style={styles.dayExercises}>
                  {w.exercises.map((ex) => (
                    <View key={ex.name} style={styles.exerciseRow}>
                      <Text style={styles.exerciseName}>{ex.name}</Text>
                      <Text style={styles.exerciseDetail}>{ex.detail}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Weight check-in */}
      <View style={styles.weightCard}>
        <View style={styles.weightHead}>
          <Text style={styles.weightTitle}>WEIGHT CHECK-IN</Text>
          <Text style={styles.weightCurrent}>{currentW.toFixed(1)} LB</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <TextInput
            value={wtInput}
            onChangeText={setWtInput}
            placeholder="Weight (lb)"
            placeholderTextColor={palette.faint}
            keyboardType="decimal-pad"
            style={styles.input}
          />
          <Pressable onPress={submitWeight} style={styles.logBtn}>
            <Text style={styles.logBtnText}>LOG</Text>
          </Pressable>
        </View>

        <Svg viewBox="0 0 366 190" style={styles.chart}>
          <Line x1={34} y1={wc.goalY} x2={360} y2={wc.goalY} stroke={palette.gold} strokeWidth={1} strokeDasharray="5 4" />
          <SvgText x={360} y={wc.goalLabelY} textAnchor="end" fill={palette.gold} fontFamily={FontFamily.mono} fontSize={9} letterSpacing={1}>
            {'GOAL ' + GOAL_WEIGHT_LB}
          </SvgText>
          {wc.gridLines.map((g) => (
            <Line key={g.label} x1={34} y1={g.y} x2={360} y2={g.y} stroke={palette.line} strokeWidth={1} />
          ))}
          {wc.gridLines.map((g) => (
            <SvgText key={g.label} x={30} y={g.labelY} textAnchor="end" fill={palette.faint} fontFamily={FontFamily.mono} fontSize={9}>
              {g.label}
            </SvgText>
          ))}
          {wc.areaPath ? <Path d={wc.areaPath} fill={palette.orange} opacity={0.1} /> : null}
          {wc.linePath ? <Path d={wc.linePath} fill="none" stroke={palette.orange} strokeWidth={2} strokeLinejoin="round" /> : null}
          {wc.points.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={3} fill={palette.gold} stroke={palette.bg} strokeWidth={1.5} />
          ))}
          <SvgText x={34} y={186} fill={palette.faint} fontFamily={FontFamily.mono} fontSize={9}>
            JUL 05
          </SvgText>
          <SvgText x={360} y={186} textAnchor="end" fill={palette.faint} fontFamily={FontFamily.mono} fontSize={9}>
            JAN 02
          </SvgText>
        </Svg>

        <View style={{ marginTop: 4 }}>
          {wtRows.map((w) => (
            <View key={w.key} style={styles.wtRow}>
              <Text style={styles.wtDate}>{w.date}</Text>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'baseline' }}>
                <Text style={styles.wtLb}>{w.lb}</Text>
                <Text style={[styles.wtDelta, { color: w.deltaColor }]}>{w.delta}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  navBtn: {
    width: 38,
    height: 38,
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navGlyph: { color: palette.textDim, fontSize: 16, lineHeight: 20 },
  weekTitle: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 16,
    letterSpacing: 1.5,
  },
  deloadPill: {
    fontFamily: FontFamily.display,
    fontSize: 9,
    letterSpacing: 1.5,
    color: palette.gold,
    borderWidth: 1,
    borderColor: palette.gold,
    paddingVertical: 2,
    paddingHorizontal: 6,
    overflow: 'hidden',
  },
  weekSub: {
    fontFamily: FontFamily.mono,
    fontSize: 10.5,
    color: palette.muted,
    letterSpacing: 1,
    marginTop: 2,
  },
  dayCard: {
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.line,
    borderLeftWidth: 3,
  },
  dayHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  dayAbbr: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    color: palette.muted,
    width: 58,
    lineHeight: 15,
  },
  dayTitle: {
    flex: 1,
    fontFamily: FontFamily.displayMedium,
    fontSize: 15,
    letterSpacing: 1,
    color: palette.text,
  },
  doneMark: { fontFamily: FontFamily.mono, fontSize: 14 },
  chev: { color: palette.faint, fontSize: 12 },
  dayExercises: {
    paddingTop: 2,
    paddingBottom: 12,
    paddingLeft: 84,
    paddingRight: 14,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  exerciseName: { fontFamily: FontFamily.body, fontSize: 13, color: palette.text },
  exerciseDetail: { fontFamily: FontFamily.mono, fontSize: 11.5, color: palette.textDim },
  weightCard: {
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 16,
    marginTop: 14,
  },
  weightHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  weightTitle: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 13,
    letterSpacing: 2,
    color: palette.text,
  },
  weightCurrent: { fontFamily: FontFamily.mono, fontSize: 13, color: palette.gold },
  input: {
    flex: 1,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.line,
    color: palette.text,
    fontFamily: FontFamily.mono,
    fontSize: 15,
    paddingVertical: 11,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  logBtn: {
    backgroundColor: palette.orange,
    paddingHorizontal: 20,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logBtnText: {
    color: palette.bg,
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 13,
    letterSpacing: 2,
  },
  chart: { width: '100%', aspectRatio: 366 / 190, marginTop: 12 },
  wtRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  wtDate: { fontFamily: FontFamily.mono, fontSize: 11.5, color: palette.muted },
  wtLb: { fontFamily: FontFamily.mono, fontSize: 14, color: palette.text },
  wtDelta: { fontFamily: FontFamily.mono, fontSize: 11, width: 52, textAlign: 'right' },
});
