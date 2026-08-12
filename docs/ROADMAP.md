# Roadmap — From Food Stand to Restaurant

The whole idea: **ship something real today**, then add one room to the building at a time.
Each phase is a working, deployed app. We never have a half-built thing sitting around.

| Phase | Restaurant stage | What you get | Time |
| --- | --- | --- | --- |
| **0** | The food stand | One page, one number, live on the internet | **Today, ~3 hours** |
| **1** | The stand with a real menu | Your own data, saved in Postgres | 1–2 days |
| **2** | One employee | Login, bills calendar, runway timeline | 3–4 days |
| **3** | Full front of house | Sinking funds, debt tracker, payday plan | 1 week |
| **4** | Back of house | Check-in streaks, Creator Mode, exports to R2 | 1 week |
| **5** | Second location | Bank sync, notifications, paid tiers | Later, only if users ask |

---

## Phase 0 — The Food Stand ✅ BUILT

Status: **shipped**. Live at https://moneyrunway-production.up.railway.app
21 unit tests, 15 browser tests, and 6 deployed-site smoke tests all pass.
Railway rebuilds and redeploys automatically on every push to this branch.

One thing bit us on the first deploy, worth remembering: the build server
defaulted to Node 18 and Next.js needs 20 or newer. Fixed by pinning `22.x` in
`package.json` and `.nvmrc`. "Works on my machine" is the most common deploy
failure there is, and pinning versions is how you stop it.



**One item on the menu, cooked perfectly, sold on the sidewalk.**

A food stand doesn't have a walk-in cooler, a hostess, or a POS system. It has one great thing to
sell and a way to hand it to a customer. Ours is the Safe to Spend number.

### What we build
- Next.js app, mobile-first, brand colors from the Make Money Make Sense kit.
- **One screen**: the dashboard with all five cards.
- **The calc engine** — the real one, fully unit tested. This is not a throwaway prototype;
  it is the piece we keep forever.
- **Demo data loaded from a file.** Jasmine's household: $840 in checking, $4,600/mo take-home,
  rent $1,450, car $415, three more bills, two envelopes, one sinking fund, one credit card.
- A **simple edit sheet**: tap any number on the dashboard, change it, watch Safe to Spend update
  instantly. This is the "wow" moment and it does not need a database — the numbers live in the
  browser session.
- "How is this calculated?" breakdown screen.
- Disclaimer in the footer.
- **Deployed to Railway** with a live URL you can open on your phone and text to someone.

### What we deliberately skip
No database. No login. No bills calendar. No adding new bills — you can only edit the demo ones.
Refreshing the page resets everything, and that is fine, because Phase 0's job is to prove the
idea feels good on a phone.

### Testing at this phase (see docs/TESTING.md)
Level 0 → 2: Vitest unit tests on all 12 calc cases, plus a Playwright smoke test
(page loads, no JS errors, the hero number is visible and correct).

### Done when
You open the Railway URL on your phone, see `$47` in big type, tap "rent," change it to $1,200,
and watch the number jump to `$130` — and it feels good.

### Your homework before we start
Nothing. I can build Phase 0 with what is already in this repo.

---

## Phase 1 — A Real Menu (1–2 days)

**The stand now takes your order instead of serving one fixed plate.**

### What we build
- Postgres on Railway, wired up with Drizzle. Tables: `users`, `profiles`, `accounts`,
  `income_events`, `bills`, `envelopes`.
- **The 7-step onboarding flow.** Your data, not the demo's.
- Anonymous accounts: a signed cookie identifies you. No email, no password, no signup wall.
  Value first; we ask for an email later, once you have something worth protecting.
- Add / edit / delete bills, income, and envelopes.
- Balance staleness prompt ("Is your balance still $840?").
- Demo mode survives as a "Try sample data" button.

### Why this order
Because a signup form in front of an unproven product is where most apps die. We prove the
product, then ask for the email.

### Your homework
Enter your own real numbers and tell me the first thing that feels wrong or confusing.
That feedback shapes Phase 2 more than anything I can guess.

