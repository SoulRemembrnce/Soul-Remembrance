import * as Calendar from "expo-calendar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";

const STORAGE_KEY = "sr_linked_calendar_id";

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

export function useCalendarSync() {
  const [permission, setPermission] = useState<"undetermined" | "granted" | "denied">("undetermined");
  const [calendars, setCalendars] = useState<CalendarInfo[]>([]);
  const [linkedCalendarId, setLinkedCalendarId] = useState<string | null>(null);
  const [linkedCalendar, setLinkedCalendar] = useState<CalendarInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Load stored calendar ID on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((id) => setLinkedCalendarId(id))
      .finally(() => setLoading(false));
  }, []);

  // Check current permission status
  useEffect(() => {
    if (Platform.OS === "web") {
      setPermission("denied");
      setLoading(false);
      return;
    }
    Calendar.getCalendarPermissionsAsync()
      .then((result) => {
        if (result.granted) setPermission("granted");
        else if (result.canAskAgain) setPermission("undetermined");
        else setPermission("denied");
      })
      .catch(() => setPermission("denied"));
  }, []);

  // Load calendars when permission is granted
  useEffect(() => {
    if (permission !== "granted") return;
    Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)
      .then((cals) => {
        const mapped: CalendarInfo[] = cals
          .filter((c) => c.allowsModifications || (c.type as string) !== "birthday")
          .map((c) => ({
            id: c.id,
            title: c.title,
            color: c.color ?? "#6B4FA8",
            source: c.source?.name ?? c.type ?? "Device",
          }));
        setCalendars(mapped);
      })
      .catch(() => {});
  }, [permission]);

  // Keep linkedCalendar in sync with linkedCalendarId + calendars list
  useEffect(() => {
    if (!linkedCalendarId || calendars.length === 0) {
      setLinkedCalendar(null);
      return;
    }
    const found = calendars.find((c) => c.id === linkedCalendarId) ?? null;
    setLinkedCalendar(found);
    // If the saved calendar no longer exists on device, clear it
    if (!found) {
      AsyncStorage.removeItem(STORAGE_KEY);
      setLinkedCalendarId(null);
    }
  }, [linkedCalendarId, calendars]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === "web") return false;
    try {
      const result = await Calendar.requestCalendarPermissionsAsync();
      if (result.granted) {
        setPermission("granted");
        return true;
      }
      setPermission("denied");
      return false;
    } catch {
      return false;
    }
  }, []);

  const linkCalendar = useCallback(async (calId: string) => {
    await AsyncStorage.setItem(STORAGE_KEY, calId);
    setLinkedCalendarId(calId);
  }, []);

  const unlinkCalendar = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setLinkedCalendarId(null);
    setLinkedCalendar(null);
  }, []);

  const getBusySlotsForDate = useCallback(
    async (dateISO: string): Promise<BusySlot[]> => {
      if (!linkedCalendarId || permission !== "granted" || Platform.OS === "web") return [];
      try {
        const [year, month, day] = dateISO.split("-").map(Number);
        const start = new Date(year, month - 1, day, 0, 0, 0);
        const end = new Date(year, month - 1, day, 23, 59, 59);
        const events = await Calendar.getEventsAsync([linkedCalendarId], start, end);
        return events.map((ev) => ({
          startHour: new Date(ev.startDate).getHours() + new Date(ev.startDate).getMinutes() / 60,
          endHour: new Date(ev.endDate).getHours() + new Date(ev.endDate).getMinutes() / 60,
          title: ev.title ?? "Busy",
        }));
      } catch {
        return [];
      }
    },
    [linkedCalendarId, permission]
  );

  const createCalendarEvent = useCallback(
    async (params: {
      title: string;
      dateISO: string;
      timeISO: string;
      durationMinutes: number;
      notes?: string;
    }): Promise<void> => {
      if (!linkedCalendarId || permission !== "granted" || Platform.OS === "web") return;
      try {
        const [year, month, day] = params.dateISO.split("-").map(Number);
        const [hour, minute] = params.timeISO.split(":").map(Number);
        const startDate = new Date(year, month - 1, day, hour, minute, 0);
        const endDate = new Date(startDate.getTime() + params.durationMinutes * 60 * 1000);
        await Calendar.createEventAsync(linkedCalendarId, {
          title: params.title,
          startDate,
          endDate,
          notes: params.notes,
        });
      } catch {
        // silently fail — calendar event creation is best-effort
      }
    },
    [linkedCalendarId, permission]
  );

  return {
    permission,
    calendars,
    linkedCalendar,
    linkedCalendarId,
    loading,
    requestPermission,
    linkCalendar,
    unlinkCalendar,
    getBusySlotsForDate,
    createCalendarEvent,
  };
}
