import { Download, Lock, Pencil, Plus, Power, PowerOff } from 'lucide-react';
import Link from 'next/link';
import { cambiarActivoMaterialAction } from '@/app/acciones';
import { ConfirmarAccion } from '@/components/confirmar-accion';
import { EstadoInsignia, Insignia, NivelBarra } from '@/components/estado';
import { Paginacion } from '@/components/paginacion';
import { Button, botonClases, LinkButton } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/campos';
import { Tabla, Td, Th } from '@/components/ui/tabla';
import { EncabezadoPagina, Tarjeta } from '@/components/ui/tarjeta';
import { requerirUsuario } from '@/lib/auth';
import { categorias, listarMateriales, resumenPanel, type FiltroMateriales } from '@/lib/inventario';
import { entero, qs, uno, type SearchParams } from '@/lib/params';
import { fmtCant, fmtMoneda, fmtNum } from '@/lib/util';

export const metadata = { title: 'Materiales · Invicar' };

const ESTADOS = [
  { v: 'todos', t: 'Estado: Todos' }, { v: 'alerta', t: 'Con alerta (bajo o crítico)' }, { v: 'bajo', t: 'Stock bajo' },
  { v: 'critico', t: 'Crítico o agotado' }, { v: 'ok', t: 'Disponible' },
];

