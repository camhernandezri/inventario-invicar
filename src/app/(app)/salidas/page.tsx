import { Layers } from 'lucide-react';
import Link from 'next/link';
import { DescontarKit } from '@/components/descontar-kit';
import { FormularioMovimiento } from '@/components/formulario-movimiento';
import { EncabezadoPagina, Tarjeta } from '@/components/ui/tarjeta';
import { requerirAdminPagina } from '@/lib/auth';
import { kitsConItems, kitsPosibles, materialesActivos } from '@/lib/inventario';
import { uno, type SearchParams } from '@/lib/params';
import { cn } from '@/lib/util';

export const metadata = { title: 'Registrar salida · Invicar' };

export default async function SalidasPage({ searchParams }: { searchParams: SearchParams }) {
  await requerirAdminPagina();
  const modo = uno(await searchParams, 'modo') === 'material' ? 'material' : 'kit';
  const pestana = (activa: boolean) =>
    cn('rounded-lg px-4 py-2 text-sm font-medium', activa ? 'bg-card text-foreground shadow-[0_1px_3px_rgba(15,23,42,0.1)]' : 'text-muted-foreground hover:text-foreground');

  return (
    <>
      <EncabezadoPagina titulo="Registrar salida" subtitulo="Descuenta un kit completo (ej. Chasis 1) o un material suelto." />

      <div className="inline-flex w-fit gap-1 rounded-[10px] bg-muted p-1" role="tablist">
        <Link href="/salidas" role="tab" aria-selected={modo === 'kit'} className={pestana(modo === 'kit')}>Kit completo</Link>
        <Link href="/salidas?modo=material" role="tab" aria-selected={modo === 'material'} className={pestana(modo === 'material')}>Material individual</Link>
      </div>

      {modo === 'material' ? (
        <Tarjeta className="p-6">
          <FormularioMovimiento
            tipos={['SALIDA']}
            materiales={materialesActivos().map(({ id, codigo, nombre, unidad, stock }) => ({ id, codigo, nombre, unidad, stock }))}
          />
        </Tarjeta>
      ) : (
        <KitsParaDescontar />
      )}
    </>
  );
}

function KitsParaDescontar() {
  const kits = kitsConItems();
  if (!kits.length) {
    return (
      <Tarjeta className="px-5 py-14 text-center text-sm text-muted-foreground">
        Todavía no hay kits. Créalos en la sección <Link href="/kits/nuevo" className="font-medium text-primary hover:underline">Kits</Link>.
      </Tarjeta>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {kits.map(({ kit, items }) => {
        const posibles = kitsPosibles(items);
        return (
          <Tarjeta key={kit.id} className="flex flex-col gap-4 p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-10 items-center justify-center rounded-[10px] bg-primary-soft text-primary"><Layers className="size-5" /></span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-semibold">{kit.nombre}</h2>
                <p className="text-xs text-muted-foreground">{kit.n_items} materiales{kit.descripcion ? ` · ${kit.descripcion}` : ''}</p>
              </div>
            </div>
            <p className={cn('text-[13px]', posibles === 0 ? 'font-medium text-destructive' : 'text-muted-foreground')}>
              {posibles === 0 ? 'Stock insuficiente para armar este kit.' : `Alcanza para ${posibles} ${posibles === 1 ? 'kit' : 'kits'}.`}
            </p>
            <div className="mt-auto">
              <DescontarKit
                kit={{ id: kit.id, nombre: kit.nombre }}
                items={items.map((i) => ({ materialId: i.material_id, codigo: i.codigo, nombre: i.nombre, unidad: i.unidad, cantidad: i.cantidad, stock: i.stock, minimo: i.stock_minimo }))}
              />
            </div>
          </Tarjeta>
        );
      })}
    </div>
  );
}
