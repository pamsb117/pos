import { createUser, listUsers, readBody, removeUser, withUser } from "@/db/auth";

export const runtime = "edge";

export function GET(request: Request) {
  return withUser(request, async () => Response.json({ users: await listUsers() }), { admin: true });
}

export function POST(request: Request) {
  return withUser(
    request,
    async () => {
      await createUser(await readBody(request));
      return Response.json({ users: await listUsers() }, { status: 201 });
    },
    { admin: true },
  );
}

export function DELETE(request: Request) {
  return withUser(
    request,
    async (user) => {
      const body = await readBody(request);
      return Response.json({ users: await removeUser(Number(body.id), user) });
    },
    { admin: true },
  );
}
