import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FontFamily, palette } from '@/constants/theme';
import { saveProfile } from '@/data/repos';
import type { Profile } from '@/data/store';
import { anchorMaxes } from '@/program/estimator';
import { START_WEIGHT_LB } from '@/program/goals';
import type { Anchor, Equipment, Experience } from '@/program/lifts';

const EXPERIENCE_OPTS: { value: Experience; label: string; sub: string }[] = [
  { value: 'new', label: 'NEW', sub: 'First time under a bar' },
  { value: 'returning', label: 'RETURNING', sub: 'Coming back after a layoff' },
  { value: 'trained', label: 'TRAINED', sub: 'Lifting consistently now' },
];

const EQUIPMENT_OPTS: { value: Equipment; label: string; sub: string }[] = [
  { value: 'full_gym', label: 'FULL GYM', sub: 'Barbell + rack' },
  { value: 'dumbbells', label: 'DUMBBELLS', sub: 'DBs only' },
  { value: 'home_minimal', label: 'MINIMAL', sub: 'Bodyweight + pack' },
];

const ANCHOR_ROWS: { anchor: Anchor; label: string }[] = [
  { anchor: 'squat', label: 'Back Squat' },
  { anchor: 'deadlift', label: 'Deadlift' },
  { anchor: 'press', label: 'Overhead Press' },
  { anchor: 'row', label: 'Barbell Row' },
];

