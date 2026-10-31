'use client';

import { useEffect, useId, useState } from 'react';
import { inputClase } from '@/components/ui/campos';
import { plegar } from '../../core/texto.mjs';
import { cn } from '@/lib/util';

export interface OpcionMaterial {
  id: number;
  codigo: string;
  nombre: string;
  unidad: string;
  stock: number;
}

const etiqueta = (m: OpcionMaterial) => `${m.codigo} — ${m.nombre}`;

/** Campo con búsqueda: se escribe parte del código o nombre y se elige de la lista. */
export function SelectorMaterial({
  materiales, valor, onCambio, className, placeholder = 'Escribe el código o nombre…', requerido,
}: {
  materiales: OpcionMaterial[];
  valor: number | null;
  onCambio: (id: number | null) => void;
  className?: string;
  placeholder?: string;
  requerido?: boolean;
}) {
  const listaId = useId();
  const [texto, setTexto] = useState('');

  useEffect(() => {
    if (valor === null) return;
    const m = materiales.find((x) => x.id === valor);
    if (m) setTexto(etiqueta(m));
  }, [valor, materiales]);

  function alCambiar(v: string) {
    setTexto(v);
    const exacto = materiales.find((m) => etiqueta(m) === v) ?? materiales.find((m) => plegar(m.codigo) === plegar(v.trim()));
    onCambio(exacto ? exacto.id : null);
  }

  return (
    <>
      <input
        list={listaId}
        value={texto}
        onChange={(e) => alCambiar(e.target.value)}
        placeholder={placeholder}
        required={requerido}
        autoComplete="off"
        className={cn(inputClase, className)}
        aria-invalid={texto !== '' && valor === null}
      />
      <datalist id={listaId}>
        {materiales.map((m) => (
          <option key={m.id} value={etiqueta(m)} />
        ))}
      </datalist>
    </>
  );
}
