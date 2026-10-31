import { all, get, run, tx } from './db';
import { UserError } from './errors';
import { plegar } from '../../core/texto.mjs';
import { estadoStock } from './estado';
import { fmtCant, hoyColombia, r2, r3 } from './util';
import type { ItemKit, Kit, KitResumen, Material, Movimiento, TipoMovimiento } from './types';

export const PAGE_SIZE = 25;

const ahora = () => new Date().toISOString();
const nuevoLote = () => crypto.randomUUID();
const likePlegado = (s: string) => '%' + plegar(s).replace(/[\\%_]/g, (m) => '\\' + m) + '%';

const SQL_ALERTA = 'm.stock <= m.stock_minimo';
const SQL_CRITICO = 'm.stock <= m.stock_minimo * 0.5';

// ───────────────────────────── Materiales ─────────────────────────────

export interface FiltroMateriales {
  q?: string;
  categoria?: string;
  estado?: 'todos' | 'alerta' | 'bajo' | 'critico' | 'ok';
  inactivos?: boolean;
  page?: number;
}

function whereMateriales(f: FiltroMateriales) {
  const w: string[] = [];
  const p: (string | number)[] = [];
  if (!f.inactivos) w.push('m.activo = 1');
  if (f.q?.trim()) {
    w.push(`(plegar(m.codigo) LIKE ? ESCAPE '\\' OR plegar(m.nombre) LIKE ? ESCAPE '\\' OR plegar(m.categoria) LIKE ? ESCAPE '\\')`);
    const l = likePlegado(f.q.trim());
    p.push(l, l, l);
  }
  if (f.categoria) {
    w.push('m.categoria = ? COLLATE NOCASE');
    p.push(f.categoria);
  }
  switch (f.estado) {
    case 'alerta': w.push(SQL_ALERTA); break;
    case 'critico': w.push(SQL_CRITICO); break;
    case 'bajo': w.push(`${SQL_ALERTA} AND NOT (${SQL_CRITICO})`); break;
    case 'ok': w.push('m.stock > m.stock_minimo'); break;
  }
  return { where: w.length ? 'WHERE ' + w.join(' AND ') : '', params: p };
}

export function listarMateriales(f: FiltroMateriales) {
  const { where, params } = whereMateriales(f);
  const total = get<{ n: number }>(`SELECT COUNT(*) AS n FROM materiales m ${where}`, ...params)!.n;
  const page = Math.max(1, Math.min(f.page ?? 1, Math.max(1, Math.ceil(total / PAGE_SIZE))));
  const rows = all<Material>(
    `SELECT m.* FROM materiales m ${where} ORDER BY m.nombre COLLATE NOCASE LIMIT ? OFFSET ?`,
    ...params, PAGE_SIZE, (page - 1) * PAGE_SIZE,
  );
  return { rows, total, page, pageSize: PAGE_SIZE };
}

export function exportarMateriales(f: FiltroMateriales) {
  const { where, params } = whereMateriales(f);
  return all<Material>(`SELECT m.* FROM materiales m ${where} ORDER BY m.nombre COLLATE NOCASE`, ...params);
}

export function categorias(): string[] {
  return all<{ categoria: string }>(
    'SELECT DISTINCT categoria FROM materiales ORDER BY categoria COLLATE NOCASE',
  ).map((r) => r.categoria);
}

export function unidadesUsadas(): string[] {
  return all<{ unidad: string }>('SELECT DISTINCT unidad FROM materiales ORDER BY unidad COLLATE NOCASE').map((r) => r.unidad);
}

export function obtenerMaterial(id: number) {
  return get<Material>('SELECT * FROM materiales WHERE id = ?', id);
}

export function materialesActivos() {
  return all<Material>('SELECT * FROM materiales WHERE activo = 1 ORDER BY nombre COLLATE NOCASE');
}

function esDuplicado(e: unknown) {
  return e instanceof Error && /UNIQUE constraint failed/i.test(e.message);
}

export interface DatosMaterial {
  codigo: string;
  nombre: string;
  categoria: string;
  unidad: string;
  stock_minimo: number;
  costo_unitario: number;
}

