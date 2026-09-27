import React, { useState, useMemo } from 'react';
import {
  Download,
  ArrowUpDown,
  Search,
  MessageSquare,
  Sparkles,
  UserCheck,
  PlusCircle,
  Tag,
  Check,
  Users,
  Info
} from 'lucide-react';
import { DaySchedule, Driver, ScheduleStatus } from '../types';
import {
  calculateSeniority,
  DAY_NAMES_ES,
  DAY_NAMES_SHORT_ES,
  getWeekDates,
  toIsoDate
} from '../utils/dateUtils';
import { exportScheduleToExcel } from '../utils/excelExport';
import {
  getCommentVisualProps,
  isWorkingShift,
  PRESET_SCHEDULE_COMMENTS,
  ScheduleCommentOption
} from '../utils/scheduleComments';
import { ScheduleCommentManagerModal } from './ScheduleCommentManagerModal';
import { DayCommentPickerModal } from './DayCommentPickerModal';
import { AutoScheduleModal } from './AutoScheduleModal';

interface ScheduleModuleProps {
  currentMonday: Date;
  drivers: Driver[];
  schedule: DaySchedule[];
  onUpdateDaySchedule: (driverId: string, date: string, status: ScheduleStatus, comment?: string) => void;
  onAutoCopyScheduleToNextWeek: (sourceMonday: Date, targetMonday: Date) => void;
  selectedDateIso?: string;
  onSelectDate?: (dateIso: string) => void;
  onNavigateToTruckAssignment?: (dateIso: string) => void;
  onSelectDateForTruckAssignment?: (dateIso: string) => void;
  dspName: string;
}

type SortMode = 'seniority' | 'alphabetical';

