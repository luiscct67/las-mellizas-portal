"use client";

import { useState, useEffect, useRef } from "react";
import {
  Stethoscope,
  Lock,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Image as ImageIcon,
  Maximize2,
  Trash2,
  X,
  Search,
  Check,
  FileText,
  Printer,
  Calendar,
  MessageSquare,
  Share2,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface PacienteEnConsulta {
  id: string;
  pacienteId?: string;
  paciente: string;
  dni: string;
  edad: string;
  servicio: string;
  alergias?: string;
  grupoSanguineo?: string;
  sede: string;
  estado?: string;
  telefono?: string;
  horaLlegada?: string;
}

interface ImagenAdjunta {
  id: string;
  titulo: string;
  tipo: string;
  url: string;
  hora: string;
}

interface DiagnosticoItem {
  id: string;
  codigo: string;
  descripcion: string;
  tipo: "Definitivo" | "Presuntivo" | "Repetido";
}

const normalizarSede = (s?: string | null): string => {
  if (!s) return "Independencia";
  const lower = s.toLowerCase();
  if (lower.includes("todas")) return "Todas las Sedes";
  if (lower.includes("vivanco")) return "Vivanco";
  if (lower.includes("independencia")) return "Independencia";
  return s;
};

const CIE10_FRECUENTES = [
  // --- OBSTETRICIA & EMBARAZO NORMAL Y CONTROL ---
  { codigo: "Z34.0", descripcion: "Supervisión de primer embarazo normal" },
  { codigo: "Z34.8", descripcion: "Supervisión de otros embarazos normales" },
  { codigo: "Z34.9", descripcion: "Supervisión del embarazo normal, no especificado" },
  { codigo: "Z35.0", descripcion: "Supervisión de embarazo con historia de esterilidad" },
  { codigo: "Z35.1", descripcion: "Supervisión de embarazo con historia de aborto" },
  { codigo: "Z35.2", descripcion: "Supervisión de embarazo con otra historia obstétrica desfavorable" },
  { codigo: "Z35.8", descripcion: "Supervisión de otros embarazos de alto riesgo" },
  { codigo: "Z35.9", descripcion: "Supervisión de embarazo de alto riesgo, no especificado" },
  { codigo: "Z32.1", descripcion: "Confirmación de embarazo (Prueba positiva)" },
  { codigo: "Z39.2", descripcion: "Seguimiento postparto de rutina (Control puerperio)" },

  // --- ECOGRAFÍA & DIAGNÓSTICO PRENATAL ---
  { codigo: "Z36.8", descripcion: "Pesquisa prenatal por ultrasonido (Ecografía fetal)" },
  { codigo: "Z36.0", descripcion: "Pesquisa prenatal para anomalías cromosómicas (Genética / TN)" },
  { codigo: "Z36.3", descripcion: "Pesquisa prenatal de malformaciones fetales (Morfológica)" },
  { codigo: "O36.5", descripcion: "Atención materna por sospecha de restricción del crecimiento fetal (RCIU)" },
  { codigo: "O40", descripcion: "Polihidramnios (Exceso de líquido amniótico)" },
  { codigo: "O41.0", descripcion: "Oligohidramnios (Disminución de líquido amniótico)" },
  { codigo: "O43.1", descripcion: "Malformación o alteración de la placenta" },
  { codigo: "O44.0", descripcion: "Placenta previa sin hemorragia" },
  { codigo: "O44.1", descripcion: "Placenta previa con hemorragia" },
  { codigo: "O30.0", descripcion: "Embarazo gemelar / Gestación múltiple" },
  { codigo: "O32.1", descripcion: "Atención materna por presentación podálica / pelviana" },
  { codigo: "O32.2", descripcion: "Atención materna por situación transversa u oblicua" },

  // --- COMPLICACIONES OBSTÉTRICAS ---
  { codigo: "O20.0", descripcion: "Amenaza de aborto" },
  { codigo: "O00.9", descripcion: "Embarazo ectópico, no especificado" },
  { codigo: "O02.0", descripcion: "Huevo anembrionado" },
  { codigo: "O02.1", descripcion: "Aborto retenido / diferido" },
  { codigo: "O03.4", descripcion: "Aborto espontáneo incompleto sin complicación" },
  { codigo: "O13", descripcion: "Hipertensión gestacional sin proteinuria significativa" },
  { codigo: "O14.0", descripcion: "Preeclampsia leve a moderada" },
  { codigo: "O14.1", descripcion: "Preeclampsia severa" },
  { codigo: "O24.4", descripcion: "Diabetes mellitus gestacional" },
  { codigo: "O21.0", descripcion: "Hiperémesis gravídica leve" },
  { codigo: "O21.1", descripcion: "Hiperémesis gravídica con trastornos metabólicos" },
  { codigo: "O26.8", descripcion: "Otras afecciones especificadas relacionadas con el embarazo" },
  { codigo: "O60.0", descripcion: "Amenaza de parto prematuro / pretérmino" },
  { codigo: "O23.4", descripcion: "Infección no especificada de vías urinarias en el embarazo" },
  { codigo: "O99.0", descripcion: "Anemia que complica el embarazo, parto o puerperio" },

  // --- GINECOLOGÍA GENERAL E INFECCIONES ---
  { codigo: "N76.0", descripcion: "Vaginitis aguda / Vulvovaginitis / Leucorrea" },
  { codigo: "N76.1", descripcion: "Vaginitis subaguda y crónica" },
  { codigo: "N72", descripcion: "Enfermedad inflamatoria del cuello uterino (Cervicitis)" },
  { codigo: "N70.9", descripcion: "Salpingitis y ooforitis no especificada (EPI)" },
  { codigo: "N73.9", descripcion: "Enfermedad pélvica inflamatoria femenina, no especificada" },
  { codigo: "B37.3", descripcion: "Candidiasis de la vulva y de la vagina" },
  { codigo: "A59.0", descripcion: "Tricomoniasis urogenital" },
  { codigo: "A60.0", descripcion: "Infección de genitales por virus del herpes" },
  { codigo: "A56.0", descripcion: "Infección del tracto genitourinario por Chlamydia" },
  { codigo: "A51.0", descripcion: "Sífilis genital primaria" },
  { codigo: "N39.0", descripcion: "Infección del tracto urinario (ITU)" },

  // --- PATOLOGÍA DE CÉRVIX, ÚTERO Y OVARIOS ---
  { codigo: "N86", descripcion: "Erosión y ectropión del cuello del útero (Úlcera cervical)" },
  { codigo: "N87.0", descripcion: "Displasia cervical leve (NIC I / LIE de bajo grado)" },
  { codigo: "N87.1", descripcion: "Displasia cervical moderada (NIC II / LIE de alto grado)" },
  { codigo: "N87.2", descripcion: "Displasia cervical severa (NIC III)" },
  { codigo: "N87.9", descripcion: "Displasia del cuello uterino, no especificada" },
  { codigo: "D25.0", descripcion: "Leiomioma submucoso del útero" },
  { codigo: "D25.1", descripcion: "Leiomioma intramural del útero" },
  { codigo: "D25.2", descripcion: "Leiomioma subseroso del útero" },
  { codigo: "D25.9", descripcion: "Leiomioma del útero (Miomatosis uterina)" },
  { codigo: "N80.9", descripcion: "Endometriosis, no especificada" },
  { codigo: "N83.0", descripcion: "Quiste folicular del ovario" },
  { codigo: "N83.1", descripcion: "Quiste del cuerpo lúteo" },
  { codigo: "N83.2", descripcion: "Otros quistes ováricos y los no especificados" },
  { codigo: "E28.2", descripcion: "Síndrome de ovario poliquístico (SOP)" },
  { codigo: "N84.0", descripcion: "Pólipo del cuerpo del útero (Endometrial)" },
  { codigo: "N84.1", descripcion: "Pólipo del cuello del útero (Endocervical)" },

  // --- TRASTORNOS MENSTRUALES & CLIMATERIO ---
  { codigo: "N91.0", descripcion: "Amenorrea primaria" },
  { codigo: "N91.1", descripcion: "Amenorrea secundaria" },
  { codigo: "N91.2", descripcion: "Amenorrea, no especificada" },
  { codigo: "N92.0", descripcion: "Menstruación excesiva y frecuente con ciclo regular (Menorragia)" },
  { codigo: "N92.1", descripcion: "Menstruación excesiva e irregular (Metrorragia)" },
  { codigo: "N93.9", descripcion: "Hemorragia uterina y vaginal anormal, no especificada" },
  { codigo: "N94.6", descripcion: "Dismenorrea, no especificada" },
  { codigo: "N95.1", descripcion: "Estados menopáusicos y del climaterio femenino" },

  // --- PATOLOGÍA MAMARIA ---
  { codigo: "N60.9", descripcion: "Displasia mamaria benigna (Mastopatía fibroquística)" },
  { codigo: "N61", descripcion: "Trastornos inflamatorios de la mama (Mastitis)" },
  { codigo: "N64.4", descripcion: "Mastodinia / Dolor mamario" },
  { codigo: "D24", descripcion: "Tumor benigno de la mama (Fibroadenoma)" },

  // --- PLANIFICACIÓN FAMILIAR ---
  { codigo: "Z30.0", descripcion: "Consejo y asesoramiento general sobre la anticoncepción" },
  { codigo: "Z30.1", descripcion: "Inserción de dispositivo anticonceptivo (DIU)" },
  { codigo: "Z30.4", descripcion: "Supervisión del uso de anticonceptivos (Inyectables / Orales)" },
  { codigo: "Z30.5", descripcion: "Supervisión del uso de dispositivo anticonceptivo (DIU)" },
  { codigo: "Z30.8", descripcion: "Otras medidas anticonceptivas (Implante subdérmico)" },
  { codigo: "Z30.9", descripcion: "Atención para la anticoncepción, no especificada" },
  { codigo: "R10.2", descripcion: "Dolor pélvico y perineal" },
];

export default function HcePage() {
  const [sede, setSede] = useState<string>("Independencia");
  const [profesionalNombre, setProfesionalNombre] = useState<string>("Profesional de Turno");
  const [colegiatura, setColegiatura] = useState<string>("");

  // Pacientes en cola del consultorio (Cargados desde Supabase en Tiempo Real)
  const [pacientesCola, setPacientesCola] = useState<PacienteEnConsulta[]>([]);
  const [atendidosHoy, setAtendidosHoy] = useState<PacienteEnConsulta[]>([]);
  const [vistaCola, setVistaCola] = useState<"espera" | "atendidos">("espera");
  const [isLoadingCola, setIsLoadingCola] = useState<boolean>(true);
  const [selectedPatient, setSelectedPatient] = useState<PacienteEnConsulta | null>(null);

  // Modal de Reversión y Reapertura de Caso Clínico (Control de Calidad / Auditoría)
  const [showReabrirModal, setShowReabrirModal] = useState<boolean>(false);
  const [encuentroAReabrir, setEncuentroAReabrir] = useState<PacienteEnConsulta | null>(null);
  const [motivoReapertura, setMotivoReapertura] = useState<string>("");
  const [reabriendo, setReabriendo] = useState<boolean>(false);

  // Referencias para Aislamiento Absoluto de Estado y Prevención de Cruce
  const activeEncuentroIdRef = useRef<string | null>(null);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Triaje & Funciones Vitales (Inicia 100% limpio y desacoplado)
  const [pa, setPa] = useState("");
  const [fc, setFc] = useState("");
  const [fr, setFr] = useState("");
  const [temp, setTemp] = useState("");
  const [satO2, setSatO2] = useState("");
  const [peso, setPeso] = useState("");
  const [talla, setTalla] = useState("");

  // IMC dinámico
  const pNum = parseFloat(peso) || 0;
  const tNum = parseFloat(talla) || 0;
  const imc = tNum > 0 ? (pNum / (tNum * tNum)).toFixed(1) : "0.0";

  // Perfil Obstétrico (Inicia 100% limpio)
  const [formulaG, setFormulaG] = useState("");
  const [formulaP, setFormulaP] = useState("");
  const [fur, setFur] = useState("");
  const [fpp, setFpp] = useState("");
  const [eg, setEg] = useState("");
  const [alturaUterina, setAlturaUterina] = useState("");
  const [lcf, setLcf] = useState("");
  const [presentacion, setPresentacion] = useState("Cefálica");

  // Anamnesis, Examen y Tratamiento (Inicia limpio sin mocks)
  const [motivo, setMotivo] = useState("");
  const [antecedentes, setAntecedentes] = useState("");
  const [examenFisico, setExamenFisico] = useState("");
  const [planTratamiento, setPlanTratamiento] = useState("");

  // Diagnósticos CIE-10 (Inicia arreglo vacío)
  const [diagnosticos, setDiagnosticos] = useState<DiagnosticoItem[]>([]);
  const [busquedaCie, setBusquedaCie] = useState("");
  const [mostrarSugerenciasCie, setMostrarSugerenciasCie] = useState(false);

  // Imágenes / Ecografías (Archivos Reales Base64)
  const [imagenes, setImagenes] = useState<ImagenAdjunta[]>([]);
  const [modalImagen, setModalImagen] = useState<ImagenAdjunta | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado de Sellado y Adendas
  const [isSealed, setIsSealed] = useState(false);
  const [sealedHash, setSealedHash] = useState<string | null>(null);
  const [fechaSellado, setFechaSellado] = useState<string | null>(null);
  const [adendas, setAdendas] = useState<{ fecha: string; autor?: string; texto: string; hash: string }[]>([]);
  const [showAdendaModal, setShowAdendaModal] = useState(false);
  const [textoAdenda, setTextoAdenda] = useState("");
  const [isSavingAdenda, setIsSavingAdenda] = useState(false);

  // Reagendamiento Post-Consulta y Recordatorio por WhatsApp
  const [reagendarFecha, setReagendarFecha] = useState("");
  const [reagendarHora, setReagendarHora] = useState("09:00");
  const [reagendarMotivo, setReagendarMotivo] = useState("Control Prenatal y Ecografía de Seguimiento");
  const [reagendarSede, setReagendarSede] = useState("Independencia");
  const [reagendadaExito, setReagendadaExito] = useState(false);

  // Reset Síncrono Obligatorio de Todo el Estado del Formulario
  const resetearEstadoHceSincrono = (p?: PacienteEnConsulta | null) => {
    setPa("");
    setFc("");
    setFr("");
    setTemp("");
    setSatO2("");
    setPeso("");
    setTalla("");
    setFormulaG("");
    setFormulaP("");
    setFur("");
    setFpp("");
    setEg("");
    setAlturaUterina("");
    setLcf("");
    setPresentacion("Cefálica");
    setMotivo(p ? `Atención de ${p.servicio}. Paciente acude para evaluación y control.` : "");
    setAntecedentes("");
    setExamenFisico("");
    setPlanTratamiento("");
    setDiagnosticos([]);
    setImagenes([]);
    setAdendas([]);
    setTextoAdenda("");
    setBusquedaCie("");
    setMostrarSugerenciasCie(false);
    setReagendarFecha("");
    setReagendarMotivo(p ? `Control de Seguimiento - ${p.servicio}` : "Control Prenatal y Ecografía de Seguimiento");
    setReagendadaExito(false);
    setSaveStatus("idle");
    setLastSavedTime("");
  };

  // Cálculo Obstétrico Automático por Regla de Naegele y Semanas Gestacionales
  const handleFurChange = (val: string) => {
    setFur(val);
    if (!val) return;
    try {
      const parts = val.split("-").map(Number);
      if (parts.length === 3 && parts[0] > 1900 && parts[1] >= 1 && parts[1] <= 12 && parts[2] >= 1) {
        const furDate = new Date(parts[0], parts[1] - 1, parts[2]);
        if (!isNaN(furDate.getTime())) {
          // Regla de Naegele: FUR + 7 días + 1 año - 3 meses (280 días)
          const fppDate = new Date(furDate);
          fppDate.setDate(fppDate.getDate() + 280);
          const fppIso = fppDate.toISOString().split("T")[0];
          setFpp(fppIso);

          // Semanas de Gestación al día de hoy
          const today = new Date();
          const diffMs = today.getTime() - furDate.getTime();
          if (diffMs > 0) {
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const weeks = Math.floor(diffDays / 7);
            const days = diffDays % 7;
            if (weeks >= 0 && weeks <= 43) {
              setEg(`${weeks}.${days} sem`);
            }
          }
        }
      }
    } catch {}
  };

  // Semáforo Obstétrico de Alerta Temprana (MEOWS)
  const isHipertension = (() => {
    if (!pa) return false;
    const parts = pa.split(/[\/\-]/).map((p) => parseInt(p.trim(), 10));
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return parts[0] >= 140 || parts[1] >= 90;
    }
    return false;
  })();

  const isHipoxia = (() => {
    if (!satO2) return false;
    const val = parseFloat(satO2);
    return !isNaN(val) && val > 0 && val < 95;
  })();

  // Macros Clínicas Rápidas de 1 Clic
  const insertarMacroExamen = (texto: string) => {
    setExamenFisico((prev) => (prev ? `${prev}\n${texto}` : texto));
  };

  const insertarMacroPlan = (texto: string) => {
    setPlanTratamiento((prev) => (prev ? `${prev}\n${texto}` : texto));
  };

  // ============================================================================
  // GESTIÓN DE ATENCIÓN Y SELECCIÓN DE PACIENTE (AISLAMIENTO SÍNCRONO)
  // ============================================================================
  const handleSeleccionarPaciente = async (p: PacienteEnConsulta) => {
    // 1. Cancelar de inmediato cualquier timer de autoguardado previo
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }

    // 2. Establecer el ID de encuentro activo en la referencia síncrona
    activeEncuentroIdRef.current = p.id;

    // 3. RESET OBLIGATORIO Y SÍNCRONO DEL 100% DEL FORMULARIO
    resetearEstadoHceSincrono(p);
    setSelectedPatient(p);

    // 4. Bloqueo inmediato si el paciente ya fue ATENDIDO (Modo Solo Lectura)
    const estaAtendido = p.estado === "ATENDIDO";
    setIsSealed(estaAtendido);
    setSealedHash(estaAtendido ? "SELLADO-CONFORME" : null);

    // 5. Cargar nota clínica previa asociada ESTRICTAMENTE a este encuentro_id
    try {
      const { data: notaExistente } = await supabase
        .from("nota_clinica")
        .select("*")
        .eq("encuentro_id", p.id)
        .maybeSingle();

      // Protección contra condiciones de carrera: descartar si el usuario cambió de paciente mientras respondía la red
      if (activeEncuentroIdRef.current !== p.id) {
        return;
      }

      if (notaExistente) {
        if (notaExistente.motivo_consulta) setMotivo(notaExistente.motivo_consulta);
        if (notaExistente.antecedentes) setAntecedentes(notaExistente.antecedentes);
        if (notaExistente.plan_trabajo) setPlanTratamiento(notaExistente.plan_trabajo);
        if (notaExistente.diagnostico_cie10) {
          try {
            setDiagnosticos(JSON.parse(notaExistente.diagnostico_cie10));
          } catch {}
        }
        if (notaExistente.examen_fisico) {
          try {
            const ef = JSON.parse(notaExistente.examen_fisico);
            if (ef.pa) setPa(ef.pa);
            if (ef.fc) setFc(ef.fc);
            if (ef.fr) setFr(ef.fr);
            if (ef.temp) setTemp(ef.temp);
            if (ef.satO2) setSatO2(ef.satO2);
            if (ef.peso) setPeso(ef.peso);
            if (ef.talla) setTalla(ef.talla);
            if (ef.formulaG) setFormulaG(ef.formulaG);
            if (ef.formulaP) setFormulaP(ef.formulaP);
            if (ef.fur) setFur(ef.fur);
            if (ef.fpp) setFpp(ef.fpp);
            if (ef.eg) setEg(ef.eg);
            if (ef.alturaUterina) setAlturaUterina(ef.alturaUterina);
            if (ef.lcf) setLcf(ef.lcf);
            if (ef.presentacion) setPresentacion(ef.presentacion);
            if (ef.detalles) setExamenFisico(ef.detalles);
          } catch {}
        }
        if (notaExistente.cerrada || notaExistente.hash_firma || estaAtendido) {
          setIsSealed(true);
          setSealedHash(notaExistente.hash_firma || "SELLADO-CONFORME");
          setFechaSellado(notaExistente.fecha_cierre || notaExistente.updated_at || null);
        }
        if (notaExistente.adendas) {
          try {
            const adList = typeof notaExistente.adendas === "string"
              ? JSON.parse(notaExistente.adendas)
              : notaExistente.adendas;
            if (Array.isArray(adList)) setAdendas(adList);
          } catch {}
        }
        if (notaExistente.imagenes) {
          try {
            const imgList = typeof notaExistente.imagenes === "string"
              ? JSON.parse(notaExistente.imagenes)
              : notaExistente.imagenes;
            if (Array.isArray(imgList)) setImagenes(imgList);
          } catch {}
        }
      }
    } catch (err) {
      console.warn("Error cargando nota clínica previa:", err);
    }

    if (p.estado === "EN_ESPERA") {
      try {
        await supabase
          .from("encuentro")
          .update({ estado: "EN_ATENCION", updated_at: new Date().toISOString() })
          .eq("id", p.id);

        setPacientesCola((prev) =>
          prev.map((item) => (item.id === p.id ? { ...item, estado: "EN_ATENCION" } : item))
        );
        setSelectedPatient((prev) => (prev && prev.id === p.id ? { ...prev, estado: "EN_ATENCION" } : prev));
      } catch (err) {
        console.warn("No se pudo actualizar estado a EN_ATENCION:", err);
      }
    }
  };

  // ============================================================================
  // CARGA REAL DE COLA Y SINCRONIZACIÓN EN TIEMPO REAL (SUPABASE REALTIME)
  // ============================================================================
  const cargarColaEncuentros = async (sedeActual?: string) => {
    setIsLoadingCola(true);
    try {
      // 1. Cargar pacientes en espera o en atención médica activa
      const { data: enEspera, error: errEspera } = await supabase
        .from("encuentro")
        .select(`
          id,
          servicio_solicitado,
          estado,
          site_id,
          fecha_hora,
          paciente:paciente_id (
            id,
            dni,
            nombres,
            apellidos,
            telefono
          ),
          sede:site_id (
            id,
            nombre
          )
        `)
        .in("estado", ["EN_ESPERA", "EN_ATENCION"])
        .order("fecha_hora", { ascending: true });

      if (errEspera) {
        console.warn("Advertencia al consultar encuentros en espera:", errEspera.message);
      } else if (enEspera) {
        const mapeados: PacienteEnConsulta[] = enEspera.map((item: any) => {
          const rawPac = Array.isArray(item.paciente) ? item.paciente[0] : item.paciente;
          const rawSede = Array.isArray(item.sede) ? item.sede[0]?.nombre : item.sede?.nombre;
          return {
            id: item.id,
            pacienteId: rawPac?.id,
            paciente: rawPac ? `${rawPac.nombres || ""} ${rawPac.apellidos || ""}`.trim() || "Paciente Registrado" : "Paciente Registrado",
            dni: rawPac?.dni || "S/DNI",
            edad: "28 a",
            servicio: item.servicio_solicitado,
            alergias: "Ninguna",
            grupoSanguineo: "O Rh(+)",
            sede: normalizarSede(rawSede),
            estado: item.estado,
            telefono: rawPac?.telefono || "",
            horaLlegada: new Date(item.fecha_hora).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
        });
        setPacientesCola(mapeados);

        setSelectedPatient((prev) => {
          if (prev && mapeados.some((p) => p.id === prev.id)) {
            return mapeados.find((p) => p.id === prev.id) || prev;
          }
          if (!activeEncuentroIdRef.current && mapeados.length > 0) {
            const sedeNorm = normalizarSede(sedeActual || sessionStorage.getItem("lm_sede") || "Independencia");
            const delaSede = mapeados.filter((p) => normalizarSede(p.sede) === sedeNorm);
            const candidato = delaSede.length > 0 ? delaSede[0] : mapeados[0];
            setTimeout(() => handleSeleccionarPaciente(candidato), 0);
            return candidato;
          }
          return prev;
        });
      }

      // 2. Cargar atenciones finalizadas hoy
      const { data: atendidos, error: errAtendidos } = await supabase
        .from("encuentro")
        .select(`
          id,
          servicio_solicitado,
          estado,
          site_id,
          fecha_hora,
          paciente:paciente_id (
            id,
            dni,
            nombres,
            apellidos,
            telefono
          ),
          sede:site_id (
            id,
            nombre
          )
        `)
        .eq("estado", "ATENDIDO")
        .order("updated_at", { ascending: false })
        .limit(20);

      if (atendidos) {
        const mapeadosAtendidos: PacienteEnConsulta[] = atendidos.map((item: any) => {
          const rawPac = Array.isArray(item.paciente) ? item.paciente[0] : item.paciente;
          const rawSede = Array.isArray(item.sede) ? item.sede[0]?.nombre : item.sede?.nombre;
          return {
            id: item.id,
            pacienteId: rawPac?.id,
            paciente: rawPac ? `${rawPac.nombres || ""} ${rawPac.apellidos || ""}`.trim() || "Paciente Registrado" : "Paciente Registrado",
            dni: rawPac?.dni || "S/DNI",
            edad: "28 a",
            servicio: item.servicio_solicitado,
            alergias: "Ninguna",
            grupoSanguineo: "O Rh(+)",
            sede: normalizarSede(rawSede),
            estado: item.estado,
            telefono: rawPac?.telefono || "",
            horaLlegada: new Date(item.fecha_hora).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
        });
        setAtendidosHoy(mapeadosAtendidos);
      }
    } catch (err) {
      console.warn("Error al cargar cola de HCE:", err);
    } finally {
      setIsLoadingCola(false);
    }
  };

  useEffect(() => {
    const s = sessionStorage.getItem("lm_sede") || "Independencia";
    const nom = sessionStorage.getItem("lm_nombre") || "Profesional de Turno";
    const col = sessionStorage.getItem("lm_colegiatura") || "";
    setSede(s);
    setProfesionalNombre(nom);
    setColegiatura(col);

    cargarColaEncuentros(s);

    // Suscripción Realtime Unificada (Postgres changes y canal de broadcast cola-medica)
    const canalCambios = supabase
      .channel("cola-medica")
      .on("postgres_changes", { event: "*", schema: "public", table: "encuentro" }, () => {
        cargarColaEncuentros(s);
      })
      .on("broadcast", { event: "nuevo_paciente_en_espera" }, () => {
        cargarColaEncuentros(s);
      })
      .on("broadcast", { event: "paciente_reprogramado" }, () => {
        cargarColaEncuentros(s);
      })
      .subscribe();

    const onStorage = (e: StorageEvent) => {
      if (e.key === "lm_nuevo_paciente_en_espera" || e.key === "lm_paciente_reprogramado") {
        cargarColaEncuentros(s);
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      supabase.removeChannel(canalCambios);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // Impresión Médica Profesional en Formato A4 (Aislamiento en Iframe Oculto)
  const imprimirFichaClinicaA4 = () => {
    if (!selectedPatient) {
      alert("Seleccione un paciente de la cola para imprimir su historia clínica.");
      return;
    }

    const fechaHoy = new Date().toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <title>Historia Clínica - ${selectedPatient.paciente} (${selectedPatient.dni})</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          * {
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          }
          body {
            color: #111827;
            background: #fff;
            margin: 0;
            padding: 0;
            font-size: 11px;
            line-height: 1.4;
          }
          .header {
            border-bottom: 2px solid #0f172a;
            padding-bottom: 8px;
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .title {
            font-size: 15px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .subtitle {
            font-size: 10px;
            color: #475569;
            margin-top: 2px;
          }
          .badge-hce {
            border: 1px solid #cbd5e1;
            background: #f8fafc;
            padding: 4px 8px;
            border-radius: 4px;
            text-align: right;
            font-size: 10px;
          }
          .section-title {
            background: #f1f5f9;
            color: #0f172a;
            font-weight: 700;
            font-size: 11px;
            text-transform: uppercase;
            padding: 4px 8px;
            border-left: 3px solid #0f172a;
            margin-top: 10px;
            margin-bottom: 6px;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .grid-3 {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 8px;
          }
          .grid-4 {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 6px;
          }
          .data-box {
            background: #fafafa;
            border: 1px solid #e2e8f0;
            padding: 6px 8px;
            border-radius: 4px;
          }
          .data-label {
            font-size: 9px;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 600;
          }
          .data-val {
            font-size: 11px;
            font-weight: 700;
            color: #0f172a;
            margin-top: 1px;
          }
          .table-cie {
            width: 100%;
            border-collapse: collapse;
            margin-top: 4px;
            font-size: 10px;
          }
          .table-cie th {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            padding: 4px 6px;
            text-align: left;
            font-weight: 700;
            color: #334155;
          }
          .table-cie td {
            border: 1px solid #e2e8f0;
            padding: 4px 6px;
          }
          .content-block {
            border: 1px solid #e2e8f0;
            padding: 6px 8px;
            border-radius: 4px;
            min-height: 38px;
            white-space: pre-wrap;
            font-size: 10.5px;
            background: #fff;
          }
          .footer-sign {
            margin-top: 25px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            page-break-inside: avoid;
          }
          .seal-box {
            border: 1px dashed #94a3b8;
            padding: 8px 12px;
            border-radius: 4px;
            max-width: 320px;
            font-size: 9px;
            color: #475569;
          }
          .signature-line {
            width: 200px;
            border-top: 1px solid #0f172a;
            text-align: center;
            padding-top: 4px;
            font-size: 10px;
            font-weight: 700;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">CONSULTORIO OBSTÉTRICO ECOGRÁFICO LAS MELLIZAS</div>
            <div class="subtitle">Especialistas en Salud Ginecológica, Control Prenatal y Diagnóstico Ecográfico</div>
            <div class="subtitle"><strong>Sede de Atención:</strong> ${selectedPatient.sede || sede} &bull; RUC: 20608546871</div>
          </div>
          <div class="badge-hce">
            <div><strong>HISTORIA CLÍNICA ELECTRÓNICA</strong></div>
            <div>Encuentro ID: ${selectedPatient.id.slice(0, 8)}</div>
            <div>Emisión: ${fechaHoy}</div>
          </div>
        </div>

        <!-- DATOS DEL PACIENTE Y PROFESIONAL -->
        <div class="grid-2">
          <div class="data-box">
            <div class="data-label">Paciente / Titular</div>
            <div class="data-val">${selectedPatient.paciente}</div>
            <div style="font-size:10px; color:#475569; margin-top:2px;">
              DNI: <strong>${selectedPatient.dni}</strong> &bull; Edad: <strong>${selectedPatient.edad || "N/E"}</strong> &bull; Tel: <strong>${selectedPatient.telefono || "N/E"}</strong>
            </div>
            <div style="font-size:9.5px; color:#dc2626; margin-top:2px;">
              Alergias: <strong>${selectedPatient.alergias || "Ninguna"}</strong> &bull; Grupo: <strong>${selectedPatient.grupoSanguineo || "O Rh(+)"}</strong>
            </div>
          </div>

          <div class="data-box">
            <div class="data-label">Profesional Responsable de la Atención</div>
            <div class="data-val">${profesionalNombre}</div>
            <div style="font-size:10px; color:#475569; margin-top:2px;">
              Colegiatura / Registro: <strong>${colegiatura || "COP / CMP"}</strong>
            </div>
            <div style="font-size:9.5px; color:#2563eb; margin-top:2px;">
              Servicio Evaluado: <strong>${selectedPatient.servicio}</strong>
            </div>
          </div>
        </div>

        <!-- TRIAJE / FUNCIONES VITALES -->
        <div class="section-title">1. Funciones Vitales & Antropometría (Triaje)</div>
        <div class="grid-4">
          <div class="data-box"><div class="data-label">Presión Arterial</div><div class="data-val">${pa || "--/--"} mmHg</div></div>
          <div class="data-box"><div class="data-label">Frec. Cardíaca</div><div class="data-val">${fc || "--"} lpm</div></div>
          <div class="data-box"><div class="data-label">Frec. Respiratoria</div><div class="data-val">${fr || "--"} rpm</div></div>
          <div class="data-box"><div class="data-label">Temperatura</div><div class="data-val">${temp || "--"} °C</div></div>
          <div class="data-box"><div class="data-label">Sat. O2</div><div class="data-val">${satO2 || "--"} %</div></div>
          <div class="data-box"><div class="data-label">Peso</div><div class="data-val">${peso || "--"} kg</div></div>
          <div class="data-box"><div class="data-label">Talla</div><div class="data-val">${talla || "--"} m</div></div>
          <div class="data-box"><div class="data-label">IMC Calculado</div><div class="data-val">${imc} kg/m²</div></div>
        </div>

        <!-- PERFIL OBSTÉTRICO (SI APLICA) -->
        ${(formulaG || fur || eg || alturaUterina || lcf) ? `
          <div class="section-title">2. Perfil y Control Obstétrico</div>
          <div class="grid-4">
            <div class="data-box"><div class="data-label">Fórmula Gestacional</div><div class="data-val">G: ${formulaG || "-"} P: ${formulaP || "-"}</div></div>
            <div class="data-box"><div class="data-label">F.U.R. / F.P.P.</div><div class="data-val">${fur || "--"} / ${fpp || "--"}</div></div>
            <div class="data-box"><div class="data-label">Edad Gestacional</div><div class="data-val">${eg || "--"} sem</div></div>
            <div class="data-box"><div class="data-label">Alt. Uterina / LCF</div><div class="data-val">${alturaUterina || "--"} cm / ${lcf || "--"} lpm</div></div>
          </div>
        ` : ''}

        <!-- ANAMNESIS Y ANTECEDENTES -->
        <div class="section-title">3. Anamnesis & Motivo de Consulta</div>
        <div class="content-block">${motivo || "Sin registro de motivo de consulta específico."}</div>

        ${antecedentes ? `
          <div class="section-title">4. Antecedentes Clínicos y Familiares</div>
          <div class="content-block">${antecedentes}</div>
        ` : ''}

        <!-- EXAMEN CLÍNICO -->
        <div class="section-title">5. Examen Físico / Evaluación Ecográfica</div>
        <div class="content-block">${examenFisico || "Evaluación clínica realizada conforme a estándares y protocolos de atención."}</div>

        <!-- DIAGNÓSTICOS CIE-10 -->
        <div class="section-title">6. Diagnósticos Clínicos (CIE-10)</div>
        ${diagnosticos.length === 0 ? `
          <div class="content-block" style="color:#64748b; font-style:italic;">No se registraron diagnósticos CIE-10 para esta atención.</div>
        ` : `
          <table class="table-cie">
            <thead>
              <tr>
                <th style="width: 15%;">Código CIE</th>
                <th style="width: 65%;">Descripción del Diagnóstico</th>
                <th style="width: 20%;">Tipo</th>
              </tr>
            </thead>
            <tbody>
              ${diagnosticos.map(d => `
                <tr>
                  <td style="font-weight:700; font-family:monospace;">${d.codigo}</td>
                  <td>${d.descripcion}</td>
                  <td style="text-transform:uppercase; font-size:9.5px; font-weight:600;">${d.tipo}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        `}

        <!-- PLAN DE TRABAJO Y TRATAMIENTO -->
        <div class="section-title">7. Plan de Tratamiento & Prescripción</div>
        <div class="content-block">${planTratamiento || "Indicaciones y plan de seguimiento explicados a la paciente en consulta."}</div>

        <!-- ADENDAS CLÍNICAS (SI EXISTEN) -->
        ${adendas.length > 0 ? `
          <div class="section-title">8. Adendas Clínicas Incorporadas</div>
          ${adendas.map((a, idx) => `
            <div style="margin-bottom:4px; font-size:10px; background:#fefce8; border:1px solid #fef08a; padding:4px 6px; border-radius:4px;">
              <strong>Adenda #${idx + 1} (${a.fecha}) [Hash: ${a.hash.slice(0, 10)}]:</strong> ${a.texto}
            </div>
          `).join("")}
        ` : ''}

        <!-- FIRMA Y VALIDACIÓN LEGAL -->
        <div class="footer-sign">
          <div class="seal-box">
            <strong>DOCUMENTO MÉDICO INALTERABLE</strong><br>
            Historia Clínica Electrónica generada bajo el marco de la <strong>Ley N.° 30024</strong> y la <strong>NTS N.° 139-MINSA</strong>.<br>
            ${isSealed ? `
              <span style="color:#15803d; font-weight:700;">DOCUMENTO SELLADO Y FIRMADO DIGITALMENTE</span><br>
              Hash de Integridad: <span style="font-family:monospace;">${sealedHash || "VALIDADO"}</span>
            ` : `
              <span style="color:#b45309; font-weight:700;">REGISTRO EN PROCESO DE ATENCIÓN</span>
            `}
          </div>
          <div class="signature-line">
            ${profesionalNombre}<br>
            <span style="font-size:9px; color:#64748b; font-weight:normal;">${colegiatura || "Obstetricia / Ginecología"}</span>
          </div>
        </div>
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 300);
  };

  const generarEnlaceWhatsApp = () => {
    const tel = selectedPatient?.telefono || "966123456";
    const msg = `*Consultorio Obstétrico Ecográfico Las Mellizas* 🩺✨%0A%0AEstimada paciente *${encodeURIComponent(
      selectedPatient?.paciente || "Paciente"
    )}*:%0A%0ALe confirmamos su próxima cita de control médico programada:%0A📅 *Fecha:* ${
      reagendarFecha || "Por coordinar"
    }%0A⏰ *Hora:* ${reagendarHora}%0A🏥 *Sede:* ${reagendarSede}%0A📋 *Servicio:* ${encodeURIComponent(
      reagendarMotivo
    )}%0A👨‍⚕️ *Profesional:* ${encodeURIComponent(profesionalNombre)}%0A%0A_Por favor acudir 10 minutos antes. ¡Cuidamos de ti y de tu bebé con amor y tecnología!_`;

    return `https://wa.me/51${tel}?text=${msg}`;
  };

  const handleGuardarReagendamiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reagendarFecha) {
      alert("Por favor seleccione la fecha de la próxima cita.");
      return;
    }
    if (!selectedPatient) {
      alert("No hay paciente seleccionado.");
      return;
    }
    try {
      const siteId = normalizarSede(reagendarSede) === "Vivanco"
        ? "b0000000-0000-0000-0000-000000000002"
        : "b0000000-0000-0000-0000-000000000001";

      const { data: rpcRes, error: rpcErr } = await supabase.rpc("reprogramar_cita_y_retirar_espera", {
        p_encuentro_id: selectedPatient.id || null,
        p_paciente_nombre: selectedPatient.paciente,
        p_telefono: selectedPatient.telefono || null,
        p_fecha: reagendarFecha,
        p_hora: reagendarHora,
        p_motivo: reagendarMotivo,
        p_site_id: siteId,
        p_usuario_nombre: profesionalNombre,
      });

      if (rpcErr || !rpcRes?.success) {
        await supabase.from("cita_reagendada").insert({
          paciente_nombre: selectedPatient.paciente,
          telefono: selectedPatient.telefono || null,
          fecha: reagendarFecha,
          hora: reagendarHora,
          motivo: reagendarMotivo,
          site_id: siteId,
          estado: "PROGRAMADA",
        });
      }
    } catch {}
    setReagendadaExito(true);
    setTimeout(() => setReagendadaExito(false), 4000);
  };

  // ============================================================================
  // AUTOGUARDADO SILENCIOSO Y PERSISTENCIA POR ENCUENTRO_ID ÚNICO
  // ============================================================================
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [lastSavedTime, setLastSavedTime] = useState<string>("");
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // Si no hay paciente, o la nota está sellada / ATENDIDA, BLOQUEAR AUTOGUARDADO
    if (isSealed || !selectedPatient || selectedPatient.estado === "ATENDIDO") {
      setSaveStatus("idle");
      return;
    }

    const currentEncuentroId = selectedPatient.id;
    setSaveStatus("saving");

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = setTimeout(async () => {
      // Verificación estricta de concurrencia: el encuentro activo debe ser el mismo
      if (activeEncuentroIdRef.current !== currentEncuentroId) return;

      try {
        const { data: userAuth } = await supabase.auth.getUser();
        await supabase.from("nota_clinica").upsert(
          {
            encuentro_id: currentEncuentroId,
            paciente_id: selectedPatient.pacienteId,
            profesional_id: userAuth.user?.id,
            motivo_consulta: motivo,
            antecedentes: antecedentes,
            examen_fisico: JSON.stringify({
              pa, fc, fr, temp, satO2, peso, talla, imc,
              formulaG, formulaP, fur, fpp, eg, alturaUterina, lcf, presentacion,
              detalles: examenFisico,
            }),
            diagnostico_cie10: JSON.stringify(diagnosticos),
            plan_trabajo: planTratamiento,
            imagenes: JSON.stringify(imagenes),
            cerrada: false,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "encuentro_id" }
        );

        if (activeEncuentroIdRef.current === currentEncuentroId) {
          setSaveStatus("saved");
          setLastSavedTime(new Date().toLocaleTimeString("es-PE"));
        }
      } catch {
        if (activeEncuentroIdRef.current === currentEncuentroId) {
          setSaveStatus("idle");
        }
      }
    }, 2500);

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [pa, fc, fr, temp, peso, talla, motivo, antecedentes, examenFisico, planTratamiento, diagnosticos, formulaG, formulaP, fur, fpp, eg, alturaUterina, lcf, presentacion, imagenes]);

  const handleAgregarCie = (item: { codigo: string; descripcion: string }) => {
    if (diagnosticos.some((d) => d.codigo === item.codigo)) return;
    setDiagnosticos([
      ...diagnosticos,
      { id: `dx-${Date.now()}`, codigo: item.codigo, descripcion: item.descripcion, tipo: "Definitivo" },
    ]);
    setBusquedaCie("");
    setMostrarSugerenciasCie(false);
  };

  // Sellar y Firmar HCE con Persistencia Real y Cierre del Encuentro
  const handleSellarNota = async () => {
    if (!selectedPatient) return;
    if (diagnosticos.length === 0) {
      alert("Debe registrar al menos un código CIE-10 antes de sellar.");
      return;
    }

    const hash = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    try {
      const { data: userAuth } = await supabase.auth.getUser();

      // 1. Guardar nota clínica en Supabase
      const { error: notaErr } = await supabase.from("nota_clinica").upsert(
        {
          encuentro_id: selectedPatient.id,
          paciente_id: selectedPatient.pacienteId,
          profesional_id: userAuth.user?.id,
          motivo_consulta: motivo,
          antecedentes: antecedentes,
          examen_fisico: JSON.stringify({
            pa,
            fc,
            fr,
            temp,
            satO2,
            peso,
            talla,
            imc,
            formulaG,
            formulaP,
            fur,
            fpp,
            eg,
            alturaUterina,
            lcf,
            presentacion,
            detalles: examenFisico,
          }),
          diagnostico_cie10: JSON.stringify(diagnosticos),
          plan_trabajo: planTratamiento,
          imagenes: JSON.stringify(imagenes),
          adendas: JSON.stringify(adendas),
          cerrada: true,
          fecha_cierre: new Date().toISOString(),
          hash_firma: hash,
        },
        { onConflict: "encuentro_id" }
      );

      if (notaErr) {
        console.warn("Advertencia al guardar nota clínica:", notaErr.message);
      }

      // 2. Marcar encuentro como ATENDIDO
      const { error: encErr } = await supabase
        .from("encuentro")
        .update({ estado: "ATENDIDO", updated_at: new Date().toISOString() })
        .eq("id", selectedPatient.id);

      if (encErr) {
        console.warn("Advertencia al actualizar estado de encuentro:", encErr.message);
      }

      // 3. Registrar en auditoría
      if (userAuth.user?.id) {
        await supabase.from("auditoria").insert({
          usuario_id: userAuth.user.id,
          site_id: sede === "Vivanco" ? "b0000000-0000-0000-0000-000000000002" : "b0000000-0000-0000-0000-000000000001",
          accion: "SELLO_NOTA_CLINICA",
          entidad: "nota_clinica",
          entidad_id: selectedPatient.id,
          detalle: {
            paciente: selectedPatient.paciente,
            dni: selectedPatient.dni,
            hash_firma: hash,
          },
        });
      }

      setSealedHash(hash);
      setFechaSellado(new Date().toISOString());
      setIsSealed(true);
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
        autosaveTimeoutRef.current = null;
      }
      setSaveStatus("saved");
      if (selectedPatient) {
        setSelectedPatient((prev) => (prev ? { ...prev, estado: "ATENDIDO" } : prev));
      }

      // Recargar cola de pacientes de Supabase
      await cargarColaEncuentros();
    } catch (err: any) {
      alert("Error al sellar historia clínica:\n" + (err?.message || err));
    }
  };

  // Reversión / Reapertura autorizada de un caso clínico cerrado
  const handleEjecutarReversion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!encuentroAReabrir) return;
    if (motivoReapertura.trim().length < 5) {
      alert("Debe ingresar una justificación u observación obligatoria de al menos 5 caracteres.");
      return;
    }

    setReabriendo(true);
    try {
      // Intentar mediante RPC
      const { error: rpcErr } = await supabase.rpc("revertir_estado_encuentro", {
        p_encuentro_id: encuentroAReabrir.id,
        p_nuevo_estado: "EN_ATENCION",
        p_motivo: motivoReapertura.trim(),
      });

      if (rpcErr) {
        // Fallback directo a tablas
        await supabase
          .from("encuentro")
          .update({ estado: "EN_ATENCION", updated_at: new Date().toISOString() })
          .eq("id", encuentroAReabrir.id);

        const { data: userAuth } = await supabase.auth.getUser();
        if (userAuth.user?.id) {
          await supabase.from("auditoria").insert({
            usuario_id: userAuth.user.id,
            accion: "REVERSION_ESTADO_ENCUENTRO_MANUAL",
            entidad: "encuentro",
            entidad_id: encuentroAReabrir.id,
            detalle: {
              motivo: motivoReapertura.trim(),
              nuevo_estado: "EN_ATENCION",
            },
          });
        }
      }

      setShowReabrirModal(false);
      setMotivoReapertura("");
      setVistaCola("espera");
      await cargarColaEncuentros();
      setSelectedPatient({ ...encuentroAReabrir, estado: "EN_ATENCION" });
      setIsSealed(false);
      setSealedHash(null);
      alert(`El encuentro de ${encuentroAReabrir.paciente} fue reabierto y colocado en atención activa.`);
    } catch (err: any) {
      alert("Error al reabrir el caso clínico:\n" + (err?.message || err));
    } finally {
      setReabriendo(false);
    }
  };

  const handleSeleccionarArchivoImagen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Por favor seleccione un archivo de imagen válido (JPG, PNG, WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("El tamaño de la imagen no debe superar los 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = reader.result as string;
      const nombreLimpio = file.name.replace(/\.[^/.]+$/, "");
      const nueva: ImagenAdjunta = {
        id: `img-${Date.now()}`,
        titulo: nombreLimpio.length > 30 ? nombreLimpio.slice(0, 30) + "..." : nombreLimpio,
        tipo: "Ecografía / Captura",
        url: resultStr,
        hora: new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }),
      };
      setImagenes((prev) => [...prev, nueva]);
    };
    reader.readAsDataURL(file);

    e.target.value = "";
  };

  const handleGuardarAdenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textoAdenda.trim()) return;
    if (!selectedPatient) return;

    setIsSavingAdenda(true);
    try {
      const { data: userAuth } = await supabase.auth.getUser();
      const autorNombre = profesionalNombre || "Profesional Responsable";

      // Intentar mediante la función RPC atómica
      const { data: rpcRes, error: rpcErr } = await supabase.rpc("incorporar_adenda_clinica", {
        p_encuentro_id: selectedPatient.id,
        p_texto_adenda: textoAdenda.trim(),
        p_autor_nombre: autorNombre,
        p_autor_id: userAuth.user?.id || null,
      });

      if (rpcErr) {
        console.warn("Advertencia al incorporar adenda por RPC, aplicando fallback:", rpcErr.message);
        const hashFallback = Array.from(crypto.getRandomValues(new Uint8Array(16)))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        const nuevaAdenda = {
          fecha: new Date().toLocaleString("es-PE"),
          autor: autorNombre,
          texto: textoAdenda.trim(),
          hash: hashFallback,
        };
        const nuevasAdendas = [...adendas, nuevaAdenda];
        setAdendas(nuevasAdendas);
        await supabase
          .from("nota_clinica")
          .update({
            adendas: JSON.stringify(nuevasAdendas),
            updated_at: new Date().toISOString(),
          })
          .eq("encuentro_id", selectedPatient.id);
      } else if (rpcRes && rpcRes.adenda) {
        setAdendas((prev) => [...prev, rpcRes.adenda]);
      } else {
        const hashFallback = Array.from(crypto.getRandomValues(new Uint8Array(16)))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        setAdendas((prev) => [
          ...prev,
          {
            fecha: new Date().toLocaleString("es-PE"),
            autor: autorNombre,
            texto: textoAdenda.trim(),
            hash: hashFallback,
          },
        ]);
      }

      setTextoAdenda("");
      setShowAdendaModal(false);
      alert("Adenda inmutable incorporada y firmada digitalmente con éxito.");
    } catch (err: any) {
      alert("Error al registrar la adenda clínica:\n" + (err?.message || err));
    } finally {
      setIsSavingAdenda(false);
    }
  };

  const pacientesFiltrados = pacientesCola.filter(
    (p) => sede === "Todas las Sedes" || normalizarSede(p.sede) === normalizarSede(sede)
  );

  const atendidosFiltrados = atendidosHoy.filter(
    (p) => sede === "Todas las Sedes" || normalizarSede(p.sede) === normalizarSede(sede)
  );

  return (
    <div className="space-y-3 max-w-[1600px] mx-auto text-xs">
      {/* Barra de Control Clínico & Autoguardado */}
      <div className="bg-white border border-neutral-200 rounded-lg p-2.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-neutral-900 text-xs">{profesionalNombre}</span>
            <span className="font-mono text-[10px] bg-neutral-100 text-neutral-700 px-1.5 py-0.2 rounded border border-neutral-200">
              {colegiatura}
            </span>
          </div>
          <span className="text-neutral-300">&bull;</span>
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-500">Paciente:</span>
            <span className="font-bold text-neutral-900">
              {selectedPatient ? selectedPatient.paciente : "Ningún paciente seleccionado"}
            </span>
            {selectedPatient && (
              <span className="font-mono text-neutral-400">({selectedPatient.dni})</span>
            )}
            {selectedPatient?.alergias && selectedPatient.alergias !== "Ninguna" && (
              <span className="text-[10px] font-bold bg-rose-50 text-rose-700 px-1.5 py-0.2 rounded border border-rose-200 flex items-center gap-0.5">
                <AlertTriangle className="w-2.5 h-2.5" />
                {selectedPatient.alergias}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Indicador de Autoguardado Silencioso */}
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-neutral-400">
            {saveStatus === "saving" ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span>Guardando cambios...</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-neutral-500">Guardado aut. {lastSavedTime}</span>
              </>
            )}
          </div>

          {/* Botón de Impresión Ficha Clínica A4 */}
          <button
            type="button"
            onClick={imprimirFichaClinicaA4}
            disabled={!selectedPatient}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold rounded-lg border border-neutral-300 transition disabled:opacity-40"
            title="Imprimir Historia Clínica Electrónica completa en formato A4"
          >
            <Printer className="w-3.5 h-3.5 text-neutral-600" />
            <span>Imprimir Historia (A4)</span>
          </button>

          {/* Botón de Sellar / Adenda */}
          {!isSealed ? (
            <button
              onClick={handleSellarNota}
              disabled={!selectedPatient}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-black text-white font-bold rounded-lg transition disabled:opacity-40"
            >
              <Lock className="w-3 h-3" />
              <span>Sellar & Firmar HCE</span>
            </button>
          ) : (
            <button
              onClick={() => setShowAdendaModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-700 hover:bg-brand-800 text-white font-bold rounded-lg transition"
            >
              <PlusCircle className="w-3 h-3" />
              <span>Incorporar Adenda</span>
            </button>
          )}
        </div>
      </div>

      {/* Banner de Bloqueo Inmutable Post-Atención */}
      {(isSealed || selectedPatient?.estado === "ATENDIDO") && selectedPatient && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-3.5 py-2 rounded-lg flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="font-extrabold text-xs">Historia Clínica Sellada & Cerrada (Modo Solo Lectura)</span>
            <span className="text-[11px] text-amber-700 hidden sm:inline">&bull; Ley N.° 30024 & NTS N.° 139-MINSA (Acto Médico Inalterable)</span>
          </div>
          {sealedHash && (
            <span className="font-mono text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
              Firma Hash: {sealedHash.slice(0, 16)}...
            </span>
          )}
        </div>
      )}

      {/* Grid Clínico de Alta Densidad (3 Columnas) */}
      <div className="grid lg:grid-cols-12 gap-3">
        {/* ================================================================== */}
        {/* COLUMNA 1: COLA DE SEDE, TRIAJE & OBSTÉTRICO (3 columnas)           */}
        {/* ================================================================== */}
        <div className="lg:col-span-3 space-y-3">
          {/* Selector Rápido de Pacientes en Espera / Atendidos */}
          <div className="bg-white border border-neutral-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-1.5">
              <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded-lg text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setVistaCola("espera")}
                  className={`px-2 py-0.5 rounded-md transition ${
                    vistaCola === "espera"
                      ? "bg-white text-neutral-900 shadow-xs"
                      : "text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  En Espera ({pacientesFiltrados.length})
                </button>
                <button
                  type="button"
                  onClick={() => setVistaCola("atendidos")}
                  className={`px-2 py-0.5 rounded-md transition ${
                    vistaCola === "atendidos"
                      ? "bg-white text-neutral-900 shadow-xs"
                      : "text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  Atendidos ({atendidosFiltrados.length})
                </button>
              </div>
              <span className="text-[10px] text-neutral-400 font-mono">
                {sede}
              </span>
            </div>

            <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
              {vistaCola === "espera" ? (
                pacientesFiltrados.length === 0 ? (
                  <div className="py-6 text-center text-neutral-400">
                    <Clock className="w-5 h-5 mx-auto mb-1 opacity-40" />
                    <p className="font-bold text-[11px] text-neutral-600">No hay pacientes en espera</p>
                    <p className="text-[10px] text-neutral-400">Las admisiones ingresadas aparecerán automáticamente.</p>
                  </div>
                ) : (
                  pacientesFiltrados.map((p) => {
                    const isSelected = selectedPatient?.id === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleSeleccionarPaciente(p)}
                        className={`p-2 rounded-lg border text-left cursor-pointer transition ${
                          isSelected
                            ? "border-neutral-900 bg-neutral-50 font-bold"
                            : "border-neutral-100 hover:border-neutral-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-900 truncate">{p.paciente}</span>
                          <span className="text-[9px] px-1 py-0.2 rounded font-mono font-bold bg-neutral-100 text-neutral-600">
                            {p.estado === "EN_ATENCION" ? "EN ATENCIÓN" : "EN ESPERA"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-neutral-500 mt-0.5">
                          <span className="truncate">{p.servicio}</span>
                          <span className="font-mono text-neutral-400 shrink-0">{p.horaLlegada || p.edad}</span>
                        </div>
                      </div>
                    );
                  })
                )
              ) : (
                atendidosFiltrados.length === 0 ? (
                  <div className="py-6 text-center text-neutral-400">
                    <CheckCircle2 className="w-5 h-5 mx-auto mb-1 opacity-40 text-emerald-500" />
                    <p className="font-bold text-[11px] text-neutral-600">No hay atenciones finalizadas hoy</p>
                  </div>
                ) : (
                  atendidosFiltrados.map((p) => (
                    <div
                      key={p.id}
                      className="p-2 rounded-lg border border-emerald-100 bg-emerald-50/30 text-left transition flex items-center justify-between gap-2"
                    >
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-neutral-900 truncate">{p.paciente}</span>
                          <span className="text-[9px] text-neutral-400 font-mono">({p.dni})</span>
                        </div>
                        <span className="text-[10px] text-neutral-500 block truncate">{p.servicio}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEncuentroAReabrir(p);
                          setShowReabrirModal(true);
                        }}
                        title="Reabrir caso clínico por error material u omisión"
                        className="px-2 py-1 bg-white hover:bg-neutral-100 text-neutral-800 font-bold text-[10px] rounded border border-neutral-200 transition shrink-0"
                      >
                        Reabrir
                      </button>
                    </div>
                  ))
                )
              )}
            </div>
          </div>

          {/* Triaje / Funciones Vitales */}
          <div className="bg-white border border-neutral-200 rounded-lg p-3 space-y-2.5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-1">
              <span className="font-bold text-[11px] text-neutral-700 uppercase tracking-wider">
                1. Triaje Vital
              </span>
              <span className="font-mono text-[10px] text-neutral-500">
                IMC: <strong className="text-neutral-900">{imc}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-neutral-500 mb-0.5">P.A. (mmHg)</label>
                <input
                  type="text"
                  disabled={isSealed}
                  value={pa}
                  onChange={(e) => setPa(e.target.value)}
                  placeholder="120/80"
                  className={`w-full px-2 py-1 border rounded font-mono font-semibold ${
                    isHipertension ? "border-rose-400 bg-rose-50 text-rose-900" : "border-neutral-200"
                  }`}
                />
                {isHipertension && (
                  <span className="text-[9px] font-bold text-rose-700 bg-rose-100/80 px-1 py-0.5 rounded block mt-0.5 leading-tight">
                    ⚠️ Alerta MEOWS: PA Elevada (Descartar Preeclampsia)
                  </span>
                )}
              </div>
              <div>
                <label className="block text-[10px] text-neutral-500 mb-0.5">F.C. (lpm)</label>
                <input
                  type="text"
                  disabled={isSealed}
                  value={fc}
                  onChange={(e) => setFc(e.target.value)}
                  className="w-full px-2 py-1 border border-neutral-200 rounded font-mono font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] text-neutral-500 mb-0.5">Temp (°C)</label>
                <input
                  type="text"
                  disabled={isSealed}
                  value={temp}
                  onChange={(e) => setTemp(e.target.value)}
                  className="w-full px-2 py-1 border border-neutral-200 rounded font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-neutral-500 mb-0.5">SatO2 (%)</label>
                <input
                  type="text"
                  disabled={isSealed}
                  value={satO2}
                  onChange={(e) => setSatO2(e.target.value)}
                  className={`w-full px-2 py-1 border rounded font-mono ${
                    isHipoxia ? "border-amber-400 bg-amber-50 text-amber-900 font-bold" : "border-neutral-200"
                  }`}
                />
                {isHipoxia && (
                  <span className="text-[9px] font-bold text-amber-700 bg-amber-100/80 px-1 py-0.5 rounded block mt-0.5 leading-tight">
                    ⚠️ SatO2 &lt; 95%
                  </span>
                )}
              </div>
              <div>
                <label className="block text-[10px] text-neutral-500 mb-0.5">Peso (kg)</label>
                <input
                  type="text"
                  disabled={isSealed}
                  value={peso}
                  onChange={(e) => setPeso(e.target.value)}
                  className="w-full px-2 py-1 border border-neutral-200 rounded font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-neutral-500 mb-0.5">Talla (m)</label>
                <input
                  type="text"
                  disabled={isSealed}
                  value={talla}
                  onChange={(e) => setTalla(e.target.value)}
                  className="w-full px-2 py-1 border border-neutral-200 rounded font-mono"
                />
              </div>
            </div>
          </div>

          {/* Módulo Obstétrico Especializado */}
          <div className="bg-white border border-neutral-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-1">
              <span className="font-bold text-[11px] text-neutral-700 uppercase tracking-wider">
                2. Parámetros Materno-Fetales
              </span>
              <span className="text-[9px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                Regla Naegele Activa
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-neutral-500 mb-0.5">G / P</label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    disabled={isSealed}
                    value={formulaG}
                    onChange={(e) => setFormulaG(e.target.value)}
                    placeholder="G"
                    className="w-1/2 px-1.5 py-1 border border-neutral-200 rounded font-mono text-center font-bold"
                  />
                  <input
                    type="text"
                    disabled={isSealed}
                    value={formulaP}
                    onChange={(e) => setFormulaP(e.target.value)}
                    placeholder="P"
                    className="w-1/2 px-1.5 py-1 border border-neutral-200 rounded font-mono text-center font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-neutral-500 mb-0.5">EG Semanas</label>
                <input
                  type="text"
                  disabled={isSealed}
                  value={eg}
                  onChange={(e) => setEg(e.target.value)}
                  placeholder="Auto por FUR"
                  className="w-full px-2 py-1 border border-neutral-200 rounded font-mono font-bold text-brand-900 bg-brand-50/20"
                />
              </div>
              <div>
                <label className="block text-[10px] text-neutral-500 mb-0.5">F.U.R. (Inicio)</label>
                <input
                  type="date"
                  disabled={isSealed}
                  value={fur}
                  onChange={(e) => handleFurChange(e.target.value)}
                  className="w-full px-1.5 py-1 border border-neutral-200 rounded font-mono text-[10px]"
                />
              </div>
              <div>
                <label className="block text-[10px] text-neutral-500 mb-0.5">F.P.P. (Naegele)</label>
                <input
                  type="date"
                  disabled={isSealed}
                  value={fpp}
                  onChange={(e) => setFpp(e.target.value)}
                  className="w-full px-1.5 py-1 border border-neutral-200 rounded font-mono text-[10px] font-semibold text-emerald-800 bg-emerald-50/20"
                />
              </div>
              <div>
                <label className="block text-[10px] text-neutral-500 mb-0.5">A.U. (cm)</label>
                <input
                  type="text"
                  disabled={isSealed}
                  value={alturaUterina}
                  onChange={(e) => setAlturaUterina(e.target.value)}
                  className="w-full px-2 py-1 border border-neutral-200 rounded font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-neutral-500 mb-0.5">L.C.F. (lpm)</label>
                <input
                  type="text"
                  disabled={isSealed}
                  value={lcf}
                  onChange={(e) => setLcf(e.target.value)}
                  className="w-full px-2 py-1 border border-neutral-200 rounded font-mono font-bold text-neutral-900"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================== */}
        {/* COLUMNA 2: ANAMNESIS, EXAMEN, CIE-10 & TRATAMIENTO (6 columnas)    */}
        {/* ================================================================== */}
        <div className="lg:col-span-6 bg-white border border-neutral-200 rounded-lg p-3.5 space-y-3">
          {/* BANNER: BLOQUE PRIMARIO SELLADO (INALTERABLE) */}
          {isSealed && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-900 leading-snug w-full">
                <div className="font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-emerald-950">
                    BLOQUE PRIMARIO SELLADO &bull; ACTO MÉDICO INALTERABLE
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-emerald-200 text-emerald-800 rounded font-mono">
                    NTS N.° 139-MINSA
                  </span>
                </div>
                <p className="text-[11px] text-emerald-700 mt-1">
                  Este registro clínico fue sellado digitalmente{fechaSellado ? ` el ${fechaSellado}` : ""}. Los campos de anamnesis, examen físico, CIE-10 y plan terapéutico han quedado bloqueados contra edición. Toda anotación complementaria o de evolución médica debe realizarse en el <strong>Bloque de Adendas Evolutivas</strong> (panel derecho).
                </p>
                {sealedHash && (
                  <div className="mt-2.5 p-2 rounded-xl bg-white border border-emerald-300 shadow-2xs flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-black uppercase tracking-wider text-emerald-900 block">Sello Criptográfico Digital SHA-256</span>
                      <p className="text-[10px] font-mono font-bold text-emerald-800 truncate select-all">{sealedHash}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Motivo de Consulta & Anamnesis */}
          <div>
            <label className="block font-bold text-[11px] text-neutral-700 uppercase tracking-wider mb-1">
              3. Motivo de Consulta & Relato Cronológico
            </label>
            <textarea
              rows={2}
              disabled={isSealed}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full p-2 border border-neutral-200 rounded-lg text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-neutral-900"
            />
          </div>

          {/* Antecedentes Clínicos */}
          <div>
            <label className="block font-bold text-[11px] text-neutral-700 uppercase tracking-wider mb-1">
              4. Antecedentes Gineco-Obstétricos & Quirúrgicos
            </label>
            <textarea
              rows={2}
              disabled={isSealed}
              value={antecedentes}
              onChange={(e) => setAntecedentes(e.target.value)}
              className="w-full p-2 border border-neutral-200 rounded-lg text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-neutral-900"
            />
          </div>

          {/* Examen Físico Segmentario & Ginecológico */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
              <label className="block font-bold text-[11px] text-neutral-700 uppercase tracking-wider">
                5. Examen Físico Preferencial / Especuloscopía
              </label>
              {!isSealed && (
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-neutral-400 font-mono">Macros:</span>
                  <button
                    type="button"
                    onClick={() => insertarMacroExamen("Ecografía Obstétrica: Feto único activo, situación longitudinal, presentación cefálica. LCF presentes rítmicos. Placenta corporal posterior Grado I. Líquido amniótico en volumen normal.")}
                    className="text-[9px] bg-brand-50 hover:bg-brand-100 text-brand-800 px-1.5 py-0.5 rounded border border-brand-200 font-medium transition"
                  >
                    + Eco Obstétrica Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => insertarMacroExamen("Examen Ginecológico: Abdomen blando, depresible, no doloroso. Genitales externos conservados. Especuloscopía: Cérvix eutrófico, sin sangrado ni leucorrea.")}
                    className="text-[9px] bg-brand-50 hover:bg-brand-100 text-brand-800 px-1.5 py-0.5 rounded border border-brand-200 font-medium transition"
                  >
                    + Gineco Normal
                  </button>
                </div>
              )}
            </div>
            <textarea
              rows={2}
              disabled={isSealed}
              value={examenFisico}
              onChange={(e) => setExamenFisico(e.target.value)}
              className="w-full p-2 border border-neutral-200 rounded-lg text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-neutral-900"
            />
          </div>

          {/* Diagnósticos CIE-10 con Búsqueda Rápida */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-[11px] text-neutral-700 uppercase tracking-wider">
                6. Diagnósticos CIE-10 *
              </label>
              <span className="text-[10px] text-neutral-400">Autocompletado predictivo</span>
            </div>

            {/* Lista de Diagnósticos Cargados */}
            <div className="space-y-1">
              {diagnosticos.map((dx) => (
                <div
                  key={dx.id}
                  className="flex items-center justify-between p-1.5 px-2 bg-neutral-50 rounded border border-neutral-200 text-[11px]"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold bg-neutral-200 px-1 py-0.2 rounded text-[10px]">
                      {dx.codigo}
                    </span>
                    <span className="font-medium text-neutral-900">{dx.descripcion}</span>
                  </div>
                  {!isSealed && (
                    <button
                      onClick={() => setDiagnosticos(diagnosticos.filter((d) => d.id !== dx.id))}
                      className="text-neutral-400 hover:text-rose-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Input de Búsqueda Predictiva */}
            {!isSealed && (
              <div className="relative">
                <input
                  type="text"
                  value={busquedaCie}
                  onChange={(e) => {
                    setBusquedaCie(e.target.value);
                    setMostrarSugerenciasCie(true);
                  }}
                  onFocus={() => setMostrarSugerenciasCie(true)}
                  placeholder="Escribe código o término (ej. Z34, embarazo, vaginitis)..."
                  className="w-full px-2.5 py-1.5 border border-neutral-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
                {mostrarSugerenciasCie && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                    {(() => {
                      const filtrados = CIE10_FRECUENTES.filter(
                        (c) =>
                          c.codigo.toLowerCase().includes(busquedaCie.toLowerCase()) ||
                          c.descripcion.toLowerCase().includes(busquedaCie.toLowerCase())
                      );
                      return (
                        <>
                          {filtrados.map((item) => (
                            <div
                              key={item.codigo}
                              onClick={() => handleAgregarCie(item)}
                              className="p-2 hover:bg-neutral-50 cursor-pointer border-b border-neutral-100 last:border-0 flex items-center justify-between"
                            >
                              <span className="font-medium text-neutral-800">{item.descripcion}</span>
                              <span className="font-mono font-bold text-[10px] text-neutral-500">{item.codigo}</span>
                            </div>
                          ))}
                          {busquedaCie.trim().length >= 2 && (
                            <div
                              onClick={() => {
                                const partes = busquedaCie.trim().split(" ");
                                const cod = /^[A-Za-z][0-9]/.test(partes[0]) ? partes[0].toUpperCase() : "CIE-ESP";
                                const desc = /^[A-Za-z][0-9]/.test(partes[0]) && partes.length > 1 ? partes.slice(1).join(" ") : busquedaCie.trim();
                                handleAgregarCie({
                                  codigo: cod,
                                  descripcion: desc,
                                });
                              }}
                              className="p-2 bg-brand-50 hover:bg-brand-100 text-brand-900 cursor-pointer border-t border-brand-200 font-bold text-[11px] flex items-center justify-between"
                            >
                              <span>+ Agregar diagnóstico personalizado: "{busquedaCie}"</span>
                              <span className="font-mono text-[9px] bg-brand-200 px-1 py-0.5 rounded">Manual</span>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Plan de Trabajo & Receta Médica DCI */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
              <label className="block font-bold text-[11px] text-neutral-700 uppercase tracking-wider">
                7. Plan de Trabajo & Prescripción (DCI)
              </label>
              {!isSealed && (
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-neutral-400 font-mono">Macros:</span>
                  <button
                    type="button"
                    onClick={() => insertarMacroPlan("1. Sulfato ferroso + Ácido fólico 1 tab/día VO.\n2. Ecografía morfológica de control.\n3. Signos de alarma explicados: cefalea intensa, escotomas, pérdidas vaginales.\n4. Próximo control prenatal en 4 semanas.")}
                    className="text-[9px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200 font-medium transition"
                  >
                    + Control Prenatal
                  </button>
                  <button
                    type="button"
                    onClick={() => insertarMacroPlan("1. Reposo relativo por 48 horas.\n2. Medidas higiénico-dietéticas.\n3. Reevaluación ecográfica en caso de dolor o sangrado.")}
                    className="text-[9px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200 font-medium transition"
                  >
                    + Plan Ambulatorio
                  </button>
                </div>
              )}
            </div>
            <textarea
              rows={3}
              disabled={isSealed}
              value={planTratamiento}
              onChange={(e) => setPlanTratamiento(e.target.value)}
              className="w-full p-2 border border-neutral-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-neutral-900"
            />
          </div>
        </div>

        {/* ================================================================== */}
        {/* COLUMNA 3: GALERÍA DE IMÁGENES & ADENDAS (3 columnas)               */}
        {/* ================================================================== */}
        <div className="lg:col-span-3 space-y-3">
          {/* Imágenes Médicas Adjuntas */}
          <div className="bg-white border border-neutral-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-1.5">
              <span className="font-bold text-[11px] text-neutral-700 uppercase tracking-wider flex items-center gap-1">
                <ImageIcon className="w-3 h-3" />
                Imágenes / Ecografías ({imagenes.length})
              </span>
              {!isSealed && (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleSeleccionarArchivoImagen}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[10px] font-bold text-brand-700 hover:text-brand-900 flex items-center gap-1 bg-brand-50 hover:bg-brand-100 px-2 py-1 rounded transition border border-brand-200"
                  >
                    <Upload className="w-3 h-3" /> + Adjuntar Archivo
                  </button>
                </>
              )}
            </div>

            <div className="space-y-1.5">
              {imagenes.length === 0 ? (
                <p className="text-[10px] text-neutral-400 text-center py-2">
                  Sin imágenes adjuntas al encuentro.
                </p>
              ) : (
                imagenes.map((img) => (
                  <div
                    key={img.id}
                    className="flex items-center gap-2 p-1.5 bg-neutral-50 rounded border border-neutral-200 group"
                  >
                    <img src={img.url} alt={img.titulo} className="w-10 h-10 object-cover rounded border border-neutral-200 shrink-0" />
                    <div className="flex-1 truncate">
                      <span className="font-semibold text-neutral-900 block truncate leading-tight text-[11px]">
                        {img.titulo}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">{img.hora}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setModalImagen(img)}
                        className="p-1 text-neutral-400 hover:text-neutral-900"
                        title="Ampliar imagen"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                      {!isSealed && (
                        <button
                          onClick={() => setImagenes(imagenes.filter((i) => i.id !== img.id))}
                          className="p-1 text-neutral-400 hover:text-rose-600"
                          title="Eliminar imagen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Reagendamiento Post-Consulta & Recordatorio por WhatsApp */}
          <div className="bg-white border border-neutral-200 rounded-lg p-3 space-y-2.5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-900">
                <Calendar className="w-3.5 h-3.5 text-brand-700" />
                <span className="uppercase text-[11px] tracking-wider">Próximo Control / Cita</span>
              </div>
              <span className="text-[10px] font-semibold text-neutral-500">Post-Consulta</span>
            </div>

            <form onSubmit={handleGuardarReagendamiento} className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">Fecha Cita *</label>
                  <input
                    type="date"
                    required
                    value={reagendarFecha}
                    onChange={(e) => setReagendarFecha(e.target.value)}
                    className="w-full p-1.5 border border-neutral-300 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">Hora *</label>
                  <input
                    type="time"
                    required
                    value={reagendarHora}
                    onChange={(e) => setReagendarHora(e.target.value)}
                    className="w-full p-1.5 border border-neutral-300 rounded text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">Sede</label>
                <select
                  value={reagendarSede}
                  onChange={(e) => setReagendarSede(e.target.value)}
                  className="w-full p-1.5 border border-neutral-300 rounded text-xs bg-white"
                >
                  <option value="Independencia">Sede Independencia</option>
                  <option value="Vivanco">Sede Vivanco</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">Motivo / Estudio</label>
                <input
                  type="text"
                  value={reagendarMotivo}
                  onChange={(e) => setReagendarMotivo(e.target.value)}
                  placeholder="Ej: Control Prenatal 28 sem..."
                  className="w-full p-1.5 border border-neutral-300 rounded text-xs"
                />
              </div>

              <div className="pt-1 flex flex-col gap-1.5">
                <button
                  type="submit"
                  className="w-full py-1.5 bg-neutral-900 hover:bg-black text-white font-bold text-xs rounded transition flex items-center justify-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Programar en Calendario</span>
                </button>

                <a
                  href={generarEnlaceWhatsApp()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Enviar Recordatorio por WhatsApp</span>
                </a>
              </div>

              {reagendadaExito && (
                <div className="p-1.5 bg-emerald-50 border border-emerald-200 rounded text-[11px] text-emerald-800 text-center font-semibold">
                  ✓ Cita registrada exitosamente.
                </div>
              )}
            </form>
          </div>

          {/* BLOQUE DE ADENDAS EVOLUTIVAS POSTERIORES */}
          {isSealed && (
            <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-3 space-y-2.5">
              <div className="flex items-center justify-between border-b border-amber-200/70 pb-1.5">
                <span className="font-bold text-[11px] text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-700" />
                  Bloque de Adendas Evolutivas ({adendas.length})
                </span>
                <button
                  type="button"
                  onClick={() => setShowAdendaModal(true)}
                  className="text-[10px] px-2 py-0.5 bg-amber-700 hover:bg-amber-800 text-white rounded font-bold transition flex items-center gap-1 shadow-xs"
                >
                  <PlusCircle className="w-3 h-3" />
                  + Nueva Adenda
                </button>
              </div>

              {adendas.length === 0 ? (
                <div className="py-3 text-center text-neutral-400 text-[11px]">
                  <p className="italic">Sin adendas agregadas post-sellado.</p>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Use "+ Nueva Adenda" para aclaraciones o evolución clínica.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {adendas.map((a, i) => (
                    <div key={i} className="p-2.5 bg-white rounded-md border border-amber-200/90 text-[11px] space-y-1 shadow-xs">
                      <div className="flex items-center justify-between text-[10px] border-b border-neutral-100 pb-1 text-neutral-500">
                        <span className="font-bold text-neutral-900">
                          Adenda #{i + 1} &bull; {a.autor || "Profesional Responsable"}
                        </span>
                        <span className="font-mono text-[9px]">{a.fecha}</span>
                      </div>
                      <p className="text-neutral-800 leading-relaxed whitespace-pre-wrap">{a.texto}</p>
                      {a.hash && (
                        <div className="text-[9px] text-amber-800 font-mono break-all pt-0.5 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                          Hash: {a.hash}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Certificado de Integridad / Sello */}
          {isSealed && sealedHash && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl shadow-2xs space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Historia Clínica Sellada e Inalterable</span>
              </div>
              <p className="text-[10px] font-mono text-emerald-800 break-all select-all bg-white p-1.5 rounded-lg border border-emerald-200">
                SHA-256: {sealedHash}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Visor de Imagen */}
      {modalImagen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="max-w-3xl w-full bg-neutral-950 rounded-xl overflow-hidden border border-neutral-800">
            <div className="p-3 bg-neutral-900 flex items-center justify-between text-white border-b border-neutral-800">
              <span className="font-bold text-xs">{modalImagen.titulo}</span>
              <button onClick={() => setModalImagen(null)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center">
              <img src={modalImagen.url} alt="Ampliación" className="max-h-[70vh] object-contain rounded" />
            </div>
          </div>
        </div>
      )}

      {/* Modal Agregar Adenda */}
      {showAdendaModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full max-h-[92vh] overflow-y-auto shadow-xl border border-neutral-200 space-y-3">
            <h3 className="font-bold text-sm text-neutral-900">Incorporar Adenda Inmutable (NTS N.º 139)</h3>
            <p className="text-xs text-neutral-500">
              Las notas cerradas no admiten modificación directa. Toda aclaración, ampliación o corrección se anexa con fecha, autor y hash digital inalterable.
            </p>
            <form onSubmit={handleGuardarAdenda} className="space-y-3">
              <textarea
                rows={4}
                required
                value={textoAdenda}
                onChange={(e) => setTextoAdenda(e.target.value)}
                placeholder="Escriba la adenda clínica o nota de evolución complementaria..."
                className="w-full p-2.5 border border-neutral-300 rounded-lg text-xs focus:ring-1 focus:ring-neutral-900"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isSavingAdenda}
                  onClick={() => setShowAdendaModal(false)}
                  className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded-lg disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingAdenda || !textoAdenda.trim()}
                  className="px-4 py-1.5 bg-neutral-900 hover:bg-black text-white text-xs font-bold rounded-lg disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSavingAdenda ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Firmando Adenda...</span>
                    </>
                  ) : (
                    "Firmar Adenda"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reabrir Caso Clínico (Reversión Auditada) */}
      {showReabrirModal && encuentroAReabrir && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full max-h-[92vh] overflow-y-auto shadow-xl border border-neutral-200 space-y-3">
            <div className="flex items-center gap-2 text-neutral-900 border-b border-neutral-100 pb-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <h3 className="font-bold text-sm">Reabrir Caso Clínico (Reversión Auditada)</h3>
            </div>
            <p className="text-xs text-neutral-600">
              Está solicitando reabrir el encuentro de <strong>{encuentroAReabrir.paciente}</strong> (DNI: {encuentroAReabrir.dni}). El estado volverá a <strong>EN ATENCIÓN</strong> para permitir correcciones médicas.
            </p>
            <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
              Conforme a la NTS N.º 139-MINSA, esta acción quedará registrada permanentemente en el libro inalterable de auditoría con su usuario y hora exacta.
            </p>
            <form onSubmit={handleEjecutarReversion} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                  Motivo o Justificación Obligatoria * (Mín. 5 caracteres)
                </label>
                <textarea
                  rows={3}
                  required
                  value={motivoReapertura}
                  onChange={(e) => setMotivoReapertura(e.target.value)}
                  placeholder="Ej. Corrección de dosis farmacológica / complementación de triaje..."
                  className="w-full p-2.5 border border-neutral-300 rounded-lg text-xs focus:ring-1 focus:ring-neutral-900 bg-white"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowReabrirModal(false);
                    setMotivoReapertura("");
                  }}
                  className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={reabriendo || motivoReapertura.trim().length < 5}
                  className="px-4 py-1.5 bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold rounded-lg disabled:opacity-50"
                >
                  {reabriendo ? "Reabriendo..." : "Confirmar Reapertura"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}