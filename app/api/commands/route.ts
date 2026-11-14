import { readBody, withUser } from "@/db/auth";
import { createKitchenCommands, listKitchenCommands, markKitchenCommandReady, type TicketItemInput } from "@/db/pos";

export const runtime = "edge";

export function GET(request: Request) {
  return withUser(request, async () => Response.json({ commands: await listKitchenCommands() }));
}

export function POST(request: Request) {
  return withUser(request, async () => {
    const body = await readBody(request);
    if (body.action === "ready") {
      return Response.json({ commands: await markKitchenCommandReady(Number(body.id)) });
    }
    const items = Array.isArray(body.items) ? (body.items as TicketItemInput[]) : [];
    const commands = await createKitchenCommands({ items, table: typeof body.table === "string" ? body.table : "" });
    return Response.json({ commands }, { status: 201 });
  });
}
