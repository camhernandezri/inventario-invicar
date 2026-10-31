import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'invicar-'));
process.env.DATABASE_PATH = path.join(dir, 'test.db');

const { db, run, get, all } = await import('../src/lib/db');
const inv = await import('../src/lib/inventario');
const { UserError } = await import('../src/lib/errors');
const ses = await import('../src/lib/sesiones');
const usr = await import('../src/lib/usuarios');
const { hashPassword } = await import('../core/password.mjs');
const { aCsv } = await import('../src/lib/csv');
const { estadoStock } = await import('../src/lib/estado');

let admin = 0;
let consulta = 0;

before(async () => {
  db();
  const h = await hashPassword('clave-segura-1');
  admin = run("INSERT INTO usuarios (usuario,nombre,rol,password_hash,creado_en) VALUES ('encargado','Encargado','ADMIN',?,?)", h, new Date().toISOString()).lastInsertRowid;
  consulta = run("INSERT INTO usuarios (usuario,nombre,rol,password_hash,creado_en) VALUES ('secretaria','Secretaría','CONSULTA',?,?)", h, new Date().toISOString()).lastInsertRowid;
});

const stockDe = (id: number) => get<{ stock: number }>('SELECT stock FROM materiales WHERE id=?', id)!.stock;
const mat = (codigo: string, nombre: string, stock: number, min: number, unidad = 'und', costo = 0) =>
  inv.crearMaterial({ codigo, nombre, categoria: 'Prueba', unidad, stock, stock_minimo: min, costo_unitario: costo }, admin);

test('estado de stock: disponible / bajo / crítico / agotado', () => {
  assert.equal(estadoStock(50, 20).nivel, 'ok');
  assert.equal(estadoStock(20, 20).label, 'Stock bajo');
  assert.equal(estadoStock(10, 20).label, 'Crítico');
  assert.equal(estadoStock(0, 20).label, 'Agotado');
});

test('crear material con stock inicial registra movimiento y rechaza códigos repetidos', () => {
  const id = mat('T-001', 'Lámina de prueba', 10, 4);
  assert.equal(stockDe(id), 10);
  const movs = all<{ motivo: string }>('SELECT motivo FROM movimientos WHERE material_id=?', id);
  assert.equal(movs.length, 1);
  assert.equal(movs[0].motivo, 'Stock inicial');
  assert.throws(() => mat('t-001', 'Otro', 1, 1), (e) => e instanceof UserError && /Ya existe/.test(e.message));
});

test('salida individual descuenta, y nunca deja stock negativo', () => {
  const id = mat('T-002', 'Perfil prueba', 5, 2);
  inv.registrarMovimiento({ materialId: id, tipo: 'SALIDA', cantidad: 3, motivo: 'Taller', referencia: '', usuarioId: admin });
  assert.equal(stockDe(id), 2);
  assert.throws(
    () => inv.registrarMovimiento({ materialId: id, tipo: 'SALIDA', cantidad: 3, motivo: '', referencia: '', usuarioId: admin }),
    (e) => e instanceof UserError && /insuficiente/i.test(e.message),
  );
  assert.equal(stockDe(id), 2);
});

test('entradas y ajustes; el ajuste exige motivo', () => {
  const id = mat('T-003', 'Tornillo prueba', 0, 10);
  inv.registrarMovimiento({ materialId: id, tipo: 'ENTRADA', cantidad: 100, motivo: 'Compra', referencia: 'F-1', usuarioId: admin });
  assert.equal(stockDe(id), 100);
  assert.throws(() => inv.registrarMovimiento({ materialId: id, tipo: 'AJUSTE', cantidad: -2, motivo: '', referencia: '', usuarioId: admin }), UserError);
  inv.registrarMovimiento({ materialId: id, tipo: 'AJUSTE', cantidad: -2, motivo: 'Rotura', referencia: '', usuarioId: admin });
  assert.equal(stockDe(id), 98);
});

test('decimales no acumulan error de punto flotante', () => {
  const id = mat('T-004', 'Cable prueba', 1, 0, 'm');
  for (let i = 0; i < 10; i++) {
    inv.registrarMovimiento({ materialId: id, tipo: 'SALIDA', cantidad: 0.1, motivo: '', referencia: '', usuarioId: admin });
  }
  assert.equal(stockDe(id), 0);
});

