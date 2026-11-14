import { readBody, withUser } from "@/db/auth";
import { clearOpenOrder, listOpenOrders, saveOpenOrder, type TicketItemInput } from "@/db/pos";

export const runtime = "edge";

const tableOf = (body: Record<string, unknown>) => (typeof body.table === "string" ? body.table : "");

export function GET(request: Request) {
  return withUser(request, async () => Response.json({ orders: await listOpenOrders() }));
}

export function POST(request: Request) {
  return withUser(request, async (user) => {
    const body = await readBody(request);
    const items = Array.isArray(body.items) ? (body.items as TicketItemInput[]) : [];
    return Response.json({ orders: await saveOpenOrder({ cashier: user.name, items, table: tableOf(body) }) });
  });
}

export function DELETE(request: Request) {
  return withUser(request, async () => Response.json({ orders: await clearOpenOrder(tableOf(await readBody(request))) }));
}
