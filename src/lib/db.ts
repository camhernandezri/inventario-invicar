import path from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { abrirDb } from '../../core/db.mjs';

const g = globalThis as unknown as { __invicarDb?: DatabaseSync; __invicarDbRuta?: string };

export function rutaDb(): string {
  return path.resolve(process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'inventario.db'));
}

/** Conexión única y perezosa (no se abre durante `next build`). */
export function db(): DatabaseSync {
  const ruta = rutaDb();
  if (!g.__invicarDb || g.__invicarDbRuta !== ruta) {
    g.__invicarDb?.close();
    g.__invicarDb = abrirDb(ruta);
    g.__invicarDbRuta = ruta;
  }
  return g.__invicarDb;
}

export type Param = string | number | null;

// Las filas de node:sqlite tienen prototipo nulo; las copiamos a objetos normales
// para poder pasarlas a componentes de cliente de React.
export function all<T>(sql: string, ...params: Param[]): T[] {
  return db().prepare(sql).all(...params).map((r) => ({ ...r })) as T[];
}

export function get<T>(sql: string, ...params: Param[]): T | undefined {
  const fila = db().prepare(sql).get(...params);
  return fila ? ({ ...fila } as T) : undefined;
}

export function run(sql: string, ...params: Param[]) {
  const r = db().prepare(sql).run(...params);
  return { changes: Number(r.changes), lastInsertRowid: Number(r.lastInsertRowid) };
}

/** Transacción de escritura: todo se guarda o nada se guarda. */
export function tx<T>(fn: () => T): T {
  const d = db();
  d.exec('BEGIN IMMEDIATE');
  try {
    const r = fn();
    d.exec('COMMIT');
    return r;
  } catch (e) {
    try {
      d.exec('ROLLBACK');
    } catch {
      /* ya revertida */
    }
    throw e;
  }
}
