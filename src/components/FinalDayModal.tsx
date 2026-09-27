import React from 'react';
import { X, FileText, Download, Printer, CheckCircle2, Package, Truck, Clock } from 'lucide-react';
import { DailyAssignment, Driver } from '../types';
import { calculateNetHours, DAY_NAMES_ES } from '../utils/dateUtils';
import { exportFinalDayPdf } from '../utils/pdfExport';
import { exportLunchReportToExcel } from '../utils/excelExport';

interface FinalDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateIso: string;
  assignments: DailyAssignment[];
  drivers: Driver[];
  dspName: string;
  stationCode: string;
  metrics?: {
    totalAssigned: number;
    activeDrivers: number;
    rqCount: number;
    flexCount: number;
    rescueCount: number;
    extraTruckCount: number;
    callOuts: number;
    totalPackages: number;
    cxPackages: number;
    flexPackages: number;
    spr: number;
    sprCx: number;
    sprFlex: number;
  };
}

export const FinalDayModal: React.FC<FinalDayModalProps> = ({
  isOpen,
  onClose,
  dateIso,
  assignments,
  drivers,
  dspName,
  stationCode,
  metrics
}) => {
  if (!isOpen) return null;

  const driverMap = new Map(drivers.map((d) => [d.id, d]));
  const dateObj = new Date(dateIso + 'T12:00:00');
  const dayName = DAY_NAMES_ES[(dateObj.getDay() + 6) % 7] || '';
  const dateFormatted = `${dayName} ${dateObj.getDate()} de ${dateObj.toLocaleString('es-ES', { month: 'long' })} de ${dateObj.getFullYear()}`;

  const handleDownloadPdf = () => {
    exportFinalDayPdf({
      dateIso,
      assignments,
      drivers,
      dspName,
      stationCode,
      metrics
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    exportLunchReportToExcel(dateIso, assignments, drivers, dspName);
  };

  const sortedAssignments = [...assignments].sort((a, b) => {
    const nameA = driverMap.get(a.driverId)?.name || '';
    const nameB = driverMap.get(b.driverId)?.name || '';
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[94vh] flex flex-col text-slate-100 my-auto">
        {/* Modal Header (Hidden on print) */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/80 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 rounded-xl font-bold shadow-md shadow-amber-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <span>Final del Día • Reporte Completo de Truck Assignment</span>
                <span className="text-[11px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                  PDF Oficial
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Guarda toda la información de operaciones del día: conductores, rutas, equipamiento y registro horario en PDF.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl transition-colors cursor-pointer"
              title="Descargar también respaldo en Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-colors cursor-pointer"
              title="Imprimir documento físico"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl shadow-md shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
              title="Descargar archivo PDF completo para guardar en tu base de datos personal"
            >
              <Download className="w-4 h-4" />
              <span>Descargar PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable & Visible Paper Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/60">
          <div className="bg-white text-slate-900 rounded-xl p-6 sm:p-8 shadow-xl max-w-5xl mx-auto print:shadow-none print:p-0 print:m-0 print:max-w-none text-xs">
            {/* Header Document */}
            <div className="border-b-2 border-slate-900 pb-3 mb-4">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-xl font-black uppercase tracking-tight text-slate-950">
                    {dspName}
                  </h1>
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Reporte de Cierre Operativo • Final del Día (Truck Assignment)
                  </p>
                </div>
                <div className="text-right">
                  <div className="inline-block bg-slate-900 text-white font-mono font-bold text-xs px-2.5 py-1 rounded">
                    {stationCode || 'DFL4'}
                  </div>
                  <p className="text-[11px] font-mono text-slate-500 mt-1">
                    Fecha ISO: <strong>{dateIso}</strong>
                  </p>
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-700">
                <div>
                  Día y Fecha: <strong className="text-slate-900 capitalize">{dateFormatted}</strong>
                </div>
                <div>
                  Total Asignados: <strong className="text-slate-900 font-mono">{assignments.length}</strong>
                </div>
              </div>
            </div>

            {/* Operational Summary Strip */}
            {metrics && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 text-[11px]">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-800 font-medium">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Conductores Activos:</span>
                    <strong className="text-slate-900 font-mono text-xs">{metrics.activeDrivers}</strong>
                    <span className="text-slate-400 text-[9.5px] ml-1">({metrics.callOuts} call-outs)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Rutas CX / Rutas Flex:</span>
                    <strong className="text-blue-700 font-mono text-xs">{metrics.rqCount} CX</strong>
                    <span className="text-slate-400 text-[10px] mx-1">•</span>
                    <strong className="text-purple-700 font-mono text-xs">{metrics.flexCount} Flex</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Paquetes del Día:</span>
                    <strong className="text-slate-900 font-mono text-xs">
                      {metrics.totalPackages > 0 ? metrics.totalPackages.toLocaleString() : '--'}
                    </strong>
                    <span className="text-slate-500 text-[9.5px] block font-mono">
                      (CX: {metrics.cxPackages} • Flex: {metrics.flexPackages})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">SPR Promedio:</span>
                    <strong className="text-amber-700 font-mono text-xs">
                      {metrics.spr > 0 ? `${metrics.spr} paq/ruta` : '--'}
                    </strong>
                    <span className="text-slate-500 text-[9.5px] block font-mono">
                      (CX: {metrics.sprCx} • Flex: {metrics.sprFlex})
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Full Table */}
            <div className="overflow-x-auto border border-slate-300 rounded-lg">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wider">
                    <th className="py-2 px-2 border-r border-slate-700 text-center w-8">#</th>
                    <th className="py-2 px-3 border-r border-slate-700">Conductor</th>
                    <th className="py-2 px-2 border-r border-slate-700 text-center">Comentario</th>
                    <th className="py-2 px-2 border-r border-slate-700 text-center">Ruta</th>
                    <th className="py-2 px-2 border-r border-slate-700 text-center">Van</th>
                    <th className="py-2 px-2 border-r border-slate-700 text-center">Dispositivo</th>
                    <th className="py-2 px-2 border-r border-slate-700 text-center">Powerbank</th>
                    <th className="py-2 px-2 border-r border-slate-700 text-center">Clock In</th>
                    <th className="py-2 px-2 border-r border-slate-700 text-center">Lunch In</th>
                    <th className="py-2 px-2 border-r border-slate-700 text-center">Lunch Out</th>
                    <th className="py-2 px-2 border-r border-slate-700 text-center">Clock Out</th>
                    <th className="py-2 px-2 text-center bg-slate-950 text-emerald-300">Netas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sortedAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-6 text-center text-slate-500 italic">
                        No hay asignaciones registradas para esta fecha.
                      </td>
                    </tr>
                  ) : (
                    sortedAssignments.map((asg, idx) => {
                      const driver = driverMap.get(asg.driverId);
                      const net = calculateNetHours(asg.clockIn, asg.lunchStart, asg.lunchEnd, asg.clockOut);
                      const isCallOut = asg.status === 'Call Out';

                      return (
                        <tr
                          key={asg.id}
                          className={`${
                            isCallOut ? 'bg-red-50 text-red-900' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                          } hover:bg-amber-50/50 transition-colors`}
                        >
                          <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono text-[10px] text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="py-1.5 px-3 border-r border-slate-200 font-bold text-slate-900">
                            {driver?.name || 'Conductor'}
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono font-semibold text-slate-700">
                            {asg.comment ? (
                              <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-[10px]">
                                {asg.comment}
                              </span>
                            ) : (
                              '--'
                            )}
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono font-bold text-amber-700">
                            {asg.routeCode || '--'}
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono">
                            {asg.vanNumber || '--'}
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono">
                            {asg.deviceNumber || '--'}
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono">
                            {asg.batteryNumber || '--'}
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono">
                            {asg.clockIn || '--'}
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono">
                            {asg.lunchStart || '--'}
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono">
                            {asg.lunchEnd || '--'}
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono">
                            {asg.clockOut || '--'}
                          </td>
                          <td className="py-1.5 px-2 text-center font-mono font-bold text-emerald-700 bg-emerald-50/50">
                            {net.formatted || '--'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Document Footer */}
            <div className="mt-5 pt-3 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <div>
                Reporte Oficial de Cierre Diario • Guardado en PDF para Base de Datos
              </div>
              <div>
                DSP {dspName} • {stationCode}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
