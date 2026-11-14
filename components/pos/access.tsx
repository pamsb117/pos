"use client";

import { useState } from "react";
import { GIROS, GIRO_KEYS, type BusinessSettings, type GiroKey } from "@/db/giros";
import { Field, api, errorMessage, initials, type PublicBusiness, type User } from "./shared";

type Session = { user: User; settings: BusinessSettings };

export function Login({ business, onSuccess }: { business: PublicBusiness; onSuccess: (session: Session) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      onSuccess(await api<Session>("/api/auth", { action: "login", username, password }));
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="brand-mark">{initials(business.businessName)}</div>
        <h1>{business.businessName}</h1>
        <p>Inicia sesion para continuar</p>
        <form onSubmit={submit}>
          <Field label="Usuario">
            <input className="input" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" autoFocus />
          </Field>
          <Field label="Contrasena">
            <input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
          </Field>
          {error && <p className="login-error">{error}</p>}
          <button className="button primary" type="submit" disabled={busy || !username || !password}>{busy ? "Entrando..." : "Iniciar sesion"}</button>
        </form>
      </div>
    </div>
  );
}

/** First-run screen: names the business and creates the owner's account. */
export function Setup({ onSuccess }: { onSuccess: (session: Session) => void }) {
  const [form, setForm] = useState({ businessName: "", giro: "salon" as GiroKey, sampleCatalog: true, name: "", username: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (form.password !== form.confirm) {
      setError("Las contrasenas no coinciden.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      onSuccess(await api<Session>("/api/auth", { action: "setup", ...form }));
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card wide">
        <div className="brand-mark">{initials(form.businessName || "Punto de venta")}</div>
        <h1>Configura tu punto de venta</h1>
        <p>Solo se hace una vez. Despues podras cambiar estos datos en Configuracion.</p>
        <form onSubmit={submit}>
          <Field label="Nombre del negocio">
            <input className="input" value={form.businessName} onChange={(event) => set({ businessName: event.target.value })} maxLength={40} required autoFocus />
          </Field>
          <Field label="Giro">
            <select className="input" value={form.giro} onChange={(event) => set({ giro: event.target.value as GiroKey })}>
              {GIRO_KEYS.map((key) => <option key={key} value={key}>{GIROS[key].label}</option>)}
            </select>
          </Field>
          <label className="check">
            <input type="checkbox" checked={form.sampleCatalog} onChange={(event) => set({ sampleCatalog: event.target.checked })} />
            Cargar un catalogo de ejemplo para este giro
          </label>
          <h2>Cuenta de administrador</h2>
          <div className="form-grid">
            <Field label="Tu nombre">
              <input className="input" value={form.name} onChange={(event) => set({ name: event.target.value })} maxLength={40} required />
            </Field>
            <Field label="Usuario">
              <input className="input" value={form.username} onChange={(event) => set({ username: event.target.value })} autoComplete="username" required />
            </Field>
          </div>
          <div className="form-grid">
            <Field label="Contrasena (min. 6)">
              <input className="input" type="password" value={form.password} onChange={(event) => set({ password: event.target.value })} autoComplete="new-password" minLength={6} required />
            </Field>
            <Field label="Repite la contrasena">
              <input className="input" type="password" value={form.confirm} onChange={(event) => set({ confirm: event.target.value })} autoComplete="new-password" minLength={6} required />
            </Field>
          </div>
          {error && <p className="login-error">{error}</p>}
          <button className="button primary" type="submit" disabled={busy}>{busy ? "Guardando..." : "Crear y entrar"}</button>
        </form>
      </div>
    </div>
  );
}
