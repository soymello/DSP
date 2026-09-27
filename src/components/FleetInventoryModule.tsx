import React, { useState, useMemo, useRef } from 'react';
import {
  Users,
  Truck,
  Smartphone,
  BatteryCharging,
  Plus,
  Trash2,
  Edit2,
  Check,
  Search,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Clock,
  Sparkles,
  Upload,
  Download,
  FileSpreadsheet,
  Mail,
  X,
  UserCheck,
  UserPlus,
  ChevronDown
} from 'lucide-react';
import { Battery, Device, Driver, Vehicle, VehicleStatus, VehicleType } from '../types';
import { calculateSeniority } from '../utils/dateUtils';
import {
  downloadDriverCsvTemplate,
  parseDriversFile,
  ParsedDriverRow,
  ParseResult
} from '../utils/csvDriverParser';

interface FleetInventoryModuleProps {
  drivers: Driver[];
  vehicles: Vehicle[];
  devices: Device[];
  batteries: Battery[];
  onAddDriver: (driver: Omit<Driver, 'id'>) => void;
  onUpdateDriver: (driver: Driver) => void;
  onDeleteDriver: (id: string) => void;
  onBulkImportDrivers?: (
    imported: Array<{
      name: string;
      phone?: string;
      email?: string;
      hireDate?: string;
      notes?: string;
    }>
  ) => { addedCount: number; updatedCount: number };
  onAddVehicle: (vehicle: Omit<Vehicle, 'id'>) => void;
  onUpdateVehicle: (vehicle: Vehicle) => void;
  onDeleteVehicle: (id: string) => void;
  onAddDevice: (device: Omit<Device, 'id'>) => void;
  onUpdateDevice: (device: Device) => void;
  onDeleteDevice: (id: string) => void;
  onAddBattery: (battery: Omit<Battery, 'id'>) => void;
  onUpdateBattery: (battery: Battery) => void;
  onDeleteBattery: (id: string) => void;
}

type TabType = 'drivers' | 'vehicles' | 'devices' | 'batteries';