test('kit: descuenta todos los materiales y deja un movimiento por material', () => {
  const a = mat('K-A', 'Perfil kit', 26, 30);
  const b = mat('K-B', 'Tornillo kit', 580, 500);
  const kitId = inv.crearKit({ nombre: 'Chasis 1', descripcion: '', items: [{ material_id: a, cantidad: 12 }, { material_id: b, cantidad: 120 }] });
  const r = inv.descontarKit({ kitId, cantidad: 1, referencia: 'OP-1', usuarioId: admin });
  assert.equal(r.ok, true);
  assert.equal(stockDe(a), 14);
  assert.equal(stockDe(b), 460);
  if (r.ok) assert.equal(r.bajos.length, 2);
  const movs = all<{ kit_nombre: string; lote: string }>("SELECT kit_nombre, lote FROM movimientos WHERE referencia='OP-1'");
  assert.equal(movs.length, 2);
  assert.equal(new Set(movs.map((m) => m.lote)).size, 1);
});

test('kit: si falta un material NO se descuenta nada (todo o nada)', () => {
  const a = mat('K-C', 'Perfil kit 2', 26, 30);
  const b = mat('K-D', 'Cable kit 2', 85, 100, 'm');
  const kitId = inv.crearKit({ nombre: 'Chasis 3', descripcion: '', items: [{ material_id: a, cantidad: 12 }, { material_id: b, cantidad: 40 }] });
  const r = inv.descontarKit({ kitId, cantidad: 3, referencia: '', usuarioId: admin });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.faltantes.length, 2);
  assert.equal(stockDe(a), 26);
  assert.equal(stockDe(b), 85);
  assert.equal(all('SELECT 1 FROM movimientos WHERE kit_nombre=?', 'Chasis 3').length, 0);
});

test('kit: una falla a mitad de camino revierte todo', () => {
  const a = mat('K-E', 'Material E', 10, 1);
  const b = mat('K-F', 'Material F', 10, 1);
  const kitId = inv.crearKit({ nombre: 'Kit falla', descripcion: '', items: [{ material_id: a, cantidad: 1 }, { material_id: b, cantidad: 1 }] });
  // Sabotaje: un trigger hace fallar el segundo descuento.
  db().exec(`CREATE TRIGGER sabotaje BEFORE UPDATE ON materiales WHEN NEW.id = ${b} AND NEW.stock < OLD.stock BEGIN SELECT RAISE(ABORT,'falla simulada'); END`);
  assert.throws(() => inv.descontarKit({ kitId, cantidad: 1, referencia: '', usuarioId: admin }), /falla simulada/);
  db().exec('DROP TRIGGER sabotaje');
  assert.equal(stockDe(a), 10);
  assert.equal(stockDe(b), 10);
  assert.equal(all('SELECT 1 FROM movimientos WHERE kit_nombre=?', 'Kit falla').length, 0);
});

test('validación de kits: vacío, repetidos, cantidades inválidas', () => {
  const a = mat('K-G', 'Material G', 5, 1);
  assert.throws(() => inv.crearKit({ nombre: 'Vacío', descripcion: '', items: [] }), UserError);
  assert.throws(() => inv.crearKit({ nombre: 'Rep', descripcion: '', items: [{ material_id: a, cantidad: 1 }, { material_id: a, cantidad: 2 }] }), /repetirse/);
  assert.throws(() => inv.crearKit({ nombre: 'Cero', descripcion: '', items: [{ material_id: a, cantidad: 0 }] }), UserError);
  const k = inv.crearKit({ nombre: 'Dup', descripcion: '', items: [{ material_id: a, cantidad: 1 }] });
  assert.throws(() => inv.crearKit({ nombre: 'dup', descripcion: '', items: [{ material_id: a, cantidad: 1 }] }), /Ya existe/);
  assert.throws(() => inv.descontarKit({ kitId: k, cantidad: 0, referencia: '', usuarioId: admin }), UserError);
  assert.throws(() => inv.descontarKit({ kitId: k, cantidad: 1.5, referencia: '', usuarioId: admin }), UserError);
});

test('no se puede desactivar un material que está en un kit activo', () => {
  const a = mat('K-H', 'Material H', 5, 1);
  const k = inv.crearKit({ nombre: 'Kit con H', descripcion: '', items: [{ material_id: a, cantidad: 1 }] });
  assert.throws(() => inv.cambiarActivoMaterial(a, false), /Kit con H/);
  inv.desactivarKit(k);
  inv.cambiarActivoMaterial(a, false);
  assert.throws(() => inv.registrarMovimiento({ materialId: a, tipo: 'SALIDA', cantidad: 1, motivo: '', referencia: '', usuarioId: admin }), /desactivado/);
});

