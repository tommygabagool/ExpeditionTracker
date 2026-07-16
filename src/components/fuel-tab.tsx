import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { FoodLookup } from '@/components/food-lookup';
import { FontFamily, palette } from '@/constants/theme';
import { setDailyCalories } from '@/data/repos';
import type { AppData } from '@/data/store';
import { GOAL_WEIGHT_LB } from '@/program/goals';
import { fuelPlan, type FuelStats } from '@/program/nutrition';
import { DAY_NAMES, fmtShort, keyOf, todayDate } from '@/program/schedule';

const FOOD_GUIDE = [
  {
    title: 'PROTEIN ANCHORS — EVERY MEAL',
    color: palette.orange,
    body: 'Chicken breast, lean beef, eggs + whites, Greek yogurt, cottage cheese, white fish, whey isolate.',
  },
  {
    title: 'CARBS — AROUND TRAINING',
    color: palette.blue,
    body: 'Rice, oats, potatoes, sweet potatoes, fruit, sourdough. Biggest portions before/after workouts and on ruck days.',
  },
  {
    title: 'FATS — MEASURED',
    color: palette.gold,
    body: 'Olive oil, avocado, nuts (weighed), fatty fish 2x/week. Easy to overshoot — track them.',
  },
  {
    title: 'MINIMIZE',
    color: palette.muted,
    body: 'Liquid calories, alcohol, fried food, restaurant meals more than 2x/week.',
  },
];

const SAMPLE_MEALS = [
  { slot: 'BREAKFAST', food: '4 eggs + 4 whites, oats w/ berries, black coffee', kcal: '620' },
  { slot: 'LUNCH', food: '8 oz chicken, 1.5 cup rice, mixed greens + olive oil', kcal: '650' },
  { slot: 'PRE-TRAINING', food: 'Banana + whey isolate shake', kcal: '280' },
  { slot: 'DINNER', food: '8 oz lean beef, baked potato, roasted vegetables', kcal: '600' },
  { slot: 'EVENING', food: 'Greek yogurt + almonds', kcal: '200' },
];

