# Invicar · Control de inventarios

Sistema web de control de inventarios pensado para un taller de carrocerías.
Corre en un solo PC con Windows, dentro de la red local de la oficina, sin
depender de internet ni de servicios en la nube. Los demás equipos entran desde
el navegador.

## Características

- **Materiales:** código, categoría, unidad de medida, stock, stock mínimo y
  costo por unidad. Alertas de stock bajo, crítico y agotado.
- **Kits:** conjuntos de materiales con cantidades (admite decimales). Al
  descontar un kit, el sistema valida que alcance el stock de todos los
  materiales: si falta uno, no se descuenta nada (transaccional).
- **Historial (kárdex):** entradas, salidas, ajustes y descuentos de kits, con
  usuario, fecha y motivo. Las operaciones se **anulan**, no se borran.
- **Costos:** valor del inventario y costo de cada kit calculados a partir del
  costo por unidad de cada material.
- **Roles:** `encargado` (edita todo) y `secretaria` (solo lectura, sin ver
  costos ni en pantalla ni en el CSV).
- **Exportación a CSV** de materiales e historial.
- **Respaldos automáticos** (10:30 y 16:00), verificados, con carpeta local y
  una ruta externa opcional. Restauración con un script.
- **Instalador para Windows** (`instalar.ps1`): copia la aplicación, crea los
  usuarios, abre el puerto en el firewall solo para la red local y programa el
  arranque automático.

## Tecnología

- Next.js 15 (App Router, Server Actions) y React 19
- TypeScript y Tailwind CSS 4
- SQLite con el módulo `node:sqlite` incluido en Node (sin dependencias nativas)
- Contraseñas con `scrypt` (módulo `crypto` de Node), sesiones por cookie y
  bloqueo por intentos fallidos
- Node.js 22.13 o superior

## Cómo está organizado

| Carpeta | Contenido |
|---|---|
| `src/` | Aplicación web (páginas, componentes, lógica de inventario) |
| `core/` | Base de datos, migraciones y hash de contraseñas (compartido con los scripts) |
| `scripts/` | Semilla, respaldo, restauración, cambio de contraseña y empaquetado |
| `deploy/` | Instalador y desinstalador de Windows, scripts de inicio y respaldo |
| `tests/` | Pruebas automáticas de la lógica de inventario |

## Desarrollo

```bash
npm install
npm run seed        # crea usuarios y datos de ejemplo en ./data
npm run dev         # http://localhost:3000
npm run typecheck
npm test
```

## Generar el paquete de instalación

```bash
npm run build
npm run empaquetar  # crea release/invicar-inventario
```

La carpeta resultante se copia al PC de Windows y se instala ejecutando
`instalar.ps1` como administrador. Para actualizar una instalación existente,
se vuelve a ejecutar el instalador: conserva la base de datos y los usuarios,
y las migraciones se aplican solas al primer ingreso.

## Notas

- El sistema funciona solo en la red local; no está pensado para exponerse a
  internet (usa HTTP sin cifrar).
- Los datos viven en un único archivo SQLite en el PC servidor, por eso es
  importante configurar la copia de respaldo externa.
