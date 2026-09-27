import XLSX from 'xlsx-js-style';
import { DailyAssignment, DaySchedule, Driver } from '../types';
import {
  calculateNetHours,
  calculateSeniority,
  DAY_NAMES_ES,
  DAY_NAMES_SHORT_ES,
  formatWeekLabel,
  getWeekDates,
  toIsoDate
} from './dateUtils';
import { isWorkingShift, ScheduleCommentOption } from './scheduleComments';

// Paleta de colores para exportación a Excel (RGB en Hexadecimal sin '#' para xlsx-js-style)
// Sincronizada directamente con los temas visuales del Schedule en la aplicación
export interface ExcelColorPalette {
  bg: string;     // Color de fondo de la celda (Fill RGB)
  text: string;   // Color del texto de la celda (Font RGB)
  border: string; // Color del borde (Border RGB)
  label: string;  // Descripción para la leyenda
}

export const EXCEL_COLOR_PALETTES: Record<string, ExcelColorPalette> = {
  emerald: {
    bg: 'A7F3D0',   // Tailwind Emerald-200
    text: '064E3B', // Tailwind Emerald-900 (Bold)
    border: '10B981',
    label: 'Turno Regular (Trabaja - 9:15 AM / 8:45 AM)'
  },
  teal: {
    bg: '99F6E4',   // Teal-200
    text: '115E59', // Teal-900
    border: '14B8A6',
    label: 'Turno de Rescate / Barredor (Trabaja - Rescue)'
  },
  cyan: {
    bg: 'A5F3FC',   // Cyan-200
    text: '164E63', // Cyan-900
    border: '06B6D4',
    label: 'Estación Primaria / Turno Especial'
  },
  blue: {
    bg: 'BFDBFE',   // Blue-200
    text: '1E3A8A', // Blue-900
    border: '3B82F6',
    label: 'Estación Secundaria / Turno Rutas'
  },
  sky: {
    bg: 'BAE6FD',   // Sky-200
    text: '075985', // Sky-900
    border: '38BDF8',
    label: 'Standby / Conductor de Reserva en Estación'
  },
  indigo: {
    bg: 'C7D2FE',   // Indigo-200
    text: '312E81', // Indigo-900
    border: '6366F1',
    label: 'Turno de Cierre / Retorno (RTS)'
  },
  purple: {
    bg: 'E9D5FF',   // Purple-200
    text: '581C87', // Purple-900
    border: 'A855F7',
    label: 'Vacaciones Aprobadas / Permiso / PTO'
  },
  fuchsia: {
    bg: 'F5D0FE',   // Fuchsia-200
    text: '701A75', // Fuchsia-900
    border: 'D946EF',
    label: 'Rutas Flex / Camión Extra'
  },
  amber: {
    bg: 'FDE68A',   // Amber-200
    text: '78350F', // Amber-900
    border: 'F59E0B',
    label: 'Suspendido por Seguridad (Netradyne / DVIC)'
  },
  orange: {
    bg: 'FED7AA',   // Orange-200
    text: '7C2D12', // Orange-900
    border: 'F97316',
    label: 'Entrenamiento / Sombra / Ride-along'
  },
  red: {
    bg: 'FECACA',   // Red-200
    text: '7F1D1D', // Red-900
    border: 'EF4444',
    label: 'Call Out (Falta reportada con aviso)'
  },
  rose: {
    bg: 'FECDD3',   // Rose-200
    text: '881337', // Rose-900
    border: 'F43F5E',
    label: 'No Call No Show (Falta sin aviso / NCNS)'
  },
  slate: {
    bg: 'F1F5F9',   // Slate-100
    text: '64748B', // Slate-500
    border: 'CBD5E1',
    label: 'Día Libre Programado (Off)'
  }
};

