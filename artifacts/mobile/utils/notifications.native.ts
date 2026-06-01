import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// setNotificationHandler must be called at module level, but crashes on Android Expo Go.
// Wrap in try/catch so the rest of the app still loads.
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    } as Notifications.NotificationBehavior),
  });
} catch {
  // Android Expo Go: push notifications removed in SDK 53 — safe to ignore
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const existing = await Notifications.getPermissionsAsync();
    const isGranted = (p: unknown) => (p as any)?.granted === true || (p as any)?.status === "granted";
    if (isGranted(existing)) return true;
    const result = await Notifications.requestPermissionsAsync();
    return isGranted(result);
  } catch {
    return false;
  }
}

// ── Push token registration ───────────────────────────────────────────────────

export async function registerPushToken(): Promise<string | null> {
  try {
    if (!Device.isDevice) return null;
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Soul Remembrance",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#6B4FA8",
      });
    }
    const granted = await requestNotificationPermission();
    if (!granted) return null;
    const { data } = await Notifications.getExpoPushTokenAsync();
    return data ?? null;
  } catch {
    return null;
  }
}

// ── Send push via Expo Push API (no server needed) ────────────────────────────

export async function sendExpoPush(
  expoPushToken: string,
  title: string,
  body: string,
  data: Record<string, unknown> = {}
): Promise<void> {
  if (!expoPushToken.startsWith("ExponentPushToken")) return;
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "accept-encoding": "gzip, deflate",
      },
      body: JSON.stringify({ to: expoPushToken, title, body, data, sound: "default" }),
    });
  } catch {
    // Best-effort — never block the UI
  }
}

// ── Notification tap listener (deep-link routing) ─────────────────────────────

export function addNotificationTapListener(
  handler: (data: Record<string, unknown>) => void
): () => void {
  try {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data ?? {};
      handler(data as Record<string, unknown>);
    });
    return () => sub.remove();
  } catch {
    return () => {};
  }
}

// ── Local booking reminders ───────────────────────────────────────────────────

function parseSessionDate(dateStr: string, timeStr: string): Date | null {
  const now = new Date();
  let base: Date;

  if (dateStr === "Today") {
    base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (dateStr === "Tomorrow") {
    base = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  } else {
    const monthMap: Record<string, number> = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    };
    const parts = dateStr.split(" ");
    const numIdx = parts.findIndex((p) => /^\d+$/.test(p));
    if (numIdx === -1) return null;
    const day = parseInt(parts[numIdx]);
    const monthStr = parts[numIdx + 1];
    const month = monthMap[monthStr];
    if (isNaN(day) || month === undefined) return null;
    base = new Date(now.getFullYear(), month, day);
    if (base < now) base.setFullYear(now.getFullYear() + 1);
  }

  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return null;
  let h = parseInt(match[1]);
  const m = parseInt(match[2]);
  const period = match[3].toUpperCase();
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  base.setHours(h, m, 0, 0);
  return base;
}

export interface ReminderResult {
  dayBefore: boolean;
  hourBefore: boolean;
}

export async function scheduleBookingReminders(
  bookingId: string,
  practitionerName: string,
  dateStr: string,
  timeStr: string
): Promise<ReminderResult> {
  const result: ReminderResult = { dayBefore: false, hourBefore: false };
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return result;

    const sessionDate = parseSessionDate(dateStr, timeStr);
    if (!sessionDate) return result;

    const now = Date.now();

    const dayBeforeDate = new Date(sessionDate);
    dayBeforeDate.setDate(dayBeforeDate.getDate() - 1);
    dayBeforeDate.setHours(9, 0, 0, 0);
    const dayBeforeSecs = Math.floor((dayBeforeDate.getTime() - now) / 1000);
    if (dayBeforeSecs > 0) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${bookingId}-day`,
        content: {
          title: "Session tomorrow 🔔",
          body: `Your healing session with ${practitionerName} is tomorrow at ${timeStr}. Time to prepare your space.`,
          sound: true,
          data: { bookingId, type: "day-before", screen: "sessions" },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: dayBeforeSecs },
      });
      result.dayBefore = true;
    }

    const hourBeforeSecs = Math.floor((sessionDate.getTime() - 60 * 60 * 1000 - now) / 1000);
    if (hourBeforeSecs > 0) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${bookingId}-hour`,
        content: {
          title: "Your session starts soon ✨",
          body: `Your session with ${practitionerName} begins in 1 hour. Find a quiet space and get settled.`,
          sound: true,
          data: { bookingId, type: "hour-before", screen: "sessions" },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: hourBeforeSecs },
      });
      result.hourBefore = true;
    }
  } catch {
    // Best-effort
  }
  return result;
}

export async function cancelBookingReminders(bookingId: string): Promise<void> {
  try {
    await Promise.all([
      Notifications.cancelScheduledNotificationAsync(`${bookingId}-day`),
      Notifications.cancelScheduledNotificationAsync(`${bookingId}-hour`),
    ]);
  } catch {}
}
