#!/usr/bin/env node
// Restaura una copia de seguridad.  IMPORTANTE: detén el sistema antes (detener.bat).
//
//   node scripts/restaurar.mjs C:\Invicar\Inventario\backups\inventario-20261009-103000.db
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from '../core/db.mjs';

const archivo = process.argv[2];
const ruta = path.resolve(process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'inventario.db'));

if (!archivo || !fs.existsSync(archivo)) {
  console.error('Uso: node scripts/restaurar.mjs <archivo-de-copia.db>');
  process.exit(1);
}

let ok, n;
try {
  const copia = new DatabaseSync(archivo);
  ok = copia.prepare('PRAGMA integrity_check').get().integrity_check;
  n = copia.prepare('SELECT COUNT(*) AS n FROM materiales').get().n;
  copia.close();
} catch (e) {
  console.error('Ese archivo no es una copia válida del sistema (' + e.message + '). No se cambió nada.');
  process.exit(1);
}
if (ok !== 'ok') {
  console.error('La copia está dañada: ' + ok + '. No se cambió nada.');
  process.exit(1);
}

fs.mkdirSync(path.dirname(ruta), { recursive: true });
if (fs.existsSync(ruta)) {
  const respaldo = `${ruta}.antes-de-restaurar-${Date.now()}`;
  fs.copyFileSync(ruta, respaldo);
  console.log('Se guardó la base actual en: ' + respaldo);
}
for (const ext of ['-wal', '-shm']) fs.rmSync(ruta + ext, { force: true });
fs.copyFileSync(archivo, ruta);
console.log(`✔ Restaurado (${n} materiales). Ahora inicia el sistema de nuevo (iniciar.bat).`);