export function crearMaterial(d: DatosMaterial & { stock: number }, usuarioId: number) {
  return tx(() => {
    const t = ahora();
    let id: number;
    try {
      id = run(
        `INSERT INTO materiales (codigo, nombre, categoria, unidad, stock, stock_minimo, costo_unitario, activo, creado_en, actualizado_en)
         VALUES (?,?,?,?,?,?,?,1,?,?)`,
        d.codigo, d.nombre, d.categoria, d.unidad, d.stock, d.stock_minimo, d.costo_unitario, t, t,
      ).lastInsertRowid;
    } catch (e) {
      if (esDuplicado(e)) throw new UserError(`Ya existe un material con el código ${d.codigo}.`);
      throw e;
    }
    if (d.stock > 0) {
      insertarMov({
        lote: nuevoLote(), material_id: id, tipo: 'ENTRADA', cantidad: d.stock, stock_resultante: d.stock,
        motivo: 'Stock inicial', usuario_id: usuarioId, creado_en: t,
      });
    }
    return id;
  });
}

export function actualizarMaterial(id: number, d: DatosMaterial) {
  return tx(() => {
    try {
      const r = run(
        `UPDATE materiales SET codigo=?, nombre=?, categoria=?, unidad=?, stock_minimo=?, costo_unitario=?, actualizado_en=? WHERE id=?`,
        d.codigo, d.nombre, d.categoria, d.unidad, d.stock_minimo, d.costo_unitario, ahora(), id,
      );
      if (r.changes !== 1) throw new UserError('El material no existe.');
    } catch (e) {
      if (esDuplicado(e)) throw new UserError(`Ya existe un material con el código ${d.codigo}.`);
      throw e;
    }
  });
}

export function cambiarActivoMaterial(id: number, activo: boolean) {
  return tx(() => {
    const m = obtenerMaterial(id);
    if (!m) throw new UserError('El material no existe.');
    if (!activo) {
      const kits = all<{ nombre: string }>(
        `SELECT k.nombre FROM kit_items ki JOIN kits k ON k.id = ki.kit_id
          WHERE ki.material_id = ? AND k.activo = 1 ORDER BY k.nombre`, id,
      );
      if (kits.length) {
        throw new UserError(
          `No se puede desactivar "${m.nombre}" porque está en: ${kits.map((k) => k.nombre).join(', ')}. Quítalo del kit primero.`,
        );
      }
    }
    run('UPDATE materiales SET activo = ?, actualizado_en = ? WHERE id = ?', activo ? 1 : 0, ahora(), id);
  });
}

// ───────────────────────────── Panel / alertas ─────────────────────────────

export function contarAlertas(): number {
  return get<{ n: number }>(`SELECT COUNT(*) AS n FROM materiales m WHERE m.activo = 1 AND ${SQL_ALERTA}`)!.n;
}

export function resumenPanel() {
  const n = (sql: string, ...p: (string | number)[]) => get<{ n: number }>(sql, ...p)!.n;
  return {
    activos: n('SELECT COUNT(*) AS n FROM materiales WHERE activo = 1'),
    bajoMinimo: contarAlertas(),
    criticos: n(`SELECT COUNT(*) AS n FROM materiales m WHERE m.activo = 1 AND ${SQL_CRITICO}`),
    kits: n('SELECT COUNT(*) AS n FROM kits WHERE activo = 1'),
    valorInventario: r2(get<{ v: number | null }>('SELECT SUM(stock * costo_unitario) AS v FROM materiales WHERE activo = 1')!.v ?? 0),
    sinCosto: n('SELECT COUNT(*) AS n FROM materiales WHERE activo = 1 AND costo_unitario = 0'),
    salidasHoy: n(
      `SELECT COUNT(DISTINCT lote) AS n FROM movimientos
        WHERE tipo = 'SALIDA' AND anulado_por IS NULL AND date(creado_en, '-5 hours') = ?`,
      hoyColombia(),
    ),
  };
}

export function listarAlertas(limit = 5) {
  return all<Material>(
    `SELECT m.* FROM materiales m WHERE m.activo = 1 AND ${SQL_ALERTA}
      ORDER BY CASE WHEN m.stock_minimo = 0 THEN 0 ELSE m.stock / m.stock_minimo END ASC, m.nombre COLLATE NOCASE
      LIMIT ?`, limit,
  );
}

