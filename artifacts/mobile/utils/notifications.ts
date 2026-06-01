// Web / type-check stub — Metro uses notifications.native.ts on device.

export interface ReminderResult {
  dayBefore: boolean;
  hourBefore: boolean;
}

export async function requestNotificationPermission(): Promise<boolean> {
  return false;
}

export async function registerPushToken(): Promise<string | null> {
  return null;
}

export async function sendExpoPush(
  _token: string,
  _title: string,
  _body: string,
  _data?: Record<string, unknown>
): Promise<void> {}

export function addNotificationTapListener(
  _handler: (data: Record<string, unknown>) => void
): () => void {
  return () => {};
}

export async function scheduleBookingReminders(
  _bookingId: string,
  _practitionerName: string,
  _dateStr: string,
  _timeStr: string
): Promise<ReminderResult> {
  return { dayBefore: false, hourBefore: false };
}

export async function cancelBookingReminders(_bookingId: string): Promise<void> {}
