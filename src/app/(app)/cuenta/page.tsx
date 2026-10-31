import { cambiarPasswordAction, restablecerPasswordConsultaAction } from '@/app/acciones';
import { FormularioAccion } from '@/components/formulario-accion';
import { Field, Input } from '@/components/ui/campos';
import { EncabezadoPagina, Tarjeta, TarjetaCabecera } from '@/components/ui/tarjeta';
import { requerirUsuario } from '@/lib/auth';

export const metadata = { title: 'Mi cuenta · Invicar' };

export default async function CuentaPage() {
  const u = await requerirUsuario();
  return (
    <>
      <EncabezadoPagina titulo="Mi cuenta" subtitulo={`${u.nombre} · usuario «${u.usuario}» · ${u.rol === 'ADMIN' ? 'puede editar el inventario' : 'solo lectura'}`} />

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Tarjeta>
          <TarjetaCabecera titulo="Cambiar mi contraseña" />
          <div className="p-5">
            <FormularioAccion accion={cambiarPasswordAction} etiqueta="Cambiar contraseña" limpiarAlExito>
              <Field label="Contraseña actual"><Input name="actual" type="password" autoComplete="current-password" required /></Field>
              <Field label="Nueva contraseña" hint="Mínimo 8 caracteres."><Input name="nueva" type="password" autoComplete="new-password" required minLength={8} /></Field>
              <Field label="Confirmar nueva contraseña"><Input name="confirmar" type="password" autoComplete="new-password" required minLength={8} /></Field>
            </FormularioAccion>
          </div>
        </Tarjeta>

        {u.rol === 'ADMIN' && (
          <Tarjeta>
            <TarjetaCabecera titulo="Contraseña del usuario de solo lectura" />
            <div className="p-5">
              <p className="mb-4 text-sm text-muted-foreground">
                Define una nueva contraseña para el usuario de la secretaria. Si estaba conectada, su sesión se cerrará.
              </p>
              <FormularioAccion accion={restablecerPasswordConsultaAction} etiqueta="Guardar nueva contraseña" limpiarAlExito>
                <Field label="Nueva contraseña" hint="Mínimo 8 caracteres."><Input name="nueva" type="password" autoComplete="new-password" required minLength={8} /></Field>
                <Field label="Confirmar nueva contraseña"><Input name="confirmar" type="password" autoComplete="new-password" required minLength={8} /></Field>
              </FormularioAccion>
            </div>
          </Tarjeta>
        )}
      </div>
    </>
  );
}
