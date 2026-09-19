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
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Lock,
  Unlock,
  TrendingDown,
  FileSpreadsheet,
  X,
  User,
  ShieldCheck,
  Calendar,
  MessageSquare,
  Check,
  Send,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";

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

interface EgresoCaja {
  id: string;
  hora: string;
  tipo: "GASTO_MENOR" | "VIATICO" | "PAGO_COLABORADOR" | "INSUMOS_MEDICOS" | "OTRO";
  concepto: string;
  monto: number;
  destinatario: string;
  aprobadoPor: string;
  comprobanteRef?: string;
}

interface TurnoCaja {
  id: string;
  estado: "ABIERTA" | "CERRADA";
  fechaApertura: string;
  montoApertura: number;
  cajeroNombre: string;
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
  const [cajeroNombre, setCajeroNombre] = useState<string>("Operador de Ventanilla");

  // Control del Turno de Caja
  const [turnoActivo, setTurnoActivo] = useState<TurnoCaja | null>({
    id: "TURNO-001",
    estado: "ABIERTA",
    fechaApertura: "08:00 AM",
    montoApertura: 150,
    cajeroNombre: "Operador de Turno",
    sede: "Independencia",
  });

  useEffect(() => {
    const nom = sessionStorage.getItem("lm_nombre");
    const s = sessionStorage.getItem("lm_sede");
    if (nom) {
      setCajeroNombre(nom);
      setTurnoActivo((prev) => prev ? { ...prev, cajeroNombre: nom } : prev);
    }
    if (s && s !== "Central") {
      setSede(s);
      setTurnoActivo((prev) => prev ? { ...prev, sede: s } : prev);
    }
  }, []);

  const [showAperturaModal, setShowAperturaModal] = useState(false);
  const [montoAperturaInput, setMontoAperturaInput] = useState<number>(150);

  // Estados de Acordeones Desplegables (Ergonomía Vertical)
  const [openSection, setOpenSection] = useState<{
    admision: boolean;
    tarifario: boolean;
    pago: boolean;
    egresos: boolean;
    reagendamiento: boolean;
  }>({
    admision: true,
    tarifario: true,
    pago: true,
    egresos: false,
    reagendamiento: false,
  });

