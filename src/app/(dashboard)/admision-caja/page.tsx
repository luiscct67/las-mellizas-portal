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
  Package,
  Boxes,
  Tag,
  Filter,
  ShoppingCart,
  Trash2,
  Coins,
  Minus,
  ArrowRightLeft,
  Phone,
  UserPlus,
  Stethoscope,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { useAdmision, PacienteTurnoAdmision } from "@/context/AdmisionContext";

export interface ProductoDispensable {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  presentacion: string;
  stock_actual: number;
  stock_minimo: number;
  precio_costo: number;
  precio_venta: number;
}

export interface ItemCarrito {
  id: string;
  tipo: "SERVICIO" | "PRODUCTO" | "PACK";
  codigo?: string;
  nombre: string;
  categoria?: string;
  cantidad: number;
  precioUnitario: number;
  precioBaseCatalogo: number;
  motivoAjuste?: string;
  productoId?: string;
}

export interface PagoFraccionado {
  id: string;
  medio: "EFECTIVO" | "YAPE" | "PLIN" | "TARJETA_POS" | "TRANSFERENCIA";
  monto: number;
  montoEntregado?: number;
  referencia?: string;
}

interface PacienteRegistrado {
  dni: string;
  nombres: string;
  apellidos: string;
  telefono: string;
}

interface TransaccionAtencion {
  id: string;
  encuentroId?: string;
  hora: string;
  fechaHoraRaw?: string;
  dni: string;
  paciente: string;
  telefono?: string;
  servicio: string;
  monto: number;
  medioPago: "YAPE" | "PLIN" | "EFECTIVO" | "TARJETA_POS" | "TRANSFERENCIA" | "MIXTO" | "CONTROL";
  referencia?: string;
  estadoConsultorio: "EN_ESPERA" | "EN_ATENCION" | "ATENDIDO" | "CANCELADO" | "REPROGRAMADO";
  sede: string;
  items?: ItemCarrito[];
  pagos?: PagoFraccionado[];
  vueltoEntregado?: number;
}

interface ItemDispensacionMultiple {
  id: string;
  producto: ProductoDispensable;
  cantidad: number;
}

interface CitaAgendadaDia {
  id: string;
  paciente_id?: string | null;
  paciente_nombre: string;
  telefono?: string | null;
  fecha: string;
  hora: string;
  motivo: string;
  estado: "PROGRAMADA" | "ATENDIDA" | "CANCELADA";
  site_id?: string;
  encuentro_id?: string | null;
  encuentro?: {
    id: string;
    estado: string;
  } | null;
  created_at?: string;
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
  hashCierre?: string;
}

const normalizarSede = (nombre?: string | null): string => {
  if (!nombre) return "Independencia";
  if (nombre.toLowerCase().includes("vivanco")) return "Vivanco";
  return "Independencia";
};

const getSiteId = (nombre?: string | null): string => {
  return normalizarSede(nombre) === "Vivanco"
    ? "b0000000-0000-0000-0000-000000000002"
    : "b0000000-0000-0000-0000-000000000001";
};

// ============================================================================
// HASH CRIPTOGRÁFICO INMUTABLE PARA CIERRE DE CAJA Y ARQUEO
// ============================================================================
async function generarHashCanonicoCaja(payload: string): Promise<string> {
  try {
    if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
      const enc = new TextEncoder();
      const data = enc.encode(payload);
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }
  } catch (err) {
    console.warn("Aviso criptográfico en arqueo de caja:", err);
  }
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface ServicioItem {
  nombre: string;
  precio: number;
  categoria: "Ecografías" | "Consultas" | "Procedimientos" | "Laboratorio" | "Packs Promocionales";
  descripcion?: string;
}

const CATALOGO_SERVICIOS: ServicioItem[] = [
  // --- PACKS PROMOCIONALES INTEGRALES ---
  { nombre: "Pack Integral: Consulta + Ecografía 5D + PAP", precio: 220, categoria: "Packs Promocionales", descripcion: "Paquete ginecológico preventivo integral y ecografía HD" },
  { nombre: "Pack Embarazo Control Inicial: Eco Genética + Perfil Prenatal", precio: 210, categoria: "Packs Promocionales", descripcion: "Descarte genético I trimestre + analítica completa" },
  { nombre: "Pack Chequeo Ginecológico Anual: Colposcopía + PAP + Eco Transvaginal", precio: 190, categoria: "Packs Promocionales", descripcion: "Chequeo preventivo integral femenino anual" },
  { nombre: "Pack Descarte ITS Integral: Rápido Dual + Frotis Vaginal + Orina", precio: 110, categoria: "Packs Promocionales", descripcion: "Evaluación integral de salud urogenital" },
  { nombre: "Pack Urológico: Eco Renal + Vesicoprostática", precio: 120, categoria: "Packs Promocionales", descripcion: "Evaluación urológica integral de riñones, vejiga y próstata" },

  // --- ECOGRAFÍAS DE APOYO DIAGNÓSTICO (OBSTÉTRICAS Y GENERALES) ---
  { nombre: "Ecografía Especializada 4D / 5D (HD Live)", precio: 150, categoria: "Ecografías", descripcion: "Visualización fetal volumétrica en tiempo real con video" },
  { nombre: "Ecografía Obstétrica Morfológica (Semana 20-24)", precio: 140, categoria: "Ecografías", descripcion: "Evaluación anatómica fetal y marcadores de bienestar" },
  { nombre: "Ecografía Doppler Materno-Fetal", precio: 160, categoria: "Ecografías", descripcion: "Flujometría de arterias uterinas y cordón umbilical" },
  { nombre: "Ecografía Genética / I Trimestre (Semana 11-14)", precio: 120, categoria: "Ecografías", descripcion: "Translucencia nucal, hueso nasal y ductus venoso" },
  { nombre: "Ecografía de Apoyo Diagnóstico: Obstétrica Control", precio: 70, categoria: "Ecografías", descripcion: "Biometría fetal, líquido amniótico y placenta" },
  { nombre: "Ecografía de Apoyo Diagnóstico: Transvaginal", precio: 80, categoria: "Ecografías", descripcion: "Útero, endometrio y anexos ováricos de alta resolución" },
  { nombre: "Ecografía de Apoyo Diagnóstico: Pélvica", precio: 70, categoria: "Ecografías", descripcion: "Vía suprapúbica para descarte ginecológico" },
  { nombre: "Ecografía Mamaria Bilateral", precio: 80, categoria: "Ecografías", descripcion: "Evaluación ecográfica de ambas mamas y axilas (BI-RADS)" },
  { nombre: "Ecografía Tiroidea", precio: 80, categoria: "Ecografías", descripcion: "Evaluación de glándula tiroides y nódulos (TI-RADS)" },
  { nombre: "Ecografía Abdominal Completa", precio: 90, categoria: "Ecografías", descripcion: "Hígado, vesícula, páncreas, bazo y riñones" },
  { nombre: "Ecografía Renal y Vías Urinarias", precio: 80, categoria: "Ecografías", descripcion: "Riñones, vejiga y descarte de litiasis" },
  { nombre: "Ecografía Prostática (Vesicoprostática)", precio: 80, categoria: "Ecografías", descripcion: "Evaluación suprapúbica con cálculo de residuo postmiccional" },
  { nombre: "Ecografía de Partes Blandas y Pared", precio: 70, categoria: "Ecografías", descripcion: "Tejido celular subcutáneo, lipomas y hernias" },
  { nombre: "Monitoreo Fetal Electrónico (NST)", precio: 50, categoria: "Ecografías", descripcion: "Registro cardiotocográfico no estresante basal" },
  { nombre: "Perfil Biofísico Fetal (PBF)", precio: 120, categoria: "Ecografías", descripcion: "Evaluación ecográfica de bienestar + Monitoreo fetal" },

  // --- CONSULTAS OBSTÉTRICAS Y MÉDICAS ---
  { nombre: "Control Prenatal Reenfocado", precio: 70, categoria: "Consultas", descripcion: "Evaluación clínica integral, triaje y carnet perinatal (Obstetra - COP)" },
  { nombre: "Consulta Obstétrica", precio: 70, categoria: "Consultas", descripcion: "Evaluación de la gestación, bienestar materno y salud sexual (Obstetra - COP)" },
  { nombre: "Consejería en Planificación Familiar", precio: 60, categoria: "Consultas", descripcion: "Orientación personalizada y prescripción anticonceptiva (Obstetra - COP)" },
  { nombre: "Consulta Médica Ginecológica Especializada", precio: 80, categoria: "Consultas", descripcion: "Evaluación especializada por gineco-obstetra (Médico - CMP)" },
  { nombre: "Consulta Ginecológica de Control (Médico)", precio: 50, categoria: "Consultas", descripcion: "Revisión de resultados y seguimiento médico (Médico - CMP)" },
  { nombre: "Consulta Médica de Fertilidad y Pareja", precio: 100, categoria: "Consultas", descripcion: "Estudio clínico de infertilidad y salud reproductiva (Médico - CMP)" },
  { nombre: "Evaluación Médica de Climaterio y Menopausia", precio: 90, categoria: "Consultas", descripcion: "Terapia de reemplazo hormonal y salud ósea (Médico - CMP)" },
  { nombre: "Consulta de Medicina General", precio: 50, categoria: "Consultas", descripcion: "Evaluación clínica integral del adulto y medicina ambulatoria (Médico - CMP)" },
  { nombre: "Consulta de Control / Lectura de Exámenes (Medicina General)", precio: 30, categoria: "Consultas", descripcion: "Seguimiento médico y evaluación de análisis clínicos (Médico - CMP)" },

  // --- PROCEDIMIENTOS GINECOLÓGICOS & PREVENCIÓN ---
  { nombre: "Prevención Cáncer Cervical (PAP)", precio: 50, categoria: "Procedimientos", descripcion: "Toma de citología exfoliativa cervical Papanicolaou" },
  { nombre: "Colposcopía Digital Diagnóstica", precio: 100, categoria: "Procedimientos", descripcion: "Examen microscópico digital del cuello uterino" },
  { nombre: "Pack Preventivo: Colposcopía + PAP", precio: 130, categoria: "Procedimientos", descripcion: "Evaluación combinada de alta precisión para cuello uterino" },
  { nombre: "Cauterización / Crioterapia Cervical", precio: 180, categoria: "Procedimientos", descripcion: "Tratamiento de ectropión / heridas de cuello uterino" },
  { nombre: "Inserción de DIU T de Cobre", precio: 120, categoria: "Procedimientos", descripcion: "Colocación de dispositivo intrauterino con guía médica" },
  { nombre: "Inserción de DIU Hormonal (Mirena/Kyleena)", precio: 250, categoria: "Procedimientos", descripcion: "Colocación especializada de sistema intrauterino" },
  { nombre: "Retiro de Dispositivo Intrauterino (DIU)", precio: 70, categoria: "Procedimientos", descripcion: "Extracción segura de DIU o revisión de hilos" },
  { nombre: "Inserción de Implante Subdérmico", precio: 150, categoria: "Procedimientos", descripcion: "Colocación de implante anticonceptivo subdérmico" },
  { nombre: "Retiro de Implante Subdérmico", precio: 90, categoria: "Procedimientos", descripcion: "Extracción ambulatoria con anestesia local" },
  { nombre: "Biopsia de Cérvix / Endometrio", precio: 160, categoria: "Procedimientos", descripcion: "Toma de muestra tisular para estudio anatomopatológico" },
  { nombre: "Lavado y Curación Ginecológica", precio: 40, categoria: "Procedimientos", descripcion: "Tratamiento tópico y antisepsia vaginal" },

  // --- LABORATORIO CLÍNICO Y DESPISTAJE RÁPIDO ---
  { nombre: "Descarte Rápido ITS (VIH + Sífilis)", precio: 45, categoria: "Laboratorio", descripcion: "Prueba rápida dual en suero/sangre capilar" },
  { nombre: "Prueba de Embarazo Rápida en Sangre (HCG)", precio: 35, categoria: "Laboratorio", descripcion: "Detección temprana de subunidad beta en 15 min" },
  { nombre: "Hemoglobina y Hematocrito Rápido", precio: 20, categoria: "Laboratorio", descripcion: "Dosaje instantáneo para descarte de anemia materna" },
  { nombre: "Examen Completo de Orina + Tira Reactiva", precio: 25, categoria: "Laboratorio", descripcion: "Descarte de infección urinaria o proteinuria gestacional" },
  { nombre: "Cultivo y Antibiograma de Secreción Vaginal", precio: 60, categoria: "Laboratorio", descripcion: "Identificación microbiológica y sensibilidad a antibióticos" },
  { nombre: "Grupo Sanguíneo y Factor Rh", precio: 25, categoria: "Laboratorio", descripcion: "Determinación de grupo ABO y compatibilidad Rh" },
  { nombre: "Perfil Prenatal Básico Completo", precio: 120, categoria: "Laboratorio", descripcion: "Hemograma, glucosa, grupo, VIH, RPR y orina completa" },
];

const TARIFARIO_BASE: Record<string, number> = CATALOGO_SERVICIOS.reduce((acc, srv) => {
  acc[srv.nombre] = srv.precio;
  return acc;
}, {} as Record<string, number>);

const PRODUCTOS_INVENTARIO_INICIALES: ProductoDispensable[] = [
  {
    id: "inv-ovu-01",
    codigo: "INV-OVU-01",
    nombre: "Óvulos de Metronidazol + Nistatina",
    categoria: "Tratamiento Ginecológico",
    presentacion: "Caja x 10 óvulos",
    stock_actual: 25,
    stock_minimo: 5,
    precio_costo: 15.0,
    precio_venta: 35.0,
  },
  {
    id: "inv-amp-01",
    codigo: "INV-AMP-01",
    nombre: "Ampolla Anticonceptiva Mensual (Norigynon / Mesigyna)",
    categoria: "Anticonceptivos & Hormonales",
    presentacion: "Ampolla 1ml + jeringa descartable",
    stock_actual: 30,
    stock_minimo: 8,
    precio_costo: 18.0,
    precio_venta: 35.0,
  },
  {
    id: "inv-amp-03",
    codigo: "INV-AMP-03",
    nombre: "Ampolla Anticonceptiva Trimestral (Medroxiprogesterona 150mg)",
    categoria: "Anticonceptivos & Hormonales",
    presentacion: "Frasco ampolla 1ml",
    stock_actual: 20,
    stock_minimo: 5,
    precio_costo: 20.0,
    precio_venta: 40.0,
  },
  {
    id: "inv-jab-01",
    codigo: "INV-JAB-01",
    nombre: "Jabón Íntimo Ginecológico con Ácido Láctico",
    categoria: "Cuidado Íntimo & Higiene",
    presentacion: "Frasco dosificador 200ml",
    stock_actual: 15,
    stock_minimo: 4,
    precio_costo: 12.0,
    precio_venta: 25.0,
  },
  {
    id: "inv-gel-01",
    codigo: "INV-GEL-01",
    nombre: "Gel Conductor para Ultrasonido / Ecografía",
    categoria: "Insumos Asistenciales",
    presentacion: "Galón x 3.8 Litros",
    stock_actual: 8,
    stock_minimo: 2,
    precio_costo: 25.0,
    precio_venta: 45.0,
  },
  {
    id: "inv-esp-01",
    codigo: "INV-ESP-01",
    nombre: "Espéculos Vaginales Descartables Estériles (Talla M)",
    categoria: "Insumos Asistenciales",
    presentacion: "Caja x 25 unidades descartables",
    stock_actual: 50,
    stock_minimo: 10,
    precio_costo: 1.5,
    precio_venta: 5.0,
  },
];

