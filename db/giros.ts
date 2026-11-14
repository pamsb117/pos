// Business types the POS can be set up for. Pure data: safe to import from
// both the client and the server.

export type GiroKey = "salon" | "barberia" | "consultorio" | "restaurante" | "tienda";

type SampleProduct = [name: string, category: string, price: number, kind: "service" | "product", minutes: number];

export type Giro = {
  label: string;
  tagline: string;
  /** What a staff member is called, e.g. "Especialista", "Mesero". */
  role: string;
  /** Name of the catalog section, e.g. "Servicios", "Menu". */
  catalog: string;
  /** Whether the appointment agenda makes sense for this business. */
  agenda: boolean;
  products: SampleProduct[];
};

export const GIROS: Record<GiroKey, Giro> = {
  salon: {
    label: "Estetica / salon de belleza",
    tagline: "Agenda y punto de venta",
    role: "Especialista",
    catalog: "Servicios",
    agenda: true,
    products: [
      ["Corte y peinado", "Cabello", 350, "service", 60],
      ["Tinte completo", "Color", 950, "service", 120],
      ["Manicure gel", "Unas", 320, "service", 60],
      ["Diseno de ceja", "Rostro", 180, "service", 30],
      ["Tratamiento hidratante", "Tratamientos", 480, "service", 45],
      ["Shampoo profesional", "Productos", 290, "product", 0],
      ["Aceite capilar", "Productos", 260, "product", 0],
    ],
  },
  barberia: {
    label: "Barberia",
    tagline: "Citas y punto de venta",
    role: "Barbero",
    catalog: "Servicios",
    agenda: true,
    products: [
      ["Corte clasico", "Corte", 180, "service", 30],
      ["Corte y barba", "Corte", 280, "service", 45],
      ["Corte infantil", "Corte", 150, "service", 30],
      ["Afeitado tradicional", "Barba", 160, "service", 30],
      ["Perfilado de barba", "Barba", 120, "service", 20],
      ["Cera para cabello", "Productos", 190, "product", 0],
      ["Aceite para barba", "Productos", 220, "product", 0],
    ],
  },
  consultorio: {
    label: "Consultorio / servicios profesionales",
    tagline: "Agenda y cobro de consultas",
    role: "Profesional",
    catalog: "Servicios",
    agenda: true,
    products: [
      ["Consulta general", "Consultas", 500, "service", 30],
      ["Consulta de seguimiento", "Consultas", 350, "service", 20],
      ["Estudio basico", "Estudios", 420, "service", 30],
      ["Certificado", "Tramites", 200, "service", 15],
    ],
  },
  restaurante: {
    label: "Restaurante / cafeteria",
    tagline: "Punto de venta y caja",
    role: "Mesero",
    catalog: "Menu",
    agenda: false,
    products: [
      ["Cafe americano", "Bebidas", 45, "product", 0],
      ["Capuchino", "Bebidas", 62, "product", 0],
      ["Jugo natural", "Bebidas", 55, "product", 0],
      ["Chilaquiles", "Desayunos", 125, "product", 0],
      ["Molletes", "Desayunos", 95, "product", 0],
      ["Club sandwich", "Comidas", 145, "product", 0],
      ["Pastel del dia", "Postres", 78, "product", 0],
    ],
  },
  tienda: {
    label: "Tienda / comercio",
    tagline: "Punto de venta y caja",
    role: "Vendedor",
    catalog: "Productos",
    agenda: false,
    products: [
      ["Refresco 600 ml", "Bebidas", 20, "product", 0],
      ["Agua 1 L", "Bebidas", 15, "product", 0],
      ["Papas fritas", "Botanas", 19, "product", 0],
      ["Pan de caja", "Abarrotes", 48, "product", 0],
      ["Leche 1 L", "Abarrotes", 28, "product", 0],
      ["Detergente 1 kg", "Limpieza", 42, "product", 0],
    ],
  },
};

export const GIRO_KEYS = Object.keys(GIROS) as GiroKey[];

export function isGiro(value: unknown): value is GiroKey {
  return typeof value === "string" && value in GIROS;
}

export type BusinessSettings = {
  businessName: string;
  tagline: string;
  rfc: string;
  ticketFooter: string;
  giro: GiroKey;
  agenda: boolean;
};

export const DEFAULT_SETTINGS: BusinessSettings = {
  businessName: "Punto de venta",
  tagline: GIROS.salon.tagline,
  rfc: "",
  ticketFooter: "Gracias por su preferencia",
  giro: "salon",
  agenda: true,
};
