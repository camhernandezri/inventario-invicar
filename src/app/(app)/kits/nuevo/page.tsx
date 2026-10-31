import { FormularioKit } from '@/components/formulario-kit';
import { EncabezadoPagina, Tarjeta } from '@/components/ui/tarjeta';
import { requerirAdminPagina } from '@/lib/auth';
import { materialesActivos } from '@/lib/inventario';

export const metadata = { title: 'Nuevo kit · Invicar' };

export default async function NuevoKitPage() {
  await requerirAdminPagina();
  const materiales = materialesActivos().map(({ id, codigo, nombre, unidad, stock }) => ({ id, codigo, nombre, unidad, stock }));
  return (
    <>
      <EncabezadoPagina titulo="Nuevo kit" subtitulo="Define los materiales que se descuentan juntos, por ejemplo para un chasis." />
      <Tarjeta className="p-6">
        <FormularioKit materiales={materiales} />
      </Tarjeta>
    </>
  );
}
