CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price INTEGER NOT NULL,
  station TEXT NOT NULL CHECK (station IN ('Barra', 'Cocina')),
  tag TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folio TEXT NOT NULL UNIQUE,
  table_name TEXT NOT NULL,
  cashier TEXT NOT NULL,
  payment TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  subtotal INTEGER NOT NULL,
  discount_amount INTEGER NOT NULL,
  tax INTEGER NOT NULL,
  tip_amount INTEGER NOT NULL,
  total INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS ticket_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  product_id INTEGER,
  name TEXT NOT NULL,
  qty INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  station TEXT NOT NULL,
  note TEXT,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tickets_created_at
ON tickets(created_at);

CREATE INDEX IF NOT EXISTS idx_ticket_items_ticket_id
ON ticket_items(ticket_id);

PRAGMA optimize;
