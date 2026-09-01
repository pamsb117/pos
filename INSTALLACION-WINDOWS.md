# Aura Estudio POS - Instalacion Windows

## Equipo recomendado

- Windows 10/11 Pro.
- 8 GB de RAM minimo, 16 GB recomendado.
- Disco SSD.
- Node.js LTS instalado.
- Navegador Chrome o Edge.
- Impresora termica USB o LAN de 80mm recomendada.
- Red WiFi/LAN estable para caja, tablets y cocina.

## Instalacion en la computadora principal

1. Descomprimir el paquete `AuraEstudioPOS-Windows.zip`.
2. Abrir PowerShell dentro de la carpeta descomprimida.
3. Ejecutar:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File installer/windows/Install-MesaClaraPOS.ps1 -CreateStartupShortcut
```

El instalador:

- Instala dependencias.
- Compila el sistema.
- Crea carpetas de datos, respaldos y logs.
- Crea acceso directo en escritorio.
- Opcionalmente deja el POS listo para iniciar con Windows.

## Arranque diario

Usar el acceso directo `Aura Estudio POS` del escritorio.

Tambien se puede iniciar manualmente:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File installer/windows/Start-MesaClaraPOS.ps1
```

La caja abre:

```text
http://localhost:3000
```

Para tablets, cocina o barra en la misma red:

```text
http://IP-DE-LA-PC:3000
```

## Respaldos

Ejecutar:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File installer/windows/Backup-MesaClaraPOS.ps1
```

Los respaldos se guardan en:

```text
C:\ProgramData\AuraEstudioPOS\backups
```

## Desinstalacion

Quitar accesos directos:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File installer/windows/Uninstall-MesaClaraPOS.ps1
```

Quitar accesos y datos locales:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File installer/windows/Uninstall-MesaClaraPOS.ps1 -RemoveLocalData
```

## Pendiente para instalador final `.exe`

Esta base ya funciona como instalador tecnico. Para un instalador final de cliente se recomienda envolver estos scripts con Inno Setup o NSIS para generar un `.exe` con asistente visual.
