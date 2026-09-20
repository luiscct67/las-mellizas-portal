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
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";

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

const normalizarSede = (nombre?: string | null): string => {
  if (!nombre) return "Independencia";
  if (nombre.toLowerCase().includes("vivanco")) return "Vivanco";
  return "Independencia";
};

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

  // --- ECOGRAFÍAS OBSTÉTRICAS Y GENERALES ---
  { nombre: "Ecografía Especializada (4D/5D)", precio: 150, categoria: "Ecografías", descripcion: "Visualización en tiempo real HD Live con video" },
  { nombre: "Ecografía Obstétrica Morfológica", precio: 140, categoria: "Ecografías", descripcion: "Semana 20-24, evaluación anatómica completa" },
  { nombre: "Ecografía Doppler Fetal / Materno-Fetal", precio: 160, categoria: "Ecografías", descripcion: "Flujometría arterias uterinas y umbilical" },
  { nombre: "Ecografía Genética / I Trimestre", precio: 120, categoria: "Ecografías", descripcion: "Semana 11-14, translucencia nucal y hueso nasal" },
  { nombre: "Ecografía Obstétrica Básica / Control", precio: 70, categoria: "Ecografías", descripcion: "Biometría fetal, líquido amniótico y placenta" },
  { nombre: "Ecografía Transvaginal Ginecológica", precio: 80, categoria: "Ecografías", descripcion: "Útero, endometrio y anexos ováricos de alta resolución" },
  { nombre: "Ecografía Pélvica Ginecológica", precio: 70, categoria: "Ecografías", descripcion: "Vía suprapúbica para descarte ginecológico" },
  { nombre: "Ecografía Mamaria Bilateral", precio: 80, categoria: "Ecografías", descripcion: "Evaluación ecográfica de ambas mamas y axilas" },
  { nombre: "Ecografía Tiroidea", precio: 80, categoria: "Ecografías", descripcion: "Evaluación de glándula tiroides y nódulos" },
  { nombre: "Ecografía Abdominal Completa", precio: 90, categoria: "Ecografías", descripcion: "Hígado, vesícula, páncreas, bazo y riñones" },
  { nombre: "Ecografía Renal y Vías Urinarias", precio: 80, categoria: "Ecografías", descripcion: "Riñones, vejiga y descarte litiasis" },
  { nombre: "Monitoreo Fetal Electrónico (NST)", precio: 50, categoria: "Ecografías", descripcion: "Registro cardiotocográfico no estresante" },
  { nombre: "Perfil Biofísico Fetal (PBF)", precio: 120, categoria: "Ecografías", descripcion: "Ecografía obstétrica + Monitoreo fetal computarizado" },

  // --- CONSULTAS MÉDICAS Y DE OBSTETRICIA ---
  { nombre: "Control Prenatal Reenfocado", precio: 70, categoria: "Consultas", descripcion: "Evaluación clínica integral, triaje y carnet perinatal" },
  { nombre: "Consulta Médica Ginecológica", precio: 80, categoria: "Consultas", descripcion: "Evaluación especializada por gineco-obstetra" },
  { nombre: "Consulta Médica Obstétrica", precio: 70, categoria: "Consultas", descripcion: "Evaluación de la gestación y bienestar materno" },
  { nombre: "Planificación Familiar Integral", precio: 60, categoria: "Consultas", descripcion: "Consejería personalizada y prescripción anticonceptiva" },
  { nombre: "Consulta de Fertilidad y Pareja", precio: 100, categoria: "Consultas", descripcion: "Estudio inicial de infertilidad y salud reproductiva" },
  { nombre: "Consulta Ginecológica de Control", precio: 50, categoria: "Consultas", descripcion: "Revisión de resultados y seguimiento médico" },
  { nombre: "Evaluación de Climaterio y Menopausia", precio: 90, categoria: "Consultas", descripcion: "Terapia de reemplazo hormonal y salud ósea" },

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
    cargarProductosInventario();
  }, []);

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

  // Formulario Admisión & Cobro
  const [dni, setDni] = useState("");
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [telefono, setTelefono] = useState("");
  const [servicio, setServicio] = useState("Control Prenatal Reenfocado");
  const [monto, setMonto] = useState<number>(70);
  const [precioBaseCatalogo, setPrecioBaseCatalogo] = useState<number>(70);
  const [motivoAjusteTarifa, setMotivoAjusteTarifa] = useState<string>("");
  const [dropdownServicioAbierto, setDropdownServicioAbierto] = useState<boolean>(false);
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("Todas");
  const [busquedaServicio, setBusquedaServicio] = useState<string>("");
  const [esServicioPersonalizado, setEsServicioPersonalizado] = useState(false);
  const [servicioPersonalizadoNombre, setServicioPersonalizadoNombre] = useState("");
  const [medioPago, setMedioPago] = useState<"YAPE" | "PLIN" | "EFECTIVO" | "TARJETA_POS">("YAPE");
  const [referencia, setReferencia] = useState("");
  const [efectivoRecibido, setEfectivoRecibido] = useState<number>(100);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ticketEmitido, setTicketEmitido] = useState<TransaccionAtencion | null>(null);

  // Dispensación de Insumos & Farmacia (Control de Inventario)
  const [productosInventario, setProductosInventario] = useState<ProductoDispensable[]>([]);
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


  // Listado de atenciones reales de la jornada (cargadas desde Supabase)
  const [transacciones, setTransacciones] = useState<TransaccionAtencion[]>([]);
  const [esAdminOSupervisor, setEsAdminOSupervisor] = useState(false);
  const [buscandoDni, setBuscandoDni] = useState(false);

  // Cargar atenciones reales desde Supabase
  const cargarTransaccionesDelDia = async (sedeActual?: string) => {
    try {
      const { data, error } = await supabase
        .from("encuentro")
        .select(`
          id,
          servicio_solicitado,
          estado,
          fecha_hora,
          paciente:paciente_id (
            dni,
            nombres,
            apellidos
          ),
          sede:site_id (
            nombre
          ),
          orden_pago (
            monto,
            pago (
              medio_pago,
              referencia
            )
          )
        `)
        .order("fecha_hora", { ascending: false })
        .limit(30);

      if (error) {
        console.warn("Advertencia al consultar encuentros recientes:", error.message);
        return;
      }

      if (data && data.length > 0) {
        const mapeadas: TransaccionAtencion[] = data.map((item: any) => {
          const pac = item.paciente || {};
          const ord = item.orden_pago?.[0] || {};
          const pag = ord.pago?.[0] || {};
          const fecha = new Date(item.fecha_hora);
          const horaStr = fecha.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

          return {
            id: `OP-${item.id.slice(0, 6).toUpperCase()}`,
            hora: horaStr,
            dni: pac.dni || "S/DNI",
            paciente: `${pac.nombres || ""} ${pac.apellidos || ""}`.trim() || "Paciente Registrado",
            servicio: item.servicio_solicitado,
            monto: Number(ord.monto) || 70,
            medioPago: (pag.medio_pago as any) || "EFECTIVO",
            referencia: pag.referencia || "VENTANILLA",
            estadoConsultorio: item.estado,
            sede: normalizarSede(item.sede?.nombre),
          };
        });
        setTransacciones(mapeadas);
      }
    } catch (err) {
      console.warn("Error al cargar atenciones del día:", err);
    }
  };

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

    cargarTransaccionesDelDia(s);

    // Suscripción Realtime a nuevas atenciones
    const channel = supabase
      .channel("admision-realtime-tx")
      .on("postgres_changes", { event: "*", schema: "public", table: "encuentro" }, () => {
        cargarTransaccionesDelDia(s);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Búsqueda en tiempo real de paciente en Supabase por DNI
  const handleBuscarDNI = async (numDni: string) => {
    setDni(numDni);
    if (numDni.length === 8) {
      setBuscandoDni(true);
      try {
        const { data: pacExistente } = await supabase
          .from("paciente")
          .select("nombres, apellidos, telefono")
          .eq("dni", numDni)
          .maybeSingle();

        if (pacExistente) {
          setNombres(pacExistente.nombres);
          setApellidos(pacExistente.apellidos);
          setTelefono(pacExistente.telefono);
          setBuscandoDni(false);
          return;
        }
      } catch (err) {
        console.warn("Error buscando paciente en base de datos:", err);
      } finally {
        setBuscandoDni(false);
      }

    }
  };

  const handleSelectServicio = (srv: string, precioDefecto?: number) => {
    setEsServicioPersonalizado(false);
    setServicio(srv);
    const p = precioDefecto ?? TARIFARIO_BASE[srv] ?? 70;
    setMonto(p);
    setPrecioBaseCatalogo(p);
    setMotivoAjusteTarifa("");
    setDropdownServicioAbierto(false);
  };

  const cargarProductosInventario = async () => {
    try {
      const { data, error } = await supabase
        .from("producto_inventario")
        .select("id, codigo, nombre, categoria, presentacion, stock_actual, stock_minimo, precio_costo, precio_venta")
        .eq("activo", true)
        .order("nombre", { ascending: true });

      if (!error && data) {
        setProductosInventario(data);
      }
    } catch (err) {
      console.warn("Error consultando insumos clínicos para dispensación:", err);
    }
  };

  const handleEjecutarDispensacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productoDispensar) {
      setDispensacionErrorMsg("Seleccione un insumo o producto del inventario.");
      return;
    }
    if (cantidadDispensar <= 0) {
      setDispensacionErrorMsg("La cantidad a dispensar debe ser al menos 1 unidad.");
      return;
    }
    if (cantidadDispensar > productoDispensar.stock_actual) {
      setDispensacionErrorMsg(`Stock insuficiente: solo quedan ${productoDispensar.stock_actual} unidades disponibles.`);
      return;
    }

    setIsDispensando(true);
    setDispensacionExitoMsg(null);
    setDispensacionErrorMsg(null);

    try {
      const { data: userAuth } = await supabase.auth.getUser();
      const currentUserName = cajeroNombre || sessionStorage.getItem("lm_nombre") || "Operador de Caja";

      const motivoFinal = motivoDispensacion.trim() ||
        (tipoDispensacion === "SALIDA_VENTA"
          ? `Venta en caja/mostrador de farmacia`
          : `Dispensado para procedimiento o uso asistencial`);

      const { error } = await supabase.rpc("registrar_movimiento_inventario", {
        p_producto_id: productoDispensar.id,
        p_tipo_movimiento: tipoDispensacion,
        p_cantidad: Number(cantidadDispensar),
        p_motivo: motivoFinal,
        p_usuario_id: userAuth.user?.id || null,
        p_usuario_nombre: currentUserName,
      });

      if (error) throw error;

      setDispensacionExitoMsg(`Dispensación exitosa: ${cantidadDispensar}x ${productoDispensar.nombre}. Stock actualizado en tiempo real.`);
      setCantidadDispensar(1);
      setMotivoDispensacion("");
      await cargarProductosInventario();
      setTimeout(() => setDispensacionExitoMsg(null), 4500);
    } catch (err: any) {
      setDispensacionErrorMsg(err?.message || "Error al procesar la salida en el kárdex.");
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
              <span class="text-xs font-bold">SERVICIO REQUERIDO:</span>
              <div class="font-bold text-sm" style="margin-top: 1px;">${ticket.servicio}</div>
            </div>

            <div class="divider"></div>

            <div class="row" style="font-size: 13px; margin: 4px 0;">
              <span class="font-bold">TOTAL PAGADO:</span>
              <span class="font-bold">S/ ${ticket.monto.toFixed(2)}</span>
            </div>
            <div class="row text-xs">
              <span>FORMA DE PAGO:</span>
              <span class="font-bold">${ticket.medioPago}</span>
            </div>
            ${
              ticket.referencia
                ? `<div class="row text-xs"><span>REFERENCIA / OP:</span><span>${ticket.referencia}</span></div>`
                : ""
            }

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

  // Procesar Admisión & Cobro con Integridad Transaccional ACID
  const handleProcesarAtencionYCobro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dni || !nombres || !apellidos) {
      alert("Por favor complete los datos obligatorios del paciente.");
      return;
    }

    if (dni.trim().length < 8) {
      alert("El DNI debe tener 8 dígitos.");
      return;
    }

    if (!turnoActivo || turnoActivo.estado === "CERRADA") {
      alert("Debe realizar la Apertura de Caja antes de procesar cobros.");
      return;
    }

    setIsProcessing(true);

    const now = new Date();
    const horaStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const esVivanco = normalizarSede(sede) === "Vivanco";
    const siteId = esVivanco
      ? "b0000000-0000-0000-0000-000000000002"
      : "b0000000-0000-0000-0000-000000000001";

    let encuentroId = "";
    let txExito = false;
    let mensajeError = "";

    // 1. Intentar registrar atómicamente con función RPC
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc("registrar_atencion_y_cobro", {
        p_dni: dni.trim(),
        p_nombres: nombres.trim(),
        p_apellidos: apellidos.trim(),
        p_telefono: telefono.trim() || "000000000",
        p_site_id: siteId,
        p_servicio: servicio,
        p_monto: monto,
        p_medio_pago: medioPago,
        p_referencia: referencia || (medioPago === "EFECTIVO" ? "EFECTIVO-VENTANILLA" : "OP-DIRECTA"),
      });

      if (!rpcErr && rpcRes?.encuentro_id) {
        encuentroId = rpcRes.encuentro_id;
        txExito = true;
      } else if (rpcErr) {
        console.warn("RPC no disponible o falló:", rpcErr.message);
        mensajeError = rpcErr.message;
      }
    } catch (errRpc: any) {
      console.warn("Fallo RPC:", errRpc);
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
          throw new Error("Fallo al registrar paciente en base de datos: " + (pacErr?.message || "Error desconocido"));
        }

        // Crear Encuentro
        const { data: encData, error: encErr } = await supabase
          .from("encuentro")
          .insert({
            paciente_id: pacData.id,
            site_id: siteId,
            servicio_solicitado: servicio,
            estado: "EN_ESPERA",
            fecha_hora: new Date().toISOString(),
          })
          .select()
          .single();

        if (encErr || !encData) {
          throw new Error("Fallo al registrar encuentro clínico: " + (encErr?.message || "Error de seguridad RLS"));
        }

        encuentroId = encData.id;

        // Crear Orden de Pago
        const { data: ordData, error: ordErr } = await supabase
          .from("orden_pago")
          .insert({
            encuentro_id: encData.id,
            paciente_id: pacData.id,
            site_id: siteId,
            servicio: servicio,
            monto: monto,
            estado: "PAGADO",
          })
          .select()
          .single();

        if (ordData) {
          const { data: userAuth } = await supabase.auth.getUser();
          await supabase.from("pago").insert({
            orden_id: ordData.id,
            cajero_id: userAuth.user?.id,
            medio_pago: medioPago,
            monto: monto,
            referencia: referencia || (medioPago === "EFECTIVO" ? "EFECTIVO-VENTANILLA" : "OP-DIRECTA"),
            fecha_hora: new Date().toISOString(),
          });
        }

        txExito = true;
      } catch (directErr: any) {
        console.error("Error definitivo de persistencia:", directErr);
        setIsProcessing(false);
        alert(
          "Error de persistencia en Supabase:\n\n" +
            (directErr?.message || mensajeError || "Compruebe la conexión a la base de datos.") +
            "\n\nPor favor ejecute el Script 10 en Supabase SQL Editor si no lo ha aplicado aún."
        );
        return;
      }
    }

    const nuevaTx: TransaccionAtencion = {
      id: encuentroId ? `OP-${encuentroId.slice(0, 6).toUpperCase()}` : `OP-${Math.floor(100 + Math.random() * 900)}`,
      hora: horaStr,
      dni: dni.trim(),
      paciente: `${nombres.trim()} ${apellidos.trim()}`,
      servicio,
      monto,
      medioPago,
      referencia: referencia || (medioPago === "EFECTIVO" ? "EFECTIVO-VENTANILLA" : "OP-DIRECTA"),
      estadoConsultorio: "EN_ESPERA",
      sede: normalizarSede(sede),
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

    // Limpiar formulario para el siguiente paciente
    setDni("");
    setNombres("");
    setApellidos("");
    setTelefono("");
    setReferencia("");
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

          {/* ACORDEÓN 2: Tarifario Médico & Selección Compacta */}
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
                    Tarifario & Selección de Servicio
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Seleccionado: <strong>{servicio}</strong> &bull; {formatCurrency(monto)}
                    {monto !== precioBaseCatalogo && (
                      <span className="ml-1 text-amber-700 font-bold">
                        (Ajuste: {formatCurrency(monto - precioBaseCatalogo)})
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {openSection.tarifario ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
            </button>

            {openSection.tarifario && (
              <div className="p-4 space-y-3.5">
                {/* Categorías Rápidas */}
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

                {/* Selector Compacto Autocomplete / Combobox */}
                <div className="relative">
                  <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                    Buscar y Seleccionar Servicio del Catálogo
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={dropdownServicioAbierto ? busquedaServicio : (esServicioPersonalizado ? servicioPersonalizadoNombre : servicio)}
                      onFocus={() => {
                        setDropdownServicioAbierto(true);
                        setBusquedaServicio("");
                      }}
                      onChange={(e) => {
                        setBusquedaServicio(e.target.value);
                        setDropdownServicioAbierto(true);
                      }}
                      placeholder="Escriba el nombre o especialidad del servicio..."
                      className="w-full pl-9 pr-10 py-2 rounded-xl border border-neutral-300 text-xs font-bold bg-white focus:ring-2 focus:ring-brand-700"
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

                  {/* Dropdown flotante compacto con scroll */}
                  {dropdownServicioAbierto && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-2xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-neutral-100">
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
                            onClick={() => handleSelectServicio(srv.nombre, srv.precio)}
                            className="p-2.5 px-3.5 hover:bg-brand-50/70 cursor-pointer flex items-center justify-between transition text-xs"
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
                            <span className="font-extrabold text-brand-700 font-mono shrink-0">
                              {formatCurrency(srv.precio)}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Tarjeta de Servicio Seleccionado & Tarifa Flexible */}
                <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Servicio Seleccionado</span>
                      <span className="text-xs font-black text-neutral-900">{servicio}</span>
                      <span className="text-[11px] text-neutral-500 block font-mono">
                        Tarifa base catálogo: {formatCurrency(precioBaseCatalogo)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">
                          Monto a Cobrar (S/) *
                        </label>
                        <input
                          type="number"
                          step="1"
                          min={0}
                          value={monto || ""}
                          onChange={(e) => setMonto(Number(e.target.value))}
                          className="w-28 px-2.5 py-1.5 rounded-xl border border-brand-300 text-xs font-mono font-black text-brand-800 bg-white focus:ring-2 focus:ring-brand-700"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Campo de justificación si hay descuento o variación comercial */}
                  {monto !== precioBaseCatalogo && (
                    <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-amber-900">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3 text-amber-700" />
                          <span>Ajuste de Precio / Descuento Aplicado</span>
                        </span>
                        <span>Diferencia: {formatCurrency(monto - precioBaseCatalogo)}</span>
                      </div>
                      <input
                        type="text"
                        value={motivoAjusteTarifa}
                        onChange={(e) => setMotivoAjusteTarifa(e.target.value)}
                        placeholder="Justificación del descuento o tarifa preferencial (ej. Campaña, Pack, Convenio)..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 text-xs bg-white text-neutral-800 placeholder-neutral-400"
                      />
                    </div>
                  )}
                </div>

                {/* Opción de Servicio Personalizado */}
                <div className="pt-1">
                  {!esServicioPersonalizado ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEsServicioPersonalizado(true);
                        setServicio(servicioPersonalizadoNombre || "Servicio Médico Personalizado");
                      }}
                      className="text-xs font-bold text-brand-700 hover:text-brand-900 flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>¿Procedimiento no listado? Ingresar servicio personalizado</span>
                    </button>
                  ) : (
                    <div className="p-3 bg-brand-50/60 rounded-2xl border border-brand-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-brand-900">Servicio Especial / No Listado</span>
                        <button
                          type="button"
                          onClick={() => {
                            setEsServicioPersonalizado(false);
                            handleSelectServicio("Control Prenatal Reenfocado", 70);
                          }}
                          className="text-[10px] text-neutral-500 hover:text-neutral-900 font-bold"
                        >
                          ✕ Cancelar y volver al catálogo
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">
                            Nombre del Servicio o Procedimiento *
                          </label>
                          <input
                            type="text"
                            value={servicioPersonalizadoNombre}
                            onChange={(e) => {
                              setServicioPersonalizadoNombre(e.target.value);
                              setServicio(e.target.value || "Servicio Médico Personalizado");
                            }}
                            placeholder="Ej. Ecografía Especial Gemelar, Procedimiento..."
                            className="w-full px-2.5 py-1.5 border border-brand-300 rounded-xl text-xs bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">
                            Monto a Cobrar (S/) *
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={monto || ""}
                            onChange={(e) => setMonto(Number(e.target.value))}
                            placeholder="Precio S/..."
                            className="w-full px-2.5 py-1.5 border border-brand-300 rounded-xl text-xs font-mono font-bold bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}
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

          {/* ACORDEÓN: Dispensación de Insumos Clínicos & Farmacia */}
          <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("dispensacion")}
              className="w-full p-4 bg-neutral-50/70 border-b border-neutral-100 flex items-center justify-between text-left transition hover:bg-neutral-100/50"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-black text-xs">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">
                    Dispensación de Insumos & Farmacia
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Kárdex en tiempo real &bull; Salidas por venta o uso asistencial en consultorio
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

                <form onSubmit={handleEjecutarDispensacion} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-extrabold text-neutral-700 uppercase tracking-wider mb-1">
                      Insumo / Fármaco a Dispensar *
                    </label>
                    <select
                      value={productoDispensar?.id || ""}
                      onChange={(e) => {
                        const prod = productosInventario.find((p) => p.id === e.target.value) || null;
                        setProductoDispensar(prod);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs font-bold bg-white focus:ring-2 focus:ring-brand-700"
                    >
                      <option value="">-- Seleccionar del Inventario ({productosInventario.length} disponibles) --</option>
                      {productosInventario.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} ({p.presentacion}) - Stock: {p.stock_actual} unid. {p.precio_venta > 0 ? `[S/ ${p.precio_venta}]` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {productoDispensar && (
                    <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono text-[10px] text-blue-700 font-bold block">{productoDispensar.codigo}</span>
                        <span className="font-bold text-blue-950">{productoDispensar.nombre}</span>
                        <span className="text-[11px] text-blue-700 block">{productoDispensar.presentacion}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-blue-800 uppercase block">Existencias</span>
                        <span className={`font-mono text-sm font-black ${productoDispensar.stock_actual <= productoDispensar.stock_minimo ? "text-amber-700 animate-pulse" : "text-emerald-700"}`}>
                          {productoDispensar.stock_actual} unid.
                        </span>
                        {productoDispensar.stock_actual <= productoDispensar.stock_minimo && (
                          <span className="text-[9px] font-bold text-amber-800 block">Stock Bajo Mín.</span>
                        )}
                      </div>
                    </div>
                  )}

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
                        Cantidad a Dispensar *
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={productoDispensar?.stock_actual || 999}
                        required
                        value={cantidadDispensar}
                        onChange={(e) => setCantidadDispensar(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs font-mono font-black"
                      />
                    </div>
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
                          : "Ej. Dispensado para colocación DIU, Venta particular, Tratamiento tópico..."
                      }
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs"
                    />
                  </div>

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={isDispensando || !productoDispensar || (productoDispensar?.stock_actual || 0) <= 0}
                      className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {isDispensando ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Actualizando Kárdex...</span>
                        </>
                      ) : (
                        <>
                          <Boxes className="w-4 h-4" />
                          <span>Registrar Salida en Kárdex (Operador: {cajeroNombre})</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* ACORDEÓN: Salidas de Dinero / Gastos & Pagos a Colaboradores */}
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
              <div className="flex items-center gap-2">
                {esAdminOSupervisor && (
                  <button
                    type="button"
                    onClick={handleExportarLibroCaja}
                    title="Exportar Registro de Atenciones a CSV para Google Drive (Exclusivo Dirección y Supervisión)"
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-xl border border-emerald-200 transition flex items-center gap-1 shadow-sm"
                  >
                    <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                    <span>Exportar Google Drive</span>
                  </button>
                )}
                <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full font-bold">
                  Tiempo Real
                </span>
              </div>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {transacciones.length === 0 ? (
                <div className="py-8 text-center text-neutral-400">
                  <Clock className="w-6 h-6 mx-auto mb-1.5 opacity-50" />
                  <p className="font-bold text-xs text-neutral-600">No hay atenciones registradas hoy</p>
                  <p className="text-[10px]">Las pacientes admitidas en ventanilla aparecerán aquí en tiempo real.</p>
                </div>
              ) : (
                transacciones.map((tx) => (
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
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => imprimirTicketTermico(tx)}
                        title="Reimprimir ticket térmico POS (80mm)"
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-neutral-700 hover:text-neutral-950 bg-white hover:bg-neutral-100 border border-neutral-300 px-2 py-1 rounded-lg shadow-xs transition"
                      >
                        <Printer className="w-3 h-3 text-neutral-600" />
                        <span>Ticket</span>
                      </button>
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
                </div>
              )))}
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
    </div>
  );
}
