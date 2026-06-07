---
name: Admin missing Firestore rules
description: Several collections had no Firestore rules, silently blocking all writes with permissions errors
---

## Rule
When adding a new Firestore collection in code, always add a corresponding rule in `artifacts/mobile/firestore.rules` at the same time. Collections with no rule default to deny-all.

**Why:** `services`, `waitlist`, `verificationApplications`, `admins`, and `pushTokens` were used in app code but had no security rules. This caused silent write failures (e.g. "Could not save service") with no obvious cause.

**How to apply:**
- After adding `services` (allow read: true, write: authenticated)
- After adding `waitlist` (allow read/write: authenticated)
- After adding `verificationApplications` (allow read/create/update: authenticated)
- After adding `admins` (allow read/write: self only)
- After adding `pushTokens` (allow read/write: self only)
- Rules are deployed manually via Firebase Console → Firestore → Rules tab (no CLI — no FIREBASE_TOKEN).
- The local rules file at `artifacts/mobile/firestore.rules` is the source of truth to copy-paste from.
