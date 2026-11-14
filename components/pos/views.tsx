"use client";

import { useState, type ReactNode } from "react";
import { BarChart3, CalendarDays, CircleDollarSign, ClipboardList, CreditCard, ReceiptText, Settings2, Sparkles, Tag, UserRound, UsersRound, WalletCards, type LucideIcon } from "lucide-react";
import type { BusinessSettings, Giro } from "@/db/giros";
import { Confirm, Field, Modal, api, errorMessage, initials, money, plural, type Appointment, type AppointmentStatus, type Cash, type CartItem, type Client, type Product, type Reports, type Staff, type Ticket, type Totals } from "./shared";

export type ViewKey = "agenda" | "cobro" | "clientes" | "catalogo" | "personal" | "caja" | "tickets" | "reportes" | "config";

export const VIEW_ICONS: Record<ViewKey, LucideIcon> = {
  agenda: CalendarDays,
  cobro: CircleDollarSign,
  clientes: UserRound,
  catalogo: Tag,
  personal: UsersRound,
  caja: WalletCards,
  tickets: ReceiptText,
  reportes: BarChart3,
  config: Settings2,
};

export const STATUS_LABELS: Record<AppointmentStatus, string> = { confirmed: "Confirmada", in_service: "En servicio", completed: "Completada", cancelled: "Cancelada" };

type Notify = (message: string) => void;

export function Heading({ view, eyebrow, title, action }: { view: ViewKey; eyebrow: string; title: string; action?: ReactNode }) {
  const Icon = VIEW_ICONS[view];
  return (
    <div className="heading">
      <div className="heading-copy">
        <span className="heading-icon"><Icon size={18} /></span>
        <div>
          <span>{eyebrow}</span>
          <h1>{title}</h1>
        </div>
      </div>
      {action}
    </div>
  );
}

function Metric({ label, value, detail, icon: Icon, percent }: { label: string; value: string; detail: string; icon: LucideIcon; percent?: number }) {
  return (
    <div className="metric">
      <div className="metric-top">
        <span>{label}</span>
        <i><Icon size={16} /></i>
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
      {percent != null && <div className="bar"><div style={{ width: `${percent}%` }} /></div>}
    </div>
  );
}

export function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="empty">
      <i><Sparkles size={18} /></i>
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  );
}

export function Agenda({ date, setDate, items, newAppointment, update, prepare }: { date: string; setDate: (value: string) => void; items: Appointment[]; newAppointment: () => void; update: (id: number, status: AppointmentStatus) => Promise<void>; prepare: (appointment: Appointment) => void }) {
  const [cancelling, setCancelling] = useState<Appointment | null>(null);
  const active = items.filter((item) => item.status !== "cancelled");
  const occupancy = Math.min(100, active.length * 14);
  return (
    <>
      <Heading
        view="agenda"
        eyebrow="Recepcion"
        title="Agenda del dia"
        action={
          <div className="actions">
            <input className="input" type="date" value={date} onChange={(event) => event.target.value && setDate(event.target.value)} aria-label="Fecha" />
            <button className="button primary" onClick={newAppointment}>+ Nueva cita</button>
          </div>
        }
      />
      <div className="metrics">
        <Metric icon={CalendarDays} label="Citas" value={String(active.length)} detail="programadas" />
        <Metric icon={CalendarDays} label="Por recibir" value={String(items.filter((item) => item.status === "confirmed").length)} detail="citas confirmadas" />
        <Metric icon={CircleDollarSign} label="Servicios" value={money(active.reduce((sum, item) => sum + item.total, 0))} detail="valor programado" />
        <Metric icon={ClipboardList} label="Ocupacion" value={`${occupancy}%`} detail="capacidad estimada" percent={occupancy} />
      </div>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Horario</h2>
            <p>{new Date(`${date}T12:00`).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}</p>
          </div>
          <b>{plural(items.length, "registro")}</b>
        </div>
        {!items.length ? (
          <Empty title="No hay citas para este dia" detail="Registra una cita o selecciona otra fecha." />
        ) : (
          <div className="schedule">
            {items.map((item) => (
              <article className={`appointment ${item.status}`} key={item.id}>
                <time>{item.startsAt.split("T")[1]?.slice(0, 5)}</time>
                <div>
                  <h3>{item.clientName} <em className={`status ${item.status}`}>{STATUS_LABELS[item.status]}</em></h3>
                  <strong>{item.serviceName}</strong>
                  <p>{item.staffName} · {item.durationMinutes} min · {item.clientPhone}</p>
                  {item.notes && <small>{item.notes}</small>}
                </div>
                <aside>
                  <b>{money(item.total)}</b>
                  <div>
                    {item.status === "confirmed" && <button className="button small" onClick={() => update(item.id, "in_service")}>Recibir</button>}
                    {item.status === "in_service" && <button className="button primary small" onClick={() => prepare(item)}>Cobrar</button>}
                    {item.status === "confirmed" && <button className="icon danger" onClick={() => setCancelling(item)} aria-label="Cancelar cita">×</button>}
                  </div>
                </aside>
              </article>
            ))}
          </div>
        )}
      </section>
      {cancelling && (
        <Confirm
          title="Cancelar cita"
          text={`La cita de ${cancelling.clientName} quedara marcada como cancelada.`}
          label="Cancelar cita"
          close={() => setCancelling(null)}
          onConfirm={() => update(cancelling.id, "cancelled")}
        />
      )}
    </>
  );
}

