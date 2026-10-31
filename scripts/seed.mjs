#!/usr/bin/env node
// Crea la base de datos, los dos usuarios iniciales y (opcional) datos de ejemplo.
//
//   node scripts/seed.mjs                 → crea usuarios (genera contraseñas si no se indican)
//   node scripts/seed.mjs --demo          → además carga materiales y kits de ejemplo
//
// Variables opcionales: DATABASE_PATH, ADMIN_USER, ADMIN_NOMBRE, ADMIN_PASSWORD,
//                       CONSULTA_USER, CONSULTA_NOMBRE, CONSULTA_PASSWORD
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { abrirDb } from '../core/db.mjs';
import { hashPassword, validarPassword } from '../core/password.mjs';

const ruta = path.resolve(process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'inventario.db'));
const demo = process.argv.includes('--demo');
const db = abrirDb(ruta);
const ahora = () => new Date().toISOString();

function claveAleatoria() {
  const letras = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(randomBytes(12), (b) => letras[b % letras.length]).join('');
}

async function crearUsuario({ usuario, nombre, rol, password }) {
  const existe = db.prepare('SELECT id FROM usuarios WHERE usuario = ?').get(usuario);
  if (existe) {
    console.log(`• El usuario "${usuario}" ya existe: no se modifica.`);
    return existe.id;
  }
  let generada = false;
  if (!password) {
    password = claveAleatoria();
    generada = true;
  }
  const err = validarPassword(password);
  if (err) throw new Error(`${usuario}: ${err}`);
  const r = db
    .prepare('INSERT INTO usuarios (usuario, nombre, rol, password_hash, creado_en) VALUES (?,?,?,?,?)')
    .run(usuario, nombre, rol, await hashPassword(password), ahora());
  console.log(`✔ Usuario creado: ${usuario} (${rol === 'ADMIN' ? 'puede editar' : 'solo lectura'})` + (generada ? `  contraseña: ${password}` : ''));
  return Number(r.lastInsertRowid);
}

const adminId = await crearUsuario({
  usuario: process.env.ADMIN_USER || 'encargado',
  nombre: process.env.ADMIN_NOMBRE || 'Encargado',
  rol: 'ADMIN',
  password: process.env.ADMIN_PASSWORD,
});
await crearUsuario({
  usuario: process.env.CONSULTA_USER || 'secretaria',
  nombre: process.env.CONSULTA_NOMBRE || 'Secretaría',
  rol: 'CONSULTA',
  password: process.env.CONSULTA_PASSWORD,
});

if (demo) {
  const hay = db.prepare('SELECT COUNT(*) AS n FROM materiales').get().n;
  if (hay > 0) {
    console.log('• Ya hay materiales: no se cargan los datos de ejemplo.');
  } else {
    const MAT = [
      ['LAM-CR-18', 'Lámina cold rolled cal. 18', 'Láminas', 'und', 42, 20],
      ['PER-RC-40', 'Perfil rectangular 40×40', 'Perfiles', 'und', 26, 30],
      ['TOR-HEX-38', 'Tornillo hexagonal 3/8"', 'Tornillería', 'und', 580, 500],
      ['VID-TEM-6', 'Vidrio templado 6 mm', 'Vidrios', 'und', 4, 10],
      ['PIN-ANT-GL', 'Pintura anticorrosiva', 'Pintura', 'gal', 24, 12],
      ['REM-POP-316', 'Remache pop 3/16"', 'Tornillería', 'und', 1200, 800],
      ['CAB-AWG-12', 'Cable eléctrico cal. 12', 'Eléctrico', 'm', 85, 100],
      ['ESP-PU-40', 'Espuma de poliuretano', 'Tapicería', 'und', 31, 15],
      ['SOL-E7018', 'Soldadura E7018', 'Soldadura', 'kg', 56, 40],
      ['PIS-AL-AD', 'Piso aluminio antideslizante', 'Pisos', 'und', 14, 8],
      ['DIS-COR-7', 'Disco de corte 7"', 'Abrasivos', 'und', 5, 20],
      ['LIJ-AG-80', 'Lija al agua grano 80', 'Abrasivos', 'und', 22, 25],
    ];
    const ids = {};
    const t = ahora();
    for (const [codigo, nombre, categoria, unidad, stock, minimo] of MAT) {
      const r = db
        .prepare('INSERT INTO materiales (codigo,nombre,categoria,unidad,stock,stock_minimo,activo,creado_en,actualizado_en) VALUES (?,?,?,?,?,?,1,?,?)')
        .run(codigo, nombre, categoria, unidad, stock, minimo, t, t);
      ids[codigo] = Number(r.lastInsertRowid);
      db.prepare(
        `INSERT INTO movimientos (lote,material_id,tipo,cantidad,stock_resultante,motivo,usuario_id,creado_en)
         VALUES (?,?,'ENTRADA',?,?,'Stock inicial',?,?)`,
      ).run(crypto.randomUUID(), ids[codigo], stock, stock, adminId, t);
    }
    const KITS = [
      ['Chasis 1', 'Chasis para bus urbano', [['PER-RC-40', 12], ['LAM-CR-18', 6], ['TOR-HEX-38', 120], ['SOL-E7018', 8], ['PIN-ANT-GL', 3], ['REM-POP-316', 200], ['CAB-AWG-12', 40]]],
      ['Chasis 2', 'Chasis para buseta', [['PER-RC-40', 8], ['LAM-CR-18', 4], ['TOR-HEX-38', 90], ['SOL-E7018', 6], ['PIN-ANT-GL', 2]]],
      ['Piso y escalones', 'Piso antideslizante y escalones', [['PIS-AL-AD', 4], ['TOR-HEX-38', 60], ['REM-POP-316', 100]]],
    ];
    for (const [nombre, desc, items] of KITS) {
      const k = db.prepare('INSERT INTO kits (nombre,descripcion,activo,creado_en) VALUES (?,?,1,?)').run(nombre, desc, t);
      for (const [codigo, cant] of items) {
        db.prepare('INSERT INTO kit_items (kit_id,material_id,cantidad) VALUES (?,?,?)').run(Number(k.lastInsertRowid), ids[codigo], cant);
      }
    }
    console.log(`✔ Datos de ejemplo cargados: ${MAT.length} materiales y ${KITS.length} kits.`);
  }
}

db.close();
console.log(`\nBase de datos: ${ruta}`);
