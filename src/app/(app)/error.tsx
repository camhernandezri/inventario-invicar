'use client';

import { Button } from '@/components/ui/button';

export default function ErrorApp({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto mt-16 flex max-w-md flex-col items-center gap-3 text-center">
      <h1 className="text-xl font-semibold">No se pudo cargar esta pantalla</h1>
      <p className="text-sm text-muted-foreground">
        Ocurrió un problema al leer los datos. Intenta de nuevo; si se repite, avisa al responsable del sistema.
      </p>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  );
}
