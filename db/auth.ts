import { GIROS, isGiro } from "./giros";
import { ensureSchema, getDb, saveSettings, seedSampleCatalog } from "./pos";

export type Role = "admin" | "cashier";
export type SessionUser = { id: number; username: string; name: string; role: Role };

const COOKIE = "pos_session";
const SESSION_HOURS = 12;
const PBKDF2_ITERATIONS = 100_000; // workerd's upper limit for PBKDF2
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 5;
const MIN_PASSWORD_LENGTH = 6;

const encoder = new TextEncoder();
const toHex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
const fromHex = (hex: string) => new Uint8Array((hex.match(/../g) ?? []).map((pair) => parseInt(pair, 16)));

async function sha256(value: string) {
  return toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return toHex(new Uint8Array(bits));
}

async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toHex(salt)}$${await derive(password, salt, PBKDF2_ITERATIONS)}`;
}

async function verifyPassword(password: string, stored: string) {
  const [scheme, iterations, salt, expected] = stored.split("$");
  if (scheme !== "pbkdf2" || !iterations || !salt || !expected) return false;
  const actual = await derive(password, fromHex(salt), Number(iterations));
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let index = 0; index < actual.length; index++) diff |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  return diff === 0;
}

// Verified against when the username does not exist, so that case takes as
// long as a wrong password and does not reveal which usernames are real.
const DUMMY_HASH = `pbkdf2$${PBKDF2_ITERATIONS}$00000000000000000000000000000000$${"0".repeat(64)}`;

function readToken(request: Request) {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE) return rest.join("=");
  }
  return null;
}

function sessionCookie(request: Request, token: string, maxAgeSeconds: number) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

function validatePassword(password: unknown): string {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`La contrasena debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  }
  return password;
}

function validateUsername(username: unknown): string {
  const value = typeof username === "string" ? username.trim() : "";
  if (!/^[A-Za-z0-9._-]{3,30}$/.test(value)) {
    throw new Error("El usuario debe tener de 3 a 30 letras, numeros, punto, guion o guion bajo.");
  }
  return value;
}

export async function needsSetup() {
  await ensureSchema();
  const row = await getDb().prepare("SELECT COUNT(*) AS count FROM users WHERE active = 1").first<{ count: number }>();
  return (row?.count ?? 0) === 0;
}

export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  const token = readToken(request);
  if (!token) return null;
  await ensureSchema();
  const user = await getDb()
    .prepare(
      `SELECT u.id, u.username, u.name, u.role
      FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1`,
    )
    .bind(await sha256(token), Date.now())
    .first<SessionUser>();
  return user ?? null;
}

async function startSession(request: Request, userId: number) {
  const db = getDb();
  const token = toHex(crypto.getRandomValues(new Uint8Array(32)));
  const now = Date.now();
  await db.batch([
    db.prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(now),
    db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").bind(await sha256(token), userId, now + SESSION_HOURS * 3_600_000),
  ]);
  return sessionCookie(request, token, SESSION_HOURS * 3600);
}

/** Returns the Set-Cookie value for the new session, or throws with a user-facing message. */
export async function login(request: Request, input: { username?: unknown; password?: unknown }) {
  await ensureSchema();
  const db = getDb();
  const username = typeof input.username === "string" ? input.username.trim() : "";
  const password = typeof input.password === "string" ? input.password : "";
  const user = await db
    .prepare("SELECT id, username, name, role, password_hash AS passwordHash, failed_attempts AS failedAttempts, locked_until AS lockedUntil FROM users WHERE username_key = ? AND active = 1")
    .bind(username.toLowerCase())
    .first<SessionUser & { passwordHash: string; failedAttempts: number; lockedUntil: number }>();

  if (user && user.lockedUntil > Date.now()) {
    const minutes = Math.ceil((user.lockedUntil - Date.now()) / 60_000);
    throw new Error(`Demasiados intentos. Vuelve a intentar en ${minutes} min.`);
  }

  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) {
    if (user) {
      const failed = user.failedAttempts + 1;
      const locked = failed >= MAX_FAILED_ATTEMPTS;
      await db
        .prepare("UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?")
        .bind(locked ? 0 : failed, locked ? Date.now() + LOCK_MINUTES * 60_000 : 0, user.id)
        .run();
    }
    throw new Error("Usuario o contrasena incorrectos.");
  }

  await db.prepare("UPDATE users SET failed_attempts = 0, locked_until = 0 WHERE id = ?").bind(user.id).run();
  const cookie = await startSession(request, user.id);
  return { cookie, user: { id: user.id, username: user.username, name: user.name, role: user.role } satisfies SessionUser };
}