export default function AdmisionCajaPage() {
  const {
    subModuloActivo,
    setSubModuloActivo,
    setPacientesTurno,
    setCajaAbierta,
    setFondoApertura: setFondoAperturaContext,
  } = useAdmision();

  const [sede, setSede] = useState<string>("Independencia");
  const [cajeroNombre, setCajeroNombre] = useState<string>("Operador de Ventanilla");
  const [cargandoTurno, setCargandoTurno] = useState<boolean>(true);

  // Control del Turno de Caja (Inicia en null y se consulta desde Supabase)
  const [turnoActivo, setTurnoActivo] = useState<TurnoCaja | null>(null);

  const [showAperturaModal, setShowAperturaModal] = useState(false);
  const [montoAperturaInput, setMontoAperturaInput] = useState<number>(150);

  // Estados de Acordeones Desplegables (Ergonomía Vertical)
  const [openSection, setOpenSection] = useState<{
    admision: boolean;
    tarifario: boolean;
    pago: boolean;
    dispensacion: boolean;
    egresos: boolean;
    reagendamiento: boolean;
  }>({
    admision: true,
    tarifario: true,
    pago: true,
    dispensacion: false,
    egresos: false,
    reagendamiento: false,
  });

  const toggleSection = (section: "admision" | "tarifario" | "pago" | "dispensacion" | "egresos" | "reagendamiento") => {
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
  const [reagendarEncuentroId, setReagendarEncuentroId] = useState<string | null>(null);

  // Citas Programadas del Día & Próximas Reagendadas
  const [citasDelDia, setCitasDelDia] = useState<CitaAgendadaDia[]>([]);
  const [proximasCitas, setProximasCitas] = useState<CitaAgendadaDia[]>([]);
  const [tabBandejaCitas, setTabBandejaCitas] = useState<"HOY" | "PROXIMAS">("HOY");
  const [cargandoCitasDelDia, setCargandoCitasDelDia] = useState(false);

  // Modal de Identificación Sanitaria para Pase a Sala (NTS N.º 139-MINSA)
  const [citaValidandoDni, setCitaValidandoDni] = useState<CitaAgendadaDia | null>(null);
  const [dniPaseDirecto, setDniPaseDirecto] = useState("");
  const [dniPaseError, setDniPaseError] = useState<string | null>(null);
  const [dniPaseLoading, setDniPaseLoading] = useState(false);
  const [dniPaseCoincidencia, setDniPaseCoincidencia] = useState<{
    encontrado: boolean;
    nombres?: string;
    apellidos?: string;
    dni?: string;
  } | null>(null);
  const [buscandoDniPase, setBuscandoDniPase] = useState(false);

  // Formulario Admisión & Carrito Multiservicios
  const [dni, setDni] = useState("");
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [telefono, setTelefono] = useState("");
  const [estadoBusquedaDni, setEstadoBusquedaDni] = useState<"ENCONTRADO" | "NUEVO" | null>(null);

  // Carrito de Consumo (Servicios, Procedimientos, Packs, Insumos) - Inicia limpio
  const [itemsCarrito, setItemsCarrito] = useState<ItemCarrito[]>([]);

  // Buscador y Selectores de Catálogo Mutuamente Excluyentes
  const [tabCatalogo, setTabCatalogo] = useState<"SERVICIOS" | "FARMACIA" | "PERSONALIZADO">("SERVICIOS");
  const [dropdownServicioAbierto, setDropdownServicioAbierto] = useState<boolean>(false);
  const [dropdownFarmaciaAbierto, setDropdownFarmaciaAbierto] = useState<boolean>(false);
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("Todas");
  const [busquedaServicio, setBusquedaServicio] = useState<string>("");
  const [busquedaFarmacia, setBusquedaFarmacia] = useState<string>("");
  const [servicioPersonalizadoNombre, setServicioPersonalizadoNombre] = useState("");
  const [servicioPersonalizadoPrecio, setServicioPersonalizadoPrecio] = useState<number | "">("");

  // Pagos Mixtos y Fraccionados (Split Payment) - Inicia limpio
  const [modoSplit, setModoSplit] = useState<boolean>(false);
  const [medioPagoUnico, setMedioPagoUnico] = useState<"EFECTIVO" | "YAPE" | "PLIN" | "TARJETA_POS">("EFECTIVO");
  const [referenciaUnica, setReferenciaUnica] = useState("");
  const [efectivoEntregadoUnico, setEfectivoEntregadoUnico] = useState<number>(0);
  const [pagosFraccionados, setPagosFraccionados] = useState<PagoFraccionado[]>([]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isCerrandoTurno, setIsCerrandoTurno] = useState(false);
  const [ticketEmitido, setTicketEmitido] = useState<TransaccionAtencion | null>(null);

  // Dispensación de Insumos & Farmacia (Control de Inventario - Sub-carrito por lote)
  const [productosInventario, setProductosInventario] = useState<ProductoDispensable[]>(PRODUCTOS_INVENTARIO_INICIALES);
  const [itemsDispensacion, setItemsDispensacion] = useState<ItemDispensacionMultiple[]>([]);
  const [productoDispensar, setProductoDispensar] = useState<ProductoDispensable | null>(null);
  const [cantidadDispensar, setCantidadDispensar] = useState<number>(1);
  const [tipoDispensacion, setTipoDispensacion] = useState<"SALIDA_VENTA" | "SALIDA_USO_CLINICO">("SALIDA_VENTA");
  const [motivoDispensacion, setMotivoDispensacion] = useState<string>("");
  const [isDispensando, setIsDispensando] = useState<boolean>(false);
  const [dispensacionExitoMsg, setDispensacionExitoMsg] = useState<string | null>(null);
  const [dispensacionErrorMsg, setDispensacionErrorMsg] = useState<string | null>(null);

  // Formulario Egresos y Pagos a Colaboradores
  const [egresoTipo, setEgresoTipo] = useState<"GASTO_MENOR" | "VIATICO" | "PAGO_COLABORADOR" | "INSUMOS_MEDICOS" | "OTRO">("PAGO_COLABORADOR");
  const [egresoConcepto, setEgresoConcepto] = useState("");
  const [egresoMonto, setEgresoMonto] = useState<number>(0);
  const [egresoDestinatario, setEgresoDestinatario] = useState("");
  const [egresoAprobadoPor, setEgresoAprobadoPor] = useState("Dirección Médica");
  const [egresoRef, setEgresoRef] = useState("");

  const [egresos, setEgresos] = useState<EgresoCaja[]>([]);

  // Modal Arqueo y Cierre de Caja
  const [showCierreModal, setShowCierreModal] = useState(false);
  const [efectivoContado, setEfectivoContado] = useState<number>(0);
  const [observacionesCierre, setObservacionesCierre] = useState("");
  const [actaCierre, setActaCierre] = useState<any | null>(null);

  // Listado de atenciones reales del turno / jornada (cargadas desde Supabase)
  const [transacciones, setTransacciones] = useState<TransaccionAtencion[]>([]);
  const [esAdminOSupervisor, setEsAdminOSupervisor] = useState(false);
  const [buscandoDni, setBuscandoDni] = useState(false);

  // 1. Cargar Egresos del Turno Activo desde Supabase
  const cargarEgresosTurno = async (turnoId: string, siteId: string) => {
    try {
      let query = supabase
        .from("caja_egreso")
        .select("*")
        .eq("site_id", siteId)
        .order("fecha_hora", { ascending: false });

      if (turnoId && !turnoId.startsWith("TURNO-")) {
        query = query.eq("turno_id", turnoId);
      }

      const { data, error } = await query;
      if (!error && data) {
        const mapeados: EgresoCaja[] = data.map((eg: any) => {
          const horaStr = new Date(eg.fecha_hora).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          return {
            id: eg.id,
            hora: horaStr,
            tipo: eg.tipo,
            concepto: eg.concepto,
            monto: Number(eg.monto) || 0,
            destinatario: eg.destinatario,
            aprobadoPor: eg.aprobado_por,
            comprobanteRef: eg.comprobante_ref,
          };
        });
        setEgresos(mapeados);
      } else {
        setEgresos([]);
      }
    } catch (err) {
      console.warn("Error al consultar egresos de caja:", err);
      setEgresos([]);
    }
  };

  // 2. Cargar Atenciones Reales Filtradas por Sede y Turno (Cero acumulación histórica)
  const cargarTransaccionesDelDia = async (sedeActual?: string, fechaCorte?: string) => {
    try {
      const s = sedeActual || sede;
      const siteId = getSiteId(s);

      const inicioDia = new Date();
      inicioDia.setHours(0, 0, 0, 0);

      let query = supabase
        .from("encuentro")
        .select(`
          id,
          servicio_solicitado,
          estado,
          fecha_hora,
          site_id,
          paciente:paciente_id (
            dni,
            nombres,
            apellidos,
            telefono
          ),
          sede:site_id (
            nombre
          ),
          orden_pago (
            monto,
            pago (
              id,
              monto,
              medio_pago,
              referencia
            )
          )
        `)
        .eq("site_id", siteId)
        .gte("fecha_hora", inicioDia.toISOString())
        .order("fecha_hora", { ascending: false });

      const { data, error } = await query.limit(50);

      if (error) {
        console.warn("Advertencia al consultar encuentros recientes:", error.message);
        return;
      }

      if (data) {
        const mapeadas: TransaccionAtencion[] = data.map((item: any) => {
          const pac = item.paciente || {};
          const ord = item.orden_pago?.[0];
          const pagosRaw: any[] = Array.isArray(ord?.pago) ? ord.pago : (ord?.pago ? [ord.pago] : []);
          const fecha = new Date(item.fecha_hora);
          const horaStr = fecha.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

          const tieneOrden = !!ord;
          const montoReal = tieneOrden && ord.monto !== undefined && ord.monto !== null ? Number(ord.monto) : 0;

          let medioPagoReal: any = "CONTROL";
          let pagosMapeados: PagoFraccionado[] = [];

          if (tieneOrden && pagosRaw.length > 0) {
            pagosMapeados = pagosRaw.map((p, idx) => ({
              id: p.id || `pago-${idx}-${Date.now()}`,
              medio: p.medio_pago,
              monto: Number(p.monto) || 0,
              referencia: p.referencia || "",
            }));

            if (pagosRaw.length > 1) {
              medioPagoReal = "MIXTO";
            } else {
              medioPagoReal = pagosRaw[0].medio_pago || "EFECTIVO";
            }
          }

          const refReal = tieneOrden && pagosRaw.length > 0
            ? (pagosRaw.map((p) => p.referencia).filter(Boolean).join(" / ") || "VENTANILLA")
            : (montoReal === 0 ? "PASE_SALA_S0" : "VENTANILLA");

          return {
            id: `OP-${item.id.slice(0, 6).toUpperCase()}`,
            encuentroId: item.id,
            hora: horaStr,
            fechaHoraRaw: item.fecha_hora,
            dni: pac.dni || "S/DNI",
            paciente: `${pac.nombres || ""} ${pac.apellidos || ""}`.trim() || "Paciente Registrado",
            telefono: pac.telefono || "",
            servicio: item.servicio_solicitado,
            monto: montoReal,
            medioPago: medioPagoReal,
            referencia: refReal,
            estadoConsultorio: item.estado,
            sede: normalizarSede(item.sede?.nombre),
            pagos: pagosMapeados.length > 0 ? pagosMapeados : undefined,
          };
        });
        setTransacciones(mapeadas);
      }
    } catch (err) {
      console.warn("Error al cargar atenciones del turno:", err);
    }
  };

  // 3. Cargar Turno Activo de Caja desde Supabase
  const cargarTurnoActivo = async (sedeNombre: string) => {
    try {
      setCargandoTurno(true);
      const siteId = getSiteId(sedeNombre);

      const { data: turnoData, error: turnoErr } = await supabase
        .from("caja_turno")
        .select("*")
        .eq("site_id", siteId)
        .eq("estado", "ABIERTA")
        .order("fecha_apertura", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!turnoErr && turnoData) {
        let montoRecuperado = Number(
          turnoData.fondo_inicial ??
          turnoData.monto_apertura ??
          turnoData.montoApertura ??
          0
        );

        if (montoRecuperado === 0 && typeof window !== "undefined") {
          const respaldoFondo = Number(sessionStorage.getItem("lm_fondo_apertura") || localStorage.getItem("lm_fondo_apertura") || 0);
          if (respaldoFondo > 0) {
            montoRecuperado = respaldoFondo;
          }
        }

        const turno: TurnoCaja = {
          id: turnoData.id,
          estado: "ABIERTA",
          fechaApertura: turnoData.fecha_apertura,
          montoApertura: montoRecuperado,
          cajeroNombre: turnoData.cajero_nombre || cajeroNombre,
          sede: sedeNombre,
        };
        setTurnoActivo(turno);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("lm_fondo_apertura", String(montoRecuperado));
        }
        await cargarEgresosTurno(turnoData.id, siteId);
        await cargarTransaccionesDelDia(sedeNombre, turnoData.fecha_apertura);
      } else {
        const respaldoFondo = typeof window !== "undefined" ? Number(sessionStorage.getItem("lm_fondo_apertura") || localStorage.getItem("lm_fondo_apertura") || 0) : 0;
        if (respaldoFondo > 0) {
          const turnoLocal: TurnoCaja = {
            id: `TURNO-${Date.now().toString().slice(-4)}`,
            estado: "ABIERTA",
            fechaApertura: new Date().toISOString(),
            montoApertura: respaldoFondo,
            cajeroNombre,
            sede: sedeNombre,
          };
          setTurnoActivo(turnoLocal);
        } else {
          setTurnoActivo(null);
        }
        setEgresos([]);
        const hoyInicio = new Date();
        hoyInicio.setHours(0, 0, 0, 0);
        await cargarTransaccionesDelDia(sedeNombre, hoyInicio.toISOString());
      }
    } catch (err) {
      console.warn("Error consultando turno activo:", err);
      const respaldoFondo = typeof window !== "undefined" ? Number(sessionStorage.getItem("lm_fondo_apertura") || localStorage.getItem("lm_fondo_apertura") || 0) : 0;
      if (respaldoFondo > 0) {
        setTurnoActivo({
          id: `TURNO-${Date.now().toString().slice(-4)}`,
          estado: "ABIERTA",
          fechaApertura: new Date().toISOString(),
          montoApertura: respaldoFondo,
          cajeroNombre,
          sede: sedeNombre,
        });
      } else {
        setTurnoActivo(null);
      }
      setEgresos([]);
    } finally {
      setCargandoTurno(false);
    }
  };

  // 4. Cargar Catálogo de Insumos Clínicos (Garantiza stock y costo_unitario real)
  const cargarProductosInventario = async (sedeNombre?: string) => {
    try {
      const s = sedeNombre || sede;
      const siteId = getSiteId(s);

      const { data, error } = await supabase
        .from("producto_inventario")
        .select("id, codigo, nombre, categoria, presentacion, stock_actual, stock_minimo, costo_unitario, precio_venta, activo, site_id")
        .eq("activo", true)
        .order("nombre", { ascending: true });

      if (error) {
        console.warn("Error consultando insumos de inventario:", error.message);
        return;
      }

      if (data && data.length > 0) {
        // Insumos globales (site_id is null) o vinculados a la sede actual
        const filtrados = data.filter((p: any) => !p.site_id || p.site_id === siteId);
        const lista = filtrados.length > 0 ? filtrados : data;
        const mapeados: ProductoDispensable[] = lista.map((p: any) => ({
          id: p.id,
          codigo: p.codigo,
          nombre: p.nombre,
          categoria: p.categoria,
          presentacion: p.presentacion,
          stock_actual: Number(p.stock_actual) || 0,
          stock_minimo: Number(p.stock_minimo) || 0,
          precio_costo: Number(p.costo_unitario) || 0,
          precio_venta: Number(p.precio_venta) || 0,
        }));
        setProductosInventario(mapeados.length > 0 ? mapeados : PRODUCTOS_INVENTARIO_INICIALES);
      }
    } catch (err) {
      console.warn("Error consultando insumos clínicos para dispensación:", err);
    }
  };

  // 5. Cargar Citas Programadas de Hoy y Próximas Reagendadas para la Sede
  const cargarCitasDelDia = async (sedeNombre?: string) => {
    try {
      setCargandoCitasDelDia(true);
      const s = sedeNombre || sede;
      const siteId = getSiteId(s);

      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hoyLocal = `${year}-${month}-${day}`;

      // 1. Citas programadas para HOY o PENDIENTES en esta sede (deduplicadas por paciente)
      const { data: dataHoy, error: errorHoy } = await supabase
        .from("cita_reagendada")
        .select("id, paciente_id, paciente_nombre, telefono, fecha, hora, motivo, estado, site_id, encuentro_id, created_at, encuentro:encuentro_id(id, estado)")
        .eq("site_id", siteId)
        .lte("fecha", hoyLocal)
        .neq("estado", "CANCELADA")
        .order("created_at", { ascending: false });

      if (!errorHoy && dataHoy) {
        const mapaHoy = new Map<string, CitaAgendadaDia>();
        for (const cita of dataHoy as CitaAgendadaDia[]) {
          const key = (cita.paciente_nombre || "").trim().toLowerCase();
          if (!mapaHoy.has(key)) {
            mapaHoy.set(key, cita);
          }
        }
        const citasHoyUnicas = Array.from(mapaHoy.values()).sort((a, b) =>
          (a.hora || "").localeCompare(b.hora || "")
        );
        setCitasDelDia(citasHoyUnicas);
      }

      // 2. Próximas citas reprogramadas (fechas futuras en esta sede, garantizando 1 sola tarjeta por paciente)
      const { data: dataFuturas, error: errorFuturas } = await supabase
        .from("cita_reagendada")
        .select("id, paciente_id, paciente_nombre, telefono, fecha, hora, motivo, estado, site_id, encuentro_id, created_at, encuentro:encuentro_id(id, estado)")
        .eq("site_id", siteId)
        .neq("estado", "CANCELADA")
        .gt("fecha", hoyLocal)
        .order("created_at", { ascending: false });

      if (!errorFuturas && dataFuturas) {
        const mapaFuturas = new Map<string, CitaAgendadaDia>();
        const idsDuplicadosABorrar: string[] = [];

        for (const cita of dataFuturas as CitaAgendadaDia[]) {
          const key = (cita.paciente_nombre || "").trim().toLowerCase();
          if (!mapaFuturas.has(key)) {
            mapaFuturas.set(key, cita);
          } else {
            // Registrar ID duplicado obsoleto para autopurga
            idsDuplicadosABorrar.push(cita.id);
          }
        }

        // Si existen duplicados acumulados en Supabase, purgarlos silenciosamente en segundo plano
        if (idsDuplicadosABorrar.length > 0) {
          (async () => {
            try {
              await supabase
                .from("cita_reagendada")
                .delete()
                .in("id", idsDuplicadosABorrar);
              console.log(`Autolimpieza completada: ${idsDuplicadosABorrar.length} citas duplicadas obsoletas purgadas.`);
            } catch (err) {
              console.warn("Aviso en autolimpieza de duplicados:", err);
            }
          })();
        }

        const citasFuturasUnicas = Array.from(mapaFuturas.values()).sort((a, b) => {
          const cmpFecha = a.fecha.localeCompare(b.fecha);
          if (cmpFecha !== 0) return cmpFecha;
          return (a.hora || "").localeCompare(b.hora || "");
        });
        setProximasCitas(citasFuturasUnicas);
      }
    } catch (err) {
      console.warn("Error al cargar citas programadas y reagendadas:", err);
    } finally {
      setCargandoCitasDelDia(false);
    }
  };

  // 1. Ejecutar Pase Directo con DNI verificado NTS 139-MINSA
  const ejecutarPaseDirecto = async (cita: CitaAgendadaDia, dniValidado: string) => {
    try {
      const siteId = getSiteId(sede);
      const rawNombre = (cita.paciente_nombre || "").trim();
      const parts = rawNombre.split(" ").filter(Boolean);
      const nom = parts.length >= 2 ? parts.slice(0, -1).join(" ") : rawNombre;
      const ape = parts.length >= 2 ? parts.slice(-1).join(" ") : "Paciente";

      // 1. Buscar o registrar paciente con su DNI verificado
      let pacId: string | null = null;
      const { data: pacExistente } = await supabase
        .from("paciente")
        .select("id, dni, nombres, apellidos")
        .eq("dni", dniValidado)
        .maybeSingle();

      if (pacExistente) {
        pacId = pacExistente.id;
        // Si el registro de paciente tenía un nombre sintético de prueba, actualizar con el nombre de la cita
        if (
          pacExistente.nombres?.toLowerCase().includes("ejm") ||
          pacExistente.nombres?.toLowerCase().includes("test") ||
          pacExistente.apellidos?.toLowerCase().includes("ejm") ||
          pacExistente.nombres?.toLowerCase().includes("prueba")
        ) {
          try {
            await supabase
              .from("paciente")
              .update({
                nombres: nom,
                apellidos: ape,
                telefono: cita.telefono || pacExistente.telefono || "000000000",
              })
              .eq("id", pacExistente.id);
          } catch {}
        }
      } else {
        const { data: nuevoPac, error: pErr } = await supabase
          .from("paciente")
          .insert({
            dni: dniValidado,
            nombres: nom,
            apellidos: ape,
            telefono: cita.telefono || "000000000",
          })
          .select("id")
          .single();
        if (pErr) throw pErr;
        pacId = nuevoPac?.id || null;
      }

      // 2. Insertar encuentro asistencial directo con S/ 0.00 en EN_ESPERA
      const { data: nuevoEncuentro, error: encErr } = await supabase
        .from("encuentro")
        .insert({
          paciente_id: pacId,
          site_id: siteId,
          servicio_solicitado: `Control / Reagendado: ${cita.motivo}`,
          estado: "EN_ESPERA",
          fecha_hora: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (encErr) throw encErr;

      // 3. Vincular con cita_reagendada si aplica
      if (cita.id && !cita.id.startsWith("TEMP-")) {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const hoyLocal = `${year}-${month}-${day}`;

        await supabase
          .from("cita_reagendada")
          .update({
            paciente_id: pacId,
            encuentro_id: nuevoEncuentro?.id || null,
            fecha: hoyLocal, // Si era cita futura, se actualiza a hoy porque el paciente se presentó hoy
            updated_at: new Date().toISOString(),
          })
          .eq("id", cita.id);
      }

      // 4. Emitir broadcast en tiempo real para el módulo médico HCE
      try {
        const canalCola = supabase.channel("cola-medica");
        await canalCola.send({
          type: "broadcast",
          event: "nuevo-paciente",
          payload: {
            paciente: cita.paciente_nombre,
            servicio: cita.motivo,
            sede: normalizarSede(sede),
            dni: dniValidado,
          },
        });
      } catch {}

      // 5. Refrescar datos en vivo
      await cargarTransaccionesDelDia(sede, turnoActivo?.fechaApertura);
      await cargarCitasDelDia(sede);
      setCitaValidandoDni(null);

      alert(
        `✅ Pase a Sala Médica Confirmado (NTS N.º 139):\n\n` +
          `• Paciente: ${cita.paciente_nombre}\n` +
          `• DNI Vinculado: ${dniValidado}\n` +
          `• Modalidad: Control / Ya Pagado (S/ 0.00)\n` +
          `• Sede: Sede ${normalizarSede(sede)}\n\n` +
          `La Historia Clínica Electrónica ha sido habilitada en la pantalla del médico.`
      );
    } catch (err: any) {
      console.error("Error al ingresar directo a sala:", err);
      alert(`Error al registrar pase a sala: ${err?.message || String(err)}`);
    }
  };

  // Pase Directo a Sala Médica (Controles de Seguimiento o Atenciones ya Canceladas - S/ 0.00)
  const handleIngresarDirectoASala = async (cita: CitaAgendadaDia) => {
    const yaEnEspera =
      cita.encuentro?.estado === "EN_ESPERA" ||
      transacciones.some(
        (t) =>
          t.estadoConsultorio === "EN_ESPERA" &&
          (t.paciente.toLowerCase().includes(cita.paciente_nombre.toLowerCase()) ||
            cita.paciente_nombre.toLowerCase().includes(t.paciente.toLowerCase()))
      );

    if (yaEnEspera) {
      alert(`El paciente "${cita.paciente_nombre}" ya se encuentra actualmente en la Sala de Espera médica.`);
      return;
    }

    // Buscar si ya tiene DNI válido registrado
    let dniExistente: string | null = null;
    const rawNombre = (cita.paciente_nombre || "").trim();
    const parts = rawNombre.split(" ").filter(Boolean);
    const nom = parts.length >= 2 ? parts.slice(0, -1).join(" ") : rawNombre;

    try {
      if (cita.paciente_id) {
        const { data: p } = await supabase.from("paciente").select("dni").eq("id", cita.paciente_id).maybeSingle();
        if (p?.dni && p.dni.length === 8 && /^\d+$/.test(p.dni)) {
          dniExistente = p.dni;
        }
      }
      if (!dniExistente) {
        const { data: p } = await supabase.from("paciente").select("dni").ilike("nombres", `%${nom}%`).limit(1).maybeSingle();
        if (p?.dni && p.dni.length === 8 && /^\d+$/.test(p.dni)) {
          dniExistente = p.dni;
        }
      }
    } catch {}

    if (dniExistente) {
      if (
        !confirm(
          `¿Confirmar ingreso directo a Sala de Espera médica para:\n"${cita.paciente_nombre}"?\n\n` +
            `• DNI Verificado: ${dniExistente}\n` +
            `• Motivo: ${cita.motivo}\n` +
            `• Sede: Sede ${normalizarSede(sede)}\n` +
            `• Modalidad: Control de Seguimiento / Previo (S/ 0.00)\n\n` +
            `El paciente aparecerá inmediatamente en la pantalla del médico/obstetra.`
        )
      ) {
        return;
      }
      await ejecutarPaseDirecto(cita, dniExistente);
    } else {
      // NTS N.º 139-MINSA: Solicitar DNI formal para vincular Historia Clínica Electrónica
      setCitaValidandoDni(cita);
      setDniPaseDirecto("");
      setDniPaseError(null);
      setDniPaseCoincidencia(null);
    }
  };

  // Verificación reactiva de DNI en modal de Pase Directo
  const handleDniPaseChange = async (val: string) => {
    const d = val.replace(/\D/g, "").slice(0, 8);
    setDniPaseDirecto(d);
    setDniPaseError(null);
    if (d.length === 8) {
      setBuscandoDniPase(true);
      try {
        const { data } = await supabase
          .from("paciente")
          .select("dni, nombres, apellidos")
          .eq("dni", d)
          .maybeSingle();
        if (data) {
          setDniPaseCoincidencia({
            encontrado: true,
            nombres: data.nombres,
            apellidos: data.apellidos,
            dni: data.dni,
          });
        } else {
          setDniPaseCoincidencia({ encontrado: false });
        }
      } catch {
        setDniPaseCoincidencia(null);
      } finally {
        setBuscandoDniPase(false);
      }
    } else {
      setDniPaseCoincidencia(null);
    }
  };

  // Acción de Ventanilla: Cargar en Carrito para Cobrar Paciente con Cita Programada
  const handleAdmitirCita = (cita: CitaAgendadaDia) => {
    const rawNombre = (cita.paciente_nombre || "").trim();
    const parts = rawNombre.split(" ").filter(Boolean);
    if (parts.length >= 3) {
      setNombres(parts.slice(0, -2).join(" "));
      setApellidos(parts.slice(-2).join(" "));
    } else if (parts.length === 2) {
      setNombres(parts[0]);
      setApellidos(parts[1]);
    } else {
      setNombres(rawNombre);
      setApellidos("");
    }

    if (cita.telefono) {
      setTelefono(cita.telefono);
    }

    // Buscar en catálogo de servicios o asignar el motivo como servicio
    const matchSrv = CATALOGO_SERVICIOS.find(
      (s) =>
        cita.motivo.toLowerCase().includes(s.nombre.toLowerCase()) ||
        s.nombre.toLowerCase().includes(cita.motivo.toLowerCase())
    );

    if (matchSrv) {
      setItemsCarrito([
        {
          id: `srv-${Date.now()}`,
          tipo: "SERVICIO",
          nombre: matchSrv.nombre,
          categoria: matchSrv.categoria,
          cantidad: 1,
          precioUnitario: matchSrv.precio,
          precioBaseCatalogo: matchSrv.precio,
        },
      ]);
    } else {
      setItemsCarrito([
        {
          id: `srv-${Date.now()}`,
          tipo: "SERVICIO",
          nombre: cita.motivo || "Consulta / Control Programado",
          categoria: "Consultas",
          cantidad: 1,
          precioUnitario: 70,
          precioBaseCatalogo: 70,
        },
      ]);
    }

    // Abrir sub-módulo de Admisión & Venta
    setSubModuloActivo("ADMISION_VENTA");
    setOpenSection((prev) => ({ ...prev, admision: true, pago: true }));

    // Scroll suave hacia el formulario de admisión
    const el = document.getElementById("seccion-formulario-admision");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Ciclo de Vida Principal (Unificado)
  useEffect(() => {
    const s = sessionStorage.getItem("lm_sede") || "Independencia";
    const nom = sessionStorage.getItem("lm_nombre") || "Operador de Ventanilla";
    const rol = sessionStorage.getItem("lm_rol") || "";
    const email = sessionStorage.getItem("lm_user") || "";

    setSede(s);
    setCajeroNombre(nom);

    if (rol === "ADMIN" || rol === "SUPERVISION" || email === "admin@lasmellizasperu.com") {
      setEsAdminOSupervisor(true);
    }

    cargarTurnoActivo(s);
    cargarProductosInventario(s);
    cargarCitasDelDia(s);

    // Suscripciones Realtime a nuevas atenciones, egresos, inventario y citas
    const channel = supabase
      .channel("admision-realtime-tx")
      .on("postgres_changes", { event: "*", schema: "public", table: "encuentro" }, () => {
        cargarTransaccionesDelDia(s, turnoActivo?.fechaApertura);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "caja_egreso" }, () => {
        if (turnoActivo?.id) {
          cargarEgresosTurno(turnoActivo.id, getSiteId(s));
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "producto_inventario" }, () => {
        cargarProductosInventario(s);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "cita_reagendada" }, () => {
        cargarCitasDelDia(s);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "encuentro" }, () => {
        cargarTransaccionesDelDia(s, turnoActivo?.fechaApertura);
        cargarCitasDelDia(s);
      })
      .subscribe();

    const canalColaMedica = supabase
      .channel("cola-medica")
      .on("broadcast", { event: "paciente_reprogramado" }, () => {
        cargarTransaccionesDelDia(s, turnoActivo?.fechaApertura);
        cargarCitasDelDia(s);
      })
      .on("broadcast", { event: "paciente_atendido" }, () => {
        cargarTransaccionesDelDia(s, turnoActivo?.fechaApertura);
        cargarCitasDelDia(s);
      })
      .on("broadcast", { event: "nuevo-paciente" }, () => {
        cargarTransaccionesDelDia(s, turnoActivo?.fechaApertura);
        cargarCitasDelDia(s);
      })
      .subscribe();

    const onStorageSync = (e: StorageEvent) => {
      if (e.key === "lm_paciente_reprogramado" || e.key === "lm_paciente_atendido") {
        cargarTransaccionesDelDia(s, turnoActivo?.fechaApertura);
        cargarCitasDelDia(s);
      }
    };
    window.addEventListener("storage", onStorageSync);

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(canalColaMedica);
      window.removeEventListener("storage", onStorageSync);
    };
  }, []);

  // Cambio dinámico e instantáneo de Sede Operativa
  const cambiarSedeOperativa = (nuevaSede: string) => {
    const sNorm = normalizarSede(nuevaSede);
    if (normalizarSede(sede) === sNorm) return;
    setSede(sNorm);
    sessionStorage.setItem("lm_sede", sNorm);
    cargarTurnoActivo(sNorm);
    cargarProductosInventario(sNorm);
    cargarCitasDelDia(sNorm);
    window.dispatchEvent(new Event("storage"));
  };

  // Búsqueda en tiempo real de paciente en Supabase por DNI
  const handleBuscarDNI = async (numDni: string) => {
    const d = numDni.replace(/\D/g, "").slice(0, 8);
    setDni(d);

    if (d.length === 8) {
      setBuscandoDni(true);
      try {
        const { data: pacExistente } = await supabase
          .from("paciente")
          .select("nombres, apellidos, telefono")
          .eq("dni", d)
          .maybeSingle();

        if (pacExistente) {
          setNombres(pacExistente.nombres || "");
          setApellidos(pacExistente.apellidos || "");
          setTelefono(pacExistente.telefono || "");
          setEstadoBusquedaDni("ENCONTRADO");
        } else {
          // Si el DNI no existe en el padrón, limpiar inmediatamente los datos del paciente anterior
          setNombres("");
          setApellidos("");
          setTelefono("");
          setEstadoBusquedaDni("NUEVO");
        }
      } catch (err) {
        console.warn("Error buscando paciente en base de datos:", err);
        setEstadoBusquedaDni(null);
      } finally {
        setBuscandoDni(false);
      }
    } else {
      setEstadoBusquedaDni(null);
      if (d.length === 0) {
        setNombres("");
        setApellidos("");
        setTelefono("");
      }
    }
  };

  const handleLimpiarAdmision = () => {
    setDni("");
    setNombres("");
    setApellidos("");
    setTelefono("");
    setEstadoBusquedaDni(null);
  };

  // Cálculos derivados del Carrito de Consumo
  const montoTotalCarrito = itemsCarrito.reduce(
    (acc, it) => acc + (it.cantidad * it.precioUnitario),
    0
  );
  const servicio = itemsCarrito.length > 0
    ? itemsCarrito.map((i) => `${i.cantidad > 1 ? `${i.cantidad}x ` : ""}${i.nombre}`).join(" + ")
    : "Sin servicios";
  const monto = montoTotalCarrito;
  const precioBaseCatalogo = itemsCarrito.reduce(
    (acc, it) => acc + (it.cantidad * it.precioBaseCatalogo),
    0
  );
  const medioPago = !modoSplit ? medioPagoUnico : "MIXTO";

  // Control de Pagos Fraccionados (Split Payment)
  const totalCobradoPlanificado = modoSplit
    ? pagosFraccionados.reduce((acc, p) => acc + (Number(p.monto) || 0), 0)
    : montoTotalCarrito;

  const saldoPendiente = Math.max(0, montoTotalCarrito - totalCobradoPlanificado);

  // Vuelto en efectivo (Monto Entregado - Monto Requerido)
  const vueltoEfectivo = modoSplit
    ? pagosFraccionados
        .filter((p) => p.medio === "EFECTIVO")
        .reduce((acc, p) => acc + Math.max(0, (Number(p.montoEntregado) || Number(p.monto)) - Number(p.monto)), 0)
    : (medioPagoUnico === "EFECTIVO" ? Math.max(0, (Number(efectivoEntregadoUnico) || 0) - montoTotalCarrito) : 0);

  const handleAgregarServicioAlCarrito = (srvNombre: string, precioDefecto?: number, categoria?: string) => {
    const p = precioDefecto ?? TARIFARIO_BASE[srvNombre] ?? 70;
    setItemsCarrito((prev) => {
      const existe = prev.find((item) => item.nombre === srvNombre && item.tipo !== "PRODUCTO");
      if (existe) {
        return prev.map((item) =>
          item.id === existe.id ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      const nuevoItem: ItemCarrito = {
        id: `srv-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        tipo: categoria === "Packs Promocionales" ? "PACK" : "SERVICIO",
        nombre: srvNombre,
        categoria: categoria || "Consultas",
        cantidad: 1,
        precioUnitario: p,
        precioBaseCatalogo: p,
      };
      return [...prev, nuevoItem];
    });
    setDropdownServicioAbierto(false);
    setBusquedaServicio("");
  };

  const handleAgregarProductoAlCarrito = (prod: ProductoDispensable) => {
    const precio = Number(prod.precio_venta) > 0
      ? Number(prod.precio_venta)
      : (Number(prod.precio_costo) > 0 ? Number(prod.precio_costo) : 0);

    const nombreCompleto = prod.presentacion
      ? `${prod.nombre} (${prod.presentacion})`
      : prod.nombre;

    setItemsCarrito((prev) => {
      const existeIndex = prev.findIndex(
        (item) => item.productoId === prod.id || (item.tipo === "PRODUCTO" && item.codigo === prod.codigo)
      );

      if (existeIndex >= 0) {
        return prev.map((item, idx) =>
          idx === existeIndex ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }

      const nuevoItem: ItemCarrito = {
        id: `prod-${prod.id || Date.now()}-${Date.now()}`,
        tipo: "PRODUCTO",
        codigo: prod.codigo,
        nombre: nombreCompleto,
        categoria: prod.categoria || "Farmacia",
        cantidad: 1,
        precioUnitario: precio,
        precioBaseCatalogo: precio,
        productoId: prod.id,
      };

      return [...prev, nuevoItem];
    });
    setDropdownFarmaciaAbierto(false);
    setBusquedaFarmacia("");
  };

  const handleAgregarPersonalizadoAlCarrito = (nombre: string, precio: number | "") => {
    if (!nombre.trim()) {
      alert("Ingrese el nombre del procedimiento o servicio especial.");
      return;
    }
    const p = typeof precio === "number" && precio > 0 ? precio : 50;
    const nuevoItem: ItemCarrito = {
      id: `custom-${Date.now()}`,
      tipo: "SERVICIO",
      nombre: nombre.trim(),
      categoria: "Procedimientos",
      cantidad: 1,
      precioUnitario: p,
      precioBaseCatalogo: p,
    };
    setItemsCarrito((prev) => [...prev, nuevoItem]);
    setTabCatalogo("SERVICIOS");
    setServicioPersonalizadoNombre("");
    setServicioPersonalizadoPrecio("");
  };

  const handleEliminarItemCarrito = (id: string) => {
    setItemsCarrito((prev) => {
      const updated = prev.filter((it) => it.id !== id);
      if (updated.length === 0) {
        setPagosFraccionados([]);
        setModoSplit(false);
        setEfectivoEntregadoUnico(0);
        setReferenciaUnica("");
      }
      return updated;
    });
  };

  const handleModificarCantidadItem = (id: string, nuevaCant: number) => {
    if (nuevaCant <= 0) {
      handleEliminarItemCarrito(id);
      return;
    }
    setItemsCarrito((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          return { ...it, cantidad: nuevaCant };
        }
        return it;
      })
    );
  };

  const handleModificarPrecioItem = (id: string, nuevoPrecio: number, motivo?: string) => {
    setItemsCarrito((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          return {
            ...it,
            precioUnitario: Number(nuevoPrecio) || 0,
            motivoAjuste: motivo !== undefined ? motivo : it.motivoAjuste,
          };
        }
        return it;
      })
    );
  };

  // Gestión de Pagos Fraccionados (Split Payment)
  const handleSeleccionarPagoRapido = (medio: "EFECTIVO" | "YAPE" | "PLIN" | "TARJETA_POS") => {
    setModoSplit(false);
    setMedioPagoUnico(medio);
    if (medio === "EFECTIVO") {
      setEfectivoEntregadoUnico(montoTotalCarrito >= 100 ? Math.ceil(montoTotalCarrito / 50) * 50 : 100);
    }
  };

  const handleActivarModoSplit = () => {
    setModoSplit(true);
    if (pagosFraccionados.length === 0) {
      setPagosFraccionados([
        {
          id: `pago-${Date.now()}`,
          medio: "EFECTIVO",
          monto: Math.round(montoTotalCarrito / 2),
          montoEntregado: Math.round(montoTotalCarrito / 2),
          referencia: "Ventanilla",
        },
        {
          id: `pago-${Date.now() + 1}`,
          medio: "YAPE",
          monto: montoTotalCarrito - Math.round(montoTotalCarrito / 2),
          referencia: "",
        },
      ]);
    }
  };

  const handleAgregarPagoFraccionado = () => {
    const cubierto = pagosFraccionados.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);
    const restante = Math.max(0, montoTotalCarrito - cubierto);
    const nuevoPago: PagoFraccionado = {
      id: `pago-${Date.now()}`,
      medio: "YAPE",
      monto: restante,
      referencia: "",
    };
    setPagosFraccionados((prev) => [...prev, nuevoPago]);
  };

  const handleEliminarPagoFraccionado = (id: string) => {
    if (pagosFraccionados.length <= 1) {
      alert("Debe mantener al menos un medio de pago.");
      return;
    }
    setPagosFraccionados((prev) => prev.filter((p) => p.id !== id));
  };

  const handleActualizarPagoFraccionado = (id: string, campos: Partial<PagoFraccionado>) => {
    setPagosFraccionados((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...campos } : p))
    );
  };

  // Anulación de Egreso (Restituye saldo de caja inmediatamente)
  const handleAnularEgreso = async (egresoId: string) => {
    if (!confirm("¿Confirma que desea anular este egreso? El monto se restituirá al efectivo de caja.")) return;

    try {
      if (!egresoId.startsWith("EGR-")) {
        await supabase.from("caja_egreso").delete().eq("id", egresoId);
      }
    } catch (err) {
      console.warn("Aviso al borrar egreso en Supabase:", err);
    }
    setEgresos((prev) => prev.filter((eg) => eg.id !== egresoId));
    alert("Egreso anulado con éxito.");
  };

  // Manejo de Sub-carrito de Farmacia e Insumos (Dispensación Múltiple por Lote)
  const handleAgregarItemDispensacion = () => {
    if (!productoDispensar) {
      setDispensacionErrorMsg("Seleccione un insumo o producto del inventario para agregarlo al lote.");
      return;
    }
    if (cantidadDispensar <= 0) {
      setDispensacionErrorMsg("La cantidad a agregar debe ser al menos 1 unidad.");
      return;
    }

    setDispensacionErrorMsg(null);
    setDispensacionExitoMsg(null);

    const existente = itemsDispensacion.find((it) => it.producto.id === productoDispensar.id);
    const cantActualEnLote = existente ? existente.cantidad : 0;
    const nuevaCantTotal = cantActualEnLote + cantidadDispensar;

    if (nuevaCantTotal > productoDispensar.stock_actual) {
      setDispensacionErrorMsg(
        `Stock insuficiente para "${productoDispensar.nombre}". Disponible: ${productoDispensar.stock_actual}, ya en lote: ${cantActualEnLote}, intento agregar: ${cantidadDispensar}.`
      );
      return;
    }

    if (existente) {
      setItemsDispensacion((prev) =>
        prev.map((it) =>
          it.producto.id === productoDispensar.id
            ? { ...it, cantidad: nuevaCantTotal }
            : it
        )
      );
    } else {
      setItemsDispensacion((prev) => [
        ...prev,
        {
          id: `disp-item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          producto: productoDispensar,
          cantidad: cantidadDispensar,
        },
      ]);
    }

    setCantidadDispensar(1);
  };

  const handleEliminarItemDispensacion = (itemId: string) => {
    setItemsDispensacion((prev) => prev.filter((it) => it.id !== itemId));
  };

  const handleModificarCantDispensacion = (itemId: string, nuevaCant: number) => {
    if (nuevaCant <= 0) {
      handleEliminarItemDispensacion(itemId);
      return;
    }
    setItemsDispensacion((prev) =>
      prev.map((it) => {
        if (it.id === itemId) {
          const maxStock = it.producto.stock_actual;
          return { ...it, cantidad: Math.min(nuevaCant, maxStock) };
        }
        return it;
      })
    );
  };

  const handleEjecutarDispensacionMultiple = async (e: React.FormEvent) => {
    e.preventDefault();
    if (itemsDispensacion.length === 0) {
      setDispensacionErrorMsg("Agregue al menos un insumo al lote de dispensación antes de procesar.");
      return;
    }

    // Validar existencias de todo el lote
    for (const item of itemsDispensacion) {
      if (item.cantidad > item.producto.stock_actual) {
        setDispensacionErrorMsg(
          `Stock insuficiente para "${item.producto.nombre}": solicitado ${item.cantidad}, disponible en almacén ${item.producto.stock_actual}.`
        );
        return;
      }
    }

    setIsDispensando(true);
    setDispensacionExitoMsg(null);
    setDispensacionErrorMsg(null);

    try {
      const currentUserName = cajeroNombre || sessionStorage.getItem("lm_nombre") || "Operador de Farmacia";
      const siteId = getSiteId(sede);
      const motivoFinal =
        motivoDispensacion.trim() ||
        (tipoDispensacion === "SALIDA_VENTA"
          ? `Venta en mostrador de farmacia / caja (Lote múltiple)`
          : `Dispensación de insumos para consultorio / uso asistencial`);

      // Procesar cada ítem del lote en Kárdex
      for (const item of itemsDispensacion) {
        const { error } = await supabase.rpc("registrar_movimiento_inventario", {
          p_producto_id: item.producto.id,
          p_tipo: tipoDispensacion,
          p_cantidad: Number(item.cantidad),
          p_motivo: `${motivoFinal} [${item.producto.nombre} x${item.cantidad}]`,
          p_site_id: siteId,
          p_usuario_nombre: currentUserName,
        });

        if (error) {
          console.warn(`RPC falló para ${item.producto.nombre}, aplicando actualización directa:`, error.message);
          const nuevoStock = item.producto.stock_actual - Number(item.cantidad);
          await supabase
            .from("producto_inventario")
            .update({ stock_actual: nuevoStock, updated_at: new Date().toISOString() })
            .eq("id", item.producto.id);

          await supabase.from("movimiento_inventario").insert({
            producto_id: item.producto.id,
            tipo: tipoDispensacion,
            cantidad: Number(item.cantidad),
            stock_anterior: item.producto.stock_actual,
            stock_nuevo: nuevoStock,
            motivo: `${motivoFinal} [${item.producto.nombre} x${item.cantidad}]`,
            usuario_nombre: currentUserName,
            site_id: siteId,
          });
        }
      }

      const totalUnidades = itemsDispensacion.reduce((s, it) => s + it.cantidad, 0);
      setDispensacionExitoMsg(
        `✓ Dispensación de lote completada con éxito: ${itemsDispensacion.length} insumos diferentes (${totalUnidades} unidades en total). Stock de Kárdex actualizado.`
      );
      setItemsDispensacion([]);
      setProductoDispensar(null);
      setCantidadDispensar(1);
      setMotivoDispensacion("");
      await cargarProductosInventario(sede);
      setTimeout(() => setDispensacionExitoMsg(null), 5000);
    } catch (err: any) {
      setDispensacionErrorMsg(err?.message || "Error al procesar la salida de lote en el kárdex.");
    } finally {
      setIsDispensando(false);
    }
  };

  // ============================================================================
  // GENERADORES Y CONTROLADORES DE IMPRESIÓN TÉRMICA POS (80mm / 58mm)
  // Aislamiento completo: Cero elementos de pantalla, márgenes limpios y corte térmico
  // ============================================================================
  const imprimirTicketTermico = (ticket: TransaccionAtencion) => {
    try {
      let iframe = document.getElementById("__ticket_thermal_print_frame__") as HTMLIFrameElement | null;
      if (iframe) {
        iframe.remove();
      }
      iframe = document.createElement("iframe");
      iframe.id = "__ticket_thermal_print_frame__";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      iframe.style.visibility = "hidden";
      document.body.appendChild(iframe);

      const fechaHoy = new Date().toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      const sedeNombre = ticket.sede || sede || "Independencia";
      const operador = cajeroNombre || "Operador de Ventanilla";

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
          <head>
            <meta charset="utf-8" />
            <title>Ticket ${ticket.id}</title>
            <style>
              @page {
                size: 80mm auto;
                margin: 0mm;
              }
              @media print {
                html, body {
                  width: 80mm;
                  margin: 0 !important;
                  padding: 0 !important;
                }
              }
              body {
                font-family: 'Courier New', Courier, monospace, system-ui, -apple-system, sans-serif;
                width: 74mm;
                margin: 0 auto;
                padding: 4mm 2mm;
                color: #000;
                background: #fff;
                font-size: 11px;
                line-height: 1.3;
              }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .font-bold { font-weight: bold; }
              .text-xl { font-size: 15px; }
              .text-lg { font-size: 13px; }
              .text-sm { font-size: 11px; }
              .text-xs { font-size: 10px; }
              .divider {
                border-top: 1px dashed #000;
                margin: 5px 0;
              }
              .divider-double {
                border-top: 2px solid #000;
                margin: 5px 0;
              }
              .row {
                display: flex;
                justify-content: space-between;
                margin: 2px 0;
              }
            </style>
          </head>
          <body>
            <div class="text-center">
              <div class="font-bold text-xl" style="letter-spacing: 0.5px;">LAS MELLIZAS PERÚ S.A.C.</div>
              <div class="text-sm font-bold">CONSULTORIO OBSTÉTRICO ECOGRÁFICO</div>
              <div class="text-xs">RUC: 20611827335</div>
              <div class="text-xs font-bold" style="margin-top: 2px;">SEDE: ${sedeNombre.toUpperCase()}</div>
            </div>

            <div class="divider-double"></div>

            <div class="text-center font-bold text-lg" style="margin: 3px 0;">
              TICKET: ${ticket.id}
            </div>

            <div class="divider"></div>

            <div class="row">
              <span class="text-xs">FECHA: ${fechaHoy}</span>
              <span class="text-xs">HORA: ${ticket.hora}</span>
            </div>
            <div class="row">
              <span class="text-xs">CAJERO/VENTANILLA:</span>
              <span class="text-xs font-bold">${operador}</span>
            </div>

            <div class="divider"></div>

            <div style="margin-bottom: 2px;">
              <span class="text-xs font-bold">PACIENTE:</span>
              <div class="font-bold text-sm">${ticket.paciente.toUpperCase()}</div>
            </div>
            <div class="row">
              <span class="text-xs font-bold">DNI / DOCUMENTO:</span>
              <span class="font-bold text-sm">${ticket.dni}</span>
            </div>

            <div class="divider"></div>

            <div>
              <span class="text-xs font-bold">DETALLE DE LA ATENCIÓN:</span>
              ${
                ticket.items && ticket.items.length > 0
                  ? ticket.items
                      .map(
                        (it) => `
                    <div class="row" style="margin: 2px 0;">
                      <span class="text-xs">${it.cantidad}x ${it.nombre}</span>
                      <span class="text-xs font-bold">S/ ${(it.cantidad * it.precioUnitario).toFixed(2)}</span>
                    </div>
                  `
                      )
                      .join("")
                  : `<div class="font-bold text-sm" style="margin-top: 1px;">${ticket.servicio}</div>`
              }
            </div>

            <div class="divider"></div>

            <div class="row" style="font-size: 13px; margin: 4px 0;">
              <span class="font-bold">TOTAL PAGADO:</span>
              <span class="font-bold">S/ ${ticket.monto.toFixed(2)}</span>
            </div>

            <div class="divider"></div>

            <div>
              <span class="text-xs font-bold">DESGLOSE DE PAGO:</span>
              ${
                ticket.pagos && ticket.pagos.length > 0
                  ? ticket.pagos
                      .map(
                        (p) => `
                    <div class="row text-xs" style="margin: 2px 0;">
                      <span>${p.medio}${p.referencia ? ` (${p.referencia})` : ""}</span>
                      <span class="font-bold">S/ ${Number(p.monto).toFixed(2)}</span>
                    </div>
                  `
                      )
                      .join("")
                  : `<div class="row text-xs"><span>FORMA DE PAGO:</span><span class="font-bold">${ticket.medioPago}</span></div>
                     ${ticket.referencia ? `<div class="row text-xs"><span>REFERENCIA / OP:</span><span>${ticket.referencia}</span></div>` : ""}`
              }
              ${
                ticket.vueltoEntregado && ticket.vueltoEntregado > 0
                  ? `<div class="row text-xs font-bold" style="margin-top: 3px; border-top: 1px dotted #000; padding-top: 2px;">
                      <span>VUELTO ENTREGADO:</span>
                      <span>S/ ${ticket.vueltoEntregado.toFixed(2)}</span>
                    </div>`
                  : ""
              }
            </div>

            <div class="divider-double"></div>

            <div class="text-center text-xs" style="margin-top: 6px;">
              <div class="font-bold">*** COMPROBANTE DE ATENCIÓN INTERNA ***</div>
              <div style="margin-top: 4px;">Por favor tome asiento y espere a ser llamado(a) en sala de espera.</div>
              <div class="text-xs" style="margin-top: 6px; font-size: 9px; color: #444;">
                Conexión Cifrada &bull; Ley N.° 26842 &bull; Ley N.° 29733
              </div>
            </div>
          </body>
        </html>
      `;

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(htmlContent);
        doc.close();

        setTimeout(() => {
          iframe?.contentWindow?.focus();
          iframe?.contentWindow?.print();
        }, 250);
      }
    } catch (err) {
      console.error("Error al imprimir ticket térmico:", err);
      window.print();
    }
  };

  const imprimirActaTermica = (acta: any) => {
    if (!acta) return;
    try {
      let iframe = document.getElementById("__acta_thermal_print_frame__") as HTMLIFrameElement | null;
      if (iframe) {
        iframe.remove();
      }
      iframe = document.createElement("iframe");
      iframe.id = "__acta_thermal_print_frame__";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      iframe.style.visibility = "hidden";
      document.body.appendChild(iframe);

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
          <head>
            <meta charset="utf-8" />
            <title>Acta de Cierre ${acta.id}</title>
            <style>
              @page {
                size: 80mm auto;
                margin: 0mm;
              }
              @media print {
                html, body {
                  width: 80mm;
                  margin: 0 !important;
                  padding: 0 !important;
                }
              }
              body {
                font-family: 'Courier New', Courier, monospace, system-ui, -apple-system, sans-serif;
                width: 74mm;
                margin: 0 auto;
                padding: 4mm 2mm;
                color: #000;
                background: #fff;
                font-size: 11px;
                line-height: 1.3;
              }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .font-bold { font-weight: bold; }
              .text-lg { font-size: 13px; }
              .text-xs { font-size: 10px; }
              .divider {
                border-top: 1px dashed #000;
                margin: 5px 0;
              }
              .divider-double {
                border-top: 2px solid #000;
                margin: 5px 0;
              }
              .row {
                display: flex;
                justify-content: space-between;
                margin: 2px 0;
              }
            </style>
          </head>
          <body>
            <div class="text-center">
              <div class="font-bold text-lg">LAS MELLIZAS PERÚ S.A.C.</div>
              <div class="text-xs font-bold">ACTA DE ARQUEO & CIERRE DE CAJA</div>
              <div class="text-xs">SEDE ${acta.sede?.toUpperCase() || sede.toUpperCase()} &bull; ${acta.id}</div>
            </div>

            <div class="divider-double"></div>

            <div class="row text-xs">
              <span>CAJERO(A):</span>
              <span class="font-bold">${acta.cajero}</span>
            </div>
            <div class="row text-xs">
              <span>FECHA / CIERRE:</span>
              <span>${acta.fechaCierre}</span>
            </div>

            <div class="divider"></div>

            <div class="row">
              <span>FONDO INICIAL:</span>
              <span>S/ ${Number(acta.montoApertura || 0).toFixed(2)}</span>
            </div>
            <div class="row font-bold">
              <span>VENTAS EFECTIVO:</span>
              <span>S/ ${Number(acta.recaudacionEfectivo || 0).toFixed(2)}</span>
            </div>
            <div class="row">
              <span>VENTAS DIGITALES (YAPE/POS):</span>
              <span>S/ ${Number(acta.recaudacionDigital || 0).toFixed(2)}</span>
            </div>
            <div class="row">
              <span>EGRESOS EN EFECTIVO:</span>
              <span>-S/ ${Number(acta.totalEgresos || 0).toFixed(2)}</span>
            </div>

            <div class="divider"></div>

            <div class="row font-bold">
              <span>SALDO TEÓRICO EN CAJA:</span>
              <span>S/ ${Number(acta.saldoTeorico || 0).toFixed(2)}</span>
            </div>
            <div class="row font-bold">
              <span>EFECTIVO CONTADO:</span>
              <span>S/ ${Number(acta.efectivoContado || 0).toFixed(2)}</span>
            </div>
            <div class="row font-bold" style="font-size: 13px;">
              <span>DIFERENCIA:</span>
              <span>S/ ${Number(acta.diferencia || 0).toFixed(2)}</span>
            </div>

            ${
              acta.observaciones
                ? `<div class="divider"></div><div><span class="font-bold text-xs">OBSERVACIONES:</span><div class="text-xs">${acta.observaciones}</div></div>`
                : ""
            }

            <div class="divider-double"></div>

            <div style="margin-top: 30px;" class="row">
              <div style="width: 45%; text-align: center; border-top: 1px solid #000; padding-top: 4px; font-size: 9px;">
                Firma Cajero
              </div>
              <div style="width: 45%; text-align: center; border-top: 1px solid #000; padding-top: 4px; font-size: 9px;">
                Firma Supervisor
              </div>
            </div>

            ${
              acta.hashCierre
                ? `
                <div class="divider"></div>
                <div style="font-size: 8px; text-align: center; word-break: break-all; color: #444; margin-top: 4px;">
                  <span class="font-bold">SELLO CRIPTOGRÁFICO SHA-256 INMUTABLE:</span><br/>
                  ${acta.hashCierre}
                </div>
                `
                : ""
            }
          </body>
        </html>
      `;

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(htmlContent);
        doc.close();

        setTimeout(() => {
          iframe?.contentWindow?.focus();
          iframe?.contentWindow?.print();
        }, 250);
      }
    } catch (err) {
      console.error("Error al imprimir acta de cierre:", err);
      window.print();
    }
  };

  // Procesar Admisión & Cobro con Integridad Transaccional ACID (Multiservicios & Split Payment)
  const handleProcesarAtencionYCobro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dni || !nombres || !apellidos) {
      alert("Por favor complete los datos obligatorios del paciente (DNI, Nombres y Apellidos).");
      return;
    }

    if (dni.trim().length < 8) {
      alert("El DNI debe tener 8 dígitos.");
      return;
    }

    if (itemsCarrito.length === 0) {
      alert("El carrito está vacío. Agregue al menos un servicio o producto antes de cobrar.");
      return;
    }

    if (!turnoActivo || turnoActivo.estado === "CERRADA") {
      alert("Debe realizar la Apertura de Caja antes de procesar cobros.");
      return;
    }

    // Resolver desglose de pagos finales
    const pagosFinales: PagoFraccionado[] = modoSplit
      ? pagosFraccionados.filter((p) => Number(p.monto) > 0)
      : [
          {
            id: `pago-${Date.now()}`,
            medio: medioPagoUnico,
            monto: montoTotalCarrito,
            montoEntregado: medioPagoUnico === "EFECTIVO" ? (Number(efectivoEntregadoUnico) || montoTotalCarrito) : montoTotalCarrito,
            referencia: referenciaUnica.trim() || (medioPagoUnico === "EFECTIVO" ? "EFECTIVO-VENTANILLA" : "OP-DIRECTA"),
          },
        ];

    const totalCubierto = pagosFinales.reduce((acc, p) => acc + Number(p.monto), 0);
    if (totalCubierto < montoTotalCarrito) {
      alert(
        `Monto insuficiente: El total cubierto (${formatCurrency(totalCubierto)}) no alcanza el total a cobrar (${formatCurrency(
          montoTotalCarrito
        )}).\nFaltan ${formatCurrency(montoTotalCarrito - totalCubierto)}.`
      );
      return;
    }

    setIsProcessing(true);

    const now = new Date();
    const horaStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const siteId = getSiteId(sede);
    const resumenServicios = itemsCarrito
      .map((i) => `${i.cantidad > 1 ? `${i.cantidad}x ` : ""}${i.nombre}`)
      .join(" + ");
    const medioPagoDesc = !modoSplit
      ? medioPagoUnico
      : pagosFinales.length === 1
      ? pagosFinales[0].medio
      : "MIXTO";

    let encuentroId = "";
    let txExito = false;
    let mensajeError = "";

    // 1. Intentar registrar atómicamente con la nueva función RPC Multiservicio
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc("registrar_atencion_y_cobro_multiservicio", {
        p_dni: dni.trim(),
        p_nombres: nombres.trim(),
        p_apellidos: apellidos.trim(),
        p_telefono: telefono.trim() || "000000000",
        p_site_id: siteId,
        p_items: itemsCarrito,
        p_monto_total: montoTotalCarrito,
        p_pagos: pagosFinales,
        p_usuario_nombre: cajeroNombre || "Cajero Ventanilla",
      });

      if (!rpcErr && rpcRes?.encuentro_id) {
        encuentroId = rpcRes.encuentro_id;
        txExito = true;
      } else if (rpcErr) {
        console.warn("RPC Multiservicio no disponible o falló:", rpcErr.message);
        mensajeError = rpcErr.message;
      }
    } catch (errRpc: any) {
      console.warn("Fallo al llamar RPC Multiservicio:", errRpc);
      mensajeError = errRpc?.message || String(errRpc);
    }

    // 2. Respaldo directo en tablas si RPC no está desplegado aún en Supabase
    if (!txExito) {
      try {
        // Upsert Paciente por DNI
        const { data: pacData, error: pacErr } = await supabase
          .from("paciente")
          .upsert(
            {
              dni: dni.trim(),
              nombres: nombres.trim(),
              apellidos: apellidos.trim(),
              telefono: telefono.trim() || "000000000",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "dni" }
          )
          .select()
          .single();

        if (pacErr || !pacData) {
          throw new Error("Fallo al registrar paciente en base de datos: " + (pacErr?.message || "Error de red"));
        }

        // Crear Encuentro
        const { data: encData, error: encErr } = await supabase
          .from("encuentro")
          .insert({
            paciente_id: pacData.id,
            site_id: siteId,
            servicio_solicitado: resumenServicios,
            estado: "EN_ESPERA",
            fecha_hora: new Date().toISOString(),
          })
          .select()
          .single();

        if (encErr || !encData) {
          throw new Error("Fallo al registrar encuentro clínico: " + (encErr?.message || "Error RLS"));
        }

        encuentroId = encData.id;

        // Crear Orden de Pago con desglose de items
        const { data: ordData, error: ordErr } = await supabase
          .from("orden_pago")
          .insert({
            encuentro_id: encData.id,
            paciente_id: pacData.id,
            site_id: siteId,
            servicio: resumenServicios,
            monto: montoTotalCarrito,
            items: itemsCarrito,
            estado: "PAGADO",
          })
          .select()
          .single();

        if (ordData) {
          const { data: userAuth } = await supabase.auth.getUser();
          const cajeroId = userAuth.user?.id;

          // Registrar cada pago fraccionado en public.pago
          for (const p of pagosFinales) {
            await supabase.from("pago").insert({
              orden_id: ordData.id,
              cajero_id: cajeroId,
              medio_pago: p.medio,
              monto: Number(p.monto),
              referencia: p.referencia?.trim() || (p.medio === "EFECTIVO" ? "EFECTIVO-VENTANILLA" : "OP-SPLIT"),
              fecha_hora: new Date().toISOString(),
            });
          }

          // Descontar inventario para productos clínicos del carrito
          for (const it of itemsCarrito) {
            if (it.productoId) {
              const prod = productosInventario.find((p) => p.id === it.productoId);
              if (prod) {
                const nuevoStock = Math.max(0, prod.stock_actual - it.cantidad);
                await supabase
                  .from("producto_inventario")
                  .update({ stock_actual: nuevoStock, updated_at: new Date().toISOString() })
                  .eq("id", it.productoId);

                await supabase.from("movimiento_inventario").insert({
                  producto_id: it.productoId,
                  tipo: "SALIDA_VENTA",
                  cantidad: it.cantidad,
                  stock_anterior: prod.stock_actual,
                  stock_nuevo: nuevoStock,
                  motivo: "Dispensación en Carrito Multiservicios (Admisión/Caja)",
                  usuario_nombre: cajeroNombre || "Cajero Ventanilla",
                  site_id: siteId,
                });
              }
            }
          }
        }

        txExito = true;
      } catch (directErr: any) {
        console.error("Error definitivo de persistencia multiservicios:", directErr);
        setIsProcessing(false);
        alert(
          "Error de persistencia en Supabase:\n\n" +
            (directErr?.message || mensajeError || "Compruebe la conexión a la base de datos.") +
            "\n\nPor favor aplique el Script 13 en Supabase SQL Editor."
        );
        return;
      }
    }

    const nuevaTx: TransaccionAtencion = {
      id: encuentroId ? `OP-${encuentroId.slice(0, 6).toUpperCase()}` : `OP-${Math.floor(100 + Math.random() * 900)}`,
      encuentroId: encuentroId || undefined,
      hora: horaStr,
      dni: dni.trim(),
      paciente: `${nombres.trim()} ${apellidos.trim()}`,
      telefono: telefono.trim(),
      servicio: resumenServicios,
      monto: montoTotalCarrito,
      medioPago: medioPagoDesc as any,
      referencia: pagosFinales.map((p) => p.referencia).filter(Boolean).join(" | ") || (medioPagoUnico === "EFECTIVO" ? "EFECTIVO" : "DIGITAL"),
      estadoConsultorio: "EN_ESPERA",
      sede: normalizarSede(sede),
      items: [...itemsCarrito],
      pagos: [...pagosFinales],
      vueltoEntregado: vueltoEfectivo,
    };

    // Notificar en tiempo real a los médicos conectados vía Supabase Realtime
    try {
      const channel = supabase.channel("cola-medica");
      channel.send({
        type: "broadcast",
        event: "nuevo_paciente_en_espera",
        payload: {
          ...nuevaTx,
          id: encuentroId || nuevaTx.id,
        },
      });

      localStorage.setItem("lm_nuevo_paciente_en_espera", JSON.stringify({ ...nuevaTx, id: encuentroId || nuevaTx.id }));
    } catch {}

    setTransacciones((prev) => [nuevaTx, ...prev]);
    setTicketEmitido(nuevaTx);
    setIsProcessing(false);

    // Si hubo vuelto en efectivo, alertar visualmente al cajero
    if (vueltoEfectivo > 0) {
      alert(`¡Cobro registrado con éxito!\n\n💵 VUELTO A ENTREGAR AL PACIENTE: ${formatCurrency(vueltoEfectivo)}`);
    }

    // Refrescar stock de inventario por si hubo salidas de farmacia
    cargarProductosInventario(sede);

    // Limpiar formulario por completo para el siguiente paciente (pantalla 100% limpia sin servicios predeterminados)
    setDni("");
    setNombres("");
    setApellidos("");
    setTelefono("");
    setReferenciaUnica("");
    setItemsCarrito([]);
    setModoSplit(false);
    setMedioPagoUnico("EFECTIVO");
    setPagosFraccionados([]);
    setEfectivoEntregadoUnico(0);
    setTabCatalogo("SERVICIOS");
    setDropdownServicioAbierto(false);
    setDropdownFarmaciaAbierto(false);
    setServicioPersonalizadoNombre("");
    setServicioPersonalizadoPrecio("");
  };

  // Exportación segura de libro de recaudación (Ley N.° 29733 - Minimización de datos)
  const handleExportarLibroCaja = () => {
    if (!esAdminOSupervisor) {
      alert("Acceso restringido: Solo Dirección Médica y Supervisión pueden exportar datos masivos.");
      return;
    }
    if (transacciones.length === 0) {
      alert("No hay atenciones registradas para exportar en esta jornada.");
      return;
    }

    // Cabeceras estrictamente administrativas/financieras (CERO notas clínicas ni diagnósticos)
    const cabeceras = [
      "ID Operacion",
      "Hora",
      "Sede",
      "DNI",
      "Paciente",
      "Servicio Solicitado",
      "Monto (S/)",
      "Medio de Pago",
      "Referencia",
      "Estado Consultorio",
    ];

    const filas = transacciones.map((t) => [
      `"${t.id}"`,
      `"${t.hora}"`,
      `"${t.sede}"`,
      `"${t.dni}"`,
      `"${t.paciente.replace(/"/g, '""')}"`,
      `"${t.servicio.replace(/"/g, '""')}"`,
      t.monto.toFixed(2),
      `"${t.medioPago}"`,
      `"${(t.referencia || "").replace(/"/g, '""')}"`,
      `"${t.estadoConsultorio}"`,
    ]);

    const csvContent = "\uFEFF" + [cabeceras.join(","), ...filas.map((f) => f.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const fechaHoy = new Date().toISOString().slice(0, 10);
    link.setAttribute("href", url);
    link.setAttribute("download", `las_mellizas_recaudacion_${sede.toLowerCase()}_${fechaHoy}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Registrar Salida / Gasto Persistido en Supabase
  const handleRegistrarEgreso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (egresoMonto <= 0 || !egresoConcepto.trim() || !egresoDestinatario.trim()) {
      alert("Complete los datos requeridos para la salida de dinero.");
      return;
    }
    if (!turnoActivo || turnoActivo.estado !== "ABIERTA") {
      alert("Debe abrir el turno de caja antes de registrar egresos.");
      return;
    }

    const siteId = getSiteId(sede);
    const now = new Date();
    const horaStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    try {
      const { data: userAuth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("caja_egreso")
        .insert({
          turno_id: turnoActivo.id.startsWith("TURNO-") ? null : turnoActivo.id,
          site_id: siteId,
          cajero_id: userAuth.user?.id || null,
          tipo: egresoTipo,
          concepto: egresoConcepto.trim(),
          monto: Number(egresoMonto),
          destinatario: egresoDestinatario.trim(),
          aprobado_por: egresoAprobadoPor.trim() || "Dirección Médica",
          comprobante_ref: egresoRef.trim() || "REC-INTERNO",
          fecha_hora: now.toISOString(),
        })
        .select()
        .maybeSingle();

      const nuevoEgreso: EgresoCaja = {
        id: data?.id || `EGR-${Math.floor(100 + Math.random() * 900)}`,
        hora: horaStr,
        tipo: egresoTipo,
        concepto: egresoConcepto.trim(),
        monto: Number(egresoMonto),
        destinatario: egresoDestinatario.trim(),
        aprobadoPor: egresoAprobadoPor.trim() || "Dirección Médica",
        comprobanteRef: egresoRef.trim() || "REC-INTERNO",
      };

      setEgresos((prev) => [nuevoEgreso, ...prev]);
      setEgresoConcepto("");
      setEgresoMonto(0);
      setEgresoDestinatario("");
      alert("Egreso de caja registrado exitosamente y debitado del efectivo en ventanilla.");
    } catch (err: any) {
      console.warn("Aviso al guardar egreso en base de datos:", err);
      const nuevoEgreso: EgresoCaja = {
        id: `EGR-${Math.floor(100 + Math.random() * 900)}`,
        hora: horaStr,
        tipo: egresoTipo,
        concepto: egresoConcepto.trim(),
        monto: Number(egresoMonto),
        destinatario: egresoDestinatario.trim(),
        aprobadoPor: egresoAprobadoPor.trim() || "Dirección Médica",
        comprobanteRef: egresoRef.trim() || "REC-INTERNO",
      };
      setEgresos((prev) => [nuevoEgreso, ...prev]);
      setEgresoConcepto("");
      setEgresoMonto(0);
      setEgresoDestinatario("");
    }
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
      const siteId = getSiteId(reagendarSede);
      const currentUserName = cajeroNombre || sessionStorage.getItem("lm_nombre") || "Operador de Ventanilla";

      // Determinar el encuentro a cancelar si proviene de un paciente en cola o ventanilla
      let encuentroIdACancelar = reagendarEncuentroId;
      if (!encuentroIdACancelar) {
        // Buscar en transacciones del turno actual si hay un encuentro en espera para esta paciente
        const matchEnTurno = transacciones.find(
          (t) =>
            t.estadoConsultorio === "EN_ESPERA" &&
            (t.paciente.toLowerCase().includes(pacienteNom.toLowerCase()) ||
              pacienteNom.toLowerCase().includes(t.paciente.toLowerCase()))
        );
        if (matchEnTurno?.encuentroId) {
          encuentroIdACancelar = matchEnTurno.encuentroId;
        }
      }

      // 1. Intentar registrar y deslistar atómicamente con la RPC segura de PostgreSQL
      let rpcExitosa = false;
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc("reprogramar_cita_y_retirar_espera", {
          p_encuentro_id: encuentroIdACancelar || null,
          p_paciente_nombre: pacienteNom,
          p_telefono: (reagendarTelefono || telefono).trim() || null,
          p_fecha: reagendarFecha,
          p_hora: reagendarHora,
          p_motivo: reagendarMotivo,
          p_site_id: siteId,
          p_usuario_nombre: currentUserName,
        });

        if (!rpcErr && rpcRes?.success) {
          rpcExitosa = true;
          if (rpcRes.encuentro_id_cancelado) {
            encuentroIdACancelar = rpcRes.encuentro_id_cancelado;
          }
        }
      } catch (eRpc) {
        console.warn("RPC reprogramar_cita falló o no desplegada:", eRpc);
      }

      // 2. Fallback de persistencia directa con unicidad estricta (UPSERT) si RPC no corrió
      if (!rpcExitosa) {
        const nomLimpio = pacienteNom.trim();

        // Buscar si ya existe una cita pendiente para este paciente (para actualizar en vez de duplicar)
        const { data: citasExistentes } = await supabase
          .from("cita_reagendada")
          .select("id, paciente_nombre, fecha, hora, estado")
          .ilike("paciente_nombre", nomLimpio)
          .eq("estado", "PROGRAMADA")
          .order("created_at", { ascending: false });

        if (citasExistentes && citasExistentes.length > 0) {
          // ACTUALIZAR el registro existente con la nueva fecha, hora, motivo y sede
          const citaPrincipalId = citasExistentes[0].id;
          await supabase
            .from("cita_reagendada")
            .update({
              fecha: reagendarFecha,
              hora: reagendarHora,
              motivo: reagendarMotivo,
              site_id: siteId,
              telefono: (reagendarTelefono || telefono).trim() || null,
            })
            .eq("id", citaPrincipalId);

          // Purgar duplicados obsoletos si existieran
          if (citasExistentes.length > 1) {
            const idsDuplicados = citasExistentes.slice(1).map((c: any) => c.id);
            await supabase
              .from("cita_reagendada")
              .delete()
              .in("id", idsDuplicados);
          }
        } else {
          // Si no existe, insertar nueva cita
          await supabase.from("cita_reagendada").insert({
            paciente_nombre: nomLimpio,
            telefono: (reagendarTelefono || telefono).trim() || null,
            fecha: reagendarFecha,
            hora: reagendarHora,
            motivo: reagendarMotivo,
            site_id: siteId,
            estado: "PROGRAMADA",
          });
        }

        // Si tenemos el encuentro o lo encontramos por nombre en base de datos, cancelarlo
        if (encuentroIdACancelar) {
          await supabase
            .from("encuentro")
            .update({
              estado: "CANCELADO",
              updated_at: new Date().toISOString(),
            })
            .eq("id", encuentroIdACancelar);
        }
      }

      // 3. Actualizar la lista local de transacciones para deslistar al paciente de "En Espera" INMEDIATAMENTE
      setTransacciones((prev) =>
        prev.map((t) => {
          const coincideId = encuentroIdACancelar && (t.encuentroId === encuentroIdACancelar || t.id === encuentroIdACancelar);
          const coincideNom =
            t.paciente.toLowerCase().includes(pacienteNom.toLowerCase()) ||
            pacienteNom.toLowerCase().includes(t.paciente.toLowerCase());

          if (coincideId || coincideNom) {
            return {
              ...t,
              estadoConsultorio: "CANCELADO" as any,
              observaciones: `Cita reagendada para ${reagendarFecha} ${reagendarHora}`,
            };
          }
          return t;
        })
      );

      // 4. Notificar a tiempo real a consultorio médico para que retire al paciente de la cola inmediatamente
      try {
        const canalCola = supabase.channel("cola-medica");
        canalCola.send({
          type: "broadcast",
          event: "paciente_reprogramado",
          payload: {
            encuentroId: encuentroIdACancelar,
            paciente: pacienteNom,
            nuevaFecha: reagendarFecha,
            nuevaHora: reagendarHora,
          },
        });
        localStorage.setItem("lm_paciente_reprogramado", Date.now().toString());
      } catch (eBroad) {
        console.warn("Aviso broadcast:", eBroad);
      }

      // 5. Refrescar citas del día y próximas
      await cargarCitasDelDia(sede);

      // Si la fecha es futura, activar la pestaña de próximas citas para que el usuario la vea de inmediato
      const dNow = new Date();
      const hoyStr = `${dNow.getFullYear()}-${String(dNow.getMonth() + 1).padStart(2, "0")}-${String(dNow.getDate()).padStart(2, "0")}`;
      if (reagendarFecha > hoyStr) {
        setTabBandejaCitas("PROXIMAS");
      }

      setReagendadaExitoMsg("✓ Cita reagendada exitosamente. El paciente ha sido retirado de la cola de espera de consultorio.");
      setReagendarEncuentroId(null);
      setTimeout(() => setReagendadaExitoMsg(null), 5000);
    } catch (err: any) {
      setReagendadaExitoMsg("Error al guardar cita: " + (err?.message || "Error de conexión"));
    } finally {
      setReagendandoLoading(false);
    }
  };

  const prepararReagendamientoPara = (atencion: TransaccionAtencion) => {
    setReagendarPaciente(atencion.paciente);
    if (atencion.telefono) {
      setReagendarTelefono(atencion.telefono);
    }
    setReagendarMotivo(`Control de Seguimiento - ${atencion.servicio}`);
    setReagendarSede(normalizarSede(atencion.sede || sede));
    setReagendarEncuentroId(atencion.encuentroId || (atencion.id.startsWith("OP-") ? null : atencion.id));
    setSubModuloActivo("CITAS_REAGENDAMIENTOS");
    setOpenSection((prev) => ({ ...prev, reagendamiento: true }));
    const el = document.getElementById("seccion-reagendamiento");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const prepararModificacionCita = (cita: CitaAgendadaDia) => {
    setReagendarPaciente(cita.paciente_nombre);
    if (cita.telefono) {
      setReagendarTelefono(cita.telefono);
    }
    setReagendarFecha(cita.fecha);
    setReagendarHora(cita.hora ? cita.hora.slice(0, 5) : "09:00");
    setReagendarMotivo(cita.motivo);
    setReagendarSede(normalizarSede(sede));
    setReagendarEncuentroId(null);
    setSubModuloActivo("CITAS_REAGENDAMIENTOS");
    setOpenSection((prev) => ({ ...prev, reagendamiento: true }));
    const el = document.getElementById("seccion-reagendamiento");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleCancelarEncuentroDirecto = async (tx: TransaccionAtencion) => {
    if (!confirm(`¿Confirma retirar a "${tx.paciente}" de la sala de espera?\n\nEl turno se marcará como cancelado y saldrá inmediatamente de la pantalla del médico.`)) {
      return;
    }

    try {
      const targetId = tx.encuentroId || (tx.id.startsWith("OP-") ? null : tx.id);
      if (targetId) {
        await supabase
          .from("encuentro")
          .update({
            estado: "CANCELADO",
            updated_at: new Date().toISOString(),
          })
          .eq("id", targetId);
      }

      setTransacciones((prev) =>
        prev.map((t) => (t.id === tx.id ? { ...t, estadoConsultorio: "CANCELADO" as any } : t))
      );

      try {
        const canalCola = supabase.channel("cola-medica");
        canalCola.send({
          type: "broadcast",
          event: "paciente_reprogramado",
          payload: { encuentroId: targetId, paciente: tx.paciente },
        });
        localStorage.setItem("lm_paciente_reprogramado", Date.now().toString());
      } catch {}

      alert(`Paciente "${tx.paciente}" retirado de la cola de espera de consultorio.`);
    } catch (err: any) {
      alert("Error al retirar paciente: " + (err?.message || "Error de conexión"));
    }
  };

  // Cálculos Financieros del Turno (Aislados estrictamente al turno activo y con soporte Split)
  const transaccionesDelTurno = transacciones.filter(
    (t) => !turnoActivo?.fechaApertura || !t.fechaHoraRaw || t.fechaHoraRaw >= turnoActivo.fechaApertura
  );

  const totalEfectivoCobros = transaccionesDelTurno.reduce((acc, t) => {
    if (t.pagos && t.pagos.length > 0) {
      const efSplit = t.pagos
        .filter((p) => p.medio === "EFECTIVO")
        .reduce((sum, p) => sum + Number(p.monto), 0);
      return acc + efSplit;
    }
    return t.medioPago === "EFECTIVO" ? acc + t.monto : acc;
  }, 0);

  const totalDigitalCobros = transaccionesDelTurno.reduce((acc, t) => {
    if (t.pagos && t.pagos.length > 0) {
      const digSplit = t.pagos
        .filter((p) => p.medio !== "EFECTIVO")
        .reduce((sum, p) => sum + Number(p.monto), 0);
      return acc + digSplit;
    }
    return t.medioPago !== "EFECTIVO" ? acc + t.monto : acc;
  }, 0);

  const totalEgresos = egresos.reduce((acc, eg) => acc + eg.monto, 0);

  // Fórmula contable estricta: Efectivo Esperado = Fondo Inicial + Cobros en Efectivo - Egresos
  const fondoApertura = Number(
    turnoActivo?.montoApertura ??
    (typeof window !== "undefined" ? sessionStorage.getItem("lm_fondo_apertura") : null) ??
    0
  );
  const efectivoNetoEsperado = fondoApertura + totalEfectivoCobros - totalEgresos;
  const totalFacturadoBruto = totalEfectivoCobros + totalDigitalCobros;

  // Sincronización en tiempo real del monitor de pacientes del turno con la columna vino
  useEffect(() => {
    const mapeados: PacienteTurnoAdmision[] = transacciones.map((t) => ({
      id: t.id,
      encuentroId: t.encuentroId,
      paciente: t.paciente,
      dni: t.dni,
      servicio: t.servicio,
      monto: t.monto,
      medioPago: t.medioPago,
      hora: t.hora,
      estadoConsultorio: t.estadoConsultorio,
      sede: t.sede,
    }));
    setPacientesTurno(mapeados);
    setCajaAbierta(turnoActivo?.estado === "ABIERTA");
    setFondoAperturaContext(fondoApertura);
  }, [transacciones, turnoActivo, fondoApertura, setPacientesTurno, setCajaAbierta, setFondoAperturaContext]);

  // Apertura de Turno Persistida en Base de Datos (con persistencia de fondo_inicial)
  const handleAbrirTurno = async () => {
    const siteId = getSiteId(sede);
    const now = new Date();
    const fechaIso = now.toISOString();
    const montoNum = Number(montoAperturaInput) || 0;

    if (typeof window !== "undefined") {
      sessionStorage.setItem("lm_fondo_apertura", String(montoNum));
      localStorage.setItem("lm_fondo_apertura", String(montoNum));
    }

    try {
      const { data: userAuth } = await supabase.auth.getUser();
      const cajeroId = userAuth?.user?.id || null;

      let turnoIdGenerado = `TURNO-${Date.now().toString().slice(-4)}`;

      // Intentar insertar con fondo_inicial y monto_apertura
      try {
        const { data, error } = await supabase
          .from("caja_turno")
          .insert({
            site_id: siteId,
            cajero_id: cajeroId,
            cajero_nombre: cajeroNombre,
            monto_apertura: montoNum,
            fondo_inicial: montoNum,
            estado: "ABIERTA",
            fecha_apertura: fechaIso,
          })
          .select()
          .single();

        if (!error && data) {
          turnoIdGenerado = data.id;
        }
      } catch {
        const { data } = await supabase
          .from("caja_turno")
          .insert({
            site_id: siteId,
            cajero_id: cajeroId,
            cajero_nombre: cajeroNombre,
            monto_apertura: montoNum,
            estado: "ABIERTA",
            fecha_apertura: fechaIso,
          })
          .select()
          .single();

        if (data) {
          turnoIdGenerado = data.id;
        }
      }

      const nuevoTurno: TurnoCaja = {
        id: turnoIdGenerado,
        estado: "ABIERTA",
        fechaApertura: fechaIso,
        montoApertura: montoNum,
        cajeroNombre,
        sede,
      };

      setTurnoActivo(nuevoTurno);
      setEgresos([]);
      setTransacciones([]);
      setShowAperturaModal(false);
      alert(`Turno de caja aperturado con éxito. Fondo inicial: ${formatCurrency(montoNum)}`);
    } catch (err: any) {
      console.warn("Fallo al registrar turno en Supabase, usando respaldo local:", err);
      const nuevoTurno: TurnoCaja = {
        id: `TURNO-${Date.now().toString().slice(-4)}`,
        estado: "ABIERTA",
        fechaApertura: fechaIso,
        montoApertura: montoNum,
        cajeroNombre,
        sede,
      };
      setTurnoActivo(nuevoTurno);
      setEgresos([]);
      setTransacciones([]);
      setShowAperturaModal(false);
    }
  };

  // Cierre y Arqueo Formal Persistido en Supabase (Bloqueo Atómico de Concurrencia)
  const handleEjecutarArqueo = async () => {
    if (isCerrandoTurno) return;
    setIsCerrandoTurno(true);

    const diferencia = efectivoContado - efectivoNetoEsperado;
    const now = new Date();

    // Auditoría NTS-139: Si existen pacientes en espera al momento del arqueo, registrarlos formalmente
    const pacientesEnEsperaTurno = transacciones.filter((t) => t.estadoConsultorio === "EN_ESPERA");
    let obsAuditadas = (observacionesCierre || "").trim();
    if (pacientesEnEsperaTurno.length > 0) {
      const notaEspera = `[AUDITORÍA NTS-139: Cierre con ${pacientesEnEsperaTurno.length} paciente(s) en espera: ${pacientesEnEsperaTurno.map((p) => p.paciente).join(", ")}]`;
      obsAuditadas = obsAuditadas ? `${obsAuditadas} | ${notaEspera}` : notaEspera;
    }

    // Cálculo de Sello Criptográfico Inmutable SHA-256 para Cierre de Caja
    const canonicalPayloadCaja = [
      `INSTITUCION:LAS_MELLIZAS`,
      `TURNO_ID:${turnoActivo?.id || "OFFLINE"}`,
      `SEDE:${sede}`,
      `CAJERO:${cajeroNombre}`,
      `FECHA_CIERRE_UTC:${now.toISOString()}`,
      `FONDO_APERTURA:${fondoApertura.toFixed(2)}`,
      `EFECTIVO_COBROS:${totalEfectivoCobros.toFixed(2)}`,
      `DIGITAL_COBROS:${totalDigitalCobros.toFixed(2)}`,
      `EGRESOS:${totalEgresos.toFixed(2)}`,
      `EFECTIVO_ESPERADO:${efectivoNetoEsperado.toFixed(2)}`,
      `EFECTIVO_DECLARADO:${efectivoContado.toFixed(2)}`,
      `DIFERENCIA:${diferencia.toFixed(2)}`,
      `TRANSACCIONES_COUNT:${transacciones.length}`,
    ].join("|");
    const hashCierre = await generarHashCanonicoCaja(canonicalPayloadCaja);

    // Actualizar cierre en Supabase con condición atómica estado = ABIERTA (Prevención de condición de carrera)
    if (turnoActivo?.id && !turnoActivo.id.startsWith("TURNO-")) {
      try {
        const { data: turnoActualizado, error: errorCierre } = await supabase
          .from("caja_turno")
          .update({
            estado: "CERRADA",
            fecha_cierre: now.toISOString(),
            monto_cierre_efectivo_declarado: efectivoContado,
            total_ingresos_efectivo: totalEfectivoCobros,
            total_ingresos_digital: totalDigitalCobros,
            total_egresos: totalEgresos,
            efectivo_neto_esperado: efectivoNetoEsperado,
            diferencia: diferencia,
            observaciones: obsAuditadas,
            hash_cierre: hashCierre,
          })
          .eq("id", turnoActivo.id)
          .eq("estado", "ABIERTA")
          .select();

        if (errorCierre) {
          console.error("Error al persistir cierre de turno en Supabase:", errorCierre);
          alert(`Error de base de datos al cerrar el turno: ${errorCierre.message}`);
          setIsCerrandoTurno(false);
          return;
        }

        if (!turnoActualizado || turnoActualizado.length === 0) {
          alert(
            "AVISO DE SEGURIDAD Y CONCURRENCIA:\n\nEl turno ya se encuentra en estado CERRADA o fue cerrado por otra sesión simultánea.\nNo se aplicaron modificaciones redundantes ni se sobrescribieron los montos."
          );
          setIsCerrandoTurno(false);
          setShowCierreModal(false);
          setTurnoActivo(null);
          return;
        }
      } catch (err: any) {
        console.error("Excepción al ejecutar cierre atómico en Supabase:", err);
        alert(`Error inesperado al cerrar turno: ${err?.message || String(err)}`);
        setIsCerrandoTurno(false);
        return;
      }
    }

    const acta = {
      id: `ACTA-${Date.now().toString().slice(-6)}`,
      fecha: now.toLocaleDateString("es-PE"),
      hora: now.toLocaleTimeString("es-PE"),
      fechaCierre: now.toLocaleString("es-PE"),
      turnoId: turnoActivo?.id || "TURNO-001",
      cajero: cajeroNombre,
      sede,
      fondoInicial: fondoApertura,
      montoApertura: fondoApertura,
      efectivoCobros: totalEfectivoCobros,
      recaudacionEfectivo: totalEfectivoCobros,
      digitalCobros: totalDigitalCobros,
      recaudacionDigital: totalDigitalCobros,
      egresosTotales: totalEgresos,
      totalEgresos: totalEgresos,
      efectivoEsperado: efectivoNetoEsperado,
      saldoTeorico: efectivoNetoEsperado,
      efectivoContado: efectivoContado,
      diferencia,
      totalBruto: totalFacturadoBruto,
      observaciones: obsAuditadas,
      hashCierre,
    };

    setActaCierre(acta);

    if (typeof window !== "undefined") {
      sessionStorage.removeItem("lm_fondo_apertura");
      localStorage.removeItem("lm_fondo_apertura");
    }

    setTurnoActivo(null);
    setEgresos([]);
    setIsCerrandoTurno(false);
    alert("Arqueo y Cierre de Caja completado formalmente. El próximo turno iniciará limpio con su propio fondo.");
  };

  const calcularVuelto = () => {
    return vueltoEfectivo;
  };

  return (
    <div className="space-y-6">

      {/* 1. Header de Estado del Módulo & Barra de Turno */}
      <div className="bg-white rounded-3xl p-4 border border-brand-200/80 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-brand-900 leading-tight">Módulo de Administración</h1>
            <p className="text-[11px] text-neutral-400 font-mono">Gestión Asistencial & Ventanilla</p>
          </div>
        </div>

        {!turnoActivo || turnoActivo.estado !== "ABIERTA" ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAperturaModal(true)}
              className="bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs px-4 py-2 rounded-2xl shadow transition flex items-center gap-1.5 cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>Abrir Turno de Caja</span>
            </button>
          </div>
        ) : null}
      </div>

      {/* ========================================================== */}
      {/* SUB-MÓDULO 1: ADMISIÓN & VENTA (MINIMALISTA, 0 SCROLL)   */}
      {/* ========================================================== */}
      {subModuloActivo === "ADMISION_VENTA" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Columna Izquierda: Admisión del Paciente & Carrito Multiservicios */}
          <div className="lg:col-span-7 space-y-4">
          {/* ACORDEÓN 1: Admisión & Paciente */}
          <div id="seccion-formulario-admision" className="bg-white rounded-3xl border border-neutral-200/80 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("admision")}
              className="w-full p-4 bg-neutral-50/70 border-b border-neutral-100 flex items-center justify-between text-left transition hover:bg-neutral-100/50"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-brand-100 text-brand-800 flex items-center justify-center font-black text-xs">
                  <UserPlus className="w-4 h-4" />
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-extrabold text-neutral-600 uppercase tracking-wider">
                      DNI / Carnet Extranjería (8 Dígitos) *
                    </label>
                    {(dni || nombres) && (
                      <button
                        type="button"
                        onClick={handleLimpiarAdmision}
                        className="text-[10px] text-neutral-500 hover:text-rose-600 font-bold transition flex items-center gap-1"
                      >
                        <X className="w-3 h-3" /> Limpiar datos
                      </button>
                    )}
                  </div>
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

                  {buscandoDni && (
                    <div className="text-[11px] text-neutral-500 flex items-center gap-1.5 pt-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-700" />
                      <span>Consultando padrón clínico...</span>
                    </div>
                  )}

                  {estadoBusquedaDni === "ENCONTRADO" && (
                    <div className="mt-1.5 p-2 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-900 flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0" />
                      <span>Paciente encontrado en padrón clínico. Datos cargados automáticamente.</span>
                    </div>
                  )}

                  {estadoBusquedaDni === "NUEVO" && (
                    <div className="mt-1.5 p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>DNI nuevo (sin registro previo). Ingrese los nombres y apellidos para aperturar su Historia Clínica.</span>
                    </div>
                  )}
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

          {/* ACORDEÓN 2: Carrito Multiservicios & Insumos */}
          <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-sm relative z-30">
            <button
              type="button"
              onClick={() => toggleSection("tarifario")}
              className="w-full p-4 bg-neutral-50/70 border-b border-neutral-100 flex items-center justify-between text-left transition hover:bg-neutral-100/50 rounded-t-3xl"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-black text-xs">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">
                    Carrito Multiservicios & Insumos
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    <strong>{itemsCarrito.length} {itemsCarrito.length === 1 ? "ítem" : "ítems"}</strong> &bull; Total a pagar: <strong className="text-brand-800 font-mono">{formatCurrency(montoTotalCarrito)}</strong>
                  </p>
                </div>
              </div>
              {openSection.tarifario ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
            </button>

            {openSection.tarifario && (
              <div className="p-4 space-y-4">
                {/* Selector de Catálogo para Agregar: TABS MUTUAMENTE EXCLUYENTES */}
                <div className="flex items-center justify-between gap-2 border-b border-neutral-100 pb-2.5">
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setTabCatalogo("SERVICIOS");
                        setDropdownFarmaciaAbierto(false);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        tabCatalogo === "SERVICIOS"
                          ? "bg-purple-700 text-white shadow-xs"
                          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                      }`}
                    >
                      <span>+ Servicio / Pack</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTabCatalogo("FARMACIA");
                        setDropdownServicioAbierto(false);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        tabCatalogo === "FARMACIA"
                          ? "bg-blue-700 text-white shadow-xs"
                          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                      }`}
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>+ Insumo / Producto</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setTabCatalogo(tabCatalogo === "PERSONALIZADO" ? "SERVICIOS" : "PERSONALIZADO");
                      setDropdownServicioAbierto(false);
                      setDropdownFarmaciaAbierto(false);
                    }}
                    className={`text-[11px] font-bold flex items-center gap-1 px-3 py-1.5 rounded-xl transition ${
                      tabCatalogo === "PERSONALIZADO"
                        ? "bg-brand-700 text-white shadow-xs"
                        : "text-brand-700 hover:text-brand-900 bg-neutral-100 hover:bg-neutral-200"
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                    <span>Otro / Personalizado</span>
                  </button>
                </div>

                {/* TAB 1: Si selecciona SERVICIOS */}
                {tabCatalogo === "SERVICIOS" && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1 bg-neutral-100 p-1 rounded-xl text-[11px] font-bold">
                      {(["Todas", "Packs Promocionales", "Ecografías", "Consultas", "Procedimientos", "Laboratorio"] as const).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCategoriaFiltro(cat)}
                          className={`px-2.5 py-1 rounded-lg transition ${
                            categoriaFiltro === cat
                              ? "bg-white text-neutral-900 shadow-xs"
                              : "text-neutral-500 hover:text-neutral-900"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    <div className="relative">
                      <div className="relative">
                        <input
                          type="text"
                          value={busquedaServicio}
                          onFocus={() => setDropdownServicioAbierto(true)}
                          onChange={(e) => {
                            setBusquedaServicio(e.target.value);
                            setDropdownServicioAbierto(true);
                          }}
                          placeholder="Escriba para buscar servicio y agregar al carrito..."
                          className="w-full pl-9 pr-10 py-2 rounded-xl border border-neutral-300 text-xs font-bold bg-white focus:ring-2 focus:ring-purple-700"
                        />
                        <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                        {dropdownServicioAbierto && (
                          <button
                            type="button"
                            onClick={() => setDropdownServicioAbierto(false)}
                            className="absolute right-2.5 top-2 text-neutral-400 hover:text-neutral-700 text-xs font-bold p-0.5"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {dropdownServicioAbierto && (
                        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-neutral-300 rounded-2xl shadow-2xl z-50 max-h-64 overflow-y-auto divide-y divide-neutral-100 ring-1 ring-black/5">
                          {CATALOGO_SERVICIOS
                            .filter((srv) => {
                              const matchCat = categoriaFiltro === "Todas" || srv.categoria === categoriaFiltro;
                              const matchBusq =
                                !busquedaServicio ||
                                srv.nombre.toLowerCase().includes(busquedaServicio.toLowerCase()) ||
                                (srv.descripcion && srv.descripcion.toLowerCase().includes(busquedaServicio.toLowerCase()));
                              return matchCat && matchBusq;
                            })
                            .map((srv) => (
                              <div
                                key={srv.nombre}
                                onClick={() => handleAgregarServicioAlCarrito(srv.nombre, srv.precio, srv.categoria)}
                                className="p-2.5 px-3.5 hover:bg-purple-50/70 cursor-pointer flex items-center justify-between transition text-xs"
                              >
                                <div className="truncate pr-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-neutral-900">{srv.nombre}</span>
                                    <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-neutral-100 text-neutral-600">
                                      {srv.categoria}
                                    </span>
                                  </div>
                                  {srv.descripcion && (
                                    <p className="text-[10px] text-neutral-400 truncate mt-0.5">{srv.descripcion}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-purple-700 font-mono shrink-0">
                                    {formatCurrency(srv.precio)}
                                  </span>
                                  <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded-md">
                                    + Añadir
                                  </span>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: Si selecciona FARMACIA / INSUMOS (Colapsable y controlado) */}
                {tabCatalogo === "FARMACIA" && (
                  <div className="space-y-2">
                    <div className="relative">
                      <div className="relative">
                        <input
                          type="text"
                          value={busquedaFarmacia}
                          onFocus={() => setDropdownFarmaciaAbierto(true)}
                          onChange={(e) => {
                            setBusquedaFarmacia(e.target.value);
                            setDropdownFarmaciaAbierto(true);
                          }}
                          placeholder="Buscar insumo, ampolla, óvulo o fármaco del inventario..."
                          className="w-full pl-9 pr-10 py-2 rounded-xl border border-neutral-300 text-xs font-bold bg-white focus:ring-2 focus:ring-blue-700"
                        />
                        <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                        {dropdownFarmaciaAbierto && (
                          <button
                            type="button"
                            onClick={() => setDropdownFarmaciaAbierto(false)}
                            className="absolute right-2.5 top-2 text-neutral-400 hover:text-neutral-700 text-xs font-bold p-0.5"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {dropdownFarmaciaAbierto && (
                        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-neutral-300 rounded-2xl shadow-2xl z-50 max-h-72 overflow-y-auto divide-y divide-neutral-100 ring-1 ring-black/5 p-1">
                          {productosInventario
                            .filter((p) =>
                              !busquedaFarmacia ||
                              p.nombre.toLowerCase().includes(busquedaFarmacia.toLowerCase()) ||
                              p.codigo.toLowerCase().includes(busquedaFarmacia.toLowerCase()) ||
                              (p.categoria && p.categoria.toLowerCase().includes(busquedaFarmacia.toLowerCase()))
                            )
                            .map((p) => (
                              <div
                                key={p.id}
                                onClick={() => handleAgregarProductoAlCarrito(p)}
                                className="p-2.5 px-3 hover:bg-blue-50/70 rounded-xl cursor-pointer flex items-center justify-between transition border border-transparent hover:border-blue-200"
                              >
                                <div className="min-w-0 pr-2">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-neutral-900">{p.nombre}</span>
                                    <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono font-bold">
                                      {p.codigo}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-neutral-500 block mt-0.5">
                                    {p.presentacion} &bull; Stock: <strong className={p.stock_actual <= 0 ? "text-amber-700" : "text-emerald-700"}>{p.stock_actual} unid.</strong>
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className="font-mono font-black text-blue-900 text-xs">
                                    {formatCurrency(p.precio_venta > 0 ? p.precio_venta : p.precio_costo)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAgregarProductoAlCarrito(p);
                                    }}
                                    className="text-[11px] bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold px-3 py-1.5 rounded-xl shadow-xs transition flex items-center gap-1 shrink-0"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>+ Agregar</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: Si selecciona OTRO / PERSONALIZADO */}
                {tabCatalogo === "PERSONALIZADO" && (
                  <div className="p-3 bg-brand-50/60 rounded-2xl border border-brand-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-brand-900">Procedimiento / Servicio Especial no Listado</span>
                      <button
                        type="button"
                        onClick={() => setTabCatalogo("SERVICIOS")}
                        className="text-[10px] text-neutral-500 hover:text-neutral-900 font-bold"
                      >
                        ✕ Cancelar
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          value={servicioPersonalizadoNombre}
                          onChange={(e) => setServicioPersonalizadoNombre(e.target.value)}
                          placeholder="Nombre del servicio o procedimiento..."
                          className="w-full px-2.5 py-1.5 border border-brand-300 rounded-xl text-xs bg-white"
                        />
                      </div>
                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          min={1}
                          value={servicioPersonalizadoPrecio === "" || servicioPersonalizadoPrecio === 0 ? "" : servicioPersonalizadoPrecio}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setServicioPersonalizadoPrecio(e.target.value === "" ? "" : Number(e.target.value))}
                          placeholder="S/ 0.00"
                          className="w-20 px-2 py-1.5 border border-brand-300 rounded-xl text-xs font-mono font-bold bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleAgregarPersonalizadoAlCarrito(servicioPersonalizadoNombre, servicioPersonalizadoPrecio)}
                          className="flex-1 py-1.5 bg-brand-700 text-white font-bold text-xs rounded-xl hover:bg-brand-800"
                        >
                          Añadir
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ESTRUCTURA FIJA E INAMOVIBLE DEL CARRITO DE CONSUMO */}
                <div className="pt-3 border-t border-neutral-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-purple-700" />
                      <span className="text-xs font-black text-neutral-800 uppercase tracking-wider">
                        Detalle del Carrito ({itemsCarrito.length})
                      </span>
                    </div>
                    {itemsCarrito.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setItemsCarrito([]);
                          setPagosFraccionados([]);
                          setModoSplit(false);
                          setEfectivoEntregadoUnico(0);
                          setReferenciaUnica("");
                        }}
                        className="text-[10px] text-neutral-400 hover:text-rose-600 font-bold flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Vaciar carrito</span>
                      </button>
                    )}
                  </div>

                  {itemsCarrito.length === 0 ? (
                    <div className="p-6 bg-neutral-50/80 border border-dashed border-neutral-200 rounded-2xl text-center space-y-1">
                      <ShoppingCart className="w-6 h-6 text-neutral-300 mx-auto" />
                      <p className="text-xs text-neutral-500 font-bold">El carrito está vacío.</p>
                      <p className="text-[11px] text-neutral-400">
                        Seleccione arriba los servicios o productos a facturar en esta atención.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-2xl overflow-hidden bg-white max-h-80 overflow-y-auto">
                      {itemsCarrito.map((it) => (
                        <div key={it.id} className="p-3 space-y-2 hover:bg-neutral-50/40 transition">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md shrink-0 ${
                                  it.tipo === "PRODUCTO"
                                    ? "bg-blue-100 text-blue-800"
                                    : it.tipo === "PACK"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-purple-100 text-purple-800"
                                }`}
                              >
                                {it.tipo}
                              </span>
                              <span className="text-xs font-bold text-neutral-900 truncate">{it.nombre}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleEliminarItemCarrito(it.id)}
                              className="p-1 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0"
                              title="Eliminar del carrito"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-neutral-50">
                            {/* Stepper Cantidad */}
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-neutral-400 font-bold mr-1">Cant:</span>
                              <button
                                type="button"
                                onClick={() => handleModificarCantidadItem(it.id, it.cantidad - 1)}
                                className="w-5 h-5 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-700 flex items-center justify-center font-black text-xs"
                              >
                                -
                              </button>
                              <span className="w-6 text-center font-mono font-bold text-xs">{it.cantidad}</span>
                              <button
                                type="button"
                                onClick={() => handleModificarCantidadItem(it.id, it.cantidad + 1)}
                                className="w-5 h-5 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-700 flex items-center justify-center font-black text-xs"
                              >
                                +
                              </button>
                            </div>

                            {/* Precio Unitario Editable */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-neutral-400 font-bold">P. Unit: S/</span>
                              <input
                                type="number"
                                min={0}
                                value={it.precioUnitario === 0 ? "" : it.precioUnitario}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => handleModificarPrecioItem(it.id, e.target.value === "" ? 0 : Number(e.target.value))}
                                placeholder="0"
                                className="w-16 px-1.5 py-0.5 border border-neutral-300 rounded-md text-xs font-mono font-bold text-right"
                              />
                            </div>

                            {/* Subtotal Línea */}
                            <div className="text-right font-mono">
                              <span className="text-[10px] text-neutral-400 mr-1">Subtotal:</span>
                              <span className="text-xs font-black text-neutral-900">
                                {formatCurrency(it.cantidad * it.precioUnitario)}
                              </span>
                            </div>
                          </div>

                          {/* Justificación de Ajuste si el precio difiere del catálogo */}
                          {it.precioUnitario !== it.precioBaseCatalogo && (
                            <div className="pt-1">
                              <input
                                type="text"
                                value={it.motivoAjuste || ""}
                                onChange={(e) => handleModificarPrecioItem(it.id, it.precioUnitario, e.target.value)}
                                placeholder="Motivo de descuento o ajuste comercial (ej. Campaña, Convenio)..."
                                className="w-full px-2 py-1 rounded-lg border border-amber-300 text-[10px] bg-amber-50/50"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* BLOQUE INAMOVIBLE DEL TOTAL GENERAL (SIEMPRE VISIBLE) */}
                  <div className="p-3.5 bg-neutral-900 text-white rounded-2xl flex items-center justify-between shadow-xs">
                    <div>
                      <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-extrabold block">
                        Total General del Carrito
                      </span>
                      <span className="text-xs text-neutral-300 font-medium">
                        {itemsCarrito.length} {itemsCarrito.length === 1 ? "ítem registrado" : "ítems registrados"}
                      </span>
                    </div>
                    <div className="text-right font-mono">
                      <span className={`text-xl font-black ${itemsCarrito.length > 0 ? "text-emerald-400" : "text-neutral-400"}`}>
                        {formatCurrency(montoTotalCarrito)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          </div>

          {/* Columna Derecha: Cobranza, Pagos Mixtos & Ticket */}
          <div className="lg:col-span-5 space-y-4">
          {/* ACORDEÓN 3: Pagos Mixtos (Split Payment) & Emisión */}
          <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-sm relative z-20">
            <button
              type="button"
              onClick={() => toggleSection("pago")}
              className="w-full p-4 bg-neutral-50/70 border-b border-neutral-100 flex items-center justify-between text-left transition hover:bg-neutral-100/50 rounded-t-3xl"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">
                    Cobranza & Pagos Mixtos (Split Payment)
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Modo: <strong>{modoSplit ? "Pago Mixto / Fraccionado" : medioPagoUnico}</strong> &bull; Total: {formatCurrency(montoTotalCarrito)}
                  </p>
                </div>
              </div>
              {openSection.pago ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
            </button>

            {openSection.pago && (
              <div className="p-5 space-y-4">
                {/* Selector Rápido de Forma de Pago: 100% vs Split */}
                <div>
                  <label className="block text-[11px] font-extrabold text-neutral-600 uppercase tracking-wider mb-2">
                    Seleccionar Modalidad de Cobro
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSeleccionarPagoRapido("EFECTIVO")}
                      className={`py-2.5 px-2 rounded-2xl border text-center transition flex flex-col items-center gap-1 ${
                        !modoSplit && medioPagoUnico === "EFECTIVO"
                          ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-600/20 font-bold"
                          : "border-neutral-200 hover:bg-neutral-50 text-neutral-600"
                      }`}
                    >
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs">Efectivo 100%</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSeleccionarPagoRapido("YAPE")}
                      className={`py-2.5 px-2 rounded-2xl border text-center transition flex flex-col items-center gap-1 ${
                        !modoSplit && medioPagoUnico === "YAPE"
                          ? "border-purple-600 bg-purple-50 text-purple-900 ring-2 ring-purple-600/20 font-bold"
                          : "border-neutral-200 hover:bg-neutral-50 text-neutral-600"
                      }`}
                    >
                      <Smartphone className="w-4 h-4 text-purple-700" />
                      <span className="text-xs">Yape 100%</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSeleccionarPagoRapido("PLIN")}
                      className={`py-2.5 px-2 rounded-2xl border text-center transition flex flex-col items-center gap-1 ${
                        !modoSplit && medioPagoUnico === "PLIN"
                          ? "border-sky-600 bg-sky-50 text-sky-900 ring-2 ring-sky-600/20 font-bold"
                          : "border-neutral-200 hover:bg-neutral-50 text-neutral-600"
                      }`}
                    >
                      <Smartphone className="w-4 h-4 text-sky-600" />
                      <span className="text-xs">Plin 100%</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSeleccionarPagoRapido("TARJETA_POS")}
                      className={`py-2.5 px-2 rounded-2xl border text-center transition flex flex-col items-center gap-1 ${
                        !modoSplit && medioPagoUnico === "TARJETA_POS"
                          ? "border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-600/20 font-bold"
                          : "border-neutral-200 hover:bg-neutral-50 text-neutral-600"
                      }`}
                    >
                      <CreditCard className="w-4 h-4 text-amber-600" />
                      <span className="text-xs">POS 100%</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleActivarModoSplit}
                      className={`py-2.5 px-2 rounded-2xl border text-center transition flex flex-col items-center gap-1 ${
                        modoSplit
                          ? "border-brand-700 bg-brand-50 text-brand-900 ring-2 ring-brand-700/20 font-black"
                          : "border-neutral-200 hover:bg-neutral-50 text-neutral-600"
                      }`}
                    >
                      <ArrowRightLeft className="w-4 h-4 text-brand-700" />
                      <span className="text-xs">Pago Mixto ⮂</span>
                    </button>
                  </div>
                </div>

                {/* MODALIDAD 1: PAGO ÚNICO */}
                {!modoSplit && (
                  <div className="space-y-3">
                    {medioPagoUnico === "EFECTIVO" ? (
                      <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                              Efectivo Recibido (S/) *
                            </label>
                            <input
                              type="number"
                              min={montoTotalCarrito}
                              value={efectivoEntregadoUnico === 0 ? "" : efectivoEntregadoUnico}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => setEfectivoEntregadoUnico(e.target.value === "" ? 0 : Number(e.target.value))}
                              placeholder={montoTotalCarrito > 0 ? String(montoTotalCarrito) : "0.00"}
                              className="w-full px-3 py-2 rounded-xl border border-emerald-300 text-sm font-mono font-bold bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                              Vuelto a Entregar al Paciente
                            </label>
                            <div className="py-2 px-3 rounded-xl bg-white border border-emerald-300 text-sm font-mono font-black text-emerald-800 flex items-center justify-between">
                              <span>Vuelto:</span>
                              <span className="text-base">{formatCurrency(vueltoEfectivo)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Botones de billetes rápidos */}
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-[10px] text-emerald-800 font-bold">Monto Exacto:</span>
                          <button
                            type="button"
                            onClick={() => setEfectivoEntregadoUnico(montoTotalCarrito)}
                            className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg font-bold"
                          >
                            Exacto (S/ {montoTotalCarrito})
                          </button>
                          {[50, 100, 200].filter(b => b > montoTotalCarrito).map((billete) => (
                            <button
                              key={billete}
                              type="button"
                              onClick={() => setEfectivoEntregadoUnico(billete)}
                              className="px-2 py-0.5 bg-white border border-emerald-200 text-emerald-800 rounded-lg font-bold hover:bg-emerald-100"
                            >
                              S/ {billete}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[11px] font-extrabold text-neutral-600 uppercase tracking-wider mb-1">
                          N° de Operación / Código Autorización {medioPagoUnico}
                        </label>
                        <input
                          type="text"
                          value={referenciaUnica}
                          onChange={(e) => setReferenciaUnica(e.target.value)}
                          placeholder="Ej: OP-981244 / Ref POS..."
                          className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-700 bg-white"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* MODALIDAD 2: PAGOS MIXTOS / FRACCIONADOS (SPLIT PAYMENT) */}
                {modoSplit && (
                  <div className="space-y-3 bg-neutral-50 p-4 rounded-2xl border border-neutral-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-brand-700" />
                        <span>Desglose de Pagos Fraccionados</span>
                      </span>

                      <button
                        type="button"
                        onClick={handleAgregarPagoFraccionado}
                        className="px-3 py-1 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Agregar Medio</span>
                      </button>
                    </div>

                    {/* Filas de Aportes */}
                    <div className="space-y-2">
                      {pagosFraccionados.map((p, index) => (
                        <div key={p.id} className="p-3 bg-white border border-neutral-200 rounded-xl space-y-2 text-xs">
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                            <div className="sm:col-span-1 text-center font-mono font-bold text-neutral-400">
                              #{index + 1}
                            </div>

                            {/* Medio de Pago */}
                            <div className="sm:col-span-4">
                              <select
                                value={p.medio}
                                onChange={(e) => handleActualizarPagoFraccionado(p.id, { medio: e.target.value as any })}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-300 font-bold bg-white text-xs"
                              >
                                <option value="EFECTIVO">Efectivo</option>
                                <option value="YAPE">Yape</option>
                                <option value="PLIN">Plin</option>
                                <option value="TARJETA_POS">Tarjeta POS</option>
                                <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                              </select>
                            </div>

                            {/* Monto a Cobrar */}
                            <div className="sm:col-span-3">
                              <div className="relative">
                                <span className="absolute left-2 top-1.5 text-[10px] text-neutral-400 font-bold">S/</span>
                                <input
                                  type="number"
                                  min={1}
                                  value={p.monto === 0 ? "" : p.monto}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => handleActualizarPagoFraccionado(p.id, { monto: e.target.value === "" ? 0 : Number(e.target.value) })}
                                  placeholder="0.00"
                                  className="w-full pl-6 pr-2 py-1.5 border border-neutral-300 rounded-lg font-mono font-black text-right text-xs"
                                />
                              </div>
                            </div>

                            {/* Referencia o Nro Operación */}
                            <div className="sm:col-span-3">
                              <input
                                type="text"
                                value={p.referencia || ""}
                                onChange={(e) => handleActualizarPagoFraccionado(p.id, { referencia: e.target.value })}
                                placeholder={p.medio === "EFECTIVO" ? "Ventanilla..." : "N° Op / Ref..."}
                                className="w-full px-2 py-1.5 border border-neutral-300 rounded-lg text-xs font-mono"
                              />
                            </div>

                            {/* Botón Eliminar Fila */}
                            <div className="sm:col-span-1 text-center">
                              <button
                                type="button"
                                onClick={() => handleEliminarPagoFraccionado(p.id)}
                                className="p-1 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Eliminar este medio de pago"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Control de Vuelto Específico si es Efectivo */}
                          {p.medio === "EFECTIVO" && (
                            <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between text-[11px]">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-emerald-900">Efectivo Entregado (Billete): S/</span>
                                <input
                                  type="number"
                                  min={p.monto}
                                  value={p.montoEntregado === 0 ? "" : (p.montoEntregado ?? p.monto)}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => handleActualizarPagoFraccionado(p.id, { montoEntregado: e.target.value === "" ? 0 : Number(e.target.value) })}
                                  placeholder="0.00"
                                  className="w-20 px-2 py-1 border border-emerald-300 rounded bg-white font-mono font-bold text-right"
                                />
                              </div>
                              <div className="font-mono font-black text-emerald-800">
                                Vuelto parcial: {formatCurrency(Math.max(0, (p.montoEntregado ?? p.monto) - p.monto))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Balanza de Cuadre de Pagos Fraccionados */}
                    <div className="p-3 bg-white border border-neutral-200 rounded-xl space-y-1.5 font-mono text-xs">
                      <div className="flex justify-between text-neutral-600">
                        <span>Total Carrito:</span>
                        <span className="font-bold">{formatCurrency(montoTotalCarrito)}</span>
                      </div>
                      <div className="flex justify-between text-neutral-600">
                        <span>Total Cubierto:</span>
                        <span className="font-bold text-emerald-700">+{formatCurrency(totalCobradoPlanificado)}</span>
                      </div>
                      <div className="flex justify-between border-t border-neutral-100 pt-1 font-bold">
                        <span>Saldo Pendiente:</span>
                        <span className={saldoPendiente > 0 ? "text-rose-600 font-black animate-pulse" : "text-emerald-700"}>
                          {saldoPendiente > 0 ? `${formatCurrency(saldoPendiente)} (Falta cubrir)` : "CUADRADO EXACTO (S/ 0.00)"}
                        </span>
                      </div>
                      {vueltoEfectivo > 0 && (
                        <div className="flex justify-between border-t border-dashed border-emerald-300 pt-1 font-bold text-emerald-900 bg-emerald-50/60 p-2 rounded-lg">
                          <span>💵 VUELTO A ENTREGAR AL PACIENTE:</span>
                          <span className="text-sm font-black">{formatCurrency(vueltoEfectivo)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* BOTÓN FINAL DE COBRO */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleProcesarAtencionYCobro}
                    disabled={isProcessing || itemsCarrito.length === 0 || saldoPendiente > 0}
                    className={`w-full py-3.5 text-white font-black text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2 ${
                      isProcessing || itemsCarrito.length === 0 || saldoPendiente > 0
                        ? "bg-neutral-300 cursor-not-allowed text-neutral-500"
                        : "bg-brand-700 hover:bg-brand-800"
                    }`}
                  >
                    <Printer className="w-4 h-4" />
                    <span>
                      {isProcessing
                        ? "Emitiendo Comprobante & Registrando..."
                        : saldoPendiente > 0
                        ? `Falta cubrir ${formatCurrency(saldoPendiente)} para cobrar`
                        : `Cobrar ${formatCurrency(montoTotalCarrito)} & Enviar a Espera Médica`}
                    </span>
                  </button>
                </div>
              </div>
            )}
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
                  onClick={() => imprimirTicketTermico(ticketEmitido)}
                  className="text-xs text-brand-700 hover:text-brand-900 font-bold hover:underline flex items-center gap-1 cursor-pointer"
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


            {/* Resumen Compacto de Caja con Enlace Directo a Arqueo */}
            <div className="bg-white rounded-3xl border border-neutral-200/80 p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10.5px] font-bold text-neutral-500 uppercase tracking-wider">Caja del Turno</p>
                <p className="text-xs font-mono font-bold text-neutral-800">
                  Neto a Rendir: <span className="text-emerald-700">{formatCurrency(efectivoNetoEsperado)}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSubModuloActivo("CAJA_ARQUEO")}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 transition flex items-center gap-1 cursor-pointer"
              >
                <Coins className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ver Caja & Arqueo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* SUB-MÓDULO 2: BANDEJA DE CITAS & REAGENDAMIENTOS          */}
      {/* ========================================================== */}
      {subModuloActivo === "CITAS_REAGENDAMIENTOS" && (
        <div className="space-y-6">
      {/* 2. Bandeja Minimalista de Citas Programadas del Día & Próximas */}
      <div className="bg-white rounded-3xl p-5 border border-brand-100 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-black text-xs shadow-xs">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-black text-neutral-900 uppercase tracking-wider">
                  Bandeja de Citas & Reagendamientos
                </h2>
                <span className="text-[10px] bg-purple-100 text-purple-900 font-extrabold px-2 py-0.5 rounded-full">
                  {citasDelDia.length + proximasCitas.length} {citasDelDia.length + proximasCitas.length === 1 ? "registro" : "registros"}
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Sede {normalizarSede(sede)} &bull; Agendadas previamente &bull; Recepción rápida en ventanilla
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Tabs de Selección entre Citas de Hoy y Próximas Reagendadas */}
            <div className="flex items-center bg-neutral-100 p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setTabBandejaCitas("HOY")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  tabBandejaCitas === "HOY"
                    ? "bg-white text-purple-950 shadow-xs border border-purple-200/60"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                <span>Citas de Hoy</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    tabBandejaCitas === "HOY" ? "bg-purple-100 text-purple-900" : "bg-neutral-200 text-neutral-600"
                  }`}
                >
                  {citasDelDia.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTabBandejaCitas("PROXIMAS")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  tabBandejaCitas === "PROXIMAS"
                    ? "bg-white text-purple-950 shadow-xs border border-purple-200/60"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                <span>Próximas Reagendadas</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    tabBandejaCitas === "PROXIMAS" ? "bg-purple-100 text-purple-900" : "bg-neutral-200 text-neutral-600"
                  }`}
                >
                  {proximasCitas.length}
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => cargarCitasDelDia(sede)}
              title="Refrescar lista de citas"
              className="p-1.5 text-neutral-500 hover:text-brand-800 hover:bg-neutral-100 rounded-xl transition flex items-center gap-1 text-[11px] font-bold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${cargandoCitasDelDia ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>
        </div>

        {(() => {
          const listaActual = tabBandejaCitas === "HOY" ? citasDelDia : proximasCitas;
          if (listaActual.length === 0) {
            return (
              <div className="py-4 px-3 bg-neutral-50/70 border border-neutral-200/70 rounded-2xl text-center text-xs text-neutral-500 flex items-center justify-center gap-2">
                <Clock className="w-4 h-4 text-neutral-400" />
                <span>
                  {tabBandejaCitas === "HOY"
                    ? `No hay citas programadas para hoy en Sede ${normalizarSede(sede)}. Las citas agendadas aparecerán aquí en tiempo real.`
                    : `No hay próximas citas reagendadas registradas en Sede ${normalizarSede(sede)}.`}
                </span>
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {listaActual.map((cita) => {
                const estaEnEspera =
                  cita.encuentro?.estado === "EN_ESPERA" ||
                  transacciones.some(
                    (t) =>
                      t.estadoConsultorio === "EN_ESPERA" &&
                      ((cita.encuentro_id && t.encuentroId === cita.encuentro_id) ||
                        t.paciente.toLowerCase().includes(cita.paciente_nombre.toLowerCase()) ||
                        cita.paciente_nombre.toLowerCase().includes(t.paciente.toLowerCase()))
                  );
                const estaAtendida =
                  cita.estado === "ATENDIDA" ||
                  cita.encuentro?.estado === "ATENDIDO" ||
                  transacciones.some(
                    (t) =>
                      t.estadoConsultorio === "ATENDIDO" &&
                      ((cita.encuentro_id && t.encuentroId === cita.encuentro_id) ||
                        t.paciente.toLowerCase().includes(cita.paciente_nombre.toLowerCase()) ||
                        cita.paciente_nombre.toLowerCase().includes(t.paciente.toLowerCase()))
                  );

                const horaLimpia = cita.hora ? cita.hora.slice(0, 5) : "--:--";

                return (
                  <div
                    key={cita.id}
                    className="p-3.5 rounded-2xl border border-neutral-200 bg-white hover:border-brand-300 hover:shadow-xs transition flex flex-col justify-between space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {tabBandejaCitas === "PROXIMAS" ? (
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-lg bg-purple-50 text-purple-800 border border-purple-200">
                            📅 {cita.fecha}
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                            📅 Hoy ({cita.fecha})
                          </span>
                        )}
                        <span className="font-mono text-xs font-black px-2 py-0.5 rounded-lg bg-neutral-100 text-neutral-900 border border-neutral-200">
                          {horaLimpia}
                        </span>
                        {estaEnEspera ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800">
                            En Sala de Espera
                          </span>
                        ) : estaAtendida ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800">
                            Atendida
                          </span>
                        ) : cita.estado === "CANCELADA" ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800">
                            Cancelada
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700">
                            {tabBandejaCitas === "PROXIMAS" ? "Reagendada" : "Pendiente de Llegada"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-black text-neutral-900 leading-tight">
                        {cita.paciente_nombre}
                      </h4>
                      <p className="text-[11px] text-neutral-500 mt-0.5 line-clamp-1" title={cita.motivo}>
                        {cita.motivo}
                      </p>
                      {cita.telefono && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono text-neutral-500 flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-neutral-400" />
                            {cita.telefono}
                          </span>
                          <a
                            href={`https://wa.me/51${cita.telefono.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Contactar por WhatsApp"
                            className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-0.5"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="pt-1.5 border-t border-neutral-100 flex items-center gap-1.5 flex-wrap">
                      {estaEnEspera ? (
                        <div className="flex-1 py-1.5 px-2 bg-amber-50 text-amber-800 font-extrabold text-[11px] rounded-xl border border-amber-200 text-center flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                          <span>En Espera de Atención</span>
                        </div>
                      ) : estaAtendida ? (
                        <div className="flex-1 py-1.5 px-2 bg-emerald-50 text-emerald-800 font-extrabold text-[11px] rounded-xl border border-emerald-200 text-center flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Atención Concluida</span>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleIngresarDirectoASala(cita)}
                            title="Ingresar directamente a la pantalla del médico sin cobro (Control de seguimiento o atención ya pagada previamente)"
                            className="flex-1 py-1.5 px-2 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-[11px] rounded-xl shadow-xs transition flex items-center justify-center gap-1"
                          >
                            <Stethoscope className="w-3.5 h-3.5 text-white" />
                            <span>Pase a Sala (S/ 0)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdmitirCita(cita)}
                            title="Cargar en caja para cobrar (si es una reserva telefónica que recién pagará en ventanilla)"
                            className="py-1.5 px-2 bg-brand-50 hover:bg-brand-100 text-brand-800 font-bold text-[11px] rounded-xl border border-brand-200 transition flex items-center justify-center gap-1"
                          >
                            <DollarSign className="w-3.5 h-3.5 text-brand-700" />
                            <span>Cobrar</span>
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => prepararModificacionCita(cita)}
                        title={tabBandejaCitas === "PROXIMAS" ? "Cambiar fecha u hora de esta cita reagendada" : "Reprogramar o postergar cita de hoy"}
                        className="py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold text-[11px] rounded-xl border border-purple-200 transition flex items-center justify-center gap-1"
                      >
                        <Calendar className="w-3.5 h-3.5 text-purple-700" />
                        <span>Modificar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

          {/* ACORDEÓN 5: Reagendamiento de Citas & WhatsApp Institucional */}
          <div id="seccion-reagendamiento" className="bg-white rounded-3xl border border-neutral-200/80 shadow-sm overflow-hidden">
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
                {/* Alerta de vinculación con paciente en espera */}
                {reagendarEncuentroId && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        Reagendando paciente en espera: <strong>{reagendarPaciente}</strong>. Al confirmar, se retirará automáticamente de la cola del consultorio.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReagendarEncuentroId(null)}
                      className="text-amber-700 hover:text-amber-900 text-[10px] font-bold underline"
                    >
                      Cancelar vinculación
                    </button>
                  </div>
                )}
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
      )}

      {/* ========================================================== */}
      {/* SUB-MÓDULO 3: CAJA & ARQUEO (BALANZA, EGRESOS & AUDITORÍA) */}
      {/* ========================================================== */}
      {subModuloActivo === "CAJA_ARQUEO" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Columna Izquierda: Balanza Financiera & Egresos */}
          <div className="lg:col-span-6 space-y-5">
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
                Sede {normalizarSede(sede)}
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

            {/* Ticket emitido de última atención (si existe) */}
            {ticketEmitido && (
              <div className="bg-white rounded-3xl border border-emerald-200 p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between text-emerald-800">
                  <div className="flex items-center gap-1.5 text-xs font-black">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Ticket Emitido ({ticketEmitido.id})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => imprimirTicketTermico(ticketEmitido)}
                    className="text-xs text-brand-700 hover:text-brand-900 font-bold hover:underline flex items-center gap-1 cursor-pointer"
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

          {/* Columna Derecha: Egresos & Pagos a Colaboradores (en reemplazo de Pacientes del Turno) */}
          <div className="lg:col-span-6 space-y-5">
            <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center font-black text-xs">
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

                {esAdminOSupervisor && (
                  <button
                    type="button"
                    onClick={handleExportarLibroCaja}
                    title="Exportar Registro a CSV para Google Drive"
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-xl border border-emerald-200 transition flex items-center gap-1 shadow-xs"
                  >
                    <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                    <span>Exportar Drive</span>
                  </button>
                )}
              </div>

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
                      value={egresoMonto === 0 ? "" : egresoMonto}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setEgresoMonto(e.target.value === "" ? 0 : Number(e.target.value))}
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
                  className="w-full py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <TrendingDown className="w-4 h-4" />
                  <span>Registrar Salida de Efectivo</span>
                </button>
              </form>

              {/* Historial de egresos del turno */}
              {egresos.length === 0 ? (
                <div className="p-4 bg-neutral-50 border border-neutral-200/80 rounded-2xl text-center text-xs text-neutral-400">
                  Sin egresos registrados en este turno activo.
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                    Egresos Registrados en este Turno ({egresos.length})
                  </p>
                  <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-2xl overflow-hidden bg-white text-xs max-h-56 overflow-y-auto">
                    {egresos.map((eg) => (
                      <div key={eg.id} className="p-3 flex items-center justify-between hover:bg-neutral-50/50 transition">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-neutral-900">{eg.destinatario}</span>
                            <span className="text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded font-mono">
                              {eg.tipo}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-500">{eg.concepto}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="font-mono font-black text-rose-700">
                              -{formatCurrency(eg.monto)}
                            </span>
                            <span className="text-[10px] text-neutral-400 block">{eg.hora}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAnularEgreso(eg.id)}
                            title="Anular egreso y restituir efectivo"
                            className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* SUB-MÓDULO 4: DISPENSACIÓN DE INSUMOS & FARMACIA (KÁRDEX) */}
      {/* ========================================================== */}
      {subModuloActivo === "DISPENSACION" && (
        <div className="max-w-5xl mx-auto space-y-5">
          {/* ACORDEÓN: Dispensación de Insumos Clínicos & Farmacia (Sub-carrito por Lote) */}
          <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-sm relative z-10">
            <button
              type="button"
              onClick={() => toggleSection("dispensacion")}
              className="w-full p-4 bg-neutral-50/70 border-b border-neutral-100 flex items-center justify-between text-left transition hover:bg-neutral-100/50 rounded-t-3xl"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-black text-xs">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">
                      Dispensación de Insumos & Farmacia
                    </h3>
                    {itemsDispensacion.length > 0 && (
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded-full">
                        {itemsDispensacion.length} en lote
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Kárdex en tiempo real &bull; Sub-carrito por lote para ventas o uso clínico
                  </p>
                </div>
              </div>
              {openSection.dispensacion ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
            </button>

            {openSection.dispensacion && (
              <div className="p-5 space-y-4">
                {dispensacionExitoMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{dispensacionExitoMsg}</span>
                  </div>
                )}
                {dispensacionErrorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{dispensacionErrorMsg}</span>
                  </div>
                )}

                {/* 1. Selector para agregar insumos al sub-carrito */}
                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-extrabold text-blue-900 uppercase tracking-wider">
                      Seleccionar Insumo del Inventario
                    </label>
                    <span className="text-[10px] font-bold text-blue-600 font-mono">
                      {productosInventario.length} insumos en stock
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <div className="sm:col-span-8">
                      <select
                        value={productoDispensar?.id || ""}
                        onChange={(e) => {
                          const prod = productosInventario.find((p) => p.id === e.target.value) || null;
                          setProductoDispensar(prod);
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs font-bold bg-white focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="">-- Seleccionar insumo a agregar --</option>
                        {productosInventario.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre} ({p.presentacion}) - Stock: {p.stock_actual} unid. {p.precio_venta > 0 ? `[S/ ${p.precio_venta}]` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-4 flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={productoDispensar?.stock_actual || 999}
                        value={cantidadDispensar}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setCantidadDispensar(Math.max(1, Number(e.target.value)))}
                        className="w-20 px-2.5 py-2 rounded-xl border border-neutral-300 text-xs font-mono font-black text-center bg-white"
                        title="Cantidad de unidades"
                      />
                      <button
                        type="button"
                        onClick={handleAgregarItemDispensacion}
                        disabled={!productoDispensar || (productoDispensar?.stock_actual || 0) <= 0}
                        className="flex-1 py-2 px-3 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Agregar</span>
                      </button>
                    </div>
                  </div>

                  {productoDispensar && (
                    <div className="p-2.5 bg-white border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono text-[10px] text-blue-700 font-bold block">{productoDispensar.codigo}</span>
                        <span className="font-bold text-neutral-900">{productoDispensar.nombre}</span>
                        <span className="text-[11px] text-neutral-500 block">{productoDispensar.presentacion}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase block">Existencias</span>
                        <span className={`font-mono text-xs font-black ${productoDispensar.stock_actual <= productoDispensar.stock_minimo ? "text-amber-700 font-bold" : "text-emerald-700"}`}>
                          {productoDispensar.stock_actual} unid.
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Sub-carrito de Lote de Dispensación */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-neutral-700 uppercase tracking-wider">
                      Lote de Insumos a Dispensar ({itemsDispensacion.length})
                    </span>
                    {itemsDispensacion.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setItemsDispensacion([])}
                        className="text-[10px] font-bold text-rose-600 hover:text-rose-800 underline"
                      >
                        Vaciar lote
                      </button>
                    )}
                  </div>

                  {itemsDispensacion.length === 0 ? (
                    <div className="p-4 bg-neutral-50 border border-neutral-200/80 rounded-2xl text-center text-xs text-neutral-400">
                      No hay insumos en el lote. Seleccione productos arriba y pulse &quot;Agregar&quot; para armar el lote de dispensación múltiple.
                    </div>
                  ) : (
                    <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-2xl overflow-hidden bg-white text-xs">
                      {itemsDispensacion.map((it) => {
                        const subtotal = tipoDispensacion === "SALIDA_VENTA" ? it.cantidad * it.producto.precio_venta : 0;
                        return (
                          <div key={it.id} className="p-3 flex items-center justify-between hover:bg-neutral-50/50 transition">
                            <div className="flex-1 min-w-0 pr-3">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-neutral-900 truncate">{it.producto.nombre}</span>
                                <span className="text-[10px] font-mono text-neutral-400 shrink-0">{it.producto.codigo}</span>
                              </div>
                              <p className="text-[11px] text-neutral-500">{it.producto.presentacion}</p>
                              {tipoDispensacion === "SALIDA_VENTA" && it.producto.precio_venta > 0 && (
                                <span className="text-[10px] font-mono text-brand-700 font-bold">
                                  P. Unit: {formatCurrency(it.producto.precio_venta)} &bull; Subtotal: {formatCurrency(subtotal)}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center border border-neutral-200 rounded-lg overflow-hidden bg-neutral-50">
                                <button
                                  type="button"
                                  onClick={() => handleModificarCantDispensacion(it.id, it.cantidad - 1)}
                                  className="px-2 py-1 hover:bg-neutral-200 text-neutral-700 font-black text-xs transition"
                                >
                                  -
                                </button>
                                <span className="px-2.5 py-1 font-mono font-black text-xs text-neutral-900 bg-white">
                                  {it.cantidad}
                                </span>
                                <button
                                  type="button"
                                  disabled={it.cantidad >= it.producto.stock_actual}
                                  onClick={() => handleModificarCantDispensacion(it.id, it.cantidad + 1)}
                                  className="px-2 py-1 hover:bg-neutral-200 disabled:opacity-30 text-neutral-700 font-black text-xs transition"
                                >
                                  +
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleEliminarItemDispensacion(it.id)}
                                title="Quitar del lote"
                                className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Resumen del Lote */}
                      <div className="p-3 bg-neutral-50 flex items-center justify-between text-xs font-bold text-neutral-700">
                        <span>Total Unidades a Descargar de Kárdex:</span>
                        <span className="font-mono font-black text-blue-900">
                          {itemsDispensacion.reduce((s, it) => s + it.cantidad, 0)} unidades
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Formulario de Destino y Ejecución */}
                <form onSubmit={handleEjecutarDispensacionMultiple} className="space-y-3 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                        Tipo de Salida *
                      </label>
                      <select
                        value={tipoDispensacion}
                        onChange={(e) => setTipoDispensacion(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs bg-white font-bold"
                      >
                        <option value="SALIDA_VENTA">Venta a Paciente (Farmacia / Mostrador)</option>
                        <option value="SALIDA_USO_CLINICO">Uso Clínico Asistencial (Consultorio)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                        Motivo / Paciente Destino / Detalle Asistencial
                      </label>
                      <input
                        type="text"
                        value={motivoDispensacion}
                        onChange={(e) => setMotivoDispensacion(e.target.value)}
                        placeholder={
                          dni && nombres
                            ? `Paciente: ${nombres} ${apellidos} (DNI ${dni})`
                            : "Ej. Dispensado para colocación DIU, Venta particular, Tratamiento..."
                        }
                        className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={isDispensando || itemsDispensacion.length === 0}
                      className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {isDispensando ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Actualizando Kárdex por Lote...</span>
                        </>
                      ) : (
                        <>
                          <Boxes className="w-4 h-4" />
                          <span>
                            Procesar Salida de Lote ({itemsDispensacion.length} insumos, {itemsDispensacion.reduce((s, it) => s + it.cantidad, 0)} unid.) &bull; Operador: {cajeroNombre}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Apertura de Turno */}
      {showAperturaModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-neutral-200 space-y-4">
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
                value={montoAperturaInput === 0 ? "" : montoAperturaInput}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setMontoAperturaInput(e.target.value === "" ? 0 : Number(e.target.value))}
                placeholder="0.00"
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
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-neutral-200 space-y-4">
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
                {/* Alerta Operativa: Pacientes Pendientes en Sala Médica (Lado B) */}
                {(() => {
                  const pendientesEnSala = transacciones.filter((t) => t.estadoConsultorio === "EN_ESPERA");
                  if (pendientesEnSala.length === 0) return null;
                  return (
                    <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-950 space-y-2">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-black text-amber-900 block">
                            ADVERTENCIA OPERATIVA: {pendientesEnSala.length} paciente(s) aún en Sala de Espera médica
                          </span>
                          <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                            Existen atenciones con ingreso registrado que aún no han sido concluidas en consultorio:
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1.5 pl-6">
                        {pendientesEnSala.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between text-[11px] bg-white p-2 rounded-xl border border-amber-200 shadow-xs"
                          >
                            <div className="truncate pr-2">
                              <span className="font-bold text-neutral-900 block leading-tight truncate">{p.paciente}</span>
                              <span className="text-[10px] text-neutral-500 font-mono truncate block">{p.servicio}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCancelarEncuentroDirecto(p)}
                              title="Retirar paciente de sala si se retiró sin atención"
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] rounded-lg border border-rose-200 transition shrink-0"
                            >
                              Retirar Deserción
                            </button>
                          </div>
                        ))}
                      </div>

                      <p className="text-[10px] text-amber-700 italic pl-6">
                        Nota: Al proceder con el cierre, la lista de pacientes pendientes quedará registrada en el Acta de Auditoría.
                      </p>
                    </div>
                  );
                })()}

                <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200 text-xs space-y-1.5">
                  <div className="flex justify-between font-bold text-neutral-800">
                    <span>(+) Fondo Inicial de Apertura:</span>
                    <span className="font-mono">{formatCurrency(fondoApertura)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>(+) Cobros en Efectivo de la Jornada:</span>
                    <span className="font-mono font-bold">+{formatCurrency(totalEfectivoCobros)}</span>
                  </div>
                  <div className="flex justify-between text-rose-700">
                    <span>(-) Egresos en Efectivo:</span>
                    <span className="font-mono font-bold">-{formatCurrency(totalEgresos)}</span>
                  </div>
                  <div className="border-t border-neutral-200 pt-1.5 flex justify-between font-black text-neutral-900">
                    <span>(=) Efectivo Esperado a Rendir:</span>
                    <span className="font-mono text-sm text-brand-900">{formatCurrency(efectivoNetoEsperado)}</span>
                  </div>
                  <p className="text-[10px] text-neutral-400 italic pt-0.5">
                    Fórmula: Fondo Inicial ({formatCurrency(fondoApertura)}) + Ventas Efectivo ({formatCurrency(totalEfectivoCobros)}) - Egresos ({formatCurrency(totalEgresos)})
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Efectivo Real Contado en Gaveta (S/) *
                  </label>
                  <input
                    type="number"
                    value={efectivoContado === 0 ? "" : efectivoContado}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setEfectivoContado(e.target.value === "" ? 0 : Number(e.target.value))}
                    placeholder="0.00"
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
                    disabled={isCerrandoTurno}
                    className="w-1/2 py-2.5 bg-brand-700 hover:bg-brand-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-1.5"
                  >
                    {isCerrandoTurno ? "Procesando Cierre..." : "Generar Acta de Cierre"}
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
                    <div className="flex justify-between font-bold"><span>(+) Fondo Inicial:</span><span>{formatCurrency(actaCierre.fondoInicial)}</span></div>
                    <div className="flex justify-between text-emerald-800"><span>(+) Cobros Efectivo:</span><span>+{formatCurrency(actaCierre.efectivoCobros)}</span></div>
                    <div className="flex justify-between text-purple-800"><span>Cobros Digitales (POS/Yape):</span><span>+{formatCurrency(actaCierre.digitalCobros)}</span></div>
                    <div className="flex justify-between text-rose-800"><span>(-) Egresos Efectivo:</span><span>-{formatCurrency(actaCierre.egresosTotales)}</span></div>
                    <div className="border-t border-dashed border-neutral-300 pt-1 flex justify-between font-bold text-neutral-900">
                      <span>(=) Efectivo Esperado:</span><span>{formatCurrency(actaCierre.efectivoEsperado)}</span>
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

                  {actaCierre.hashCierre && (
                    <div className="pt-2 border-t border-dashed border-neutral-300 text-[9px] text-neutral-500 font-mono text-center break-all">
                      <span className="font-semibold text-neutral-700">SELLO CRIPTOGRÁFICO SHA-256:</span><br />
                      {actaCierre.hashCierre}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => imprimirActaTermica(actaCierre)}
                    className="w-1/2 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimir Acta (80mm)</span>
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

      {/* Modal de Identificación Sanitaria Obligatoria (NTS N.º 139-MINSA) */}
      {citaValidandoDni && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-100 text-brand-800 flex items-center justify-center">
                  <Stethoscope className="w-4 h-4 text-brand-700" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-neutral-900 leading-tight">
                    Pase Directo a Sala Médica
                  </h3>
                  <span className="text-[10px] font-bold text-brand-700 uppercase tracking-wider">
                    NTS N.º 139-MINSA &bull; Historia Clínica
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCitaValidandoDni(null)}
                className="text-neutral-400 hover:text-neutral-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-neutral-500 font-medium">Paciente:</span>
                <span className="font-bold text-neutral-900">{citaValidandoDni.paciente_nombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 font-medium">Motivo / Servicio:</span>
                <span className="font-bold text-neutral-800 truncate max-w-[200px]" title={citaValidandoDni.motivo}>
                  {citaValidandoDni.motivo}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 font-medium">Sede:</span>
                <span className="font-bold text-purple-900">Sede {normalizarSede(sede)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold pt-1 border-t border-neutral-200">
                <span>Costo de Atención:</span>
                <span>S/ 0.00 (Control / Previo)</span>
              </div>
            </div>

            {dniPaseError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{dniPaseError}</span>
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const d = dniPaseDirecto.trim();
                if (d.length !== 8 || !/^\d{8}$/.test(d)) {
                  setDniPaseError("Ingrese un DNI válido de exactamente 8 dígitos numéricos (NTS N.º 139-MINSA).");
                  return;
                }
                setDniPaseLoading(true);
                setDniPaseError(null);
                try {
                  await ejecutarPaseDirecto(citaValidandoDni, d);
                } catch (err: any) {
                  setDniPaseError(err?.message || "Error al registrar el pase a sala médica.");
                } finally {
                  setDniPaseLoading(false);
                }
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-bold text-neutral-800 mb-1">
                  DNI o Carnet de Extranjería (8 dígitos) *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={8}
                  value={dniPaseDirecto}
                  onChange={(e) => handleDniPaseChange(e.target.value)}
                  placeholder="Ej: 45892147"
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-700"
                />

                {buscandoDniPase && (
                  <div className="text-[11px] text-neutral-500 flex items-center gap-1.5 pt-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-700" />
                    <span>Consultando padrón clínico...</span>
                  </div>
                )}

                {dniPaseCoincidencia && dniPaseCoincidencia.encontrado && (
                  <div className="mt-2 p-3 rounded-2xl bg-blue-50 border border-blue-200 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-blue-900">
                      <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0" />
                      <span>Historia Clínica Existente en Padrón</span>
                    </div>
                    <p className="text-[11px] text-blue-800">
                      Titular: <strong>{dniPaseCoincidencia.nombres} {dniPaseCoincidencia.apellidos}</strong> (DNI: {dniPaseCoincidencia.dni}).
                    </p>
                    {(() => {
                      const nomCita = (citaValidandoDni?.paciente_nombre || "").toLowerCase();
                      const nomPadron = `${dniPaseCoincidencia.nombres || ""} ${dniPaseCoincidencia.apellidos || ""}`.toLowerCase();
                      const difiere = !nomCita.split(" ").some((part) => part.length > 2 && nomPadron.includes(part));
                      if (difiere) {
                        return (
                          <div className="pt-1.5 mt-1 border-t border-blue-200 text-[10px] text-amber-900 font-bold flex items-start gap-1 leading-normal">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                            <span>
                              ADVERTENCIA DE SEGURIDAD: El nombre agendado ("{citaValidandoDni?.paciente_nombre}") difiere del titular registrado. Verifique el DNI físico antes de confirmar para evitar cruce de historias.
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}

                {dniPaseCoincidencia && !dniPaseCoincidencia.encontrado && (
                  <div className="mt-2 p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>
                      DNI Nuevo: No tiene Historia previa. Se aperturará una nueva Historia Clínica para <strong>{citaValidandoDni?.paciente_nombre}</strong>.
                    </span>
                  </div>
                )}

                <p className="text-[10px] text-neutral-500 mt-1.5 leading-normal">
                  Obligatorio según la NTS N° 139-MINSA/2018/DGAIN para habilitar la Historia Clínica Electrónica y emisión de recetas y órdenes médicas.
                </p>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setCitaValidandoDni(null)}
                  className="w-1/3 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={dniPaseLoading || dniPaseDirecto.trim().length !== 8}
                  className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{dniPaseLoading ? "Registrando..." : "Confirmar Pase a Sala"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
