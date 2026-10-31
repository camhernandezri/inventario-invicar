import { notFound } from 'next/navigation';
import { FormularioKit } from '@/components/formulario-kit';
import { EncabezadoPagina, Tarjeta } from '@/components/ui/tarjeta';
import { requerirAdminPagina } from '@/lib/auth';
import { materialesActivos, obtenerKit } from '@/lib/inventario';

export const metadata = { title: 'Editar kit · Invicar' };

export default async function EditarKitPage({ params }: { params: Promise<{ id: string }> }) {
  await requerirAdminPagina();
  const { id } = await params;
  const datos = obtenerKit(Number(id));
  if (!datos) notFound();
  const materiales = materialesActivos().map(({ id, codigo, nombre, unidad, stock }) => ({ id, codigo, nombre, unidad, stock }));
  return (
    <>
      <EncabezadoPagina titulo="Editar kit" subtitulo={datos.kit.nombre} />
      <Tarjeta className="p-6">
        <FormularioKit
          materiales={materiales}
          kit={{
            id: datos.kit.id, nombre: datos.kit.nombre, descripcion: datos.kit.descripcion,
            items: datos.items.map((i) => ({ material_id: i.material_id, cantidad: i.cantidad })),
          }}
        />
      </Tarjeta>
    </>
  );
}
