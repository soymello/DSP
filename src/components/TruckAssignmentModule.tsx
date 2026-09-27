import React, { useState, useMemo, useEffect } from 'react';
import {
  Truck,
  Smartphone,
  BatteryCharging,
  Clock,
  Printer,
  Download,
  AlertTriangle,
  MessageSquare,
  Package,
  Calculator,
  UserCheck,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ArrowRight,
  Scissors,
  Edit3,
  X,
  Check,
  RefreshCw,
  Tag,
  FileText
} from 'lucide-react';
import {
  AssignmentStatus,
  DailyAssignment,
  DailyPackagesData,
  DayCorteConfig,
  DaySchedule,
  Device,
  Battery,
  Driver,
  ScheduleStatus,
  Vehicle
} from '../types';
import {
  calculateLunchDuration,
  calculateNetHours,
  checkCompliance,
  DAY_NAMES_ES,
  DAY_NAMES_SHORT_ES,
  getCurrentTimeString,
  getWeekDates,
  toIsoDate
} from '../utils/dateUtils';
import { exportLunchReportToExcel } from '../utils/excelExport';
import {
  isWorkingShift,
  getCommentVisualProps,
  PRESET_SCHEDULE_COMMENTS,
  ScheduleCommentOption
} from '../utils/scheduleComments';
import { CommentModal } from './CommentModal';
import { FinalDayModal } from './FinalDayModal';
import { ScheduleCommentManagerModal } from './ScheduleCommentManagerModal';
import { DayCommentPickerModal } from './DayCommentPickerModal';

interface TruckAssignmentModuleProps {
  currentMonday: Date;
  selectedDateIso: string;
  onSelectDate: (dateIso: string) => void;
  drivers: Driver[];
  vehicles: Vehicle[];
  devices: Device[];
  batteries: Battery[];
  schedule: DaySchedule[];
  cortesMap?: { [dateIso: string]: DayCorteConfig };
  assignments: DailyAssignment[];
  onUpdateAssignment: (assignment: DailyAssignment) => void;
  onUpdateDaySchedule?: (driverId: string, date: string, status: ScheduleStatus, comment?: string) => void;
  onNavigateToSchedule?: () => void;
  onNavigateToCortes?: () => void;
  onSyncToSchedule?: (dateIso: string, dayAssignments: DailyAssignment[]) => void;
  dailyPackages: number;
  dailyPackagesData?: any;
  packagesMap?: { [dateIso: string]: any };
  onUpdateDailyPackages: (packages: any) => void;
  dspName: string;
  stationCode: string;
}