export interface MovimientoReciente {
  lote: string;
  tipo: TipoMovimiento;
  kit_nombre: string | null;
  kit_cantidad: number | null;
  creado_en: string;
  material_nombre: string;
  unidad: string;
  cantidad: number;
  usuario_nombre: string;
  n: number;
  motivo: string;
}

export function movimientosRecientes(limit = 5) {
  return all<MovimientoReciente>(
    `SELECT m.lote, m.tipo, m.kit_nombre, m.kit_cantidad, m.creado_en, m.motivo, mat.nombre AS material_nombre,
            mat.unidad, m.cantidad, u.nombre AS usuario_nombre,
            (SELECT COUNT(*) FROM movimientos x WHERE x.lote = m.lote) AS n
       FROM movimientos m
       JOIN materiales mat ON mat.id = m.material_id
       JOIN usuarios u ON u.id = m.usuario_id
      WHERE m.id = (SELECT MIN(id) FROM movimientos x WHERE x.lote = m.lote)
      ORDER BY m.id DESC LIMIT ?`, limit,
  );
}

// ───────────────────────────── Movimientos ─────────────────────────────

interface NuevoMov {
  lote: string;
  material_id: number;
  tipo: TipoMovimiento;
  cantidad: number;
  stock_resultante: number;
  motivo?: string;
  referencia?: string;
  kit_id?: number | null;
  kit_nombre?: string | null;
  kit_cantidad?: number | null;
  usuario_id: number;
  revierte_lote?: string | null;
  creado_en: string;
}

