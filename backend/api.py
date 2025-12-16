"""FastAPI service exposing energy data for frontend.

Endpoints:
- GET /predictions (latest)
- GET /decisions (latest)
- GET /history?days=7
- GET /anomalies?days=7
- POST /actions (capture user action/intention)

Run (dev):
  & "backend/.venv/Scripts/python.exe" -m uvicorn backend.api:app --reload --port 8000
"""

from __future__ import annotations

import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
import subprocess
import os
from typing import Optional

from fastapi import FastAPI, HTTPException

DB_PATH = Path(__file__).parent.parent / "database" / "energy.db"
USER_ACTIONS_SCHEMA = """
CREATE TABLE IF NOT EXISTS user_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    payload TEXT
);
"""

USER_APPLIANCES_SCHEMA = """
CREATE TABLE IF NOT EXISTS user_appliances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    power_kwh REAL NOT NULL,
    is_schedulable INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);
"""

WEEKLY_ACTIONS_SCHEMA = """
CREATE TABLE IF NOT EXISTS weekly_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    power_kwh REAL NOT NULL,
    preferred_time TEXT DEFAULT '10:00',
    week_start TEXT,
    week_end TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
"""

VACATION_DATES_SCHEMA = """
CREATE TABLE IF NOT EXISTS vacation_dates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);
"""
USER_ACTIONS_SCHEMA = """
CREATE TABLE IF NOT EXISTS user_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    payload TEXT
);
"""

app = FastAPI(title="Energy API", version="0.1.0")


def _conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    # Ensure supporting tables exist so POST endpoints never fail on a fresh DB
    conn.execute(USER_ACTIONS_SCHEMA)
    conn.execute(USER_APPLIANCES_SCHEMA)
    conn.execute(WEEKLY_ACTIONS_SCHEMA)
    conn.execute(VACATION_DATES_SCHEMA)
    return conn


def _latest_date(conn, table: str, column: str = "prediction_date") -> Optional[str]:
    cur = conn.cursor()
    cur.execute(f"SELECT {column} FROM {table} ORDER BY {column} DESC LIMIT 1")
    row = cur.fetchone()
    return row[0] if row else None


@app.get("/predictions")
def get_predictions():
    conn = _conn()
    date = _latest_date(conn, "predictions", "prediction_date")
    if not date:
        raise HTTPException(status_code=404, detail="No predictions available")
    cur = conn.cursor()
    cur.execute(
        """
        SELECT source_type, panel_or_source_id, predicted_value_kwh, error_margin_kwh
        FROM predictions
        WHERE prediction_date = ?
        ORDER BY source_type, panel_or_source_id
        """,
        (date,),
    )
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()

    payload = {"date": date, "pv": [], "wind_tree": None, "consumption": None}
    for r in rows:
        if r["source_type"] == "pv":
            payload["pv"].append(
                {
                    "panel_id": r["panel_or_source_id"],
                    "value": r["predicted_value_kwh"],
                    "error_margin": r["error_margin_kwh"],
                }
            )
        elif r["source_type"] == "wind_tree":
            payload["wind_tree"] = {
                "value": r["predicted_value_kwh"],
                "error_margin": r["error_margin_kwh"],
            }
        elif r["source_type"] == "consumption":
            payload["consumption"] = {
                "value": r["predicted_value_kwh"],
                "error_margin": r["error_margin_kwh"],
            }
    return payload


@app.get("/decisions")
def get_decisions():
    conn = _conn()
    date = _latest_date(conn, "decisions", "decision_date")
    if not date:
        raise HTTPException(status_code=404, detail="No decisions available")
    cur = conn.cursor()
    cur.execute("SELECT * FROM decisions WHERE decision_date = ?", (date,))
    row = cur.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="No decisions available")
    return dict(row)


@app.get("/history")
def get_history(days: int = 7):
    conn = _conn()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT date, source_type, panel_id, total_kwh
        FROM generation_actual
        WHERE date >= date('now', ?)
        ORDER BY date, source_type, panel_id
        """,
        (f"-{days} days",),
    )
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


@app.get("/anomalies")
def get_anomalies(days: int = 7):
    conn = _conn()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT * FROM anomalies
        WHERE detection_date >= date('now', ?)
        ORDER BY detection_date DESC
        """,
        (f"-{days} days",),
    )
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


