"use client";

import { useEffect, useMemo, useState } from "react";

type Product = {
  id: number;
  name: string;
  category: string;
  price: number;
  station: "Barra" | "Cocina";
  tag?: string | null;
};

type CartItem = Product & { qty: number; note?: string };
type TicketTotals = {
  subtotal: number;
  discountAmount: number;
  tax: number;
  tipAmount: number;
  total: number;
};
type Ticket = {
  folio: string;
  table: string;
  cashier: string;
  payment: string;
  createdAt: string;
  status: "paid" | "cancelled";
  cancelReason?: string | null;
  items: CartItem[];
  totals: TicketTotals;
};
type ProductDraft = {
  name: string;
  category: string;
  price: string;
  station: "Barra" | "Cocina";
  tag: string;
};
type CashMovement = {
  id: number;
  shiftId: number;
  type: "in" | "out";
  reason: string;
  amount: number;
  cashier: string;
  createdAt: string;
};
type CashRegister = {
  openShift: {
    id: number;
    openedAt: string;
    closedAt: string | null;
    cashier: string;
    openingCash: number;
    closingCash: number | null;
    expectedCash: number | null;
    notes: string | null;
    status: "open" | "closed";
  } | null;
  movements: CashMovement[];
  summary: {
    cashSales: number;
    cardSales: number;
    transferSales: number;
    cashIn: number;
    cashOut: number;
    expectedCash: number;
    ticketCount: number;
    totalSales: number;
  };
};
type CashDraft = {
  openingCash: string;
  movementType: "in" | "out";
  movementReason: string;
  movementAmount: string;
  closingCash: string;
  notes: string;
};
type SentCommand = {
  id: number;
  table: string;
  station: "Barra" | "Cocina";
  status: "pending" | "ready" | "cancelled";
  createdAt: string;
  items: CartItem[];
};
type Reports = {
  totals: {
    ticketCount: number;
    totalSales: number;
    subtotal: number;
    tax: number;
    tips: number;
    cancelledTickets: number;
  };
  payments: Array<{ payment: string; count: number; total: number }>;
  products: Array<{ name: string; qty: number; total: number }>;
};

const defaultProducts: Product[] = [
  { id: 1, name: "Americano", category: "Cafe", price: 42, station: "Barra", tag: "Caliente" },
  { id: 2, name: "Latte", category: "Cafe", price: 58, station: "Barra", tag: "Popular" },
  { id: 3, name: "Capuchino", category: "Cafe", price: 56, station: "Barra" },
  { id: 4, name: "Cold Brew", category: "Cafe", price: 64, station: "Barra", tag: "Frio" },
  { id: 5, name: "Chai Latte", category: "Bebidas", price: 62, station: "Barra" },
  { id: 6, name: "Limonada Mineral", category: "Bebidas", price: 48, station: "Barra" },
  { id: 7, name: "Croissant", category: "Panaderia", price: 46, station: "Cocina" },
  { id: 8, name: "Pan Frances", category: "Desayunos", price: 118, station: "Cocina", tag: "Brunch" },
  { id: 9, name: "Molletes", category: "Desayunos", price: 92, station: "Cocina" },
  { id: 10, name: "Bagel Serrano", category: "Alimentos", price: 126, station: "Cocina" },
  { id: 11, name: "Ensalada Verde", category: "Alimentos", price: 112, station: "Cocina" },
  { id: 12, name: "Cheesecake", category: "Postres", price: 74, station: "Cocina" },
];

const tables = ["Mostrador", "Mesa 1", "Mesa 2", "Mesa 3", "Terraza"];
const seededCarts: Record<string, CartItem[]> = {};
const paymentMethods = ["Efectivo", "Tarjeta", "Transferencia"];
const navItems = ["Venta", "Caja", "Mesas", "Barra", "Cocina", "Productos", "Tickets", "Reportes"];
const emptyProductDraft: ProductDraft = { name: "", category: "Cafe", price: "", station: "Barra", tag: "" };
const emptyCashDraft: CashDraft = { openingCash: "500", movementType: "out", movementReason: "", movementAmount: "", closingCash: "", notes: "" };
const money = (value: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value);

