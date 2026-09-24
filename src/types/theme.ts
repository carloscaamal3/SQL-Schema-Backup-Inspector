export type ThemeId =
  | 'cyan'
  | 'sapphire'
  | 'emerald'
  | 'purple'
  | 'amber'
  | 'crimson'
  | 'sunset'
  | 'nordic'
  | 'dracula'
  | 'synthwave'
  | 'matrix'
  | 'forest'
  | 'monokai'
  | 'coffee'
  | 'solarized'
  | 'paper-contrast'
  | 'light'
  | 'sepia';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  badge: string;
  description: string;
  accentColor: string;
  previewBg: string;
  isDark: boolean;
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'cyan',
    name: 'Cian Cyberpunk (Predeterminado)',
    badge: 'CYBER',
    description: 'Consola técnica en tonos cian de alto contraste sobre pizarra oscura',
    accentColor: '#06b6d4',
    previewBg: '#020617',
    isDark: true,
  },
  {
    id: 'sapphire',
    name: 'Zafiro Medianoche',
    badge: 'SAPPHIRE',
    description: 'Azul cobalto financiero profundo y moderno estilo enterprise',
    accentColor: '#3b82f6',
    previewBg: '#030712',
    isDark: true,
  },
  {
    id: 'emerald',
    name: 'Esmeralda Terminal',
    badge: 'MATRIX',
    description: 'Verde matriz de auditoría contable y finanzas de alta legibilidad',
    accentColor: '#10b981',
    previewBg: '#021a12',
    isDark: true,
  },
  {
    id: 'purple',
    name: 'Amatista Neón',
    badge: 'NEON',
    description: 'Violeta dinámico para análisis relacional de datos y diagramas ERD',
    accentColor: '#a855f7',
    previewBg: '#0a0414',
    isDark: true,
  },
  {
    id: 'amber',
    name: 'Ámbar Ejecutivo',
    badge: 'GOLD',
    description: 'Tonos cálidos de oro y bronce ideales para auditorías fiscales',
    accentColor: '#f59e0b',
    previewBg: '#0c0a09',
    isDark: true,
  },
  {
    id: 'crimson',
    name: 'Rojo Rubí / Crimson',
    badge: 'RUBY',
    description: 'Rojo carmesí de alto impacto visual sobre fondo obsidiana',
    accentColor: '#ef4444',
    previewBg: '#0f0507',
    isDark: true,
  },
  {
    id: 'sunset',
    name: 'Atardecer Coral',
    badge: 'SUNSET',
    description: 'Cálido degradado naranja y coral con contraste suave',
    accentColor: '#f97316',
    previewBg: '#120703',
    isDark: true,
  },
  {
    id: 'nordic',
    name: 'Nórdico Glaciar',
    badge: 'FROST',
    description: 'Gris ártico y azul hielo con tipografía clara y descansada',
    accentColor: '#38bdf8',
    previewBg: '#0b1120',
    isDark: true,
  },
  {
    id: 'dracula',
    name: 'Drácula / Tokyo Night',
    badge: 'TOKYO',
    description: 'Paleta icónica en tonos violeta oscuro, fucsia y turquesa',
    accentColor: '#ec4899',
    previewBg: '#0d0718',
    isDark: true,
  },
  {
    id: 'synthwave',
    name: 'Synthwave 80s / Retro',
    badge: 'SYNTH',
    description: 'Neón magenta y violeta eléctrico inspirado en estética retro 1984',
    accentColor: '#f43f5e',
    previewBg: '#13041c',
    isDark: true,
  },
  {
    id: 'matrix',
    name: 'Matrix OLED Pure Black',
    badge: 'OLED',
    description: 'Negro absoluto 100% OLED con verde fósforo de ultra alto contraste',
    accentColor: '#22c55e',
    previewBg: '#000000',
    isDark: true,
  },
  {
    id: 'forest',
    name: 'Bosque Pinos & Menta',
    badge: 'FOREST',
    description: 'Verde pino de montaña y salvia con atmósfera serena y descansada',
    accentColor: '#14b8a6',
    previewBg: '#041d1a',
    isDark: true,
  },
  {
    id: 'monokai',
    name: 'Monokai Pro / Carbón',
    badge: 'MONOKAI',
    description: 'Paleta legendaria de editores de código con acento amarillo vibrante',
    accentColor: '#eab308',
    previewBg: '#111217',
    isDark: true,
  },
  {
    id: 'coffee',
    name: 'Espresso & Caramelo',
    badge: 'COFFEE',
    description: 'Tostado moca profundo con acentos caramelo que alivian la fatiga ocular',
    accentColor: '#d97706',
    previewBg: '#18110b',
    isDark: true,
  },
  {
    id: 'solarized',
    name: 'Solarized Dark Pro',
    badge: 'SOLAR',
    description: 'Esquema matemático preciso de luminancias de Ethan Schoonover',
    accentColor: '#2aa198',
    previewBg: '#002b36',
    isDark: true,
  },
  {
    id: 'paper-contrast',
    name: 'Modo Claro Alto Contraste',
    badge: 'CONTRAST',
    description: 'Blanco nieve con tinta negra carbón pura para lectura bajo luz solar',
    accentColor: '#2563eb',
    previewBg: '#ffffff',
    isDark: false,
  },
  {
    id: 'light',
    name: 'Modo Claro Empresarial',
    badge: 'LIGHT',
    description: 'Fondo blanco puro con textos en azul pizarra oscuro para máxima legibilidad diurna',
    accentColor: '#0284c7',
    previewBg: '#f8fafc',
    isDark: false,
  },
  {
    id: 'sepia',
    name: 'Pergamino / Sepia Editorial',
    badge: 'SEPIA',
    description: 'Tono crema cálido con tipografía color café expreso que reduce la fatiga visual',
    accentColor: '#b45309',
    previewBg: '#fefce8',
    isDark: false,
  },
];