type SaleProps = {
  giro: Giro;
  products: Product[];
  categories: string[];
  category: string;
  setCategory: (value: string) => void;
  cart: CartItem[];
  add: (product: Product) => void;
  justAdded: number | null;
  changeQty: (id: number, delta: number) => void;
  clear: () => void;
  clients: Client[];
  staff: Staff[];
  clientId: number | null;
  staffId: number | null;
  setClientId: (value: number | null) => void;
  setStaffId: (value: number | null) => void;
  payment: string;
  setPayment: (value: string) => void;
  discount: number;
  tip: number;
  setDiscount: (value: number) => void;
  setTip: (value: number) => void;
  totals: Totals;
  busy: boolean;
  charge: () => void;
};

export function Sale(props: SaleProps) {
  const count = props.cart.reduce((sum, item) => sum + item.qty, 0);
  const toId = (value: string) => (value ? Number(value) : null);
  return (
    <>
      <Heading view="cobro" eyebrow="Punto de venta" title="Nuevo cobro" />
      <div className="sale">
        <div>
          <div className="filters">
            {props.categories.map((name) => (
              <button className={name === props.category ? "active" : ""} onClick={() => props.setCategory(name)} key={name}>{name}</button>
            ))}
          </div>
          {!props.products.length ? (
            <section className="panel"><Empty title="El catalogo esta vacio" detail={`Agrega conceptos en ${props.giro.catalog} para empezar a vender.`} /></section>
          ) : (
            <div className="catalog">
              {props.products.map((product) => (
                <button onClick={() => props.add(product)} key={product.id}>
                  <i className={product.station === "Barra" ? "service" : "product"} />
                  <span>
                    <strong>{product.name}</strong>
                    <small>{product.station === "Barra" ? `${product.durationMinutes} min · Servicio` : product.category}</small>
                  </span>
                  <b>{money(product.price)}</b>
                </button>
              ))}
            </div>
          )}
        </div>
        <aside className="checkout">
          <div className="checkout-head">
            <div>
              <span>VENTA ACTUAL</span>
              <h2>{count ? plural(count, "concepto") : "Sin conceptos"}</h2>
            </div>
            <button onClick={props.clear}>Limpiar</button>
          </div>
          <div className="form-grid">
            <Field label="Cliente">
              <select className="input" value={props.clientId ?? ""} onChange={(event) => props.setClientId(toId(event.target.value))}>
                <option value="">Mostrador</option>
                {props.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
              </select>
            </Field>
            <Field label={props.giro.role}>
              <select className="input" value={props.staffId ?? ""} onChange={(event) => props.setStaffId(toId(event.target.value))}>
                <option value="">Sin asignar</option>
                {props.staff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="cart">
            {!props.cart.length ? (
              <Empty title="La venta esta vacia" detail="Selecciona un concepto del catalogo." />
            ) : (
              props.cart.map((item) => (
                <div key={item.id} className={item.id === props.justAdded ? "added" : ""}>
                  <span>
                    <strong>{item.name}</strong>
                    <small>{money(item.price)} c/u</small>
                  </span>
                  <div className="stepper">
                    <button onClick={() => props.changeQty(item.id, -1)} aria-label="Quitar uno">−</button>
                    <b>{item.qty}</b>
                    <button onClick={() => props.changeQty(item.id, 1)} aria-label="Agregar uno">+</button>
                  </div>
                  <strong>{money(item.price * item.qty)}</strong>
                </div>
              ))
            )}
          </div>
          <div className="sliders">
            <Field label={`Descuento ${props.discount}%`}>
              <input type="range" min="0" max="30" value={props.discount} onChange={(event) => props.setDiscount(Number(event.target.value))} />
            </Field>
            <Field label={`Propina ${props.tip}%`}>
              <input type="range" min="0" max="25" value={props.tip} onChange={(event) => props.setTip(Number(event.target.value))} />
            </Field>
          </div>
          <div className="totals">
            <span>Subtotal <b>{money(props.totals.subtotal)}</b></span>
            <span>Descuento <b>−{money(props.totals.discountAmount)}</b></span>
            <span>IVA incluido <b>{money(props.totals.tax)}</b></span>
            <span>Propina <b>{money(props.totals.tipAmount)}</b></span>
            <strong>Total <b>{money(props.totals.total)}</b></strong>
          </div>
          <div className="segmented">
            {["Efectivo", "Tarjeta", "Transferencia"].map((method) => (
              <button className={props.payment === method ? "active" : ""} onClick={() => props.setPayment(method)} key={method}>{method}</button>
            ))}
          </div>
          <button className="button charge" disabled={!props.cart.length || props.busy} onClick={props.charge}>
            {props.busy ? "Procesando..." : `Cobrar ${money(props.totals.total)}`}
          </button>
        </aside>
      </div>
    </>
  );
}

/** Shared shell for the "new record" dialogs: runs `save`, shows its error, and closes on success. */
function FormModal({ eyebrow, title, submitLabel, canSubmit, save, close, children }: { eyebrow: string; title: string; submitLabel: string; canSubmit: boolean; save: () => Promise<void>; close: () => void; children: ReactNode }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await save();
      close();
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  }

  return (
    <Modal eyebrow={eyebrow} title={title} close={close}>
      <form className="modal-form" onSubmit={submit}>
        {children}
        {error && <p className="error">{error}</p>}
        <div className="modal-actions">
          <button className="button" type="button" onClick={close}>Cancelar</button>
          <button className="button primary" type="submit" disabled={!canSubmit || busy}>{submitLabel}</button>
        </div>
      </form>
    </Modal>
  );
}

export function Clients({ clients, refresh, notify }: { clients: Client[]; refresh: () => Promise<void>; notify: Notify }) {
  const blank = { name: "", phone: "", email: "", notes: "" };
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const set = (patch: Partial<typeof blank>) => setForm((current) => ({ ...current, ...patch }));
  const visible = clients.filter((client) => `${client.name} ${client.phone}`.toLowerCase().includes(query.toLowerCase()));

  async function save() {
    await api("/api/salon", { action: "client", ...form });
    setForm(blank);
    await refresh();
    notify("Cliente guardado");
  }

  return (
    <>
      <Heading view="clientes" eyebrow="Directorio" title="Clientes" action={<button className="button primary" onClick={() => setOpen(true)}>+ Nuevo cliente</button>} />
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Directorio de clientes</h2>
            <p>{clients.length} clientes registrados</p>
          </div>
          <input className="input" placeholder="Buscar nombre o telefono" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        {!visible.length ? (
          <Empty title={clients.length ? "Sin resultados" : "Aun no hay clientes"} detail={clients.length ? "Ningun cliente coincide con la busqueda." : "Registra a tu primer cliente."} />
        ) : (
          <div className="client-list">
            {visible.map((client) => (
              <article key={client.id}>
                <i>{initials(client.name)}</i>
                <div>
                  <h3>{client.name}</h3>
                  <p>{client.phone}{client.email ? ` · ${client.email}` : ""}</p>
                  {client.notes && <small>{client.notes}</small>}
                </div>
                <aside>
                  <span>Ultima visita</span>
                  <b>{client.lastVisit?.slice(0, 10) || "Sin visitas"}</b>
                </aside>
              </article>
            ))}
          </div>
        )}
      </section>
      {open && (
        <FormModal eyebrow="Directorio" title="Nuevo cliente" submitLabel="Guardar cliente" canSubmit={!!form.name.trim() && !!form.phone.trim()} save={save} close={() => setOpen(false)}>
          <div className="form-grid">
            <Field label="Nombre completo"><input className="input" value={form.name} onChange={(event) => set({ name: event.target.value })} autoFocus /></Field>
            <Field label="Telefono"><input className="input" value={form.phone} onChange={(event) => set({ phone: event.target.value })} inputMode="tel" /></Field>
          </div>
          <Field label="Correo opcional"><input className="input" type="email" value={form.email} onChange={(event) => set({ email: event.target.value })} /></Field>
          <Field label="Notas"><textarea className="input" value={form.notes} onChange={(event) => set({ notes: event.target.value })} /></Field>
        </FormModal>
      )}
    </>
  );
}

export function Catalog({ giro, products, refresh, notify }: { giro: Giro; products: Product[]; refresh: () => Promise<void>; notify: Notify }) {
  const blank = { name: "", category: products[0]?.category ?? "General", price: "", station: giro.agenda ? "Barra" : "Cocina", durationMinutes: "60", commissionPercent: "35" };
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [removing, setRemoving] = useState<Product | null>(null);
  const set = (patch: Partial<typeof blank>) => setForm((current) => ({ ...current, ...patch }));
  const isService = form.station === "Barra";

  async function save() {
    await api("/api/products", { ...form, price: Number(form.price), durationMinutes: Number(form.durationMinutes), commissionPercent: Number(form.commissionPercent) });
    setForm({ ...form, name: "", price: "" });
    await refresh();
    notify("Concepto agregado al catalogo");
  }

  return (
    <>
      <Heading view="catalogo" eyebrow="Catalogo" title={giro.catalog} action={<button className="button primary" onClick={() => setOpen(true)}>+ Nuevo concepto</button>} />
      <section className="panel table-wrap">
        {!products.length ? (
          <Empty title="El catalogo esta vacio" detail="Agrega tu primer concepto para empezar a vender." />
        ) : (
          <table>
            <thead>
              <tr><th>Concepto</th><th>Tipo</th><th>Categoria</th><th>Duracion</th><th>Precio</th><th /></tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td><b>{product.name}</b></td>
                  <td><em>{product.station === "Barra" ? "Servicio" : "Producto"}</em></td>
                  <td>{product.category}</td>
                  <td>{product.durationMinutes ? `${product.durationMinutes} min` : "—"}</td>
                  <td><b>{money(product.price)}</b></td>
                  <td className="cell-action"><button className="icon danger" onClick={() => setRemoving(product)} aria-label={`Eliminar ${product.name}`}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      {open && (
        <FormModal eyebrow="Catalogo" title="Nuevo concepto" submitLabel="Guardar concepto" canSubmit={!!form.name.trim() && Number(form.price) > 0} save={save} close={() => setOpen(false)}>
          <Field label="Nombre"><input className="input" value={form.name} onChange={(event) => set({ name: event.target.value })} autoFocus /></Field>
          <div className="form-grid">
            <Field label="Tipo">
              <select className="input" value={form.station} onChange={(event) => set({ station: event.target.value })}>
                <option value="Barra">Servicio</option>
                <option value="Cocina">Producto</option>
              </select>
            </Field>
            <Field label="Categoria"><input className="input" value={form.category} onChange={(event) => set({ category: event.target.value })} /></Field>
          </div>
          {isService ? (
            <>
              <div className="form-grid">
                <Field label="Precio"><input className="input" type="number" min="1" value={form.price} onChange={(event) => set({ price: event.target.value })} /></Field>
                <Field label="Duracion min"><input className="input" type="number" min="15" value={form.durationMinutes} onChange={(event) => set({ durationMinutes: event.target.value })} /></Field>
              </div>
              <Field label="Comision %"><input className="input" type="number" min="0" max="100" value={form.commissionPercent} onChange={(event) => set({ commissionPercent: event.target.value })} /></Field>
            </>
          ) : (
            <Field label="Precio"><input className="input" type="number" min="1" value={form.price} onChange={(event) => set({ price: event.target.value })} /></Field>
          )}
        </FormModal>
      )}
      {removing && (
        <Confirm
          title="Eliminar concepto"
          text={`"${removing.name}" dejara de aparecer en el catalogo y en el punto de venta. Los tickets anteriores no cambian.`}
          label="Eliminar"
          close={() => setRemoving(null)}
          onConfirm={async () => {
            await api("/api/products", { id: removing.id }, "DELETE");
            await refresh();
            notify("Concepto eliminado");
          }}
        />
      )}
    </>
  );
}

export function People({ giro, staff, refresh, notify }: { giro: Giro; staff: Staff[]; refresh: () => Promise<void>; notify: Notify }) {
  const blank = { name: "", specialty: "", commissionPercent: giro.agenda ? "35" : "0" };
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [removing, setRemoving] = useState<Staff | null>(null);
  const set = (patch: Partial<typeof blank>) => setForm((current) => ({ ...current, ...patch }));
  const role = giro.role.toLowerCase();

  async function save() {
    await api("/api/salon", { action: "staff", ...form, commissionPercent: Number(form.commissionPercent) });
    setForm(blank);
    await refresh();
    notify("Personal guardado");
  }

  return (
    <>
      <Heading view="personal" eyebrow="Equipo" title="Personal y comisiones" action={<button className="button primary" onClick={() => setOpen(true)}>+ Nuevo {role}</button>} />
      {!staff.length ? (
        <section className="panel"><Empty title="Aun no hay personal" detail="Agrega a tu equipo para asignar ventas, citas y comisiones." /></section>
      ) : (
        <section className="people-grid">
          {staff.map((member) => (
            <article key={member.id}>
              <i>{initials(member.name)}</i>
              <div>
                <h2>{member.name}</h2>
                <p>{member.specialty}</p>
              </div>
              <button className="icon danger" onClick={() => setRemoving(member)} aria-label={`Dar de baja a ${member.name}`}>×</button>
              <aside>
                <span>Comision base</span>
                <b>{member.commissionPercent}%</b>
              </aside>
            </article>
          ))}
        </section>
      )}
      {open && (
        <FormModal eyebrow="Equipo" title={`Nuevo ${role}`} submitLabel="Guardar" canSubmit={!!form.name.trim() && !!form.specialty.trim()} save={save} close={() => setOpen(false)}>
          <Field label="Nombre"><input className="input" value={form.name} onChange={(event) => set({ name: event.target.value })} autoFocus /></Field>
          <div className="form-grid">
            <Field label="Especialidad o area"><input className="input" value={form.specialty} onChange={(event) => set({ specialty: event.target.value })} /></Field>
            <Field label="Comision base %"><input className="input" type="number" min="0" max="100" value={form.commissionPercent} onChange={(event) => set({ commissionPercent: event.target.value })} /></Field>
          </div>
        </FormModal>
      )}
      {removing && (
        <Confirm
          title="Dar de baja"
          text={`${removing.name} dejara de aparecer para nuevas ventas y citas. Su historial se conserva.`}
          label="Dar de baja"
          close={() => setRemoving(null)}
          onConfirm={async () => {
            await api("/api/salon", { action: "staffRemove", id: removing.id });
            await refresh();
            notify("Personal dado de baja");
          }}
        />
      )}
    </>
  );
}

export function Register({ cash, refresh, notify }: { cash: Cash | null; refresh: () => Promise<void>; notify: Notify }) {
  const [opening, setOpening] = useState("500");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [type, setType] = useState("out");
  const [closing, setClosing] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);

  async function act(body: Record<string, unknown>, done: string) {
    try {
      await api("/api/cash", body);
      await refresh();
      notify(done);
      return true;
    } catch (cause) {
      notify(errorMessage(cause));
      return false;
    }
  }

  if (!cash) return <Empty title="Cargando caja" detail="Espera un momento." />;
  const { summary, openShift } = cash;

  return (
    <>
      <Heading view="caja" eyebrow="Control de efectivo" title="Caja" />
      <div className="metrics">
        <Metric icon={CircleDollarSign} label="Venta del turno" value={money(summary.totalSales)} detail={plural(summary.ticketCount, "ticket")} />
        <Metric icon={WalletCards} label="Efectivo esperado" value={money(summary.expectedCash)} detail="fondo y movimientos" />
        <Metric icon={CreditCard} label="Tarjeta" value={money(summary.cardSales)} detail="cobros bancarios" />
        <Metric icon={WalletCards} label="Transferencias" value={money(summary.transferSales)} detail="pagos recibidos" />
      </div>
      <div className={openShift ? "two-col" : ""}>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>{openShift ? "Turno abierto" : "Caja cerrada"}</h2>
              <p>{openShift ? `Responsable: ${openShift.cashier}` : "Abre un turno con el fondo inicial para comenzar"}</p>
            </div>
          </div>
          {openShift ? (
            <>
              <div className="cash-row">
                <select className="input" value={type} onChange={(event) => setType(event.target.value)} aria-label="Tipo de movimiento">
                  <option value="out">Salida</option>
                  <option value="in">Entrada</option>
                </select>
                <input className="input" placeholder="Motivo" value={reason} onChange={(event) => setReason(event.target.value)} />
                <input className="input" type="number" min="1" placeholder="Importe" value={amount} onChange={(event) => setAmount(event.target.value)} />
                <button
                  className="button primary"
                  disabled={!reason.trim() || !(Number(amount) > 0)}
                  onClick={async () => {
                    if (await act({ action: "movement", type, reason, amount: Number(amount) }, "Movimiento registrado")) {
                      setAmount("");
                      setReason("");
                    }
                  }}
                >
                  Registrar
                </button>
              </div>
              <div className="movements">
                <div>
                  <i className="in">+</i>
                  <span><b>Fondo de caja</b><small>Apertura</small></span>
                  <strong>{money(openShift.openingCash)}</strong>
                </div>
                {cash.movements.map((movement) => (
                  <div key={movement.id}>
                    <i className={movement.type}>{movement.type === "in" ? "+" : "−"}</i>
                    <span><b>{movement.reason}</b><small>{movement.createdAt}</small></span>
                    <strong>{money(movement.amount)}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="cash-row open-row">
              <input className="input" type="number" min="0" value={opening} onChange={(event) => setOpening(event.target.value)} aria-label="Fondo inicial" />
              <button className="button primary" onClick={() => act({ action: "open", openingCash: Number(opening) }, "Caja abierta")}>Abrir caja</button>
            </div>
          )}
        </section>
        {openShift && (
          <aside className="form-panel">
            <h2>Cerrar turno</h2>
            <p>Cuenta el efectivo fisico.</p>
            <Field label="Efectivo contado">
              <input className="input" type="number" min="0" value={closing} onChange={(event) => setClosing(event.target.value)} />
            </Field>
            <div className="reconcile"><span>Esperado</span><b>{money(summary.expectedCash)}</b></div>
            <button className="button danger-fill" disabled={closing === ""} onClick={() => setConfirmClose(true)}>Cerrar caja</button>
          </aside>
        )}
      </div>
      {confirmClose && (
        <Confirm
          title="Cerrar caja"
          text={`Esperado ${money(summary.expectedCash)}, contado ${money(Number(closing))}. Para volver a cobrar habra que abrir un nuevo turno.`}
          label="Cerrar caja"
          close={() => setConfirmClose(false)}
          onConfirm={async () => {
            await api("/api/cash", { action: "close", closingCash: Number(closing) });
            setClosing("");
            await refresh();
            notify("Caja cerrada");
          }}
        />
      )}
    </>
  );
}

export function TicketList({ settings, tickets, selected, select, refresh, notify }: { settings: BusinessSettings; tickets: Ticket[]; selected: Ticket | null; select: (ticket: Ticket) => void; refresh: () => Promise<void>; notify: Notify }) {
  const [cancelling, setCancelling] = useState(false);
  return (
    <>
      <Heading view="tickets" eyebrow="Ventas" title="Tickets" action={selected ? <button className="button primary" onClick={() => window.print()}>Imprimir ticket</button> : undefined} />
      <div className="ticket-layout">
        <section className="panel ticket-list">
          {!tickets.length ? (
            <Empty title="Aun no hay tickets" detail="Los cobros que registres apareceran aqui." />
          ) : (
            tickets.map((ticket) => (
              <button className={selected?.folio === ticket.folio ? "selected" : ""} key={ticket.folio} onClick={() => select(ticket)}>
                <span><b>{ticket.folio}</b><small>{ticket.table} · {ticket.createdAt}</small></span>
                <em className={`status ${ticket.status === "paid" ? "completed" : "cancelled"}`}>{ticket.status === "paid" ? "Pagado" : "Cancelado"}</em>
                <strong>{money(ticket.totals.total)}</strong>
              </button>
            ))
          )}
        </section>
        <aside>
          {selected && (
            <>
              <Receipt settings={settings} ticket={selected} />
              {selected.status === "paid" && <button className="button danger-fill full" onClick={() => setCancelling(true)}>Cancelar ticket</button>}
            </>
          )}
        </aside>
      </div>
      {cancelling && selected && (
        <Confirm
          title="Cancelar ticket"
          text={`El ticket ${selected.folio} por ${money(selected.totals.total)} dejara de contar en caja y reportes.`}
          label="Cancelar ticket"
          reasonLabel="Motivo de cancelacion"
          close={() => setCancelling(false)}
          onConfirm={async (reason) => {
            await api("/api/tickets", { folio: selected.folio, reason }, "PATCH");
            await refresh();
            notify(`${selected.folio} cancelado`);
          }}
        />
      )}
    </>
  );
}

type RankRow = { label: string; detail: string; value: number; display: string };

function Ranking({ title, rows }: { title: string; rows: RankRow[] }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <section className="panel ranking">
      <div className="panel-head"><h2>{title}</h2></div>
      {!rows.length ? (
        <Empty title="Sin datos" detail="Aun no hay ventas para mostrar." />
      ) : (
        rows.map((row, index) => (
          <div key={row.label}>
            <i>{index + 1}</i>
            <span>
              <b>{row.label}</b>
              <small>{row.detail}</small>
              <div className="bar"><div style={{ width: `${Math.round((row.value / max) * 100)}%` }} /></div>
            </span>
            <strong>{row.display}</strong>
          </div>
        ))
      )}
    </section>
  );
}

export function Report({ giro, data }: { giro: Giro; data: Reports | null }) {
  if (!data) return <Empty title="Preparando reportes" detail="Espera un momento." />;
  const { totals } = data;
  return (
    <>
      <Heading view="reportes" eyebrow="Resultados" title="Reportes del negocio" />
      <div className="metrics">
        <Metric icon={CircleDollarSign} label="Ventas acumuladas" value={money(totals.totalSales)} detail={`${plural(totals.ticketCount, "ticket")} ${totals.ticketCount === 1 ? "pagado" : "pagados"}`} />
        <Metric icon={BarChart3} label="Ticket promedio" value={money(totals.ticketCount ? Math.round(totals.totalSales / totals.ticketCount) : 0)} detail="promedio por venta" />
        <Metric icon={WalletCards} label="Propinas" value={money(totals.tips)} detail="registradas" />
        <Metric icon={ReceiptText} label="Cancelaciones" value={String(totals.cancelledTickets)} detail="tickets cancelados" />
      </div>
      <div className="report-grid">
        <Ranking title="Lo mas vendido" rows={data.products.map((row) => ({ label: row.name, detail: plural(row.qty, "vendido"), value: row.total, display: money(row.total) }))} />
        <Ranking title="Formas de pago" rows={data.payments.map((row) => ({ label: row.payment, detail: plural(row.count, "operacion", "operaciones"), value: row.total, display: money(row.total) }))} />
        <Ranking
          title={`Ventas por ${giro.role.toLowerCase()}`}
          rows={data.staff.map((row) => ({
            label: row.name,
            detail: `${plural(row.count, "venta")}${row.commissionPercent ? ` · comision ${money(Math.round((row.total * row.commissionPercent) / 100))}` : ""}`,
            value: row.total,
            display: money(row.total),
          }))}
        />
      </div>
    </>
  );
}

export function AppointmentForm({ giro, clients, staff, services, date, close, save }: { giro: Giro; clients: Client[]; staff: Staff[]; services: Product[]; date: string; close: () => void; save: (body: Record<string, unknown>) => Promise<void> }) {
  const [form, setForm] = useState({ clientId: clients[0]?.id ?? 0, staffId: staff[0]?.id ?? 0, productId: services[0]?.id ?? 0, date, time: "10:00", notes: "" });
  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));
  const missing = !clients.length ? "un cliente" : !staff.length ? "a alguien del personal" : !services.length ? "un concepto en el catalogo" : "";

  if (missing) {
    return (
      <Modal eyebrow="Nueva reservacion" title="Agendar cita" close={close}>
        <p>Para agendar una cita primero registra {missing}.</p>
        <div className="modal-actions"><button className="button primary" onClick={close}>Entendido</button></div>
      </Modal>
    );
  }

  return (
    <FormModal
      eyebrow="Nueva reservacion"
      title="Agendar cita"
      submitLabel="Confirmar cita"
      canSubmit={!!form.date && !!form.time}
      close={close}
      save={() => save({ clientId: form.clientId, staffId: form.staffId, productId: form.productId, startsAt: `${form.date}T${form.time}`, notes: form.notes })}
    >
      <Field label="Cliente">
        <select className="input" value={form.clientId} onChange={(event) => set({ clientId: Number(event.target.value) })}>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.name} · {client.phone}</option>)}
        </select>
      </Field>
      <Field label="Servicio">
        <select className="input" value={form.productId} onChange={(event) => set({ productId: Number(event.target.value) })}>
          {services.map((service) => <option key={service.id} value={service.id}>{service.name} · {money(service.price)}</option>)}
        </select>
      </Field>
      <Field label={giro.role}>
        <select className="input" value={form.staffId} onChange={(event) => set({ staffId: Number(event.target.value) })}>
          {staff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
        </select>
      </Field>
      <div className="form-grid">
        <Field label="Fecha"><input className="input" type="date" value={form.date} onChange={(event) => set({ date: event.target.value })} /></Field>
        <Field label="Hora"><input className="input" type="time" value={form.time} onChange={(event) => set({ time: event.target.value })} /></Field>
      </div>
      <Field label="Notas"><textarea className="input" value={form.notes} onChange={(event) => set({ notes: event.target.value })} /></Field>
    </FormModal>
  );
}

