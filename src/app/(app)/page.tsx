import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Banknote, Layers, Package, Pencil, Plus, TriangleAlert, Undo2 } from 'lucide-react';
import Link from 'next/link';
import { EstadoInsignia, NivelBarra } from '@/components/estado';
import { LinkButton } from '@/components/ui/button';
import { Tabla, Td, Th } from '@/components/ui/tabla';
import { EncabezadoPagina, Tarjeta, TarjetaCabecera } from '@/components/ui/tarjeta';
import { requerirUsuario } from '@/lib/auth';
import { listarAlertas, movimientosRecientes, resumenPanel, type MovimientoReciente } from '@/lib/inventario';
import { cn, fmtCant, fmtConSigno, fmtDiaLargo, fmtFechaHora, fmtMoneda } from '@/lib/util';

export const metadata = { title: 'Panel · Invicar' };

const ETIQUETA = { ENTRADA: 'Entrada', SALIDA: 'Salida', AJUSTE: 'Ajuste', ANULACION: 'Anulación' } as const;

function itemReciente(m: MovimientoReciente) {
  const esKit = m.kit_nombre !== null;
  const titulo = esKit ? `${m.kit_nombre} ×${m.kit_cantidad}` : m.material_nombre;
  const sub = esKit
    ? `${ETIQUETA[m.tipo]} de kit · ${m.n} materiales · ${m.usuario_nombre}`
    : `${ETIQUETA[m.tipo]} · ${fmtConSigno(m.cantidad, m.unidad)}${m.motivo ? ' · ' + m.motivo : ''}`;
  const visual = {
    SALIDA: { fondo: 'bg-warning-soft text-warning', Icono: ArrowUpRight },
    ENTRADA: { fondo: 'bg-success-soft text-success', Icono: ArrowDownLeft },
    AJUSTE: { fondo: 'bg-muted text-muted-foreground', Icono: Pencil },
    ANULACION: { fondo: 'bg-muted text-muted-foreground', Icono: Undo2 },
  }[m.tipo];
  return { titulo, sub, ...visual };
}

export default async function PanelPage() {
  const usuario = await requerirUsuario();
  const r = resumenPanel();
  const alertas = listarAlertas(5);
  const recientes = movimientosRecientes(6);
  const admin = usuario.rol === 'ADMIN';

  const kpis = [
    { label: 'Materiales activos', valor: r.activos, sub: 'En el inventario', Icono: Package, tono: 'bg-primary-soft text-primary' },
    { label: 'Bajo stock mínimo', valor: r.bajoMinimo, sub: `${r.criticos} en estado crítico`, Icono: TriangleAlert, tono: 'bg-warning-soft text-warning' },
    { label: 'Kits definidos', valor: r.kits, sub: 'Chasis y conjuntos', Icono: Layers, tono: 'bg-primary-soft text-primary' },
    ...(admin ? [{ label: 'Valor del inventario', valor: fmtMoneda(r.valorInventario), sub: r.sinCosto > 0 ? `${r.sinCosto} materiales sin costo` : 'Stock × costo unitario', Icono: Banknote, tono: 'bg-primary-soft text-primary' }] : []),
    { label: 'Salidas hoy', valor: r.salidasHoy, sub: 'Operaciones de despacho', Icono: ArrowLeftRight, tono: 'bg-success-soft text-success' },
  ];

  return (
    <>
      <EncabezadoPagina titulo="Panel general" subtitulo={`Resumen del inventario · ${fmtDiaLargo()}`}>
        {admin && (
          <>
            <LinkButton href="/entradas" variant="outline"><Plus className="size-4" />Registrar entrada</LinkButton>
            <LinkButton href="/salidas"><ArrowLeftRight className="size-4" />Registrar salida</LinkButton>
          </>
        )}
      </EncabezadoPagina>

      {r.bajoMinimo > 0 ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-[10px] bg-destructive-soft px-4 py-3 text-sm text-destructive">
          <TriangleAlert className="size-5 shrink-0" />
          <p className="min-w-[200px] flex-1">
            <strong className="font-semibold">
              {r.bajoMinimo === 1 ? '1 material está por debajo del stock mínimo.' : `${r.bajoMinimo} materiales están por debajo del stock mínimo.`}
            </strong>{' '}
            {r.criticos > 0 ? `${r.criticos} en estado crítico requieren reposición inmediata.` : 'Conviene programar la reposición.'}
          </p>
          <Link href="/materiales?estado=alerta" className="rounded-lg border border-destructive-soft bg-card px-3.5 py-2 font-medium hover:bg-white">
            Ver materiales
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-[10px] bg-success-soft px-4 py-3 text-sm font-medium text-success">
          Todo el inventario está por encima del stock mínimo.
        </div>
      )}

      <div className={cn('grid grid-cols-2 gap-3 sm:gap-4', admin ? 'xl:grid-cols-5' : 'xl:grid-cols-4')}>
        {kpis.map(({ label, valor, sub, Icono, tono }) => (
          <Tarjeta key={label} className="flex items-center gap-2 p-4 sm:gap-3 sm:p-5">
            <div className="flex-1">
              <p className="text-[13px] text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl leading-8 font-semibold tracking-tight tabular-nums sm:text-[30px] sm:leading-9">{valor}</p>
              <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
            </div>
            <div className={cn('hidden size-11 items-center justify-center rounded-xl min-[420px]:flex', tono)}><Icono className="size-[22px]" /></div>
          </Tarjeta>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_400px]">
        <Tarjeta>
          <TarjetaCabecera titulo="Alertas de stock bajo">
            <Link href="/materiales?estado=alerta" className="text-[13px] font-medium text-primary hover:underline">Ver todos</Link>
          </TarjetaCabecera>
          {alertas.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">No hay materiales en alerta.</p>
          ) : (
            <Tabla>
              <thead>
                <tr><Th>Material</Th><Th right>Stock</Th><Th right className="hidden sm:table-cell">Mínimo</Th><Th className="hidden md:table-cell">Nivel</Th><Th>Estado</Th></tr>
              </thead>
              <tbody>
                {alertas.map((m) => (
                  <tr key={m.id}>
                    <Td>
                      <div className="font-medium">{m.nombre}</div>
                      <div className="text-xs text-muted-foreground">{m.codigo}</div>
                    </Td>
                    <Td right>{fmtCant(m.stock, m.unidad)}</Td>
                    <Td right className="hidden sm:table-cell">{fmtCant(m.stock_minimo)}</Td>
                    <Td className="hidden md:table-cell"><NivelBarra stock={m.stock} minimo={m.stock_minimo} /></Td>
                    <Td><EstadoInsignia stock={m.stock} minimo={m.stock_minimo} /></Td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          )}
        </Tarjeta>

        <Tarjeta>
          <TarjetaCabecera titulo="Movimientos recientes">
            <Link href="/historial" className="text-[13px] font-medium text-primary hover:underline">Ver historial</Link>
          </TarjetaCabecera>
          {recientes.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">Aún no hay movimientos.</p>
          ) : (
            <ul>
              {recientes.map((m) => {
                const v = itemReciente(m);
                return (
                  <li key={m.lote} className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-b-0">
                    <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-[10px]', v.fondo)}><v.Icono className="size-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{v.titulo}</p>
                      <p className="truncate text-xs text-muted-foreground">{v.sub}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{fmtFechaHora(m.creado_en)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Tarjeta>
      </div>
    </>
  );
}