---

## Phase 2 — One Employee (3–4 days)

**Now there's a cook and a counter. Somebody remembers you between visits.**

### What we build
- **Better Auth with email magic links.** Click a link in your email, you are in. No password to forget.
  "Claim your account" converts an anonymous user into a real one without losing data.
- **Bills calendar**: month grid + chronological list, powered by `rrule` recurrence and
  `bill_instances`. Mark paid, skip a month, override one occurrence's amount.
- **The Runway timeline chart** — the day-by-day projection with a real visual.
- **Next Best Action rules engine** — all 10 rules from PRD §7.4.
- `calc_snapshots` written on every computation, so numbers become auditable over time.
- QA gate + security gate (Testing levels 4 and 5) run for the first time here, because this is
  the first phase holding real personal data behind real accounts.

### Frameworks introduced
GSD for spec-writing, plus 5 hand-picked agents from the claude-agents-library.

### Your homework
Set up a Resend account (free, 3,000 emails/month) so magic links can actually send.
I will give you exact click-by-click steps when we get there.

---

## Phase 3 — Full Front of House (1 week)

**Hostess, servers, a printed menu. The customer experience is complete.**

### What we build
- **Sinking Funds** with all 8 templates + custom, progress bars, contribution math.
- **Debt Payoff Tracker**: snowball vs avalanche side by side, payoff dates, total interest,
  and the "+$25 / +$50 / +$100" calculator.
- **Payday Plan** allocation tool with editable sliders.
- Cross-links: a sinking fund shortfall raises a Next Best Action; a debt minimum flows into
  Safe to Spend automatically.

### Frameworks introduced
metaswarm. By now there is enough surface area that parallel specialist review gates
(security, performance, UX, testing, correctness) earn their keep.

---

## Phase 4 — Back of House (1 week)

**Prep kitchen, inventory, the systems customers never see but always feel.**

### What we build
- **Weekly Money Check-In** with streaks and warm (never shaming) copy.
- **Creator / Freelancer Mode**: income sources, expected vs received, business/personal labels,
  tax reserve, "Can I afford to reinvest?", monthly creator cash-flow summary.
- **Cloudflare R2** wired up: PDF/CSV export of your plan, bills calendar, and debt payoff schedule.
  This is the first phase where R2 has an actual job.
- **PWA**: installs to the home screen, works offline for viewing, looks like a native app.
- Privacy-friendly analytics so we can see where onboarding loses people.

---

## Phase 5 — Second Location (only when users ask)

- Bank sync — evaluate **SimpleFIN** (~$1.50/user/mo) before Plaid.
- Push notifications: "Rent is due in 2 days and you're $120 short."
- Couples / shared households.
- Paid tier. The natural fence: free = manual + one household; paid = sync, exports, multi-user.
- Tie-ins to the Make Money Make Sense funnel (the Paycheck Peace Planner, the Money Clarity Club).

---

## The rules that keep this from going sideways

1. **Every phase ends deployed and working.** No "we'll deploy it when it's done."
2. **No borrowing from a future phase.** If it is in Phase 3, it does not get built in Phase 1,
   no matter how small it seems. This is the single rule that protects the quick win.
3. **The calc engine stays pure.** Database code never leaks into it.
4. **Tests come with the feature, not after.** A phase is not done until its testing level passes.
5. **You approve the plan before I write the code.** Every phase starts with a written plan
   in plain English that you read first.
6. **When something is unclear, I build the boring version and flag it.** I do not stall
   waiting on you unless the answer changes the whole approach.

---

## Frameworks: when each one shows up

| Phase | Superpowers | GSD | Agents Library | metaswarm |
| --- | --- | --- | --- | --- |
| 0 | ✅ | — | — | — |
| 1 | ✅ | ✅ | — | — |
| 2 | ✅ | ✅ | ✅ | — |
| 3+ | ✅ | ✅ | ✅ | ✅ |

A food stand does not need a brigade of 18 chefs. Adding them too early is how a 3-hour win
becomes a 3-day project.
