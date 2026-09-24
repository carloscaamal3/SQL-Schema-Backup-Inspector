import React, { useState } from 'react';
import {
  Code2,
  Sparkles,
  Layers,
  Link2,
  ShieldCheck,
  Zap,
  Copy,
  Check,
  Info,
} from 'lucide-react';
import {
  TableSchema,
  ParsedSQLBackup,
  FilterState,
  SQLDialect,
} from '../types/sql';
import { generateProductionQueries, GeneratedQuery } from '../utils/queryGenerator';
import { SqlSyntaxHighlighter } from './SqlSyntaxHighlighter';

interface QueryGeneratorTabProps {
  backup: ParsedSQLBackup;
  activeTableName: string;
  onSelectTable: (tableName: string) => void;
  filters: FilterState;
  dialect: SQLDialect;
  onDialectChange: (dialect: SQLDialect) => void;
}

export const QueryGeneratorTab: React.FC<QueryGeneratorTabProps> = ({
  backup,
  activeTableName,
  onSelectTable,
  filters,
  dialect,
  onDialectChange,
}) => {
  const tableNames = Object.keys(backup.tables);
  const activeTable = backup.tables[activeTableName] || backup.tables[tableNames[0]];

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [copiedAll, setCopiedAll] = useState(false);

  const queries = activeTable
    ? generateProductionQueries(activeTable, backup, filters, dialect)
    : [];

  const filteredQueries =
    selectedCategory === 'ALL'
      ? queries
      : queries.filter((q) => q.category === selectedCategory);

  const handleCopyAll = () => {
    const allSql = queries
      .map(
        (q) =>
          `-- ==========================================================\n-- ${q.title}\n-- ==========================================================\n${q.sql}\n`
      )
      .join('\n\n');

    navigator.clipboard.writeText(allSql);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const DIALECT_DESCRIPTIONS: Record<SQLDialect, string> = {
    postgresql: 'PostgreSQL 14+ (ANSI SQL, DATE_TRUNC, LIMIT/OFFSET, identificadores "")',
    mysql: 'MySQL 8.0+ (InnoDB, DATE_FORMAT, LIMIT/OFFSET, backticks ``)',
    sqlserver: 'Microsoft SQL Server (T-SQL, OFFSET...FETCH NEXT, FORMAT, brackets [])',
    oracle: 'Oracle Database 19c+ (PL/SQL, TO_CHAR, FETCH NEXT, identificadores "")',
    sqlite: 'SQLite 3 (strftime, LIMIT/OFFSET, sintaxis ligera)',
  };

  if (!activeTable) {
    return <div className="p-8 text-center text-slate-500">Seleccione una tabla para generar consultas.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Table Selector (SELECT) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 shrink-0">
            <Layers className="w-4 h-4 text-cyan-400" />
            <label htmlFor="generator-table-select">Selector de Tabla Activa:</label>
          </div>
          <select
            id="generator-table-select"
            value={activeTableName}
            onChange={(e) => onSelectTable(e.target.value)}
            className="flex-1 max-w-lg px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-cyan-300 font-mono text-xs font-bold focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 cursor-pointer transition-colors shadow-inner"
          >
            {tableNames.map((tableName) => {
              const tbl = backup.tables[tableName];
              return (
                <option key={tableName} value={tableName}>
                  {tableName} ({tbl.rowCount.toLocaleString()} filas • {tbl.columns.length} cols)
                </option>
              );
            })}
          </select>
        </div>
        <span className="text-xs text-slate-400 font-mono self-end sm:self-auto">
          Generando para: <strong className="text-cyan-400">{activeTable.name}</strong>
        </span>
      </div>

      {/* Top Config Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 font-bold shadow-md shadow-cyan-500/20">
              <Code2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                Generador de Consultas SQL para Producción
              </h3>
              <p className="text-xs text-slate-400">
                Sintaxis optimizada según las condiciones activas en '{activeTable.name}'
              </p>
            </div>
          </div>

          {/* Copy all button */}
          <button
            onClick={handleCopyAll}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer transition-all shadow-md active:scale-95 shrink-0 self-start md:self-auto"
          >
            {copiedAll ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedAll ? '¡Todas las Consultas Copiadas!' : 'Copiar Todas las Consultas'}</span>
          </button>
        </div>

        {/* Dialect selector bar */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Dialecto de destino:</span>
            <div className="flex flex-wrap gap-1">
              {(['postgresql', 'mysql', 'sqlserver', 'oracle', 'sqlite'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => onDialectChange(d)}
                  className={`px-3 py-1.5 rounded-lg font-mono text-xs font-semibold cursor-pointer transition-colors ${
                    dialect === d
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {d.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <span className="text-slate-500 text-[11px] font-mono flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            {DIALECT_DESCRIPTIONS[dialect]}
          </span>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-1.5 text-xs pt-1 border-t border-slate-800/80">
          {[
            { id: 'ALL', label: 'Todas las Consultas' },
            { id: 'FILTRADA', label: '🔍 Extracción Filtrada' },
            { id: 'COMPORTAMIENTO', label: '📊 Comportamental (GROUP BY)' },
            { id: 'RELACIONAL', label: '🔗 Relacional (JOINs)' },
            { id: 'INTEGRIDAD', label: '🛡️ Integridad (Huérfanos)' },
            { id: 'WINDOW_FUNCTION', label: '⚡ Ventanas Analíticas (CTE)' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-slate-800 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Query Cards Catalog */}
      <div className="space-y-6">
        {filteredQueries.map((query) => (
          <div
            key={query.id}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
                    {query.category}
                  </span>
                  <h4 className="text-base font-semibold text-white">{query.title}</h4>
                </div>
                <p className="text-xs text-slate-400">{query.description}</p>
              </div>

              <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-slate-950 text-slate-300 border border-slate-800 self-start sm:self-auto">
                Dialecto: <strong className="text-cyan-400">{dialect.toUpperCase()}</strong>
              </span>
            </div>

            {/* SQL High-contrast Syntax Block */}
            <SqlSyntaxHighlighter code={query.sql} title={`SQL Producción — ${query.title}`} badge={dialect.toUpperCase()} />

            {/* Optimization Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Optimizaciones de Ejecución:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
                  {query.optimizationNotes.map((note, idx) => (
                    <li key={idx}>{note}</li>
                  ))}
                </ul>
              </div>

              {query.suggestedIndex ? (
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-cyan-500/20 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-cyan-300">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Índice Recomendado (DDL):</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] text-emerald-400 overflow-x-auto">
                    {query.suggestedIndex}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Evita escaneo secuencial (Seq Scan) en tablas con alto volumen de filas.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Compatibilidad de Rendimiento:</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Diseñada para planes de ejecución estables mediante predicados SARGables y proyección mínima de memoria.
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
