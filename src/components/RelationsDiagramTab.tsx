import React, { useState } from 'react';
import {
  Link2,
  Key,
  Database,
  ArrowRight,
  Sparkles,
  Search,
} from 'lucide-react';
import { ParsedSQLBackup } from '../types/sql';

interface RelationsDiagramTabProps {
  backup: ParsedSQLBackup;
  activeTableName: string;
  onSelectTable: (tableName: string) => void;
  onNavigateToRecords: (tableName: string) => void;
}

export const RelationsDiagramTab: React.FC<RelationsDiagramTabProps> = ({
  backup,
  activeTableName,
  onSelectTable,
  onNavigateToRecords,
}) => {
  const tableNames = Object.keys(backup.tables);
  const [highlightedTable, setHighlightedTable] = useState<string>(activeTableName);
  const [searchTable, setSearchTable] = useState('');

  // Find all connections for highlightedTable
  const relatedFks = backup.foreignKeys.filter(
    (fk) =>
      fk.fromTable.toLowerCase() === highlightedTable.toLowerCase() ||
      fk.toTable.toLowerCase() === highlightedTable.toLowerCase()
  );

  const connectedTableNames = new Set<string>();
  connectedTableNames.add(highlightedTable.toLowerCase());
  for (const fk of relatedFks) {
    connectedTableNames.add(fk.fromTable.toLowerCase());
    connectedTableNames.add(fk.toTable.toLowerCase());
  }

  const filteredTables = tableNames.filter((t) =>
    t.toLowerCase().includes(searchTable.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Controller */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Link2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                Diagrama de Entidad-Relación y Topología de Claves (ERD)
              </h3>
              <p className="text-xs text-slate-400">
                Visualice relaciones 1:N, claves primarias y dependencias entre tablas del respaldo
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTable}
              onChange={(e) => setSearchTable(e.target.value)}
              placeholder="Buscar tabla en el esquema..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs pt-1 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span className="text-slate-400">Clave Primaria (PK)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
            <span className="text-slate-400">Clave Foránea (FK)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            <span className="text-slate-400">Tabla Seleccionada</span>
          </div>
          <span className="text-slate-500 text-[11px] ml-auto">
            Haz clic en cualquier tabla para resaltar sus conexiones directas
          </span>
        </div>
      </div>

      {/* ERD Nodes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTables.map((tableName) => {
          const table = backup.tables[tableName];
          const isSelected = tableName.toLowerCase() === highlightedTable.toLowerCase();
          const isConnected = connectedTableNames.has(tableName.toLowerCase());

          return (
            <div
              key={tableName}
              onClick={() => {
                setHighlightedTable(tableName);
                onSelectTable(tableName);
              }}
              className={`rounded-2xl border transition-all cursor-pointer shadow-lg overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? 'border-cyan-500 ring-2 ring-cyan-500/30 bg-slate-900 shadow-cyan-950/30'
                  : isConnected
                  ? 'border-purple-500/60 bg-slate-950/90 shadow-purple-950/20'
                  : 'border-slate-800 bg-slate-950/50 opacity-75 hover:opacity-100 hover:border-slate-700'
              }`}
            >
              {/* Table Header */}
              <div
                className={`px-4 py-3 border-b flex items-center justify-between ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-800/50'
                    : isConnected
                    ? 'bg-purple-950/30 border-purple-800/40'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 font-mono">
                  <Database className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : isConnected ? 'text-purple-400' : 'text-slate-400'}`} />
                  <span className="font-bold text-white text-sm">{table.name}</span>
                </div>
                <span className="text-xs font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                  {table.rowCount} filas
                </span>
              </div>

              {/* Columns Schema */}
              <div className="p-4 space-y-1.5 max-h-64 overflow-y-auto font-mono text-xs divide-y divide-slate-900">
                {table.columns.map((col) => {
                  return (
                    <div
                      key={col.name}
                      className="pt-1.5 pb-0.5 flex items-center justify-between text-[11px]"
                    >
                      <div className="flex items-center gap-2 truncate">
                        {col.isPrimary ? (
                          <span title="Clave Primaria">
                            <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          </span>
                        ) : col.isForeignKey ? (
                          <span title={`FK -> ${col.references?.table || ''}`}>
                            <Link2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          </span>
                        ) : (
                          <span className="w-3.5 h-3.5 inline-block text-slate-600 text-center">•</span>
                        )}
                        <span
                          className={`font-medium truncate ${
                            col.isPrimary
                              ? 'text-amber-300 font-bold'
                              : col.isForeignKey
                              ? 'text-purple-300 font-bold'
                              : 'text-slate-200'
                          }`}
                        >
                          {col.name}
                        </span>
                      </div>
                      <span className="text-slate-500 text-[10px] shrink-0 font-normal">
                        {col.type}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Footer / Relations info */}
              <div className="p-3 bg-slate-900/40 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">
                  {table.foreignKeys.length} FK(s) salientes
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTable(table.name);
                    onNavigateToRecords(table.name);
                  }}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 cursor-pointer text-[11px]"
                >
                  <span>Explorar filas</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Relations Summary Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>Matriz de Claves Foráneas de la Base de Datos</span>
        </h4>

        {backup.foreignKeys.length === 0 ? (
          <p className="text-xs text-slate-500">No hay relaciones foráneas registradas.</p>
        ) : (
          <div className="space-y-2">
            {backup.foreignKeys.map((fk, idx) => {
              const isRelevant =
                fk.fromTable.toLowerCase() === highlightedTable.toLowerCase() ||
                fk.toTable.toLowerCase() === highlightedTable.toLowerCase();

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono transition-all ${
                    isRelevant
                      ? 'border-purple-500/50 bg-purple-950/20 text-white'
                      : 'border-slate-800 bg-slate-950/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-purple-300 font-bold">
                      {fk.fromTable}.{fk.fromColumn}
                    </span>
                    <span className="text-slate-500">──( 1 : N )──►</span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300 font-bold">
                      {fk.toTable}.{fk.toColumn}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] text-slate-400">
                      {fk.constraintName || (fk.isInfered ? 'fk_inferida_por_nombre' : 'fk_declarada')}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        fk.isInfered
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {fk.isInfered ? 'Inferida' : 'Restricción FK'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
