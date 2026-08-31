CREATE TABLE IF NOT EXISTS cash_shifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  opened_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TEXT,
  cashier TEXT NOT NULL,
  opening_cash INTEGER NOT NULL,
  closing_cash INTEGER,
  expected_cash INTEGER,
  notes TEXT,
  status TEXT NOT NULL CHECK (status IN ('open', 'closed')) DEFAULT 'open'
);

CREATE TABLE IF NOT EXISTS cash_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shift_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('in', 'out')),
  reason TEXT NOT NULL,
  amount INTEGER NOT NULL,
  cashier TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shift_id) REFERENCES cash_shifts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cash_shifts_open_status
ON cash_shifts(status)
WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_cash_movements_shift_id
ON cash_movements(shift_id);

ALTER TABLE tickets ADD COLUMN shift_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_tickets_shift_id
ON tickets(shift_id);
