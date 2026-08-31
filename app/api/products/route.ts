import { createProduct, deactivateProduct, listProducts, updateProduct } from "@/db/pos";

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

export async function POST(request: Request) {
  try {
    const product = await createProduct(await request.json());
    return Response.json({ product }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudo crear el producto." },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const product = await updateProduct(await request.json());
    return Response.json({ product });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudo editar el producto." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = (await request.json()) as { id?: number };
    if (!id) {
      throw new Error("Falta el producto a desactivar.");
    }
    return Response.json({ product: await deactivateProduct(id) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudo desactivar el producto." },
      { status: 400 },
    );
  }
}
