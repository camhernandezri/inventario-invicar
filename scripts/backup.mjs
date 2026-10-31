#!/usr/bin/env node
// Copia de seguridad consistente de la base de datos (segura aunque el sistema esté en uso).
//
//   node scripts/backup.mjs
//
// Variables: DATABASE_PATH       ruta de la base de datos
//            BACKUP_DIR          carpeta principal de copias (por defecto ../backups junto a data)
//            BACKUP_DIRS         carpetas ADICIONALES separadas por ";" (disco externo, carpeta de red…)
//            BACKUP_KEEP         cuántas copias conservar por carpeta (por defecto 40)
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from '../core/db.mjs';

const ruta = path.resolve(process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'inventario.db'));
const base = path.resolve(path.dirname(ruta), '..');
const principal = path.resolve(process.env.BACKUP_DIR || path.join(base, 'backups'));
const extras = (process.env.BACKUP_DIRS || '').split(';').map((s) => s.trim()).filter(Boolean);
const conservar = Math.max(5, Number(process.env.BACKUP_KEEP) || 40);
const carpetaLogs = path.join(base, 'logs');

const pad = (n) => String(n).padStart(2, '0');
const d = new Date();
const sello = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
const nombre = `inventario-${sello}.db`;

let fallos = 0;
function log(msg, esError = false) {
  const linea = `[${new Date().toISOString()}] ${esError ? 'ERROR ' : ''}${msg}`;
  (esError ? console.error : console.log)(linea);
  try {
    fs.mkdirSync(carpetaLogs, { recursive: true });
    fs.appendFileSync(path.join(carpetaLogs, 'backup.log'), linea + '\n');
  } catch { /* sin log en disco */ }
}

function podar(carpeta) {
  const archivos = fs.readdirSync(carpeta).filter((f) => /^inventario-\d{8}-\d{6}\.db$/.test(f)).sort().reverse();
  for (const f of archivos.slice(conservar)) fs.rmSync(path.join(carpeta, f), { force: true });
}

try {
  if (!fs.existsSync(ruta)) throw new Error(`No existe la base de datos: ${ruta}`);
  fs.mkdirSync(principal, { recursive: true });
  const destino = path.join(principal, nombre);

  const origen = new DatabaseSync(ruta);
  origen.exec('PRAGMA busy_timeout = 10000');
  origen.exec(`VACUUM INTO '${destino.replace(/'/g, "''")}'`);
  origen.close();

  // Verificar que la copia se puede abrir y está íntegra.
  const copia = new DatabaseSync(destino);
  const integridad = copia.prepare('PRAGMA integrity_check').get().integrity_check;
  const materiales = copia.prepare('SELECT COUNT(*) AS n FROM materiales').get().n;
  copia.close();
  if (integridad !== 'ok') throw new Error(`La copia no pasó la verificación: ${integridad}`);
  log(`Copia creada: ${destino} (${materiales} materiales, verificada)`);
  podar(principal);

  for (const dir of extras) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.copyFileSync(destino, path.join(dir, nombre));
      podar(dir);
      log(`Copia adicional guardada en: ${dir}`);
    } catch (e) {
      fallos++;
      log(`No se pudo guardar la copia en "${dir}": ${e.message}`, true);
    }
  }
} catch (e) {
  fallos++;
  log(e.message, true);
}

process.exit(fallos ? 1 : 0);