export function FuelTab({ data }: { data: AppData }) {
  const [calInput, setCalInput] = useState('');
  const today = todayDate();
  const todayKey = keyOf(today);

  // Targets from onboarding stats + the latest logged weight; the design's
  // frozen defaults remain the fallback until fuel stats exist.
  const p = data.profile;
  const currentLb = data.weights.length
    ? data.weights[data.weights.length - 1].lb
    : (p?.bodyweightLb ?? GOAL_WEIGHT_LB);
  const stats: FuelStats | null =
    p && p.heightIn && p.ageYears && p.sex && p.activity
      ? { weightLb: currentLb, heightIn: p.heightIn, ageYears: p.ageYears, sex: p.sex, activity: p.activity }
      : null;
  const plan = fuelPlan(stats);
  const macros = [
    { grams: `${plan.proteinG}g`, label: 'PROTEIN', kcal: `${plan.proteinG * 4} kcal`, color: palette.orange },
    { grams: `${plan.carbsG}g`, label: 'CARBS', kcal: `${plan.carbsG * 4} kcal`, color: palette.blue },
    { grams: `${plan.fatG}g`, label: 'FAT', kcal: `${plan.fatG * 9} kcal`, color: palette.gold },
  ];

  const calRows: { key: string; date: string; kcal: string; delta: string; deltaColor: string }[] = [];
  let sum = 0;
  let n = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = keyOf(d);
    const v = data.calories[key];
    if (v != null) {
      sum += v;
      n++;
    }
    const delta = v != null ? v - plan.target : null;
    calRows.push({
      key,
      date: (i === 0 ? 'TODAY' : DAY_NAMES[d.getDay()]) + ' ' + fmtShort(d),
      kcal: v != null ? v.toLocaleString('en-US') : '—',
      delta: delta == null ? '' : (delta > 0 ? '+' : '') + delta.toLocaleString('en-US'),
      deltaColor: delta == null ? palette.faint : delta > 0 ? palette.orange : palette.green,
    });
  }
  const avg = n ? Math.round(sum / n) : null;

  const submit = () => {
    const v = parseInt(calInput, 10);
    if (!v || v < 200 || v > 12000) return;
    setDailyCalories(todayKey, v);
    setCalInput('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        <View style={styles.targetsRow}>
          <View style={styles.targetCell}>
            <Text style={[styles.targetLabel, { color: palette.muted }]}>MAINTENANCE</Text>
            <Text style={[styles.targetValue, { color: palette.textDim }]}>
              {plan.maintenance.toLocaleString('en-US')}
            </Text>
          </View>
          <Text style={{ color: palette.orange, fontSize: 20 }}>→</Text>
          <View style={styles.targetCell}>
            <Text style={[styles.targetLabel, { color: palette.orange }]}>DAILY TARGET</Text>
            <Text style={[styles.targetValue, styles.targetBold, { color: palette.orange }]}>
              {plan.target.toLocaleString('en-US')}
            </Text>
          </View>
          <View style={styles.targetCell}>
            <Text style={[styles.targetLabel, { color: palette.muted }]}>DEFICIT</Text>
            <Text style={[styles.targetValue, { color: palette.green }]}>
              {plan.maintain ? '—' : `-${plan.deficit.toLocaleString('en-US')}`}
            </Text>
          </View>
        </View>
        <Text style={styles.planLine}>
          {plan.source === 'default'
            ? 'DEFAULT TARGETS — ADD FUEL STATS IN CALIBRATION (BARBELL ICON)'
            : plan.maintain
              ? `AT GOAL — HOLDING ${currentLb.toFixed(0)} LB AT MAINTENANCE`
              : `${currentLb.toFixed(1)} LB → ${GOAL_WEIGHT_LB} BY WK 26 · −${plan.lbPerWeek.toFixed(1)} LB/WK`}
        </Text>
      </View>

      <View style={styles.macroRow}>
        {macros.map((m) => (
          <View key={m.label} style={[styles.macroCard, { borderTopColor: m.color }]}>
            <Text style={styles.macroGrams}>{m.grams}</Text>
            <Text style={[styles.macroLabel, { color: m.color }]}>{m.label}</Text>
            <Text style={styles.macroKcal}>{m.kcal}</Text>
          </View>
        ))}
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>CALORIE LOG</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <TextInput
            value={calInput}
            onChangeText={setCalInput}
            placeholder="Today's calories"
            placeholderTextColor={palette.faint}
            keyboardType="number-pad"
            style={styles.input}
          />
          <Pressable onPress={submit} style={styles.logBtn}>
            <Text style={styles.logBtnText}>LOG</Text>
          </Pressable>
        </View>
        <View style={styles.avgRow}>
          <Text style={styles.avgLabel}>7-DAY AVERAGE</Text>
          <Text
            style={[
              styles.avgValue,
              { color: avg == null ? palette.faint : avg <= plan.target ? palette.green : palette.orange },
            ]}>
            {avg != null ? avg.toLocaleString('en-US') + ' kcal' : '—'}
          </Text>
        </View>
        <View style={{ marginTop: 6 }}>
          {calRows.map((c) => (
            <View key={c.key} style={styles.calRow}>
              <Text style={styles.calDate}>{c.date}</Text>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'baseline' }}>
                <Text style={styles.calKcal}>{c.kcal}</Text>
                <Text style={[styles.calDelta, { color: c.deltaColor }]}>{c.delta}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <FoodLookup todayKey={todayKey} currentTotal={data.calories[todayKey] ?? null} />

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>FOOD GUIDE</Text>
        <View style={{ marginTop: 10, gap: 12 }}>
          {FOOD_GUIDE.map((g) => (
            <View key={g.title}>
              <Text style={[styles.guideTitle, { color: g.color }]}>{g.title}</Text>
              <Text style={styles.guideBody}>{g.body}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.panel}>
        {/* The meal list is fixed content that sums to 2,350 — keep it honest. */}
        <Text style={styles.panelTitle}>SAMPLE DAY · 2,350</Text>
        <View style={{ marginTop: 6 }}>
          {SAMPLE_MEALS.map((m) => (
            <View key={m.slot} style={styles.mealRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.mealSlot}>{m.slot}</Text>
                <Text style={styles.mealFood}>{m.food}</Text>
              </View>
              <Text style={styles.mealKcal}>{m.kcal}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14 },
  panel: {
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 16,
  },
  panelTitle: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 15,
    letterSpacing: 2,
    color: palette.text,
  },
  targetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  targetCell: { alignItems: 'center', flex: 1 },
  targetLabel: { fontFamily: FontFamily.display, fontSize: 12, letterSpacing: 1.5 },
  targetValue: { fontFamily: FontFamily.mono, fontSize: 24, marginTop: 4 },
  targetBold: { fontFamily: FontFamily.monoBold },
  planLine: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    letterSpacing: 0.3,
    color: palette.muted,
    textAlign: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: palette.line,
  },
  macroRow: { flexDirection: 'row', gap: 8 },
  macroCard: {
    flex: 1,
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.line,
    borderTopWidth: 3,
    padding: 12,
    alignItems: 'center',
  },
  macroGrams: { fontFamily: FontFamily.monoBold, fontSize: 22, color: palette.text },
  macroLabel: { fontFamily: FontFamily.display, fontSize: 12, letterSpacing: 1.5, marginTop: 3 },
  macroKcal: { fontFamily: FontFamily.body, fontSize: 13, color: palette.muted, marginTop: 3 },
  input: {
    flex: 1,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.line,
    color: palette.text,
    fontFamily: FontFamily.mono,
    fontSize: 17,
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
    fontSize: 15,
    letterSpacing: 2,
  },
  avgRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: palette.line,
  },
  avgLabel: { fontFamily: FontFamily.display, fontSize: 12, letterSpacing: 1.5, color: palette.muted },
  avgValue: { fontFamily: FontFamily.mono, fontSize: 18 },
  calRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  calDate: { fontFamily: FontFamily.mono, fontSize: 14, color: palette.muted },
  calKcal: { fontFamily: FontFamily.mono, fontSize: 15, color: palette.text },
  calDelta: { fontFamily: FontFamily.mono, fontSize: 13, width: 64, textAlign: 'right' },
  guideTitle: { fontFamily: FontFamily.display, fontSize: 13, letterSpacing: 1.5 },
  guideBody: { fontFamily: FontFamily.body, fontSize: 15, color: palette.textDim, marginTop: 4, lineHeight: 25 },
  mealRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'baseline',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  mealSlot: { fontFamily: FontFamily.display, fontSize: 13, letterSpacing: 1.5, color: palette.muted },
  mealFood: { fontFamily: FontFamily.body, fontSize: 15, color: palette.text, marginTop: 2, lineHeight: 22 },
  mealKcal: { fontFamily: FontFamily.mono, fontSize: 14, color: palette.textDim },
});
