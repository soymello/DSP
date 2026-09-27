import React from 'react';
import { X, Printer, Download, Clock, ShieldCheck } from 'lucide-react';
import { DailyAssignment, Driver } from '../types';
import { calculateNetHours, DAY_NAMES_ES } from '../utils/dateUtils';
import { exportLunchReportToExcel } from '../utils/excelExport';

interface LunchPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateIso: string;
  assignments: DailyAssignment[];
  drivers: Driver[];
  dspName: string;
  stationCode: string;
}

export const LunchPrintModal: React.FC<LunchPrintModalProps> = ({
  isOpen,
  onClose,
  dateIso,
  assignments,
  drivers,
  dspName,
  stationCode
}) => {
  if (!isOpen) return null;

  const driverMap = new Map(drivers.map(d => [d.id, d]));
  const dateObj = new Date(dateIso + 'T12:00:00');
  const dateFormatted = `${DAY_NAMES_ES[(dateObj.getDay() + 6) % 7]} ${dateObj.getDate()} de ${dateObj.toLocaleString('es-ES', { month: 'long' })} de ${dateObj.getFullYear()}`;

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    exportLunchReportToExcel(dateIso, assignments, drivers, dspName);
  };

  // Only active assignments or non-callouts first
  const activeAssignments = [...assignments].sort((a, b) => {
    const nameA = driverMap.get(a.driverId)?.name || '';
    const nameB = driverMap.get(b.driverId)?.name || '';
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col text-slate-100 my-auto">
        {/* Modal Top Bar (Hidden when printing) */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60 print:hidden">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/30">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-100">
                Hoja de Verificación de Horas y Lunch para Conductores
              </h2>
              <p className="text-xs text-slate-400">
                Imprime o exporta a Excel para entregar al equipo durante el almuerzo para que registren sus horas en ADP / Paycom.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow-sm"
              title="Descargar archivo Excel .xlsx"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar Excel (.xlsx)
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors shadow-sm"
              title="Imprimir hoja física o Guardar PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir Documento
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/40">
          <div className="bg-white text-slate-900 rounded-lg p-6 sm:p-8 shadow-md max-w-4xl mx-auto print:shadow-none print:p-0 print:m-0 print:max-w-none text-xs">
            {/* DSP Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-lg tracking-tight uppercase text-slate-900">
                    {dspName}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-900 text-white font-mono text-[10px] font-bold rounded">
                    {stationCode || 'DELIVERY STATION'}
                  </span>
                </div>
                <h1 className="text-base font-bold text-slate-800 mt-0.5">
                  REPORTE DE ASIGNACIÓN & REGISTRO DE HORAS / LUNCH
                </h1>
                <p className="text-slate-600 text-[11px]">
                  Fecha Operativa: <strong className="text-slate-900">{dateFormatted}</strong> | Total Asignados:{' '}
                  <strong className="text-slate-900">{activeAssignments.length}</strong>
                </p>
              </div>

              <div className="text-right text-[10px] text-slate-500">
                <p>Generado: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                <div className="flex items-center gap-1 text-slate-700 font-medium justify-end mt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Amazon DSP Compliance</span>
                </div>
              </div>
            </div>

            {/* Instruction Banner */}
            <div className="mb-4 bg-amber-50 border border-amber-300 rounded p-2 text-[11px] text-amber-900 flex items-center justify-between">
              <span>
                <strong>Aviso a los conductores:</strong> Verifique sus horas de entrada (Clock In), almuerzo (Lunch Start / End) y salida. Copie estos datos con precisión en su app de nómina antes de culminar el turno.
              </span>
            </div>

            {/* Printable Table */}
            <div className="overflow-x-auto border border-slate-300 rounded">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-2 border-r border-slate-300 text-center w-8">#</th>
                    <th className="p-2 border-r border-slate-300">Conductor</th>
                    <th className="p-2 border-r border-slate-300 text-center">Rol</th>
                    <th className="p-2 border-r border-slate-300 text-center">Van #</th>
                    <th className="p-2 border-r border-slate-300 text-center">Teléfono</th>
                    <th className="p-2 border-r border-slate-300 text-center">Powerbank</th>
                    <th className="p-2 border-r border-slate-300 text-center font-bold">Clock In</th>
                    <th className="p-2 border-r border-slate-300 text-center">Lunch In</th>
                    <th className="p-2 border-r border-slate-300 text-center">Lunch Out</th>
                    <th className="p-2 border-r border-slate-300 text-center">Clock Out</th>
                    <th className="p-2 border-r border-slate-300 text-center font-bold">Net Hrs</th>
                    <th className="p-2 border-r border-slate-300">Notas / Ruta</th>
                    <th className="p-2 text-center w-28">Firma / OK</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {activeAssignments.map((asg, index) => {
                    const drv = driverMap.get(asg.driverId);
                    const net = calculateNetHours(asg.clockIn, asg.lunchStart, asg.lunchEnd, asg.clockOut);
                    const isCallOut = asg.status === 'Call Out';

                    return (
                      <tr
                        key={asg.id}
                        className={isCallOut ? 'bg-red-50 text-red-900' : index % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}
                      >
                        <td className="p-2 border-r border-slate-200 text-center font-mono text-slate-500">
                          {index + 1}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-semibold text-slate-900 whitespace-nowrap">
                          {drv ? drv.name : 'Conductor'}
                          {drv?.phone && <span className="block text-[9px] text-slate-500 font-normal">{drv.phone}</span>}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              asg.status === 'RQ'
                                ? 'bg-blue-100 text-blue-800'
                                : asg.status === 'Flex'
                                ? 'bg-purple-100 text-purple-800'
                                : asg.status === 'Rescue'
                                ? 'bg-amber-100 text-amber-800'
                                : asg.status === 'Call Out'
                                ? 'bg-red-200 text-red-800'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {asg.status}
                          </span>
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center font-medium">
                          {asg.vanNumber || '-'}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center text-slate-700">
                          {asg.deviceNumber || '-'}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center text-slate-700">
                          {asg.batteryNumber || '-'}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-900 font-mono">
                          {asg.clockIn || '--:--'}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center font-mono text-slate-700">
                          {asg.lunchStart || '--:--'}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center font-mono text-slate-700">
                          {asg.lunchEnd || '--:--'}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center font-mono text-slate-700">
                          {asg.clockOut || '--:--'}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center font-bold text-emerald-800 font-mono">
                          {net.formatted}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-[10px] text-slate-600 max-w-[140px] truncate">
                          {asg.routeCode ? `[${asg.routeCode}] ` : ''}
                          {asg.comment || ''}
                        </td>
                        <td className="p-2 text-center text-[10px] text-slate-400">
                          ________________
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer with sign off and guidelines */}
            <div className="mt-5 pt-3 border-t border-slate-300 grid grid-cols-2 gap-4 text-[10px] text-slate-500">
              <div>
                <p className="font-semibold text-slate-700 mb-1">Políticas Operativas de Almuerzo:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>El descanso de almuerzo no remunerado obligatorio es de mínimo 30 minutos continuos.</li>
                  <li>Debe tomarse antes de cumplir la 5ta hora consecutiva de trabajo según normativas.</li>
                  <li>Notifique a Dispatch antes de pausar su ruta para Lunch.</li>
                </ul>
              </div>
              <div className="flex flex-col justify-end text-right">
                <p className="text-slate-700 font-medium">Supervisor de Despacho:</p>
                <p className="border-b border-slate-400 w-48 ml-auto my-1.5"></p>
                <p className="text-[9px] text-slate-500">Firma / Aprobación de Despacho</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Bar */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400 print:hidden">
          <span>Consejo: Presiona <strong>Imprimir Documento</strong> para enviar directo a tu impresora de dispatch o exportar PDF.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
