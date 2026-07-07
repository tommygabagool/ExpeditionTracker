import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { FontFamily, palette } from '@/constants/theme';
import type { AppData } from '@/data/store';
import { CAMP_DEFS, type BadgeComputed } from '@/program/badges';
import { fmtShort } from '@/program/schedule';

interface Props {
  data: AppData;
  badges: BadgeComputed[];
  onBack: () => void;
}

const NODE_X = [70, 150, 110, 200, 165, 250];

export function SummitTab({ data, badges, onBack }: Props) {
  const fmtWhen = (id: string) => {
    const k = data.badges[id];
    if (!k) return '';
    const d = new Date(k + 'T00:00:00');
    return fmtShort(d) + ' ' + d.getFullYear();
  };

  const camps = CAMP_DEFS.map((cd, ci) => {
    const list = badges.filter((b) => b.camp === ci);
    const earnedN = list.filter((b) => b.earned).length;
    const full = earnedN === list.length;
    return {
      name: cd.name,
      alt: cd.alt,
      list,
      earnedN,
      total: list.length,
      count: earnedN + '/' + list.length,
      countColor: full ? palette.green : earnedN > 0 ? palette.gold : palette.faint,
      dotFill: full ? palette.gold : earnedN > 0 ? palette.orange : palette.bg,
      dotStroke: earnedN > 0 ? palette.gold : palette.lock,
      nameColor: earnedN > 0 ? palette.text : palette.muted,
    };
  });

  const ascNodes = camps.map((c, ci) => {
    const y = 300 - ci * 52;
    const x = NODE_X[ci];
    const reached = c.earnedN > 0;
    const full = c.earnedN === c.total;
    const leftLabel = x > 180;
    return {
      x,
      y,
      r: reached ? 6 : 4,
      fill: full ? palette.gold : reached ? palette.orange : palette.bg,
      stroke: reached ? palette.gold : palette.lock,
      lx1: leftLabel ? x - 46 : x + 12,
      lx2: leftLabel ? x - 12 : x + 46,
      tx: leftLabel ? x - 50 : x + 50,
      anchor: (leftLabel ? 'end' : 'start') as 'end' | 'start',
      name: c.name,
      altCount: c.alt + ' FT · ' + c.count,
      labelColor: reached ? palette.text : '#5A6672',
    };
  });
  const ridgePath = 'M' + ascNodes.map((n) => n.x + ' ' + n.y).join(' L');
  const silhouette =
    'M0 300 L70 300 L' +
    [...ascNodes].reverse().map((n) => n.x + ' ' + n.y).join(' L') +
    ' L250 300 L358 300 L358 340 L0 340 Z';
  const highestReached = camps.reduce((acc, c, i) => (c.earnedN > 0 ? i : acc), 0);
  const anyReached = camps.some((c) => c.earnedN > 0);
  const here = ascNodes[highestReached];
  const totalEarned = badges.filter((b) => b.earned).length;
  const currentCampName = anyReached ? CAMP_DEFS[highestReached].name : 'TRAILHEAD';

  return (
    <View style={styles.container}>
      <Pressable onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>‹ BACK</Text>
      </Pressable>

      {/* Ascent diagram */}
      <View style={styles.ascentPanel}>
        <View style={styles.ascentHead}>
          <Text style={styles.ascentTitle}>THE ASCENT</Text>
          <Text style={styles.ascentCount}>
            {totalEarned}/{badges.length} BADGES
          </Text>
        </View>
        <Text style={styles.ascentPos}>CURRENT POSITION · {currentCampName}</Text>
        <Svg viewBox="0 0 358 340" style={{ width: '100%', aspectRatio: 358 / 340, marginTop: 6 }}>
          <Path d={silhouette} fill={palette.panelDeep} stroke={palette.line} strokeWidth={1} />
          <Path d={ridgePath} fill="none" stroke={palette.border} strokeWidth={1.5} strokeDasharray="5 4" />
          {ascNodes.map((n) => (
            <Line key={'l' + n.name} x1={n.lx1} y1={n.y} x2={n.lx2} y2={n.y} stroke={palette.line} strokeWidth={1} />
          ))}
          {ascNodes.map((n) => (
            <Circle key={'c' + n.name} cx={n.x} cy={n.y} r={n.r} fill={n.fill} stroke={n.stroke} strokeWidth={2} />
          ))}
          {ascNodes.map((n) => (
            <SvgText key={'t' + n.name} x={n.tx} y={n.y - 1} textAnchor={n.anchor} fill={n.labelColor} fontFamily={FontFamily.display} fontSize={11} letterSpacing={1}>
              {n.name}
            </SvgText>
          ))}
          {ascNodes.map((n) => (
            <SvgText key={'a' + n.name} x={n.tx} y={n.y + 10} textAnchor={n.anchor} fill={palette.faint} fontFamily={FontFamily.mono} fontSize={8.5}>
              {n.altCount}
            </SvgText>
          ))}
          {anyReached && (
            <>
              <Circle cx={here.x} cy={here.y} r={11} fill="none" stroke={palette.gold} strokeWidth={1.5} opacity={0.7} />
              <Circle cx={here.x} cy={here.y} r={4.5} fill={palette.gold} />
            </>
          )}
        </Svg>
      </View>

      {/* Camps with badge grids */}
      {camps.map((c) => (
        <View key={c.name}>
          <View style={styles.campHead}>
            <View style={[styles.campDot, { backgroundColor: c.dotFill, borderColor: c.dotStroke }]} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.campName, { color: c.nameColor }]}>{c.name}</Text>
              <Text style={styles.campAlt}>{c.alt} FT</Text>
            </View>
            <Text style={[styles.campCount, { color: c.countColor }]}>{c.count}</Text>
          </View>
          <View style={styles.badgeGrid}>
            {c.list.map((b) => {
              const ring = b.earned ? palette.orange : palette.lock;
              const icon = b.earned ? palette.gold : palette.lock;
              const sub = b.earned ? fmtWhen(b.id) || 'EARNED' : b.goal > 1 ? b.cur + '/' + b.goal : 'LOCKED';
              return (
                <View key={b.id} style={styles.badgeCell}>
                  <Svg viewBox="0 0 72 72" style={{ width: '100%', maxWidth: 76, aspectRatio: 1 }}>
                    <Circle cx={36} cy={36} r={34} fill={b.earned ? palette.panelDeep : 'transparent'} stroke={ring} strokeWidth={2} />
                    <Circle cx={36} cy={36} r={28} fill="none" stroke={ring} strokeWidth={1} opacity={0.4} />
                    {b.iconPaths.map((d, i) => (
                      <Path
                        key={i}
                        d={d}
                        fill="none"
                        stroke={icon}
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        transform="translate(12,12)"
                      />
                    ))}
                    {b.earned && <Circle cx={36} cy={65} r={3} fill={palette.orange} stroke={palette.bg} strokeWidth={1} />}
                  </Svg>
                  <Text style={[styles.badgeTitle, { color: b.earned ? palette.text : '#5A6672' }]}>
                    {b.title.toUpperCase()}
                  </Text>
                  <Text style={[styles.badgeSub, { color: b.earned ? palette.gold : palette.faint }]}>{sub}</Text>
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
    letterSpacing: 2,
    color: palette.text,
  },
  ascentCount: { fontFamily: FontFamily.mono, fontSize: 11, color: palette.gold },
  ascentPos: {
    fontFamily: FontFamily.mono,
    fontSize: 10.5,
    color: palette.muted,
    letterSpacing: 0.5,
    paddingTop: 4,
    paddingHorizontal: 8,
  },
  campHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 6,
    paddingBottom: 12,
    paddingHorizontal: 2,
  },
  campDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  campName: { fontFamily: FontFamily.displaySemiBold, fontSize: 14, letterSpacing: 1.5 },
  campAlt: { fontFamily: FontFamily.mono, fontSize: 9.5, color: palette.muted, letterSpacing: 0.5 },
  campCount: { fontFamily: FontFamily.mono, fontSize: 12 },
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
