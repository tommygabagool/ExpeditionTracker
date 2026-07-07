import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { FontFamily, palette } from '@/constants/theme';
import { logHike } from '@/data/repos';
import type { AppData } from '@/data/store';
import { diffColor, TRAILS, type Trail } from '@/data/trails';
import { topo, trailProfile, trailRoute } from '@/lib/geometry';
import {
  fmtShort,
  keyOf,
  nextSaturday,
  PHASE_GAIN_FT,
  PHASE_HOURS,
  PHASE_PACK_LB,
  phaseOf,
  PROGRAM_WEEKS,
  startDate,
  targetGain,
} from '@/program/schedule';

type FilterKey = 'dist' | 'gain' | 'drive';
type Filters = Record<FilterKey, string>;

function statLine(t: Trail): string {
  return (
    t.dist.toFixed(1) +
    ' MI · ' +
    t.gain.toLocaleString('en-US') +
    ' FT · ~' +
    t.time +
    ' · ' +
    t.drive +
    ' MIN DRIVE'
  );
}

function TrailArt({ trail, width, height }: { trail: Trail; width: number; height: number }) {
  const contours = topo(trail.seed, 92, 68, 5);
  const route = trailRoute(trail.seed, 92, 68);
  return (
    <Svg viewBox="0 0 92 68" width={width} height={height}>
      {contours.map((c, i) => (
        <Path key={i} d={c.d} fill="none" stroke={palette.border} strokeWidth={1} />
      ))}
      <Path d={route.d} fill="none" stroke={palette.orange} strokeWidth={1.5} strokeDasharray="4 2" />
    </Svg>
  );
}

