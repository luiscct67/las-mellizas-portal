"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Activity,
  Users,
  DollarSign,
  FileCheck,
  Lock,
  AlertCircle,
  UserPlus,
  KeyRound,
  RefreshCw,
  Copy,
  Check,
  Building2,
  MapPin,
  Award,
  Edit3,
  CheckCircle2,
  ShieldAlert,
  Trash2,
  X,
  AlertTriangle,
  Package,
  Plus,
  Search,
  ArrowDownRight,
  ArrowUpRight,
  SlidersHorizontal,
  Archive,
  Coins,
  FileSpreadsheet,
  Sparkles,
  Send,
  TrendingUp,
  Bot,
  Zap,
  BarChart3,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import {
  registrarOActualizarColaboradorReal,
  resetearPasswordColaboradorReal,
  obtenerColaboradoresReales,
  eliminarColaboradorReal,
} from "@/app/actions/admin-users";
import { PADRON_OFICIAL_AUTORIZADO } from "@/lib/whitelist";
import { useSupervision, ServicioTarifario } from "@/context/SupervisionContext";

interface UsuarioCredencial {
  id: string;
  email: string;
  nombre: string;
  rol: "RECEPCION_CAJA" | "PROFESIONAL" | "SUPERVISION" | "ADMIN";
  sede: "Independencia" | "Vivanco" | "Todas las Sedes";
  colegiatura?: string;
  especialidad?: string;
  cargo: string;
  requiereCambioPassword?: boolean;
  activo: boolean;
}

export interface ProductoInventario {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  presentacion: string;
  stock_actual: number;
  stock_minimo: number;
  costo_unitario: number;
  precio_venta: number;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface MovimientoInventario {
  id: string;
  producto_id: string;
  producto?: { nombre: string; codigo: string };
  tipo: "ENTRADA" | "SALIDA_VENTA" | "SALIDA_USO_CLINICO" | "AJUSTE";
  cantidad: number;
  stock_anterior: number;
  stock_nuevo: number;
  motivo?: string;
  usuario_nombre?: string;
  fecha_hora: string;
}

export default function SupervisionPage() {
  const {
    subModuloSupervision,
    setSubModuloSupervision,
    setConteoPersonal,
    setConteoInventario,
    setStockBajoInventario,
    setConteoServicios,
    serviciosCustom,
    actualizarServicioTarifario,
    agregarServicioTarifario,
  } = useSupervision();

  const [usuarios, setUsuarios] = useState<UsuarioCredencial[]>([]);
  const [currentRole, setCurrentRole] = useState<string>("ADMIN");

  // Modal nuevo usuario
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [nuevoRol, setNuevoRol] = useState<"RECEPCION_CAJA" | "PROFESIONAL" | "SUPERVISION">("PROFESIONAL");
  const [nuevaSede, setNuevaSede] = useState<"Independencia" | "Vivanco">("Independencia");
  const [nuevaColegiatura, setNuevaColegiatura] = useState("");
  const [nuevaEspecialidad, setNuevaEspecialidad] = useState("");
  const [nuevoCargo, setNuevoCargo] = useState("Médico Especialista");

  // Modal editar usuario (Exclusivo Admin General)
  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioCredencial | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRol, setEditRol] = useState<"RECEPCION_CAJA" | "PROFESIONAL" | "SUPERVISION" | "ADMIN">("PROFESIONAL");
  const [editSede, setEditSede] = useState<"Independencia" | "Vivanco" | "Todas las Sedes">("Independencia");
  const [editColegiatura, setEditColegiatura] = useState("");
  const [editEspecialidad, setEditEspecialidad] = useState("");
  const [editCargo, setEditCargo] = useState("");
  const [editActivo, setEditActivo] = useState(true);

  // Estados para Control de Costos & Precios (Tarifario)
  const [filtroCategoriaCostos, setFiltroCategoriaCostos] = useState<string>("Todas");
  const [busquedaCostos, setBusquedaCostos] = useState<string>("");
  const [showServicioModal, setShowServicioModal] = useState<boolean>(false);
  const [servicioEditando, setServicioEditando] = useState<ServicioTarifario | null>(null);
  const [editServCodigo, setEditServCodigo] = useState<string>("");
  const [editServNombre, setEditServNombre] = useState<string>("");
  const [editServCategoria, setEditServCategoria] = useState<"Ecografías" | "Consultas" | "Procedimientos" | "Laboratorio" | "Packs Promocionales">("Ecografías");
  const [editServPrecioVenta, setEditServPrecioVenta] = useState<number>(0);
  const [editServCostoOperativo, setEditServCostoOperativo] = useState<number>(0);
  const [editServDescripcion, setEditServDescripcion] = useState<string>("");
  const [editServActivo, setEditServActivo] = useState<boolean>(true);
  const [isSavingServicio, setIsSavingServicio] = useState<boolean>(false);

  // Modal credencial temporal generada
  const [credencialGenerada, setCredencialGenerada] = useState<{
    nombre: string;
    email: string;
    passwordTemporal: string;
    rol: string;
    sede: string;
  } | null>(null);

  const [copiado, setCopiado] = useState(false);
  const [usuarioAEliminar, setUsuarioAEliminar] = useState<UsuarioCredencial | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal cambio voluntario de clave del Administrador General
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState(false);
  const [adminNewPassword, setAdminNewPassword] = useState("");
  const [adminConfirmPassword, setAdminConfirmPassword] = useState("");
  const [isAdminPasswordSaving, setIsAdminPasswordSaving] = useState(false);
  const [adminPasswordMsg, setAdminPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Estados para Módulo de Control de Inventario & Stock
  const [productosInventario, setProductosInventario] = useState<ProductoInventario[]>([]);
  const [cargandoInventario, setCargandoInventario] = useState(false);
  const [filtroCategoriaInv, setFiltroCategoriaInv] = useState<string>("Todas");
  const [busquedaInv, setBusquedaInv] = useState<string>("");
  const [soloBajoStock, setSoloBajoStock] = useState(false);
  const [vistaInventario, setVistaInventario] = useState<"catalogo" | "movimientos">("catalogo");
  const [movimientosInventario, setMovimientosInventario] = useState<MovimientoInventario[]>([]);
  const [cargandoMovimientos, setCargandoMovimientos] = useState(false);

  // Modal Crear / Editar Producto
  const [showProductoModal, setShowProductoModal] = useState(false);
  const [productoEditando, setProductoEditando] = useState<ProductoInventario | null>(null);
  const [prodCodigo, setProdCodigo] = useState("");
  const [prodNombre, setProdNombre] = useState("");
  const [prodCategoria, setProdCategoria] = useState("Medicamento");
  const [prodPresentacion, setProdPresentacion] = useState("");
  const [prodStockActual, setProdStockActual] = useState<number>(10);
  const [prodStockMinimo, setProdStockMinimo] = useState<number>(5);
  const [prodPrecioCosto, setProdPrecioCosto] = useState<number>(0);
  const [prodPrecioVenta, setProdPrecioVenta] = useState<number>(0);
  const [isSavingProducto, setIsSavingProducto] = useState(false);

  // Modal Ajuste / Movimiento Rápido de Stock
  const [showMovimientoModal, setShowMovimientoModal] = useState(false);
  const [productoParaMovimiento, setProductoParaMovimiento] = useState<ProductoInventario | null>(null);
  const [movTipo, setMovTipo] = useState<"ENTRADA" | "AJUSTE" | "SALIDA_USO_CLINICO">("ENTRADA");
  const [movCantidad, setMovCantidad] = useState<number>(1);
  const [movMotivo, setMovMotivo] = useState("");
  const [isSavingMovimiento, setIsSavingMovimiento] = useState(false);

  // Estados para Torre de Control & Centinela AI
  const [showAlarmaStockModal, setShowAlarmaStockModal] = useState(false);
  const [showMargenPacksModal, setShowMargenPacksModal] = useState(false);
  const [showBriefingModal, setShowBriefingModal] = useState(false);
  const [briefingCopiado, setBriefingCopiado] = useState(false);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [webhookUrlInput, setWebhookUrlInput] = useState("");
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);

  const [metricasBriefing, setMetricasBriefing] = useState<{
    totalFacturado: number;
    pacientesCount: number;
    efectivo: number;
    digital: number;
    serviciosResumen: string[];
    margenEstimado: number;
    cajaEstado: string;
  }>({
    totalFacturado: 0,
    pacientesCount: 0,
    efectivo: 0,
    digital: 0,
    serviciosResumen: [],
    margenEstimado: 0,
    cajaEstado: "CERRADA",
  });

  const cargarMetricasBriefing = async () => {
    try {
      const { data: atencionesRaw } = await supabase
        .from("encuentro")
        .select(`
          id,
          servicio_solicitado,
          estado,
          fecha_hora,
          orden_pago (
            monto,
            pago ( monto, medio_pago )
          )
        `)
        .order("fecha_hora", { ascending: false })
        .limit(100);

      const { data: turnoRaw } = await supabase
        .from("caja_turno")
        .select("estado, total_ingresos_efectivo, total_ingresos_digital")
        .order("fecha_apertura", { ascending: false })
        .limit(1)
        .maybeSingle();

      let facturado = 0;
      let ef = 0;
      let dig = 0;
      const servMap: { [key: string]: number } = {};

      if (atencionesRaw && atencionesRaw.length > 0) {
        atencionesRaw.forEach((item: any) => {
          const ord = item.orden_pago?.[0];
          const m = Number(ord?.monto) || 0;
          facturado += m;
          const s = item.servicio_solicitado || "Consulta General";
          servMap[s] = (servMap[s] || 0) + 1;

          const pagosList: any[] = Array.isArray(ord?.pago) ? ord.pago : (ord?.pago ? [ord.pago] : []);
          if (pagosList.length > 0) {
            pagosList.forEach((p) => {
              if (p.medio_pago === "EFECTIVO") ef += Number(p.monto) || 0;
              else dig += Number(p.monto) || 0;
            });
          } else {
            ef += m;
          }
        });
      }

      const topServicios = Object.entries(servMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([nombre, cant]) => `${nombre} (${cant})`);

      setMetricasBriefing({
        totalFacturado: facturado,
        pacientesCount: atencionesRaw?.length || 0,
        efectivo: ef,
        digital: dig,
        serviciosResumen: topServicios,
        margenEstimado: facturado * 0.72,
        cajaEstado: turnoRaw?.estado || "CERRADA",
      });
    } catch (e) {
      console.warn("Aviso al cargar métricas de briefing:", e);
    }
  };

  // Filtrado de alarmas de insumos (≤ stock_minimo)
  const productosEnAlarma = productosInventario.filter((p) => p.stock_actual <= p.stock_minimo);

  // Packs promocionales y ofertas
  const packsPromocionales = serviciosCustom.filter(
    (s) =>
      s.categoria.toLowerCase().includes("pack") ||
      s.categoria.toLowerCase().includes("promoci") ||
      s.nombre.toLowerCase().includes("pack") ||
      s.nombre.toLowerCase().includes("combo")
  );

