'use client';

import { useState } from 'react';
import { registrarMovimientoAction } from '@/app/acciones';
import { SelectorMaterial, type OpcionMaterial } from '@/components/selector-material';
import { Button } from '@/components/ui/button';
import { Alerta, Field, Input, Select } from '@/components/ui/campos';
import { useEnviar } from '@/components/usar-enviar';
import { fmtCant, r3 } from '@/lib/util';

type Tipo = 'ENTRADA' | 'SALIDA' | 'AJUSTE';

const MOTIVOS: Record<Tipo, string[]> = {
  SALIDA: ['Uso en taller', 'Reposición de línea', 'Venta', 'Otro'],
  ENTRADA: ['Compra', 'Devolución al inventario', 'Otro'],
  AJUSTE: ['Conteo físico', 'Rotura o daño', 'Pérdida', 'Corrección de error'],
};

export function FormularioMovimiento({
  materiales, tipos,
}: { materiales: OpcionMaterial[]; tipos: Tipo[] }) {
  const [tipo, setTipo] = useState<Tipo>(tipos[0]);
  const [materialId, setMaterialId] = useState<number | null>(null);
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [referencia, setReferencia] = useState('');
  const [aviso, setAviso] = useState(false);
  const { pendiente, error, mensaje, enviar } = useEnviar();

  const material = materiales.find((m) => m.id === materialId);
  const n = Number(String(cantidad).replace(',', '.'));
  const delta = Number.isFinite(n) && cantidad !== '' ? (tipo === 'SALIDA' ? -n : n) : null;
  const resultante = material && delta !== null ? r3(material.stock + delta) : null;

  const etiquetaBoton = { SALIDA: 'Registrar salida', ENTRADA: 'Registrar entrada', AJUSTE: 'Registrar ajuste' }[tipo];

  return (
    <form
      className="flex max-w-2xl flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        enviar(
          () => registrarMovimientoAction({ materialId, tipo, cantidad, motivo, referencia }),
          (r) => {
            setAviso(Boolean(r.bajoMinimo));
            setCantidad('');
            setMotivo('');
            setReferencia('');
          },
        );
      }}
    >
      {tipos.length > 1 && (
        <Field label="Tipo de movimiento">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)} className="w-[260px]">
            <option value="ENTRADA">Entrada (compra, devolución)</option>
            <option value="AJUSTE">Ajuste (corrección de conteo, ±)</option>
          </Select>
        </Field>
      )}

      <Field label="Material">
        <SelectorMaterial materiales={materiales} valor={materialId} onCambio={setMaterialId} requerido />
      </Field>
      {material && (
        <p className="-mt-2 text-xs text-muted-foreground">
          Stock actual: <strong className="font-semibold text-foreground">{fmtCant(material.stock, material.unidad)}</strong>
          {resultante !== null && (
            <> · Quedará en <strong className={resultante < 0 ? 'font-semibold text-destructive' : 'font-semibold text-foreground'}>{fmtCant(resultante, material.unidad)}</strong></>
          )}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={tipo === 'AJUSTE' ? `Cantidad a sumar o restar${material ? ` (${material.unidad})` : ''}` : `Cantidad${material ? ` (${material.unidad})` : ''}`}
          hint={tipo === 'AJUSTE' ? 'Usa un número negativo para restar. Ej. -2' : undefined}
        >
          <Input type="number" step="any" min={tipo === 'AJUSTE' ? undefined : '0'} value={cantidad} onChange={(e) => setCantidad(e.target.value)} required />
        </Field>
        <Field label={tipo === 'AJUSTE' ? 'Motivo (obligatorio)' : 'Motivo'}>
          <Input list="motivos" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={200} required={tipo === 'AJUSTE'} />
          <datalist id="motivos">{MOTIVOS[tipo].map((m) => <option key={m} value={m} />)}</datalist>
        </Field>
      </div>

      <Field label="Referencia (opcional)" hint={tipo === 'ENTRADA' ? 'Ej. Factura 4471' : tipo === 'SALIDA' ? 'Ej. OP-0342 · Bus urbano' : undefined}>
        <Input value={referencia} onChange={(e) => setReferencia(e.target.value)} maxLength={120} />
      </Field>

      {error && <Alerta>{error}</Alerta>}
      {mensaje && <Alerta tipo="ok">{mensaje}</Alerta>}
      {mensaje && aviso && <Alerta tipo="aviso">Ese material quedó por debajo del stock mínimo. Conviene programar su reposición.</Alerta>}

      <div>
        <Button type="submit" disabled={pendiente}>{pendiente ? 'Guardando…' : etiquetaBoton}</Button>
      </div>
    </form>
  );
}
