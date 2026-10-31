'use client';

import { ArrowLeftRight, CircleCheck, CircleX, TriangleAlert } from 'lucide-react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { descontarKitAction } from '@/app/acciones';
import { Insignia } from '@/components/estado';
import { Button } from '@/components/ui/button';
import { Alerta, Input } from '@/components/ui/campos';
import { Dialogo } from '@/components/ui/dialogo';
import { Tabla, Td, Th } from '@/components/ui/tabla';
import { estadoStock } from '@/lib/estado';
import { fmtCant, fmtNum, r3 } from '@/lib/util';

export interface ItemDialogo {
  materialId: number;
  codigo: string;
  nombre: string;
  unidad: string;
  cantidad: number;
  stock: number;
  minimo: number;
}

type Exito = { bajos: { nombre: string; stock: number; minimo: number; unidad: string }[]; cantidad: number };

export function DescontarKit({
  kit, items, etiqueta = 'Descontar kit', variante = 'primary',
}: {
  kit: { id: number; nombre: string };
  items: ItemDialogo[];
  etiqueta?: string;
  variante?: 'primary' | 'outline';
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [cantidadTxt, setCantidadTxt] = useState('1');
  const [referencia, setReferencia] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<Exito | null>(null);
  const [pendiente, empezar] = useTransition();

  const cantidad = Number(cantidadTxt);
  const cantidadValida = Number.isInteger(cantidad) && cantidad >= 1 && cantidad <= 999;

  const filas = items.map((it) => {
    const necesita = r3(it.cantidad * (cantidadValida ? cantidad : 1));
    const queda = r3(it.stock - necesita);
    const estado = queda < 0 ? 'falta' : estadoStock(queda, it.minimo).nivel !== 'ok' ? 'bajo' : 'ok';
    return { it, necesita, queda, estado };
  });
  const faltan = filas.filter((f) => f.estado === 'falta').length;
  const bajan = filas.filter((f) => f.estado === 'bajo').length;

  function cerrar() {
    setAbierto(false);
    setError(null);
    setExito(null);
    setCantidadTxt('1');
    setReferencia('');
    router.refresh();
  }

  function confirmar() {
    setError(null);
    empezar(async () => {
      const r = await descontarKitAction(kit.id, cantidad, referencia);
      if ('error' in r) {
        setError(r.error);
        return;
      }
      if (!r.ok) {
        setError('Mientras tenías esta ventana abierta cambió el stock y ahora faltan materiales. No se descontó nada.');
        router.refresh();
        return;
      }
      setExito({ bajos: r.bajos, cantidad });
    });
  }

  return (
    <>
      <Button variant={variante} onClick={() => setAbierto(true)}>
        <ArrowLeftRight className="size-4" />
        {etiqueta}
      </Button>

      <Dialogo
        abierto={abierto}
        onCerrar={cerrar}
        ocupado={pendiente}
        titulo={exito ? 'Salida registrada' : 'Descontar kit del inventario'}
        descripcion={exito ? undefined : 'Se registrará una salida por cada material del kit.'}
        icono={exito ? <CircleCheck className="size-5" /> : <ArrowLeftRight className="size-5" />}
        pie={
          exito ? (
            <Button onClick={cerrar}>Listo</Button>
          ) : (
            <>
              <Button variant="outline" onClick={cerrar} disabled={pendiente}>Cancelar</Button>
              <Button onClick={confirmar} disabled={pendiente || !cantidadValida || faltan > 0}>
                <CircleCheck className="size-4" />
                {pendiente ? 'Descontando…' : 'Confirmar salida'}
              </Button>
            </>
          )
        }
      >
        {exito ? (
          <div className="flex flex-col gap-4">
            <Alerta tipo="ok">
              Se descontaron los materiales de {exito.cantidad} × {kit.nombre}. Quedó una salida por cada material en el historial.
            </Alerta>
            {exito.bajos.length > 0 && (
              <Alerta tipo="aviso">
                <p className="mb-1">Estos materiales quedaron en alerta de stock:</p>
                <ul className="list-disc pl-5 font-normal">
                  {exito.bajos.map((b) => (
                    <li key={b.nombre}>{b.nombre}: {fmtCant(b.stock, b.unidad)} (mínimo {fmtNum(b.minimo)})</li>
                  ))}
                </ul>
              </Alerta>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_130px_1fr]">
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium">Kit</span>
                <div className="flex h-10 items-center rounded-lg border border-border bg-muted px-3 text-sm font-medium">{kit.nombre}</div>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium">Cantidad de kits</span>
                <Input type="number" min={1} max={999} step={1} value={cantidadTxt} onChange={(e) => setCantidadTxt(e.target.value)} aria-invalid={!cantidadValida} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium">Orden / destino</span>
                <Input value={referencia} onChange={(e) => setReferencia(e.target.value)} maxLength={120} placeholder="Ej. OP-0342 · Bus urbano" />
              </label>
            </div>

            <div className="overflow-hidden rounded-xl border border-border">
              <Tabla>
                <thead>
                  <tr><Th>Material</Th><Th right>Requerido</Th><Th right className="hidden sm:table-cell">Disponible</Th><Th right>Quedará</Th><Th className="hidden sm:table-cell">Estado</Th></tr>
                </thead>
                <tbody>
                  {filas.map(({ it, necesita, queda, estado }) => (
                    <tr key={it.materialId}>
                      <Td fuerte className="py-2.5">{it.nombre}<div className="mt-1 sm:hidden">
                        {estado === 'falta' && <Insignia nivel="crit">Insuficiente · faltan {fmtNum(-queda)}</Insignia>}
                        {estado === 'bajo' && <Insignia nivel="low">Quedará bajo mínimo</Insignia>}
                        {estado === 'ok' && <Insignia nivel="ok">Alcanza</Insignia>}
                      </div></Td>
                      <Td right className="py-2.5">{fmtCant(necesita, it.unidad)}</Td>
                      <Td right className="hidden py-2.5 sm:table-cell">{fmtNum(it.stock)}</Td>
                      <Td right className="py-2.5">{queda < 0 ? '—' : fmtNum(queda)}</Td>
                      <Td className="hidden py-2.5 sm:table-cell">
                        {estado === 'falta' && <Insignia nivel="crit">Insuficiente · faltan {fmtNum(-queda)}</Insignia>}
                        {estado === 'bajo' && <Insignia nivel="low">Quedará bajo mínimo</Insignia>}
                        {estado === 'ok' && <Insignia nivel="ok">Alcanza</Insignia>}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Tabla>
            </div>

            {!cantidadValida && <Alerta>La cantidad de kits debe ser un número entero entre 1 y 999.</Alerta>}
            {cantidadValida && faltan > 0 && (
              <div role="alert" className="flex items-center gap-2.5 rounded-[10px] bg-destructive-soft px-4 py-3 text-[13px] font-medium text-destructive">
                <CircleX className="size-[18px] shrink-0" />
                No se puede registrar la salida: faltan {faltan} {faltan === 1 ? 'material' : 'materiales'}. No se descontará nada hasta tener stock suficiente.
              </div>
            )}
            {cantidadValida && faltan === 0 && bajan > 0 && (
              <div className="flex items-center gap-2.5 rounded-[10px] bg-warning-soft px-4 py-3 text-[13px] font-medium text-warning">
                <TriangleAlert className="size-[18px] shrink-0" />
                {bajan} {bajan === 1 ? 'material quedará' : 'materiales quedarán'} por debajo del stock mínimo. Se mostrará una alerta de reposición.
              </div>
            )}
            {error && <Alerta>{error}</Alerta>}
          </div>
        )}
      </Dialogo>
    </>
  );
}