function insertarMov(m: NuevoMov) {
  run(
    `INSERT INTO movimientos (lote, material_id, tipo, cantidad, stock_resultante, motivo, referencia,
                              kit_id, kit_nombre, kit_cantidad, usuario_id, revierte_lote, creado_en)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    m.lote, m.material_id, m.tipo, m.cantidad, m.stock_resultante, m.motivo ?? '', m.referencia ?? '',
    m.kit_id ?? null, m.kit_nombre ?? null, m.kit_cantidad ?? null, m.usuario_id, m.revierte_lote ?? null, m.creado_en,
  );
}

export function registrarMovimiento(i: {
  materialId: number;
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
  cantidad: number;
  motivo: string;
  referencia: string;
  usuarioId: number;
}) {
  if (!Number.isFinite(i.cantidad) || i.cantidad === 0) throw new UserError('La cantidad no puede ser cero.');
  if (i.tipo !== 'AJUSTE' && i.cantidad < 0) throw new UserError('La cantidad debe ser mayor que cero.');
  if (i.tipo === 'AJUSTE' && !i.motivo.trim()) throw new UserError('Un ajuste necesita un motivo.');

  return tx(() => {
    const m = obtenerMaterial(i.materialId);
    if (!m) throw new UserError('El material no existe.');
    if (!m.activo) throw new UserError(`"${m.nombre}" está desactivado.`);
    const delta = i.tipo === 'SALIDA' ? -i.cantidad : i.cantidad;
    const nuevo = r3(m.stock + delta);
    if (nuevo < 0) {
      throw new UserError(
        `Stock insuficiente de "${m.nombre}": hay ${fmtCant(m.stock, m.unidad)} y se piden ${fmtCant(-delta, m.unidad)}.`,
      );
    }
    const t = ahora();
    run('UPDATE materiales SET stock = ?, actualizado_en = ? WHERE id = ?', nuevo, t, m.id);
    const lote = nuevoLote();
    insertarMov({
      lote, material_id: m.id, tipo: i.tipo, cantidad: delta, stock_resultante: nuevo,
      motivo: i.motivo, referencia: i.referencia, usuario_id: i.usuarioId, creado_en: t,
    });
    return {
      lote,
      material: m.nombre,
      unidad: m.unidad,
      stock: nuevo,
      bajoMinimo: nuevo <= m.stock_minimo,
    };
  });
}

/** Deshace una operación completa (un movimiento o todos los de un kit) sin borrar historial. */
export function anularLote(lote: string, motivo: string, usuarioId: number) {
  return tx(() => {
    const originales = all<{
      id: number; material_id: number; tipo: TipoMovimiento; cantidad: number; kit_id: number | null;
      kit_nombre: string | null; kit_cantidad: number | null; referencia: string;
    }>(
      `SELECT id, material_id, tipo, cantidad, kit_id, kit_nombre, kit_cantidad, referencia
         FROM movimientos
        WHERE lote = ? AND tipo IN ('ENTRADA','SALIDA','AJUSTE') AND anulado_por IS NULL ORDER BY id`, lote,
    );
    if (!originales.length) throw new UserError('Este movimiento no existe o ya fue anulado.');

    const loteAnul = nuevoLote();
    const t = ahora();
    for (const o of originales) {
      const m = obtenerMaterial(o.material_id)!;
      const nuevo = r3(m.stock - o.cantidad);
      if (nuevo < 0) {
        throw new UserError(
          `No se puede anular: ya se usó parte del stock de "${m.nombre}" (hay ${fmtCant(m.stock, m.unidad)}).`,
        );
      }
      run('UPDATE materiales SET stock = ?, actualizado_en = ? WHERE id = ?', nuevo, t, m.id);
      insertarMov({
        lote: loteAnul, material_id: m.id, tipo: 'ANULACION', cantidad: -o.cantidad, stock_resultante: nuevo,
        motivo: `Anulación: ${motivo || 'sin motivo'}`, referencia: o.referencia, kit_id: o.kit_id,
        kit_nombre: o.kit_nombre, kit_cantidad: o.kit_cantidad, usuario_id: usuarioId, revierte_lote: lote, creado_en: t,
      });
    }
    run('UPDATE movimientos SET anulado_por = ? WHERE lote = ? AND anulado_por IS NULL', loteAnul, lote);
    return loteAnul;
  });
}

export interface FiltroMovimientos {
  q?: string;
  tipo?: string;
  usuarioId?: number;
  desde?: string;
  hasta?: string;
  page?: number;
}

function whereMovimientos(f: FiltroMovimientos) {
  const w: string[] = [];
  const p: (string | number)[] = [];
  if (f.q?.trim()) {
    const l = likePlegado(f.q.trim());
    w.push(`(plegar(mat.nombre) LIKE ? ESCAPE '\\' OR plegar(mat.codigo) LIKE ? ESCAPE '\\'
          OR plegar(IFNULL(m.kit_nombre,'')) LIKE ? ESCAPE '\\' OR plegar(m.referencia) LIKE ? ESCAPE '\\'
          OR plegar(m.motivo) LIKE ? ESCAPE '\\')`);
    p.push(l, l, l, l, l);
  }
  if (f.tipo && ['ENTRADA', 'SALIDA', 'AJUSTE', 'ANULACION'].includes(f.tipo)) {
    w.push('m.tipo = ?');
    p.push(f.tipo);
  }
  if (f.usuarioId) {
    w.push('m.usuario_id = ?');
    p.push(f.usuarioId);
  }
  if (f.desde) {
    w.push("date(m.creado_en, '-5 hours') >= ?");
    p.push(f.desde);
  }
  if (f.hasta) {
    w.push("date(m.creado_en, '-5 hours') <= ?");
    p.push(f.hasta);
  }
  return { where: w.length ? 'WHERE ' + w.join(' AND ') : '', params: p };
}

const SELECT_MOV = `
  SELECT m.id, m.lote, m.creado_en, m.tipo, mat.codigo AS material_codigo, mat.nombre AS material_nombre,
         mat.unidad, m.cantidad, m.stock_resultante, m.motivo, m.referencia, m.kit_nombre, m.kit_cantidad,
         u.nombre AS usuario_nombre, CASE WHEN m.anulado_por IS NULL THEN 0 ELSE 1 END AS anulado,
         m.revierte_lote,
         CASE WHEN m.id = (SELECT MIN(id) FROM movimientos x WHERE x.lote = m.lote) THEN 1 ELSE 0 END AS es_primero,
         (SELECT COUNT(*) FROM movimientos x WHERE x.lote = m.lote) AS n_lote
    FROM movimientos m
    JOIN materiales mat ON mat.id = m.material_id
    JOIN usuarios u ON u.id = m.usuario_id`;

export function listarMovimientos(f: FiltroMovimientos) {
  const { where, params } = whereMovimientos(f);
  const total = get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM movimientos m JOIN materiales mat ON mat.id = m.material_id ${where}`, ...params,
  )!.n;
  const page = Math.max(1, Math.min(f.page ?? 1, Math.max(1, Math.ceil(total / PAGE_SIZE))));
  const rows = all<Movimiento>(
    `${SELECT_MOV} ${where} ORDER BY m.id DESC LIMIT ? OFFSET ?`, ...params, PAGE_SIZE, (page - 1) * PAGE_SIZE,
  );
  return { rows, total, page, pageSize: PAGE_SIZE };
}

