# MySQL Setup & Local Server Guide

## Prerequisites

- **MySQL Server 8.0+** installed and running
- **Python 3.10+** installed
- **Node.js 18+** (for frontend)

---

## Step 1: Install MySQL Server

### Windows:
1. Download from: https://dev.mysql.com/downloads/mysql/
2. Run the installer and follow the setup wizard
3. Choose "MySQL Server" and "MySQL Workbench"
4. Configure MySQL to run as a Windows Service
5. Set root password (remember it!)

### Verify Installation:
```powershell
mysql -u root -p
```
Enter your root password. You should see:
```
mysql>
```
Type `exit` to quit.

---

## Step 2: Create Database & User

Open MySQL and run:

```sql
-- Create database
CREATE DATABASE solaira_energy;

-- Create a dedicated user (recommended)
CREATE USER 'solaira'@'localhost' IDENTIFIED BY 'your_secure_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON solaira_energy.* TO 'solaira'@'localhost';
FLUSH PRIVILEGES;

-- Exit
EXIT;
```

---

## Step 3: Configure Environment Variables

Create a `.env` file in the `backend/` directory:

```env
MYSQL_HOST=localhost
MYSQL_USER=solaira
MYSQL_PASSWORD=your_secure_password
MYSQL_DATABASE=solaira_energy
```

---

## Step 4: Initialize Database Schema

Run the schema and seed scripts:

```powershell
cd backend

# Open MySQL and apply schema
mysql -u solaira -p solaira_energy < ..\database\schema.sql

# Seed sample data
mysql -u solaira -p solaira_energy < ..\database\seed.sql
```

Or use the Python initializer (if created):

```powershell
python scripts/init_mysql.py
```

Verify tables were created:
```powershell
mysql -u solaira -p solaira_energy -e "SHOW TABLES;"
```

You should see:
```
+---------------------------+
| Tables_in_solaira_energy  |
+---------------------------+
| anomalies                 |
| consumption_historic      |
| decisions                 |
| generation_actual         |
| predictions               |
| user_appliances           |
| vacation_dates            |
| weather_forecast          |
| weather_historic          |
| weekly_actions            |
+---------------------------+
```

---

## Step 5: Install Python Dependencies

```powershell
cd backend
pip install -r requirements.txt
```

If you hit issues with `numpy` on Python 3.13, use Python 3.10 or 3.11 instead.

---

## Step 6: Run the Orchestrator (Backend)

```powershell
cd backend

# Test the decision engine with fake data
python -m tests.decision_engine_smoke

# Run the full orchestrator (daily pipeline)
python orchestrator.py
```

Expected output:
```
[Orchestrator] Starting daily pipeline...
[Predictions] PV forecast: 45.2 kWh
[Predictions] Wind forecast: 12.8 kWh
[Predictions] Consumption forecast: 32.5 kWh
[Decisions] Battery bilan: +25.5 kWh
[Decisions] Microgrid action: STORE
[DB] Stored predictions for 2025-12-13
[DB] Stored decisions for 2025-12-13
```

---

## Step 7: Run the Frontend (Next.js)

```powershell
# Go to project root
cd ..

# Install dependencies
npm install

# Run dev server
npm run dev
```

Access at: **http://localhost:3000**

---

## Step 8: Create API Endpoints

Add the following to `pages/api/predictions/` and `pages/api/decisions/`:

**pages/api/predictions/today.js:**
```javascript
import { executeQuery } from '@/lib/mysql';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  
  try {
    const today = new Date().toISOString().split('T')[0];
    const predictions = await executeQuery(
      'SELECT * FROM predictions WHERE prediction_date = ?',
      [today]
    );
    res.status(200).json({ data: predictions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
```

**pages/api/decisions/today.js:**
```javascript
import { executeQuery } from '@/lib/mysql';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  
  try {
    const today = new Date().toISOString().split('T')[0];
    const decision = await executeQuery(
      'SELECT * FROM decisions WHERE decision_date = ?',
      [today]
    );
    res.status(200).json({ data: decision[0] || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
```

---

## Troubleshooting

### "Access denied for user 'solaira'@'localhost'"
- Verify password in `.env`
- Reset: `ALTER USER 'solaira'@'localhost' IDENTIFIED BY 'new_password';`

### "Can't connect to MySQL server"
- Check MySQL is running: `Get-Service MySQL80` (Windows)
- Start it: `net start MySQL80`

### Python mysql-connector errors
- Reinstall: `pip install --force-reinstall mysql-connector-python==8.0.33`

### Models not found errors
- Ensure `backend/inference/` has the `.onnx` and `.json` model files
- Check paths in `backend/config.py`

---

## Database Maintenance

### Backup:
```powershell
mysqldump -u solaira -p solaira_energy > backup_$(Get-Date -f yyyyMMdd).sql
```

### Restore:
```powershell
mysql -u solaira -p solaira_energy < backup_20251213.sql
```

### Monitor:
```sql
-- Check table sizes
SELECT TABLE_NAME, ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) AS SIZE_MB
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'solaira_energy'
ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC;

-- Check recent decisions
SELECT * FROM decisions ORDER BY decision_date DESC LIMIT 10;
```

---

## Summary

1. ✅ Install MySQL & create database
2. ✅ Set `.env` with credentials
3. ✅ Apply schema & seed data
4. ✅ Install Python dependencies
5. ✅ Run orchestrator
6. ✅ Start Next.js frontend
7. ✅ Access http://localhost:3000

**You're live!** 🚀
