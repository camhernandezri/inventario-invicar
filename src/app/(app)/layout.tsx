import { MarcoApp } from '@/components/marco-app';
import { requerirUsuario } from '@/lib/auth';
import { contarAlertas } from '@/lib/inventario';

export const dynamic = 'force-dynamic';

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const usuario = await requerirUsuario();
  return (
    <MarcoApp nombre={usuario.nombre} rol={usuario.rol} alertas={contarAlertas()}>
      {children}
    </MarcoApp>
  );
}
