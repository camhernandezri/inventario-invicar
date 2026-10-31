import { FormularioMaterial } from '@/components/formulario-material';
import { EncabezadoPagina, Tarjeta } from '@/components/ui/tarjeta';
import { requerirAdminPagina } from '@/lib/auth';
import { categorias, unidadesUsadas } from '@/lib/inventario';

export const metadata = { title: 'Nuevo material · Invicar' };

export default async function NuevoMaterialPage() {
  await requerirAdminPagina();
  return (
    <>
      <EncabezadoPagina titulo="Nuevo material" subtitulo="Registra un material del inventario." />
      <Tarjeta className="p-6">
        <FormularioMaterial categorias={categorias()} unidades={unidadesUsadas()} />
      </Tarjeta>
    </>
  );
}
