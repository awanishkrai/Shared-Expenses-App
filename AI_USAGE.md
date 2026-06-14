# AI_USAGE.md

## Tools Used
- **ChatGPT (GPT-4)** — Used as a rubber-duck debugger and for quick syntax lookups during development.

## How AI Was Used
I wrote the app's architecture, schema, and core logic by hand. I used ChatGPT in a few specific spots:
- **Debugging MySQL errors:** When my balance engine queries threw table-not-found errors, I pasted the error message into ChatGPT to help me spot the typo faster.
- **CSS layout suggestions:** I asked ChatGPT for CSS grid layout ideas for the dashboard card grid and the balance visualization.
- **Regex for CSV parsing:** I asked for help writing the regex pattern that normalizes date formats like `Mar-14` or `14/03/2026` into `YYYY-MM-DD`.

## 3 Cases Where AI Got It Wrong

### 1. Wrong table name in JOIN
I asked ChatGPT to help debug a failing SQL query. It suggested the table was called `expense_splits`, but my schema actually named it `splits`. I caught this by reading the error log and cross-referencing my `schema.sql`. Fixed it myself.

### 2. Bash syntax on Windows
When I asked for a quick command to scaffold the React app, ChatGPT gave me a bash-chained command with `&&`. That doesn't work in PowerShell. I just ran the commands one at a time instead.

### 3. Overcomplicated CSS suggestion
I asked for styling ideas and it suggested heavy glassmorphism with `backdrop-filter: blur()` and gradient overlays everywhere. Looked terrible for a financial app. I scrapped it and went with a clean flat dark theme using solid backgrounds and simple borders.