// Determina la paleta de colores de Excel para un comentario específico
export function getExcelPaletteForComment(
  comment?: string,
  options?: ScheduleCommentOption[]
): ExcelColorPalette {
  if (!comment || comment.trim() === '' || comment.trim().toLowerCase() === 'off') {
    return EXCEL_COLOR_PALETTES.slate;
  }

  const clean = comment.trim();
  const lower = clean.toLowerCase();

  // 1. Buscar coincidencia exacta en las opciones configuradas del despachador
  const found = options?.find((o) => o.label.toLowerCase() === lower);
  if (found?.colorId && EXCEL_COLOR_PALETTES[found.colorId]) {
    return EXCEL_COLOR_PALETTES[found.colorId];
  }

  // 2. Detección por palabras clave de seguridad y ausencias
  if (lower.includes('safety') || lower.includes('suspend') || lower.includes('seguridad')) {
    return EXCEL_COLOR_PALETTES.amber;
  }
  if (lower.includes('no call') || lower.includes('ncns')) {
    return EXCEL_COLOR_PALETTES.rose;
  }
  if (lower.includes('call out') || lower.includes('call-out')) {
    return EXCEL_COLOR_PALETTES.red;
  }
  if (lower.includes('rescue') || lower.includes('rescate')) {
    return EXCEL_COLOR_PALETTES.teal;
  }
  if (lower.includes('standby') || lower.includes('reserva')) {
    return EXCEL_COLOR_PALETTES.sky;
  }
  if (lower.includes('flex')) {
    return EXCEL_COLOR_PALETTES.fuchsia;
  }
  if (lower.includes('pto') || lower.includes('vacaci') || lower.includes('permiso')) {
    return EXCEL_COLOR_PALETTES.purple;
  }

  // 3. Si representa un turno de trabajo (ej. 9:15 AM, 8:45 AM, 10:00 AM)
  if (isWorkingShift(clean)) {
    return EXCEL_COLOR_PALETTES.emerald;
  }

  // Por defecto: Día Libre / Off
  return EXCEL_COLOR_PALETTES.slate;
}

