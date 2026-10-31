import { LinkButton } from '@/components/ui/button';

export default function NoEncontrado() {
  return (
    <div className="mx-auto mt-24 flex max-w-md flex-col items-center gap-3 text-center">
      <h1 className="text-xl font-semibold">Página no encontrada</h1>
      <p className="text-sm text-muted-foreground">La dirección no existe o el registro fue eliminado.</p>
      <LinkButton href="/">Volver al panel</LinkButton>
    </div>
  );
}
