// Esquema de la base de datos. Lo usan la app, el seed y los scripts de respaldo.
// Para cambiar el esquema en el futuro: agrega un bloque `if (v < N)` al final de migrar().

const SCHEMA_V1 = `
CREATE TABLE usuarios (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  nombre        TEXT    NOT NULL,
  rol           TEXT    NOT NULL CHECK (rol IN ('ADMIN','CONSULTA')),
  password_hash TEXT    NOT NULL,
  activo        INTEGER NOT NULL DEFAULT 1,
  creado_en     TEXT    NOT NULL
);

CREATE TABLE sesiones (
  id         TEXT    PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  expira_en  TEXT    NOT NULL,
  creado_en  TEXT    NOT NULL
);
CREATE INDEX idx_sesiones_usuario ON sesiones(usuario_id);

CREATE TABLE materiales (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  nombre         TEXT    NOT NULL,
  categoria      TEXT    NOT NULL DEFAULT 'General',
  unidad         TEXT    NOT NULL DEFAULT 'und',
  stock          REAL    NOT NULL DEFAULT 0 CHECK (stock >= 0),
  stock_minimo   REAL    NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
  activo         INTEGER NOT NULL DEFAULT 1,
  creado_en      TEXT    NOT NULL,
  actualizado_en TEXT    NOT NULL
);

CREATE TABLE kits (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  descripcion TEXT    NOT NULL DEFAULT '',
  activo      INTEGER NOT NULL DEFAULT 1,
  creado_en   TEXT    NOT NULL
);

CREATE TABLE kit_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  kit_id      INTEGER NOT NULL REFERENCES kits(id) ON DELETE CASCADE,
  material_id INTEGER NOT NULL REFERENCES materiales(id),
  cantidad    REAL    NOT NULL CHECK (cantidad > 0),
  UNIQUE (kit_id, material_id)
);

-- Historial (kárdex). 'cantidad' lleva signo: positivo suma, negativo resta.
-- Todos los movimientos de una misma operación (ej. un kit) comparten 'lote'.
CREATE TABLE movimientos (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  lote             TEXT    NOT NULL,
  material_id      INTEGER NOT NULL REFERENCES materiales(id),
  tipo             TEXT    NOT NULL CHECK (tipo IN ('ENTRADA','SALIDA','AJUSTE','ANULACION')),
  cantidad         REAL    NOT NULL,
  stock_resultante REAL    NOT NULL,
  motivo           TEXT    NOT NULL DEFAULT '',
  referencia       TEXT    NOT NULL DEFAULT '',
  kit_id           INTEGER REFERENCES kits(id),
  kit_nombre       TEXT,
  kit_cantidad     REAL,
  usuario_id       INTEGER NOT NULL REFERENCES usuarios(id),
  anulado_por      TEXT,
  revierte_lote    TEXT,
  creado_en        TEXT    NOT NULL
);
CREATE INDEX idx_mov_material ON movimientos(material_id, creado_en);
CREATE INDEX idx_mov_fecha    ON movimientos(creado_en);
CREATE INDEX idx_mov_lote     ON movimientos(lote);
`;

export const VERSION_ACTUAL = 2;

export function migrar(db) {
  const { user_version: v } = db.prepare('PRAGMA user_version').get();
  if (v < 1) {
    db.exec('BEGIN');
    try {
      db.exec(SCHEMA_V1);
      db.exec('PRAGMA user_version = 1');
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
  // v2: costo unitario del material (en pesos). Los materiales existentes quedan en 0
  // hasta que se les asigne un costo; no se toca ningún otro dato.
  if (v < 2) {
    db.exec('BEGIN');
    try {
      db.exec('ALTER TABLE materiales ADD COLUMN costo_unitario REAL NOT NULL DEFAULT 0 CHECK (costo_unitario >= 0)');
      db.exec('PRAGMA user_version = 2');
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
}
