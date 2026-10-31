import { CircleCheck } from 'lucide-react';
import { redirect } from 'next/navigation';
import { loginAction } from '@/app/acciones';
import { FormularioAccion } from '@/components/formulario-accion';
import { Field, Input } from '@/components/ui/campos';
import { usuarioActual } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ingresar · Invicar' };

export default async function LoginPage() {
  if (await usuarioActual()) redirect('/');

  return (
    <div className="flex min-h-screen">
      <section className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-sidebar p-16 lg:flex">
        <div aria-hidden className="absolute -top-32 -left-28 size-[380px] rounded-full bg-primary/10" />
        <div aria-hidden className="absolute -right-24 -bottom-40 size-[620px] rounded-full bg-primary/20" />

        <div className="relative flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-[22px] font-bold text-primary-foreground">I</span>
          <span className="text-[22px] font-semibold text-primary-foreground">Invicar</span>
        </div>

        <div className="relative flex flex-col gap-5">
          <h1 className="text-[44px] leading-[50px] font-bold tracking-[-0.04em] text-primary-foreground">
            Control de inventario
            <br />
            para carrocerías.
          </h1>
          <p className="max-w-[460px] text-base leading-6 text-sidebar-foreground">
            Materiales, kits por chasis y alertas de stock en un solo lugar.
          </p>
          <ul className="mt-2 flex flex-col gap-2.5 text-sm text-sidebar-foreground">
            {['Alertas automáticas de stock bajo', 'Descuento de materiales por kit (ej. Chasis 1)', 'Historial completo de movimientos'].map((t) => (
              <li key={t} className="flex items-center gap-2.5">
                <CircleCheck className="size-[18px] text-blue-400" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-sidebar-muted">Acceso exclusivo para personal autorizado.</p>
      </section>

      <section className="flex flex-1 flex-col items-center justify-center gap-6 p-4 sm:p-6">
        <div className="flex items-center gap-3 lg:hidden">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-xl font-bold text-primary-foreground">I</span>
          <span className="text-xl font-semibold">Invicar</span>
        </div>
        <div className="w-full max-w-[420px] rounded-xl border border-border bg-card p-6 shadow-[0_1px_3px_rgba(15,23,42,0.07)] sm:p-9">
          <h2 className="text-[26px] font-semibold tracking-tight">Iniciar sesión</h2>
          <p className="mt-1.5 mb-6 text-sm text-muted-foreground">Ingresa con tu usuario de Invicar.</p>
          <FormularioAccion accion={loginAction} etiqueta="Ingresar" anchoCompleto>
            <Field label="Usuario">
              <Input name="usuario" autoComplete="username" autoFocus required maxLength={60} className="h-11" />
            </Field>
            <Field label="Contraseña">
              <Input name="password" type="password" autoComplete="current-password" required className="h-11" />
            </Field>
          </FormularioAccion>
          <p className="mt-5 text-center text-xs text-muted-foreground">
            ¿Problemas para ingresar? Contacta al encargado del sistema.
          </p>
        </div>
      </section>
    </div>
  );
}
