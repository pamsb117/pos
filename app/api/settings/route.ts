import { readBody, withUser } from "@/db/auth";
import { getSettings, saveSettings } from "@/db/pos";

export const runtime = "edge";

export function GET(request: Request) {
  return withUser(request, async () => Response.json({ settings: await getSettings() }));
}

export function POST(request: Request) {
  return withUser(request, async () => Response.json({ settings: await saveSettings(await readBody(request)) }), { admin: true });
}
