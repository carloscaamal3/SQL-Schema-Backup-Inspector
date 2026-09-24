import React, { useState } from 'react';
import {
  Table2,
  Layers,
  Link2,
  Cog,
  ShieldAlert,
  ArrowRight,
  Key,
  Calendar,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  Hash,
} from 'lucide-react';
import { ParsedSQLBackup } from '../types/sql';
import { SqlSyntaxHighlighter } from './SqlSyntaxHighlighter';

interface OverviewTabProps {
  backup: ParsedSQLBackup;
  onSelectTable: (tableName: string) => void;
  onNavigateToTab: (tab: 'records' | 'queries' | 'relations' | 'markdown') => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  backup,
  onSelectTable,
  onNavigateToTab,
}) => {
  const [expandedRoutine, setExpandedRoutine] = useState<string | null>(null);
  const tableNames = Object.keys(backup.tables);

  return (
    <div className="space-y-6">
      {/* Stat Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Tablas Relacionales</span>
            <Table2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-white tracking-tight">
              {tableNames.length}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">Estructuras DDL identificadas</p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total de Registros</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-white tracking-tight">
              {backup.totalRecords.toLocaleString()}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">Filas INSERT extraídas</p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Relaciones (FK / PK)</span>
            <Link2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-white tracking-tight">
              {backup.foreignKeys.length}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">Vínculos de integridad</p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Rutinas y Funciones</span>
            <Cog className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-white tracking-tight">
              {backup.routines.length}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">Procedures & Triggers</p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 shadow-sm flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Alertas de Seguridad</span>
            <ShieldAlert className={`w-4 h-4 ${backup.sensitiveAlerts.length > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
          </div>
          <div className="mt-2">
            <span className={`text-2xl font-bold tracking-tight ${backup.sensitiveAlerts.length > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
              {backup.sensitiveAlerts.length}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {backup.sensitiveAlerts.length > 0 ? 'Datos sensibles detectados' : 'Sin datos de alto riesgo'}
            </p>
          </div>
        </div>
      </div>

      {/* SENSITIVE DATA ALERTS (if detected) */}
      {backup.sensitiveAlerts.length > 0 && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-5 shadow-lg shadow-amber-950/10">
          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="space-y-2 flex-1">
              <div>
                <h4 className="text-sm font-semibold text-amber-300">
                  Advertencia de Seguridad: Columnas con Datos Sensibles o Credenciales
                </h4>
                <p className="text-xs text-amber-200/80 mt-0.5">
                  El analizador identificó {backup.sensitiveAlerts.length} campos que contienen o sugieren contraseñas, hashes, tokens JWT o identificadores confidenciales. La visualización los mantendrá enmascarados preventivamente.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                {backup.sensitiveAlerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/20 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="font-semibold text-white">{alert.table}</span>
                        <span className="text-slate-500">.</span>
                        <span className="text-amber-300 font-bold">{alert.column}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-950 text-amber-400 border border-amber-800">
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px]">{alert.reason}</p>
                    <p className="text-slate-500 text-[10px] italic">💡 {alert.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1: 📊 TABLAS Y REGISTROS */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Table2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                📊 Tablas y Registros Identificados
              </h3>
              <p className="text-xs text-slate-400">
                Estructura de esquemas, claves primarias y volumen de datos extraído
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateToTab('records')}
            className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-medium hover:underline cursor-pointer"
          >
            <span>Abrir Explorador de Registros</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {tableNames.map((tableName) => {
            const table = backup.tables[tableName];
            const hasDates = table.dateColumns.length > 0;
            const hasSensitive = table.sensitiveColumns.length > 0;

            return (
              <div
                key={tableName}
                className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 hover:border-slate-700 transition-all space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm font-mono">
                        {table.name}
                      </span>
                      {hasSensitive && (
                        <span className="w-2 h-2 rounded-full bg-amber-400" title="Contiene datos sensibles"></span>
                      )}
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                      {table.rowCount.toLocaleString()} filas
                    </span>
                  </div>

                  {/* Primary Key & Columns meta */}
                  <div className="space-y-1.5 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="text-slate-400">PK:</span>
                      <span className="font-mono text-slate-200">
                        {table.primaryKeys.length > 0
                          ? table.primaryKeys.join(', ')
                          : '(Sin PK explícita)'}
                      </span>
                    </div>

                    {hasDates && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="text-slate-400">Campos Fecha:</span>
                        <span className="font-mono text-cyan-300 truncate">
                          {table.dateColumns.join(', ')}
                        </span>
                      </div>
                    )}

                    {table.columns.some((c) => /sp_?ejer[c]?icio|ejercicio|ejericio/i.test(c.name)) && (
                      <div className="flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-slate-400">Año Fiscal:</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {table.columns.find((c) => /sp_?ejer[c]?icio|ejercicio|ejericio/i.test(c.name))?.name}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Column tags preview */}
                  <div className="pt-1 flex flex-wrap gap-1">
                    {table.columns.slice(0, 6).map((c) => (
                      <span
                        key={c.name}
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                          c.isPrimary
                            ? 'bg-amber-950/50 text-amber-300 border-amber-800/40'
                            : c.isForeignKey
                            ? 'bg-purple-950/50 text-purple-300 border-purple-800/40'
                            : 'bg-slate-900 text-slate-300 border-slate-800'
                        }`}
                      >
                        {c.name}
                      </span>
                    ))}
                    {table.columns.length > 6 && (
                      <span className="text-[10px] text-slate-500 self-center">
                        +{table.columns.length - 6} más
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick actions for this table */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <button
                    onClick={() => {
                      onSelectTable(table.name);
                      onNavigateToTab('records');
                    }}
                    className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <span>Ver Datos</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => {
                      onSelectTable(table.name);
                      onNavigateToTab('queries');
                    }}
                    className="text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    Generar SQL
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: ⚙️ FUNCIONES Y PROCEDIMIENTOS ALMACENADOS */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Cog className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              ⚙️ Funciones y Procedimientos Almacenados
            </h3>
            <p className="text-xs text-slate-400">
              Rutinas DDL detectadas en el volcado con sus firmas de parámetros y dependencias
            </p>
          </div>
        </div>

        {backup.routines.length === 0 ? (
          <div className="p-6 rounded-xl border border-slate-800/80 bg-slate-950/40 text-center text-xs text-slate-500">
            No se identificaron declaraciones de procedimientos, funciones o triggers en este archivo.
          </div>
        ) : (
          <div className="space-y-3">
            {backup.routines.map((routine) => {
              const isExpanded = expandedRoutine === routine.name;
              return (
                <div
                  key={routine.name}
                  className="rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden"
                >
                  <div
                    onClick={() => setExpandedRoutine(isExpanded ? null : routine.name)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-900/60 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-mono">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-950 text-blue-400 border border-blue-800/60">
                          {routine.type}
                        </span>
                        <span className="text-white font-semibold text-sm">{routine.name}</span>
                        {routine.returnType && (
                          <span className="text-xs text-slate-400">
                            RETURNS <span className="text-cyan-400">{routine.returnType}</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span>
                          Parámetros: <strong className="text-slate-200">{routine.parameters.length}</strong>
                        </span>
                        <span>
                          Tablas Involucradas:{' '}
                          <strong className="text-slate-200 font-mono">
                            {routine.involvedTables.length > 0
                              ? routine.involvedTables.join(', ')
                              : 'Ninguna explícita'}
                          </strong>
                        </span>
                      </div>
                    </div>
                    <button className="text-slate-400 hover:text-white p-1">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-slate-800/80 pt-3 space-y-3">
                      {routine.parameters.length > 0 && (
                        <div>
                          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                            Parámetros de Entrada / Salida:
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {routine.parameters.map((p, idx) => (
                              <div
                                key={idx}
                                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono flex items-center justify-between"
                              >
                                <span className="text-slate-300">
                                  <strong className="text-cyan-400">{p.direction || 'IN'}</strong> {p.name}
                                </span>
                                <span className="text-slate-500 text-[11px]">{p.type}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                          Código de Definición DDL:
                        </div>
                        <SqlSyntaxHighlighter code={routine.definition} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 3: 🔗 RELACIONES */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                🔗 Relaciones (Claves Primarias y Foráneas)
              </h3>
              <p className="text-xs text-slate-400">
                Topología relacional y restricciones de integridad referencial
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateToTab('relations')}
            className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-medium hover:underline cursor-pointer"
          >
            <span>Ver Diagrama ER Gráfico</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {backup.foreignKeys.length === 0 ? (
          <div className="p-6 rounded-xl border border-slate-800/80 bg-slate-950/40 text-center text-xs text-slate-500">
            No se detectaron claves foráneas explícitas ni por inferencia en este archivo.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Tabla Origen</th>
                  <th className="py-2.5 px-4 font-semibold">Columna FK</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Vínculo</th>
                  <th className="py-2.5 px-4 font-semibold">Tabla Destino (Padre)</th>
                  <th className="py-2.5 px-4 font-semibold">Columna PK</th>
                  <th className="py-2.5 px-4 font-semibold">Tipo Detección</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/60 text-slate-300">
                {backup.foreignKeys.map((fk, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-white">{fk.fromTable}</td>
                    <td className="py-2.5 px-4 text-purple-400">{fk.fromColumn}</td>
                    <td className="py-2.5 px-4 text-center text-slate-500">──►</td>
                    <td className="py-2.5 px-4 font-bold text-cyan-300">{fk.toTable}</td>
                    <td className="py-2.5 px-4 text-amber-300">{fk.toColumn}</td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        fk.isInfered
                          ? 'bg-blue-950/60 text-blue-300 border border-blue-800/40'
                          : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                      }`}>
                        {fk.isInfered ? 'Inferida' : 'Declarada'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
