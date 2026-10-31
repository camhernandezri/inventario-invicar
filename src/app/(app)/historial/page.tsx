import { Download, Layers, Undo2 } from 'lucide-react';
import Link from 'next/link';
import { anularAction } from '@/app/acciones';
import { ConfirmarAccion } from '@/components/confirmar-accion';
import { Insignia } from '@/components/estado';
import { Paginacion } from '@/components/paginacion';
import { Button, botonClases } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/campos';
import { Tabla, Td, Th } from '@/components/ui/tabla';
import { EncabezadoPagina, Tarjeta } from '@/components/ui/tarjeta';
import { requerirUsuario } from '@/lib/auth';
import { listarMovimientos } from '@/lib/inventario';
import { entero, qs, uno, type SearchParams } from '@/lib/params';
import { listarUsuarios } from '@/lib/usuarios';
import { cn, esFechaISO, fmtConSigno, fmtFechaHora } from '@/lib/util';

export const metadata = { title: 'Historial · Invicar' };

const TIPOS = { ENTRADA: 'Entrada', SALIDA: 'Salida', AJUSTE: 'Ajuste', ANULACION: 'Anulación' } as const;
const NIVEL = { ENTRADA: 'ok', SALIDA: 'info', AJUSTE: 'neutral', ANULACION: 'neutral' } as const;

