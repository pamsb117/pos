import { readBody, withUser } from "@/db/auth";
import { cancelTicket, createTicket, listTickets, type TicketInput } from "@/db/pos";

export const runtime = "edge";

export function GET(request: Request) {
  return withUser(request, async () => Response.json({ tickets: await listTickets() }));
}

export function POST(request: Request) {
  return withUser(request, async (user) => {
    const body = (await readBody(request)) as Partial<TicketInput>;
    if (!Array.isArray(body.items) || body.items.length === 0 || !body.totals) throw new Error("La venta no tiene conceptos.");
    // The cashier is whoever is signed in, not whatever the browser sends.
    const ticket = await createTicket({
      table: typeof body.table === "string" && body.table.trim() ? body.table.trim() : "Venta mostrador",
      cashier: user.name,
      payment: typeof body.payment === "string" ? body.payment : "Efectivo",
      clientId: body.clientId ?? null,
      staffId: body.staffId ?? null,
      appointmentId: body.appointmentId ?? null,
      items: body.items,
      totals: body.totals,
    });
    return Response.json({ ticket }, { status: 201 });
  });
}

export function PATCH(request: Request) {
  return withUser(request, async (user) => {
    const body = await readBody(request);
    const tickets = await cancelTicket({
      cancelledBy: user.name,
      folio: typeof body.folio === "string" ? body.folio : "",
      reason: typeof body.reason === "string" ? body.reason : "",
    });
    return Response.json({ tickets });
  });
}
