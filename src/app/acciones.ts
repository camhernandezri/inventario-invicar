'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  cerrarSesion, crearSesion, requerirAdminAccion, requerirUsuarioAccion,
} from '@/lib/auth';
import { AuthError, UserError } from '@/lib/errors';
import { aNumero, costoUnitario, numero, texto } from '@/lib/forms';
import {
  actualizarKit, actualizarMaterial, anularLote, cambiarActivoMaterial, crearKit, crearMaterial,
  descontarKit, desactivarKit, registrarMovimiento, type ResultadoKit,
} from '@/lib/inventario';
import { limpiarFallos, loginBloqueado, registrarFallo } from '@/lib/sesiones';
import { autenticar, cambiarPassword, restablecerPasswordPorRol } from '@/lib/usuarios';
import type { Resultado } from '@/lib/types';

async function seguro(fn: () => Promise<Resultado | void>): Promise<Resultado> {
  try {
    return (await fn()) ?? { ok: true };
  } catch (e) {
    if (e instanceof UserError || e instanceof AuthError) return { error: e.message };
    console.error('[acciones] error inesperado:', e);
    return { error: 'Ocurrió un error inesperado. Intenta de nuevo y, si se repite, avisa al responsable del sistema.' };
  }
}

const refrescar = () => revalidatePath('/', 'layout');

// ───────── Sesión ─────────

export async function loginAction(fd: FormData): Promise<Resultado> {
  return seguro(async () => {
    const usuario = texto(fd, 'usuario', { nombre: 'El usuario', requerido: true, max: 60 });
    const password = String(fd.get('password') ?? '');
    const espera = loginBloqueado(usuario);
    if (espera) throw new UserError(`Demasiados intentos fallidos. Espera ${espera} min e inténtalo de nuevo.`);
    const u = await autenticar(usuario, password);
    if (!u) {
      registrarFallo(usuario);
      throw new UserError('Usuario o contraseña incorrectos.');
    }
    limpiarFallos(usuario);
    await crearSesion(u.id);
    return { ok: true, redirectTo: '/' };
  });
}

export async function logoutAction() {
  await cerrarSesion();
  redirect('/login');
}

// ───────── Materiales ─────────

export async function guardarMaterialAction(fd: FormData): Promise<Resultado> {
  return seguro(async () => {
    const user = await requerirAdminAccion();
    const datos = {
      codigo: texto(fd, 'codigo', { nombre: 'El código', requerido: true, max: 40 }),
      nombre: texto(fd, 'nombre', { nombre: 'El nombre', requerido: true, max: 120 }),
      categoria: texto(fd, 'categoria', { nombre: 'La categoría', max: 60 }) || 'General',
      unidad: texto(fd, 'unidad', { nombre: 'La unidad', requerido: true, max: 20 }),
      stock_minimo: numero(fd, 'stock_minimo', { nombre: 'El stock mínimo', min: 0, max: 1e9 }),
      costo_unitario: costoUnitario(fd),
    };
    const id = Number(fd.get('id') || 0);
    if (id) {
      actualizarMaterial(id, datos);
    } else {
      const stock = numero(fd, 'stock', { nombre: 'El stock inicial', min: 0, max: 1e9 });
      crearMaterial({ ...datos, stock }, user.id);
    }
    refrescar();
    return { ok: true, redirectTo: '/materiales' };
  });
}

export async function cambiarActivoMaterialAction(id: number, activo: boolean): Promise<Resultado> {
  return seguro(async () => {
    await requerirAdminAccion();
    cambiarActivoMaterial(id, activo);
    refrescar();
  });
}

// ───────── Movimientos ─────────

