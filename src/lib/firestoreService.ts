import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDocs,
  DocumentData,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Driver,
  Vehicle,
  Device,
  Battery,
  DaySchedule,
  DailyAssignment,
  DayCorteConfig,
  AppSettings
} from '../types';

/**
 * Removes undefined keys to prevent Firestore write errors
 */
function sanitize<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = sanitize(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

// ----------------------------------------------------
// Drivers
// ----------------------------------------------------
export function subscribeToDrivers(callback: (drivers: Driver[]) => void): Unsubscribe {
  const colRef = collection(db, 'drivers');
  return onSnapshot(colRef, (snapshot) => {
    const list: Driver[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        name: data.name || '',
        phone: data.phone || '',
        email: data.email || '',
        hireDate: data.hireDate || '2026-01-15',
        active: data.active ?? true,
        notes: data.notes || ''
      });
    });
    // Sort by name
    list.sort((a, b) => a.name.localeCompare(b.name));
    callback(list);
  }, (err) => {
    console.warn('Error reading drivers from Firestore:', err);
  });
}

export async function saveDriverToFirestore(driver: Driver): Promise<void> {
  const docRef = doc(db, 'drivers', driver.id);
  await setDoc(docRef, sanitize({
    ...driver,
    updatedAt: new Date().toISOString()
  }), { merge: true });
}

export async function deleteDriverFromFirestore(id: string): Promise<void> {
  const docRef = doc(db, 'drivers', id);
  await deleteDoc(docRef);
}

// ----------------------------------------------------
// Vehicles
// ----------------------------------------------------
export function subscribeToVehicles(callback: (vehicles: Vehicle[]) => void): Unsubscribe {
  const colRef = collection(db, 'vehicles');
  return onSnapshot(colRef, (snapshot) => {
    const list: Vehicle[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        number: data.number || '',
        type: data.type || 'Step Van',
        vin: data.vin || '',
        licensePlate: data.licensePlate || '',
        status: data.status || 'Operativo'
      });
    });
    // Sort by number
    list.sort((a, b) => a.number.localeCompare(b.number));
    callback(list);
  }, (err) => {
    console.warn('Error reading vehicles from Firestore:', err);
  });
}

export async function saveVehicleToFirestore(vehicle: Vehicle): Promise<void> {
  const docRef = doc(db, 'vehicles', vehicle.id);
  await setDoc(docRef, sanitize({
    ...vehicle,
    updatedAt: new Date().toISOString()
  }), { merge: true });
}

export async function deleteVehicleFromFirestore(id: string): Promise<void> {
  const docRef = doc(db, 'vehicles', id);
  await deleteDoc(docRef);
}

// ----------------------------------------------------
// Devices
// ----------------------------------------------------
export function subscribeToDevices(callback: (devices: Device[]) => void): Unsubscribe {
  const colRef = collection(db, 'devices');
  return onSnapshot(colRef, (snapshot) => {
    const list: Device[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        number: data.number || '',
        serial: data.serial || '',
        model: data.model || 'Zebra TC57x',
        status: data.status || 'Operativo'
      });
    });
    list.sort((a, b) => a.number.localeCompare(b.number));
    callback(list);
  }, (err) => {
    console.warn('Error reading devices from Firestore:', err);
  });
}

export async function saveDeviceToFirestore(device: Device): Promise<void> {
  const docRef = doc(db, 'devices', device.id);
  await setDoc(docRef, sanitize({
    ...device,
    updatedAt: new Date().toISOString()
  }), { merge: true });
}

export async function deleteDeviceFromFirestore(id: string): Promise<void> {
  const docRef = doc(db, 'devices', id);
  await deleteDoc(docRef);
}

// ----------------------------------------------------
// Batteries
// ----------------------------------------------------
export function subscribeToBatteries(callback: (batteries: Battery[]) => void): Unsubscribe {
  const colRef = collection(db, 'batteries');
  return onSnapshot(colRef, (snapshot) => {
    const list: Battery[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        code: data.code || '',
        capacity: data.capacity || '20,000 mAh',
        status: data.status || 'Operativo'
      });
    });
    list.sort((a, b) => a.code.localeCompare(b.code));
    callback(list);
  }, (err) => {
    console.warn('Error reading batteries from Firestore:', err);
  });
}

export async function saveBatteryToFirestore(battery: Battery): Promise<void> {
  const docRef = doc(db, 'batteries', battery.id);
  await setDoc(docRef, sanitize({
    ...battery,
    updatedAt: new Date().toISOString()
  }), { merge: true });
}

export async function deleteBatteryFromFirestore(id: string): Promise<void> {
  const docRef = doc(db, 'batteries', id);
  await deleteDoc(docRef);
}

// ----------------------------------------------------
// Schedules
// ----------------------------------------------------
export function subscribeToSchedules(callback: (schedule: DaySchedule[]) => void): Unsubscribe {
  const colRef = collection(db, 'schedules');
  return onSnapshot(colRef, (snapshot) => {
    const list: DaySchedule[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        driverId: data.driverId,
        date: data.date,
        status: data.status || 'Trabaja',
        comment: data.comment || undefined
      });
    });
    callback(list);
  }, (err) => {
    console.warn('Error reading schedules from Firestore:', err);
  });
}

export async function saveScheduleEntryToFirestore(entry: DaySchedule): Promise<void> {
  const docId = `sch_${entry.date}_${entry.driverId}`;
  const docRef = doc(db, 'schedules', docId);
  await setDoc(docRef, sanitize({
    ...entry,
    updatedAt: new Date().toISOString()
  }), { merge: true });
}

