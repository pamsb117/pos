import { env } from "cloudflare:workers";
import {
  createCashMovementsShiftIndex,
  createCashMovementsTable,
  createCashShiftsTable,
  createKitchenCommandItemsCommandIndex,
  createKitchenCommandItemsTable,
  createKitchenCommandsStationIndex,
  createKitchenCommandsTable,
  createOpenOrderItemsOrderIndex,
  createOpenOrderItemsTable,
  createOpenOrdersStatusIndex,
  createOpenOrdersTable,
  createOpenCashShiftIndex,
  createProductsTable,
  createTicketCreatedIndex,
  createTicketItemsTable,
  createTicketItemsTicketIndex,
  createTicketsStatusIndex,
  createTicketsTable,
  createTicketsShiftIndex,
  initialProducts,
} from "./schema";

export type ProductRecord = {
  id: number;
  name: string;
  category: string;
  price: number;
  station: "Barra" | "Cocina";
  tag: string | null;
};

export type ProductInput = {
  id?: number;
  name: string;
  category: string;
  price: number;
  station: "Barra" | "Cocina";
  tag?: string | null;
};

export type TicketItemInput = ProductRecord & {
  qty: number;
  note?: string;
};

export type TicketInput = {
  table: string;
  cashier: string;
  payment: string;
  createdAt?: string;
  items: TicketItemInput[];
  totals: {
    subtotal: number;
    discountAmount: number;
    tax: number;
    tipAmount: number;
    total: number;
  };
};

export type TicketRecord = {
  folio: string;
  table: string;
  cashier: string;
  payment: string;
  createdAt: string;
  status: "paid" | "cancelled";
  cancelReason?: string | null;
  items: TicketItemInput[];
  totals: TicketInput["totals"];
};

export type CashShiftRecord = {
  id: number;
  openedAt: string;
  closedAt: string | null;
  cashier: string;
  openingCash: number;
  closingCash: number | null;
  expectedCash: number | null;
  notes: string | null;
  status: "open" | "closed";
};

export type CashMovementRecord = {
  id: number;
  shiftId: number;
  type: "in" | "out";
  reason: string;
  amount: number;
  cashier: string;
  createdAt: string;
};

export type CashRegisterRecord = {
  openShift: CashShiftRecord | null;
  movements: CashMovementRecord[];
  summary: {
    cashSales: number;
    cardSales: number;
    transferSales: number;
    cashIn: number;
    cashOut: number;
    expectedCash: number;
    ticketCount: number;
    totalSales: number;
  };
};

export type OpenOrderRecord = {
  table: string;
  cashier: string;
  openedAt: string;
  updatedAt: string;
  items: TicketItemInput[];
};

export type KitchenCommandRecord = {
  id: number;
  table: string;
  station: "Barra" | "Cocina";
  status: "pending" | "ready" | "cancelled";
  createdAt: string;
  items: TicketItemInput[];
};

type DbEnv = {
  DB?: D1Database;
};

function getDb() {
  const db = (env as DbEnv).DB;
  if (!db) {
    throw new Error("La base de datos D1 no esta disponible.");
  }
  return db;
}

export async function ensureSchema() {
  const db = getDb();
  await db.batch([
    db.prepare(createCashShiftsTable),
    db.prepare(createCashMovementsTable),
    db.prepare(createOpenOrdersTable),
    db.prepare(createOpenOrderItemsTable),
    db.prepare(createKitchenCommandsTable),
    db.prepare(createKitchenCommandItemsTable),
    db.prepare(createProductsTable),
    db.prepare(createTicketsTable),
    db.prepare(createTicketItemsTable),
    db.prepare(createOpenCashShiftIndex),
    db.prepare(createCashMovementsShiftIndex),
    db.prepare(createOpenOrdersStatusIndex),
    db.prepare(createOpenOrderItemsOrderIndex),
    db.prepare(createKitchenCommandsStationIndex),
    db.prepare(createKitchenCommandItemsCommandIndex),
    db.prepare(createTicketCreatedIndex),
    db.prepare(createTicketItemsTicketIndex),
  ]);

  await ensureTicketColumns(db);
  await db.prepare(createTicketsShiftIndex).run();
  await db.prepare(createTicketsStatusIndex).run();

  const productCount = await db.prepare("SELECT COUNT(*) AS count FROM products").first<{ count: number }>();
  if ((productCount?.count ?? 0) === 0) {
    await db.batch(
      initialProducts.map((product) =>
        db
          .prepare("INSERT INTO products (name, category, price, station, tag) VALUES (?, ?, ?, ?, ?)")
          .bind(product.name, product.category, product.price, product.station, product.tag),
      ),
    );
  }
}

