import { FormularioMovimiento } from '@/components/formulario-movimiento';
import { EncabezadoPagina, Tarjeta } from '@/components/ui/tarjeta';
import { requerirAdminPagina } from '@/lib/auth';
import { materialesActivos } from '@/lib/inventario';

export const metadata = { title: 'Registrar entrada · Invicar' };

export default async function EntradasPage() {
  await requerirAdminPagina();
  return (
    <>
      <EncabezadoPagina titulo="Registrar entrada" subtitulo="Suma material que llegó (compra o devolución) o corrige el stock con un ajuste." />
      <Tarjeta className="p-6">
        <FormularioMovimiento
          tipos={['ENTRADA', 'AJUSTE']}
          materiales={materialesActivos().map(({ id, codigo, nombre, unidad, stock }) => ({ id, codigo, nombre, unidad, stock }))}
        />
      </Tarjeta>
    </>
  );
}
