import { withUser } from "@/db/auth";
import { getReports } from "@/db/pos";

export const runtime = "edge";

export function GET(request: Request) {
  return withUser(request, async () => Response.json({ reports: await getReports() }));
}
