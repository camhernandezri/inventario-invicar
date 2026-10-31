'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { Resultado } from '@/lib/types';

/** Envía una acción del servidor mostrando error / mensaje y refrescando la pantalla. */
export function useEnviar() {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  function enviar<R extends Resultado>(accion: () => Promise<R>, alExito?: (r: R) => void) {
    setError(null);
    setMensaje(null);
    empezar(async () => {
      const r = await accion();
      if (r.error) {
        setError(r.error);
        return;
      }
      if (r.mensaje) setMensaje(r.mensaje);
      alExito?.(r);
      if (r.redirectTo) router.push(r.redirectTo);
      else router.refresh();
    });
  }

  return { pendiente, error, mensaje, enviar, setError, setMensaje };
}
