/**
 * Internal Web Database (IndexedDB) for DSP Operations
 * Stores all Drivers, Vehicles, Devices, Batteries, Schedules, Assignments,
 * Cortes, Packages, and App Settings permanently in the user's browser.
 * Works 100% offline, on GitHub Pages, and with zero external dependencies.
 */

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

const DB_NAME = 'DSP_Ops_Internal_DB_v1';
const DB_VERSION = 1;

export const STORES = {
  DRIVERS: 'drivers',
  VEHICLES: 'vehicles',
  DEVICES: 'devices',
  BATTERIES: 'batteries',
  SCHEDULES: 'schedules',
  ASSIGNMENTS: 'assignments',
  CORTES: 'cortes',
  PACKAGES: 'packages',
  SETTINGS: 'settings'
} as const;

let dbInstance: IDBDatabase | null = null;
let dbInitPromise: Promise<IDBDatabase> | null = null;

/**
 * Initializes and opens the browser's internal IndexedDB database
 */
export function openInternalDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB no está disponible en este entorno.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Drivers store
      if (!db.objectStoreNames.contains(STORES.DRIVERS)) {
        db.createObjectStore(STORES.DRIVERS, { keyPath: 'id' });
      }

      // 2. Vehicles store
      if (!db.objectStoreNames.contains(STORES.VEHICLES)) {
        db.createObjectStore(STORES.VEHICLES, { keyPath: 'id' });
      }

      // 3. Devices store
      if (!db.objectStoreNames.contains(STORES.DEVICES)) {
        db.createObjectStore(STORES.DEVICES, { keyPath: 'id' });
      }

      // 4. Batteries store
      if (!db.objectStoreNames.contains(STORES.BATTERIES)) {
        db.createObjectStore(STORES.BATTERIES, { keyPath: 'id' });
      }

      // 5. Schedules store (composite key: `sch_${date}_${driverId}`)
      if (!db.objectStoreNames.contains(STORES.SCHEDULES)) {
        const store = db.createObjectStore(STORES.SCHEDULES, { keyPath: 'dbId' });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('driverId', 'driverId', { unique: false });
      }

      // 6. Assignments store
      if (!db.objectStoreNames.contains(STORES.ASSIGNMENTS)) {
        const store = db.createObjectStore(STORES.ASSIGNMENTS, { keyPath: 'id' });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('driverId', 'driverId', { unique: false });
      }

      // 7. Cortes store (keyPath: date)
      if (!db.objectStoreNames.contains(STORES.CORTES)) {
        db.createObjectStore(STORES.CORTES, { keyPath: 'date' });
      }

      // 8. Daily Packages store (keyPath: date)
      if (!db.objectStoreNames.contains(STORES.PACKAGES)) {
        db.createObjectStore(STORES.PACKAGES, { keyPath: 'date' });
      }

      // 9. App Settings store (keyPath: key)
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.warn('Error al abrir IndexedDB:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbInitPromise;
}

/**
 * Generic helper to get all items from an object store
 */
export async function dbGetAll<T>(storeName: string): Promise<T[]> {
  try {
    const db = await openInternalDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as T[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`[InternalDB] Fallo al leer de ${storeName}:`, err);
    return [];
  }
}

/**
 * Generic helper to put (insert or update) an item in an object store
 */
export async function dbPut<T>(storeName: string, item: T): Promise<void> {
  try {
    const db = await openInternalDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`[InternalDB] Fallo al guardar en ${storeName}:`, err);
  }
}

/**
 * Generic helper to bulk insert or update items
 */
export async function dbBulkPut<T>(storeName: string, items: T[]): Promise<void> {
  if (items.length === 0) return;
  try {
    const db = await openInternalDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      items.forEach((it) => store.put(it));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn(`[InternalDB] Fallo al guardar lote en ${storeName}:`, err);
  }
}

/**
 * Generic helper to delete an item by key
 */
export async function dbDelete(storeName: string, key: IDBValidKey): Promise<void> {
  try {
    const db = await openInternalDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`[InternalDB] Fallo al eliminar de ${storeName}:`, err);
  }
}

/**
 * Clear a specific store
 */
export async function dbClearStore(storeName: string): Promise<void> {
  try {
    const db = await openInternalDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`[InternalDB] Fallo al vaciar ${storeName}:`, err);
  }
}

/**
 * Clear ALL internal database stores (starts completely clean from zero)
 */
export async function dbClearAll(): Promise<void> {
  const storeNames = Object.values(STORES);
  for (const name of storeNames) {
    await dbClearStore(name);
  }
}

// ----------------------------------------------------------------------
// Specific Entity Database Services
// ----------------------------------------------------------------------

