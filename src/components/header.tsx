import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { Logo } from '@/components/logo';
import { FontFamily, palette } from '@/constants/theme';
import { ridge, segPaths } from '@/lib/geometry';
import { currentWeek, phaseOf } from '@/program/schedule';

interface Props {
  badgeCountLine: string;
  metaLine: string; // rank · altitude · week
  startW: string;
  currentW: string;
  goalW: string;
  lostW: string;
  onOpenSummit: () => void;
  onPickWeek: (week: number) => void;
  onOpenCalibration: () => void;
}

export function Header({
  badgeCountLine,
  metaLine,
  startW,
  currentW,
  goalW,
  lostW,
  onOpenSummit,
  onPickWeek,
  onOpenCalibration,
}: Props) {
  const week = currentWeek();
  const pts = ridge();
  const s1 = segPaths(pts, 0, 9);
  const s2 = segPaths(pts, 9, 18);
  const s3 = segPaths(pts, 18, 26);
  const nowPt = pts[week - 1];

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <Logo size={42} />
          <View style={{ minWidth: 0, flex: 1 }}>
            <Text style={styles.title}>
              SWITCH<Text style={{ color: palette.orange }}>BACK</Text>
            </Text>
            <Text style={styles.meta}>{metaLine}</Text>
          </View>
        </View>
        <Pressable onPress={onOpenCalibration} style={styles.calibrateBtn}>
          <Svg viewBox="0 0 24 24" width={20} height={20}>
            <Path d="M2 12 L22 12" stroke={palette.muted} strokeWidth={1.6} strokeLinecap="round" />
            <Path d="M5 9 L5 15" stroke={palette.muted} strokeWidth={1.6} strokeLinecap="round" />
            <Path d="M8 7 L8 17" stroke={palette.muted} strokeWidth={1.6} strokeLinecap="round" />
            <Path d="M16 7 L16 17" stroke={palette.muted} strokeWidth={1.6} strokeLinecap="round" />
            <Path d="M19 9 L19 15" stroke={palette.muted} strokeWidth={1.6} strokeLinecap="round" />
          </Svg>
        </Pressable>
        <Pressable onPress={onOpenSummit} style={styles.summitBtn}>
          <Svg viewBox="0 0 24 24" width={20} height={20}>
            <Path
              d="M2 20 L9 7 L13 13 L16 9 L22 20 Z"
              fill="none"
              stroke={palette.gold}
              strokeWidth={1.6}
              strokeLinejoin="round"
            />
          </Svg>
          <View>
            <Text style={styles.summitLabel}>SUMMIT LOG</Text>
            <Text style={styles.summitCount}>{badgeCountLine}</Text>
          </View>
        </Pressable>
      </View>

      {/* Ridgeline: 26 weeks as elevation profile */}
      <Svg viewBox="0 0 390 140" style={styles.ridge}>
        {[34, 64, 94].map((y) => (
          <Line key={y} x1={15} y1={y} x2={375} y2={y} stroke={palette.line} strokeWidth={1} strokeDasharray="2 5" />
        ))}
        <Path d={s1.fill} fill={palette.green} opacity={0.14} />
        <Path d={s2.fill} fill={palette.blue} opacity={0.14} />
        <Path d={s3.fill} fill={palette.orange} opacity={0.14} />
        <Path d={s1.line} fill="none" stroke={palette.green} strokeWidth={2} strokeLinejoin="round" />
        <Path d={s2.line} fill="none" stroke={palette.blue} strokeWidth={2} strokeLinejoin="round" />
        <Path d={s3.line} fill="none" stroke={palette.orange} strokeWidth={2} strokeLinejoin="round" />
        <Line x1={nowPt.x} y1={nowPt.y} x2={nowPt.x} y2={124} stroke={palette.gold} strokeWidth={1} strokeDasharray="3 3" />
        {pts.map((p) => (
          <Circle
            key={p.week}
            cx={p.x}
            cy={p.y}
            r={p.week === week ? 4 : 3}
            fill={p.week === week ? palette.gold : phaseOf(p.week).color}
            stroke={palette.bg}
            strokeWidth={1.5}
            onPress={() => onPickWeek(p.week)}
          />
        ))}
        <Circle cx={nowPt.x} cy={nowPt.y} r={8} fill="none" stroke={palette.gold} strokeWidth={1.5} />
        <SvgText x={nowPt.x} y={nowPt.y - 14} textAnchor="middle" fill={palette.gold} fontFamily={FontFamily.mono} fontSize={11} letterSpacing={1.5}>
          NOW
        </SvgText>
        <SvgText x={15} y={136} fill={palette.green} fontFamily={FontFamily.display} fontSize={12} letterSpacing={1.5}>
          BASE CAMP
        </SvgText>
        <SvgText x={195} y={136} textAnchor="middle" fill={palette.blue} fontFamily={FontFamily.display} fontSize={12} letterSpacing={1.5}>
          LOAD CAMP
        </SvgText>
        <SvgText x={375} y={136} textAnchor="end" fill={palette.orange} fontFamily={FontFamily.display} fontSize={12} letterSpacing={1.5}>
          ALPINE PUSH
        </SvgText>
      </Svg>

      {/* Stat row */}
      <View style={styles.statRow}>
        {(
          [
            { label: 'START', value: startW, labelColor: palette.muted, valueColor: palette.text, bold: false },
            { label: 'CURRENT', value: currentW, labelColor: palette.gold, valueColor: palette.gold, bold: true },
            { label: 'GOAL', value: goalW, labelColor: palette.muted, valueColor: palette.text, bold: false },
            { label: 'LOST', value: lostW, labelColor: palette.muted, valueColor: palette.green, bold: false },
          ] as const
        ).map((s) => (
          <View key={s.label} style={styles.statCell}>
            <Text style={[styles.statLabel, { color: s.labelColor }]}>{s.label}</Text>
            <Text
              style={[
                styles.statValue,
                { color: s.valueColor, fontFamily: s.bold ? FontFamily.monoBold : FontFamily.monoMedium },
              ]}>
              {s.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 18,
    paddingHorizontal: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  brandRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 24,
    letterSpacing: 2.5,
    lineHeight: 28,
    color: palette.text,
  },
  meta: {
    fontFamily: FontFamily.mono,
    fontSize: 13,
    color: palette.muted,
    letterSpacing: 1,
    marginTop: 4,
  },
  calibrateBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 9,
    minHeight: 44,
  },
  summitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: 7,
    paddingHorizontal: 10,
    minHeight: 44,
  },
  summitLabel: {
    fontFamily: FontFamily.display,
    fontSize: 11,
    letterSpacing: 1.5,
    color: palette.muted,
    lineHeight: 12,
  },
  summitCount: {
    fontFamily: FontFamily.mono,
    fontSize: 14,
    color: palette.gold,
    lineHeight: 18,
  },
  ridge: {
    width: '100%',
    aspectRatio: 390 / 140,
    marginTop: 10,
  },
  statRow: {
    flexDirection: 'row',
    gap: 1,
    backgroundColor: palette.line,
    borderWidth: 1,
    borderColor: palette.line,
    marginTop: 12,
  },
  statCell: {
    flex: 1,
    backgroundColor: palette.panel,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: FontFamily.display,
    fontSize: 12,
    letterSpacing: 1.5,
  },
  statValue: {
    fontSize: 20,
    marginTop: 3,
  },
});
