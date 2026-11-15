CREATE TABLE IF NOT EXISTS alert_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  source_account_id TEXT NOT NULL,
  place_name TEXT NOT NULL,
  system_name TEXT NOT NULL,
  zone_number TEXT,
  zone_name TEXT NOT NULL,
  event_name TEXT NOT NULL,
  delivered_at TEXT NOT NULL
);