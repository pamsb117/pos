import { getReports } from "@/db/pos";

export const runtime = "edge";

export async function GET() {
  try {
    const reports = await getReports();
    return Response.json({ reports });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudieron cargar los reportes." },
      { status: 500 },
    );
  }
}
