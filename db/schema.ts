export const createProductsTable = `
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price INTEGER NOT NULL,
  station TEXT NOT NULL CHECK (station IN ('Barra', 'Cocina')),
  tag TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;

export const createTicketsTable = `
CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folio TEXT NOT NULL UNIQUE,
  table_name TEXT NOT NULL,
  cashier TEXT NOT NULL,
  payment TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  shift_id INTEGER,
  status TEXT NOT NULL CHECK (status IN ('paid', 'cancelled')) DEFAULT 'paid',
  cancelled_at TEXT,
  cancel_reason TEXT,
  cancelled_by TEXT,
  subtotal INTEGER NOT NULL,
  discount_amount INTEGER NOT NULL,
  tax INTEGER NOT NULL,
  tip_amount INTEGER NOT NULL,
  total INTEGER NOT NULL,
  FOREIGN KEY (shift_id) REFERENCES cash_shifts(id)
)`;

export const createTicketItemsTable = `
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
)`;

export const createTicketCreatedIndex = `
CREATE INDEX IF NOT EXISTS idx_tickets_created_at
ON tickets(created_at)`;

export const createTicketItemsTicketIndex = `
CREATE INDEX IF NOT EXISTS idx_ticket_items_ticket_id
ON ticket_items(ticket_id)`;

export const createCashShiftsTable = `
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
)`;

export const createCashMovementsTable = `
CREATE TABLE IF NOT EXISTS cash_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shift_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('in', 'out')),
  reason TEXT NOT NULL,
  amount INTEGER NOT NULL,
  cashier TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shift_id) REFERENCES cash_shifts(id) ON DELETE CASCADE
)`;

export const createOpenCashShiftIndex = `
CREATE INDEX IF NOT EXISTS idx_cash_shifts_open_status
ON cash_shifts(status)
WHERE status = 'open'`;

export const createCashMovementsShiftIndex = `
CREATE INDEX IF NOT EXISTS idx_cash_movements_shift_id
ON cash_movements(shift_id)`;

export const createTicketsShiftIndex = `
CREATE INDEX IF NOT EXISTS idx_tickets_shift_id
ON tickets(shift_id)`;

export const createTicketsStatusIndex = `
CREATE INDEX IF NOT EXISTS idx_tickets_status
ON tickets(status)`;

export const createOpenOrdersTable = `
CREATE TABLE IF NOT EXISTS open_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL UNIQUE,
  cashier TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'paid', 'cancelled')) DEFAULT 'open',
  opened_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;

export const createOpenOrderItemsTable = `
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
)`;

export const createKitchenCommandsTable = `
CREATE TABLE IF NOT EXISTS kitchen_commands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  station TEXT NOT NULL CHECK (station IN ('Barra', 'Cocina')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'ready', 'cancelled')) DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;

export const createKitchenCommandItemsTable = `
CREATE TABLE IF NOT EXISTS kitchen_command_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  command_id INTEGER NOT NULL,
  product_id INTEGER,
  name TEXT NOT NULL,
  qty INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  note TEXT,
  FOREIGN KEY (command_id) REFERENCES kitchen_commands(id) ON DELETE CASCADE
)`;

export const createOpenOrdersStatusIndex = `
CREATE INDEX IF NOT EXISTS idx_open_orders_status
ON open_orders(status)`;

export const createOpenOrderItemsOrderIndex = `
CREATE INDEX IF NOT EXISTS idx_open_order_items_order_id
ON open_order_items(order_id)`;

export const createKitchenCommandsStationIndex = `
CREATE INDEX IF NOT EXISTS idx_kitchen_commands_station_status
ON kitchen_commands(station, status)`;

export const createKitchenCommandItemsCommandIndex = `
CREATE INDEX IF NOT EXISTS idx_kitchen_command_items_command_id
ON kitchen_command_items(command_id)`;

export const initialProducts = [
  { name: "Americano", category: "Cafe", price: 42, station: "Barra", tag: "Caliente" },
  { name: "Latte", category: "Cafe", price: 58, station: "Barra", tag: "Popular" },
  { name: "Capuchino", category: "Cafe", price: 56, station: "Barra", tag: null },
  { name: "Cold Brew", category: "Cafe", price: 64, station: "Barra", tag: "Frio" },
  { name: "Chai Latte", category: "Bebidas", price: 62, station: "Barra", tag: null },
  { name: "Limonada Mineral", category: "Bebidas", price: 48, station: "Barra", tag: null },
  { name: "Croissant", category: "Panaderia", price: 46, station: "Cocina", tag: null },
  { name: "Pan Frances", category: "Desayunos", price: 118, station: "Cocina", tag: "Brunch" },
  { name: "Molletes", category: "Desayunos", price: 92, station: "Cocina", tag: null },
  { name: "Bagel Serrano", category: "Alimentos", price: 126, station: "Cocina", tag: null },
  { name: "Ensalada Verde", category: "Alimentos", price: 112, station: "Cocina", tag: null },
  { name: "Cheesecake", category: "Postres", price: 74, station: "Cocina", tag: null },
] as const;
