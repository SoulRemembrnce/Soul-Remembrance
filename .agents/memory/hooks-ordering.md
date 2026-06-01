---
name: React hooks ordering — hooks must precede early returns
description: All hook calls (useState, useEffect, useMemo, useCallback, useRef) must appear before any conditional early returns in a component.
---

In `practitioner/[id].tsx` two `useMemo` hooks were placed after `if (loadingProfile) return ...`
and `if (!practitioner) return ...`. This violates React's Rules of Hooks and causes:
  - On web/dev: "React has detected a change in the order of Hooks" error
  - On native: app crash red-screen

**Why it was hidden:** When mock practitioners were present, `loadingProfile` started `false`
so the early return never fired, and hooks were always reached. Removing mock data made
`loadingProfile` start `true`, the spinner return fired on render 1, hooks were skipped —
React saw a different hook count on render 2 and crashed.

**Rule:** Place ALL hooks unconditionally at the top of the component function, before any
`if (...) return`. Guard internally with null checks, e.g.:
```ts
const availDates = useMemo(() => {
  if (!practitioner) return [];
  // ...
}, [practitioner, availSlots]);
```
