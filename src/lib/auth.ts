import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { AuthError } from './errors';
import { borrarSesionDb, crearSesionDb, usuarioPorToken } from './sesiones';
import type { Usuario } from './types';

export const COOKIE = 'inv_session';

export async function crearSesion(usuarioId: number) {
  const { token, expira } = crearSesionDb(usuarioId);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    // El sistema corre en la red local por HTTP; ponlo en "true" solo si algún día se sirve con HTTPS.
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
    expires: expira,
  });
}

export async function cerrarSesion() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) borrarSesionDb(token);
  jar.delete(COOKIE);
}

export const usuarioActual = cache(async (): Promise<Usuario | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  return token ? usuarioPorToken(token) : null;
});

/** Para páginas: sin sesión → pantalla de ingreso. */
export async function requerirUsuario(): Promise<Usuario> {
  const u = await usuarioActual();
  if (!u) redirect('/login');
  return u;
}

/** Para páginas solo del encargado: la secretaria vuelve al panel. */
export async function requerirAdminPagina(): Promise<Usuario> {
  const u = await requerirUsuario();
  if (u.rol !== 'ADMIN') redirect('/');
  return u;
}

/** Para acciones que modifican datos: se valida SIEMPRE en el servidor. */
export async function requerirAdminAccion(): Promise<Usuario> {
  const u = await usuarioActual();
  if (!u) throw new AuthError('Tu sesión expiró. Vuelve a iniciar sesión.');
  if (u.rol !== 'ADMIN') throw new AuthError();
  return u;
}

export async function requerirUsuarioAccion(): Promise<Usuario> {
  const u = await usuarioActual();
  if (!u) throw new AuthError('Tu sesión expiró. Vuelve a iniciar sesión.');
  return u;
}
