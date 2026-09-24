import React from 'react';
import { Palette, Check, X, Sparkles, Sun, Moon } from 'lucide-react';
import { ThemeId, THEMES } from '../types/theme';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemeId;
  onSelectTheme: (themeId: ThemeId) => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onSelectTheme,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-4xl rounded-2xl border border-slate-700 bg-slate-900/98 shadow-2xl p-6 space-y-5 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Palette className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-white">Galería de Temas Visuales ({THEMES.length} Temas)</h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Alta Lectura
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Elija la paleta de colores, contraste tipográfico y modo claro u oscuro que mejor se adapte a su entorno de trabajo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Theme Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[62vh] overflow-y-auto pr-1 scrollbar-thin">
          {THEMES.map((theme) => {
            const isSelected = currentTheme === theme.id;
            return (
              <div
                key={theme.id}
                onClick={() => {
                  onSelectTheme(theme.id);
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2.5 relative overflow-hidden group ${
                  isSelected
                    ? 'border-cyan-400 ring-2 ring-cyan-400/50 bg-slate-950 shadow-xl'
                    : 'border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-950'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-5 h-5 rounded-full border-2 border-white/30 shadow-sm flex items-center justify-center shrink-0"
                      style={{ backgroundColor: theme.accentColor }}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3.5]" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-white">{theme.name}</span>
                        {!theme.isDark && (
                          <span title="Modo Claro">
                            <Sun className="w-3.5 h-3.5 text-amber-400" />
                          </span>
                        )}
                        {theme.isDark && (
                          <span title="Modo Oscuro">
                            <Moon className="w-3.5 h-3.5 text-slate-400" />
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                        {theme.badge}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-cyan-400 text-slate-950 shadow-xs">
                      Activo
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-normal">{theme.description}</p>

                {/* Preview swatch bar */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: theme.accentColor }}
                    ></span>
                    <span className="text-slate-300 font-medium">{theme.accentColor}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${theme.isDark ? 'bg-slate-900 text-slate-300' : 'bg-amber-950/60 text-amber-300 border border-amber-800/40'}`}>
                    {theme.isDark ? 'Modo Oscuro' : 'Modo Claro'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-4 text-xs text-slate-300">
          <span>El tema seleccionado se preserva en tiempo real en la aplicación.</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold cursor-pointer transition-all shadow-md active:scale-95"
          >
            Aplicar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
