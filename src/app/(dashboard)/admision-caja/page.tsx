"use client";

import { useState, useEffect } from "react";
import {
  UserCheck,
  Receipt,
  Search,
  CheckCircle2,
  Printer,
  Smartphone,
  CreditCard,
  DollarSign,
  Clock,
  MapPin,
  RefreshCw,
  Plus,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface PacienteRegistrado {
  dni: string;
  nombres: string;
  apellidos: string;
  telefono: string;
}

interface TransaccionAtencion {
  id: string;
  hora: string;
  dni: string;
  paciente: string;
  servicio: string;
  monto: number;
  medioPago: "YAPE" | "PLIN" | "EFECTIVO" | "TARJETA_POS";
  referencia?: string;
  estadoConsultorio: "EN_ESPERA" | "EN_ATENCION" | "ATENDIDO";
  sede: string;
}

const TARIFARIO_BASE: Record<string, number> = {
  "Control Prenatal Reenfocado": 70,
  "Ecografía Especializada (4D/5D)": 150,
  "Ecografía Obstétrica Morfológica": 140,
  "Consulta Médica Ginecológica": 80,
  "Planificación Familiar Integral": 60,
  "Prevención Cáncer Cervical (PAP)": 50,
  "Descarte Rápido ITS": 45,
};

export default function AdmisionCajaPage() {
  const [sede, setSede] = useState<string>("Independencia");

  // Formulario transaccional unificado
  const [dni, setDni] = useState("");
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [telefono, setTelefono] = useState("");
  const [servicio, setServicio] = useState("Control Prenatal Reenfocado");
  const [monto, setMonto] = useState<number>(70);
  const [medioPago, setMedioPago] = useState<"YAPE" | "PLIN" | "EFECTIVO" | "TARJETA_POS">("YAPE");
  const [referencia, setReferencia] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [ticketEmitido, setTicketEmitido] = useState<TransaccionAtencion | null>(null);

  // Registro de pacientes conocidos para autocompletado en 1 segundo
  const padronPacientes: PacienteRegistrado[] = [
    { dni: "45892147", nombres: "Carla", apellidos: "Mendoza Quispe", telefono: "966 123 456" },
    { dni: "71245896", nombres: "Yolanda", apellidos: "Flores Huamán", telefono: "966 987 654" },
    { dni: "42198754", nombres: "Roxana", apellidos: "Palomino Quispe", telefono: "966 333 444" },
    { dni: "70541298", nombres: "Diana", apellidos: "Huamán Cárdenas", telefono: "966 555 777" },
  ];

  // Listado de transacciones activas de la jornada
  const [transacciones, setTransacciones] = useState<TransaccionAtencion[]>([
    {
      id: "OP-801",
      hora: "08:15",
      dni: "45892147",
      paciente: "Carla Mendoza Quispe",
      servicio: "Control Prenatal Reenfocado",
      monto: 70,
      medioPago: "YAPE",
      referencia: "YP-1049",
      estadoConsultorio: "EN_ESPERA",
      sede: "Independencia",
    },
    {
      id: "OP-802",
      hora: "08:30",
      dni: "71245896",
      paciente: "Yolanda Flores Huamán",
      servicio: "Ecografía Especializada (4D/5D)",
      monto: 150,
      medioPago: "TARJETA_POS",
      referencia: "TX-9921",
      estadoConsultorio: "EN_ATENCION",
      sede: "Independencia",
    },
    {
      id: "OP-803",
      hora: "08:20",
      dni: "42198754",
      paciente: "Roxana Palomino Quispe",
      servicio: "Control Prenatal Reenfocado",
      monto: 70,
      medioPago: "PLIN",
      referencia: "PL-4412",
      estadoConsultorio: "EN_ESPERA",
      sede: "Vivanco",
    },
  ]);

  useEffect(() => {
    const s = sessionStorage.getItem("lm_sede") || "Independencia";
    setSede(s);
  }, []);

  // Autocompletado de paciente si el DNI coincide con padrón
  const handleDniChange = (val: string) => {
    setDni(val);
    if (val.length === 8) {
      const match = padronPacientes.find((p) => p.dni === val);
      if (match) {
        setNombres(match.nombres);
        setApellidos(match.apellidos);
        setTelefono(match.telefono);
      }
    }
  };

  const handleServicioChange = (val: string) => {
    setServicio(val);
    if (TARIFARIO_BASE[val]) {
      setMonto(TARIFARIO_BASE[val]);
    }
  };

  // Procesamiento fluido en 1 solo paso
  const handleSubmitAdmisionCaja = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dni || !nombres || !apellidos) return;

    setIsProcessing(true);

    const nuevaTransaccion: TransaccionAtencion = {
      id: `OP-${Date.now().toString().slice(-4)}`,
      hora: new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }),
      dni,
      paciente: `${nombres.trim()} ${apellidos.trim()}`,
      servicio,
      monto,
      medioPago,
      referencia: referencia.trim() || undefined,
      estadoConsultorio: "EN_ESPERA",
      sede,
    };

    setTimeout(() => {
      setTransacciones([nuevaTransaccion, ...transacciones]);
      setTicketEmitido(nuevaTransaccion);
      setIsProcessing(false);

      // Limpiar formulario para la siguiente paciente
      setDni("");
      setNombres("");
      setApellidos("");
      setTelefono("");
      setReferencia("");
      setMonto(70);
      setServicio("Control Prenatal Reenfocado");
    }, 300);
  };

  const transaccionesSede = transacciones.filter(
    (t) => sede === "Todas las Sedes" || t.sede === sede
  );

  const totalRecaudado = transaccionesSede.reduce((acc, curr) => acc + curr.monto, 0);
  const pacientesEnEspera = transaccionesSede.filter((t) => t.estadoConsultorio === "EN_ESPERA").length;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header Compacto */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-xs">
            OP
          </div>
          <div>
            <h1 className="text-base font-bold text-neutral-900 leading-tight">
              Admisión & Caja Unificada
            </h1>
            <p className="text-[11px] text-neutral-500 flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-neutral-400" />
              <span>Sede {sede} &bull; Operador Único de Ventanilla</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="text-right">
            <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-sans">
              Recaudación Turno
            </span>
            <span className="font-bold text-neutral-900 text-sm">{formatCurrency(totalRecaudado)}</span>
          </div>
          <div className="text-right border-l border-neutral-200 pl-4">
            <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-sans">
              En Sala Espera
            </span>
            <span className="font-bold text-brand-700 text-sm">{pacientesEnEspera}</span>
          </div>
        </div>
      </div>

      {/* Grid de Operación Transaccional */}
      <div className="grid lg:grid-cols-12 gap-5">
        {/* Cuadrante Izquierdo: Formulario Transaccional Unificado (5 columnas) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-neutral-200 p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
            <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-neutral-900" />
              Nueva Atención & Cobro Inmediato
            </span>
            <span className="text-[10px] bg-neutral-100 px-2 py-0.5 rounded text-neutral-600 font-mono">
              Flujo de 1 Paso
            </span>
          </div>

          <form onSubmit={handleSubmitAdmisionCaja} className="space-y-3 text-xs">
            {/* DNI con autocompletado */}
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                DNI del Paciente *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  maxLength={8}
                  value={dni}
                  onChange={(e) => handleDniChange(e.target.value)}
                  placeholder="8 dígitos..."
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-neutral-300 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Nombres y Apellidos */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Nombres *</label>
                <input
                  type="text"
                  required
                  value={nombres}
                  onChange={(e) => setNombres(e.target.value)}
                  placeholder="Nombres"
                  className="w-full px-2.5 py-2 rounded-lg border border-neutral-300 text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Apellidos *</label>
                <input
                  type="text"
                  required
                  value={apellidos}
                  onChange={(e) => setApellidos(e.target.value)}
                  placeholder="Apellidos"
                  className="w-full px-2.5 py-2 rounded-lg border border-neutral-300 text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </div>
            </div>

            {/* Teléfono */}
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Teléfono Móvil</label>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="999 999 999"
                className="w-full px-2.5 py-2 rounded-lg border border-neutral-300 text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
            </div>

            {/* Servicio y Tarifa */}
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Servicio Asistencial *</label>
              <select
                value={servicio}
                onChange={(e) => handleServicioChange(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border border-neutral-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
              >
                {Object.keys(TARIFARIO_BASE).map((k) => (
                  <option key={k} value={k}>
                    {k} &bull; S/ {TARIFARIO_BASE[k]}.00
                  </option>
                ))}
              </select>
            </div>

            {/* Monto y Medios de Pago */}
            <div className="pt-1 border-t border-neutral-100">
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-neutral-700">Monto a Cobrar (PEN)</label>
                <span className="font-mono text-sm font-black text-neutral-900">S/ {monto}.00</span>
              </div>

              <div className="grid grid-cols-4 gap-1.5 mb-2.5">
                <button
                  type="button"
                  onClick={() => setMedioPago("YAPE")}
                  className={`py-1.5 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1 transition ${
                    medioPago === "YAPE"
                      ? "border-purple-600 bg-purple-50 text-purple-900 ring-1 ring-purple-600"
                      : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  <Smartphone className="w-3 h-3 text-purple-600" />
                  <span>Yape</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMedioPago("PLIN")}
                  className={`py-1.5 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1 transition ${
                    medioPago === "PLIN"
                      ? "border-cyan-600 bg-cyan-50 text-cyan-900 ring-1 ring-cyan-600"
                      : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  <Smartphone className="w-3 h-3 text-cyan-600" />
                  <span>Plin</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMedioPago("EFECTIVO")}
                  className={`py-1.5 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1 transition ${
                    medioPago === "EFECTIVO"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-600"
                      : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  <DollarSign className="w-3 h-3 text-emerald-600" />
                  <span>Efectivo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMedioPago("TARJETA_POS")}
                  className={`py-1.5 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1 transition ${
                    medioPago === "TARJETA_POS"
                      ? "border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-600"
                      : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  <CreditCard className="w-3 h-3 text-blue-600" />
                  <span>POS</span>
                </button>
              </div>

              <div>
                <input
                  type="text"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder="N.º de Operación / Referencia (Opcional)"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-300 text-[11px] focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </div>
            </div>

            {/* Botón de Ejecución de 1 Paso */}
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-2.5 bg-neutral-900 hover:bg-black text-white font-bold rounded-lg transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>Admitir y Liquidar Cobro S/ {monto}.00</span>
            </button>
          </form>

          {/* Ticket Térmico Rápido Emitido */}
          {ticketEmitido && (
            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg space-y-1.5 font-mono text-[11px]">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-1 font-sans">
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Pago Confirmado
                </span>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-700 hover:underline"
                >
                  <Printer className="w-3 h-3" /> Imprimir
                </button>
              </div>
              <p><strong>Comprobante:</strong> {ticketEmitido.id} &bull; {ticketEmitido.hora}</p>
              <p><strong>Paciente:</strong> {ticketEmitido.paciente} (DNI {ticketEmitido.dni})</p>
              <p><strong>Concepto:</strong> {ticketEmitido.servicio}</p>
              <p><strong>Medio:</strong> {ticketEmitido.medioPago} &bull; S/ {ticketEmitido.monto}.00</p>
              <p className="text-neutral-500 font-sans text-[10px]">
                Paciente derivada a sala de espera de consultorio.
              </p>
            </div>
          )}
        </div>

        {/* Cuadrante Derecho: Monitor de Turno & Transacciones (7 columnas) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-3.5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
            <div>
              <h2 className="font-bold text-xs text-neutral-800 uppercase tracking-wider">
                Monitor de Pacientes en Turno &bull; Sede {sede}
              </h2>
              <span className="text-[11px] text-neutral-500">
                Sincronización en tiempo real con Consultorio HCE
              </span>
            </div>
            <span className="text-xs font-mono font-bold bg-white px-2 py-0.5 rounded border border-neutral-200 text-neutral-700">
              {transaccionesSede.length} registros hoy
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-500 text-[10px] font-bold uppercase tracking-wider border-b border-neutral-200">
                <tr>
                  <th className="py-2.5 px-3">Hora</th>
                  <th className="py-2.5 px-3">Paciente</th>
                  <th className="py-2.5 px-3">Servicio</th>
                  <th className="py-2.5 px-3">Monto</th>
                  <th className="py-2.5 px-3">Medio</th>
                  <th className="py-2.5 px-3">Consultorio</th>
                  <th className="py-2.5 px-3 text-right">Recibo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {transaccionesSede.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-neutral-400">
                      Sin movimientos registrados en esta sede durante el turno actual.
                    </td>
                  </tr>
                ) : (
                  transaccionesSede.map((item) => (
                    <tr key={item.id} className="hover:bg-neutral-50/60 transition">
                      <td className="py-2.5 px-3 font-mono text-neutral-500">{item.hora}</td>
                      <td className="py-2.5 px-3 font-semibold text-neutral-900">
                        {item.paciente}
                        <span className="block font-mono text-[10px] text-neutral-400 font-normal">
                          {item.dni}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-600 truncate max-w-[160px]" title={item.servicio}>
                        {item.servicio}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-neutral-900">
                        S/ {item.monto}.00
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-neutral-100 rounded text-neutral-700 font-semibold">
                          {item.medioPago}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.estadoConsultorio === "EN_ESPERA"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : item.estadoConsultorio === "EN_ATENCION"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          <Clock className="w-2.5 h-2.5" />
                          <span>{item.estadoConsultorio.replace("_", " ")}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => setTicketEmitido(item)}
                          className="p-1 hover:bg-neutral-100 rounded text-neutral-500 hover:text-neutral-900 transition"
                          title="Ver / Reimprimir Comprobante"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
