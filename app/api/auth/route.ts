import { changePassword, getSessionUser, login, logout, needsSetup, readBody, setup } from "@/db/auth";
import { getSettings } from "@/db/pos";

export const runtime = "edge";

const fail = (error: unknown, status = 400) =>
  Response.json({ error: error instanceof Error ? error.message : "No se pudo completar la operacion." }, { status });

/** Session status. Signed-out callers only learn the business name, for the login screen. */
export async function GET(request: Request) {
  try {
    const [setupPending, user, settings] = await Promise.all([needsSetup(), getSessionUser(request), getSettings()]);
    return Response.json({
      needsSetup: setupPending,
      user,
      settings: user ? settings : { businessName: settings.businessName, tagline: settings.tagline },
    });
  } catch (error) {
    return fail(error, 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readBody(request);

    if (body.action === "login") {
      const { cookie, user } = await login(request, body);
      return Response.json({ user, settings: await getSettings() }, { headers: { "Set-Cookie": cookie } });
    }

    if (body.action === "setup") {
      const { cookie, user, settings } = await setup(request, body);
      return Response.json({ user, settings }, { status: 201, headers: { "Set-Cookie": cookie } });
    }

    if (body.action === "logout") {
      return Response.json({ ok: true }, { headers: { "Set-Cookie": await logout(request) } });
    }

    if (body.action === "password") {
      const user = await getSessionUser(request);
      if (!user) return fail(new Error("Inicia sesion para continuar."), 401);
      await changePassword(user, body);
      return Response.json({ ok: true });
    }

    return fail(new Error("Accion no valida."));
  } catch (error) {
    return fail(error);
  }
}
