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
import { initAuth, validateFirestoreConnection } from './lib/firebase';
import {
  subscribeToDrivers,
  saveDriverToFirestore,
  deleteDriverFromFirestore,
  subscribeToVehicles,
  saveVehicleToFirestore,
  deleteVehicleFromFirestore,
  subscribeToDevices,
  saveDeviceToFirestore,
  deleteDeviceFromFirestore,
  subscribeToBatteries,
  saveBatteryToFirestore,
  deleteBatteryFromFirestore,
  subscribeToSchedules,
  saveScheduleEntryToFirestore,
  batchSaveSchedulesToFirestore,
  subscribeToAssignments,
  saveAssignmentToFirestore,
  subscribeToCortes,
  saveCorteConfigToFirestore,
  subscribeToPackages,
  saveDailyPackageToFirestore,
  subscribeToSettings,
  saveSettingsToFirestore,
  clearAllFirestoreData
} from './lib/firestoreService';

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
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(true);

  // App Settings (empieza desde configuración limpia o de Firestore)
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Colecciones limpias desde cero (sincronizadas en tiempo real con Firebase Firestore)
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [batteries, setBatteries] = useState<Battery[]>([]);
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [assignments, setAssignments] = useState<DailyAssignment[]>([]);
  const [packagesMap, setPackagesMap] = useState<{ [date: string]: any }>({});
  const [cortesMap, setCortesMap] = useState<{ [dateIso: string]: DayCorteConfig }>({});

  // 1. Conexión y suscripciones en tiempo real a Firebase Firestore para sincronización multidispositivo
  useEffect(() => {
    // Limpieza de datos mock residuales de localStorage
    try {
      localStorage.removeItem('dsp_ops_drivers_v1');
      localStorage.removeItem('dsp_ops_schedule_v1');
      localStorage.removeItem('dsp_ops_assignments_v1');
      localStorage.removeItem('dsp_ops_cortes_v1');
      localStorage.removeItem('dsp_ops_vehicles_v1');
      localStorage.removeItem('dsp_ops_devices_v1');
      localStorage.removeItem('dsp_ops_batteries_v1');
    } catch {
      // ignore
    }

    // Inicializar autenticación y validar conexión
    initAuth().then(() => {
      validateFirestoreConnection().then((connected) => {
        setIsCloudConnected(connected);
      });
    });

    // Suscripciones en tiempo real
    const unsubDrivers = subscribeToDrivers((data) => setDrivers(data));
    const unsubVehicles = subscribeToVehicles((data) => setVehicles(data));
    const unsubDevices = subscribeToDevices((data) => setDevices(data));
    const unsubBatteries = subscribeToBatteries((data) => setBatteries(data));
    const unsubSchedules = subscribeToSchedules((data) => setSchedule(data));
    const unsubAssignments = subscribeToAssignments((data) => setAssignments(data));
    const unsubCortes = subscribeToCortes((data) => setCortesMap(data));
    const unsubPackages = subscribeToPackages((data) => setPackagesMap(data));
    const unsubSettings = subscribeToSettings((data) => setSettings(data));

    return () => {
      unsubDrivers();
      unsubVehicles();
      unsubDevices();
      unsubBatteries();
      unsubSchedules();
      unsubAssignments();
      unsubCortes();
      unsubPackages();
      unsubSettings();
    };
  }, []);

  // Show quick toast notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Schedule Update Handler with Sincronización Automática:
  const handleUpdateDaySchedule = async (
    driverId: string,
    date: string,
    status: ScheduleStatus,
    comment?: string
  ) => {
    // 1. Guardar en Firestore
    await saveScheduleEntryToFirestore({ driverId, date, status, comment });

    // 2. Auto-sync en Truck Assignment
    const isWorking = status === 'Trabaja';
    const isCallOut = status === 'Call-Out' || (comment && comment.toLowerCase().includes('call out'));

    const existing = assignments.find((a) => a.driverId === driverId && a.date === date);

    if (isWorking) {
      if (existing) {
        await saveAssignmentToFirestore({
          ...existing,
          status: existing.status === 'Call Out' ? 'RQ' : existing.status,
          comment: comment || existing.comment
        });
      } else {
        await saveAssignmentToFirestore({
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
        });
      }
    } else if (isCallOut) {
      if (existing) {
        await saveAssignmentToFirestore({
          ...existing,
          status: 'Call Out',
          comment: comment || 'Call-Out reportado en schedule'
        });
      } else {
        await saveAssignmentToFirestore({
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
        });
      }
    }

    showToast(`Schedule sincronizado en la nube para ${date}.`);
  };

  // Schedule Automático
  const handleAutoCopyScheduleToNextWeek = async (sourceMonday: Date, targetMonday: Date) => {
    const sourceDates = getWeekDates(sourceMonday).map((d) => toIsoDate(d));
    const targetDates = getWeekDates(targetMonday).map((d) => toIsoDate(d));

    const newScheduleEntries: DaySchedule[] = [];
    const newAssignments: DailyAssignment[] = [];
    let replicatedWorkShifts = 0;

    drivers.forEach((drv) => {
      sourceDates.forEach((sourceDateIso, dayIndex) => {
        const sourceEntry = schedule.find((s) => s.driverId === drv.id && s.date === sourceDateIso);
        const targetDateIso = targetDates[dayIndex];

        let targetStatus: ScheduleStatus = 'Off';
        let targetComment: string | undefined = undefined;

        if (sourceEntry) {
          if (sourceEntry.status === 'Trabaja') {
            targetStatus = 'Trabaja';
            targetComment = sourceEntry.comment || '9:15 AM';
            replicatedWorkShifts++;

            newAssignments.push({
              id: `asg-${targetDateIso}-${drv.id}`,
              date: targetDateIso,
              driverId: drv.id,
              vanNumber: '',
              deviceNumber: '',
              batteryNumber: '',
              status: targetComment.toLowerCase().includes('rescue') ? 'Rescue' : 'RQ',
              clockIn: '',
              lunchStart: '',
              lunchEnd: '',
              clockOut: '',
              comment: targetComment
            });
          } else {
            targetStatus = 'Off';
            targetComment = undefined;
          }
        }

        newScheduleEntries.push({
          driverId: drv.id,
          date: targetDateIso,
          status: targetStatus,
          comment: targetComment
        });
      });
    });

    // Guardar en Firestore en lote
    await batchSaveSchedulesToFirestore(newScheduleEntries);
    for (const asg of newAssignments) {
      await saveAssignmentToFirestore(asg);
    }

    setCurrentMonday(targetMonday);
    setSelectedDateIso(targetDates[0]);

    showToast(
      `¡Schedule Automático guardado en la nube! Se duplicaron ${replicatedWorkShifts} turnos de trabajo para ${formatWeekLabel(targetMonday)}.`
    );
  };

  // Update Daily Assignment (Vans, Devices, Punches, Status)
  const handleUpdateAssignment = async (updated: DailyAssignment) => {
    await saveAssignmentToFirestore(updated);

    // Sincronización bidireccional con Schedule
    if (updated.status === 'Call Out') {
      await saveScheduleEntryToFirestore({
        driverId: updated.driverId,
        date: updated.date,
        status: 'Call-Out',
        comment: 'Call Out'
      });
    } else if (['RQ', 'Flex', 'Rescue', 'Extra Truck'].includes(updated.status)) {
      const existing = schedule.find((s) => s.driverId === updated.driverId && s.date === updated.date);
      if (existing && (existing.status === 'Call-Out' || existing.status === 'Off')) {
        await saveScheduleEntryToFirestore({
          driverId: updated.driverId,
          date: updated.date,
          status: 'Trabaja',
          comment: updated.status === 'Rescue' ? 'Rescue / 10:00 AM' : '9:15 AM'
        });
      }
    }
  };

  // Guardar configuración de Cortes
  const handleSaveCorteConfig = async (config: DayCorteConfig) => {
    await saveCorteConfigToFirestore(config);
  };

  // Aplicar Cortes de Rutas a Truck Assignment
  const handleApplyCortesToTruckAssignment = async (
    dateIso: string,
    decisions: DriverCorte[],
    amazonRoutes: number
  ) => {
    const updatedConfig: DayCorteConfig = {
      date: dateIso,
      amazonRoutes,
      applied: true,
      decisions,
      lastUpdated: new Date().toISOString()
    };

    await saveCorteConfigToFirestore(updatedConfig);

    const existingMap = new Map<string, DailyAssignment>();
    assignments.filter((a) => a.date === dateIso).forEach((a) => existingMap.set(a.driverId, a));

    for (const dec of decisions) {
      const isCortex = dec.status !== 'Corte' && dec.note !== 'NO CORTEX';
      const asgStatus: AssignmentStatus = isCortex
        ? (dec.status === 'Rescue' ? 'Rescue' : dec.status === 'Flex' ? 'Flex' : 'RQ')
        : 'Call Out';
      const comment = isCortex ? (dec.note && dec.note !== 'Corte' ? dec.note : 'CORTEX') : 'NO CORTEX';
      const existing = existingMap.get(dec.driverId);

      if (existing) {
        await saveAssignmentToFirestore({
          ...existing,
          status: asgStatus,
          routeCode: dec.routeCode || existing.routeCode,
          comment: comment
        });
      } else {
        await saveAssignmentToFirestore({
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
    }

    setSelectedDateIso(dateIso);
    setActiveTab('truck-assignment');

    const cortexCount = decisions.filter((d) => d.status !== 'Corte' && d.note !== 'NO CORTEX').length;
    const noCortexCount = decisions.length - cortexCount;
    showToast(
      `¡Asignaciones guardadas en la nube! ${decisions.length} conductores sincronizados (${cortexCount} CORTEX / ${noCortexCount} NO CORTEX).`
    );
  };

  // Sincronizar todos los cambios de estatus del Driver en Cortex con el Schedule de ese día
  const handleSyncCortesToSchedule = async (
    dateIso: string,
    decisions: DriverCorte[]
  ) => {
    for (const dec of decisions) {
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

      await saveScheduleEntryToFirestore({
        driverId: dec.driverId,
        date: dateIso,
        status: scheduleStatus,
        comment
      });
    }

    showToast(`Schedule del día ${dateIso} sincronizado en la nube.`);
  };

  // Sincronizar cambios de estatus del Driver desde Truck Assignment con el Schedule de ese día
  const handleSyncAssignmentsToSchedule = async (
    dateIso: string,
    dayAssignments: DailyAssignment[]
  ) => {
    for (const asg of dayAssignments) {
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

      await saveScheduleEntryToFirestore({
        driverId: asg.driverId,
        date: dateIso,
        status: scheduleStatus,
        comment
      });
    }

    showToast(`Schedule del día ${dateIso} actualizado en la nube.`);
  };

  // Driver CRUD
  const handleAddDriver = async (newDriver: Omit<Driver, 'id'>) => {
    const id = `drv-${Date.now().toString(36)}`;
    const driverWithId: Driver = { ...newDriver, id };
    setDrivers((prev) => [...prev, driverWithId]);
    try {
      await saveDriverToFirestore(driverWithId);
      showToast(`Conductor "${newDriver.name}" guardado.`);
    } catch (err) {
      console.error('Error guardando driver en Firestore:', err);
      showToast(`Error al sincronizar con la nube: ${err instanceof Error ? err.message : 'Error'}`);
    }
  };

  const handleUpdateDriver = async (updated: Driver) => {
    setDrivers((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    try {
      await saveDriverToFirestore(updated);
      showToast(`Conductor "${updated.name}" actualizado.`);
    } catch (err) {
      console.error('Error actualizando driver en Firestore:', err);
    }
  };

  const handleDeleteDriver = async (id: string) => {
    setDrivers((prev) => prev.filter((d) => d.id !== id));
    try {
      await deleteDriverFromFirestore(id);
      showToast('Conductor eliminado.');
    } catch (err) {
      console.error('Error eliminando driver en Firestore:', err);
    }
  };

  // Carga e Importación Masiva de Conductores desde CSV / Excel
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
    const todayIso = new Date().toISOString().split('T')[0];

    importedList.forEach((item) => {
      if (!item.name || !item.name.trim()) return;
      const cleanName = item.name.trim();
      const cleanPhone = (item.phone || '').trim();
      const cleanEmail = (item.email || '').trim().toLowerCase();

      const existing = drivers.find((d) => {
        const sameName = d.name.toLowerCase().trim() === cleanName.toLowerCase();
        const cleanExistingPhone = (d.phone || '').replace(/\D/g, '');
        const cleanNewPhone = cleanPhone.replace(/\D/g, '');
        const samePhone =
          cleanNewPhone.length >= 7 && cleanExistingPhone.length >= 7 && cleanExistingPhone === cleanNewPhone;
        const sameEmail = cleanEmail && d.email && d.email.toLowerCase().trim() === cleanEmail;
        return sameName || samePhone || sameEmail;
      });

      if (existing) {
        const updated = {
          ...existing,
          name: cleanName,
          phone: cleanPhone || existing.phone,
          email: cleanEmail || existing.email,
          hireDate: item.hireDate || existing.hireDate,
          notes: item.notes || existing.notes
        };
        setDrivers((prev) => prev.map((d) => (d.id === existing.id ? updated : d)));
        saveDriverToFirestore(updated);
        updatedCount++;
      } else {
        const newId = `drv-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
        const created: Driver = {
          id: newId,
          name: cleanName,
          phone: cleanPhone || '(000) 000-0000',
          email: cleanEmail || '',
          hireDate: item.hireDate || todayIso,
          active: true,
          notes: item.notes || 'Importado desde CSV / Excel'
        };
        setDrivers((prev) => [...prev, created]);
        saveDriverToFirestore(created);
        addedCount++;
      }
    });

    showToast(
      `¡Base de datos importada con éxito! ${addedCount} conductores nuevos añadidos y ${updatedCount} actualizados en la nube.`
    );

    return { addedCount, updatedCount };
  };

  // Vehicle CRUD
  const handleAddVehicle = async (newVeh: Omit<Vehicle, 'id'>) => {
    const id = `veh-${Date.now().toString(36)}`;
    const vehWithId: Vehicle = { ...newVeh, id };
    setVehicles((prev) => [...prev, vehWithId]);
    try {
      await saveVehicleToFirestore(vehWithId);
      showToast(`Vehículo "${newVeh.number}" guardado.`);
    } catch (err) {
      console.error('Error guardando vehículo:', err);
    }
  };

  const handleUpdateVehicle = async (updated: Vehicle) => {
    setVehicles((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
    try {
      await saveVehicleToFirestore(updated);
    } catch (err) {
      console.error('Error actualizando vehículo:', err);
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    setVehicles((prev) => prev.filter((v) => v.id !== id));
    try {
      await deleteVehicleFromFirestore(id);
      showToast('Vehículo retirado de la nube.');
    } catch (err) {
      console.error('Error eliminando vehículo:', err);
    }
  };

  // Device CRUD
  const handleAddDevice = async (newDev: Omit<Device, 'id'>) => {
    const id = `dev-${Date.now().toString(36)}`;
    const devWithId: Device = { ...newDev, id };
    setDevices((prev) => [...prev, devWithId]);
    try {
      await saveDeviceToFirestore(devWithId);
      showToast(`Dispositivo "${newDev.number}" guardado.`);
    } catch (err) {
      console.error('Error guardando dispositivo:', err);
    }
  };

  const handleUpdateDevice = async (updated: Device) => {
    setDevices((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    try {
      await saveDeviceToFirestore(updated);
    } catch (err) {
      console.error('Error actualizando dispositivo:', err);
    }
  };

  const handleDeleteDevice = async (id: string) => {
    setDevices((prev) => prev.filter((d) => d.id !== id));
    try {
      await deleteDeviceFromFirestore(id);
      showToast('Dispositivo eliminado de la nube.');
    } catch (err) {
      console.error('Error eliminando dispositivo:', err);
    }
  };

  // Battery CRUD
  const handleAddBattery = async (newBat: Omit<Battery, 'id'>) => {
    const id = `bat-${Date.now().toString(36)}`;
    const batWithId: Battery = { ...newBat, id };
    setBatteries((prev) => [...prev, batWithId]);
    try {
      await saveBatteryToFirestore(batWithId);
      showToast(`Batería "${newBat.code}" guardada.`);
    } catch (err) {
      console.error('Error guardando batería:', err);
    }
  };

  const handleUpdateBattery = async (updated: Battery) => {
    setBatteries((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    try {
      await saveBatteryToFirestore(updated);
    } catch (err) {
      console.error('Error actualizando batería:', err);
    }
  };

  const handleDeleteBattery = async (id: string) => {
    setBatteries((prev) => prev.filter((b) => b.id !== id));
    try {
      await deleteBatteryFromFirestore(id);
      showToast('Batería eliminada de la nube.');
    } catch (err) {
      console.error('Error eliminando batería:', err);
    }
  };

  // Reset / Empezar completamente desde cero en todos los dispositivos
  const handleResetData = async () => {
    if (
      window.confirm(
        '¿Deseas vaciar la base de datos en la nube para empezar completamente desde cero en todos tus dispositivos?'
      )
    ) {
      await clearAllFirestoreData();
      setDrivers([]);
      setVehicles([]);
      setDevices([]);
      setBatteries([]);
      setSchedule([]);
      setAssignments([]);
      setCortesMap({});
      setPackagesMap({});
      showToast('Base de datos en la nube vaciada con éxito. Empezando desde cero.');
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
    a.download = `DSP_CloudBackup_${toIsoDate(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Copia de respaldo JSON descargada.');
  };

  // Import JSON Backup
  const handleImportBackup = async (jsonString: string) => {
    const data = JSON.parse(jsonString);
    if (Array.isArray(data.drivers)) {
      for (const d of data.drivers) await saveDriverToFirestore(d);
    }
    if (Array.isArray(data.vehicles)) {
      for (const v of data.vehicles) await saveVehicleToFirestore(v);
    }
    if (Array.isArray(data.devices)) {
      for (const dev of data.devices) await saveDeviceToFirestore(dev);
    }
    if (Array.isArray(data.batteries)) {
      for (const b of data.batteries) await saveBatteryToFirestore(b);
    }
    if (Array.isArray(data.schedule)) {
      await batchSaveSchedulesToFirestore(data.schedule);
    }
    if (Array.isArray(data.assignments)) {
      for (const a of data.assignments) await saveAssignmentToFirestore(a);
    }
    if (data.settings) {
      await saveSettingsToFirestore(data.settings);
    }
    showToast('Respaldo restaurado en la nube con éxito.');
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await saveSettingsToFirestore(newSettings);
    showToast('Configuración guardada en la nube.');
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
        isCloudConnected={isCloudConnected}
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
            onUpdateDailyPackages={async (dateIso, val) => {
              await saveDailyPackageToFirestore(dateIso, val);
              const total = typeof val === 'object' ? val.total : val;
              showToast(`Paquetes sincronizados para ${dateIso}: ${total.toLocaleString()}`);
            }}
            onResetAllMetrics={async () => {
              for (const d of Object.keys(packagesMap)) {
                await saveDailyPackageToFirestore(d, { cx: 0, flex: 0, total: 0 });
              }
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
            onUpdateDailyPackages={async (val) => {
              await saveDailyPackageToFirestore(selectedDateIso, val);
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
        onSaveSettings={handleSaveSettings}
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
