import { readBody, withUser } from "@/db/auth";
import { createProduct, deactivateProduct, listProducts, updateProduct, type ProductInput } from "@/db/pos";

export const runtime = "edge";

function toProductInput(body: Record<string, unknown>): ProductInput {
  return {
    id: body.id == null ? undefined : Number(body.id),
    name: typeof body.name === "string" ? body.name : "",
    category: typeof body.category === "string" ? body.category : "",
    price: Number(body.price),
    station: body.station === "Cocina" ? "Cocina" : "Barra",
    tag: typeof body.tag === "string" ? body.tag : null,
    durationMinutes: Number(body.durationMinutes),
    commissionPercent: Number(body.commissionPercent),
  };
}

export function GET(request: Request) {
  return withUser(request, async () => Response.json({ products: await listProducts() }));
}

export function POST(request: Request) {
  return withUser(request, async () =>
    Response.json({ product: await createProduct(toProductInput(await readBody(request))) }, { status: 201 }),
  );
}

export function PATCH(request: Request) {
  return withUser(request, async () => Response.json({ product: await updateProduct(toProductInput(await readBody(request))) }));
}

export function DELETE(request: Request) {
  return withUser(request, async () => {
    const id = Number((await readBody(request)).id);
    if (!id) throw new Error("Falta el concepto a eliminar.");
    return Response.json({ product: await deactivateProduct(id) });
  });
}
