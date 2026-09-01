# Handoff UX: Aura Estudio POS

## Usuario y contexto

Recepcionistas y propietarias de una estetica trabajan principalmente en una computadora o tablet. Su objetivo diario es ver la agenda, recibir clientes, asignar especialistas, cobrar servicios y consultar caja sin cambiar de sistema.

## Flujo principal

1. La recepcionista abre `Agenda` y revisa las citas del dia.
2. Crea una cita seleccionando cliente, servicio, especialista, fecha y hora.
3. Al llegar el cliente cambia la cita a `En servicio`.
4. Desde la misma cita abre `Cobrar`; el sistema precarga cliente, especialista y servicio.
5. Agrega productos si aplica, elige forma de pago y genera el ticket.
6. La cita queda completada y la venta aparece en caja y reportes.

Estados cubiertos: carga, agenda vacia, validacion, error de red, cita confirmada, en servicio, completada y cancelada. En movil, la navegacion pasa a una fila desplazable y los paneles se apilan.

## Componentes

- `AgendaDia`: filtro de fecha, resumen diario y lista cronologica. Cada cita expone solo las acciones validas para su estado.
- `FormularioCita`: cliente, servicio, especialista, fecha, hora y notas; conserva el foco y muestra errores en linea.
- `CatalogoVenta`: filtros por categoria y elementos de tamano estable; servicios muestran duracion y productos muestran su tipo.
- `PanelCobro`: contexto de cliente/especialista, cantidades, descuento, propina, totales y pago. El boton de cobro se bloquea durante el guardado.
- `DirectorioClientes`: busqueda, alta rapida y datos de contacto. Los vacios ofrecen una accion clara.
- `CajaYReportes`: metricas legibles, estados de turno y movimientos con confirmacion visual.

## Reglas visuales

- Fondo marfil frio `#f4f3f0`, superficie blanca y texto carbon `#202628`.
- Primario verde mineral `#315f55`; acento coral sobrio `#b95763`; informacion azul `#356a8a`.
- Radio maximo de 8px, sombras discretas y bordes `#deded9`.
- Tipografia de interfaz entre 12 y 24px, sin escalado por viewport ni espaciado negativo.
- Foco visible, contraste AA, controles de al menos 40px y mensajes con `aria-live`.

## Implementacion

Objetivo: Next/Vinext con API routes y D1, porque el sistema ya usa renderizado React y persistencia en el servidor. Se acepta cuando citas, clientes, personal, catalogo, cobro, tickets, caja y reportes sobreviven recargas; el flujo cita a ticket funciona; y la interfaz se adapta a escritorio y movil.

## Rediseño V2

### Flujo y estados

- La recepcionista identifica en menos de cinco segundos la siguiente cita, citas pendientes y valor del dia.
- Las acciones `Recibir`, `Cobrar` y `Cancelar` mantienen posicion y jerarquia consistentes; durante guardado quedan bloqueadas y el resultado se anuncia en la barra superior.
- Agenda vacia, venta vacia y reportes sin datos conservan una accion siguiente clara.
- En movil la navegacion se convierte en barra horizontal, la agenda apila importe y acciones, y cobro coloca el resumen debajo del catalogo.

### Componentes

- `AppNavigation`: icono Lucide, etiqueta y contador; activo con superficie clara y barra de seleccion.
- `PageHeading`: icono contextual, titulo, descripcion breve y acciones agrupadas.
- `Metric`: icono semantico, valor, etiqueta y detalle; cuatro variantes cromaticas discretas.
- `AppointmentRow`: linea temporal, hora, cliente, servicio, especialista, estado e interacciones validas.
- `Checkout`: encabezado de cliente, articulos, controles numericos, desglose y accion fija de cobro.
- `Feedback`: estado de sincronizacion con `aria-live`, foco visible y botones con estado deshabilitado.

### Tokens V2

- Fondo `#f5f6f4`, superficie `#ffffff`, superficie secundaria `#eef1ee`.
- Texto `#1d2526`, texto secundario `#667171`, borde `#dde2de`.
- Primario `#28594f`, coral `#bd5967`, azul `#3d6f8d`, dorado `#a76b25`.
- Radios de 6 y 8px; sombras solo para navegacion, panel de cobro y dialogos.
- Transiciones de 150ms; se desactivan con `prefers-reduced-motion`.
- Objetivo de implementacion: Next/Vinext App Router con componentes cliente existentes y `lucide-react` para iconografia accesible.

## Liquid Glass V3

### Flujo y estados

El flujo operativo no cambia: agenda, recepcion, cobro y ticket conservan posicion y jerarquia. El tratamiento de vidrio distingue capas sin reducir la velocidad de lectura. Carga, vacio, error, exito y deshabilitado mantienen texto y color semantico, nunca dependen solo de transparencia.

### Componentes

- `GlassSurface`: fondo blanco translucido, borde claro, reflejo superior y desenfoque de 18 a 24px. Variantes `navigation`, `panel`, `floating` y `modal`.
- `PrimaryAction`: morado con transicion rosa, texto blanco y foco de alto contraste; mantiene estado deshabilitado opaco.
- `MetricGlass`: vidrio con tinte independiente morado, rosa, verde o azul; valor en texto solido.
- `StatusBadge`: conserva verde, ambar, azul y rojo para no confundir estados de operacion.
- `Receipt`: permanece papel opaco para impresion y lectura fiscal.

### Tokens

- Fondo base `#f7f4fb`; texto `#241f2b`; secundario `#706a78`.
- Primario morado `#7545c7`; violeta profundo `#4c326f`; rosa `#d65388`.
- Exito `#27856f`, advertencia `#a86a22`, informacion `#3f7091`, error `#b7475a`.
- Vidrio `rgba(255,255,255,.66)` con borde `rgba(255,255,255,.82)` y sombra `0 16px 40px rgba(67,44,86,.10)`.
- En pantallas menores a 820px el desenfoque baja a 14px. `prefers-reduced-motion` elimina transiciones y desplazamientos.

### Accesibilidad y aceptacion

Texto normal conserva contraste AA sobre la capa final compuesta. Inputs usan fondo casi opaco; foco visible violeta; estados siguen incluyendo etiqueta textual. Se acepta cuando todas las vistas comparten el material, tickets impresos no cambian y agenda/cobro siguen siendo legibles en escritorio, tablet y movil.
