# Database Schema (Postgres)

**Conventions**

- All money: `BIGINT` named `*_cents`. Never `FLOAT`, never `MONEY`.
- Calendar dates (a bill due date): `DATE`. Moments in time (created_at): `TIMESTAMPTZ`.
- Primary keys: `UUID DEFAULT gen_random_uuid()` (from `pgcrypto`, built into Railway Postgres).
- Every user-owned table has `user_id` with `ON DELETE CASCADE` — deleting an account really deletes the data.
- Every table has `created_at` and `updated_at`.
- Percentages stored as **basis points** integers (`tax_reserve_bps = 2500` means 25.00%).

Restaurant version: the database is the walk-in cooler. Everything has a labeled shelf, nothing
is stored loose, and when a customer says "throw out my stuff," it all goes.

---

## Phase-by-phase table introduction

| Phase | Tables added |
| --- | --- |
| 0 | *(none — everything in memory + a seeded demo object)* |
| 1 | `users`, `profiles`, `accounts`, `income_events`, `bills`, `envelopes` |
| 2 | `bill_instances`, `sessions`/auth tables, `calc_snapshots` |
| 3 | `sinking_funds`, `fund_contributions`, `debts`, `debt_payments`, `payday_plans` |
| 4 | `checkins`, `income_sources`, `spend_entries`, `files` |

---

## Core

```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT UNIQUE,                  -- NULL until they claim the account (Phase 2)
  anon_token_hash TEXT UNIQUE,                  -- Phase 0-1 cookie-based identity
  is_demo         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE profiles (
  user_id            UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  money_goal         TEXT,          -- 'stop_overspending'|'make_it_to_payday'|'pay_off_debt'|
                                    -- 'build_savings'|'irregular_income'|'organize_bills'
  timezone           TEXT NOT NULL DEFAULT 'America/Chicago',
  pay_frequency      TEXT,          -- 'weekly'|'biweekly'|'semimonthly'|'monthly'|'irregular'
  creator_mode       BOOLEAN NOT NULL DEFAULT FALSE,
  tax_reserve_bps    INT NOT NULL DEFAULT 0,
  savings_rate_bps   INT NOT NULL DEFAULT 500,
  count_expected_income BOOLEAN NOT NULL DEFAULT FALSE,
  funds_live_in_checking BOOLEAN NOT NULL DEFAULT TRUE,
  checkin_day        INT NOT NULL DEFAULT 0,     -- 0 = Sunday
  onboarded_at       TIMESTAMPTZ,
  disclaimer_ack_at  TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  kind          TEXT NOT NULL,      -- 'checking'|'savings'|'cash'
  balance_cents BIGINT NOT NULL DEFAULT 0,
  balance_as_of DATE NOT NULL,      -- powers the "is this still right?" staleness prompt
  is_primary    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON accounts (user_id);
```

## Money coming in

```sql
CREATE TABLE income_sources (               -- Creator Mode
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  kind       TEXT NOT NULL,   -- 'job'|'affiliate'|'client'|'brand_deal'|'platform'|'product'|'other'
  is_business BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE income_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_id     UUID REFERENCES income_sources(id) ON DELETE SET NULL,
  label         TEXT NOT NULL DEFAULT 'Paycheck',
  amount_cents  BIGINT NOT NULL,
  expected_date DATE NOT NULL,
  received_date DATE,
  status        TEXT NOT NULL DEFAULT 'expected',   -- 'expected'|'received'|'missed'
  rrule         TEXT,                                -- RFC-5545, NULL = one-off
  series_id     UUID,                                -- groups generated occurrences
  is_business   BOOLEAN NOT NULL DEFAULT FALSE,
  tax_reserved_cents BIGINT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON income_events (user_id, expected_date);
```

## Money going out

```sql
CREATE TABLE bills (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  amount_cents BIGINT NOT NULL,
  amount_varies BOOLEAN NOT NULL DEFAULT FALSE,   -- electric bill: estimate + range
  amount_min_cents BIGINT,
  amount_max_cents BIGINT,
  anchor_date  DATE NOT NULL,        -- first/reference due date
  rrule        TEXT,                 -- 'FREQ=MONTHLY;BYMONTHDAY=1', NULL = one-off
  category     TEXT,                 -- 'housing'|'transport'|'utilities'|'insurance'|
                                     -- 'childcare'|'subscription'|'debt'|'other'
  is_required  BOOLEAN NOT NULL DEFAULT TRUE,
  is_autopay   BOOLEAN NOT NULL DEFAULT FALSE,
  account_id   UUID REFERENCES accounts(id) ON DELETE SET NULL,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON bills (user_id, is_active);

-- Materialized occurrences. This is what the calc engine and calendar read.
-- Generated on demand for a rolling 120-day horizon; regenerated when the parent bill changes.
CREATE TABLE bill_instances (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bill_id       UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  due_date      DATE NOT NULL,
  amount_cents  BIGINT NOT NULL,     -- can be overridden per occurrence
  status        TEXT NOT NULL DEFAULT 'unpaid',   -- 'unpaid'|'paid'|'skipped'
  paid_date     DATE,
  is_overridden BOOLEAN NOT NULL DEFAULT FALSE,   -- protects manual edits from regeneration
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bill_id, due_date)
);
CREATE INDEX ON bill_instances (user_id, due_date, status);
```

