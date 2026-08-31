"use client";

import { useMemo, useState } from "react";

type Product = {
  id: number;
  name: string;
  category: string;
  price: number;
  station: "Barra" | "Cocina";
  tag?: string;
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

const products: Product[] = [
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
  const categories = ["Todo", ...Array.from(new Set(products.map((product) => product.category)))];
  const [activeCategory, setActiveCategory] = useState("Todo");
  const [activeTable, setActiveTable] = useState(tables[0]);
  const [cart, setCart] = useState<CartItem[]>([
    { ...products[1], qty: 1 },
    { ...products[7], qty: 1, note: "Sin crema" },
  ]);
  const [discount, setDiscount] = useState(0);
  const [tip, setTip] = useState(10);
  const [payment, setPayment] = useState(paymentMethods[1]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const visibleProducts = products.filter(
    (product) => activeCategory === "Todo" || product.category === activeCategory,
  );

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const discountAmount = Math.round(subtotal * (discount / 100));
    const base = subtotal - discountAmount;
    const tax = Math.round(base * 0.16);
    const tipAmount = Math.round(base * (tip / 100));
    return {
      subtotal,
      discountAmount,
      tax,
      tipAmount,
      total: base + tax + tipAmount,
    };
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

  const createTicket = () => {
    if (cart.length === 0) {
      return;
    }

    const ticket: Ticket = {
      folio: `T-${String(1029 + tickets.length).padStart(4, "0")}`,
      table: activeTable,
      cashier: "Ana Lopez",
      payment,
      createdAt: new Date().toLocaleString("es-MX", {
        dateStyle: "short",
        timeStyle: "short",
      }),
      items: cart.map((item) => ({ ...item })),
      totals: { ...totals },
    };

    setTickets((currentTickets) => [ticket, ...currentTickets]);
    setSelectedTicket(ticket);
    clearSale();
  };

  const printTicket = () => {
    if (selectedTicket) {
      window.print();
    }
  };

  const readyOrders = cart.filter((item) => item.station === "Barra").length;
  const kitchenOrders = cart.filter((item) => item.station === "Cocina").length;
  const ticketSales = tickets.reduce((sum, ticket) => sum + ticket.totals.total, 0);

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-stone-950">
      <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-[220px_minmax(0,1fr)_390px] gap-0 max-xl:grid-cols-[180px_minmax(0,1fr)] max-lg:block">
        <aside className="border-r border-stone-200 bg-[#23302d] px-4 py-5 text-white max-lg:hidden">
          <div className="mb-8">
            <p className="text-xs font-medium uppercase text-emerald-200">Corte abierto</p>
            <h1 className="mt-1 text-2xl font-semibold">Mesa Clara POS</h1>
          </div>
          <nav className="space-y-2">
            {["Venta", "Tickets", "Mesas", "Barra", "Inventario", "Reportes"].map((item, index) => (
              <button
                className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                  index === 0 ? "bg-white text-stone-950" : "text-stone-200 hover:bg-white/10"
                }`}
                key={item}
              >
                {item}
              </button>
            ))}
          </nav>
          <div className="mt-10 border-t border-white/15 pt-5">
            <p className="text-xs text-stone-300">Turno</p>
            <p className="mt-1 font-medium">Caja Principal</p>
            <p className="mt-5 text-xs text-stone-300">Cajero</p>
            <p className="mt-1 font-medium">Ana Lopez</p>
          </div>
        </aside>

        <section className="flex min-h-screen flex-col px-5 py-5 max-lg:min-h-0">
          <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-emerald-700">Restaurante / Cafeteria</p>
              <h2 className="text-3xl font-semibold tracking-tight">Nueva venta</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {tables.map((table) => (
                <button
                  className={`rounded-md border px-3 py-2 text-sm font-medium ${
                    activeTable === table
                      ? "border-stone-950 bg-stone-950 text-white"
                      : "border-stone-300 bg-white text-stone-700"
                  }`}
                  key={table}
                  onClick={() => setActiveTable(table)}
                >
                  {table}
                </button>
              ))}
            </div>
          </header>

          <div className="mb-5 grid grid-cols-4 gap-3 max-md:grid-cols-2">
            <Metric label="Ventas hoy" value={formatCurrency(8420 + ticketSales)} detail={`${38 + tickets.length} tickets`} />
            <Metric label="Orden activa" value={activeTable} detail={`${cart.length} partidas`} />
            <Metric label="Barra" value={`${readyOrders}`} detail="bebidas pendientes" />
            <Metric label="Cocina" value={`${kitchenOrders}`} detail="alimentos pendientes" />
          </div>

          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {categories.map((category) => (
              <button
                className={`shrink-0 rounded-md border px-4 py-2 text-sm font-medium ${
                  activeCategory === category
                    ? "border-emerald-900 bg-emerald-900 text-white"
                    : "border-stone-300 bg-white text-stone-700"
                }`}
                key={category}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="grid flex-1 grid-cols-4 gap-3 overflow-y-auto pb-5 max-2xl:grid-cols-3 max-md:grid-cols-2">
            {visibleProducts.map((product) => (
              <button
                className="group flex min-h-[138px] flex-col justify-between rounded-lg border border-stone-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-800 hover:shadow-md"
                key={product.id}
                onClick={() => addProduct(product)}
              >
                <span>
                  <span className="flex items-start justify-between gap-3">
                    <span className="text-base font-semibold leading-tight">{product.name}</span>
                    <span className="rounded bg-stone-100 px-2 py-1 text-xs font-medium text-stone-600">
                      {product.station}
                    </span>
                  </span>
                  {product.tag ? <span className="mt-3 inline-block text-xs text-emerald-700">{product.tag}</span> : null}
                </span>
                <span className="text-xl font-semibold">{formatCurrency(product.price)}</span>
              </button>
            ))}
          </div>
        </section>

        <aside className="border-l border-stone-200 bg-white px-5 py-5 max-xl:border-t max-lg:border-l-0">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-stone-500">Cuenta activa</p>
              <h3 className="text-2xl font-semibold">{activeTable}</h3>
            </div>
            <button className="rounded-md border border-stone-300 px-3 py-2 text-sm font-medium" onClick={clearSale}>
              Limpiar
            </button>
          </div>

          <div className="space-y-3">
            {cart.length === 0 ? (
              <div className="rounded-lg border border-dashed border-stone-300 p-5 text-center text-sm text-stone-500">
                Sin productos en la cuenta
              </div>
            ) : (
              cart.map((item) => (
                <div className="rounded-lg border border-stone-200 p-3" key={item.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-stone-500">
                        {formatCurrency(item.price)} · {item.station}
                      </p>
                      {item.note ? <p className="mt-1 text-xs text-emerald-700">{item.note}</p> : null}
                    </div>
                    <p className="font-semibold">{formatCurrency(item.price * item.qty)}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center overflow-hidden rounded-md border border-stone-300">
                      <button className="h-9 w-9 text-lg" onClick={() => changeQty(item.id, -1)} aria-label={`Quitar ${item.name}`}>
                        -
                      </button>
                      <span className="grid h-9 w-10 place-items-center border-x border-stone-300 text-sm font-semibold">
                        {item.qty}
                      </span>
                      <button className="h-9 w-9 text-lg" onClick={() => changeQty(item.id, 1)} aria-label={`Agregar ${item.name}`}>
                        +
                      </button>
                    </div>
                    <button className="text-sm font-medium text-stone-500">Nota</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-5 space-y-3 border-t border-stone-200 pt-5">
            <Control label="Descuento" value={discount} suffix="%" onChange={setDiscount} max={30} />
            <Control label="Propina" value={tip} suffix="%" onChange={setTip} max={25} />
          </div>

          <div className="mt-5 space-y-2 text-sm">
            <Row label="Subtotal" value={formatCurrency(totals.subtotal)} />
            <Row label="Descuento" value={`-${formatCurrency(totals.discountAmount)}`} />
            <Row label="IVA" value={formatCurrency(totals.tax)} />
            <Row label="Propina" value={formatCurrency(totals.tipAmount)} />
            <div className="flex items-center justify-between border-t border-stone-200 pt-3 text-xl font-semibold">
              <span>Total</span>
              <span>{formatCurrency(totals.total)}</span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {paymentMethods.map((method) => (
              <button
                className={`rounded-md border px-2 py-2 text-sm font-medium ${
                  payment === method ? "border-emerald-900 bg-emerald-900 text-white" : "border-stone-300"
                }`}
                key={method}
                onClick={() => setPayment(method)}
              >
                {method}
              </button>
            ))}
          </div>

          <button
            className="mt-4 w-full rounded-md bg-[#b7412e] px-4 py-4 text-base font-semibold text-white shadow-sm hover:bg-[#9f3525] disabled:cursor-not-allowed disabled:bg-stone-300"
            disabled={cart.length === 0}
            onClick={createTicket}
          >
            Cobrar y crear ticket {formatCurrency(totals.total)}
          </button>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button className="rounded-md border border-stone-300 px-3 py-3 text-sm font-medium">Enviar cocina</button>
            <button
              className="rounded-md border border-stone-300 px-3 py-3 text-sm font-medium disabled:cursor-not-allowed disabled:text-stone-400"
              disabled={!selectedTicket}
              onClick={printTicket}
            >
              Imprimir ticket
            </button>
          </div>

          <section className="mt-5 border-t border-stone-200 pt-5">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-semibold">Tickets recientes</h4>
              <span className="text-sm text-stone-500">{tickets.length} creados</span>
            </div>
            <div className="space-y-2">
              {tickets.length === 0 ? (
                <div className="rounded-lg border border-dashed border-stone-300 p-4 text-sm text-stone-500">
                  Al cobrar una cuenta se generara el primer ticket.
                </div>
              ) : (
                tickets.map((ticket) => (
                  <button
                    className={`w-full rounded-lg border p-3 text-left ${
                      selectedTicket?.folio === ticket.folio
                        ? "border-emerald-900 bg-emerald-50"
                        : "border-stone-200 bg-white"
                    }`}
                    key={ticket.folio}
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-semibold">{ticket.folio}</span>
                      <span className="font-semibold">{formatCurrency(ticket.totals.total)}</span>
                    </span>
                    <span className="mt-1 block text-sm text-stone-500">
                      {ticket.table} · {ticket.payment} · {ticket.createdAt}
                    </span>
                  </button>
                ))
              )}
            </div>
          </section>

          {selectedTicket ? (
            <section className="ticket-print mt-5 rounded-lg border border-stone-300 bg-[#fffdf7] p-4 font-mono text-sm">
              <div className="text-center">
                <p className="text-base font-bold">MESA CLARA POS</p>
                <p>Restaurante / Cafeteria</p>
                <p>RFC: XAXX010101000</p>
              </div>
              <div className="my-3 border-y border-dashed border-stone-400 py-2">
                <Row label="Ticket" value={selectedTicket.folio} />
                <Row label="Mesa" value={selectedTicket.table} />
                <Row label="Cajero" value={selectedTicket.cashier} />
                <Row label="Fecha" value={selectedTicket.createdAt} />
              </div>
              <div className="space-y-2">
                {selectedTicket.items.map((item) => (
                  <div key={`${selectedTicket.folio}-${item.id}`}>
                    <div className="flex justify-between gap-3">
                      <span>
                        {item.qty} x {item.name}
                      </span>
                      <span>{formatCurrency(item.price * item.qty)}</span>
                    </div>
                    {item.note ? <p className="text-xs text-stone-500">Nota: {item.note}</p> : null}
                  </div>
                ))}
              </div>
              <div className="mt-3 border-t border-dashed border-stone-400 pt-2">
                <Row label="Subtotal" value={formatCurrency(selectedTicket.totals.subtotal)} />
                <Row label="Descuento" value={`-${formatCurrency(selectedTicket.totals.discountAmount)}`} />
                <Row label="IVA" value={formatCurrency(selectedTicket.totals.tax)} />
                <Row label="Propina" value={formatCurrency(selectedTicket.totals.tipAmount)} />
                <div className="mt-2 flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(selectedTicket.totals.total)}</span>
                </div>
                <Row label="Pago" value={selectedTicket.payment} />
              </div>
              <p className="mt-4 text-center text-xs">Gracias por su compra</p>
            </section>
          ) : null}
        </aside>
      </div>
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-1 truncate text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-stone-500">{detail}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-stone-600">
      <span>{label}</span>
      <span className="font-medium text-stone-950">{value}</span>
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
        <span className="font-medium">{label}</span>
        <span className="text-stone-500">
          {value}
          {suffix}
        </span>
      </span>
      <input
        className="w-full accent-emerald-900"
        max={max}
        min={0}
        onChange={(event) => onChange(Number(event.target.value))}
        type="range"
        value={value}
      />
    </label>
  );
}
