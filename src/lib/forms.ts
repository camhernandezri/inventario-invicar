import { UserError } from './errors';

export function texto(
  fd: FormData,
  campo: string,
  o: { nombre: string; requerido?: boolean; max?: number } ,
): string {
  const v = String(fd.get(campo) ?? '').trim();
  if (o.requerido && !v) throw new UserError(`${o.nombre} es obligatorio.`);
  if (o.max && v.length > o.max) throw new UserError(`${o.nombre} no puede superar ${o.max} caracteres.`);
  return v;
}

/** Acepta "12.5" o "12,5". */
export function aNumero(valor: unknown, nombre: string): number {
  const s = String(valor ?? '').trim().replace(',', '.');
  if (s === '') throw new UserError(`${nombre} es obligatorio.`);
  const n = Number(s);
  if (!Number.isFinite(n)) throw new UserError(`${nombre} debe ser un número.`);
  return n;
}

/** Costo unitario en pesos (acepta «12500», «12.5» o «12,5»; vacío = 0). Hasta 2 decimales. */
export function costoUnitario(fd: FormData, campo = 'costo_unitario'): number {
  const bruto = String(fd.get(campo) ?? '').trim();
  if (bruto === '') return 0;
  // «12.500» o «12,500» se lee como doce mil quinientos en Colombia, pero el sistema lo entendería
  // como 12,5: mejor pedir que lo escriban sin separador de miles que guardar un costo equivocado.
  if (/^\d{1,3}([.,]\d{3})+$/.test(bruto)) {
    throw new UserError('Escribe el costo sin separador de miles. Ejemplo: 12500 (y para centavos, 12500,50).');
  }
  const n = aNumero(bruto, 'El costo unitario');
  if (n < 0) throw new UserError('El costo unitario no puede ser negativo.');
  if (n > 1e12) throw new UserError('El costo unitario es demasiado grande.');
  return Math.round(n * 100) / 100;
}

export function numero(
  fd: FormData,
  campo: string,
  o: { nombre: string; min?: number; max?: number; entero?: boolean; mayorQueCero?: boolean },
): number {
  const n = aNumero(fd.get(campo), o.nombre);
  if (o.entero && !Number.isInteger(n)) throw new UserError(`${o.nombre} debe ser un número entero.`);
  if (o.mayorQueCero && n <= 0) throw new UserError(`${o.nombre} debe ser mayor que cero.`);
  if (o.min !== undefined && n < o.min) throw new UserError(`${o.nombre} no puede ser menor que ${o.min}.`);
  if (o.max !== undefined && n > o.max) throw new UserError(`${o.nombre} no puede ser mayor que ${o.max}.`);
  return Math.round(n * 1000) / 1000;
}