function TrailCard({ trail, onOpen, bordered }: { trail: Trail; onOpen: () => void; bordered?: boolean }) {
  const dc = diffColor(trail.diff);
  return (
    <Pressable
      onPress={onOpen}
      style={[styles.card, bordered && { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <View style={bordered ? undefined : styles.cardArt}>
        <TrailArt trail={trail} width={bordered ? 80 : 92} height={bordered ? 59 : 68} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
          <Text style={styles.cardName}>{trail.name.toUpperCase()}</Text>
          {!bordered && (
            <Text style={[styles.cardDiff, { color: dc, borderColor: dc }]}>{trail.diff.toUpperCase()}</Text>
          )}
        </View>
        <Text style={styles.cardStats}>{statLine(trail)}</Text>
      </View>
      {bordered && <Text style={{ color: palette.faint, fontSize: 14 }}>›</Text>}
    </Pressable>
  );
}

export function TrailsTab({ data }: { data: AppData }) {
  const [trailSel, setTrailSel] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({ dist: 'any', gain: 'any', drive: 'any' });

  const satDate = nextSaturday();
  const satKey = keyOf(satDate);
  const satWeek = Math.max(
    1,
    Math.min(PROGRAM_WEEKS, Math.floor((satDate.getTime() - startDate().getTime()) / 604800000) + 1),
  );
  const satPhaseIdx = phaseOf(satWeek).idx;
  const satDone = !!data.completions[satKey];

  const tgt = targetGain(satWeek);
  const suggested = TRAILS.reduce((best, t) =>
    Math.abs(t.gain - tgt) < Math.abs(best.gain - tgt) ? t : best,
  );

  const passes = (t: Trail) =>
    (filters.dist === 'any' || (filters.dist === 'short' ? t.dist < 4 : t.dist >= 4)) &&
    (filters.gain === 'any' || (filters.gain === 'low' ? t.gain < 1000 : t.gain >= 1000)) &&
    (filters.drive === 'any' || (filters.drive === 'near' ? t.drive <= 30 : t.drive > 30));
  const visible = TRAILS.filter(passes);

  const chipRows: { label: string; chips: { key: string; label: string; k: FilterKey; v: string }[] }[] = [
    {
      label: 'DIST',
      chips: [
        { key: 'd-any', label: 'ANY', k: 'dist', v: 'any' },
        { key: 'd-short', label: '< 4 MI', k: 'dist', v: 'short' },
        { key: 'd-long', label: '4+ MI', k: 'dist', v: 'long' },
      ],
    },
    {
      label: 'GAIN',
      chips: [
        { key: 'g-any', label: 'ANY', k: 'gain', v: 'any' },
        { key: 'g-low', label: '< 1,000 FT', k: 'gain', v: 'low' },
        { key: 'g-high', label: '1,000+ FT', k: 'gain', v: 'high' },
      ],
    },
    {
      label: 'DRIVE',
      chips: [
        { key: 'v-any', label: 'ANY', k: 'drive', v: 'any' },
        { key: 'v-near', label: '≤ 30 MIN', k: 'drive', v: 'near' },
        { key: 'v-far', label: '30+ MIN', k: 'drive', v: 'far' },
      ],
    },
  ];

  const sel = TRAILS.find((t) => t.id === trailSel) ?? null;

  if (sel) {
    const dc = diffColor(sel.diff);
    const contours = topo(sel.seed, 358, 210, 8);
    const route = trailRoute(sel.seed, 358, 210);
    const prof = trailProfile(sel.seed, 358, 130);
    return (
      <View style={styles.container}>
        <Pressable onPress={() => setTrailSel(null)} style={styles.backBtn}>
          <Text style={styles.backText}>‹ ALL TRAILS</Text>
        </Pressable>

        <View style={styles.detailPanel}>
          <Svg viewBox="0 0 358 210" style={{ width: '100%', aspectRatio: 358 / 210, backgroundColor: palette.bg }}>
            {contours.map((c, i) => (
              <Path key={i} d={c.d} fill="none" stroke={palette.border} strokeWidth={1} />
            ))}
            <Path d={route.d} fill="none" stroke={palette.orange} strokeWidth={2} strokeDasharray="6 3" strokeLinejoin="round" />
            <Circle cx={route.sx} cy={route.sy} r={4} fill={palette.gold} stroke={palette.bg} strokeWidth={1.5} />
            <Circle cx={route.ex} cy={route.ey} r={4} fill={palette.orange} stroke={palette.bg} strokeWidth={1.5} />
            <SvgText x={route.sx + 9} y={route.sy + 4} fill={palette.gold} fontFamily={FontFamily.mono} fontSize={8} letterSpacing={1}>
              TRAILHEAD
            </SvgText>
            <SvgText x={route.ex + 9} y={route.ey - 6} fill={palette.orange} fontFamily={FontFamily.mono} fontSize={8} letterSpacing={1}>
              SUMMIT
            </SvgText>
          </Svg>
          <View style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
              <Text style={styles.detailName}>{sel.name.toUpperCase()}</Text>
              <Text style={[styles.cardDiff, { color: dc, borderColor: dc }]}>{sel.diff.toUpperCase()}</Text>
            </View>

            <View style={styles.detailStats}>
              {(
                [
                  ['DISTANCE', sel.dist.toFixed(1) + ' MI'],
                  ['GAIN', sel.gain.toLocaleString('en-US') + ' FT'],
                  ['EST TIME', sel.time],
                  ['DRIVE', sel.drive + ' MIN'],
                ] as const
              ).map(([label, value]) => (
                <View key={label} style={styles.detailStatCell}>
                  <Text style={styles.detailStatLabel}>{label}</Text>
                  <Text style={styles.detailStatValue}>{value}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionLabel}>ELEVATION PROFILE</Text>
            <Svg viewBox="0 0 358 130" style={{ width: '100%', aspectRatio: 358 / 130, marginTop: 6 }}>
              <Line x1={38} y1={18} x2={348} y2={18} stroke={palette.line} strokeWidth={1} strokeDasharray="2 4" />
              <Line x1={38} y1={114} x2={348} y2={114} stroke={palette.line} strokeWidth={1} />
              <SvgText x={34} y={21} textAnchor="end" fill={palette.faint} fontFamily={FontFamily.mono} fontSize={8.5}>
                {sel.gain.toLocaleString('en-US') + ' FT'}
              </SvgText>
              <SvgText x={34} y={117} textAnchor="end" fill={palette.faint} fontFamily={FontFamily.mono} fontSize={8.5}>
                0
              </SvgText>
              <Path d={prof.area} fill={palette.orange} opacity={0.12} />
              <Path d={prof.line} fill="none" stroke={palette.orange} strokeWidth={2} strokeLinejoin="round" />
              <SvgText x={38} y={128} fill={palette.faint} fontFamily={FontFamily.mono} fontSize={8.5}>
                0 MI
              </SvgText>
              <SvgText x={348} y={128} textAnchor="end" fill={palette.faint} fontFamily={FontFamily.mono} fontSize={8.5}>
                {sel.dist.toFixed(1)} MI
              </SvgText>
            </Svg>

            <Text style={[styles.sectionLabel, { marginTop: 14 }]}>TRAILHEAD</Text>
            <Text style={styles.trailheadText}>{sel.trailhead}</Text>
            <Text style={styles.notesText}>{sel.notes}</Text>

            <Pressable
              onPress={() => logHike(sel, satKey)}
              style={[styles.logHikeBtn, { backgroundColor: satDone ? palette.green : palette.orange, borderColor: satDone ? palette.green : palette.orange }]}>
              <Text style={styles.logHikeText}>
                {satDone ? '✓ LOGGED — SATURDAY COMPLETE' : 'LOG THIS HIKE'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.detailPanel, { borderTopWidth: 3, borderTopColor: palette.gold, padding: 16 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text style={styles.panelTitle}>THIS SATURDAY</Text>
          <Text style={styles.satDate}>SAT · {fmtShort(satDate)}</Text>
        </View>
        <Text style={styles.satRx}>
          {PHASE_PACK_LB[satPhaseIdx]} LB RUCK · {PHASE_HOURS[satPhaseIdx].toUpperCase()} ·{' '}
          {PHASE_GAIN_FT[satPhaseIdx]} FT GAIN
        </Text>
        <Text style={[styles.sectionLabel, { marginTop: 14 }]}>SUGGESTED MATCH</Text>
        <View style={{ marginTop: 6 }}>
          <TrailCard trail={suggested} onOpen={() => setTrailSel(suggested.id)} bordered />
        </View>
      </View>

      <View style={{ gap: 8 }}>
        {chipRows.map((row) => (
          <View key={row.label} style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <Text style={styles.chipRowLabel}>{row.label}</Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 }}>
              {row.chips.map((ch) => {
                const act = filters[ch.k] === ch.v;
                return (
                  <Pressable
                    key={ch.key}
                    onPress={() => setFilters({ ...filters, [ch.k]: ch.v })}
                    style={[
                      styles.chip,
                      { backgroundColor: act ? palette.orange : 'transparent', borderColor: act ? palette.orange : palette.border },
                    ]}>
                    <Text style={[styles.chipText, { color: act ? palette.bg : palette.muted }]}>{ch.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </View>

      <View style={{ gap: 8 }}>
        {visible.map((t) => (
          <TrailCard key={t.id} trail={t} onOpen={() => setTrailSel(t.id)} />
        ))}
        {visible.length === 0 && <Text style={styles.noTrails}>NO TRAILS MATCH THESE FILTERS</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14 },
  backBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: 8,
    paddingHorizontal: 14,
    minHeight: 38,
    justifyContent: 'center',
  },
  backText: {
    color: palette.textDim,
    fontFamily: FontFamily.display,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  detailPanel: {
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.line,
  },
  panelTitle: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 13,
    letterSpacing: 2,
    color: palette.text,
  },
  satDate: { fontFamily: FontFamily.mono, fontSize: 11, color: palette.muted },
  satRx: { fontFamily: FontFamily.mono, fontSize: 16, color: palette.gold, marginTop: 8 },
  sectionLabel: {
    fontFamily: FontFamily.display,
    fontSize: 11,
    letterSpacing: 1.5,
    color: palette.muted,
    marginTop: 16,
  },
  card: {
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.line,
    flexDirection: 'row',
    gap: 12,
    padding: 10,
    alignItems: 'center',
  },
  cardArt: {
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.line,
  },
  cardName: {
    flex: 1,
    fontFamily: FontFamily.displayMedium,
    fontSize: 14,
    letterSpacing: 0.5,
    lineHeight: 17,
    color: palette.text,
  },
  cardDiff: {
    fontFamily: FontFamily.display,
    fontSize: 9,
    letterSpacing: 1,
    borderWidth: 1,
    paddingVertical: 2,
    paddingHorizontal: 6,
    overflow: 'hidden',
  },
  cardStats: { fontFamily: FontFamily.mono, fontSize: 10.5, color: palette.muted, marginTop: 6, lineHeight: 17 },
  chipRowLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 9,
    color: palette.faint,
    letterSpacing: 1,
    width: 42,
  },
  chip: { borderWidth: 1, paddingVertical: 6, paddingHorizontal: 10 },
  chipText: { fontFamily: FontFamily.display, fontSize: 10, letterSpacing: 1 },
  noTrails: {
    textAlign: 'center',
    color: palette.faint,
    fontFamily: FontFamily.mono,
    fontSize: 11,
    paddingVertical: 24,
  },
  detailName: {
    flex: 1,
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 20,
    letterSpacing: 1,
    lineHeight: 23,
    color: palette.text,
  },
  detailStats: {
    flexDirection: 'row',
    gap: 1,
    backgroundColor: palette.line,
    borderWidth: 1,
    borderColor: palette.line,
    marginTop: 14,
  },
  detailStatCell: {
    flex: 1,
    backgroundColor: palette.bg,
    paddingVertical: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  detailStatLabel: { fontFamily: FontFamily.display, fontSize: 8.5, letterSpacing: 1, color: palette.muted },
  detailStatValue: { fontFamily: FontFamily.mono, fontSize: 13, color: palette.text, marginTop: 3 },
  trailheadText: { fontFamily: FontFamily.body, fontSize: 13, color: palette.text, marginTop: 4, lineHeight: 20 },
  notesText: { fontFamily: FontFamily.body, fontSize: 13, color: palette.textDim, marginTop: 10, lineHeight: 21 },
  logHikeBtn: {
    marginTop: 18,
    borderWidth: 1,
    paddingVertical: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logHikeText: {
    color: palette.bg,
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 13,
    letterSpacing: 2,
  },
});
