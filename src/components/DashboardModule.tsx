import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  LayoutDashboard,
  Package,
  Truck,
  Users,
  TrendingUp,
  Percent,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  Info,
  Clock,
  Layers,
  Scissors,
  Edit3,
  Check,
  X,
  RotateCcw
} from 'lucide-react';
import {
  DailyAssignment,
  DayCorteConfig,
  DaySchedule,
  Driver,
  Vehicle
} from '../types';
import {
  DAY_NAMES_ES,
  DAY_NAMES_SHORT_ES,
  formatWeekLabel,
  getWeekDates,
  toIsoDate
} from '../utils/dateUtils';
import { isWorkingShift } from '../utils/scheduleComments';

interface DashboardModuleProps {
  currentMonday: Date;
  onChangeMonday?: (monday: Date) => void;
  drivers: Driver[];
  vehicles: Vehicle[];
  assignments: DailyAssignment[];
  schedule: DaySchedule[];
  cortesMap: { [dateIso: string]: DayCorteConfig };
  packagesMap: { [dateIso: string]: any };
  onUpdateDailyPackages: (dateIso: string, packages: any) => void;
  onResetAllMetrics?: () => void;
  onNavigateToTab?: (tab: 'schedule' | 'cortes' | 'truck-assignment' | 'fleet-inventory') => void;
  dspName: string;
  stationCode: string;
}

// Colores de diseño para gráficos
const CHART_COLORS = {
  amber: '#f59e0b',
  amberLight: '#fbbf24',
  blue: '#3b82f6',
  blueLight: '#60a5fa',
  emerald: '#10b981',
  emeraldLight: '#34d399',
  purple: '#a855f7',
  indigo: '#6366f1',
  rose: '#f43f5e',
  slate: '#64748b',
  slateDark: '#1e293b'
};

const FLEET_TYPE_COLORS: Record<string, string> = {
  'Step Van': '#f59e0b',       // Amber
  'Custom Van': '#3b82f6',     // Blue
  'EV - Eléctrico': '#10b981', // Emerald
  'Camión': '#a855f7',         // Purple
  'Auto Rentado': '#64748b'    // Slate
};

