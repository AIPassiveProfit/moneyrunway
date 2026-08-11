# Working on Money Runway

Notes for whoever (or whatever) picks this up next.

## The one thing that matters

`src/lib/calc/` is the product. Everything else is packaging.

It is a **pure module**: plain object in, plain object out. It must never import
from the database layer, never call `new Date()` internally (the clock is an
input), never throw on ordinary input, and never return `NaN` or `Infinity`.

Change the math only alongside `src/lib/calc/safeToSpend.test.ts`, and update
`docs/CALCULATIONS.md` in the same commit. The doc and the code are supposed to
agree; if they drift, the doc is the intent and the code is the bug.

## Non-negotiable rules

1. **Money is integer cents.** `$14.50` is `1450`. No floats on a money path
   ever. `parseFloat` on a dollar amount is a bug.
2. **Dates are `"YYYY-MM-DD"` strings** in the user's own timezone, handled by
   `src/lib/calc/dates.ts`. Never a UTC timestamp for a calendar date.
3. **Round the hero number down**, round reserves up. Guessing high costs a real
   person a real overdraft fee.
4. **No shame in the copy.** Red states name the next move, never the mistake.
   Banned: "you overspent", "you failed", "bad habit". See docs/PRD.md §3.
5. **Every calculated number stays explainable.** If you add a subtraction, push
   a matching `BreakdownLine` so "How is this calculated?" stays complete and
   the lines keep summing to the total.
6. **Do not build ahead of the roadmap.** docs/ROADMAP.md phases are a contract.

## Commands

```bash
npm run dev          # local dev server
npm run build        # production build
npm test             # Vitest — the calc engine (fast, run constantly)
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run test:e2e     # Playwright, levels 1 and 2 (builds + starts the app itself)
npm run test:smoke   # Playwright, level 1 only
```

Pytest smoke tests run against a **deployed** URL:

```bash
pip install -r requirements-dev.txt && playwright install chromium
BASE_URL=https://your-app.up.railway.app pytest tests/smoke -v
```

If a CI image ships its own Chromium, point at it with
`PLAYWRIGHT_CHROMIUM_PATH=/path/to/chrome` rather than downloading a second copy.
Both test runners honour it.

**Restart `next start` after every `next build`.** A running server keeps the old
build manifest in memory and will 500 on chunks the new build renamed.

## Where things live

```
src/lib/calc/       the engine — pure, tested, the actual product
  types.ts          shapes, all money in cents
  dates.ts          calendar-date math, timezone-safe
  money.ts          cents helpers and formatting
  safeToSpend.ts    the algorithm, numbered to match docs/CALCULATIONS.md
  nextAction.ts     the Next Best Action rules
src/lib/demo.ts     the sample household (Jasmine from the ICP)
src/components/     dashboard cards and sheets
src/app/page.tsx    the dashboard — Phase 0 holds state in React, not a database
tests/e2e/          Playwright (TypeScript)
tests/smoke/        Pytest, against a deployed URL
docs/               PRD, roadmap, calculations, schema, testing, glossary
```

## Audience note

The owner is not a software developer and is learning as we go. Explain changes
in plain language, say what you are doing and why, and give exact steps when you
need something from them. The running analogy is growing a restaurant: food
stand → one employee → full front and back of house.
