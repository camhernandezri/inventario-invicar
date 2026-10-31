/** CSV pensado para Excel en español: separador ";" y BOM UTF-8. */
export function aCsv(encabezados: string[], filas: (string | number | null | undefined)[][]): string {
  const esc = (v: string | number | null | undefined) => {
    let s = v === null || v === undefined ? '' : String(v);
    // Evita que Excel interprete texto como fórmula.
    if (/^[=+\-@]/.test(s) && Number.isNaN(Number(s))) s = "'" + s;
    return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lineas = [encabezados, ...filas].map((f) => f.map(esc).join(';'));
  return '\uFEFF' + lineas.join('\r\n') + '\r\n';
}
