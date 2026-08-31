import { env } from "cloudflare:workers";
import {
  createProductsTable,
  createTicketCreatedIndex,
  createTicketItemsTable,
  createTicketItemsTicketIndex,
  createTicketsTable,
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
    db.prepare(createProductsTable),
    db.prepare(createTicketsTable),
    db.prepare(createTicketItemsTable),
    db.prepare(createTicketCreatedIndex),
    db.prepare(createTicketItemsTicketIndex),
  ]);

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

  const created = await db
    .prepare(
      `INSERT INTO tickets (
        folio,
        table_name,
        cashier,
        payment,
        created_at,
        subtotal,
        discount_amount,
        tax,
        tip_amount,
        total
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id, created_at AS createdAt`,
    )
    .bind(
      folio,
      input.table,
      input.cashier,
      input.payment,
      input.createdAt ?? new Date().toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }),
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