@app.post("/actions")
def post_action(action: dict):
    """Capture a user-requested action (e.g., export/import preference). Stored minimally."""
    conn = _conn()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO user_actions (created_at, payload)
        VALUES (?, ?)
        """,
        (datetime.utcnow().isoformat(sep=" "), str(action)),
    )
    conn.commit()
    conn.close()
    return {"status": "ok"}


@app.get("/status")
def status():
    conn = _conn()
    pred_date = _latest_date(conn, "predictions", "prediction_date")
    dec_date = _latest_date(conn, "decisions", "decision_date")
    conn.close()
    return {"status": "ok", "last_prediction": pred_date, "last_decision": dec_date}


@app.post("/appliances")
def add_appliance(payload: dict):
    """Add a user appliance (machine)."""
    name = payload.get("name")
    power_kwh = payload.get("power_kwh")
    is_schedulable = payload.get("is_schedulable", True)
    if not name or power_kwh is None:
        raise HTTPException(status_code=400, detail="name and power_kwh are required")

    conn = _conn()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO user_appliances (name, power_kwh, is_schedulable)
        VALUES (?, ?, ?)
        """,
        (str(name), float(power_kwh), 1 if bool(is_schedulable) else 0),
    )
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return {"id": new_id, "name": name, "power_kwh": float(power_kwh), "is_schedulable": bool(is_schedulable)}


@app.post("/weekly-actions")
def add_weekly_action(payload: dict):
    """Add a scheduled action for the current week (e.g., run a machine)."""
    name = payload.get("name")
    power_kwh = payload.get("power_kwh")
    preferred_time = payload.get("preferred_time", "10:00")
    week_start = payload.get("week_start")
    week_end = payload.get("week_end")
    if not all([name, power_kwh, week_start, week_end]):
        raise HTTPException(status_code=400, detail="name, power_kwh, week_start, week_end are required")

    conn = _conn()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO weekly_actions (name, power_kwh, preferred_time, week_start, week_end)
        VALUES (?, ?, ?, ?, ?)
        """,
        (str(name), float(power_kwh), str(preferred_time), str(week_start), str(week_end)),
    )
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return {
        "id": new_id,
        "name": name,
        "power_kwh": float(power_kwh),
        "preferred_time": preferred_time,
        "week_start": week_start,
        "week_end": week_end,
    }


@app.post("/vacations")
def add_vacation(payload: dict):
    """Add a vacation window; consumption will be scaled by VACATION_COEFFICIENT when tomorrow is within this window."""
    start_date = payload.get("start_date")
    end_date = payload.get("end_date")
    if not all([start_date, end_date]):
        raise HTTPException(status_code=400, detail="start_date and end_date are required")

    conn = _conn()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO vacation_dates (start_date, end_date)
        VALUES (?, ?)
        """,
        (str(start_date), str(end_date)),
    )
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return {"id": new_id, "start_date": start_date, "end_date": end_date}


def _python_exe() -> str:
    # Resolve venv python adjacent to backend folder
    venv_py = Path(__file__).resolve().parent / ".venv" / "Scripts" / "python.exe"
    if venv_py.exists():
        return str(venv_py)
    # Fallback to system python
    return "python"


def _launch_module(module: str, env: dict | None = None) -> int:
    cmd = [_python_exe(), "-m", module]
    merged_env = os.environ.copy()
    if env:
        merged_env.update(env)
    proc = subprocess.Popen(cmd, cwd=Path(__file__).resolve().parent.parent, env=merged_env)
    return proc.pid


@app.post("/run-orchestrator")
def run_orchestrator(payload: dict | None = None):
    """
    Trigger a one-off orchestrator run (non-blocking).
    Optional payload keys:
      - battery_soc: float (0-100)
      - latitude: float
      - longitude: float
      - location_name: str
    """
    env = {}
    if payload:
        if "battery_soc" in payload:
            env["CURRENT_BATTERY_SOC"] = str(payload["battery_soc"])
        if "latitude" in payload:
            env["LATITUDE"] = str(payload["latitude"])
        if "longitude" in payload:
            env["LONGITUDE"] = str(payload["longitude"])
        if "location_name" in payload:
            env["LOCATION_NAME"] = str(payload["location_name"])

    pid = _launch_module("backend.orchestrator", env=env)
    return {"status": "started", "pid": pid, "env": env}


@app.post("/run-continuous-learning")
def run_continuous_learning():
    """Trigger a one-off continuous learning run (non-blocking)."""
    pid = _launch_module("backend.continuous_learning")
    return {"status": "started", "pid": pid}
