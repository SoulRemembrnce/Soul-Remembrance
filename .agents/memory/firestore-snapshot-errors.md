---
name: Firestore onSnapshot error handlers
description: Every onSnapshot subscription must have an explicit error handler or Firestore permission-denied triggers an uncaught exception that crashes the app.
---

Every `onSnapshot` call in `firestore.ts` must include a third error-handler argument.
Without it, a `permission-denied` from Firestore bubbles up as an "Uncaught Error in snapshot listener" — which Replit's crash detector flags as a runtime crash.

**Pattern to always use:**
```ts
return onSnapshot(q, (snap) => {
  cb(snap.docs.map(...));
}, () => { cb([]); });   // ← error handler returns empty, never throws
```

For single-doc subscriptions (`subscribePractitionerProfile`):
```ts
return onSnapshot(ref, (snap) => { cb(...); }, () => { cb(null); });
```

**Why:** Firebase security rules may be undeployed or deny anonymous reads.
The app must degrade gracefully (empty list) rather than crash.

**How to apply:** Any new `onSnapshot` subscription added to `firestore.ts` must include the error handler. Apply the same pattern in admin panel Firestore calls.
