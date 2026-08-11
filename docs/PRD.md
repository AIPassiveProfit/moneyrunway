# Money Runway — Product Requirements Document (PRD)

**Version:** 1.0
**Date:** 2026-08-11
**Owner:** Make Money Make Sense
**Status:** Approved for Phase 0 build

---

## 0. What a PRD is (plain English)

A PRD is the recipe card for the whole restaurant. It says what we are making, who eats it,
what goes on the plate, and how we know it came out right. Engineers (and AI agents) read it
so nobody has to guess. If something is not in here, it does not get built yet.

---

## 1. The one-sentence product

Money Runway tells you **exactly what is safe to spend today** after your bills, debt payments,
savings goals, sinking funds, taxes, and essential spending are covered — and shows you how long
your money lasts before your next payday.

## 2. Why this exists

Our customer (Jasmine, 29–42, household income $55k–$110k) does not have a math problem.
She has a **timing** problem. Money comes in on the 1st and 15th; bills land on the 3rd, 7th,
12th, 20th, and 28th; groceries and gas leak out every day. Her bank balance says $840 but she
has no idea if that $840 is already spoken for.

Existing budgeting apps answer "where did my money go last month?" Money Runway answers
**"what can I do right now?"** That is the gap.

### Design principles (non-negotiable)

1. **One number is the hero.** Safe to Spend Today. Everything else supports it.
2. **No shame, ever.** Red means "here is your next move," never "you failed."
3. **Plain language.** "Money coming in," not "projected inflows." "Bills coming up," not "liabilities."
4. **Transparent math.** Every number has a "How is this calculated?" tap-through.
5. **Value before signup.** Demo data loads instantly. No account required to see the product work.
6. **Everything editable.** Users are never trapped by a bad entry.
7. **Mobile-first.** Designed for a phone on a couch at 10pm, not a desktop at a desk.

## 3. Who it is for

**Primary — "Working but stretched" (Jasmine).** W-2 job, kids or a partner, $3,800–$7,000/mo
take-home, $3k–$20k of debt, $0–$2,500 in savings. Tried budgeting, quit because it was fussy.

**Secondary — "Starting over."** Post-divorce, job change, or medical hardship. Rebuilding.

**Also served — irregular income.** Freelancers, gig workers, creators, side hustlers.
Served through an optional **Creator/Freelancer Mode** toggle, not a separate app.

### What success looks like for her

- Opens the app, understands her situation in under 10 seconds.
- Stops checking her bank balance with dread.
- Knows a shortfall is coming **before** it happens, not after the overdraft fee.
- Sinking funds turn "car repair emergency" into "planned expense."

## 4. Out of scope for MVP (say no loudly)

| Not building | Why | When |
| --- | --- | --- |
| Bank connections / transaction sync | Plaid costs money, adds security burden, slows us to a crawl | Phase 5, evaluate SimpleFIN first |
| Automatic transaction categorization | Requires bank sync | Phase 5+ |
| Investment tracking | Not our promise | Never (different product) |
| Credit score monitoring | Regulated, needs a vendor | Phase 5+, likely affiliate instead |
| Multi-currency | Our ICP is U.S. | Later |
| Native iOS/Android app | Web app installs to home screen fine | Phase 4 as a PWA |
| Couples / shared accounts | Doubles the data model complexity | Phase 5 |
| Bill payment (moving real money) | Money transmission licensing. Hard no. | Never |

## 5. Product rules and compliance

- Visible disclaimer in onboarding **and** Settings: *"Money Runway is an educational budgeting and
  cash-flow organization tool. It is not financial, investment, tax, legal, or credit advice.
  Consider your own situation and a qualified professional when needed."*
- The tax reserve feature must say "set aside," never "you owe $X" — we are not computing tax liability.
- No income claims, no "guaranteed," no "get out of debt fast."
- Never recommend a specific financial product inside a calculation result.
- All user data is deletable from Settings (one button, real deletion, not a soft flag).

---

## 6. Screens and flows

### 6.1 Screen map

```
/                      Dashboard (the hero screen)
/onboarding            7-step first-run flow
/money-in              Income + paydays
/bills                 Bills list + calendar
/bills/new             Add/edit a bill
/plan/:incomeId        Payday Plan (allocation tool)
/funds                 Sinking funds
/debts                 Debt payoff tracker
/debts/what-if         Extra payment calculator
/spending              Essential spending envelopes
/checkin               Weekly Money Check-In
/settings              Profile, creator mode, disclaimer, data export, delete account
/how/:topic            "How is this calculated?" explainer pages
```

### 6.2 Dashboard (the centerpiece)

Vertical card stack, thumb-reachable, no horizontal scrolling.

