"use client";

import { useEffect, useState } from "react";
import { GIROS, GIRO_KEYS, type BusinessSettings, type GiroKey } from "@/db/giros";
import { Confirm, Field, api, errorMessage, type User } from "./shared";

type Props = { user: User; settings: BusinessSettings; onSettings: (settings: BusinessSettings) => void; notify: (message: string) => void };

export function Settings({ user, settings, onSettings, notify }: Props) {
  const admin = user.role === "admin";
  return (
    <div className="settings-grid">
      {admin && <BusinessPanel settings={settings} onSettings={onSettings} notify={notify} />}
      {admin && <UsersPanel user={user} notify={notify} />}
      <PasswordPanel notify={notify} />
    </div>
  );
}

function BusinessPanel({ settings, onSettings, notify }: Omit<Props, "user">) {
  const [form, setForm] = useState(settings);
  const [error, setError] = useState("");
  const set = (patch: Partial<BusinessSettings>) => setForm((current) => ({ ...current, ...patch }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const saved = await api<{ settings: BusinessSettings }>("/api/settings", form);
      onSettings(saved.settings);
      setForm(saved.settings);
      notify("Configuracion guardada");
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Datos del negocio</h2>
          <p>Aparecen en la barra superior y en el ticket</p>
        </div>
      </div>
      <form className="panel-body" onSubmit={submit}>
        <Field label="Nombre del negocio">
          <input className="input" value={form.businessName} onChange={(event) => set({ businessName: event.target.value })} maxLength={40} required />
        </Field>
        <Field label="Giro">
          {/* Picking a business type suggests its tagline and whether the agenda applies; both stay editable. */}
          <select
            className="input"
            value={form.giro}
            onChange={(event) => {
              const giro = event.target.value as GiroKey;
              set({ giro, tagline: GIROS[giro].tagline, agenda: GIROS[giro].agenda });
            }}
          >
            {GIRO_KEYS.map((key) => <option key={key} value={key}>{GIROS[key].label}</option>)}
          </select>
        </Field>
        <Field label="Lema o descripcion">
          <input className="input" value={form.tagline} onChange={(event) => set({ tagline: event.target.value })} maxLength={60} />
        </Field>
        <div className="form-grid">
          <Field label="RFC">
            <input className="input" value={form.rfc} onChange={(event) => set({ rfc: event.target.value })} maxLength={13} />
          </Field>
          <Field label="Mensaje del ticket">
            <input className="input" value={form.ticketFooter} onChange={(event) => set({ ticketFooter: event.target.value })} maxLength={60} />
          </Field>
        </div>
        <label className="check">
          <input type="checkbox" checked={form.agenda} onChange={(event) => set({ agenda: event.target.checked })} />
          Usar agenda de citas
        </label>
        {error && <p className="error">{error}</p>}
        <div className="row-actions">
          <button className="button primary" type="submit">Guardar cambios</button>
        </div>
      </form>
    </section>
  );
}

function UsersPanel({ user, notify }: Pick<Props, "user" | "notify">) {
  const empty = { name: "", username: "", password: "", role: "cashier" };
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<User | null>(null);
  const set = (patch: Partial<typeof empty>) => setForm((current) => ({ ...current, ...patch }));

  useEffect(() => {
    let cancelled = false;
    api<{ users: User[] }>("/api/users")
      .then((data) => {
        if (!cancelled) setUsers(data.users);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      setUsers((await api<{ users: User[] }>("/api/users", form)).users);
      setForm(empty);
      notify("Usuario creado");
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Usuarios</h2>
          <p>Quienes pueden entrar al sistema</p>
        </div>
        <b>{users.length}</b>
      </div>
      <div className="user-list">
        {users.map((item) => (
          <div key={item.id}>
            <span>
              <b>{item.name}</b>
              <small>{item.username} · {item.role === "admin" ? "Administrador" : "Cajero"}</small>
            </span>
            {item.id !== user.id && <button className="icon danger" onClick={() => setRemoving(item)} aria-label={`Eliminar a ${item.name}`}>×</button>}
          </div>
        ))}
      </div>
      <form className="panel-body" onSubmit={submit}>
        <div className="form-grid">
          <Field label="Nombre">
            <input className="input" value={form.name} onChange={(event) => set({ name: event.target.value })} maxLength={40} required />
          </Field>
          <Field label="Usuario">
            <input className="input" value={form.username} onChange={(event) => set({ username: event.target.value })} autoComplete="off" required />
          </Field>
        </div>
        <div className="form-grid">
          <Field label="Contrasena (min. 6)">
            <input className="input" type="password" value={form.password} onChange={(event) => set({ password: event.target.value })} autoComplete="new-password" minLength={6} required />
          </Field>
          <Field label="Permisos">
            <select className="input" value={form.role} onChange={(event) => set({ role: event.target.value })}>
              <option value="cashier">Cajero</option>
              <option value="admin">Administrador</option>
            </select>
          </Field>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="row-actions">
          <button className="button primary" type="submit">Agregar usuario</button>
        </div>
      </form>
      {removing && (
        <Confirm
          title="Eliminar usuario"
          text={`${removing.name} ya no podra iniciar sesion. Sus ventas registradas se conservan.`}
          label="Eliminar"
          close={() => setRemoving(null)}
          onConfirm={async () => {
            setUsers((await api<{ users: User[] }>("/api/users", { id: removing.id }, "DELETE")).users);
            notify("Usuario eliminado");
          }}
        />
      )}
    </section>
  );
}

function PasswordPanel({ notify }: Pick<Props, "notify">) {
  const empty = { current: "", next: "", confirm: "" };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const set = (patch: Partial<typeof empty>) => setForm((current) => ({ ...current, ...patch }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (form.next !== form.confirm) {
      setError("Las contrasenas nuevas no coinciden.");
      return;
    }
    setError("");
    try {
      await api("/api/auth", { action: "password", current: form.current, next: form.next });
      setForm(empty);
      notify("Contrasena actualizada");
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Mi contrasena</h2>
          <p>Cambia la contrasena de tu usuario</p>
        </div>
      </div>
      <form className="panel-body" onSubmit={submit}>
        <Field label="Contrasena actual">
          <input className="input" type="password" value={form.current} onChange={(event) => set({ current: event.target.value })} autoComplete="current-password" required />
        </Field>
        <div className="form-grid">
          <Field label="Nueva (min. 6)">
            <input className="input" type="password" value={form.next} onChange={(event) => set({ next: event.target.value })} autoComplete="new-password" minLength={6} required />
          </Field>
          <Field label="Repite la nueva">
            <input className="input" type="password" value={form.confirm} onChange={(event) => set({ confirm: event.target.value })} autoComplete="new-password" minLength={6} required />
          </Field>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="row-actions">
          <button className="button primary" type="submit">Cambiar contrasena</button>
        </div>
      </form>
    </section>
  );
}