export const TruckAssignmentModule: React.FC<TruckAssignmentModuleProps> = ({
  currentMonday,
  selectedDateIso,
  onSelectDate,
  drivers,
  vehicles,
  devices,
  batteries,
  schedule,
  cortesMap,
  assignments,
  onUpdateAssignment,
  onUpdateDaySchedule,
  onNavigateToSchedule,
  onNavigateToCortes,
  onSyncToSchedule,
  dailyPackages,
  dailyPackagesData,
  packagesMap,
  onUpdateDailyPackages,
  dspName,
  stationCode
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isFinalDayModalOpen, setIsFinalDayModalOpen] = useState(false);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [cxInput, setCxInput] = useState<number>(0);
  const [flexInput, setFlexInput] = useState<number>(0);
  const [commentTarget, setCommentTarget] = useState<{
    assignment: DailyAssignment;
    driverName: string;
  } | null>(null);

  // Comment Options state (stored in localStorage, same as ScheduleModule)
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

  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [dayPickerTarget, setDayPickerTarget] = useState<{
    assignment: DailyAssignment;
    driverName: string;
    currentComment?: string;
  } | null>(null);

  // Re-sync comments if changed elsewhere
  useEffect(() => {
    const syncOptions = () => {
      const saved = localStorage.getItem('dsp_ops_schedule_comment_options_v1');
      if (saved) {
        try {
          setCommentOptions(JSON.parse(saved));
        } catch {
          // ignore
        }
      }
    };
    syncOptions();
    window.addEventListener('storage', syncOptions);
    return () => window.removeEventListener('storage', syncOptions);
  }, []);

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
    }
  };

  const handleSaveDriverComment = (commentText: string, isWork: boolean) => {
    if (!dayPickerTarget) return;
    const asg = dayPickerTarget.assignment;

    let nextStatus = asg.status;
    const lower = commentText.toLowerCase();

    if (lower.includes('call out') || lower.includes('call-out') || !isWork) {
      nextStatus = 'Call Out';
    } else if (asg.status === 'Call Out' && isWork) {
      nextStatus = 'RQ';
    }

    const updatedAsg: DailyAssignment = {
      ...asg,
      comment: commentText,
      status: nextStatus
    };

    onUpdateAssignment(updatedAsg);

    if (onUpdateDaySchedule) {
      const scheduleStatus: ScheduleStatus = !isWork || nextStatus === 'Call Out'
        ? 'Call-Out'
        : 'Trabaja';
      onUpdateDaySchedule(asg.driverId, asg.date, scheduleStatus, commentText);
    }

    setDayPickerTarget(null);
  };

  const weekDates = useMemo(() => getWeekDates(currentMonday), [currentMonday]);
  const driverMap = useMemo(() => new Map(drivers.map(d => [d.id, d])), [drivers]);

  // Sincronización Estricta entre Ventanas:
  // "Y cuando yo dé un botón de aplicar esa lista, pasaría entonces al truck assignment.
  // Entonces, los drivers que saldrían en el truck assignment son los del cortes cuando yo asigne las rutas."
  const dayAssignments = useMemo(() => {
    const corteConfig = cortesMap?.[selectedDateIso];

    // 1. Si para esta fecha ya se aplicaron Cortes:
    if (corteConfig && corteConfig.applied && corteConfig.decisions && corteConfig.decisions.length > 0) {
      // Todos los conductores pasan al Truck Assignment con la asignación correspondiente:
      // CORTEX -> activo ('RQ' / 'Rescue' / 'Flex'), NO CORTEX -> ('Call Out')
      const existingMap = new Map<string, DailyAssignment>();
      assignments.forEach(a => {
        if (a.date === selectedDateIso) {
          existingMap.set(a.driverId, a);
        }
      });

      const result: DailyAssignment[] = [];
      corteConfig.decisions.forEach(dec => {
        const isCortex = dec.status !== 'Corte' && dec.note !== 'NO CORTEX';
        const existing = existingMap.get(dec.driverId);
        const asgStatus: AssignmentStatus = isCortex
          ? (dec.status === 'Rescue' ? 'Rescue' : dec.status === 'Flex' ? 'Flex' : 'RQ')
          : 'Call Out';

        const comment = isCortex ? (dec.note && dec.note !== 'Corte' ? dec.note : 'CORTEX') : 'NO CORTEX';

        if (existing) {
          result.push({
            ...existing,
            status: asgStatus,
            routeCode: dec.routeCode || existing.routeCode,
            comment: comment
          });
        } else {
          result.push({
            id: `asg-${selectedDateIso}-${dec.driverId}`,
            date: selectedDateIso,
            driverId: dec.driverId,
            vanNumber: '',
            deviceNumber: '',
            batteryNumber: '',
            status: asgStatus,
            clockIn: '',
            lunchStart: '',
            lunchEnd: '',
            clockOut: '',
            routeCode: dec.routeCode || '',
            comment
          });
        }
      });

      return result;
    }

    // 2. Si aún no se han aplicado cortes específicos para esta fecha, sincronizar con Schedule
    const dateSchedule = schedule.filter(s => s.date === selectedDateIso);

    const workingScheduleEntries = dateSchedule.filter(
      s => isWorkingShift(s.comment || s.status) || s.status === 'Trabaja'
    );

    const callOutScheduleEntries = dateSchedule.filter(
      s => s.status === 'Call-Out' || (s.comment && s.comment.toLowerCase().includes('call out'))
    );

    const validDriverIds = new Set([
      ...workingScheduleEntries.map(s => s.driverId),
      ...callOutScheduleEntries.map(s => s.driverId)
    ]);

    if (validDriverIds.size === 0) {
      return [];
    }

    const existingMap = new Map<string, DailyAssignment>();
    assignments.forEach(a => {
      if (a.date === selectedDateIso) {
        existingMap.set(a.driverId, a);
      }
    });

    const result: DailyAssignment[] = [];

    workingScheduleEntries.forEach(sch => {
      const existing = existingMap.get(sch.driverId);
      if (existing) {
        result.push(existing);
      } else {
        result.push({
          id: `asg-${selectedDateIso}-${sch.driverId}`,
          date: selectedDateIso,
          driverId: sch.driverId,
          vanNumber: '',
          deviceNumber: '',
          batteryNumber: '',
          status: sch.comment?.toLowerCase().includes('rescue') ? 'Rescue' : 'RQ',
          clockIn: '',
          lunchStart: '',
          lunchEnd: '',
          clockOut: '',
          comment: sch.comment || '9:15 AM'
        });
      }
    });

    callOutScheduleEntries.forEach(sch => {
      if (result.some(r => r.driverId === sch.driverId)) return;
      const existing = existingMap.get(sch.driverId);
      if (existing) {
        result.push({ ...existing, status: 'Call Out' });
      } else {
        result.push({
          id: `asg-${selectedDateIso}-${sch.driverId}`,
          date: selectedDateIso,
          driverId: sch.driverId,
          vanNumber: '',
          deviceNumber: '',
          batteryNumber: '',
          status: 'Call Out',
          clockIn: '',
          lunchStart: '',
          lunchEnd: '',
          clockOut: '',
          comment: sch.comment || 'Call-Out reportado en schedule'
        });
      }
    });

    return result;
  }, [cortesMap, schedule, assignments, selectedDateIso]);

  // Paquetes estructurados para el día seleccionado (CX, Flex y Total)
  const currentPackageCounts = useMemo(() => {
    const raw = dailyPackagesData || packagesMap?.[selectedDateIso];
    if (typeof raw === 'object' && raw !== null) {
      const cx = Number(raw.cx) || 0;
      const flex = Number(raw.flex) || 0;
      const total = Number(raw.total) || (cx + flex);
      return { cx, flex, total };
    }
    if (typeof raw === 'number') {
      return { cx: raw, flex: 0, total: raw };
    }
    return { cx: 0, flex: 0, total: 0 };
  }, [dailyPackagesData, packagesMap, selectedDateIso]);

  // Operational metrics summary
  const metrics = useMemo(() => {
    const totalAssigned = dayAssignments.length;
    const callOuts = dayAssignments.filter(a => a.status === 'Call Out').length;
    const activeDrivers = Math.max(0, totalAssigned - callOuts);
    const rqCount = dayAssignments.filter(a => a.status === 'RQ').length; // Rutas CX
    const flexCount = dayAssignments.filter(a => a.status === 'Flex').length; // Rutas Flex
    const rescueCount = dayAssignments.filter(a => a.status === 'Rescue').length;
    const extraTruckCount = dayAssignments.filter(a => a.status === 'Extra Truck').length;

    // Regla de negocio solicitada:
    // "siempre se dividen la cantidad rutas cx entre la cantidad de Driver de rutas cx,
    // y la cantidad de Paquetes de ruta Flex entre la cantidad de Drivers flex.
    // los resultados se muestran en el botón de SPR y que especifique el SPR de la Flex y el SPR de la CX"
    const sprCx = rqCount > 0 && currentPackageCounts.cx > 0
      ? Math.round(currentPackageCounts.cx / rqCount)
      : 0;

    const sprFlex = flexCount > 0 && currentPackageCounts.flex > 0
      ? Math.round(currentPackageCounts.flex / flexCount)
      : 0;

    const sprOverall = activeDrivers > 0 && currentPackageCounts.total > 0
      ? Math.round(currentPackageCounts.total / activeDrivers)
      : 0;

    return {
      totalAssigned,
      callOuts,
      activeDrivers,
      rqCount,
      flexCount,
      rescueCount,
      extraTruckCount,
      spr: sprOverall,
      sprCx,
      sprFlex,
      cxPackages: currentPackageCounts.cx,
      flexPackages: currentPackageCounts.flex,
      totalPackages: currentPackageCounts.total
    };
  }, [dayAssignments, currentPackageCounts]);

  const handleOpenPackageModal = () => {
    setCxInput(currentPackageCounts.cx);
    setFlexInput(currentPackageCounts.flex);
    setIsPackageModalOpen(true);
  };

  const handleSavePackages = (e: React.FormEvent) => {
    e.preventDefault();
    const cxVal = Number(cxInput) || 0;
    const flexVal = Number(flexInput) || 0;
    const totalVal = cxVal + flexVal;

    onUpdateDailyPackages({
      cx: cxVal,
      flex: flexVal,
      total: totalVal
    });
    setIsPackageModalOpen(false);
  };

  // Filtered assignments
  const filteredAssignments = useMemo(() => {
    return dayAssignments.filter(asg => {
      const driver = driverMap.get(asg.driverId);
      const matchesSearch =
        (driver?.name.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        asg.vanNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asg.deviceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (asg.routeCode?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

      const matchesFilter =
        statusFilter === 'all'
          ? true
          : statusFilter === 'active'
          ? asg.status !== 'Call Out'
          : asg.status === statusFilter;

      return matchesSearch && matchesFilter;
    });
  }, [dayAssignments, driverMap, searchQuery, statusFilter]);

  const handleFieldChange = (
    asg: DailyAssignment,
    field: keyof DailyAssignment,
    value: string
  ) => {
    onUpdateAssignment({
      ...asg,
      [field]: value
    });
  };

  const handlePunchNow = (
    asg: DailyAssignment,
    field: 'clockIn' | 'lunchStart' | 'lunchEnd' | 'clockOut'
  ) => {
    const nowStr = getCurrentTimeString();
    handleFieldChange(asg, field, nowStr);
  };

  const handleQuickStatus = (asg: DailyAssignment, newStatus: AssignmentStatus) => {
    onUpdateAssignment({
      ...asg,
      status: newStatus
    });
  };

  const handleSaveComment = (comment: string) => {
    if (!commentTarget) return;
    onUpdateAssignment({
      ...commentTarget.assignment,
      comment
    });
    setCommentTarget(null);
  };

  const handleExportLunch = () => {
    exportLunchReportToExcel(selectedDateIso, dayAssignments, drivers, dspName);
  };

  return (
    <div className="space-y-4">
      {/* Week Days Selector Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {weekDates.map((dateObj, idx) => {
          const iso = toIsoDate(dateObj);
          const isSelected = iso === selectedDateIso;
          const isToday = iso === '2026-09-24';
          const isCorteApplied = cortesMap?.[iso]?.applied;
          const dayCount = isCorteApplied
            ? cortesMap![iso].decisions.filter(d => ['RQ', 'Rescue', 'Flex', 'Standby'].includes(d.status)).length
            : schedule.filter(
                s => s.date === iso && (isWorkingShift(s.comment || s.status) || s.status === 'Trabaja')
              ).length;

          return (
            <button
              key={iso}
              onClick={() => onSelectDate(iso)}
              className={`flex-1 min-w-[90px] py-2 px-2.5 rounded-xl border transition-all text-center flex flex-col items-center cursor-pointer ${
                isSelected
                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider">
                <span>{DAY_NAMES_SHORT_ES[idx]}</span>
                <span className="font-mono">{dateObj.getDate()}</span>
                {isToday && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSelected ? 'bg-slate-950' : 'bg-amber-400'
                    }`}
                  />
                )}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span
                  className={`text-[10px] font-mono ${
                    isSelected ? 'text-slate-900 font-semibold' : 'text-emerald-400'
                  }`}
                >
                  {dayCount} Activos
                </span>
                {isCorteApplied && (
                  <span
                    title="Cortes de ruta aplicados"
                    className="w-1.5 h-1.5 rounded-full bg-amber-400"
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Banner Informativo si Cortes fue Aplicado para esta fecha */}
      {cortesMap?.[selectedDateIso]?.applied && (
        <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-2.5 px-3.5 flex items-center justify-between text-xs shadow-xs">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-slate-200">
              <strong>Cortes de Ruta Aplicados:</strong> Mostrando únicamente los{' '}
              <strong className="text-emerald-300">{metrics.totalAssigned} conductores confirmados</strong> desde el módulo Cortes ({cortesMap[selectedDateIso].amazonRoutes} rutas de Amazon).
            </span>
          </div>
          {onNavigateToCortes && (
            <button
              onClick={onNavigateToCortes}
              className="text-[11px] text-amber-400 hover:text-amber-300 font-bold hover:underline cursor-pointer flex items-center gap-1 shrink-0 ml-2"
            >
              <span>Modificar Cortes</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Cuadro Resumen de Métricas (Rectángulo Superior Compacto) */}
      {/* "Quiero un pequeño rectángulo, donde vea la información total de la cantidad de Driver, que tengo de la cantidad de RQ de la cantidad de Flex
          Y quiero que haya un botón donde yo pueda añadir la cantidad de Paquetes del día, y que el mismo sistema me lo divida entre la cantidad de Driver y me dé SPR" */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 rounded-xl p-3 sm:p-4 shadow-xl">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-center">
          {/* Total Drivers Activos */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-2.5 flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Drivers Activos
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono text-emerald-300">
                  {metrics.activeDrivers}
                </span>
                {metrics.callOuts > 0 && (
                  <span className="text-[10px] text-red-400 font-medium">
                    ({metrics.callOuts} call-out)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* RQ Count */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-2.5 flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Rutas RQ
              </span>
              <span className="text-xl font-bold font-mono text-blue-300">
                {metrics.rqCount}
              </span>
            </div>
          </div>

          {/* Flex Count */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-2.5 flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg border border-purple-500/20">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Rutas Flex
              </span>
              <span className="text-xl font-bold font-mono text-purple-300">
                {metrics.flexCount}
              </span>
            </div>
          </div>

          {/* Rescue / Extra Trucks */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-2.5 flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Rescues / Extras
              </span>
              <span className="text-xl font-bold font-mono text-amber-300">
                {metrics.rescueCount + metrics.extraTruckCount}
              </span>
            </div>
          </div>

          {/* Botón para Introducir Paquetes Diarios (Rutas CX y Flex) */}
          <button
            type="button"
            onClick={handleOpenPackageModal}
            className="bg-slate-800/90 hover:bg-slate-800 border border-amber-500/50 hover:border-amber-400 rounded-lg p-2.5 flex flex-col justify-between text-left transition-all cursor-pointer group shadow-sm"
          >
            <div className="flex items-center justify-between w-full mb-0.5">
              <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-amber-400" />
                Paquetes del Día
              </span>
              <span className="text-[10px] text-amber-400/80 group-hover:text-amber-300 underline font-semibold">
                {metrics.totalPackages > 0 ? 'Modificar' : 'Introducir'}
              </span>
            </div>
            <div className="flex items-baseline justify-between w-full">
              <span className="text-xl font-black font-mono text-white">
                {metrics.totalPackages > 0 ? metrics.totalPackages.toLocaleString() : '--'}
              </span>
              <span className="text-[10px] text-slate-400">paq tot</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1 border-t border-slate-700/60 pt-0.5">
              <span>CX: <strong className="text-blue-300 font-mono">{metrics.cxPackages.toLocaleString()}</strong></span>
              <span>•</span>
              <span>Flex: <strong className="text-purple-300 font-mono">{metrics.flexPackages.toLocaleString()}</strong></span>
            </div>
          </button>

          {/* Botón de SPR Calculado especificando SPR de Flex y SPR de CX */}
          <button
            type="button"
            onClick={handleOpenPackageModal}
            className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 hover:from-amber-500/30 hover:to-amber-600/20 border border-amber-500/40 hover:border-amber-400 rounded-lg p-2.5 flex flex-col justify-between text-left transition-all cursor-pointer shadow-sm group"
            title="Clic para ver o calcular el SPR de Rutas CX y Flex"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] uppercase font-bold text-amber-200 tracking-wider flex items-center gap-1">
                <Calculator className="w-3.5 h-3.5 text-amber-400" />
                SPR (Paq/Ruta)
              </span>
              <span className="text-xs font-mono font-bold text-amber-300">
                Total: {metrics.spr > 0 ? `${metrics.spr}` : '--'}
              </span>
            </div>

            {/* Especificación de SPR de la Flex y SPR de la CX como requirió el usuario */}
            <div className="mt-1.5 grid grid-cols-2 gap-1 text-[10.5px]">
              <div className="bg-slate-950/70 px-1.5 py-0.5 rounded border border-blue-500/30 flex flex-col">
                <span className="text-[8.5px] uppercase font-bold text-blue-300 tracking-tight">SPR de la CX</span>
                <span className="font-mono font-black text-white text-xs">
                  {metrics.sprCx > 0 ? `${metrics.sprCx}` : '--'}
                </span>
              </div>
              <div className="bg-slate-950/70 px-1.5 py-0.5 rounded border border-purple-500/30 flex flex-col">
                <span className="text-[8.5px] uppercase font-bold text-purple-300 tracking-tight">SPR de la Flex</span>
                <span className="font-mono font-black text-white text-xs">
                  {metrics.sprFlex > 0 ? `${metrics.sprFlex}` : '--'}
                </span>
              </div>
            </div>
          </button>
        </div>

        {/* Toolbar row with Search & Print/Export Button */}
        <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por conductor, Van, ruta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs placeholder-slate-500 focus:outline-none focus:border-amber-400 w-52 sm:w-64"
              />
            </div>

            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2 py-1 rounded transition-colors ${
                  statusFilter === 'all' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300'
                }`}
              >
                Todos ({dayAssignments.length})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-2 py-1 rounded transition-colors ${
                  statusFilter === 'active' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300'
                }`}
              >
                Activos ({metrics.activeDrivers})
              </button>
              <button
                onClick={() => setStatusFilter('Call Out')}
                className={`px-2 py-1 rounded transition-colors ${
                  statusFilter === 'Call Out' ? 'bg-red-500 text-white font-bold' : 'text-slate-300'
                }`}
              >
                Call Outs ({metrics.callOuts})
              </button>
            </div>
          </div>

          {/* Action Buttons: Configurar Comentarios, Excel Lunch, Imprimir */}
          <div className="flex items-center gap-2">
            {/* User requested: Reemplázame el botón en la pestaña del truck assignment el de actualizar schedule. Reemplázame ese botón por el mismo botón de schedule de configurar los comentarios. Quiero un botón igual a ese. */}
            <button
              type="button"
              onClick={() => setIsManagerModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold rounded-lg text-xs shadow-sm transition-all cursor-pointer"
              title="Añade o configura comentarios de turno como 9:15 AM, Call Out, Suspend Safety, No Call No Show..."
            >
              <Tag className="w-3.5 h-3.5 text-amber-400" />
              <span>Configurar Comentarios</span>
            </button>

            <button
              onClick={handleExportLunch}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition-colors shadow-sm cursor-pointer"
              title="Descargar tabla en Excel para control de lunch"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel Lunch (.xlsx)</span>
            </button>

            {/* User requested: Reemplázame el botón de imprimir tabla para lunch por final del día para guardar en PDF toda la información de truck assignment */}
            <button
              type="button"
              onClick={() => setIsFinalDayModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-lg font-bold transition-all shadow-md shadow-amber-500/20 cursor-pointer active:scale-95"
              title="Generar y guardar reporte en PDF con toda la información de Truck Assignment al Final del Día"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Final del Día</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tarjetas / Casillas Minimalistas */}
      <div className="space-y-1.5">
        {dayAssignments.length === 0 ? (
          <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-8 sm:p-12 text-center max-w-lg mx-auto my-6 shadow-xl">
            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-400">
              <Calendar className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-100 mb-1.5">
              No hay conductores programados para trabajar en esta fecha
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-5">
              El módulo <strong>Truck Assignment</strong> está sincronizado con el <strong>Schedule</strong>.
              Si no hay conductores asignados a trabajar para esta fecha (<span className="text-amber-400 font-mono font-semibold">{selectedDateIso}</span>), no pueden aparecer vehículos ni conductores aquí.
            </p>
            {onNavigateToSchedule && (
              <button
                onClick={onNavigateToSchedule}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                <span>Ir al Schedule para Programar Turnos</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-xs">
            No hay conductores que coincidan con la búsqueda o filtro aplicado.
          </div>
        ) : (
          <>
            {/* Table Column Headers - Una detrás de otra en una sola línea */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider overflow-x-auto shadow-sm">
              <div className="flex items-center gap-2.5 min-w-[1060px]">
                <div className="w-52 shrink-0 flex items-center gap-1.5 text-slate-300">
                  <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Conductor</span>
                </div>
                <div className="w-36 shrink-0 text-slate-300 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-amber-400" />
                  <span>Comentario</span>
                </div>
                <div className="w-24 shrink-0 text-slate-300 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Van / Camión</span>
                </div>
                <div className="w-24 shrink-0 text-slate-300 flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                  <span>Dispositivo</span>
                </div>
                <div className="w-24 shrink-0 text-slate-300 flex items-center gap-1">
                  <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Powerbank</span>
                </div>
                <div className="w-[102px] shrink-0 text-center text-slate-300">Clock In</div>
                <div className="w-[102px] shrink-0 text-center text-slate-300">Lunch In</div>
                <div className="w-[102px] shrink-0 text-center text-slate-300">Lunch Out</div>
                <div className="w-[102px] shrink-0 text-center text-slate-300">Clock Out</div>
                <div className="w-20 shrink-0 text-center text-emerald-400">Netas</div>
              </div>
            </div>

            {filteredAssignments.map((asg) => {
              const driver = driverMap.get(asg.driverId);
              const compliance = checkCompliance(asg);
              const net = calculateNetHours(asg.clockIn, asg.lunchStart, asg.lunchEnd, asg.clockOut);
              const lunchMin = calculateLunchDuration(asg.lunchStart, asg.lunchEnd);
              const isCallOut = asg.status === 'Call Out';

              return (
                <div
                  key={asg.id}
                  className={`rounded-xl border transition-all py-1.5 px-3 text-xs overflow-x-auto ${
                    isCallOut
                      ? 'bg-red-950/20 border-red-900/50 opacity-75'
                      : compliance.hasMissingEquipment
                      ? 'bg-slate-900/95 border-amber-500/60 shadow-xs shadow-amber-500/10'
                      : compliance.hasLunchDelayWarning || compliance.hasLunchDurationWarning
                      ? 'bg-slate-900/95 border-amber-400/40'
                      : 'bg-slate-900/95 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Single Unified Line: Toda la información una detrás de otra */}
                  <div className="flex items-center gap-2.5 min-w-[1060px]">
                    {/* 1. Conductor (Barra del mismo tamaño para todos los conductores) */}
                    <div className="w-52 shrink-0 flex items-center gap-2 overflow-hidden">
                      <div
                        className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-[11px] shrink-0 ${
                          isCallOut
                            ? 'bg-red-900/50 text-red-300'
                            : 'bg-slate-800 border border-slate-700 text-amber-400'
                        }`}
                      >
                        {driver?.name.charAt(0) || 'D'}
                      </div>
                      <div className="truncate min-w-0 flex-1">
                        <span className="font-bold text-slate-100 text-xs sm:text-sm truncate block" title={driver?.name}>
                          {driver?.name || 'Conductor'}
                        </span>
                        {asg.routeCode && (
                          <span className="font-mono text-amber-300 text-[10px] font-semibold">
                            Ruta: {asg.routeCode}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 2. Botón de Asignar Comentarios (después del nombre, cambia cuando se le asigna) */}
                    <div className="w-36 shrink-0">
                      {(() => {
                        const visual = getCommentVisualProps(asg.comment, commentOptions);
                        const hasComment = Boolean(asg.comment && asg.comment.trim());

                        if (hasComment) {
                          return (
                            <button
                              type="button"
                              onClick={() =>
                                setDayPickerTarget({
                                  assignment: asg,
                                  driverName: driver?.name || 'Conductor',
                                  currentComment: asg.comment
                                })
                              }
                              className={`w-full flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer shadow-sm hover:brightness-110 active:scale-95 ${visual.badgeClass}`}
                              title={`Comentario: ${asg.comment}. Clic para cambiar.`}
                            >
                              <Tag className="w-3.5 h-3.5 shrink-0" />
                              <span className="font-mono truncate">{asg.comment}</span>
                            </button>
                          );
                        }

                        return (
                          <button
                            type="button"
                            onClick={() =>
                              setDayPickerTarget({
                                assignment: asg,
                                driverName: driver?.name || 'Conductor',
                                currentComment: ''
                              })
                            }
                            className="w-full flex items-center justify-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-amber-400 border border-dashed border-amber-500/40 hover:border-amber-400 transition-all cursor-pointer shadow-xs active:scale-95"
                            title="Clic para asignar comentario a este conductor"
                          >
                            <Tag className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="truncate">Asignar Comentario</span>
                          </button>
                        );
                      })()}
                    </div>

                    {/* 3. Van / Camión */}
                    <div className="w-24 shrink-0">
                      <input
                        type="text"
                        list="van-options"
                        value={asg.vanNumber}
                        onChange={(e) => handleFieldChange(asg, 'vanNumber', e.target.value)}
                        placeholder="Nº Van"
                        className={`w-full bg-slate-800 border rounded-lg px-2 py-1 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-400 ${
                          !asg.vanNumber && !isCallOut ? 'border-amber-500/50 bg-amber-950/10' : 'border-slate-700'
                        }`}
                      />
                    </div>

                    {/* 4. Dispositivo / Teléfono */}
                    <div className="w-24 shrink-0">
                      <input
                        type="text"
                        list="device-options"
                        value={asg.deviceNumber}
                        onChange={(e) => handleFieldChange(asg, 'deviceNumber', e.target.value)}
                        placeholder="Nº Tel"
                        className={`w-full bg-slate-800 border rounded-lg px-2 py-1 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-400 ${
                          !asg.deviceNumber && !isCallOut && asg.vanNumber ? 'border-red-500/60 bg-red-950/10' : 'border-slate-700'
                        }`}
                      />
                    </div>

                    {/* 5. Powerbank / Batería */}
                    <div className="w-24 shrink-0">
                      <input
                        type="text"
                        list="battery-options"
                        value={asg.batteryNumber}
                        onChange={(e) => handleFieldChange(asg, 'batteryNumber', e.target.value)}
                        placeholder="Nº Bat"
                        className={`w-full bg-slate-800 border rounded-lg px-2 py-1 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-400 ${
                          !asg.batteryNumber && !isCallOut && asg.vanNumber ? 'border-red-500/60 bg-red-950/10' : 'border-slate-700'
                        }`}
                      />
                    </div>

                    {/* 6. Clock In */}
                    <div className="w-[102px] shrink-0 flex items-center gap-1">
                      <input
                        type="time"
                        value={asg.clockIn || ''}
                        onChange={(e) => handleFieldChange(asg, 'clockIn', e.target.value)}
                        className="w-[74px] bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-xs text-slate-100 font-mono focus:border-amber-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handlePunchNow(asg, 'clockIn')}
                        className="p-1 bg-slate-800/80 hover:bg-slate-700 text-amber-400 hover:text-amber-300 rounded border border-slate-700 cursor-pointer shrink-0 transition-colors"
                        title="Marcar Clock In ahora"
                      >
                        <Clock className="w-3 h-3" />
                      </button>
                    </div>

                    {/* 7. Lunch In */}
                    <div className="w-[102px] shrink-0 flex items-center gap-1">
                      <input
                        type="time"
                        value={asg.lunchStart || ''}
                        onChange={(e) => handleFieldChange(asg, 'lunchStart', e.target.value)}
                        className="w-[74px] bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-xs text-slate-100 font-mono focus:border-amber-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handlePunchNow(asg, 'lunchStart')}
                        className="p-1 bg-slate-800/80 hover:bg-slate-700 text-amber-400 hover:text-amber-300 rounded border border-slate-700 cursor-pointer shrink-0 transition-colors"
                        title="Marcar Lunch In ahora"
                      >
                        <Clock className="w-3 h-3" />
                      </button>
                    </div>

                    {/* 8. Lunch Out */}
                    <div className="w-[102px] shrink-0 flex items-center gap-1">
                      <input
                        type="time"
                        value={asg.lunchEnd || ''}
                        onChange={(e) => handleFieldChange(asg, 'lunchEnd', e.target.value)}
                        className="w-[74px] bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-xs text-slate-100 font-mono focus:border-amber-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handlePunchNow(asg, 'lunchEnd')}
                        className="p-1 bg-slate-800/80 hover:bg-slate-700 text-amber-400 hover:text-amber-300 rounded border border-slate-700 cursor-pointer shrink-0 transition-colors"
                        title="Marcar Lunch Out ahora"
                      >
                        <Clock className="w-3 h-3" />
                      </button>
                    </div>

                    {/* 9. Clock Out */}
                    <div className="w-[102px] shrink-0 flex items-center gap-1">
                      <input
                        type="time"
                        value={asg.clockOut || ''}
                        onChange={(e) => handleFieldChange(asg, 'clockOut', e.target.value)}
                        className="w-[74px] bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-xs text-slate-100 font-mono focus:border-amber-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handlePunchNow(asg, 'clockOut')}
                        className="p-1 bg-slate-800/80 hover:bg-slate-700 text-amber-400 hover:text-amber-300 rounded border border-slate-700 cursor-pointer shrink-0 transition-colors"
                        title="Marcar Clock Out ahora"
                      >
                        <Clock className="w-3 h-3" />
                      </button>
                    </div>

                    {/* 10. Horas Netas (Al final de la línea) */}
                    <div className="w-20 shrink-0 text-center flex items-center justify-center">
                      <div className="w-full bg-slate-950/80 border border-slate-800 rounded px-2 py-1 text-center" title="Horas Netas Trabajadas">
                        <span className="font-mono font-bold text-xs text-emerald-400">
                          {net.formatted}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Compact Operational Warnings if any */}
                  {(compliance.hasMissingEquipment || compliance.hasLunchDelayWarning || compliance.hasLunchDurationWarning) && (
                    <div className="mt-1 pt-1 border-t border-slate-800/60 flex flex-wrap gap-2 text-[10.5px]">
                      {compliance.hasMissingEquipment && (
                        <span className="text-amber-300 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          Falta: {compliance.missingEquipmentText.join(', ')}
                        </span>
                      )}
                      {compliance.hasLunchDelayWarning && (
                        <span className="text-red-300 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-red-400" />
                          {compliance.lunchDelayMessage}
                        </span>
                      )}
                      {compliance.hasLunchDurationWarning && (
                        <span className="text-sky-300 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-sky-400" />
                          {compliance.lunchDurationMessage}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Datalists for quick autocompletion */}
      <datalist id="van-options">
        {vehicles.map(v => (
          <option key={v.id} value={v.number}>{v.type} ({v.licensePlate})</option>
        ))}
      </datalist>
      <datalist id="device-options">
        {devices.map(d => (
          <option key={d.id} value={d.number}>{d.model}</option>
        ))}
      </datalist>
      <datalist id="battery-options">
        {batteries.map(b => (
          <option key={b.id} value={b.code}>{b.capacity}</option>
        ))}
      </datalist>

      {/* Comment Modal */}
      {commentTarget && (
        <CommentModal
          isOpen={Boolean(commentTarget)}
          onClose={() => setCommentTarget(null)}
          onSave={handleSaveComment}
          title={`Nota de Asignación - ${commentTarget.driverName}`}
          subtitle={`Fecha: ${selectedDateIso}`}
          initialComment={commentTarget.assignment.comment}
        />
      )}

      {/* Day Comment Picker Modal */}
      {dayPickerTarget && (
        <DayCommentPickerModal
          isOpen={Boolean(dayPickerTarget)}
          onClose={() => setDayPickerTarget(null)}
          onSave={handleSaveDriverComment}
          title={`Elegir Comentario - ${dayPickerTarget.driverName}`}
          subtitle={`Fecha: ${selectedDateIso}`}
          initialComment={dayPickerTarget.currentComment}
          customOptions={commentOptions}
          onOpenManageOptions={() => {
            setDayPickerTarget(null);
            setIsManagerModalOpen(true);
          }}
        />
      )}

      {/* Schedule Comment Manager Modal */}
      <ScheduleCommentManagerModal
        isOpen={isManagerModalOpen}
        onClose={() => setIsManagerModalOpen(false)}
        options={commentOptions}
        onAddCustomOption={handleAddOption}
        onDeleteOption={handleDeleteOption}
        onResetDefaults={handleResetDefaults}
      />

      {/* Modal de Final del Día (Exportar PDF con toda la información de Truck Assignment) */}
      <FinalDayModal
        isOpen={isFinalDayModalOpen}
        onClose={() => setIsFinalDayModalOpen(false)}
        dateIso={selectedDateIso}
        assignments={dayAssignments}
        drivers={drivers}
        dspName={dspName}
        stationCode={stationCode}
        metrics={metrics}
      />

      {/* Modal para Introducir Paquetes y Calcular SPR de Rutas CX y Flex */}
      {isPackageModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">
                    Cálculo de Paquetes y SPR Diario
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Introduce paquetes de CX y Flex para calcular los SPR individuales
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPackageModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePackages} className="p-5 space-y-4">
              {/* Sección Rutas CX */}
              <div className="bg-slate-950/80 border border-blue-500/30 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-blue-400" />
                    Paquetes Rutas CX
                  </label>
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    {metrics.rqCount} Drivers CX
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={cxInput === 0 ? '' : cxInput}
                  onChange={(e) => setCxInput(Number(e.target.value) || 0)}
                  placeholder="Ej: 3,250"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-base font-bold font-mono text-blue-300 focus:outline-none focus:border-blue-400"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Resultado SPR CX (Paquetes / Drivers CX):</span>
                  <strong className="font-mono text-white text-xs">
                    {metrics.rqCount > 0 && cxInput > 0
                      ? `${Math.round(cxInput / metrics.rqCount)} paq/ruta`
                      : '--'}
                  </strong>
                </div>
              </div>

              {/* Sección Rutas Flex */}
              <div className="bg-slate-950/80 border border-purple-500/30 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-purple-400" />
                    Paquetes Rutas Flex
                  </label>
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    {metrics.flexCount} Drivers Flex
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={flexInput === 0 ? '' : flexInput}
                  onChange={(e) => setFlexInput(Number(e.target.value) || 0)}
                  placeholder="Ej: 450"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-base font-bold font-mono text-purple-300 focus:outline-none focus:border-purple-400"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Resultado SPR Flex (Paquetes / Drivers Flex):</span>
                  <strong className="font-mono text-white text-xs">
                    {metrics.flexCount > 0 && flexInput > 0
                      ? `${Math.round(flexInput / metrics.flexCount)} paq/ruta`
                      : '--'}
                  </strong>
                </div>
              </div>

              {/* Resumen Total */}
              <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Total Paquetes Combinados:</span>
                  <strong className="text-white font-mono text-sm">
                    {(Number(cxInput) + Number(flexInput)).toLocaleString()} paquetes
                  </strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[11px]">SPR Promedio Global:</span>
                  <strong className="text-amber-400 font-mono text-sm">
                    {metrics.activeDrivers > 0 && (Number(cxInput) + Number(flexInput)) > 0
                      ? `${Math.round((Number(cxInput) + Number(flexInput)) / metrics.activeDrivers)} paq/driver`
                      : '--'}
                  </strong>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPackageModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Calcular y Guardar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