export async function registrarMovimientoAction(i: {
  materialId: number | null;
  tipo: string;
  cantidad: string;
  motivo: string;
  referencia: string;
}): Promise<Resultado & { bajoMinimo?: boolean }> {
  try {
    const user = await requerirAdminAccion();
    if (!i.materialId) throw new UserError('Elige un material de la lista.');
    if (!['ENTRADA', 'SALIDA', 'AJUSTE'].includes(i.tipo)) throw new UserError('Tipo de movimiento no válido.');
    const cantidad = Math.round(aNumero(i.cantidad, 'La cantidad') * 1000) / 1000;
    const r = registrarMovimiento({
      materialId: i.materialId,
      tipo: i.tipo as 'ENTRADA' | 'SALIDA' | 'AJUSTE',
      cantidad,
      motivo: String(i.motivo ?? '').trim().slice(0, 200),
      referencia: String(i.referencia ?? '').trim().slice(0, 120),
      usuarioId: user.id,
    });
    refrescar();
    const verbo = i.tipo === 'ENTRADA' ? 'Entrada registrada' : i.tipo === 'SALIDA' ? 'Salida registrada' : 'Ajuste registrado';
    return {
      ok: true,
      bajoMinimo: r.bajoMinimo,
      mensaje: `${verbo}: ${r.material}. Stock actual: ${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 3 }).format(r.stock)} ${r.unidad}.`,
    };
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    console.error('[registrarMovimiento]', e);
    return { error: 'Ocurrió un error inesperado. Intenta de nuevo.' };
  }
}

export async function anularAction(lote: string, motivo: string): Promise<Resultado> {
  return seguro(async () => {
    const user = await requerirAdminAccion();
    anularLote(String(lote), String(motivo ?? '').trim().slice(0, 200), user.id);
    refrescar();
  });
}

// ───────── Kits ─────────

export async function guardarKitAction(i: {
  id?: number;
  nombre: string;
  descripcion: string;
  items: { materialId: number | null; cantidad: string }[];
}): Promise<Resultado> {
  return seguro(async () => {
    await requerirAdminAccion();
    const nombre = String(i.nombre ?? '').trim();
    if (!nombre) throw new UserError('El nombre del kit es obligatorio.');
    if (nombre.length > 80) throw new UserError('El nombre del kit no puede superar 80 caracteres.');
    const items = (i.items ?? []).map((it, n) => {
      if (!it.materialId) throw new UserError(`Fila ${n + 1}: elige un material de la lista.`);
      const cantidad = aNumero(it.cantidad, `La cantidad de la fila ${n + 1}`);
      return { material_id: it.materialId, cantidad: Math.round(cantidad * 1000) / 1000 };
    });
    const datos = { nombre, descripcion: String(i.descripcion ?? '').trim().slice(0, 200), items };
    let id = i.id;
    if (id) actualizarKit(id, datos);
    else id = crearKit(datos);
    refrescar();
    return { ok: true, redirectTo: `/kits?id=${id}` };
  });
}

export async function desactivarKitAction(id: number): Promise<Resultado> {
  return seguro(async () => {
    await requerirAdminAccion();
    desactivarKit(id);
    refrescar();
    return { ok: true, redirectTo: '/kits' };
  });
}

export async function descontarKitAction(
  kitId: number,
  cantidad: number,
  referencia: string,
): Promise<ResultadoKit | { error: string }> {
  try {
    const user = await requerirAdminAccion();
    const r = descontarKit({ kitId, cantidad, referencia: String(referencia ?? '').trim().slice(0, 120), usuarioId: user.id });
    refrescar();
    return r;
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    console.error('[descontarKit]', e);
    return { error: 'Ocurrió un error inesperado. No se descontó nada. Intenta de nuevo.' };
  }
}

// ───────── Cuenta ─────────

export async function cambiarPasswordAction(fd: FormData): Promise<Resultado> {
  return seguro(async () => {
    const user = await requerirUsuarioAccion();
    const actual = String(fd.get('actual') ?? '');
    const nueva = String(fd.get('nueva') ?? '');
    if (nueva !== String(fd.get('confirmar') ?? '')) throw new UserError('La confirmación no coincide con la nueva contraseña.');
    await cambiarPassword(user.id, actual, nueva);
    return { ok: true, mensaje: 'Contraseña actualizada.' };
  });
}

export async function restablecerPasswordConsultaAction(fd: FormData): Promise<Resultado> {
  return seguro(async () => {
    await requerirAdminAccion();
    const nueva = String(fd.get('nueva') ?? '');
    if (nueva !== String(fd.get('confirmar') ?? '')) throw new UserError('La confirmación no coincide con la nueva contraseña.');
    await restablecerPasswordPorRol('CONSULTA', nueva);
    return { ok: true, mensaje: 'Contraseña de solo lectura actualizada. Su sesión se cerró.' };
  });
}