async function ensureTicketColumns(db: D1Database) {
  const columns = await db.prepare("PRAGMA table_info(tickets)").all<{ name: string }>();
  const columnNames = new Set((columns.results ?? []).map((column) => column.name));
  if (!columnNames.has("shift_id")) {
    await db.prepare("ALTER TABLE tickets ADD COLUMN shift_id INTEGER").run();
  }
  if (!columnNames.has("status")) {
    await db.prepare("ALTER TABLE tickets ADD COLUMN status TEXT NOT NULL DEFAULT 'paid'").run();
  }
  if (!columnNames.has("cancelled_at")) {
    await db.prepare("ALTER TABLE tickets ADD COLUMN cancelled_at TEXT").run();
  }
  if (!columnNames.has("cancel_reason")) {
    await db.prepare("ALTER TABLE tickets ADD COLUMN cancel_reason TEXT").run();
  }
  if (!columnNames.has("cancelled_by")) {
    await db.prepare("ALTER TABLE tickets ADD COLUMN cancelled_by TEXT").run();
  }
}

export async function listProducts() {
  await ensureSchema();
  const db = getDb();
  const result = await db
    .prepare(
      "SELECT id, name, category, price, station, tag FROM products WHERE active = 1 ORDER BY category, name",
    )
    .all<ProductRecord>();
  return result.results ?? [];
}

function normalizeProduct(input: ProductInput) {
  const name = input.name.trim();
  const category = input.category.trim();
  const station = input.station === "Cocina" ? "Cocina" : "Barra";
  const price = Math.max(0, Math.round(Number(input.price)));
  const tag = input.tag?.trim() ? input.tag.trim() : null;

  if (!name || !category || price <= 0) {
    throw new Error("Nombre, categoria y precio son obligatorios.");
  }

  return { name, category, price, station, tag };
}

export async function createProduct(input: ProductInput) {
  await ensureSchema();
  const db = getDb();
  const product = normalizeProduct(input);
  const created = await db
    .prepare(
      `INSERT INTO products (name, category, price, station, tag)
      VALUES (?, ?, ?, ?, ?)
      RETURNING id, name, category, price, station, tag`,
    )
    .bind(product.name, product.category, product.price, product.station, product.tag)
    .first<ProductRecord>();

  if (!created) {
    throw new Error("No se pudo crear el producto.");
  }

  return created;
}

export async function updateProduct(input: ProductInput) {
  if (!input.id) {
    throw new Error("Falta el producto a editar.");
  }

  await ensureSchema();
  const db = getDb();
  const product = normalizeProduct(input);
  const updated = await db
    .prepare(
      `UPDATE products
      SET name = ?, category = ?, price = ?, station = ?, tag = ?
      WHERE id = ? AND active = 1
      RETURNING id, name, category, price, station, tag`,
    )
    .bind(product.name, product.category, product.price, product.station, product.tag, input.id)
    .first<ProductRecord>();

  if (!updated) {
    throw new Error("No se pudo actualizar el producto.");
  }

  return updated;
}

export async function deactivateProduct(id: number) {
  await ensureSchema();
  const db = getDb();
  await db.prepare("UPDATE products SET active = 0 WHERE id = ?").bind(id).run();
  return { id };
}