**Card 1 — SAFE TO SPEND TODAY**
- The number in the largest type on the screen (`$` + whole dollars, no cents).
- Sub-line: "This is the amount you can spend without putting your upcoming obligations at risk."
- Second sub-line: "Safe through payday: $XXX" (the whole-period figure).
- Status color band:
  - **Green (#52C18D)** — On track. Buffer is healthy.
  - **Amber (#F4C95D)** — Tight but manageable. Buffer under 10% of the period's essentials.
  - **Red (muted #C25B54)** — Projected shortfall before the next income lands.
- "How is this calculated?" link → itemized breakdown, every line editable in place.

**Card 2 — MONEY RUNWAY**
- "Your next payday is **Friday, Aug 15** (4 days)."
- "Your current money should last until **Aug 19**."
- Horizontal timeline: today → each bill/income event → projected balance after each.
- If shortfall: "You may be short by **$86** before **Aug 15**." Plus a "Fix this" button
  linking to the two cheapest levers (reduce a flexible envelope, or move a bill date).

**Card 3 — NEXT BEST ACTION**
- One card. One action. A button that completes it.
- Rules engine picks the highest-priority action (see §7.4).

**Card 4 — UPCOMING MONEY**
- Next income: amount + date.
- Bills due before that income: list with dates and amounts.
- "Total needed before payday: $X" / "Left after required: $Y."

**Card 5 — This week's essentials** (envelope progress bars: groceries, gas, eating out, other.)

### 6.3 Onboarding (7 steps, under 3 minutes)

1. **"What is your main money goal?"** — stop overspending / make it to payday / pay off debt /
   build savings / manage irregular income / organize bills. (Stored; drives copy and default
   Next Best Actions.)
2. **Checking balance right now.** Single number. "Just look at your banking app. Close enough is fine."
3. **Next payday** — date + amount + how often (weekly / every 2 weeks / twice a month / monthly / irregular).
4. **Bills** — quick-add chips for the 12 most common (Rent/Mortgage, Car payment, Car insurance,
   Phone, Electric, Internet, Water, Gas, Childcare, Subscriptions, Credit card minimum, Student loan).
   Tap a chip → amount + due day. Skip anytime.
5. **Monthly essentials** — groceries, gas, eating out, household. Weekly or monthly amounts.
6. **One goal** — a savings target or one debt. Optional.
7. **First result** — the Safe to Spend number, animated in, with the breakdown shown once.

Every step has a **"Skip, I'll do it later"** escape hatch and a **"See a demo instead"** exit.

### 6.4 Demo mode

A "Try it with sample data" button on the landing screen loads a realistic household
(take-home $4,600/mo, rent $1,450, car $415, $6,800 credit card debt, two kids) into a
throwaway session. A persistent banner reads "You're viewing sample data — Start my own."

---

## 7. Features

### 7.1 Payday Plan (A)

When income is added or marked received, offer an allocation split. Defaults derived from the
user's actual obligations, not a generic percentage rule:

| Bucket | Default suggestion |
| --- | --- |
| Bills due before next payday | Exact sum of required bills |
| Debt minimums | Exact sum of minimums due in window |
| Groceries + household | Envelope amount, prorated to the pay period |
| Gas + transportation | Envelope amount, prorated |
| Sinking funds | Sum of per-payday contributions needed to hit target dates |
| Savings / emergency fund | Goal contribution, or 5% default if no goal set |
| Taxes (Creator Mode only) | User's chosen % of business income |
| Guilt-free spending | Whatever remains — displayed positively, never as "leftover" |

Every amount is editable with a slider + numeric input. If edits push the plan negative, show
an amber warning explaining which obligation is now uncovered — do not block the save.

### 7.2 Bills Calendar (B)

Fields: name, amount, due date, frequency (weekly / every 2 weeks / monthly / quarterly / annual /
custom), category, **required vs flexible**, autopay toggle, optional account.

- Recurrence stored as an RFC-5545 RRULE string (see docs/RESEARCH.md).
- Two views: month calendar grid, and a chronological "what's next" list (default on mobile).
- Bill occurrences are materialized into `bill_instances` so a user can mark one month paid,
  skip a month, or change a single occurrence's amount without breaking the series.
- "Required" bills count against Safe to Spend. "Flexible" bills are shown but reducible.

### 7.3 Sinking Funds (C)

Preset templates: Car repairs, Christmas/Gifts, Travel, Insurance, Medical, Home repairs,
Annual subscriptions, School, plus Custom.

Each fund: goal amount, current amount, target date, computed required contribution
(per week and per payday), progress bar. Copy leans on the brand line:
**"Not an emergency, just unplanned."**

Money in sinking funds is **reserved** — subtracted from Safe to Spend at the accrual rate,
not all at once (see docs/CALCULATIONS.md §4).

### 7.4 Next Best Action rules engine (dashboard Card 3)

Evaluated top-down; first match wins.

| Priority | Condition | Action card |
| --- | --- | --- |
| 1 | Projected shortfall before next income | "You're projected to be $86 short before Aug 15. Here are two ways to close the gap." |
| 2 | Required bill due in ≤ 3 days and balance < bill amount | "Rent is due in 2 days and you're $120 short. Move money or adjust." |
| 3 | Required bill due in ≤ 5 days, not autopay | "Set aside $1,450 for rent — due Friday." |
| 4 | Balance stale (> 5 days since last update) | "Quick check: is your balance still $840?" |
| 5 | Weekly check-in not done and it's the user's chosen day | "Your 5-minute check-in is ready." |
| 6 | Sinking fund behind schedule | "Your car fund needs $45 this payday to stay on track." |
| 7 | Envelope over 80% used with 3+ days left in the week | "Your grocery budget has $72 left for 4 days." |
| 8 | Debt has extra room in the plan | "Adding $50 to your Visa would save you $312 in interest." |
| 9 | 3+ subscriptions detected as flexible bills | "You have 4 subscriptions totaling $61/mo. Worth a look?" |
| 10 | Fallback (everything healthy) | "You're on track. Your next bill is Internet, $79, on Aug 18." |

Each card has exactly one primary button that performs the action in-app.

### 7.5 Debt Payoff Tracker (D)

Fields: name, current balance, interest rate (APR), minimum payment, due date, optional extra payment.

Outputs: total debt, estimated debt-free date, snowball vs avalanche toggle showing both payoff
dates and total interest side by side, progress bar toward debt-free, and a
**"What if I add $25 / $50 / $100?"** calculator with interest saved and months saved.

Framing rule: never call a minimum payment a mistake. Show the number, let it speak.

### 7.6 Weekly Money Check-In (E)

Five steps, target under 5 minutes:
1. Update your balance.
2. Review bills due this week (tap to confirm or adjust).
3. Confirm savings + sinking fund transfers.
4. Review flexible spending (envelope bars).
5. Pick one money habit for the week (from a short list, or write your own).

Completion → streak counter + a warm, non-cheesy celebration. Missing a week never resets
progress language to shame ("Welcome back — let's reset this week," not "You broke your streak").

### 7.7 Creator / Freelancer Mode (F)

Optional toggle in Settings. When on, adds:

- Income sources: affiliate, client work, brand deals, platform payouts, digital products, other.
- **Expected vs received** income tracking (expected income is greyed out of Safe to Spend until
  marked received — this is the single most important rule for irregular earners).
- Personal vs business expense labels.
- Tax reserve: user picks a percentage (default 25–30%, with a "this is a starting point,
  not tax advice" note). Reserved on receipt, held out of Safe to Spend.
- **"Can I afford to reinvest?"** calculator for software/ads/equipment — answers against runway,
  not just balance.
- Monthly creator cash-flow summary: revenue, expenses, taxes reserved, owner pay, profit, runway in weeks.

---

## 8. Visual design

Brand palette (from the Make Money Make Sense kit):

| Token | Hex | Use |
| --- | --- | --- |
| Navy | `#102A43` | Text, headers, the icon, dark surfaces |
| Green | `#52C18D` | On track, progress, positive |
| Amber | `#F4C95D` | Caution, tight |
| Off-white | `#F7F4EE` | App background |
| White | `#FFFFFF` | Cards |
| Muted red | `#C25B54` | Shortfall (added — must pass 4.5:1 on off-white) |

- Type: one geometric sans. Safe to Spend number at ~56–64px on mobile.
- Cards: white, 16px radius, soft shadow, 16px gutters, generous vertical rhythm.
- Charts: simple. Progress bars and a single timeline. No dense tables, no pie charts of 14 categories.
- Every interactive target ≥ 44×44px. Bottom tab bar: Home, Bills, Funds, Debt, More.
- Accessibility: WCAG AA contrast, color never the only signal (always pair with an icon + words),
  full keyboard operation, screen-reader labels on the hero number.

---

## 9. Technical architecture

```
┌─────────────────────────────────────────────────┐
│  Browser (mobile-first PWA)                     │
│  Next.js App Router · React · Tailwind · shadcn │
└───────────────┬─────────────────────────────────┘
                │ same-origin, no separate API
┌───────────────▼─────────────────────────────────┐
│  Next.js server (Server Actions + route handlers)│
│  · calc engine (pure TypeScript, unit tested)    │
│  · Drizzle ORM                                   │
└───────────────┬─────────────────────────────────┘
                │ DATABASE_URL
┌───────────────▼──────────┐   ┌──────────────────┐
│  Postgres (Railway)      │   │ Cloudflare R2     │
│  all user + calc data    │   │ exports, receipts │
└──────────────────────────┘   │ (Phase 4+)        │
                               └──────────────────┘
```

**Key architectural decision: the calculation engine is a pure, dependency-free TypeScript module**
(`src/lib/calc/`). It takes a plain object in and returns a plain object out. No database calls,
no dates from `new Date()` inside it (the clock is passed in). This makes it fast to unit test,
impossible to break by accident, and reusable if we ever build a native app.

### 9.1 Stack decisions and the reasoning

| Decision | Choice | Why | Alternative rejected |
| --- | --- | --- | --- |
| Framework | Next.js (App Router) + TypeScript | Screens and server in one deploy; the largest supply of free starter code and UI blocks | Separate React + FastAPI: two deploys, two repos, slower to first win |
| Styling | Tailwind + shadcn/ui | Components are copied into our repo, so we own and restyle them to the brand | A paid UI kit |
| ORM | Drizzle | Type-safe, plain-SQL-shaped, migrations are files we can read | Prisma (heavier), raw SQL (error-prone) |
| Money type | `BIGINT` cents, integers only | Floats break money math ($0.1 + $0.2 ≠ $0.3) | Storing dollars as `float` — never |
| Dates | `DATE` + user timezone on profile | "Due Aug 15" must mean Aug 15 in her town | UTC timestamps for calendar dates |
| Auth | Phase 0–1: signed anonymous session cookie. Phase 2: Better Auth (email magic link) | Do not put a signup wall in front of value | Clerk (vendor + cost), rolling our own passwords (risk) |
| Hosting | Railway | User preference; app + Postgres in one project; CLI deploys | — |
| Storage | Cloudflare R2 | User preference; zero egress fees | Not wired up until Phase 4 — nothing to store before then |
| Tests | Playwright (TS) + Pytest (black-box) | See docs/TESTING.md §0 | — |

**Note on Pytest:** the app is TypeScript, so unit tests for the calc engine are Vitest.
Pytest still earns its place as the **outside-in test runner** — `pytest` + `playwright-python`
drives a real browser against the deployed Railway URL and does not care what language the app
is written in. That gives you the Pytest layer you asked for without splitting the app across
two languages. If you would rather the whole app be Python, say so before Phase 0 and we will
swap to FastAPI + HTMX — it is a real option, just a slower path to a polished mobile UI.

---

## 10. Success metrics

| Metric | Phase 0–1 target | Why it matters |
| --- | --- | --- |
| Time to first Safe to Spend number | < 3 minutes from landing | If onboarding drags, she leaves |
| Onboarding completion rate | > 60% | Measures friction |
| Day-7 return rate | > 30% | Measures whether the number is trusted |
| Weekly check-in completion | > 40% of active users | The habit is the retention engine |
| "How is this calculated?" taps | > 20% of sessions in week 1 | High taps early = trust being built, not a bug |
| Shortfall predicted before it happened | Qualitative (user interviews) | This is the actual product promise |

---

## 11. Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Manual balance entry goes stale, number becomes wrong | High | Staleness prompt after 5 days; check-in habit; show "as of Aug 9" next to the number |
| Safe to Spend is too conservative, feels punishing | Medium | Show the whole-period number too; let users exclude a fund from reservation |
| User adds bills but not essentials → number is too generous | High | Onboarding step 5 is hard to skip silently; dashboard shows "add your essentials for a truer number" |
| Users expect bank sync and bounce | Medium | Landing page states manual entry as a feature ("no bank login, ever") |
| Perceived as financial advice | Low but serious | Disclaimers in onboarding + Settings + every calculator result |
| Scope creep kills the quick win | **High** | The roadmap phases are a contract. Nothing from Phase 3 gets built in Phase 1 |

---

## 12. Open questions for the owner

1. **Language:** confirm the TypeScript app + Pytest black-box tests decision above (§9.1), or ask for full Python.
2. **Domain:** do you own a domain for this yet? Railway gives us a free `*.up.railway.app` URL for Phase 0.
3. **Email:** Phase 2 magic-link login needs an email sender (Resend free tier is 3,000/mo). Do you have a sending domain?
4. **Analytics:** OK to add privacy-friendly, cookie-less analytics (Plausible or PostHog free tier) in Phase 2?
5. **Demo household numbers:** should the sample data reflect Jasmine's exact profile from your ICP doc? (Recommended: yes.)
