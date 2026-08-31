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

type CartItem = Product & {
  qty: number;
  note?: string;
};

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
  items: CartItem[];
  totals: TicketTotals;
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
const paymentMethods = ["Efectivo", "Tarjeta", "Transferencia"];
const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value);

export default function Home() {
  const [products, setProducts] = useState<Product[]>(defaultProducts);
  const [activeCategory, setActiveCategory] = useState("Todo");
  const [activeTable, setActiveTable] = useState(tables[0]);
  const [cart, setCart] = useState<CartItem[]>([
    { ...defaultProducts[1], qty: 1 },
    { ...defaultProducts[7], qty: 1, note: "Sin crema" },
  ]);
  const [discount, setDiscount] = useState(0);
  const [tip, setTip] = useState(10);
  const [payment, setPayment] = useState(paymentMethods[1]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isSavingTicket, setIsSavingTicket] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Base de datos lista");

  useEffect(() => {
    async function loadPointOfSaleData() {
      try {
        const [productsResponse, ticketsResponse] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/tickets"),
        ]);

        if (productsResponse.ok) {
          const productsPayload = (await productsResponse.json()) as { products: Product[] };
          setProducts(productsPayload.products);
        }

        if (ticketsResponse.ok) {
          const ticketsPayload = (await ticketsResponse.json()) as { tickets: Ticket[] };
          setTickets(ticketsPayload.tickets);
          setSelectedTicket(ticketsPayload.tickets[0] ?? null);
        }

        setStatusMessage("Datos sincronizados");
      } catch {
        setStatusMessage("Trabajando con datos locales");
      }
    }

    void loadPointOfSaleData();
  }, []);

  const categories = ["Todo", ...Array.from(new Set(products.map((product) => product.category)))];

  const visibleProducts = products.filter(
    (product) => activeCategory === "Todo" || product.category === activeCategory,
  );

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const discountAmount = Math.round(subtotal * (discount / 100));
    const base = subtotal - discountAmount;
    const tax = Math.round(base * 0.16);
    const tipAmount = Math.round(base * (tip / 100));
    return { subtotal, discountAmount, tax, tipAmount, total: base + tax + tipAmount };
  }, [cart, discount, tip]);

  const addProduct = (product: Product) => {
    setCart((items) => {
      const match = items.find((item) => item.id === product.id);
      if (match) {
        return items.map((item) => (item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
      }
      return [...items, { ...product, qty: 1 }];
    });
  };

  const changeQty = (id: number, delta: number) => {
    setCart((items) =>
      items
        .map((item) => (item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item))
        .filter((item) => item.qty > 0),
    );
  };

  const clearSale = () => {
    setCart([]);
    setDiscount(0);
    setTip(10);
  };

  const createTicket = async () => {
    if (cart.length === 0 || isSavingTicket) {
      return;
    }

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

      if (!response.ok) {
        throw new Error("No se pudo guardar el ticket.");
      }

      const payload = (await response.json()) as { ticket: Ticket };
      setTickets((currentTickets) => [payload.ticket, ...currentTickets]);
      setSelectedTicket(payload.ticket);
      clearSale();
      setStatusMessage(`${payload.ticket.folio} guardado`);
    } catch {
      const fallbackTicket: Ticket = {
        folio: `LOCAL-${Date.now().toString().slice(-6)}`,
        ...ticketPayload,
      };

      setTickets((currentTickets) => [fallbackTicket, ...currentTickets]);
      setSelectedTicket(fallbackTicket);
      clearSale();
      setStatusMessage("Ticket local creado; falta sincronizar");
    } finally {
      setIsSavingTicket(false);
    }
  };

  const printTicket = () => {
    if (selectedTicket) {
      window.print();
    }
  };

  const readyOrders = cart.filter((item) => item.station === "Barra").length;
  const kitchenOrders = cart.filter((item) => item.station === "Cocina").length;
  const ticketSales = tickets.reduce((sum, ticket) => sum + ticket.totals.total, 0);
  const cartUnits = cart.reduce((sum, item) => sum + item.qty, 0);

  return (
    <main className="min-h-screen bg-[#eef1ee] text-slate-950">
      <div className="mx-auto grid min-h-screen max-w-[1720px] grid-cols-[248px_minmax(0,1fr)_420px] max-xl:grid-cols-[210px_minmax(0,1fr)] max-lg:block">
        <aside className="hidden border-r border-slate-200 bg-[#111b1a] px-4 py-5 text-white max-lg:hidden lg:block">
          <div className="flex items-center gap-3 rounded-lg bg-white/7 p-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-[#d1533b] text-lg font-bold">M</div>
            <div>
              <p className="text-sm font-semibold">Mesa Clara</p>
              <p className="text-xs text-slate-300">POS Restaurante</p>
            </div>
          </div>

          <nav className="mt-7 space-y-1">
            {["Venta", "Tickets", "Mesas", "Barra", "Inventario", "Reportes"].map((item, index) => (
              <button
                className={`flex h-11 w-full items-center justify-between rounded-md px-3 text-left text-sm font-medium transition ${
                  index === 0 ? "bg-white text-slate-950 shadow-sm" : "text-slate-300 hover:bg-white/8 hover:text-white"
                }`}
                key={item}
              >
                <span>{item}</span>
                {item === "Tickets" ? (
                  <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-slate-300">{tickets.length}</span>
                ) : null}
              </button>
            ))}
          </nav>

          <div className="mt-8 rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-medium uppercase text-emerald-200">Corte abierto</p>
            <p className="mt-3 text-2xl font-semibold">{formatCurrency(8420 + ticketSales)}</p>
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
        </aside>

        <section className="flex min-h-screen flex-col px-6 py-5 max-lg:min-h-0 max-sm:px-4">
          <header className="mb-5 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-[#b64833]">Venta en mostrador y mesas</p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight">Nueva venta</h1>
                <p className="mt-1 text-sm font-medium text-slate-500">{statusMessage}</p>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-slate-100 p-1">
                {tables.map((table) => (
                  <button
                    className={`h-10 rounded-md px-3 text-sm font-semibold transition ${
                      activeTable === table ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:bg-white"
                    }`}
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
            <Metric label="Ventas hoy" value={formatCurrency(8420 + ticketSales)} detail={`${38 + tickets.length} tickets`} />
            <Metric label="Cuenta activa" value={activeTable} detail={`${cartUnits} articulos`} />
            <Metric label="Barra" value={`${readyOrders}`} detail="bebidas en cuenta" />
            <Metric label="Cocina" value={`${kitchenOrders}`} detail="alimentos en cuenta" />
          </div>

          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Catalogo</h2>
              <p className="text-sm text-slate-500">Selecciona productos para agregar a la cuenta.</p>
            </div>
            <div className="flex max-w-full gap-2 overflow-x-auto rounded-lg bg-white p-1 shadow-sm">
              {categories.map((category) => (
                <button
                  className={`h-9 shrink-0 rounded-md px-3 text-sm font-semibold transition ${
                    activeCategory === category ? "bg-[#17443d] text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                  key={category}
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="grid flex-1 grid-cols-4 gap-3 overflow-y-auto pb-5 max-2xl:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1">
            {visibleProducts.map((product) => (
              <button
                className="group flex min-h-[132px] flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#17443d] hover:shadow-lg"
                key={product.id}
                onClick={() => addProduct(product)}
              >
                <span>
                  <span className="flex items-start justify-between gap-3">
                    <span>
                      <span className="block text-base font-semibold leading-tight">{product.name}</span>
                      <span className="mt-2 block text-xs font-medium uppercase text-slate-400">{product.category}</span>
                    </span>
                    <StationBadge station={product.station} />
                  </span>
                  {product.tag ? (
                    <span className="mt-3 inline-block rounded bg-[#f7ece8] px-2 py-1 text-xs font-semibold text-[#a33e2b]">
                      {product.tag}
                    </span>
                  ) : null}
                </span>
                <span className="flex items-end justify-between">
                  <span className="text-2xl font-semibold tracking-tight">{formatCurrency(product.price)}</span>
                  <span className="rounded-md bg-slate-950 px-2.5 py-1 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">
                    Agregar
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <aside className="border-l border-slate-200 bg-white px-5 py-5 shadow-[-18px_0_40px_rgba(15,23,42,0.04)] max-xl:border-t max-lg:border-l-0">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Cuenta activa</p>
                <h2 className="mt-1 text-2xl font-semibold">{activeTable}</h2>
                <p className="mt-1 text-sm text-slate-500">{cartUnits} articulos en la orden</p>
              </div>
              <button
                className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                onClick={clearSale}
              >
                Limpiar
              </button>
            </div>
          </div>

          <div className="mt-4 max-h-[34vh] space-y-3 overflow-y-auto pr-1">
            {cart.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                La cuenta esta vacia.
              </div>
            ) : (
              cart.map((item) => (
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm" key={item.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatCurrency(item.price)} · {item.station}
                      </p>
                      {item.note ? <p className="mt-1 text-xs font-medium text-[#a33e2b]">{item.note}</p> : null}
                    </div>
                    <p className="font-semibold">{formatCurrency(item.price * item.qty)}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center overflow-hidden rounded-lg border border-slate-300 bg-slate-50">
                      <button className="h-9 w-9 text-lg hover:bg-white" onClick={() => changeQty(item.id, -1)} aria-label={`Quitar ${item.name}`}>
                        -
                      </button>
                      <span className="grid h-9 w-11 place-items-center border-x border-slate-300 bg-white text-sm font-semibold">
                        {item.qty}
                      </span>
                      <button className="h-9 w-9 text-lg hover:bg-white" onClick={() => changeQty(item.id, 1)} aria-label={`Agregar ${item.name}`}>
                        +
                      </button>
                    </div>
                    <button className="rounded-md px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100">Nota</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 p-4">
            <div className="grid grid-cols-2 gap-4">
              <Control label="Descuento" value={discount} suffix="%" onChange={setDiscount} max={30} />
              <Control label="Propina" value={tip} suffix="%" onChange={setTip} max={25} />
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <Row label="Subtotal" value={formatCurrency(totals.subtotal)} />
              <Row label="Descuento" value={`-${formatCurrency(totals.discountAmount)}`} />
              <Row label="IVA" value={formatCurrency(totals.tax)} />
              <Row label="Propina" value={formatCurrency(totals.tipAmount)} />
              <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                <span className="text-sm font-semibold text-slate-500">Total a cobrar</span>
                <span className="text-3xl font-semibold tracking-tight">{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {paymentMethods.map((method) => (
              <button
                className={`h-11 rounded-lg border px-2 text-sm font-semibold transition ${
                  payment === method ? "border-[#17443d] bg-[#17443d] text-white shadow-sm" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
                key={method}
                onClick={() => setPayment(method)}
              >
                {method}
              </button>
            ))}
          </div>

          <button
            className="mt-3 w-full rounded-lg bg-[#c64d36] px-4 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-[#a93f2c] disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={cart.length === 0}
            onClick={createTicket}
          >
            {isSavingTicket ? "Guardando ticket..." : "Cobrar y crear ticket"}
          </button>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button className="rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Enviar cocina
            </button>
            <button
              className="rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
              disabled={!selectedTicket}
              onClick={printTicket}
            >
              Imprimir ticket
            </button>
          </div>

          <section className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Tickets recientes</h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">{tickets.length}</span>
            </div>
            <div className="max-h-[190px] space-y-2 overflow-y-auto pr-1">
              {tickets.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  Al cobrar una cuenta se generara el primer ticket.
                </div>
              ) : (
                tickets.map((ticket) => (
                  <button
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      selectedTicket?.folio === ticket.folio
                        ? "border-[#17443d] bg-[#edf7f4]"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                    key={ticket.folio}
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-semibold">{ticket.folio}</span>
                      <span className="font-semibold">{formatCurrency(ticket.totals.total)}</span>
                    </span>
                    <span className="mt-1 block text-sm text-slate-500">
                      {ticket.table} · {ticket.payment} · {ticket.createdAt}
                    </span>
                  </button>
                ))
              )}
            </div>
          </section>

          {selectedTicket ? <TicketPreview ticket={selectedTicket} /> : null}
        </aside>
      </div>
    </main>
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
  const isBar = station === "Barra";
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        isBar ? "bg-[#edf7f4] text-[#17443d]" : "bg-[#fff3df] text-[#9a5d12]"
      }`}
    >
      {station}
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-slate-500">
      <span>{label}</span>
      <span className="text-right font-medium text-slate-950">{value}</span>
    </div>
  );
}

function Control({
  label,
  value,
  suffix,
  max,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="font-semibold text-slate-500">
          {value}
          {suffix}
        </span>
      </span>
      <input
        className="w-full accent-[#17443d]"
        max={max}
        min={0}
        onChange={(event) => onChange(Number(event.target.value))}
        type="range"
        value={value}
      />
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
              <span>
                {item.qty} x {item.name}
              </span>
              <span>{formatCurrency(item.price * item.qty)}</span>
            </div>
            {item.note ? <p className="text-xs text-slate-500">Nota: {item.note}</p> : null}
          </div>
        ))}
      </div>
      <div className="mt-3 border-t border-dashed border-slate-400 pt-2">
        <Row label="Subtotal" value={formatCurrency(ticket.totals.subtotal)} />
        <Row label="Descuento" value={`-${formatCurrency(ticket.totals.discountAmount)}`} />
        <Row label="IVA" value={formatCurrency(ticket.totals.tax)} />
        <Row label="Propina" value={formatCurrency(ticket.totals.tipAmount)} />
        <div className="mt-2 flex justify-between text-base font-bold">
          <span>Total</span>
          <span>{formatCurrency(ticket.totals.total)}</span>
        </div>
        <Row label="Pago" value={ticket.payment} />
      </div>
      <p className="mt-4 text-center text-xs">Gracias por su compra</p>
    </section>
  );
}
