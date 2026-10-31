'use client';

import Link from 'next/link';
import { Alerta } from '@/components/ui/campos';
import { Button, botonClases } from '@/components/ui/button';
import { useEnviar } from '@/components/usar-enviar';
import type { Resultado } from '@/lib/types';
import { cn } from '@/lib/util';

/** Formulario genérico: envía FormData a una acción del servidor sin perder lo escrito si hay error. */
export function FormularioAccion({
  accion, children, etiqueta, cancelarHref, className, limpiarAlExito, anchoCompleto,
}: {
  accion: (fd: FormData) => Promise<Resultado>;
  children: React.ReactNode;
  etiqueta: string;
  cancelarHref?: string;
  className?: string;
  limpiarAlExito?: boolean;
  anchoCompleto?: boolean;
}) {
  const { pendiente, error, mensaje, enviar } = useEnviar();

  return (
    <form
      className={cn('flex flex-col gap-4', className)}
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        enviar(() => accion(new FormData(form)), () => {
          if (limpiarAlExito) form.reset();
        });
      }}
    >
      {children}
      {error && <Alerta>{error}</Alerta>}
      {mensaje && <Alerta tipo="ok">{mensaje}</Alerta>}
      <div className="flex items-center gap-2.5">
        <Button type="submit" disabled={pendiente} className={anchoCompleto ? 'w-full py-3' : undefined}>
          {pendiente ? 'Guardando…' : etiqueta}
        </Button>
        {cancelarHref && (
          <Link href={cancelarHref} className={botonClases('outline')}>
            Cancelar
          </Link>
        )}
      </div>
    </form>
  );
}
