import { addCashMovement, closeCashShift, getCashRegister, openCashShift } from "@/db/pos";

export const runtime = "edge";

export async function GET() {
  try {
    const register = await getCashRegister();
    return Response.json({ register });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudo cargar la caja." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.action === "open") {
      const register = await openCashShift({ cashier: body.cashier ?? "Ana Lopez", openingCash: Number(body.openingCash) });
      return Response.json({ register }, { status: 201 });
    }

    if (body.action === "movement") {
      const register = await addCashMovement({
        amount: Number(body.amount),
        cashier: body.cashier ?? "Ana Lopez",
        reason: body.reason ?? "",
        type: body.type === "out" ? "out" : "in",
      });
      return Response.json({ register }, { status: 201 });
    }

    if (body.action === "close") {
      const register = await closeCashShift({ closingCash: Number(body.closingCash), notes: body.notes });
      return Response.json({ register });
    }

    return Response.json({ error: "Accion de caja no valida." }, { status: 400 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudo actualizar la caja." },
      { status: 500 },
    );
  }
}
