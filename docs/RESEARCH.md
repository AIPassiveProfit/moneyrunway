# Research: What We Can Reuse Instead of Build

**Date:** 2026-08-11

The rule for this project: **do not write code that someone already wrote and gave away.**
Every hour we save on plumbing is an hour spent on the Safe to Spend experience, which is the
only part of this app that is actually ours.

Restaurant version: we are not milling our own flour or forging our own pans. We buy the good
pans, and we spend our time on the recipe nobody else has.

---

## 1. The verdict up front

| We need | We reuse | We build |
| --- | --- | --- |
| App skeleton, routing, deploy | Next.js SaaS starter | — |
| Buttons, cards, sheets, charts | shadcn/ui + Recharts | Brand restyle only |
| Repeating bills ("every 2nd Friday") | `rrule` | The UI on top |
| Money math without rounding bugs | integer cents helper (or `dinero.js`) | — |
| Loan interest math | `@cfpb/amortize` pattern (~40 lines, MIT) | Snowball/avalanche ordering (~60 lines) |
| Login | Better Auth (Phase 2) | — |
| Database access | Drizzle ORM | Our schema |
| File uploads | `@aws-sdk/client-s3` against R2 (Phase 4) | — |
| Deploy | Railway CLI + Postgres plugin | — |
| **Safe to Spend + Runway engine** | **nothing exists** | **This is our product** |

That last row is the important one. I looked hard: there is no open-source library that does
forward-looking, obligation-aware "safe to spend today." Every open-source finance app is
backward-looking (where did my money go). That is our moat, and it is only ~300 lines of
TypeScript. Good news: it is small enough to build today and valuable enough that nobody has done it.

---

## 2. Your four required frameworks — what each one is for

You asked to use all four. They do genuinely different jobs, so here is how they fit together
rather than fight each other.

### 2.1 [obra/superpowers](https://github.com/obra/superpowers) — the kitchen discipline
A methodology plugin for Claude Code: brainstorming → git worktrees → plan writing (tasks broken
into 2–5 minute chunks) → implementation → test-driven development → code review → branch completion.

**How we use it:** as the default working rhythm for every phase. Its "write the plan before the
code, and break it into tiny verified steps" habit is exactly what keeps a non-developer in control
— you can read a plan and say "no, not that" before any code exists.

Install: `/plugin install superpowers@claude-plugins-official`

