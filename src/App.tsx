import React, { useState, useMemo, useEffect } from 'react';
import {
  Database,
  BarChart3,
  TableProperties,
  Code2,
  GitFork,
  FileText,
  ShieldAlert,
} from 'lucide-react';
import {
  ParsedSQLBackup,
  SQLDialect,
  FilterState,
} from './types/sql';
import { parseSQLDump } from './utils/sqlParser';
import { DEMO_BACKUPS } from './data/demoBackups';
import { generateMarkdownReport } from './utils/markdownReport';

// Components
import { Header } from './components/Header';
import { OverviewTab } from './components/OverviewTab';
import { RecordsExplorerTab } from './components/RecordsExplorerTab';
import { QueryGeneratorTab } from './components/QueryGeneratorTab';
import { RelationsDiagramTab } from './components/RelationsDiagramTab';
import { MarkdownReportTab } from './components/MarkdownReportTab';
import { SqlInputModal } from './components/SqlInputModal';
import { ThemeSelectorModal } from './components/ThemeSelectorModal';
import { ThemeId } from './types/theme';

export default function App() {
  // Theme state with local persistence
  const [theme, setTheme] = useState<ThemeId>(() => {
    return (localStorage.getItem('sql-inspector-theme') as ThemeId) || 'cyan';
  });
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  // Synchronize theme with document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    const isLightTheme = theme === 'light' || theme === 'sepia' || theme === 'paper-contrast';
    if (isLightTheme) {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
    try {
      localStorage.setItem('sql-inspector-theme', theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  // Initialize with the first demo dataset (E-Commerce MySQL backup)
  const initialDemo = DEMO_BACKUPS[0];
  const [backup, setBackup] = useState<ParsedSQLBackup>(() =>
    parseSQLDump(initialDemo.sql, initialDemo.fileName)
  );

  const tableNames = useMemo(() => Object.keys(backup.tables), [backup.tables]);
  const [activeTableName, setActiveTableName] = useState<string>(
    () => Object.keys(backup.tables)[0] || ''
  );

  const [activeTab, setActiveTab] = useState<
    'overview' | 'records' | 'queries' | 'relations' | 'markdown'
  >('overview');

  const [targetDialect, setTargetDialect] = useState<SQLDialect>(backup.detectedDialect);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isMarkdownCopied, setIsMarkdownCopied] = useState(false);

  // Active filters for current table
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    dateFilter: {
      enabled: false,
      column: '',
      periodType: 'all',
    },
    columnFilters: [],
  });

  // When active table changes or backup changes, synchronize date/SP_EJERCICIO column default
  useEffect(() => {
    const currentTable = backup.tables[activeTableName];
    if (currentTable) {
      const ejerCol = currentTable.columns.find((c) =>
        /sp_?ejer[c]?icio|ejercicio|ejericio/i.test(c.name)
      )?.name;
      const defaultCol = ejerCol || currentTable.dateColumns[0] || (currentTable.columns[0]?.name || '');

      setFilters((prev) => ({
        ...prev,
        dateFilter: {
          ...prev.dateFilter,
          column:
            prev.dateFilter.column && currentTable.columns.some((c) => c.name === prev.dateFilter.column)
              ? prev.dateFilter.column
              : defaultCol,
        },
      }));
    }
  }, [activeTableName, backup.tables]);

  // Process SQL dump content
  const handleProcessSql = (
    sqlContent: string,
    fileName: string = 'backup.sql',
    dialectOverride?: SQLDialect
  ) => {
    const parsed = parseSQLDump(sqlContent, fileName);
    if (dialectOverride) {
      parsed.detectedDialect = dialectOverride;
    }
    setBackup(parsed);

    const firstTable = Object.keys(parsed.tables)[0] || '';
    setActiveTableName(firstTable);
    setTargetDialect(parsed.detectedDialect);

    // Reset filters
    const firstTableObj = parsed.tables[firstTable];
    const ejerCol = firstTableObj?.columns.find((c) =>
      /sp_?ejer[c]?icio|ejercicio|ejericio/i.test(c.name)
    )?.name;
    const defaultCol = ejerCol || firstTableObj?.dateColumns[0] || (firstTableObj?.columns[0]?.name || '');

    setFilters({
      searchQuery: '',
      dateFilter: {
        enabled: false,
        column: defaultCol,
        periodType: 'all',
      },
      columnFilters: [],
    });

    setActiveTab('overview');
  };

  const handleLoadDemo = (demoId: string) => {
    const demo = DEMO_BACKUPS.find((d) => d.id === demoId);
    if (demo) {
      handleProcessSql(demo.sql, demo.fileName, demo.dialect);
    }
  };

  // Generate markdown report
  const markdownReport = useMemo(() => {
    return generateMarkdownReport(backup, activeTableName, filters, targetDialect);
  }, [backup, activeTableName, filters, targetDialect]);

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdownReport);
    setIsMarkdownCopied(true);
    setTimeout(() => setIsMarkdownCopied(false), 2500);
  };

  const handleExportMarkdown = () => {
    const blob = new Blob([markdownReport], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `informe_inspeccion_${backup.fileName.replace(/\.sql$/i, '')}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Header */}
      <Header
        backup={backup}
        dialect={targetDialect}
        onDialectChange={setTargetDialect}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
        onLoadDemo={handleLoadDemo}
        onExportMarkdown={handleExportMarkdown}
        onCopyMarkdown={handleCopyMarkdown}
        isMarkdownCopied={isMarkdownCopied}
        theme={theme}
        onOpenThemeModal={() => setIsThemeModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Tabs Bar */}
        <nav className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>1. Inspección & Resumen</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'overview' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {tableNames.length} tablas
            </span>
          </button>

          <button
            onClick={() => setActiveTab('records')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'records'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <TableProperties className="w-4 h-4" />
            <span>2. Explorador de Registros & Filtros</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'records' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {activeTableName || '0'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('queries')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'queries'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>3. Generador SQL Producción</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold uppercase ${
                activeTab === 'queries' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-cyan-400'
              }`}
            >
              {targetDialect}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('relations')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'relations'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <GitFork className="w-4 h-4" />
            <span>4. Diagrama ERD & Relaciones</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'relations' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-purple-400'
              }`}
            >
              {backup.foreignKeys.length} FK
            </span>
          </button>

          <button
            onClick={() => setActiveTab('markdown')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'markdown'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>5. Informe Markdown Completo</span>
          </button>
        </nav>

        {/* Tab View Container */}
        <div>
          {activeTab === 'overview' && (
            <OverviewTab
              backup={backup}
              onSelectTable={setActiveTableName}
              onNavigateToTab={setActiveTab}
            />
          )}

          {activeTab === 'records' && (
            <RecordsExplorerTab
              backup={backup}
              activeTableName={activeTableName}
              onSelectTable={setActiveTableName}
              filters={filters}
              onUpdateFilters={setFilters}
            />
          )}

          {activeTab === 'queries' && (
            <QueryGeneratorTab
              backup={backup}
              activeTableName={activeTableName}
              onSelectTable={setActiveTableName}
              filters={filters}
              dialect={targetDialect}
              onDialectChange={setTargetDialect}
            />
          )}

          {activeTab === 'relations' && (
            <RelationsDiagramTab
              backup={backup}
              activeTableName={activeTableName}
              onSelectTable={setActiveTableName}
              onNavigateToRecords={(tbl) => {
                setActiveTableName(tbl);
                setActiveTab('records');
              }}
            />
          )}

          {activeTab === 'markdown' && (
            <MarkdownReportTab
              markdownContent={markdownReport}
              fileName={backup.fileName}
              onCopyMarkdown={handleCopyMarkdown}
              onExportMarkdown={handleExportMarkdown}
              isCopied={isMarkdownCopied}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>Motor de Análisis de Esquemas SQL Relacionales Activo</span>
          </div>
          <div className="text-[11px] text-slate-600">
            Compatible con PostgreSQL • MySQL • SQL Server • Oracle • SQLite
          </div>
        </div>
      </footer>

      {/* Upload/Paste Modal */}
      <SqlInputModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onProcessSql={handleProcessSql}
      />

      {/* Theme Selector Modal */}
      <ThemeSelectorModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        currentTheme={theme}
        onSelectTheme={setTheme}
      />
    </div>
  );
}
