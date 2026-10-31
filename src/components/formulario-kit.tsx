'use client';

import { Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { guardarKitAction } from '@/app/acciones';
import { SelectorMaterial, type OpcionMaterial } from '@/components/selector-material';
import { Button, botonClases } from '@/components/ui/button';
import { Alerta, Field, Input } from '@/components/ui/campos';
import { useEnviar } from '@/components/usar-enviar';

interface Fila {
  clave: number;
  materialId: number | null;
  cantidad: string;
}

export function FormularioKit({
  kit, materiales,
}: {
  kit?: { id: number; nombre: string; descripcion: string; items: { material_id: number; cantidad: number }[] };
  materiales: OpcionMaterial[];
}) {
  const [nombre, setNombre] = useState(kit?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(kit?.descripcion ?? '');
  const [filas, setFilas] = useState<Fila[]>(
    kit?.items.length
      ? kit.items.map((i, n) => ({ clave: n, materialId: i.material_id, cantidad: String(i.cantidad) }))
      : [{ clave: 0, materialId: null, cantidad: '1' }],
  );
  const [siguiente, setSiguiente] = useState(kit?.items.length ?? 1);
  const { pendiente, error, enviar } = useEnviar();

  const cambiar = (clave: number, parcial: Partial<Fila>) =>
    setFilas((fs) => fs.map((f) => (f.clave === clave ? { ...f, ...parcial } : f)));

  return (
    <form
      className="flex max-w-3xl flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        enviar(() => guardarKitAction({ id: kit?.id, nombre, descripcion, items: filas.map(({ materialId, cantidad }) => ({ materialId, cantidad })) }));
      }}
    >
      <div className="grid gap-4 sm:grid-cols-[260px_1fr]">
        <Field label="Nombre del kit" hint="Ej. Chasis 1">
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} required maxLength={80} autoFocus />
        </Field>
        <Field label="Descripción (opcional)" hint="Ej. Chasis para bus urbano">
          <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={200} />
        </Field>
      </div>

      <div className="flex flex-col gap-2.5">
        <div>
          <h3 className="text-sm font-semibold">Materiales del kit</h3>
          <p className="text-xs text-muted-foreground">Al descontar el kit se resta cada cantidad del stock de ese material.</p>
        </div>
        {filas.map((f) => {
          const m = materiales.find((x) => x.id === f.materialId);
          return (
            <div key={f.clave} className="flex flex-wrap items-start gap-2.5">
              <div className="min-w-[220px] flex-1">
                <SelectorMaterial materiales={materiales} valor={f.materialId} onCambio={(id) => cambiar(f.clave, { materialId: id })} />
              </div>
              <div className="flex w-[160px] items-center gap-2">
                <Input type="number" step="any" min="0" value={f.cantidad} onChange={(e) => cambiar(f.clave, { cantidad: e.target.value })} aria-label="Cantidad" />
                <span className="w-10 text-sm text-muted-foreground">{m?.unidad ?? ''}</span>
              </div>
              <Button variant="ghost" size="icon" className="mt-1" aria-label="Quitar material" disabled={filas.length === 1} onClick={() => setFilas((fs) => fs.filter((x) => x.clave !== f.clave))}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          );
        })}
        <div>
          <Button variant="outline" size="sm" onClick={() => { setFilas((fs) => [...fs, { clave: siguiente, materialId: null, cantidad: '1' }]); setSiguiente((s) => s + 1); }}>
            <Plus className="size-4" />Agregar material
          </Button>
        </div>
      </div>

      {error && <Alerta>{error}</Alerta>}
      <div className="flex items-center gap-2.5">
        <Button type="submit" disabled={pendiente}>{pendiente ? 'Guardando…' : kit ? 'Guardar cambios' : 'Crear kit'}</Button>
        <Link href={kit ? `/kits?id=${kit.id}` : '/kits'} className={botonClases('outline')}>Cancelar</Link>
      </div>
    </form>
  );
}