### 2.2 [gsd-build/get-shit-done](https://github.com/gsd-build/get-shit-done) — the spec-to-code pipeline
Lightweight meta-prompting and spec-driven development. **Note:** this repo is archived; active
development moved to [open-gsd/gsd-core](https://github.com/open-gsd/gsd-core). We should point
at the new home.

**How we use it:** to turn the PRD sections into implementation specs at the start of each phase.
It is the bridge between "here is what we want" and "here is what to type."

### 2.3 [dsifry/metaswarm](https://github.com/dsifry/metaswarm) — the full brigade
Multi-agent orchestration: 18 agent personas, a 9-phase workflow (research → plan → design review →
work decomposition → orchestrated execution → final review → PR creation → PR shepherd → closure),
5 parallel specialist reviewers, and a knowledge base that learns from past reviews.

**How we use it:** *not yet.* This is the full front-of-house/back-of-house brigade. Running 18
agents on a food stand is how a quick win turns into a three-day project. **Introduce at Phase 3**,
when there is enough surface area that parallel review gates pay for themselves.

Install: plugin marketplace, then `/setup`.

### 2.4 [aiagentskit/claude-agents-library](https://github.com/aiagentskit/claude-agents-library) — the specialist rolodex
34 agent configuration files across 7 categories (Engineering, Product, Marketing, Design, PM,
Studio Ops, Testing), MIT licensed. You copy the folders into `.claude/agents/`.

**How we use it:** pick 5, ignore 29. The ones that map to this project:
`rapid-prototyper` (Phase 0), `frontend-developer` and `backend-architect` (Phases 1–2),
`ui-designer` (brand polish), `api-tester` (Phase 2+), `legal-compliance-checker` (the financial
disclaimers). Copying all 34 just adds noise.

**Sequencing recommendation:** Phase 0 uses Superpowers only. Add GSD at Phase 1, the agents
library at Phase 2, metaswarm at Phase 3. Complexity should arrive when we can afford it.

---

## 3. Existing finance apps — studied, mostly not reused

### [Actual Budget](https://github.com/actualbudget/actual) — MIT
Envelope/zero-based budgeting, self-hostable, split into `loot-core` (platform-agnostic logic),
`desktop-client`, `desktop-electron`. MIT means we *may* legally reuse code.

**Verdict: do not fork. Do study.** It is backward-looking envelope budgeting with double-entry
rigor — a different product built for a different user. Forking it means inheriting a large
codebase to fight. What is worth stealing: their **rules engine** shape, their **schedules**
(recurring transactions) model, and the discipline of keeping core logic in a platform-free package
— we copy that idea in `src/lib/calc/`.

### [Firefly III](https://github.com/firefly-iii/firefly-iii) — AGPL-3.0, PHP/Laravel
Full double-entry personal finance manager with a genuinely good REST API and bill/recurring
transaction support.

**Verdict: do not use.** Wrong language for our stack, and AGPL is a licensing complication for a
product you may want to sell. Worth reading their **bill "expected between X and Y dollars"** model —
it handles variable bills (electric) better than a fixed amount does. Consider adopting the idea
in Phase 3.

### Maybe Finance — archived
The company shut down and open-sourced the app. Nice UI references, dead project. Screenshots only.

**Bottom line:** we borrow *ideas* from these three and *code* from none of them.

---

## 4. Libraries we will actually install

| Package | What it does for us | License | Where used |
| --- | --- | --- | --- |
| [`rrule`](https://github.com/jkbrzt/rrule) | Turns "every 2nd Friday" into actual dates. iCalendar RFC-5545 standard, 543+ dependent projects | BSD-3 | Bill + income recurrence, Phase 2 |
| [`date-fns`](https://date-fns.org) | Date math that does not lose a day to timezones | MIT | Everywhere |
| [`@date-fns/tz`](https://github.com/date-fns/tz) | User-timezone-correct "today" | MIT | Calc engine clock |
| [`dinero.js` v2](https://github.com/dinerojs/dinero.js) *(optional)* | Money as integers + formatting. **We may skip it** — a 30-line cents helper covers our needs and is easier for you to read | MIT | Money formatting |
| [`drizzle-orm`](https://orm.drizzle.team) + `drizzle-kit` | Database access + migrations | Apache-2.0 | Server |
| [`zod`](https://zod.dev) | Validates every form input before it touches the database | MIT | All forms, security gate |
| [`recharts`](https://recharts.org) | The runway timeline + progress charts (shadcn charts are built on it) | MIT | Dashboard |
| [`better-auth`](https://better-auth.com) | Email magic-link login, sessions in our own Postgres | MIT | Phase 2 |
| [`@aws-sdk/client-s3`](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js/) + `@aws-sdk/s3-request-presigner` | Cloudflare R2 uploads/downloads via presigned URLs | Apache-2.0 | Phase 4 |
| [`@playwright/test`](https://playwright.dev) | Browser tests | Apache-2.0 | Tests |
| [`vitest`](https://vitest.dev) | Unit tests for the calc engine | MIT | Tests |
| [`pytest`](https://docs.pytest.org) + [`pytest-playwright`](https://github.com/microsoft/playwright-pytest) | Black-box smoke tests against the live Railway URL | MIT / Apache-2.0 | Tests |

### Deliberately NOT installing
- A charting library beyond Recharts (shadcn charts already wrap it).
- A form library (React 19 form actions + zod is enough).
- A state manager (server components hold the state).
- A debt-payoff npm package — none implement snowball/avalanche ordering; the ones that exist
  ([`financejs`](https://financejs.org), [`@cfpb/amortize`](https://github.com/cfpb/amortize),
  `amortizejs`) only do single-loan amortization. We write ~60 lines and own it.

---

## 5. Starter kits — what to clone on day one

| Starter | Verdict |
| --- | --- |
| [nextjs/saas-starter](https://github.com/nextjs/saas-starter) (official, Vercel) | **Reference, do not clone.** It is Next.js + Postgres + Drizzle + shadcn — exactly our stack — but it drags in Stripe subscriptions and team management we do not need yet. Copy its `drizzle.config.ts`, migration setup, and folder layout. |
| [Railway Next.js + Postgres template](https://railway.com/deploy/nextjs) | **Use for the deploy config.** One-click Postgres + Next.js wiring. |
| shadcn/ui blocks ([blocks.so](https://blocks.so), [official examples](https://ui.shadcn.com)) | **Use heavily.** Free dashboard shells, stat cards, sheets, and chart blocks. |
| ixartz/SaaS-Boilerplate, boxyhq/saas-starter-kit | Too heavy. Enterprise auth, i18n, multi-tenancy — all things we do not have. |

**Phase 0 plan: `npx create-next-app` + `npx shadcn init` + copy 5 blocks.** Cloning a full SaaS
boilerplate and then deleting 70% of it is slower than starting clean, when the app is one page.

---

## 6. APIs, CLIs, MCPs, and infrastructure

### Railway CLI
`npm i -g @railway/cli` → `railway login` → `railway init` → `railway add` (Postgres) →
`railway up`. Postgres exposes `DATABASE_URL` and Railway injects it into services in the same
project via reference variables. Pre-deploy migrations are supported by Railway's config, so
`drizzle-kit migrate` runs automatically before each release.
Docs: [Deploy a Next.js App with Postgres](https://docs.railway.com/guides/nextjs).

### Cloudflare R2 (Phase 4)
S3-compatible. Same `@aws-sdk/client-s3` code as S3, with `region: "auto"` and an endpoint of
`https://<ACCOUNT_ID>.r2.cloudflarestorage.com`. Presigned URLs let the browser upload directly,
so files never pass through our server. Zero egress fees. CORS must be configured programmatically
(via the PutBucketCORS API) — there is no dashboard toggle.
Docs: [R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/).

### MCP servers already available in this session
- **GitHub MCP** — PRs, issues, CI status without leaving the session.
- **Notion / Google Drive / Slack / Canva MCP** — useful for the *business* side (content calendar,
  brand assets) rather than the app. Canva MCP could generate marketing screenshots from the brand kit.

No finance-specific MCP is needed for the MVP, because there are no bank connections in the MVP.

### Bank sync, when we eventually want it (Phase 5)

Prices verified 2026-08-12.

| Option | Cost | Notes |
| --- | --- | --- |
| [SimpleFIN Bridge](https://actualbudget.org/docs/advanced/bank-sync/simplefin/) | **$15/year per user** (~$1.25/mo) | Read-only, daily refresh, no minimum, no contract. What Actual Budget's community uses. **Evaluate this first.** |
| [Teller](https://teller.io/) | Free tier, 100 live connections | Genuinely free to start; rate limits are not publicly documented |
| [Plaid](https://plaid.com/docs/account/billing/) | ~$1.50/user/mo with a **~$500/month minimum**; median contract ~$9,000/yr | Industry standard, priced for funded companies |

**The Plaid minimum is the deciding number.** ~$500/month applies whether we have 3 users or 300.
At a $10/month subscription that is 50 paying customers required just to break even on one line
item, before any other cost. It is not a starting position for a bootstrapped product.

**Costs that are not money:**
- Holding bank credentials/tokens is a security and legal responsibility that lands on the owner.
- Connections break constantly — banks change login flows, tokens go stale. "Why isn't my account
  syncing?" becomes the top support request, and it is unfixable from our side.
- Asking for bank credentials is trust-expensive at exactly the moment we have the least trust.

**Decision: do not build bank sync until existing users ask for it by name.** Not "would you like
sync?" — everyone says yes to a free feature. Wait for people already using the app to say manual
entry is what is stopping them.

**Why manual entry is arguably a feature for this ICP.** From the ICP research: *"I am scared to
look at my bank account,"* *"they do not log in to accounts because it feels emotionally
expensive,"* *"is this just another person trying to sell me a budget?"* This audience is avoidant
and distrustful. **"No bank login. Ever."** is a headline that differentiates us from Mint, Rocket
Money, Monarch and YNAB — and typing your own balance is itself the behaviour change we want.

**What we do instead, already in the roadmap:** make manual entry nearly weightless. The only
input that recurs is the checking balance — roughly 15 seconds, once or twice a week. Bills recur
automatically (Phase 2), quick-add chips cover the 12 most common bills (Phase 1), a staleness
nudge appears after 5 days (Phase 2), and the weekly check-in turns it into a habit (Phase 4).

### Testing tool: Playwright CRX
[ruifigueira/playwright-crx](https://github.com/ruifigueira/playwright-crx) — the Playwright recorder
as a Chrome extension ([Chrome Web Store](https://chromewebstore.google.com/detail/playwright-crx/jambeljnbnfbkcpnoiaedcabbgmnnlcd)).
You click through the real app in your own browser and it writes the test script for you, including
assertions. This is the tool that lets **you** — not just me — produce tests.

One caveat worth knowing: it drives one tab at a time via `chrome.debugger`, so it is a recording and
exploration tool. The recorded scripts get committed and then run headless by `@playwright/test` in CI.

---

## 7. What this research saves us

| Component | Build from scratch | With reuse |
| --- | --- | --- |
| App skeleton + deploy | 2 days | 30 minutes |
| UI components | 1 week | 2 hours (restyle only) |
| Recurring date math | 3 days (and buggy) | 1 hour with `rrule` |
| Auth | 3 days (and risky) | 2 hours with Better Auth |
| Charts | 2 days | 1 hour |
| **Safe to Spend engine** | **2 days** | **2 days — this one is ours** |

---

## Sources

- [obra/superpowers](https://github.com/obra/superpowers)
- [gsd-build/get-shit-done](https://github.com/gsd-build/get-shit-done) → [open-gsd/gsd-core](https://github.com/open-gsd/gsd-core)
- [dsifry/metaswarm](https://github.com/dsifry/metaswarm)
- [aiagentskit/claude-agents-library](https://github.com/aiagentskit/claude-agents-library)
- [Actual Budget](https://github.com/actualbudget/actual) · [Firefly III](https://github.com/firefly-iii/firefly-iii)
- [rrule](https://github.com/jkbrzt/rrule) · [dinero.js](https://github.com/dinerojs/dinero.js) · [financejs](https://financejs.org/) · [cfpb/amortize](https://github.com/cfpb/amortize)
- [Next.js SaaS Starter](https://github.com/nextjs/saas-starter) · [shadcn blocks](https://blocks.so/)
- [Railway: Deploy Next.js with Postgres](https://docs.railway.com/guides/nextjs) · [Railway Next.js template](https://railway.com/deploy/nextjs)
- [Cloudflare R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/) · [R2 with aws-sdk-js](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js/)
- [playwright-crx](https://github.com/ruifigueira/playwright-crx) · [playwright-pytest](https://github.com/microsoft/playwright-pytest) · [Playwright Pytest plugin docs](https://playwright.dev/python/docs/test-runners)
- [Better Auth](https://better-auth.com) · [Drizzle ORM](https://orm.drizzle.team)
