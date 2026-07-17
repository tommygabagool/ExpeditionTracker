import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { TRAILS } from '@/data/trails';
import { clampedWeekOf, isTaperWeek, keyOf, nextSaturday, targetGain } from '@/program/schedule';
import { ruckRx } from '@/program/trip';
import { getTrailheadWeather, weatherLine } from '@/lib/weather';

// The smart Saturday-ruck notification: fires Saturday 06:30 with the day's
// prescription (pack weight, duration, gain target), the suggested trail, and
// the trailhead forecast. Local notifications are static once scheduled, so
// every app open re-fetches the forecast and re-schedules — the alert always
// carries the freshest forecast from the last time the app ran. Offline opens
// fall back to the cached forecast (see weather.ts) or plain prescription.

const STORE_KEY = 'ruck-notif'; // { id: string } — last scheduled notification

const FIRE_HOUR = 6;
const FIRE_MINUTE = 30;

export async function syncSaturdayRuckNotification(): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('ruck', {
        name: 'Saturday ruck',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    const perm = await Notifications.getPermissionsAsync();
    if (perm.status !== 'granted') return; // rest-notify owns the one-time ask

    const sat = nextSaturday();
    const fireAt = new Date(sat);
    fireAt.setHours(FIRE_HOUR, FIRE_MINUTE, 0, 0);
    if (fireAt.getTime() <= Date.now()) return; // Saturday morning already past

    const satKey = keyOf(sat);
    const satWeek = clampedWeekOf(sat);
    const rx = ruckRx(satWeek);
    const trail = TRAILS.reduce((best, t) =>
      Math.abs(t.gain - targetGain(satWeek)) < Math.abs(best.gain - targetGain(satWeek)) ? t : best,
    );

    const wx = await getTrailheadWeather(trail, satKey);
    const rxLine = `${rx.packLb} LB · ${rx.hours.toUpperCase()} · ${rx.gainFt.toLocaleString('en-US')} FT GAIN`;
    const body = wx
      ? `${rxLine}\n${trail.name} — ${weatherLine(wx.weather)}${wx.stale ? ' (CACHED)' : ''}`
      : `${rxLine}\n${trail.name} — no forecast cached, check conditions.`;

    // Replace last week's (or an earlier-fetched) notification.
    try {
      const raw = await AsyncStorage.getItem(STORE_KEY);
      const prev = raw ? (JSON.parse(raw) as { id?: string }) : null;
      if (prev?.id) await Notifications.cancelScheduledNotificationAsync(prev.id);
    } catch {
      // Nothing to cancel.
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `SATURDAY RUCK · WEEK ${satWeek}${isTaperWeek(satWeek) ? ' · TAPER' : ''}`,
        body,
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
        channelId: Platform.OS === 'android' ? 'ruck' : undefined,
      },
    });
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify({ id }));
  } catch {
    // Notifications unavailable (permissions, Expo Go, etc.) — never block launch.
  }
}
