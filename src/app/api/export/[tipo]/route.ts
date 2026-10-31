import { usuarioActual } from '@/lib/auth';
import { aCsv } from '@/lib/csv';
import { exportarMateriales, exportarMovimientos, type FiltroMateriales } from '@/lib/inventario';
import { entero, uno } from '@/lib/params';
import { estadoStock } from '@/lib/estado';
import { esFechaISO, fmtFechaHora, hoyColombia } from '@/lib/util';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ tipo: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return new Response('No autorizado', { status: 401 });

  const { tipo } = await params;
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const hoy = hoyColombia();
  let csv: string;

  if (tipo === 'materiales') {
    const estados = ['alerta', 'bajo', 'critico', 'ok'];
    const filtro: FiltroMateriales = {
      q: uno(sp, 'q'),
      categoria: uno(sp, 'categoria'),
      estado: (estados.includes(uno(sp, 'estado')) ? uno(sp, 'estado') : 'todos') as FiltroMateriales['estado'],
      inactivos: usuario.rol === 'ADMIN' && uno(sp, 'inactivos') === '1',
    };
    // Los precios solo los ve el encargado: el usuario de solo lectura descarga el CSV sin costos.
    const verCostos = usuario.rol === 'ADMIN';
    csv = aCsv(
      ['Código', 'Material', 'Categoría', 'Unidad', 'Stock', 'Stock mínimo', ...(verCostos ? ['Costo unitario', 'Valor en stock'] : []), 'Estado', 'Activo'],
      exportarMateriales(filtro).map((m) => [
        m.codigo, m.nombre, m.categoria, m.unidad, m.stock, m.stock_minimo,
        ...(verCostos ? [m.costo_unitario, Math.round(m.stock * m.costo_unitario * 100) / 100] : []),
        estadoStock(m.stock, m.stock_minimo).label, m.activo ? 'Sí' : 'No',
      ]),
    );
  } else if (tipo === 'historial') {
    csv = aCsv(
      ['Fecha y hora', 'Tipo', 'Código', 'Material', 'Cantidad', 'Unidad', 'Stock resultante', 'Kit', 'Cant. kits', 'Motivo', 'Referencia', 'Usuario', 'Anulado'],
      exportarMovimientos({
        q: uno(sp, 'q'), tipo: uno(sp, 'tipo'), usuarioId: entero(uno(sp, 'usuario')) || undefined,
        desde: esFechaISO(uno(sp, 'desde')) ? uno(sp, 'desde') : undefined,
        hasta: esFechaISO(uno(sp, 'hasta')) ? uno(sp, 'hasta') : undefined,
      }).map((m) => [fmtFechaHora(m.creado_en), m.tipo, m.material_codigo, m.material_nombre, m.cantidad, m.unidad, m.stock_resultante, m.kit_nombre, m.kit_cantidad, m.motivo, m.referencia, m.usuario_nombre, m.anulado ? 'Sí' : 'No']),
    );
  } else {
    return new Response('No encontrado', { status: 404 });
  }

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="invicar-${tipo}-${hoy}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
