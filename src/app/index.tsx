import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CelebrationToast } from '@/components/celebration-toast';
import { FuelTab } from '@/components/fuel-tab';
import { Header } from '@/components/header';
import { Login } from '@/components/login';
import { Onboarding } from '@/components/onboarding';
import { SessionMode } from '@/components/session-mode';
import { SnowBurst } from '@/components/snow-burst';
import { SummitTab } from '@/components/summit-tab';
import { TabBar, type MainTab } from '@/components/tab-bar';
import { TodayTab } from '@/components/today-tab';
import { TrailsTab } from '@/components/trails-tab';
import { WeekTab } from '@/components/week-tab';
import { palette } from '@/constants/theme';
import { awardBadge } from '@/data/repos';
import { useAppData } from '@/data/store';
import { useSession } from '@/hooks/use-session';
import { computeAscent } from '@/program/ascent';
import { CAMP_DEFS, computeBadges } from '@/program/badges';
import { goalWeightLb, startWeightLb } from '@/program/goals';
import { currentWeek, keyOf, programWeeks, todayDate } from '@/program/schedule';

type Screen = MainTab | 'summit';

export default function AppScreen() {
  const insets = useSafeAreaInsets();
  const data = useAppData();
  const badges = useMemo(() => computeBadges(data), [data]);
  const ascent = useMemo(() => computeAscent(data), [data]);

  const session = useSession();
  const [screen, setScreen] = useState<Screen>('today');
  const [weekSel, setWeekSel] = useState<number>(currentWeek());
  const [summitBack, setSummitBack] = useState<MainTab>('today');
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const [recalibrating, setRecalibrating] = useState(false);
  const [trainOffline, setTrainOffline] = useState(false);
  const [inSession, setInSession] = useState(false);
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
      const id = newest;
      // Defer the show off the effect body (a task, not a synchronous setState
      // in the effect) and auto-dismiss after the toast's lifetime.
      const show = setTimeout(() => setCelebrate(id), 0);
      const hide = setTimeout(() => setCelebrate(null), 5200);
      return () => {
        clearTimeout(show);
        clearTimeout(hide);
      };
    }
  }, [badges, data.badges]);

  const sorted = [...data.weights].sort((a, b) => (a.date < b.date ? -1 : 1));
  const cur = sorted.length ? sorted[sorted.length - 1].lb : startWeightLb();
  const lost = Math.round((startWeightLb() - cur) * 10) / 10;
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
  if (inSession) {
    return <SessionMode data={data} ascent={ascent} onExit={() => setInSession(false)} />;
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
        contentInsetAdjustmentBehavior="never">
        <View style={{ height: insets.top }} />
        <Header
          badgeCountLine={`${totalEarned}/${badges.length}`}
          metaLine={`${ascent.rank.title} · ${ascent.altitudeFt.toLocaleString('en-US')} FT · WK ${String(currentWeek()).padStart(2, '0')}/${String(programWeeks()).padStart(2, '0')}`}
          startW={startWeightLb().toFixed(0)}
          currentW={cur.toFixed(1)}
          goalW={goalWeightLb().toFixed(0)}
          lostW={(lost > 0 ? '-' : '') + Math.abs(lost).toFixed(1)}
          onOpenSummit={openSummit}
          onPickWeek={pickWeek}
          onOpenCalibration={() => setRecalibrating(true)}
        />

        {screen === 'today' && (
          <TodayTab
            data={data}
            badges={badges}
            ascent={ascent}
            onOpenSummit={openSummit}
            onStartSession={() => setInSession(true)}
          />
        )}
        {screen === 'week' && <WeekTab data={data} week={weekSel} onChangeWeek={setWeekSel} />}
        {screen === 'fuel' && <FuelTab data={data} />}
        {screen === 'trails' && <TrailsTab data={data} />}
        {screen === 'summit' && (
          <SummitTab data={data} badges={badges} ascent={ascent} onBack={() => setScreen(summitBack)} />
        )}
      </ScrollView>

      <TabBar active={screen} onChange={setScreen} />

      {celebBadge && (
        <>
          <SnowBurst key={celebBadge.id} />
          <CelebrationToast
            title={celebBadge.title}
            iconPaths={celebBadge.iconPaths}
            campName={CAMP_DEFS[celebBadge.camp].name}
            onDismiss={() => setCelebrate(null)}
          />
        </>
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
