export type Nivel = 'ok' | 'low' | 'crit';

export interface EstadoStock {
  nivel: Nivel;
  label: string;
}

/**
 * Estado de un material según su stock:
 *  - Crítico: stock en la mitad del mínimo o menos (o agotado)
 *  - Stock bajo: stock en el mínimo o menos
 *  - Disponible: por encima del mínimo
 */
export function estadoStock(stock: number, minimo: number): EstadoStock {
  if (stock <= 0) return { nivel: 'crit', label: 'Agotado' };
  if (stock <= minimo * 0.5) return { nivel: 'crit', label: 'Crítico' };
  if (stock <= minimo) return { nivel: 'low', label: 'Stock bajo' };
  return { nivel: 'ok', label: 'Disponible' };
}