test('anular un kit devuelve todo el stock y conserva el historial', () => {
  const a = mat('K-I', 'Material I', 20, 1);
  const b = mat('K-J', 'Material J', 20, 1);
  const kitId = inv.crearKit({ nombre: 'Kit anulable', descripcion: '', items: [{ material_id: a, cantidad: 5 }, { material_id: b, cantidad: 7 }] });
  const r = inv.descontarKit({ kitId, cantidad: 2, referencia: 'OP-9', usuarioId: admin });
  assert.ok(r.ok);
  assert.equal(stockDe(a), 10);
  inv.anularLote((r as { lote: string }).lote, 'Error de digitación', admin);
  assert.equal(stockDe(a), 20);
  assert.equal(stockDe(b), 20);
  assert.throws(() => inv.anularLote((r as { lote: string }).lote, '', admin), /ya fue anulado/);
  const n = get<{ n: number }>("SELECT COUNT(*) n FROM movimientos WHERE kit_nombre='Kit anulable'")!.n;
  assert.equal(n, 4); // 2 salidas + 2 anulaciones: nada se borra
});

test('no se puede anular una entrada si ya se consumió ese stock', () => {
  const a = mat('K-K', 'Material K', 0, 1);
  inv.registrarMovimiento({ materialId: a, tipo: 'ENTRADA', cantidad: 5, motivo: 'Compra', referencia: '', usuarioId: admin });
  const lote = get<{ lote: string }>("SELECT lote FROM movimientos WHERE material_id=? AND tipo='ENTRADA'", a)!.lote;
  inv.registrarMovimiento({ materialId: a, tipo: 'SALIDA', cantidad: 4, motivo: '', referencia: '', usuarioId: admin });
  assert.throws(() => inv.anularLote(lote, '', admin), /ya se usó/);
  assert.equal(stockDe(a), 1);
});

test('alertas y filtros (búsqueda sin tildes)', () => {
  const antes = inv.contarAlertas();
  const id = mat('AL-1', 'Lámina de alerta', 3, 10);
  assert.equal(inv.contarAlertas(), antes + 1);
  assert.ok(inv.listarAlertas(100).some((m) => m.id === id));
  const r = inv.listarMateriales({ q: 'LAMINA DE ALERTA' });
  assert.equal(r.total, 1);
  assert.equal(inv.listarMateriales({ q: 'al-1', estado: 'critico' }).total, 1);
  assert.equal(inv.listarMateriales({ q: 'al-1', estado: 'ok' }).total, 0);
  // caracteres especiales de LIKE no rompen la búsqueda
  assert.doesNotThrow(() => inv.listarMateriales({ q: '100%_' }));
});

test('historial: filtros por tipo y texto, paginación y panel', () => {
  const h = inv.listarMovimientos({ tipo: 'SALIDA', q: 'chasis 1' });
  assert.ok(h.total >= 2);
  assert.ok(h.rows.every((m) => m.tipo === 'SALIDA'));
  const p = inv.resumenPanel();
  assert.ok(p.activos > 0 && p.kits > 0 && p.salidasHoy >= 1);
  assert.ok(inv.movimientosRecientes(5).length > 0);
});

test('contraseñas, sesiones y bloqueo de intentos', async () => {
  assert.ok(await usr.autenticar('encargado', 'clave-segura-1'));
  assert.equal(await usr.autenticar('encargado', 'mala'), null);
  assert.equal(await usr.autenticar('noexiste', 'x'), null);

  const { token } = ses.crearSesionDb(admin);
  assert.equal(ses.usuarioPorToken(token)?.rol, 'ADMIN');
  assert.equal(ses.usuarioPorToken('token-falso'), null);
  assert.equal(ses.usuarioPorToken(token, Date.now() + 13 * 3600 * 1000), null); // expirada
  ses.borrarSesionDb(token);
  assert.equal(ses.usuarioPorToken(token), null);

  for (let i = 0; i < 5; i++) ses.registrarFallo('Encargado');
  assert.ok(ses.loginBloqueado('encargado') > 0);
  ses.limpiarFallos('encargado');
  assert.equal(ses.loginBloqueado('encargado'), 0);
});

test('cambiar contraseña y restablecer la del usuario de solo lectura', async () => {
  await assert.rejects(usr.cambiarPassword(admin, 'incorrecta', 'nueva-clave-99'), /actual no es correcta/);
  await assert.rejects(usr.cambiarPassword(admin, 'clave-segura-1', 'corta'), /8 caracteres/);
  await usr.cambiarPassword(admin, 'clave-segura-1', 'nueva-clave-99');
  assert.ok(await usr.autenticar('encargado', 'nueva-clave-99'));
  await usr.restablecerPasswordPorRol('CONSULTA', 'otra-clave-123');
  assert.ok(await usr.autenticar('secretaria', 'otra-clave-123'));
  assert.equal(consulta > 0, true);
});

