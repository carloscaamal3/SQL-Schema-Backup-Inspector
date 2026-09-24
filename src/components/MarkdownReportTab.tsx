import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  Download,
  Eye,
  Code,
  FileCheck2,
} from 'lucide-react';
import { SqlSyntaxHighlighter } from './SqlSyntaxHighlighter';

interface MarkdownReportTabProps {
  markdownContent: string;
  fileName: string;
  onCopyMarkdown: () => void;
  onExportMarkdown: () => void;
  isCopied: boolean;
}

export const MarkdownReportTab: React.FC<MarkdownReportTabProps> = ({
  markdownContent,
  fileName,
  onCopyMarkdown,
  onExportMarkdown,
  isCopied,
}) => {
  const [viewMode, setViewMode] = useState<'preview' | 'raw'>('preview');

  // Simple Markdown parser for structured display
  const renderFormattedMarkdown = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBuffer: string[] = [];
    let codeLang = '';
    let inTable = false;
    let tableBuffer: string[] = [];

    const flushCode = (key: number) => {
      if (codeBuffer.length > 0) {
        elements.push(
          <SqlSyntaxHighlighter
            key={`code-${key}`}
            code={codeBuffer.join('\n')}
            title={codeLang ? `Código ${codeLang.toUpperCase()}` : 'SQL'}
          />
        );
        codeBuffer = [];
      }
    };

    const flushTable = (key: number) => {
      if (tableBuffer.length > 0) {
        const rows = tableBuffer.map((row) =>
          row
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim())
        );

        const headerRow = rows[0] || [];
        const dataRows = rows.slice(2); // Skip separator row

        elements.push(
          <div key={`table-${key}`} className="my-4 overflow-x-auto rounded-xl border border-slate-800 shadow-md">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead className="bg-slate-900 text-slate-300 border-b border-slate-800">
                <tr>
                  {headerRow.map((h, i) => (
                    <th key={i} className="py-2.5 px-4 font-semibold whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/70 text-slate-300">
                {dataRows.map((r, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-900/40 transition-colors">
                    {r.map((cell, cIdx) => (
                      <td key={cIdx} className="py-2 px-4 whitespace-nowrap">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableBuffer = [];
      }
    };

    lines.forEach((line, idx) => {
      // Code blocks ```sql
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          inCodeBlock = false;
          flushCode(idx);
        } else {
          flushTable(idx);
          inCodeBlock = true;
          codeLang = line.trim().slice(3);
        }
        return;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        return;
      }

      // Tables | ... | ... |
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        inTable = true;
        tableBuffer.push(line);
        return;
      } else if (inTable) {
        inTable = false;
        flushTable(idx);
      }

      // Headers
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={idx} className="text-xl font-bold text-white mt-6 mb-3 pb-2 border-b border-slate-800">
            {line.replace('# ', '')}
          </h1>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={idx} className="text-base font-semibold text-cyan-400 mt-6 mb-2 flex items-center gap-2">
            {line.replace('## ', '')}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        elements.push(
          <h3 key={idx} className="text-sm font-semibold text-slate-200 mt-4 mb-2">
            {line.replace('### ', '')}
          </h3>
        );
      } else if (line.startsWith('> ')) {
        elements.push(
          <div key={idx} className="p-3 my-2 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs">
            {line.replace('> ', '')}
          </div>
        );
      } else if (line.startsWith('---')) {
        elements.push(<hr key={idx} className="my-6 border-slate-800" />);
      } else if (line.trim().startsWith('- ')) {
        elements.push(
          <li key={idx} className="text-xs text-slate-300 ml-4 list-disc my-1 leading-relaxed">
            {line.replace('- ', '')}
          </li>
        );
      } else if (line.trim()) {
        elements.push(
          <p key={idx} className="text-xs text-slate-300 my-1.5 leading-relaxed font-sans">
            {line}
          </p>
        );
      }
    });

    flushCode(lines.length);
    flushTable(lines.length);

    return elements;
  };

  return (
    <div className="space-y-5">
      {/* Control Bar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <FileText className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              Informe Técnico en Markdown para Auditoría
            </h3>
            <p className="text-xs text-slate-400">
              Documento completo con tablas, rutinas DDL, relaciones y consultas de producción
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Switch preview / raw */}
          <div className="flex rounded-lg bg-slate-950 border border-slate-800 p-0.5 text-xs">
            <button
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium cursor-pointer transition-colors ${
                viewMode === 'preview'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Vista Previa</span>
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium cursor-pointer transition-colors ${
                viewMode === 'raw'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Markdown Crudo</span>
            </button>
          </div>

          <button
            onClick={onCopyMarkdown}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer transition-all active:scale-95"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{isCopied ? '¡Copiado!' : 'Copiar Informe'}</span>
          </button>

          <button
            onClick={onExportMarkdown}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold cursor-pointer transition-all active:scale-95 shadow-md shadow-cyan-500/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar .md</span>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 shadow-xl">
        {viewMode === 'preview' ? (
          <div className="max-w-4xl mx-auto space-y-2">
            {renderFormattedMarkdown(markdownContent)}
          </div>
        ) : (
          <div className="relative">
            <textarea
              readOnly
              value={markdownContent}
              rows={30}
              className="w-full p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-mono text-xs focus:outline-none resize-none leading-relaxed select-all"
            />
          </div>
        )}
      </div>
    </div>
  );
};
