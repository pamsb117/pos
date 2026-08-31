import { env } from "cloudflare:workers";
import {
  createCashMovementsShiftIndex,
  createCashMovementsTable,
  createCashShiftsTable,
  createOpenCashShiftIndex,
  createProductsTable,
  createTicketCreatedIndex,
  createTicketItemsTable,
  createTicketItemsTicketIndex,
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
    db.prepare(createProductsTable),
    db.prepare(createTicketsTable),
    db.prepare(createTicketItemsTable),
    db.prepare(createOpenCashShiftIndex),
    db.prepare(createCashMovementsShiftIndex),
    db.prepare(createTicketCreatedIndex),
    db.prepare(createTicketItemsTicketIndex),
  ]);

  await ensureTicketShiftColumn(db);
  await db.prepare(createTicketsShiftIndex).run();

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

async function ensureTicketShiftColumn(db: D1Database) {
  const columns = await db.prepare("PRAGMA table_info(tickets)").all<{ name: string }>();
  const hasShiftId = (columns.results ?? []).some((column) => column.name === "shift_id");
  if (!hasShiftId) {
    await db.prepare("ALTER TABLE tickets ADD COLUMN shift_id INTEGER").run();
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

  return {
    folio,
    table: input.table,
    cashier: input.cashier,
    payment: input.payment,
    createdAt: created.createdAt,
    items: input.items,
    totals: input.totals,
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
      WHERE shift_id = ?
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
