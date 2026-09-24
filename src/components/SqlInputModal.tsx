import React, { useState, useRef } from 'react';
import { Upload, FileText, X, CheckCircle2, Code2, AlertTriangle, Sparkles } from 'lucide-react';
import { SQLDialect } from '../types/sql';
import { DEMO_BACKUPS } from '../data/demoBackups';

interface SqlInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProcessSql: (sql: string, fileName: string, dialect?: SQLDialect) => void;
}

export const SqlInputModal: React.FC<SqlInputModalProps> = ({
  isOpen,
  onClose,
  onProcessSql,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'demos'>('upload');
  const [pastedSql, setPastedSql] = useState('');
  const [customFileName, setCustomFileName] = useState('mi_respaldo.sql');
  const [selectedDialect, setSelectedDialect] = useState<SQLDialect | 'auto'>('auto');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileSelected(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    setError(null);
    setSelectedFile(file);
    setCustomFileName(file.name);
  };

  const handleProcessUpload = async () => {
    if (!selectedFile) {
      setError('Por favor seleccione un archivo .sql o .txt');
      return;
    }
    setLoading(true);
    try {
      const content = await selectedFile.text();
      onProcessSql(
        content,
        selectedFile.name,
        selectedDialect === 'auto' ? undefined : selectedDialect
      );
      onClose();
    } catch (err: any) {
      setError(`Error al leer el archivo: ${err.message || 'Formato desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPasted = () => {
    if (!pastedSql.trim()) {
      setError('Por favor pegue el código SQL del respaldo antes de continuar.');
      return;
    }
    onProcessSql(
      pastedSql,
      customFileName || 'script_manual.sql',
      selectedDialect === 'auto' ? undefined : selectedDialect
    );
    onClose();
  };

  const handleLoadDemo = (demoId: string) => {
    const demo = DEMO_BACKUPS.find((d) => d.id === demoId);
    if (demo) {
      onProcessSql(demo.sql, demo.fileName, demo.dialect);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Cargar o Pegar Respaldo SQL</h3>
              <p className="text-xs text-slate-400">
                Procesa sentencias DDL (CREATE TABLE, ALTER) y DML (INSERT INTO) para análisis instantáneo.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dialect Selector Bar */}
        <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Dialecto esperado:</span>
          <div className="flex items-center gap-1.5">
            {(['auto', 'postgresql', 'mysql', 'sqlserver', 'oracle', 'sqlite'] as const).map((dia) => (
              <button
                key={dia}
                onClick={() => setSelectedDialect(dia)}
                className={`px-2.5 py-1 rounded-md font-mono text-[11px] transition-colors ${
                  selectedDialect === dia
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {dia === 'auto' ? 'Auto-detectar' : dia.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-900/40 text-sm">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-3 px-4 text-center font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'upload'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Subir Archivo (.sql, .txt)</span>
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`flex-1 py-3 px-4 text-center font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'paste'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Pegar Código SQL</span>
          </button>
          <button
            onClick={() => setActiveTab('demos')}
            className={`flex-1 py-3 px-4 text-center font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'demos'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Respaldos Demo</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".sql,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                  dragActive
                    ? 'border-cyan-400 bg-cyan-500/10 scale-[0.99]'
                    : selectedFile
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'border-slate-700 hover:border-slate-500 bg-slate-950/40 hover:bg-slate-950/60'
                }`}
              >
                <div className={`p-4 rounded-full ${selectedFile ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-300'}`}>
                  {selectedFile ? <CheckCircle2 className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
                </div>
                {selectedFile ? (
                  <div>
                    <p className="font-semibold text-emerald-300 text-sm">{selectedFile.name}</p>
                    <p className="text-xs text-slate-400">
                      {(selectedFile.size / 1024).toFixed(1)} KB — Listo para procesar
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium text-slate-200 text-sm">
                      Arrastra y suelta tu archivo <span className="text-cyan-400">.sql</span> aquí, o haz clic para explorar
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Soporta volcados de PostgreSQL, MySQL, SQL Server, Oracle y SQLite.
                    </p>
                  </div>
                )}
              </div>

              {selectedFile && (
                <button
                  onClick={handleProcessUpload}
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  {loading ? 'Analizando esquema y registros...' : 'Iniciar Inspección del Respaldo'}
                </button>
              )}
            </div>
          )}

          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <input
                  type="text"
                  value={customFileName}
                  onChange={(e) => setCustomFileName(e.target.value)}
                  placeholder="Nombre de archivo (ej. dump_2026.sql)"
                  className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs w-64 focus:outline-none focus:border-cyan-500 font-mono"
                />
                <span className="text-slate-500 font-mono">
                  {pastedSql.split('\n').length} líneas | {(new Blob([pastedSql]).size / 1024).toFixed(1)} KB
                </span>
              </div>
              <textarea
                value={pastedSql}
                onChange={(e) => setPastedSql(e.target.value)}
                placeholder="Pegue aquí el contenido de su script SQL (CREATE TABLE, INSERT INTO, STORED PROCEDURES...)"
                rows={12}
                className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500/80 resize-none leading-relaxed"
              />
              <button
                onClick={handleProcessPasted}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                Procesar y Analizar SQL Pegado
              </button>
            </div>
          )}

          {activeTab === 'demos' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 mb-2">
                Seleccione un volcado de prueba prediseñado para explorar de inmediato las funcionalidades:
              </p>
              {DEMO_BACKUPS.map((demo) => (
                <div
                  key={demo.id}
                  onClick={() => handleLoadDemo(demo.id)}
                  className="p-4 rounded-xl border border-slate-800 hover:border-cyan-500/60 bg-slate-950/60 hover:bg-slate-800/40 cursor-pointer transition-all group flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200 group-hover:text-cyan-400 text-sm transition-colors">
                        {demo.name}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                        {demo.dialect}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{demo.description}</p>
                    <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                      <FileText className="w-3 h-3" /> {demo.fileName}
                    </span>
                  </div>
                  <button className="shrink-0 px-3 py-1.5 rounded-lg bg-cyan-500/10 group-hover:bg-cyan-500 text-cyan-400 group-hover:text-slate-950 font-semibold text-xs border border-cyan-500/20 group-hover:border-cyan-500 transition-all">
                    Cargar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
