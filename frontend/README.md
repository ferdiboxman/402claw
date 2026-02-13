This is the 402claw Next.js frontend.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Live Explore Analytics

`/explore` now reads live marketplace analytics from the dispatcher via:

- Route handler: `src/app/api/explore/analytics/route.ts`
- UI page: `src/app/explore/page.tsx`

The route proxies to the dispatcher endpoint:

- `GET /__platform/analytics?window=today|week|overall`

Default upstream:

- `https://clawr-dispatcher.ferdiboxman.workers.dev`

You can override upstream with:

```bash
CLAWR_ANALYTICS_BASE_URL=https://your-dispatcher.workers.dev
```

## Dashboard Live Data + Deploy Wizard (Phase 4.2/4.3)

`/dashboard` now:

- Polls live analytics (`today`, `week`, `overall`) via `/api/explore/analytics`
- Replaces mock cards/tables with real dispatcher-backed metrics
- Adds category + search filters for top APIs
- Includes a "Deploy API Wizard" that generates valid local CLI commands for:
  - `deploy` (dataset/function)
  - `wrap` (proxy)

The generated commands target:

- `/Users/Shared/Projects/402claw/prototypes/cli`

## Build Check

```bash
npm run lint
npm run build
```

Build output uses `.next-codex/` to avoid `.next/` permission collisions in shared multi-agent environments.

## Auth Flow (Phase 4.1)

Wallet auth endpoints:

- `POST /api/auth/challenge`
- `POST /api/auth/verify`
- `GET /api/auth/session`
- `POST /api/auth/logout`

Protected routes:

- `/dashboard`
- `/settings`

Sign-in UI:

- `/signin`

Environment:

```bash
# Recommended for production
CLAWR_SESSION_SECRET=replace_with_strong_random_secret
```
