import React from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  Scissors,
  Truck,
  Clock,
  Layers,
  Settings,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { WeekSelector } from './WeekSelector';

export type MainTab = 'dashboard' | 'schedule' | 'cortes' | 'truck-assignment' | 'timesheet' | 'fleet-inventory';

interface NavbarProps {
  activeTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  currentMonday: Date;
  onChangeMonday: (newMonday: Date) => void;
  dspName: string;
  stationCode: string;
  onOpenSettings: () => void;
  onResetData: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  currentMonday,
  onChangeMonday,
  dspName,
  stationCode,
  onOpenSettings,
  onResetData
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 text-slate-100 shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        {/* Top Header Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between py-2.5 gap-2.5 border-b border-slate-900">
          {/* Logo & DSP Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 font-black text-sm shadow-md shadow-amber-500/20">
              DSP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-sm sm:text-base text-white">
                  {dspName}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {stationCode}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Amazon Delivery Service Partner • Sistema de Operaciones Diarias
              </p>
            </div>
          </div>

          {/* Week Selector with 50-Year Horizon & Secondary Actions */}
          <div className="flex items-center justify-between sm:justify-end gap-2">
            <WeekSelector
              currentMonday={currentMonday}
              onChangeMonday={onChangeMonday}
            />

            <div className="flex items-center gap-1">
              <button
                onClick={onResetData}
                title="Restaurar datos de prueba iniciales"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={onOpenSettings}
                title="Configuración de estación y alertas"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 sm:space-x-2 py-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => onTabChange('dashboard')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => onTabChange('schedule')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'schedule'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Schedule</span>
          </button>

          <button
            onClick={() => onTabChange('cortes')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'cortes'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Scissors className="w-4 h-4" />
            <span>Cortex</span>
          </button>

          <button
            onClick={() => onTabChange('truck-assignment')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'truck-assignment'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Truck assignment</span>
          </button>

          <button
            onClick={() => onTabChange('timesheet')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'timesheet'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Timesheet</span>
          </button>

          <button
            onClick={() => onTabChange('fleet-inventory')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'fleet-inventory'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Gestión</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
