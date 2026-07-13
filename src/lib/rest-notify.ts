import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Local (not remote) notification for the rest timer: scheduled when a rest
// starts, cancelled on skip/extend/exit. Deliberately NO setNotificationHandler
// here — with no handler, expo-notifications does not present notifications
// while the app is foregrounded (Session Mode already shows the countdown band
// and haptic), but the OS presents them normally when the phone is locked or
// the app is backgrounded, which is exactly the gap this fills.

/** Ask once for permission (iOS prompt) and set up the Android channel. */
export async function ensureRestNotifications(): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('rest', {
        name: 'Rest timer',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    const cur = await Notifications.getPermissionsAsync();
    if (cur.status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }
  } catch {
    // No permission / module issue → timer still works in-app, just silently.
  }
}

/** Schedule the "rest over" notification; returns its id for cancellation. */
export async function scheduleRestDone(secondsFromNow: number): Promise<string | null> {
  if (secondsFromNow < 1) return null;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'REST COMPLETE',
        body: 'Back on the bar — next set.',
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.round(secondsFromNow),
        channelId: Platform.OS === 'android' ? 'rest' : undefined,
      },
    });
  } catch {
    return null;
  }
}

export async function cancelRestDone(id: string | null): Promise<void> {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Already fired or never scheduled — nothing to do.
  }
}
