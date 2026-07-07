import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CelebrationToast } from '@/components/celebration-toast';
import { FuelTab } from '@/components/fuel-tab';
import { Header } from '@/components/header';
import { Login } from '@/components/login';
import { Onboarding } from '@/components/onboarding';
import { SummitTab } from '@/components/summit-tab';
import { TabBar, type MainTab } from '@/components/tab-bar';
import { TodayTab } from '@/components/today-tab';
import { TrailsTab } from '@/components/trails-tab';
import { WeekTab } from '@/components/week-tab';
import { palette } from '@/constants/theme';
import { awardBadge } from '@/data/repos';
import { useAppData } from '@/data/store';
import { useSession } from '@/hooks/use-session';
import { CAMP_DEFS, computeBadges } from '@/program/badges';
import { GOAL_WEIGHT_LB, START_WEIGHT_LB } from '@/program/goals';
import { currentWeek, keyOf, todayDate } from '@/program/schedule';

type Screen = MainTab | 'summit';

export default function AppScreen() {
  const insets = useSafeAreaInsets();
  const data = useAppData();
  const badges = useMemo(() => computeBadges(data), [data]);

  const session = useSession();
  const [screen, setScreen] = useState<Screen>('today');
  const [weekSel, setWeekSel] = useState<number>(currentWeek());
  const [summitBack, setSummitBack] = useState<MainTab>('today');
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const [recalibrating, setRecalibrating] = useState(false);
  const [trainOffline, setTrainOffline] = useState(false);
  const firstReconcile = useRef(true);

  // Award newly-earned badges and celebrate the newest — mirrors the design's
  // reconcileBadges (no celebration on the very first pass after launch).
  useEffect(() => {
    const todayKey = keyOf(todayDate());
    let newest: string | null = null;
    for (const b of badges) {
      if (b.earned && !data.badges[b.id]) {
        awardBadge(b.id, b.when ?? todayKey);
        newest = b.id;
      }
    }
    if (firstReconcile.current) {
      firstReconcile.current = false;
      return;
    }
    if (newest) {
      setCelebrate(newest);
      const t = setTimeout(() => setCelebrate(null), 5200);
      return () => clearTimeout(t);
    }
  }, [badges, data.badges]);

  const sorted = [...data.weights].sort((a, b) => (a.date < b.date ? -1 : 1));
  const cur = sorted.length ? sorted[sorted.length - 1].lb : START_WEIGHT_LB;
  const lost = Math.round((START_WEIGHT_LB - cur) * 10) / 10;
  const totalEarned = badges.filter((b) => b.earned).length;

  const openSummit = () => {
    if (screen !== 'summit') setSummitBack(screen);
    setScreen('summit');
  };
  const pickWeek = (week: number) => {
    setWeekSel(week);
    setScreen('week');
  };

  const celebBadge = celebrate ? badges.find((b) => b.id === celebrate) : null;

  // Gate order matters: session first (a second device pulls its profile down
  // and skips onboarding), then onboarding, then the app.
  if (session === 'loading') {
    return <View style={styles.root} />;
  }
  if (session === 'signedOut' && !trainOffline) {
    return <Login onSkip={() => setTrainOffline(true)} />;
  }
  if (!data.profile?.onboardingComplete || recalibrating) {
    return <Onboarding profile={data.profile} onDone={() => setRecalibrating(false)} />;
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
        contentInsetAdjustmentBehavior="never">
        <View style={{ height: insets.top }} />
        <Header
          badgeCountLine={`${totalEarned}/${badges.length}`}
          startW={START_WEIGHT_LB.toFixed(0)}
          currentW={cur.toFixed(1)}
          goalW={GOAL_WEIGHT_LB.toFixed(0)}
          lostW={(lost > 0 ? '-' : '') + Math.abs(lost).toFixed(1)}
          onOpenSummit={openSummit}
          onPickWeek={pickWeek}
          onOpenCalibration={() => setRecalibrating(true)}
        />

        {screen === 'today' && <TodayTab data={data} badges={badges} onOpenSummit={openSummit} />}
        {screen === 'week' && <WeekTab data={data} week={weekSel} onChangeWeek={setWeekSel} />}
        {screen === 'fuel' && <FuelTab data={data} />}
        {screen === 'trails' && <TrailsTab data={data} />}
        {screen === 'summit' && (
          <SummitTab data={data} badges={badges} onBack={() => setScreen(summitBack)} />
        )}
      </ScrollView>

      <TabBar active={screen} onChange={setScreen} />

      {celebBadge && (
        <CelebrationToast
          title={celebBadge.title}
          iconPaths={celebBadge.iconPaths}
          campName={CAMP_DEFS[celebBadge.camp].name}
          onDismiss={() => setCelebrate(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  scroll: {
    flex: 1,
  },
});
