import {
  TableSchema,
  DateFilter,
  ColumnFilter,
  FilterState,
} from '../types/sql';

export interface FilterResult {
  rows: Record<string, any>[];
  totalCount: number;
  filteredCount: number;
  filterSummary: string;
  hasActiveFilters: boolean;
  unmatchedReason?: string;
}

// Safely extract a 4-digit year from number, string, or Date without timezone shifts
export function extractYearFromValue(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;

  // Direct 4-digit integer (e.g. SP_EJERCICIO = 2024, 2025, 2026)
  if (typeof val === 'number') {
    if (val >= 1900 && val <= 2100) return Math.round(val);
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.getFullYear();
  }

  const str = String(val).trim();
  // Pure 4-digit year string: "2024", "2025"
  if (/^\d{4}$/.test(str)) {
    const num = Number(str);
    if (num >= 1900 && num <= 2100) return num;
  }

  // ISO / SQL date: "2024-02-15", "2024/02/15", "2024-02-15 10:30:00"
  // Extract regex prefix to prevent UTC to local timezone drift
  const dateMatch = str.match(/^(\d{4})[-\/\.]/);
  if (dateMatch) {
    const y = Number(dateMatch[1]);
    if (y >= 1900 && y <= 2100) return y;
  }

  // Fallback to JS Date
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.getFullYear();
  }

  return null;
}

// Extract parsed components (year, month, day, dateStr)
export function parseDateValue(val: any): { year: number; month: number; day: number; dateStr: string } | null {
  if (val === null || val === undefined || val === '') return null;

  // If pure year number (SP_EJERCICIO = 2024)
  if (typeof val === 'number' && val >= 1900 && val <= 2100) {
    const yr = Math.round(val);
    return { year: yr, month: 1, day: 1, dateStr: `${yr}-01-01` };
  }

  const str = String(val).trim();
  if (/^\d{4}$/.test(str)) {
    const yr = Number(str);
    return { year: yr, month: 1, day: 1, dateStr: `${yr}-01-01` };
  }

  // Regex parse YYYY-MM-DD or YYYY/MM/DD to avoid timezone distortion
  const match = str.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { year, month, day, dateStr };
  }

  // Fallback to standard JS Date
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { year, month, day, dateStr };
  }

  return null;
}

// Evaluate date condition for a row
export function matchDateFilter(rowValue: any, filter: DateFilter): boolean {
  if (!filter.enabled || !filter.column) return true;
  if (filter.periodType === 'all') return true;

  // 1. Direct Year / SP_EJERCICIO matching
  if (filter.periodType === 'year') {
    if (filter.year === undefined || filter.year === null) return true;
    const targetYear = Number(filter.year);

    // Direct numeric / string comparison for SP_EJERCICIO or SP_EJERICIO column
    if (Number(rowValue) === targetYear) return true;
    if (String(rowValue).trim() === String(targetYear)) return true;

    // Extracted year from timestamp/date
    const extractedYear = extractYearFromValue(rowValue);
    return extractedYear === targetYear;
  }

  // 2. Component-based matching (quarter, month, day, range)
  const parsed = parseDateValue(rowValue);
  if (!parsed) return false;

  const { year, month, dateStr } = parsed;

  switch (filter.periodType) {
    case 'quarter': {
      const q = Math.ceil(month / 3);
      const matchesQ = filter.quarter !== undefined ? q === Number(filter.quarter) : true;
      const matchesY = filter.year !== undefined && filter.year !== 0 ? year === Number(filter.year) : true;
      return matchesQ && matchesY;
    }

    case 'month': {
      const matchesM = filter.month !== undefined ? month === Number(filter.month) : true;
      const matchesY = filter.year !== undefined && filter.year !== 0 ? year === Number(filter.year) : true;
      return matchesM && matchesY;
    }

    case 'day':
      return filter.specificDate ? dateStr === filter.specificDate : true;

    case 'range': {
      if (filter.startDate && filter.endDate) {
        return dateStr >= filter.startDate && dateStr <= filter.endDate;
      }
      if (filter.startDate) {
        return dateStr >= filter.startDate;
      }
      if (filter.endDate) {
        return dateStr <= filter.endDate;
      }
      return true;
    }

    default:
      return true;
  }
}

