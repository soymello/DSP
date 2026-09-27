export type VehicleType = 'Step Van' | 'Custom Van' | 'Camión' | 'EV - Eléctrico' | 'Auto Rentado';

export interface Driver {
  id: string;
  name: string;
  phone: string;
  email?: string;
  hireDate: string; // YYYY-MM-DD
  active: boolean;
  notes?: string;
}

export type VehicleStatus = 'Operativo' | 'En proceso' | 'Inactivo' | 'En el Taller' | 'Otro';

export interface Vehicle {
  id: string;
  number: string; // e.g. "Van #101"
  type: VehicleType;
  vin: string;
  licensePlate: string;
  status: VehicleStatus;
}

export interface Device {
  id: string;
  number: string; // e.g. "Teléfono #05"
  serial: string;
  model: string;
  status: 'Operativo' | 'En Reparación' | 'Perdido';
}

export interface Battery {
  id: string;
  code: string; // e.g. "Powerbank #12"
  capacity: string;
  status: 'Operativo' | 'Baja';
}

export type ScheduleStatus = 'Trabaja' | 'Call-Out' | 'Off' | 'Standby';

export interface DaySchedule {
  driverId: string;
  date: string; // YYYY-MM-DD
  status: ScheduleStatus;
  comment?: string;
}

export type AssignmentStatus = 'RQ' | 'Flex' | 'Rescue' | 'Extra Truck' | 'Call Out' | 'Standby';

export type CorteStatus = 'RQ' | 'Rescue' | 'Flex' | 'Standby' | 'Corte' | 'Call Out';

export interface DriverCorte {
  driverId: string;
  status: CorteStatus;
  routeCode?: string;
  note?: string;
}

export interface DayCorteConfig {
  date: string; // YYYY-MM-DD
  amazonRoutes: number; // Cantidad de rutas asignadas por Amazon
  applied: boolean; // Si el despachador ya aplicó los cortes a Truck Assignment
  decisions: DriverCorte[];
  lastUpdated?: string;
}

export interface DailyAssignment {
  id: string;
  date: string; // YYYY-MM-DD
  driverId: string;
  vanNumber: string;
  deviceNumber: string;
  batteryNumber: string;
  status: AssignmentStatus;
  clockIn: string; // HH:mm
  lunchStart: string; // HH:mm
  lunchEnd: string; // HH:mm
  clockOut: string; // HH:mm
  comment?: string;
  routeCode?: string;
}

export interface DailyMetrics {
  date: string;
  totalPackages: number;
}

export interface DailyPackagesData {
  cx: number;
  flex: number;
  total: number;
}

export interface AppSettings {
  dspName: string;
  stationCode: string;
  alertMissingEquipment: boolean;
  alertLunchDelay: boolean; // Over 5 hours without lunch
  alertLunchDuration: boolean; // Lunch < 30m or > 60m
}