  const toggleSection = (section: "admision" | "tarifario" | "pago" | "egresos" | "reagendamiento") => {
    setOpenSection((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Formulario Reagendamiento de Citas & WhatsApp Institucional
  const [reagendarPaciente, setReagendarPaciente] = useState("");
  const [reagendarTelefono, setReagendarTelefono] = useState("");
  const [reagendarFecha, setReagendarFecha] = useState("");
  const [reagendarHora, setReagendarHora] = useState("09:00");
  const [reagendarSede, setReagendarSede] = useState<string>("Independencia");
  const [reagendarMotivo, setReagendarMotivo] = useState("Control Prenatal y Ecografía de Seguimiento");
  const [reagendarProfesional, setReagendarProfesional] = useState("Médico / Obstetra de Turno");
  const [reagendandoLoading, setReagendandoLoading] = useState(false);
  const [reagendadaExitoMsg, setReagendadaExitoMsg] = useState<string | null>(null);

  // Formulario Admisión & Cobro
  const [dni, setDni] = useState("");
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [telefono, setTelefono] = useState("");
  const [servicio, setServicio] = useState("Control Prenatal Reenfocado");
  const [monto, setMonto] = useState<number>(70);
  const [medioPago, setMedioPago] = useState<"YAPE" | "PLIN" | "EFECTIVO" | "TARJETA_POS">("YAPE");
  const [referencia, setReferencia] = useState("");
  const [efectivoRecibido, setEfectivoRecibido] = useState<number>(100);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ticketEmitido, setTicketEmitido] = useState<TransaccionAtencion | null>(null);

  // Formulario Egresos y Pagos a Colaboradores
  const [egresoTipo, setEgresoTipo] = useState<"GASTO_MENOR" | "VIATICO" | "PAGO_COLABORADOR" | "INSUMOS_MEDICOS" | "OTRO">("PAGO_COLABORADOR");
  const [egresoConcepto, setEgresoConcepto] = useState("");
  const [egresoMonto, setEgresoMonto] = useState<number>(0);
  const [egresoDestinatario, setEgresoDestinatario] = useState("");
  const [egresoAprobadoPor, setEgresoAprobadoPor] = useState("Dirección Médica");
  const [egresoRef, setEgresoRef] = useState("");

  const [egresos, setEgresos] = useState<EgresoCaja[]>([
    {
      id: "EGR-001",
      hora: "09:15",
      tipo: "PAGO_COLABORADOR",
      concepto: "Adelanto por jornada asistencial de apoyo",
      monto: 50,
      destinatario: "Personal Asistencial de Apoyo",
      aprobadoPor: "Dirección Médica",
      comprobanteRef: "REC-012",
    },
  ]);

  // Modal Arqueo y Cierre de Caja
  const [showCierreModal, setShowCierreModal] = useState(false);
  const [efectivoContado, setEfectivoContado] = useState<number>(0);
  const [observacionesCierre, setObservacionesCierre] = useState("");
  const [actaCierre, setActaCierre] = useState<any | null>(null);

  // Padrón local rápido
  const padronPacientes: PacienteRegistrado[] = [
    { dni: "45892147", nombres: "Carla", apellidos: "Mendoza Quispe", telefono: "966 123 456" },
    { dni: "71245896", nombres: "Yolanda", apellidos: "Flores Huamán", telefono: "966 987 654" },
    { dni: "42198754", nombres: "Roxana", apellidos: "Palomino Quispe", telefono: "966 333 444" },
    { dni: "70541298", nombres: "Diana", apellidos: "Huamán Cárdenas", telefono: "966 555 777" },
  ];

  // Listado de atenciones de la jornada
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
      hora: "08:50",
      dni: "42198754",
      paciente: "Roxana Palomino Quispe",
      servicio: "Consulta Médica Ginecológica",
      monto: 80,
      medioPago: "EFECTIVO",
      estadoConsultorio: "ATENDIDO",
      sede: "Independencia",
    },
  ]);

  useEffect(() => {
    const s = sessionStorage.getItem("lm_sede") || "Independencia";
    const nom = sessionStorage.getItem("lm_nombre") || "Operador de Ventanilla";
    setSede(s);
    setCajeroNombre(nom);
  }, []);

  const handleBuscarDNI = (numDni: string) => {
    setDni(numDni);
    if (numDni.length === 8) {
      const match = padronPacientes.find((p) => p.dni === numDni);
      if (match) {
        setNombres(match.nombres);
        setApellidos(match.apellidos);
        setTelefono(match.telefono);
      }
    }
  };

  const handleSelectServicio = (srv: string) => {
    setServicio(srv);
    setMonto(TARIFARIO_BASE[srv] || 70);
  };

  // Procesar Admisión & Cobro
  const handleProcesarAtencionYCobro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dni || !nombres || !apellidos) {
      alert("Por favor complete los datos obligatorios del paciente.");
      return;
    }

    if (!turnoActivo || turnoActivo.estado === "CERRADA") {
      alert("Debe realizar la Apertura de Caja antes de procesar cobros.");
      return;
    }

    setIsProcessing(true);

    const now = new Date();
    const horaStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const nuevaTx: TransaccionAtencion = {
      id: `OP-${Math.floor(100 + Math.random() * 900)}`,
      hora: horaStr,
      dni,
      paciente: `${nombres} ${apellidos}`,
      servicio,
      monto,
      medioPago,
      referencia: referencia || (medioPago === "EFECTIVO" ? "EFECTIVO-VENTANILLA" : "OP-DIRECTA"),
      estadoConsultorio: "EN_ESPERA",
      sede,
    };

    // Sincronización en Tiempo Real con Consultorio HCE (Supabase Realtime)
    (async () => {
      try {
        const siteId =
          sede === "Vivanco"
            ? "b0000000-0000-0000-0000-000000000002"
            : "b0000000-0000-0000-0000-000000000001";

        // Registrar / Actualizar paciente en Supabase
        const { data: pacienteData } = await supabase
          .from("paciente")
          .upsert(
            {
              numero_documento: dni,
              tipo_documento: "DNI",
              nombres: nombres.trim(),
              apellidos: apellidos.trim(),
              telefono: telefono.trim(),
              site_id: siteId,
            },
            { onConflict: "numero_documento" }
          )
          .select()
          .single();

        // Asignar encuentro en espera para el médico de turno
        await supabase.from("encuentro").insert({
          paciente_id: pacienteData?.id,
          site_id: siteId,
          tipo_servicio: servicio,
          estado: "EN_ESPERA",
          fecha_ingreso: new Date().toISOString(),
        });

        // Enviar evento de WebSocket Realtime a todos los médicos conectados
        const channel = supabase.channel("cola-medica");
        channel.send({
          type: "broadcast",
          event: "nuevo_paciente_en_espera",
          payload: nuevaTx,
        });

        // Evento de respaldo local instantáneo entre pestañas
        localStorage.setItem("lm_nuevo_paciente_en_espera", JSON.stringify(nuevaTx));
      } catch (err) {
        console.warn("Sincronización de fondo completada con fallback local:", err);
      }
    })();

    setTimeout(() => {
      setTransacciones([nuevaTx, ...transacciones]);
      setTicketEmitido(nuevaTx);
      setIsProcessing(false);

      // Limpiar formulario para la siguiente paciente
      setDni("");
      setNombres("");
      setApellidos("");
      setTelefono("");
      setReferencia("");
    }, 400);
  };

  // Registrar Salida / Gasto
  const handleRegistrarEgreso = (e: React.FormEvent) => {
    e.preventDefault();
    if (egresoMonto <= 0 || !egresoConcepto || !egresoDestinatario) {
      alert("Complete los datos requeridos para la salida de dinero.");
      return;
    }

    const now = new Date();
    const horaStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const nuevoEgreso: EgresoCaja = {
      id: `EGR-${Math.floor(100 + Math.random() * 900)}`,
      hora: horaStr,
      tipo: egresoTipo,
      concepto: egresoConcepto,
      monto: egresoMonto,
      destinatario: egresoDestinatario,
      aprobadoPor: egresoAprobadoPor,
      comprobanteRef: egresoRef || "RECIBO-INTERNO",
    };

    setEgresos([nuevoEgreso, ...egresos]);
    setEgresoConcepto("");
    setEgresoMonto(0);
    setEgresoDestinatario("");
    alert("Egreso de caja registrado y debitado del efectivo en ventanilla.");
  };

  // Reagendamiento de Citas & WhatsApp Institucional
  const generarEnlaceWhatsAppAdmision = () => {
    const cleanTel = (reagendarTelefono || telefono).replace(/\D/g, "") || "966123456";
    const pacienteNom = reagendarPaciente.trim() || (nombres ? `${nombres} ${apellidos}`.trim() : "Estimada Paciente");
    const msg = `*Consultorio Obstétrico Ecográfico Las Mellizas* 🩺✨%0A%0AEstimada paciente *${encodeURIComponent(
      pacienteNom
    )}*:%0A%0ALe confirmamos su próxima cita programada:%0A📅 *Fecha:* ${
      reagendarFecha || "Por coordinar"
    }%0A⏰ *Hora:* ${reagendarHora}%0A🏥 *Sede:* ${reagendarSede}%0A📋 *Servicio / Motivo:* ${encodeURIComponent(
      reagendarMotivo
    )}%0A👨‍⚕️ *Atención:* ${encodeURIComponent(reagendarProfesional)}%0A%0A_Por favor acudir 10 minutos antes. ¡Cuidamos de ti y de tu bebé con amor y tecnología!_`;

    return `https://wa.me/51${cleanTel}?text=${msg}`;
  };

  const handleGuardarReagendamientoAdmision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reagendarFecha) {
      alert("Por favor seleccione la fecha de la cita.");
      return;
    }
    const pacienteNom = reagendarPaciente.trim() || (nombres ? `${nombres} ${apellidos}`.trim() : "");
    if (!pacienteNom) {
      alert("Por favor ingrese el nombre de la paciente.");
      return;
    }

    setReagendandoLoading(true);
    try {
      const siteId = reagendarSede === "Vivanco" ? "b0000000-0000-0000-0000-000000000002" : "b0000000-0000-0000-0000-000000000001";
      const { error } = await supabase.from("cita_reagendada").insert({
        paciente_nombre: pacienteNom,
        telefono: (reagendarTelefono || telefono).trim() || null,
        fecha: reagendarFecha,
        hora: reagendarHora,
        motivo: reagendarMotivo,
        site_id: siteId,
      });

      if (error) {
        setReagendadaExitoMsg("Error al guardar: " + error.message);
      } else {
        setReagendadaExitoMsg("✓ Cita registrada exitosamente en el calendario institucional.");
        setTimeout(() => setReagendadaExitoMsg(null), 4000);
      }
    } catch {
      setReagendadaExitoMsg("Error de conexión al guardar cita.");
    } finally {
      setReagendandoLoading(false);
    }
  };

  const prepararReagendamientoPara = (atencion: TransaccionAtencion) => {
    setReagendarPaciente(atencion.paciente);
    setReagendarMotivo(`Control de Seguimiento - ${atencion.servicio}`);
    setReagendarSede(atencion.sede || sede);
    setOpenSection((prev) => ({ ...prev, reagendamiento: true }));
  };

  // Cálculos Financieros del Turno
  const totalEfectivoCobros = transacciones
    .filter((t) => t.medioPago === "EFECTIVO")
    .reduce((acc, t) => acc + t.monto, 0);

  const totalDigitalCobros = transacciones
    .filter((t) => t.medioPago !== "EFECTIVO")
    .reduce((acc, t) => acc + t.monto, 0);

  const totalEgresos = egresos.reduce((acc, eg) => acc + eg.monto, 0);

  const fondoApertura = turnoActivo?.montoApertura || 0;
  const efectivoNetoEsperado = fondoApertura + totalEfectivoCobros - totalEgresos;
  const totalFacturadoBruto = totalEfectivoCobros + totalDigitalCobros;

  // Apertura de Turno
  const handleAbrirTurno = () => {
    const now = new Date();
    const horaStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setTurnoActivo({
      id: `TURNO-${Date.now().toString().slice(-4)}`,
      estado: "ABIERTA",
      fechaApertura: horaStr,
      montoApertura: montoAperturaInput,
      cajeroNombre,
      sede,
    });
    setShowAperturaModal(false);
  };

  // Cierre y Arqueo
  const handleEjecutarArqueo = () => {
    const diferencia = efectivoContado - efectivoNetoEsperado;
    const now = new Date();

    setActaCierre({
      fecha: now.toLocaleDateString(),
      hora: now.toLocaleTimeString(),
      turnoId: turnoActivo?.id || "TURNO-001",
      cajero: cajeroNombre,
      sede,
      fondoInicial: fondoApertura,
      efectivoCobros: totalEfectivoCobros,
      egresosTotales: totalEgresos,
      efectivoEsperado: efectivoNetoEsperado,
      efectivoContado: efectivoContado,
      diferencia,
      digitalCobros: totalDigitalCobros,
      totalBruto: totalFacturadoBruto,
      observaciones: observacionesCierre,
    });

    if (turnoActivo) {
      setTurnoActivo({ ...turnoActivo, estado: "CERRADA" });
    }
  };

  const calcularVuelto = () => {
    if (medioPago !== "EFECTIVO") return 0;
    const v = efectivoRecibido - monto;
    return v > 0 ? v : 0;
  };

  return (
    <div className="space-y-6">
      {/* 1. Header de Estado del Módulo & Barra de Turno */}
      <div className="bg-white rounded-3xl p-5 border border-brand-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-brand-900">Admisión & Caja Unificada</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Sede {sede}
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Operador: <strong>{cajeroNombre}</strong> &bull; Flujo asistencial continuo sin fricción
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {turnoActivo && turnoActivo.estado === "ABIERTA" ? (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-2xl">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                <Unlock className="w-4 h-4 text-emerald-600" />
                <span>Caja Abierta (Fondo: {formatCurrency(fondoApertura)})</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEfectivoContado(efectivoNetoEsperado);
                  setShowCierreModal(true);
                }}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow transition flex items-center gap-1"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Arqueo & Cierre</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAperturaModal(true)}
              className="bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow transition flex items-center gap-1.5"
            >
              <Unlock className="w-4 h-4" />
              <span>Abrir Turno de Caja</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Layout Principal de Dos Columnas Fluidas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUMNA IZQUIERDA: Formulario Desplegable en Acordeones */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* ACORDEÓN 1: Admisión & Paciente */}
          <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("admision")}
              className="w-full p-4 bg-neutral-50/70 border-b border-neutral-100 flex items-center justify-between text-left transition hover:bg-neutral-100/50"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-brand-100 text-brand-800 flex items-center justify-center font-black text-xs">
                  1
                </div>
                <div>
                  <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">
                    Admisión del Paciente
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    {dni && nombres ? `${nombres} ${apellidos} (DNI: ${dni})` : "Identificación y filiación"}
                  </p>
                </div>
              </div>
              {openSection.admision ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
            </button>

            {openSection.admision && (
              <div className="p-5 space-y-4">
                {/* Búsqueda por DNI */}
                <div>
                  <label className="block text-[11px] font-extrabold text-neutral-600 uppercase tracking-wider mb-1">
                    DNI / Carnet Extranjería (8 Dígitos) *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={8}
                      value={dni}
                      onChange={(e) => handleBuscarDNI(e.target.value)}
                      placeholder="Ingrese DNI (ej: 45892147)..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-300 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-700 bg-white"
                    />
                    <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-extrabold text-neutral-600 uppercase tracking-wider mb-1">
                      Nombres Completos *
                    </label>
                    <input
                      type="text"
                      value={nombres}
                      onChange={(e) => setNombres(e.target.value)}
                      placeholder="Nombres de la paciente..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-neutral-600 uppercase tracking-wider mb-1">
                      Apellidos *
                    </label>
                    <input
                      type="text"
                      value={apellidos}
                      onChange={(e) => setApellidos(e.target.value)}
                      placeholder="Apellidos completos..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-neutral-600 uppercase tracking-wider mb-1">
                    Teléfono / WhatsApp de Contacto
                  </label>
                  <input
                    type="text"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="999 000 111"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-700"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ACORDEÓN 2: Tarifario Médico */}
          <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("tarifario")}
              className="w-full p-4 bg-neutral-50/70 border-b border-neutral-100 flex items-center justify-between text-left transition hover:bg-neutral-100/50"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-black text-xs">
                  2
                </div>
                <div>
                  <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">
                    Tarifario & Servicio Médico
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Seleccionado: <strong>{servicio}</strong> &bull; {formatCurrency(monto)}
                  </p>
                </div>
              </div>
              {openSection.tarifario ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
            </button>

            {openSection.tarifario && (
              <div className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(TARIFARIO_BASE).map(([srv, tarifa]) => {
                    const isSelected = servicio === srv;
                    return (
                      <button
                        key={srv}
                        type="button"
                        onClick={() => handleSelectServicio(srv)}
                        className={`p-3 rounded-2xl border text-left transition flex items-center justify-between ${
                          isSelected
                            ? "border-brand-700 bg-brand-50/80 ring-2 ring-brand-700/20"
                            : "border-neutral-200 bg-white hover:bg-neutral-50"
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold text-neutral-900">{srv}</p>
                          <p className="text-[11px] font-extrabold text-brand-700">{formatCurrency(tarifa)}</p>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-brand-700 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ACORDEÓN 3: Cobro Inmediato & Facturación */}
          <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("pago")}
              className="w-full p-4 bg-neutral-50/70 border-b border-neutral-100 flex items-center justify-between text-left transition hover:bg-neutral-100/50"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs">
                  3
                </div>
                <div>
                  <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">
                    Cobranza Inmediata & Emisión
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Medio: <strong>{medioPago}</strong> &bull; Total a pagar: {formatCurrency(monto)}
                  </p>
                </div>
              </div>
              {openSection.pago ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
            </button>

            {openSection.pago && (
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-[11px] font-extrabold text-neutral-600 uppercase tracking-wider mb-2">
                    Medio de Pago
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setMedioPago("YAPE")}
                      className={`py-3 px-2 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 ${
                        medioPago === "YAPE"
                          ? "border-purple-600 bg-purple-50 text-purple-900 ring-2 ring-purple-600/20 font-bold"
                          : "border-neutral-200 hover:bg-neutral-50 text-neutral-600"
                      }`}
                    >
                      <Smartphone className="w-4 h-4 text-purple-700" />
                      <span className="text-xs">Yape</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMedioPago("PLIN")}
                      className={`py-3 px-2 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 ${
                        medioPago === "PLIN"
                          ? "border-sky-600 bg-sky-50 text-sky-900 ring-2 ring-sky-600/20 font-bold"
                          : "border-neutral-200 hover:bg-neutral-50 text-neutral-600"
                      }`}
                    >
                      <Smartphone className="w-4 h-4 text-sky-600" />
                      <span className="text-xs">Plin</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMedioPago("EFECTIVO")}
                      className={`py-3 px-2 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 ${
                        medioPago === "EFECTIVO"
                          ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-600/20 font-bold"
                          : "border-neutral-200 hover:bg-neutral-50 text-neutral-600"
                      }`}
                    >
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs">Efectivo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMedioPago("TARJETA_POS")}
                      className={`py-3 px-2 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 ${
                        medioPago === "TARJETA_POS"
                          ? "border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-600/20 font-bold"
                          : "border-neutral-200 hover:bg-neutral-50 text-neutral-600"
                      }`}
                    >
                      <CreditCard className="w-4 h-4 text-amber-600" />
                      <span className="text-xs">Tarjeta POS</span>
                    </button>
                  </div>
                </div>

                {/* Si es Efectivo: Desglose de Vuelto */}
                {medioPago === "EFECTIVO" && (
                  <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                        Efectivo Recibido (S/)
                      </label>
                      <input
                        type="number"
                        value={efectivoRecibido}
                        onChange={(e) => setEfectivoRecibido(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-emerald-300 text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                        Vuelto a Entregar
                      </label>
                      <div className="py-2 px-3 rounded-xl bg-white border border-emerald-200 text-xs font-mono font-black text-emerald-800">
                        {formatCurrency(calcularVuelto())}
                      </div>
                    </div>
                  </div>
                )}

                {/* Si es Digital: Código de Referencia */}
                {medioPago !== "EFECTIVO" && (
                  <div>
                    <label className="block text-[11px] font-extrabold text-neutral-600 uppercase tracking-wider mb-1">
                      N° de Operación / Código Autorización
                    </label>
                    <input
                      type="text"
                      value={referencia}
                      onChange={(e) => setReferencia(e.target.value)}
                      placeholder="Ej: OP-981244 / Ref POS"
                      className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-700"
                    />
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleProcesarAtencionYCobro}
                    disabled={isProcessing}
                    className="w-full py-3.5 bg-brand-700 hover:bg-brand-800 text-white font-black text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Printer className="w-4 h-4" />
                    <span>
                      {isProcessing
                        ? "Emitiendo Comprobante & Registrando..."
                        : `Cobrar ${formatCurrency(monto)} & Enviar a Espera Médica`}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ACORDEÓN 4: Salidas de Dinero / Gastos & Pagos a Colaboradores */}
          <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("egresos")}
              className="w-full p-4 bg-neutral-50/70 border-b border-neutral-100 flex items-center justify-between text-left transition hover:bg-neutral-100/50"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center font-black text-xs">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">
                    Egresos & Pagos a Colaboradores
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Salidas de caja autorizadas &bull; Total egresos: {formatCurrency(totalEgresos)}
                  </p>
                </div>
              </div>
              {openSection.egresos ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
            </button>

            {openSection.egresos && (
              <div className="p-5 space-y-4">
                <form onSubmit={handleRegistrarEgreso} className="space-y-3 bg-neutral-50 p-4 rounded-2xl border border-neutral-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                        Tipo de Salida *
                      </label>
                      <select
                        value={egresoTipo}
                        onChange={(e) => setEgresoTipo(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs bg-white"
                      >
                        <option value="PAGO_COLABORADOR">Pago Directo a Colaborador</option>
                        <option value="GASTO_MENOR">Gasto Menor / Mantenimiento</option>
                        <option value="VIATICO">Viáticos / Movilidad</option>
                        <option value="INSUMOS_MEDICOS">Insumos Médicos Urgentes</option>
                        <option value="OTRO">Otro Egreso</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                        Monto a Entregar (S/) *
                      </label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={egresoMonto || ""}
                        onChange={(e) => setEgresoMonto(Number(e.target.value))}
                        placeholder="Monto en efectivo..."
                        className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs font-mono font-bold bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                        Destinatario / Colaborador *
                      </label>
                      <input
                        type="text"
                        required
                        value={egresoDestinatario}
                        onChange={(e) => setEgresoDestinatario(e.target.value)}
                        placeholder="Nombre de quien recibe el dinero..."
                        className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                        Aprobado por *
                      </label>
                      <input
                        type="text"
                        required
                        value={egresoAprobadoPor}
                        onChange={(e) => setEgresoAprobadoPor(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                      Concepto / Justificación *
                    </label>
                    <input
                      type="text"
                      required
                      value={egresoConcepto}
                      onChange={(e) => setEgresoConcepto(e.target.value)}
                      placeholder="Motivo del pago o compra..."
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5"
                  >
                    <TrendingDown className="w-4 h-4" />
                    <span>Registrar Salida de Efectivo</span>
                  </button>
                </form>

                {/* Historial de egresos del turno */}
                {egresos.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                      Egresos Registrados en este Turno ({egresos.length})
                    </p>
                    <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-2xl overflow-hidden bg-white text-xs">
                      {egresos.map((eg) => (
                        <div key={eg.id} className="p-3 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-neutral-900">{eg.destinatario}</span>
                              <span className="text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded font-mono">
                                {eg.tipo}
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-500">{eg.concepto}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-black text-rose-700">
                              -{formatCurrency(eg.monto)}
                            </span>
                            <span className="text-[10px] text-neutral-400 block">{eg.hora}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ACORDEÓN 5: Reagendamiento de Citas & WhatsApp Institucional */}
          <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("reagendamiento")}
              className="w-full p-4 bg-emerald-50/60 border-b border-emerald-100 flex items-center justify-between text-left transition hover:bg-emerald-100/50"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs shadow-sm">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                      Reagendamiento de Citas & WhatsApp
                    </h3>
                    <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                      <MessageSquare className="w-2.5 h-2.5" /> Directo
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    {reagendarPaciente ? `Cita para: ${reagendarPaciente}` : "Programar citas telefónicas o de seguimiento"}
                  </p>
                </div>
              </div>
              {openSection.reagendamiento ? (
                <ChevronUp className="w-4 h-4 text-emerald-700" />
              ) : (
                <ChevronDown className="w-4 h-4 text-emerald-700" />
              )}
            </button>

            {openSection.reagendamiento && (
              <div className="p-5 space-y-4">
                {/* Botón rápido si hay paciente en admisión */}
                {nombres && (
                  <div className="flex items-center justify-between p-2.5 bg-neutral-50 rounded-2xl border border-neutral-200 text-xs">
                    <span className="text-neutral-600">
                      Paciente en ventanilla: <strong>{nombres} {apellidos}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setReagendarPaciente(`${nombres} ${apellidos}`.trim());
                        setReagendarTelefono(telefono);
                      }}
                      className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-800 font-bold rounded-lg border border-brand-200 text-[11px] transition"
                    >
                      Copiar datos a la cita
                    </button>
                  </div>
                )}

                <form onSubmit={handleGuardarReagendamientoAdmision} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                        Nombre de la Paciente *
                      </label>
                      <input
                        type="text"
                        required
                        value={reagendarPaciente}
                        onChange={(e) => setReagendarPaciente(e.target.value)}
                        placeholder="Ej. Carmen Quispe..."
                        className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-emerald-600 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                        Teléfono / WhatsApp (9 Dígitos) *
                      </label>
                      <input
                        type="tel"
                        maxLength={9}
                        value={reagendarTelefono}
                        onChange={(e) => setReagendarTelefono(e.target.value)}
                        placeholder="987654321"
                        className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-600 bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                        Fecha Programada *
                      </label>
                      <input
                        type="date"
                        required
                        value={reagendarFecha}
                        onChange={(e) => setReagendarFecha(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-emerald-600 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                        Hora *
                      </label>
                      <input
                        type="time"
                        required
                        value={reagendarHora}
                        onChange={(e) => setReagendarHora(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-emerald-600 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                        Sede de Atención *
                      </label>
                      <select
                        value={reagendarSede}
                        onChange={(e) => setReagendarSede(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-emerald-600 bg-white"
                      >
                        <option value="Independencia">Sede Independencia</option>
                        <option value="Vivanco">Sede Vivanco</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                        Profesional Asignado
                      </label>
                      <input
                        type="text"
                        value={reagendarProfesional}
                        onChange={(e) => setReagendarProfesional(e.target.value)}
                        placeholder="Ej. Dra. Carmen / Obstetra de Turno"
                        className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-emerald-600 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                        Motivo / Procedimiento Clínico
                      </label>
                      <input
                        type="text"
                        value={reagendarMotivo}
                        onChange={(e) => setReagendarMotivo(e.target.value)}
                        placeholder="Ej. Control Prenatal, Eco 5D..."
                        className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-emerald-600 bg-white"
                      />
                    </div>
                  </div>

                  {reagendadaExitoMsg && (
                    <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{reagendadaExitoMsg}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={reagendandoLoading}
                      className="flex-1 py-2.5 bg-neutral-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>{reagendandoLoading ? "Guardando Cita..." : "Registrar Cita en Sistema"}</span>
                    </button>

                    <a
                      href={generarEnlaceWhatsAppAdmision()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Enviar Confirmación por WhatsApp</span>
                    </a>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: Balanza Financiera & Monitor en Tiempo Real */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Tarjeta 1: Balanza Financiera del Turno */}
          <div className="bg-gradient-to-br from-brand-900 to-brand-950 text-white rounded-3xl p-5 shadow-xl border border-brand-800">
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-brand-300">
                  Balanza de Caja del Turno
                </p>
                <p className="text-xs text-white/70">
                  {turnoActivo?.estado === "ABIERTA" ? "Turno Activo en Ventanilla" : "Caja Cerrada"}
                </p>
              </div>
              <span className="text-xs font-mono px-2 py-1 rounded-lg bg-white/10 text-brand-200">
                {sede}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 text-white/80">
                <span>(+) Fondo Inicial de Apertura:</span>
                <span className="font-mono font-bold">{formatCurrency(fondoApertura)}</span>
              </div>
              <div className="flex justify-between py-1 text-emerald-300">
                <span>(+) Cobros en Efectivo:</span>
                <span className="font-mono font-bold">+{formatCurrency(totalEfectivoCobros)}</span>
              </div>
              <div className="flex justify-between py-1 text-rose-300">
                <span>(-) Egresos / Pagos Realizados:</span>
                <span className="font-mono font-bold">-{formatCurrency(totalEgresos)}</span>
              </div>
              
              <div className="pt-2 border-t border-white/10 flex justify-between items-center text-sm font-black text-white">
                <span>(=) Efectivo Neto a Rendir:</span>
                <span className="font-mono text-base text-emerald-400">{formatCurrency(efectivoNetoEsperado)}</span>
              </div>

              <div className="pt-2 border-t border-white/10 flex justify-between py-1 text-purple-300 text-[11px]">
                <span>Cobros Digitales (Yape / POS):</span>
                <span className="font-mono font-bold">{formatCurrency(totalDigitalCobros)}</span>
              </div>

              <div className="flex justify-between py-1 text-brand-300 text-[11px] font-bold">
                <span>Facturación Bruta de la Jornada:</span>
                <span className="font-mono">{formatCurrency(totalFacturadoBruto)}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setEfectivoContado(efectivoNetoEsperado);
                  setShowCierreModal(true);
                }}
                className="w-full py-2.5 bg-white hover:bg-brand-50 text-brand-900 font-black text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Ejecutar Arqueo de Caja</span>
              </button>
            </div>
          </div>

          {/* Tarjeta 2: Monitor de Pacientes en Turno */}
          <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-700" />
                <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">
                  Pacientes en Turno ({transacciones.length})
                </h3>
              </div>
              <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full font-bold">
                Tiempo Real
              </span>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {transacciones.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 rounded-2xl border border-neutral-200/80 bg-neutral-50/50 hover:bg-white hover:border-neutral-300 transition flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-900">{tx.paciente}</span>
                      <span className="text-[10px] font-mono text-neutral-400">DNI: {tx.dni}</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-0.5">{tx.servicio}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono font-bold text-brand-700">
                        {formatCurrency(tx.monto)} ({tx.medioPago})
                      </span>
                      <span className="text-[10px] text-neutral-400">&bull; {tx.hora}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${
                        tx.estadoConsultorio === "EN_ESPERA"
                          ? "bg-amber-100 text-amber-800"
                          : tx.estadoConsultorio === "EN_ATENCION"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {tx.estadoConsultorio.replace("_", " ")}
                    </span>
                    <button
                      type="button"
                      onClick={() => prepararReagendamientoPara(tx)}
                      title="Reagendar cita para esta paciente"
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-lg transition"
                    >
                      <Calendar className="w-3 h-3 text-emerald-700" />
                      <span>Reagendar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ticket emitido de última atención */}
          {ticketEmitido && (
            <div className="bg-white rounded-3xl border border-emerald-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-emerald-800">
                <div className="flex items-center gap-1.5 text-xs font-black">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Ticket Emitido ({ticketEmitido.id})</span>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="text-xs text-brand-700 font-bold hover:underline flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir 80mm</span>
                </button>
              </div>

              <div className="bg-neutral-50 p-3 rounded-2xl border border-neutral-200 text-xs font-mono space-y-1 text-neutral-700">
                <p className="font-bold text-neutral-900">LAS MELLIZAS PERÚ S.A.C.</p>
                <p className="text-[10px] text-neutral-500">RUC: 20611827335 &bull; Sede {ticketEmitido.sede}</p>
                <div className="border-t border-dashed border-neutral-300 my-1 pt-1">
                  <p>PACIENTE: {ticketEmitido.paciente}</p>
                  <p>DNI: {ticketEmitido.dni}</p>
                  <p>SERVICIO: {ticketEmitido.servicio}</p>
                  <p>IMPORTE: {formatCurrency(ticketEmitido.monto)}</p>
                  <p>MEDIO: {ticketEmitido.medioPago}</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Modal Apertura de Turno */}
      {showAperturaModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-neutral-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
              <Unlock className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-black text-neutral-900">Apertura de Turno de Caja</h3>
              <p className="text-xs text-neutral-500 mt-1">
                Sede {sede} &bull; Operador: <strong>{cajeroNombre}</strong>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Fondo Base de Efectivo (S/) *
              </label>
              <input
                type="number"
                min={0}
                value={montoAperturaInput}
                onChange={(e) => setMontoAperturaInput(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm font-mono font-bold"
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                Efectivo inicial en gaveta para dar vuelto.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAperturaModal(false)}
                className="w-1/2 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAbrirTurno}
                className="w-1/2 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cierre y Arqueo de Caja */}
      {showCierreModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-brand-700" />
                <h3 className="text-base font-black text-neutral-900">Arqueo y Cierre de Caja</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCierreModal(false)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!actaCierre ? (
              <div className="space-y-3">
                <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span>Fondo Inicial:</span>
                    <span className="font-mono font-bold">{formatCurrency(fondoApertura)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>(+) Cobros en Efectivo:</span>
                    <span className="font-mono font-bold">+{formatCurrency(totalEfectivoCobros)}</span>
                  </div>
                  <div className="flex justify-between text-rose-700">
                    <span>(-) Egresos y Pagos:</span>
                    <span className="font-mono font-bold">-{formatCurrency(totalEgresos)}</span>
                  </div>
                  <div className="border-t border-neutral-200 pt-1.5 flex justify-between font-black text-neutral-900">
                    <span>Efectivo Esperado a Rendir:</span>
                    <span className="font-mono text-sm text-brand-900">{formatCurrency(efectivoNetoEsperado)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Efectivo Real Contado en Gaveta (S/) *
                  </label>
                  <input
                    type="number"
                    value={efectivoContado}
                    onChange={(e) => setEfectivoContado(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm font-mono font-bold"
                  />
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-neutral-500">Diferencia de Cuadre:</span>
                    <span
                      className={`font-mono font-black ${
                        efectivoContado - efectivoNetoEsperado === 0
                          ? "text-emerald-700"
                          : efectivoContado - efectivoNetoEsperado > 0
                          ? "text-blue-700"
                          : "text-rose-700"
                      }`}
                    >
                      {efectivoContado - efectivoNetoEsperado === 0
                        ? "CUADRADO EXACTO (S/ 0.00)"
                        : efectivoContado - efectivoNetoEsperado > 0
                        ? `SOBRANTE: +${formatCurrency(efectivoContado - efectivoNetoEsperado)}`
                        : `FALTANTE: ${formatCurrency(efectivoContado - efectivoNetoEsperado)}`}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Observaciones del Cierre
                  </label>
                  <textarea
                    rows={2}
                    value={observacionesCierre}
                    onChange={(e) => setObservacionesCierre(e.target.value)}
                    placeholder="Observaciones de auditoría o justificaciones..."
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCierreModal(false)}
                    className="w-1/2 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs rounded-xl"
                  >
                    Volver
                  </button>
                  <button
                    type="button"
                    onClick={handleEjecutarArqueo}
                    className="w-1/2 py-2.5 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs rounded-xl shadow"
                  >
                    Generar Acta de Cierre
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Acta Oficial Generada */}
                <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200 font-mono text-xs space-y-2 text-neutral-800">
                  <div className="text-center pb-2 border-b border-dashed border-neutral-300">
                    <p className="font-bold">ACTA DE ARQUEO Y CIERRE DE CAJA</p>
                    <p className="text-[10px] text-neutral-500">LAS MELLIZAS PERÚ S.A.C. &bull; RUC 20611827335</p>
                    <p className="text-[10px] text-neutral-500">Sede {actaCierre.sede} &bull; {actaCierre.fecha} {actaCierre.hora}</p>
                  </div>

                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between"><span>Cajero(a):</span><span>{actaCierre.cajero}</span></div>
                    <div className="flex justify-between"><span>Fondo Inicial:</span><span>{formatCurrency(actaCierre.fondoInicial)}</span></div>
                    <div className="flex justify-between"><span>Cobros Efectivo:</span><span>+{formatCurrency(actaCierre.efectivoCobros)}</span></div>
                    <div className="flex justify-between"><span>Cobros Digitales:</span><span>+{formatCurrency(actaCierre.digitalCobros)}</span></div>
                    <div className="flex justify-between"><span>Egresos Totales:</span><span>-{formatCurrency(actaCierre.egresosTotales)}</span></div>
                    <div className="border-t border-dashed border-neutral-300 pt-1 flex justify-between font-bold">
                      <span>Efectivo Esperado:</span><span>{formatCurrency(actaCierre.efectivoEsperado)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Efectivo Contado:</span><span>{formatCurrency(actaCierre.efectivoContado)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-800">
                      <span>Diferencia:</span><span>{formatCurrency(actaCierre.diferencia)}</span>
                    </div>
                  </div>

                  <div className="pt-4 grid grid-cols-2 gap-4 text-center text-[10px] border-t border-dashed border-neutral-300">
                    <div>
                      <p className="border-t border-neutral-400 mt-6 pt-1">Firma Cajero</p>
                    </div>
                    <div>
                      <p className="border-t border-neutral-400 mt-6 pt-1">Firma Supervisor</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="w-1/2 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-1"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimir Acta</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActaCierre(null);
                      setShowCierreModal(false);
                    }}
                    className="w-1/2 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs rounded-xl"
                  >
                    Finalizar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