export const DashboardModule: React.FC<DashboardModuleProps> = ({
  currentMonday,
  onChangeMonday,
  drivers,
  vehicles,
  assignments,
  schedule,
  cortesMap,
  packagesMap,
  onUpdateDailyPackages,
  onResetAllMetrics,
  onNavigateToTab,
  dspName,
  stationCode
}) => {
  const [editingDateIso, setEditingDateIso] = useState<string | null>(null);
  const [tempPackageCount, setTempPackageCount] = useState<number>(0);
  const [fleetViewMode, setFleetViewMode] = useState<'area' | 'bar'>('area');

  // Fechas de la semana actual (Domingo a Sábado)
  const weekDates = useMemo(() => getWeekDates(currentMonday), [currentMonday]);
  const weekLabel = useMemo(() => formatWeekLabel(currentMonday), [currentMonday]);

  // Vehículos operativos (Capacidad total activa de la flota)
  const totalVehiclesCount = vehicles.length;
  const operativeVehicles = useMemo(
    () => vehicles.filter((v) => v.status === 'Operativo'),
    [vehicles]
  );
  const operativeCapacity = operativeVehicles.length || (totalVehiclesCount > 0 ? totalVehiclesCount : 1);
  const inShopVehicles = vehicles.filter((v) => v.status === 'En el Taller' || (v.status as any) === 'Taller');
  const inProcessVehicles = vehicles.filter((v) => v.status === 'En proceso');
  const inactiveVehicles = vehicles.filter((v) => v.status === 'Inactivo');
  const otherVehicles = vehicles.filter((v) => v.status === 'Otro');

  // Procesamiento de datos diarios para los gráficos (Completamente limpio sin inventar números)
  const dailyData = useMemo(() => {
    return weekDates.map((dateObj, dayIndex) => {
      const iso = toIsoDate(dateObj);
      const dayName = DAY_NAMES_ES[dayIndex];
      const shortDay = `${DAY_NAMES_SHORT_ES[dayIndex]} ${dateObj.getDate()}`;

      // 1. Conductores programados para trabajar según Schedule
      const dayScheduleWorking = schedule.filter(
        (s) => s.date === iso && (isWorkingShift(s.comment || s.status) || s.status === 'Trabaja')
      );

      // 2. Asignaciones del día (Truck Assignment)
      const dayAsgs = assignments.filter((a) => a.date === iso);
      const activeAssignments = dayAsgs.filter((a) => a.status !== 'Call Out');

      // 3. Cantidad de camionetas asignadas u operando en ese día
      const assignedVans = new Set<string>();
      activeAssignments.forEach((a) => {
        if (a.vanNumber && a.vanNumber.trim() !== '') {
          assignedVans.add(a.vanNumber.trim());
        }
      });

      let activeVansCount = assignedVans.size;
      const corteConfig = cortesMap[iso];

      if (activeVansCount === 0) {
        if (corteConfig?.applied && corteConfig.decisions) {
          const workingCortes = corteConfig.decisions.filter((d) => d.status !== 'Corte' && d.status !== 'Call Out');
          activeVansCount = Math.min(workingCortes.length, operativeCapacity);
        } else if (dayScheduleWorking.length > 0) {
          activeVansCount = Math.min(dayScheduleWorking.length, operativeCapacity);
        }
      }

      // 4. Porcentaje de ocupación de flota diaria
      const fleetOccupancyPercent = operativeVehicles.length > 0 && activeVansCount > 0
        ? Number(((activeVansCount / operativeCapacity) * 100).toFixed(1))
        : 0;
      const idleVansCount = Math.max(0, operativeCapacity - activeVansCount);

      // 5. Total de paquetes asignados por día (Métricas limpias para introducir información)
      const rawPkg = packagesMap[iso];
      let packages = 0;
      let cxPackages = 0;
      let flexPackages = 0;
      let hasCustomPackages = false;

      if (typeof rawPkg === 'object' && rawPkg !== null) {
        cxPackages = Number(rawPkg.cx) || 0;
        flexPackages = Number(rawPkg.flex) || 0;
        packages = Number(rawPkg.total) || (cxPackages + flexPackages);
        hasCustomPackages = packages > 0;
      } else if (typeof rawPkg === 'number' && rawPkg > 0) {
        packages = rawPkg;
        cxPackages = rawPkg;
        hasCustomPackages = true;
      }

      // SPR (Shipment Per Route / Paquetes por ruta)
      const routesCount = activeVansCount || dayScheduleWorking.length || 0;
      const spr = routesCount > 0 && packages > 0 ? Math.round(packages / routesCount) : 0;

      return {
        iso,
        dayName,
        shortDay,
        dayIndex,
        packages,
        cxPackages,
        flexPackages,
        hasCustomPackages,
        activeVans: activeVansCount,
        idleVans: idleVansCount,
        totalCapacity: operativeCapacity,
        fleetOccupancy: fleetOccupancyPercent,
        scheduledDrivers: dayScheduleWorking.length,
        routesCount,
        spr
      };
    });
  }, [weekDates, schedule, assignments, cortesMap, packagesMap, operativeCapacity, operativeVehicles.length]);

  // Resumen Semanal de Métricas Clave
  const weeklySummary = useMemo(() => {
    const totalWeeklyPackages = dailyData.reduce((sum, d) => sum + d.packages, 0);
    const avgDailyPackages = Math.round(totalWeeklyPackages / 7);

    // Ocupación promedio semanal de la flota
    const avgFleetOccupancy = Number(
      (dailyData.reduce((sum, d) => sum + d.fleetOccupancy, 0) / 7).toFixed(1)
    );

    // Día con mayor volumen de paquetes (Peak Day)
    const peakDay = [...dailyData].sort((a, b) => b.packages - a.packages)[0];

    // Total de camionetas desplegadas en la semana
    const totalVansDeployed = dailyData.reduce((sum, d) => sum + d.activeVans, 0);
    const avgVansPerDay = Number((totalVansDeployed / 7).toFixed(1));

    return {
      totalWeeklyPackages,
      avgDailyPackages,
      avgFleetOccupancy,
      peakDay,
      totalVansDeployed,
      avgVansPerDay
    };
  }, [dailyData]);

  // Distribución de Flota por Tipo de Vehículo
  const fleetDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    vehicles.forEach((v) => {
      counts[v.type] = (counts[v.type] || 0) + 1;
    });

    return Object.entries(counts).map(([type, count]) => ({
      name: type,
      value: count,
      color: FLEET_TYPE_COLORS[type] || CHART_COLORS.amber
    }));
  }, [vehicles]);

  // Handlers para navegación de semana
  const handlePrevWeek = () => {
    if (onChangeMonday) {
      const prev = new Date(currentMonday);
      prev.setDate(prev.getDate() - 7);
      onChangeMonday(prev);
    }
  };

  const handleNextWeek = () => {
    if (onChangeMonday) {
      const next = new Date(currentMonday);
      next.setDate(next.getDate() + 7);
      onChangeMonday(next);
    }
  };

  // Guardar edición rápida de paquetes de un día
  const handleSavePackageCount = (iso: string) => {
    onUpdateDailyPackages(iso, tempPackageCount);
    setEditingDateIso(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header Principal del Dashboard con Controles de Semana y Estación */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/30 shrink-0">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-xl font-black text-slate-100 tracking-tight">
                  Dashboard de Operaciones Amazon DSP
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {stationCode} • {dspName}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  En Vivo
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Visualización en tiempo real de paquetes diarios asignados, porcentaje de ocupación de flota semanal y rendimiento operativo.
              </p>
            </div>
          </div>

          {/* Navegador de Semana Rápido */}
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-xl p-1.5 shadow-inner self-start lg:self-auto">
            <button
              onClick={handlePrevWeek}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Semana anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 px-2 text-xs font-semibold text-slate-200">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>{weekLabel}</span>
            </div>
            <button
              onClick={handleNextWeek}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Semana siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Tarjetas de Métricas Principales (KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Paquetes Semanales */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
              Paquetes Semanales
            </span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-100">
              {weeklySummary.totalWeeklyPackages.toLocaleString()}
            </span>
            <span className="text-xs text-amber-400 font-semibold">paquetes</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Promedio Diario:</span>
            <span className="font-mono font-bold text-slate-200">
              ~{weeklySummary.avgDailyPackages.toLocaleString()} / día
            </span>
          </div>
        </div>

        {/* KPI 2: Porcentaje de Ocupación de Flota Semanal */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
              Ocupación Flota Semanal
            </span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
              {weeklySummary.avgFleetOccupancy}%
            </span>
            <span className="text-xs text-slate-400 font-medium">promedio</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Meta Amazon DSP:</span>
            <span className="font-mono font-bold text-emerald-400">≥ 85.0%</span>
          </div>
        </div>

        {/* KPI 3: Capacidad y Despliegue de Camionetas */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg hover:border-blue-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
              Flota Operativa
            </span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-blue-300">
              {operativeCapacity}
            </span>
            <span className="text-xs text-slate-400">
              de {totalVehiclesCount} camionetas
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Promedio en Ruta:</span>
            <span className="font-mono font-bold text-blue-400">
              {weeklySummary.avgVansPerDay} vans / día
            </span>
          </div>
        </div>

        {/* KPI 4: Día Pico de Paquetes */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg hover:border-purple-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
              Día Pico (Peak Day)
            </span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-purple-300">
              {weeklySummary.peakDay?.dayName || 'Jueves'}
            </span>
            <span className="text-xs text-purple-400 font-mono font-bold">
              {weeklySummary.peakDay?.packages.toLocaleString()} paq
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Ocupación Flota Pico:</span>
            <span className="font-mono font-bold text-purple-300">
              {weeklySummary.peakDay?.fleetOccupancy}%
            </span>
          </div>
        </div>
      </div>

      {/* 3. SECCIÓN DE GRÁFICOS PRINCIPALES CON RECHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRÁFICO 1: TOTAL DE PAQUETES ASIGNADOS POR DÍA */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-100">
                  Total de Paquetes Asignados por Día
                </h3>
                <p className="text-[11px] text-slate-400">
                  Volumen diario de paquetes entregados en la semana actual
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Total: {weeklySummary.totalWeeklyPackages.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Gráfico Recharts de Paquetes */}
          <div className="w-full h-72 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dailyData}
                margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="packageGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#d97706" stopOpacity={0.65} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis
                  dataKey="shortDay"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-950 border border-amber-500/40 rounded-xl p-3 shadow-2xl text-xs space-y-1">
                          <p className="font-bold text-slate-100 flex items-center justify-between gap-4">
                            <span>{data.dayName}</span>
                            <span className="font-mono text-slate-400 text-[10px]">{data.iso}</span>
                          </p>
                          <div className="pt-1.5 border-t border-slate-800 space-y-1">
                            <p className="flex items-center justify-between gap-3">
                              <span className="text-amber-400">Total Paquetes:</span>
                              <strong className="font-mono text-white text-sm">
                                {data.packages.toLocaleString()}
                              </strong>
                            </p>
                            <p className="flex items-center justify-between gap-3 text-slate-300">
                              <span>Rutas Activas:</span>
                              <span className="font-mono font-semibold">{data.routesCount} rutas</span>
                            </p>
                            <p className="flex items-center justify-between gap-3 text-slate-400 text-[11px]">
                              <span>Promedio por Ruta (SPR):</span>
                              <span className="font-mono text-amber-300">~{data.spr} paq/ruta</span>
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine
                  y={weeklySummary.avgDailyPackages}
                  stroke="#f59e0b"
                  strokeDasharray="3 3"
                  strokeOpacity={0.6}
                  label={{
                    value: `Promedio: ${weeklySummary.avgDailyPackages.toLocaleString()}`,
                    fill: '#f59e0b',
                    fontSize: 10,
                    position: 'insideTopRight'
                  }}
                />
                <Bar
                  dataKey="packages"
                  name="Paquetes Asignados"
                  fill="url(#packageGradient)"
                  radius={[6, 6, 0, 0]}
                  barSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
              Barra: Paquetes del día
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-amber-500 inline-block border-dashed" />
              Línea discontinua: Promedio semanal
            </span>
          </div>
        </div>

        {/* GRÁFICO 2: PORCENTAJE DE OCUPACIÓN DE FLOTA SEMANAL */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-100">
                  Porcentaje de Ocupación de Flota Semanal
                </h3>
                <p className="text-[11px] text-slate-400">
                  Utilización de vans operativas respecto a la capacidad total activa
                </p>
              </div>
            </div>
            {/* Toggle Tipo de Visualización (Area vs Bar) */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
              <button
                onClick={() => setFleetViewMode('area')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  fleetViewMode === 'area'
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Curva (Área)
              </button>
              <button
                onClick={() => setFleetViewMode('bar')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  fleetViewMode === 'bar'
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Barras
              </button>
            </div>
          </div>

          {/* Gráfico Recharts de Ocupación de Flota */}
          <div className="w-full h-72 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              {fleetViewMode === 'area' ? (
                <AreaChart
                  data={dailyData}
                  margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="fleetOccupancyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                  <XAxis
                    dataKey="shortDay"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    domain={[0, 100]}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-950 border border-emerald-500/40 rounded-xl p-3 shadow-2xl text-xs space-y-1">
                            <p className="font-bold text-slate-100 flex items-center justify-between gap-4">
                              <span>{data.dayName}</span>
                              <span className="font-mono text-slate-400 text-[10px]">{data.iso}</span>
                            </p>
                            <div className="pt-1.5 border-t border-slate-800 space-y-1">
                              <p className="flex items-center justify-between gap-3">
                                <span className="text-emerald-400">Ocupación de Flota:</span>
                                <strong className="font-mono text-emerald-300 text-sm">
                                  {data.fleetOccupancy}%
                                </strong>
                              </p>
                              <p className="flex items-center justify-between gap-3 text-slate-300">
                                <span>Camionetas en Ruta:</span>
                                <span className="font-mono font-semibold">
                                  {data.activeVans} / {data.totalCapacity} vans
                                </span>
                              </p>
                              <p className="flex items-center justify-between gap-3 text-slate-400 text-[11px]">
                                <span>Vans en Reserva (Standby):</span>
                                <span className="font-mono text-slate-300">{data.idleVans} vans</span>
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine
                    y={85}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    strokeOpacity={0.8}
                    label={{
                      value: 'Meta DSP: 85%',
                      fill: '#10b981',
                      fontSize: 10,
                      position: 'insideTopLeft'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="fleetOccupancy"
                    name="% Ocupación"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#fleetOccupancyGradient)"
                  />
                </AreaChart>
              ) : (
                <BarChart
                  data={dailyData}
                  margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="fleetBarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                  <XAxis
                    dataKey="shortDay"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    domain={[0, 100]}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-950 border border-emerald-500/40 rounded-xl p-3 shadow-2xl text-xs space-y-1">
                            <p className="font-bold text-slate-100 flex items-center justify-between gap-4">
                              <span>{data.dayName}</span>
                              <span className="font-mono text-slate-400 text-[10px]">{data.iso}</span>
                            </p>
                            <div className="pt-1.5 border-t border-slate-800 space-y-1">
                              <p className="flex items-center justify-between gap-3">
                                <span className="text-emerald-400">Ocupación:</span>
                                <strong className="font-mono text-emerald-300 text-sm">
                                  {data.fleetOccupancy}%
                                </strong>
                              </p>
                              <p className="flex items-center justify-between gap-3 text-slate-300">
                                <span>Vans Asignadas:</span>
                                <span className="font-mono font-semibold">
                                  {data.activeVans} de {data.totalCapacity}
                                </span>
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine
                    y={85}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    strokeOpacity={0.8}
                    label={{
                      value: 'Meta DSP: 85%',
                      fill: '#10b981',
                      fontSize: 10,
                      position: 'insideTopLeft'
                    }}
                  />
                  <Bar
                    dataKey="fleetOccupancy"
                    name="% Ocupación"
                    fill="url(#fleetBarGradient)"
                    radius={[6, 6, 0, 0]}
                    barSize={32}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
              Ocupación semanal promedio: <strong className="text-emerald-400 font-mono">{weeklySummary.avgFleetOccupancy}%</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-emerald-500 inline-block border-dashed" />
              Línea de Meta Amazon: 85%
            </span>
          </div>
        </div>
      </div>

      {/* 4. TABLA INTERACTIVA: DESGLOSE DÍA POR DÍA Y AJUSTE RÁPIDO DE PAQUETES */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 sm:p-5 bg-slate-950/70 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-100">
                Desglose Operativo Diario ({weekLabel})
              </h3>
              <p className="text-[11px] text-slate-400">
                Puedes ajustar el total de paquetes asignados de cualquier día haciendo clic en el botón de edición.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-[11px]">
              {operativeCapacity} Vans Operativas
            </span>
            <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-[11px]">
              {drivers.length} Conductores
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/90 text-slate-400 border-b border-slate-800 text-[10px] uppercase font-bold tracking-wider">
                <th className="py-3 px-4">Día / Fecha</th>
                <th className="py-3 px-4">Conductores Programados</th>
                <th className="py-3 px-4">Camionetas en Ruta</th>
                <th className="py-3 px-4">% Ocupación Flota</th>
                <th className="py-3 px-4">Paquetes Asignados</th>
                <th className="py-3 px-4">Promedio / Ruta (SPR)</th>
                <th className="py-3 px-4 text-right">Ajuste de Paquetes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {dailyData.map((row) => {
                const isEditing = editingDateIso === row.iso;
                const isHighOccupancy = row.fleetOccupancy >= 85;

                return (
                  <tr key={row.iso} className="hover:bg-slate-800/40 transition-colors">
                    {/* Día y Fecha */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-100">{row.dayName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{row.iso}</div>
                    </td>

                    {/* Conductores */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-slate-200 font-semibold">
                        {row.scheduledDrivers} drivers
                      </span>
                    </td>

                    {/* Camionetas */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-100">
                          {row.activeVans} / {row.totalCapacity}
                        </span>
                        {row.idleVans > 0 && (
                          <span className="text-[10px] text-slate-500">
                            ({row.idleVans} standby)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* % Ocupación */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                            isHighOccupancy
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {row.fleetOccupancy}%
                        </span>
                        {/* Mini Barra de Progreso */}
                        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className={`h-full rounded-full ${
                              isHighOccupancy ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.min(100, row.fleetOccupancy)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Paquetes */}
                    <td className="py-3 px-4">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            step="10"
                            value={tempPackageCount}
                            onChange={(e) => setTempPackageCount(Number(e.target.value) || 0)}
                            className="w-24 bg-slate-800 border border-amber-400 text-amber-300 font-mono font-bold px-2 py-1 rounded text-xs focus:outline-none"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-amber-300 text-sm">
                            {row.packages.toLocaleString()}
                          </span>
                          {row.hasCustomPackages && (
                            <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              Fijado
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* SPR */}
                    <td className="py-3 px-4 font-mono text-slate-300">
                      ~{row.spr} paq
                    </td>

                    {/* Acción de Edición */}
                    <td className="py-3 px-4 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleSavePackageCount(row.iso)}
                            className="p-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors cursor-pointer"
                            title="Guardar paquetes"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingDateIso(null)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                            title="Cancelar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingDateIso(row.iso);
                            setTempPackageCount(row.packages);
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 rounded-lg text-[11px] font-semibold border border-slate-700 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Editar Paquetes</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. SECCIÓN INFERIOR: ESTADO DE LA FLOTA Y ACCESOS DIRECTOS OPERATIVOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribución por Tipo de Camioneta */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col">
          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-800">
            <Truck className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm text-slate-100">
              Composición de la Flota ({totalVehiclesCount} Vans)
            </h3>
          </div>

          <div className="flex items-center justify-center my-auto py-2">
            <div className="w-48 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={fleetDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {fleetDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs shadow-xl">
                            <span className="font-bold text-white block">{item.name}</span>
                            <span className="font-mono text-amber-400">{item.value} unidades</span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
            {fleetDistribution.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-slate-400 truncate text-[11px]">{item.name}:</span>
                <strong className="text-slate-200 font-mono ml-auto">{item.value}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Estado Operativo de la Flota (Taller, Inactivo, Operativo) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col">
          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm text-slate-100">
              Estado Mecánico y Disponibilidad
            </h3>
          </div>

          <div className="space-y-3.5 my-auto">
            {/* Operativas */}
            <div className="bg-slate-950/60 border border-emerald-500/20 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <div>
                  <span className="text-xs font-bold text-slate-100 block">Operativas para Ruta</span>
                  <span className="text-[10px] text-slate-400">Listas para asignación diaria</span>
                </div>
              </div>
              <span className="text-lg font-black font-mono text-emerald-400">
                {operativeCapacity}
              </span>
            </div>

            {/* En Taller */}
            <div className="bg-slate-950/60 border border-amber-500/20 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <div>
                  <span className="text-xs font-bold text-slate-100 block">En Taller / Mantenimiento</span>
                  <span className="text-[10px] text-slate-400">DVIC / Daños o servicio</span>
                </div>
              </div>
              <span className="text-lg font-black font-mono text-amber-400">
                {inShopVehicles.length}
              </span>
            </div>

            {/* Inactivas */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                <div>
                  <span className="text-xs font-bold text-slate-300 block">Inactivas / Fuera de Flota</span>
                  <span className="text-[10px] text-slate-400">Baja o desvinculadas</span>
                </div>
              </div>
              <span className="text-lg font-black font-mono text-slate-400">
                {inactiveVehicles.length}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Tasa de Disponibilidad:</span>
            <span className="font-mono font-bold text-emerald-400">
              {((operativeCapacity / (totalVehiclesCount || 1)) * 100).toFixed(1)}% Operativa
            </span>
          </div>
        </div>

        {/* Accesos Rápidos de Despacho Operativo */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-800">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <h3 className="font-bold text-sm text-slate-100">
                Accesos Directos de Despacho
              </h3>
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Navega ágilmente a los módulos operativos vinculados a las métricas del dashboard:
            </p>

            <div className="space-y-2">
              <button
                onClick={() => onNavigateToTab?.('truck-assignment')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-xs font-semibold text-slate-200 hover:text-amber-400 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-amber-400" />
                  <span>Truck assignment</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors" />
              </button>

              <button
                onClick={() => onNavigateToTab?.('cortes')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-xs font-semibold text-slate-200 hover:text-amber-400 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-emerald-400" />
                  <span>Cortex</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors" />
              </button>

              <button
                onClick={() => onNavigateToTab?.('schedule')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-xs font-semibold text-slate-200 hover:text-amber-400 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span>Schedule</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors" />
              </button>

              <button
                onClick={() => onNavigateToTab?.('fleet-inventory')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-xs font-semibold text-slate-200 hover:text-amber-400 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>Gestión</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors" />
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500 text-center">
            {dspName} • Operaciones Amazon DSP
          </div>
        </div>
      </div>
    </div>
  );
};
