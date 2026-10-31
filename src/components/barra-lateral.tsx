'use client';

import { ArrowDownToLine, ArrowLeftRight, History, Layers, LayoutDashboard, LogOut, Package, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/acciones';
import type { Rol } from '@/lib/types';
import { cn } from '@/lib/util';

const MENU = [
  { href: '/', texto: 'Panel', icono: LayoutDashboard },
  { href: '/materiales', texto: 'Materiales', icono: Package },
  { href: '/kits', texto: 'Kits', icono: Layers },
  { href: '/salidas', texto: 'Registrar salida', icono: ArrowLeftRight, admin: true },
  { href: '/entradas', texto: 'Registrar entrada', icono: ArrowDownToLine, admin: true },
  { href: '/historial', texto: 'Historial', icono: History },
];

/** En pantallas grandes es una barra fija; en celular es un cajón que se abre con el botón de menú. */
export function BarraLateral({
  nombre, rol, abierto, onCerrar,
}: { nombre: string; rol: Rol; abierto: boolean; onCerrar: () => void }) {
  const ruta = usePathname();
  const activo = (href: string) => (href === '/' ? ruta === '/' : ruta === href || ruta.startsWith(href + '/'));
  const iniciales = nombre.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

  return (
    <>
      {abierto && <div className="fixed inset-0 z-30 bg-foreground/50 lg:hidden" onClick={onCerrar} aria-hidden />}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[264px] max-w-[85vw] shrink-0 flex-col gap-1 bg-sidebar px-4 py-5 transition-[transform,visibility] duration-200',
          'lg:sticky lg:top-0 lg:h-screen lg:w-[248px] lg:max-w-none lg:translate-x-0',
          abierto ? 'translate-x-0' : 'max-lg:invisible max-lg:-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 px-1">
            <span className="flex size-9 items-center justify-center rounded-[10px] bg-primary text-lg font-bold text-primary-foreground">I</span>
            <span className="flex flex-col leading-tight">
              <span className="text-base font-semibold text-primary-foreground">Invicar</span>
              <span className="text-[11px] text-sidebar-muted">Control de inventarios</span>
            </span>
          </Link>
          <button type="button" onClick={onCerrar} aria-label="Cerrar menú" className="rounded-md p-2 text-slate-400 hover:bg-sidebar-accent lg:hidden">
            <X className="size-5" />
          </button>
        </div>

        <nav className="mt-8 flex flex-col gap-1" aria-label="Menú principal">
          <span className="mb-1.5 px-3 text-[11px] font-medium tracking-[0.08em] text-sidebar-muted">MENÚ</span>
          {MENU.filter((m) => !m.admin || rol === 'ADMIN').map((m) => {
            const on = activo(m.href);
            const Icono = m.icono;
            return (
              <Link
                key={m.href}
                href={m.href}
                aria-current={on ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors lg:py-2.5',
                  on ? 'bg-sidebar-accent font-semibold text-primary-foreground' : 'font-medium text-sidebar-foreground hover:bg-sidebar-accent/60',
                )}
              >
                <Icono className={cn('size-[18px]', on ? 'text-white' : 'text-slate-400')} />
                {m.texto}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex items-center gap-2.5 rounded-[10px] bg-sidebar-accent p-3">
          <Link href="/cuenta" className="flex min-w-0 flex-1 items-center gap-2.5" title="Mi cuenta">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-semibold text-primary-foreground">{iniciales}</span>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-[13px] font-semibold text-primary-foreground">{nombre}</span>
              <span className="truncate text-xs text-sidebar-muted">{rol === 'ADMIN' ? 'Puede editar' : 'Solo lectura'}</span>
            </span>
          </Link>
          <form action={logoutAction}>
            <button type="submit" aria-label="Cerrar sesión" title="Cerrar sesión" className="rounded-md p-2 text-slate-400 hover:bg-sidebar hover:text-white">
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
