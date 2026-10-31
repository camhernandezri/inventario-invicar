import Link from 'next/link';
import { botonClases } from '@/components/ui/button';
import { qs } from '@/lib/params';

export function Paginacion({
  base, params, page, total, pageSize,
}: { base: string; params: Record<string, string | undefined>; page: number; total: number; pageSize: number }) {
  const paginas = Math.max(1, Math.ceil(total / pageSize));
  if (paginas <= 1) return null;
  const href = (p: number) => `${base}${qs({ ...params, page: p > 1 ? p : undefined })}`;
  return (
    <nav aria-label="Paginación" className="flex items-center justify-between border-t border-border px-5 py-3 text-sm">
      <span className="text-muted-foreground">Página {page} de {paginas}</span>
      <div className="flex gap-2">
        {page > 1 ? <Link href={href(page - 1)} className={botonClases('outline', 'sm')}>Anterior</Link> : <span className={botonClases('outline', 'sm')} aria-disabled>Anterior</span>}
        {page < paginas ? <Link href={href(page + 1)} className={botonClases('outline', 'sm')}>Siguiente</Link> : <span className={botonClases('outline', 'sm')} aria-disabled>Siguiente</span>}
      </div>
    </nav>
  );
}
