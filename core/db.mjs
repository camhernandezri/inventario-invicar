import fs from 'node:fs';
import path from 'node:path';
import { migrar } from './migraciones.mjs';
import { plegar } from './texto.mjs';

// node:sqlite viene incluido en Node >= 22.13 (no hay que instalar nada extra).
const sqlite = process.getBuiltinModule?.('node:sqlite');
if (!sqlite) {
  throw new Error(
    `Este sistema necesita Node.js 22.13 o superior y tienes ${process.version}. ` +
      'Instala Node.js LTS desde https://nodejs.org y vuelve a intentarlo.',
  );
}
const { DatabaseSync } = sqlite;

/** Abre (y crea/migra si hace falta) la base de datos del sistema. */
export function abrirDb(ruta) {
  fs.mkdirSync(path.dirname(ruta), { recursive: true });
  const db = new DatabaseSync(ruta);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    PRAGMA synchronous = FULL;
  `);
  // Función SQL para búsquedas sin tildes ni mayúsculas.
  db.function('plegar', { deterministic: true }, (s) => plegar(s));
  migrar(db);
  return db;
}

export { DatabaseSync };