export function Onboarding({ profile, onDone }: { profile: Profile | null; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [bw, setBw] = useState(String(profile?.bodyweightLb ?? START_WEIGHT_LB));
  const [experience, setExperience] = useState<Experience>(profile?.experience ?? 'new');
  const [equipment, setEquipment] = useState<Equipment>(profile?.equipment ?? 'full_gym');
  const [cal, setCal] = useState<Record<Anchor, string>>({
    squat: profile?.calibration.squat ? String(profile.calibration.squat) : '',
    deadlift: profile?.calibration.deadlift ? String(profile.calibration.deadlift) : '',
    press: profile?.calibration.press ? String(profile.calibration.press) : '',
    row: profile?.calibration.row ? String(profile.calibration.row) : '',
  });

  const bwNum = parseFloat(bw) || START_WEIGHT_LB;
  const calibration: Partial<Record<Anchor, number>> = {};
  for (const { anchor } of ANCHOR_ROWS) {
    const v = parseFloat(cal[anchor]);
    if (v > 0) calibration[anchor] = v;
  }
  const maxes = anchorMaxes({ bodyweightLb: bwNum, experience, calibration });

  const lockIn = () => {
    saveProfile({ bodyweightLb: bwNum, experience, equipment, calibration });
    onDone();
  };
  const skip = () => {
    saveProfile({
      bodyweightLb: profile?.bodyweightLb ?? START_WEIGHT_LB,
      experience: profile?.experience ?? 'new',
      equipment: profile?.equipment ?? 'full_gym',
      calibration: profile?.calibration ?? {},
    });
    onDone();
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 18,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 16,
          gap: 14,
        }}>
        <View>
          <Text style={styles.kicker}>EXPEDITION CONDITIONING</Text>
          <Text style={styles.title}>CALIBRATION</Text>
          <Text style={styles.subtitle}>
            Seeds a suggested working weight for every barbell and dumbbell lift in the program.
          </Text>
        </View>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            These are conservative estimates, not prescriptions. Start light, add weight only when
            every rep is clean, and stop any set where form breaks down. For the barbell lifts, one
            session with a coach on form is worth more than any calculator.
          </Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>BODYWEIGHT</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <TextInput
              value={bw}
              onChangeText={setBw}
              keyboardType="decimal-pad"
              style={styles.bwInput}
            />
            <Text style={styles.unit}>LB</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>TRAINING EXPERIENCE</Text>
          <View style={{ gap: 8, marginTop: 10 }}>
            {EXPERIENCE_OPTS.map((o) => (
              <OptionRow
                key={o.value}
                label={o.label}
                sub={o.sub}
                active={experience === o.value}
                onPress={() => setExperience(o.value)}
              />
            ))}
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>EQUIPMENT</Text>
          <View style={{ gap: 8, marginTop: 10 }}>
            {EQUIPMENT_OPTS.map((o) => (
              <OptionRow
                key={o.value}
                label={o.label}
                sub={o.sub}
                active={equipment === o.value}
                onPress={() => setEquipment(o.value)}
              />
            ))}
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>CALIBRATION · OPTIONAL</Text>
          <Text style={styles.calHint}>
            For each lift: a weight you could do for ~8 reps with 2–3 left in the tank. Not a max —
            never test a true max for this. Leave blank to use conservative bodyweight defaults.
          </Text>
          <View style={{ gap: 10, marginTop: 12 }}>
            {ANCHOR_ROWS.map(({ anchor, label }) => (
              <View key={anchor} style={styles.calRow}>
                <Text style={styles.calLabel}>{label}</Text>
                <TextInput
                  value={cal[anchor]}
                  onChangeText={(t) => setCal({ ...cal, [anchor]: t })}
                  keyboardType="decimal-pad"
                  placeholder="—"
                  placeholderTextColor={palette.faint}
                  style={styles.calInput}
                />
                <Text style={styles.calSeed}>→ {Math.round(maxes[anchor])} LB MAX</Text>
              </View>
            ))}
          </View>
        </View>

        <Pressable onPress={lockIn} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>LOCK IT IN</Text>
        </Pressable>
        <Pressable onPress={skip} style={styles.ghostBtn}>
          <Text style={styles.ghostBtnText}>SKIP FOR NOW — USE CONSERVATIVE DEFAULTS</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function OptionRow({
  label,
  sub,
  active,
  onPress,
}: {
  label: string;
  sub: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.option,
        { borderColor: active ? palette.orange : palette.line, backgroundColor: active ? palette.bg : 'transparent' },
      ]}>
      <View style={[styles.optionDot, { backgroundColor: active ? palette.orange : 'transparent', borderColor: active ? palette.orange : palette.faint }]} />
      <Text style={[styles.optionLabel, { color: active ? palette.text : palette.muted }]}>{label}</Text>
      <Text style={styles.optionSub}>{sub}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  kicker: {
    fontFamily: FontFamily.mono,
    fontSize: 10.5,
    letterSpacing: 3,
    color: palette.orange,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: 32,
    letterSpacing: 2,
    color: palette.text,
    marginTop: 6,
  },
  subtitle: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    color: palette.textDim,
    lineHeight: 20,
    marginTop: 6,
  },
  disclaimer: {
    backgroundColor: 'rgba(227,179,65,0.08)',
    borderLeftWidth: 3,
    borderLeftColor: palette.gold,
    padding: 12,
  },
  disclaimerText: {
    fontFamily: FontFamily.body,
    fontSize: 12.5,
    color: palette.gold,
    lineHeight: 19,
  },
  panel: {
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 16,
  },
  panelTitle: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 13,
    letterSpacing: 2,
    color: palette.text,
  },
  bwInput: {
    width: 110,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.line,
    color: palette.text,
    fontFamily: FontFamily.mono,
    fontSize: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    textAlign: 'center',
  },
  unit: { fontFamily: FontFamily.mono, fontSize: 12, color: palette.muted, letterSpacing: 1 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  optionDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
  optionLabel: {
    fontFamily: FontFamily.displayMedium,
    fontSize: 13,
    letterSpacing: 1.5,
    width: 104,
  },
  optionSub: { fontFamily: FontFamily.mono, fontSize: 10.5, color: palette.faint, flex: 1 },
  calHint: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    color: palette.textDim,
    lineHeight: 18,
    marginTop: 8,
  },
  calRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  calLabel: { fontFamily: FontFamily.body, fontSize: 13, color: palette.text, width: 118 },
  calInput: {
    width: 72,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.line,
    color: palette.text,
    fontFamily: FontFamily.mono,
    fontSize: 14,
    paddingVertical: 8,
    textAlign: 'center',
  },
  calSeed: { fontFamily: FontFamily.mono, fontSize: 10.5, color: palette.gold, flex: 1 },
  primaryBtn: {
    backgroundColor: palette.orange,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryBtnText: {
    color: palette.bg,
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 13,
    letterSpacing: 2,
  },
  ghostBtn: {
    borderWidth: 1,
    borderColor: palette.border,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtnText: {
    color: palette.muted,
    fontFamily: FontFamily.display,
    fontSize: 10.5,
    letterSpacing: 1.5,
  },
});
