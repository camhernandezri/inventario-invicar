'use client';

import { Bell, Eye, Menu, Pencil, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Rol } from '@/lib/types';
import { cn } from '@/lib/util';

const TITULOS: Record<string, string> = {
  '': 'Panel', materiales: 'Materiales', kits: 'Kits', salidas: 'Registrar salida',
  entradas: 'Registrar entrada', historial: 'Historial', cuenta: 'Mi cuenta',
};

export function BarraSuperior({ rol, alertas, onMenu }: { rol: Rol; alertas: number; onMenu: () => void }) {
  const ruta = usePathname();
  const seccion = TITULOS[ruta.split('/')[1] ?? ''] ?? '';

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-card px-4 sm:gap-3 sm:px-6 lg:px-8">
      <button type="button" onClick={onMenu} aria-label="Abrir menú" className="-ml-1 flex size-10 items-center justify-center rounded-lg hover:bg-muted lg:hidden">
        <Menu className="size-5" />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
        <span className="hidden text-muted-foreground sm:inline">Invicar</span>
        <span className="hidden text-muted-foreground sm:inline">/</span>
        <span className="truncate font-medium">{seccion}</span>
      </div>

      <form action="/materiales" method="get" role="search" className="hidden h-10 w-[240px] items-center gap-2 rounded-lg bg-muted px-3 md:flex lg:w-[280px]">
        <Search className="size-4 text-slate-400" />
        <input
          name="q"
          type="search"
          placeholder="Buscar material o código…"
          aria-label="Buscar material o código"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </form>

      <Link
        href="/materiales?estado=alerta"
        aria-label={alertas ? `${alertas} materiales con stock bajo` : 'Sin alertas de stock'}
        title={alertas ? `${alertas} materiales con stock bajo` : 'Sin alertas de stock'}
        className="relative flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted"
      >
        <Bell className="size-[18px]" />
        {alertas > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
            {alertas > 99 ? '99+' : alertas}
          </span>
        )}
      </Link>

      <span
        title={rol === 'ADMIN' ? 'Puedes editar el inventario' : 'Solo lectura'}
        className={cn(
          'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium',
          rol === 'ADMIN' ? 'bg-primary-soft text-primary' : 'bg-muted text-muted-foreground',
        )}
      >
        {rol === 'ADMIN' ? <Pencil className="size-3.5" /> : <Eye className="size-3.5" />}
        <span className="hidden sm:inline">{rol === 'ADMIN' ? 'Edición' : 'Solo lectura'}</span>
      </span>
    </header>
  );
}
