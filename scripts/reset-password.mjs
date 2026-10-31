#!/usr/bin/env node
// Cambia la contraseña de un usuario (por si se olvidó).  Detener el sistema no es necesario.
//
//   node scripts/reset-password.mjs encargado "NuevaClave123"
import path from 'node:path';
import { abrirDb } from '../core/db.mjs';
import { hashPassword, validarPassword } from '../core/password.mjs';

const [usuario, nueva] = process.argv.slice(2);
if (!usuario || !nueva) {
  console.error('Uso: node scripts/reset-password.mjs <usuario> "<nueva contraseña>"');
  process.exit(1);
}
const err = validarPassword(nueva);
if (err) {
  console.error(err);
  process.exit(1);
}
const db = abrirDb(path.resolve(process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'inventario.db')));
const u = db.prepare('SELECT id FROM usuarios WHERE usuario = ?').get(usuario);
if (!u) {
  console.error(`No existe el usuario "${usuario}".`);
  process.exit(1);
}
db.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?').run(await hashPassword(nueva), u.id);
db.prepare('DELETE FROM sesiones WHERE usuario_id = ?').run(u.id);
console.log(`✔ Contraseña de "${usuario}" actualizada. Sus sesiones abiertas se cerraron.`);
db.close();
