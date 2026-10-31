import { createHash, randomBytes } from 'node:crypto';
import { get, run } from './db';
import type { Usuario } from './types';

export const DURACION_SESION_MS = 12 * 60 * 60 * 1000;

const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');

/** Crea una sesión y devuelve el token (solo se guarda su hash). */
export function crearSesionDb(usuarioId: number, ahora = Date.now()) {
  const token = randomBytes(32).toString('base64url');
  const expira = new Date(ahora + DURACION_SESION_MS);
  run('DELETE FROM sesiones WHERE expira_en < ?', new Date(ahora).toISOString());
  run(
    'INSERT INTO sesiones (id, usuario_id, expira_en, creado_en) VALUES (?,?,?,?)',
    hashToken(token), usuarioId, expira.toISOString(), new Date(ahora).toISOString(),
  );
  return { token, expira };
}

export function usuarioPorToken(token: string, ahora = Date.now()): Usuario | null {
  const u = get<Usuario>(
    `SELECT u.id, u.usuario, u.nombre, u.rol
       FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id
      WHERE s.id = ? AND s.expira_en > ? AND u.activo = 1`,
    hashToken(token), new Date(ahora).toISOString(),
  );
  return u ?? null;
}

export function borrarSesionDb(token: string) {
  run('DELETE FROM sesiones WHERE id = ?', hashToken(token));
}

// --- Bloqueo básico contra adivinar contraseñas (en memoria) ---
const MAX_FALLOS = 5;
const VENTANA_MS = 10 * 60 * 1000;
const fallos = new Map<string, { n: number; desde: number; hasta?: number }>();

export function loginBloqueado(usuario: string, ahora = Date.now()): number {
  const f = fallos.get(usuario.toLowerCase());
  if (f?.hasta && f.hasta > ahora) return Math.ceil((f.hasta - ahora) / 60000);
  return 0;
}

export function registrarFallo(usuario: string, ahora = Date.now()) {
  const k = usuario.toLowerCase();
  const f = fallos.get(k);
  if (!f || ahora - f.desde > VENTANA_MS) {
    fallos.set(k, { n: 1, desde: ahora });
    return;
  }
  f.n += 1;
  if (f.n >= MAX_FALLOS) f.hasta = ahora + VENTANA_MS;
}

export function limpiarFallos(usuario: string) {
  fallos.delete(usuario.toLowerCase());
}
