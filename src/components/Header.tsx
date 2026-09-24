import React, { useState } from 'react';
import {
  Database,
  Upload,
  FileDown,
  Copy,
  Check,
  ShieldAlert,
  Terminal,
  Palette,
} from 'lucide-react';
import { ParsedSQLBackup, SQLDialect } from '../types/sql';
import { ThemeId, THEMES } from '../types/theme';
import { DEMO_BACKUPS } from '../data/demoBackups';

interface HeaderProps {
  backup: ParsedSQLBackup;
  dialect: SQLDialect;
  onDialectChange: (dialect: SQLDialect) => void;
  onOpenUploadModal: () => void;
  onLoadDemo: (demoId: string) => void;
  onExportMarkdown: () => void;
  onCopyMarkdown: () => void;
  isMarkdownCopied: boolean;
  theme: ThemeId;
  onOpenThemeModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  backup,
  dialect,
  onDialectChange,
  onOpenUploadModal,
  onLoadDemo,
  onExportMarkdown,
  onCopyMarkdown,
  isMarkdownCopied,
  theme,
  onOpenThemeModal,
}) => {
  const [showDemoDropdown, setShowDemoDropdown] = useState(false);
  const activeThemeConfig = THEMES.find((t) => t.id === theme) || THEMES[0];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo and App Title */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-500/20">
            <Database className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">
                SQL Schema & Backup Inspector
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800/60 uppercase">
                v2.5 Pro
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-xs sm:max-w-md">
              Ingeniería relacional, filtros multidimensionales y generador SQL de producción
            </p>
          </div>
        </div>

        {/* Current File Metadata Badge */}
        <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300 font-mono">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-white truncate max-w-[140px]">
              {backup.fileName}
            </span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">
            {(backup.fileSizeBytes / 1024).toFixed(1)} KB
          </span>
          <span className="text-slate-600">|</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-800 text-cyan-300 border border-slate-700">
            {backup.detectedDialect}
          </span>
          {backup.sensitiveAlerts.length > 0 && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800/60">
              <ShieldAlert className="w-3 h-3 text-amber-400" />
              {backup.sensitiveAlerts.length} PII
            </span>
          )}
        </div>

        {/* Dialect Selector & Actions */}
        <div className="flex items-center gap-2">
          {/* Dialect picker */}
          <div className="hidden md:flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
            {(['postgresql', 'mysql', 'sqlserver', 'oracle', 'sqlite'] as const).map((d) => (
              <button
                key={d}
                onClick={() => onDialectChange(d)}
                className={`px-2 py-1 rounded transition-colors text-[11px] ${
                  dialect === d
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={`Generar consultas para ${d.toUpperCase()}`}
              >
                {d === 'sqlserver' ? 'T-SQL' : d === 'postgresql' ? 'PG' : d.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Theme Picker Button */}
          <button
            onClick={onOpenThemeModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium cursor-pointer transition-colors"
            title={`Tema visual actual: ${activeThemeConfig.name}. Clic para cambiar tema.`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
              style={{ backgroundColor: activeThemeConfig.accentColor }}
            />
            <span className="hidden sm:inline font-medium">Tema:</span>
            <span className="font-mono text-cyan-400 font-semibold">{activeThemeConfig.badge}</span>
          </button>

          {/* Demo dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDemoDropdown(!showDemoDropdown)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium cursor-pointer transition-colors"
            >
              Demos ▾
            </button>
            {showDemoDropdown && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl py-2 z-50 text-xs animate-in">
                <div className="px-3 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Respaldos Prediseñados
                </div>
                {DEMO_BACKUPS.map((demo) => (
                  <button
                    key={demo.id}
                    onClick={() => {
                      onLoadDemo(demo.id);
                      setShowDemoDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-800/80 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-200">{demo.name}</div>
                      <div className="text-[10px] text-slate-400">{demo.fileName}</div>
                    </div>
                    <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400">
                      {demo.dialect}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Upload / Paste Button */}
          <button
            onClick={onOpenUploadModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-semibold cursor-pointer transition-all active:scale-95"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cargar SQL</span>
          </button>

          {/* Export Markdown Dropdown/Buttons */}
          <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-xs">
            <button
              onClick={onCopyMarkdown}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Copiar informe en Markdown al portapapeles"
            >
              {isMarkdownCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline">Copiar .md</span>
                </>
              )}
            </button>
            <span className="w-px h-3.5 bg-slate-800"></span>
            <button
              onClick={onExportMarkdown}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Descargar informe como archivo .md"
            >
              <FileDown className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Descargar .md</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