test('CSV: separador ;, BOM y protección contra fórmulas', () => {
  const csv = aCsv(['a', 'b'], [['x;y', '=1+1'], ['"q"', 5]]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"x;y";\'=1+1'));
  assert.ok(csv.includes('"""q""";5'));
});

test('costos: costo del kit, valor del inventario y migración desde la versión 1', async () => {
  const a = mat('C-001', 'Lámina costo', 10, 1, 'und', 12500);
  const b = mat('C-002', 'Pintura costo', 4, 1, 'gal', 80000.5);
  const c = mat('C-003', 'Sin costo', 3, 1);
  const kitId = inv.crearKit({
    nombre: 'Kit con costo', descripcion: '',
    items: [{ material_id: a, cantidad: 2 }, { material_id: b, cantidad: 0.5 }, { material_id: c, cantidad: 1 }],
  });
  const items = inv.itemsDeKit(kitId);
  // 2 × 12.500 + 0,5 × 80.000,50 + 1 × 0 = 65.000,25
  assert.equal(inv.costoDeKit(items), 65000.25);
  assert.equal(inv.listarKits().find((k) => k.id === kitId)!.costo, 65000.25);
  // El costo se puede cambiar después y el kit lo refleja
  const m = inv.obtenerMaterial(c)!;
  inv.actualizarMaterial(c, { codigo: m.codigo, nombre: m.nombre, categoria: m.categoria, unidad: m.unidad, stock_minimo: m.stock_minimo, costo_unitario: 1000 });
  assert.equal(inv.costoDeKit(inv.itemsDeKit(kitId)), 66000.25);
  const r = inv.resumenPanel();
  assert.ok(r.valorInventario >= 10 * 12500 + 4 * 80000.5 + 3 * 1000);

  // Una base antigua (versión 1, con datos) se migra sin perder nada
  const { DatabaseSync } = await import('node:sqlite');
  const { abrirDb } = await import('../core/db.mjs');
  const ruta = path.join(dir, 'vieja.db');
  const vieja = new DatabaseSync(ruta);
  vieja.exec(`CREATE TABLE materiales (id INTEGER PRIMARY KEY AUTOINCREMENT, codigo TEXT NOT NULL UNIQUE COLLATE NOCASE, nombre TEXT NOT NULL,
    categoria TEXT NOT NULL DEFAULT 'General', unidad TEXT NOT NULL DEFAULT 'und', stock REAL NOT NULL DEFAULT 0 CHECK (stock >= 0),
    stock_minimo REAL NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0), activo INTEGER NOT NULL DEFAULT 1, creado_en TEXT NOT NULL, actualizado_en TEXT NOT NULL);
    INSERT INTO materiales (codigo,nombre,stock,creado_en,actualizado_en) VALUES ('V-1','Viejo',7,'2026-01-01','2026-01-01');
    PRAGMA user_version = 1;`);
  vieja.close();
  const nueva = abrirDb(ruta);
  const fila = nueva.prepare('SELECT stock, costo_unitario FROM materiales WHERE codigo = ?').get('V-1') as { stock: number; costo_unitario: number };
  assert.equal(fila.stock, 7);
  assert.equal(fila.costo_unitario, 0);
  assert.equal((nueva.prepare('PRAGMA user_version').get() as { user_version: number }).user_version, 2);
  nueva.close();
});

test('costos: validación del costo unitario', async () => {
  const { costoUnitario } = await import('../src/lib/forms');
  const f = (v: string) => { const fd = new FormData(); fd.set('costo_unitario', v); return fd; };
  assert.equal(costoUnitario(f('')), 0);
  assert.equal(costoUnitario(f('12500')), 12500);
  assert.equal(costoUnitario(f('12500,5')), 12500.5);
  assert.equal(costoUnitario(f('12.5')), 12.5);
  assert.throws(() => costoUnitario(f('12.500')), (e) => e instanceof UserError && /separador de miles/.test(e.message));
  assert.throws(() => costoUnitario(f('1,250,000')), (e) => e instanceof UserError);
  assert.throws(() => costoUnitario(f('-5')), (e) => e instanceof UserError && /negativo/.test(e.message));
  assert.throws(() => costoUnitario(f('abc')), (e) => e instanceof UserError);
});
