# Dashboard Hydration & setState-in-effect Fix

## Problem
`new Date()` and `document.cookie` reads are client-only. Putting them in `useState` + `useEffect` causes:
1. Hydration mismatch (server renders empty, client renders real value)
2. "Calling setState synchronously within an effect" linter error

## Solution: `useMemo(() => ..., [])`
Computes once on the client after mount. No state, no cascading renders, no hydration mismatch.

```ts
const today = useMemo(() => new Date().toLocaleDateString("en-US", {
  weekday: "long", year: "numeric", month: "long", day: "numeric",
}), []);

const businessType = useMemo(() => resolveBusinessType(), []);
```

- Server renders initial render (empty/default), client fills in after hydration
- `useMemo` with `[]` is stable — safe to use in `useEffect` closure without adding to deps
- Do NOT use `useState` + `setX` inside `useEffect` for synchronous reads (date, cookies, localStorage)

## File
`app/portal/dashboard/page.tsx`