export default function Home() {
  const [activeView, setActiveView] = useState("Venta");
  const [products, setProducts] = useState<Product[]>(defaultProducts);
  const [activeCategory, setActiveCategory] = useState("Todo");
  const [activeTable, setActiveTable] = useState(tables[0]);
  const [cartsByTable, setCartsByTable] = useState<Record<string, CartItem[]>>(seededCarts);
  const [discount, setDiscount] = useState(0);
  const [tip, setTip] = useState(10);
  const [payment, setPayment] = useState(paymentMethods[1]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [productDraft, setProductDraft] = useState<ProductDraft>(emptyProductDraft);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [cashRegister, setCashRegister] = useState<CashRegister | null>(null);
  const [cashDraft, setCashDraft] = useState<CashDraft>(emptyCashDraft);
  const [sentCommands, setSentCommands] = useState<SentCommand[]>([]);
  const [reports, setReports] = useState<Reports | null>(null);
  const [isSavingTicket, setIsSavingTicket] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isSavingCash, setIsSavingCash] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Base de datos lista");

  const loadProducts = async () => {
    const response = await fetch("/api/products");
    if (!response.ok) throw new Error("No se pudieron cargar los productos.");
    const payload = (await response.json()) as { products: Product[] };
    setProducts(payload.products);
  };

  const loadTickets = async () => {
    const response = await fetch("/api/tickets");
    if (!response.ok) throw new Error("No se pudieron cargar los tickets.");
    const payload = (await response.json()) as { tickets: Ticket[] };
    setTickets(payload.tickets);
    setSelectedTicket(payload.tickets[0] ?? null);
  };

  const loadCashRegister = async () => {
    const response = await fetch("/api/cash");
    if (!response.ok) throw new Error("No se pudo cargar la caja.");
    const payload = (await response.json()) as { register: CashRegister };
    setCashRegister(payload.register);
    setCashDraft((draft) => ({ ...draft, closingCash: payload.register.summary.expectedCash ? String(payload.register.summary.expectedCash) : draft.closingCash }));
  };

  const loadOpenOrders = async () => {
    const response = await fetch("/api/orders");
    if (!response.ok) throw new Error("No se pudieron cargar las cuentas.");
    const payload = (await response.json()) as { orders: Array<{ table: string; items: CartItem[] }> };
    setCartsByTable(Object.fromEntries(payload.orders.map((order) => [order.table, order.items])));
  };

  const loadCommands = async () => {
    const response = await fetch("/api/commands");
    if (!response.ok) throw new Error("No se pudieron cargar las comandas.");
    const payload = (await response.json()) as { commands: SentCommand[] };
    setSentCommands(payload.commands);
  };

  const loadReports = async () => {
    const response = await fetch("/api/reports");
    if (!response.ok) throw new Error("No se pudieron cargar los reportes.");
    const payload = (await response.json()) as { reports: Reports };
    setReports(payload.reports);
  };

  useEffect(() => {
    Promise.all([loadProducts(), loadTickets(), loadCashRegister(), loadOpenOrders(), loadCommands(), loadReports()])
      .then(() => setStatusMessage("Datos sincronizados"))
      .catch(() => setStatusMessage("Trabajando con datos locales"));
  }, []);

  const categories = ["Todo", ...Array.from(new Set(products.map((product) => product.category)))];
  const visibleProducts = products.filter((product) => activeCategory === "Todo" || product.category === activeCategory);
  const cart = cartsByTable[activeTable] ?? [];
  const cartUnits = cart.reduce((sum, item) => sum + item.qty, 0);
  const ticketSales = tickets.reduce((sum, ticket) => sum + ticket.totals.total, 0);
  const tableTotals = tables.reduce<Record<string, number>>((acc, table) => {
    acc[table] = (cartsByTable[table] ?? []).reduce((sum, item) => sum + item.price * item.qty, 0);
    return acc;
  }, {});

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const discountAmount = Math.round(subtotal * (discount / 100));
    const base = subtotal - discountAmount;
    const tax = Math.round(base * 0.16);
    const tipAmount = Math.round(base * (tip / 100));
    return { subtotal, discountAmount, tax, tipAmount, total: base + tax + tipAmount };
  }, [cart, discount, tip]);

  const persistOpenOrder = async (table: string, items: CartItem[]) => {
    const response = await fetch("/api/orders", {
      body: JSON.stringify({ cashier: "Ana Lopez", items, table }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    if (!response.ok) throw new Error("No se pudo guardar la cuenta.");
  };

  const removeOpenOrder = async (table: string) => {
    const response = await fetch("/api/orders", {
      body: JSON.stringify({ table }),
      headers: { "Content-Type": "application/json" },
      method: "DELETE",
    });
    if (!response.ok) throw new Error("No se pudo cerrar la cuenta.");
  };

  const addProduct = (product: Product) => {
    setCartsByTable((current) => {
      const items = current[activeTable] ?? [];
      const match = items.find((item) => item.id === product.id);
      const nextItems = match
        ? items.map((item) => (item.id === product.id ? { ...item, qty: item.qty + 1 } : item))
        : [...items, { ...product, qty: 1 }];
      void persistOpenOrder(activeTable, nextItems).catch(() => setStatusMessage("Cuenta pendiente de sincronizar"));
      return { ...current, [activeTable]: nextItems };
    });
  };

  const changeQty = (id: number, delta: number) => {
    setCartsByTable((current) => {
      const items = current[activeTable] ?? [];
      const nextItems = items
        .map((item) => (item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item))
        .filter((item) => item.qty > 0);
      if (nextItems.length > 0) {
        void persistOpenOrder(activeTable, nextItems).catch(() => setStatusMessage("Cuenta pendiente de sincronizar"));
      } else {
        void removeOpenOrder(activeTable).catch(() => setStatusMessage("Cuenta pendiente de sincronizar"));
      }
      return { ...current, [activeTable]: nextItems };
    });
  };

  const clearSale = () => {
    setCartsByTable((current) => ({ ...current, [activeTable]: [] }));
    void removeOpenOrder(activeTable).catch(() => setStatusMessage("Cuenta pendiente de sincronizar"));
    setDiscount(0);
    setTip(10);
  };

  const createTicket = async () => {
    if (cart.length === 0 || isSavingTicket) return;
    setIsSavingTicket(true);
    setStatusMessage("Guardando ticket...");

    const ticketPayload = {
      table: activeTable,
      cashier: "Ana Lopez",
      payment,
      createdAt: new Date().toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }),
      items: cart.map((item) => ({ ...item })),
      totals: { ...totals },
    };

    try {
      const response = await fetch("/api/tickets", {
        body: JSON.stringify(ticketPayload),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (!response.ok) throw new Error("No se pudo guardar el ticket.");
      const payload = (await response.json()) as { ticket: Ticket };
      setTickets((currentTickets) => [payload.ticket, ...currentTickets]);
      setSelectedTicket(payload.ticket);
      await loadCashRegister();
      await loadOpenOrders();
      await loadReports();
      clearSale();
      setStatusMessage(`${payload.ticket.folio} guardado`);
    } catch {
      const fallbackTicket: Ticket = { folio: `LOCAL-${Date.now().toString().slice(-6)}`, status: "paid", cancelReason: null, ...ticketPayload };
      setTickets((currentTickets) => [fallbackTicket, ...currentTickets]);
      setSelectedTicket(fallbackTicket);
      clearSale();
      setStatusMessage("Ticket local creado; falta sincronizar");
    } finally {
      setIsSavingTicket(false);
    }
  };

  const saveProduct = async () => {
    const payload = {
      id: editingProductId ?? undefined,
      name: productDraft.name,
      category: productDraft.category,
      price: Number(productDraft.price),
      station: productDraft.station,
      tag: productDraft.tag || null,
    };
    setIsSavingProduct(true);
    setStatusMessage(editingProductId ? "Actualizando producto..." : "Creando producto...");

    try {
      const response = await fetch("/api/products", {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: editingProductId ? "PATCH" : "POST",
      });
      if (!response.ok) throw new Error("No se pudo guardar el producto.");
      await loadProducts();
      setProductDraft(emptyProductDraft);
      setEditingProductId(null);
      setStatusMessage(editingProductId ? "Producto actualizado" : "Producto creado");
    } catch {
      setStatusMessage("No se pudo guardar el producto");
    } finally {
      setIsSavingProduct(false);
    }
  };

  const startEditProduct = (product: Product) => {
    setActiveView("Productos");
    setEditingProductId(product.id);
    setProductDraft({
      name: product.name,
      category: product.category,
      price: String(product.price),
      station: product.station,
      tag: product.tag ?? "",
    });
  };

  const deactivateProduct = async (product: Product) => {
    setStatusMessage("Desactivando producto...");
    try {
      const response = await fetch("/api/products", {
        body: JSON.stringify({ id: product.id }),
        headers: { "Content-Type": "application/json" },
        method: "DELETE",
      });
      if (!response.ok) throw new Error("No se pudo desactivar el producto.");
      setCartsByTable((current) =>
        Object.fromEntries(Object.entries(current).map(([table, items]) => [table, items.filter((item) => item.id !== product.id)])),
      );
      await loadProducts();
      if (editingProductId === product.id) {
        setProductDraft(emptyProductDraft);
        setEditingProductId(null);
      }
      setStatusMessage("Producto desactivado");
    } catch {
      setStatusMessage("No se pudo desactivar el producto");
    }
  };

  const openTable = (table: string) => {
    setActiveTable(table);
    setActiveView("Venta");
  };

  const sendCommand = (station?: "Barra" | "Cocina") => {
    if (cart.length === 0) return;
    const stations = station ? [station] : (["Barra", "Cocina"] as const);
    const commandItems = cart.filter((item) => stations.includes(item.station));

    if (commandItems.length === 0) return;
    fetch("/api/commands", {
      body: JSON.stringify({ items: commandItems, table: activeTable }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    })
      .then((response) => {
        if (!response.ok) throw new Error("No se pudo enviar la comanda.");
        return response.json() as Promise<{ commands: SentCommand[] }>;
      })
      .then((payload) => {
        setSentCommands(payload.commands);
        setStatusMessage(`Comanda enviada: ${stations.join(" / ")}`);
      })
      .catch(() => setStatusMessage("No se pudo enviar la comanda"));
  };

  const markCommandReady = async (id: number) => {
    try {
      const response = await fetch("/api/commands", {
        body: JSON.stringify({ action: "ready", id }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (!response.ok) throw new Error("No se pudo marcar la comanda.");
      const payload = (await response.json()) as { commands: SentCommand[] };
      setSentCommands(payload.commands);
      setStatusMessage("Comanda marcada como lista");
    } catch {
      setStatusMessage("No se pudo actualizar la comanda");
    }
  };

  const cancelTicketByFolio = async (folio: string, reason: string) => {
    try {
      const response = await fetch("/api/tickets", {
        body: JSON.stringify({ cancelledBy: "Ana Lopez", folio, reason }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      if (!response.ok) throw new Error("No se pudo cancelar el ticket.");
      const payload = (await response.json()) as { tickets: Ticket[] };
      setTickets(payload.tickets);
      setSelectedTicket(payload.tickets[0] ?? null);
      await loadCashRegister();
      await loadReports();
      setStatusMessage(`${folio} cancelado`);
    } catch {
      setStatusMessage("No se pudo cancelar el ticket");
    }
  };

  const submitCashAction = async (action: "open" | "movement" | "close") => {
    setIsSavingCash(true);
    setStatusMessage(action === "open" ? "Abriendo caja..." : action === "close" ? "Cerrando caja..." : "Registrando movimiento...");

    const payload =
      action === "open"
        ? { action, cashier: "Ana Lopez", openingCash: Number(cashDraft.openingCash) }
        : action === "movement"
          ? {
              action,
              amount: Number(cashDraft.movementAmount),
              cashier: "Ana Lopez",
              reason: cashDraft.movementReason,
              type: cashDraft.movementType,
            }
          : { action, closingCash: Number(cashDraft.closingCash), notes: cashDraft.notes };

    try {
      const response = await fetch("/api/cash", {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (!response.ok) throw new Error("No se pudo actualizar la caja.");
      const result = (await response.json()) as { register: CashRegister };
      setCashRegister(result.register);
      setCashDraft({
        ...emptyCashDraft,
        closingCash: result.register.summary.expectedCash ? String(result.register.summary.expectedCash) : "",
        openingCash: cashDraft.openingCash,
      });
      setStatusMessage(action === "open" ? "Caja abierta" : action === "close" ? "Corte cerrado" : "Movimiento registrado");
    } catch {
      setStatusMessage("No se pudo actualizar la caja");
    } finally {
      setIsSavingCash(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#eef1ee] text-slate-950">
      <div className="mx-auto grid min-h-screen max-w-[1720px] grid-cols-[248px_minmax(0,1fr)_420px] max-xl:grid-cols-[210px_minmax(0,1fr)] max-lg:block">
        <aside className="hidden border-r border-slate-200 bg-[#111b1a] px-4 py-5 text-white lg:block">
          <BrandBlock ticketCount={tickets.length} total={cashRegister?.summary.expectedCash ?? 0} activeView={activeView} onNavigate={setActiveView} />
        </aside>

        <section className="flex min-h-screen flex-col px-6 py-5 max-lg:min-h-0 max-sm:px-4">
          <header className="mb-5 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-[#b64833]">Sistema operativo del restaurante</p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight">{activeView}</h1>
                <p className="mt-1 text-sm font-medium text-slate-500">{statusMessage}</p>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-slate-100 p-1">
                {tables.map((table) => (
                  <button
                    className={`h-10 rounded-md px-3 text-sm font-semibold transition ${activeTable === table ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:bg-white"}`}
                    key={table}
                    onClick={() => setActiveTable(table)}
                  >
                    {table}
                  </button>
                ))}
              </div>
            </div>
          </header>

          <div className="mb-5 grid grid-cols-4 gap-3 max-md:grid-cols-2">
            <Metric label="Ventas hoy" value={money(ticketSales)} detail={`${tickets.length} tickets`} />
            <Metric label="Cuenta activa" value={activeTable} detail={`${cartUnits} articulos`} />
            <Metric label="Caja esperada" value={money(cashRegister?.summary.expectedCash ?? 0)} detail={cashRegister?.openShift ? "turno abierto" : "sin turno abierto"} />
            <Metric label="Cocina / Barra" value={`${cart.filter((item) => item.station === "Cocina").length}/${cart.filter((item) => item.station === "Barra").length}`} detail="items en cuenta" />
          </div>

          {activeView === "Productos" ? (
            <ProductAdmin
              draft={productDraft}
              editingProductId={editingProductId}
              isSaving={isSavingProduct}
              onCancel={() => {
                setProductDraft(emptyProductDraft);
                setEditingProductId(null);
              }}
              onChange={setProductDraft}
              onDeactivate={deactivateProduct}
              onEdit={startEditProduct}
              onSave={saveProduct}
              products={products}
            />
          ) : activeView === "Caja" ? (
            <CashRegisterPanel
              draft={cashDraft}
              isSaving={isSavingCash}
              onChange={setCashDraft}
              onSubmit={submitCashAction}
              register={cashRegister}
            />
          ) : activeView === "Mesas" ? (
            <TablesPanel
              activeTable={activeTable}
              commands={sentCommands}
              onOpenTable={openTable}
              tableTotals={tableTotals}
              tables={tables}
              cartsByTable={cartsByTable}
            />
          ) : activeView === "Barra" ? (
            <StationPanel commands={sentCommands} onReady={markCommandReady} station="Barra" />
          ) : activeView === "Cocina" ? (
            <StationPanel commands={sentCommands} onReady={markCommandReady} station="Cocina" />
          ) : activeView === "Tickets" ? (
            <TicketsPanel onCancel={cancelTicketByFolio} onSelectTicket={setSelectedTicket} selectedTicket={selectedTicket} tickets={tickets} />
          ) : activeView === "Reportes" ? (
            <ReportsPanel reports={reports} tickets={tickets} />
          ) : (
            <SaleCatalog activeCategory={activeCategory} categories={categories} onAdd={addProduct} onCategory={setActiveCategory} products={visibleProducts} />
          )}
        </section>

        <CheckoutPanel
          activeTable={activeTable}
          cart={cart}
          discount={discount}
          isSavingTicket={isSavingTicket}
          onChangeQty={changeQty}
          onClear={clearSale}
          onCreateTicket={createTicket}
          onDiscount={setDiscount}
          onPayment={setPayment}
          onPrint={() => selectedTicket && window.print()}
          onSendCommand={sendCommand}
          onSelectTicket={setSelectedTicket}
          onTip={setTip}
          payment={payment}
          selectedTicket={selectedTicket}
          tickets={tickets}
          tip={tip}
          totals={totals}
        />
      </div>
    </main>
  );
}

function BrandBlock({
  activeView,
  onNavigate,
  ticketCount,
  total,
}: {
  activeView: string;
  onNavigate: (view: string) => void;
  ticketCount: number;
  total: number;
}) {
  return (
    <>
      <div className="flex items-center gap-3 rounded-lg bg-white/7 p-3">
        <div className="grid h-10 w-10 place-items-center rounded-md bg-[#d1533b] text-lg font-bold">M</div>
        <div>
          <p className="text-sm font-semibold">Mesa Clara</p>
          <p className="text-xs text-slate-300">POS Restaurante</p>
        </div>
      </div>
      <nav className="mt-7 space-y-1">
        {navItems.map((item) => (
          <button
            className={`flex h-11 w-full items-center justify-between rounded-md px-3 text-left text-sm font-medium transition ${
              activeView === item ? "bg-white text-slate-950 shadow-sm" : "text-slate-300 hover:bg-white/8 hover:text-white"
            }`}
            key={item}
            onClick={() => onNavigate(item)}
          >
            <span>{item}</span>
            {item === "Tickets" ? <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-slate-300">{ticketCount}</span> : null}
            {item === "Caja" ? <span className="rounded bg-emerald-400/15 px-2 py-0.5 text-xs text-emerald-100">Turno</span> : null}
          </button>
        ))}
      </nav>
      <div className="mt-8 rounded-lg border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-medium uppercase text-emerald-200">Efectivo esperado</p>
        <p className="mt-3 text-2xl font-semibold">{money(total)}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-300">
          <div>
            <p>Turno</p>
            <p className="mt-1 font-medium text-white">Caja Principal</p>
          </div>
          <div>
            <p>Cajero</p>
            <p className="mt-1 font-medium text-white">Ana Lopez</p>
          </div>
        </div>
      </div>
    </>
  );
}

function SaleCatalog({
  activeCategory,
  categories,
  onAdd,
  onCategory,
  products,
}: {
  activeCategory: string;
  categories: string[];
  onAdd: (product: Product) => void;
  onCategory: (category: string) => void;
  products: Product[];
}) {
  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Catalogo</h2>
          <p className="text-sm text-slate-500">Selecciona productos para agregar a la cuenta.</p>
        </div>
        <div className="flex max-w-full gap-2 overflow-x-auto rounded-lg bg-white p-1 shadow-sm">
          {categories.map((category) => (
            <button
              className={`h-9 shrink-0 rounded-md px-3 text-sm font-semibold transition ${activeCategory === category ? "bg-[#17443d] text-white" : "text-slate-600 hover:bg-slate-100"}`}
              key={category}
              onClick={() => onCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
      <div className="grid flex-1 grid-cols-4 gap-3 overflow-y-auto pb-5 max-2xl:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1">
        {products.map((product) => (
          <button
            className="group flex min-h-[132px] flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#17443d] hover:shadow-lg"
            key={product.id}
            onClick={() => onAdd(product)}
          >
            <span>
              <span className="flex items-start justify-between gap-3">
                <span>
                  <span className="block text-base font-semibold leading-tight">{product.name}</span>
                  <span className="mt-2 block text-xs font-medium uppercase text-slate-400">{product.category}</span>
                </span>
                <StationBadge station={product.station} />
              </span>
              {product.tag ? <span className="mt-3 inline-block rounded bg-[#f7ece8] px-2 py-1 text-xs font-semibold text-[#a33e2b]">{product.tag}</span> : null}
            </span>
            <span className="flex items-end justify-between">
              <span className="text-2xl font-semibold tracking-tight">{money(product.price)}</span>
              <span className="rounded-md bg-slate-950 px-2.5 py-1 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">Agregar</span>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

function ProductAdmin({
  draft,
  editingProductId,
  isSaving,
  onCancel,
  onChange,
  onDeactivate,
  onEdit,
  onSave,
  products,
}: {
  draft: ProductDraft;
  editingProductId: number | null;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (draft: ProductDraft) => void;
  onDeactivate: (product: Product) => void;
  onEdit: (product: Product) => void;
  onSave: () => void;
  products: Product[];
}) {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-[360px_minmax(0,1fr)] gap-4 max-xl:grid-cols-1">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase text-[#b64833]">{editingProductId ? "Editar producto" : "Nuevo producto"}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">Catalogo del menu</h2>
        <div className="mt-5 space-y-4">
          <TextField label="Nombre" onChange={(value) => onChange({ ...draft, name: value })} placeholder="Ej. Espresso doble" value={draft.name} />
          <TextField label="Categoria" onChange={(value) => onChange({ ...draft, category: value })} placeholder="Cafe, Bebidas, Alimentos" value={draft.category} />
          <TextField label="Precio" onChange={(value) => onChange({ ...draft, price: value })} placeholder="0" type="number" value={draft.price} />
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Estacion</span>
            <select
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium outline-none focus:border-[#17443d]"
              onChange={(event) => onChange({ ...draft, station: event.target.value as Product["station"] })}
              value={draft.station}
            >
              <option>Barra</option>
              <option>Cocina</option>
            </select>
          </label>
          <TextField label="Etiqueta" onChange={(value) => onChange({ ...draft, tag: value })} placeholder="Popular, Frio, Brunch" value={draft.tag} />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            className="rounded-lg bg-[#17443d] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={isSaving || !draft.name || !draft.category || Number(draft.price) <= 0}
            onClick={onSave}
          >
            {isSaving ? "Guardando..." : editingProductId ? "Guardar cambios" : "Crear producto"}
          </button>
          <button className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </section>

      <section className="min-h-0 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold">Productos activos</h2>
          <p className="text-sm text-slate-500">{products.length} productos disponibles para venta</p>
        </div>
        <div className="max-h-[calc(100vh-250px)] overflow-y-auto">
          {products.map((product) => (
            <div className="grid grid-cols-[minmax(0,1fr)_120px_120px_150px] items-center gap-3 border-b border-slate-100 px-5 py-4 max-lg:grid-cols-1" key={product.id}>
              <div>
                <p className="font-semibold">{product.name}</p>
                <p className="mt-1 text-sm text-slate-500">{product.category}{product.tag ? ` · ${product.tag}` : ""}</p>
              </div>
              <StationBadge station={product.station} />
              <p className="text-lg font-semibold">{money(product.price)}</p>
              <div className="flex gap-2">
                <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => onEdit(product)}>
                  Editar
                </button>
                <button className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" onClick={() => onDeactivate(product)}>
                  Desactivar
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function CashRegisterPanel({
  draft,
  isSaving,
  onChange,
  onSubmit,
  register,
}: {
  draft: CashDraft;
  isSaving: boolean;
  onChange: (draft: CashDraft) => void;
  onSubmit: (action: "open" | "movement" | "close") => void;
  register: CashRegister | null;
}) {
  const shift = register?.openShift ?? null;
  const summary = register?.summary ?? {
    cashIn: 0,
    cashOut: 0,
    cashSales: 0,
    cardSales: 0,
    expectedCash: 0,
    ticketCount: 0,
    totalSales: 0,
    transferSales: 0,
  };
  const closingCash = Number(draft.closingCash || 0);
  const difference = shift ? closingCash - summary.expectedCash : 0;

  if (!shift) {
    return (
      <section className="grid flex-1 grid-cols-[minmax(0,1fr)_360px] gap-4 max-xl:grid-cols-1">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase text-[#b64833]">Caja principal</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Abrir turno de caja</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Abre un turno antes de cobrar para que los tickets en efectivo, entradas y salidas queden ligados al corte del dia.
          </p>
          <div className="mt-7 max-w-sm">
            <TextField
              label="Fondo inicial"
              onChange={(value) => onChange({ ...draft, openingCash: value })}
              placeholder="500"
              type="number"
              value={draft.openingCash}
            />
            <button
              className="mt-4 w-full rounded-lg bg-[#17443d] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isSaving || Number(draft.openingCash) < 0}
              onClick={() => onSubmit("open")}
            >
              {isSaving ? "Abriendo..." : "Abrir caja"}
            </button>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-[#111b1a] p-5 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase text-emerald-200">Listo para operar</p>
          <p className="mt-4 text-4xl font-semibold">{money(0)}</p>
          <p className="mt-2 text-sm text-slate-300">Sin caja abierta no se calcula corte.</p>
        </div>
      </section>
    );
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_360px] gap-4 max-xl:grid-cols-1">
      <section className="min-h-0 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="text-xs font-semibold uppercase text-[#b64833]">Turno abierto</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Caja Principal</h2>
          <p className="mt-1 text-sm text-slate-500">Abierta por {shift.cashier} · {shift.openedAt}</p>
        </div>
        <div className="grid grid-cols-4 gap-3 p-5 max-lg:grid-cols-2 max-sm:grid-cols-1">
          <Metric label="Efectivo esperado" value={money(summary.expectedCash)} detail="fondo + efectivo + movimientos" />
          <Metric label="Ventas del turno" value={money(summary.totalSales)} detail={`${summary.ticketCount} tickets cobrados`} />
          <Metric label="Entradas" value={money(summary.cashIn)} detail="efectivo agregado" />
          <Metric label="Salidas" value={money(summary.cashOut)} detail="retiros y gastos" />
        </div>
        <div className="grid grid-cols-3 gap-3 px-5 pb-5 max-md:grid-cols-1">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-500">Efectivo</p>
            <p className="mt-2 text-2xl font-semibold">{money(summary.cashSales)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-500">Tarjeta</p>
            <p className="mt-2 text-2xl font-semibold">{money(summary.cardSales)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-500">Transferencia</p>
            <p className="mt-2 text-2xl font-semibold">{money(summary.transferSales)}</p>
          </div>
        </div>
        <div className="border-t border-slate-200 px-5 py-4">
          <h3 className="font-semibold">Movimientos de efectivo</h3>
        </div>
        <div className="max-h-[260px] overflow-y-auto">
          {(register?.movements ?? []).length === 0 ? (
            <div className="m-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">Sin entradas o salidas registradas.</div>
          ) : (
            register?.movements.map((movement) => (
              <div className="grid grid-cols-[90px_minmax(0,1fr)_120px] items-center gap-3 border-t border-slate-100 px-5 py-4" key={movement.id}>
                <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${movement.type === "in" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                  {movement.type === "in" ? "Entrada" : "Salida"}
                </span>
                <div>
                  <p className="font-semibold">{movement.reason}</p>
                  <p className="mt-1 text-sm text-slate-500">{movement.cashier} · {movement.createdAt}</p>
                </div>
                <p className="text-right text-lg font-semibold">{movement.type === "out" ? "-" : "+"}{money(movement.amount)}</p>
              </div>
            ))
          )}
        </div>
      </section>

      <aside className="space-y-4">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-[#b64833]">Movimiento</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {(["in", "out"] as const).map((type) => (
              <button
                className={`h-10 rounded-lg border text-sm font-semibold ${draft.movementType === type ? "border-[#17443d] bg-[#17443d] text-white" : "border-slate-300 bg-white text-slate-600"}`}
                key={type}
                onClick={() => onChange({ ...draft, movementType: type })}
              >
                {type === "in" ? "Entrada" : "Salida"}
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-4">
            <TextField label="Motivo" onChange={(value) => onChange({ ...draft, movementReason: value })} placeholder="Ej. Compra insumos" value={draft.movementReason} />
            <TextField label="Importe" onChange={(value) => onChange({ ...draft, movementAmount: value })} placeholder="0" type="number" value={draft.movementAmount} />
          </div>
          <button
            className="mt-4 w-full rounded-lg bg-[#17443d] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={isSaving || Number(draft.movementAmount) <= 0}
            onClick={() => onSubmit("movement")}
          >
            {isSaving ? "Guardando..." : "Registrar movimiento"}
          </button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-[#b64833]">Corte</p>
          <div className="mt-4 space-y-3 text-sm">
            <Row label="Fondo inicial" value={money(shift.openingCash)} />
            <Row label="Efectivo ventas" value={money(summary.cashSales)} />
            <Row label="Entradas" value={money(summary.cashIn)} />
            <Row label="Salidas" value={`-${money(summary.cashOut)}`} />
            <div className="border-t border-slate-200 pt-3">
              <Row label="Esperado" value={money(summary.expectedCash)} />
            </div>
          </div>
          <div className="mt-4 space-y-4">
            <TextField label="Efectivo contado" onChange={(value) => onChange({ ...draft, closingCash: value })} placeholder="0" type="number" value={draft.closingCash} />
            <TextField label="Notas" onChange={(value) => onChange({ ...draft, notes: value })} placeholder="Observaciones del cierre" value={draft.notes} />
          </div>
          <div className={`mt-4 rounded-lg p-3 text-sm font-semibold ${difference === 0 ? "bg-slate-100 text-slate-600" : difference > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            Diferencia: {money(difference)}
          </div>
          <button
            className="mt-4 w-full rounded-lg bg-[#c64d36] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={isSaving || draft.closingCash === ""}
            onClick={() => onSubmit("close")}
          >
            {isSaving ? "Cerrando..." : "Cerrar corte"}
          </button>
        </section>
      </aside>
    </div>
  );
}

function TablesPanel({
  activeTable,
  cartsByTable,
  commands,
  onOpenTable,
  tableTotals,
  tables,
}: {
  activeTable: string;
  cartsByTable: Record<string, CartItem[]>;
  commands: SentCommand[];
  onOpenTable: (table: string) => void;
  tableTotals: Record<string, number>;
  tables: string[];
}) {
  const occupiedTables = tables.filter((table) => (cartsByTable[table] ?? []).length > 0);
  const openTotal = occupiedTables.reduce((sum, table) => sum + tableTotals[table], 0);

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_360px] gap-4 max-xl:grid-cols-1">
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="text-xs font-semibold uppercase text-[#b64833]">Salon</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Mesas y cuentas abiertas</h2>
          <p className="mt-1 text-sm text-slate-500">{occupiedTables.length} mesas ocupadas · {money(openTotal)} pendiente por cobrar</p>
        </div>
        <div className="grid grid-cols-3 gap-3 p-5 max-2xl:grid-cols-2 max-md:grid-cols-1">
          {tables.map((table) => {
            const items = cartsByTable[table] ?? [];
            const isOpen = items.length > 0;
            const units = items.reduce((sum, item) => sum + item.qty, 0);
            return (
              <button
                className={`min-h-[180px] rounded-xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${
                  activeTable === table ? "border-[#17443d] bg-[#edf7f4]" : isOpen ? "border-[#d1533b]/40 bg-white" : "border-slate-200 bg-slate-50"
                }`}
                key={table}
                onClick={() => onOpenTable(table)}
              >
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <span className="block text-xl font-semibold">{table}</span>
                    <span className="mt-1 block text-sm text-slate-500">{isOpen ? `${units} articulos en cuenta` : "Libre para abrir cuenta"}</span>
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isOpen ? "bg-[#f7ece8] text-[#a33e2b]" : "bg-emerald-50 text-emerald-700"}`}>
                    {isOpen ? "Ocupada" : "Libre"}
                  </span>
                </span>
                <span className="mt-8 block text-3xl font-semibold tracking-tight">{money(tableTotals[table] ?? 0)}</span>
                <span className="mt-4 block text-sm font-semibold text-[#17443d]">Abrir venta</span>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="space-y-4">
        <section className="rounded-xl border border-slate-200 bg-[#111b1a] p-5 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase text-emerald-200">Resumen salon</p>
          <p className="mt-4 text-4xl font-semibold">{money(openTotal)}</p>
          <p className="mt-2 text-sm text-slate-300">Total pendiente de cuentas abiertas.</p>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-white/7 p-3">
              <p className="text-slate-300">Ocupadas</p>
              <p className="mt-1 text-2xl font-semibold">{occupiedTables.length}</p>
            </div>
            <div className="rounded-lg bg-white/7 p-3">
              <p className="text-slate-300">Libres</p>
              <p className="mt-1 text-2xl font-semibold">{tables.length - occupiedTables.length}</p>
            </div>
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold">Ultimas comandas</h3>
          <div className="mt-4 space-y-3">
            {commands.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">Todavia no se han enviado comandas.</p>
            ) : (
              commands.slice(0, 4).map((command) => (
                <div className="rounded-lg border border-slate-200 p-3" key={command.id}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{command.table}</p>
                    <StationBadge station={command.station} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{command.items.reduce((sum, item) => sum + item.qty, 0)} articulos · {command.createdAt}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </aside>
    </div>
  );
}

function StationPanel({ commands, onReady, station }: { commands: SentCommand[]; onReady: (id: number) => void; station: "Barra" | "Cocina" }) {
  const stationCommands = commands.filter((command) => command.station === station);

  return (
    <section className="min-h-0 flex-1 rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <p className="text-xs font-semibold uppercase text-[#b64833]">Comandas</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">{station}</h2>
        <p className="mt-1 text-sm text-slate-500">{stationCommands.length} comandas recientes para preparar</p>
      </div>
      <div className="grid grid-cols-3 gap-3 p-5 max-2xl:grid-cols-2 max-md:grid-cols-1">
        {stationCommands.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">Sin comandas pendientes para {station.toLowerCase()}.</div>
        ) : (
          stationCommands.map((command) => (
            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" key={command.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xl font-semibold">{command.table}</p>
                  <p className="mt-1 text-sm text-slate-500">{command.createdAt}</p>
                </div>
                <StationBadge station={command.station} />
              </div>
              <div className="mt-5 space-y-3">
                {command.items.map((item) => (
                  <div className="flex justify-between gap-3 border-t border-slate-100 pt-3" key={`${command.id}-${item.id}`}>
                    <div>
                      <p className="font-semibold">{item.qty} x {item.name}</p>
                      {item.note ? <p className="mt-1 text-sm text-[#a33e2b]">{item.note}</p> : null}
                    </div>
                    <p className="text-sm font-semibold text-slate-500">{money(item.price * item.qty)}</p>
                  </div>
                ))}
              </div>
              <button className="mt-5 w-full rounded-lg bg-[#17443d] px-3 py-3 text-sm font-semibold text-white hover:bg-[#123730]" onClick={() => onReady(command.id)}>
                Marcar lista
              </button>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function TicketsPanel({
  onCancel,
  onSelectTicket,
  selectedTicket,
  tickets,
}: {
  onCancel: (folio: string, reason: string) => void;
  onSelectTicket: (ticket: Ticket) => void;
  selectedTicket: Ticket | null;
  tickets: Ticket[];
}) {
  const [reason, setReason] = useState("Error de captura");

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_360px] gap-4 max-xl:grid-cols-1">
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="text-xs font-semibold uppercase text-[#b64833]">Auditoria</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Tickets emitidos</h2>
          <p className="mt-1 text-sm text-slate-500">{tickets.length} tickets recientes con estado y detalle.</p>
        </div>
        <div className="max-h-[620px] overflow-y-auto">
          {tickets.length === 0 ? (
            <div className="m-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">Todavia no hay tickets.</div>
          ) : (
            tickets.map((ticket) => (
              <button
                className={`grid w-full grid-cols-[150px_minmax(0,1fr)_130px_120px] items-center gap-3 border-b border-slate-100 px-5 py-4 text-left transition hover:bg-slate-50 max-lg:grid-cols-1 ${
                  selectedTicket?.folio === ticket.folio ? "bg-[#edf7f4]" : "bg-white"
                }`}
                key={ticket.folio}
                onClick={() => onSelectTicket(ticket)}
              >
                <span>
                  <span className="block font-semibold">{ticket.folio}</span>
                  <span className="mt-1 block text-sm text-slate-500">{ticket.createdAt}</span>
                </span>
                <span>
                  <span className="block font-semibold">{ticket.table}</span>
                  <span className="mt-1 block text-sm text-slate-500">{ticket.cashier} · {ticket.payment}</span>
                </span>
                <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${ticket.status === "cancelled" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                  {ticket.status === "cancelled" ? "Cancelado" : "Pagado"}
                </span>
                <span className="text-right text-lg font-semibold max-lg:text-left">{money(ticket.totals.total)}</span>
              </button>
            ))
          )}
        </div>
      </section>

      <aside className="space-y-4">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-[#b64833]">Ticket seleccionado</p>
          {selectedTicket ? (
            <>
              <div className="mt-4 rounded-lg bg-slate-50 p-4">
                <Row label="Folio" value={selectedTicket.folio} />
                <Row label="Total" value={money(selectedTicket.totals.total)} />
                <Row label="Estado" value={selectedTicket.status === "cancelled" ? "Cancelado" : "Pagado"} />
              </div>
              {selectedTicket.status === "cancelled" ? (
                <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">{selectedTicket.cancelReason ?? "Sin motivo registrado"}</p>
              ) : (
                <>
                  <TextField label="Motivo de cancelacion" onChange={setReason} placeholder="Motivo obligatorio" value={reason} />
                  <button className="mt-4 w-full rounded-lg bg-[#c64d36] px-4 py-3 text-sm font-semibold text-white" onClick={() => onCancel(selectedTicket.folio, reason)}>
                    Cancelar ticket
                  </button>
                </>
              )}
            </>
          ) : (
            <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">Selecciona un ticket para verlo.</p>
          )}
        </section>
        {selectedTicket ? <TicketPreview ticket={selectedTicket} /> : null}
      </aside>
    </div>
  );
}

function ReportsPanel({ reports, tickets }: { reports: Reports | null; tickets: Ticket[] }) {
  const totals = reports?.totals ?? { cancelledTickets: 0, subtotal: 0, tax: 0, ticketCount: 0, tips: 0, totalSales: 0 };
  const averageTicket = totals.ticketCount > 0 ? totals.totalSales / totals.ticketCount : 0;

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_360px] gap-4 max-xl:grid-cols-1">
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="text-xs font-semibold uppercase text-[#b64833]">Direccion</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Reportes de venta</h2>
          <p className="mt-1 text-sm text-slate-500">Resumen operativo con tickets pagados y productos vendidos.</p>
        </div>
        <div className="grid grid-cols-4 gap-3 p-5 max-lg:grid-cols-2 max-sm:grid-cols-1">
          <Metric label="Venta neta" value={money(totals.totalSales)} detail={`${totals.ticketCount} tickets pagados`} />
          <Metric label="Ticket promedio" value={money(averageTicket)} detail="promedio por venta" />
          <Metric label="IVA" value={money(totals.tax)} detail="impuesto acumulado" />
          <Metric label="Cancelados" value={`${totals.cancelledTickets}`} detail="tickets anulados" />
        </div>
        <div className="grid grid-cols-2 gap-4 px-5 pb-5 max-lg:grid-cols-1">
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-semibold">Ventas por pago</h3>
            <div className="mt-4 space-y-3">
              {(reports?.payments ?? []).length === 0 ? (
                <p className="text-sm text-slate-500">Sin ventas registradas.</p>
              ) : (
                reports?.payments.map((payment) => (
                  <div className="flex items-center justify-between gap-3" key={payment.payment}>
                    <span className="text-sm font-medium text-slate-600">{payment.payment} · {payment.count}</span>
                    <span className="font-semibold">{money(payment.total)}</span>
                  </div>
                ))
              )}
            </div>
          </section>
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-semibold">Productos mas vendidos</h3>
            <div className="mt-4 space-y-3">
              {(reports?.products ?? []).length === 0 ? (
                <p className="text-sm text-slate-500">Sin productos vendidos.</p>
              ) : (
                reports?.products.map((product) => (
                  <div className="flex items-center justify-between gap-3" key={product.name}>
                    <span className="text-sm font-medium text-slate-600">{product.name} · {product.qty}</span>
                    <span className="font-semibold">{money(product.total)}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </section>

      <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold">Ultimos movimientos</h3>
        <div className="mt-4 space-y-3">
          {tickets.slice(0, 6).map((ticket) => (
            <div className="rounded-lg border border-slate-200 p-3" key={ticket.folio}>
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{ticket.folio}</p>
                <p className="font-semibold">{money(ticket.totals.total)}</p>
              </div>
              <p className="mt-1 text-sm text-slate-500">{ticket.table} · {ticket.status === "cancelled" ? "Cancelado" : ticket.payment}</p>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function CheckoutPanel({
  activeTable,
  cart,
  discount,
  isSavingTicket,
  onChangeQty,
  onClear,
  onCreateTicket,
  onDiscount,
  onPayment,
  onPrint,
  onSendCommand,
  onSelectTicket,
  onTip,
  payment,
  selectedTicket,
  tickets,
  tip,
  totals,
}: {
  activeTable: string;
  cart: CartItem[];
  discount: number;
  isSavingTicket: boolean;
  onChangeQty: (id: number, delta: number) => void;
  onClear: () => void;
  onCreateTicket: () => void;
  onDiscount: (value: number) => void;
  onPayment: (method: string) => void;
  onPrint: () => void;
  onSendCommand: () => void;
  onSelectTicket: (ticket: Ticket) => void;
  onTip: (value: number) => void;
  payment: string;
  selectedTicket: Ticket | null;
  tickets: Ticket[];
  tip: number;
  totals: TicketTotals;
}) {
  const cartUnits = cart.reduce((sum, item) => sum + item.qty, 0);
  return (
    <aside className="border-l border-slate-200 bg-white px-5 py-5 shadow-[-18px_0_40px_rgba(15,23,42,0.04)] max-xl:border-t max-lg:border-l-0">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Cuenta activa</p>
            <h2 className="mt-1 text-2xl font-semibold">{activeTable}</h2>
            <p className="mt-1 text-sm text-slate-500">{cartUnits} articulos en la orden</p>
          </div>
          <button className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100" onClick={onClear}>Limpiar</button>
        </div>
      </div>
      <div className="mt-4 max-h-[34vh] space-y-3 overflow-y-auto pr-1">
        {cart.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">La cuenta esta vacia.</div>
        ) : (
          cart.map((item) => (
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm" key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{money(item.price)} · {item.station}</p>
                  {item.note ? <p className="mt-1 text-xs font-medium text-[#a33e2b]">{item.note}</p> : null}
                </div>
                <p className="font-semibold">{money(item.price * item.qty)}</p>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center overflow-hidden rounded-lg border border-slate-300 bg-slate-50">
                  <button className="h-9 w-9 text-lg hover:bg-white" onClick={() => onChangeQty(item.id, -1)} aria-label={`Quitar ${item.name}`}>-</button>
                  <span className="grid h-9 w-11 place-items-center border-x border-slate-300 bg-white text-sm font-semibold">{item.qty}</span>
                  <button className="h-9 w-9 text-lg hover:bg-white" onClick={() => onChangeQty(item.id, 1)} aria-label={`Agregar ${item.name}`}>+</button>
                </div>
                <button className="rounded-md px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100">Nota</button>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="mt-4 rounded-xl border border-slate-200 p-4">
        <div className="grid grid-cols-2 gap-4">
          <Control label="Descuento" value={discount} suffix="%" onChange={onDiscount} max={30} />
          <Control label="Propina" value={tip} suffix="%" onChange={onTip} max={25} />
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <Row label="Subtotal" value={money(totals.subtotal)} />
          <Row label="Descuento" value={`-${money(totals.discountAmount)}`} />
          <Row label="IVA" value={money(totals.tax)} />
          <Row label="Propina" value={money(totals.tipAmount)} />
          <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
            <span className="text-sm font-semibold text-slate-500">Total a cobrar</span>
            <span className="text-3xl font-semibold tracking-tight">{money(totals.total)}</span>
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {paymentMethods.map((method) => (
          <button
            className={`h-11 rounded-lg border px-2 text-sm font-semibold transition ${payment === method ? "border-[#17443d] bg-[#17443d] text-white shadow-sm" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"}`}
            key={method}
            onClick={() => onPayment(method)}
          >
            {method}
          </button>
        ))}
      </div>
      <button className="mt-3 w-full rounded-lg bg-[#c64d36] px-4 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-[#a93f2c] disabled:cursor-not-allowed disabled:bg-slate-300" disabled={cart.length === 0} onClick={onCreateTicket}>
        {isSavingTicket ? "Guardando ticket..." : "Cobrar y crear ticket"}
      </button>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button className="rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400" disabled={cart.length === 0} onClick={onSendCommand}>Enviar comanda</button>
        <button className="rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400" disabled={!selectedTicket} onClick={onPrint}>Imprimir ticket</button>
      </div>
      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Tickets recientes</h3>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">{tickets.length}</span>
        </div>
        <div className="max-h-[190px] space-y-2 overflow-y-auto pr-1">
          {tickets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">Al cobrar una cuenta se generara el primer ticket.</div>
          ) : (
            tickets.map((ticket) => (
              <button className={`w-full rounded-xl border p-3 text-left transition ${selectedTicket?.folio === ticket.folio ? "border-[#17443d] bg-[#edf7f4]" : "border-slate-200 bg-white hover:bg-slate-50"}`} key={ticket.folio} onClick={() => onSelectTicket(ticket)}>
                <span className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{ticket.folio}</span>
                  <span className="font-semibold">{money(ticket.totals.total)}</span>
                </span>
                <span className="mt-1 block text-sm text-slate-500">{ticket.table} · {ticket.payment} · {ticket.createdAt}</span>
              </button>
            ))
          )}
        </div>
      </section>
      {selectedTicket ? <TicketPreview ticket={selectedTicket} /> : null}
    </aside>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <p className="mt-2 truncate text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </div>
  );
}

function StationBadge({ station }: { station: Product["station"] }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${station === "Barra" ? "bg-[#edf7f4] text-[#17443d]" : "bg-[#fff3df] text-[#9a5d12]"}`}>{station}</span>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-slate-500">
      <span>{label}</span>
      <span className="text-right font-medium text-slate-950">{value}</span>
    </div>
  );
}

function Control({ label, value, suffix, max, onChange }: { label: string; value: number; suffix: string; max: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="font-semibold text-slate-500">{value}{suffix}</span>
      </span>
      <input className="w-full accent-[#17443d]" max={max} min={0} onChange={(event) => onChange(Number(event.target.value))} type="range" value={value} />
    </label>
  );
}

function TextField({ label, onChange, placeholder, type = "text", value }: { label: string; onChange: (value: string) => void; placeholder: string; type?: string; value: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      <input className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium outline-none focus:border-[#17443d]" min={type === "number" ? 0 : undefined} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} value={value} />
    </label>
  );
}

function TicketPreview({ ticket }: { ticket: Ticket }) {
  return (
    <section className="ticket-print mt-5 rounded-xl border border-slate-300 bg-[#fffdf7] p-4 font-mono text-sm shadow-sm">
      <div className="text-center">
        <p className="text-base font-bold">MESA CLARA POS</p>
        <p>Restaurante / Cafeteria</p>
        <p>RFC: XAXX010101000</p>
      </div>
      <div className="my-3 border-y border-dashed border-slate-400 py-2">
        <Row label="Ticket" value={ticket.folio} />
        <Row label="Mesa" value={ticket.table} />
        <Row label="Cajero" value={ticket.cashier} />
        <Row label="Fecha" value={ticket.createdAt} />
      </div>
      <div className="space-y-2">
        {ticket.items.map((item) => (
          <div key={`${ticket.folio}-${item.id}`}>
            <div className="flex justify-between gap-3">
              <span>{item.qty} x {item.name}</span>
              <span>{money(item.price * item.qty)}</span>
            </div>
            {item.note ? <p className="text-xs text-slate-500">Nota: {item.note}</p> : null}
          </div>
        ))}
      </div>
      <div className="mt-3 border-t border-dashed border-slate-400 pt-2">
        <Row label="Subtotal" value={money(ticket.totals.subtotal)} />
        <Row label="Descuento" value={`-${money(ticket.totals.discountAmount)}`} />
        <Row label="IVA" value={money(ticket.totals.tax)} />
        <Row label="Propina" value={money(ticket.totals.tipAmount)} />
        <div className="mt-2 flex justify-between text-base font-bold">
          <span>Total</span>
          <span>{money(ticket.totals.total)}</span>
        </div>
        <Row label="Pago" value={ticket.payment} />
      </div>
      <p className="mt-4 text-center text-xs">Gracias por su compra</p>
    </section>
  );
}
