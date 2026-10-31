import { ChevronRight, Info, Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { desactivarKitAction } from '@/app/acciones';
import { ConfirmarAccion } from '@/components/confirmar-accion';
import { DescontarKit } from '@/components/descontar-kit';
import { botonClases, LinkButton } from '@/components/ui/button';
import { Tabla, Td, Th } from '@/components/ui/tabla';
import { EncabezadoPagina, Tarjeta, TarjetaCabecera } from '@/components/ui/tarjeta';
import { requerirUsuario } from '@/lib/auth';
import { costoDeKit, itemsDeKit, kitsPosibles, listarKits } from '@/lib/inventario';
import { entero, uno, type SearchParams } from '@/lib/params';
import { cn, fmtCant, fmtMoneda } from '@/lib/util';

export const metadata = { title: 'Kits · Invicar' };

export default async function KitsPage({ searchParams }: { searchParams: SearchParams }) {
  const usuario = await requerirUsuario();
  const admin = usuario.rol === 'ADMIN';
  const sp = await searchParams;
  const kits = listarKits();
  const seleccionado = kits.find((k) => k.id === entero(uno(sp, 'id'))) ?? kits[0];
  const items = seleccionado ? itemsDeKit(seleccionado.id) : [];
  const posibles = kitsPosibles(items);
  const costoKit = costoDeKit(items);
  const sinCosto = items.filter((i) => i.costo_unitario === 0);
  const limitantes = items.filter((i) => Math.floor((i.stock + 1e-9) / i.cantidad) === posibles);

  return (
    <>
      <EncabezadoPagina
        titulo="Kits de materiales"
        subtitulo="Define qué materiales necesita cada chasis. Al descontar un kit se registra una salida por cada material."
      >
        {admin && <LinkButton href="/kits/nuevo"><Plus className="size-4" />Nuevo kit</LinkButton>}
      </EncabezadoPagina>

      {kits.length === 0 ? (
        <Tarjeta className="flex flex-col items-center gap-3 px-5 py-16 text-center">
          <Layers className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Aún no hay kits. Un kit agrupa los materiales de un chasis (por ejemplo «Chasis 1») para descontarlos de una sola vez.
          </p>
          {admin && <LinkButton href="/kits/nuevo"><Plus className="size-4" />Crear el primer kit</LinkButton>}
        </Tarjeta>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[300px_1fr]">
          <Tarjeta>
            <TarjetaCabecera titulo={`Kits (${kits.length})`} />
            <ul>
              {kits.map((k) => {
                const on = k.id === seleccionado?.id;
                return (
                  <li key={k.id} className="border-b border-border last:border-b-0">
                    <Link href={`/kits?id=${k.id}`} aria-current={on ? 'true' : undefined} className={cn('flex items-center gap-3 px-5 py-3.5', on ? 'bg-primary-soft' : 'hover:bg-muted')}>
                      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-[10px]', on ? 'bg-card text-primary' : 'bg-muted text-muted-foreground')}>
                        <Layers className="size-[18px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn('block truncate text-sm font-semibold', on && 'text-primary')}>{k.nombre}</span>
                        <span className="text-xs text-muted-foreground">{k.n_items} {k.n_items === 1 ? 'material' : 'materiales'}{admin && k.costo > 0 ? ` · ${fmtMoneda(k.costo)}` : ''}</span>
                      </span>
                      <ChevronRight className="size-4 text-slate-400" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Tarjeta>

          {seleccionado && (
            <Tarjeta>
              <div className="flex flex-wrap items-center gap-3.5 border-b border-border px-4 py-4 sm:px-6 sm:py-5">
                <span className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary"><Layers className="size-6" /></span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-semibold tracking-tight">{seleccionado.nombre}</h2>
                  <p className="text-[13px] text-muted-foreground">
                    {seleccionado.descripcion ? `${seleccionado.descripcion} · ` : ''}{items.length} {items.length === 1 ? 'material' : 'materiales'}
                  </p>
                  {admin && (
                    <p className="mt-0.5 text-[13px] font-semibold">
                      Costo por kit: {fmtMoneda(costoKit)}
                      {sinCosto.length > 0 && <span className="font-normal text-warning"> · incompleto: {sinCosto.length === 1 ? '1 material sin costo' : `${sinCosto.length} materiales sin costo`}</span>}
                    </p>
                  )}
                </div>
                {admin && (
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Link href={`/kits/${seleccionado.id}/editar`} className={botonClases('outline')}><Pencil className="size-4" />Editar kit</Link>
                    <ConfirmarAccion
                      tamano="md"
                      ariaLabel="Eliminar kit"
                      boton={<Trash2 className="size-4 text-destructive" />}
                      titulo="Eliminar kit"
                      descripcion={`«${seleccionado.nombre}» dejará de aparecer. Las salidas ya registradas con este kit se conservan en el historial.`}
                      confirmar="Eliminar kit"
                      accion={desactivarKitAction.bind(null, seleccionado.id)}
                    />
                    <DescontarKit
                      kit={{ id: seleccionado.id, nombre: seleccionado.nombre }}
                      items={items.map((i) => ({ materialId: i.material_id, codigo: i.codigo, nombre: i.nombre, unidad: i.unidad, cantidad: i.cantidad, stock: i.stock, minimo: i.stock_minimo }))}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2.5 bg-primary-soft px-4 py-3 text-[13px] sm:px-6 font-medium text-primary">
                <Info className="size-[18px] shrink-0" />
                {posibles === 0
                  ? `Con el stock actual no alcanza para armar ningún ${seleccionado.nombre}. Falta: ${limitantes.map((i) => i.nombre).join(', ')}.`
                  : `Con el stock actual se ${posibles === 1 ? 'puede armar 1 kit' : `pueden armar ${posibles} kits`}. Material limitante: ${limitantes.map((i) => i.nombre).join(', ')}.`}
              </div>

              <Tabla>
                <thead>
                  <tr><Th className="hidden sm:table-cell">Código</Th><Th>Material</Th><Th right>Cant. por kit</Th>{admin && <><Th right className="hidden md:table-cell">Costo unit.</Th><Th right>Costo en el kit</Th></>}<Th right className="hidden sm:table-cell">Stock actual</Th><Th right>Alcanza para</Th></tr>
                </thead>
                <tbody>
                  {items.map((i) => {
                    const n = Math.floor((i.stock + 1e-9) / i.cantidad);
                    return (
                      <tr key={i.material_id}>
                        <Td suave className="hidden sm:table-cell">{i.codigo}</Td>
                        <Td fuerte>{i.nombre}<div className="text-xs font-normal text-muted-foreground sm:hidden">Stock: {fmtCant(i.stock, i.unidad)}</div></Td>
                        <Td right>{fmtCant(i.cantidad, i.unidad)}</Td>
                        {admin && (
                          <>
                            <Td right className="hidden md:table-cell">{i.costo_unitario > 0 ? fmtMoneda(i.costo_unitario) : <span className="text-muted-foreground">—</span>}</Td>
                            <Td right>{i.costo_unitario > 0 ? fmtMoneda(i.cantidad * i.costo_unitario) : <span className="text-muted-foreground">—</span>}</Td>
                          </>
                        )}
                        <Td right className="hidden sm:table-cell">{fmtCant(i.stock, i.unidad)}</Td>
                        <Td right className={cn(n <= posibles && 'font-semibold text-warning')}>{n} {n === 1 ? 'kit' : 'kits'}</Td>
                      </tr>
                    );
                  })}
                </tbody>
                {admin && <tfoot>
                  <tr>
                    <Td fuerte className="hidden sm:table-cell">{''}</Td>
                    <Td fuerte>Total por kit</Td>
                    <Td right>{''}</Td>
                    <Td right className="hidden md:table-cell">{''}</Td>
                    <Td right fuerte>{fmtMoneda(costoKit)}</Td>
                    <Td right className="hidden sm:table-cell">{''}</Td>
                    <Td right>{''}</Td>
                  </tr>
                </tfoot>}
              </Tabla>
            </Tarjeta>
          )}
        </div>
      )}
    </>
  );
}
