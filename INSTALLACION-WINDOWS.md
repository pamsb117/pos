# Punto de venta - Instalacion en Windows

## Equipo recomendado

- Windows 10/11.
- 8 GB de RAM minimo.
- Disco SSD.
- Node.js LTS 22 o superior.
- Navegador Chrome o Edge.
- Impresora termica de 80 mm (USB o red) configurada en Windows, si se van a imprimir tickets.

## Instalacion en la computadora principal

1. Descomprimir el paquete `PuntoDeVenta-Windows.zip` en una carpeta fija (por ejemplo `C:\PuntoDeVenta`).
   Los datos del negocio se guardan dentro de esa carpeta, asi que no debe moverse ni borrarse.
2. Abrir PowerShell dentro de la carpeta descomprimida.
3. Ejecutar:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File installer/windows/Install-POS.ps1 -CreateStartupShortcut
```

El instalador descarga las dependencias (requiere internet esa unica vez), compila el
sistema y crea el acceso directo `Punto de Venta` en el escritorio. Con
`-CreateStartupShortcut` tambien arranca junto con Windows.

## Primer arranque

Al abrir el sistema por primera vez aparece la pantalla de configuracion inicial:

1. Nombre del negocio y giro (estetica, barberia, consultorio, restaurante o tienda).
2. Opcionalmente, un catalogo de ejemplo para ese giro.
3. Nombre, usuario y contrasena del administrador.

Despues, en **Configuracion** el administrador puede cambiar los datos del negocio, el
RFC y el mensaje del ticket, activar o desactivar la agenda, y crear usuarios cajeros.
Los cajeros pueden vender y operar la caja, pero no cambiar la configuracion ni los usuarios.

Si se olvida la contrasena del unico administrador no hay forma de recuperarla desde la
pantalla: hay que restaurar un respaldo o reinstalar con datos nuevos. Conviene crear un
segundo usuario administrador.

## Arranque diario

Usar el acceso directo `Punto de Venta` del escritorio. Se abre una ventana de PowerShell
(debe quedar abierta mientras se usa el sistema) y el navegador en:

```text
http://localhost:3000
```

Para tablets u otras computadoras en la misma red:

```text
http://IP-DE-LA-PC:3000
```

Tambien se puede iniciar manualmente:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File installer/windows/Start-POS.ps1
```

## Respaldos

Cerrar la ventana del punto de venta y ejecutar:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File installer/windows/Backup-POS.ps1
```

Los respaldos se guardan en `C:\ProgramData\PuntoDeVentaPOS\backups`. No se hacen solos:
hay que ejecutar el comando (o programarlo en el Programador de tareas de Windows) y
copiar los archivos a una memoria USB o a la nube.

Para restaurar: cerrar el punto de venta y descomprimir el respaldo dentro de la carpeta
`.wrangler` de la instalacion, reemplazando la carpeta `state`.

## Desinstalacion

Quitar accesos directos:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File installer/windows/Uninstall-POS.ps1
```

Quitar accesos y borrar todos los datos (ventas, clientes, usuarios):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File installer/windows/Uninstall-POS.ps1 -RemoveLocalData
```

## Crear el paquete para un cliente

```powershell
npm run pos:package:windows
```

Genera `outputs\PuntoDeVenta-Windows.zip` sin datos locales, listo para instalar en otra
computadora.

## Limitaciones conocidas

- El instalador son scripts de PowerShell; no hay un `.exe` con asistente visual.
- El sistema se sirve por `http` dentro de la red local. No debe exponerse a internet.
- La impresion usa el dialogo de impresion del navegador con la impresora de tickets
  seleccionada.
