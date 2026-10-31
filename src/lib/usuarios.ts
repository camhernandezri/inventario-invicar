import { hashPassword, validarPassword, verifyPassword } from '../../core/password.mjs';
import { all, get, run } from './db';
import { UserError } from './errors';
import type { Rol, Usuario } from './types';

export function listarUsuarios() {
  return all<Usuario>('SELECT id, usuario, nombre, rol FROM usuarios WHERE activo = 1 ORDER BY nombre COLLATE NOCASE');
}

export async function autenticar(usuario: string, password: string): Promise<Usuario | null> {
  const fila = get<Usuario & { password_hash: string }>(
    'SELECT id, usuario, nombre, rol, password_hash FROM usuarios WHERE usuario = ? AND activo = 1', usuario,
  );
  // Siempre se calcula un hash para que el tiempo de respuesta no revele si el usuario existe.
  const ok = await verifyPassword(password, fila?.password_hash ?? 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA');
  if (!fila || !ok) return null;
  return { id: fila.id, usuario: fila.usuario, nombre: fila.nombre, rol: fila.rol };
}

export async function cambiarPassword(usuarioId: number, actual: string, nueva: string) {
  const err = validarPassword(nueva);
  if (err) throw new UserError(err);
  const fila = get<{ password_hash: string }>('SELECT password_hash FROM usuarios WHERE id = ?', usuarioId);
  if (!fila || !(await verifyPassword(actual, fila.password_hash))) {
    throw new UserError('La contraseña actual no es correcta.');
  }
  run('UPDATE usuarios SET password_hash = ? WHERE id = ?', await hashPassword(nueva), usuarioId);
}

/** El encargado define una nueva contraseña para el usuario de solo lectura. */
export async function restablecerPasswordPorRol(rol: Rol, nueva: string) {
  const err = validarPassword(nueva);
  if (err) throw new UserError(err);
  const u = get<{ id: number }>("SELECT id FROM usuarios WHERE rol = ? AND activo = 1 ORDER BY id LIMIT 1", rol);
  if (!u) throw new UserError('No existe ese usuario.');
  run('UPDATE usuarios SET password_hash = ? WHERE id = ?', await hashPassword(nueva), u.id);
  run('DELETE FROM sesiones WHERE usuario_id = ?', u.id);
}
