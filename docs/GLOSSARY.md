# Plain-English Glossary

Every word in this repo that might be new, explained the way I'd explain it to a friend.
Skim it once now; come back when a term shows up.

---

## The building blocks

**Repository (repo)** — the folder holding all the project's files, with a full history of every
change. Ours is `AIPassiveProfit/moneyrunway` on GitHub. Like a recipe binder that remembers every
edit you ever made.

**Branch** — a copy of the project where you can make changes without touching the working version.
Ours is `claude/app-research-roadmap-9gqaez`. Like testing a new dish on a side burner before it
goes on the menu.

**Commit** — a saved checkpoint with a note about what changed. You can always go back to one.

**Push** — sending your commits from this computer up to GitHub so they're safe and shareable.

**Pull request (PR)** — a formal "here are my changes, please review before merging."

---

## The stack

**Framework** — a starter kit that handles the boring 80% (routing, forms, rendering) so you write
only your 20%. **Next.js** is ours.

**TypeScript** — JavaScript with labels on everything. If you try to put a date where a dollar
amount goes, it stops you before the app ever runs. Fewer money bugs.

**Tailwind CSS** — styling by putting small class names right on the element (`text-lg font-bold`)
instead of maintaining a separate stylesheet. Faster, and much harder to break by accident.

**shadcn/ui** — free, well-made components (buttons, cards, sliders, sheets) that get **copied into
our project** rather than installed as a black box. We own them and restyle them to the brand.

**Component** — a reusable piece of screen. The Safe to Spend card is a component. Build it once,
use it anywhere.

**Postgres** — the database: the walk-in cooler where all the data lives, on labeled shelves.

**ORM (Drizzle)** — a translator between our code and the database, so we write TypeScript instead
of raw SQL and can't fat-finger a query.

**Migration** — a numbered instruction file that changes the database's shape (add a table, add a
column). Run in order, they turn an empty database into ours. Like a remodeling permit — written
down, dated, reversible.

**Schema** — the blueprint of the database: what tables exist, what columns they have.

**API** — the way one program asks another for something. When our app asks Postgres for your
bills, that's an API call.

**Server Action** — a Next.js feature that lets a button on the page safely run code on the server
(like saving to the database) without us hand-building an API endpoint.

---

## Deployment and infrastructure

**Deploy** — putting the app on the internet where people can use it.

**Railway** — the company that runs our app and our database. Push code, it builds and hosts it.

**CLI** — Command Line Interface. A tool you type at instead of click. `railway up` deploys the app.

**Environment variable** — a secret setting (like the database password) kept outside the code so
it never ends up on GitHub. `DATABASE_URL` is one.

**Cloudflare R2** — file storage for things that aren't data-shaped: PDFs, images, exports.
S3-compatible, with no charge for downloads.

**Presigned URL** — a temporary, expiring link that lets a browser upload or download one specific
file directly from R2 without our server touching it or handing out permanent keys.

**PWA (Progressive Web App)** — a website that installs to a phone's home screen and behaves like
a native app. Gets us an "app" without the App Store.

---

## The product words

**Safe to Spend** — our hero number. Money you have, minus everything already spoken for before
your next payday.

**Runway** — how long your current money lasts. Borrowed from startups ("we have 8 months of
runway"), and it fits a paycheck perfectly.

**Sinking fund** — money set aside a little at a time for a known future expense (Christmas, car
repairs, insurance). The opposite of an emergency fund: you *know* this one is coming.

**Envelope** — a spending limit for a category (groceries, gas), named after the old cash-in-
envelopes method.

**Snowball vs avalanche** — two ways to attack debt. Snowball: smallest balance first (more wins,
more momentum). Avalanche: highest interest rate first (less total interest). Both are valid;
the app shows both and lets the user pick.

**Basis points (bps)** — a hundredth of a percent. We store percentages as whole numbers this way
(2500 bps = 25%) so decimals can never round wrong.

**Cents (integer money)** — we store $14.50 as `1450`, never as `14.50`. Computers make tiny errors
with decimals; with whole numbers they don't. Non-negotiable in a money app.

**RRULE** — the calendar standard for "repeats every 2nd Friday." Google Calendar uses it too.
We use the `rrule` library so we never write that date math ourselves.

---

## Testing words

**Unit test** — checks one small piece in isolation. "Given $1,000 and a $900 bill, does the engine
return $100?" Runs in milliseconds.

**Smoke test** — the quickest possible check: does it turn on without smoking? Page loads, no
errors, key things visible.

**Integration test** — checks that the pieces work *together* with a real database.

**End-to-end (E2E) test** — drives a real browser like a real person: click, type, verify.
Playwright does this.

**Mocked** — using fake stand-in data instead of the real thing, so a test runs fast and the same
way every time.

**Headless** — a browser running with no visible window. Same behavior, no screen, much faster.
That's how tests run in CI.

**CI (Continuous Integration)** — a robot that runs all the tests automatically every time we push.

**Regression** — something that used to work and now doesn't. Tests exist mostly to catch these.

---

## AI-agent workflow words

**Agent** — an AI given a specific job and a specific set of tools. A "code reviewer" agent only
reviews; it doesn't write features.

**Subagent** — an agent I spin up to handle one task while I keep working. Like a line cook.

**MCP (Model Context Protocol)** — the standard plug that lets an AI use an outside service
(GitHub, Notion, Slack) as a tool. Like a universal outlet for AI.

**Skill / plugin** — a packaged set of instructions that teaches Claude Code a specific workflow.
Superpowers, GSD, and metaswarm are all this.

**Spec-driven development** — write down exactly what you want in plain English *first*, then
generate code from it. It's the whole reason this PRD exists before any code.

**Worktree** — a separate copy of the project on its own branch, so risky work happens in an
isolated space and can be thrown away cleanly.

**Vibe coding** — describing what you want in normal language and steering the AI that builds it.
The skill is not typing code; it's knowing what to ask for, what to reject, and when something
smells wrong. That's what this repo is designed to teach you.