export async function batchSaveSchedulesToFirestore(entries: DaySchedule[]): Promise<void> {
  if (entries.length === 0) return;
  const batch = writeBatch(db);
  entries.forEach((entry) => {
    const docId = `sch_${entry.date}_${entry.driverId}`;
    const docRef = doc(db, 'schedules', docId);
    batch.set(docRef, sanitize({
      ...entry,
      updatedAt: new Date().toISOString()
    }), { merge: true });
  });
  await batch.commit();
}

// ----------------------------------------------------
// Daily Assignments
// ----------------------------------------------------
export function subscribeToAssignments(callback: (assignments: DailyAssignment[]) => void): Unsubscribe {
  const colRef = collection(db, 'assignments');
  return onSnapshot(colRef, (snapshot) => {
    const list: DailyAssignment[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        date: data.date || '',
        driverId: data.driverId || '',
        vanNumber: data.vanNumber || '',
        deviceNumber: data.deviceNumber || '',
        batteryNumber: data.batteryNumber || '',
        status: data.status || 'RQ',
        clockIn: data.clockIn || '',
        lunchStart: data.lunchStart || '',
        lunchEnd: data.lunchEnd || '',
        clockOut: data.clockOut || '',
        comment: data.comment || '',
        routeCode: data.routeCode || ''
      });
    });
    callback(list);
  }, (err) => {
    console.warn('Error reading assignments from Firestore:', err);
  });
}

export async function saveAssignmentToFirestore(assignment: DailyAssignment): Promise<void> {
  const docId = assignment.id || `asg_${assignment.date}_${assignment.driverId}`;
  const docRef = doc(db, 'assignments', docId);
  await setDoc(docRef, sanitize({
    ...assignment,
    id: docId,
    updatedAt: new Date().toISOString()
  }), { merge: true });
}

// ----------------------------------------------------
// Cortes
// ----------------------------------------------------
export function subscribeToCortes(callback: (cortesMap: { [dateIso: string]: DayCorteConfig }) => void): Unsubscribe {
  const colRef = collection(db, 'cortes');
  return onSnapshot(colRef, (snapshot) => {
    const map: { [dateIso: string]: DayCorteConfig } = {};
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const date = docSnap.id.replace('corte_', '');
      map[date] = {
        date: data.date || date,
        amazonRoutes: Number(data.amazonRoutes) || 0,
        applied: Boolean(data.applied),
        decisions: Array.isArray(data.decisions) ? data.decisions : [],
        lastUpdated: data.lastUpdated || undefined
      };
    });
    callback(map);
  }, (err) => {
    console.warn('Error reading cortes from Firestore:', err);
  });
}

export async function saveCorteConfigToFirestore(corte: DayCorteConfig): Promise<void> {
  const docId = `corte_${corte.date}`;
  const docRef = doc(db, 'cortes', docId);
  await setDoc(docRef, sanitize({
    ...corte,
    updatedAt: new Date().toISOString()
  }), { merge: true });
}

// ----------------------------------------------------
// Packages Map
// ----------------------------------------------------
export function subscribeToPackages(callback: (packagesMap: { [dateIso: string]: any }) => void): Unsubscribe {
  const colRef = collection(db, 'daily_packages');
  return onSnapshot(colRef, (snapshot) => {
    const map: { [dateIso: string]: any } = {};
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const date = docSnap.id.replace('pkg_', '');
      map[date] = {
        cx: Number(data.cx) || 0,
        flex: Number(data.flex) || 0,
        total: Number(data.total) || 0
      };
    });
    callback(map);
  }, (err) => {
    console.warn('Error reading packages from Firestore:', err);
  });
}

export async function saveDailyPackageToFirestore(dateIso: string, data: any): Promise<void> {
  const docId = `pkg_${dateIso}`;
  const docRef = doc(db, 'daily_packages', docId);
  const pkgData = typeof data === 'object' && data !== null
    ? { cx: Number(data.cx) || 0, flex: Number(data.flex) || 0, total: Number(data.total) || 0 }
    : { cx: Number(data) || 0, flex: 0, total: Number(data) || 0 };

  await setDoc(docRef, sanitize({
    dateIso,
    ...pkgData,
    updatedAt: new Date().toISOString()
  }), { merge: true });
}

// ----------------------------------------------------
// App Settings
// ----------------------------------------------------
export function subscribeToSettings(callback: (settings: AppSettings) => void): Unsubscribe {
  const docRef = doc(db, 'app_settings', 'main');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      callback({
        dspName: data.dspName || 'Amazon DSP Apex Logistics',
        stationCode: data.stationCode || 'DFL4',
        alertMissingEquipment: data.alertMissingEquipment ?? true,
        alertLunchDelay: data.alertLunchDelay ?? true,
        alertLunchDuration: data.alertLunchDuration ?? true
      });
    }
  }, (err) => {
    console.warn('Error reading settings from Firestore:', err);
  });
}

export async function saveSettingsToFirestore(settings: AppSettings): Promise<void> {
  const docRef = doc(db, 'app_settings', 'main');
  await setDoc(docRef, sanitize({
    ...settings,
    updatedAt: new Date().toISOString()
  }), { merge: true });
}

// ----------------------------------------------------
// Clear all data (starts clean from zero)
// ----------------------------------------------------
export async function clearAllFirestoreData(): Promise<void> {
  const collectionsToClear = [
    'drivers',
    'vehicles',
    'devices',
    'batteries',
    'schedules',
    'assignments',
    'cortes',
    'daily_packages'
  ];

  for (const colName of collectionsToClear) {
    const colRef = collection(db, colName);
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      const batch = writeBatch(db);
      snapshot.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }
}
