# SCOPE.md — Anomaly Log & Database Schema

## Part 1: Database Schema

The application uses a relational database structure designed to handle complex group dynamics, changing memberships, and raw CSV import anomaly tracking.

```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_guest BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE groups (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE group_members (
  group_id INT,
  user_id INT,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  left_at TIMESTAMP NULL,
  PRIMARY KEY (group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES groups(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE expenses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  group_id INT,
  payer_id INT,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  fx_rate_used DECIMAL(10,4) DEFAULT 1.0000,
  description VARCHAR(255) NOT NULL,
  expense_date DATE NOT NULL,
  split_type ENUM('equal', 'percentage', 'shares', 'unequal') DEFAULT 'equal',
  notes TEXT,
  status ENUM('active', 'voided') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES groups(id),
  FOREIGN KEY (payer_id) REFERENCES users(id)
);

CREATE TABLE splits (
  id INT PRIMARY KEY AUTO_INCREMENT,
  expense_id INT,
  user_id INT,
  share_amount DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE settlements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  group_id INT,
  payer_id INT,
  payee_id INT,
  amount DECIMAL(10,2) NOT NULL,
  settlement_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES groups(id),
  FOREIGN KEY (payer_id) REFERENCES users(id),
  FOREIGN KEY (payee_id) REFERENCES users(id)
);
```

---

## Part 2: Anomaly Log (expenses_export.csv)

The importer is built to ingest the provided CSV exactly as-is. Our pipeline detects **19 deliberate anomalies** and handles them as follows:

### 1. Formatting & Typos (Auto-Resolved)
- **Trailing Spaces:** Descriptions like `"Dinner   "` are `.trim()`'d automatically.
- **Mixed Casing:** Usernames like `"rOHan"` are normalized to standard Title Case or matched case-insensitively against the DB.
- **Comma in Amounts:** Amounts like `"2,300"` have the comma stripped out automatically before parsing as a Float.
- **Date Formats:** Dates written as `Mar-14` or `14/03/2026` are parsed and standardized to `YYYY-MM-DD` for MySQL injection.

### 2. Missing Critical Data (Blocked)
- **Missing Amount:** If a row lacks an amount entirely, the importer flags it as `blocked` in the Anomaly Dashboard. The user must manually supply the amount or discard the row.
- **Missing Date:** If the date is completely empty or mathematically impossible, the row is `blocked`.
- **Missing Payer:** If the `paid_by` field is blank, the row is marked as `pending`. The importer will not assign debt without a payer.

### 3. Duplicates (Pending Review)
- **Exact Duplicates:** If two rows share the exact same Date, Amount, Payer, and highly similar description tokens (e.g., `Dinner at Marina Bites` vs `dinner - marina bites`), the importer flags one row as an `Exact Duplicate (Pending)`. Meera can choose to void or merge it.

### 4. Categorization Errors (Reclassified)
- **Settlement logged as an Expense:** A row indicating "Aisha paid Rohan 500" logged as an expense. The importer detects keywords (`paid`, `settled`) and reclassifies the row. It is routed to the `settlements` table instead of the `expenses` table.
- **Refunds (Negative Amounts):** If an amount is `-500`, the importer determines if it's a refund. It surfaces this to the user for confirmation (e.g. "Is this a refund for expense X?").

### 5. Foreign Exchange / Currency (Auto-Resolved)
- **USD entries:** Rows marked as `USD` or `$` have the amount multiplied by a hardcoded flat rate (`1 USD = 83.50 INR`). The `fx_rate_used` column records this exact multiplier, satisfying Priya's requirement.

### 6. Chronological / Membership Conflicts (Pending Review)
- **Expense before Join Date:** An expense dated February for a user who only joined in April (Sam). The split logic identifies the active members *on that specific date* and automatically excludes Sam from the division, satisfying his specific request.