export async function listTickets() {
  await ensureSchema();
  const db = getDb();
  const ticketsResult = await db
    .prepare(
      `SELECT
        id,
        folio,
        table_name AS "table",
        cashier,
        payment,
        created_at AS createdAt,
        status,
        cancel_reason AS cancelReason,
        subtotal,
        discount_amount AS discountAmount,
        tax,
        tip_amount AS tipAmount,
        total
      FROM tickets
      ORDER BY id DESC
      LIMIT 20`,
    )
    .all<
      {
        id: number;
        folio: string;
        table: string;
        cashier: string;
        payment: string;
        createdAt: string;
        status: "paid" | "cancelled";
        cancelReason: string | null;
      } & TicketInput["totals"]
    >();

  const tickets = ticketsResult.results ?? [];
  if (tickets.length === 0) {
    return [];
  }

  const ticketIds = tickets.map((ticket) => ticket.id);
  const placeholders = ticketIds.map(() => "?").join(", ");
  const itemResult = await db
    .prepare(
      `SELECT
        ticket_id AS ticketId,
        product_id AS id,
        name,
        qty,
        unit_price AS price,
        station,
        note,
        '' AS category
      FROM ticket_items
      WHERE ticket_id IN (${placeholders})
      ORDER BY id`,
    )
    .bind(...ticketIds)
    .all<TicketItemInput & { ticketId: number }>();

  const items = itemResult.results ?? [];
  return tickets.map((ticket) => ({
    folio: ticket.folio,
    table: ticket.table,
    cashier: ticket.cashier,
    payment: ticket.payment,
    createdAt: ticket.createdAt,
    status: ticket.status,
    cancelReason: ticket.cancelReason,
    totals: {
      subtotal: ticket.subtotal,
      discountAmount: ticket.discountAmount,
      tax: ticket.tax,
      tipAmount: ticket.tipAmount,
      total: ticket.total,
    },
    items: items.filter((item) => item.ticketId === ticket.id),
  }));
}

