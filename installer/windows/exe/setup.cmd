@echo off
title Punto de Venta - Instalacion
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Setup-POS.ps1"
exit /b %errorlevel%
