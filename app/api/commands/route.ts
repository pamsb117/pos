import { createKitchenCommands, listKitchenCommands, markKitchenCommandReady } from "@/db/pos";

export const runtime = "edge";

export async function GET() {
  try {
    const commands = await listKitchenCommands();
    return Response.json({ commands });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudieron cargar las comandas." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.action === "ready") {
      const commands = await markKitchenCommandReady(Number(body.id));
      return Response.json({ commands });
    }

    const commands = await createKitchenCommands({ items: body.items ?? [], table: body.table ?? "" });
    return Response.json({ commands }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudo actualizar la comanda." },
      { status: 500 },
    );
  }
}
