'use client';

import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/util';

export function Dialogo({
  abierto, onCerrar, titulo, descripcion, icono, children, pie, ancho = 'max-w-[780px]', ocupado,
}: {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  descripcion?: string;
  icono?: React.ReactNode;
  children: React.ReactNode;
  pie?: React.ReactNode;
  ancho?: string;
  ocupado?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !ocupado) onCerrar();
    };
    document.addEventListener('keydown', alTeclear);
    const previo = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', alTeclear);
      document.body.style.overflow = overflow;
      previo?.focus();
    };
  }, [abierto, ocupado, onCerrar]);

  if (!abierto) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/55 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !ocupado) onCerrar(); }}
    >
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={cn('flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_12px_40px_rgba(15,23,42,0.25)] outline-none', ancho)}
      >
        <div className="flex items-center gap-3.5 border-b border-border px-4 py-4 sm:px-6 sm:py-5">
          {icono && <div className="flex size-10 items-center justify-center rounded-[10px] bg-primary-soft text-primary">{icono}</div>}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold tracking-tight">{titulo}</h2>
            {descripcion && <p className="text-[13px] text-muted-foreground">{descripcion}</p>}
          </div>
          <button type="button" onClick={onCerrar} disabled={ocupado} aria-label="Cerrar" className="rounded-md p-1 text-muted-foreground hover:bg-muted">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
        {pie && <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-border bg-muted px-4 py-3 sm:px-6 sm:py-4">{pie}</div>}
      </div>
    </div>
  );
}