export async function internalDbGetDrivers(): Promise<Driver[]> {
  const drivers = await dbGetAll<Driver>(STORES.DRIVERS);
  return drivers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

export async function internalDbSaveDriver(driver: Driver): Promise<void> {
  await dbPut(STORES.DRIVERS, driver);
}

export async function internalDbDeleteDriver(id: string): Promise<void> {
  await dbDelete(STORES.DRIVERS, id);
}

export async function internalDbGetVehicles(): Promise<Vehicle[]> {
  const vehicles = await dbGetAll<Vehicle>(STORES.VEHICLES);
  return vehicles.sort((a, b) => (a.number || '').localeCompare(b.number || ''));
}

export async function internalDbSaveVehicle(vehicle: Vehicle): Promise<void> {
  await dbPut(STORES.VEHICLES, vehicle);
}

export async function internalDbDeleteVehicle(id: string): Promise<void> {
  await dbDelete(STORES.VEHICLES, id);
}

export async function internalDbGetDevices(): Promise<Device[]> {
  const devices = await dbGetAll<Device>(STORES.DEVICES);
  return devices.sort((a, b) => (a.number || '').localeCompare(b.number || ''));
}

export async function internalDbSaveDevice(device: Device): Promise<void> {
  await dbPut(STORES.DEVICES, device);
}

export async function internalDbDeleteDevice(id: string): Promise<void> {
  await dbDelete(STORES.DEVICES, id);
}

export async function internalDbGetBatteries(): Promise<Battery[]> {
  const batteries = await dbGetAll<Battery>(STORES.BATTERIES);
  return batteries.sort((a, b) => (a.code || '').localeCompare(b.code || ''));
}

export async function internalDbSaveBattery(battery: Battery): Promise<void> {
  await dbPut(STORES.BATTERIES, battery);
}

export async function internalDbDeleteBattery(id: string): Promise<void> {
  await dbDelete(STORES.BATTERIES, id);
}

// Schedules with unique key `sch_${date}_${driverId}`
interface StoredSchedule extends DaySchedule {
  dbId: string;
}

export async function internalDbGetSchedules(): Promise<DaySchedule[]> {
  const stored = await dbGetAll<StoredSchedule>(STORES.SCHEDULES);
  return stored.map(({ dbId, ...rest }) => rest);
}

export async function internalDbSaveSchedule(entry: DaySchedule): Promise<void> {
  const stored: StoredSchedule = {
    ...entry,
    dbId: `sch_${entry.date}_${entry.driverId}`
  };
  await dbPut(STORES.SCHEDULES, stored);
}

export async function internalDbBulkSaveSchedules(entries: DaySchedule[]): Promise<void> {
  const stored: StoredSchedule[] = entries.map((e) => ({
    ...e,
    dbId: `sch_${e.date}_${e.driverId}`
  }));
  await dbBulkPut(STORES.SCHEDULES, stored);
}

export async function internalDbGetAssignments(): Promise<DailyAssignment[]> {
  return await dbGetAll<DailyAssignment>(STORES.ASSIGNMENTS);
}

export async function internalDbSaveAssignment(asg: DailyAssignment): Promise<void> {
  await dbPut(STORES.ASSIGNMENTS, asg);
}

export async function internalDbGetCortes(): Promise<{ [dateIso: string]: DayCorteConfig }> {
  const list = await dbGetAll<DayCorteConfig>(STORES.CORTES);
  const map: { [dateIso: string]: DayCorteConfig } = {};
  list.forEach((c) => {
    if (c.date) map[c.date] = c;
  });
  return map;
}

export async function internalDbSaveCorte(config: DayCorteConfig): Promise<void> {
  await dbPut(STORES.CORTES, config);
}

interface StoredPackage {
  date: string;
  data: any;
}

export async function internalDbGetPackages(): Promise<{ [dateIso: string]: any }> {
  const list = await dbGetAll<StoredPackage>(STORES.PACKAGES);
  const map: { [dateIso: string]: any } = {};
  list.forEach((p) => {
    if (p.date) map[p.date] = p.data;
  });
  return map;
}

export async function internalDbSavePackage(date: string, data: any): Promise<void> {
  await dbPut(STORES.PACKAGES, { date, data });
}

export async function internalDbGetSettings(): Promise<AppSettings | null> {
  const all = await dbGetAll<{ key: string; value: AppSettings }>(STORES.SETTINGS);
  const found = all.find((item) => item.key === 'app_settings');
  return found ? found.value : null;
}

export async function internalDbSaveSettings(settings: AppSettings): Promise<void> {
  await dbPut(STORES.SETTINGS, { key: 'app_settings', value: settings });
}
