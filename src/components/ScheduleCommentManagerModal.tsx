import React, { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  Check,
  X,
  Palette,
  Sparkles,
  MapPin,
  Clock,
  ShieldAlert,
  RotateCcw
} from 'lucide-react';
import {
  COMMENT_COLOR_THEMES,
  PRESET_SCHEDULE_COMMENTS,
  ScheduleCommentOption
} from '../utils/scheduleComments';

interface ScheduleCommentManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: ScheduleCommentOption[];
  onAddCustomOption: (newOption: ScheduleCommentOption) => void;
  onDeleteOption: (id: string) => void;
  onResetDefaults?: () => void;
  selectedActiveCommentId?: string;
  onSelectActiveCommentForQuickApply?: (option: ScheduleCommentOption) => void;
}

export const ScheduleCommentManagerModal: React.FC<ScheduleCommentManagerModalProps> = ({
  isOpen,
  onClose,
  options,
  onAddCustomOption,
  onDeleteOption,
  onResetDefaults,
  selectedActiveCommentId,
  onSelectActiveCommentForQuickApply
}) => {
  const [newLabel, setNewLabel] = useState('');
  const [newIsWork, setNewIsWork] = useState(true);
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<'work' | 'absence' | 'safety' | 'off'>('work');
  const [selectedColorId, setSelectedColorId] = useState<string>('emerald');
  const [newStationCode, setNewStationCode] = useState('');

  if (!isOpen) return null;

  const currentColorTheme =
    COMMENT_COLOR_THEMES.find((c) => c.id === selectedColorId) || COMMENT_COLOR_THEMES[0];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    // Use selected color theme or fallback
    const theme =
      COMMENT_COLOR_THEMES.find((c) => c.id === selectedColorId) || COMMENT_COLOR_THEMES[0];

    const labelWithStation = newStationCode.trim()
      ? `[${newStationCode.trim().toUpperCase()}] ${newLabel.trim()}`
      : newLabel.trim();

    const newOpt: ScheduleCommentOption = {
      id: `custom-${Date.now()}`,
      label: labelWithStation,
      isWork: newIsWork,
      category: newCategory,
      colorId: theme.id,
      colorClass: theme.colorClass,
      badgeClass: theme.badgeClass,
      description:
        newDescription.trim() ||
        (newIsWork
          ? `Turno Operativo ${newStationCode ? `(${newStationCode.toUpperCase()})` : ''}`
          : 'Ausencia / No trabaja'),
      stationCode: newStationCode.trim() ? newStationCode.trim().toUpperCase() : undefined
    };

    onAddCustomOption(newOpt);
    setNewLabel('');
    setNewDescription('');
    setNewStationCode('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-2xl w-full p-4 sm:p-6 text-slate-100 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 rounded-lg font-bold shadow-md shadow-amber-500/20">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">
                Gestión y Colores de Comentarios de Turno
              </h3>
              <p className="text-xs text-slate-400">
                Añade o elimina comentarios y personaliza colores específicos para diferenciar turnos de trabajo y estaciones (DFL4, DMI1, etc.)
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

        {/* Existing Options List with Delete Buttons */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Comentarios Configurados ({options.length})
            </h4>
            <div className="flex items-center gap-2">
              {onResetDefaults && (
                <button
                  type="button"
                  onClick={onResetDefaults}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                  title="Restablecer comentarios y colores de fábrica"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restablecer</span>
                </button>
              )}
              <span className="text-[11px] text-slate-400">
                Haz clic en la papelera para eliminar
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
            {options.map((opt) => {
              const isSelected = selectedActiveCommentId === opt.id;
              const theme = COMMENT_COLOR_THEMES.find((c) => c.id === opt.colorId);

              return (
                <div
                  key={opt.id}
                  onClick={() => onSelectActiveCommentForQuickApply?.(opt)}
                  className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500 shadow-xs'
                      : 'bg-slate-800/80 border-slate-700/80 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Visual Color Tag Button preview */}
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold font-mono shrink-0 border ${opt.colorClass}`}
                    >
                      {opt.label}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-200 truncate">
                          {opt.description}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold ${
                          opt.isWork ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      >
                        {opt.isWork ? '✓ TRABAJA' : '✗ No trabaja'}
                        {opt.stationCode && ` • Estación: ${opt.stationCode}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Delete button: allows deleting any comment or custom comment */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (options.length <= 1) {
                          alert('Debe quedar al menos un comentario configurado.');
                          return;
                        }
                        onDeleteOption(opt.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer"
                      title={`Eliminar comentario "${opt.label}"`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-[10px]">
                        ✓
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form: Add New Comment with Color Palette */}
        {/* "O sea, que haya añadir y eliminar comentarios y aparte de toda la información se le pueda poner algún color específico al comentario para diferenciar los días de trabajo y las estaciones." */}
        <div className="mt-4 pt-4 border-t border-slate-800">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Añadir Nuevo Comentario con Color Específico</span>
          </h4>

          <form
            onSubmit={handleCreate}
            className="space-y-3 text-xs bg-slate-950/70 p-3.5 rounded-lg border border-slate-800"
          >
            {/* Input row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="block text-slate-300 font-semibold mb-1">
                  Texto del Comentario (Etiqueta en el botón) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 9:15 AM, DFL4 Onda 2, Suspend Safety..."
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-mono font-bold focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-amber-400" />
                  <span>Estación (Opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: DFL4, DMI1"
                  value={newStationCode}
                  onChange={(e) => setNewStationCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-mono uppercase focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Description & Work Checkbox */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Descripción u Observación
                </label>
                <input
                  type="text"
                  placeholder="Ej: Turno para estación norte, ruta pesada..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="pt-4">
                <label className="flex items-center gap-2 cursor-pointer bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 w-full hover:border-slate-600">
                  <input
                    type="checkbox"
                    checked={newIsWork}
                    onChange={(e) => setNewIsWork(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-400"
                  />
                  <span className="font-semibold text-slate-200">
                    ¿Este comentario significa que <strong>TRABAJA</strong>?
                  </span>
                </label>
              </div>
            </div>

            {/* Color Palette Selector */}
            {/* "se le pueda poner algún color específico al comentario para diferenciar los días de trabajo y las estaciones" */}
            <div className="pt-2">
              <label className="block text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-amber-400" />
                  <span>Color Específico del Comentario (Días y Estaciones):</span>
                </span>
                <span className="text-[11px] text-amber-300 font-medium">
                  {currentColorTheme.name}
                </span>
              </label>

              {/* Color swatches */}
              <div className="grid grid-cols-6 sm:grid-cols-13 gap-1.5 p-2 bg-slate-900 rounded-lg border border-slate-800">
                {COMMENT_COLOR_THEMES.map((theme) => {
                  const isThemeSelected = selectedColorId === theme.id;

                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setSelectedColorId(theme.id)}
                      className={`h-7 rounded-md transition-all flex items-center justify-center border cursor-pointer relative ${
                        isThemeSelected
                          ? 'ring-2 ring-white scale-110 shadow-md'
                          : 'opacity-80 hover:opacity-100 hover:scale-105'
                      }`}
                      style={{
                        backgroundColor: theme.dotColor,
                        borderColor: isThemeSelected ? '#ffffff' : 'transparent'
                      }}
                      title={theme.name}
                    >
                      {isThemeSelected && <Check className="w-3.5 h-3.5 text-slate-950 font-bold" />}
                    </button>
                  );
                })}
              </div>

              {/* Live Preview */}
              <div className="mt-2 flex items-center gap-2 p-2 bg-slate-900/60 rounded border border-slate-800">
                <span className="text-[11px] text-slate-400 font-medium">Vista Previa:</span>
                <span
                  className={`px-2.5 py-1 rounded text-xs font-bold font-mono border ${currentColorTheme.colorClass}`}
                >
                  {newStationCode ? `[${newStationCode}] ` : ''}
                  {newLabel.trim() || 'Ejemplo 9:15 AM'}
                </span>
                <span className="text-[10px] text-slate-400 ml-auto">
                  {newIsWork ? 'Suma a conductores activos' : 'Registra como ausencia/off'}
                </span>
              </div>
            </div>

            {/* Submit button */}
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Guardar Comentario</span>
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end mt-4 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg transition-colors text-xs cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
