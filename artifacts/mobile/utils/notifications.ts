export interface ReminderResult {
  dayBefore: boolean;
  hourBefore: boolean;
}

export async function requestNotificationPermission(): Promise<boolean> {
  return false;
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
