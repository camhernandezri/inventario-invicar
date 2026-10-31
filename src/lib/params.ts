export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function uno(sp: Record<string, string | string[] | undefined>, clave: string): string {
  const v = sp[clave];
  return (Array.isArray(v) ? v[0] : v) ?? '';
}

export function entero(v: string, def = 0): number {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}

export function qs(params: Record<string, string | number | undefined | false>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== false && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
}