// Evaluate single column condition
export function matchColumnFilter(rowValue: any, filter: ColumnFilter): boolean {
  if (!filter.column || !filter.operator) return true;

  const isNull = rowValue === null || rowValue === undefined;

  if (filter.operator === 'IS NULL') return isNull;
  if (filter.operator === 'IS NOT NULL') return !isNull;

  if (isNull) return false;

  const valStr = String(rowValue).toLowerCase().trim();
  const filterValStr = (filter.value || '').toLowerCase().trim();
  const numRowVal = Number(rowValue);
  const numFilterVal = Number(filter.value);
  const isNumericComp = !isNaN(numRowVal) && !isNaN(numFilterVal) && filter.value !== '';

  switch (filter.operator) {
    case '=':
      if (isNumericComp) return numRowVal === numFilterVal;
      return valStr === filterValStr;

    case '!=':
      if (isNumericComp) return numRowVal !== numFilterVal;
      return valStr !== filterValStr;

    case 'LIKE':
      return valStr.includes(filterValStr);

    case 'NOT LIKE':
      return !valStr.includes(filterValStr);

    case '>':
      return isNumericComp ? numRowVal > numFilterVal : valStr > filterValStr;

    case '<':
      return isNumericComp ? numRowVal < numFilterVal : valStr < filterValStr;

    case '>=':
      return isNumericComp ? numRowVal >= numFilterVal : valStr >= filterValStr;

    case '<=':
      return isNumericComp ? numRowVal <= numFilterVal : valStr <= filterValStr;

    case 'BETWEEN': {
      const numSecondary = Number(filter.valueSecondary);
      if (isNumericComp && !isNaN(numSecondary)) {
        const min = Math.min(numFilterVal, numSecondary);
        const max = Math.max(numFilterVal, numSecondary);
        return numRowVal >= min && numRowVal <= max;
      }
      // String or date between
      const secStr = (filter.valueSecondary || '').toLowerCase().trim();
      return valStr >= filterValStr && valStr <= secStr;
    }

    case 'IN': {
      const list = filterValStr
        .split(',')
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
      return list.includes(valStr);
    }

    default:
      return true;
  }
}

// Main execution function
export function applyFilters(
  table: TableSchema,
  filters: FilterState
): FilterResult {
  const { searchQuery, dateFilter, columnFilters } = filters;
  const initialRows = table.rows || [];

  const summaryParts: string[] = [];

  // 1. Search Query
  const trimmedSearch = searchQuery.trim().toLowerCase();
  if (trimmedSearch) {
    summaryParts.push(`Búsqueda: "${trimmedSearch}"`);
  }

  // 2. Date Filter
  if (dateFilter.enabled && dateFilter.column) {
    switch (dateFilter.periodType) {
      case 'year':
        summaryParts.push(`Año: ${dateFilter.year} (${dateFilter.column})`);
        break;
      case 'quarter':
        summaryParts.push(
          `Trimestre: T${dateFilter.quarter}${dateFilter.year ? ' ' + dateFilter.year : ''} (${dateFilter.column})`
        );
        break;
      case 'month': {
        const months = [
          'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
        ];
        const mName = dateFilter.month ? months[dateFilter.month - 1] : '';
        summaryParts.push(`Mes: ${mName}${dateFilter.year ? ' ' + dateFilter.year : ''} (${dateFilter.column})`);
        break;
      }
      case 'day':
        summaryParts.push(`Día: ${dateFilter.specificDate} (${dateFilter.column})`);
        break;
      case 'range':
        summaryParts.push(
          `Rango: ${dateFilter.startDate || 'Inicio'} a ${dateFilter.endDate || 'Fin'} (${dateFilter.column})`
        );
        break;
    }
  }

  // 3. Column filters
  for (const cf of columnFilters) {
    if (cf.column && (cf.value || cf.operator === 'IS NULL' || cf.operator === 'IS NOT NULL')) {
      if (cf.operator === 'BETWEEN') {
        summaryParts.push(`${cf.column} ENTRE '${cf.value}' Y '${cf.valueSecondary}'`);
      } else if (cf.operator === 'IS NULL' || cf.operator === 'IS NOT NULL') {
        summaryParts.push(`${cf.column} ${cf.operator}`);
      } else {
        summaryParts.push(`${cf.column} ${cf.operator} '${cf.value}'`);
      }
    }
  }

  const hasActiveFilters = summaryParts.length > 0;

  // Filtering
  const filtered = initialRows.filter((row) => {
    // Check global search query
    if (trimmedSearch) {
      const match = Object.values(row).some((val) => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(trimmedSearch);
      });
      if (!match) return false;
    }

    // Check date filter
    if (dateFilter.enabled && dateFilter.column) {
      const rowVal = row[dateFilter.column];
      if (!matchDateFilter(rowVal, dateFilter)) return false;
    }

    // Check column filters
    for (const cf of columnFilters) {
      if (!cf.column) continue;
      const rowVal = row[cf.column];
      if (!matchColumnFilter(rowVal, cf)) return false;
    }

    return true;
  });

  let unmatchedReason: string | undefined;
  if (filtered.length === 0 && initialRows.length > 0) {
    unmatchedReason = `No se encontraron registros en la tabla '${table.name}' que satisfagan simultáneamente los criterios aplicados (${summaryParts.join(' Y ')}). Verifique que los valores o rangos de fecha existan en el respaldo.`;
  }

  return {
    rows: filtered,
    totalCount: initialRows.length,
    filteredCount: filtered.length,
    filterSummary: hasActiveFilters ? summaryParts.join(' | ') : 'Sin filtros aplicados (Todos los registros)',
    hasActiveFilters,
    unmatchedReason,
  };
}
