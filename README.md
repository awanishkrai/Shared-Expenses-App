# Shared Expenses

Hey there!  Welcome to **Shared Expenses**, a full-stack web app I built to help friends track bills, split costs, and figure out exactly who owes who without the headache. 

It's essentially a custom alternative to Splitwise or Tricount. I built this from the ground up because I wanted complete control over our data—especially when it comes to importing big, messy CSV exports from other apps.

##  What makes it special?

- **Minimal Transfer Algorithm:** No more "I pay you $5, you pay him $5". The backend balance engine calculates the absolute minimum number of transactions needed for everyone in a group to settle up perfectly.
- **Smart CSV Imports:** Migrating from another app or your bank? The custom import pipeline automatically catches and fixes common typos (like trailing spaces, mixed casings, or comma-separated numbers) and flags bigger issues in a beautiful "Anomaly Review Dashboard" before anything hits the database.
- **Date-Gated Memberships:** It strictly enforces when people joined or left a group, so nobody accidentally splits the cost of a dinner that happened before they were even added.
- **Raw SQL:** The backend entirely skips heavy ORMs in favor of raw, optimized SQL queries using `mysql2` to keep things brutally fast and completely transparent.

## 🛠️ The Tech Stack

- **Frontend:** React (powered by Vite) with a custom, sleek dark-mode design system built from scratch in vanilla CSS.
- **Backend:** Node.js & Express.
- **Database:** MySQL.
- **Auth:** Custom JWT-based authentication.
- **AI Assist:** ChatGPT (GPT-4) used for debugging and CSS suggestions. See `AI_USAGE.md` for details.

##  Running it locally

### 1. Database Setup
Make sure you have MySQL running. Create a database called `shared_expenses` and run the table creation queries found in `schema.sql` (or inside the `src/models/` folder) to set up your tables.

### 2. Start the Backend
Open your terminal in the root directory:
```bash
# Install dependencies
npm install

# Create a .env file with your DB credentials
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=yourpassword
# DB_NAME=shared_expenses
# JWT_SECRET=your_super_secret_key

# Start the Express server (runs on port 5000)
npm run dev
```

### 3. Start the Frontend
Open a new terminal tab and navigate to the client folder:
```bash
cd client

# Install frontend dependencies
npm install

# Start the Vite dev server
npm run dev
```

The app should now be running at `http://localhost:5173`. Go ahead and create your first group!

---
*Built over an incredibly productive weekend.* ☕️
