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

## Build Check

```bash
npm run lint
npm run build
```
