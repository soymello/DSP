import { Battery, DailyAssignment, DaySchedule, Device, Driver, Vehicle } from '../types';

// Base de datos de conductores limpia (0 ejemplos para que el usuario ingrese o importe sus propios conductores)
export const INITIAL_DRIVERS: Driver[] = [];

export const INITIAL_VEHICLES: Vehicle[] = [
  { id: 'veh-01', number: 'Van #101', type: 'Step Van', vin: '1FDNF21F8HKA89123', licensePlate: 'FL-DSP01', status: 'Operativo' },
  { id: 'veh-02', number: 'Van #102', type: 'Step Van', vin: '1FDNF21F9HKA89124', licensePlate: 'FL-DSP02', status: 'Operativo' },
  { id: 'veh-03', number: 'Van #103', type: 'Step Van', vin: '1FDNF21F0HKA89125', licensePlate: 'FL-DSP03', status: 'Operativo' },
  { id: 'veh-04', number: 'Van #104', type: 'Custom Van', vin: '3C6URVBG8ME129841', licensePlate: 'FL-DSP04', status: 'Operativo' },
  { id: 'veh-05', number: 'Van #105', type: 'Custom Van', vin: '3C6URVBG9ME129842', licensePlate: 'FL-DSP05', status: 'Operativo' },
  { id: 'veh-06', number: 'Van #106', type: 'Custom Van', vin: '3C6URVBG0ME129843', licensePlate: 'FL-DSP06', status: 'Operativo' },
  { id: 'veh-07', number: 'Van #107', type: 'EV - Eléctrico', vin: '7PDSG23E4NA901234', licensePlate: 'FL-EV107', status: 'Operativo' },
  { id: 'veh-08', number: 'Van #108', type: 'EV - Eléctrico', vin: '7PDSG23E5NA901235', licensePlate: 'FL-EV108', status: 'Operativo' },
  { id: 'veh-09', number: 'Van #109', type: 'EV - Eléctrico', vin: '7PDSG23E6NA901236', licensePlate: 'FL-EV109', status: 'Operativo' },
  { id: 'veh-10', number: 'Van #110', type: 'Camión', vin: '4UZAA2AK7EC182901', licensePlate: 'FL-CM110', status: 'Operativo' },
  { id: 'veh-11', number: 'Van #111', type: 'Camión', vin: '4UZAA2AK8EC182902', licensePlate: 'FL-CM111', status: 'Operativo' },
  { id: 'veh-12', number: 'Van #112', type: 'Auto Rentado', vin: '2C3CDXBG4MH298172', licensePlate: 'FL-RNT12', status: 'Operativo' },
  { id: 'veh-13', number: 'Van #113', type: 'Custom Van', vin: '3C6URVBG1ME129844', licensePlate: 'FL-DSP13', status: 'Operativo' },
  { id: 'veh-14', number: 'Van #114', type: 'Custom Van', vin: '3C6URVBG2ME129845', licensePlate: 'FL-DSP14', status: 'En el Taller' },
  { id: 'veh-15', number: 'Van #115', type: 'Step Van', vin: '1FDNF21F1HKA89126', licensePlate: 'FL-DSP15', status: 'Operativo' },
  { id: 'veh-16', number: 'Van #116', type: 'EV - Eléctrico', vin: '7PDSG23E7NA901237', licensePlate: 'FL-EV116', status: 'Operativo' }
];

export const INITIAL_DEVICES: Device[] = Array.from({ length: 20 }, (_, i) => {
  const num = i + 1;
  const pad = num < 10 ? `0${num}` : `${num}`;
  return {
    id: `dev-${pad}`,
    number: `Teléfono #${pad}`,
    serial: `TC57-IMEI-${89012340 + num}`,
    model: 'Zebra TC57x Enterprise',
    status: num === 14 ? 'En Reparación' : 'Operativo'
  };
});

export const INITIAL_BATTERIES: Battery[] = Array.from({ length: 20 }, (_, i) => {
  const num = i + 1;
  const pad = num < 10 ? `0${num}` : `${num}`;
  return {
    id: `bat-${pad}`,
    code: `Powerbank #${pad}`,
    capacity: '20,000 mAh Anker Heavy-Duty',
    status: num === 19 ? 'Baja' : 'Operativo'
  };
});

// Base de datos de schedule limpia
export function generateInitialSchedule(): DaySchedule[] {
  return [];
}

// Base de datos de asignaciones diarias limpia
export function generateInitialAssignments(): DailyAssignment[] {
  return [];
}

