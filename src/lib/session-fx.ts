// Haptics + keep-awake are native modules added AFTER the current dev client
// was built, so requiring them throws until the next EAS build. Guarded
// requires keep today's client working (calls silently no-op) and the real
// effects light up once the client is rebuilt with these modules included.

type HapticsModule = typeof import('expo-haptics');
type KeepAwakeModule = typeof import('expo-keep-awake');

let Haptics: HapticsModule | null = null;
let KeepAwake: KeepAwakeModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- guarded native require, see above
  Haptics = require('expo-haptics') as HapticsModule;
} catch {
  Haptics = null;
}
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- guarded native require, see above
  KeepAwake = require('expo-keep-awake') as KeepAwakeModule;
} catch {
  KeepAwake = null;
}

/** Light tick — checking a set, toggling a control. */
export function tapFx(): void {
  Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Success buzz — rest timer done, session summited. */
export function successFx(): void {
  Haptics?.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

const TAG = 'session-mode';

/** Keep the screen on for the life of a training session. */
export function keepAwakeOn(): void {
  KeepAwake?.activateKeepAwakeAsync(TAG).catch(() => {});
}

export function keepAwakeOff(): void {
  KeepAwake?.deactivateKeepAwake(TAG)?.catch?.(() => {});
}