export default async function MaterialesPage({ searchParams }: { searchParams: SearchParams }) {
  const usuario = await requerirUsuario();
  const admin = usuario.rol === 'ADMIN';
  const sp = await searchParams;

  const estadoParam = uno(sp, 'estado');
  const filtro: FiltroMateriales = {
    q: uno(sp, 'q'),
    categoria: uno(sp, 'categoria'),
    estado: (ESTADOS.some((e) => e.v === estadoParam) ? estadoParam : 'todos') as FiltroMateriales['estado'],
    inactivos: admin && uno(sp, 'inactivos') === '1',
    page: entero(uno(sp, 'page'), 1),
  };
  const { rows, total, page, pageSize } = listarMateriales(filtro);
  const resumen = resumenPanel();
  const cats = categorias();

  const params = {
    q: filtro.q || undefined, categoria: filtro.categoria || undefined,
    estado: filtro.estado === 'todos' ? undefined : filtro.estado, inactivos: filtro.inactivos ? '1' : undefined,
  };
  const desde = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const hasta = Math.min(page * pageSize, total);

  return (
    <>
      <EncabezadoPagina
        titulo="Materiales"
        subtitulo={`${resumen.activos} materiales registrados · ${resumen.bajoMinimo} por debajo del stock mínimo${admin ? ` · Valor del inventario: ${fmtMoneda(resumen.valorInventario)}${resumen.sinCosto > 0 ? ` (${resumen.sinCosto} sin costo)` : ''}` : ''}`}
      >
        <a href={`/api/export/materiales${qs(params)}`} className={botonClases('outline')}><Download className="size-4" />Exportar</a>
        {admin && <LinkButton href="/materiales/nuevo"><Plus className="size-4" />Nuevo material</LinkButton>}
      </EncabezadoPagina>

      {!admin && (
        <div className="flex items-center gap-2.5 rounded-[10px] bg-primary-soft px-4 py-3 text-sm font-medium text-primary">
          <Lock className="size-[18px]" />
          Modo solo lectura: puedes consultar existencias y alertas, pero no modificar el inventario.
        </div>
      )}

      <Tarjeta className="overflow-visible">
        <form method="get" className="flex flex-wrap items-center gap-2.5 p-3">
          <Input name="q" defaultValue={filtro.q} placeholder="Buscar por nombre o código" className="w-full sm:w-[300px]" aria-label="Buscar" />
          <Select name="categoria" defaultValue={filtro.categoria} className="w-full sm:w-[200px]" aria-label="Categoría">
            <option value="">Todas las categorías</option>
            {cats.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select name="estado" defaultValue={filtro.estado} className="w-full sm:w-[220px]" aria-label="Estado">
            {ESTADOS.map((e) => <option key={e.v} value={e.v}>{e.t}</option>)}
          </Select>
          {admin && (
            <label className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
              <input type="checkbox" name="inactivos" value="1" defaultChecked={filtro.inactivos} className="size-4 accent-primary" />
              Incluir desactivados
            </label>
          )}
          <Button type="submit" variant="outline">Filtrar</Button>
          {(filtro.q || filtro.categoria || filtro.estado !== 'todos' || filtro.inactivos) && (
            <Link href="/materiales" className="text-sm text-muted-foreground hover:underline">Limpiar</Link>
          )}
          <span className="text-[13px] text-muted-foreground sm:ml-auto">Mostrando {desde}–{hasta} de {total}</span>
        </form>
      </Tarjeta>

      <Tarjeta>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-14 text-center">
            <p className="text-sm text-muted-foreground">
              {total === 0 && !filtro.q && !filtro.categoria && filtro.estado === 'todos'
                ? 'Todavía no hay materiales registrados.'
                : 'Ningún material coincide con esos filtros.'}
            </p>
            {admin && <LinkButton href="/materiales/nuevo"><Plus className="size-4" />Crear el primer material</LinkButton>}
          </div>
        ) : (
          <Tabla>
            <thead>
              <tr>
                <Th className="hidden md:table-cell">Código</Th><Th>Material</Th><Th className="hidden xl:table-cell">Categoría</Th><Th right>Stock</Th><Th right className="hidden sm:table-cell">Mínimo</Th>{admin && <><Th right className="hidden lg:table-cell">Costo unit.</Th><Th right className="hidden lg:table-cell">Valor en stock</Th></>}<Th className="hidden xl:table-cell">Nivel</Th><Th>Estado</Th>
                {admin && <Th right className="hidden sm:table-cell">Acciones</Th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className={m.activo ? undefined : 'opacity-60'}>
                  <Td suave className="hidden md:table-cell">{m.codigo}</Td>
                  <Td fuerte>
                    {m.nombre} {!m.activo && <Insignia nivel="neutral">Desactivado</Insignia>}
                    <div className="text-xs font-normal text-muted-foreground md:hidden">{m.codigo}</div>
                    {admin && <div className="mt-1.5 -ml-1 sm:hidden"><div className="flex gap-1">
                        <Link href={`/materiales/${m.id}/editar`} className={botonClases('ghost', 'icon')} aria-label={`Editar ${m.nombre}`} title="Editar">
                          <Pencil className="size-4" />
                        </Link>
                        <ConfirmarAccion
                          tamano="icon"
                          ariaLabel={m.activo ? `Desactivar ${m.nombre}` : `Activar ${m.nombre}`}
                          boton={m.activo ? <PowerOff className="size-4 text-destructive" /> : <Power className="size-4 text-success" />}
                          titulo={m.activo ? 'Desactivar material' : 'Activar material'}
                          descripcion={
                            m.activo
                              ? `«${m.nombre}» dejará de aparecer en listas y movimientos. El historial se conserva.`
                              : `«${m.nombre}» volverá a estar disponible para movimientos y kits.`
                          }
                          confirmar={m.activo ? 'Desactivar' : 'Activar'}
                          variante={m.activo ? 'danger' : 'primary'}
                          accion={cambiarActivoMaterialAction.bind(null, m.id, !m.activo)}
                        />
                      </div></div>}
                  </Td>
                  <Td suave className="hidden xl:table-cell">{m.categoria}</Td>
                  <Td right>{fmtCant(m.stock, m.unidad)}</Td>
                  <Td right className="hidden sm:table-cell">{fmtNum(m.stock_minimo)}</Td>
                  {admin && (
                    <>
                      <Td right className="hidden lg:table-cell">{m.costo_unitario > 0 ? fmtMoneda(m.costo_unitario) : <span className="text-muted-foreground">—</span>}</Td>
                      <Td right className="hidden lg:table-cell">{m.costo_unitario > 0 ? fmtMoneda(m.stock * m.costo_unitario) : <span className="text-muted-foreground">—</span>}</Td>
                    </>
                  )}
                  <Td className="hidden xl:table-cell"><NivelBarra stock={m.stock} minimo={m.stock_minimo} /></Td>
                  <Td><EstadoInsignia stock={m.stock} minimo={m.stock_minimo} /></Td>
                  {admin && (
                    <Td right className="hidden sm:table-cell">
                      <div className="flex justify-end gap-1">
                        <Link href={`/materiales/${m.id}/editar`} className={botonClases('ghost', 'icon')} aria-label={`Editar ${m.nombre}`} title="Editar">
                          <Pencil className="size-4" />
                        </Link>
                        <ConfirmarAccion
                          tamano="icon"
                          ariaLabel={m.activo ? `Desactivar ${m.nombre}` : `Activar ${m.nombre}`}
                          boton={m.activo ? <PowerOff className="size-4 text-destructive" /> : <Power className="size-4 text-success" />}
                          titulo={m.activo ? 'Desactivar material' : 'Activar material'}
                          descripcion={
                            m.activo
                              ? `«${m.nombre}» dejará de aparecer en listas y movimientos. El historial se conserva.`
                              : `«${m.nombre}» volverá a estar disponible para movimientos y kits.`
                          }
                          confirmar={m.activo ? 'Desactivar' : 'Activar'}
                          variante={m.activo ? 'danger' : 'primary'}
                          accion={cambiarActivoMaterialAction.bind(null, m.id, !m.activo)}
                        />
                      </div>
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </Tabla>
        )}
        <Paginacion base="/materiales" params={params} page={page} total={total} pageSize={pageSize} />
      </Tarjeta>
    </>
  );
}
