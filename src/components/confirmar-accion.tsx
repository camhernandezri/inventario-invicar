'use client';

import { useState } from 'react';
import { Alerta } from '@/components/ui/campos';
import { Button } from '@/components/ui/button';
import { Dialogo } from '@/components/ui/dialogo';
import { useEnviar } from '@/components/usar-enviar';
import type { Resultado } from '@/lib/types';

/** Botón que pide confirmación antes de ejecutar una acción del servidor. */
export function ConfirmarAccion({
  accion, boton, titulo, descripcion, confirmar, variante = 'danger', conMotivo, tamano = 'sm', ariaLabel,
}: {
  accion: (motivo: string) => Promise<Resultado>;
  boton: React.ReactNode;
  titulo: string;
  descripcion: string;
  confirmar: string;
  variante?: 'danger' | 'primary';
  conMotivo?: boolean;
  tamano?: 'sm' | 'icon' | 'md';
  ariaLabel?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState('');
  const { pendiente, error, enviar, setError } = useEnviar();

  const cerrar = () => {
    setAbierto(false);
    setError(null);
    setMotivo('');
  };

  return (
    <>
      <Button variant={variante === 'danger' ? 'ghost' : 'outline'} size={tamano} onClick={() => setAbierto(true)} aria-label={ariaLabel} title={ariaLabel}>
        {boton}
      </Button>
      <Dialogo
        abierto={abierto}
        onCerrar={cerrar}
        titulo={titulo}
        descripcion={descripcion}
        ancho="max-w-[480px]"
        ocupado={pendiente}
        pie={
          <>
            <Button variant="outline" onClick={cerrar} disabled={pendiente}>Cancelar</Button>
            <Button
              variant={variante === 'danger' ? 'primary' : 'primary'}
              className={variante === 'danger' ? 'bg-destructive hover:bg-destructive/90' : undefined}
              disabled={pendiente}
              onClick={() => enviar(() => accion(motivo), () => cerrar())}
            >
              {pendiente ? 'Procesando…' : confirmar}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {conMotivo && (
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium">Motivo (opcional)</span>
              <input
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                maxLength={200}
                className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
                placeholder="Ej. Error de digitación"
              />
            </label>
          )}
          {error && <Alerta>{error}</Alerta>}
        </div>
      </Dialogo>
    </>
  );
}
