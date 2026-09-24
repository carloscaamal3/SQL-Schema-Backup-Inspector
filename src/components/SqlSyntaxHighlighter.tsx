import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface SqlSyntaxHighlighterProps {
  code: string;
  title?: string;
  badge?: string;
  copyable?: boolean;
}

const SQL_KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'LIKE',
  'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'CROSS', 'ON',
  'GROUP', 'BY', 'HAVING', 'ORDER', 'ASC', 'DESC', 'LIMIT', 'OFFSET',
  'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
  'CREATE', 'TABLE', 'DROP', 'ALTER', 'ADD', 'CONSTRAINT', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES',
  'PROCEDURE', 'FUNCTION', 'TRIGGER', 'VIEW', 'RETURNS', 'BEGIN', 'END', 'IF', 'ELSE', 'THEN',
  'DECLARE', 'AS', 'WITH', 'OVER', 'PARTITION', 'ROW_NUMBER', 'CASE', 'WHEN',
  'TOP', 'FETCH', 'NEXT', 'ROWS', 'ONLY', 'COALESCE', 'ROUND', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
  'DATE_TRUNC', 'DATE_FORMAT', 'FORMAT', 'TO_CHAR', 'CONVERT', 'CAST', 'DATENAME', 'DATEPART',
  'INT', 'INTEGER', 'VARCHAR', 'NVARCHAR', 'DECIMAL', 'NUMERIC', 'DATETIME', 'DATETIME2', 'DATE', 'TIMESTAMP',
  'BOOLEAN', 'TEXT', 'SERIAL', 'IDENTITY', 'AUTO_INCREMENT'
]);

export const SqlSyntaxHighlighter: React.FC<SqlSyntaxHighlighterProps> = ({
  code,
  title,
  badge,
  copyable = true,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlightSql = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, lineIdx) => {
      // Line comments
      if (line.trim().startsWith('--')) {
        return (
          <div key={lineIdx} className="text-slate-500 italic">
            {line}
          </div>
        );
      }

      // Tokenize by spaces, operators, parentheses, quotes
      const tokens: React.ReactNode[] = [];
      const regex = /(--.*$)|('([^'\\]|\\.)*')|("([^"\\]|\\.)*")|(`([^`\\]|\\.)*`)|(\b\d+(\.\d+)?\b)|(\b[A-Za-z_][A-Za-z0-9_]*\b)|([(),;=><+\-*\/])|(\s+)/g;
      let match;
      let lastIndex = 0;

      while ((match = regex.exec(line)) !== null) {
        const [full, comment, sQuote, , dQuote, , bQuote, , num, , word, symbol, spaces] = match;

        if (comment) {
          tokens.push(<span key={match.index} className="text-slate-500 italic">{comment}</span>);
        } else if (sQuote || dQuote) {
          tokens.push(<span key={match.index} className="text-emerald-400">{full}</span>);
        } else if (bQuote) {
          tokens.push(<span key={match.index} className="text-amber-300">{full}</span>);
        } else if (num) {
          tokens.push(<span key={match.index} className="text-amber-400">{num}</span>);
        } else if (word) {
          if (SQL_KEYWORDS.has(word.toUpperCase())) {
            tokens.push(<span key={match.index} className="text-cyan-400 font-semibold">{word}</span>);
          } else {
            tokens.push(<span key={match.index} className="text-slate-200">{word}</span>);
          }
        } else if (symbol) {
          tokens.push(<span key={match.index} className="text-purple-400">{symbol}</span>);
        } else if (spaces) {
          tokens.push(<span key={match.index}>{spaces}</span>);
        }
        lastIndex = regex.lastIndex;
      }

      if (tokens.length === 0) {
        tokens.push(<span key={0}>{line || ' '}</span>);
      }

      return (
        <div key={lineIdx} className="table-row leading-relaxed">
          <span className="table-cell select-none pr-4 text-right text-xs text-slate-600 font-mono">
            {lineIdx + 1}
          </span>
          <span className="table-cell">{tokens}</span>
        </div>
      );
    });
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/80 shadow-xl overflow-hidden my-3">
      {(title || copyable || badge) && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-2 font-mono">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-500/80 animate-pulse"></span>
            <span className="font-medium text-slate-300">{title || 'SQL'}</span>
            {badge && (
              <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/50 text-[10px] font-semibold">
                {badge}
              </span>
            )}
          </div>
          {copyable && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-all text-xs font-medium cursor-pointer border border-slate-700/60 shadow-sm active:scale-95"
              title="Copiar SQL al portapapeles"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copiar SQL</span>
                </>
              )}
            </button>
          )}
        </div>
      )}
      <div className="p-4 overflow-x-auto text-xs font-mono text-slate-200 bg-slate-950 selection:bg-cyan-900/60">
        <div className="table w-full">{highlightSql(code)}</div>
      </div>
    </div>
  );
};
