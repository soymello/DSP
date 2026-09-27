import React, { useState } from 'react';
import { X, Settings, ShieldCheck, Download, Upload, Check } from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onExportBackup: () => void;
  onImportBackup: (jsonString: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onExportBackup,
  onImportBackup
}) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [jsonInput, setJsonInput] = useState('');
  const [showJsonInput, setShowJsonInput] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    onClose();
  };

  const handleImport = () => {
    if (!jsonInput.trim()) return;
    try {
      onImportBackup(jsonInput);
      setShowJsonInput(false);
      setJsonInput('');
      onClose();
    } catch {
      alert('Error: El formato JSON no es válido.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-lg w-full p-5 text-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-semibold text-base text-slate-100">Configuración del Sistema DSP</h3>
              <p className="text-xs text-slate-400">Parámetros operativos y alertas de compliance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* DSP Company & Station Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Nombre del DSP</label>
              <input
                type="text"
                value={formData.dspName}
                onChange={(e) => setFormData({ ...formData, dspName: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-amber-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Código de Estación</label>
              <input
                type="text"
                placeholder="Ej: DFL4, DMI1..."
                value={formData.stationCode}
                onChange={(e) => setFormData({ ...formData, stationCode: e.target.value.toUpperCase() })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-mono focus:border-amber-400 focus:outline-none uppercase"
              />
            </div>
          </div>

          {/* Operational Alerts & Compliance Rules */}
          <div className="pt-3 border-t border-slate-800">
            <h4 className="font-bold text-slate-200 mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Alertas Operativas y Compliance Automático</span>
            </h4>

            <div className="space-y-2.5">
              <label className="flex items-start gap-2.5 cursor-pointer bg-slate-800/60 p-2.5 rounded-lg border border-slate-800 hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={formData.alertMissingEquipment}
                  onChange={(e) => setFormData({ ...formData, alertMissingEquipment: e.target.checked })}
                  className="mt-0.5 rounded text-amber-500 focus:ring-amber-400"
                />
                <div>
                  <span className="font-semibold text-slate-200 block">Alerta de Equipamiento Incompleto</span>
                  <span className="text-[11px] text-slate-400">
                    Resalta en rojo/amarillo si a una Van asignada le falta registrar su Teléfono (Rabbit) o Batería (Powerbank).
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer bg-slate-800/60 p-2.5 rounded-lg border border-slate-800 hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={formData.alertLunchDelay}
                  onChange={(e) => setFormData({ ...formData, alertLunchDelay: e.target.checked })}
                  className="mt-0.5 rounded text-amber-500 focus:ring-amber-400"
                />
                <div>
                  <span className="font-semibold text-slate-200 block">Alerta de Almuerzo Tardío (&gt; 5 Horas)</span>
                  <span className="text-[11px] text-slate-400">
                    Advierte si transcurren más de 5 horas consecutivas de turno sin registro de inicio de Lunch.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer bg-slate-800/60 p-2.5 rounded-lg border border-slate-800 hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={formData.alertLunchDuration}
                  onChange={(e) => setFormData({ ...formData, alertLunchDuration: e.target.checked })}
                  className="mt-0.5 rounded text-amber-500 focus:ring-amber-400"
                />
                <div>
                  <span className="font-semibold text-slate-200 block">Control de Duración de Almuerzo</span>
                  <span className="text-[11px] text-slate-400">
                    Avisa si el tiempo de almuerzo es inferior a 30 minutos o excede los 60 minutos reglamentarios.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Backup / Export Section */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-200 block">Respaldo de Base de Datos</span>
              <span className="text-[11px] text-slate-400">Exporta o restaura todo el sistema en JSON</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onExportBackup}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Exportar JSON</span>
              </button>

              <button
                type="button"
                onClick={() => setShowJsonInput(!showJsonInput)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-blue-400" />
                <span>Importar JSON</span>
              </button>
            </div>
          </div>

          {showJsonInput && (
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder="Pega aquí el contenido JSON exportado..."
                rows={3}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs font-mono text-slate-200 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleImport}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-xs"
              >
                Aplicar Restauración
              </button>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
