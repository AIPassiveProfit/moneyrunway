# The Math: Safe to Spend, Runway, and Debt

This is the most important document in the repository. Everything else is packaging.

**Rule 1:** All money is stored and calculated in **integer cents**. Never floats.
`0.1 + 0.2 === 0.30000000000000004` in JavaScript. That bug in a money app is unforgivable.

**Rule 2:** The calc engine is a **pure function**. Inputs in, answer out. It never reads the
database, never calls `new Date()` internally, never throws. The current date is an input.
That is what makes it testable and trustworthy.

**Rule 3:** Every number the engine produces carries its own **explanation trail**, so the
"How is this calculated?" screen is generated from real data, not written by hand.

---

## 1. The shape of it

```ts
// src/lib/calc/safeToSpend.ts
export function calculateSafeToSpend(input: CalcInput): CalcResult
```

### Input

```ts
type CalcInput = {
  today: string;              // "2026-08-11" in the user's timezone
  timezone: string;           // "America/Chicago"
  cashCents: number;          // checking balance (savings excluded by default)
  savingsCents: number;       // shown, not spent
  incomeEvents: IncomeEvent[];   // { date, amountCents, status: 'expected'|'received', isBusiness }
  billInstances: BillInstance[]; // { dueDate, amountCents, required, autopay, status }
  debtMinimums: DebtDue[];       // { dueDate, amountCents }
  sinkingFunds: Fund[];          // { targetDate, goalCents, currentCents, paused }
  envelopes: Envelope[];         // { periodType, limitCents, spentCents, periodStart, periodEnd }
  savingsRateBps: number;        // e.g. 500 = 5% of income to savings
  taxReserveBps: number;         // creator mode; 0 when off
  horizonDays: number;           // default 90 for runway
};
```

### Output

```ts
type CalcResult = {
  safeToSpendTodayCents: number;      // the hero number
  safeToSpendPeriodCents: number;     // safe through the next payday
  status: 'green' | 'amber' | 'red';
  nextIncome: { date: string; amountCents: number } | null;
  daysUntilNextIncome: number;
  runwayEndDate: string | null;       // first day the projected balance goes below zero
  shortfall: { date: string; amountCents: number } | null;
  timeline: TimelinePoint[];          // one point per money event, with running balance
  breakdown: BreakdownLine[];         // the "how is this calculated" trail
};
```

---

## 2. Safe to Spend, step by step

### Step 1 — Find the window

Income carries one of three statuses, and the difference matters more than it looks:

| Status | Meaning | Counts toward the runway? |
| --- | --- | --- |
| `received` | Already landed and already in the balance | No — counting it would double it |
| `scheduled` | A reliable paycheck from a job | Yes, always |
| `expected` | An invoice or payout that may slip | **Only if the user opts in** |

```
nextIncomeDate = earliest income event STRICTLY AFTER today that counts
daysInWindow   = max(1, daysBetween(today, nextIncomeDate))
```

Strictly after, for two reasons: money landing today is assumed to be in the balance already,
and a zero-day window would divide by zero.

If no future income exists, the window is `horizonDays` (default 30) and we show
"Add your next payday for a more accurate number."

**Creator Mode rule:** expected-but-not-received income is **excluded** by default. An irregular
earner who spends against a client invoice that arrives two weeks late is exactly the person
this app is supposed to protect. The toggle exists, defaulted off.

### Step 2 — Start with what is actually available

```
availableCents = cashCents
```

Savings balance is displayed but never counted. Sinking fund balances are tracked separately from
the checking balance — if a user keeps them in the same bank account, Settings has a
"my sinking funds live in checking" toggle that subtracts fund balances from available cash.

### Step 3 — Subtract required bills in the window

```
requiredBillsCents = sum(billInstances where
    dueDate >= today AND dueDate < nextIncomeDate
    AND required = true
    AND status = 'unpaid')
```

Flexible bills are *not* subtracted (they are shown as "reducible" on the dashboard).
Autopay bills **are** subtracted — the money is leaving whether she remembers or not.

### Step 4 — Subtract debt minimums in the window

```
debtMinimumsCents = sum(debtMinimums where dueDate >= today AND dueDate < nextIncomeDate)
```

Only minimums. Extra payments are a choice made in the Payday Plan, not an obligation.

### Step 5 — Reserve sinking funds (accrual, not lump sum)