export default async function HistorialPage({ searchParams }: { searchParams: SearchParams }) {
  const usuario = await requerirUsuario();
  const admin = usuario.rol === 'ADMIN';
  const sp = await searchParams;

  const desdeP = uno(sp, 'desde');
  const hastaP = uno(sp, 'hasta');
  const filtro = {
    q: uno(sp, 'q'),
    tipo: uno(sp, 'tipo'),
    usuarioId: entero(uno(sp, 'usuario')) || undefined,
    desde: esFechaISO(desdeP) ? desdeP : undefined,
    hasta: esFechaISO(hastaP) ? hastaP : undefined,
    page: entero(uno(sp, 'page'), 1),
  };
  const { rows, total, page, pageSize } = listarMovimientos(filtro);
  const usuarios = listarUsuarios();
  const params = {
    q: filtro.q || undefined, tipo: filtro.tipo || undefined, usuario: filtro.usuarioId ? String(filtro.usuarioId) : undefined,
    desde: filtro.desde, hasta: filtro.hasta,
  };
  const hayFiltros = Object.values(params).some(Boolean);
  const desde = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const hasta = Math.min(page * pageSize, total);

  return (
    <>
      <EncabezadoPagina titulo="Historial de movimientos" subtitulo="Registro de entradas, salidas y ajustes (kárdex). Cada cambio queda con usuario y fecha.">
        <a href={`/api/export/historial${qs(params)}`} className={botonClases('outline')}><Download className="size-4" />Exportar</a>
      </EncabezadoPagina>

      <Tarjeta className="overflow-visible">
        <form method="get" className="flex flex-wrap items-center gap-2.5 p-3">
          <Input name="q" defaultValue={filtro.q} placeholder="Buscar material, kit u orden" className="w-full sm:w-[260px]" aria-label="Buscar" />
          <Select name="tipo" defaultValue={filtro.tipo} className="w-full sm:w-[150px]" aria-label="Tipo">
            <option value="">Tipo: Todos</option>
            {Object.entries(TIPOS).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </Select>
          <Select name="usuario" defaultValue={filtro.usuarioId ? String(filtro.usuarioId) : ''} className="w-full sm:w-[170px]" aria-label="Usuario">
            <option value="">Usuario: Todos</option>
            {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </Select>
          <label className="flex w-full items-center justify-between gap-1.5 text-[13px] text-muted-foreground sm:w-auto">Desde
            <Input type="date" name="desde" defaultValue={filtro.desde} className="w-[170px] sm:w-[150px]" />
          </label>
          <label className="flex w-full items-center justify-between gap-1.5 text-[13px] text-muted-foreground sm:w-auto">Hasta
            <Input type="date" name="hasta" defaultValue={filtro.hasta} className="w-[170px] sm:w-[150px]" />
          </label>
          <Button type="submit" variant="outline">Filtrar</Button>
          {hayFiltros && <Link href="/historial" className="text-sm text-muted-foreground hover:underline">Limpiar</Link>}
          <span className="text-[13px] text-muted-foreground sm:ml-auto">Mostrando {desde}–{hasta} de {total}</span>
        </form>
      </Tarjeta>

      <Tarjeta>
        {rows.length === 0 ? (
          <p className="px-5 py-14 text-center text-sm text-muted-foreground">
            {hayFiltros ? 'Ningún movimiento coincide con esos filtros.' : 'Aún no hay movimientos registrados.'}
          </p>
        ) : (
          <Tabla>
            <thead>
              <tr>
                <Th className="hidden md:table-cell">Fecha y hora</Th><Th className="hidden md:table-cell">Tipo</Th><Th>Material</Th><Th right>Cantidad</Th><Th className="hidden xl:table-cell">Motivo / referencia</Th><Th className="hidden min-[1400px]:table-cell">Usuario</Th>
                {admin && <Th right className="hidden md:table-cell">Acción</Th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const puedeAnular = admin && m.es_primero === 1 && !m.anulado && m.tipo !== 'ANULACION';
                const anularBtn = puedeAnular && (
                          <ConfirmarAccion
                            ariaLabel={m.n_lote > 1 ? 'Anular salida completa' : 'Anular movimiento'}
                            boton={<><Undo2 className="size-3.5" />Anular</>}
                            titulo={m.n_lote > 1 ? 'Anular operación completa' : 'Anular movimiento'}
                            descripcion={
                              m.n_lote > 1
                                ? `Se devolverá al inventario el stock de los ${m.n_lote} materiales de «${m.kit_nombre ?? 'esta operación'}». El historial no se borra: queda una anulación registrada.`
                                : 'Se revertirá este movimiento. El historial no se borra: queda una anulación registrada.'
                            }
                            confirmar="Anular"
                            conMotivo
                            accion={anularAction.bind(null, m.lote)}
                          />
                        );
                return (
                  <tr key={m.id} className={cn(m.anulado && 'text-muted-foreground')}>
                    <Td suave className="hidden whitespace-nowrap md:table-cell">{fmtFechaHora(m.creado_en)}</Td>
                    <Td className="hidden md:table-cell"><Insignia nivel={NIVEL[m.tipo]}>{TIPOS[m.tipo]}</Insignia></Td>
                    <Td fuerte className={cn(m.anulado && 'line-through')}>
                      {m.material_nombre}
                      <div className="text-xs font-normal text-muted-foreground">{m.material_codigo}{m.kit_nombre ? ` · ${m.kit_nombre} ×${m.kit_cantidad}` : ''}</div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 font-normal md:hidden">
                        <Insignia nivel={NIVEL[m.tipo]}>{TIPOS[m.tipo]}</Insignia>
                        <span className="text-xs text-muted-foreground">{fmtFechaHora(m.creado_en)}</span>
                        {anularBtn}
                      </div>
                    </Td>
                    <Td right className={cn('font-semibold whitespace-nowrap', m.cantidad > 0 && !m.anulado && 'text-success', m.tipo === 'AJUSTE' && 'text-warning')}>
                      {fmtConSigno(m.cantidad, m.unidad)}
                    </Td>
                    <Td className="hidden text-[13px] xl:table-cell">
                      {m.kit_nombre && (
                        <span className="inline-flex items-center gap-1.5 font-medium text-primary">
                          <Layers className="size-3.5" />{m.kit_nombre} ×{m.kit_cantidad}
                        </span>
                      )}
                      {m.kit_nombre ? ' · ' : ''}
                      <span className="text-muted-foreground">{[m.kit_nombre ? m.referencia : m.motivo, !m.kit_nombre ? m.referencia : ''].filter(Boolean).join(' · ') || (m.kit_nombre ? '' : '—')}</span>
                      {m.anulado ? <span className="ml-2"><Insignia nivel="neutral">Anulado</Insignia></span> : null}
                    </Td>
                    <Td suave className="hidden whitespace-nowrap min-[1400px]:table-cell">{m.usuario_nombre}</Td>
                    {admin && (
                      <Td right className="hidden md:table-cell">
                        {anularBtn}
                      </Td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </Tabla>
        )}
        <Paginacion base="/historial" params={params} page={page} total={total} pageSize={pageSize} />
      </Tarjeta>
    </>
  );
}
