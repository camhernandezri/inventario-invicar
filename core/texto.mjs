/** Quita tildes y pasa a minúsculas, para buscar "lamina" y encontrar "Lámina". */
export function plegar(s) {
  if (s === null || s === undefined) return '';
  return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
