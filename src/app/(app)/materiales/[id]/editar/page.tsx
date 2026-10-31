import { notFound } from 'next/navigation';
import { FormularioMaterial } from '@/components/formulario-material';
import { EncabezadoPagina, Tarjeta } from '@/components/ui/tarjeta';
import { requerirAdminPagina } from '@/lib/auth';
import { categorias, obtenerMaterial, unidadesUsadas } from '@/lib/inventario';

export const metadata = { title: 'Editar material · Invicar' };

export default async function EditarMaterialPage({ params }: { params: Promise<{ id: string }> }) {
  await requerirAdminPagina();
  const { id } = await params;
  const material = obtenerMaterial(Number(id));
  if (!material) notFound();
  return (
    <>
      <EncabezadoPagina titulo="Editar material" subtitulo={`${material.codigo} · ${material.nombre}`} />
      <Tarjeta className="p-6">
        <FormularioMaterial material={material} categorias={categorias()} unidades={unidadesUsadas()} />
      </Tarjeta>
    </>
  );
}
