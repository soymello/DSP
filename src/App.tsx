import React, { useState, useEffect, useMemo } from 'react';
import {
  AppSettings,
  AssignmentStatus,
  Battery,
  DailyAssignment,
  DayCorteConfig,
  DaySchedule,
  Device,
  Driver,
  DriverCorte,
  ScheduleStatus,
  Vehicle
} from './types';
import {
  generateInitialAssignments,
  generateInitialSchedule,
  INITIAL_BATTERIES,
  INITIAL_DEVICES,
  INITIAL_DRIVERS,
  INITIAL_VEHICLES
} from './utils/initialData';
import { getMonday, getWeekDates, toIsoDate, formatWeekLabel } from './utils/dateUtils';
import { isWorkingShift } from './utils/scheduleComments';
import { MainTab, Navbar } from './components/Navbar';
import { DashboardModule } from './components/DashboardModule';
import { ScheduleModule } from './components/ScheduleModule';
import { CortesModule } from './components/CortesModule';
import { TruckAssignmentModule } from './components/TruckAssignmentModule';
import { TimesheetModule } from './components/TimesheetModule';
import { FleetInventoryModule } from './components/FleetInventoryModule';
import { SettingsModal } from './components/SettingsModal';

const STORAGE_KEYS = {
  DRIVERS: 'dsp_ops_drivers_v2',
  VEHICLES: 'dsp_ops_vehicles_v1',
  DEVICES: 'dsp_ops_devices_v1',
  BATTERIES: 'dsp_ops_batteries_v1',
  SCHEDULE: 'dsp_ops_schedule_v2',
  CORTES: 'dsp_ops_cortes_v2',
  ASSIGNMENTS: 'dsp_ops_assignments_v2',
  PACKAGES: 'dsp_ops_packages_v1',
  SETTINGS: 'dsp_ops_settings_v1'
};

const DEFAULT_SETTINGS: AppSettings = {
  dspName: 'Amazon DSP Apex Logistics',
  stationCode: 'DFL4',
  alertMissingEquipment: true,
  alertLunchDelay: true,
  alertLunchDuration: true
};