export const FleetInventoryModule: React.FC<FleetInventoryModuleProps> = ({
  drivers,
  vehicles,
  devices,
  batteries,
  onAddDriver,
  onUpdateDriver,
  onDeleteDriver,
  onBulkImportDrivers,
  onAddVehicle,
  onUpdateVehicle,
  onDeleteVehicle,
  onAddDevice,
  onUpdateDevice,
  onDeleteDevice,
  onAddBattery,
  onUpdateBattery,
  onDeleteBattery
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('drivers');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeVehicleDropdownId, setActiveVehicleDropdownId] = useState<string | null>(null);

  // CSV / Excel File Import States
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    fileName: string;
    parseResult: ParseResult;
    newCount: number;
    updateCount: number;
  } | null>(null);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  // Edit Driver Modal State
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  // Form states
  // 1. Driver form
  const [driverForm, setDriverForm] = useState({
    name: '',
    phone: '',
    email: '',
    hireDate: '2026-01-15',
    notes: ''
  });

  // 2. Vehicle form (Categoría: Step Van, Custom Van, Camión, EV - Eléctrico, Auto Rentado)
  const [vehicleForm, setVehicleForm] = useState<{
    number: string;
    type: VehicleType;
    vin: string;
    licensePlate: string;
    status: VehicleStatus;
  }>({
    number: '',
    type: 'Step Van',
    vin: '',
    licensePlate: '',
    status: 'Operativo'
  });

  // 3. Device form
  const [deviceForm, setDeviceForm] = useState<{
    number: string;
    serial: string;
    model: string;
    status: 'Operativo' | 'En Reparación' | 'Perdido';
  }>({
    number: '',
    serial: '',
    model: 'Zebra TC57x',
    status: 'Operativo'
  });

  // 4. Battery form
  const [batteryForm, setBatteryForm] = useState<{
    code: string;
    capacity: string;
    status: 'Operativo' | 'Baja';
  }>({
    code: '',
    capacity: '20,000 mAh',
    status: 'Operativo'
  });

  // Submits
  const handleDriverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverForm.name.trim()) return;
    onAddDriver({
      name: driverForm.name.trim(),
      phone: driverForm.phone.trim() || 'Sin teléfono',
      email: driverForm.email.trim(),
      hireDate: driverForm.hireDate,
      active: true,
      notes: driverForm.notes.trim()
    });
    setDriverForm({
      name: '',
      phone: '',
      email: '',
      hireDate: '2026-01-15',
      notes: ''
    });
  };

  // Manejo de Carga de Archivo CSV / Excel
  // "Quiero añadir un botón donde se registran los conductores para cargar un archivo de base de datos CVS.
  // La información que tiene es el nombre, número de teléfono y correo electrónico.
  // Cuando yo cargue ese documento Excel, ahí automáticamente se actualice y reconozca la información y la añada a todos los conductores."
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setImportFeedback(null);

    try {
      const result = await parseDriversFile(file);

      if (!result.success || result.validDrivers.length === 0) {
        setImportFeedback(
          result.errors.length > 0
            ? result.errors.join(' ')
            : 'No se encontraron conductores válidos en el archivo.'
        );
        setIsProcessingFile(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // Calcular cuántos son nuevos vs existentes a actualizar
      let newCount = 0;
      let updateCount = 0;

      result.validDrivers.forEach((item) => {
        const cleanName = item.name.toLowerCase().trim();
        const cleanPhone = (item.phone || '').replace(/\D/g, '');
        const cleanEmail = (item.email || '').trim().toLowerCase();

        const exists = drivers.some((d) => {
          const sameName = d.name.toLowerCase().trim() === cleanName;
          const samePhone =
            cleanPhone.length >= 7 &&
            (d.phone || '').replace(/\D/g, '').length >= 7 &&
            (d.phone || '').replace(/\D/g, '') === cleanPhone;
          const sameEmail = cleanEmail && d.email && d.email.toLowerCase().trim() === cleanEmail;
          return sameName || samePhone || sameEmail;
        });

        if (exists) updateCount++;
        else newCount++;
      });

      setImportPreview({
        fileName: file.name,
        parseResult: result,
        newCount,
        updateCount
      });
    } catch (err: any) {
      setImportFeedback(`Error al procesar el archivo: ${err?.message || 'Error desconocido'}`);
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = () => {
    if (!importPreview || !onBulkImportDrivers) return;
    onBulkImportDrivers(importPreview.parseResult.validDrivers);
    setImportPreview(null);
  };

  const handleSaveEditedDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver) return;
    onUpdateDriver(editingDriver);
    setEditingDriver(null);
  };

  const handleVehicleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleForm.number.trim()) return;
    onAddVehicle({
      number: vehicleForm.number.trim(),
      type: vehicleForm.type,
      vin: vehicleForm.vin.trim().toUpperCase(),
      licensePlate: vehicleForm.licensePlate.trim().toUpperCase(),
      status: vehicleForm.status
    });
    setVehicleForm({
      number: '',
      type: 'Step Van',
      vin: '',
      licensePlate: '',
      status: 'Operativo'
    });
  };

  const handleDeviceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceForm.number.trim()) return;
    onAddDevice({
      number: deviceForm.number.trim(),
      serial: deviceForm.serial.trim().toUpperCase(),
      model: deviceForm.model.trim(),
      status: deviceForm.status
    });
    setDeviceForm({
      number: '',
      serial: '',
      model: 'Zebra TC57x',
      status: 'Operativo'
    });
  };

  const handleBatterySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batteryForm.code.trim()) return;
    onAddBattery({
      code: batteryForm.code.trim(),
      capacity: batteryForm.capacity.trim(),
      status: batteryForm.status
    });
    setBatteryForm({
      code: '',
      capacity: '20,000 mAh',
      status: 'Operativo'
    });
  };

  // Filtered lists
  const filteredDrivers = useMemo(() => {
    return drivers.filter(d =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.phone.includes(searchQuery)
    );
  }, [drivers, searchQuery]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v =>
      v.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.vin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.type.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [vehicles, searchQuery]);

  const filteredDevices = useMemo(() => {
    return devices.filter(d =>
      d.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.serial.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [devices, searchQuery]);

  const filteredBatteries = useMemo(() => {
    return batteries.filter(b =>
      b.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [batteries, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Sub-navigation tabs for Fleet & Inventory */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-2 shadow-md">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('drivers')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'drivers'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Directorio de Conductores ({drivers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('vehicles')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'vehicles'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Inventario de Vans / Camiones ({vehicles.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('devices')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'devices'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Teléfonos / Dispositivos ({devices.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('batteries')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'batteries'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BatteryCharging className="w-4 h-4" />
            <span>Baterías / Powerbanks ({batteries.length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar en el inventario..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 w-44 sm:w-56"
          />
        </div>
      </div>

      {/* 1. SECCIÓN: DIRECTORIO DE CONDUCTORES */}
      {/* "Quiero añadir un botón donde se registran los conductores para cargar un archivo de base de datos CVS.
          La información que tiene es el nombre, número de teléfono y correo electrónico.
          Cuando yo cargue ese documento Excel, ahí automáticamente se actualice y reconozca la información y la añada a todos los conductores." */}
      {activeTab === 'drivers' && (
        <div className="space-y-4">
          {/* Banner de Carga de Base de Datos CSV / Excel */}
          <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-lg">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/40 shrink-0">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm sm:text-base text-slate-100">
                      Cargar Base de Datos de Conductores (CSV / Excel)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
                      Auto-Reconocimiento
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                    Sube tu archivo <strong className="text-slate-200">.CSV</strong> o <strong className="text-slate-200">.XLSX / .XLS</strong> con{' '}
                    <strong className="text-amber-300">Nombre</strong>, <strong className="text-amber-300">Número de Teléfono</strong> y{' '}
                    <strong className="text-amber-300">Correo Electrónico</strong>. El sistema reconocerá automáticamente las columnas, actualizará la información de los conductores existentes e incorporará a los nuevos al directorio de inmediato.
                  </p>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, .xlsx, .xls, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  className="hidden"
                  onChange={handleFileSelected}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingFile}
                  className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isProcessingFile ? 'Leyendo documento...' : 'Cargar Archivo CSV / Excel'}</span>
                </button>

                <button
                  type="button"
                  onClick={downloadDriverCsvTemplate}
                  title="Descargar plantilla de ejemplo con las columnas recomendadas"
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Plantilla CSV</span>
                </button>
              </div>
            </div>

            {/* Mensaje de error / feedback si hubo algún problema con el archivo */}
            {importFeedback && (
              <div className="mt-3 py-2 px-3 bg-red-950/50 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{importFeedback}</span>
                </div>
                <button
                  onClick={() => setImportFeedback(null)}
                  className="text-slate-400 hover:text-white cursor-pointer ml-2"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Formulario Manual de Conductor */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl h-fit">
              <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-800">
                <Users className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-slate-100">Registrar Conductor Manual</h3>
              </div>

              <form onSubmit={handleDriverSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: David Rodriguez"
                    value={driverForm.name}
                    onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Número de Teléfono</label>
                  <input
                    type="text"
                    placeholder="(786) 000-0000"
                    value={driverForm.phone}
                    onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Correo Electrónico (Email)</label>
                  <input
                    type="email"
                    placeholder="ejemplo@dspops.com"
                    value={driverForm.email}
                    onChange={(e) => setDriverForm({ ...driverForm, email: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Fecha de Contratación (Hire Date) *
                  </label>
                  <input
                    type="date"
                    required
                    value={driverForm.hireDate}
                    onChange={(e) => setDriverForm({ ...driverForm, hireDate: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-amber-400 focus:outline-none font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Se usa para el cálculo automático de antigüedad y orden en el Schedule.
                  </span>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Notas / Certificaciones</label>
                  <input
                    type="text"
                    placeholder="Ej: Step Van cert, EV cert, Rescue..."
                    value={driverForm.notes}
                    onChange={(e) => setDriverForm({ ...driverForm, notes: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Añadir al Directorio</span>
                </button>
              </form>
            </div>

            {/* List */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
              <div className="p-3 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">
                  Directorio Activo ({filteredDrivers.length} Conductores)
                </span>
                <span className="text-[11px] text-slate-400">
                  Antigüedad y correos actualizados
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[10px] uppercase font-bold tracking-wider">
                      <th className="py-2.5 px-3">Conductor</th>
                      <th className="py-2.5 px-3">Contacto (Teléfono & Correo)</th>
                      <th className="py-2.5 px-3">Fecha Ingreso</th>
                      <th className="py-2.5 px-3">Antigüedad</th>
                      <th className="py-2.5 px-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredDrivers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Users className="w-8 h-8 text-slate-600" />
                            <p className="font-semibold text-slate-300">Base de datos de conductores limpia</p>
                            <p className="text-[11px] text-slate-500 max-w-sm">
                              No hay conductores registrados aún. Puedes registrar nuevos conductores con el formulario a la izquierda o cargar tu archivo CSV / Excel arriba.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredDrivers.map((driver) => {
                      const seniority = calculateSeniority(driver.hireDate);
                      return (
                        <tr key={driver.id} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-100">{driver.name}</div>
                            {driver.notes && (
                              <div className="text-[10px] text-amber-400/80">{driver.notes}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-mono text-slate-200 text-xs">{driver.phone || 'Sin teléfono'}</div>
                            {driver.email ? (
                              <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <Mail className="w-3 h-3 text-amber-400/80 shrink-0" />
                                <span className="truncate max-w-[190px]">{driver.email}</span>
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-500 italic mt-0.5">Sin correo</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 font-mono">
                            {driver.hireDate}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 font-mono text-[11px] border border-amber-500/20 font-bold">
                              {seniority.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setEditingDriver(driver)}
                                className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                                title="Editar conductor"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDeleteDriver(driver.id)}
                                className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                                title="Eliminar conductor"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. SECCIÓN: INVENTARIO DE VEHÍCULOS (VANS / CAMIONES) */}
      {/* "Quiero añadir ahí en esta ventana, una sección para inventar de equipamiento, dónde voy a introducir la información de los Vanes y añadir la categoría ya sea un camión una Esteban un van eléctrico o un carro rentado con número de placa número de Vin y con un botón para guardarlo en el inventario" */}
      {activeTab === 'vehicles' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl h-fit">
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-800">
              <Truck className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-sm text-slate-100">Registrar Vehículo</h3>
            </div>

            <form onSubmit={handleVehicleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Número de Identificación (Van #) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Van #117 o SV-04"
                  value={vehicleForm.number}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, number: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-amber-400 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Categoría del Vehículo *
                </label>
                <select
                  value={vehicleForm.type}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, type: e.target.value as VehicleType })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-amber-400 focus:outline-none"
                >
                  <option value="Step Van">Step Van (Esteban / Freightliner / Ford F59)</option>
                  <option value="Custom Van">Custom Van (Ram ProMaster / Transit)</option>
                  <option value="Camión">Camión (Heavy Duty / Box Truck)</option>
                  <option value="EV - Eléctrico">EV - Eléctrico (Rivian / BrightDrop)</option>
                  <option value="Auto Rentado">Auto Rentado (Budget / Penske / Enterprise)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Número de VIN *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 1FDNF21F8HKA89123"
                  value={vehicleForm.vin}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, vin: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-amber-400 focus:outline-none font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Número de Placa *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: FL-DSP17"
                  value={vehicleForm.licensePlate}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, licensePlate: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-amber-400 focus:outline-none font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Estado de Flota</label>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { status: 'Operativo' as VehicleStatus, label: 'Operativo', dotColor: 'bg-emerald-400' },
                      { status: 'En proceso' as VehicleStatus, label: 'En proceso', dotColor: 'bg-amber-400' },
                      { status: 'Inactivo' as VehicleStatus, label: 'Inactivo', dotColor: 'bg-slate-400' },
                      { status: 'En el Taller' as VehicleStatus, label: 'En el Taller', dotColor: 'bg-red-400' },
                      { status: 'Otro' as VehicleStatus, label: 'Otro', dotColor: 'bg-purple-400' }
                    ]
                  ).map((opt) => (
                    <button
                      key={opt.status}
                      type="button"
                      onClick={() => setVehicleForm({ ...vehicleForm, status: opt.status })}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                        vehicleForm.status === opt.status
                          ? opt.status === 'Operativo'
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-xs ring-1 ring-emerald-400/50'
                            : opt.status === 'En proceso'
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs ring-1 ring-amber-400/50'
                            : opt.status === 'En el Taller'
                            ? 'bg-red-500 text-white border-red-400 shadow-xs ring-1 ring-red-400/50'
                            : opt.status === 'Otro'
                            ? 'bg-purple-500 text-white border-purple-400 shadow-xs ring-1 ring-purple-400/50'
                            : 'bg-slate-300 text-slate-950 border-slate-200 shadow-xs ring-1 ring-slate-400/50'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200 hover:border-slate-600'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${opt.dotColor}`} />
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Guardar en Inventario</span>
              </button>
            </form>
          </div>

          {/* List */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
            <div className="p-3 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">
                Flota de Vehículos ({filteredVehicles.length} Unidades)
              </span>
              <span className="text-[11px] text-slate-400">
                Disponibles para asignación automática en Truck Assignment
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[10px] uppercase font-bold tracking-wider">
                    <th className="py-2.5 px-3">Unidad</th>
                    <th className="py-2.5 px-3">Categoría</th>
                    <th className="py-2.5 px-3">Placa</th>
                    <th className="py-2.5 px-3">VIN</th>
                    <th className="py-2.5 px-3">Estado</th>
                    <th className="py-2.5 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredVehicles.map((veh) => (
                    <tr key={veh.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-bold text-slate-100 font-mono">
                        {veh.number}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          veh.type === 'Step Van'
                            ? 'bg-amber-500/20 text-amber-300'
                            : veh.type === 'EV - Eléctrico'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : veh.type === 'Auto Rentado'
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {veh.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-200">
                        {veh.licensePlate}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                        {veh.vin}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="relative inline-block">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveVehicleDropdownId(
                                activeVehicleDropdownId === veh.id ? null : veh.id
                              )
                            }
                            className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shadow-xs ${
                              veh.status === 'Operativo'
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900/60'
                                : veh.status === 'En proceso'
                                ? 'bg-amber-950/80 text-amber-300 border-amber-500/50 hover:bg-amber-900/60'
                                : veh.status === 'En el Taller' || (veh.status as any) === 'Taller'
                                ? 'bg-red-950/80 text-red-300 border-red-500/50 hover:bg-red-900/60'
                                : veh.status === 'Otro'
                                ? 'bg-purple-950/80 text-purple-300 border-purple-500/50 hover:bg-purple-900/60'
                                : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:bg-slate-800'
                            }`}
                            title="Clic para cambiar el estado de la unidad"
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                veh.status === 'Operativo'
                                  ? 'bg-emerald-400'
                                  : veh.status === 'En proceso'
                                  ? 'bg-amber-400'
                                  : veh.status === 'En el Taller' || (veh.status as any) === 'Taller'
                                  ? 'bg-red-400'
                                  : veh.status === 'Otro'
                                  ? 'bg-purple-400'
                                  : 'bg-slate-400'
                              }`}
                            />
                            <span>{veh.status}</span>
                          </button>

                          {/* Botón flotante pequeño con las opciones justo al frente (sin extender a los costados) */}
                          {activeVehicleDropdownId === veh.id && (
                            <>
                              {/* Backdrop invisible para cerrar al hacer clic afuera */}
                              <div
                                className="fixed inset-0 z-40 cursor-default"
                                onClick={() => setActiveVehicleDropdownId(null)}
                              />

                              {/* Mini-panel flotante compacto directamente al frente */}
                              <div className="absolute left-0 -top-1 z-50 p-1.5 bg-slate-950/98 border border-slate-700 rounded-xl shadow-2xl backdrop-blur-md w-[156px] animate-in fade-in zoom-in-95 duration-100 ring-1 ring-white/10">
                                <div className="grid grid-cols-2 gap-1 text-[10px]">
                                  {[
                                    {
                                      status: 'Operativo' as VehicleStatus,
                                      label: 'Operativo',
                                      btnClass: 'bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border-emerald-500/40',
                                      activeClass: 'bg-emerald-500 text-slate-950 ring-1 ring-emerald-300 font-black',
                                      dotColor: 'bg-emerald-400'
                                    },
                                    {
                                      status: 'En proceso' as VehicleStatus,
                                      label: 'Proceso',
                                      btnClass: 'bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border-amber-500/40',
                                      activeClass: 'bg-amber-500 text-slate-950 ring-1 ring-amber-300 font-black',
                                      dotColor: 'bg-amber-400'
                                    },
                                    {
                                      status: 'Inactivo' as VehicleStatus,
                                      label: 'Inactivo',
                                      btnClass: 'bg-slate-800 hover:bg-slate-300 text-slate-300 hover:text-slate-950 border-slate-600',
                                      activeClass: 'bg-slate-300 text-slate-950 ring-1 ring-slate-400 font-black',
                                      dotColor: 'bg-slate-400'
                                    },
                                    {
                                      status: 'En el Taller' as VehicleStatus,
                                      label: 'Taller',
                                      btnClass: 'bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-slate-950 border-red-500/40',
                                      activeClass: 'bg-red-500 text-white ring-1 ring-red-300 font-black',
                                      dotColor: 'bg-red-400'
                                    },
                                    {
                                      status: 'Otro' as VehicleStatus,
                                      label: 'Otro',
                                      btnClass: 'bg-purple-500/20 hover:bg-purple-500 text-purple-300 hover:text-slate-950 border-purple-500/40 col-span-2',
                                      activeClass: 'bg-purple-500 text-white ring-1 ring-purple-300 font-black col-span-2',
                                      dotColor: 'bg-purple-400'
                                    }
                                  ].map((opt) => {
                                    const isCurrent = veh.status === opt.status;
                                    return (
                                      <button
                                        key={opt.status}
                                        type="button"
                                        onClick={() => {
                                          onUpdateVehicle({ ...veh, status: opt.status });
                                          setActiveVehicleDropdownId(null);
                                        }}
                                        className={`flex items-center justify-center gap-1 px-1.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer shadow-xs active:scale-95 ${
                                          isCurrent ? opt.activeClass : opt.btnClass
                                        }`}
                                        title={`Cambiar a ${opt.status}`}
                                      >
                                        <span className={`w-1.5 h-1.5 rounded-full ${isCurrent ? 'bg-current' : opt.dotColor}`} />
                                        <span className="truncate">{opt.label}</span>
                                        {isCurrent && <Check className="w-2.5 h-2.5 ml-0.5 shrink-0" />}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => onDeleteVehicle(veh.id)}
                          className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors"
                          title="Eliminar vehículo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. SECCIÓN: INVENTARIO DE TELÉFONOS / DISPOSITIVOS */}
      {/* "Quiero otra sección, donde voy a añadir los teléfonos con el número correspondiente." */}
      {activeTab === 'devices' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl h-fit">
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-800">
              <Smartphone className="w-4 h-4 text-blue-400" />
              <h3 className="font-bold text-sm text-slate-100">Añadir Teléfono / Dispositivo</h3>
            </div>

            <form onSubmit={handleDeviceSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Número / Identificador *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Teléfono #21 o Rabbit-05"
                  value={deviceForm.number}
                  onChange={(e) => setDeviceForm({ ...deviceForm, number: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-blue-400 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Número de Serie / IMEI
                </label>
                <input
                  type="text"
                  placeholder="Ej: TC57-IMEI-89012350"
                  value={deviceForm.serial}
                  onChange={(e) => setDeviceForm({ ...deviceForm, serial: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-blue-400 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Modelo</label>
                <input
                  type="text"
                  value={deviceForm.model}
                  onChange={(e) => setDeviceForm({ ...deviceForm, model: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-blue-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Estado</label>
                <select
                  value={deviceForm.status}
                  onChange={(e) => setDeviceForm({ ...deviceForm, status: e.target.value as any })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-blue-400 focus:outline-none"
                >
                  <option value="Operativo">Operativo</option>
                  <option value="En Reparación">En Reparación</option>
                  <option value="Perdido">Perdido</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Añadir Teléfono al Inventario</span>
              </button>
            </form>
          </div>

          {/* List */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
            <div className="p-3 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">
                Dispositivos en Sistema ({filteredDevices.length} Teléfonos)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[10px] uppercase font-bold tracking-wider">
                    <th className="py-2.5 px-3">Dispositivo</th>
                    <th className="py-2.5 px-3">Modelo</th>
                    <th className="py-2.5 px-3">Nº Serie / IMEI</th>
                    <th className="py-2.5 px-3">Estado</th>
                    <th className="py-2.5 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredDevices.map((dev) => (
                    <tr key={dev.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-bold text-slate-100 font-mono">
                        {dev.number}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {dev.model}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                        {dev.serial || '-'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          dev.status === 'Operativo'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                            : dev.status === 'En Reparación'
                            ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                            : 'bg-red-950 text-red-300'
                        }`}>
                          {dev.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => onDeleteDevice(dev.id)}
                          className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors"
                          title="Eliminar dispositivo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. SECCIÓN: INVENTARIO DE BATERÍAS / POWERBANKS */}
      {/* "Y quiero otro botón para añadir las baterías" */}
      {activeTab === 'batteries' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl h-fit">
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-800">
              <BatteryCharging className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-sm text-slate-100">Registrar Batería / Powerbank</h3>
            </div>

            <form onSubmit={handleBatterySubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Código / Número de Batería *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Powerbank #21 o BAT-15"
                  value={batteryForm.code}
                  onChange={(e) => setBatteryForm({ ...batteryForm, code: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-emerald-400 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Capacidad / Marca
                </label>
                <input
                  type="text"
                  placeholder="Ej: 20,000 mAh Anker"
                  value={batteryForm.capacity}
                  onChange={(e) => setBatteryForm({ ...batteryForm, capacity: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Estado</label>
                <select
                  value={batteryForm.status}
                  onChange={(e) => setBatteryForm({ ...batteryForm, status: e.target.value as any })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-emerald-400 focus:outline-none"
                >
                  <option value="Operativo">Operativo (Carga completa)</option>
                  <option value="Baja">Baja / Dañado</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Añadir Batería al Inventario</span>
              </button>
            </form>
          </div>

          {/* List */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
            <div className="p-3 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">
                Inventario de Powerbanks ({filteredBatteries.length} Unidades)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[10px] uppercase font-bold tracking-wider">
                    <th className="py-2.5 px-3">Código</th>
                    <th className="py-2.5 px-3">Capacidad / Especificación</th>
                    <th className="py-2.5 px-3">Estado</th>
                    <th className="py-2.5 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredBatteries.map((bat) => (
                    <tr key={bat.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-bold text-slate-100 font-mono">
                        {bat.code}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {bat.capacity}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          bat.status === 'Operativo'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                            : 'bg-red-950 text-red-300'
                        }`}>
                          {bat.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => onDeleteBattery(bat.id)}
                          className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors"
                          title="Eliminar batería"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Previsualización y Confirmación de Carga de Base de Datos CSV / Excel */}
      {importPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                    <span>Reconocimiento de Base de Datos</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                      Listo para Importar
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Archivo: <strong className="text-amber-300 font-mono">{importPreview.fileName}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setImportPreview(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
              {/* Resumen de Detección */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Reconocidos</span>
                  <span className="text-xl font-black font-mono text-slate-100 mt-0.5 block">
                    {importPreview.parseResult.totalRows}
                  </span>
                  <span className="text-[10px] text-slate-500">conductores en archivo</span>
                </div>

                <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 text-center">
                  <span className="text-[10px] text-emerald-400 uppercase font-semibold block">Nuevos a Incorporar</span>
                  <span className="text-xl font-black font-mono text-emerald-400 mt-0.5 block">
                    +{importPreview.newCount}
                  </span>
                  <span className="text-[10px] text-emerald-400/80">se crearán en directorio</span>
                </div>

                <div className="bg-blue-950/30 border border-blue-500/30 rounded-xl p-3 text-center">
                  <span className="text-[10px] text-blue-400 uppercase font-semibold block">Existentes a Actualizar</span>
                  <span className="text-xl font-black font-mono text-blue-400 mt-0.5 block">
                    {importPreview.updateCount}
                  </span>
                  <span className="text-[10px] text-blue-400/80">se actualizarán datos</span>
                </div>
              </div>

              {/* Columnas Reconocidas Automáticamente */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                <span className="text-[11px] font-bold text-slate-300 block mb-2">
                  Columnas Mapeadas Automáticamente:
                </span>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <div className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg flex items-center gap-1.5">
                    <span className="text-slate-400">Nombre:</span>
                    <strong className="text-amber-400 font-mono">
                      {importPreview.parseResult.detectedColumns.nameCol || 'Detectada'}
                    </strong>
                  </div>
                  <div className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg flex items-center gap-1.5">
                    <span className="text-slate-400">Teléfono:</span>
                    <strong className="text-amber-400 font-mono">
                      {importPreview.parseResult.detectedColumns.phoneCol || 'Detectada'}
                    </strong>
                  </div>
                  <div className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg flex items-center gap-1.5">
                    <span className="text-slate-400">Correo Electrónico:</span>
                    <strong className="text-amber-400 font-mono">
                      {importPreview.parseResult.detectedColumns.emailCol || 'Detectada'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Tabla de Previsualización */}
              <div>
                <span className="text-[11px] font-bold text-slate-300 block mb-1.5">
                  Previsualización de Datos ({Math.min(25, importPreview.parseResult.validDrivers.length)} de {importPreview.parseResult.validDrivers.length} mostrados):
                </span>
                <div className="border border-slate-800 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[10px] uppercase font-bold sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Estado</th>
                        <th className="py-2 px-3">Nombre</th>
                        <th className="py-2 px-3">Número de Teléfono</th>
                        <th className="py-2 px-3">Correo Electrónico</th>
                        <th className="py-2 px-3">Fecha Ingreso</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                      {importPreview.parseResult.validDrivers.slice(0, 25).map((row, idx) => {
                        const cleanName = row.name.toLowerCase().trim();
                        const isExisting = drivers.some(d => d.name.toLowerCase().trim() === cleanName);

                        return (
                          <tr key={idx} className="hover:bg-slate-800/40">
                            <td className="py-2 px-3">
                              {isExisting ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-900/50 text-blue-300 border border-blue-500/30">
                                  Actualizar
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-900/50 text-emerald-300 border border-emerald-500/30">
                                  Nuevo
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-100">
                              {row.name}
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-300">
                              {row.phone || '-'}
                            </td>
                            <td className="py-2 px-3 text-slate-300 font-mono text-[11px]">
                              {row.email || '-'}
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-400">
                              {row.hireDate || 'Hoy'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setImportPreview(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmImport}
                className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar y Añadir a Todos los Conductores</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición Individual de Conductor */}
      {editingDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-slate-100">Editar Conductor</h3>
              </div>
              <button
                onClick={() => setEditingDriver(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedDriver} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={editingDriver.name}
                  onChange={(e) => setEditingDriver({ ...editingDriver, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Número de Teléfono</label>
                <input
                  type="text"
                  value={editingDriver.phone}
                  onChange={(e) => setEditingDriver({ ...editingDriver, phone: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Correo Electrónico (Email)</label>
                <input
                  type="email"
                  value={editingDriver.email || ''}
                  onChange={(e) => setEditingDriver({ ...editingDriver, email: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Fecha de Contratación</label>
                <input
                  type="date"
                  required
                  value={editingDriver.hireDate}
                  onChange={(e) => setEditingDriver({ ...editingDriver, hireDate: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-amber-400 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Notas / Certificaciones</label>
                <input
                  type="text"
                  value={editingDriver.notes || ''}
                  onChange={(e) => setEditingDriver({ ...editingDriver, notes: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingDriver(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