## Envelopes (essential spending)

```sql
CREATE TABLE envelopes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,              -- Groceries, Gas, Eating out, Household, Coffee
  limit_cents  BIGINT NOT NULL,
  period_type  TEXT NOT NULL DEFAULT 'weekly',   -- 'weekly'|'biweekly'|'monthly'
  is_essential BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE spend_entries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  envelope_id  UUID REFERENCES envelopes(id) ON DELETE CASCADE,
  amount_cents BIGINT NOT NULL,
  spent_on     DATE NOT NULL,
  note         TEXT,
  is_business  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON spend_entries (user_id, spent_on);
```

## Sinking funds

```sql
CREATE TABLE sinking_funds (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  template_key       TEXT,          -- 'car_repair'|'christmas'|'travel'|'insurance'|'medical'|
                                    -- 'home_repair'|'annual_subs'|'school'|'custom'
  goal_cents         BIGINT NOT NULL,
  current_cents      BIGINT NOT NULL DEFAULT 0,
  target_date        DATE,
  contribution_cents BIGINT,        -- user override; else computed
  cadence            TEXT NOT NULL DEFAULT 'per_payday',  -- 'weekly'|'monthly'|'per_payday'
  is_paused          BOOLEAN NOT NULL DEFAULT FALSE,
  is_recurring       BOOLEAN NOT NULL DEFAULT FALSE,      -- e.g. Christmas resets yearly
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE fund_contributions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fund_id      UUID NOT NULL REFERENCES sinking_funds(id) ON DELETE CASCADE,
  amount_cents BIGINT NOT NULL,     -- negative = withdrawal (the car actually broke)
  occurred_on  DATE NOT NULL,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Debts

```sql
CREATE TABLE debts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  kind                TEXT,          -- 'credit_card'|'auto'|'student'|'personal'|'medical'|'other'
  balance_cents       BIGINT NOT NULL,
  starting_balance_cents BIGINT NOT NULL,   -- powers the progress bar
  apr_bps             INT NOT NULL DEFAULT 0,
  min_payment_cents   BIGINT NOT NULL,
  extra_payment_cents BIGINT NOT NULL DEFAULT 0,
  due_day             INT,           -- 1-31
  is_paid_off         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE debt_payments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  debt_id      UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  amount_cents BIGINT NOT NULL,
  paid_on      DATE NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Plans, check-ins, snapshots

```sql
CREATE TABLE payday_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  income_event_id UUID NOT NULL REFERENCES income_events(id) ON DELETE CASCADE,
  allocations     JSONB NOT NULL,   -- [{ bucket, label, suggested_cents, chosen_cents, ref_id }]
  status          TEXT NOT NULL DEFAULT 'draft',   -- 'draft'|'confirmed'
  confirmed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE checkins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start    DATE NOT NULL,
  steps_done    JSONB NOT NULL DEFAULT '{}',
  habit_choice  TEXT,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

-- One row per Safe to Spend computation. Powers "How is this calculated?",
-- a future trend chart, and debugging a number a user disputes.
CREATE TABLE calc_snapshots (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  computed_for          DATE NOT NULL,
  safe_today_cents      BIGINT NOT NULL,
  safe_period_cents     BIGINT NOT NULL,
  status                TEXT NOT NULL,
  runway_end_date       DATE,
  shortfall_cents       BIGINT,
  inputs                JSONB NOT NULL,
  breakdown             JSONB NOT NULL,
  engine_version        TEXT NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON calc_snapshots (user_id, computed_for DESC);

CREATE TABLE files (                       -- Phase 4, Cloudflare R2
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  r2_key       TEXT NOT NULL UNIQUE,
  kind         TEXT NOT NULL,              -- 'export'|'receipt'|'statement'
  content_type TEXT NOT NULL,
  size_bytes   BIGINT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## Data safety rules

1. **Row-level ownership is checked in the server layer on every query.** Every Drizzle query
   filters by `user_id` from the session. No exceptions, no "the UI wouldn't send that."
2. **Zod validates every input** before it reaches Drizzle: amounts are non-negative integers
   within a sane ceiling, dates are real dates, strings are length-capped.
3. **Demo users are real rows** with `is_demo = true`, cleaned up by a nightly job after 7 days idle.
4. **Delete account** runs a single `DELETE FROM users WHERE id = $1` — the cascades do the rest.
5. **No PII beyond email.** No SSN, no account numbers, no bank credentials, ever. If a field like
   that ever gets proposed, the answer is no.
