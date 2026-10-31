@echo off
rem ------------------------------------------------------------------
rem  Prueba rapida SIN instalar: crea datos de ejemplo la primera vez
rem  y deja el sistema corriendo en esta ventana (http://localhost:3000)
rem  Cierra la ventana para detenerlo.
rem ------------------------------------------------------------------
setlocal
set "RAIZ=%~dp0"
set "NODE=node"
if exist "%RAIZ%node\node.exe" set "NODE=%RAIZ%node\node.exe"

"%NODE%" -v >nul 2>&1
if errorlevel 1 goto sinnode
for /f "tokens=1,2 delims=v." %%a in ('"%NODE%" -v') do (
  set "MAYOR=%%a"
  set "MENOR=%%b"
)
if %MAYOR% LSS 22 goto viejo
if %MAYOR% EQU 22 if %MENOR% LSS 13 goto viejo

set "DATABASE_PATH=%RAIZ%data\inventario.db"
set NODE_ENV=production
set PORT=3000
set HOSTNAME=0.0.0.0
if not exist "%DATABASE_PATH%" (
  echo Primera vez: creando usuarios y datos de ejemplo...
  "%NODE%" --disable-warning=ExperimentalWarning "%RAIZ%scripts\seed.mjs" --demo
  if errorlevel 1 goto fallo
  echo.
  echo Anota las contrasenas de arriba. Luego presiona una tecla para iniciar.
  pause
)
cd /d "%RAIZ%app"
echo Sistema en http://localhost:3000   (Ctrl+C para detener)
"%NODE%" --disable-warning=ExperimentalWarning server.js
goto fin

:sinnode
echo No se encontro Node.js. Instala Node.js LTS (version 22.13 o superior) desde https://nodejs.org
echo y vuelve a ejecutar este archivo.
goto fin

:viejo
echo Tu version de Node.js es la %MAYOR%.%MENOR%. El sistema necesita la 22.13 o superior.
echo Instala Node.js LTS desde https://nodejs.org, cierra esta ventana y vuelve a ejecutar este archivo.
goto fin

:fallo
echo No se pudieron crear los datos iniciales. Revisa el mensaje de arriba.

:fin
pause
