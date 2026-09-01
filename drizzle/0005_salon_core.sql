ALTER TABLE products ADD COLUMN duration_minutes INTEGER NOT NULL DEFAULT 0;

ALTER TABLE products ADD COLUMN commission_percent INTEGER NOT NULL DEFAULT 0;

ALTER TABLE tickets ADD COLUMN client_id INTEGER;

ALTER TABLE tickets ADD COLUMN staff_id INTEGER;

ALTER TABLE tickets ADD COLUMN business_type TEXT NOT NULL DEFAULT 'restaurant';

CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  notes TEXT,
  last_visit TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staff (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  commission_percent INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  staff_id INTEGER NOT NULL,
  product_id INTEGER,
  service_name TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL CHECK (status IN ('confirmed', 'in_service', 'completed', 'cancelled')) DEFAULT 'confirmed',
  notes TEXT,
  total INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (staff_id) REFERENCES staff(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
CREATE INDEX IF NOT EXISTS idx_appointments_starts_at ON appointments(starts_at);
CREATE INDEX IF NOT EXISTS idx_appointments_staff_start ON appointments(staff_id, starts_at);