export const ScheduleModule: React.FC<ScheduleModuleProps> = ({
  currentMonday,
  drivers,
  schedule,
  onUpdateDaySchedule,
  onAutoCopyScheduleToNextWeek,
  selectedDateIso,
  onSelectDate,
  onNavigateToTruckAssignment,
  onSelectDateForTruckAssignment,
  dspName
}) => {
  const [sortMode, setSortMode] = useState<SortMode>('seniority');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAutoScheduleModalOpen, setIsAutoScheduleModalOpen] = useState(false);
  const [selectedDayIso, setSelectedDayIso] = useState<string | null>(selectedDateIso || null);
  const [filterOnlyWorkingOnDay, setFilterOnlyWorkingOnDay] = useState(false);

  // Sync selected day if parent passes selectedDateIso
  React.useEffect(() => {
    if (selectedDateIso && !selectedDayIso) {
      setSelectedDayIso(selectedDateIso);
    }
  }, [selectedDateIso]);

  const handleDayClick = (iso: string) => {
    setSelectedDayIso(iso);
    if (onSelectDate) {
      onSelectDate(iso);
    }
  };

  // Comment Options state (stored in localStorage)
  const [commentOptions, setCommentOptions] = useState<ScheduleCommentOption[]>(() => {
    const saved = localStorage.getItem('dsp_ops_schedule_comment_options_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return PRESET_SCHEDULE_COMMENTS;
      }
    }
    return PRESET_SCHEDULE_COMMENTS;
  });

  // Currently active quick-apply comment from top bar (defaults to '9:15 AM' = trabaja)
  const [activeQuickComment, setActiveQuickComment] = useState<ScheduleCommentOption>(() => {
    return (
      commentOptions.find((o) => o.label === '9:15 AM') ||
      commentOptions[0] ||
      PRESET_SCHEDULE_COMMENTS[0]
    );
  });

  // Modal controls
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [dayPickerTarget, setDayPickerTarget] = useState<{
    driverId: string;
    driverName: string;
    date: string;
    dayLabel: string;
    currentComment?: string;
  } | null>(null);

  const weekDates = useMemo(() => getWeekDates(currentMonday), [currentMonday]);

  // Helper to save comment options
  const handleSaveOptions = (newOptions: ScheduleCommentOption[]) => {
    setCommentOptions(newOptions);
    localStorage.setItem('dsp_ops_schedule_comment_options_v1', JSON.stringify(newOptions));
  };

  const handleAddOption = (opt: ScheduleCommentOption) => {
    const next = [...commentOptions, opt];
    handleSaveOptions(next);
  };

  const handleDeleteOption = (id: string) => {
    const next = commentOptions.filter((o) => o.id !== id);
    handleSaveOptions(next);
  };

  const handleResetDefaults = () => {
    if (window.confirm('¿Deseas restablecer la lista de comentarios y colores a los valores iniciales?')) {
      handleSaveOptions(PRESET_SCHEDULE_COMMENTS);
      setActiveQuickComment(PRESET_SCHEDULE_COMMENTS[0]);
    }
  };

  // Helper to check if a schedule record is working (either status === 'Trabaja' or comment denotes working shift)
  const isDriverWorkingDay = (record?: DaySchedule): boolean => {
    if (!record) return false;
    if (record.comment) {
      return isWorkingShift(record.comment);
    }
    return record.status === 'Trabaja';
  };

  // Real-time Driver Count working for each day of the week
  // "En el botón de Schedule en cada día de la semana, quiero que abajo le pongas la cantidad de Driver que asignaste a trabajar."
  const dailyWorkingCounts = useMemo(() => {
    return weekDates.map((dateObj) => {
      const iso = toIsoDate(dateObj);
      const count = schedule.filter((s) => s.date === iso && isDriverWorkingDay(s)).length;
      return count;
    });
  }, [weekDates, schedule]);

  const selectedDayInfo = useMemo(() => {
    if (!selectedDayIso) return null;
    const idx = weekDates.findIndex((d) => toIsoDate(d) === selectedDayIso);
    if (idx < 0) return null;
    const dateObj = weekDates[idx];
    return {
      label: `${DAY_NAMES_ES[idx]} ${dateObj.getDate()}`,
      dayShort: DAY_NAMES_SHORT_ES[idx],
      dayNumber: dateObj.getDate(),
      count: dailyWorkingCounts[idx],
      iso: selectedDayIso
    };
  }, [selectedDayIso, weekDates, dailyWorkingCounts]);

  // Filter and sort drivers
  const filteredAndSortedDrivers = useMemo(() => {
    let list = drivers.filter((d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.phone.includes(searchQuery)
    );

    if (selectedDayIso && filterOnlyWorkingOnDay) {
      list = list.filter((d) => {
        const record = schedule.find((s) => s.driverId === d.id && s.date === selectedDayIso);
        return isDriverWorkingDay(record);
      });
    }

    if (sortMode === 'seniority') {
      return list.sort((a, b) => {
        const timeA = new Date(a.hireDate).getTime();
        const timeB = new Date(b.hireDate).getTime();
        return timeA - timeB;
      });
    } else {
      return list.sort((a, b) => a.name.localeCompare(b.name));
    }
  }, [drivers, searchQuery, sortMode, selectedDayIso, filterOnlyWorkingOnDay, schedule]);

  const getScheduleRecord = (driverId: string, dateIso: string) => {
    return schedule.find((s) => s.driverId === driverId && s.date === dateIso);
  };

  const handleExport = () => {
    exportScheduleToExcel(currentMonday, drivers, schedule, dspName, commentOptions);
  };

  // When clicking on a day cell button:
  // If user clicks with shift or right click, open picker.
  // Normal click: Quick toggles with activeQuickComment or cycles through common options.
  const handleCellClick = (
    driverId: string,
    dateIso: string,
    driverName: string,
    dayLabel: string,
    currentComment?: string,
    e?: React.MouseEvent
  ) => {
    // If Shift key is pressed or clicked directly, open DayCommentPickerModal to let user choose freely
    if (e?.shiftKey) {
      setDayPickerTarget({
        driverId,
        driverName,
        date: dateIso,
        dayLabel,
        currentComment
      });
      return;
    }

    // Direct 1-click apply of comment or cycling:
    // If empty/Off -> apply activeQuickComment (e.g. "9:15 AM")
    // If matches activeQuickComment -> cycle to Call Out -> Suspend Safety -> Off
    if (!currentComment || currentComment === 'Off') {
      const isWork = activeQuickComment.isWork;
      const status: ScheduleStatus = isWork ? 'Trabaja' : 'Off';
      onUpdateDaySchedule(driverId, dateIso, status, activeQuickComment.label);
    } else {
      // Open picker dialog so dispatcher has instant access to every preset
      setDayPickerTarget({
        driverId,
        driverName,
        date: dateIso,
        dayLabel,
        currentComment
      });
    }
  };

  const handleSaveCellComment = (commentText: string, isWork: boolean) => {
    if (!dayPickerTarget) return;

    let status: ScheduleStatus = isWork ? 'Trabaja' : 'Off';
    const lower = commentText.toLowerCase();

    if (lower.includes('call out') || lower.includes('call-out')) {
      status = 'Call-Out';
    } else if (lower.includes('standby')) {
      status = 'Standby';
    } else if (isWork) {
      status = 'Trabaja';
    } else {
      status = 'Off';
    }

    onUpdateDaySchedule(dayPickerTarget.driverId, dayPickerTarget.date, status, commentText);
    setDayPickerTarget(null);
  };

  return (
    <div className="space-y-4">
      {/* Action Toolbar */}
      {/* "Ahora, en la barra principal, donde se organizan por antigüedad y alfabético y todo, quiero que ahí añada un botón donde ahí yo pongo los comentarios que se van a poner en los días de la semana. Ahí yo voy a añadir 9:15 AM, que es la hora de en trabaja, eso significa que trabaja. Voy poner call out, pongo suspendido por seguridad, que es suspend safety, no call no show, poner todas esas cosas. Pero yo quiero que haya un botón en la barra principal que es donde tú añades el comentario del día de trabajo." */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-3 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-md">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Sort Control */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5 text-xs">
            <span className="px-2.5 py-1 text-slate-400 flex items-center gap-1.5 font-medium">
              <ArrowUpDown className="w-3.5 h-3.5" />
              Ordenar:
            </span>
            <button
              onClick={() => setSortMode('seniority')}
              className={`px-3 py-1 font-semibold rounded-md transition-all cursor-pointer ${
                sortMode === 'seniority'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Antigüedad
            </button>
            <button
              onClick={() => setSortMode('alphabetical')}
              className={`px-3 py-1 font-semibold rounded-md transition-all cursor-pointer ${
                sortMode === 'alphabetical'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Alfabético (A - Z)
            </button>
          </div>

          {/* User's Requested Button in Main Bar: "Añadir / Gestionar Comentarios de Días de Trabajo" */}
          <button
            onClick={() => setIsManagerModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold rounded-lg text-xs shadow-sm transition-all cursor-pointer"
            title="Añade o configura comentarios de turno como 9:15 AM, Call Out, Suspend Safety, No Call No Show..."
          >
            <Tag className="w-3.5 h-3.5 text-amber-400" />
            <span>Configurar Comentarios</span>
          </button>

          {/* New User Requested Button: "Schedule Automático" */}
          <button
            onClick={() => setIsAutoScheduleModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-lg text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            title="Copia el mismo schedule de trabajo a la próxima semana automáticamente"
          >
            <Sparkles className="w-4 h-4" />
            <span>Schedule Automático</span>
          </button>

          {/* Quick Comment Active Selector */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-800/80 border border-slate-700 rounded-lg p-1 text-xs">
            <span className="text-[11px] text-slate-400 font-medium px-1.5">
              Clic rápido aplica:
            </span>
            <select
              value={activeQuickComment.id}
              onChange={(e) => {
                const found = commentOptions.find((o) => o.id === e.target.value);
                if (found) setActiveQuickComment(found);
              }}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-amber-300 font-mono font-bold focus:outline-none"
            >
              {commentOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label} ({opt.isWork ? 'Trabaja' : 'No trabaja'})
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar conductor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 w-40 sm:w-48"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Descargar Horario (.xlsx)
          </button>
        </div>
      </div>

      {/* Days Header with Live Driver Working Counters */}
      {/* Clic en un día selecciona ese día dentro del Schedule (sin saltar a Truck Assignment) */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {weekDates.map((dateObj, idx) => {
          const iso = toIsoDate(dateObj);
          const count = dailyWorkingCounts[idx];
          const isToday = iso === toIsoDate(new Date());
          const isSelected = selectedDayIso === iso;

          return (
            <button
              key={iso}
              type="button"
              onClick={() => handleDayClick(iso)}
              title={`Ver horario del ${DAY_NAMES_ES[idx]} ${dateObj.getDate()} (${count} conductores trabajando)`}
              className={`group flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer ${
                isSelected
                  ? 'bg-amber-500/20 border-amber-400 shadow-md shadow-amber-500/10 ring-2 ring-amber-400/50 text-white'
                  : isToday
                  ? 'bg-amber-500/10 border-amber-500/50 shadow-sm shadow-amber-500/10'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-1">
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider transition-colors ${
                    isSelected ? 'text-amber-300' : 'text-slate-300 group-hover:text-amber-400'
                  }`}
                >
                  {DAY_NAMES_SHORT_ES[idx]}
                </span>
                <span className="text-xs font-mono font-bold text-white">
                  {dateObj.getDate()}
                </span>
                {isToday && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                )}
              </div>

              {/* Real-time Working Drivers Counter Indicator requested by user */}
              <div
                className={`mt-1 flex items-center gap-1 px-2 py-0.5 rounded-full border transition-colors ${
                  isSelected
                    ? 'bg-amber-500/30 border-amber-400 text-amber-200'
                    : 'bg-slate-800 border-slate-700/80 group-hover:border-amber-500/40'
                }`}
              >
                <UserCheck className="w-3 h-3 text-emerald-400" />
                <span className="text-[11px] font-bold text-emerald-300 font-mono">
                  {count} <span className="text-[10px] font-normal text-slate-300">Drivers</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Selected Day Bar */}
      {selectedDayInfo && (
        <div className="bg-slate-900/95 border border-amber-500/40 rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 shadow-sm text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-slate-300 font-medium">
              Horario del día:{' '}
              <strong className="text-amber-300 font-bold">
                {selectedDayInfo.label}
              </strong>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold text-[11px]">
              {selectedDayInfo.count} Drivers Asignados
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterOnlyWorkingOnDay(!filterOnlyWorkingOnDay)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                filterOnlyWorkingOnDay
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              {filterOnlyWorkingOnDay
                ? `Mostrando solo los que trabajan (${selectedDayInfo.count})`
                : `Ver solo los que trabajan hoy`}
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedDayIso(null);
                setFilterOnlyWorkingOnDay(false);
              }}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-xs transition-colors cursor-pointer"
            >
              Ver toda la semana
            </button>
          </div>
        </div>
      )}

      {/* Weekly Schedule Table with Comment Buttons */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-950/90 text-slate-300 border-b border-slate-800 text-[10px] uppercase tracking-wider font-semibold">
                <th className="py-2 px-2 w-[160px] sm:w-[180px]">Conductor</th>
                {weekDates.map((dateObj, idx) => {
                  const iso = toIsoDate(dateObj);
                  const isSelected = selectedDayIso === iso;
                  return (
                    <th
                      key={idx}
                      onClick={() => handleDayClick(iso)}
                      className={`py-1.5 px-0.5 text-center w-[85px] sm:w-[95px] cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-amber-500/20 border-x-2 border-amber-400/50 text-amber-200'
                          : 'hover:bg-slate-800/60'
                      }`}
                      title={`Clic para seleccionar el horario del ${DAY_NAMES_ES[idx]} ${dateObj.getDate()}`}
                    >
                      <div className="flex flex-col items-center leading-tight">
                        <span className={`font-bold text-[10.5px] ${isSelected ? 'text-amber-300' : 'text-slate-200'}`}>
                          {DAY_NAMES_SHORT_ES[idx]} {dateObj.getDate()}
                        </span>
                        <span className="text-[9px] text-emerald-400 font-mono font-normal">
                          {dailyWorkingCounts[idx]} asignados
                        </span>
                      </div>
                    </th>
                  );
                })}
                <th className="py-2 px-1 text-center w-[55px]">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-xs">
              {filteredAndSortedDrivers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-slate-600" />
                      <p className="font-semibold text-slate-300">
                        {drivers.length === 0 ? 'No hay conductores en el Schedule' : 'No se encontraron conductores con el criterio de búsqueda'}
                      </p>
                      <p className="text-[11px] text-slate-500 max-w-sm">
                        {drivers.length === 0
                          ? 'Registra tus conductores o carga tu archivo CSV / Excel en la pestaña "Gestión de Flota e Inventario" para comenzar a armar el horario.'
                          : 'Prueba cambiando el término de búsqueda.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedDrivers.map((driver, index) => {
                  const seniority = calculateSeniority(driver.hireDate, currentMonday);
                  let workingDaysTotal = 0;

                  return (
                    <tr
                      key={driver.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Driver info: Thin cell with info symbol next to name */}
                      <td className="py-1 px-2 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-amber-400 text-[10px] shrink-0">
                            {driver.name.charAt(0)}
                          </div>
                          <span
                            className="font-semibold text-slate-100 text-xs truncate max-w-[95px] sm:max-w-[115px]"
                            title={driver.name}
                          >
                            {driver.name}
                          </span>
                          {sortMode === 'seniority' && index < 3 && (
                            <span className="text-[8.5px] px-1 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded font-mono shrink-0">
                              #{index + 1}
                            </span>
                          )}

                          {/* Símbolo de Información al final del nombre del Driver */}
                          <div className="relative group/info ml-auto shrink-0">
                            <button
                              type="button"
                              className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
                              title={`Info: ${driver.name}\nTeléfono: ${driver.phone || 'N/A'}\nAntigüedad: ${seniority.label} (Ingreso: ${driver.hireDate || 'N/A'})\nEmail: ${driver.email || 'N/A'}`}
                            >
                              <Info className="w-3.5 h-3.5" />
                            </button>
                            {/* Tooltip flotante al pasar el cursor */}
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 hidden group-hover/info:block z-50 pointer-events-none">
                              <div className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-[11px] shadow-2xl text-slate-200 whitespace-nowrap space-y-0.5">
                                <p className="font-bold text-white text-xs">{driver.name}</p>
                                <p className="text-slate-300 font-mono">📱 {driver.phone || 'Sin teléfono'}</p>
                                <p className="text-amber-300 font-mono">⏳ Antigüedad: {seniority.label}</p>
                                {driver.hireDate && (
                                  <p className="text-slate-400 text-[10px]">📅 Ingreso: {driver.hireDate}</p>
                                )}
                                {driver.email && (
                                  <p className="text-slate-400 text-[10px]">✉️ {driver.email}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 7 Days: Thin, compact, united interactive comment buttons */}
                      {weekDates.map((dateObj, dayIndex) => {
                        const iso = toIsoDate(dateObj);
                        const record = getScheduleRecord(driver.id, iso);

                        // The display label on the button: Use comment if present, else status
                        const displayComment =
                          record?.comment ||
                          (record?.status === 'Trabaja' ? '9:15 AM' : record?.status || 'Off');

                        const isWork = isWorkingShift(displayComment);
                        const visual = getCommentVisualProps(displayComment, commentOptions);

                        if (isWork) workingDaysTotal++;

                        const isSelectedDay = selectedDayIso === iso;

                        return (
                          <td
                            key={iso}
                            className={`py-0.5 px-0.5 text-center transition-colors ${
                              isSelectedDay ? 'bg-amber-500/10 border-x border-amber-400/40' : ''
                            }`}
                          >
                            <div className="flex flex-col items-center">
                              <button
                                onClick={(e) =>
                                  handleCellClick(
                                    driver.id,
                                    iso,
                                    driver.name,
                                    `${DAY_NAMES_ES[dayIndex]} ${dateObj.getDate()}`,
                                    displayComment,
                                    e
                                  )
                                }
                                title={`Clic para cambiar comentario (${DAY_NAMES_ES[dayIndex]} ${dateObj.getDate()})`}
                                className={`w-full py-1 px-1 rounded font-bold text-[10px] font-mono leading-tight transition-all flex items-center justify-center gap-0.5 cursor-pointer border shadow-xs ${visual.colorClass}`}
                              >
                                <span className="truncate">{displayComment}</span>
                              </button>
                            </div>
                          </td>
                        );
                      })}

                      {/* Working Days Total Count */}
                      <td className="py-0.5 px-0.5 text-center">
                        <span
                          className={`font-mono font-bold text-[10.5px] px-1.5 py-0.5 rounded ${
                            workingDaysTotal >= 4
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : workingDaysTotal > 0
                              ? 'bg-slate-800 text-slate-300'
                              : 'text-slate-500'
                          }`}
                        >
                          {workingDaysTotal} d
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Table Footer with Summary */}
            <tfoot>
              <tr className="bg-slate-950 text-slate-200 border-t-2 border-slate-700 font-bold text-xs">
                <td className="py-3 px-3 uppercase tracking-wider text-[11px]">
                  Total Drivers Activos
                </td>
                {weekDates.map((_, idx) => (
                  <td key={idx} className="py-3 px-2 text-center font-mono text-emerald-400 font-bold">
                    {dailyWorkingCounts[idx]} Drivers
                  </td>
                ))}
                <td className="py-3 px-3 text-center font-mono text-amber-400">
                  {dailyWorkingCounts.reduce((a, b) => a + b, 0)} Turnos
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Guide Banner */}
      <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>
            <strong>Gestión de Turnos y Comentarios:</strong> Haz clic en el botón de cualquier día para asignar su horario de onda (ej: <span className="text-emerald-400 font-bold">9:15 AM</span> = trabaja), reporte de ausencia (<span className="text-red-400 font-bold">Call Out</span>, <span className="text-rose-400 font-bold">No Call No Show</span>) o incidente de seguridad (<span className="text-amber-400 font-bold">Suspend Safety</span>).
          </span>
        </div>
      </div>

      {/* Modal 1: Manager for all available Schedule Comments */}
      <ScheduleCommentManagerModal
        isOpen={isManagerModalOpen}
        onClose={() => setIsManagerModalOpen(false)}
        options={commentOptions}
        onAddCustomOption={handleAddOption}
        onDeleteOption={handleDeleteOption}
        onResetDefaults={handleResetDefaults}
        selectedActiveCommentId={activeQuickComment.id}
        onSelectActiveCommentForQuickApply={(opt) => {
          setActiveQuickComment(opt);
          setIsManagerModalOpen(false);
        }}
      />

      {/* Modal 2: Picker for specific day cell */}
      {dayPickerTarget && (
        <DayCommentPickerModal
          isOpen={Boolean(dayPickerTarget)}
          onClose={() => setDayPickerTarget(null)}
          onSave={handleSaveCellComment}
          title={`Asignar Comentario - ${dayPickerTarget.driverName}`}
          subtitle={`Día: ${dayPickerTarget.dayLabel}`}
          initialComment={dayPickerTarget.currentComment}
          customOptions={commentOptions}
          onOpenManageOptions={() => {
            setDayPickerTarget(null);
            setIsManagerModalOpen(true);
          }}
        />
      )}

      {/* Modal 3: Auto Schedule next week copy confirmation */}
      <AutoScheduleModal
        isOpen={isAutoScheduleModalOpen}
        onClose={() => setIsAutoScheduleModalOpen(false)}
        onConfirm={() => {
          const nextMon = new Date(currentMonday);
          nextMon.setDate(nextMon.getDate() + 7);
          onAutoCopyScheduleToNextWeek(currentMonday, nextMon);
        }}
        currentMonday={currentMonday}
        nextMonday={(() => {
          const m = new Date(currentMonday);
          m.setDate(m.getDate() + 7);
          return m;
        })()}
        workingDaysCountCurrentWeek={dailyWorkingCounts.reduce((a, b) => a + b, 0)}
        totalDriversCount={drivers.length}
      />
    </div>
  );
};
