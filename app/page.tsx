"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, ChevronRight, CloudOff, LogOut } from "lucide-react";
import { GIROS, type BusinessSettings } from "@/db/giros";
import { Login, Setup } from "@/components/pos/access";
import { Settings } from "@/components/pos/settings";
import { SESSION_EXPIRED, api, errorMessage, initials, money, today, type Appointment, type AppointmentStatus, type Cash, type CartItem, type Client, type Product, type PublicBusiness, type Reports, type Staff, type Ticket, type Totals, type User } from "@/components/pos/shared";
import { Agenda, AppointmentForm, Catalog, Clients, Heading, People, Receipt, Register, Report, STATUS_LABELS, Sale, TicketList, VIEW_ICONS, type ViewKey } from "@/components/pos/views";

type AuthStatus = { needsSetup: boolean; user: User | null; settings: BusinessSettings | PublicBusiness };
type Session =
  | { status: "loading" }
  | { status: "offline" }
  | { status: "setup" }
  | { status: "login"; business: PublicBusiness }
  | { status: "ready"; user: User; settings: BusinessSettings };

const APP_VERSION = "1.2";

export default function Home() {
  const [session, setSession] = useState<Session>({ status: "loading" });

  const check = useCallback(async () => {
    try {
      const auth = await api<AuthStatus>("/api/auth");
      if (auth.needsSetup) setSession({ status: "setup" });
      else if (auth.user) setSession({ status: "ready", user: auth.user, settings: auth.settings as BusinessSettings });
      else setSession({ status: "login", business: auth.settings });
    } catch {
      setSession({ status: "offline" });
    }
  }, []);

  useEffect(() => {
    async function refreshSession() {
      await check();
    }
    void refreshSession();
    // Any API call that comes back 401 means the session ended; ask the server where we stand.
    const onExpired = () => void refreshSession();
    window.addEventListener(SESSION_EXPIRED, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED, onExpired);
  }, [check]);

  if (session.status === "loading") return <div className="login-screen"><p className="boot-note">Cargando...</p></div>;
  if (session.status === "offline") {
    return (
      <div className="login-screen">
        <div className="login-card">
          <h1>Sin conexion con el servidor</h1>
          <p>No se pudo abrir la base de datos del punto de venta.</p>
          <button className="button primary" onClick={() => void check()}>Reintentar</button>
        </div>
      </div>
    );
  }
  if (session.status === "setup") return <Setup onSuccess={(next) => setSession({ status: "ready", ...next })} />;
  if (session.status === "login") return <Login business={session.business} onSuccess={(next) => setSession({ status: "ready", ...next })} />;

  return (
    <Workspace
      user={session.user}
      settings={session.settings}
      onSettings={(settings) => setSession({ status: "ready", user: session.user, settings })}
      onLogout={async () => {
        await api("/api/auth", { action: "logout" }).catch(() => {});
        await check();
      }}
    />
  );
}

