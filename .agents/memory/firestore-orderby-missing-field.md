---
name: Firestore orderBy silent exclusion
description: orderBy on a field silently drops documents missing that field — caused admin Practitioners tab to always appear empty
---

## Rule
Never use `orderBy(field)` in a Firestore query unless you can guarantee every document in the collection has that field. Firestore silently excludes documents where the ordered field is absent — no error, just missing results.

**Why:** `savePractitionerProfile` wrote profiles without `createdAt`. Admin's `subscribePractitioners` used `orderBy("createdAt", "desc")`, so every profile was excluded. The tab appeared empty with no error.

**How to apply:**
- When adding `orderBy` to a collection query, also ensure the write path stamps that field on every document.
- In `savePractitionerProfile`, `createdAt` is now stamped via `profile.createdAt ?? serverTimestamp()`.
- Admin `subscribePractitioners` now reads the full collection with no `orderBy` and sorts client-side if needed.
- If you must use `orderBy`, add a composite index AND ensure all documents have the field (backfill if necessary).
