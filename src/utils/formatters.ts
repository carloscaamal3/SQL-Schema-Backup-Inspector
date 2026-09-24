// Helper to detect if a column represents a fiscal year (SP_EJERCICIO, SP_EJERICIO), identifier, or code
export function isYearOrIdColumn(columnName: string, value?: any): boolean {
  if (!columnName) return false;
  const lower = columnName.toLowerCase().trim();

  // Explicit SP_EJERCICIO, SP_EJERICIO, EJERCICIO, ANIO, AÑO, YEAR, PERIODO_ANIO
  if (/sp_?ejer[c]?icio|ejercicio|ejericio|periodo_anio|anio|año|^year$/i.test(lower)) {
    return true;
  }

  // ID columns or codes (IDs must never be formatted with commas: e.g. ID 2024, not 2,024)
  if (lower === 'id' || lower.endsWith('_id') || lower.startsWith('id_') || lower === 'codigo' || lower === 'periodo_mes') {
    return true;
  }

  // Numeric value in typical year range (1900-2100) on temporal/period/exercise column
  if (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1900 &&
    value <= 2100 &&
    /ejer|anio|ano|year|period|fiscal/i.test(lower)
  ) {
    return true;
  }

  return false;
}

// Format a cell value cleanly: prevent commas in SP_EJERCICIO, years, and IDs
export function formatCellValue(columnName: string, value: any): string {
  if (value === null || value === undefined) return 'NULL';

  if (typeof value === 'number') {
    // If it's a fiscal year (SP_EJERCICIO) or ID, format without thousand separators (2024, not 2,024)
    if (isYearOrIdColumn(columnName, value)) {
      return String(value);
    }
    return value.toLocaleString();
  }

  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }

  return String(value);
}
