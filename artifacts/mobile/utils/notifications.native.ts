import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  } as Notifications.NotificationBehavior),
});

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const existing = await Notifications.getPermissionsAsync();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isGranted = (p: unknown) => (p as any)?.granted === true || (p as any)?.status === "granted";
    if (isGranted(existing)) return true;
    const result = await Notifications.requestPermissionsAsync();
    return isGranted(result);
  } catch {
    return false;
  }
}

function parseSessionDate(dateStr: string, timeStr: string): Date | null {
  const now = new Date();
  let base: Date;

  if (dateStr === "Today") {
    base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (dateStr === "Tomorrow") {
    base = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  } else {
    // "Thu 5 Jun" format
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

  // Parse "9:00 AM" / "3:00 PM"
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

    // Day-before: 9 AM the day before the session
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
          data: { bookingId, type: "day-before" },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: dayBeforeSecs },
      });
      result.dayBefore = true;
    }

    // 1-hour-before
    const hourBeforeSecs = Math.floor(
      (sessionDate.getTime() - 60 * 60 * 1000 - now) / 1000
    );
    if (hourBeforeSecs > 0) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${bookingId}-hour`,
        content: {
          title: "Your session starts soon ✨",
          body: `Your session with ${practitionerName} begins in 1 hour. Find a quiet space and get settled.`,
          sound: true,
          data: { bookingId, type: "hour-before" },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: hourBeforeSecs },
      });
      result.hourBefore = true;
    }
  } catch {
    // Notifications are best-effort — never block booking flow
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
