// Preset color themes for Schedule Comments (supporting shifts, delivery stations, safety, etc.)
export interface CommentColorTheme {
  id: string;
  name: string;
  colorClass: string; // Tailwind styling for day cell button
  badgeClass: string;
  dotColor: string; // Hex / rgb dot for picker
}

export const COMMENT_COLOR_THEMES: CommentColorTheme[] = [
  {
    id: 'emerald',
    name: 'Verde Esmeralda (Turno Regular / 9:15 AM)',
    colorClass: 'bg-emerald-950/85 text-emerald-300 border-emerald-500/70 hover:bg-emerald-900',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    dotColor: '#10b981'
  },
  {
    id: 'teal',
    name: 'Teal / Turquesa (Rescue / Sweep)',
    colorClass: 'bg-teal-950/85 text-teal-300 border-teal-500/70 hover:bg-teal-900',
    badgeClass: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    dotColor: '#14b8a6'
  },
  {
    id: 'cyan',
    name: 'Cyan / Aqua (Estación Primaria / DFL4)',
    colorClass: 'bg-cyan-950/85 text-cyan-300 border-cyan-500/70 hover:bg-cyan-900',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    dotColor: '#06b6d4'
  },
  {
    id: 'blue',
    name: 'Azul Real (Estación Secundaria / DMI1)',
    colorClass: 'bg-blue-950/85 text-blue-300 border-blue-500/70 hover:bg-blue-900',
    badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    dotColor: '#3b82f6'
  },
  {
    id: 'sky',
    name: 'Azul Claro (Standby / Backup)',
    colorClass: 'bg-sky-950/85 text-sky-300 border-sky-500/70 hover:bg-sky-900',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    dotColor: '#38bdf8'
  },
  {
    id: 'indigo',
    name: 'Índigo / Nocturno (Cierre / RTS)',
    colorClass: 'bg-indigo-950/85 text-indigo-300 border-indigo-500/70 hover:bg-indigo-900',
    badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    dotColor: '#6366f1'
  },
  {
    id: 'purple',
    name: 'Púrpura / Violeta (Estación Remota / Lockers / PTO)',
    colorClass: 'bg-purple-950/85 text-purple-300 border-purple-500/70 hover:bg-purple-900',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    dotColor: '#a855f7'
  },
  {
    id: 'fuchsia',
    name: 'Fucsia / Magenta (Rutas Especiales / Flex)',
    colorClass: 'bg-fuchsia-950/85 text-fuchsia-300 border-fuchsia-500/70 hover:bg-fuchsia-900',
    badgeClass: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
    dotColor: '#d946ef'
  },
  {
    id: 'amber',
    name: 'Ámbar / Naranja (Suspend Safety / Netradyne / DVIC)',
    colorClass: 'bg-amber-950/85 text-amber-300 border-amber-500/70 hover:bg-amber-900',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    dotColor: '#f59e0b'
  },
  {
    id: 'orange',
    name: 'Naranja Fuerte (Entrenamiento / Sombra / Ride-along)',
    colorClass: 'bg-orange-950/85 text-orange-300 border-orange-500/70 hover:bg-orange-900',
    badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    dotColor: '#f97316'
  },
  {
    id: 'red',
    name: 'Rojo (Call Out / Falta con aviso)',
    colorClass: 'bg-red-950/85 text-red-300 border-red-500/70 hover:bg-red-900',
    badgeClass: 'bg-red-500/20 text-red-300 border-red-500/40',
    dotColor: '#ef4444'
  },
  {
    id: 'rose',
    name: 'Rosa Oscuro (No Call No Show / NCNS)',
    colorClass: 'bg-rose-950/90 text-rose-300 border-rose-500/80 hover:bg-rose-900',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    dotColor: '#f43f5e'
  },
  {
    id: 'slate',
    name: 'Gris / Slate (Día Libre / Off)',
    colorClass: 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200 hover:bg-slate-700',
    badgeClass: 'bg-slate-800 text-slate-400 border-slate-700',
    dotColor: '#64748b'
  }
];

export interface ScheduleCommentOption {
  id: string;
  label: string; // The display tag / comment text placed in the day cell (e.g. "9:15 AM", "DFL4 - 9:15 AM", "Call Out")
  isWork: boolean; // Whether this indicates the driver is scheduled to work
  category: 'work' | 'absence' | 'safety' | 'off';
  colorId?: string; // e.g. "emerald", "blue", "amber", "cyan"
  colorClass: string; // Tailwind styling for cell button
  badgeClass: string;
  description: string;
  stationCode?: string; // Optional delivery station code (e.g. DFL4, DMI1, etc.)
}

