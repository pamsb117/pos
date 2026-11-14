import { readBody, withUser } from "@/db/auth";
import { addCashMovement, closeCashShift, getCashRegister, openCashShift } from "@/db/pos";

export const runtime = "edge";

export function GET(request: Request) {
  return withUser(request, async () => Response.json({ register: await getCashRegister() }));
}

export function POST(request: Request) {
  return withUser(request, async (user) => {
    const body = await readBody(request);
    switch (body.action) {
      case "open":
        return Response.json({ register: await openCashShift({ cashier: user.name, openingCash: Number(body.openingCash) }) }, { status: 201 });
      case "movement":
        return Response.json(
          {
            register: await addCashMovement({
              amount: Number(body.amount),
              cashier: user.name,
              reason: typeof body.reason === "string" ? body.reason : "",
              type: body.type === "out" ? "out" : "in",
            }),
          },
          { status: 201 },
        );
      case "close":
        return Response.json({
          register: await closeCashShift({ closingCash: Number(body.closingCash), notes: typeof body.notes === "string" ? body.notes : undefined }),
        });
      default:
        return Response.json({ error: "Accion de caja no valida." }, { status: 400 });
    }
  });
}
