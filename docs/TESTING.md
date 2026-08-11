# Testing: Levels 0 → 5

**The idea:** taste the food before it goes out. Cheap, fast checks run constantly; expensive,
thorough checks run at the gate before a phase ships.

Restaurant version: Level 1 is "does the plate have food on it." Level 5 is the health inspector.
You do not call the health inspector every time you make a sandwich, but you never open without one.

---

## Level 0 — Recording tests with Playwright CRX (your tool)

**What it is:** [Playwright CRX](https://chromewebstore.google.com/detail/playwright-crx/jambeljnbnfbkcpnoiaedcabbgmnnlcd)
is a Chrome extension that watches you click through the app and writes the test code for you.
No coding involved.

**Why it matters for you specifically:** this is how a non-developer produces real tests.
You use the app the way a customer would; the extension writes down exactly what you did;
we commit that script and it re-runs automatically forever, catching anything that breaks later.

**How to use it (I will walk you through this live at Phase 0):**
1. Install the extension from the Chrome Web Store.
2. Open the Money Runway URL in a tab.
3. Click the Playwright CRX toolbar button to attach the recorder.
4. Do the thing you want to test — for example: load the dashboard, tap "rent," change it to
   $1,200, confirm the Safe to Spend number changed.
5. Add an assertion (the extension has a button for "check this text is visible").
6. Copy the generated script, paste it into `tests/e2e/`, and it becomes a permanent test.

**Caveat:** CRX drives one tab at a time and is meant for recording and exploring. The recorded
scripts are then run headless in CI by `@playwright/test`.

**Pytest's role:** `pytest` + `playwright-python` runs black-box tests against the **deployed
Railway URL**. It does not care that the app is TypeScript — it just opens a browser and checks
the real, live site. That is our "is production actually up and correct" layer.

```bash
pip install pytest pytest-playwright && playwright install chromium
BASE_URL=https://moneyrunway.up.railway.app pytest tests/smoke -v
```

---

## Level 1 — Smoke test (every commit, ~10 seconds)

The three questions: **does it load, does it error, is the important thing on screen?**

```python
# tests/smoke/test_dashboard_loads.py
def test_dashboard_loads(page, base_url):
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

    page.goto(base_url, wait_until="networkidle")

    assert page.get_by_test_id("safe-to-spend-amount").is_visible()
    assert page.get_by_test_id("money-runway-card").is_visible()
    assert page.get_by_test_id("next-best-action").is_visible()
    assert errors == [], f"JavaScript errors on load: {errors}"
```

Checklist:
- [ ] Page returns HTTP 200
- [ ] Zero JavaScript errors, zero console errors
- [ ] Safe to Spend number is visible and is a real dollar amount
- [ ] All five dashboard cards render
- [ ] Loads in under 3 seconds on a simulated 4G phone
- [ ] Nothing scrolls sideways at 375px wide (the iPhone SE test)

---

## Level 2 — Functional tests (Playwright, mocked data)

Real browser, fake data. Fast and deterministic — no database, no network.

Phase 0 coverage:
- [ ] Demo data loads and Safe to Spend equals the value the engine predicts
- [ ] Tapping the rent amount opens the edit sheet
- [ ] Changing rent from $1,450 → $1,200 raises Safe to Spend by exactly $250 over the period
- [ ] Setting a balance low enough turns the card red and shows the shortfall message
- [ ] "How is this calculated?" lists every subtraction and the lines sum to the total
- [ ] Every interactive target is at least 44×44 px
- [ ] Keyboard-only user can reach and operate every control

Alongside these, **Vitest unit tests** cover the calc engine — all 12 cases in
[CALCULATIONS.md §8](CALCULATIONS.md#8-test-cases-the-engine-must-pass-write-these-first).
Those are the tests we write **first**, before any UI exists. If the math is wrong, nothing else matters.

---

## Level 3 — Integration tests (Playwright, real database, real APIs)

Runs against a real Railway preview environment with a real Postgres.

- [ ] Complete onboarding end to end → data persists in Postgres
- [ ] Reload the page → your numbers are still there
- [ ] Add a monthly bill → the right occurrences appear on the right dates for 4 months
- [ ] Mark one occurrence paid → only that one changes, the series is intact
- [ ] Magic link login → email arrives → clicking it signs you in (Phase 2)
- [ ] Anonymous account → claim with email → no data is lost
- [ ] Delete account → the row and all cascaded rows are actually gone (verified by SQL)
- [ ] Migrations run cleanly on a fresh database

---

## Level 4 — QA gate (end of each phase)

**Code quality**
- [ ] TypeScript strict mode, zero `any` in the calc engine
- [ ] Lint and format clean
- [ ] No secrets in the repo (`.env` gitignored, verified)
- [ ] Every money value is an integer cent — grep for `parseFloat` and `Number(` on money paths
- [ ] The calc engine imports nothing from the database layer

**Error handling**
- [ ] Every form shows a human error message, never a stack trace
- [ ] Server action failures roll back and tell the user what to do next
- [ ] Divide-by-zero, empty state, and "no income entered" all render something helpful
- [ ] A debt whose payment never covers interest shows the NEVER message, not `Infinity`

**Database**
- [ ] Indexes exist on every `user_id` and every date column used in a filter
- [ ] Foreign keys cascade correctly (tested by actually deleting a user)
- [ ] Migrations are reversible, or the irreversibility is documented
- [ ] No N+1 queries on the dashboard — it should be ≤ 5 queries total

**Performance**
- [ ] Dashboard Time to Interactive under 2.5s on a mid-range Android over 4G
- [ ] Calc engine runs in under 50ms for a 90-day horizon
- [ ] Lighthouse mobile: Performance ≥ 90, Accessibility ≥ 95
- [ ] Bundle under 200KB gzipped for the dashboard route

---

## Level 5 — Security gate (end of each phase)

**Input validation**
- [ ] Zod schema on every server action and route handler; nothing trusts the client
- [ ] Amounts bounded (≥ 0, ≤ $100,000,000), dates real, strings length-capped
- [ ] Drizzle parameterizes everything — zero raw SQL string concatenation
- [ ] Any user text rendered as text, never as HTML (XSS)

**Authentication and authorization**
- [ ] Every query filters by the session's `user_id` — the highest-risk bug in this whole app
      is showing user A's money to user B
- [ ] Try to fetch another user's bill by guessing its UUID → must 404, not 403 with data
- [ ] Sessions in httpOnly + Secure + SameSite=Lax cookies
- [ ] Magic link tokens are single-use and expire in ≤ 15 minutes
- [ ] Rate limiting on login and magic-link sending

**Data protection**
- [ ] TLS everywhere (Railway does this by default — verify, don't assume)
- [ ] No financial data in logs, error reports, or analytics events
- [ ] Delete account really deletes (verified with a SQL query after)
- [ ] R2 buckets are private; access only through short-lived presigned URLs (Phase 4)
- [ ] Dependency audit clean (`npm audit`), no known-vulnerable packages
- [ ] Security headers set: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy

**Compliance**
- [ ] The "not financial advice" disclaimer is visible in onboarding and Settings
- [ ] Privacy policy states plainly: no bank connections, no data selling, no third-party sharing

---

## What runs when

| Trigger | Levels |
| --- | --- |
| Every save while coding | Vitest unit tests (watch mode) |
| Every commit | Levels 1 + 2 |
| Every push to the branch | Levels 1 + 2 + 3 |
| End of a phase, before deploy | Levels 4 + 5 |
| After every production deploy | Level 1 against the live URL (Pytest) |

---

## The one number that matters

**The calc engine must be right, always.** A budgeting app that tells someone they have $200 safe
to spend when they actually have $20 causes a real overdraft fee for a real person who cannot
afford it. That is why the engine gets pure-function unit tests, why the tests are written first,
and why it is the one place in this codebase where we are allowed to be slow and careful.
