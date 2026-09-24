import React, { useState, useMemo } from 'react';
import {
  Code2,
  Copy,
  Check,
  X,
  FileDown,
  Sparkles,
  Info,
  Database,
  ArrowRight,
  Filter,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { TableSchema, SQLDialect } from '../types/sql';
import {
  generateQueriesFromSelectedRows,
  RowGeneratedQuery,
  QueryCategory,
} from '../utils/recordQueryGenerator';
import { SqlSyntaxHighlighter } from './SqlSyntaxHighlighter';

interface RowQueryGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: TableSchema;
  selectedRows: Record<string, any>[];
  initialDialect: SQLDialect;
  onClearSelection: () => void;
}

export const RowQueryGeneratorModal: React.FC<RowQueryGeneratorModalProps> = ({
  isOpen,
  onClose,
  table,
  selectedRows,
  initialDialect,
  onClearSelection,
}) => {
  const [dialect, setDialect] = useState<SQLDialect>(initialDialect);
  const [selectedCategory, setSelectedCategory] = useState<QueryCategory>('ALL');
  const [activeQueryId, setActiveQueryId] = useState<string>('all-view');
  const [copiedQueryId, setCopiedQueryId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Generate queries
  const queries = useMemo(() => {
    if (!isOpen || selectedRows.length === 0) return [];
    return generateQueriesFromSelectedRows(table, selectedRows, dialect);
  }, [table, selectedRows, dialect, isOpen]);

  if (!isOpen || selectedRows.length === 0) return null;

  const filteredQueries =
    selectedCategory === 'ALL'
      ? queries
      : queries.filter((q) => q.category === selectedCategory);

  const displayedQueries =
    activeQueryId === 'all-view'
      ? filteredQueries
      : queries.filter((q) => q.id === activeQueryId);

  const handleCopySingle = (id: string, sql: string) => {
    navigator.clipboard.writeText(sql);
    setCopiedQueryId(id);
    setTimeout(() => setCopiedQueryId(null), 2000);
  };

  const handleCopyAll = () => {
    const allSql = queries
      .map(
        (q) =>
          `-- ==========================================================\n-- ${q.title} (${q.badge})\n-- ==========================================================\n${q.sql}\n`
      )
      .join('\n\n');

    navigator.clipboard.writeText(allSql);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleDownloadSql = () => {
    const allSql = queries
      .map(
        (q) =>
          `-- ==========================================================\n-- ${q.title} (${q.badge})\n-- ==========================================================\n${q.sql}\n`
      )
      .join('\n\n');

    const blob = new Blob([allSql], { type: 'text/sql;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `consultas_${table.name}_${selectedRows.length}_filas_${dialect}.sql`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-5xl max-h-[92vh] rounded-2xl border border-slate-800 bg-slate-900/98 shadow-2xl flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 font-bold shadow-md shadow-cyan-500/20 shrink-0">
              <Code2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Generador de Consultas desde Registros Seleccionados
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-cyan-500 text-slate-950 shadow-xs">
                  {selectedRows.length} {selectedRows.length === 1 ? 'registro' : 'registros'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Tabla activa: <strong className="text-white font-mono">{table.name}</strong> • Dialecto SQL: <strong className="text-cyan-400 font-mono">{dialect.toUpperCase()}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              onClick={handleCopyAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer transition-all shadow-md active:scale-95"
              title="Copiar todas las consultas generadas en un solo archivo"
            >
              {copiedAll ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
              <span>{copiedAll ? '¡Todo Copiado!' : 'Copiar Todas'}</span>
            </button>
            <button
              onClick={handleDownloadSql}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold cursor-pointer transition-all active:scale-95"
              title="Descargar script .sql"
            >
              <FileDown className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Descargar .sql</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Query Selector Controls */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-800 bg-slate-950/50 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* SELECTOR DESDE LA MAS BASICA HASTA CRUD Y MAS */}
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2">
              <label htmlFor="modal-query-select" className="text-xs font-bold text-white shrink-0 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Seleccionar Tipo de Consulta:</span>
              </label>
              <div className="relative flex-1 max-w-xl">
                <select
                  id="modal-query-select"
                  value={activeQueryId}
                  onChange={(e) => {
                    setActiveQueryId(e.target.value);
                    if (e.target.value !== 'all-view') {
                      setSelectedCategory('ALL');
                    }
                  }}
                  className="w-full pl-3 pr-8 py-2 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 cursor-pointer transition-colors shadow-inner"
                >
                  <option value="all-view">-- Mostrar Todas las Consultas Disponibles ({queries.length}) --</option>
                  
                  <optgroup label="1. BÁSICAS (Lectura y Proyección)">
                    {queries
                      .filter((q) => q.complexity === 'Básica')
                      .map((q) => (
                        <option key={q.id} value={q.id}>
                          [BÁSICA] {q.title}
                        </option>
                      ))}
                  </optgroup>

                  <optgroup label="2. CRUD (Manipulación de Datos)">
                    {queries
                      .filter((q) => q.complexity === 'CRUD')
                      .map((q) => (
                        <option key={q.id} value={q.id}>
                          [CRUD] {q.title}
                        </option>
                      ))}
                  </optgroup>

                  <optgroup label="3. AVANZADAS (Relaciones, Agregaciones y Métricas)">
                    {queries
                      .filter((q) => q.complexity === 'Avanzada')
                      .map((q) => (
                        <option key={q.id} value={q.id}>
                          [AVANZADA] {q.title}
                        </option>
                      ))}
                  </optgroup>

                  <optgroup label="4. FORMATOS & EXPORTACIÓN">
                    {queries
                      .filter((q) => q.complexity === 'Formato')
                      .map((q) => (
                        <option key={q.id} value={q.id}>
                          [FORMATO] {q.title}
                        </option>
                      ))}
                  </optgroup>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Dialect Switcher */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-slate-300">Dialecto:</span>
              <div className="flex flex-wrap gap-1">
                {(['mysql', 'postgresql', 'sqlserver', 'oracle', 'sqlite'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDialect(d)}
                    className={`px-2.5 py-1 rounded-lg font-mono text-xs font-semibold cursor-pointer transition-colors ${
                      dialect === d
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                        : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    {d.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Filter Pills (Básica, CRUD, Avanzada, Formato) */}
          {activeQueryId === 'all-view' && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
              <span className="text-slate-400 text-[11px] font-medium mr-1">Filtrar lista:</span>
              {[
                { id: 'ALL', label: 'Todas las consultas' },
                { id: 'CRUD_SELECT', label: 'SELECT (Básicas)' },
                { id: 'CRUD_INSERT', label: 'INSERT (CRUD)' },
                { id: 'CRUD_UPDATE', label: 'UPDATE (CRUD)' },
                { id: 'CRUD_DELETE', label: 'DELETE Seguro' },
                { id: 'CRUD_UPSERT', label: 'UPSERT / MERGE' },
                { id: 'RELATIONS_JOIN', label: 'JOINs Relacionales' },
                { id: 'AGGREGATION', label: 'Métricas SP_EJERCICIO' },
                { id: 'SNIPPET_WHERE', label: 'WHERE IN' },
                { id: 'EXPORT_JSON', label: 'JSON' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as QueryCategory)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-slate-800 text-cyan-300 border border-cyan-400 font-bold shadow-xs'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Query Blocks Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 scrollbar-thin">
          {displayedQueries.map((query) => {
            const isCopied = copiedQueryId === query.id;

            return (
              <div
                key={query.id}
                className="rounded-2xl border border-slate-800 bg-slate-950/75 p-4 sm:p-5 space-y-3 shadow-md transition-all hover:border-slate-700"
              >
                {/* Header of query */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase tracking-wider ${
                        query.complexity === 'Básica'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800/60'
                          : query.complexity === 'CRUD'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                          : query.complexity === 'Avanzada'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800/60'
                          : 'bg-amber-950 text-amber-300 border border-amber-800/60'
                      }`}>
                        {query.complexity} • {query.badge}
                      </span>
                      <h4 className="text-sm sm:text-base font-bold text-white">{query.title}</h4>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{query.description}</p>
                  </div>

                  {/* Individual Copy Button */}
                  <button
                    onClick={() => handleCopySingle(query.id, query.sql)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs cursor-pointer transition-all shadow-md shrink-0 active:scale-95 ${
                      isCopied
                        ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-400/40'
                        : 'bg-cyan-500/15 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-500/40'
                    }`}
                  >
                    {isCopied ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
                    <span>{isCopied ? '¡Consulta Copiada!' : 'Copiar Esta Consulta'}</span>
                  </button>
                </div>

                {/* Syntax highlighted query block */}
                <SqlSyntaxHighlighter
                  code={query.sql}
                  title={`${query.title} (${dialect.toUpperCase()})`}
                  badge={dialect.toUpperCase()}
                />
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Los valores numéricos de año fiscal (<strong className="text-white font-mono">SP_EJERCICIO</strong>) se formatean sin comas para compatibilidad SQL estricta.</span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => {
                onClearSelection();
                onClose();
              }}
              className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold cursor-pointer transition-colors"
            >
              Deseleccionar Filas y Salir
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-bold cursor-pointer transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
