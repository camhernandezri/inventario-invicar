/** Error esperado: se muestra tal cual al usuario. */
export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserError';
  }
}

/** El usuario no tiene permiso para la acción. */
export class AuthError extends UserError {
  constructor(message = 'Tu usuario es de solo lectura y no puede hacer este cambio.') {
    super(message);
    this.name = 'AuthError';
  }
}
