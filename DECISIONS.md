# DECISIONS.md — Architecture & Product Log

This document outlines the significant technical and product decisions made during the development of the Shared Expenses app, including the options considered and the rationale behind each choice.

## 1. Database: Raw MySQL vs. ORM
**Decision:** Use raw SQL queries via the `mysql2` package instead of an ORM (like Sequelize or Prisma).
**Options Considered:**
- Use Prisma for rapid schema prototyping and type safety.
- Use raw SQL for explicit control and performance.
**Why:** The assignment specifically tests the ability to handle complex relational logic (like date-gated queries for members who join/leave). Raw SQL ensures complete transparency in how these joins and filters are executed. It also avoids "magic" abstractions, fulfilling Rohan's requirement ("No magic numbers. I want to see exactly which expenses make that up").

## 2. The Import Pipeline: Fail-Fast vs. Review Dashboard
**Decision:** Build a 2-stage import pipeline with an interactive "Anomaly Review Dashboard".
**Options Considered:**
- Fail-fast: Reject the entire CSV if any row contains an error. (Too frustrating for users).
- Silent Auto-Fix: Guess the user's intent and commit it to the database silently. (Fails the assignment requirements).
- 2-Stage Pipeline: Parse the CSV, auto-fix trivial formatting (like trailing spaces), but flag all logical errors (missing amounts, duplicates) into a `pending` state for the user to review.
**Why:** This directly satisfies Meera's requirement ("Clean up the duplicates — but I want to approve anything the app deletes or changes"). By surfacing the anomalies to the UI, the user remains in complete control of imperfect data.

## 3. Membership Date Gating
**Decision:** Enforce a strict `expense_date >= joined_at AND (left_at IS NULL OR expense_date <= left_at)` condition on all balance queries.
**Options Considered:**
- Track membership statically (you are either in the group or not).
- Track membership dynamically using join/leave timestamps.
**Why:** Sam specifically requested: "I moved in mid-April. Why would March electricity affect my balance?" Tracking the exact dates a user was active in a group ensures that the balance engine dynamically excludes them from expenses that occurred outside their residency.

## 4. The Balance Algorithm (Minimal Transfers)
**Decision:** Implement a greedy "Minimal Transfer Algorithm" to settle group debts.
**Options Considered:**
- Directed Graph: Show exactly who owes who based on individual expenses. (Creates a messy web of dozens of small transactions).
- Greedy Settle-Up: Sum everyone's net balance first, then pair the person who owes the most with the person who is owed the most, iterating until all balances are zero.
**Why:** This directly addresses Aisha's request ("I just want one number per person. Who pays whom, how much, done.") The algorithm condenses hundreds of individual expense splits into a handful of clear, actionable settlement suggestions.

## 5. Currency Handling
**Decision:** Hardcode a standard exchange rate (1 USD = 83.50 INR) at the time of import/creation.
**Options Considered:**
- Store multi-currency balances and require users to settle in different currencies.
- Convert everything to a base currency (INR) immediately at the time of expense logging.
**Why:** Priya pointed out that half the trip was in dollars. By allowing a `currency` column in the CSV and converting it against a fixed `fx_rate` upon ingestion, the balance engine only ever has to deal with a single, unified integer (INR), preventing rounding errors and complex multi-currency debt graphs.

## 6. Frontend Framework: Vanilla React vs. UI Libraries
**Decision:** Use React (via Vite) with a custom, scratch-built CSS design system.
**Options Considered:**
- TailwindCSS or Material-UI for rapid styling.
- Vanilla CSS Modules with CSS Variables.
**Why:** Building a custom flat-design system using CSS variables ensures the application remains lightweight and proves fundamental frontend competency without relying on bulky third-party component libraries.
