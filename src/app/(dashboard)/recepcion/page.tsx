"use client";

import { useState } from "react";
import { Search, UserPlus, Users, Clock, CheckCircle2, AlertCircle } from "lucide-react";

interface PacienteMock {
  id: string;
  dni: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  ultimaVisita: string;
}

interface EncuentroMock {
  id: string;
  paciente: string;
  dni: string;
  servicio: string;
  turno: string;
  estado: "EN_ESPERA" | "EN_ATENCION" | "ATENDIDO";
  horaIngreso: string;
}

export default function RecepcionPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"espera" | "padron">("espera");

  // Pacientes en sala de espera
  const [encuentros, setEncuentros] = useState<EncuentroMock[]>([
    {
      id: "enc-001",
      paciente: "Carla Mendoza Quispe",
      dni: "45892147",
      servicio: "Control Prenatal Reenfocado",
      turno: "Mañana",
      estado: "EN_ESPERA",
      horaIngreso: "08:15 a. m.",
    },
    {
      id: "enc-002",
      paciente: "Yolanda Flores Huamán",
      dni: "71245896",
      servicio: "Ecografía Especializada (4D)",
      turno: "Mañana",
      estado: "EN_ATENCION",
      horaIngreso: "08:30 a. m.",
    },
    {
      id: "enc-003",
      paciente: "María Elena Paucar Rojas",
      dni: "10568942",
      servicio: "Salud Integral de la Mujer",
      turno: "Mañana",
      estado: "ATENDIDO",
      horaIngreso: "07:45 a. m.",
    },
  ]);

  // Formulario nueva admisión
  const [nuevoDni, setNuevoDni] = useState("");
  const [nuevoNombres, setNuevoNombres] = useState("");
  const [nuevoApellidos, setNuevoApellidos] = useState("");
  const [nuevoTelefono, setNuevoTelefono] = useState("");
  const [nuevoServicio, setNuevoServicio] = useState("Control Prenatal Reenfocado");

  const handleCrearAdmision = (e: React.FormEvent) => {
    e.preventDefault();
    const nuevo: EncuentroMock = {
      id: `enc-${Date.now().toString().slice(-3)}`,
      paciente: `${nuevoNombres} ${nuevoApellidos}`,
      dni: nuevoDni,
      servicio: nuevoServicio,
      turno: "Mañana",
      estado: "EN_ESPERA",
      horaIngreso: new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }),
    };

    setEncuentros([nuevo, ...encuentros]);
    setShowNewModal(false);
    setNuevoDni("");
    setNuevoNombres("");
    setNuevoApellidos("");
    setNuevoTelefono("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Módulo de Admisión & Recepción</h1>
          <p className="text-xs text-neutral-500">Gestión de pacientes, sala de espera y registro rápido de citas presenciales.</p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center justify-center gap-2 bg-brand-700 hover:bg-brand-800 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-sm transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>Nueva Admisión</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200">
        <button
          onClick={() => setActiveTab("espera")}
          className={`pb-3 px-3 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === "espera"
              ? "border-brand-700 text-brand-700"
              : "border-transparent text-neutral-500 hover:text-neutral-800"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Sala de Espera Hoy ({encuentros.filter(e => e.estado !== "ATENDIDO").length})</span>
        </button>

        <button
          onClick={() => setActiveTab("padron")}
          className={`pb-3 px-3 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === "padron"
              ? "border-brand-700 text-brand-700"
              : "border-transparent text-neutral-500 hover:text-neutral-800"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Búsqueda en Padrón de Pacientes</span>
        </button>
      </div>

      {/* Barra de búsqueda */}
      <div className="relative">
        <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por DNI, Nombres o Teléfono..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-700/50"
        />
      </div>

      {/* Listado de Sala de Espera */}
      {activeTab === "espera" && (
        <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="font-bold text-sm text-neutral-800">Cola de Atención en Consultorio</h2>
            <span className="text-xs text-neutral-400 font-medium">Actualización en tiempo real</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-600 text-xs font-bold uppercase tracking-wider border-b border-neutral-200">
                <tr>
                  <th className="py-3 px-4">Hora</th>
                  <th className="py-3 px-4">Paciente</th>
                  <th className="py-3 px-4">DNI</th>
                  <th className="py-3 px-4">Servicio Requerido</th>
                  <th className="py-3 px-4">Turno</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {encuentros
                  .filter(e => e.paciente.toLowerCase().includes(searchTerm.toLowerCase()) || e.dni.includes(searchTerm))
                  .map((item) => (
                    <tr key={item.id} className="hover:bg-neutral-50/80 transition">
                      <td className="py-3.5 px-4 font-mono text-xs text-neutral-500">{item.horaIngreso}</td>
                      <td className="py-3.5 px-4 font-bold text-neutral-900">{item.paciente}</td>
                      <td className="py-3.5 px-4 font-mono text-xs text-neutral-600">{item.dni}</td>
                      <td className="py-3.5 px-4 text-neutral-700 text-xs font-semibold">{item.servicio}</td>
                      <td className="py-3.5 px-4 text-xs text-neutral-500">{item.turno}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                            item.estado === "EN_ESPERA"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : item.estado === "EN_ATENCION"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {item.estado === "EN_ESPERA" && <Clock className="w-3 h-3" />}
                          {item.estado === "EN_ATENCION" && <AlertCircle className="w-3 h-3" />}
                          {item.estado === "ATENDIDO" && <CheckCircle2 className="w-3 h-3" />}
                          <span>{item.estado.replace("_", " ")}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="text-xs text-brand-700 font-bold hover:underline cursor-pointer">
                          Ver Ficha
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Nueva Admisión */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-neutral-200">
            <h3 className="text-lg font-black text-brand-900 mb-1">Nueva Admisión Presencial</h3>
            <p className="text-xs text-neutral-500 mb-4">Ingresa los datos para incorporar a la paciente a la sala de espera.</p>

            <form onSubmit={handleCrearAdmision} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">DNI *</label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    value={nuevoDni}
                    onChange={(e) => setNuevoDni(e.target.value)}
                    placeholder="8 dígitos"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Teléfono / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    value={nuevoTelefono}
                    onChange={(e) => setNuevoTelefono(e.target.value)}
                    placeholder="999 999 999"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Nombres *</label>
                <input
                  type="text"
                  required
                  value={nuevoNombres}
                  onChange={(e) => setNuevoNombres(e.target.value)}
                  placeholder="Nombres completos"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Apellidos *</label>
                <input
                  type="text"
                  required
                  value={nuevoApellidos}
                  onChange={(e) => setNuevoApellidos(e.target.value)}
                  placeholder="Apellidos completos"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Servicio a Atender *</label>
                <select
                  value={nuevoServicio}
                  onChange={(e) => setNuevoServicio(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
                >
                  <option>Control Prenatal Reenfocado</option>
                  <option>Ecografías Especializadas (3D / 4D / 5D / Doppler)</option>
                  <option>Salud Integral de la Mujer</option>
                  <option>Planificación Familiar y Asesoría Integral</option>
                  <option>Prevención y Detección del Cáncer Cervical</option>
                  <option>Prevención y Descarte Confidencial de ITS</option>
                  <option>Diagnóstico Oportuno y Orientación Reproductiva</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-brand-700 hover:bg-brand-800 text-white rounded-xl shadow"
                >
                  Registrar en Sala de Espera
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}