export const PRESET_SCHEDULE_COMMENTS: ScheduleCommentOption[] = [
  {
    id: 'work-915am',
    label: '9:15 AM',
    isWork: true,
    category: 'work',
    colorId: 'emerald',
    colorClass: 'bg-emerald-950/85 text-emerald-300 border-emerald-500/70 hover:bg-emerald-900',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    description: 'Turno Regular (Trabaja - Onda 9:15 AM)'
  },
  {
    id: 'work-845am',
    label: '8:45 AM',
    isWork: true,
    category: 'work',
    colorId: 'emerald',
    colorClass: 'bg-emerald-950/85 text-emerald-300 border-emerald-500/70 hover:bg-emerald-900',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    description: 'Turno Temprano (Trabaja - Onda 8:45 AM)'
  },
  {
    id: 'work-rescue',
    label: 'Rescue / 10:00 AM',
    isWork: true,
    category: 'work',
    colorId: 'teal',
    colorClass: 'bg-teal-950/85 text-teal-300 border-teal-500/70 hover:bg-teal-900',
    badgeClass: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    description: 'Turno de Rescate / Barredor (Trabaja)'
  },
  {
    id: 'work-standby',
    label: 'Standby / Backup',
    isWork: true,
    category: 'work',
    colorId: 'sky',
    colorClass: 'bg-sky-950/85 text-sky-300 border-sky-500/70 hover:bg-sky-900',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    description: 'Standby / Conductor de Reserva en Estación'
  },
  {
    id: 'abs-callout',
    label: 'Call Out',
    isWork: false,
    category: 'absence',
    colorId: 'red',
    colorClass: 'bg-red-950/85 text-red-300 border-red-500/70 hover:bg-red-900',
    badgeClass: 'bg-red-500/20 text-red-300 border-red-500/40',
    description: 'Call Out (Llamó avisando ausencia)'
  },
  {
    id: 'abs-suspend-safety',
    label: 'Suspend Safety',
    isWork: false,
    category: 'safety',
    colorId: 'amber',
    colorClass: 'bg-amber-950/85 text-amber-300 border-amber-500/70 hover:bg-amber-900',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    description: 'Suspendido por Seguridad (Netradyne / DVIC / Tier 1)'
  },
  {
    id: 'abs-ncns',
    label: 'No Call No Show',
    isWork: false,
    category: 'absence',
    colorId: 'rose',
    colorClass: 'bg-rose-950/90 text-rose-300 border-rose-500/80 hover:bg-rose-900',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    description: 'No Call No Show (Falta injustificada sin aviso)'
  },
  {
    id: 'off-day',
    label: 'Off',
    isWork: false,
    category: 'off',
    colorId: 'slate',
    colorClass: 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200 hover:bg-slate-700',
    badgeClass: 'bg-slate-800 text-slate-400 border-slate-700',
    description: 'Día Libre Programado (Off)'
  },
  {
    id: 'off-vacation',
    label: 'Vacaciones / PTO',
    isWork: false,
    category: 'off',
    colorId: 'purple',
    colorClass: 'bg-purple-950/85 text-purple-300 border-purple-500/70 hover:bg-purple-900',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    description: 'Vacaciones Aprobadas / PTO'
  }
];

// Determine if a comment/status text represents a working shift
export function isWorkingShift(commentOrStatus?: string): boolean {
  if (!commentOrStatus) return false;
  const lower = commentOrStatus.toLowerCase().trim();

  // If explicitly 'trabaja'
  if (lower === 'trabaja') return true;

  // Check explicit non-working first
  if (
    lower === 'off' ||
    lower.includes('call out') ||
    lower.includes('call-out') ||
    lower.includes('suspend') ||
    lower.includes('seguridad') ||
    lower.includes('safety') ||
    lower.includes('no call') ||
    lower.includes('ncns') ||
    lower.includes('vacaci') ||
    lower.includes('pto') ||
    lower.includes('licencia')
  ) {
    return false;
  }

  // Common shift hours or station assignments: "9:15 AM", "8:45 AM", "10:00 AM", "Standby", "Rescue", or general AM/PM/HH:mm
  if (
    lower.includes('am') ||
    lower.includes('pm') ||
    lower.includes(':') ||
    lower.includes('standby') ||
    lower.includes('rescue') ||
    lower.includes('wave') ||
    lower.includes('onda') ||
    lower.includes('ruta') ||
    lower.includes('dfl') ||
    lower.includes('dmi')
  ) {
    return true;
  }

  return false;
}

// Get styling for any comment tag, matching against the current list of options (presets or custom)
export function getCommentVisualProps(
  comment?: string,
  options: ScheduleCommentOption[] = PRESET_SCHEDULE_COMMENTS
): {
  colorClass: string;
  badgeClass: string;
  isWork: boolean;
} {
  if (!comment) {
    return {
      colorClass: 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200 hover:bg-slate-700',
      badgeClass: 'bg-slate-800 text-slate-400 border-slate-700',
      isWork: false
    };
  }

  // Check in available configured options (including custom ones with their custom colors)
  const found = options.find(
    (p) => p.label.toLowerCase() === comment.toLowerCase()
  );

  if (found) {
    return {
      colorClass: found.colorClass,
      badgeClass: found.badgeClass,
      isWork: found.isWork
    };
  }

  // Dynamic fallback detection for text containing keywords
  const isWork = isWorkingShift(comment);
  const lower = comment.toLowerCase();

  if (lower.includes('safety') || lower.includes('suspend')) {
    return {
      colorClass: 'bg-amber-950/85 text-amber-300 border-amber-500/70 hover:bg-amber-900',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      isWork: false
    };
  }

  if (lower.includes('no call') || lower.includes('ncns') || lower.includes('call out')) {
    return {
      colorClass: 'bg-red-950/85 text-red-300 border-red-500/70 hover:bg-red-900',
      badgeClass: 'bg-red-500/20 text-red-300 border-red-500/40',
      isWork: false
    };
  }

  if (isWork) {
    return {
      colorClass: 'bg-emerald-950/85 text-emerald-300 border-emerald-500/70 hover:bg-emerald-900',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      isWork: true
    };
  }

  return {
    colorClass: 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700',
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
    isWork: false
  };
}
