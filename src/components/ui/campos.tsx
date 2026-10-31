import { cn } from '@/lib/util';

export const inputClase =
  'h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground disabled:bg-muted disabled:text-muted-foreground';

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClase, className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(inputClase, 'pr-8', className)} {...props} />;
}

export function Field({
  label, hint, children, className,
}: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-[13px] font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function Alerta({
  tipo = 'error', children,
}: { tipo?: 'error' | 'aviso' | 'ok' | 'info'; children: React.ReactNode }) {
  const estilos = {
    error: 'bg-destructive-soft text-destructive',
    aviso: 'bg-warning-soft text-warning',
    ok: 'bg-success-soft text-success',
    info: 'bg-primary-soft text-primary',
  }[tipo];
  return (
    <div role={tipo === 'error' ? 'alert' : 'status'} className={cn('rounded-[10px] px-4 py-3 text-sm font-medium', estilos)}>
      {children}
    </div>
  );
}
