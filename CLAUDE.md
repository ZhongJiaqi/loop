# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Dev server on http://0.0.0.0:3000 (Vite HMR)
npm run build        # Production build → dist/
npm run lint         # Type check (tsc --noEmit)
npm run test         # Unit tests (Vitest, single run)
npm run test:watch   # Unit tests (watch mode)
npm run test:e2e     # E2E tests (Playwright, auto-builds + serves on :4173)
npm run test:all     # Unit + E2E combined
```

## Architecture

Single-page React 19 PWA with Firebase backend, deployed on Vercel.

### Data Flow

- **Auth**: Firebase Auth (Google Sign-in) → `App.tsx` passes `user.uid` to `useStore()`
- **State**: `useStore.ts` is a custom hook that manages all data via Firestore `onSnapshot` real-time listeners — no Redux/Zustand
- **Three active Firestore collections** per user (under `users/{userId}/`):
  - `microHabits` — practice definitions (Affirmations + Habits), `category` field discriminates; `sortIndex` field drives Practice-page drag-to-reorder + Today render order
  - `tasks` — daily task instances (deterministic ID `{habitId}_{date}`), one task per active microHabit per day
  - `moods` — Mood entries (Hawkins-scale bucket + word list + createdAt). Independent hook `useMoodStore` + zero shared visual components with Affirmation/Habit — Mood is designed as a future spin-off product.
  - ~~`habitPool`~~ — DEPRECATED (5-25). Hall of Fame is view-computed by `HistoryView` from microHabits+tasks. Old docs in Firestore retained, `firestore.rules` keeps owner-only access. Frontend no longer reads or writes

**⚠️ firestore.rules deploy gotcha**: any change to `firestore.rules` requires `firebase deploy --only firestore` — vercel/git push does NOT touch Firestore rules. Has been forgotten twice (5-03 task.type refactor → `08b13ac` rescue; 6-08 Mood Phase 1 → `97147eb` rescue). Add to DoD checklist for any rules-touching feature.

### Critical: Task Creation Logic

Task creation for habits is centralized in a single `useEffect` in `useStore.ts` (the "daily reset effect"). This was a deliberate fix for a duplicate task bug:

1. `addMicroHabit()` only writes the habit doc — it does NOT create tasks
2. The daily reset effect is the **sole owner** of task creation
3. Deduplication uses two mechanisms:
   - `createdTaskIdsRef` (in-memory Set) prevents redundant Firestore writes
   - Deterministic task IDs (`{habitId}_{date}`) + `setDoc` ensures idempotency
4. The effect also cleans up duplicate tasks on each run

### UI Structure

`App.tsx` has **four tabs** (Today / Practice / Mood / History) with `AnimatePresence` transitions. Mobile-first layout capped at `max-w-md`. Components:

- `TodayView` — daily task list with completion toggles, per-section + whole-page confetti on all-complete (mutually exclusive)
- `PracticeView` — CRUD for Affirmations + Habits, drag-to-reorder via `@dnd-kit` (numeric ordinal `01`/`02` is the drag activator)
- `SortableHabitItem` — `useSortable` wrapper around each Practice row
- `MoodView` — Mood feed grouped by day, opens `MoodPickerSheet` (createPortal'd to body to escape parent motion.div `filter` containing block)
- `MoodPickerSheet` — list-style 9-bucket picker + word cloud chips (Hawkins energy-level scale, watercolor palette)
- `MoodEntryRow` — single mood entry wrapped in `SwipeActions` for edit/delete
- `HistoryView` — calendar heatmap, streak analytics, view-computed 21-Day Hall, DayDetailSheet bottom-sheet
- `SwipeActions` — mobile swipe-to-reveal for edit/delete (coexists with dnd-kit by yielding to vertical pointer movement)
- `NetworkStatusBanner` — amber-tone banner driven by `useNetworkStatus` (1.5s debounce on offline, 15s threshold on Firestore unreach)
- `NotificationPrompt` — push notification opt-in. Optimistic UI: click 开启 → `setVisible(false)` immediately, `requestPermissionAndSubscribe` runs in background fire-and-forget. Errors (except `permission=denied`) re-show prompt with 重试 + 重置 SW buttons.

### Design Tokens (hardcoded, no theme file)

- Background: `#F9F8F6`, Text: `#2C2C2C` / `#1A1A1A`, Muted: `#8C8C8C`
- Font: system sans-serif + serif for headings
- Selection highlight: `#E2DFD8`

### PWA

Configured via `vite-plugin-pwa` in `vite.config.ts`. Service worker auto-updates. Manifest, icons (192/512), and workbox runtime caching for Google Fonts.

### Firestore Security

`firestore.rules` enforces owner-only access with field validation. `userId` is immutable after creation.

### Testing

- Unit tests in `tests/*.test.ts(x)` — extracted pure-function logic with mocked Firestore (useStore dedup / reorderPlan / useNetworkStatus / etc.)
- E2E tests in `tests/e2e/*.spec.ts` — Playwright against preview build on :4173
- Vitest config is in `vite.config.ts` (excludes `tests/e2e/**`)
- 每次修改完代码都要测试（增量功能测试和回归测试），不要等用户问，给用户体验前都要全量测试，测试验收没问题才给用户体验

### Demo Mode

- `?demo=1` — skips Firebase Auth, uses `useDemoStore` (in-memory). Local dev without configuring Auth domains
- `?demo=1&allDone=1` — same as demo, but seeds all today's tasks as `completed: true`. Use to dogfood mount-with-all-done paths (confetti on first render, etc.)

### Firebase Config

`firebase-applet-config.json` contains project credentials (committed). `.env.local` has Vercel + API keys (gitignored). See `.env.example` for required vars.
