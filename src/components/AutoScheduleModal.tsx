import React from 'react';
import { Sparkles, ArrowRight, Calendar, AlertCircle, Check, X } from 'lucide-react';
import { formatWeekLabel, getWeekDates, DAY_NAMES_ES } from '../utils/dateUtils';

interface AutoScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentMonday: Date;
  nextMonday: Date;
  workingDaysCountCurrentWeek: number;
  totalDriversCount: number;
}

export const AutoScheduleModal: React.FC<AutoScheduleModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentMonday,
  nextMonday,
  workingDaysCountCurrentWeek,
  totalDriversCount
}) => {
  if (!isOpen) return null;

  const currentLabel = formatWeekLabel(currentMonday);
  const nextLabel = formatWeekLabel(nextMonday);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-lg w-full p-4 sm:p-6 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 rounded-lg font-bold shadow-md shadow-amber-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">
                Schedule Automático (Próxima Semana)
              </h3>
              <p className="text-xs text-slate-400">
                Duplicación inteligente del patrón de turnos de trabajo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-3.5 text-xs">
          <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Semana Origen:</span>
              <span className="font-bold text-amber-300 font-mono">{currentLabel}</span>
            </div>
            <div className="flex items-center justify-center text-slate-500">
              <ArrowRight className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Semana Destino:</span>
              <span className="font-bold text-emerald-400 font-mono">{nextLabel}</span>
            </div>
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-200 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>¿Cómo funciona el Schedule Automático?</span>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-amber-300/90">
              <li>
                Copia los <strong>días de trabajo y turnos</strong> (ej: <code>9:15 AM</code>, <code>8:45 AM</code>, <code>Rescue</code>, etc.) de cada conductor exactamente en los mismos días de la próxima semana.
              </li>
              <li>
                Las incidencias puntuales como <strong>Call Out</strong> o <strong>Suspend Safety</strong> se limpian y se programan con su horario de trabajo normal para la nueva semana, permitiéndote hacer ajustes manuales según sea necesario.
              </li>
              <li>
                Los días libres (<code>Off</code>) se mantienen igual en la nueva semana.
              </li>
            </ul>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>Conductores en planilla: <strong className="text-white">{totalDriversCount}</strong></span>
            <span>Turnos a replicar: <strong className="text-emerald-400">{workingDaysCountCurrentWeek} turnos</strong></span>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2.5 mt-5 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-all shadow-md shadow-amber-500/20 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Generar Schedule Automático</span>
          </button>
        </div>
      </div>
    </div>
  );
};