export function exportarMovimientos(f: FiltroMovimientos) {
  const { where, params } = whereMovimientos(f);
  return all<Movimiento>(`${SELECT_MOV} ${where} ORDER BY m.id DESC LIMIT 50000`, ...params);
}

// ───────────────────────────── Kits ─────────────────────────────

export function listarKits(): KitResumen[] {
  return all<KitResumen>(
    `SELECT k.*, (SELECT COUNT(*) FROM kit_items ki WHERE ki.kit_id = k.id) AS n_items,
            (SELECT ROUND(COALESCE(SUM(ki.cantidad * m.costo_unitario), 0), 2)
               FROM kit_items ki JOIN materiales m ON m.id = ki.material_id WHERE ki.kit_id = k.id) AS costo
       FROM kits k WHERE k.activo = 1 ORDER BY k.nombre COLLATE NOCASE`,
  );
}

export function itemsDeKit(kitId: number): ItemKit[] {
  return all<ItemKit>(
    `SELECT m.id AS material_id, m.codigo, m.nombre, m.unidad, ki.cantidad, m.stock, m.stock_minimo, m.costo_unitario, m.activo
       FROM kit_items ki JOIN materiales m ON m.id = ki.material_id
      WHERE ki.kit_id = ? ORDER BY ki.id`, kitId,
  );
}

export function obtenerKit(id: number) {
  const kit = get<Kit>('SELECT * FROM kits WHERE id = ? AND activo = 1', id);
  return kit ? { kit, items: itemsDeKit(id) } : undefined;
}

export function kitsConItems() {
  return listarKits().map((k) => ({ kit: k, items: itemsDeKit(k.id) }));
}

/** Costo de un kit: suma de cantidad × costo unitario de cada material. */
export function costoDeKit(items: { cantidad: number; costo_unitario: number }[]): number {
  return r2(items.reduce((s, i) => s + i.cantidad * i.costo_unitario, 0));
}

/** Cuántos kits completos se pueden armar con el stock actual. */
export function kitsPosibles(items: { cantidad: number; stock: number }[]): number {
  if (!items.length) return 0;
  return Math.min(...items.map((i) => Math.floor((i.stock + 1e-9) / i.cantidad)));
}

export interface DatosKit {
  nombre: string;
  descripcion: string;
  items: { material_id: number; cantidad: number }[];
}

function validarKit(d: DatosKit) {
  if (!d.items.length) throw new UserError('El kit necesita al menos un material.');
  const vistos = new Set<number>();
  for (const it of d.items) {
    if (!(it.cantidad > 0)) throw new UserError('Todas las cantidades del kit deben ser mayores que cero.');
    if (vistos.has(it.material_id)) throw new UserError('Un material no puede repetirse dentro del mismo kit.');
    vistos.add(it.material_id);
    const m = obtenerMaterial(it.material_id);
    if (!m || !m.activo) throw new UserError('El kit incluye un material que no existe o está desactivado.');
  }
}

function guardarItems(kitId: number, items: DatosKit['items']) {
  run('DELETE FROM kit_items WHERE kit_id = ?', kitId);
  for (const it of items) {
    run('INSERT INTO kit_items (kit_id, material_id, cantidad) VALUES (?,?,?)', kitId, it.material_id, it.cantidad);
  }
}

