import React, { useState, useMemo } from 'react';
import {
  Scissors,
  Check,
  CheckCircle2,
  AlertTriangle,
  Route,
  Truck,
  Calendar,
  Sparkles,
  ArrowUpDown,
  Search,
  ArrowRight,
  UserX,
  X
} from 'lucide-react';
import {
  CorteStatus,
  DayCorteConfig,
  DaySchedule,
  Driver,
  DriverCorte
} from '../types';
import {
  calculateSeniority,
  DAY_NAMES_ES,
  DAY_NAMES_SHORT_ES,
  getWeekDates,
  toIsoDate
} from '../utils/dateUtils';
import { isWorkingShift } from '../utils/scheduleComments';

interface CortesModuleProps {
  currentMonday: Date;
  selectedDateIso: string;
  onSelectDate: (dateIso: string) => void;
  drivers: Driver[];
  schedule: DaySchedule[];
  cortesMap: { [dateIso: string]: DayCorteConfig };
  onSaveCorteConfig: (config: DayCorteConfig) => void;
  onApplyCortesToTruckAssignment: (dateIso: string, decisions: DriverCorte[], amazonRoutes: number) => void;
  dspName: string;
  stationCode: string;
}

export const CortesModule: React.FC<CortesModuleProps> = ({
  currentMonday,
  selectedDateIso,
  onSelectDate,
  drivers,
  schedule,
  cortesMap,
  onSaveCorteConfig,
  onApplyCortesToTruckAssignment,
  dspName,
  stationCode
}) => {
  const [sortMode, setSortMode] = useState<'seniority' | 'alphabetical'>('seniority');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'cortex' | 'no-cortex'>('all');

  const weekDates = useMemo(() => getWeekDates(currentMonday), [currentMonday]);
  const driverMap = useMemo(() => new Map(drivers.map(d => [d.id, d])), [drivers]);

  // 1. Conductores que están en Schedule para trabajar hoy (o con Call Out)
  const scheduledDriversForDay = useMemo(() => {
    const dateSchedule = schedule.filter(s => s.date === selectedDateIso);
    return dateSchedule.filter(
      s => isWorkingShift(s.comment || s.status) || s.status === 'Trabaja' || s.status === 'Call-Out'
    );
  }, [schedule, selectedDateIso]);

  // 2. Configuración de cortes para la fecha actual
  const currentCorteConfig = useMemo(() => {
    const existing = cortesMap[selectedDateIso];
    if (existing) {
      return existing;
    }

    // Inicializar decisiones con CORTEX y NO CORTEX
    const initialRoutes = Math.max(0, scheduledDriversForDay.length);
    const initialDecisions: DriverCorte[] = scheduledDriversForDay.map(sch => {
      const lower = (sch.comment || '').toLowerCase();
      const isCallOut = sch.status === 'Call-Out' || lower.includes('call out') || lower.includes('ncns');
      const isCut = sch.status === 'Off' || lower.includes('corte') || lower.includes('vto');
      const isCortex = !isCallOut && !isCut;
      return {
        driverId: sch.driverId,
        status: isCortex ? 'RQ' : 'Corte',
        note: isCortex ? 'CORTEX' : 'NO CORTEX'
      };
    });

    return {
      date: selectedDateIso,
      amazonRoutes: initialRoutes,
      applied: false,
      decisions: initialDecisions
    };
  }, [cortesMap, selectedDateIso, scheduledDriversForDay]);

  // Local state for amazonRoutes so typing is instantaneous
  const [routesInput, setRoutesInput] = useState<number>(currentCorteConfig.amazonRoutes);

  // Sync routesInput when selected date changes
  React.useEffect(() => {
    setRoutesInput(currentCorteConfig.amazonRoutes);
  }, [selectedDateIso, currentCorteConfig.amazonRoutes]);

  // Merge decisions map
  const decisionsMap = useMemo(() => {
    const map = new Map<string, DriverCorte>();
    currentCorteConfig.decisions.forEach(d => map.set(d.driverId, d));
    return map;
  }, [currentCorteConfig.decisions]);

  // Asignar exclusivamente entre CORTEX y NO CORTEX
  const handleSetDriverCortex = (driverId: string, isCortex: boolean) => {
    const currentDecisions = [...currentCorteConfig.decisions];
    const idx = currentDecisions.findIndex(d => d.driverId === driverId);
    const status: CorteStatus = isCortex ? 'RQ' : 'Corte';
    const note = isCortex ? 'CORTEX' : 'NO CORTEX';

    if (idx >= 0) {
      currentDecisions[idx] = { ...currentDecisions[idx], status, note };
    } else {
      currentDecisions.push({ driverId, status, note });
    }

    onSaveCorteConfig({
      ...currentCorteConfig,
      amazonRoutes: routesInput,
      decisions: currentDecisions,
      lastUpdated: new Date().toISOString()
    });
  };

  // Handlers para actualizar decisiones individuales
  const handleUpdateDriverStatus = (driverId: string, status: CorteStatus) => {
    const currentDecisions = [...currentCorteConfig.decisions];
    const idx = currentDecisions.findIndex(d => d.driverId === driverId);

    if (idx >= 0) {
      currentDecisions[idx] = { ...currentDecisions[idx], status };
    } else {
      currentDecisions.push({ driverId, status });
    }

    onSaveCorteConfig({
      ...currentCorteConfig,
      amazonRoutes: routesInput,
      decisions: currentDecisions,
      lastUpdated: new Date().toISOString()
    });
  };

  const handleUpdateDriverRouteCode = (driverId: string, routeCode: string) => {
    const currentDecisions = [...currentCorteConfig.decisions];
    const idx = currentDecisions.findIndex(d => d.driverId === driverId);

    if (idx >= 0) {
      currentDecisions[idx] = { ...currentDecisions[idx], routeCode };
    } else {
      currentDecisions.push({ driverId, status: 'RQ', routeCode });
    }

    onSaveCorteConfig({
      ...currentCorteConfig,
      amazonRoutes: routesInput,
      decisions: currentDecisions,
      lastUpdated: new Date().toISOString()
    });
  };

  const handleUpdateAmazonRoutes = (newVal: number) => {
    const clamped = Math.max(0, newVal);
    setRoutesInput(clamped);
    onSaveCorteConfig({
      ...currentCorteConfig,
      amazonRoutes: clamped,
      lastUpdated: new Date().toISOString()
    });
  };

  // Auto-Balance Inteligente por Antigüedad
  // "Porque si hay 20 rutas y 10 drivers, tengo que quitar a 10 drivers o poner algunos de rescue y así balancear.
  // Entonces, quiero que en esa ventana me salgan toda la lista de los drivers que están en schedule para yo asignar los drivers que van a trabajar y los que no."
  const handleAutoBalanceBySeniority = () => {
    // 1. Obtener los drivers programados y ordenarlos por antigüedad estricta (más días primero)
    const sortedScheduled = [...scheduledDriversForDay].sort((a, b) => {
      const drvA = driverMap.get(a.driverId);
      const drvB = driverMap.get(b.driverId);
      if (!drvA || !drvB) return 0;
      const senA = calculateSeniority(drvA.hireDate);
      const senB = calculateSeniority(drvB.hireDate);
      return senB.totalDays - senA.totalDays;
    });

    const targetRoutes = routesInput;
    let assignedRoutes = 0;
    const newDecisions: DriverCorte[] = [];

    sortedScheduled.forEach((sch) => {
      const isCallOut = sch.status === 'Call-Out' || (sch.comment || '').toLowerCase().includes('call out');

      if (!isCallOut && assignedRoutes < targetRoutes) {
        // Asignar a CORTEX
        assignedRoutes++;
        newDecisions.push({
          driverId: sch.driverId,
          status: 'RQ',
          note: 'CORTEX'
        });
      } else {
        // Asignar a NO CORTEX
        newDecisions.push({
          driverId: sch.driverId,
          status: 'Corte',
          note: 'NO CORTEX'
        });
      }
    });

    onSaveCorteConfig({
      ...currentCorteConfig,
      amazonRoutes: targetRoutes,
      decisions: newDecisions,
      lastUpdated: new Date().toISOString()
    });
  };

  // Lista procesada de conductores con sus datos de decisión
  const processedDriverList = useMemo(() => {
    return scheduledDriversForDay.map(sch => {
      const driver = driverMap.get(sch.driverId);
      const decision = decisionsMap.get(sch.driverId) || {
        driverId: sch.driverId,
        status: (sch.status === 'Call-Out' ? 'Corte' : 'RQ') as CorteStatus,
        note: sch.status === 'Call-Out' ? 'NO CORTEX' : 'CORTEX'
      };
      const seniority = driver ? calculateSeniority(driver.hireDate) : { totalDays: 0, label: 'N/A' };
      const isCortex = decision.note === 'CORTEX' || (decision.status !== 'Corte' && decision.note !== 'NO CORTEX');

      return {
        sch,
        driver,
        decision,
        seniority,
        isCortex
      };
    });
  }, [scheduledDriversForDay, driverMap, decisionsMap]);

  // Ordenamiento de conductores
  const sortedDriverList = useMemo(() => {
    return [...processedDriverList].sort((a, b) => {
      if (sortMode === 'seniority') {
        return b.seniority.totalDays - a.seniority.totalDays;
      }
      const nameA = a.driver?.name || '';
      const nameB = b.driver?.name || '';
      return nameA.localeCompare(nameB);
    });
  }, [processedDriverList, sortMode]);

  // Filtros de búsqueda y estado (Todos, Cortex, No Cortex)
  const filteredDriverList = useMemo(() => {
    return sortedDriverList.filter(item => {
      const name = item.driver?.name || '';
      const matchesSearch =
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.decision.routeCode?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (item.sch.comment?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'cortex'
          ? item.isCortex
          : !item.isCortex;

      return matchesSearch && matchesStatus;
    });
  }, [sortedDriverList, searchQuery, statusFilter]);

  // Conteos exclusivos de Cortex y No Cortex
  const metrics = useMemo(() => {
    const totalScheduled = scheduledDriversForDay.length;
    let cortexCount = 0;
    let noCortexCount = 0;

    processedDriverList.forEach(item => {
      if (item.isCortex) {
        cortexCount++;
      } else {
        noCortexCount++;
      }
    });

    const diff = routesInput - cortexCount; // Cuántas rutas faltan o sobran

    return {
      totalScheduled,
      cortexCount,
      noCortexCount,
      diff
    };
  }, [scheduledDriversForDay, processedDriverList, routesInput]);

  const handleApply = () => {
    onApplyCortesToTruckAssignment(selectedDateIso, currentCorteConfig.decisions, routesInput);
  };

  return (
    <div className="space-y-4">
      {/* Selector de Días de la Semana */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {weekDates.map((dateObj, idx) => {
          const iso = toIsoDate(dateObj);
          const isSelected = iso === selectedDateIso;
          const isToday = iso === '2026-09-24';
          const dayScheduledCount = schedule.filter(
            s => s.date === iso && (isWorkingShift(s.comment || s.status) || s.status === 'Trabaja')
          ).length;
          const isApplied = cortesMap[iso]?.applied;

          return (
            <button
              key={iso}
              onClick={() => onSelectDate(iso)}
              className={`flex-1 min-w-[95px] py-2 px-2.5 rounded-xl border transition-all text-center flex flex-col items-center cursor-pointer ${
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
                    isSelected ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  {dayScheduledCount} drivers
                </span>
                {isApplied && (
                  <span
                    title="Cortes ya aplicados a Truck Assignment"
                    className={`w-2 h-2 rounded-full ${
                      isSelected ? 'bg-emerald-950' : 'bg-emerald-400'
                    }`}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Panel Superior de Control de Rutas y Balance */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          {/* Input de Rutas Otorgadas por Amazon */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2">
              <Route className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                  Rutas de Amazon (Hoy)
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <button
                    onClick={() => handleUpdateAmazonRoutes(routesInput - 1)}
                    className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center cursor-pointer text-xs"
                    title="Disminuir 1 ruta"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={routesInput}
                    onChange={(e) => handleUpdateAmazonRoutes(parseInt(e.target.value) || 0)}
                    className="w-14 text-center font-mono font-black text-lg bg-transparent text-amber-400 focus:outline-none"
                  />
                  <button
                    onClick={() => handleUpdateAmazonRoutes(routesInput + 1)}
                    className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center cursor-pointer text-xs"
                    title="Aumentar 1 ruta"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Indicador de Balance / Notificaciones */}
            <div
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border ${
                metrics.diff === 0
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : metrics.diff > 0
                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                  : 'bg-red-950/40 border-red-500/40 text-red-300'
              }`}
            >
              {metrics.diff === 0 ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 shrink-0" />
              )}
              <div>
                <div className="text-[11px] font-bold">
                  {metrics.diff === 0
                    ? 'Balance Perfecto: 100% Cubierto'
                    : metrics.diff > 0
                    ? `Faltan ${metrics.diff} rutas por asignar`
                    : `Sobreasignación de ${Math.abs(metrics.diff)} rutas`}
                </div>
                <div className="text-[10px] opacity-80">
                  {metrics.cortexCount} de {routesInput} rutas regulares cubiertas
                </div>
              </div>
            </div>

            {/* Conteos requeridos: Cortex y No Cortex (Al lado de las notificaciones) */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-slate-950/90 border border-emerald-500/50 rounded-xl px-3.5 py-2 min-w-[110px] shadow-sm">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold block">
                    Cortex
                  </span>
                  <span className="font-mono font-black text-xl text-emerald-300">
                    {metrics.cortexCount}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-slate-950/90 border border-red-500/50 rounded-xl px-3.5 py-2 min-w-[110px] shadow-sm">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-red-400 uppercase tracking-wider font-bold block">
                    No Cortex
                  </span>
                  <span className="font-mono font-black text-xl text-red-300">
                    {metrics.noCortexCount}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Botones de Acción de Cortex */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleApply}
              disabled={metrics.totalScheduled === 0}
              className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer ${
                metrics.totalScheduled === 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-amber-500/20 active:scale-95'
              }`}
            >
              <Scissors className="w-4 h-4" />
              <span>Aplicar a Truck Assignment</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar: Ordenamiento, Auto-Balance por Antigüedad, Búsqueda y Filtros */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Ordenar por */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5 text-xs">
            <span className="px-2 py-1 text-slate-400 flex items-center gap-1 font-medium">
              <ArrowUpDown className="w-3.5 h-3.5" />
              Ordenar:
            </span>
            <button
              onClick={() => setSortMode('seniority')}
              className={`px-2.5 py-1 font-semibold rounded-md transition-all cursor-pointer ${
                sortMode === 'seniority'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Antigüedad (Mayor a Menor)
            </button>
            <button
              onClick={() => setSortMode('alphabetical')}
              className={`px-2.5 py-1 font-semibold rounded-md transition-all cursor-pointer ${
                sortMode === 'alphabetical'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              A-Z
            </button>
          </div>

          {/* Botón de Auto-Balance por Antigüedad */}
          <button
            onClick={handleAutoBalanceBySeniority}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-400 text-amber-300 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs"
            title="Asigna automáticamente las rutas a los conductores con más antigüedad a CORTEX y el excedente a NO CORTEX"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Auto-Balance por Antigüedad</span>
          </button>
        </div>

        {/* Filtros y Buscador */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro de Estado: Todos / Cortex / No Cortex */}
          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded font-medium cursor-pointer ${
                statusFilter === 'all' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos ({metrics.totalScheduled})
            </button>
            <button
              onClick={() => setStatusFilter('cortex')}
              className={`px-2.5 py-1 rounded font-medium cursor-pointer ${
                statusFilter === 'cortex' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Cortex ({metrics.cortexCount})
            </button>
            <button
              onClick={() => setStatusFilter('no-cortex')}
              className={`px-2.5 py-1 rounded font-medium cursor-pointer ${
                statusFilter === 'no-cortex' ? 'bg-red-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              No Cortex ({metrics.noCortexCount})
            </button>
          </div>

          {/* Input de Búsqueda */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar conductor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 w-36 sm:w-44"
            />
          </div>
        </div>
      </div>

      {/* Lista de Conductores para el Corte */}
      <div className="space-y-2">
        {scheduledDriversForDay.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 sm:p-12 text-center max-w-lg mx-auto my-6 shadow-xl">
            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-400">
              <Calendar className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-100 mb-1.5">
              No hay conductores programados para trabajar en esta fecha
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              La pestaña <strong>Cortes</strong> toma los conductores asignados a trabajar en el <strong>Schedule</strong> para que puedas balancear las rutas con los conductores disponibles.
            </p>
          </div>
        ) : filteredDriverList.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-xs">
            No hay conductores que coincidan con la búsqueda o filtro aplicado.
          </div>
        ) : (
          filteredDriverList.map((item, index) => {
            const { sch, driver, decision, seniority } = item;
            const currentStatus = decision.status;
            const isCorte = currentStatus === 'Corte';
            const isCallOut = currentStatus === 'Call Out';
            const isWorking = ['RQ', 'Rescue', 'Flex', 'Standby'].includes(currentStatus);

            return (
              <div
                key={sch.driverId}
                className={`rounded-xl border transition-all p-3 text-xs ${
                  isCorte
                    ? 'bg-red-950/20 border-red-900/60 shadow-xs'
                    : isCallOut
                    ? 'bg-red-950/40 border-red-800/80 opacity-75'
                    : 'bg-slate-900/95 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  {/* Driver Info & Seniority */}
                  <div className="flex items-center gap-3 min-w-[260px]">
                    {/* Rank / Seniority badge */}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        isCorte
                          ? 'bg-red-900/40 text-red-300 border border-red-800/60'
                          : isWorking
                          ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-400'
                          : 'bg-slate-800 border border-slate-700 text-slate-300'
                      }`}
                    >
                      #{index + 1}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100 text-xs sm:text-sm">
                          {driver?.name || 'Conductor'}
                        </span>
                        {/* Seniority Label */}
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-amber-300 border border-slate-700">
                          {seniority.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span>{driver?.phone}</span>
                        <span>•</span>
                        <span className="text-slate-300">
                          Turno Schedule:{' '}
                          <strong className="text-amber-400 font-mono">
                            {sch.comment || (sch.status === 'Trabaja' ? '9:15 AM' : sch.status)}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Selector Exclusivo: CORTEX o NO CORTEX */}
                  <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-xl shadow-inner">
                    <button
                      type="button"
                      onClick={() => handleSetDriverCortex(sch.driverId, true)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        item.isCortex
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/60 ring-1 ring-emerald-400 font-mono'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                      }`}
                      title="Asignar conductor a CORTEX (trabaja ruta)"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>CORTEX</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSetDriverCortex(sch.driverId, false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        !item.isCortex
                          ? 'bg-red-600 text-white shadow-md shadow-red-950/60 ring-1 ring-red-400 font-mono'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                      }`}
                      title="Asignar conductor a NO CORTEX (no trabaja ruta)"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>NO CORTEX</span>
                    </button>
                  </div>

                  {/* Route Code or Note Input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Código Ruta (ej. CX101)"
                      value={decision.routeCode || ''}
                      onChange={(e) => handleUpdateDriverRouteCode(sch.driverId, e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-amber-300 font-mono focus:border-amber-400 focus:outline-none w-32"
                    />
                  </div>
                </div>

                {/* Status Indicator Banner */}
                {!item.isCortex && (
                  <div className="mt-2 py-1 px-2.5 bg-red-950/60 border border-red-800/50 rounded-lg text-[11px] text-red-300 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <UserX className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span>
                        <strong>NO CORTEX:</strong> Pasará a Truck Assignment con asignación de Call-Out / No Activo.
                      </span>
                    </div>
                    <button
                      onClick={() => handleSetDriverCortex(sch.driverId, true)}
                      className="text-[10px] text-amber-300 hover:underline font-bold cursor-pointer"
                    >
                      Cambiar a CORTEX
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