export async function logout(request: Request) {
  const token = readToken(request);
  if (token) {
    await ensureSchema();
    await getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  }
  return sessionCookie(request, "", 0);
}

async function insertUser(input: { username: unknown; name: unknown; password: unknown; role: Role }) {
  const username = validateUsername(input.username);
  const password = validatePassword(input.password);
  const name = (typeof input.name === "string" ? input.name.trim() : "").slice(0, 40) || username;
  const db = getDb();
  const taken = await db.prepare("SELECT id FROM users WHERE username_key = ? AND active = 1").bind(username.toLowerCase()).first<{ id: number }>();
  if (taken) throw new Error("Ya existe un usuario con ese nombre.");
  const created = await db
    .prepare("INSERT INTO users (username, username_key, name, role, password_hash) VALUES (?, ?, ?, ?, ?) RETURNING id, username, name, role")
    .bind(username, username.toLowerCase(), name, input.role, await hashPassword(password))
    .first<SessionUser>();
  if (!created) throw new Error("No se pudo crear el usuario.");
  return created;
}

/** First-run setup: creates the owner account and the business settings. Only works while there are no users. */
export async function setup(
  request: Request,
  input: { businessName?: unknown; giro?: unknown; sampleCatalog?: unknown; name?: unknown; username?: unknown; password?: unknown },
) {
  if (!(await needsSetup())) throw new Error("El sistema ya esta configurado.");
  const businessName = typeof input.businessName === "string" ? input.businessName.trim() : "";
  if (!businessName) throw new Error("Escribe el nombre del negocio.");
  const giro = isGiro(input.giro) ? input.giro : "salon";
  const user = await insertUser({ username: input.username, name: input.name, password: input.password, role: "admin" });
  const settings = await saveSettings({ businessName, giro, tagline: GIROS[giro].tagline, agenda: GIROS[giro].agenda });
  if (input.sampleCatalog === true) await seedSampleCatalog(giro);
  return { cookie: await startSession(request, user.id), user, settings };
}

export async function listUsers() {
  await ensureSchema();
  const rows = await getDb().prepare("SELECT id, username, name, role FROM users WHERE active = 1 ORDER BY name").all<SessionUser>();
  return rows.results ?? [];
}

export async function createUser(input: { username?: unknown; name?: unknown; password?: unknown; role?: unknown }) {
  await ensureSchema();
  return insertUser({ username: input.username, name: input.name, password: input.password, role: input.role === "admin" ? "admin" : "cashier" });
}

export async function removeUser(id: number, actingUser: SessionUser) {
  await ensureSchema();
  const db = getDb();
  if (id === actingUser.id) throw new Error("No puedes eliminar tu propio usuario.");
  const target = await db.prepare("SELECT role FROM users WHERE id = ? AND active = 1").bind(id).first<{ role: Role }>();
  if (!target) throw new Error("El usuario no existe.");
  if (target.role === "admin") {
    const admins = await db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND active = 1").first<{ count: number }>();
    if ((admins?.count ?? 0) <= 1) throw new Error("Debe quedar al menos un administrador.");
  }
  // Tickets keep the cashier's name as text, so the account itself can go.
  await db.batch([
    db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id),
    db.prepare("DELETE FROM users WHERE id = ?").bind(id),
  ]);
  return listUsers();
}

export async function changePassword(user: SessionUser, input: { current?: unknown; next?: unknown }) {
  await ensureSchema();
  const db = getDb();
  const next = validatePassword(input.next);
  const row = await db.prepare("SELECT password_hash AS passwordHash FROM users WHERE id = ?").bind(user.id).first<{ passwordHash: string }>();
  if (!row || !(await verifyPassword(typeof input.current === "string" ? input.current : "", row.passwordHash))) {
    throw new Error("La contrasena actual no es correcta.");
  }
  await db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(await hashPassword(next), user.id).run();
}

/**
 * Runs an API handler for a signed-in user. Replies 401 without a valid
 * session and 403 when the handler needs an administrator.
 */
export async function withUser(request: Request, handler: (user: SessionUser) => Promise<Response>, options?: { admin?: boolean }) {
  try {
    const user = await getSessionUser(request);
    if (!user) return Response.json({ error: "Inicia sesion para continuar." }, { status: 401 });
    if (options?.admin && user.role !== "admin") return Response.json({ error: "Solo un administrador puede hacer esto." }, { status: 403 });
    return await handler(user);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No se pudo completar la operacion." }, { status: 400 });
  }
}

/** Parses a JSON body as a plain object; anything else becomes an empty object. */
export async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
