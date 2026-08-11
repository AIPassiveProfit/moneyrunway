# Money Runway

**A Clear Plan for the Money You Work So Hard For.**

Money Runway is a mobile-first web app that answers one question:

> "How much can I safely spend today, after my bills, debt, savings, and taxes are covered?"

It is built for people who live paycheck to paycheck, freelance, run side hustles, or
just want to make it to payday without dread.

This is an educational budgeting and cash-flow organization tool. It is **not** financial,
investment, tax, legal, or credit advice.

---

## Where to start (read in this order)

| Doc | What it is | Why you care |
| --- | --- | --- |
| [docs/PRD.md](docs/PRD.md) | The product requirements document | What we are building and why |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Phases 0 → 5, restaurant-style | How we get a win today and grow from there |
| [docs/RESEARCH.md](docs/RESEARCH.md) | Everything we can reuse instead of build | Saves us weeks of work |
| [docs/CALCULATIONS.md](docs/CALCULATIONS.md) | The exact math behind Safe to Spend | The heart of the app |
| [docs/SCHEMA.md](docs/SCHEMA.md) | The Postgres database design | Where the data lives |
| [docs/TESTING.md](docs/TESTING.md) | Testing levels 0 → 5 | How we know it works |
| [docs/GLOSSARY.md](docs/GLOSSARY.md) | Plain-English tech dictionary | Learn the words as we go |

## The stack (short version)

| Job | Tool | Why |
| --- | --- | --- |
| The app (screens + server) | Next.js + TypeScript | One project, one deploy, huge amount of free starter code |
| Look and feel | Tailwind CSS + shadcn/ui | Free, copy-paste, mobile-first components |
| Database | Postgres on Railway | Your preference, and the right call |
| Talking to the database | Drizzle ORM | Type-safe, migrations are simple |
| Hosting | Railway | Your preference; app + database in one project |
| File storage | Cloudflare R2 | Your preference; not needed until Phase 4 |
| Login | None in Phase 0-1, then Better Auth | Do not make people sign up before they see value |
| Testing | Playwright + Pytest | See docs/TESTING.md |

## Status

Phase 0 not started. This repository currently contains planning documents only.
