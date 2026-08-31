import { clearOpenOrder, listOpenOrders, saveOpenOrder } from "@/db/pos";

export const runtime = "edge";

export async function GET() {
  try {
    const orders = await listOpenOrders();
    return Response.json({ orders });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudieron cargar las cuentas." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const orders = await saveOpenOrder({ cashier: body.cashier ?? "Ana Lopez", items: body.items ?? [], table: body.table ?? "" });
    return Response.json({ orders });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudo guardar la cuenta." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const orders = await clearOpenOrder(body.table ?? "");
    return Response.json({ orders });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudo cerrar la cuenta." },
      { status: 500 },
    );
  }
}
