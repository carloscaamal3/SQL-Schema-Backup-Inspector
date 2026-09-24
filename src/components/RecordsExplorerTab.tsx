import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Filter,
  Search,
  RotateCcw,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Download,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ArrowUpDown,
  Table as TableIcon,
  Check,
  Code2,
  Sparkles,
} from 'lucide-react';
import {
  TableSchema,
  FilterState,
  ColumnFilter,
  FilterOperator,
  DatePeriodType,
  ParsedSQLBackup,
  SQLDialect,
} from '../types/sql';
import { applyFilters, extractYearFromValue } from '../utils/filterEngine';
import { isYearOrIdColumn, formatCellValue } from '../utils/formatters';
import { generateQueriesFromSelectedRows } from '../utils/recordQueryGenerator';
import { RowQueryGeneratorModal } from './RowQueryGeneratorModal';

interface RecordsExplorerTabProps {
  backup: ParsedSQLBackup;
  activeTableName: string;
  onSelectTable: (tableName: string) => void;
  filters: FilterState;
  onUpdateFilters: (newFilters: FilterState) => void;
}

export const RecordsExplorerTab: React.FC<RecordsExplorerTabProps> = ({
  backup,
  activeTableName,
  onSelectTable,
  filters,
  onUpdateFilters,
}) => {
  const tableNames = Object.keys(backup.tables);
  const activeTable = backup.tables[activeTableName] || backup.tables[tableNames[0]];

  const [maskSensitive, setMaskSensitive] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  // Identify prioritized candidate columns for date & fiscal exercise (SP_EJERCICIO / SP_EJERICIO)
  const candidateColumns = useMemo(() => {
    if (!activeTable) return [];
    const exerciseCols = activeTable.columns
      .filter((c) => /sp_?ejer[c]?icio|ejercicio|ejericio/i.test(c.name))
      .map((c) => c.name);
    const dateCols = activeTable.dateColumns.filter((c) => !exerciseCols.includes(c));
    const otherCols = activeTable.columns
      .map((c) => c.name)
      .filter((c) => !exerciseCols.includes(c) && !dateCols.includes(c));
    return [...exerciseCols, ...dateCols, ...otherCols];
  }, [activeTable]);

  // Active date/exercise column
  const activeFilterCol = filters.dateFilter.column || candidateColumns[0] || '';
  const isEjercicioActive = /sp_?ejer[c]?icio|ejercicio|ejericio/i.test(activeFilterCol);

  // Detect available years from date and fiscal exercise (SP_EJERCICIO) columns
  const detectedYears = useMemo(() => {
    if (!activeTable || activeTable.rows.length === 0) {
      return [2026, 2025, 2024, 2023, 2022, 2021, 2020];
    }
    const years = new Set<number>();
    const dateCol = filters.dateFilter.column || candidateColumns[0];

    // Scan primary selected filter column
    if (dateCol) {
      for (const r of activeTable.rows) {
        const yr = extractYearFromValue(r[dateCol]);
        if (yr && yr >= 1900 && yr <= 2100) {
          years.add(yr);
        }
      }
    }

    // Fallback: check if table has an explicit SP_EJERCICIO / SP_EJERICIO column
    if (years.size === 0) {
      const ejerCol = activeTable.columns.find((c) =>
        /sp_?ejer[c]?icio|ejercicio|ejericio/i.test(c.name)
      )?.name;
      if (ejerCol) {
        for (const r of activeTable.rows) {
          const yr = extractYearFromValue(r[ejerCol]);
          if (yr && yr >= 1900 && yr <= 2100) {
            years.add(yr);
          }
        }
      }
    }

    // Fallback: check all date columns
    if (years.size === 0) {
      for (const col of activeTable.dateColumns) {
        for (const r of activeTable.rows) {
          const yr = extractYearFromValue(r[col]);
          if (yr && yr >= 1900 && yr <= 2100) {
            years.add(yr);
          }
        }
        if (years.size > 0) break;
      }
    }

    const arr = Array.from(years).sort((a, b) => b - a);
    return arr.length > 0 ? arr : [2026, 2025, 2024, 2023, 2022, 2021, 2020];
  }, [activeTable, filters.dateFilter.column, candidateColumns]);

  // Execute filtering
  const filterResult = useMemo(() => {
    if (!activeTable) {
      return {
        rows: [],
        totalCount: 0,
        filteredCount: 0,
        filterSummary: '',
        hasActiveFilters: false,
      };
    }
    return applyFilters(activeTable, filters);
  }, [activeTable, filters]);

  // Sorting
  const sortedRows = useMemo(() => {
    if (!sortColumn) return filterResult.rows;
    return [...filterResult.rows].sort((a, b) => {
      const valA = a[sortColumn];
      const valB = b[sortColumn];

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      return sortDirection === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [filterResult.rows, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedRows.length / rowsPerPage) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sortedRows.slice(start, start + rowsPerPage);
  }, [sortedRows, currentPage, rowsPerPage]);

  const handleSort = (colName: string) => {
    if (sortColumn === colName) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
      }
    } else {
      setSortColumn(colName);
      setSortDirection('asc');
    }
  };

  // Row selection for SQL generation (Checkboxes)
  const [selectedRowIndices, setSelectedRowIndices] = useState<Set<number>>(new Set());
  const [isRowQueryModalOpen, setIsRowQueryModalOpen] = useState(false);
  const [quickQueryType, setQuickQueryType] = useState<string>('crud-insert');
  const [quickDialect, setQuickDialect] = useState<SQLDialect>(backup.detectedDialect || 'postgresql');

  // Clear selections when table or filters change
  useEffect(() => {
    setSelectedRowIndices(new Set());
  }, [activeTableName, filters]);

  // Map selected global indices to actual row objects
  const selectedRowsData = useMemo(() => {
    const list: Record<string, any>[] = [];
    selectedRowIndices.forEach((idx) => {
      if (sortedRows[idx] !== undefined) {
        list.push(sortedRows[idx]);
      }
    });
    return list;
  }, [sortedRows, selectedRowIndices]);

  // Quick copy handler directly from toolbar
  const handleQuickCopy = () => {
    if (selectedRowsData.length === 0 || !activeTable) return;
    const generated = generateQueriesFromSelectedRows(activeTable, selectedRowsData, quickDialect);
    const target = generated.find((q) => q.id === quickQueryType) || generated[0];
    if (target) {
      navigator.clipboard.writeText(target.sql);
      setCopiedNotification(`¡Consulta '${target.title}' copiada al portapapeles!`);
      setTimeout(() => setCopiedNotification(null), 2500);
    }
  };

  // Current page indices (0-indexed relative to sortedRows)
  const currentPageIndices = useMemo(() => {
    return paginatedRows.map((_, i) => (currentPage - 1) * rowsPerPage + i);
  }, [paginatedRows, currentPage, rowsPerPage]);

  const isAllCurrentPageSelected =
    currentPageIndices.length > 0 &&
    currentPageIndices.every((i) => selectedRowIndices.has(i));

  const toggleSelectAllCurrentPage = () => {
    setSelectedRowIndices((prev) => {
      const next = new Set(prev);
      if (isAllCurrentPageSelected) {
        currentPageIndices.forEach((i) => next.delete(i));
      } else {
        currentPageIndices.forEach((i) => next.add(i));
      }
      return next;
    });
  };

  const toggleRowSelection = (index: number) => {
    setSelectedRowIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const openGeneratorForSingleRow = (index: number) => {
    setSelectedRowIndices(new Set([index]));
    setIsRowQueryModalOpen(true);
  };

  // Helper for quick date presets
  const applyDatePreset = (preset: {
    periodType: DatePeriodType;
    year?: number;
    quarter?: number;
    month?: number;
  }) => {
    const dateCol = filters.dateFilter.column || activeTable.dateColumns[0];
    onUpdateFilters({
      ...filters,
      dateFilter: {
        enabled: true,
        column: dateCol,
        periodType: preset.periodType,
        year: preset.year,
        quarter: preset.quarter,
        month: preset.month,
      },
    });
    setCurrentPage(1);
  };

  const handleAddColumnFilter = () => {
    const availableCol = activeTable.columns[0]?.name || '';
    const newFilter: ColumnFilter = {
      id: `filter-${Date.now()}`,
      column: availableCol,
      operator: '=',
      value: '',
    };
    onUpdateFilters({
      ...filters,
      columnFilters: [...filters.columnFilters, newFilter],
    });
  };

  const handleUpdateColumnFilter = (id: string, updates: Partial<ColumnFilter>) => {
    onUpdateFilters({
      ...filters,
      columnFilters: filters.columnFilters.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    });
    setCurrentPage(1);
  };

  const handleRemoveColumnFilter = (id: string) => {
    onUpdateFilters({
      ...filters,
      columnFilters: filters.columnFilters.filter((f) => f.id !== id),
    });
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    onUpdateFilters({
      searchQuery: '',
      dateFilter: {
        enabled: false,
        column: activeTable?.dateColumns[0] || '',
        periodType: 'all',
      },
      columnFilters: [],
    });
    setCurrentPage(1);
    setSortColumn(null);
  };

  // Export functions
  const copyAsMarkdown = () => {
    if (!activeTable) return;
    const cols = activeTable.columns.map((c) => c.name);
    let md = `| ${cols.join(' | ')} |\n`;
    md += `| ${cols.map(() => ':---').join(' | ')} |\n`;

    for (const r of filterResult.rows) {
      const vals = cols.map((col) => {
        let v = r[col];
        if (v === null || v === undefined) return 'NULL';
        if (maskSensitive && activeTable.sensitiveColumns.includes(col)) return '[ENMASCARADO]';
        return formatCellValue(col, v).replace(/\|/g, '\\|');
      });
      md += `| ${vals.join(' | ')} |\n`;
    }

    navigator.clipboard.writeText(md);
    setCopiedNotification('¡Tabla Markdown copiada al portapapeles!');
    setTimeout(() => setCopiedNotification(null), 2500);
  };

  const exportAsCSV = () => {
    if (!activeTable) return;
    const cols = activeTable.columns.map((c) => c.name);
    let csv = cols.join(',') + '\n';

    for (const r of filterResult.rows) {
      const vals = cols.map((col) => {
        let v = r[col];
        if (v === null || v === undefined) return '';
        if (maskSensitive && activeTable.sensitiveColumns.includes(col)) return '"[ENMASCARADO]"';
        return `"${formatCellValue(col, v).replace(/"/g, '""')}"`;
      });
      csv += vals.join(',') + '\n';
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${activeTable.name}_filtrado.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!activeTable) {
    return (
      <div className="p-8 text-center text-slate-500">
        No hay tablas disponibles para explorar.
      </div>
    );
  }

  const hasDateColumns = activeTable.dateColumns.length > 0;

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {copiedNotification && (
        <div className="fixed bottom-6 right-6 z-50 p-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-2xl flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4" />
          <span>{copiedNotification}</span>
        </div>
      )}

      {/* Table Selector (SELECT) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 shrink-0">
            <TableIcon className="w-4 h-4 text-cyan-400" />
            <label htmlFor="active-table-select">Selector de Tabla Activa:</label>
          </div>
          <select
            id="active-table-select"
            value={activeTableName}
            onChange={(e) => {
              onSelectTable(e.target.value);
              setCurrentPage(1);
            }}
            className="flex-1 max-w-lg px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-cyan-300 font-mono text-xs font-bold focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 cursor-pointer transition-colors shadow-inner"
          >
            {tableNames.map((tableName) => {
              const tbl = backup.tables[tableName];
              const hasEjer = tbl.columns.some((c) => /sp_?ejer[c]?icio|ejercicio|ejericio/i.test(c.name));
              return (
                <option key={tableName} value={tableName}>
                  {tableName} ({tbl.rowCount.toLocaleString()} filas • {tbl.columns.length} cols) {hasEjer ? '— [Contiene SP_EJERCICIO]' : ''}
                </option>
              );
            })}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono self-end sm:self-auto">
          <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
            Tablas en respaldo: <strong className="text-white">{tableNames.length}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
            Registros en tabla: <strong className="text-cyan-400">{activeTable.rowCount.toLocaleString()}</strong>
          </span>
        </div>
      </div>

      {/* Filter Control Center */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 shadow-sm">
        {/* Search bar & quick actions */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => {
                onUpdateFilters({ ...filters, searchQuery: e.target.value });
                setCurrentPage(1);
              }}
              placeholder={`Buscar valores en '${activeTable.name}' (texto, números, estados)...`}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {filterResult.hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-medium cursor-pointer transition-colors"
                title="Limpiar todos los filtros"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer Filtros</span>
              </button>
            )}

            <button
              onClick={handleAddColumnFilter}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-semibold cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir Filtro de Columna</span>
            </button>
          </div>
        </div>

        {/* 1. ADVANCED TEMPORAL & SP_EJERCICIO FILTER BAR */}
        {candidateColumns.length > 0 && (
          <div className="p-3.5 rounded-xl border border-cyan-500/20 bg-cyan-950/10 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold text-slate-200">
                  {isEjercicioActive ? 'Filtrado por SP_EJERCICIO / Temporal:' : 'Filtrado Temporal / Ejercicio:'}
                </span>
                <select
                  value={activeFilterCol}
                  onChange={(e) => {
                    const newCol = e.target.value;
                    onUpdateFilters({
                      ...filters,
                      dateFilter: { ...filters.dateFilter, column: newCol, enabled: true },
                    });
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-cyan-300 font-mono text-xs font-semibold focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  {candidateColumns.map((col) => {
                    const isEjer = /sp_?ejer[c]?icio|ejercicio|ejericio/i.test(col);
                    const isDate = activeTable.dateColumns.includes(col);
                    return (
                      <option key={col} value={col}>
                        {isEjer ? `⭐ ${col} (SP_EJERCICIO)` : isDate ? `📅 ${col} (Fecha)` : `Columna: ${col}`}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Mode switch */}
              <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-slate-800 text-[11px] font-medium">
                {(
                  [
                    { id: 'all', label: 'Todo' },
                    { id: 'year', label: isEjercicioActive ? 'Por Año / SP_EJERCICIO' : 'Por Año' },
                    { id: 'quarter', label: 'Trimestre (Q)' },
                    { id: 'month', label: 'Por Mes' },
                    { id: 'day', label: 'Por Día' },
                    { id: 'range', label: 'Rango' },
                  ] as const
                ).map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => {
                      onUpdateFilters({
                        ...filters,
                        dateFilter: {
                          ...filters.dateFilter,
                          enabled: mode.id !== 'all',
                          periodType: mode.id,
                          column: activeFilterCol,
                          year: filters.dateFilter.year || detectedYears[0],
                          quarter: filters.dateFilter.quarter || 1,
                          month: filters.dateFilter.month || 1,
                        },
                      });
                      setCurrentPage(1);
                    }}
                    className={`px-2 py-1 rounded transition-colors ${
                      filters.dateFilter.periodType === mode.id
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic filter controls based on periodType - AÑO / SP_EJERCICIO COMO SELECT */}
            {filters.dateFilter.periodType === 'year' && (
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    Seleccionar Año / SP_EJERCICIO:
                  </span>
                  <select
                    value={filters.dateFilter.year || detectedYears[0] || ''}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      applyDatePreset({ periodType: 'year', year: val });
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-cyan-300 font-mono text-xs font-bold focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 cursor-pointer shadow-sm"
                  >
                    {detectedYears.map((yr) => {
                      return (
                        <option key={yr} value={yr}>
                          Año {yr} {isEjercicioActive ? `(SP_EJERCICIO = ${yr})` : `(Ejercicio ${yr})`}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="flex items-center gap-2 text-slate-400 text-[11px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                    Filtro activo:{' '}
                    <strong className="text-cyan-400">
                      {activeFilterCol} = {filters.dateFilter.year || detectedYears[0]}
                    </strong>
                  </span>
                  <span>({detectedYears.length} ejercicios disponibles)</span>
                </div>
              </div>
            )}

            {filters.dateFilter.periodType === 'quarter' && (
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Año:</span>
                  <select
                    value={filters.dateFilter.year || detectedYears[0]}
                    onChange={(e) =>
                      onUpdateFilters({
                        ...filters,
                        dateFilter: { ...filters.dateFilter, year: Number(e.target.value) },
                      })
                    }
                    className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono text-xs"
                  >
                    {detectedYears.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Trimestre:</span>
                  {[
                    { q: 1, label: 'T1 (Ene-Mar)' },
                    { q: 2, label: 'T2 (Abr-Jun)' },
                    { q: 3, label: 'T3 (Jul-Sep)' },
                    { q: 4, label: 'T4 (Oct-Dic)' },
                  ].map((item) => (
                    <button
                      key={item.q}
                      onClick={() =>
                        onUpdateFilters({
                          ...filters,
                          dateFilter: { ...filters.dateFilter, quarter: item.q, enabled: true },
                        })
                      }
                      className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition-colors ${
                        filters.dateFilter.quarter === item.q
                          ? 'bg-cyan-500 text-slate-950'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {filters.dateFilter.periodType === 'month' && (
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="text-slate-400">Año:</span>
                <select
                  value={filters.dateFilter.year || detectedYears[0]}
                  onChange={(e) =>
                    onUpdateFilters({
                      ...filters,
                      dateFilter: { ...filters.dateFilter, year: Number(e.target.value) },
                    })
                  }
                  className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono text-xs mr-2"
                >
                  {detectedYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>

                <div className="flex flex-wrap gap-1">
                  {[
                    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
                  ].map((mName, idx) => {
                    const mNum = idx + 1;
                    return (
                      <button
                        key={mNum}
                        onClick={() =>
                          onUpdateFilters({
                            ...filters,
                            dateFilter: { ...filters.dateFilter, month: mNum, enabled: true },
                          })
                        }
                        className={`px-2 py-0.5 rounded text-xs font-mono transition-colors ${
                          filters.dateFilter.month === mNum
                            ? 'bg-cyan-500 text-slate-950 font-bold'
                            : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        {mName}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {filters.dateFilter.periodType === 'day' && (
              <div className="flex items-center gap-2 pt-1 text-xs">
                <span className="text-slate-400">Día específico:</span>
                <input
                  type="date"
                  value={filters.dateFilter.specificDate || ''}
                  onChange={(e) =>
                    onUpdateFilters({
                      ...filters,
                      dateFilter: {
                        ...filters.dateFilter,
                        specificDate: e.target.value,
                        enabled: !!e.target.value,
                      },
                    })
                  }
                  className="px-3 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono text-xs"
                />
              </div>
            )}

            {filters.dateFilter.periodType === 'range' && (
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Desde:</span>
                  <input
                    type="date"
                    value={filters.dateFilter.startDate || ''}
                    onChange={(e) =>
                      onUpdateFilters({
                        ...filters,
                        dateFilter: {
                          ...filters.dateFilter,
                          startDate: e.target.value,
                          enabled: true,
                        },
                      })
                    }
                    className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono text-xs"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Hasta:</span>
                  <input
                    type="date"
                    value={filters.dateFilter.endDate || ''}
                    onChange={(e) =>
                      onUpdateFilters({
                        ...filters,
                        dateFilter: {
                          ...filters.dateFilter,
                          endDate: e.target.value,
                          enabled: true,
                        },
                      })
                    }
                    className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. DYNAMIC COLUMN FILTERS LIST */}
        {filters.columnFilters.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-slate-800/80">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Filtros por Columnas ({filters.columnFilters.length}):
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {filters.columnFilters.map((cf) => (
                <div
                  key={cf.id}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2 text-xs"
                >
                  {/* Column Picker */}
                  <select
                    value={cf.column}
                    onChange={(e) => handleUpdateColumnFilter(cf.id, { column: e.target.value })}
                    className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-mono text-xs focus:outline-none"
                  >
                    {activeTable.columns.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name} ({c.type})
                      </option>
                    ))}
                  </select>

                  {/* Operator */}
                  <select
                    value={cf.operator}
                    onChange={(e) =>
                      handleUpdateColumnFilter(cf.id, {
                        operator: e.target.value as FilterOperator,
                      })
                    }
                    className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-cyan-400 font-mono font-bold text-xs focus:outline-none"
                  >
                    <option value="=">=</option>
                    <option value="!=">!=</option>
                    <option value="LIKE">LIKE (contiene)</option>
                    <option value="NOT LIKE">NOT LIKE</option>
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                    <option value=">=">&gt;=</option>
                    <option value="<=">&lt;=</option>
                    <option value="BETWEEN">BETWEEN (rango)</option>
                    <option value="IN">IN (lista , )</option>
                    <option value="IS NULL">IS NULL</option>
                    <option value="IS NOT NULL">IS NOT NULL</option>
                  </select>

                  {/* Value inputs */}
                  {cf.operator !== 'IS NULL' && cf.operator !== 'IS NOT NULL' && (
                    <input
                      type="text"
                      value={cf.value}
                      onChange={(e) => handleUpdateColumnFilter(cf.id, { value: e.target.value })}
                      placeholder={cf.operator === 'IN' ? 'ej. PAGADO, PENDIENTE' : 'Valor a comparar...'}
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
                    />
                  )}

                  {cf.operator === 'BETWEEN' && (
                    <input
                      type="text"
                      value={cf.valueSecondary || ''}
                      onChange={(e) =>
                        handleUpdateColumnFilter(cf.id, { valueSecondary: e.target.value })
                      }
                      placeholder="Valor final..."
                      className="w-24 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
                    />
                  )}

                  <button
                    onClick={() => handleRemoveColumnFilter(cf.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
                    title="Eliminar condición"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results Header Bar & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Resumen de filtrado:</span>
          <span className="font-mono font-bold text-white px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800">
            {filterResult.filteredCount.toLocaleString()} / {filterResult.totalCount.toLocaleString()} filas
          </span>
          <span className="text-slate-500">
            ({((filterResult.filteredCount / (filterResult.totalCount || 1)) * 100).toFixed(1)}% del respaldo)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Mask toggle if table contains sensitive columns */}
          {activeTable.sensitiveColumns.length > 0 && (
            <button
              onClick={() => setMaskSensitive(!maskSensitive)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                maskSensitive
                  ? 'bg-amber-950/60 text-amber-300 border-amber-800/60 hover:bg-amber-900/60'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title="Alternar enmascaramiento de datos sensibles"
            >
              {maskSensitive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{maskSensitive ? 'Enmascarar PII: Activo' : 'PII Visible'}</span>
            </button>
          )}

          {/* Export tools */}
          <button
            onClick={copyAsMarkdown}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium cursor-pointer transition-colors"
            title="Copiar vista filtrada como tabla Markdown"
          >
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            <span>Copiar Tabla MD</span>
          </button>
          <button
            onClick={exportAsCSV}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium cursor-pointer transition-colors"
            title="Descargar datos filtrados en formato CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* ZERO MATCHES EXPLICIT NOTIFICATION */}
      {filterResult.filteredCount === 0 && filterResult.totalCount > 0 && (
        <div className="p-6 rounded-2xl border border-rose-500/30 bg-rose-950/20 text-center space-y-3 animate-fade-in">
          <div className="inline-flex p-3 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="max-w-xl mx-auto space-y-1">
            <h4 className="text-base font-semibold text-rose-300">
              Notificación: Ningún registro coincide con los filtros aplicados
            </h4>
            <p className="text-xs text-rose-200/80 leading-relaxed">
              {filterResult.unmatchedReason ||
                `Los criterios de búsqueda o fecha seleccionados no encontraron registros existentes en la tabla '${activeTable.name}'.`}
            </p>
          </div>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs cursor-pointer transition-all shadow-md active:scale-95"
          >
            Restablecer Filtros y Mostrar Todos los Registros
          </button>
        </div>
      )}

      {/* SELECTION ACTION BAR (CHECKED ROWS) - GENERADOR Y COPIADOR DE CONSULTAS */}
      {selectedRowIndices.size > 0 && (
        <div className="sticky top-20 z-30 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 p-4 rounded-2xl bg-slate-900/98 border-2 border-cyan-400 shadow-2xl backdrop-blur-md animate-fade-in text-white ring-4 ring-cyan-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold shrink-0 shadow-md">
              <Code2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-sm sm:text-base text-white">
                  {selectedRowIndices.size} {selectedRowIndices.size === 1 ? 'fila seleccionada' : 'filas seleccionadas'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-cyan-400 text-slate-950 uppercase tracking-wide">
                  Generador SQL Activo
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Genera al instante consultas desde la más básica hasta CRUD completo listas para copiar.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Quick Query Selector */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5">
              <label htmlFor="quick-query-select" className="text-[11px] font-bold text-slate-300 shrink-0">
                Consulta:
              </label>
              <select
                id="quick-query-select"
                value={quickQueryType}
                onChange={(e) => setQuickQueryType(e.target.value)}
                className="bg-transparent text-cyan-300 font-mono text-xs font-bold focus:outline-none cursor-pointer pr-2"
              >
                <optgroup label="Básicas de Lectura">
                  <option value="basic-select-wildcard">1. SELECT * (Básica)</option>
                  <option value="crud-select-projected">2. SELECT Columnas Explícitas</option>
                  <option value="snippet-where">3. Cláusula WHERE IN</option>
                </optgroup>
                <optgroup label="Operaciones CRUD">
                  <option value="crud-insert">4. INSERT INTO (Valores)</option>
                  <option value="crud-update">5. UPDATE Parametrizado</option>
                  <option value="crud-delete">6. DELETE Transaccional Seguro</option>
                  <option value="crud-upsert">7. UPSERT / MERGE</option>
                  <option value="crud-clone">8. Clonar Filas (Nuevo ID)</option>
                </optgroup>
                <optgroup label="Avanzadas y Análisis">
                  <option value="relations-join">9. SELECT con JOIN (Claves Foráneas)</option>
                  <option value="aggregation-stats">10. Métricas / SP_EJERCICIO</option>
                  <option value="export-json">11. Exportar Array JSON</option>
                </optgroup>
              </select>
            </div>

            {/* Quick Dialect Picker */}
            <select
              value={quickDialect}
              onChange={(e) => setQuickDialect(e.target.value as SQLDialect)}
              className="bg-slate-950 border border-slate-700 text-slate-200 font-mono text-xs font-bold rounded-xl px-2.5 py-2 focus:outline-none cursor-pointer"
              title="Dialecto SQL"
            >
              <option value="postgresql">PostgreSQL</option>
              <option value="mysql">MySQL</option>
              <option value="sqlserver">SQL Server (T-SQL)</option>
              <option value="oracle">Oracle</option>
              <option value="sqlite">SQLite</option>
            </select>

            {/* Instant Copy Button */}
            <button
              onClick={handleQuickCopy}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer shadow-md active:scale-95 transition-all"
              title="Copiar la consulta seleccionada directamente al portapapeles"
            >
              <Copy className="w-4 h-4 stroke-[2.5]" />
              <span>Copiar Consulta</span>
            </button>

            {/* Open Full Modal */}
            <button
              onClick={() => setIsRowQueryModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-semibold text-xs cursor-pointer transition-all active:scale-95"
              title="Ver código completo con resaltado de sintaxis y todas las variantes"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Ver Asistente Completo</span>
            </button>

            {/* Clear Selection */}
            <button
              onClick={() => setSelectedRowIndices(new Set())}
              className="p-2 rounded-xl bg-slate-950/80 hover:bg-rose-950/50 hover:text-rose-400 text-slate-400 border border-slate-800 text-xs font-semibold cursor-pointer transition-colors"
              title="Deseleccionar todas las filas"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* DATA GRID TABLE CON ALTA LEGIBILIDAD */}
      {filterResult.filteredCount > 0 && (
        <div className="rounded-2xl border border-slate-700/80 bg-slate-950 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto max-h-[620px] scrollbar-thin">
            <table className="w-full text-left text-[13px] font-mono border-collapse">
              <thead className="sticky top-0 z-20 bg-slate-900 border-b-2 border-slate-700 text-slate-100 text-xs font-extrabold uppercase tracking-wider shadow-sm">
                <tr>
                  <th className="py-3 px-3 w-10 text-center select-none bg-slate-900">
                    <input
                      type="checkbox"
                      checked={isAllCurrentPageSelected}
                      onChange={toggleSelectAllCurrentPage}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-400 cursor-pointer"
                      title="Seleccionar todas las filas visibles de esta página"
                    />
                  </th>
                  <th className="py-3 px-3 w-12 text-slate-300 text-center font-bold bg-slate-900">#</th>
                  <th className="py-3 px-2 w-14 text-cyan-400 text-center font-bold bg-slate-900">SQL</th>
                  {activeTable.columns.map((col) => {
                    const isSorted = sortColumn === col.name;
                    return (
                      <th
                        key={col.name}
                        onClick={() => handleSort(col.name)}
                        className="py-3.5 px-4 font-bold whitespace-nowrap cursor-pointer hover:bg-slate-800 transition-colors select-none text-slate-100 bg-slate-900"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className={col.isPrimary ? 'text-amber-400 font-extrabold underline decoration-amber-500/50' : col.isForeignKey ? 'text-purple-300 font-bold' : /sp_?ejer[c]?icio|ejercicio|ejericio/i.test(col.name) ? 'text-emerald-400 font-extrabold' : 'text-slate-100'}>
                            {col.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal font-sans">({col.type})</span>
                          {col.isSensitive && (
                            <span title="Dato sensible detectado">
                              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                            </span>
                          )}
                          <ArrowUpDown className={`w-3.5 h-3.5 ${isSorted ? 'text-cyan-400 stroke-[2.5]' : 'text-slate-400'}`} />
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-100">
                {paginatedRows.map((row, idx) => {
                  const globalIdxZero = (currentPage - 1) * rowsPerPage + idx;
                  const globalIdxOne = globalIdxZero + 1;
                  const isChecked = selectedRowIndices.has(globalIdxZero);

                  return (
                    <tr
                      key={idx}
                      className={`transition-colors text-[13px] ${
                        isChecked
                          ? 'bg-cyan-950/45 text-white font-medium border-l-4 border-cyan-400 ring-1 ring-cyan-500/30'
                          : idx % 2 === 0
                          ? 'bg-slate-950 hover:bg-slate-850 hover:text-white'
                          : 'bg-slate-900/35 hover:bg-slate-850 hover:text-white'
                      }`}
                    >
                      <td className="py-3 px-3 text-center select-none" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleRowSelection(globalIdxZero)}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-400 cursor-pointer"
                          title="Marcar para generar consultas SQL"
                        />
                      </td>
                      <td className="py-3 px-3 text-center text-slate-300 font-mono text-xs select-none font-bold">
                        {globalIdxOne}
                      </td>
                      <td className="py-3 px-2 text-center select-none" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openGeneratorForSingleRow(globalIdxZero)}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-cyan-500 hover:text-slate-950 text-cyan-400 border border-slate-700 transition-all cursor-pointer shadow-xs active:scale-95"
                          title="Generar consultas SQL (CRUD) para esta fila"
                        >
                          <Code2 className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      </td>
                      {activeTable.columns.map((col) => {
                        const val = row[col.name];
                        const isSens = col.isSensitive;
                        const isYearCol = isYearOrIdColumn(col.name, val);
                        let displayVal: React.ReactNode = String(val ?? '');

                        if (val === null || val === undefined) {
                          displayVal = <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-slate-800/90 text-slate-400 italic">NULL</span>;
                        } else if (isSens && maskSensitive) {
                          displayVal = (
                            <span className="text-amber-400/90 font-mono tracking-widest text-xs font-bold">
                              ••••••••••••
                            </span>
                          );
                        } else if (typeof val === 'number') {
                          if (isYearCol) {
                            displayVal = (
                              <span
                                className={
                                  /sp_?ejer[c]?icio|ejercicio|ejericio/i.test(col.name)
                                    ? 'text-emerald-400 font-extrabold px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/50'
                                    : 'text-cyan-300 font-mono font-bold'
                                }
                              >
                                {val}
                              </span>
                            );
                          } else {
                            displayVal = <span className="text-cyan-300 font-bold tabular-nums">{val.toLocaleString()}</span>;
                          }
                        } else if (typeof val === 'boolean') {
                          displayVal = (
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${val ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60' : 'bg-rose-950/80 text-rose-300 border border-rose-800/60'}`}>
                              {val ? 'TRUE' : 'FALSE'}
                            </span>
                          );
                        } else {
                          displayVal = <span className="text-slate-100 font-medium">{String(val)}</span>;
                        }

                        return (
                          <td
                            key={col.name}
                            onClick={() => {
                              if (val !== null && val !== undefined) {
                                const cleanStr = formatCellValue(col.name, val);
                                navigator.clipboard.writeText(cleanStr);
                                setCopiedNotification(`Copiado: ${cleanStr.slice(0, 20)}`);
                                setTimeout(() => setCopiedNotification(null), 1500);
                              }
                            }}
                            className="py-3 px-4 whitespace-nowrap max-w-xs truncate hover:text-white transition-colors cursor-copy leading-relaxed"
                            title="Clic para copiar celda"
                          >
                            {displayVal}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-900 border-t-2 border-slate-700 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-300">Filas por página:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs font-bold focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="font-medium text-slate-300">
                Mostrando {(currentPage - 1) * rowsPerPage + 1} -{' '}
                {Math.min(currentPage * rowsPerPage, sortedRows.length)} de {sortedRows.length} filas
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono text-white px-2.5 font-bold">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Row SQL Generator Modal */}
      <RowQueryGeneratorModal
        isOpen={isRowQueryModalOpen}
        onClose={() => setIsRowQueryModalOpen(false)}
        table={activeTable}
        selectedRows={selectedRowsData}
        initialDialect={quickDialect}
        onClearSelection={() => setSelectedRowIndices(new Set())}
      />
    </div>
  );
};