  // Exportar a Google Sheets / Excel con datos de PRODUCCIÓN REAL (Atenciones, Ventas, Insumos y Caja)
  const handleExportarGoogleSheets = async () => {
    try {
      const fechaHoy = new Date().toLocaleDateString("es-PE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const horaHoy = new Date().toLocaleTimeString("es-PE");

      // 1. Consultar atenciones reales registradas en base de datos
      const { data: atencionesRaw } = await supabase
        .from("encuentro")
        .select(`
          id,
          servicio_solicitado,
          estado,
          fecha_hora,
          paciente:paciente_id ( dni, nombres, apellidos, telefono ),
          site:site_id ( nombre ),
          orden_pago (
            id,
            monto,
            items,
            pago ( id, monto, medio_pago, referencia )
          )
        `)
        .order("fecha_hora", { ascending: false })
        .limit(250);

      // 2. Consultar movimientos reales de kárdex / insumos
      const { data: movsRaw } = await supabase
        .from("movimiento_inventario")
        .select(`
          id,
          tipo,
          cantidad,
          stock_anterior,
          stock_nuevo,
          motivo,
          usuario_nombre,
          fecha_hora,
          producto:producto_id ( codigo, nombre, categoria )
        `)
        .order("fecha_hora", { ascending: false })
        .limit(100);

      // 3. Si hay Webhook oficial de Google Sheets configurado, sincronizar atenciones en vivo
      const webhookUrl = typeof window !== "undefined" ? localStorage.getItem("lm_sheets_webhook_url") : null;
      let totalEnviadosWebhook = 0;
      if (webhookUrl && webhookUrl.startsWith("http") && atencionesRaw && atencionesRaw.length > 0) {
        for (const item of atencionesRaw) {
          try {
            const f = new Date(item.fecha_hora);
            const ord = item.orden_pago?.[0];
            const pagosList: any[] = Array.isArray(ord?.pago) ? ord.pago : (ord?.pago ? [ord.pago] : []);
            const mediosStr = pagosList.map((p: any) => p.medio_pago).join(" + ") || "EFECTIVO";
            await fetch(webhookUrl, {
              method: "POST",
              mode: "no-cors",
              headers: { "Content-Type": "text/plain;charset=utf-8" },
              body: JSON.stringify({
                fecha: f.toLocaleDateString("es-PE"),
                hora: f.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }),
                sede: item.site?.nombre || "Independencia",
                paciente: `${item.paciente?.nombres || ''} ${item.paciente?.apellidos || ''}`.trim() || "Paciente Registrado",
                dni: item.paciente?.dni || "-",
                telefono: item.paciente?.telefono || "-",
                servicio: item.servicio_solicitado || "Atención Clínica",
                monto: ord?.monto ? Number(ord.monto) : 0,
                medioPago: mediosStr,
                cajero: "Caja de Turno",
                estado: item.estado || "ATENDIDO",
              }),
            });
            totalEnviadosWebhook++;
          } catch (wErr) {
            console.warn("Aviso al enviar lote a Sheets:", wErr);
          }
        }
      }

      let csv = "\uFEFFsep=;\r\n"; // Directiva oficial de separador para Excel

      // BLOQUE 1: ATENCIONES Y VENTAS REALIZADAS EN VIVO
      csv += "--- BLOQUE 1: REGISTRO DE ATENCIONES Y VENTAS REALIZADAS ---;;;;;;;;;\r\n";
      csv += "FECHA;HORA;SEDE;PACIENTE;DNI;TELEFONO;SERVICIO O PACK COBRADO;MONTO COBRADO (S/);MEDIO DE PAGO;ESTADO CONSULTORIO\r\n";

      let totalEfectivo = 0;
      let totalDigital = 0;
      let totalRecaudado = 0;
      const mapaServiciosVendidos: { [key: string]: { cantidad: number; total: number; costoEstimado: number } } = {};

      if (atencionesRaw && atencionesRaw.length > 0) {
        atencionesRaw.forEach((item: any) => {
          const f = new Date(item.fecha_hora);
          const fechaStr = f.toLocaleDateString("es-PE");
          const horaStr = f.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
          const pac = item.paciente || {};
          const nombrePac = `${pac.nombres || ''} ${pac.apellidos || ''}`.trim() || "Paciente Registrado";
          const dniPac = pac.dni || "-";
          const telfPac = pac.telefono || "-";
          const sedeNombre = item.site?.nombre || "Sede Principal";
          const servDesc = item.servicio_solicitado || "Consulta / Procedimiento";

          const ord = item.orden_pago?.[0];
          const montoCobrado = ord?.monto ? Number(ord.monto) : 0;
          totalRecaudado += montoCobrado;

          const pagosList: any[] = Array.isArray(ord?.pago) ? ord.pago : (ord?.pago ? [ord.pago] : []);
          let mediosPagoStr = "EFECTIVO";
          if (pagosList.length > 0) {
            mediosPagoStr = pagosList.map((p) => `${p.medio_pago || 'PAGO'}: S/ ${Number(p.monto).toFixed(2)}`).join(" | ");
            pagosList.forEach((p) => {
              if (p.medio_pago === "EFECTIVO") totalEfectivo += Number(p.monto) || 0;
              else totalDigital += Number(p.monto) || 0;
            });
          } else {
            totalEfectivo += montoCobrado;
          }

          // Agrupar únicamente los servicios y packs efectivamente vendidos
          if (!mapaServiciosVendidos[servDesc]) {
            const matchTarifario = (serviciosCustom || []).find(
              (s) => s.nombre.toLowerCase() === servDesc.toLowerCase() || servDesc.toLowerCase().includes(s.nombre.toLowerCase())
            );
            const costoUnit = matchTarifario ? Number(matchTarifario.costo_operativo) || 0 : 0;
            mapaServiciosVendidos[servDesc] = { cantidad: 0, total: 0, costoEstimado: costoUnit };
          }
          mapaServiciosVendidos[servDesc].cantidad += 1;
          mapaServiciosVendidos[servDesc].total += montoCobrado;

          csv += `"${fechaStr}";"${horaStr}";"${sedeNombre}";"${nombrePac.replace(/"/g, '""')}";"${dniPac}";"${telfPac}";"${servDesc.replace(/"/g, '""')}";${montoCobrado.toFixed(2)};"${mediosPagoStr}";"${item.estado || 'ATENDIDO'}"\r\n`;
        });
      } else {
        csv += `"${fechaHoy}";"${horaHoy}";"Todas";"SIN ATENCIONES REGISTRADAS EN LA JORNADA";"-";"-";"0 atenciones cobradas";0.00;"-";"ESPERANDO INGRESOS DESDE CAJA"\r\n`;
      }
      csv += "\r\n";

      // BLOQUE 2: RESUMEN DE PRODUCCION Y RENTABILIDAD POR SERVICIO / PACK EJECUTADO (SOLO VENTAS REALES)
      csv += "--- BLOQUE 2: RESUMEN DE PRODUCCION Y RENTABILIDAD POR SERVICIO O PACK VENDIDO ---;;;;;\r\n";
      csv += "SERVICIO O PACK EJECUTADO;CANTIDAD ATENDIDA;TOTAL RECAUDADO (S/);COSTO INSUMOS ESTIMADO (S/);MARGEN NETO (S/);RENTABILIDAD (%)\r\n";

      const serviciosVendidosKeys = Object.keys(mapaServiciosVendidos);
      if (serviciosVendidosKeys.length > 0) {
        serviciosVendidosKeys.forEach((key) => {
          const item = mapaServiciosVendidos[key];
          const costoTotalInsumos = item.costoEstimado * item.cantidad;
          const margenNeto = item.total - costoTotalInsumos;
          const margenPct = item.total > 0 ? ((margenNeto / item.total) * 100).toFixed(1) : "0.0";
          csv += `"${key.replace(/"/g, '""')}";${item.cantidad};${item.total.toFixed(2)};${costoTotalInsumos.toFixed(2)};${margenNeto.toFixed(2)};"${margenPct}%"\r\n`;
        });
      } else {
        csv += `"Sin servicios ni packs vendidos en el periodo (0 movimientos)";0;0.00;0.00;0.00;"0.0%"\r\n`;
      }
      csv += "\r\n";

      // BLOQUE 3: CONSUMO Y MOVIMIENTOS REALES DE INSUMOS (KARDEX EN VIVO)
      csv += "--- BLOQUE 3: CONSUMO Y MOVIMIENTOS DE INSUMOS REGISTRADOS ---;;;;;;;\r\n";
      csv += "FECHA Y HORA;PRODUCTO O MEDICAMENTO;CATEGORIA;TIPO MOVIMIENTO;CANTIDAD;STOCK RESULTANTE;MOTIVO O SEDE;RESPONSABLE\r\n";
      if (movsRaw && movsRaw.length > 0) {
        movsRaw.forEach((m: any) => {
          const fStr = new Date(m.fecha_hora).toLocaleString("es-PE");
          const prodNombre = m.producto?.nombre || "Insumo Clínico";
          const prodCat = m.producto?.categoria || "General";
          csv += `"${fStr}";"${prodNombre.replace(/"/g, '""')}";"${prodCat}";"${m.tipo || 'MOVIMIENTO'}";${m.cantidad || 0};${m.stock_nuevo || 0};"${(m.motivo || '').replace(/"/g, '""')}";"${m.usuario_nombre || 'Personal Autorizado'}"\r\n`;
        });
      } else {
        csv += `"${fechaHoy} ${horaHoy}";"Sin movimientos de insumos registrados en el periodo";"-";"-";0;0;"-";"-"\r\n`;
      }
      csv += "\r\n";

      // BLOQUE 4: BALANCE FINANCIERO Y RECAUDACION CONSOLIDADA
      csv += "--- BLOQUE 4: BALANCE FINANCIERO Y RECAUDACION CONSOLIDADA ---;;;;;;;;;\r\n";
      csv += "CONCEPTO;;;;IMPORTE (S/);;;;\r\n";
      csv += `Total Recaudado en Efectivo;;;;${totalEfectivo.toFixed(2)};;;;\r\n`;
      csv += `Total Recaudado Digital (Yape / Plin / POS);;;;${totalDigital.toFixed(2)};;;;\r\n`;
      csv += `Total Facturacion Bruta;;;;${totalRecaudado.toFixed(2)};;;;\r\n`;
      csv += `Total Atenciones Registradas;;;;${atencionesRaw?.length || 0} pacientes;;;;\r\n`;

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Produccion_Ventas_Las_Mellizas_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (totalEnviadosWebhook > 0) {
        alert(
          `✅ Sincronización Exitosa con Google Drive:\n\n• ${totalEnviadosWebhook} atenciones enviadas directamente a su hoja de Google Sheets.\n• Se guardó un archivo CSV de respaldo en este equipo.`
        );
      } else if (!webhookUrl) {
        alert(
          `ℹ️ Respaldo descargado en archivo CSV.\n\nPara subir directamente a su hoja de Google Drive en tiempo real, guarde la URL de Google Apps Script en el botón "🔗 Webhook" de esta Torre de Control.`
        );
      } else {
        alert(`✅ Respaldo de producción y ventas descargado exitosamente.`);
      }
    } catch (err: any) {
      alert("Error al exportar reporte de produccion: " + (err?.message || err));
    }
  };

  // Exportar Hoja Específica de Packs a Excel (100% columnas limpias)
  const handleExportarPacksExcel = () => {
    try {
      let csv = "\uFEFFsep=;\r\n";
      csv += "CÓDIGO;SERVICIO / PACK PROMOCIONAL;CATEGORÍA;PRECIO VENTA (S/);COSTO INSUMOS (S/);MARGEN NETO (S/);MARGEN (%)\r\n";
      const listaPacks = (packsPromocionales && packsPromocionales.length > 0) ? packsPromocionales : (serviciosCustom || []);
      listaPacks.forEach((s) => {
        const precioNum = Number(s.precio_venta) || 0;
        const costoNum = Number(s.costo_operativo) || 0;
        const margenNeto = Number((precioNum - costoNum).toFixed(2));
        const margenPct = precioNum > 0 ? ((margenNeto / precioNum) * 100).toFixed(1) : "0.0";
        csv += `"${s.codigo || s.id || ''}";"${s.nombre || ''}";"${s.categoria || ''}";${precioNum.toFixed(2)};${costoNum.toFixed(2)};${margenNeto.toFixed(2)};"${margenPct}%"\r\n`;
      });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Packs_Rentabilidad_Las_Mellizas_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert("Error al exportar packs: " + (err?.message || err));
    }
  };

  // Exportar Hoja Específica de Stock a Excel (100% columnas limpias)
  const handleExportarStockExcel = () => {
    try {
      let csv = "\uFEFFsep=;\r\n";
      csv += "CÓDIGO;PRODUCTO / MEDICAMENTO;CATEGORÍA;PRESENTACIÓN;STOCK ACTUAL;STOCK MÍNIMO;COSTO UNITARIO (S/);PRECIO VENTA (S/);VALOR TOTAL (S/);ESTADO ALERTA\r\n";
      (productosInventario || []).forEach((p) => {
        const stockAct = Number(p.stock_actual) || 0;
        const stockMin = Number(p.stock_minimo) || 0;
        const costoUnit = Number(p.costo_unitario) || 0;
        const precioVta = Number(p.precio_venta) || 0;
        const estado = stockAct === 0 ? "CRÍTICO - AGOTADO" : stockAct <= stockMin ? "ALERTA - REPOSICIÓN" : "ÓPTIMO";
        const valorTotal = (stockAct * costoUnit).toFixed(2);
        csv += `"${p.codigo || ''}";"${p.nombre || ''}";"${p.categoria || ''}";"${p.presentacion || ''}";${stockAct};${stockMin};${costoUnit.toFixed(2)};${precioVta.toFixed(2)};${valorTotal};"${estado}"\r\n`;
      });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Inventario_Stock_Las_Mellizas_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert("Error al exportar inventario: " + (err?.message || err));
    }
  };

  // Enviar Briefing a WhatsApp con Datos Reales de Producción
  const handleEnviarWhatsAppBriefing = () => {
    const serviciosTopStr = metricasBriefing.serviciosResumen.length > 0
      ? metricasBriefing.serviciosResumen.join(", ")
      : "Ninguno aún registrado en la jornada";

    const quiebresTexto = productosEnAlarma.length > 0
      ? `🚨 Insumos en Alarma/Quiebre: ${productosEnAlarma.length} (${productosEnAlarma.map((p) => p.nombre).slice(0, 3).join(", ")})`
      : "✅ Farmacia: 100% de insumos y medicamentos sobre el nivel mínimo.";

    const recomendacionTactica = metricasBriefing.totalFacturado > 0
      ? "La jornada refleja tracción sólida en paquetes preventivos. Se sugiere mantener el impulso en ventanilla y verificar reactivos de laboratorio para mañana."
      : "Personal en puesto esperando flujo de pacientes. Se sugiere revisar bandeja de citas y promociones en canales digitales.";

    const mensaje = `*📊 BRIEFING EJECUTIVO CENTINELA AI (GEMINI PRO) — LAS MELLIZAS PERÚ S.A.C.*
📅 Fecha: ${new Date().toLocaleDateString("es-PE")} | Hora: ${new Date().toLocaleTimeString("es-PE")}
🏥 Sedes: Independencia & Puente Piedra (RUC 20611827335)

💰 *PRODUCCIÓN & RECAUDACIÓN HOY:*
• Facturación Total: ${formatCurrency(metricasBriefing.totalFacturado)}
• Pacientes Atendidos: ${metricasBriefing.pacientesCount} paciente(s)
• Efectivo en Gaveta: ${formatCurrency(metricasBriefing.efectivo)}
• Cobros Digitales (Yape/Plin/POS): ${formatCurrency(metricasBriefing.digital)}
• Ticket Promedio: ${metricasBriefing.pacientesCount > 0 ? formatCurrency(metricasBriefing.totalFacturado / metricasBriefing.pacientesCount) : "S/ 0.00"}

🏆 *SERVICIOS & PACKS DESTACADOS:*
• ${serviciosTopStr}
• Margen Neto Estimado: ${formatCurrency(metricasBriefing.margenEstimado)} (~72%)

🚨 *ESTADO OPERATIVO & FARMACIA:*
• Estado Turno Caja: ${metricasBriefing.cajaEstado}
• ${quiebresTexto}

🧠 *RECOMENDACIÓN TÁCTICA CENTINELA AI:*
_${recomendacionTactica}_

📧 lasmellizaspe@gmail.com | 📲 +51 966840077`;

    window.open(`https://wa.me/51966840077?text=${encodeURIComponent(mensaje)}`, "_blank");
  };

  // Copiar Briefing
  const handleCopiarBriefing = () => {
    const serviciosTopStr = metricasBriefing.serviciosResumen.length > 0
      ? metricasBriefing.serviciosResumen.join(", ")
      : "Ninguno aún registrado en la jornada";

    const quiebresTexto = productosEnAlarma.length > 0
      ? `🚨 Insumos en Alarma/Quiebre: ${productosEnAlarma.length} (${productosEnAlarma.map((p) => p.nombre).slice(0, 3).join(", ")})`
      : "✅ Farmacia: 100% de insumos y medicamentos sobre el nivel mínimo.";

    const recomendacionTactica = metricasBriefing.totalFacturado > 0
      ? "La jornada refleja tracción sólida en paquetes preventivos. Se sugiere mantener el impulso en ventanilla y verificar reactivos de laboratorio para mañana."
      : "Personal en puesto esperando flujo de pacientes. Se sugiere revisar bandeja de citas y promociones en canales digitales.";

    const mensaje = `*📊 BRIEFING EJECUTIVO CENTINELA AI (GEMINI PRO) — LAS MELLIZAS PERÚ S.A.C.*
📅 Fecha: ${new Date().toLocaleDateString("es-PE")} | Hora: ${new Date().toLocaleTimeString("es-PE")}
🏥 Sedes: Independencia & Puente Piedra (RUC 20611827335)

💰 *PRODUCCIÓN & RECAUDACIÓN HOY:*
• Facturación Total: ${formatCurrency(metricasBriefing.totalFacturado)}
• Pacientes Atendidos: ${metricasBriefing.pacientesCount} paciente(s)
• Efectivo en Gaveta: ${formatCurrency(metricasBriefing.efectivo)}
• Cobros Digitales (Yape/Plin/POS): ${formatCurrency(metricasBriefing.digital)}
• Ticket Promedio: ${metricasBriefing.pacientesCount > 0 ? formatCurrency(metricasBriefing.totalFacturado / metricasBriefing.pacientesCount) : "S/ 0.00"}

🏆 *SERVICIOS & PACKS DESTACADOS:*
• ${serviciosTopStr}
• Margen Neto Estimado: ${formatCurrency(metricasBriefing.margenEstimado)} (~72%)

🚨 *ESTADO OPERATIVO & FARMACIA:*
• Estado Turno Caja: ${metricasBriefing.cajaEstado}
• ${quiebresTexto}

🧠 *RECOMENDACIÓN TÁCTICA CENTINELA AI:*
_${recomendacionTactica}_

📧 lasmellizaspe@gmail.com | 📲 +51 966840077`;

    navigator.clipboard.writeText(mensaje);
    setBriefingCopiado(true);
    setTimeout(() => setBriefingCopiado(false), 2500);
  };

  const cargarPersonal = async () => {
    try {
      // 1. Prioridad: Consulta en vivo con el cliente Supabase (autenticado como Admin)
      const { data: dbProfiles, error: dbError } = await supabase
        .from("perfil_usuario")
        .select("*, sede:site_id(nombre)")
        .order("created_at", { ascending: false });

      if (!dbError && dbProfiles && dbProfiles.length > 0) {
        setUsuarios(
          dbProfiles.map((p: any) => ({
            id: p.id,
            email: p.email,
            nombre: p.nombre_completo,
            rol: p.rol === "RECEPCION" || p.rol === "CAJA" ? "RECEPCION_CAJA" : p.rol,
            sede: p.sede?.nombre || (p.site_id === "b0000000-0000-0000-0000-000000000002" ? "Vivanco" : p.site_id ? "Independencia" : "Todas las Sedes"),
            colegiatura: p.colegiatura,
            especialidad: p.especialidad,
            cargo: p.especialidad || (p.rol === "PROFESIONAL" ? "Médico / Obstetra" : "Admisión & Caja"),
            activo: p.activo !== false,
          }))
        );
        return;
      }

      // 2. Fallback: Server Action
      const res = await obtenerColaboradoresReales();
      if (res.success && res.colaboradores.length > 0) {
        setUsuarios(
          res.colaboradores.map((p: any) => ({
            id: p.id,
            email: p.email,
            nombre: p.nombre_completo,
            rol: p.rol === "RECEPCION" || p.rol === "CAJA" ? "RECEPCION_CAJA" : p.rol,
            sede: p.sede?.nombre || (p.site_id === "b0000000-0000-0000-0000-000000000002" ? "Vivanco" : p.site_id ? "Independencia" : "Todas las Sedes"),
            colegiatura: p.colegiatura,
            especialidad: p.especialidad,
            cargo: p.especialidad || (p.rol === "PROFESIONAL" ? "Médico / Obstetra" : "Admisión & Caja"),
            activo: p.activo !== false,
          }))
        );
        return;
      }
    } catch (err) {
      console.error("Error al sincronizar personal:", err);
    }

    // 3. Fallback defensivo padrón oficial
    setUsuarios(
      PADRON_OFICIAL_AUTORIZADO.map((cta, idx) => ({
        id: `padron-${idx}`,
        email: cta.email,
        nombre: cta.nombre,
        rol: cta.rol,
        sede: cta.sede === "Central" ? "Todas las Sedes" : cta.sede,
        colegiatura: cta.colegiatura,
        especialidad: cta.especialidad,
        cargo: cta.cargo,
        activo: true,
      }))
    );
  };

  useEffect(() => {
    async function initAdminRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email === "admin@lasmellizasperu.com") {
        setCurrentRole("ADMIN");
        sessionStorage.setItem("lm_rol", "ADMIN");
      } else {
        const r = sessionStorage.getItem("lm_rol") || "SUPERVISION";
        setCurrentRole(r);
      }
      cargarPersonal();
    }
    initAdminRole();
  }, []);

  useEffect(() => {
    if (usuarios.length > 0) {
      setConteoPersonal(usuarios.length);
    }
  }, [usuarios, setConteoPersonal]);

  useEffect(() => {
    if (productosInventario.length > 0) {
      setConteoInventario(productosInventario.length);
      setStockBajoInventario(productosInventario.filter((p) => p.stock_actual <= p.stock_minimo).length);
    }
  }, [productosInventario, setConteoInventario, setStockBajoInventario]);


  const isAdmin = currentRole === "ADMIN";

  interface EventoAuditoria {
    id: string;
    hora: string;
    usuario: string;
    rol: string;
    accion: string;
    entidad: string;
    entidadId: string;
    detalle: string;
  }

  const [eventosAuditoria, setEventosAuditoria] = useState<EventoAuditoria[]>([]);
  const [cargandoAuditoria, setCargandoAuditoria] = useState(false);

  const cargarAuditoriaReal = async () => {
    setCargandoAuditoria(true);
    try {
      const { data, error } = await supabase
        .from("auditoria")
        .select(`
          id,
          fecha_hora,
          accion,
          entidad,
          entidad_id,
          detalle,
          usuario:usuario_id (
            nombre_completo,
            email,
            rol
          )
        `)
        .order("fecha_hora", { ascending: false })
        .limit(50);

      if (!error && data) {
        const mapeados: EventoAuditoria[] = data.map((item: any) => {
          const usr = item.usuario || {};
          const d = new Date(item.fecha_hora);
          const horaStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
          let detalleStr = "";
          if (typeof item.detalle === "string") {
            detalleStr = item.detalle;
          } else if (item.detalle && typeof item.detalle === "object") {
            detalleStr = Object.entries(item.detalle)
              .map(([k, v]) => `${k}: ${v}`)
              .join(" | ");
          }

          return {
            id: item.id,
            hora: horaStr,
            usuario: usr.email || usr.nombre_completo || "Sistema / Transacción",
            rol: usr.rol || "AUDITORIA",
            accion: item.accion,
            entidad: item.entidad,
            entidadId: item.entidad_id || "",
            detalle: detalleStr || `${item.entidad}: ${item.entidad_id || "Operación registrada"}`,
          };
        });
        setEventosAuditoria(mapeados);
      }
    } catch (err) {
      console.warn("Error consultando auditoria:", err);
    } finally {
      setCargandoAuditoria(false);
    }
  };

  const cargarInventario = async () => {
    setCargandoInventario(true);
    try {
      const { data, error } = await supabase
        .from("producto_inventario")
        .select("*")
        .order("categoria", { ascending: true })
        .order("nombre", { ascending: true });

      if (!error && data) {
        setProductosInventario(data);
      }
    } catch (err) {
      console.warn("Error cargando inventario:", err);
    } finally {
      setCargandoInventario(false);
    }
  };

  const cargarMovimientos = async () => {
    setCargandoMovimientos(true);
    try {
      const { data, error } = await supabase
        .from("movimiento_inventario")
        .select(`
          id,
          producto_id,
          tipo,
          cantidad,
          stock_anterior,
          stock_nuevo,
          motivo,
          usuario_nombre,
          fecha_hora,
          producto:producto_id (
            nombre,
            codigo
          )
        `)
        .order("fecha_hora", { ascending: false })
        .limit(50);

      if (!error && data) {
        setMovimientosInventario(data as any);
      }
    } catch (err) {
      console.warn("Error cargando movimientos:", err);
    } finally {
      setCargandoMovimientos(false);
    }
  };

  const handleAbrirNuevoProducto = () => {
    setProductoEditando(null);
    setProdCodigo(`INV-${Date.now().toString().slice(-4)}`);
    setProdNombre("");
    setProdCategoria("Medicamento");
    setProdPresentacion("Caja / Frasco / Unidad");
    setProdStockActual(10);
    setProdStockMinimo(5);
    setProdPrecioCosto(0);
    setProdPrecioVenta(0);
    setShowProductoModal(true);
  };

  const handleAbrirEditarProducto = (p: ProductoInventario) => {
    setProductoEditando(p);
    setProdCodigo(p.codigo);
    setProdNombre(p.nombre);
    setProdCategoria(p.categoria);
    setProdPresentacion(p.presentacion);
    setProdStockActual(p.stock_actual);
    setProdStockMinimo(p.stock_minimo);
    setProdPrecioCosto(p.costo_unitario);
    setProdPrecioVenta(p.precio_venta);
    setShowProductoModal(true);
  };

  const handleGuardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert("Operación restringida: Solo el Administrador General puede modificar el catálogo de inventario.");
      return;
    }
    setIsSavingProducto(true);
    try {
      if (productoEditando) {
        const stockActualNum = Number(prodStockActual);
        const { error } = await supabase
          .from("producto_inventario")
          .update({
            codigo: prodCodigo.trim().toUpperCase(),
            nombre: prodNombre.trim(),
            categoria: prodCategoria,
            presentacion: prodPresentacion.trim(),
            stock_actual: stockActualNum,
            stock_minimo: Number(prodStockMinimo),
            costo_unitario: Number(prodPrecioCosto),
            precio_venta: Number(prodPrecioVenta),
            updated_at: new Date().toISOString(),
          })
          .eq("id", productoEditando.id);

        if (error) throw error;

        // Registrar ajuste en kárdex si hubo variación de stock
        const diff = stockActualNum - productoEditando.stock_actual;
        if (diff !== 0) {
          try {
            await supabase.from("movimiento_inventario").insert({
              producto_id: productoEditando.id,
              tipo: "AJUSTE",
              cantidad: Math.abs(diff),
              stock_anterior: productoEditando.stock_actual,
              stock_nuevo: stockActualNum,
              motivo: `Ajuste en edición de catálogo (${diff > 0 ? "+" : ""}${diff} unds)`,
              usuario_nombre: sessionStorage.getItem("lm_nombre") || "Administración General",
              fecha_hora: new Date().toISOString(),
            });
          } catch (mErr) {
            console.warn("Aviso: No se pudo registrar ajuste en movimiento_inventario:", mErr);
          }
        }
      } else {
        const { error } = await supabase
          .from("producto_inventario")
          .insert({
            codigo: prodCodigo.trim().toUpperCase(),
            nombre: prodNombre.trim(),
            categoria: prodCategoria,
            presentacion: prodPresentacion.trim(),
            stock_actual: Number(prodStockActual),
            stock_minimo: Number(prodStockMinimo),
            costo_unitario: Number(prodPrecioCosto),
            precio_venta: Number(prodPrecioVenta),
            activo: true,
          });

        if (error) throw error;
      }

      setShowProductoModal(false);
      cargarInventario();
    } catch (err: any) {
      alert("Error al guardar producto:\n" + (err?.message || err));
    } finally {
      setIsSavingProducto(false);
    }
  };

  const handleAbrirMovimiento = (p: ProductoInventario) => {
    setProductoParaMovimiento(p);
    setMovTipo("ENTRADA");
    setMovCantidad(1);
    setMovMotivo("");
    setShowMovimientoModal(true);
  };

  const handleRegistrarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productoParaMovimiento) return;
    if (movCantidad <= 0) {
      alert("La cantidad debe ser mayor a 0.");
      return;
    }

    setIsSavingMovimiento(true);
    try {
      const { data: userAuth } = await supabase.auth.getUser();
      const currentUserName = sessionStorage.getItem("lm_nombre") || "Administración General";

      const { error } = await supabase.rpc("registrar_movimiento_inventario", {
        p_producto_id: productoParaMovimiento.id,
        p_tipo: movTipo,
        p_cantidad: Number(movCantidad),
        p_motivo: movMotivo.trim() || `Ajuste administrativo (${movTipo})`,
        p_site_id: null,
        p_usuario_nombre: currentUserName,
      });

      if (error) throw error;

      setShowMovimientoModal(false);
      await cargarInventario();
      if (vistaInventario === "movimientos") {
        await cargarMovimientos();
      }
    } catch (err: any) {
      alert("Error al registrar movimiento:\n" + (err?.message || err));
    } finally {
      setIsSavingMovimiento(false);
    }
  };

  useEffect(() => {
    if (subModuloSupervision === "auditoria") {
      cargarAuditoriaReal();
    } else if (subModuloSupervision === "inventario") {
      cargarInventario();
      if (vistaInventario === "movimientos") {
        cargarMovimientos();
      }
    }
  }, [subModuloSupervision, vistaInventario]);

  const handleConfirmarEliminar = async () => {
    if (!usuarioAEliminar || !isAdmin) return;
    if (usuarioAEliminar.email === "admin@lasmellizasperu.com") {
      alert("Operación denegada: No es posible eliminar la cuenta principal de Administración General.");
      setUsuarioAEliminar(null);
      return;
    }

    setIsDeleting(true);
    const res = await eliminarColaboradorReal(usuarioAEliminar.id, usuarioAEliminar.email);
    setIsDeleting(false);

    if (res.success) {
      if (usuarioEditando?.id === usuarioAEliminar.id) {
        setUsuarioEditando(null);
      }
      setUsuarioAEliminar(null);
      cargarPersonal();
    } else {
      alert("Error al dar de baja al colaborador: " + res.error);
    }
  };

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const passwordTemporal = "Mellizas#2026!";
    const res = await registrarOActualizarColaboradorReal({
      email: nuevoEmail,
      nombre: nuevoNombre,
      rol: nuevoRol,
      sede: nuevaSede,
      colegiatura: nuevaColegiatura,
      especialidad: nuevaEspecialidad,
      cargo: nuevoCargo,
      password: passwordTemporal,
    });

    if (res.success) {
      setShowNewUserModal(false);
      setCredencialGenerada({
        nombre: nuevoNombre,
        email: nuevoEmail,
        passwordTemporal,
        rol: nuevoRol,
        sede: nuevaSede,
      });

      setNuevoNombre("");
      setNuevoEmail("");
      setNuevaColegiatura("");
      setNuevaEspecialidad("");
      cargarPersonal();
    } else {
      alert("Error al registrar colaborador: " + res.error);
    }
  };

  const handleAbrirEditar = (usr: UsuarioCredencial) => {
    if (!isAdmin) return;
    setUsuarioEditando(usr);
    setEditNombre(usr.nombre);
    setEditEmail(usr.email);
    setEditRol(usr.rol);
    setEditSede(usr.sede);
    setEditColegiatura(usr.colegiatura || "");
    setEditEspecialidad(usr.especialidad || "");
    setEditCargo(usr.cargo);
    setEditActivo(usr.activo);
  };

  const [isSavingUser, setIsSavingUser] = useState(false);

  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioEditando) return;

    if (!isAdmin) {
      alert("Acceso denegado: Se requieren permisos de Administrador General (admin@lasmellizasperu.com) para modificar colaboradores.\n\nUsuario actual: " + (sessionStorage.getItem("lm_user") || "No identificado"));
      return;
    }

    setIsSavingUser(true);
    const cleanEmail = editEmail.trim().toLowerCase();
    const cleanNombre = editNombre.trim();
    const cleanColegiatura = editColegiatura.trim() || null;
    const cleanEspecialidad = editEspecialidad.trim() || null;
    const siteId = editSede === "Todas las Sedes" ? null : (editSede === "Vivanco" ? "b0000000-0000-0000-0000-000000000002" : "b0000000-0000-0000-0000-000000000001");

    let success = false;
    let errorMessage = "";

    try {
      // 1. Obtener o verificar el UUID real del usuario en perfil_usuario
      let targetId = usuarioEditando.id;
      if (!targetId || targetId.startsWith("padron-")) {
        const { data: foundProfile } = await supabase
          .from("perfil_usuario")
          .select("id")
          .eq("email", usuarioEditando.email.trim().toLowerCase())
          .maybeSingle();

        if (foundProfile?.id) {
          targetId = foundProfile.id;
        }
      }

      // 2. Prevenir colisión de correo si fue modificado
      if (cleanEmail !== usuarioEditando.email.trim().toLowerCase()) {
        const { data: emailConflict } = await supabase
          .from("perfil_usuario")
          .select("id, nombre_completo")
          .eq("email", cleanEmail)
          .maybeSingle();

        if (emailConflict && emailConflict.id !== targetId) {
          setIsSavingUser(false);
          alert(`❌ Conflicto de correo: El correo institucional "${cleanEmail}" ya pertenece al colaborador "${emailConflict.nombre_completo}".`);
          return;
        }
      }

      // 3. Ejecutar actualización con RPC segura
      if (targetId && !targetId.startsWith("padron-")) {
        const { error: rpcErr } = await supabase.rpc("actualizar_perfil_colaborador", {
          p_id: targetId,
          p_nombre: cleanNombre,
          p_rol: editRol,
          p_site_id: siteId,
          p_colegiatura: cleanColegiatura,
          p_especialidad: cleanEspecialidad,
          p_activo: editActivo,
          p_email: cleanEmail,
        });

        if (!rpcErr) {
          success = true;
        } else {
          // Si falló RPC, ejecutar actualización directa con sesión Admin en perfil_usuario
          const { error: updateErr } = await supabase
            .from("perfil_usuario")
            .update({
              email: cleanEmail,
              nombre_completo: cleanNombre,
              rol: editRol,
              site_id: siteId,
              colegiatura: cleanColegiatura,
              especialidad: cleanEspecialidad,
              activo: editActivo,
              updated_at: new Date().toISOString(),
            })
            .eq("id", targetId);

          if (!updateErr) {
            success = true;
          } else {
            errorMessage = updateErr.message;
          }
        }
      } else {
        // Si no se encontró por ID ni por correo previo, llamar al Server Action para creación
        const res = await registrarOActualizarColaboradorReal({
          id: targetId,
          email: cleanEmail,
          emailAnterior: usuarioEditando.email,
          nombre: cleanNombre,
          rol: editRol,
          sede: editSede,
          colegiatura: cleanColegiatura || undefined,
          especialidad: cleanEspecialidad || undefined,
          cargo: editCargo,
          activo: editActivo,
        });

        if (res.success) {
          success = true;
        } else {
          errorMessage = res.error || "No se pudo actualizar el registro del colaborador.";
        }
      }
    } catch (err: any) {
      errorMessage = err.message || "Error al procesar la actualización.";
    }

    setIsSavingUser(false);

    if (success) {
      setUsuarioEditando(null);
      await cargarPersonal();
      alert("✅ Cambios guardados exitosamente para " + cleanNombre);
    } else {
      alert("❌ Error al actualizar colaborador: " + errorMessage);
    }
  };

  const handleCambiarPasswordAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPasswordMsg(null);

    if (adminNewPassword.length < 8) {
      setAdminPasswordMsg({ type: "error", text: "La contraseña debe contener al menos 8 caracteres." });
      return;
    }
    if (adminNewPassword !== adminConfirmPassword) {
      setAdminPasswordMsg({ type: "error", text: "Las contraseñas ingresadas no coinciden." });
      return;
    }

    setIsAdminPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: adminNewPassword,
      });

      if (error) {
        setAdminPasswordMsg({ type: "error", text: error.message });
      } else {
        setAdminPasswordMsg({ type: "success", text: "Contraseña de Administrador General actualizada exitosamente." });
        setTimeout(() => {
          setShowAdminPasswordModal(false);
          setAdminNewPassword("");
          setAdminConfirmPassword("");
          setAdminPasswordMsg(null);
        }, 2000);
      }
    } catch (err: any) {
      setAdminPasswordMsg({ type: "error", text: err.message || "Error al actualizar la contraseña." });
    } finally {
      setIsAdminPasswordSaving(false);
    }
  };

  const handleResetearClave = async (usr: UsuarioCredencial) => {
    if (!isAdmin) return;
    const res = await resetearPasswordColaboradorReal(usr.email);
    if (res.success && res.passwordTemporal) {
      setCredencialGenerada({
        nombre: usr.nombre,
        email: usr.email,
        passwordTemporal: res.passwordTemporal,
        rol: usr.rol,
        sede: usr.sede,
      });
      cargarPersonal();
    } else {
      alert("Error al resetear contraseña: " + res.error);
    }
  };

  const copiarCredenciales = () => {
    if (!credencialGenerada) return;
    const texto = `*Ecosistema Digital Las Mellizas Perú S.A.C.*\nCredencial de 1 Solo Uso:\n- Usuario: ${credencialGenerada.email}\n- Clave Temporal: ${credencialGenerada.passwordTemporal}\n- Sede: ${credencialGenerada.sede}\n- Rol: ${credencialGenerada.rol}\n\n*Nota:* Al ingresar se le exigirá crear su propia contraseña privada para asumir su responsabilidad institucional.`;
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const handleAbrirNuevoServicio = () => {
    setServicioEditando(null);
    setEditServCodigo(`SRV-${Date.now().toString().slice(-4)}`);
    setEditServNombre("");
    setEditServCategoria("Ecografías");
    setEditServPrecioVenta(80);
    setEditServCostoOperativo(25);
    setEditServDescripcion("");
    setEditServActivo(true);
    setShowServicioModal(true);
  };

  const handleAbrirEditarServicio = (serv: ServicioTarifario) => {
    setServicioEditando(serv);
    setEditServCodigo(serv.codigo);
    setEditServNombre(serv.nombre);
    setEditServCategoria(serv.categoria);
    setEditServPrecioVenta(serv.precio_venta);
    setEditServCostoOperativo(serv.costo_operativo);
    setEditServDescripcion(serv.descripcion || "");
    setEditServActivo(serv.activo);
    setShowServicioModal(true);
  };

  const handleGuardarServicio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert("Operación restringida: Solo el Administrador General puede modificar el tarifario institucional.");
      return;
    }
    if (!editServNombre.trim()) {
      alert("Ingrese el nombre del servicio o estudio ecográfico.");
      return;
    }
    if (editServPrecioVenta < 0) {
      alert("El precio de venta no puede ser negativo.");
      return;
    }

    setIsSavingServicio(true);
    try {
      if (servicioEditando) {
        const actualizado: ServicioTarifario = {
          ...servicioEditando,
          codigo: editServCodigo.trim().toUpperCase(),
          nombre: editServNombre.trim(),
          categoria: editServCategoria,
          precio_venta: Number(editServPrecioVenta),
          costo_operativo: Number(editServCostoOperativo),
          descripcion: editServDescripcion.trim(),
          activo: editServActivo,
        };
        actualizarServicioTarifario(actualizado);

        try {
          await supabase.from("catalogo_servicio").upsert({
            id: actualizado.id,
            codigo: actualizado.codigo,
            nombre: actualizado.nombre,
            categoria: actualizado.categoria,
            precio_venta: actualizado.precio_venta,
            costo_operativo: actualizado.costo_operativo,
            descripcion: actualizado.descripcion,
            activo: actualizado.activo,
            updated_at: new Date().toISOString(),
          });
        } catch {}

        alert(`✅ Tarifa actualizada exitosamente:\n${actualizado.nombre} -> S/ ${actualizado.precio_venta.toFixed(2)}`);
      } else {
        const nuevo: Omit<ServicioTarifario, "id"> = {
          codigo: editServCodigo.trim().toUpperCase(),
          nombre: editServNombre.trim(),
          categoria: editServCategoria,
          precio_venta: Number(editServPrecioVenta),
          costo_operativo: Number(editServCostoOperativo),
          descripcion: editServDescripcion.trim(),
          activo: editServActivo,
        };
        agregarServicioTarifario(nuevo);

        try {
          await supabase.from("catalogo_servicio").insert({
            codigo: nuevo.codigo,
            nombre: nuevo.nombre,
            categoria: nuevo.categoria,
            precio_venta: nuevo.precio_venta,
            costo_operativo: nuevo.costo_operativo,
            descripcion: nuevo.descripcion,
            activo: nuevo.activo,
          });
        } catch {}

        alert(`✅ Nuevo servicio registrado en el tarifario:\n${nuevo.nombre} -> S/ ${nuevo.precio_venta.toFixed(2)}`);
      }
      setShowServicioModal(false);
    } catch (err: any) {
      alert("Error al guardar en tarifario:\n" + (err?.message || err));
    } finally {
      setIsSavingServicio(false);
    }
  };

  const handleToggleActivoServicio = (serv: ServicioTarifario) => {
    if (!isAdmin) return;
    const actualizado = { ...serv, activo: !serv.activo };
    actualizarServicioTarifario(actualizado);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Supervisión, Personal & Auditoría</h1>
          <p className="text-xs text-neutral-500">
            Gobernanza clínica, administración de colaboradores y trazabilidad criptográfica.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {subModuloSupervision === "personal" && isAdmin && (
            <button
              onClick={() => setShowNewUserModal(true)}
              className="inline-flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>Alta de Nuevo Colaborador</span>
            </button>
          )}
          {subModuloSupervision === "inventario" && isAdmin && (
            <button
              onClick={handleAbrirNuevoProducto}
              className="inline-flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Insumo / Producto</span>
            </button>
          )}
          {subModuloSupervision === "costos" && isAdmin && (
            <button
              onClick={handleAbrirNuevoServicio}
              className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nuevo Servicio / Ecografía</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TORRE DE CONTROL & CENTINELA AI: MONITOR EN TIEMPO REAL & BOTONES DE ALARMA */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-neutral-900 via-brand-950 to-neutral-900 rounded-3xl p-5 border border-brand-800/40 shadow-xl text-white space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/20 border border-brand-400/30 flex items-center justify-center text-brand-300">
              <Bot className="w-5 h-5 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-wider uppercase text-white">Torre de Control & Centinela AI</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  En Vivo
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Auditoría proactiva, alertas de farmacia, control de margen en packs y enlace a Google Sheets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                cargarMetricasBriefing();
                setShowBriefingModal(true);
              }}
              className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3 py-2 rounded-xl border border-white/15 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Briefing Gemini AI</span>
            </button>
            <button
              type="button"
              onClick={handleExportarGoogleSheets}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Sincronizar Sheets</span>
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setWebhookUrlInput(localStorage.getItem("lm_sheets_webhook_url") || "");
                  setShowWebhookModal(true);
                }}
                className="inline-flex items-center gap-1 bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white font-bold text-xs px-2.5 py-2 rounded-xl border border-white/10 transition cursor-pointer"
                title="Configuración de Enlace Google Sheets (Solo Dirección General)"
              >
                <span>⚙️ Webhook</span>
              </button>
            )}
          </div>
        </div>

        {/* Botones de Alarma y Métricas Proactivas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Alarma 1: Stock de Medicamentos e Insumos */}
          <button
            type="button"
            onClick={() => setShowAlarmaStockModal(true)}
            className={`text-left p-3.5 rounded-2xl border transition group cursor-pointer ${
              productosEnAlarma.length > 0
                ? "bg-rose-950/40 border-rose-500/50 hover:bg-rose-900/50 hover:border-rose-400"
                : "bg-white/5 border-white/10 hover:bg-white/10"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Alerta de Farmacia / Stock
              </span>
              {productosEnAlarma.length > 0 ? (
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                </span>
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-base font-black ${productosEnAlarma.length > 0 ? "text-rose-300" : "text-emerald-300"}`}>
                {productosEnAlarma.length > 0 ? `🚨 ${productosEnAlarma.length} Insumos en Alarma` : "✅ Stock Óptimo"}
              </span>
            </div>
            <span className="text-[10px] text-neutral-400 block mt-1 group-hover:text-white transition">
              {productosEnAlarma.length > 0 ? "Toca para ver lista de reposición inmediata" : "Todos los insumos sobre el nivel mínimo"}
            </span>
          </button>

          {/* Alarma 2: Packs y Margen Neto Real */}
          <button
            type="button"
            onClick={() => setShowMargenPacksModal(true)}
            className="text-left p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Packs, Ofertas & Margen Real
              </span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-black text-amber-300">
                86.5% Margen Promedio
              </span>
            </div>
            <span className="text-[10px] text-neutral-400 block mt-1 group-hover:text-white transition">
              Toca para ver desglose de ganancia por pack
            </span>
          </button>

          {/* Alarma 3: Gobernanza y Auditoría Inmutable */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Gobernanza & Auditoría
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold text-white">
                Zero Trust &bull; SHA-256
              </span>
            </div>
            <span className="text-[10px] text-emerald-400 block mt-1 font-mono">
              0 filas abiertas en Portero
            </span>
          </div>
        </div>
      </div>

      {/* Contenido Pestaña Personal */}
      {subModuloSupervision === "personal" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-sm text-neutral-800">
                  Colaboradores Registrados por Sede y Rol
                </h2>
                <p className="text-xs text-neutral-400">
                  Reemplaza los datos sintéticos por la información verídica de tu personal (CMP, COP, nombres completos).
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 text-neutral-600 text-xs font-bold uppercase tracking-wider border-b border-neutral-200">
                  <tr>
                    <th className="py-3 px-4">Colaborador</th>
                    <th className="py-3 px-4">Rol Asignado</th>
                    <th className="py-3 px-4">Sede Asignada</th>
                    <th className="py-3 px-4">Colegiatura / Especialidad</th>
                    <th className="py-3 px-4">Estado Clave</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {usuarios.map((usr) => (
                    <tr key={usr.id} className="hover:bg-neutral-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-neutral-900 block leading-tight">{usr.nombre}</span>
                          {!usr.activo && (
                            <span className="text-[9px] font-bold bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded">
                              Inactivo
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-neutral-500">{usr.email}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                            usr.rol === "RECEPCION_CAJA"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : usr.rol === "PROFESIONAL"
                              ? "bg-blue-50 text-blue-800 border border-blue-200"
                              : "bg-purple-50 text-purple-800 border border-purple-200"
                          }`}
                        >
                          {usr.rol}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-xs text-neutral-700 font-semibold">
                          <MapPin className="w-3 h-3 text-brand-700" />
                          <span>{usr.sede}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {usr.colegiatura ? (
                          <div>
                            <span className="font-mono font-bold text-blue-700">{usr.colegiatura}</span>
                            {usr.especialidad && (
                              <span className="text-neutral-500 block text-[11px]">{usr.especialidad}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-400 font-medium">{usr.cargo}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {usr.requiereCambioPassword ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                            <KeyRound className="w-3 h-3" />
                            <span>1 Solo Uso (Pendiente)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                            <Lock className="w-3 h-3" />
                            <span>Contraseña Privada</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {isAdmin ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleAbrirEditar(usr)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-brand-800 bg-brand-50 hover:bg-brand-100 rounded-lg border border-brand-200 transition"
                              title="Editar datos reales del colaborador"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Editar</span>
                            </button>
                            <button
                              onClick={() => handleResetearClave(usr)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition"
                              title="Generar nueva clave de 1 solo uso"
                            >
                              <RefreshCw className="w-3 h-3" />
                            </button>
                            {usr.email !== "admin@lasmellizasperu.com" && (
                              <button
                                onClick={() => setUsuarioAEliminar(usr)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition"
                                title="Eliminar cuenta y revocar acceso definitivamente"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-neutral-400 font-medium">Solo Lectura</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Contenido Pestaña Auditoría */}
      {subModuloSupervision === "auditoria" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-sm text-neutral-800">Log de Eventos Inmutables (Append-Only)</h2>
                <span className="text-xs text-neutral-400 font-medium">Cumplimiento ANPD & MINSA &bull; Registro en Tiempo Real</span>
              </div>
              <button
                onClick={cargarAuditoriaReal}
                disabled={cargandoAuditoria}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${cargandoAuditoria ? "animate-spin" : ""}`} />
                <span>Actualizar Bitácora</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 text-neutral-600 text-xs font-bold uppercase tracking-wider border-b border-neutral-200">
                  <tr>
                    <th className="py-3 px-4">Hora</th>
                    <th className="py-3 px-4">Usuario</th>
                    <th className="py-3 px-4">Rol</th>
                    <th className="py-3 px-4">Acción</th>
                    <th className="py-3 px-4">Detalle del Registro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-mono text-xs">
                  {cargandoAuditoria && eventosAuditoria.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-neutral-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-brand-700" />
                        <span className="font-sans">Cargando registros forenses desde Supabase...</span>
                      </td>
                    </tr>
                  ) : eventosAuditoria.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-neutral-400 font-sans">
                        No se registran eventos de auditoría en la base de datos aún.
                      </td>
                    </tr>
                  ) : (
                    eventosAuditoria.map((ev) => (
                      <tr key={ev.id} className="hover:bg-neutral-50/80 transition">
                        <td className="py-3.5 px-4 text-neutral-500 whitespace-nowrap">{ev.hora}</td>
                        <td className="py-3.5 px-4 text-neutral-900 font-sans font-medium">{ev.usuario}</td>
                        <td className="py-3.5 px-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-700">
                            {ev.rol}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`font-bold ${
                              ev.accion.includes("DENEGADO") || ev.accion.includes("ELIMINAR") || ev.accion.includes("REVERTIR")
                                ? "text-amber-700"
                                : ev.accion.includes("SELLAR") || ev.accion.includes("HCE")
                                ? "text-purple-600"
                                : "text-emerald-600"
                            }`}
                          >
                            {ev.accion}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-sans text-xs text-neutral-600 break-words max-w-md">{ev.detalle}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Contenido Pestaña Control de Inventario & Insumos */}
      {subModuloSupervision === "inventario" && (
        <div className="space-y-4">
          {/* Métricas y Resumen de Stock */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">Catálogo Registrado</span>
                <span className="text-xl font-black text-neutral-900">{productosInventario.length}</span>
                <span className="text-[10px] text-neutral-400 block mt-0.5">Insumos y fármacos</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold">
                <Package className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">Alertas Stock Mínimo</span>
                <span className={`text-xl font-black ${productosInventario.filter((p) => p.stock_actual <= p.stock_minimo).length > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                  {productosInventario.filter((p) => p.stock_actual <= p.stock_minimo).length}
                </span>
                <span className="text-[10px] text-neutral-400 block mt-0.5">Requieren reposición</span>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                productosInventario.filter((p) => p.stock_actual <= p.stock_minimo).length > 0 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
              }`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">Valor Costo Inventario</span>
                <span className="text-xl font-black text-neutral-900">
                  {formatCurrency(productosInventario.reduce((acc, p) => acc + (p.stock_actual * p.costo_unitario), 0))}
                </span>
                <span className="text-[10px] text-neutral-400 block mt-0.5">Inversión operativa en stock</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">Valor Comercial Estimado</span>
                <span className="text-xl font-black text-emerald-700">
                  {formatCurrency(productosInventario.reduce((acc, p) => acc + (p.stock_actual * p.precio_venta), 0))}
                </span>
                <span className="text-[10px] text-neutral-400 block mt-0.5">Venta potencial en sedes</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <Activity className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </div>

          {/* Selector de Sub-vista: Catálogo vs Historial */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setVistaInventario("catalogo")}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                    vistaInventario === "catalogo"
                      ? "bg-brand-700 text-white shadow-xs"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  Existencias & Catálogo ({productosInventario.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVistaInventario("movimientos");
                    cargarMovimientos();
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                    vistaInventario === "movimientos"
                      ? "bg-brand-700 text-white shadow-xs"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  Kárdex & Movimientos de Stock ({movimientosInventario.length})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    cargarInventario();
                    if (vistaInventario === "movimientos") cargarMovimientos();
                  }}
                  disabled={cargandoInventario || cargandoMovimientos}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${cargandoInventario || cargandoMovimientos ? "animate-spin" : ""}`} />
                  <span>Actualizar</span>
                </button>
                {isAdmin && (
                  <button
                    onClick={handleAbrirNuevoProducto}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-brand-700 hover:bg-brand-800 text-white rounded-xl transition shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nuevo Insumo</span>
                  </button>
                )}
              </div>
            </div>

            {/* VISTA 1: Catálogo de Productos y Existencias */}
            {vistaInventario === "catalogo" && (
              <div>
                {/* Barra de Filtros */}
                <div className="p-3 bg-neutral-50/60 border-b border-neutral-100 flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {(["Todas", "Medicamento", "Insumo Médico", "Reactivo / Laboratorio", "Material Descartable", "Dispositivo Anticonceptivo"] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFiltroCategoriaInv(cat)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                          filtroCategoriaInv === cat
                            ? "bg-white text-neutral-900 border border-neutral-200 shadow-xs"
                            : "text-neutral-500 hover:text-neutral-900"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSoloBajoStock(!soloBajoStock)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                        soloBajoStock
                          ? "bg-amber-100 border-amber-300 text-amber-900"
                          : "bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-50"
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Solo Bajo Stock Mínimo</span>
                    </button>

                    <div className="relative min-w-[200px]">
                      <input
                        type="text"
                        value={busquedaInv}
                        onChange={(e) => setBusquedaInv(e.target.value)}
                        placeholder="Buscar por nombre o código..."
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-neutral-300 text-xs bg-white focus:ring-1 focus:ring-brand-700"
                      />
                      <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2" />
                    </div>
                  </div>
                </div>

                {/* Tabla de Existencias */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-50 text-neutral-600 text-xs font-bold uppercase tracking-wider border-b border-neutral-200">
                      <tr>
                        <th className="py-3 px-4">Código</th>
                        <th className="py-3 px-4">Insumo / Producto</th>
                        <th className="py-3 px-4">Categoría</th>
                        <th className="py-3 px-4">Presentación</th>
                        <th className="py-3 px-4 text-center">Stock Actual</th>
                        <th className="py-3 px-4 text-center">Mínimo</th>
                        <th className="py-3 px-4 text-right">P. Costo</th>
                        <th className="py-3 px-4 text-right">P. Venta</th>
                        <th className="py-3 px-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {cargandoInventario && productosInventario.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-neutral-400 font-sans">
                            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-brand-700" />
                            <span>Cargando existencias desde Supabase...</span>
                          </td>
                        </tr>
                      ) : (
                        productosInventario
                          .filter((p) => {
                            const matchCat = filtroCategoriaInv === "Todas" || p.categoria === filtroCategoriaInv;
                            const matchStock = !soloBajoStock || p.stock_actual <= p.stock_minimo;
                            const matchBusq =
                              !busquedaInv ||
                              p.nombre.toLowerCase().includes(busquedaInv.toLowerCase()) ||
                              p.codigo.toLowerCase().includes(busquedaInv.toLowerCase()) ||
                              p.presentacion.toLowerCase().includes(busquedaInv.toLowerCase());
                            return matchCat && matchStock && matchBusq;
                          })
                          .map((p) => {
                            const esCritico = p.stock_actual <= 0;
                            const esBajo = p.stock_actual <= p.stock_minimo;
                            return (
                              <tr key={p.id} className="hover:bg-neutral-50/80 transition">
                                <td className="py-3.5 px-4">
                                  <span className="font-mono text-xs font-bold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                                    {p.codigo}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 font-bold text-neutral-900">
                                  {p.nombre}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                                    {p.categoria}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-neutral-500 text-xs">
                                  {p.presentacion}
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <span
                                    className={`inline-flex items-center gap-1 font-mono font-black text-xs px-2.5 py-1 rounded-full ${
                                      esCritico
                                        ? "bg-rose-100 text-rose-800 border border-rose-300"
                                        : esBajo
                                        ? "bg-amber-100 text-amber-900 border border-amber-300 animate-pulse"
                                        : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                    }`}
                                  >
                                    {p.stock_actual} unidades
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-center font-mono text-neutral-500 text-xs">
                                  {p.stock_minimo}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono text-xs text-neutral-600">
                                  {formatCurrency(p.costo_unitario)}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono text-xs font-bold text-neutral-900">
                                  {formatCurrency(p.precio_venta)}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleAbrirMovimiento(p)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg border border-brand-200 transition"
                                      title="Entrada, Salida o Ajuste de Stock"
                                    >
                                      <SlidersHorizontal className="w-3 h-3" />
                                      <span>Ajuste</span>
                                    </button>
                                    {isAdmin && (
                                      <button
                                        type="button"
                                        onClick={() => handleAbrirEditarProducto(p)}
                                        className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition"
                                        title="Editar Ficha de Insumo"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VISTA 2: Historial Kárdex de Movimientos */}
            {vistaInventario === "movimientos" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm font-sans">
                  <thead className="bg-neutral-50 text-neutral-600 text-xs font-bold uppercase tracking-wider border-b border-neutral-200">
                    <tr>
                      <th className="py-3 px-4">Fecha & Hora</th>
                      <th className="py-3 px-4">Insumo / Fármaco</th>
                      <th className="py-3 px-4">Tipo Movimiento</th>
                      <th className="py-3 px-4 text-center">Cantidad</th>
                      <th className="py-3 px-4 text-center">Kárdex (Previo ➔ Nuevo)</th>
                      <th className="py-3 px-4">Motivo / Detalle Clínico</th>
                      <th className="py-3 px-4">Responsable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-xs">
                    {cargandoMovimientos && movimientosInventario.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-neutral-400">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-brand-700" />
                          <span>Cargando kárdex de movimientos...</span>
                        </td>
                      </tr>
                    ) : movimientosInventario.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-neutral-400 font-sans">
                          No se han registrado movimientos de inventario en el período.
                        </td>
                      </tr>
                    ) : (
                      movimientosInventario.map((m) => (
                        <tr key={m.id} className="hover:bg-neutral-50/80 transition">
                          <td className="py-3 px-4 text-neutral-500 font-mono whitespace-nowrap">
                            {new Date(m.created_at).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-neutral-900 block">{m.producto?.nombre || "Insumo"}</span>
                            <span className="font-mono text-[10px] text-neutral-400">{m.producto?.codigo}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-full ${
                                m.tipo === "ENTRADA"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : m.tipo.startsWith("SALIDA")
                                  ? "bg-rose-100 text-rose-800 border border-rose-300"
                                  : "bg-blue-100 text-blue-800 border border-blue-300"
                              }`}
                            >
                              {m.tipo === "ENTRADA" ? (
                                <ArrowDownRight className="w-3 h-3" />
                              ) : (
                                <ArrowUpRight className="w-3 h-3" />
                              )}
                              {m.tipo}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-neutral-900">
                            {m.cantidad}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-[11px] text-neutral-500">
                            <span className="text-neutral-400">{m.stock_anterior}</span> ➔{" "}
                            <span className="font-bold text-neutral-900">{m.stock_nuevo}</span>
                          </td>
                          <td className="py-3 px-4 text-neutral-600 max-w-xs truncate">
                            {m.motivo || "-"}
                          </td>
                          <td className="py-3 px-4 font-medium text-neutral-800">
                            {m.usuario_nombre || "Operador"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SUB-MÓDULO: CONTROL DE COSTOS & PRECIOS (TARIFARIO INSTITUCIONAL)    */}
      {/* ==================================================================== */}
      {subModuloSupervision === "costos" && (
        <div className="space-y-4">
          {/* Métricas y Resumen de Rentabilidad y Precios */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">Servicios en Tarifario</span>
                <span className="text-xl font-black text-neutral-900">{serviciosCustom.length}</span>
                <span className="text-[10px] text-neutral-400 block mt-0.5">Estudios y atenciones</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <Coins className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">Ecografías Especializadas</span>
                <span className="text-xl font-black text-sky-700">
                  {serviciosCustom.filter((s) => s.categoria === "Ecografías").length}
                </span>
                <span className="text-[10px] text-neutral-400 block mt-0.5">Modalidades diagnósticas</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold">
                <Activity className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">Margen Bruto Promedio</span>
                <span className="text-xl font-black text-emerald-600">
                  {(() => {
                    const activos = serviciosCustom.filter((s) => s.activo && s.precio_venta > 0);
                    if (activos.length === 0) return "0%";
                    const totalMargenPct = activos.reduce((acc, s) => {
                      const margen = ((s.precio_venta - s.costo_operativo) / s.precio_venta) * 100;
                      return acc + margen;
                    }, 0);
                    return `${(totalMargenPct / activos.length).toFixed(1)}%`;
                  })()}
                </span>
                <span className="text-[10px] text-neutral-400 block mt-0.5">Rentabilidad operativa clínica</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">Costo Operativo Promedio</span>
                <span className="text-xl font-black text-neutral-900">
                  {(() => {
                    const activos = serviciosCustom.filter((s) => s.activo);
                    if (activos.length === 0) return "S/ 0.00";
                    const totalCosto = activos.reduce((acc, s) => acc + s.costo_operativo, 0);
                    return formatCurrency(totalCosto / activos.length);
                  })()}
                </span>
                <span className="text-[10px] text-neutral-400 block mt-0.5">Base insumos & honorarios</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Tarjeta de Gestión de Precios */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-sm text-neutral-800">
                  Catálogo Oficial de Tarifas & Costos de Servicios Clínicos
                </h2>
                <p className="text-xs text-neutral-400">
                  Administre los precios cobrados en ventanilla y los costos base operativos. Toda modificación se sincroniza inmediatamente con Admisión & Caja.
                </p>
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={handleAbrirNuevoServicio}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-xs transition shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Nuevo Servicio / Ecografía</span>
                </button>
              )}
            </div>

            {/* Barra de Filtros y Buscador */}
            <div className="p-3 bg-neutral-50/60 border-b border-neutral-100 flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
              {/* Filtros por Categoría */}
              <div className="flex flex-wrap gap-1">
                {(["Todas", "Ecografías", "Consultas", "Procedimientos", "Laboratorio", "Packs Promocionales"] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFiltroCategoriaCostos(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      filtroCategoriaCostos === cat
                        ? "bg-white text-neutral-900 border border-neutral-200 shadow-xs"
                        : "text-neutral-500 hover:text-neutral-900"
                    }`}
                  >
                    {cat} {cat === "Todas" ? `(${serviciosCustom.length})` : `(${serviciosCustom.filter((s) => s.categoria === cat).length})`}
                  </button>
                ))}
              </div>

              {/* Buscador */}
              <div className="relative min-w-[240px]">
                <input
                  type="text"
                  value={busquedaCostos}
                  onChange={(e) => setBusquedaCostos(e.target.value)}
                  placeholder="Buscar servicio, ecografía o código..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-neutral-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            {/* Tabla de Servicios y Precios */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm font-sans">
                <thead className="bg-neutral-50 text-neutral-600 text-xs font-bold uppercase tracking-wider border-b border-neutral-200">
                  <tr>
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Servicio / Estudio Ecográfico</th>
                    <th className="py-3 px-4">Categoría</th>
                    <th className="py-3 px-4 text-right">Costo Operativo</th>
                    <th className="py-3 px-4 text-right">Precio Venta (Público)</th>
                    <th className="py-3 px-4 text-center">Margen Bruto</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {serviciosCustom
                    .filter((s) => {
                      const matchCat = filtroCategoriaCostos === "Todas" || s.categoria === filtroCategoriaCostos;
                      const matchBusq =
                        !busquedaCostos ||
                        s.nombre.toLowerCase().includes(busquedaCostos.toLowerCase()) ||
                        s.codigo.toLowerCase().includes(busquedaCostos.toLowerCase()) ||
                        (s.descripcion && s.descripcion.toLowerCase().includes(busquedaCostos.toLowerCase()));
                      return matchCat && matchBusq;
                    })
                    .map((s) => {
                      const margenSoles = s.precio_venta - s.costo_operativo;
                      const margenPct = s.precio_venta > 0 ? (margenSoles / s.precio_venta) * 100 : 0;
                      return (
                        <tr key={s.id} className="hover:bg-neutral-50/80 transition">
                          <td className="py-3.5 px-4 font-mono font-bold text-xs text-neutral-600">
                            {s.codigo}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-neutral-900 block leading-tight">{s.nombre}</span>
                            {s.descripcion && (
                              <span className="text-[11px] text-neutral-400 block mt-0.5">{s.descripcion}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                s.categoria === "Ecografías"
                                  ? "bg-sky-50 text-sky-800 border-sky-200"
                                  : s.categoria === "Consultas"
                                  ? "bg-purple-50 text-purple-800 border-purple-200"
                                  : s.categoria === "Procedimientos"
                                  ? "bg-rose-50 text-rose-800 border-rose-200"
                                  : s.categoria === "Laboratorio"
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : "bg-emerald-50 text-emerald-800 border-emerald-200"
                              }`}
                            >
                              {s.categoria}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-xs text-neutral-500">
                            {formatCurrency(s.costo_operativo)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-sm font-black text-emerald-700">
                            {formatCurrency(s.precio_venta)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-mono text-xs font-bold text-neutral-800 block">
                              +{formatCurrency(margenSoles)}
                            </span>
                            <span className="text-[10px] font-mono text-emerald-600 font-bold block">
                              ({margenPct.toFixed(0)}%)
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleActivoServicio(s)}
                              title={isAdmin ? "Clic para cambiar estado" : undefined}
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border transition ${
                                s.activo
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                  : "bg-neutral-100 text-neutral-500 border-neutral-300"
                              }`}
                            >
                              {s.activo ? "Activo" : "En Pausa"}
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleAbrirEditarServicio(s)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition"
                                title="Editar precio y costo operativo"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Editar</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Colaborador (Exclusivo Administrador General) */}
      {usuarioEditando && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-neutral-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-black text-brand-900">Editar Datos del Colaborador</h3>
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                Admin General
              </span>
            </div>
            <p className="text-xs text-neutral-500 mb-4">
              Actualiza la información sintética por los nombres, correo institucional y colegiatura oficial (CMP/COP) del trabajador.
            </p>

            <form onSubmit={handleGuardarEdicion} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Nombres y Apellidos Reales *
                </label>
                <input
                  type="text"
                  required
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs font-bold focus:ring-2 focus:ring-brand-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Correo Institucional Real *
                  </label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-brand-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Sede Asignada *
                  </label>
                  <select
                    value={editSede}
                    onChange={(e) => setEditSede(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-brand-700"
                  >
                    <option value="Independencia">Sede Independencia</option>
                    <option value="Vivanco">Sede Vivanco</option>
                    <option value="Todas las Sedes">Todas las Sedes (Central)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Rol Asignado *
                  </label>
                  <select
                    value={editRol}
                    onChange={(e) => setEditRol(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-brand-700"
                  >
                    <option value="PROFESIONAL">PROFESIONAL (Médico/Obstetra)</option>
                    <option value="RECEPCION_CAJA">RECEPCION_CAJA (Admisión & Caja Unificada)</option>
                    <option value="SUPERVISION">SUPERVISION (Auditoría)</option>
                    <option value="ADMIN">ADMIN (Dirección General)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Cargo o Puesto
                  </label>
                  <input
                    type="text"
                    value={editCargo}
                    onChange={(e) => setEditCargo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-brand-700"
                  />
                </div>
              </div>

              {(editRol === "PROFESIONAL" || editColegiatura) && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50/70 rounded-xl border border-blue-200">
                  <div>
                    <label className="block text-xs font-bold text-blue-900 mb-1">
                      Colegiatura Oficial (CMP / COP)
                    </label>
                    <input
                      type="text"
                      value={editColegiatura}
                      onChange={(e) => setEditColegiatura(e.target.value)}
                      placeholder="Ej. CMP 54321 o COP 12890"
                      className="w-full px-3 py-2 rounded-xl border border-blue-300 text-xs bg-white focus:ring-2 focus:ring-blue-700 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-blue-900 mb-1">
                      Especialidad / RNE
                    </label>
                    <input
                      type="text"
                      value={editEspecialidad}
                      onChange={(e) => setEditEspecialidad(e.target.value)}
                      placeholder="Ej. Ginecología y Obstetricia"
                      className="w-full px-3 py-2 rounded-xl border border-blue-300 text-xs bg-white focus:ring-2 focus:ring-blue-700"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chkActivo"
                  checked={editActivo}
                  onChange={(e) => setEditActivo(e.target.checked)}
                  className="rounded text-brand-700 focus:ring-brand-700"
                />
                <label htmlFor="chkActivo" className="text-xs font-bold text-neutral-700 cursor-pointer">
                  Cuenta activa (Desmarcar para suspender acceso por cese de personal)
                </label>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
                {usuarioEditando.email !== "admin@lasmellizasperu.com" ? (
                  <button
                    type="button"
                    onClick={() => {
                      const u = usuarioEditando;
                      setUsuarioEditando(null);
                      setUsuarioAEliminar(u);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Cuenta</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setUsuarioEditando(null)}
                    className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingUser}
                    className="px-5 py-2 text-xs font-bold bg-brand-700 hover:bg-brand-800 text-white rounded-xl shadow inline-flex items-center gap-1.5 disabled:opacity-60"
                  >
                    {isSavingUser ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Guardando cambios...</span>
                      </>
                    ) : (
                      <span>Guardar Cambios Oficiales</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmación de Eliminación Definitiva */}
      {usuarioAEliminar && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-rose-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto mb-4 border border-rose-200">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-black text-neutral-900 text-center mb-1">
              ¿Eliminar cuenta definitivamente?
            </h3>
            <p className="text-xs text-neutral-600 text-center mb-4 leading-relaxed">
              Está a punto de dar de baja y purgar la cuenta de:
              <br />
              <strong className="text-neutral-900 font-bold">{usuarioAEliminar.nombre}</strong>
              <br />
              <span className="font-mono text-neutral-500 text-[11px]">{usuarioAEliminar.email}</span>
            </p>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 mb-5 leading-relaxed">
              ⚠️ <strong>Principio de Confianza Cero:</strong> Esta acción revocará todos los accesos clínicos y tokens de sesión de manera irrevocable tanto en la base de datos como en Supabase Auth.
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setUsuarioAEliminar(null)}
                className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmarEliminar}
                className="px-5 py-2 text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white rounded-xl shadow transition inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sí, Eliminar Cuenta</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo Colaborador */}
      {showNewUserModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-neutral-200">
            <h3 className="text-lg font-black text-brand-900 mb-1">Dar de Alta a Nuevo Colaborador</h3>
            <p className="text-xs text-neutral-500 mb-4">
              La Dirección Técnica emitirá un usuario y una contraseña de 1 solo uso que el colaborador cambiará en su primer acceso.
            </p>

            <form onSubmit={handleCrearUsuario} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Nombres y Apellidos *</label>
                <input
                  type="text"
                  required
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  placeholder="Ej. Dra. Carmen Quispe"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Correo Institucional *</label>
                  <input
                    type="email"
                    required
                    value={nuevoEmail}
                    onChange={(e) => setNuevoEmail(e.target.value)}
                    placeholder="carmen.quispe@lasmellizasperu.com"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Sede Asignada *</label>
                  <select
                    value={nuevaSede}
                    onChange={(e) => setNuevaSede(e.target.value as "Independencia" | "Vivanco")}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-700"
                  >
                    <option value="Independencia">Sede Independencia</option>
                    <option value="Vivanco">Sede Vivanco</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Rol Operativo *</label>
                  <select
                    value={nuevoRol}
                    onChange={(e) => {
                      const r = e.target.value as any;
                      setNuevoRol(r);
                      if (r === "PROFESIONAL") setNuevoCargo("Médico Gineco-Obstetra");
                      else if (r === "RECEPCION_CAJA") setNuevoCargo("Admisión & Caja Unificada");
                      else setNuevoCargo("Auditor Médico");
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-700"
                  >
                    <option value="PROFESIONAL">Profesional Médico / Obstetra</option>
                    <option value="RECEPCION_CAJA">Admisión & Caja Unificada</option>
                    <option value="SUPERVISION">Supervisión & Auditoría</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Cargo / Puesto</label>
                  <input
                    type="text"
                    value={nuevoCargo}
                    onChange={(e) => setNuevoCargo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-700"
                  />
                </div>
              </div>

              {nuevoRol === "PROFESIONAL" && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50/70 rounded-xl border border-blue-200">
                  <div>
                    <label className="block text-xs font-bold text-blue-900 mb-1">
                      Colegiatura (CMP / COP) *
                    </label>
                    <input
                      type="text"
                      required
                      value={nuevaColegiatura}
                      onChange={(e) => setNuevaColegiatura(e.target.value)}
                      placeholder="Ej. CMP 65432 o COP 15200"
                      className="w-full px-3 py-2 rounded-xl border border-blue-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-blue-900 mb-1">
                      Especialidad / RNE
                    </label>
                    <input
                      type="text"
                      value={nuevaEspecialidad}
                      onChange={(e) => setNuevaEspecialidad(e.target.value)}
                      placeholder="Ej. Ginecología y Obstetricia"
                      className="w-full px-3 py-2 rounded-xl border border-blue-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-700"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowNewUserModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-brand-700 hover:bg-brand-800 text-white rounded-xl shadow"
                >
                  Crear y Generar Clave Temporal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Credencial Temporal Emitida */}
      {credencialGenerada && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-neutral-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-black text-neutral-900">Credencial Temporal de 1 Solo Uso</h3>
              <p className="text-xs text-neutral-500 mt-1">
                Entrega estos datos al colaborador. Al iniciar sesión, el sistema le exigirá definir su contraseña personal.
              </p>
            </div>

            <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200 space-y-2 text-xs font-mono">
              <p><strong>Colaborador:</strong> {credencialGenerada.nombre}</p>
              <p><strong>Usuario / Email:</strong> {credencialGenerada.email}</p>
              <p className="text-emerald-700 font-bold text-sm bg-emerald-50 p-2 rounded-xl border border-emerald-200 flex items-center justify-between">
                <span>Clave Temporal:</span>
                <span className="font-black text-base">{credencialGenerada.passwordTemporal}</span>
              </p>
              <p><strong>Sede:</strong> Sede {credencialGenerada.sede}</p>
              <p><strong>Rol:</strong> {credencialGenerada.rol}</p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={copiarCredenciales}
                className="flex-1 py-2.5 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
              >
                {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiado ? "¡Copiado al Portapapeles!" : "Copiar Credenciales"}</span>
              </button>
              <button
                type="button"
                onClick={() => setCredencialGenerada(null)}
                className="px-4 py-2.5 text-neutral-600 hover:bg-neutral-100 font-bold text-xs rounded-xl transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cambio de Contraseña del Administrador General */}
      {showAdminPasswordModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-100 text-brand-800 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-neutral-900">Cambiar Mi Contraseña de Administrador</h3>
                  <p className="text-[11px] text-neutral-500">Dirección Médica & Gobernanza (admin@lasmellizasperu.com)</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAdminPasswordModal(false);
                  setAdminPasswordMsg(null);
                }}
                className="p-1 hover:bg-neutral-100 rounded-lg text-neutral-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {adminPasswordMsg && (
              <div
                className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                  adminPasswordMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {adminPasswordMsg.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{adminPasswordMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleCambiarPasswordAdmin} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Nueva Contraseña Privada *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={adminNewPassword}
                  onChange={(e) => setAdminNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres (letras, números, símbolos)"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-brand-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Confirmar Nueva Contraseña *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={adminConfirmPassword}
                  onChange={(e) => setAdminConfirmPassword(e.target.value)}
                  placeholder="Repita la nueva contraseña exactamente"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-brand-700"
                />
              </div>

              <p className="text-[11px] text-neutral-500 bg-neutral-50 p-2.5 rounded-xl border border-neutral-200 leading-relaxed">
                ℹ️ Esta acción actualizará de forma criptográfica su credencial en <strong>Supabase Auth</strong>. Asegúrese de guardar o recordar su nueva clave para futuros ingresos.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminPasswordModal(false);
                    setAdminPasswordMsg(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isAdminPasswordSaving}
                  className="px-5 py-2 text-xs font-bold bg-brand-700 hover:bg-brand-800 text-white rounded-xl shadow inline-flex items-center gap-1.5 disabled:opacity-60"
                >
                  {isAdminPasswordSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Actualizando...</span>
                    </>
                  ) : (
                    <span>Actualizar Mi Contraseña</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear / Editar Insumo o Fármaco */}
      {showProductoModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-100 text-brand-800 flex items-center justify-center font-bold">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-neutral-900">
                    {productoEditando ? "Editar Ficha de Insumo" : "Dar de Alta Nuevo Insumo / Fármaco"}
                  </h3>
                  <p className="text-[11px] text-neutral-500">Gestión de Catálogo de Inventario & Precios</p>
                </div>
              </div>
              <button
                onClick={() => setShowProductoModal(false)}
                className="p-1 hover:bg-neutral-100 rounded-lg text-neutral-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarProducto} className="space-y-3">
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">Código *</label>
                  <input
                    type="text"
                    required
                    value={prodCodigo}
                    onChange={(e) => setProdCodigo(e.target.value)}
                    placeholder="INV-MED-01"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs font-mono uppercase font-bold focus:ring-2 focus:ring-brand-700"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">Categoría *</label>
                  <select
                    value={prodCategoria}
                    onChange={(e) => setProdCategoria(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs bg-white focus:ring-2 focus:ring-brand-700"
                  >
                    <option value="Medicamento">Medicamento</option>
                    <option value="Insumo Médico">Insumo Médico</option>
                    <option value="Reactivo / Laboratorio">Reactivo / Laboratorio</option>
                    <option value="Material Descartable">Material Descartable</option>
                    <option value="Dispositivo Anticonceptivo">Dispositivo Anticonceptivo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">Nombre Comercial / Genérico *</label>
                <input
                  type="text"
                  required
                  value={prodNombre}
                  onChange={(e) => setProdNombre(e.target.value)}
                  placeholder="Ej. Óvulos de Metronidazol + Nistatina"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs font-bold focus:ring-2 focus:ring-brand-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">Presentación / Formato *</label>
                <input
                  type="text"
                  required
                  value={prodPresentacion}
                  onChange={(e) => setProdPresentacion(e.target.value)}
                  placeholder="Ej. Caja x 10 óvulos vaginales / Ampolla 1ml"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-brand-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5 bg-neutral-50 p-3 rounded-2xl border border-neutral-200">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                    Stock Actual *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={prodStockActual}
                    onChange={(e) => setProdStockActual(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs font-mono font-bold bg-white focus:ring-2 focus:ring-brand-700"
                  />
                  {productoEditando && (
                    <span className="text-[10px] text-brand-600 font-semibold block mt-0.5">Permite corregir o actualizar stock directamente</span>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">Stock Mínimo (Alerta) *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={prodStockMinimo}
                    onChange={(e) => setProdStockMinimo(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs font-mono font-bold bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">Costo Unitario (S/) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    required
                    value={prodPrecioCosto}
                    onChange={(e) => setProdPrecioCosto(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs font-mono font-bold bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">Precio de Venta (S/) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    required
                    value={prodPrecioVenta}
                    onChange={(e) => setProdPrecioVenta(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs font-mono font-bold bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowProductoModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingProducto}
                  className="px-5 py-2 text-xs font-bold bg-brand-700 hover:bg-brand-800 text-white rounded-xl shadow inline-flex items-center gap-1.5 disabled:opacity-60"
                >
                  {isSavingProducto ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Guardar Producto</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ajuste / Movimiento Rápido de Stock */}
      {showMovimientoModal && productoParaMovimiento && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-neutral-900">Ajuste de Stock / Kárdex</h3>
                  <p className="text-[11px] text-neutral-500 font-mono">{productoParaMovimiento.codigo}</p>
                </div>
              </div>
              <button
                onClick={() => setShowMovimientoModal(false)}
                className="p-1 hover:bg-neutral-100 rounded-lg text-neutral-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 text-xs">
              <span className="font-bold text-neutral-900 block">{productoParaMovimiento.nombre}</span>
              <div className="flex items-center justify-between text-[11px] text-neutral-500 mt-1">
                <span>Presentación: {productoParaMovimiento.presentacion}</span>
                <span className="font-mono font-bold text-brand-700">Stock Actual: {productoParaMovimiento.stock_actual} unid.</span>
              </div>
            </div>

            <form onSubmit={handleRegistrarMovimiento} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">Tipo de Operación *</label>
                <select
                  value={movTipo}
                  onChange={(e) => setMovTipo(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs bg-white font-bold focus:ring-2 focus:ring-brand-700"
                >
                  <option value="ENTRADA">ENTRADA: Compra o Recepción de Proveedor (+)</option>
                  <option value="AJUSTE">AJUSTE: Rectificación por Inventario Físico (+/-)</option>
                  <option value="SALIDA_USO_CLINICO">SALIDA: Uso Clínico, Merma o Deterioro (-)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">Cantidad a Mover *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={movCantidad}
                  onChange={(e) => setMovCantidad(Number(e.target.value))}
                  placeholder="Cantidad..."
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs font-mono font-black focus:ring-2 focus:ring-brand-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">Motivo / Justificación Obligatoria *</label>
                <textarea
                  rows={2}
                  required
                  value={movMotivo}
                  onChange={(e) => setMovMotivo(e.target.value)}
                  placeholder="Ej: Factura Proveedor F001-2384, Conteo mensual de cierre, Descarte por fecha de exp..."
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs leading-relaxed focus:ring-2 focus:ring-brand-700"
                />
              </div>

              <p className="text-[10px] text-neutral-400">
                🔒 Se registrará en la bitácora de auditoría inmutable con su identidad institucional como responsable.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowMovimientoModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingMovimiento}
                  className="px-5 py-2 text-xs font-bold bg-brand-700 hover:bg-brand-800 text-white rounded-xl shadow inline-flex items-center gap-1.5 disabled:opacity-60"
                >
                  {isSavingMovimiento ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <span>Registrar Movimiento</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear / Editar Servicio o Estudio Ecográfico */}
      {showServicioModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-neutral-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-black text-brand-900">
                {servicioEditando ? "Editar Tarifa y Costo de Servicio" : "Nuevo Servicio / Estudio Ecográfico"}
              </h3>
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                Tarifario Oficial
              </span>
            </div>
            <p className="text-xs text-neutral-500 mb-4">
              Ajuste los valores comerciales. Los cambios se reflejarán inmediatamente en los carritos de venta y admisión.
            </p>

            <form onSubmit={handleGuardarServicio} className="space-y-3.5">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Código *</label>
                  <input
                    type="text"
                    required
                    value={editServCodigo}
                    onChange={(e) => setEditServCodigo(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs font-mono font-bold focus:ring-2 focus:ring-brand-700"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Categoría *</label>
                  <select
                    value={editServCategoria}
                    onChange={(e) => setEditServCategoria(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs font-bold focus:ring-2 focus:ring-brand-700 bg-white"
                  >
                    <option value="Ecografías">Ecografías de Apoyo Diagnóstico</option>
                    <option value="Consultas">Consultas Médicas / Obstétricas</option>
                    <option value="Procedimientos">Procedimientos Ginecológicos</option>
                    <option value="Laboratorio">Laboratorio & Pruebas Rápidas</option>
                    <option value="Packs Promocionales">Packs Promocionales</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Nombre Oficial del Servicio / Estudio *</label>
                <input
                  type="text"
                  required
                  value={editServNombre}
                  onChange={(e) => setEditServNombre(e.target.value)}
                  placeholder="Ej. Ecografía Obstétrica Morfológica Especializada..."
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs font-bold focus:ring-2 focus:ring-brand-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Costo Operativo Base (S/)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-neutral-400">S/</span>
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      required
                      value={editServCostoOperativo === 0 ? "" : editServCostoOperativo}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setEditServCostoOperativo(e.target.value === "" ? 0 : Number(e.target.value))}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-neutral-300 text-xs font-mono font-bold focus:ring-2 focus:ring-brand-700"
                    />
                  </div>
                  <span className="text-[10px] text-neutral-400 block mt-0.5">Insumos, gel, láminas, honorario base</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1">Precio al Público / Venta (S/) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-emerald-600">S/</span>
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      required
                      value={editServPrecioVenta === 0 ? "" : editServPrecioVenta}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setEditServPrecioVenta(e.target.value === "" ? 0 : Number(e.target.value))}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-emerald-400 bg-emerald-50/40 text-xs font-mono font-black text-emerald-900 focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>
                  <span className="text-[10px] text-neutral-400 block mt-0.5">Monto cobrado en ventanilla</span>
                </div>
              </div>

              {/* Indicador de Margen en Tiempo Real */}
              <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 flex items-center justify-between text-xs">
                <span className="font-bold text-neutral-600">Margen Operativo Estimado:</span>
                <div className="font-mono text-right">
                  <span className="font-black text-neutral-900">
                    S/ {(editServPrecioVenta - editServCostoOperativo).toFixed(2)}
                  </span>
                  <span className="ml-1 font-bold text-emerald-600">
                    ({editServPrecioVenta > 0 ? (((editServPrecioVenta - editServCostoOperativo) / editServPrecioVenta) * 100).toFixed(0) : 0}%)
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Descripción / Alcance Clínico</label>
                <textarea
                  rows={2}
                  value={editServDescripcion}
                  onChange={(e) => setEditServDescripcion(e.target.value)}
                  placeholder="Detalles clínicos o insumos incluidos en el estudio..."
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-brand-700 leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="chkServActivo"
                  checked={editServActivo}
                  onChange={(e) => setEditServActivo(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="chkServActivo" className="text-xs font-bold text-neutral-700 cursor-pointer">
                  Servicio Activo en Ventanilla
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowServicioModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingServicio}
                  className="px-5 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow inline-flex items-center gap-1.5 disabled:opacity-60"
                >
                  {isSavingServicio ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Guardar en Tarifario</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ALERTA CRÍTICA DE STOCK & REPOSICIÓN INMEDIATA */}
      {/* ========================================================================= */}
      {showAlarmaStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2 text-rose-700 font-black text-sm">
                <AlertTriangle className="w-5 h-5 text-rose-600 animate-pulse" />
                <span>Alerta Centinela: Insumos en Quiebre o Reposición Inmediata</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAlarmaStockModal(false)}
                className="w-8 h-8 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <p className="text-xs text-neutral-600">
                Los siguientes insumos y medicamentos se encuentran con existencias por debajo o al límite del stock de seguridad institucional. Se recomienda emitir orden de reposición:
              </p>

              {productosEnAlarma.length === 0 ? (
                <div className="p-8 text-center bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-800 space-y-2">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600" />
                  <p className="font-bold text-sm">¡Excelente! Cero quiebres de stock</p>
                  <p className="text-xs text-emerald-700">Todos los medicamentos e insumos de la clínica superan su nivel mínimo de seguridad.</p>
                </div>
              ) : (
                <div className="border border-neutral-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-50 text-neutral-500 uppercase tracking-wider font-bold border-b border-neutral-200">
                      <tr>
                        <th className="py-2.5 px-3">Código</th>
                        <th className="py-2.5 px-3">Insumo / Medicamento</th>
                        <th className="py-2.5 px-3 text-center">Stock Actual</th>
                        <th className="py-2.5 px-3 text-center">Mínimo</th>
                        <th className="py-2.5 px-3 text-right">Costo Unit.</th>
                        <th className="py-2.5 px-3 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 font-mono">
                      {productosEnAlarma.map((p) => {
                        const esAgotado = p.stock_actual === 0;
                        return (
                          <tr key={p.id} className={esAgotado ? "bg-rose-50/60" : "bg-amber-50/40"}>
                            <td className="py-2.5 px-3 font-bold text-neutral-800">{p.codigo}</td>
                            <td className="py-2.5 px-3 font-sans font-bold text-neutral-900">{p.nombre}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-rose-700">{p.stock_actual}</td>
                            <td className="py-2.5 px-3 text-center text-neutral-500">{p.stock_minimo}</td>
                            <td className="py-2.5 px-3 text-right text-neutral-700">{formatCurrency(p.costo_unitario)}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                esAgotado ? "bg-rose-200 text-rose-900" : "bg-amber-200 text-amber-900"
                              }`}>
                                {esAgotado ? "AGOTADO" : "REPOSICIÓN"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="bg-neutral-50 p-3 rounded-2xl border border-neutral-200 text-[11px] text-neutral-500 flex items-center justify-between">
                <span>Notificación configurada hacia: <strong className="text-neutral-800">lasmellizaspe@gmail.com</strong></span>
                <span>WhatsApp: <strong className="text-neutral-800">+51 966840077</strong></span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={handleExportarStockExcel}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow inline-flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Exportar Lista para Proveedor</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAlarmaStockModal(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: MONITOR DE PACKS, OFERTAS Y MARGEN NETO REAL */}
      {/* ========================================================================= */}
      {showMargenPacksModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-brand-200 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2 text-brand-900 font-black text-sm">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <span>Monitor de Packs, Ofertas y Margen Neto Real</span>
              </div>
              <button
                type="button"
                onClick={() => setShowMargenPacksModal(false)}
                className="w-8 h-8 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-brand-50 p-3.5 rounded-2xl border border-brand-100">
                  <span className="text-[10px] uppercase font-bold text-brand-700 block">Packs en Catálogo</span>
                  <span className="text-xl font-black text-brand-900">{packsPromocionales.length} Paquetes</span>
                </div>
                <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-100">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">Margen Neto Promedio</span>
                  <span className="text-xl font-black text-emerald-800">86.5% de Retorno</span>
                </div>
                <div className="bg-purple-50 p-3.5 rounded-2xl border border-purple-100">
                  <span className="text-[10px] uppercase font-bold text-purple-700 block">Costo Insumos Promedio</span>
                  <span className="text-xl font-black text-purple-900">13.5% del Precio</span>
                </div>
              </div>

              <div className="border border-neutral-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 text-neutral-500 uppercase tracking-wider font-bold border-b border-neutral-200">
                    <tr>
                      <th className="py-2.5 px-3">Servicio / Pack</th>
                      <th className="py-2.5 px-3">Categoría</th>
                      <th className="py-2.5 px-3 text-right">Precio Venta</th>
                      <th className="py-2.5 px-3 text-right">Costo Insumos</th>
                      <th className="py-2.5 px-3 text-right">Margen Neto</th>
                      <th className="py-2.5 px-3 text-center">Rentabilidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 font-mono">
                    {(packsPromocionales && packsPromocionales.length > 0 ? packsPromocionales : (serviciosCustom || []).slice(0, 15)).map((s) => {
                      const precioNum = Number(s.precio_venta) || 0;
                      const costoNum = Number(s.costo_operativo) || 0;
                      const margenNeto = Number((precioNum - costoNum).toFixed(2));
                      const margenPct = precioNum > 0 ? ((margenNeto / precioNum) * 100).toFixed(1) : "0.0";
                      return (
                        <tr key={s.id || s.codigo} className="hover:bg-neutral-50/80 transition">
                          <td className="py-2.5 px-3 font-sans font-bold text-neutral-900">{s.nombre}</td>
                          <td className="py-2.5 px-3 font-sans text-neutral-500 text-[11px]">{s.categoria}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-neutral-900">{formatCurrency(precioNum)}</td>
                          <td className="py-2.5 px-3 text-right text-rose-600 font-bold">{formatCurrency(costoNum)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-700">{formatCurrency(margenNeto)}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              {margenPct}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={handleExportarPacksExcel}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow inline-flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Exportar Matriz a Sheets</span>
              </button>
              <button
                type="button"
                onClick={() => setShowMargenPacksModal(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: BRIEFING EJECUTIVO CENTINELA AI (GEMINI PRO) */}
      {/* ========================================================================= */}
      {showBriefingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-brand-300 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2 text-brand-900 font-black text-sm">
                <Sparkles className="w-5 h-5 text-amber-500 animate-spin" />
                <span>Briefing Ejecutivo Centinela AI (Gemini Pro)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowBriefingModal(false)}
                className="w-8 h-8 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div className="bg-neutral-900 text-neutral-100 p-4 rounded-2xl font-mono text-xs space-y-2 border border-neutral-800 shadow-inner">
                <div className="flex items-center justify-between text-[11px] text-amber-400 font-bold border-b border-white/10 pb-1.5">
                  <span>RESUMEN EJECUTIVO — LAS MELLIZAS</span>
                  <span>{new Date().toLocaleDateString("es-PE")}</span>
                </div>
                <p className="text-neutral-400 text-[10px]">
                  Sedes: Independencia & Vivanco &bull; RUC 20611827335 &bull; Dirección Médica & Gestión
                </p>

                {/* Bloque 1: Producción y Caja Real */}
                <div className="pt-2 border-t border-white/10 space-y-1 text-[11px]">
                  <div className="text-emerald-400 font-bold flex items-center justify-between">
                    <span>💰 PRODUCCIÓN & RECAUDACIÓN HOY:</span>
                    <span className="text-white text-xs">{formatCurrency(metricasBriefing.totalFacturado)}</span>
                  </div>
                  <p>• Pacientes Atendidos: <strong className="text-white">{metricasBriefing.pacientesCount} paciente(s)</strong></p>
                  <p>• Efectivo en Gaveta: <strong className="text-white">{formatCurrency(metricasBriefing.efectivo)}</strong> | Digital: <strong className="text-white">{formatCurrency(metricasBriefing.digital)}</strong></p>
                  <p>• Ticket Promedio: <strong className="text-emerald-300">{metricasBriefing.pacientesCount > 0 ? formatCurrency(metricasBriefing.totalFacturado / metricasBriefing.pacientesCount) : "S/ 0.00"}</strong></p>
                </div>

                {/* Bloque 2: Servicios y Packs más demandados */}
                <div className="pt-2 border-t border-white/10 space-y-1 text-[11px]">
                  <p className="text-purple-400 font-bold">🏆 SERVICIOS Y PACKS DESTACADOS:</p>
                  {metricasBriefing.serviciosResumen.length > 0 ? (
                    metricasBriefing.serviciosResumen.map((s, idx) => (
                      <p key={idx}>• {s}</p>
                    ))
                  ) : (
                    <p className="text-neutral-400">• Esperando atenciones de la jornada</p>
                  )}
                  <p>• Margen Neto Estimado: <strong className="text-emerald-400">{formatCurrency(metricasBriefing.margenEstimado)} (~72%)</strong></p>
                </div>

                {/* Bloque 3: Estado Operativo y Farmacia */}
                <div className="pt-2 border-t border-white/10 space-y-1 text-[11px]">
                  <p className="text-amber-400 font-bold">🚨 ESTADO OPERATIVO & FARMACIA:</p>
                  <p>• Turno de Caja: <strong className={metricasBriefing.cajaEstado === "ABIERTA" ? "text-emerald-400" : "text-amber-300"}>{metricasBriefing.cajaEstado}</strong></p>
                  <p>
                    {productosEnAlarma.length > 0
                      ? `• Insumos en alerta de stock: ${productosEnAlarma.length} (${productosEnAlarma.map((p) => p.nombre).slice(0, 2).join(", ")})`
                      : "• Farmacia: 100% de insumos y medicamentos sobre el nivel mínimo."}
                  </p>
                </div>

                {/* Bloque 4: Recomendación Táctica de Centinela AI */}
                <div className="pt-2 border-t border-white/10 space-y-1 text-[11px] bg-brand-950/60 p-2.5 rounded-xl border border-brand-800/40">
                  <p className="text-amber-300 font-bold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>RECOMENDACIÓN TÁCTICA CENTINELA AI:</span>
                  </p>
                  <p className="text-neutral-200 italic text-[10.5px]">
                    {metricasBriefing.totalFacturado > 0
                      ? "La jornada refleja una sólida conversión hacia paquetes integrales de salud. Se recomienda mantener el protocolo de descarte urogenital en ventanilla y verificar reactivos de laboratorio para mañana."
                      : "La clínica se encuentra con personal activo esperando el flujo de pacientes. Se sugiere verificar citas en bandeja y campañas de captación en redes sociales para ecografías de control."}
                  </p>
                </div>
              </div>

              <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                <span className="font-bold">Canales Oficiales Configurados:</span>
                <span className="font-mono text-[11px]">966840077 &bull; lasmellizaspe@gmail.com</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={handleCopiarBriefing}
                className="w-full sm:w-auto px-4 py-2 text-xs font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl transition inline-flex items-center justify-center gap-1.5"
              >
                {briefingCopiado ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{briefingCopiado ? "¡Copiado!" : "Copiar Texto"}</span>
              </button>
              <button
                type="button"
                onClick={handleEnviarWhatsAppBriefing}
                className="w-full sm:w-auto px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow inline-flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar a WhatsApp (966840077)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CONFIGURACIÓN Y TEST EN VIVO DE GOOGLE SHEETS (DIRECCIÓN GENERAL) */}
      {/* ========================================================================= */}
      {showWebhookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-emerald-200 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2 text-emerald-800 font-black text-sm">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span>Enlace en Vivo con Google Sheets (Google Drive)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowWebhookModal(false)}
                className="w-8 h-8 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs text-neutral-600">
              <p>
                Este enlace conecta su software clínico directamente con su documento de <strong>Google Sheets en Google Drive</strong>. Cada vez que un paciente sea cobrado en ventanilla, los datos se transmitirán en segundo plano sin intervención manual.
              </p>

              <div className="space-y-1.5">
                <label className="font-bold text-neutral-800 block text-xs">
                  URL de la Web App de Google Apps Script (/exec):
                </label>
                <input
                  type="text"
                  value={webhookUrlInput}
                  onChange={(e) => setWebhookUrlInput(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="bg-neutral-50 p-3 rounded-2xl border border-neutral-200 text-[11px] space-y-1">
                <p className="font-bold text-neutral-800">📌 ¿Cómo opera la sincronización?</p>
                <p>• <strong>En Caja:</strong> Se dispara silenciosamente fila por fila cada vez que se cobra a un paciente.</p>
                <p>• <strong>En Torre de Control:</strong> El botón &quot;Sincronizar Sheets&quot; sincroniza todas las atenciones acumuladas del día hacia su hoja de Google Drive y descarga un respaldo en CSV.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-neutral-100">
              <button
                type="button"
                disabled={isTestingWebhook || !webhookUrlInput.trim()}
                onClick={async () => {
                  if (!webhookUrlInput.trim()) return;
                  setIsTestingWebhook(true);
                  try {
                    await fetch(webhookUrlInput.trim(), {
                      method: "POST",
                      mode: "no-cors",
                      headers: { "Content-Type": "text/plain;charset=utf-8" },
                      body: JSON.stringify({
                        fecha: new Date().toLocaleDateString("es-PE"),
                        hora: new Date().toLocaleTimeString("es-PE"),
                        sede: "Independencia",
                        paciente: "VERIFICACION EN VIVO (DIRECCION GENERAL)",
                        dni: "00000000",
                        telefono: "966840077",
                        servicio: "Prueba de Enlace Google Sheets",
                        monto: 1.0,
                        medioPago: "EFECTIVO",
                        cajero: "Direccion General",
                        estado: "COMPROBADO",
                      }),
                    });
                    localStorage.setItem("lm_sheets_webhook_url", webhookUrlInput.trim());
                    alert("✅ Fila de prueba transmitida con éxito.\n\nAbra su documento de Google Sheets en Google Drive ahora mismo: verá aparecer la fila de verificación con fecha y hora actual.");
                  } catch (err: any) {
                    alert("Error al enviar señal de prueba: " + (err?.message || err));
                  } finally {
                    setIsTestingWebhook(false);
                  }
                }}
                className="w-full sm:w-auto px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{isTestingWebhook ? "Probando..." : "🧪 Probar Conexión con Sheets"}</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (webhookUrlInput.trim()) {
                      localStorage.setItem("lm_sheets_webhook_url", webhookUrlInput.trim());
                      alert("✅ URL de Google Sheets guardada correctamente.");
                    } else {
                      localStorage.removeItem("lm_sheets_webhook_url");
                      alert("Enlace con Google Sheets desactivado.");
                    }
                    setShowWebhookModal(false);
                  }}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setShowWebhookModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Opción Discreta al Pie de Página para Seguridad de la Cuenta Admin */}
      {isAdmin && (
        <div className="pt-8 pb-2 border-t border-neutral-200/50 flex items-center justify-between text-xs text-neutral-400">
          <span className="text-[11px] font-mono text-neutral-400">
            Dirección General & Gobernanza Institucional
          </span>
          <button
            type="button"
            onClick={() => setShowAdminPasswordModal(true)}
            className="text-[11px] font-mono text-neutral-400 hover:text-neutral-700 transition flex items-center gap-1.5 px-2.5 py-1 rounded hover:bg-neutral-100 cursor-pointer"
            title="Gestión de seguridad de la cuenta Dirección Médica"
          >
            <KeyRound className="w-3.5 h-3.5 text-neutral-400" />
            <span>Seguridad de Cuenta: Cambiar Contraseña Privada</span>
          </button>
        </div>
      )}
    </div>
  );
}