export default function App() {
  // Reference date: Sep 24, 2026 (local context date)
  const [currentMonday, setCurrentMonday] = useState<Date>(() => {
    return getMonday(new Date(2026, 8, 24));
  });

  const [selectedDateIso, setSelectedDateIso] = useState<string>('2026-09-24');
  const [activeTab, setActiveTab] = useState<MainTab>('fleet-inventory');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // App Settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  // Drivers (Base de datos limpia)
  const [drivers, setDrivers] = useState<Driver[]>(() => {
    try {
      localStorage.removeItem('dsp_ops_drivers_v1');
      localStorage.removeItem('dsp_ops_schedule_v1');
      localStorage.removeItem('dsp_ops_assignments_v1');
      localStorage.removeItem('dsp_ops_cortes_v1');
    } catch {
      // ignore
    }

    const saved = localStorage.getItem(STORAGE_KEYS.DRIVERS);
    if (saved) {
      try {
        const parsed: Driver[] = JSON.parse(saved);
        const hasMock = parsed.some(d => d.id.startsWith('drv-0') || d.id.startsWith('drv-1'));
        if (hasMock) {
          localStorage.removeItem(STORAGE_KEYS.DRIVERS);
          return [];
        }
        return parsed;
      } catch {
        return [];
      }
    }
    return [];
  });

  // Vehicles
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.VEHICLES);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_VEHICLES;
      }
    }
    return INITIAL_VEHICLES;
  });

  // Devices
  const [devices, setDevices] = useState<Device[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DEVICES);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_DEVICES;
      }
    }
    return INITIAL_DEVICES;
  });

  // Batteries
  const [batteries, setBatteries] = useState<Battery[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BATTERIES);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_BATTERIES;
      }
    }
    return INITIAL_BATTERIES;
  });

  // Weekly Schedule (Limpio)
  const [schedule, setSchedule] = useState<DaySchedule[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SCHEDULE);
    if (saved) {
      try {
        const parsed: DaySchedule[] = JSON.parse(saved);
        const hasMock = parsed.some(s => s.driverId.startsWith('drv-0') || s.driverId.startsWith('drv-1'));
        if (hasMock) {
          localStorage.removeItem(STORAGE_KEYS.SCHEDULE);
          return [];
        }
        return parsed;
      } catch {
        return [];
      }
    }
    return [];
  });

  // Daily Assignments (Limpio)
  const [assignments, setAssignments] = useState<DailyAssignment[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS);
    if (saved) {
      try {
        const parsed: DailyAssignment[] = JSON.parse(saved);
        const hasMock = parsed.some(a => a.driverId.startsWith('drv-0') || a.driverId.startsWith('drv-1'));
        if (hasMock) {
          localStorage.removeItem(STORAGE_KEYS.ASSIGNMENTS);
          return [];
        }
        return parsed;
      } catch {
        return [];
      }
    }
    return [];
  });

  // Packages per date: store { cx: number; flex: number; total: number } or number (starts completely clean)
  const [packagesMap, setPackagesMap] = useState<{ [date: string]: any }>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PACKAGES);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {};
  });

  // Cortes de Rutas (Corte / Balance diario)
  const [cortesMap, setCortesMap] = useState<{ [dateIso: string]: DayCorteConfig }>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CORTES);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {};
  });

  // Auto-save to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DRIVERS, JSON.stringify(drivers));
  }, [drivers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(vehicles));
  }, [vehicles]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DEVICES, JSON.stringify(devices));
  }, [devices]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BATTERIES, JSON.stringify(batteries));
  }, [batteries]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(schedule));
  }, [schedule]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CORTES, JSON.stringify(cortesMap));
  }, [cortesMap]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(assignments));
  }, [assignments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PACKAGES, JSON.stringify(packagesMap));
  }, [packagesMap]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  // Show quick toast notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Schedule Update Handler with Sincronización Automática:
  // "Sincronización Automática: Marcar a un conductor como 'Trabaja' lo envía automáticamente a la lista activa del módulo Truck Assignment de esa fecha."
  const handleUpdateDaySchedule = (
    driverId: string,
    date: string,
    status: ScheduleStatus,
    comment?: string
  ) => {
    setSchedule((prev) => {
      const idx = prev.findIndex((s) => s.driverId === driverId && s.date === date);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], status, comment };
        return copy;
      }
      return [...prev, { driverId, date, status, comment }];
    });

    // Auto-sync into daily assignments
    setAssignments((prev) => {
      const existingIdx = prev.findIndex((a) => a.driverId === driverId && a.date === date);
      const isWorking = status === 'Trabaja';
      const isCallOut = status === 'Call-Out' || (comment && comment.toLowerCase().includes('call out'));

      if (isWorking) {
        if (existingIdx >= 0) {
          // Reactivate if it was Call Out
          const copy = [...prev];
          copy[existingIdx] = {
            ...copy[existingIdx],
            status: copy[existingIdx].status === 'Call Out' ? 'RQ' : copy[existingIdx].status,
            comment: comment || copy[existingIdx].comment
          };
          return copy;
        } else {
          const newAsg: DailyAssignment = {
            id: `asg-${date}-${driverId}`,
            date,
            driverId,
            vanNumber: '',
            deviceNumber: '',
            batteryNumber: '',
            status: 'RQ',
            clockIn: '',
            lunchStart: '',
            lunchEnd: '',
            clockOut: '',
            comment: comment || '9:15 AM'
          };
          return [...prev, newAsg];
        }
      } else if (isCallOut) {
        if (existingIdx >= 0) {
          const copy = [...prev];
          copy[existingIdx] = {
            ...copy[existingIdx],
            status: 'Call Out',
            comment: comment || 'Call-Out reportado en schedule'
          };
          return copy;
        } else {
          return [
            ...prev,
            {
              id: `asg-${date}-${driverId}`,
              date,
              driverId,
              vanNumber: '',
              deviceNumber: '',
              batteryNumber: '',
              status: 'Call Out',
              clockIn: '',
              lunchStart: '',
              lunchEnd: '',
              clockOut: '',
              comment: comment || 'Call-Out reportado en schedule'
            }
          ];
        }
      } else {
        // Off, Suspend Safety, No Call No Show:
        // "Si no hay drivers en schedule para ese trabajo, no pueden aparecer en el truck assignment."
        // Remover de assignments para mantener sincronización estricta
        if (existingIdx >= 0) {
          return prev.filter((_, i) => i !== existingIdx);
        }
        return prev;
      }
    });

    showToast(`Schedule actualizado: Conductor sincronizado para ${date}.`);
  };

  // Schedule Automático:
  // "Quiero hacer otro botón en schedule en la barra principal que diga schedule automático.
  // Eso es para que la próxima semana se copie el mismo schedule que está con respecto a los días de trabajo solamente,
  // y si hay que hacer algún cambio ya se haga manualmente."
  const handleAutoCopyScheduleToNextWeek = (sourceMonday: Date, targetMonday: Date) => {
    const sourceDates = getWeekDates(sourceMonday).map(d => toIsoDate(d));
    const targetDates = getWeekDates(targetMonday).map(d => toIsoDate(d));

    const newScheduleEntries: DaySchedule[] = [];
    const newAssignments: DailyAssignment[] = [];
    let replicatedWorkShifts = 0;

    drivers.forEach((drv) => {
      sourceDates.forEach((sourceDateIso, dayIndex) => {
        const targetDateIso = targetDates[dayIndex];
        const existingSource = schedule.find(s => s.driverId === drv.id && s.date === sourceDateIso);

        const currentComment = existingSource?.comment || (existingSource?.status === 'Trabaja' ? '9:15 AM' : existingSource?.status || 'Off');
        const worksToday = isWorkingShift(currentComment);

        let targetComment = 'Off';
        let targetStatus: ScheduleStatus = 'Off';

        if (worksToday) {
          replicatedWorkShifts++;
          targetStatus = 'Trabaja';
          // Preserve the scheduled wave shift (e.g. 9:15 AM, 8:45 AM, Rescue, Standby)
          targetComment = currentComment.includes('AM') || currentComment.includes('PM') || currentComment.includes('Rescue') || currentComment.includes('Standby')
            ? currentComment
            : '9:15 AM';

          // Also auto-prepare daily assignment row for the new week
          newAssignments.push({
            id: `asg-${targetDateIso}-${drv.id}`,
            date: targetDateIso,
            driverId: drv.id,
            vanNumber: '',
            deviceNumber: '',
            batteryNumber: '',
            status: targetComment.includes('Rescue') ? 'Rescue' : 'RQ',
            clockIn: '',
            lunchStart: '',
            lunchEnd: '',
            clockOut: '',
            comment: targetComment
          });
        } else {
          // Off day preserved
          targetStatus = 'Off';
          targetComment = 'Off';
        }

        newScheduleEntries.push({
          driverId: drv.id,
          date: targetDateIso,
          status: targetStatus,
          comment: targetComment
        });
      });
    });

    // Merge into state without affecting other historical weeks
    setSchedule((prev) => {
      const filtered = prev.filter(s => !targetDates.includes(s.date));
      return [...filtered, ...newScheduleEntries];
    });

    setAssignments((prev) => {
      const filtered = prev.filter(a => !targetDates.includes(a.date));
      return [...filtered, ...newAssignments];
    });

    // Advance view to the newly generated week
    setCurrentMonday(targetMonday);
    setSelectedDateIso(targetDates[0]);

    showToast(`¡Schedule Automático creado! Se duplicaron ${replicatedWorkShifts} turnos de trabajo para la semana de ${formatWeekLabel(targetMonday)}.`);
  };

  // Update Daily Assignment (Vans, Devices, Punches, Status)
  const handleUpdateAssignment = (updated: DailyAssignment) => {
    setAssignments((prev) => {
      const idx = prev.findIndex((a) => a.id === updated.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updated;
        return copy;
      }
      return [...prev, updated];
    });

    // Sincronización bidireccional: si en Truck Assignment se marca Call Out o se cambia de estatus
    if (updated.status === 'Call Out') {
      setSchedule((prev) => {
        const idx = prev.findIndex((s) => s.driverId === updated.driverId && s.date === updated.date);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], status: 'Call-Out', comment: 'Call Out' };
          return copy;
        }
        return [...prev, { driverId: updated.driverId, date: updated.date, status: 'Call-Out', comment: 'Call Out' }];
      });
    } else if (['RQ', 'Flex', 'Rescue', 'Extra Truck'].includes(updated.status)) {
      setSchedule((prev) => {
        const idx = prev.findIndex((s) => s.driverId === updated.driverId && s.date === updated.date);
        if (idx >= 0 && (prev[idx].status === 'Call-Out' || prev[idx].status === 'Off')) {
          const copy = [...prev];
          copy[idx] = {
            ...copy[idx],
            status: 'Trabaja',
            comment: updated.status === 'Rescue' ? 'Rescue / 10:00 AM' : '9:15 AM'
          };
          return copy;
        }
        return prev;
      });
    }
  };

  // Guardar configuración de Cortes
  const handleSaveCorteConfig = (config: DayCorteConfig) => {
    setCortesMap((prev) => ({
      ...prev,
      [config.date]: config
    }));
  };

  // Aplicar Cortes de Rutas a Truck Assignment:
  // "Y cuando yo dé un botón de aplicar esa lista, pasaría entonces al truck assignment.
  // Entonces, los drivers que saldrían en el truck assignment son los del cortes cuando yo asigne las rutas."
  const handleApplyCortesToTruckAssignment = (
    dateIso: string,
    decisions: DriverCorte[],
    amazonRoutes: number
  ) => {
    // 1. Guardar la configuración de corte con status aplicado
    const updatedConfig: DayCorteConfig = {
      date: dateIso,
      amazonRoutes,
      applied: true,
      decisions,
      lastUpdated: new Date().toISOString()
    };

    setCortesMap((prev) => ({
      ...prev,
      [dateIso]: updatedConfig
    }));

    // 2. Sincronizar assignments para esta fecha:
    // TODOS los conductores pasan al Truck Assignment con la asignación correspondiente:
    // CORTEX -> status: 'RQ', comment: 'CORTEX'
    // NO CORTEX -> status: 'Call Out', comment: 'NO CORTEX'
    setAssignments((prev) => {
      const next = prev.filter((a) => a.date !== dateIso);
      const existingMap = new Map<string, DailyAssignment>();
      prev.filter((a) => a.date === dateIso).forEach((a) => existingMap.set(a.driverId, a));

      decisions.forEach((dec) => {
        const isCortex = dec.status !== 'Corte' && dec.note !== 'NO CORTEX';
        const asgStatus: AssignmentStatus = isCortex
          ? (dec.status === 'Rescue' ? 'Rescue' : dec.status === 'Flex' ? 'Flex' : 'RQ')
          : 'Call Out';
        const comment = isCortex ? (dec.note && dec.note !== 'Corte' ? dec.note : 'CORTEX') : 'NO CORTEX';
        const existing = existingMap.get(dec.driverId);

        if (existing) {
          next.push({
            ...existing,
            status: asgStatus,
            routeCode: dec.routeCode || existing.routeCode,
            comment: comment
          });
        } else {
          next.push({
            id: `asg-${dateIso}-${dec.driverId}`,
            date: dateIso,
            driverId: dec.driverId,
            vanNumber: '',
            deviceNumber: '',
            batteryNumber: '',
            status: asgStatus,
            clockIn: '',
            lunchStart: '',
            lunchEnd: '',
            clockOut: '',
            routeCode: dec.routeCode || '',
            comment
          });
        }
      });

      return next;
    });

    // 3. Cambiar inmediatamente a la pestaña Truck Assignment para esa fecha
    setSelectedDateIso(dateIso);
    setActiveTab('truck-assignment');

    const cortexCount = decisions.filter((d) => d.status !== 'Corte' && d.note !== 'NO CORTEX').length;
    const noCortexCount = decisions.length - cortexCount;
    showToast(
      `¡Asignaciones aplicadas! Todos los ${decisions.length} conductores pasaron a Truck Assignment (${cortexCount} CORTEX / ${noCortexCount} NO CORTEX).`
    );
  };

  // Sincronizar todos los cambios de estatus del Driver en Cortex con el Schedule de ese día
  const handleSyncCortesToSchedule = (
    dateIso: string,
    decisions: DriverCorte[]
  ) => {
    setSchedule((prev) => {
      const otherDays = prev.filter((s) => s.date !== dateIso);
      const currentDayEntries = prev.filter((s) => s.date === dateIso);
      const currentMap = new Map(currentDayEntries.map((s) => [s.driverId, s]));

      decisions.forEach((dec) => {
        let scheduleStatus: ScheduleStatus = 'Trabaja';
        let comment = dec.note || '9:15 AM';
        const lower = (dec.note || '').toLowerCase();

        if (dec.status === 'RQ') {
          scheduleStatus = 'Trabaja';
          comment = dec.note || '9:15 AM';
        } else if (dec.status === 'Rescue') {
          scheduleStatus = 'Trabaja';
          comment = dec.note || 'Rescue / 10:00 AM';
        } else if (dec.status === 'Flex') {
          scheduleStatus = 'Trabaja';
          comment = dec.note || 'Flex';
        } else if (dec.status === 'Standby') {
          scheduleStatus = 'Standby';
          comment = dec.note || 'Standby';
        } else if (dec.status === 'Call Out') {
          scheduleStatus = 'Call-Out';
          comment = dec.note || 'Call Out';
        } else if (dec.status === 'Corte') {
          scheduleStatus = 'Off';
          comment = dec.note || 'Corte (VTO)';
        }

        if (lower.includes('review')) {
          comment = dec.note || 'Review';
        }

        currentMap.set(dec.driverId, {
          driverId: dec.driverId,
          date: dateIso,
          status: scheduleStatus,
          comment
        });
      });

      return [...otherDays, ...Array.from(currentMap.values())];
    });

    showToast(`Schedule del día ${dateIso} sincronizado con los cambios de Cortex.`);
  };

  // Sincronizar todos los cambios de estatus del Driver desde Truck Assignment con el Schedule de ese día
  const handleSyncAssignmentsToSchedule = (
    dateIso: string,
    dayAssignments: DailyAssignment[]
  ) => {
    setSchedule((prev) => {
      const otherDays = prev.filter((s) => s.date !== dateIso);
      const currentDayEntries = prev.filter((s) => s.date === dateIso);
      const currentMap = new Map(currentDayEntries.map((s) => [s.driverId, s]));

      dayAssignments.forEach((asg) => {
        let scheduleStatus: ScheduleStatus = 'Trabaja';
        let comment = asg.comment || '9:15 AM';
        const lower = (asg.comment || '').toLowerCase();

        if (asg.status === 'RQ') {
          scheduleStatus = 'Trabaja';
          comment = asg.comment || '9:15 AM';
        } else if (asg.status === 'Rescue') {
          scheduleStatus = 'Trabaja';
          comment = asg.comment || 'Rescue / 10:00 AM';
        } else if (asg.status === 'Flex') {
          scheduleStatus = 'Trabaja';
          comment = asg.comment || 'Flex';
        } else if (asg.status === 'Standby') {
          scheduleStatus = 'Standby';
          comment = asg.comment || 'Standby';
        } else if (asg.status === 'Call Out') {
          scheduleStatus = 'Call-Out';
          comment = asg.comment || 'Call Out';
        } else if (asg.status === 'Extra Truck') {
          scheduleStatus = 'Trabaja';
          comment = asg.comment || 'Extra Truck';
        }

        if (lower.includes('review')) {
          comment = asg.comment || 'Review';
        }

        currentMap.set(asg.driverId, {
          driverId: asg.driverId,
          date: dateIso,
          status: scheduleStatus,
          comment
        });
      });

      // Incluir también los conductores que fueron cortados en esa fecha si existen en Cortes
      const corteConfig = cortesMap[dateIso];
      if (corteConfig?.decisions) {
        corteConfig.decisions.forEach((dec) => {
          if (dec.status === 'Corte') {
            currentMap.set(dec.driverId, {
              driverId: dec.driverId,
              date: dateIso,
              status: 'Off',
              comment: dec.note || 'Corte (VTO)'
            });
          }
        });
      }

      return [...otherDays, ...Array.from(currentMap.values())];
    });

    showToast(`Schedule del día ${dateIso} actualizado con los estatus de Truck Assignment.`);
  };

  // Driver CRUD
  const handleAddDriver = (newDriver: Omit<Driver, 'id'>) => {
    const id = `drv-${Date.now().toString(36)}`;
    setDrivers((prev) => [...prev, { ...newDriver, id }]);
    showToast(`Conductor "${newDriver.name}" registrado en el directorio.`);
  };

  const handleUpdateDriver = (updated: Driver) => {
    setDrivers((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    showToast(`Conductor "${updated.name}" actualizado.`);
  };

  // Carga e Importación Masiva de Conductores desde CSV / Excel:
  // "Cuando yo cargue ese documento Excel, ahí automáticamente se actualice y reconozca la información y la añada a todos los conductores."
  const handleBulkImportDrivers = (
    importedList: Array<{
      name: string;
      phone?: string;
      email?: string;
      hireDate?: string;
      notes?: string;
    }>
  ) => {
    let addedCount = 0;
    let updatedCount = 0;

    setDrivers((prev) => {
      const next = [...prev];
      const todayIso = new Date().toISOString().split('T')[0];

      importedList.forEach((item) => {
        if (!item.name || !item.name.trim()) return;
        const cleanName = item.name.trim();
        const cleanPhone = (item.phone || '').trim();
        const cleanEmail = (item.email || '').trim().toLowerCase();

        // Buscar conductor existente por nombre exacto/similar, teléfono o correo
        const existingIdx = next.findIndex((d) => {
          const sameName = d.name.toLowerCase().trim() === cleanName.toLowerCase();
          const cleanExistingPhone = (d.phone || '').replace(/\D/g, '');
          const cleanNewPhone = cleanPhone.replace(/\D/g, '');
          const samePhone =
            cleanNewPhone.length >= 7 && cleanExistingPhone.length >= 7 && cleanExistingPhone === cleanNewPhone;
          const sameEmail = cleanEmail && d.email && d.email.toLowerCase().trim() === cleanEmail;
          return sameName || samePhone || sameEmail;
        });

        if (existingIdx >= 0) {
          next[existingIdx] = {
            ...next[existingIdx],
            name: cleanName,
            phone: cleanPhone || next[existingIdx].phone,
            email: cleanEmail || next[existingIdx].email,
            hireDate: item.hireDate || next[existingIdx].hireDate,
            notes: item.notes || next[existingIdx].notes
          };
          updatedCount++;
        } else {
          const newId = `drv-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
          next.push({
            id: newId,
            name: cleanName,
            phone: cleanPhone || '(000) 000-0000',
            email: cleanEmail || '',
            hireDate: item.hireDate || todayIso,
            active: true,
            notes: item.notes || 'Importado desde CSV / Excel'
          });
          addedCount++;
        }
      });

      return next;
    });

    showToast(
      `¡Base de datos importada con éxito! ${addedCount} conductores nuevos añadidos y ${updatedCount} actualizados.`
    );

    return { addedCount, updatedCount };
  };

  const handleDeleteDriver = (id: string) => {
    setDrivers((prev) => prev.filter((d) => d.id !== id));
    setSchedule((prev) => prev.filter((s) => s.driverId !== id));
    setAssignments((prev) => prev.filter((a) => a.driverId !== id));
    showToast('Conductor eliminado del directorio.');
  };

  // Vehicle CRUD
  const handleAddVehicle = (newVeh: Omit<Vehicle, 'id'>) => {
    const id = `veh-${Date.now().toString(36)}`;
    setVehicles((prev) => [...prev, { ...newVeh, id }]);
    showToast(`Vehículo "${newVeh.number}" guardado en inventario.`);
  };

  const handleUpdateVehicle = (updated: Vehicle) => {
    setVehicles((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
  };

  const handleDeleteVehicle = (id: string) => {
    setVehicles((prev) => prev.filter((v) => v.id !== id));
    showToast('Vehículo retirado del inventario.');
  };

  // Device CRUD
  const handleAddDevice = (newDev: Omit<Device, 'id'>) => {
    const id = `dev-${Date.now().toString(36)}`;
    setDevices((prev) => [...prev, { ...newDev, id }]);
    showToast(`Dispositivo "${newDev.number}" añadido.`);
  };

  const handleUpdateDevice = (updated: Device) => {
    setDevices((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  };

  const handleDeleteDevice = (id: string) => {
    setDevices((prev) => prev.filter((d) => d.id !== id));
    showToast('Dispositivo eliminado.');
  };

  // Battery CRUD
  const handleAddBattery = (newBat: Omit<Battery, 'id'>) => {
    const id = `bat-${Date.now().toString(36)}`;
    setBatteries((prev) => [...prev, { ...newBat, id }]);
    showToast(`Batería "${newBat.code}" registrada.`);
  };

  const handleUpdateBattery = (updated: Battery) => {
    setBatteries((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  };

  const handleDeleteBattery = (id: string) => {
    setBatteries((prev) => prev.filter((b) => b.id !== id));
    showToast('Batería eliminada.');
  };

  // Reset / Limpiar base de datos
  const handleResetData = () => {
    if (window.confirm('¿Deseas vaciar la base de datos de conductores y turnos para empezar de cero?')) {
      localStorage.removeItem(STORAGE_KEYS.DRIVERS);
      localStorage.removeItem(STORAGE_KEYS.SCHEDULE);
      localStorage.removeItem(STORAGE_KEYS.ASSIGNMENTS);
      localStorage.removeItem(STORAGE_KEYS.CORTES);
      setDrivers([]);
      setSchedule([]);
      setAssignments([]);
      setCortesMap({});
      showToast('Base de datos de conductores y turnos limpiada.');
    }
  };

  // Export JSON Backup
  const handleExportBackup = () => {
    const backup = {
      timestamp: new Date().toISOString(),
      drivers,
      vehicles,
      devices,
      batteries,
      schedule,
      assignments,
      packagesMap,
      settings
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DSP_Backup_${toIsoDate(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Copia de respaldo JSON descargada.');
  };

  // Import JSON Backup
  const handleImportBackup = (jsonString: string) => {
    const data = JSON.parse(jsonString);
    if (data.drivers) setDrivers(data.drivers);
    if (data.vehicles) setVehicles(data.vehicles);
    if (data.devices) setDevices(data.devices);
    if (data.batteries) setBatteries(data.batteries);
    if (data.schedule) setSchedule(data.schedule);
    if (data.assignments) setAssignments(data.assignments);
    if (data.packagesMap) setPackagesMap(data.packagesMap);
    if (data.settings) setSettings(data.settings);
    showToast('Respaldo restaurado con éxito.');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Sticky Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentMonday={currentMonday}
        onChangeMonday={(m) => {
          setCurrentMonday(m);
          setSelectedDateIso(toIsoDate(m));
        }}
        dspName={settings.dspName}
        stationCode={settings.stationCode}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onResetData={handleResetData}
      />

      {/* Main Module Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6">
        {activeTab === 'dashboard' && (
          <DashboardModule
            currentMonday={currentMonday}
            onChangeMonday={(m) => {
              setCurrentMonday(m);
              setSelectedDateIso(toIsoDate(m));
            }}
            drivers={drivers}
            vehicles={vehicles}
            assignments={assignments}
            schedule={schedule}
            cortesMap={cortesMap}
            packagesMap={packagesMap}
            onUpdateDailyPackages={(dateIso, val) => {
              setPackagesMap((prev) => ({
                ...prev,
                [dateIso]: val
              }));
              const total = typeof val === 'object' ? val.total : val;
              showToast(`Paquetes actualizados para ${dateIso}: ${total.toLocaleString()}`);
            }}
            onResetAllMetrics={() => {
              setPackagesMap({});
              showToast('Todas las métricas de paquetes han sido restablecidas a 0.');
            }}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            dspName={settings.dspName}
            stationCode={settings.stationCode}
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleModule
            currentMonday={currentMonday}
            drivers={drivers}
            schedule={schedule}
            onUpdateDaySchedule={handleUpdateDaySchedule}
            onAutoCopyScheduleToNextWeek={handleAutoCopyScheduleToNextWeek}
            selectedDateIso={selectedDateIso}
            onSelectDate={(dateIso) => setSelectedDateIso(dateIso)}
            onNavigateToTruckAssignment={(dateIso) => {
              setSelectedDateIso(dateIso);
              setActiveTab('truck-assignment');
            }}
            dspName={settings.dspName}
          />
        )}

        {activeTab === 'cortes' && (
          <CortesModule
            currentMonday={currentMonday}
            selectedDateIso={selectedDateIso}
            onSelectDate={setSelectedDateIso}
            drivers={drivers}
            schedule={schedule}
            cortesMap={cortesMap}
            onSaveCorteConfig={handleSaveCorteConfig}
            onApplyCortesToTruckAssignment={handleApplyCortesToTruckAssignment}
            dspName={settings.dspName}
            stationCode={settings.stationCode}
          />
        )}

        {activeTab === 'truck-assignment' && (
          <TruckAssignmentModule
            currentMonday={currentMonday}
            selectedDateIso={selectedDateIso}
            onSelectDate={setSelectedDateIso}
            drivers={drivers}
            vehicles={vehicles}
            devices={devices}
            batteries={batteries}
            schedule={schedule}
            cortesMap={cortesMap}
            assignments={assignments}
            onUpdateAssignment={handleUpdateAssignment}
            onUpdateDaySchedule={handleUpdateDaySchedule}
            onNavigateToSchedule={() => setActiveTab('schedule')}
            onNavigateToCortes={() => setActiveTab('cortes')}
            onSyncToSchedule={handleSyncAssignmentsToSchedule}
            dailyPackages={
              typeof packagesMap[selectedDateIso] === 'object'
                ? packagesMap[selectedDateIso]?.total || 0
                : packagesMap[selectedDateIso] || 0
            }
            dailyPackagesData={packagesMap[selectedDateIso]}
            packagesMap={packagesMap}
            onUpdateDailyPackages={(val) => {
              setPackagesMap((prev) => ({
                ...prev,
                [selectedDateIso]: val
              }));
            }}
            dspName={settings.dspName}
            stationCode={settings.stationCode}
          />
        )}

        {activeTab === 'timesheet' && (
          <TimesheetModule
            currentMonday={currentMonday}
            drivers={drivers}
            assignments={assignments}
            onUpdateAssignment={handleUpdateAssignment}
            dspName={settings.dspName}
          />
        )}

        {activeTab === 'fleet-inventory' && (
          <FleetInventoryModule
            drivers={drivers}
            vehicles={vehicles}
            devices={devices}
            batteries={batteries}
            onAddDriver={handleAddDriver}
            onUpdateDriver={handleUpdateDriver}
            onDeleteDriver={handleDeleteDriver}
            onBulkImportDrivers={handleBulkImportDrivers}
            onAddVehicle={handleAddVehicle}
            onUpdateVehicle={handleUpdateVehicle}
            onDeleteVehicle={handleDeleteVehicle}
            onAddDevice={handleAddDevice}
            onUpdateDevice={handleUpdateDevice}
            onDeleteDevice={handleDeleteDevice}
            onAddBattery={handleAddBattery}
            onUpdateBattery={handleUpdateBattery}
            onDeleteBattery={handleDeleteBattery}
          />
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={setSettings}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900 border border-amber-500/50 text-slate-100 text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
