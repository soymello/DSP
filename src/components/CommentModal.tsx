import React, { useState, useEffect } from 'react';
import { MessageSquare, Check, X, Trash2 } from 'lucide-react';

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (comment: string) => void;
  title: string;
  initialComment?: string;
  subtitle?: string;
}

export const CommentModal: React.FC<CommentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  title,
  initialComment = '',
  subtitle
}) => {
  const [text, setText] = useState(initialComment);

  useEffect(() => {
    setText(initialComment || '');
  }, [initialComment, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full p-5 text-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-semibold text-sm sm:text-base text-slate-100">{title}</h3>
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

        <div className="mt-4">
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Nota u observación operativa:
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="Ej: Inicia a las 11:00 AM, ruta rural de alto kilometraje, solicitó swap de vehículo..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all resize-none"
            autoFocus
          />
        </div>

        <div className="flex items-center justify-between mt-5 pt-3 border-t border-slate-800">
          {text.trim() ? (
            <button
              onClick={() => {
                onSave('');
                onClose();
              }}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Borrar nota
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                onSave(text.trim());
                onClose();
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              Guardar Nota
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
