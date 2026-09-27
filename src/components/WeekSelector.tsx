import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Sparkles } from 'lucide-react';
import { formatWeekLabel, getMonday, MONTH_NAMES_ES, padZero, toIsoDate } from '../utils/dateUtils';

interface WeekSelectorProps {
  currentMonday: Date;
  onChangeMonday: (newMonday: Date) => void;
}

export const WeekSelector: React.FC<WeekSelectorProps> = ({ currentMonday, onChangeMonday }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 50-year horizon starting today (2026 to 2076) + previous 2 years for historical reference
  const baseYear = 2026;
  const minYear = 2024;
  const maxYear = 2076; // 50 years into the future

  const [selectedYear, setSelectedYear] = useState<number>(currentMonday.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonday.getMonth());

  // Keep internal picker synced with currentMonday
  useEffect(() => {
    setSelectedYear(currentMonday.getFullYear());
    setSelectedMonth(currentMonday.getMonth());
  }, [currentMonday]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handlePrevWeek = () => {
    const prev = new Date(currentMonday);
    prev.setDate(prev.getDate() - 7);
    onChangeMonday(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentMonday);
    next.setDate(next.getDate() + 7);
    onChangeMonday(next);
  };

  const handleGoToday = () => {
    // Current simulated today is 2026-09-24
    const today = new Date(2026, 8, 24);
    onChangeMonday(getMonday(today));
    setIsOpen(false);
  };

  const years: number[] = [];
  for (let y = minYear; y <= maxYear; y++) {
    years.push(y);
  }

  // Get weeks of selected month in selected year
  const getMonthWeeks = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const mondays: Date[] = [];
    const cur = getMonday(firstDay);

    while (cur <= lastDay || (cur.getMonth() === month && cur.getFullYear() === year)) {
      mondays.push(new Date(cur));
      cur.setDate(cur.getDate() + 7);
    }

    return mondays;
  };

  const monthWeeks = getMonthWeeks(selectedYear, selectedMonth);

  return (
    <div className="relative inline-flex items-center" ref={containerRef}>
      <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-0.5 shadow-sm text-sm">
        {/* Previous Week */}
        <button
          onClick={handlePrevWeek}
          title="Semana anterior"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Current Week Indicator & Dropdown Trigger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1 text-slate-100 hover:bg-slate-800 rounded font-medium transition-colors cursor-pointer"
        >
          <Calendar className="w-4 h-4 text-amber-400" />
          <span className="font-semibold tracking-wide text-xs sm:text-sm">
            {formatWeekLabel(currentMonday)}
          </span>
          <span className="hidden sm:inline-block text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono">
            {currentMonday.getFullYear()}
          </span>
        </button>

        {/* Next Week */}
        <button
          onClick={handleNextWeek}
          title="Semana siguiente"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Quick 'Hoy' button */}
        <button
          onClick={handleGoToday}
          className="ml-1 px-2.5 py-1 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded transition-colors shadow-sm"
        >
          Hoy
        </button>
      </div>

      {/* 50-Year Horizon Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-4 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Horizonte 50 Años (2026 - 2076)
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Year & Month pickers */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Año
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:border-amber-400 font-mono"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y} {y === 2026 ? '★ (Año Actual)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Mes
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:border-amber-400"
              >
                {MONTH_NAMES_ES.map((name, i) => (
                  <option key={i} value={i}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Date Direct Input */}
          <div className="mt-3 pt-3 border-t border-slate-800">
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              O seleccionar fecha exacta:
            </label>
            <input
              type="date"
              min="2024-01-01"
              max="2076-12-31"
              value={toIsoDate(currentMonday)}
              onChange={(e) => {
                if (e.target.value) {
                  const [y, m, d] = e.target.value.split('-').map(Number);
                  onChangeMonday(getMonday(new Date(y, m - 1, d)));
                  setIsOpen(false);
                }
              }}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Weeks list in chosen month */}
          <div className="mt-3">
            <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Semanas de {MONTH_NAMES_ES[selectedMonth]} {selectedYear}:
            </span>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {monthWeeks.map((mon, idx) => {
                const sunday = new Date(mon);
                sunday.setDate(mon.getDate() + 6);
                const isSelected = toIsoDate(mon) === toIsoDate(currentMonday);

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      onChangeMonday(mon);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span>
                      {padZero(mon.getDate())}/{padZero(mon.getMonth() + 1)} - {padZero(sunday.getDate())}/{padZero(sunday.getMonth() + 1)}
                    </span>
                    <span className={`text-[10px] ${isSelected ? 'text-slate-900' : 'text-slate-400'}`}>
                      {formatWeekLabel(mon).split(' ')[0]} {formatWeekLabel(mon).split(' ')[1]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