export function Receipt({ settings, ticket }: { settings: BusinessSettings; ticket: Ticket }) {
  const { totals } = ticket;
  return (
    <section className="receipt">
      <header>
        <strong>{settings.businessName.toUpperCase()}</strong>
        {settings.tagline && <span>{settings.tagline}</span>}
        {settings.rfc && <small>RFC: {settings.rfc}</small>}
      </header>
      <div>
        <span>Ticket <b>{ticket.folio}</b></span>
        <span>Cliente <b>{ticket.table}</b></span>
        <span>Fecha <b>{ticket.createdAt}</b></span>
        <span>Atendio <b>{ticket.cashier}</b></span>
        <span>Pago <b>{ticket.payment}</b></span>
      </div>
      <section>
        {ticket.items.map((item, index) => <span key={`${item.id}-${index}`}>{item.qty} × {item.name}<b>{money(item.price * item.qty)}</b></span>)}
      </section>
      <footer>
        <span>Subtotal <b>{money(totals.subtotal)}</b></span>
        <span>Descuento <b>−{money(totals.discountAmount)}</b></span>
        <span>IVA incluido <b>{money(totals.tax)}</b></span>
        <span>Propina <b>{money(totals.tipAmount)}</b></span>
        <strong>Total <b>{money(totals.total)}</b></strong>
      </footer>
      {ticket.status === "cancelled" && <em>CANCELADO</em>}
      {settings.ticketFooter && <p>{settings.ticketFooter}</p>}
    </section>
  );
}
