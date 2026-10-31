import { estadoStock, type Nivel } from '@/lib/estado';
import { cn } from '@/lib/util';

const insignia: Record<Nivel | 'neutral' | 'info', string> = {
  ok: 'bg-success-soft text-success',
  low: 'bg-warning-soft text-warning',
  crit: 'bg-destructive-soft text-destructive',
  info: 'bg-primary-soft text-primary',
  neutral: 'bg-muted text-muted-foreground',
};
const punto: Record<Nivel | 'neutral' | 'info', string> = {
  ok: 'bg-success', low: 'bg-warning', crit: 'bg-destructive', info: 'bg-primary', neutral: 'bg-muted-foreground',
};

export function Insignia({ nivel, children }: { nivel: Nivel | 'neutral' | 'info'; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-xs font-medium whitespace-nowrap', insignia[nivel])}>
      <span className={cn('size-1.5 rounded-full', punto[nivel])} />
      {children}
    </span>
  );
}

export function EstadoInsignia({ stock, minimo }: { stock: number; minimo: number }) {
  const e = estadoStock(stock, minimo);
  return <Insignia nivel={e.nivel}>{e.label}</Insignia>;
}

export function NivelBarra({ stock, minimo }: { stock: number; minimo: number }) {
  const e = estadoStock(stock, minimo);
  const pct = minimo > 0 ? Math.max(0.08, Math.min(1, stock / (minimo * 2))) : stock > 0 ? 1 : 0.08;
  const color = { ok: 'bg-success', low: 'bg-warning', crit: 'bg-destructive' }[e.nivel];
  return (
    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted" role="img" aria-label={`Nivel de stock: ${e.label}`}>
      <div className={cn('h-full rounded-full', color)} style={{ width: `${Math.round(pct * 100)}%` }} />
    </div>
  );
}
