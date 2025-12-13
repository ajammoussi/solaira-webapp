import os
import sqlite3


def apply_sql_file(db_path: str, sql_file_path: str) -> None:
    if not os.path.exists(sql_file_path):
        raise FileNotFoundError(f"SQL file not found: {sql_file_path}")

    with open(sql_file_path, "r", encoding="utf-8") as f:
        sql = f.read()

    # Ensure directory exists for DB
    os.makedirs(os.path.dirname(db_path), exist_ok=True)

    conn = sqlite3.connect(db_path)
    try:
        conn.executescript(sql)
        conn.commit()
    finally:
        conn.close()


def main():
    # Default locations relative to repo root
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    db_path = os.path.join(repo_root, "database", "energy.db")
    schema_path = os.path.join(repo_root, "database", "schema.sql")
    seed_path = os.path.join(repo_root, "database", "seed.sql")

    print(f"Applying schema: {schema_path} -> {db_path}")
    apply_sql_file(db_path, schema_path)

    if os.path.exists(seed_path):
        print(f"Applying seed data: {seed_path}")
        apply_sql_file(db_path, seed_path)

    print("SQLite initialization complete.")


if __name__ == "__main__":
    main()
