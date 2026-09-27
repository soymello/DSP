import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Check,
  X,
  Trash2,
  Clock,
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';
import {
  PRESET_SCHEDULE_COMMENTS,
  ScheduleCommentOption
} from '../utils/scheduleComments';

interface DayCommentPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (comment: string, isWork: boolean) => void;
  title: string;
  subtitle?: string;
  initialComment?: string;
  customOptions?: ScheduleCommentOption[];
  onOpenManageOptions: () => void;
}

export const DayCommentPickerModal: React.FC<DayCommentPickerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  title,
  subtitle,
  initialComment = '',
  customOptions = PRESET_SCHEDULE_COMMENTS,
  onOpenManageOptions
}) => {
  const [selectedComment, setSelectedComment] = useState(initialComment);
  const [customText, setCustomText] = useState('');
  const [isWorkShift, setIsWorkShift] = useState(true);

  useEffect(() => {
    setSelectedComment(initialComment || '');
    // Check if initialComment matches any preset to initialize isWork
    const match = customOptions.find(
      (o) => o.label.toLowerCase() === (initialComment || '').toLowerCase()
    );
    if (match) {
      setIsWorkShift(match.isWork);
    }
  }, [initialComment, isOpen, customOptions]);

  if (!isOpen) return null;

  const handleSelectPreset = (opt: ScheduleCommentOption) => {
    setSelectedComment(opt.label);
    setIsWorkShift(opt.isWork);
    setCustomText('');
  };

  const handleConfirm = () => {
    const finalComment = customText.trim() || selectedComment.trim();
    if (!finalComment) {
      onSave('Off', false);
    } else {
      onSave(finalComment, isWorkShift);
    }
    onClose();
  };

  const handleClear = () => {
    onSave('Off', false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-lg w-full p-4 sm:p-5 text-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-100">{title}</h3>
              {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preset Comment Buttons */}
        <div className="mt-4">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Seleccionar Comentario del Día:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-56 overflow-y-auto pr-1">
            {customOptions.map((opt) => {
              const isSelected =
                selectedComment.toLowerCase() === opt.label.toLowerCase() && !customText;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectPreset(opt)}
                  className={`p-2 rounded-lg text-left border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-amber-400 bg-amber-500/20 shadow-xs ring-1 ring-amber-400'
                      : `${opt.colorClass}`
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold font-mono text-xs">{opt.label}</span>
                    {isSelected && <span className="text-amber-400 text-xs">✓</span>}
                  </div>
                  <span className="text-[10px] text-slate-300/80 truncate block mt-0.5">
                    {opt.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Or Type Custom text */}
        <div className="mt-3 pt-3 border-t border-slate-800">
          <label className="block text-xs font-medium text-slate-300 mb-1">
            O escribir comentario personalizado:
          </label>
          <input
            type="text"
            placeholder="Ej: 9:15 AM, Suspend Safety, 11:30 AM..."
            value={customText}
            onChange={(e) => {
              setCustomText(e.target.value);
              if (e.target.value) {
                setSelectedComment(e.target.value);
              }
            }}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
          />

          <div className="mt-2.5 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={isWorkShift}
                onChange={(e) => setIsWorkShift(e.target.checked)}
                className="rounded text-amber-500 focus:ring-amber-400"
              />
              <span className="text-slate-300">
                ¿Este comentario significa que <strong>TRABAJA</strong>?
              </span>
            </label>

            <button
              type="button"
              onClick={onOpenManageOptions}
              className="text-[11px] text-amber-400 hover:underline cursor-pointer"
            >
              Configurar comentarios...
            </button>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Marcar Off (Libre)
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Aplicar Comentario
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
