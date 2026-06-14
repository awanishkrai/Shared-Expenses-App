# AI_USAGE.md

## Tools Used
- **Claude** — Used as a rubber-duck debugger and for quick syntax lookups during development.

## How AI Was Used
I wrote the app's architecture, schema, and core logic by hand. I used Claude in a few specific spots:
- **Debugging MySQL errors:** When my backend queries threw database errors, I pasted the error message into Claude to help me spot typos or syntax issues faster.
- **CSS layout suggestions:** I asked Claude for CSS grid layout ideas for the dashboard card grid and the balance visualization.
- **Regex for CSV parsing:** I asked for help writing the regex pattern that normalizes date formats like `Mar-14` or `14/03/2026` into `YYYY-MM-DD`.

## 3 Cases Where AI Got It Wrong

### 1. Column name `username` instead of `name`
Claude suggested queries and models that assumed the users table used `name` for the username column, but my actual schema uses `username` throughout. I caught this by reading the database error logs during startup, and fixed it across the codebase using `sed`.

### 2. Table name `splits` instead of `expense_splits`
I asked Claude to help debug a failing SQL query for the importer. It suggested an insert query targeting a table called `expense_splits`, but my schema actually named it `splits`. I caught this by reading the error log and cross-referencing my `schema.sql`. Fixed it myself.

### 3. Reserved word `row_number` used as column name
While designing the anomalies table, Claude suggested using `row_number` as a column to track the CSV row. MariaDB rejected it because `row_number` is a reserved SQL keyword. I caught this during the initial table creation and renamed the column to `row_num`.
