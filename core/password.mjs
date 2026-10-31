import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);
const N = 16384, R = 8, P = 1, LARGO = 64;

/** Guarda contraseñas con scrypt (incluido en Node, sin dependencias nativas). */
export async function hashPassword(password) {
  const sal = randomBytes(16);
  const hash = await scrypt(password, sal, LARGO, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${sal.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifyPassword(password, guardado) {
  try {
    const [alg, n, r, p, sal, hash] = String(guardado).split('$');
    if (alg !== 'scrypt') return false;
    const esperado = Buffer.from(hash, 'base64');
    const obtenido = await scrypt(password, Buffer.from(sal, 'base64'), esperado.length, {
      N: Number(n), r: Number(r), p: Number(p),
    });
    return obtenido.length === esperado.length && timingSafeEqual(obtenido, esperado);
  } catch {
    return false;
  }
}

export function validarPassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres.';
  }
  return null;
}
