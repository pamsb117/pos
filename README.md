# Pos Salon

Punto de venta, agenda y caja para negocios de servicios y comercio:
esteticas, barberias, consultorios, cafeterias, tiendas.

## Modulos

- Agenda de citas y seguimiento de servicios (opcional segun el giro).
- Cobro con descuento, propina y formas de pago.
- Clientes e historial de visitas.
- Catalogo de servicios y productos.
- Personal y comisiones.
- Caja: apertura, movimientos y corte.
- Tickets, cancelaciones e impresion.
- Reportes de ventas.
- Configuracion: nombre del negocio, RFC, mensaje del ticket y giro.

## Demo

https://pamsb117.github.io/pos/

La demo (`docs/index.html`) es funcional para pruebas: se pueden registrar
clientes, citas, conceptos, cobros y movimientos de caja, y cambiar el nombre y
el giro del negocio. Todo se guarda solo en el navegador donde se usa
(localStorage); no hay servidor ni base de datos detras.

La version instalable (`app/`, `db/`) usa backend y base de datos. Ver
`INSTALLACION-WINDOWS.md`.
