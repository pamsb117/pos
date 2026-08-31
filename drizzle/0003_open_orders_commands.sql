CREATE TABLE IF NOT EXISTS open_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL UNIQUE,
  cashier TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'paid', 'cancelled')) DEFAULT 'open',
  opened_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS open_order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  qty INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  station TEXT NOT NULL,
  note TEXT,
  FOREIGN KEY (order_id) REFERENCES open_orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS kitchen_commands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  station TEXT NOT NULL CHECK (station IN ('Barra', 'Cocina')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'ready', 'cancelled')) DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kitchen_command_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  command_id INTEGER NOT NULL,
  product_id INTEGER,
  name TEXT NOT NULL,
  qty INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  note TEXT,
  FOREIGN KEY (command_id) REFERENCES kitchen_commands(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_open_orders_status
ON open_orders(status);

CREATE INDEX IF NOT EXISTS idx_open_order_items_order_id
ON open_order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_kitchen_commands_station_status
ON kitchen_commands(station, status);

CREATE INDEX IF NOT EXISTS idx_kitchen_command_items_command_id
ON kitchen_command_items(command_id);
