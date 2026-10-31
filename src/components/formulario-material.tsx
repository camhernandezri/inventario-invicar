'use client';

import { guardarMaterialAction } from '@/app/acciones';
import { FormularioAccion } from '@/components/formulario-accion';
import { Field, Input } from '@/components/ui/campos';
import type { Material } from '@/lib/types';

export function FormularioMaterial({
  material, categorias, unidades,
}: { material?: Material; categorias: string[]; unidades: string[] }) {
  const unidadesSugeridas = Array.from(new Set(['und', 'kg', 'm', 'gal', 'l', 'juego', ...unidades]));
  return (
    <FormularioAccion
      accion={guardarMaterialAction}
      etiqueta={material ? 'Guardar cambios' : 'Crear material'}
      cancelarHref="/materiales"
      className="max-w-2xl"
    >
      {material && <input type="hidden" name="id" value={material.id} />}
      <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
        <Field label="Código" hint="Único. Ej. LAM-CR-18">
          <Input name="codigo" defaultValue={material?.codigo} required maxLength={40} autoFocus />
        </Field>
        <Field label="Nombre">
          <Input name="nombre" defaultValue={material?.nombre} required maxLength={120} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Categoría">
          <Input name="categoria" list="categorias" defaultValue={material?.categoria ?? ''} maxLength={60} placeholder="Ej. Láminas" />
          <datalist id="categorias">{categorias.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label="Unidad de medida">
          <Input name="unidad" list="unidades" defaultValue={material?.unidad ?? 'und'} required maxLength={20} />
          <datalist id="unidades">{unidadesSugeridas.map((u) => <option key={u} value={u} />)}</datalist>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {!material && (
          <Field label="Stock inicial" hint="Queda registrado en el historial como stock inicial.">
            <Input name="stock" type="number" step="any" min="0" defaultValue="0" required />
          </Field>
        )}
        <Field label="Stock mínimo" hint="Cuando el stock llegue a este valor se activa la alerta.">
          <Input name="stock_minimo" type="number" step="any" min="0" defaultValue={material?.stock_minimo ?? 0} required />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Costo por unidad (COP)" hint="Pesos por cada unidad de medida, sin puntos de miles. Ej. 12500.">
          <Input name="costo_unitario" type="number" step="any" min="0" defaultValue={material?.costo_unitario ?? 0} />
        </Field>
      </div>
      {material && (
        <p className="text-xs text-muted-foreground">
          El stock actual no se edita aquí: para corregirlo usa «Registrar entrada» (con tipo Ajuste), así queda en el historial.
        </p>
      )}
    </FormularioAccion>
  );
}
