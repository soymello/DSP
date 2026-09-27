import XLSX from 'xlsx-js-style';

export interface ParsedDriverRow {
  name: string;
  phone: string;
  email: string;
  hireDate?: string;
  notes?: string;
}

export interface ParseResult {
  success: boolean;
  totalRows: number;
  validDrivers: ParsedDriverRow[];
  errors: string[];
  detectedColumns: {
    nameCol?: string;
    phoneCol?: string;
    emailCol?: string;
    hireDateCol?: string;
  };
}

// Normaliza texto para comparación de encabezados (sin acentos, minúsculas, sin espacios extra)
function normalizeHeader(str: string): string {
  return (str || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// Convierte fechas de Excel (número serial o string) a YYYY-MM-DD
function formatHireDate(val: any): string {
  if (!val) return new Date().toISOString().split('T')[0];

  // Número serial de Excel (ej. 44561)
  if (typeof val === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + val * 86400000);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  const str = String(val).trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // MM/DD/YYYY o DD/MM/YYYY
  const slashParts = str.split('/');
  if (slashParts.length === 3) {
    let [p1, p2, p3] = slashParts;
    if (p3.length === 2) p3 = '20' + p3;
    // Si p1 > 12, es DD/MM/YYYY
    const num1 = parseInt(p1, 10);
    const num2 = parseInt(p2, 10);
    if (num1 > 12) {
      return `${p3}-${String(num2).padStart(2, '0')}-${String(num1).padStart(2, '0')}`;
    }
    return `${p3}-${String(num1).padStart(2, '0')}-${String(num2).padStart(2, '0')}`;
  }

  // YYYY/MM/DD
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(str)) {
    return str.replace(/\//g, '-');
  }

  return new Date().toISOString().split('T')[0];
}

// Limpia y formatea números de teléfono
function cleanPhone(val: any): string {
  if (!val) return '';
  const str = String(val).trim();
  const digits = str.replace(/\D/g, '');

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  return str;
}

// Analiza archivo CSV o Excel y extrae Nombre, Teléfono y Correo Electrónico
export async function parseDriversFile(file: File): Promise<ParseResult> {
  const errors: string[] = [];

  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return {
        success: false,
        totalRows: 0,
        validDrivers: [],
        errors: ['El archivo no contiene hojas de datos.'],
        detectedColumns: {}
      };
    }

    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const rawData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });

    if (!rawData || rawData.length === 0) {
      return {
        success: false,
        totalRows: 0,
        validDrivers: [],
        errors: ['La hoja de cálculo está vacía.'],
        detectedColumns: {}
      };
    }

    // Encontrar la fila de encabezados (buscar en las primeras 5 filas)
    let headerRowIndex = -1;
    let nameColIndex = -1;
    let firstNameColIndex = -1;
    let lastNameColIndex = -1;
    let phoneColIndex = -1;
    let emailColIndex = -1;
    let hireDateColIndex = -1;
    let notesColIndex = -1;

    for (let r = 0; r < Math.min(5, rawData.length); r++) {
      const row = rawData[r];
      if (!Array.isArray(row)) continue;

      row.forEach((cellVal, colIdx) => {
        const norm = normalizeHeader(cellVal);

        // Nombre
        if (
          norm === 'nombre' ||
          norm === 'name' ||
          norm === 'conductor' ||
          norm === 'driver' ||
          norm === 'nombrecompleto' ||
          norm === 'fullname' ||
          norm === 'empleado' ||
          norm === 'employee' ||
          norm === 'drivername' ||
          norm === 'nombredelconductor'
        ) {
          nameColIndex = colIdx;
          headerRowIndex = r;
        }

        // Primer nombre / Apellido divididos
        if (norm === 'firstname' || norm === 'primernombre' || norm === 'nombres') {
          firstNameColIndex = colIdx;
          headerRowIndex = r;
        }
        if (norm === 'lastname' || norm === 'apellido' || norm === 'apellidos') {
          lastNameColIndex = colIdx;
          headerRowIndex = r;
        }

        // Teléfono
        if (
          norm.includes('telefono') ||
          norm.includes('phone') ||
          norm.includes('celular') ||
          norm.includes('mobile') ||
          norm.includes('movil') ||
          norm === 'tel' ||
          norm === 'cell' ||
          norm.includes('contacto') ||
          norm.includes('phonenumber')
        ) {
          phoneColIndex = colIdx;
          headerRowIndex = r;
        }

        // Correo Electrónico
        if (
          norm.includes('email') ||
          norm.includes('correo') ||
          norm.includes('mail') ||
          norm === 'correoelectronico' ||
          norm === 'emailaddress' ||
          norm === 'e' ||
          norm === 'correoep'
        ) {
          emailColIndex = colIdx;
          headerRowIndex = r;
        }

        // Fecha de ingreso / Hire Date
        if (
          norm.includes('hiredate') ||
          norm.includes('fechacontratacion') ||
          norm.includes('fechaingreso') ||
          norm.includes('fechainicio') ||
          norm.includes('startdate') ||
          norm === 'fecha' ||
          norm.includes('antiguedad')
        ) {
          hireDateColIndex = colIdx;
        }

        // Notas
        if (
          norm.includes('nota') ||
          norm.includes('notes') ||
          norm.includes('certificacion') ||
          norm.includes('observacion') ||
          norm.includes('comentario')
        ) {
          notesColIndex = colIdx;
        }
      });

      if (nameColIndex !== -1 || (firstNameColIndex !== -1 && lastNameColIndex !== -1)) {
        break;
      }
    }

    // Si no se detectó por encabezados, usar heurística posicional
    if (headerRowIndex === -1) {
      headerRowIndex = 0;
      nameColIndex = 0;
      phoneColIndex = 1;
      emailColIndex = 2;
    }

    const detectedHeaders = rawData[headerRowIndex] || [];
    const validDrivers: ParsedDriverRow[] = [];

    // Procesar filas de datos (a partir de la fila siguiente al encabezado)
    for (let r = headerRowIndex + 1; r < rawData.length; r++) {
      const row = rawData[r];
      if (!Array.isArray(row) || row.length === 0) continue;

      let name = '';
      if (nameColIndex !== -1 && row[nameColIndex]) {
        name = String(row[nameColIndex]).trim();
      } else if (firstNameColIndex !== -1 && lastNameColIndex !== -1) {
        const fn = String(row[firstNameColIndex] || '').trim();
        const ln = String(row[lastNameColIndex] || '').trim();
        name = `${fn} ${ln}`.trim();
      }

      const phone = phoneColIndex !== -1 ? cleanPhone(row[phoneColIndex]) : '';
      let email = emailColIndex !== -1 ? String(row[emailColIndex] || '').trim().toLowerCase() : '';

      // Si por alguna razón la columna de email no fue detectada, buscar cualquier celda que contenga '@'
      if (!email) {
        for (let c = 0; c < row.length; c++) {
          const val = String(row[c] || '').trim();
          if (val.includes('@') && val.includes('.')) {
            email = val.toLowerCase();
            break;
          }
        }
      }

      // Si la columna de teléfono no fue detectada, buscar cualquier celda con formato de teléfono
      let resolvedPhone = phone;
      if (!resolvedPhone) {
        for (let c = 0; c < row.length; c++) {
          if (c === nameColIndex) continue;
          const val = String(row[c] || '').trim();
          const digits = val.replace(/\D/g, '');
          if (digits.length >= 10 && digits.length <= 11) {
            resolvedPhone = cleanPhone(val);
            break;
          }
        }
      }

      const hireDate = hireDateColIndex !== -1 ? formatHireDate(row[hireDateColIndex]) : undefined;
      const notes = notesColIndex !== -1 && row[notesColIndex] ? String(row[notesColIndex]).trim() : undefined;

      // Descartar filas completamente vacías o títulos accidentales
      if (!name && !resolvedPhone && !email) continue;
      if (!name && resolvedPhone) {
        name = `Conductor ${resolvedPhone.slice(-4)}`;
      }

      if (name) {
        validDrivers.push({
          name,
          phone: resolvedPhone,
          email,
          hireDate,
          notes
        });
      }
    }

    if (validDrivers.length === 0) {
      errors.push('No se pudieron encontrar registros de conductores válidos en el archivo.');
    }

    return {
      success: validDrivers.length > 0,
      totalRows: validDrivers.length,
      validDrivers,
      errors,
      detectedColumns: {
        nameCol: nameColIndex !== -1 ? String(detectedHeaders[nameColIndex] || 'Nombre') : undefined,
        phoneCol: phoneColIndex !== -1 ? String(detectedHeaders[phoneColIndex] || 'Teléfono') : undefined,
        emailCol: emailColIndex !== -1 ? String(detectedHeaders[emailColIndex] || 'Correo') : undefined,
        hireDateCol: hireDateColIndex !== -1 ? String(detectedHeaders[hireDateColIndex] || 'Fecha') : undefined
      }
    };
  } catch (err: any) {
    return {
      success: false,
      totalRows: 0,
      validDrivers: [],
      errors: [`Error al procesar el archivo: ${err?.message || 'Formato no soportado'}`],
      detectedColumns: {}
    };
  }
}

// Descargar plantilla CSV de ejemplo para facilitar la carga al usuario
export function downloadDriverCsvTemplate() {
  const csvContent =
    'Nombre,Número de Teléfono,Correo Electrónico,Fecha de Contratación,Notas\n' +
    'Carlos Rodriguez,(786) 555-0101,carlos.rodriguez@example.com,2024-02-15,Step Van Certified\n' +
    'Maria Lopez,(305) 555-0102,maria.lopez@example.com,2023-08-10,Top Performer\n' +
    'David Fernandez,(786) 555-0103,david.fernandez@example.com,2025-01-20,EV Certified\n' +
    'Andrea Morales,(305) 555-0104,andrea.morales@example.com,2024-06-01,Rescue Specialist\n';

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'Plantilla_Conductores_DSP.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
