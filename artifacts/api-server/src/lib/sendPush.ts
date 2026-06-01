import { getAdminDb } from "./firebase-admin";

interface ExpoPushPayload {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound: "default";
}

async function getTokenForUser(userId: string): Promise<string | null> {
  const db = getAdminDb();
  const snap = await db.doc(`pushTokens/${userId}`).get();
  if (!snap.exists) return null;
  return (snap.data() as { token?: string })?.token ?? null;
}

async function dispatchExpoPush(
  token: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  const payload: ExpoPushPayload = { to: token, title, body, sound: "default", ...(data ? { data } : {}) };
  const resp = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Expo push API ${resp.status}: ${text}`);
  }
}

/**
 * Look up a user's Expo push token by their Firebase UID and deliver a push.
 * Returns `true` if the push was sent, `false` if no token is registered.
 * Throws on Expo API errors so callers can log them.
 */
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<boolean> {
  const token = await getTokenForUser(userId);
  if (!token) return false;
  await dispatchExpoPush(token, title, body, data);
  return true;
}
