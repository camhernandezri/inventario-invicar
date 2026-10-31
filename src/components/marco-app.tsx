'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { BarraLateral } from '@/components/barra-lateral';
import { BarraSuperior } from '@/components/barra-superior';
import type { Rol } from '@/lib/types';

export function MarcoApp({
  nombre, rol, alertas, children,
}: { nombre: string; rol: Rol; alertas: number; children: React.ReactNode }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const ruta = usePathname();

  useEffect(() => setMenuAbierto(false), [ruta]);

  useEffect(() => {
    if (!menuAbierto) return;
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && setMenuAbierto(false);
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [menuAbierto]);

  return (
    <div className="flex min-h-screen">
      <BarraLateral nombre={nombre} rol={rol} abierto={menuAbierto} onCerrar={() => setMenuAbierto(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <BarraSuperior rol={rol} alertas={alertas} onMenu={() => setMenuAbierto(true)} />
        <main className="flex flex-1 flex-col gap-5 p-4 sm:gap-6 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
