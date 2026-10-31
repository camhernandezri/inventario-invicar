export function hashPassword(password: string): Promise<string>;
export function verifyPassword(password: string, guardado: string): Promise<boolean>;
export function validarPassword(password: unknown): string | null;
