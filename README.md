# Punto de venta

Punto de venta, agenda y caja para negocios de servicios y comercio:
esteticas, barberias, consultorios, cafeterias, tiendas. Cada instalacion se
configura con el nombre y el giro del negocio.

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
- Usuarios con contrasena y dos niveles: administrador y cajero.

## Demo

https://pamsb117.github.io/pos/

La demo (`docs/index.html`) es funcional para pruebas: se pueden registrar
clientes, citas, conceptos, cobros y movimientos de caja, y cambiar el nombre y
el giro del negocio. Todo se guarda solo en el navegador donde se usa
(localStorage); no hay servidor ni base de datos detras.

La demo entra con usuario `Prueba` y contrasena `22556`. Es solo una pantalla
de muestra: esos datos estan en el codigo de la pagina.

## Version instalable

`app/`, `components/` y `db/` son el sistema real: servidor, base de datos,
inicio de sesion con usuarios propios y configuracion inicial del negocio. Ver
`INSTALLACION-WINDOWS.md`.

```bash
npm install
npm run dev      # desarrollo
npm run build    # compilar
npm run start    # servir la version compilada
```

## Capturas visuales

Ejecuta `npm run screenshot` para iniciar la aplicacion y guardar una captura en
`artifacts/pos-salon.png`. El comando detecta Chrome o Chromium; si no esta en una
ruta habitual, configura `CHROME_PATH` con la ruta completa del ejecutable.

El workflow `Visual check` ejecuta esta comprobacion automaticamente en cada pull
request y publica la captura como un artefacto descargable de GitHub Actions.