export async function createTicket(input: TicketInput) {
  await ensureSchema();
  const db = getDb();
  const lastTicket = await db.prepare("SELECT COALESCE(MAX(id), 0) AS id FROM tickets").first<{ id: number }>();
  const nextNumber = (lastTicket?.id ?? 0) + 1029;
  const folio = `T-${String(nextNumber).padStart(4, "0")}`;
  const openShift = await db.prepare("SELECT id FROM cash_shifts WHERE status = 'open' ORDER BY id DESC LIMIT 1").first<{ id: number }>();

  const created = await db
    .prepare(
      `INSERT INTO tickets (
        folio,
        table_name,
        cashier,
        payment,
        created_at,
        shift_id,
        subtotal,
        discount_amount,
        tax,
        tip_amount,
        total
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id, created_at AS createdAt`,
    )
    .bind(
      folio,
      input.table,
      input.cashier,
      input.payment,
      input.createdAt ?? new Date().toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }),
      openShift?.id ?? null,
      input.totals.subtotal,
      input.totals.discountAmount,
      input.totals.tax,
      input.totals.tipAmount,
      input.totals.total,
    )
    .first<{ id: number; createdAt: string }>();

  if (!created) {
    throw new Error("No se pudo crear el ticket.");
  }

  await db.batch(
    input.items.map((item) =>
      db
        .prepare(
          `INSERT INTO ticket_items (
            ticket_id,
            product_id,
            name,
            qty,
            unit_price,
            station,
            note
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(created.id, item.id, item.name, item.qty, item.price, item.station, item.note ?? null),
    ),
  );

  await clearOpenOrder(input.table);

  return {
    folio,
    table: input.table,
    cashier: input.cashier,
    payment: input.payment,
    createdAt: created.createdAt,
    status: "paid",
    cancelReason: null,
    items: input.items,
    totals: input.totals,
  };
}

export async function cancelTicket(input: { folio: string; reason: string; cancelledBy: string }) {
  await ensureSchema();
  const db = getDb();
  const reason = input.reason.trim();
  if (!reason) throw new Error("El motivo de cancelacion es obligatorio.");

  await db
    .prepare(
      `UPDATE tickets
      SET status = 'cancelled',
        cancelled_at = CURRENT_TIMESTAMP,
        cancel_reason = ?,
        cancelled_by = ?
      WHERE folio = ? AND status = 'paid'`,
    )
    .bind(reason, input.cancelledBy.trim() || "Ana Lopez", input.folio)
    .run();

  return listTickets();
}

export async function listOpenOrders() {
  await ensureSchema();
  const db = getDb();
  const ordersResult = await db
    .prepare(
      `SELECT id, table_name AS "table", cashier, opened_at AS openedAt, updated_at AS updatedAt
      FROM open_orders
      WHERE status = 'open'
      ORDER BY id`,
    )
    .all<{ id: number; table: string; cashier: string; openedAt: string; updatedAt: string }>();
  const orders = ordersResult.results ?? [];
  if (orders.length === 0) return [];

  const orderIds = orders.map((order) => order.id);
  const placeholders = orderIds.map(() => "?").join(", ");
  const itemsResult = await db
    .prepare(
      `SELECT
        order_id AS orderId,
        product_id AS id,
        name,
        category,
        qty,
        unit_price AS price,
        station,
        note,
        NULL AS tag
      FROM open_order_items
      WHERE order_id IN (${placeholders})
      ORDER BY id`,
    )
    .bind(...orderIds)
    .all<TicketItemInput & { orderId: number }>();
  const items = itemsResult.results ?? [];

  return orders.map((order) => ({
    table: order.table,
    cashier: order.cashier,
    openedAt: order.openedAt,
    updatedAt: order.updatedAt,
    items: items.filter((item) => item.orderId === order.id),
  }));
}

export async function saveOpenOrder(input: { table: string; cashier: string; items: TicketItemInput[] }) {
  await ensureSchema();
  const db = getDb();
  const table = input.table.trim();
  if (!table) throw new Error("La mesa es obligatoria.");

  await db
    .prepare(
      `INSERT INTO open_orders (table_name, cashier, status, updated_at)
      VALUES (?, ?, 'open', CURRENT_TIMESTAMP)
      ON CONFLICT(table_name) DO UPDATE SET
        cashier = excluded.cashier,
        status = 'open',
        updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(table, input.cashier.trim() || "Ana Lopez")
    .run();

  const order = await db.prepare("SELECT id FROM open_orders WHERE table_name = ?").bind(table).first<{ id: number }>();
  if (!order) throw new Error("No se pudo guardar la cuenta.");

  await db.prepare("DELETE FROM open_order_items WHERE order_id = ?").bind(order.id).run();
  if (input.items.length > 0) {
    await db.batch(
      input.items.map((item) =>
        db
          .prepare(
            `INSERT INTO open_order_items (order_id, product_id, name, category, qty, unit_price, station, note)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(order.id, item.id, item.name, item.category || "", item.qty, item.price, item.station, item.note ?? null),
      ),
    );
  }

  return listOpenOrders();
}

export async function clearOpenOrder(tableName: string) {
  await ensureSchema();
  const db = getDb();
  await db.prepare("UPDATE open_orders SET status = 'paid', updated_at = CURRENT_TIMESTAMP WHERE table_name = ? AND status = 'open'").bind(tableName).run();
  return listOpenOrders();
}

export async function listKitchenCommands() {
  await ensureSchema();
  const db = getDb();
  const commandsResult = await db
    .prepare(
      `SELECT id, table_name AS "table", station, status, created_at AS createdAt
      FROM kitchen_commands
      WHERE status = 'pending'
      ORDER BY id DESC
      LIMIT 30`,
    )
    .all<{ id: number; table: string; station: "Barra" | "Cocina"; status: "pending" | "ready" | "cancelled"; createdAt: string }>();
  const commands = commandsResult.results ?? [];
  if (commands.length === 0) return [];

  const commandIds = commands.map((command) => command.id);
  const placeholders = commandIds.map(() => "?").join(", ");
  const itemsResult = await db
    .prepare(
      `SELECT
        command_id AS commandId,
        product_id AS id,
        name,
        qty,
        unit_price AS price,
        note,
        '' AS category,
        'Barra' AS station,
        NULL AS tag
      FROM kitchen_command_items
      WHERE command_id IN (${placeholders})
      ORDER BY id`,
    )
    .bind(...commandIds)
    .all<TicketItemInput & { commandId: number }>();
  const items = itemsResult.results ?? [];

  return commands.map((command) => ({
    ...command,
    items: items.filter((item) => item.commandId === command.id).map((item) => ({ ...item, station: command.station })),
  }));
}

export async function createKitchenCommands(input: { table: string; items: TicketItemInput[] }) {
  await ensureSchema();
  const db = getDb();
  const stations = Array.from(new Set(input.items.map((item) => item.station))) as Array<"Barra" | "Cocina">;

  for (const station of stations) {
    const stationItems = input.items.filter((item) => item.station === station);
    const command = await db
      .prepare(
        `INSERT INTO kitchen_commands (table_name, station)
        VALUES (?, ?)
        RETURNING id`,
      )
      .bind(input.table, station)
      .first<{ id: number }>();
    if (!command) throw new Error("No se pudo crear la comanda.");
    await db.batch(
      stationItems.map((item) =>
        db
          .prepare(
            `INSERT INTO kitchen_command_items (command_id, product_id, name, qty, unit_price, note)
            VALUES (?, ?, ?, ?, ?, ?)`,
          )
          .bind(command.id, item.id, item.name, item.qty, item.price, item.note ?? null),
      ),
    );
  }

  return listKitchenCommands();
}

export async function markKitchenCommandReady(id: number) {
  await ensureSchema();
  const db = getDb();
  await db.prepare("UPDATE kitchen_commands SET status = 'ready' WHERE id = ?").bind(id).run();
  return listKitchenCommands();
}

export async function getReports() {
  await ensureSchema();
  const db = getDb();
  const totals = await db
    .prepare(
      `SELECT
        COUNT(*) AS ticketCount,
        COALESCE(SUM(total), 0) AS totalSales,
        COALESCE(SUM(subtotal), 0) AS subtotal,
        COALESCE(SUM(tax), 0) AS tax,
        COALESCE(SUM(tip_amount), 0) AS tips
      FROM tickets
      WHERE status = 'paid'`,
    )
    .first<{ ticketCount: number; totalSales: number; subtotal: number; tax: number; tips: number }>();
  const cancelled = await db.prepare("SELECT COUNT(*) AS count FROM tickets WHERE status = 'cancelled'").first<{ count: number }>();
  const payments = await db
    .prepare(
      `SELECT payment, COUNT(*) AS count, COALESCE(SUM(total), 0) AS total
      FROM tickets
      WHERE status = 'paid'
      GROUP BY payment
      ORDER BY total DESC`,
    )
    .all<{ payment: string; count: number; total: number }>();
  const products = await db
    .prepare(
      `SELECT
        ti.name,
        SUM(ti.qty) AS qty,
        SUM(ti.qty * ti.unit_price) AS total
      FROM ticket_items ti
      JOIN tickets t ON t.id = ti.ticket_id
      WHERE t.status = 'paid'
      GROUP BY ti.name
      ORDER BY qty DESC
      LIMIT 8`,
    )
    .all<{ name: string; qty: number; total: number }>();

  return {
    totals: {
      ticketCount: totals?.ticketCount ?? 0,
      totalSales: totals?.totalSales ?? 0,
      subtotal: totals?.subtotal ?? 0,
      tax: totals?.tax ?? 0,
      tips: totals?.tips ?? 0,
      cancelledTickets: cancelled?.count ?? 0,
    },
    payments: payments.results ?? [],
    products: products.results ?? [],
  };
}

function normalizeAmount(value: number, label: string) {
  const amount = Math.max(0, Math.round(Number(value)));
  if (amount <= 0) {
    throw new Error(`${label} debe ser mayor a cero.`);
  }
  return amount;
}

async function getOpenShift(db: D1Database) {
  return db
    .prepare(
      `SELECT
        id,
        opened_at AS openedAt,
        closed_at AS closedAt,
        cashier,
        opening_cash AS openingCash,
        closing_cash AS closingCash,
        expected_cash AS expectedCash,
        notes,
        status
      FROM cash_shifts
      WHERE status = 'open'
      ORDER BY id DESC
      LIMIT 1`,
    )
    .first<CashShiftRecord>();
}

async function buildCashRegister(db: D1Database, shift: CashShiftRecord | null): Promise<CashRegisterRecord> {
  if (!shift) {
    return {
      openShift: null,
      movements: [],
      summary: {
        cashSales: 0,
        cardSales: 0,
        transferSales: 0,
        cashIn: 0,
        cashOut: 0,
        expectedCash: 0,
        ticketCount: 0,
        totalSales: 0,
      },
    };
  }

  const salesResult = await db
    .prepare(
      `SELECT
        payment,
        COUNT(*) AS count,
        COALESCE(SUM(total), 0) AS total
      FROM tickets
      WHERE shift_id = ? AND status = 'paid'
      GROUP BY payment`,
    )
    .bind(shift.id)
    .all<{ payment: string; count: number; total: number }>();
  const movementSummaryResult = await db
    .prepare(
      `SELECT
        type,
        COALESCE(SUM(amount), 0) AS total
      FROM cash_movements
      WHERE shift_id = ?
      GROUP BY type`,
    )
    .bind(shift.id)
    .all<{ type: "in" | "out"; total: number }>();
  const movementsResult = await db
    .prepare(
      `SELECT
        id,
        shift_id AS shiftId,
        type,
        reason,
        amount,
        cashier,
        created_at AS createdAt
      FROM cash_movements
      WHERE shift_id = ?
      ORDER BY id DESC
      LIMIT 30`,
    )
    .bind(shift.id)
    .all<CashMovementRecord>();

  const sales = salesResult.results ?? [];
  const movementSummary = movementSummaryResult.results ?? [];
  const cashSales = sales.find((sale) => sale.payment === "Efectivo")?.total ?? 0;
  const cardSales = sales.find((sale) => sale.payment === "Tarjeta")?.total ?? 0;
  const transferSales = sales.find((sale) => sale.payment === "Transferencia")?.total ?? 0;
  const cashIn = movementSummary.find((movement) => movement.type === "in")?.total ?? 0;
  const cashOut = movementSummary.find((movement) => movement.type === "out")?.total ?? 0;
  const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
  const ticketCount = sales.reduce((sum, sale) => sum + sale.count, 0);
  const expectedCash = shift.openingCash + cashSales + cashIn - cashOut;

  return {
    openShift: shift,
    movements: movementsResult.results ?? [],
    summary: {
      cashSales,
      cardSales,
      transferSales,
      cashIn,
      cashOut,
      expectedCash,
      ticketCount,
      totalSales,
    },
  };
}

export async function getCashRegister() {
  await ensureSchema();
  const db = getDb();
  const openShift = (await getOpenShift(db)) ?? null;
  return buildCashRegister(db, openShift);
}

export async function openCashShift(input: { cashier: string; openingCash: number }) {
  await ensureSchema();
  const db = getDb();
  const existingShift = await getOpenShift(db);
  if (existingShift) {
    throw new Error("Ya existe un turno de caja abierto.");
  }

  const cashier = input.cashier.trim() || "Caja";
  const openingCash = Math.max(0, Math.round(Number(input.openingCash)));
  const shift = await db
    .prepare(
      `INSERT INTO cash_shifts (cashier, opening_cash)
      VALUES (?, ?)
      RETURNING
        id,
        opened_at AS openedAt,
        closed_at AS closedAt,
        cashier,
        opening_cash AS openingCash,
        closing_cash AS closingCash,
        expected_cash AS expectedCash,
        notes,
        status`,
    )
    .bind(cashier, openingCash)
    .first<CashShiftRecord>();

  if (!shift) {
    throw new Error("No se pudo abrir la caja.");
  }

  return buildCashRegister(db, shift);
}

export async function addCashMovement(input: { type: "in" | "out"; reason: string; amount: number; cashier: string }) {
  await ensureSchema();
  const db = getDb();
  const openShift = await getOpenShift(db);
  if (!openShift) {
    throw new Error("No hay una caja abierta.");
  }

  const type = input.type === "out" ? "out" : "in";
  const reason = input.reason.trim() || (type === "in" ? "Entrada de efectivo" : "Salida de efectivo");
  const cashier = input.cashier.trim() || openShift.cashier;
  const amount = normalizeAmount(input.amount, "El movimiento");

  await db
    .prepare(
      `INSERT INTO cash_movements (shift_id, type, reason, amount, cashier)
      VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(openShift.id, type, reason, amount, cashier)
    .run();

  return buildCashRegister(db, openShift);
}

export async function closeCashShift(input: { closingCash: number; notes?: string }) {
  await ensureSchema();
  const db = getDb();
  const openShift = await getOpenShift(db);
  if (!openShift) {
    throw new Error("No hay una caja abierta.");
  }

  const currentRegister = await buildCashRegister(db, openShift);
  const closingCash = Math.max(0, Math.round(Number(input.closingCash)));
  const notes = input.notes?.trim() ? input.notes.trim() : null;
  await db
    .prepare(
      `UPDATE cash_shifts
      SET closed_at = CURRENT_TIMESTAMP,
        closing_cash = ?,
        expected_cash = ?,
        notes = ?,
        status = 'closed'
      WHERE id = ?`,
    )
    .bind(closingCash, currentRegister.summary.expectedCash, notes, openShift.id)
    .run();

  return getCashRegister();
}
