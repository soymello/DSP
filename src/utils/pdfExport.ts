import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DailyAssignment, Driver } from '../types';
import { calculateNetHours, DAY_NAMES_ES } from './dateUtils';

export interface FinalDayReportData {
  dateIso: string;
  assignments: DailyAssignment[];
  drivers: Driver[];
  dspName: string;
  stationCode: string;
  metrics?: {
    totalAssigned: number;
    activeDrivers: number;
    rqCount: number;
    flexCount: number;
    rescueCount: number;
    extraTruckCount: number;
    callOuts: number;
    totalPackages: number;
    cxPackages: number;
    flexPackages: number;
    spr: number;
    sprCx: number;
    sprFlex: number;
  };
}

export function exportFinalDayPdf(data: FinalDayReportData): void {
  const { dateIso, assignments, drivers, dspName, stationCode, metrics } = data;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'letter'
  });

  const driverMap = new Map(drivers.map(d => [d.id, d]));
  const dateObj = new Date(dateIso + 'T12:00:00');
  const dayName = DAY_NAMES_ES[(dateObj.getDay() + 6) % 7] || '';
  const dateFormatted = `${dayName} ${dateObj.getDate()} de ${dateObj.toLocaleString('es-ES', { month: 'long' })} de ${dateObj.getFullYear()}`;
  const genTime = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 792, 60, 'F');

  // Accent line
  doc.setFillColor(245, 158, 11); // amber-500
  doc.rect(0, 60, 792, 3, 'F');

  // Title & DSP Info
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${dspName.toUpperCase()} • CIERRE FINAL DEL DÍA (TRUCK ASSIGNMENT)`, 36, 28);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(226, 232, 240);
  doc.text(`Estación: ${stationCode || 'Amazon DFL4'}  |  Fecha: ${dateFormatted} (${dateIso})  |  Generado: ${genTime}`, 36, 46);

  // Operational Metrics Summary Box
  if (metrics) {
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.rect(36, 72, 720, 36, 'FD');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);

    const mText1 = `Drivers Totales: ${metrics.totalAssigned}  |  Activos: ${metrics.activeDrivers}  |  Rutas CX: ${metrics.rqCount}  |  Rutas Flex: ${metrics.flexCount}  |  Rescues/Extras: ${metrics.rescueCount + metrics.extraTruckCount}  |  Call Outs: ${metrics.callOuts}`;
    const mText2 = `Paquetes Totales: ${metrics.totalPackages.toLocaleString()} (CX: ${metrics.cxPackages.toLocaleString()} • Flex: ${metrics.flexPackages.toLocaleString()})  |  SPR Promedio: ${metrics.spr}  |  SPR CX: ${metrics.sprCx}  |  SPR Flex: ${metrics.sprFlex}`;

    doc.text(mText1, 46, 86);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(mText2, 46, 100);
  }

  // Prepare table data
  const sortedAssignments = [...assignments].sort((a, b) => {
    const nameA = driverMap.get(a.driverId)?.name || '';
    const nameB = driverMap.get(b.driverId)?.name || '';
    return nameA.localeCompare(nameB);
  });

  const tableBody = sortedAssignments.map((asg, index) => {
    const driver = driverMap.get(asg.driverId);
    const net = calculateNetHours(asg.clockIn, asg.lunchStart, asg.lunchEnd, asg.clockOut);

    return [
      String(index + 1),
      driver?.name || 'Conductor',
      asg.comment || '--',
      asg.routeCode || '--',
      asg.vanNumber || '--',
      asg.deviceNumber || '--',
      asg.batteryNumber || '--',
      asg.clockIn || '--',
      asg.lunchStart || '--',
      asg.lunchEnd || '--',
      asg.clockOut || '--',
      net.formatted || '--'
    ];
  });

  const startY = metrics ? 116 : 76;

  autoTable(doc, {
    startY,
    head: [[
      '#',
      'Conductor',
      'Comentario',
      'Ruta',
      'Van',
      'Dispositivo',
      'Powerbank',
      'Clock In',
      'Lunch In',
      'Lunch Out',
      'Clock Out',
      'Netas'
    ]],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [248, 250, 252],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      cellPadding: 4
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 3.5,
      valign: 'middle'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center' },
      1: { cellWidth: 140, halign: 'left', fontStyle: 'bold' },
      2: { cellWidth: 85, halign: 'center' },
      3: { cellWidth: 45, halign: 'center' },
      4: { cellWidth: 45, halign: 'center' },
      5: { cellWidth: 45, halign: 'center' },
      6: { cellWidth: 50, halign: 'center' },
      7: { cellWidth: 50, halign: 'center' },
      8: { cellWidth: 50, halign: 'center' },
      9: { cellWidth: 50, halign: 'center' },
      10: { cellWidth: 50, halign: 'center' },
      11: { cellWidth: 45, halign: 'center', fontStyle: 'bold', textColor: [5, 150, 105] }
    },
    margin: { left: 36, right: 36, bottom: 30 },
    didDrawPage: (dataHook) => {
      // Footer page numbering
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Documento Oficial de Cierre Diario • ${dspName} • Página ${dataHook.pageNumber} de ${pageCount}`,
        36,
        590
      );
    }
  });

  // Save PDF file with clear date in filename
  doc.save(`TruckAssignment_FinalDelDia_${dateIso}_${dspName.replace(/\s+/g, '_')}.pdf`);
}
