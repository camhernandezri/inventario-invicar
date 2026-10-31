export type Rol = 'ADMIN' | 'CONSULTA';

export interface Usuario {
  id: number;
  usuario: string;
  nombre: string;
  rol: Rol;
}

export interface Material {
  id: number;
  codigo: string;
  nombre: string;
  categoria: string;
  unidad: string;
  stock: number;
  stock_minimo: number;
  costo_unitario: number;
  activo: number;
  creado_en: string;
  actualizado_en: string;
}

export interface Kit {
  id: number;
  nombre: string;
  descripcion: string;
  activo: number;
  creado_en: string;
}

export interface KitResumen extends Kit {
  n_items: number;
  costo: number;
}

export interface ItemKit {
  material_id: number;
  codigo: string;
  nombre: string;
  unidad: string;
  cantidad: number;
  stock: number;
  stock_minimo: number;
  costo_unitario: number;
  activo: number;
}

export type TipoMovimiento = 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'ANULACION';

export interface Movimiento {
  id: number;
  lote: string;
  creado_en: string;
  tipo: TipoMovimiento;
  material_codigo: string;
  material_nombre: string;
  unidad: string;
  cantidad: number;
  stock_resultante: number;
  motivo: string;
  referencia: string;
  kit_nombre: string | null;
  kit_cantidad: number | null;
  usuario_nombre: string;
  anulado: number;
  revierte_lote: string | null;
  es_primero: number;
  n_lote: number;
}

export type Resultado = {
  ok?: boolean;
  error?: string;
  mensaje?: string;
  redirectTo?: string;
};