function Workspace({ user, settings, onSettings, onLogout }: { user: User; settings: BusinessSettings; onSettings: (settings: BusinessSettings) => void; onLogout: () => void }) {
  const giro = GIROS[settings.giro];
  const [view, setView] = useState<ViewKey>(settings.agenda ? "agenda" : "cobro");
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [cash, setCash] = useState<Cash | null>(null);
  const [reports, setReports] = useState<Reports | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clientId, setClientId] = useState<number | null>(null);
  const [staffId, setStaffId] = useState<number | null>(null);
  const [appointmentId, setAppointmentId] = useState<number | null>(null);
  const [date, setDate] = useState(today());
  const [payment, setPayment] = useState("Tarjeta");
  const [discount, setDiscount] = useState(0);
  const [tip, setTip] = useState(0);
  const [category, setCategory] = useState("Todo");
  const [message, setMessage] = useState("Sincronizando...");
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [booking, setBooking] = useState(false);
  const [selectedFolio, setSelectedFolio] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<number | null>(null);

  const load = useCallback(async () => {
    const [p, s, t, c, r] = await Promise.all([
      api<{ products: Product[] }>("/api/products"),
      api<{ clients: Client[]; staff: Staff[]; appointments: Appointment[] }>("/api/salon"),
      api<{ tickets: Ticket[] }>("/api/tickets"),
      api<{ register: Cash }>("/api/cash"),
      api<{ reports: Reports }>("/api/reports"),
    ]);
    setProducts(p.products);
    setClients(s.clients);
    setStaff(s.staff);
    setAppointments(s.appointments);
    setTickets(t.tickets);
    setCash(c.register);
    setReports(r.reports);
    setOffline(false);
  }, []);

  useEffect(() => {
    async function sync() {
      try {
        await load();
        setMessage("Datos sincronizados");
      } catch {
        setOffline(true);
        setMessage("Sin conexion con la base de datos");
      }
    }
    void sync();
  }, [load]);

  const totals = useMemo<Totals>(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const discountAmount = Math.round((subtotal * discount) / 100);
    const base = subtotal - discountAmount;
    const tipAmount = Math.round((base * tip) / 100);
    return { subtotal, discountAmount, tax: Math.round((base * 16) / 116), tipAmount, total: base + tipAmount };
  }, [cart, discount, tip]);

  // The agenda can be switched off in settings while it is the open view.
  const current: ViewKey = view === "agenda" && !settings.agenda ? "cobro" : view;
  const day = appointments.filter((item) => item.startsAt.startsWith(date)).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const todayCount = appointments.filter((item) => item.startsAt.startsWith(today()) && item.status !== "cancelled").length;
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const categories = ["Todo", ...Array.from(new Set(products.map((product) => product.category)))];
  const activeCategory = categories.includes(category) ? category : "Todo";
  const visible = products.filter((product) => activeCategory === "Todo" || product.category === activeCategory);
  const selectedTicket = tickets.find((ticket) => ticket.folio === selectedFolio) ?? tickets[0] ?? null;

  const navigation: Array<{ key: ViewKey; label: string; badge?: number }> = [
    ...(settings.agenda ? [{ key: "agenda" as const, label: "Agenda", badge: todayCount }] : []),
    { key: "cobro", label: "Cobro", badge: cartCount },
    { key: "clientes", label: "Clientes" },
    { key: "catalogo", label: giro.catalog },
    { key: "personal", label: "Personal" },
    { key: "caja", label: "Caja" },
    { key: "tickets", label: "Tickets" },
    { key: "reportes", label: "Reportes" },
    { key: "config", label: "Configuracion" },
  ];

  async function refresh() {
    try {
      await load();
    } catch (cause) {
      setMessage(errorMessage(cause));
    }
  }

  async function updateAppointment(id: number, status: AppointmentStatus) {
    const data = await api<{ appointments: Appointment[] }>("/api/salon", { action: "appointmentStatus", id, status });
    setAppointments(data.appointments);
    setMessage(`Cita ${STATUS_LABELS[status].toLowerCase()}`);
  }

  function add(product: Product) {
    setCart((items) => (items.some((item) => item.id === product.id) ? items.map((item) => (item.id === product.id ? { ...item, qty: item.qty + 1 } : item)) : [...items, { ...product, qty: 1 }]));
    setJustAdded(product.id);
    setTimeout(() => setJustAdded((id) => (id === product.id ? null : id)), 450);
  }

  function prepare(appointment: Appointment) {
    const product = products.find((item) => item.id === appointment.productId);
    setCart(product ? [{ ...product, qty: 1 }] : []);
    setClientId(appointment.clientId);
    setStaffId(appointment.staffId);
    setAppointmentId(appointment.id);
    setView("cobro");
    setMessage(`Cobro preparado para ${appointment.clientName}`);
  }

  async function charge() {
    if (!cart.length) return;
    setBusy(true);
    try {
      const client = clients.find((item) => item.id === clientId);
      const data = await api<{ ticket: Ticket }>("/api/tickets", { table: client?.name ?? "Venta mostrador", payment, clientId, staffId, appointmentId, items: cart, totals });
      setCart([]);
      setClientId(null);
      setStaffId(null);
      setAppointmentId(null);
      setDiscount(0);
      setTip(0);
      await load();
      setSelectedFolio(data.ticket.folio);
      setView("tickets");
      setMessage(`${data.ticket.folio} cobrado: ${money(data.ticket.totals.total)}`);
    } catch (cause) {
      setMessage(errorMessage(cause, "No se pudo cobrar"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <header className="topbar">
        <div className="brand-mark">{initials(settings.businessName)}</div>
        <div className="brand">
          <strong>{settings.businessName}</strong>
          <span>{settings.tagline}</span>
        </div>
        <div className="topbar-context">
          <CalendarDays size={15} />
          <span>{new Date().toLocaleDateString("es-MX", { day: "numeric", month: "short" })}</span>
        </div>
        <div className={`sync ${offline ? "bad" : ""}`} aria-live="polite">
          {offline ? <CloudOff size={15} /> : <CheckCircle2 size={15} />}
          <span>{message}</span>
          <div className="user-avatar">{initials(user.name).slice(0, 1)}</div>
          <b>{user.name}</b>
          <button className="icon logout" onClick={onLogout} aria-label="Cerrar sesion" title="Cerrar sesion"><LogOut size={16} /></button>
        </div>
      </header>
      <div className="app-shell">
        <nav className="sidebar" aria-label="Navegacion principal">
          <div className="nav-heading">
            <span>Espacio de trabajo</span>
            <small>{giro.label.toUpperCase()}</small>
          </div>
          {navigation.map(({ key, label, badge }) => {
            const Icon = VIEW_ICONS[key];
            return (
              <button className={current === key ? "active" : ""} key={key} onClick={() => setView(key)}>
                <Icon size={17} />
                <span>{label}</span>
                <b>{badge || ""}</b>
                {current === key && <ChevronRight className="nav-chevron" size={14} />}
              </button>
            );
          })}
          <div className="nav-footer">
            <span>{user.role === "admin" ? "Administrador" : "Cajero"}</span>
            <small>Punto de venta · v{APP_VERSION}</small>
          </div>
        </nav>
        <section className="workspace">
          <div key={current} className="view-enter">
            {current === "agenda" && <Agenda date={date} setDate={setDate} items={day} newAppointment={() => setBooking(true)} update={updateAppointment} prepare={prepare} />}
            {current === "cobro" && (
              <Sale
                giro={giro}
                products={visible}
                categories={categories}
                category={activeCategory}
                setCategory={setCategory}
                cart={cart}
                add={add}
                justAdded={justAdded}
                changeQty={(id, delta) => setCart((items) => items.map((item) => (item.id === id ? { ...item, qty: item.qty + delta } : item)).filter((item) => item.qty > 0))}
                clear={() => {
                  setCart([]);
                  setAppointmentId(null);
                }}
                clients={clients}
                staff={staff}
                clientId={clientId}
                staffId={staffId}
                setClientId={setClientId}
                setStaffId={setStaffId}
                payment={payment}
                setPayment={setPayment}
                discount={discount}
                tip={tip}
                setDiscount={setDiscount}
                setTip={setTip}
                totals={totals}
                busy={busy}
                charge={charge}
              />
            )}
            {current === "clientes" && <Clients clients={clients} refresh={refresh} notify={setMessage} />}
            {current === "catalogo" && <Catalog giro={giro} products={products} refresh={refresh} notify={setMessage} />}
            {current === "personal" && <People giro={giro} staff={staff} refresh={refresh} notify={setMessage} />}
            {current === "caja" && <Register cash={cash} refresh={refresh} notify={setMessage} />}
            {current === "tickets" && <TicketList settings={settings} tickets={tickets} selected={selectedTicket} select={(ticket) => setSelectedFolio(ticket.folio)} refresh={refresh} notify={setMessage} />}
            {current === "reportes" && <Report giro={giro} data={reports} />}
            {current === "config" && (
              <>
                <Heading view="config" eyebrow="Ajustes" title="Configuracion" />
                <Settings user={user} settings={settings} onSettings={onSettings} notify={setMessage} />
              </>
            )}
          </div>
        </section>
      </div>
      {booking && (
        <AppointmentForm
          giro={giro}
          clients={clients}
          staff={staff}
          services={products.some((product) => product.station === "Barra") ? products.filter((product) => product.station === "Barra") : products}
          date={date}
          close={() => setBooking(false)}
          save={async (body) => {
            const data = await api<{ appointments: Appointment[] }>("/api/salon", { action: "appointment", ...body });
            setAppointments(data.appointments);
            setDate(String(body.startsAt).slice(0, 10));
            setMessage("Cita agendada correctamente");
          }}
        />
      )}
      {selectedTicket && <div className="print-only"><Receipt settings={settings} ticket={selectedTicket} /></div>}
    </main>
  );
}
