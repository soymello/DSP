import React, { useState, useMemo } from 'react';
import {
  Download,
  Search,
  ChevronDown,
  ChevronRight,
  Clock,
  DollarSign,
  AlertCircle,
  FileSpreadsheet,
  Edit2,
  Check,
  Calendar,
  Users
} from 'lucide-react';
import { DailyAssignment, Driver } from '../types';
import {
  calculateLunchDuration,
  calculateNetHours,
  calculateSeniority,
  DAY_NAMES_ES,
  DAY_NAMES_SHORT_ES,
  getWeekDates,
  toIsoDate
} from '../utils/dateUtils';
import { exportTimesheetToExcel } from '../utils/excelExport';

interface TimesheetModuleProps {
  currentMonday: Date;
  drivers: Driver[];
  assignments: DailyAssignment[];
  onUpdateAssignment: (assignment: DailyAssignment) => void;
  dspName: string;
}

export const TimesheetModule: React.FC<TimesheetModuleProps> = ({
  currentMonday,
  drivers,
  assignments,
  onUpdateAssignment,
  dspName
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDriverId, setExpandedDriverId] = useState<string | null>(null);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [editPunches, setEditPunches] = useState<{
    clockIn: string;
    lunchStart: string;
    lunchEnd: string;
    clockOut: string;
    comment: string;
  }>({
    clockIn: '',
    lunchStart: '',
    lunchEnd: '',
    clockOut: '',
    comment: ''
  });

  const weekDates = useMemo(() => getWeekDates(currentMonday), [currentMonday]);
  const weekDatesIso = useMemo(() => weekDates.map(d => toIsoDate(d)), [weekDates]);

  // Alphabetical list of active drivers as requested:
  // "En el timesheet, quiero que me hagas una tabla resumida con cada conductor en nombre alfabético cuántas horas ha trabajado. En la semana."
  const sortedAlphabeticalDrivers = useMemo(() => {
    return [...drivers]
      .filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [drivers, searchQuery]);

  // Pre-calculate weekly stats for each driver
  const driverWeeklyStats = useMemo(() => {
    const stats = new Map<string, {
      totalHours: number;
      regularHours: number;
      overtimeHours: number;
      daysWorked: number;
      dailyNet: { [isoDate: string]: { formatted: string; decimal: number } };
    }>();

    drivers.forEach(drv => {
      let total = 0;
      let days = 0;
      const dailyNet: { [isoDate: string]: { formatted: string; decimal: number } } = {};

      weekDatesIso.forEach(iso => {
        const asg = assignments.find(a => a.driverId === drv.id && a.date === iso && a.status !== 'Call Out');
        if (asg && asg.clockIn) {
          const net = calculateNetHours(asg.clockIn, asg.lunchStart, asg.lunchEnd, asg.clockOut);
          dailyNet[iso] = { formatted: net.formatted, decimal: net.decimalHours };
          if (net.decimalHours > 0) {
            total += net.decimalHours;
            days++;
          }
        } else {
          dailyNet[iso] = { formatted: '-', decimal: 0 };
        }
      });

      const regular = Math.min(40, total);
      const overtime = Math.max(0, total - 40);

      stats.set(drv.id, {
        totalHours: Math.round(total * 100) / 100,
        regularHours: Math.round(regular * 100) / 100,
        overtimeHours: Math.round(overtime * 100) / 100,
        daysWorked: days,
        dailyNet
      });
    });

    return stats;
  }, [drivers, assignments, weekDatesIso]);

  // Grand totals across all drivers
  const grandStats = useMemo(() => {
    let totalH = 0;
    let regH = 0;
    let otH = 0;
    let shifts = 0;

    driverWeeklyStats.forEach(st => {
      totalH += st.totalHours;
      regH += st.regularHours;
      otH += st.overtimeHours;
      shifts += st.daysWorked;
    });

    return { totalH, regH, otH, shifts };
  }, [driverWeeklyStats]);

  const handleExport = () => {
    exportTimesheetToExcel(currentMonday, drivers, assignments, dspName);
  };

  const startEditPunch = (asg: DailyAssignment) => {
    setEditingAssignmentId(asg.id);
    setEditPunches({
      clockIn: asg.clockIn || '',
      lunchStart: asg.lunchStart || '',
      lunchEnd: asg.lunchEnd || '',
      clockOut: asg.clockOut || '',
      comment: asg.comment || ''
    });
  };

  const saveEditPunch = (originalAsg: DailyAssignment) => {
    onUpdateAssignment({
      ...originalAsg,
      clockIn: editPunches.clockIn,
      lunchStart: editPunches.lunchStart,
      lunchEnd: editPunches.lunchEnd,
      clockOut: editPunches.clockOut,
      comment: editPunches.comment
    });
    setEditingAssignmentId(null);
  };

  return (
    <div className="space-y-4">
      {/* Header KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3 shadow-md">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Total Horas Netas
            </span>
            <span className="text-xl font-black font-mono text-emerald-300">
              {grandStats.totalH.toFixed(1)} hrs
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3 shadow-md">
          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Horas Regulares
            </span>
            <span className="text-xl font-black font-mono text-blue-300">
              {grandStats.regH.toFixed(1)} hrs
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3 shadow-md">
          <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Overtime (&gt;40h)
            </span>
            <span className="text-xl font-black font-mono text-amber-300">
              {grandStats.otH.toFixed(1)} hrs
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3 shadow-md">
          <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-lg border border-purple-500/20">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Turnos Trabajados
            </span>
            <span className="text-xl font-black font-mono text-purple-300">
              {grandStats.shifts} turnos
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar: Search & Excel Extraction Button */}
      {/* "Botón de Extracción: Exporta el reporte consolidado de horas a Excel (.xlsx) filtrado por rango de fechas." */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar conductor en la nómina..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 w-56 sm:w-72"
          />
        </div>

        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md transition-colors cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Extracción a Excel (.xlsx) para Payroll</span>
        </button>
      </div>

      {/* Tabla Resumida Semanal (Vista Principal en Orden Alfabético) */}
      {/* "En el timesheet, quiero que me hagas una tabla resumida con cada conductor en nombre alfabético cuántas horas ha trabajado. En la semana." */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 text-slate-300 border-b border-slate-800 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-3 w-8 text-center"></th>
                <th className="py-3 px-3">Conductor (Orden Alfabético)</th>
                {weekDates.map((d, i) => (
                  <th key={i} className="py-3 px-2 text-center min-w-[70px]">
                    <span className="block text-slate-300">{DAY_NAMES_SHORT_ES[i]}</span>
                    <span className="text-[10px] text-slate-500 font-mono font-normal">
                      {d.getDate()}/{d.getMonth() + 1}
                    </span>
                  </th>
                ))}
                <th className="py-3 px-3 text-center">Días</th>
                <th className="py-3 px-3 text-center">Horas Regulares</th>
                <th className="py-3 px-3 text-center">Overtime</th>
                <th className="py-3 px-3 text-center font-bold text-emerald-400">Total Semana</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {sortedAlphabeticalDrivers.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-slate-600" />
                      <p className="font-semibold text-slate-300">No hay registros de horas</p>
                      <p className="text-[11px] text-slate-500 max-w-sm">
                        No hay conductores registrados para calcular nómina en este período.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedAlphabeticalDrivers.map((driver) => {
                const stat = driverWeeklyStats.get(driver.id) || {
                  totalHours: 0,
                  regularHours: 0,
                  overtimeHours: 0,
                  daysWorked: 0,
                  dailyNet: {}
                };
                const isExpanded = expandedDriverId === driver.id;
                const seniority = calculateSeniority(driver.hireDate, currentMonday);

                return (
                  <React.Fragment key={driver.id}>
                    {/* Main Summary Row */}
                    <tr
                      onClick={() => setExpandedDriverId(isExpanded ? null : driver.id)}
                      className={`hover:bg-slate-800/50 transition-colors cursor-pointer ${
                        isExpanded ? 'bg-slate-800/30' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center text-slate-400">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-amber-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-500" />
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-100 flex items-center gap-2">
                          <span>{driver.name}</span>
                          {stat.overtimeHours > 0 && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded font-mono font-bold">
                              OT +{stat.overtimeHours}h
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {seniority.label} • {driver.phone}
                        </div>
                      </td>

                      {/* Day by Day quick hour cells */}
                      {weekDatesIso.map((iso) => {
                        const dayData = stat.dailyNet[iso] || { formatted: '-', decimal: 0 };
                        return (
                          <td key={iso} className="py-2.5 px-2 text-center font-mono">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[11px] ${
                                dayData.decimal > 0
                                  ? 'bg-slate-800 text-slate-200 font-medium'
                                  : 'text-slate-600'
                              }`}
                            >
                              {dayData.formatted}
                            </span>
                          </td>
                        );
                      })}

                      <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                        {stat.daysWorked}
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono text-blue-300">
                        {stat.regularHours.toFixed(2)}h
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono">
                        {stat.overtimeHours > 0 ? (
                          <span className="font-bold text-amber-400">
                            {stat.overtimeHours.toFixed(2)}h
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono font-black text-sm text-emerald-400">
                        {stat.totalHours.toFixed(2)}h
                      </td>
                    </tr>

                    {/* Vista Detallada por Conductor (Dropdown expandible) */}
                    {/* "Vista Detallada por Conductor:
                        Desglose diario: Hora de entrada (Clock In), inicio/fin de almuerzo (Lunch Start/End), hora de salida (Clock Out) y tiempo neto de almuerzo.
                        Fórmula de Cálculo Netas:
                        $$\text{Horas Totales} = (\text{Lunch Start} - \text{Clock In}) + (\text{Clock Out} - \text{Lunch End})$$" */}
                    {isExpanded && (
                      <tr className="bg-slate-950/70">
                        <td colSpan={12} className="p-4 border-y border-slate-800">
                          <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-4 shadow-inner">
                            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-amber-400" />
                                <h4 className="font-bold text-sm text-slate-100">
                                  Desglose Diario Detallado de Punches - {driver.name}
                                </h4>
                              </div>
                              <span className="text-[11px] text-slate-400">
                                Fórmula: <span className="font-mono text-amber-300">(Lunch In - Clock In) + (Clock Out - Lunch Out)</span>
                              </span>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                                    <th className="py-2 px-2">Día & Fecha</th>
                                    <th className="py-2 px-2">Estado / Rol</th>
                                    <th className="py-2 px-2">Clock In</th>
                                    <th className="py-2 px-2">Lunch Start</th>
                                    <th className="py-2 px-2">Lunch End</th>
                                    <th className="py-2 px-2">Min. Almuerzo</th>
                                    <th className="py-2 px-2">Clock Out</th>
                                    <th className="py-2 px-2 font-bold text-emerald-400">Horas Netas</th>
                                    <th className="py-2 px-2">Observaciones</th>
                                    <th className="py-2 px-2 text-right">Acción</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                  {weekDates.map((dateObj, dayIdx) => {
                                    const iso = toIsoDate(dateObj);
                                    const asg = assignments.find(a => a.driverId === driver.id && a.date === iso);
                                    const isEditing = editingAssignmentId === asg?.id;

                                    if (!asg) {
                                      return (
                                        <tr key={iso} className="text-slate-600">
                                          <td className="py-2 px-2 font-medium">
                                            {DAY_NAMES_ES[dayIdx]} {dateObj.getDate()}
                                          </td>
                                          <td colSpan={9} className="py-2 px-2 italic text-[11px]">
                                            Día libre / Sin registro de despacho
                                          </td>
                                        </tr>
                                      );
                                    }

                                    const net = calculateNetHours(asg.clockIn, asg.lunchStart, asg.lunchEnd, asg.clockOut);
                                    const lunchMin = calculateLunchDuration(asg.lunchStart, asg.lunchEnd);

                                    return (
                                      <tr key={iso} className="hover:bg-slate-800/40">
                                        <td className="py-2 px-2 font-medium text-slate-200">
                                          {DAY_NAMES_SHORT_ES[dayIdx]} {dateObj.getDate()}
                                        </td>
                                        <td className="py-2 px-2">
                                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                                            {asg.status}
                                          </span>
                                        </td>

                                        {isEditing ? (
                                          <>
                                            <td className="py-2 px-2">
                                              <input
                                                type="time"
                                                value={editPunches.clockIn}
                                                onChange={(e) => setEditPunches({ ...editPunches, clockIn: e.target.value })}
                                                className="bg-slate-800 border border-amber-400 rounded px-1 py-0.5 font-mono text-xs w-20 text-white"
                                              />
                                            </td>
                                            <td className="py-2 px-2">
                                              <input
                                                type="time"
                                                value={editPunches.lunchStart}
                                                onChange={(e) => setEditPunches({ ...editPunches, lunchStart: e.target.value })}
                                                className="bg-slate-800 border border-amber-400 rounded px-1 py-0.5 font-mono text-xs w-20 text-white"
                                              />
                                            </td>
                                            <td className="py-2 px-2">
                                              <input
                                                type="time"
                                                value={editPunches.lunchEnd}
                                                onChange={(e) => setEditPunches({ ...editPunches, lunchEnd: e.target.value })}
                                                className="bg-slate-800 border border-amber-400 rounded px-1 py-0.5 font-mono text-xs w-20 text-white"
                                              />
                                            </td>
                                            <td className="py-2 px-2 text-slate-400 font-mono">Auto</td>
                                            <td className="py-2 px-2">
                                              <input
                                                type="time"
                                                value={editPunches.clockOut}
                                                onChange={(e) => setEditPunches({ ...editPunches, clockOut: e.target.value })}
                                                className="bg-slate-800 border border-amber-400 rounded px-1 py-0.5 font-mono text-xs w-20 text-white"
                                              />
                                            </td>
                                            <td className="py-2 px-2 font-mono text-emerald-400 font-bold">Auto</td>
                                            <td className="py-2 px-2">
                                              <input
                                                type="text"
                                                value={editPunches.comment}
                                                onChange={(e) => setEditPunches({ ...editPunches, comment: e.target.value })}
                                                placeholder="Motivo de ajuste..."
                                                className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-white w-full"
                                              />
                                            </td>
                                            <td className="py-2 px-2 text-right">
                                              <button
                                                onClick={() => saveEditPunch(asg)}
                                                className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded text-[11px] font-bold"
                                              >
                                                Guardar
                                              </button>
                                            </td>
                                          </>
                                        ) : (
                                          <>
                                            <td className="py-2 px-2 font-mono text-slate-100">
                                              {asg.clockIn || '--:--'}
                                            </td>
                                            <td className="py-2 px-2 font-mono text-slate-300">
                                              {asg.lunchStart || '--:--'}
                                            </td>
                                            <td className="py-2 px-2 font-mono text-slate-300">
                                              {asg.lunchEnd || '--:--'}
                                            </td>
                                            <td className="py-2 px-2 font-mono">
                                              {lunchMin > 0 ? (
                                                <span
                                                  className={
                                                    lunchMin < 30 || lunchMin > 60
                                                      ? 'text-amber-400 font-bold'
                                                      : 'text-slate-400'
                                                  }
                                                >
                                                  {lunchMin} min
                                                </span>
                                              ) : (
                                                <span className="text-slate-600">-</span>
                                              )}
                                            </td>
                                            <td className="py-2 px-2 font-mono text-slate-100">
                                              {asg.clockOut || '--:--'}
                                            </td>
                                            <td className="py-2 px-2 font-mono font-bold text-emerald-400">
                                              {net.formatted}
                                            </td>
                                            <td className="py-2 px-2 text-slate-400 truncate max-w-[150px]">
                                              {asg.comment || '-'}
                                            </td>
                                            <td className="py-2 px-2 text-right">
                                              <button
                                                onClick={() => startEditPunch(asg)}
                                                className="p-1 text-slate-400 hover:text-amber-400 rounded transition-colors"
                                                title="Ajustar marcas (punches)"
                                              >
                                                <Edit2 className="w-3.5 h-3.5" />
                                              </button>
                                            </td>
                                          </>
                                        )}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