export function crearKit(d: DatosKit) {
  return tx(() => {
    validarKit(d);
    try {
      const id = run('INSERT INTO kits (nombre, descripcion, activo, creado_en) VALUES (?,?,1,?)', d.nombre, d.descripcion, ahora()).lastInsertRowid;
      guardarItems(id, d.items);
      return id;
    } catch (e) {
      if (esDuplicado(e)) throw new UserError(`Ya existe un kit llamado "${d.nombre}".`);
      throw e;
    }
  });
}

export function actualizarKit(id: number, d: DatosKit) {
  return tx(() => {
    validarKit(d);
    try {
      const r = run('UPDATE kits SET nombre = ?, descripcion = ? WHERE id = ? AND activo = 1', d.nombre, d.descripcion, id);
      if (r.changes !== 1) throw new UserError('El kit no existe.');
    } catch (e) {
      if (esDuplicado(e)) throw new UserError(`Ya existe un kit llamado "${d.nombre}".`);
      throw e;
    }
    guardarItems(id, d.items);
  });
}

/** Los kits no se borran (el historial los referencia): se desactivan. */
export function desactivarKit(id: number) {
  const r = run('UPDATE kits SET activo = 0 WHERE id = ?', id);
  if (r.changes !== 1) throw new UserError('El kit no existe.');
}

export type ResultadoKit =
  | { ok: true; lote: string; bajos: { nombre: string; stock: number; minimo: number; unidad: string }[] }
  | { ok: false; faltantes: { nombre: string; unidad: string; necesita: number; hay: number }[] };

/**
 * Descuenta todos los materiales de un kit en UNA sola transacción:
 * si algún material no alcanza, no se descuenta nada.
 */
export function descontarKit(i: { kitId: number; cantidad: number; referencia: string; usuarioId: number }): ResultadoKit {
  if (!Number.isInteger(i.cantidad) || i.cantidad < 1 || i.cantidad > 999) {
    throw new UserError('La cantidad de kits debe ser un número entero entre 1 y 999.');
  }
  return tx(() => {
    const kit = get<Kit>('SELECT * FROM kits WHERE id = ? AND activo = 1', i.kitId);
    if (!kit) throw new UserError('El kit no existe o está desactivado.');
    const items = itemsDeKit(kit.id);
    if (!items.length) throw new UserError('El kit no tiene materiales.');
    const inactivos = items.filter((x) => !x.activo);
    if (inactivos.length) {
      throw new UserError(`El kit incluye materiales desactivados: ${inactivos.map((x) => x.nombre).join(', ')}.`);
    }

    const faltantes = items
      .map((it) => ({ it, necesita: r3(it.cantidad * i.cantidad) }))
      .filter(({ it, necesita }) => it.stock < necesita)
      .map(({ it, necesita }) => ({ nombre: it.nombre, unidad: it.unidad, necesita, hay: it.stock }));
    if (faltantes.length) return { ok: false as const, faltantes };

    const lote = nuevoLote();
    const t = ahora();
    const bajos: { nombre: string; stock: number; minimo: number; unidad: string }[] = [];
    for (const it of items) {
      const necesita = r3(it.cantidad * i.cantidad);
      const nuevo = r3(it.stock - necesita);
      const r = run(
        'UPDATE materiales SET stock = ?, actualizado_en = ? WHERE id = ? AND stock >= ?',
        nuevo, t, it.material_id, necesita,
      );
      if (r.changes !== 1) throw new UserError(`No se pudo descontar "${it.nombre}". Intenta de nuevo.`);
      insertarMov({
        lote, material_id: it.material_id, tipo: 'SALIDA', cantidad: -necesita, stock_resultante: nuevo,
        motivo: `Kit ${kit.nombre}`, referencia: i.referencia, kit_id: kit.id, kit_nombre: kit.nombre,
        kit_cantidad: i.cantidad, usuario_id: i.usuarioId, creado_en: t,
      });
      if (estadoStock(nuevo, it.stock_minimo).nivel !== 'ok') {
        bajos.push({ nombre: it.nombre, stock: nuevo, minimo: it.stock_minimo, unidad: it.unidad });
      }
    }
    return { ok: true as const, lote, bajos };
  });
}
