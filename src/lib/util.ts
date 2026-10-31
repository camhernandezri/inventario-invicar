import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ZONA = 'America/Bogota';

export const r3 = (n: number) => Math.round(n * 1000) / 1000;

const nf = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 3 });
export const fmtNum = (n: number) => nf.format(n);
const pesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const pesosDec = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** Pesos colombianos: «$ 12.500». Si tiene centavos, los muestra («$ 12,50»). */
export const fmtMoneda = (n: number) => (Math.abs(n - Math.round(n)) < 0.005 ? pesos.format(n) : pesosDec.format(n));
export const r2 = (n: number) => Math.round(n * 100) / 100;
export const fmtCant = (n: number, unidad?: string) => (unidad ? `${nf.format(n)} ${unidad}` : nf.format(n));

export function fmtConSigno(n: number, unidad?: string) {
  const s = nf.format(Math.abs(n));
  const signo = n > 0 ? '+' : n < 0 ? '−' : '';
  return `${signo}${s}${unidad ? ' ' + unidad : ''}`;
}

const partes = new Intl.DateTimeFormat('es-CO', {
  timeZone: ZONA, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
});

/** "9 oct · 14:32" en hora de Colombia. */
export function fmtFechaHora(iso: string) {
  const p = Object.fromEntries(partes.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  const mes = String(p.month).replace('.', '');
  return `${p.day} ${mes} · ${p.hour}:${p.minute}`;
}

const diaLargo = new Intl.DateTimeFormat('es-CO', {
  timeZone: ZONA, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
});
export const fmtDiaLargo = (d = new Date()) => diaLargo.format(d);

/** Fecha de hoy en Colombia como AAAA-MM-DD. */
export function hoyColombia(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(d);
}

export function esFechaISO(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}
