import { DailyAssignment } from '../types';

export function padZero(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = padZero(date.getMonth() + 1);
  const d = padZero(date.getDate());
  return `${y}-${m}-${d}`;
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Amazon DSP standard: Week starts on Sunday (Domingo) and ends on Saturday (Sábado)
export function getSunday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  const diff = date.getDate() - day;
  const sunday = new Date(date.setDate(diff));
  sunday.setHours(0, 0, 0, 0);
  return sunday;
}

// Kept for backward compatibility but starts the week on Sunday
export const getMonday = getSunday;
export const getStartOfWeek = getSunday;

// Get array of 7 dates for the week starting on Sunday (Domingo a Sábado)
export function getWeekDates(startSunday: Date): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const nextDay = new Date(startSunday);
    nextDay.setDate(startSunday.getDate() + i);
    days.push(nextDay);
  }
  return days;
}

export const DAY_NAMES_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const DAY_NAMES_SHORT_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const MONTH_NAMES_SHORT_ES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

export function formatWeekLabel(startSunday: Date): string {
  const endSaturday = new Date(startSunday);
  endSaturday.setDate(startSunday.getDate() + 6);

  const startDay = startSunday.getDate();
  const startMonth = MONTH_NAMES_SHORT_ES[startSunday.getMonth()];
  const startYear = startSunday.getFullYear();

  const endDay = endSaturday.getDate();
  const endMonth = MONTH_NAMES_SHORT_ES[endSaturday.getMonth()];
  const endYear = endSaturday.getFullYear();

  // Get week number in year
  const firstJan = new Date(startSunday.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((startSunday.getTime() - firstJan.getTime()) / (24 * 60 * 60 * 1000));
  const weekNum = Math.ceil((dayOfYear + firstJan.getDay() + 1) / 7);

  if (startYear === endYear) {
    if (startMonth === endMonth) {
      return `Semana ${weekNum} (${startDay} - ${endDay} ${startMonth} ${startYear})`;
    }
    return `Semana ${weekNum} (${startDay} ${startMonth} - ${endDay} ${endMonth} ${startYear})`;
  }
  return `Semana ${weekNum} (${startDay} ${startMonth} ${startYear} - ${endDay} ${endMonth} ${endYear})`;
}

// Calculate seniority from hire date to reference date (or today)
export function calculateSeniority(hireDateStr: string, refDate: Date = new Date(2026, 8, 24)) {
  if (!hireDateStr) {
    return { years: 0, months: 0, days: 0, totalDays: 0, label: 'N/A' };
  }

  const hireDate = parseIsoDate(hireDateStr);
  const diffTime = refDate.getTime() - hireDate.getTime();
  const totalDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

  let years = refDate.getFullYear() - hireDate.getFullYear();
  let months = refDate.getMonth() - hireDate.getMonth();
  let days = refDate.getDate() - hireDate.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonthLastDay = new Date(refDate.getFullYear(), refDate.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  years = Math.max(0, years);
  months = Math.max(0, months);
  days = Math.max(0, days);

  let label = '';
  if (years > 0) {
    label += `${years} año${years > 1 ? 's' : ''}`;
    if (months > 0) label += `, ${months} m`;
  } else if (months > 0) {
    label += `${months} mes${months > 1 ? 'es' : ''}`;
    if (days > 0) label += `, ${days} d`;
  } else {
    label = `${days} día${days !== 1 ? 's' : ''}`;
  }

  return { years, months, days, totalDays, label };
}

// Convert "HH:mm" to minutes from midnight
export function timeToMinutes(timeStr: string): number | null {
  if (!timeStr || !timeStr.includes(':')) return null;
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

// Convert minutes to "HH:mm"
export function minutesToTime(minutes: number): string {
  const norm = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${padZero(h)}:${padZero(m)}`;
}

// Formula: (Lunch Start - Clock In) + (Clock Out - Lunch End)
export function calculateNetHours(
  clockIn: string,
  lunchStart: string,
  lunchEnd: string,
  clockOut: string
): { decimalHours: number; formatted: string; minutes: number } {
  const inMin = timeToMinutes(clockIn);
  const lStartMin = timeToMinutes(lunchStart);
  const lEndMin = timeToMinutes(lunchEnd);
  const outMin = timeToMinutes(clockOut);

  if (inMin === null) {
    return { decimalHours: 0, formatted: '0.00 h', minutes: 0 };
  }

  let totalMinutes = 0;

  // Case 1: Both lunch punches exist and are valid
  if (lStartMin !== null && lEndMin !== null) {
    const shift1 = Math.max(0, lStartMin - inMin);
    let shift2 = 0;
    if (outMin !== null) {
      shift2 = Math.max(0, outMin - lEndMin);
    }
    totalMinutes = shift1 + shift2;
  } else if (outMin !== null) {
    // Case 2: No lunch punches but clock in & out exist
    totalMinutes = Math.max(0, outMin - inMin);
  }

  const decimalHours = Math.round((totalMinutes / 60) * 100) / 100;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const formatted = `${h}h ${padZero(m)}m`;

  return { decimalHours, formatted, minutes: totalMinutes };
}

// Lunch duration in minutes
export function calculateLunchDuration(lunchStart: string, lunchEnd: string): number {
  const start = timeToMinutes(lunchStart);
  const end = timeToMinutes(lunchEnd);
  if (start === null || end === null) return 0;
  return Math.max(0, end - start);
}

export interface ComplianceStatus {
  hasMissingEquipment: boolean;
  missingEquipmentText: string[];
  hasLunchDelayWarning: boolean;
  lunchDelayMessage?: string;
  hasLunchDurationWarning: boolean;
  lunchDurationMessage?: string;
}

export function checkCompliance(assignment: DailyAssignment): ComplianceStatus {
  const warnings: ComplianceStatus = {
    hasMissingEquipment: false,
    missingEquipmentText: [],
    hasLunchDelayWarning: false,
    hasLunchDurationWarning: false,
  };

  // Only check if assigned and active
  if (assignment.status === 'Call Out') {
    return warnings;
  }

  // 1. Missing equipment check: If Van is assigned, verify phone and battery
  const hasVan = Boolean(assignment.vanNumber?.trim());
  const hasPhone = Boolean(assignment.deviceNumber?.trim());
  const hasBattery = Boolean(assignment.batteryNumber?.trim());

  if (hasVan) {
    if (!hasPhone) warnings.missingEquipmentText.push('Falta Teléfono');
    if (!hasBattery) warnings.missingEquipmentText.push('Falta Batería');
  } else if (hasPhone || hasBattery) {
    if (!hasVan) warnings.missingEquipmentText.push('Falta Van');
  }

  if (warnings.missingEquipmentText.length > 0) {
    warnings.hasMissingEquipment = true;
  }

  // 2. Lunch delay check: Worked > 5 hours before starting lunch
  const inMin = timeToMinutes(assignment.clockIn);
  const lStartMin = timeToMinutes(assignment.lunchStart);
  if (inMin !== null && lStartMin !== null) {
    const elapsedBeforeLunch = lStartMin - inMin;
    if (elapsedBeforeLunch > 300) { // 5 hours = 300 minutes
      const hoursWorked = (elapsedBeforeLunch / 60).toFixed(1);
      warnings.hasLunchDelayWarning = true;
      warnings.lunchDelayMessage = `Almuerzo iniciado tras ${hoursWorked} hrs de trabajo (> 5 hrs). Riesgo de penalización de lunch.`;
    }
  }

  // 3. Lunch duration check: Must be at least 30m, warn if <30m or >60m
  const lEndMin = timeToMinutes(assignment.lunchEnd);
  if (lStartMin !== null && lEndMin !== null) {
    const lunchDuration = lEndMin - lStartMin;
    if (lunchDuration < 30) {
      warnings.hasLunchDurationWarning = true;
      warnings.lunchDurationMessage = `Almuerzo de solo ${lunchDuration} min (mínimo legal: 30 min).`;
    } else if (lunchDuration > 60) {
      warnings.hasLunchDurationWarning = true;
      warnings.lunchDurationMessage = `Almuerzo excedido: ${lunchDuration} min (máximo sugerido: 60 min).`;
    }
  }

  return warnings;
}

// Get current system time formatted as HH:mm
export function getCurrentTimeString(): string {
  const now = new Date();
  return `${padZero(now.getHours())}:${padZero(now.getMinutes())}`;
}
