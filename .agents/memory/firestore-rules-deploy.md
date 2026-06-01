---
name: Firestore rules deployment
description: The correct rules live in firestore.rules at the project root but require manual deploy — Firebase CLI needs interactive login not available in Replit shell.
---

`firestore.rules` at repo root contains the correct production rules (public reads on
`practitioners`, `practitionerProfiles`, `events`, `reviews`, `availability`, `services`,
`posts`; authenticated reads/writes for `bookings`, `favorites`, `conversations`, `pushTokens`).

`firebase.json` points to `firestore.rules` and `storage.rules`.

**To deploy:** The user must run one of:
1. `firebase login && firebase deploy --only firestore:rules --project soul-remembrance`
   on their local machine (with Firebase CLI installed)
2. Or paste the contents of `firestore.rules` into:
   Firebase Console → Firestore Database → Rules tab → Publish

**Why CLI fails in Replit:** `firebase login` requires interactive OAuth in a browser.
`firebase login --no-localhost` is possible but requires the user to copy a URL.
No FIREBASE_TOKEN or service account credential is available as an env var.

**Impact of not deploying:** Practitioners won't appear in Explore/Home (reads on
`practitionerProfiles` are denied for anonymous users under default Firebase rules).
The app degrades gracefully — shows empty lists, no crashes — thanks to error handlers
on all `onSnapshot` subscriptions.