This is the subtle one. If Christmas is 4 months away and the goal is $600, we do **not** hold
back $600. We hold back this window's share.

```
for each fund (not paused, currentCents < goalCents):
    remainingCents = goalCents - currentCents
    daysToTarget   = max(1, daysBetween(today, targetDate))
    dailyAccrual   = remainingCents / daysToTarget
    fundReserve   += round(dailyAccrual * daysInWindow)

sinkingReserveCents = sum of fundReserve
```

If a fund's target date has passed and it is not funded, reserve the full remainder and surface
it as a Next Best Action instead of silently swallowing the balance.

### Step 6 — Reserve savings and taxes

```
savingsReserveCents = round(nextIncomeAmount * savingsRateBps / 10000)   // for the NEXT paycheck
taxReserveCents     = round(unreservedBusinessIncomeReceived * taxReserveBps / 10000)
```

Tax reserve is calculated on business income **already received and not yet reserved**, so it
comes out of today's cash. Savings reserve is applied at the Payday Plan step, not against today's
cash — otherwise we double-count.

### Step 7 — Subtract the essentials still needed before payday

```
for each envelope:
    remainingInPeriod = max(0, limitCents - spentCents)
    daysLeftInPeriod  = max(1, daysBetween(today, periodEnd))
    dailyBurn         = remainingInPeriod / daysLeftInPeriod
    essentialsNeeded += round(dailyBurn * min(daysInWindow, daysLeftInPeriod))

    // if the window extends past this envelope period, add the next period's prorated share
```

This is what stops the app from telling someone they have $400 free on the Monday of a week
where they still have to buy groceries and fill the tank.

### Step 8 — The answer

```
safeToSpendPeriodCents =
      availableCents
    - requiredBillsCents
    - debtMinimumsCents
    - sinkingReserveCents
    - taxReserveCents
    - essentialsNeededCents

safeToSpendTodayCents = floor(safeToSpendPeriodCents / daysInWindow)
```

Both numbers are shown. The daily number is the hero; the period number sits under it, because
some people plan by the week and both framings are honest.

**Negative results are never hidden.** A negative Safe to Spend displays as `-$86` in muted red
with the shortfall action card, not as `$0`.

### Step 9 — Status color

```
obligations = requiredBillsCents + essentialsNeededCents
buffer      = safeToSpendPeriodCents

red    if buffer < 0
amber  if buffer >= 0 AND buffer < 0.15 * obligations
green  otherwise
```

Amber is honest, not alarmist: "Tight but manageable." The 15% line is the point where one
ordinary surprise — a co-pay, a school fee — breaks the plan. When obligations are zero the
threshold is zero, so an empty account reads green rather than dividing by nothing.

---

## 3. The Runway projection

A day-by-day simulation from today to `today + horizonDays` (default 90).

```
balance = cashCents
for each day D in [today .. today + horizonDays]:
    balance += income landing on D (received, or expected if the toggle is on)
    balance -= required bills due on D
    balance -= debt minimums due on D
    balance -= dailyEssentialBurn                 // the same daily burn from step 7
    balance -= dailySinkingAccrual                 // only if funds live in checking
    record TimelinePoint { date: D, balanceCents: balance, events: [...] }
    if balance < 0 and shortfall is null:
        shortfall = { date: D, amountCents: -balance }

runwayEndDate = the last non-negative date BEFORE the first shortfall
```

That "before the first shortfall" is load-bearing. Later paychecks push the balance positive
again, so tracking the last non-negative day across the whole horizon would answer "your money
lasts until November" when it actually runs out three weeks from now. Once the first shortfall
is found, both values are frozen.

Display strings:
- No shortfall in horizon → **"Your money should last past your next payday."**
- Shortfall found → **"Your current money should last until Aug 19."** and
  **"You may be short by $86 before Aug 15."**

The chart is a simple line with markers at each event. Tapping a marker shows what happened that day.

---

## 4. Payday Plan allocation

Given an income event of `A` cents, propose:

```
1. billsCents      = required bills due between this payday and the NEXT payday
2. debtCents       = debt minimums in the same window
3. essentialsCents = envelope amounts prorated to the pay period length
4. sinkingCents    = per-payday contribution to keep every fund on schedule
                     = sum over funds of (remaining / paydaysUntilTarget)
5. taxCents        = A * taxReserveBps / 10000   (business income only)
6. savingsCents    = A * savingsRateBps / 10000
7. guiltFreeCents  = A - (1+2+3+4+5+6)
```