// 1. Export Weekly Schedule to Excel con Colores y Comentarios Idénticos a la Aplicación
// "Cuando se descargue el horario en el botón de descargar horario, quiero que se descargue con los mismos colores que está asignado y con el mismo comentario."
export function exportScheduleToExcel(
  monday: Date,
  drivers: Driver[],
  schedule: DaySchedule[],
  dspName: string = 'Amazon DSP Operations',
  commentOptions?: ScheduleCommentOption[]
) {
  const weekDates = getWeekDates(monday);
  const weekLabel = formatWeekLabel(monday);

  const titleRow = [`${dspName} - PROGRAMACIÓN SEMANAL DE HORARIO (SCHEDULE)`];
  const subTitleRow = [
    `Período: ${weekLabel}  |  Generado: ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
  ];
  const emptyRow: string[] = [];

  const headers = [
    'Conductor',
    'Teléfono',
    'Antigüedad',
    ...weekDates.map((d, i) => `${DAY_NAMES_SHORT_ES[i]} ${d.getDate()}/${d.getMonth() + 1}`),
    'Total Días Trabaja'
  ];

  const dataRows: (string | number)[][] = [];
  const cellColorMatrix: ExcelColorPalette[][] = [];

  // Ordenar conductores alfabéticamente para una exportación organizada
  const sortedDrivers = [...drivers].sort((a, b) => a.name.localeCompare(b.name));
  const dailyTotals = [0, 0, 0, 0, 0, 0, 0];

  sortedDrivers.forEach((drv) => {
    const seniority = calculateSeniority(drv.hireDate, monday);
    let workDaysCount = 0;
    const rowColors: ExcelColorPalette[] = [];

    const daysStatus = weekDates.map((d, dayIndex) => {
      const iso = toIsoDate(d);
      const entry = schedule.find((s) => s.driverId === drv.id && s.date === iso);
      const cellText = entry?.comment || (entry?.status === 'Trabaja' ? '9:15 AM' : entry?.status || 'Off');
      const isWork = isWorkingShift(cellText);

      if (isWork) {
        workDaysCount++;
        dailyTotals[dayIndex]++;
      }

      // Obtener el color exacto asignado a este comentario
      const palette = getExcelPaletteForComment(cellText, commentOptions);
      rowColors.push(palette);

      return cellText;
    });

    cellColorMatrix.push(rowColors);

    dataRows.push([
      drv.name,
      drv.phone,
      seniority.label,
      ...daysStatus,
      workDaysCount
    ]);
  });

  const totalsRow = [
    'TOTAL CONDUCTORES ACTIVOS',
    '',
    '',
    ...dailyTotals.map((t) => `${t} Drivers`),
    dailyTotals.reduce((a, b) => a + b, 0)
  ];

  const aoa = [
    titleRow,
    subTitleRow,
    emptyRow,
    headers,
    ...dataRows,
    emptyRow,
    totalsRow
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Dimensiones de columnas (ancho para visualización clara de turnos)
  ws['!cols'] = [
    { wch: 26 }, // Conductor
    { wch: 16 }, // Teléfono
    { wch: 18 }, // Antigüedad
    { wch: 18 }, // Lun
    { wch: 18 }, // Mar
    { wch: 18 }, // Mié
    { wch: 18 }, // Jue
    { wch: 18 }, // Vie
    { wch: 18 }, // Sáb
    { wch: 18 }, // Dom
    { wch: 18 }  // Total Días
  ];

  // Alturas de filas
  const totalRowsCount = aoa.length;
  const rowHeights: { hpt: number }[] = [];
  rowHeights[0] = { hpt: 32 }; // Title
  rowHeights[1] = { hpt: 22 }; // Subtitle
  rowHeights[2] = { hpt: 10 }; // Empty
  rowHeights[3] = { hpt: 28 }; // Header
  for (let r = 4; r < 4 + sortedDrivers.length; r++) {
    rowHeights[r] = { hpt: 26 }; // Data rows
  }
  rowHeights[4 + sortedDrivers.length] = { hpt: 12 }; // Empty
  rowHeights[4 + sortedDrivers.length + 1] = { hpt: 30 }; // Totals
  ws['!rows'] = rowHeights;

  // Combinación de celdas (Merges)
  const totalsRowIdx = 4 + sortedDrivers.length + 1;
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }, // Título banner
    { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } }, // Subtítulo banner
    { s: { r: totalsRowIdx, c: 0 }, e: { r: totalsRowIdx, c: 2 } } // Conductor a Antigüedad en Totales
  ];

  // ESTILIZADO DE CELDAS CON xlsx-js-style

  // 1. Título Banner (Fila 0)
  const cellA1 = ws['A1'];
  if (cellA1) {
    cellA1.s = {
      fill: { fgColor: { rgb: '0F172A' } }, // Azul Marino Oscuro Amazon DSP
      font: { name: 'Calibri', sz: 14, bold: true, color: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    };
  }

  // 2. Subtítulo (Fila 1)
  const cellA2 = ws['A2'];
  if (cellA2) {
    cellA2.s = {
      fill: { fgColor: { rgb: '1E293B' } },
      font: { name: 'Calibri', sz: 10, italic: true, color: { rgb: '94A3B8' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    };
  }

  // 3. Encabezados de Tabla (Fila 3 / Índice 3)
  for (let c = 0; c <= 10; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: 3, c });
    if (ws[cellRef]) {
      ws[cellRef].s = {
        fill: { fgColor: { rgb: '1E293B' } }, // Fondo oscuro elegante
        font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'F8FAFC' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: '334155' } },
          bottom: { style: 'medium', color: { rgb: '0F172A' } },
          left: { style: 'thin', color: { rgb: '334155' } },
          right: { style: 'thin', color: { rgb: '334155' } }
        }
      };
    }
  }

  // 4. Filas de Datos de Conductores (Fila 4 a 4 + drivers - 1)
  // Cada celda de día recibe el COLOR EXACTO y el COMENTARIO EXACTO asignado
  sortedDrivers.forEach((_, drvIdx) => {
    const r = 4 + drvIdx;
    const isEven = drvIdx % 2 === 0;
    const baseRowBg = isEven ? 'FFFFFF' : 'F8FAFC';

    // Columna 0: Conductor
    const refDrv = XLSX.utils.encode_cell({ r, c: 0 });
    if (ws[refDrv]) {
      ws[refDrv].s = {
        fill: { fgColor: { rgb: baseRowBg } },
        font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '0F172A' } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'E2E8F0' } },
          bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
          left: { style: 'thin', color: { rgb: 'CBD5E1' } },
          right: { style: 'thin', color: { rgb: 'E2E8F0' } }
        }
      };
    }

    // Columna 1: Teléfono
    const refPhone = XLSX.utils.encode_cell({ r, c: 1 });
    if (ws[refPhone]) {
      ws[refPhone].s = {
        fill: { fgColor: { rgb: baseRowBg } },
        font: { name: 'Calibri', sz: 9, color: { rgb: '475569' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'E2E8F0' } },
          bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
          left: { style: 'thin', color: { rgb: 'E2E8F0' } },
          right: { style: 'thin', color: { rgb: 'E2E8F0' } }
        }
      };
    }

    // Columna 2: Antigüedad
    const refSen = XLSX.utils.encode_cell({ r, c: 2 });
    if (ws[refSen]) {
      ws[refSen].s = {
        fill: { fgColor: { rgb: baseRowBg } },
        font: { name: 'Calibri', sz: 9, italic: true, color: { rgb: '334155' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'E2E8F0' } },
          bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
          left: { style: 'thin', color: { rgb: 'E2E8F0' } },
          right: { style: 'thin', color: { rgb: 'CBD5E1' } }
        }
      };
    }

    // Columnas 3 a 9: CELDAS DE DÍAS (LUNES A DOMINGO)
    // Con los mismos colores asignados (fondo, texto, borde)
    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const c = 3 + dayIdx;
      const refDay = XLSX.utils.encode_cell({ r, c });
      const palette = cellColorMatrix[drvIdx][dayIdx];

      if (ws[refDay]) {
        ws[refDay].s = {
          fill: { fgColor: { rgb: palette.bg } },
          font: {
            name: 'Calibri',
            sz: 10,
            bold: true,
            color: { rgb: palette.text }
          },
          alignment: {
            horizontal: 'center',
            vertical: 'center',
            wrapText: true
          },
          border: {
            top: { style: 'thin', color: { rgb: palette.border } },
            bottom: { style: 'thin', color: { rgb: palette.border } },
            left: { style: 'thin', color: { rgb: palette.border } },
            right: { style: 'thin', color: { rgb: palette.border } }
          }
        };
      }
    }

    // Columna 10: Total Días Trabaja
    const refTotal = XLSX.utils.encode_cell({ r, c: 10 });
    if (ws[refTotal]) {
      ws[refTotal].s = {
        fill: { fgColor: { rgb: 'ECFDF5' } }, // Suave esmeralda
        font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '065F46' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'A7F3D0' } },
          bottom: { style: 'thin', color: { rgb: 'A7F3D0' } },
          left: { style: 'thin', color: { rgb: 'CBD5E1' } },
          right: { style: 'thin', color: { rgb: '10B981' } }
        }
      };
    }
  });

  // 5. Fila de Totales de Conductores Activos
  const refTotalTitle = XLSX.utils.encode_cell({ r: totalsRowIdx, c: 0 });
  if (ws[refTotalTitle]) {
    ws[refTotalTitle].s = {
      fill: { fgColor: { rgb: '0F172A' } },
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FBBF24' } }, // Texto Dorado / Ámbar
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'medium', color: { rgb: '0F172A' } },
        bottom: { style: 'medium', color: { rgb: '0F172A' } },
        left: { style: 'thin', color: { rgb: '334155' } },
        right: { style: 'thin', color: { rgb: '334155' } }
      }
    };
  }

  // Totales de cada día (Columnas 3 a 9)
  for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
    const c = 3 + dayIdx;
    const refDayTotal = XLSX.utils.encode_cell({ r: totalsRowIdx, c });
    if (ws[refDayTotal]) {
      ws[refDayTotal].s = {
        fill: { fgColor: { rgb: '0F172A' } },
        font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: 'FBBF24' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'medium', color: { rgb: '0F172A' } },
          bottom: { style: 'medium', color: { rgb: '0F172A' } },
          left: { style: 'thin', color: { rgb: '334155' } },
          right: { style: 'thin', color: { rgb: '334155' } }
        }
      };
    }
  }

  // Total acumulado final (Columna 10)
  const refGrandTotal = XLSX.utils.encode_cell({ r: totalsRowIdx, c: 10 });
  if (ws[refGrandTotal]) {
    ws[refGrandTotal].s = {
      fill: { fgColor: { rgb: 'F59E0B' } }, // Ámbar dorado destacado
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '0F172A' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'medium', color: { rgb: 'D97706' } },
        bottom: { style: 'medium', color: { rgb: 'D97706' } },
        left: { style: 'medium', color: { rgb: 'D97706' } },
        right: { style: 'medium', color: { rgb: 'D97706' } }
      }
    };
  }

  // HOJA 2: LEYENDA Y GUÍA DE COLORES
  const legendAoa = [
    [`${dspName} - GUÍA DE COLORES Y ESTADOS DEL SCHEDULE`],
    ['Código de Color', 'Estado / Comentario', 'Tipo', 'Descripción Operativa'],
    ['Verde Esmeralda', '9:15 AM / 8:45 AM', 'Trabaja', 'Turnos Regulares Activos de Onda'],
    ['Teal / Turquesa', 'Rescue / 10:00 AM', 'Trabaja', 'Turno de Rescate / Barredor'],
    ['Azul Claro (Sky)', 'Standby / Backup', 'Trabaja', 'Conductor de Reserva en Estación'],
    ['Fucsia / Magenta', 'Flex / Extra', 'Trabaja', 'Rutas de apoyo Flex y Camiones Extra'],
    ['Ámbar / Naranja', 'Suspend Safety', 'No Trabaja', 'Suspensión por Seguridad (Netradyne / DVIC)'],
    ['Rojo', 'Call Out', 'Ausencia', 'Falta avisada con anticipación'],
    ['Rosa Fuerte', 'No Call No Show', 'Ausencia', 'Falta injustificada sin previo aviso'],
    ['Púrpura', 'Vacaciones / PTO', 'Permiso', 'Vacaciones Aprobadas o Permiso Pagado'],
    ['Gris (Slate)', 'Off', 'Día Libre', 'Día Libre Programado']
  ];

  const wsLegend = XLSX.utils.aoa_to_sheet(legendAoa);
  wsLegend['!cols'] = [
    { wch: 20 },
    { wch: 24 },
    { wch: 14 },
    { wch: 45 }
  ];

  // Estilizar hoja de leyenda
  const legendA1 = wsLegend['A1'];
  if (legendA1) {
    legendA1.s = {
      fill: { fgColor: { rgb: '0F172A' } },
      font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'left', vertical: 'center' }
    };
  }

  // Encabezados de leyenda
  for (let c = 0; c < 4; c++) {
    const ref = XLSX.utils.encode_cell({ r: 1, c });
    if (wsLegend[ref]) {
      wsLegend[ref].s = {
        fill: { fgColor: { rgb: '1E293B' } },
        font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: 'F8FAFC' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
    }
  }

  // Filas de leyenda con sus colores reales
  const legendPalettes = [
    EXCEL_COLOR_PALETTES.emerald,
    EXCEL_COLOR_PALETTES.teal,
    EXCEL_COLOR_PALETTES.sky,
    EXCEL_COLOR_PALETTES.fuchsia,
    EXCEL_COLOR_PALETTES.amber,
    EXCEL_COLOR_PALETTES.red,
    EXCEL_COLOR_PALETTES.rose,
    EXCEL_COLOR_PALETTES.purple,
    EXCEL_COLOR_PALETTES.slate
  ];

  legendPalettes.forEach((pal, idx) => {
    const r = 2 + idx;
    const refCol0 = XLSX.utils.encode_cell({ r, c: 0 });
    const refCol1 = XLSX.utils.encode_cell({ r, c: 1 });
    if (wsLegend[refCol0]) {
      wsLegend[refCol0].s = {
        fill: { fgColor: { rgb: pal.bg } },
        font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: pal.text } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: pal.border } },
          bottom: { style: 'thin', color: { rgb: pal.border } },
          left: { style: 'thin', color: { rgb: pal.border } },
          right: { style: 'thin', color: { rgb: pal.border } }
        }
      };
    }
    if (wsLegend[refCol1]) {
      wsLegend[refCol1].s = {
        fill: { fgColor: { rgb: pal.bg } },
        font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: pal.text } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: pal.border } },
          bottom: { style: 'thin', color: { rgb: pal.border } },
          left: { style: 'thin', color: { rgb: pal.border } },
          right: { style: 'thin', color: { rgb: pal.border } }
        }
      };
    }
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Horario Semanal');
  XLSX.utils.book_append_sheet(wb, wsLegend, 'Guía de Colores');

  const filename = `DSP_Schedule_${toIsoDate(monday)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

// 2. Export Daily Truck Assignment & Lunch Table (con formato y estilos para impresión y verificación)
export function exportLunchReportToExcel(
  dateIso: string,
  assignments: DailyAssignment[],
  drivers: Driver[],
  dspName: string = 'Amazon DSP Operations'
) {
  const dateObj = new Date(dateIso + 'T12:00:00');
  const dateDisplay = `${DAY_NAMES_ES[(dateObj.getDay() + 6) % 7]} ${dateObj.getDate()} de ${dateObj.toLocaleString('es-ES', { month: 'long' })} de ${dateObj.getFullYear()}`;

  const titleRow = [`${dspName} - ASIGNACIÓN DIARIA Y CONTROL DE LUNCH / HORAS`];
  const infoRow = [`Fecha: ${dateDisplay}`, '', '', '', `Total Asignados: ${assignments.length}`];
  const noteRow = ['* Hoja de verificación para los conductores para ingresar sus horas en su App de Nómina / ADP.'];
  const emptyRow: string[] = [];

  const headers = [
    '#',
    'Conductor',
    'Estado / Rol',
    'Ruta / RQ',
    'Van / Camión',
    'Dispositivo',
    'Batería',
    'Clock In',
    'Lunch Start',
    'Lunch End',
    'Clock Out',
    'Horas Netas',
    'Notas / Incidencias',
    'Firma del Conductor'
  ];

  const driverMap = new Map(drivers.map((d) => [d.id, d]));

  const rows = assignments.map((asg, index) => {
    const drv = driverMap.get(asg.driverId);
    const net = calculateNetHours(asg.clockIn, asg.lunchStart, asg.lunchEnd, asg.clockOut);

    return [
      index + 1,
      drv ? drv.name : 'Desconocido',
      asg.status,
      asg.routeCode || '-',
      asg.vanNumber || 'Sin Van',
      asg.deviceNumber || 'Sin Tel',
      asg.batteryNumber || 'Sin Bat',
      asg.clockIn || '--:--',
      asg.lunchStart || '--:--',
      asg.lunchEnd || '--:--',
      asg.clockOut || '--:--',
      net.formatted,
      asg.comment || '',
      '__________________'
    ];
  });

  const aoa = [
    titleRow,
    infoRow,
    noteRow,
    emptyRow,
    headers,
    ...rows
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws['!cols'] = [
    { wch: 5 },  // #
    { wch: 24 }, // Conductor
    { wch: 14 }, // Estado
    { wch: 12 }, // Ruta
    { wch: 14 }, // Van
    { wch: 15 }, // Dispositivo
    { wch: 16 }, // Batería
    { wch: 12 }, // Clock In
    { wch: 12 }, // Lunch Start
    { wch: 12 }, // Lunch End
    { wch: 12 }, // Clock Out
    { wch: 14 }, // Horas Netas
    { wch: 26 }, // Notas
    { wch: 22 }  // Firma
  ];

  // Estilos
  const cellA1 = ws['A1'];
  if (cellA1) {
    cellA1.s = {
      fill: { fgColor: { rgb: '0F172A' } },
      font: { name: 'Calibri', sz: 14, bold: true, color: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    };
  }

  // Encabezados (Fila 4)
  for (let c = 0; c < headers.length; c++) {
    const ref = XLSX.utils.encode_cell({ r: 4, c });
    if (ws[ref]) {
      ws[ref].s = {
        fill: { fgColor: { rgb: '1E293B' } },
        font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: 'F8FAFC' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '334155' } },
          bottom: { style: 'medium', color: { rgb: '0F172A' } },
          left: { style: 'thin', color: { rgb: '334155' } },
          right: { style: 'thin', color: { rgb: '334155' } }
        }
      };
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Truck & Lunch Sheet');

  const filename = `DSP_Lunch_Assignment_${dateIso}.xlsx`;
  XLSX.writeFile(wb, filename);
}

// 3. Export Consolidated Weekly Timesheet & Payroll to Excel
export function exportTimesheetToExcel(
  monday: Date,
  drivers: Driver[],
  assignments: DailyAssignment[],
  dspName: string = 'Amazon DSP Operations'
) {
  const weekDates = getWeekDates(monday);
  const weekLabel = formatWeekLabel(monday);
  const driverMap = new Map(drivers.map((d) => [d.id, d]));

  // Sheet 1: Weekly Summary (Resumen Semanal por Conductor)
  const summaryTitle = [`${dspName} - REPORTE DE HORAS SEMANAL PARA NÓMINA (PAYROLL)`];
  const summarySub = [`Período: ${weekLabel}  |  Generado: ${new Date().toLocaleDateString('es-ES')}`];
  const emptyRow: string[] = [];

  const summaryHeaders = [
    'Conductor',
    'Teléfono',
    'Antigüedad',
    ...weekDates.map((d, i) => `${DAY_NAMES_SHORT_ES[i]} ${d.getDate()}/${d.getMonth() + 1}`),
    'Días Trab.',
    'Total Horas Netas',
    'Horas Regulares',
    'Overtime (>40h)'
  ];

  const sortedDrivers = [...drivers].sort((a, b) => a.name.localeCompare(b.name));
  const summaryRows: (string | number)[][] = [];

  let grandTotalHours = 0;
  let grandRegularHours = 0;
  let grandOvertimeHours = 0;

  sortedDrivers.forEach((drv) => {
    const seniority = calculateSeniority(drv.hireDate, monday);
    let totalWeekHours = 0;
    let daysWorked = 0;

    const dayHoursList = weekDates.map((d) => {
      const iso = toIsoDate(d);
      const asg = assignments.find((a) => a.driverId === drv.id && a.date === iso && a.status !== 'Call Out');
      if (asg && asg.clockIn) {
        const net = calculateNetHours(asg.clockIn, asg.lunchStart, asg.lunchEnd, asg.clockOut);
        if (net.decimalHours > 0) {
          totalWeekHours += net.decimalHours;
          daysWorked++;
          return net.formatted;
        }
      }
      return '-';
    });

    const regularHours = Math.min(40, totalWeekHours);
    const overtimeHours = Math.max(0, totalWeekHours - 40);

    grandTotalHours += totalWeekHours;
    grandRegularHours += regularHours;
    grandOvertimeHours += overtimeHours;

    summaryRows.push([
      drv.name,
      drv.phone,
      seniority.label,
      ...dayHoursList,
      daysWorked,
      `${totalWeekHours.toFixed(2)} hrs`,
      `${regularHours.toFixed(2)} hrs`,
      overtimeHours > 0 ? `${overtimeHours.toFixed(2)} hrs` : '-'
    ]);
  });

  const totalsRow = [
    'TOTAL GENERAL',
    '',
    '',
    ...weekDates.map(() => ''),
    '',
    `${grandTotalHours.toFixed(2)} hrs`,
    `${grandRegularHours.toFixed(2)} hrs`,
    `${grandOvertimeHours.toFixed(2)} hrs`
  ];

  const aoaSummary = [
    summaryTitle,
    summarySub,
    emptyRow,
    summaryHeaders,
    ...summaryRows,
    emptyRow,
    totalsRow
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(aoaSummary);
  wsSummary['!cols'] = [
    { wch: 24 }, // Conductor
    { wch: 16 }, // Teléfono
    { wch: 16 }, // Antigüedad
    ...weekDates.map(() => ({ wch: 12 })),
    { wch: 12 }, // Días Trab.
    { wch: 18 }, // Total Horas
    { wch: 16 }, // Regulares
    { wch: 16 }  // Overtime
  ];

  // Encabezados
  for (let c = 0; c < summaryHeaders.length; c++) {
    const ref = XLSX.utils.encode_cell({ r: 3, c });
    if (wsSummary[ref]) {
      wsSummary[ref].s = {
        fill: { fgColor: { rgb: '1E293B' } },
        font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: 'F8FAFC' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
    }
  }

  // Sheet 2: Daily Detailed Punches (Detalle diario de marcas)
  const detailHeaders = [
    'Fecha',
    'Día',
    'Conductor',
    'Estado',
    'Clock In',
    'Lunch Start',
    'Lunch End',
    'Minutos Lunch',
    'Clock Out',
    'Horas Netas',
    'Comentarios'
  ];

  const detailRows: (string | number)[][] = [];

  weekDates.forEach((d, dayIndex) => {
    const iso = toIsoDate(d);
    const dayAsgs = assignments.filter((a) => a.date === iso);

    dayAsgs.forEach((asg) => {
      const drv = driverMap.get(asg.driverId);
      const net = calculateNetHours(asg.clockIn, asg.lunchStart, asg.lunchEnd, asg.clockOut);
      const lunchMin = asg.lunchStart && asg.lunchEnd
        ? `${Math.max(0, (new Date(`2000-01-01T${asg.lunchEnd}`).getTime() - new Date(`2000-01-01T${asg.lunchStart}`).getTime()) / 60000)} min`
        : '-';

      detailRows.push([
        iso,
        DAY_NAMES_ES[dayIndex],
        drv ? drv.name : 'Desconocido',
        asg.status,
        asg.clockIn || '--:--',
        asg.lunchStart || '--:--',
        asg.lunchEnd || '--:--',
        lunchMin,
        asg.clockOut || '--:--',
        net.formatted,
        asg.comment || ''
      ]);
    });
  });

  const wsDetail = XLSX.utils.aoa_to_sheet([
    [`${dspName} - DETALLE DE PUNCHES Y MARCAS DIARIAS`],
    [`Período: ${weekLabel}`],
    emptyRow,
    detailHeaders,
    ...detailRows
  ]);

  wsDetail['!cols'] = [
    { wch: 14 }, // Fecha
    { wch: 12 }, // Día
    { wch: 24 }, // Conductor
    { wch: 12 }, // Estado
    { wch: 12 }, // Clock In
    { wch: 12 }, // Lunch Start
    { wch: 12 }, // Lunch End
    { wch: 14 }, // Minutos Lunch
    { wch: 12 }, // Clock Out
    { wch: 14 }, // Horas Netas
    { wch: 28 }  // Comentarios
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen Nómina');
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Detalle Punches');

  const filename = `DSP_Timesheet_Payroll_${toIsoDate(monday)}.xlsx`;
  XLSX.writeFile(wb, filename);
}
