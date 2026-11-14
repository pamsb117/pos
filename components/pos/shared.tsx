"use client";

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { BusinessSettings } from "@/db/giros";

export type User = { id: number; username: string; name: string; role: "admin" | "cashier" };
export type Product = { id: number; name: string; category: string; price: number; station: "Barra" | "Cocina"; tag: string | null; durationMinutes: number; commissionPercent: number };
export type Client = { id: number; name: string; phone: string; email: string | null; notes: string | null; lastVisit: string | null };
export type Staff = { id: number; name: string; specialty: string; commissionPercent: number };
export type AppointmentStatus = "confirmed" | "in_service" | "completed" | "cancelled";
export type Appointment = { id: number; clientId: number; clientName: string; clientPhone: string; staffId: number; staffName: string; productId: number | null; serviceName: string; startsAt: string; durationMinutes: number; status: AppointmentStatus; notes: string | null; total: number };
export type CartItem = Product & { qty: number };
export type Totals = { subtotal: number; discountAmount: number; tax: number; tipAmount: number; total: number };
export type Ticket = { folio: string; table: string; cashier: string; payment: string; createdAt: string; status: "paid" | "cancelled"; items: CartItem[]; totals: Totals };
export type Cash = {
  openShift: { id: number; cashier: string; openingCash: number } | null;
  movements: Array<{ id: number; type: "in" | "out"; reason: string; amount: number; createdAt: string }>;
  summary: { cashSales: number; cardSales: number; transferSales: number; cashIn: number; cashOut: number; expectedCash: number; ticketCount: number; totalSales: number };
};
export type Reports = {
  totals: { ticketCount: number; totalSales: number; subtotal: number; tax: number; tips: number; cancelledTickets: number };
  payments: Array<{ payment: string; count: number; total: number }>;
  products: Array<{ name: string; qty: number; total: number }>;
  staff: Array<{ name: string; specialty: string; commissionPercent: number; count: number; total: number }>;
};
export type PublicBusiness = Pick<BusinessSettings, "businessName" | "tagline">;

/** Fired when the server rejects a request for lack of a session, so the app can return to the login screen. */
export const SESSION_EXPIRED = "pos-session-expired";

/** Calls a JSON API route. Sends `body` as a POST unless `method` says otherwise; throws the server's message on failure. */
export async function api<T>(url: string, body?: unknown, method?: string): Promise<T> {
  const response = await fetch(
    url,
    body === undefined
      ? { method: method ?? "GET" }
      : { method: method ?? "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
  );
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (response.status === 401) window.dispatchEvent(new Event(SESSION_EXPIRED));
  if (!response.ok) throw new Error(data.error ?? "No se pudo completar la operacion.");
  return data as T;
}

export const errorMessage = (error: unknown, fallback = "No se pudo completar la operacion.") => (error instanceof Error ? error.message : fallback);

const currency = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
export const money = (amount: number) => currency.format(amount);
export const today = () => new Date().toLocaleDateString("en-CA");
/** "1 venta", "3 ventas". */
export const plural = (amount: number, singular: string, many = `${singular}s`) => `${amount} ${amount === 1 ? singular : many}`;
export const initials = (name: string) => name.trim().split(/\s+/).map((word) => word[0] ?? "").slice(0, 2).join("").toUpperCase() || "PV";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Modal({ eyebrow, title, close, children }: { eyebrow: string; title: string; close: () => void; children: ReactNode }) {
  // Rendered on <body>, not inside the view: the view's fade-in animates a
  // transform, and a transformed ancestor would confine this fixed overlay.
  return createPortal(
    <div className="modal-bg" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <section className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <div>
            <span>{eyebrow.toUpperCase()}</span>
            <h2>{title}</h2>
          </div>
          <button className="icon" type="button" onClick={close} aria-label="Cerrar">×</button>
        </div>
        {children}
      </section>
    </div>,
    document.body,
  );
}

/**
 * Confirmation dialog for actions that remove or close something. With
 * `reasonLabel` it also asks for a required reason and passes it to `onConfirm`.
 */
export function Confirm({ title, text, label, reasonLabel, onConfirm, close }: { title: string; text: string; label: string; reasonLabel?: string; onConfirm: (reason: string) => Promise<void>; close: () => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await onConfirm(reason.trim());
      close();
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  }

  return (
    <Modal eyebrow="Confirmar" title={title} close={close}>
      <form className="modal-form" onSubmit={submit}>
        <p>{text}</p>
        {reasonLabel && (
          <Field label={reasonLabel}>
            <input className="input" value={reason} onChange={(event) => setReason(event.target.value)} autoFocus />
          </Field>
        )}
        {error && <p className="error">{error}</p>}
        <div className="modal-actions">
          <button className="button" type="button" onClick={close}>Volver</button>
          <button className="button danger-fill" type="submit" disabled={busy || (!!reasonLabel && !reason.trim())}>{label}</button>
        </div>
      </form>
    </Modal>
  );
}
