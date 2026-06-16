# Loop

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

> *Thoughts create feelings. Feelings drive actions. Actions shape you.*

肯定语和习惯的每日实践。思想创造感觉，感觉驱动行动，行动塑造你。

A daily-practice PWA built on a **BE → THINK → DO** model: who you are (affirmations), how you think (mindsets), what you do (habits). Behavior-science loop *thoughts → feelings → actions → identity → thoughts*.

## Features

- **Today** - One ritual flow per day in three sections:
  - **Affirmations** (gold ✨, *I am…*) — identity-level statements (情感锚定)
  - **Mindsets** (misty blue ripple, *I choose / I believe…*) — mental models that guide action (认知工具)
  - **Habits** (sage green, line-through on complete) — concrete daily actions
- **Practice** - Manage all three: each section has its own CRUD + drag-to-reorder
- **Mood** - A "stop and notice" space alongside the do-loop. Pick from 9 emotional buckets (David Hawkins energy-level scale) and 450+ feeling words to name what's here. Reverse aesthetic to Practice — italic serif tagline `See your feelings.`, list-style buckets in a muted watercolor palette
- **History** - Calendar heatmap, streak counter, weekly chart, with All / Habits / Mindsets / Affirmations filter
- **21-Day Hall of Fame** - Habits reaching 21 completed days enter the Hall. Affirmations and Mindsets are mental-anchoring rituals, not behavior-formation goals — they don't enter the Hall by design
- **PWA** - Installable on mobile, works offline-first
- **Swipe Actions** - Left-swipe to edit/delete on mobile

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS 4, Motion (animations)
- **Backend**: Firebase Authentication (Google Sign-in) + Firestore (real-time database)
- **Hosting**: Vercel
- **PWA**: vite-plugin-pwa (service worker + manifest)
- **Testing**: Vitest (unit) + Playwright (e2e)

## Getting Started

**Prerequisites:** Node.js 18+

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Run tests
npm run test:all

# Build for production
npm run build
```

## Deployment

Deployed on Vercel at https://loop-365.vercel.app

```bash
# Deploy to production
vercel --prod
```

After deployment, add the Vercel domain to Firebase Console > Authentication > Authorized domains.

## Project Structure

```
src/
├── App.tsx                # Main app: auth + 4-tab navigation
├── useStore.ts            # Practices state (Affirmation/Mindset/Habit): Firestore CRUD + daily task creation
├── useMoodStore.ts        # Mood state: independent hook, separate Firestore collection
├── useDemoStore.ts        # In-memory store for ?demo=1 mode
├── firebase.ts            # Firebase initialization
├── types.ts               # TypeScript interfaces (incl. MoodEntry / MoodBucket)
├── lib/
│   ├── moods.ts           # 9-bucket canonical data (Hawkins scale) + 450+ word dictionary
│   ├── moodFormat.ts      # Date grouping + relative day labels
│   └── ...
├── components/
│   ├── TodayView.tsx      # Daily task completion + per-section confetti (3 sections)
│   ├── PracticeView.tsx   # Affirmation/Mindset/Habit CRUD + drag-to-reorder
│   ├── MoodView.tsx       # Mood feed grouped by day, lazy-loaded
│   ├── MoodPickerSheet.tsx # Bucket list + word cloud, rendered via createPortal
│   ├── MoodEntryRow.tsx   # Single mood entry + SwipeActions wrap
│   ├── HistoryView.tsx    # Calendar heatmap, streaks, hall of fame
│   └── SwipeActions.tsx   # Shared swipe-to-reveal gesture component
tests/
├── moods.test.ts          # MOOD_BUCKETS shape + bucketById + date format unit tests
├── useMoodStore.test.ts   # Mood payload helper unit tests
├── useStore.test.ts       # Task creation logic
└── e2e/
    ├── habits.spec.ts     # UI / PWA / responsive
    ├── demo-flow.spec.ts  # Login surrogate + interaction flows
    └── mood.spec.ts       # Mood tab end-to-end + portal regression
```

## Install as App

**iPhone**: Safari > Share > Add to Home Screen

**Android**: Chrome > Menu > Install App

## License

[MIT](./LICENSE) © 2026 Jiaqi Zhong
