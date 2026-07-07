import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { StreakFlame } from '@/components/altimeter';
import { BadgeMedal } from '@/components/badge-medal';
import { FontFamily, palette } from '@/constants/theme';
import type { AppData } from '@/data/store';
import type { Ascent } from '@/program/ascent';
import { CAMP_DEFS, type BadgeComputed } from '@/program/badges';
import { fmtShort, keyOf, todayDate } from '@/program/schedule';

interface Props {
  data: AppData;
  badges: BadgeComputed[];
  ascent: Ascent;
  onBack: () => void;
}

const NODE_X = [70, 150, 110, 200, 165, 250];

export function SummitTab({ data, badges, ascent, onBack }: Props) {
  const todayKey = keyOf(todayDate());

  const fmtWhen = (id: string) => {
    const k = data.badges[id];
    if (!k) return '';
    const d = new Date(k + 'T00:00:00');
    return fmtShort(d) + ' ' + d.getFullYear();
  };

  // Camps: DIAGRAM state comes from altitude (the climb); badge tallies stay
  // per-camp collections you fill along the way.
  const camps = CAMP_DEFS.map((cd, ci) => {
    const list = badges.filter((b) => b.camp === ci);
    const earnedN = list.filter((b) => b.earned).length;
    const reached = ascent.altitudeFt >= cd.altFt;
    return {
      ...cd,
      list,
      earnedN,
      total: list.length,
      count: earnedN + '/' + list.length,
      countColor: earnedN === list.length ? palette.green : earnedN > 0 ? palette.gold : palette.faint,
      reached,
    };
  });

  const nodes = camps.map((c, ci) => {
    const y = 300 - ci * 52;
    const x = NODE_X[ci];
    const leftLabel = x > 180;
    return {
      x,
      y,
      r: c.reached ? 6 : 4,
      fill: c.reached ? palette.gold : palette.bg,
      stroke: c.reached ? palette.gold : palette.lock,
      lx1: leftLabel ? x - 46 : x + 12,
      lx2: leftLabel ? x - 12 : x + 46,
      tx: leftLabel ? x - 50 : x + 50,
      anchor: (leftLabel ? 'end' : 'start') as 'end' | 'start',
      name: c.name,
      altFt: c.altFt,
      altCount: c.alt + ' FT · ' + c.count,
      labelColor: c.reached ? palette.text : palette.faint,
    };
  });
  const ridgePath = 'M' + nodes.map((n) => n.x + ' ' + n.y).join(' L');
  const silhouette =
    'M0 300 L70 300 L' +
    [...nodes].reverse().map((n) => n.x + ' ' + n.y).join(' L') +
    ' L250 300 L358 300 L358 340 L0 340 Z';

  // "You are here": interpolated along the ridge by altitude, not snapped to a camp.
  let hereX = nodes[0].x;
  let hereY = nodes[0].y;
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i];
    const b = nodes[i + 1];
    if (ascent.altitudeFt >= b.altFt) {
      hereX = b.x;
      hereY = b.y;
      continue;
    }
    const t = (ascent.altitudeFt - a.altFt) / (b.altFt - a.altFt);
    hereX = a.x + (b.x - a.x) * t;
    hereY = a.y + (b.y - a.y) * t;
    break;
  }

  return (
    <View style={styles.container}>
      <Pressable onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>‹ BACK</Text>
      </Pressable>

      {/* Expedition stats band */}
      <View style={styles.statBand}>
        {(
          [
            { label: 'ALTITUDE', value: ascent.altitudeFt.toLocaleString('en-US'), color: palette.text },
            { label: 'STREAK', value: String(ascent.streak), color: palette.orange, flame: true },
            { label: 'BEST', value: String(ascent.bestStreak), color: palette.textDim },
            { label: 'BADGES', value: `${badges.filter((b) => b.earned).length}/${badges.length}`, color: palette.gold },
          ] as const
        ).map((s) => (
          <View key={s.label} style={styles.statCell}>
            <Text style={styles.statLabel}>{s.label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
              {'flame' in s && s.flame ? <StreakFlame streak={ascent.streak} size={13} /> : null}
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Rank + next-rank progress */}
      <View style={styles.rankPanel}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text style={styles.rankTitle}>{ascent.rank.title}</Text>
          {ascent.nextRank && (
            <Text style={styles.rankNext}>
              NEXT · {ascent.nextRank.title} @ {ascent.nextRank.atFt.toLocaleString('en-US')} FT
            </Text>
          )}
        </View>
        <View style={styles.rankTrack}>
          <View style={[styles.rankFill, { width: `${Math.round(ascent.rankProgress * 100)}%` }]} />
        </View>
      </View>

      {/* Ascent diagram */}
      <View style={styles.ascentPanel}>
        <View style={styles.ascentHead}>
          <Text style={styles.ascentTitle}>THE ASCENT</Text>
          <Text style={styles.ascentCount}>{ascent.altitudeFt.toLocaleString('en-US')} / 29,032 FT</Text>
        </View>
        <Svg viewBox="0 0 358 340" style={{ width: '100%', aspectRatio: 358 / 340, marginTop: 6 }}>
          <Path d={silhouette} fill={palette.panelDeep} stroke={palette.line} strokeWidth={1} />
          <Path d={ridgePath} fill="none" stroke={palette.border} strokeWidth={1.5} strokeDasharray="5 4" />
          {nodes.map((n) => (
            <Line key={'l' + n.name} x1={n.lx1} y1={n.y} x2={n.lx2} y2={n.y} stroke={palette.line} strokeWidth={1} />
          ))}
          {nodes.map((n) => (
            <Circle key={'c' + n.name} cx={n.x} cy={n.y} r={n.r} fill={n.fill} stroke={n.stroke} strokeWidth={2} />
          ))}
          {nodes.map((n) => (
            <SvgText key={'t' + n.name} x={n.tx} y={n.y - 1} textAnchor={n.anchor} fill={n.labelColor} fontFamily={FontFamily.display} fontSize={11} letterSpacing={1}>
              {n.name}
            </SvgText>
          ))}
          {nodes.map((n) => (
            <SvgText key={'a' + n.name} x={n.tx} y={n.y + 10} textAnchor={n.anchor} fill={palette.faint} fontFamily={FontFamily.mono} fontSize={8.5}>
              {n.altCount}
            </SvgText>
          ))}
          <Circle cx={hereX} cy={hereY} r={11} fill="none" stroke={palette.orange} strokeWidth={1.5} opacity={0.7} />
          <Circle cx={hereX} cy={hereY} r={4.5} fill={palette.orange} />
        </Svg>
      </View>

      {/* Camps with badge grids */}
      {camps.map((c) => (
        <View key={c.name}>
          <View style={styles.campHead}>
            <View
              style={[
                styles.campDot,
                {
                  backgroundColor: c.reached ? palette.gold : 'transparent',
                  borderColor: c.reached ? palette.gold : palette.lock,
                },
              ]}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.campName, { color: c.reached ? palette.text : palette.muted }]}>
                {c.name}
              </Text>
              <Text style={styles.campAlt}>{c.alt} FT</Text>
            </View>
            <Text style={[styles.campCount, { color: c.countColor }]}>{c.count}</Text>
          </View>
          <View style={styles.badgeGrid}>
            {c.list.map((b) => {
              const isNew = b.earned && data.badges[b.id] === todayKey;
              const sub = b.earned
                ? isNew
                  ? '★ NEW'
                  : fmtWhen(b.id) || 'EARNED'
                : b.goal > 1
                  ? b.cur + '/' + b.goal
                  : 'LOCKED';
              return (
                <View key={b.id} style={styles.badgeCell}>
                  <BadgeMedal
                    iconPaths={b.iconPaths}
                    ring={b.earned ? palette.orange : palette.lock}
                    icon={b.earned ? palette.gold : palette.lock}
                    bg={b.earned ? palette.panelDeep : 'transparent'}
                    size={72}
                    star={b.earned}
                    progress={b.earned ? undefined : b.cur / b.goal}
                  />
                  <Text style={[styles.badgeTitle, { color: b.earned ? palette.text : palette.faint }]}>
                    {b.title.toUpperCase()}
                  </Text>
                  <Text style={[styles.badgeSub, { color: b.earned ? palette.gold : palette.faint }]}>
                    {sub}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ))}
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
  statBand: {
    flexDirection: 'row',
    gap: 1,
    backgroundColor: palette.line,
    borderWidth: 1,
    borderColor: palette.line,
  },
  statCell: {
    flex: 1,
    backgroundColor: palette.panel,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: FontFamily.display,
    fontSize: 9,
    letterSpacing: 1.5,
    color: palette.muted,
  },
  statValue: { fontFamily: FontFamily.monoBold, fontSize: 15 },
  rankPanel: {
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.line,
    borderLeftWidth: 3,
    borderLeftColor: palette.orange,
    padding: 12,
  },
  rankTitle: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 15,
    color: palette.text,
  },
  rankNext: { fontFamily: FontFamily.mono, fontSize: 9, color: palette.muted },
  rankTrack: {
    height: 6,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.line,
    marginTop: 8,
  },
  rankFill: { height: '100%', backgroundColor: palette.orange },
  ascentPanel: {
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.line,
    paddingTop: 16,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  ascentHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 8,
  },
  ascentTitle: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 15,
    letterSpacing: 1,
    color: palette.text,
  },
  ascentCount: { fontFamily: FontFamily.mono, fontSize: 10.5, color: palette.gold },
  campHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 6,
    paddingBottom: 12,
    paddingHorizontal: 2,
  },
  campDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  campName: { fontFamily: FontFamily.displaySemiBold, fontSize: 13, letterSpacing: 0.5 },
  campAlt: { fontFamily: FontFamily.mono, fontSize: 9.5, color: palette.muted, letterSpacing: 0.5 },
  campCount: { fontFamily: FontFamily.monoBold, fontSize: 12 },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badgeCell: {
    flexBasis: '30%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 6,
  },
  badgeTitle: {
    fontFamily: FontFamily.displayMedium,
    fontSize: 10,
    letterSpacing: 0.5,
    lineHeight: 12,
    minHeight: 24,
    textAlign: 'center',
  },
  badgeSub: { fontFamily: FontFamily.mono, fontSize: 8.5, letterSpacing: 0.5 },
});
