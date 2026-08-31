import { listProducts } from "@/db/pos";

export const runtime = "edge";

export async function GET() {
  try {
    const products = await listProducts();
    return Response.json({ products });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudieron cargar los productos." },
      { status: 500 },
    );
  }
}
