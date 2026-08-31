import { cancelTicket, createTicket, listTickets } from "@/db/pos";

export const runtime = "edge";

export async function GET() {
  try {
    const tickets = await listTickets();
    return Response.json({ tickets });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudieron cargar los tickets." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ticket = await createTicket(body);
    return Response.json({ ticket }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudo crear el ticket." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const tickets = await cancelTicket({ cancelledBy: body.cancelledBy ?? "Ana Lopez", folio: body.folio ?? "", reason: body.reason ?? "" });
    return Response.json({ tickets });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudo cancelar el ticket." },
      { status: 500 },
    );
  }
}