If `guiltFreeCents < 0`, we do **not** silently zero out savings. We show an amber panel:
"This paycheck is $140 short of covering everything. Here is what I'd adjust first," and offer
the levers in this order: pause a sinking fund → reduce savings rate → reduce a flexible envelope →
flag a flexible bill. The user decides. The app never decides for her.

---

## 5. Debt payoff

### Single debt payoff month count

Standard amortization, monthly compounding:

```
r = apr / 12 / 100                     // monthly rate
if r == 0:  months = ceil(balance / payment)
else:
   if payment <= balance * r:  return NEVER   // payment does not cover interest
   months = ceil( -log(1 - (balance * r) / payment) / log(1 + r) )
```

The `NEVER` case matters — it is the honest, non-preachy way to show someone that a minimum
payment is not moving the balance. Copy: *"At this payment, the balance isn't going down.
Even $20 more per month would change that."*

### Snowball vs avalanche

```
order = snowball  ? debts sorted by balance ascending
                   : debts sorted by apr descending

month loop:
    pay every debt its minimum
    apply (extra + freed-up minimums from paid-off debts) to order[0]
    when order[0] hits zero, roll its entire payment into the next debt
    continue until all balances are zero or 600 months elapse
```

Return for each strategy: payoff date, total interest paid, and per-debt payoff dates.
Show them **side by side** — snowball usually costs more interest but wins more often
psychologically, and that tradeoff is the user's to make, not ours.

### "What if I add $25 / $50 / $100?"

Run the same simulation with `extra + delta` and report the delta in months saved and interest saved.
Nothing more. No nudging, no "you could do better."

---

## 6. Rounding rules

| Situation | Rule |
| --- | --- |
| Safe to Spend Today | Round **down** to the whole dollar. Optimism here costs the user real money. |
| Reserves (sinking, tax, savings) | Round **up** to the cent. Under-reserving is the dangerous direction. |
| Display | `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })` |
| Hero number | Whole dollars, no cents — `$312`, not `$312.00` |
| Everything else | Cents shown |

---

## 7. The transparency trail

Every subtraction pushes a line into `breakdown[]`:

```ts
{ label: "Rent",              amountCents: -145000, kind: "bill",      href: "/bills/abc" }
{ label: "Car insurance",     amountCents:  -9800,  kind: "bill",      href: "/bills/def" }
{ label: "Visa minimum",      amountCents:  -3500,  kind: "debt",      href: "/debts/ghi" }
{ label: "Car repair fund",   amountCents:  -2400,  kind: "sinking",   href: "/funds/jkl" }
{ label: "Groceries (4 days)",amountCents: -12000,  kind: "envelope",  href: "/spending" }
```

The "How is this calculated?" screen renders this list, with every row tappable to go edit
the underlying thing. Transparency is not a nice-to-have for this audience — it is the trust
mechanism. She has been burned by apps that produced a number she could not explain to her spouse.

---

## 8. Test cases the engine must pass (write these first)

| # | Scenario | Expected |
| --- | --- | --- |
| 1 | $1,000 cash, no bills, payday in 10 days, no envelopes | $100/day, green |
| 2 | $1,000 cash, $900 bill due in 3 days, payday in 10 days | $10/day, amber |
| 3 | $500 cash, $900 rent due in 3 days | negative, red, shortfall on the rent date |
| 4 | $1,000 cash, $600 Christmas fund due in 120 days | $5/day reserved, not $600 |
| 5 | Expected (unreceived) income in the window | excluded by default; included when toggle on |
| 6 | Payday is today | window = today → next payday, not zero days |
| 7 | No future income at all | falls back to a 30-day window with a prompt |
| 8 | Envelope already overspent (`spent > limit`) | `remaining` clamps to 0, never adds money back |
| 9 | Debt minimum that does not cover interest | payoff = NEVER, no crash, no `Infinity` in the UI *(deferred to Phase 3 with the payoff tracker)* |
| 10 | Leap day / DST boundary / month-end (Jan 31 monthly bill) | day counts correct in the user's timezone |
| 11 | Every input zero | all outputs zero, status green, no divide-by-zero |
| 12 | Sinking fund target date already passed, underfunded | full remainder reserved + action card raised |
