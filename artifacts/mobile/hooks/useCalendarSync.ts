// Web stub — expo-calendar is not supported on web.
// Metro will use useCalendarSync.native.ts on iOS/Android.
// TypeScript resolves this file for type-checking, so the return type must
// match the native implementation exactly.

export interface CalendarInfo {
  id: string;
  title: string;
  color: string;
  source: string;
}

export interface BusySlot {
  startHour: number;
  endHour: number;
  title: string;
}

export interface CalendarSyncResult {
  permission: "undetermined" | "granted" | "denied";
  calendars: CalendarInfo[];
  linkedCalendar: CalendarInfo | null;
  linkedCalendarId: string | null;
  loading: boolean;
  requestPermission: () => Promise<boolean>;
  linkCalendar: (id: string) => Promise<void>;
  unlinkCalendar: () => Promise<void>;
  getBusySlotsForDate: (dateISO: string) => Promise<BusySlot[]>;
  createCalendarEvent: (params: {
    title: string;
    dateISO: string;
    timeISO: string;
    durationMinutes: number;
    notes?: string;
  }) => Promise<void>;
}

export function useCalendarSync(): CalendarSyncResult {
  return {
    permission: "denied",
    calendars: [],
    linkedCalendar: null,
    linkedCalendarId: null,
    loading: false,
    requestPermission: async () => false,
    linkCalendar: async (_id: string) => {},
    unlinkCalendar: async () => {},
    getBusySlotsForDate: async (_dateISO: string) => [],
    createCalendarEvent: async (_params) => {},
  };
}
