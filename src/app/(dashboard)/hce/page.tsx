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
  Activity,
  FlaskConical,
  Baby,
  Layers,
  Sparkles,
  Calculator,
  HeartPulse,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useHceSpecialty } from "@/context/HceSpecialtyContext";

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

  // --- ECOGRAFÍA GENERAL, ABDOMINAL, RENAL Y UROLÓGICA ---
  { codigo: "K76.0", descripcion: "Degeneración grasa del hígado (Hígado graso / Esteatosis)" },
  { codigo: "K80.2", descripcion: "Cálculo de la vesícula biliar sin colecistitis (Colelitiasis)" },
  { codigo: "K80.0", descripcion: "Cálculo de la vesícula biliar con colecistitis aguda" },
  { codigo: "K82.8", descripcion: "Pólipo de la vesícula biliar" },
  { codigo: "N20.0", descripcion: "Cálculo del riñón (Nefrolitiasis / Litiasis renal)" },
  { codigo: "N20.1", descripcion: "Cálculo del uréter" },
  { codigo: "N28.1", descripcion: "Quiste del riñón (Quiste renal simple)" },
  { codigo: "N13.3", descripcion: "Hidronefrosis con obstrucción / ectasia pielocalicial" },
  { codigo: "N40", descripcion: "Hiperplasia de la próstata (Hiperplasia benigna prostática - HBP)" },
  { codigo: "N41.0", descripcion: "Prostatitis aguda" },
  { codigo: "N41.1", descripcion: "Prostatitis crónica" },
  { codigo: "R35", descripcion: "Poliuria / Nicturia (Micción nocturna frecuente)" },
  { codigo: "R39.1", descripcion: "Otras dificultades de la micción (Chorro débil / pujo)" },
  { codigo: "N21.0", descripcion: "Cálculo en la vejiga (Litiasis vesical)" },
  { codigo: "R33", descripcion: "Retención de orina / Residuo postmiccional elevado" },
  { codigo: "Z12.5", descripcion: "Pesquisa especial para neoplasia de próstata (Chequeo prostático)" },
  { codigo: "D17.9", descripcion: "Tumor lipomatoso benigno (Lipoma subcutáneo / partes blandas)" },
  { codigo: "L72.0", descripcion: "Quiste epidermoide / Quiste sebáceo" },
  { codigo: "K40.9", descripcion: "Hernia inguinal unilateral o no especificada" },
  { codigo: "K42.9", descripcion: "Hernia umbilical sin obstrucción ni gangrena" },
  { codigo: "E04.1", descripcion: "Nódulo tiroideo solitario (TI-RADS)" },
  { codigo: "E04.2", descripcion: "Bocio multinodular no tóxico" },
  { codigo: "N60.2", descripcion: "Fibroadenoma de la mama (BI-RADS 2 / 3)" },
  { codigo: "R10.4", descripcion: "Dolor abdominal y pélvico no especificado" },

  // --- MEDICINA GENERAL & ATENCIÓN PRIMARIA ---
  { codigo: "J00", descripcion: "Rinofaringitis aguda (Resfriado común)" },
  { codigo: "J02.9", descripcion: "Faringitis aguda, no especificada" },
  { codigo: "J03.9", descripcion: "Amigdalitis aguda, no especificada" },
  { codigo: "J20.9", descripcion: "Bronquitis aguda, no especificada" },
  { codigo: "J06.9", descripcion: "Infección aguda de las vías respiratorias superiores" },
  { codigo: "K29.7", descripcion: "Gastritis, no especificada / Dispepsia" },
  { codigo: "K21.9", descripcion: "Enfermedad por reflujo gastroesofágico (ERGE)" },
  { codigo: "A09", descripcion: "Gastroenteritis y colitis de origen infeccioso (EDA)" },
  { codigo: "I10", descripcion: "Hipertensión esencial (primaria)" },
  { codigo: "M54.5", descripcion: "Lumbago no especificado (Lumbalgia mecánica / postural)" },
  { codigo: "M54.2", descripcion: "Cervicalgia" },
  { codigo: "G44.2", descripcion: "Cefalea tensional" },
  { codigo: "G43.9", descripcion: "Migraña, no especificada" },
  { codigo: "L23.9", descripcion: "Dermatitis alérgica de contacto, causa no especificada" },
  { codigo: "R50.9", descripcion: "Fiebre, no especificada / Síndrome febril" },
  { codigo: "E11.9", descripcion: "Diabetes mellitus tipo 2 sin mención de complicación" },
  { codigo: "E78.5", descripcion: "Hiperlipidemia, no especificada (Dislipidemia)" },
  { codigo: "D50.9", descripcion: "Anemia por deficiencia de hierro sin especificación" },
];

export function getCie10Sugeridos(
  modalidad: "OBSTETRICIA" | "GINECOLOGIA" | "MEDICINA_GENERAL" | "ECOGRAFIA" | "LABORATORIO",
  tipoEco: string
): { codigo: string; descripcion: string }[] {
  if (modalidad === "ECOGRAFIA") {
    switch (tipoEco) {
      case "PROSTATICA":
        return [
          { codigo: "N40", descripcion: "Hiperplasia benigna de próstata (HBP)" },
          { codigo: "N41.0", descripcion: "Prostatitis aguda" },
          { codigo: "N41.1", descripcion: "Prostatitis crónica" },
          { codigo: "R33", descripcion: "Retención de orina / RPM elevado" },
          { codigo: "R35", descripcion: "Poliuria / Nicturia frecuente" },
          { codigo: "R39.1", descripcion: "Dificultad de micción (Chorro débil)" },
          { codigo: "Z12.5", descripcion: "Pesquisa / Despistaje prostático" },
        ];
      case "ABDOMINAL":
        return [
          { codigo: "K76.0", descripcion: "Esteatosis hepática (Hígado graso)" },
          { codigo: "K80.2", descripcion: "Cálculo de vesícula (Colelitiasis)" },
          { codigo: "K80.0", descripcion: "Colelitiasis con colecistitis" },
          { codigo: "K82.8", descripcion: "Pólipo de la vesícula biliar" },
          { codigo: "R10.4", descripcion: "Dolor abdominal no especificado" },
        ];
      case "RENAL":
        return [
          { codigo: "N20.0", descripcion: "Cálculo de riñón (Nefrolitiasis)" },
          { codigo: "N20.1", descripcion: "Cálculo del uréter" },
          { codigo: "N28.1", descripcion: "Quiste renal simple" },
          { codigo: "N13.3", descripcion: "Hidronefrosis / ectasia pielocalicial" },
          { codigo: "N39.0", descripcion: "Infección de tracto urinario (ITU)" },
        ];
      case "PARTES_BLANDAS":
        return [
          { codigo: "D17.9", descripcion: "Lipoma en tejido celular subcutáneo" },
          { codigo: "L72.0", descripcion: "Quiste epidermoide / sebáceo" },
          { codigo: "K40.9", descripcion: "Hernia inguinal" },
          { codigo: "K42.9", descripcion: "Hernia umbilical" },
        ];
      case "MAMARIA":
        return [
          { codigo: "N60.2", descripcion: "Fibroadenoma de mama (BI-RADS 2/3)" },
          { codigo: "N60.9", descripcion: "Displasia mamaria benigna" },
          { codigo: "N64.4", descripcion: "Mastodinia / Dolor mamario" },
          { codigo: "N61", descripcion: "Mastitis inflamatoria" },
        ];
      case "TIROIDEA":
        return [
          { codigo: "E04.1", descripcion: "Nódulo tiroideo solitario (TI-RADS)" },
          { codigo: "E04.2", descripcion: "Bocio multinodular no tóxico" },
        ];
      case "TRANSVAGINAL":
        return [
          { codigo: "D25.9", descripcion: "Mioma uterino (Miomatosis)" },
          { codigo: "D25.1", descripcion: "Mioma intramural" },
          { codigo: "N83.2", descripcion: "Quiste de ovario no especificado" },
          { codigo: "E28.2", descripcion: "Síndrome de ovario poliquístico (SOP)" },
          { codigo: "N80.9", descripcion: "Endometriosis pélvica" },
          { codigo: "N84.0", descripcion: "Pólipo endometrial" },
          { codigo: "O00.9", descripcion: "Sospecha de embarazo ectópico" },
        ];
      case "OBSTETRICA":
      default:
        return [
          { codigo: "Z34.0", descripcion: "Supervisión primer embarazo normal" },
          { codigo: "Z34.8", descripcion: "Supervisión otros embarazos normales" },
          { codigo: "Z36.8", descripcion: "Pesquisa ecográfica prenatal" },
          { codigo: "O20.0", descripcion: "Amenaza de aborto" },
          { codigo: "O60.0", descripcion: "Amenaza de parto prematuro" },
          { codigo: "O13", descripcion: "Hipertensión gestacional" },
          { codigo: "O44.0", descripcion: "Placenta previa sin sangrado" },
        ];
    }
  }
  if (modalidad === "OBSTETRICIA") {
    return [
      { codigo: "Z34.0", descripcion: "Supervisión de primer embarazo normal" },
      { codigo: "Z34.8", descripcion: "Supervisión de otros embarazos normales" },
      { codigo: "O20.0", descripcion: "Amenaza de aborto" },
      { codigo: "O13", descripcion: "Hipertensión gestacional sin proteinuria" },
      { codigo: "O14.0", descripcion: "Preeclampsia leve a moderada" },
      { codigo: "O24.4", descripcion: "Diabetes mellitus gestacional" },
      { codigo: "O23.4", descripcion: "Infección urinaria en el embarazo" },
      { codigo: "O99.0", descripcion: "Anemia que complica el embarazo" },
      { codigo: "Z30.0", descripcion: "Consejo y asesoramiento anticonceptivo" },
    ];
  }
  if (modalidad === "GINECOLOGIA") {
    return [
      { codigo: "N76.0", descripcion: "Vaginitis aguda / Vulvovaginitis" },
      { codigo: "N72", descripcion: "Cervicitis / Inflamación cuello uterino" },
      { codigo: "N86", descripcion: "Erosión de cuello uterino (Úlcera)" },
      { codigo: "N87.0", descripcion: "Displasia cervical leve (NIC I)" },
      { codigo: "D25.9", descripcion: "Leiomioma del útero (Miomatosis)" },
      { codigo: "E28.2", descripcion: "Síndrome ovario poliquístico (SOP)" },
      { codigo: "N83.2", descripcion: "Quiste de ovario" },
      { codigo: "N92.0", descripcion: "Menorragia / Menstruación excesiva" },
      { codigo: "N95.1", descripcion: "Estados menopáusicos y climaterio" },
      { codigo: "Z30.1", descripcion: "Inserción o retiro de DIU" },
      { codigo: "Z30.8", descripcion: "Inserción de implante subdérmico" },
      { codigo: "N39.0", descripcion: "Infección urinaria baja (ITU)" },
    ];
  }
  if (modalidad === "MEDICINA_GENERAL") {
    return [
      { codigo: "J00", descripcion: "Resfriado común (Rinofaringitis)" },
      { codigo: "J02.9", descripcion: "Faringitis aguda" },
      { codigo: "K29.7", descripcion: "Gastritis no especificada / Dispepsia" },
      { codigo: "A09", descripcion: "Gastroenteritis aguda (EDA)" },
      { codigo: "I10", descripcion: "Hipertensión esencial (primaria)" },
      { codigo: "M54.5", descripcion: "Lumbalgia mecánica / postural" },
      { codigo: "G44.2", descripcion: "Cefalea tensional" },
      { codigo: "E11.9", descripcion: "Diabetes mellitus tipo 2" },
      { codigo: "N39.0", descripcion: "Infección de tracto urinario (ITU)" },
    ];
  }
  if (modalidad === "LABORATORIO") {
    return [
      { codigo: "D50.9", descripcion: "Anemia por deficiencia de hierro" },
      { codigo: "N39.0", descripcion: "Infección del tracto urinario (ITU)" },
      { codigo: "E11.9", descripcion: "Diabetes mellitus tipo 2" },
      { codigo: "E78.5", descripcion: "Hiperlipidemia (Dislipidemia)" },
      { codigo: "Z01.7", descripcion: "Examen de laboratorio de rutina" },
      { codigo: "Z32.1", descripcion: "Confirmación de embarazo (GCH)" },
    ];
  }
  return [];
}

export default function HcePage() {
  const [sede, setSede] = useState<string>("Independencia");
  const [profesionalNombre, setProfesionalNombre] = useState<string>("Profesional de Turno");
  const [colegiatura, setColegiatura] = useState<string>("");

  // Pacientes en cola del consultorio (Cargados desde Supabase en Tiempo Real)
  const [pacientesCola, setPacientesCola] = useState<PacienteEnConsulta[]>([]);
  const [atendidosHoy, setAtendidosHoy] = useState<PacienteEnConsulta[]>([]);
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

  // ============================================================================
  // ESPECIALIZACIÓN DE FORMATOS Y MODALIDAD ASISTENCIAL (NTS N.° 139-MINSA)
  const {
    modalidadAtencion,
    setModalidadAtencion,
    tipoEcografia,
    setTipoEcografia,
    setPacientesEspera,
    setPacientesAtendidos,
    selectedPatientId,
    setSelectedPatientId,
    vistaCola,
    setVistaCola,
    setSedeCola,
    setOnSelectPatient,
    setOnReopenPatient,
  } = useHceSpecialty();

  // Pestaña activa de herramientas secundarias inferiores (Solución A)
  const [herramientaActiva, setHerramientaActiva] = useState<"imagenes" | "reagendar" | "adendas">("imagenes");

  // Identificación regulatoria oficial según Ley N.° 23346 (Obstetras) vs Ley N.° 15125 (Médicos)
  const getCargoProfesional = () => {
    switch (modalidadAtencion) {
      case "OBSTETRICIA":
        return {
          cargo: "Obstetra (Salud Materno-Perinatal)",
          registro: colegiatura ? `COP ${colegiatura}` : "COP 13102",
          badgeColor: "bg-rose-50 text-rose-800 border-rose-200",
          leyRef: "Ley N.° 23346 (Acto Obstétrico)",
        };
      case "GINECOLOGIA":
        return {
          cargo: "Médico Ginecólogo-Obstetra",
          registro: colegiatura ? `CMP ${colegiatura}` : "CMP 72450 • RNE",
          badgeColor: "bg-purple-50 text-purple-800 border-purple-200",
          leyRef: "Ley N.° 15125 (Acto Médico Especializado)",
        };
      case "ECOGRAFIA":
        return {
          cargo: "Médico Ecografista",
          registro: colegiatura ? `CMP ${colegiatura}` : "CMP Colegiado",
          badgeColor: "bg-sky-50 text-sky-800 border-sky-200",
          leyRef: "Diagnóstico por Imágenes",
        };
      case "MEDICINA_GENERAL":
        return {
          cargo: "Médico Cirujano",
          registro: colegiatura ? `CMP ${colegiatura}` : "CMP Colegiado",
          badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
          leyRef: "Ley N.° 15125 (Medicina General)",
        };
      case "LABORATORIO":
        return {
          cargo: "Responsable de Laboratorio POCT",
          registro: colegiatura || "POCT Certificado",
          badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
          leyRef: "Tamizaje Clínico & Pruebas Rápidas",
        };
    }
  };

  // 1. Ecografía Prostática & Vesicoprostática (Cálculo Automático)
  const [prostataDt, setProstataDt] = useState(""); // Diámetro Transverso en mm
  const [prostataDap, setProstataDap] = useState(""); // Diámetro Anteroposterior en mm
  const [prostataDl, setProstataDl] = useState(""); // Diámetro Longitudinal en mm
  const [prostataVejigaPre, setProstataVejigaPre] = useState(""); // Volumen vesical pre (cc)
  const [prostataResiduoPost, setProstataResiduoPost] = useState(""); // Volumen residual post (cc)
  const [prostataLobuloMedio, setProstataLobuloMedio] = useState("No protruye al piso vesical");

  // Cálculo automático del volumen prostático por elipsoide: (DT * DAP * DL * 0.52) / 1000 = cc
  const dtMm = parseFloat(prostataDt) || 0;
  const dapMm = parseFloat(prostataDap) || 0;
  const dlMm = parseFloat(prostataDl) || 0;
  const volumenProstataCc =
    dtMm > 0 && dapMm > 0 && dlMm > 0
      ? ((dtMm * dapMm * dlMm * 0.52) / 1000).toFixed(1)
      : "0.0";

  const preVesicalNum = parseFloat(prostataVejigaPre) || 0;
  const postVesicalNum = parseFloat(prostataResiduoPost) || 0;
  const porcentajeResiduo =
    preVesicalNum > 0 && postVesicalNum >= 0
      ? ((postVesicalNum / preVesicalNum) * 100).toFixed(0)
      : "0";

  const volNum = parseFloat(volumenProstataCc) || 0;
  const gradoHbp =
    volNum <= 0
      ? "Normal"
      : volNum < 25
      ? "Normal (< 25 cc)"
      : volNum < 40
      ? "Grado I (25 - 40 cc)"
      : volNum < 60
      ? "Grado II (40 - 60 cc)"
      : volNum < 80
      ? "Grado III (60 - 80 cc)"
      : "Grado IV (> 80 cc)";

  // 2. Ecografía Fetal / Obstétrica estructurada
  const [ecoDbp, setEcoDbp] = useState("");
  const [ecoLf, setEcoLf] = useState("");
  const [ecoCa, setEcoCa] = useState("");
  const [ecoPfe, setEcoPfe] = useState("");
  const [ecoFcf, setEcoFcf] = useState("");
  const [ecoPlacenta, setEcoPlacenta] = useState("Normoinserta posterior fúndica Grado I");
  const [ecoIla, setEcoIla] = useState("Volumen normal");

  // 3. Ecografía Abdominal Completa
  const [ecoHigado, setEcoHigado] = useState("");
  const [ecoVesicula, setEcoVesicula] = useState("");
  const [ecoPancreasBazo, setEcoPancreasBazo] = useState("");
  const [ecoLiquidoLibre, setEcoLiquidoLibre] = useState("No se observa líquido libre");

  // 4. Ecografía Renal y Vías Urinarias
  const [ecoRinonDer, setEcoRinonDer] = useState("");
  const [ecoRinonIzq, setEcoRinonIzq] = useState("");
  const [ecoVejigaRenal, setEcoVejigaRenal] = useState("");

  // 5. Ecografía Partes Blandas & Hernias
  const [ecoPartesRegion, setEcoPartesRegion] = useState("");
  const [ecoPartesDimensiones, setEcoPartesDimensiones] = useState("");
  const [ecoPartesHallazgos, setEcoPartesHallazgos] = useState("");

  // 6. Ecografía Mamaria y Tiroidea
  const [ecoBirads, setEcoBirads] = useState("BI-RADS 1: Negativo / Hallazgos normales");
  const [ecoTirads, setEcoTirads] = useState("TI-RADS 1: Benigno / Sin nódulos");

  // 7. Conclusión Diagnóstica e Indicaciones del Informe Ecográfico
  const [conclusionEcografica, setConclusionEcografica] = useState("");
  const [sugerenciasEcograficas, setSugerenciasEcograficas] = useState("");

  // 8. Medicina General: Campos específicos
  const [tiempoEnfermedad, setTiempoEnfermedad] = useState("");
  const [examenRegionalMedicina, setExamenRegionalMedicina] = useState("");
  const [descansoMedicoDias, setDescansoMedicoDias] = useState("");

  // 9. Exámenes de Laboratorio & Tiras Reactivas
  const [labHemoglobina, setLabHemoglobina] = useState("");
  const [labGlucosa, setLabGlucosa] = useState("");
  const [labOrinaLeucocitos, setLabOrinaLeucocitos] = useState("Negativo");
  const [labOrinaProteinas, setLabOrinaProteinas] = useState("Negativo");
  const [labOrinaNitritos, setLabOrinaNitritos] = useState("Negativo");
  const [labPruebaEmbarazo, setLabPruebaEmbarazo] = useState("No realizada");
  const [labObservaciones, setLabObservaciones] = useState("");

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

    // Reset campos de Ecografía y Próstata
    setProstataDt("");
    setProstataDap("");
    setProstataDl("");
    setProstataVejigaPre("");
    setProstataResiduoPost("");
    setProstataLobuloMedio("No protruye al piso vesical");
    setEcoDbp("");
    setEcoLf("");
    setEcoCa("");
    setEcoPfe("");
    setEcoFcf("");
    setEcoPlacenta("Normoinserta posterior fúndica Grado I");
    setEcoIla("Volumen normal");
    setEcoHigado("");
    setEcoVesicula("");
    setEcoPancreasBazo("");
    setEcoLiquidoLibre("No se observa líquido libre");
    setEcoRinonDer("");
    setEcoRinonIzq("");
    setEcoVejigaRenal("");
    setEcoPartesRegion("");
    setEcoPartesDimensiones("");
    setEcoPartesHallazgos("");
    setEcoBirads("BI-RADS 1: Negativo / Hallazgos normales");
    setEcoTirads("TI-RADS 1: Benigno / Sin nódulos");
    setConclusionEcografica("");
    setSugerenciasEcograficas("");

    // Reset Medicina General
    setTiempoEnfermedad("");
    setExamenRegionalMedicina("");
    setDescansoMedicoDias("");

    // Reset Laboratorio
    setLabHemoglobina("");
    setLabGlucosa("");
    setLabOrinaLeucocitos("Negativo");
    setLabOrinaProteinas("Negativo");
    setLabOrinaNitritos("Negativo");
    setLabPruebaEmbarazo("No realizada");
    setLabObservaciones("");

    // Detección automática inteligente de la modalidad según el servicio contratado
    if (p?.servicio) {
      const srvLower = p.servicio.toLowerCase();
      if (
        srvLower.includes("ecograf") ||
        srvLower.includes("doppler") ||
        srvLower.includes("morfol") ||
        srvLower.includes("genétic") ||
        srvLower.includes("4d") ||
        srvLower.includes("5d") ||
        srvLower.includes("transvag") ||
        srvLower.includes("pélvic") ||
        srvLower.includes("renal") ||
        srvLower.includes("prostát") ||
        srvLower.includes("partes blandas") ||
        srvLower.includes("mamar") ||
        srvLower.includes("tiroid")
      ) {
        setModalidadAtencion("ECOGRAFIA");
        if (srvLower.includes("prostát")) setTipoEcografia("PROSTATICA");
        else if (srvLower.includes("abdomin")) setTipoEcografia("ABDOMINAL");
        else if (srvLower.includes("renal")) setTipoEcografia("RENAL");
        else if (srvLower.includes("partes blandas") || srvLower.includes("lipoma") || srvLower.includes("hernia")) setTipoEcografia("PARTES_BLANDAS");
        else if (srvLower.includes("mamar")) setTipoEcografia("MAMARIA");
        else if (srvLower.includes("tiroid")) setTipoEcografia("TIROIDEA");
        else if (srvLower.includes("transvag") || srvLower.includes("pélvic")) setTipoEcografia("TRANSVAGINAL");
        else setTipoEcografia("OBSTETRICA");
      } else if (srvLower.includes("medicina general") || srvLower.includes("adulto")) {
        setModalidadAtencion("MEDICINA_GENERAL");
      } else if (srvLower.includes("laboratorio") || srvLower.includes("orina") || srvLower.includes("sangre") || srvLower.includes("hemograma") || srvLower.includes("perfil")) {
        setModalidadAtencion("LABORATORIO");
      } else if (
        srvLower.includes("ginecolog") ||
        srvLower.includes("papanicolaou") ||
        srvLower.includes("pap") ||
        srvLower.includes("colposcop") ||
        srvLower.includes("cauteriz") ||
        srvLower.includes("biopsia") ||
        srvLower.includes("flujo") ||
        srvLower.includes("leucorrea") ||
        srvLower.includes("diu") ||
        srvLower.includes("implante") ||
        srvLower.includes("climater") ||
        srvLower.includes("menopaus")
      ) {
        setModalidadAtencion("GINECOLOGIA");
      } else {
        setModalidadAtencion("OBSTETRICIA");
      }
    }
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

  const insertarMacroConclusionEco = (texto: string) => {
    setConclusionEcografica((prev) => (prev ? `${prev}\n${texto}` : texto));
  };

  const insertarMacroExamenRegional = (texto: string) => {
    setExamenRegionalMedicina((prev) => (prev ? `${prev}\n${texto}` : texto));
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
            if (ef.modalidadAtencion) {
              if (ef.modalidadAtencion === "GINECO_OBSTETRICIA") {
                if (ef.formulaG || ef.fur || ef.eg || ef.alturaUterina || ef.lcf) {
                  setModalidadAtencion("OBSTETRICIA");
                } else {
                  setModalidadAtencion("GINECOLOGIA");
                }
              } else {
                setModalidadAtencion(ef.modalidadAtencion);
              }
            }
            if (ef.tipoEcografia) setTipoEcografia(ef.tipoEcografia);

            // Próstata
            if (ef.prostata) {
              if (ef.prostata.dt !== undefined) setProstataDt(ef.prostata.dt);
              if (ef.prostata.dap !== undefined) setProstataDap(ef.prostata.dap);
              if (ef.prostata.dl !== undefined) setProstataDl(ef.prostata.dl);
              if (ef.prostata.vejigaPre !== undefined) setProstataVejigaPre(ef.prostata.vejigaPre);
              if (ef.prostata.residuoPost !== undefined) setProstataResiduoPost(ef.prostata.residuoPost);
              if (ef.prostata.lobuloMedio !== undefined) setProstataLobuloMedio(ef.prostata.lobuloMedio);
            }

            // Eco Fetal
            if (ef.ecoFetal) {
              if (ef.ecoFetal.dbp !== undefined) setEcoDbp(ef.ecoFetal.dbp);
              if (ef.ecoFetal.lf !== undefined) setEcoLf(ef.ecoFetal.lf);
              if (ef.ecoFetal.ca !== undefined) setEcoCa(ef.ecoFetal.ca);
              if (ef.ecoFetal.pfe !== undefined) setEcoPfe(ef.ecoFetal.pfe);
              if (ef.ecoFetal.fcf !== undefined) setEcoFcf(ef.ecoFetal.fcf);
              if (ef.ecoFetal.placenta !== undefined) setEcoPlacenta(ef.ecoFetal.placenta);
              if (ef.ecoFetal.ila !== undefined) setEcoIla(ef.ecoFetal.ila);
            }

            // Eco Abdominal
            if (ef.ecoAbdominal) {
              if (ef.ecoAbdominal.higado !== undefined) setEcoHigado(ef.ecoAbdominal.higado);
              if (ef.ecoAbdominal.vesicula !== undefined) setEcoVesicula(ef.ecoAbdominal.vesicula);
              if (ef.ecoAbdominal.pancreasBazo !== undefined) setEcoPancreasBazo(ef.ecoAbdominal.pancreasBazo);
              if (ef.ecoAbdominal.liquidoLibre !== undefined) setEcoLiquidoLibre(ef.ecoAbdominal.liquidoLibre);
            }

            // Eco Renal
            if (ef.ecoRenal) {
              if (ef.ecoRenal.rinonDer !== undefined) setEcoRinonDer(ef.ecoRenal.rinonDer);
              if (ef.ecoRenal.rinonIzq !== undefined) setEcoRinonIzq(ef.ecoRenal.rinonIzq);
              if (ef.ecoRenal.vejigaRenal !== undefined) setEcoVejigaRenal(ef.ecoRenal.vejigaRenal);
            }

            // Eco Partes Blandas
            if (ef.ecoPartesBlandas) {
              if (ef.ecoPartesBlandas.region !== undefined) setEcoPartesRegion(ef.ecoPartesBlandas.region);
              if (ef.ecoPartesBlandas.dimensiones !== undefined) setEcoPartesDimensiones(ef.ecoPartesBlandas.dimensiones);
              if (ef.ecoPartesBlandas.hallazgos !== undefined) setEcoPartesHallazgos(ef.ecoPartesBlandas.hallazgos);
            }

            if (ef.ecoBirads !== undefined) setEcoBirads(ef.ecoBirads);
            if (ef.ecoTirads !== undefined) setEcoTirads(ef.ecoTirads);
            if (ef.conclusionEcografica !== undefined) setConclusionEcografica(ef.conclusionEcografica);
            if (ef.sugerenciasEcograficas !== undefined) setSugerenciasEcograficas(ef.sugerenciasEcograficas);

            // Medicina General
            if (ef.medicina) {
              if (ef.medicina.tiempoEnfermedad !== undefined) setTiempoEnfermedad(ef.medicina.tiempoEnfermedad);
              if (ef.medicina.examenRegionalMedicina !== undefined) setExamenRegionalMedicina(ef.medicina.examenRegionalMedicina);
              if (ef.medicina.descansoMedicoDias !== undefined) setDescansoMedicoDias(ef.medicina.descansoMedicoDias);
            }

            // Laboratorio
            if (ef.laboratorio) {
              if (ef.laboratorio.hemoglobina !== undefined) setLabHemoglobina(ef.laboratorio.hemoglobina);
              if (ef.laboratorio.glucosa !== undefined) setLabGlucosa(ef.laboratorio.glucosa);
              if (ef.laboratorio.orinaLeucocitos !== undefined) setLabOrinaLeucocitos(ef.laboratorio.orinaLeucocitos);
              if (ef.laboratorio.orinaProteinas !== undefined) setLabOrinaProteinas(ef.laboratorio.orinaProteinas);
              if (ef.laboratorio.orinaNitritos !== undefined) setLabOrinaNitritos(ef.laboratorio.orinaNitritos);
              if (ef.laboratorio.pruebaEmbarazo !== undefined) setLabPruebaEmbarazo(ef.laboratorio.pruebaEmbarazo);
              if (ef.laboratorio.observaciones !== undefined) setLabObservaciones(ef.laboratorio.observaciones);
            }
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
      } else if (p.pacienteId) {
        // Cargar antecedentes y fórmula obstétrica histórica de la paciente
        try {
          const { data: ultNota } = await supabase
            .from("nota_clinica")
            .select("antecedentes, examen_fisico")
            .eq("paciente_id", p.pacienteId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (ultNota && activeEncuentroIdRef.current === p.id) {
            if (ultNota.antecedentes) setAntecedentes(ultNota.antecedentes);
            if (ultNota.examen_fisico) {
              try {
                const ef = JSON.parse(ultNota.examen_fisico);
                if (ef.formulaG) setFormulaG(ef.formulaG);
                if (ef.formulaP) setFormulaP(ef.formulaP);
                if (ef.fur) setFur(ef.fur);
                if (ef.fpp) setFpp(ef.fpp);
              } catch {}
            }
          }
        } catch (errPrev) {
          console.warn("Aviso al consultar antecedentes previos:", errPrev);
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
            <div><strong>${
              modalidadAtencion === "ECOGRAFIA"
                ? `INFORME ECOGRÁFICO (${tipoEcografia.replace('_', ' ')})`
                : modalidadAtencion === "OBSTETRICIA"
                ? "HISTORIA CLÍNICA MATERNO-PERINATAL (COP)"
                : modalidadAtencion === "GINECOLOGIA"
                ? "HISTORIA CLÍNICA GINECOLÓGICA (CMP/RNE)"
                : modalidadAtencion === "MEDICINA_GENERAL"
                ? "HISTORIA CLÍNICA - MEDICINA GENERAL (CMP)"
                : "REPORTE DE LABORATORIO & POCT"
            }</strong></div>
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

        ${modalidadAtencion === "ECOGRAFIA" ? `
          <!-- INFORME ECOGRÁFICO ESPECIALIZADO -->
          <div class="section-title">2. Protocolo & Hallazgos del Estudio Ecográfico (${tipoEcografia.replace('_', ' ')})</div>
          
          ${tipoEcografia === "PROSTATICA" ? `
            <div class="grid-3" style="margin-bottom:6px;">
              <div class="data-box"><div class="data-label">D. Transverso (DT)</div><div class="data-val">${prostataDt || "--"} mm</div></div>
              <div class="data-box"><div class="data-label">D. Anteroposterior (DAP)</div><div class="data-val">${prostataDap || "--"} mm</div></div>
              <div class="data-box"><div class="data-label">D. Longitudinal (DL)</div><div class="data-val">${prostataDl || "--"} mm</div></div>
            </div>
            <div class="grid-2" style="margin-bottom:6px;">
              <div class="data-box" style="background:#f0fdf4; border-color:#bbf7d0;">
                <div class="data-label" style="color:#166534;">Volumen Prostático Calculado (Fórmula Elipsoide)</div>
                <div class="data-val" style="color:#15803d; font-size:13px;">${volumenProstataCc} cc &bull; <span style="font-size:11px;">${gradoHbp}</span></div>
              </div>
              <div class="data-box" style="background:#f8fafc;">
                <div class="data-label">Dinámica Vesical & Residuo Post-Miccional</div>
                <div class="data-val">Pre: ${prostataVejigaPre || "--"} cc &bull; Post: ${prostataResiduoPost || "--"} cc (${porcentajeResiduo}% RPM)</div>
              </div>
            </div>
            <div class="data-box" style="margin-bottom:6px;">
              <div class="data-label">Morfología de Lóbulo Medio & Parénquima</div>
              <div class="data-val" style="font-weight:normal; font-size:10.5px;">${prostataLobuloMedio}. Cápsula prostática íntegra, contornos regulares.</div>
            </div>
          ` : ''}

          ${tipoEcografia === "OBSTETRICA" ? `
            <div class="grid-4" style="margin-bottom:6px;">
              <div class="data-box"><div class="data-label">D.B.P.</div><div class="data-val">${ecoDbp || "--"} mm</div></div>
              <div class="data-box"><div class="data-label">Longitud Femoral (LF)</div><div class="data-val">${ecoLf || "--"} mm</div></div>
              <div class="data-box"><div class="data-label">Circ. Abdominal (CA)</div><div class="data-val">${ecoCa || "--"} mm</div></div>
              <div class="data-box"><div class="data-label">P.F.E. Estimado</div><div class="data-val">${ecoPfe || "--"} g</div></div>
              <div class="data-box"><div class="data-label">Frecuencia Cardíaca Fetal</div><div class="data-val">${ecoFcf || lcf || "--"} lpm</div></div>
              <div class="data-box"><div class="data-label">Placenta</div><div class="data-val">${ecoPlacenta}</div></div>
              <div class="data-box"><div class="data-label">Líquido Amniótico (ILA)</div><div class="data-val">${ecoIla}</div></div>
              <div class="data-box"><div class="data-label">Presentación</div><div class="data-val">${presentacion}</div></div>
            </div>
          ` : ''}

          ${tipoEcografia === "ABDOMINAL" ? `
            <div class="data-box" style="margin-bottom:4px;">
              <div class="data-label">Hígado</div>
              <div class="data-val" style="font-weight:normal; font-size:10.5px;">${ecoHigado || "Morfología y ecogenicidad habitual, bordes regulares, sin lesiones focales."}</div>
            </div>
            <div class="data-box" style="margin-bottom:4px;">
              <div class="data-label">Vesícula & Vías Biliares</div>
              <div class="data-val" style="font-weight:normal; font-size:10.5px;">${ecoVesicula || "Paredes finas menores de 3mm, alitiásica. Vía biliar intra y extrahepática de calibre normal."}</div>
            </div>
            <div class="data-box" style="margin-bottom:4px;">
              <div class="data-label">Páncreas, Bazo & Cavidad Peritoneal</div>
              <div class="data-val" style="font-weight:normal; font-size:10.5px;">${ecoPancreasBazo || "Páncreas y bazo de características ecográficas conservadas."} ${ecoLiquidoLibre}.</div>
            </div>
          ` : ''}

          ${tipoEcografia === "RENAL" ? `
            <div class="grid-2" style="margin-bottom:4px;">
              <div class="data-box">
                <div class="data-label">Riñón Derecho</div>
                <div class="data-val" style="font-weight:normal; font-size:10.5px;">${ecoRinonDer || "Morfología y tamaño normal, buena diferenciación córtico-medular, sin litiasis ni ectasia."}</div>
              </div>
              <div class="data-box">
                <div class="data-label">Riñón Izquierdo</div>
                <div class="data-val" style="font-weight:normal; font-size:10.5px;">${ecoRinonIzq || "Morfología y tamaño normal, parénquima conservado, sin signos de uropatía obstructiva."}</div>
              </div>
            </div>
            <div class="data-box" style="margin-bottom:4px;">
              <div class="data-label">Vejiga Urinaria</div>
              <div class="data-val" style="font-weight:normal; font-size:10.5px;">${ecoVejigaRenal || "Buena repleción vesical, paredes delgadas y regulares, sin litiasis endoluminal."}</div>
            </div>
          ` : ''}

          ${tipoEcografia === "PARTES_BLANDAS" ? `
            <div class="grid-2" style="margin-bottom:4px;">
              <div class="data-box"><div class="data-label">Región Anatómica</div><div class="data-val">${ecoPartesRegion || "Región señalada"}</div></div>
              <div class="data-box"><div class="data-label">Dimensiones de la Lesión</div><div class="data-val">${ecoPartesDimensiones || "No medible / difuso"}</div></div>
            </div>
            <div class="data-box" style="margin-bottom:4px;">
              <div class="data-label">Hallazgos Ecográficos</div>
              <div class="data-val" style="font-weight:normal; font-size:10.5px;">${ecoPartesHallazgos || "Estructuras dérmicas, tejido celular subcutáneo y planos musculares conservados."}</div>
            </div>
          ` : ''}

          ${tipoEcografia === "MAMARIA" ? `
            <div class="data-box" style="margin-bottom:4px;">
              <div class="data-label">Clasificación Mamaria</div>
              <div class="data-val" style="color:#0f172a;">${ecoBirads}</div>
            </div>
          ` : ''}

          ${tipoEcografia === "TIROIDEA" ? `
            <div class="data-box" style="margin-bottom:4px;">
              <div class="data-label">Clasificación Tiroidea</div>
              <div class="data-val" style="color:#0f172a;">${ecoTirads}</div>
            </div>
          ` : ''}

          <div class="section-title">3. Conclusión Diagnóstica Ecográfica</div>
          <div class="content-block" style="font-weight:700; background:#f8fafc; border-left:3px solid #0284c7;">
            ${conclusionEcografica || examenFisico || "Estudio ecográfico dentro de límites normales para la edad y motivo de evaluación."}
          </div>

          ${sugerenciasEcograficas ? `
            <div class="section-title">4. Sugerencias & Recomendaciones</div>
            <div class="content-block">${sugerenciasEcograficas}</div>
          ` : ''}

          ${imagenes.length > 0 ? `
            <div class="section-title">Anexo: Registro Iconográfico Adjunto (${imagenes.length} capturas)</div>
            <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:6px;">
              ${imagenes.map(img => `
                <div style="border:1px solid #cbd5e1; padding:4px; border-radius:4px; text-align:center; max-width:180px;">
                  <img src="${img.url}" style="max-width:100%; max-height:100px; object-fit:contain; border-radius:2px;" />
                  <div style="font-size:9px; color:#475569; margin-top:2px; font-weight:600;">${img.titulo}</div>
                </div>
              `).join("")}
            </div>
          ` : ''}
        ` : modalidadAtencion === "MEDICINA_GENERAL" ? `
          <!-- MEDICINA GENERAL -->
          <div class="section-title">2. Relato Clínico & Tiempo de Enfermedad</div>
          <div class="grid-2" style="margin-bottom:4px;">
            <div class="data-box"><div class="data-label">Tiempo de Enfermedad</div><div class="data-val">${tiempoEnfermedad || "No precisado"}</div></div>
            <div class="data-box"><div class="data-label">Descanso Médico Recomendado</div><div class="data-val">${descansoMedicoDias ? descansoMedicoDias + " días" : "No amerita"}</div></div>
          </div>
          <div class="content-block">${motivo || "Consulta médica general."}</div>

          ${antecedentes ? `
            <div class="section-title">3. Antecedentes Personales & Mórbidos</div>
            <div class="content-block">${antecedentes}</div>
          ` : ''}

          <div class="section-title">4. Examen Físico Regional Dirigido</div>
          <div class="content-block">${examenRegionalMedicina || examenFisico || "Examen clínico general conservado."}</div>
        ` : modalidadAtencion === "LABORATORIO" ? `
          <!-- LABORATORIO & TIRAS -->
          <div class="section-title">2. Exámenes Auxiliares Rápidos & Laboratorio</div>
          <div class="grid-4" style="margin-bottom:6px;">
            <div class="data-box"><div class="data-label">Hemoglobina (Hb)</div><div class="data-val">${labHemoglobina ? labHemoglobina + " g/dL" : "--"}</div></div>
            <div class="data-box"><div class="data-label">Glucosa Rápida</div><div class="data-val">${labGlucosa ? labGlucosa + " mg/dL" : "--"}</div></div>
            <div class="data-box"><div class="data-label">Prueba Embarazo (GCH)</div><div class="data-val">${labPruebaEmbarazo}</div></div>
            <div class="data-box"><div class="data-label">Leucocitos Orina</div><div class="data-val">${labOrinaLeucocitos}</div></div>
            <div class="data-box"><div class="data-label">Proteínas Orina</div><div class="data-val">${labOrinaProteinas}</div></div>
            <div class="data-box"><div class="data-label">Nitritos Orina</div><div class="data-val">${labOrinaNitritos}</div></div>
          </div>
          ${labObservaciones ? `
            <div class="section-title">Observaciones Analíticas</div>
            <div class="content-block">${labObservaciones}</div>
          ` : ''}
        ` : modalidadAtencion === "GINECOLOGIA" ? `
          <!-- GINECOLOGÍA ESPECIALIZADA -->
          <div class="section-title">2. Anamnesis Ginecológica & Motivo de Consulta</div>
          <div class="content-block">${motivo || "Consulta médica ginecológica especializada."}</div>

          ${antecedentes ? `
            <div class="section-title">3. Antecedentes Ginecológicos & Quirúrgicos</div>
            <div class="content-block">${antecedentes}</div>
          ` : ''}

          <div class="section-title">4. Examen Ginecológico Preferencial / Especuloscopía</div>
          <div class="content-block">${examenFisico || "Evaluación ginecológica: genitales externos normales, especuloscopía sin lesiones activas, tacto bimanual conservado."}</div>
        ` : `
          <!-- OBSTETRICIA & CONTROL PRENATAL -->
          ${(formulaG || fur || eg || alturaUterina || lcf) ? `
            <div class="section-title">2. Perfil y Control Obstétrico (Carnet Perinatal)</div>
            <div class="grid-4">
              <div class="data-box"><div class="data-label">Fórmula Gestacional</div><div class="data-val">G: ${formulaG || "-"} P: ${formulaP || "-"}</div></div>
              <div class="data-box"><div class="data-label">F.U.R. / F.P.P.</div><div class="data-val">${fur || "--"} / ${fpp || "--"}</div></div>
              <div class="data-box"><div class="data-label">Edad Gestacional</div><div class="data-val">${eg || "--"} sem</div></div>
              <div class="data-box"><div class="data-label">Alt. Uterina / LCF</div><div class="data-val">${alturaUterina || "--"} cm / ${lcf || "--"} lpm</div></div>
            </div>
          ` : ''}

          <div class="section-title">3. Anamnesis & Motivo de Consulta Obstétrica</div>
          <div class="content-block">${motivo || "Control prenatal y seguimiento materno-perinatal."}</div>

          ${antecedentes ? `
            <div class="section-title">4. Antecedentes Obstétricos & Perinatales</div>
            <div class="content-block">${antecedentes}</div>
          ` : ''}

          <div class="section-title">5. Examen Clínico / Evaluación Materno-Fetal</div>
          <div class="content-block">${examenFisico || "Control prenatal conforme a Guías de Práctica Clínica y NTS N.° 139-MINSA."}</div>
        `}

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
            ${
              modalidadAtencion === "OBSTETRICIA"
                ? `<span style="font-size:9.5px; color:#334155; font-weight:700;">Lic. en Obstetricia &bull; COP: ${colegiatura || "13102"}</span><br><span style="font-size:8px; color:#64748b; font-weight:normal;">Salud Materno-Perinatal &bull; Ley N.° 23346</span>`
                : modalidadAtencion === "GINECOLOGIA"
                ? `<span style="font-size:9.5px; color:#334155; font-weight:700;">Médico Gineco-Obstetra &bull; CMP: ${colegiatura || "72450"}</span><br><span style="font-size:8px; color:#64748b; font-weight:normal;">Especialista RNE &bull; Ley N.° 15125</span>`
                : modalidadAtencion === "ECOGRAFIA"
                ? `<span style="font-size:9.5px; color:#334155; font-weight:700;">Médico Ecografista &bull; CMP: ${colegiatura || "CMP"}</span><br><span style="font-size:8px; color:#64748b; font-weight:normal;">Diagnóstico por Imágenes & Ultrasonografía</span>`
                : modalidadAtencion === "MEDICINA_GENERAL"
                ? `<span style="font-size:9.5px; color:#334155; font-weight:700;">Médico Cirujano &bull; CMP: ${colegiatura || "CMP"}</span><br><span style="font-size:8px; color:#64748b; font-weight:normal;">Atención Médica Primaria &bull; Ley N.° 15125</span>`
                : `<span style="font-size:9.5px; color:#334155; font-weight:700;">Responsable de Laboratorio POCT</span><br><span style="font-size:8px; color:#64748b; font-weight:normal;">Reg. Profesional: ${colegiatura || "Certificado"}</span>`
            }
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

  const buildExamenFisicoJson = () => ({
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
    modalidadAtencion,
    tipoEcografia,
    prostata: {
      dt: prostataDt,
      dap: prostataDap,
      dl: prostataDl,
      volumen: volumenProstataCc,
      gradoHbp,
      vejigaPre: prostataVejigaPre,
      residuoPost: prostataResiduoPost,
      porcentajeResiduo,
      lobuloMedio: prostataLobuloMedio,
    },
    ecoFetal: {
      dbp: ecoDbp,
      lf: ecoLf,
      ca: ecoCa,
      pfe: ecoPfe,
      fcf: ecoFcf,
      placenta: ecoPlacenta,
      ila: ecoIla,
    },
    ecoAbdominal: {
      higado: ecoHigado,
      vesicula: ecoVesicula,
      pancreasBazo: ecoPancreasBazo,
      liquidoLibre: ecoLiquidoLibre,
    },
    ecoRenal: {
      rinonDer: ecoRinonDer,
      rinonIzq: ecoRinonIzq,
      vejigaRenal: ecoVejigaRenal,
    },
    ecoPartesBlandas: {
      region: ecoPartesRegion,
      dimensiones: ecoPartesDimensiones,
      hallazgos: ecoPartesHallazgos,
    },
    ecoBirads,
    ecoTirads,
    conclusionEcografica,
    sugerenciasEcograficas,
    medicina: {
      tiempoEnfermedad,
      examenRegionalMedicina,
      descansoMedicoDias,
    },
    laboratorio: {
      hemoglobina: labHemoglobina,
      glucosa: labGlucosa,
      orinaLeucocitos: labOrinaLeucocitos,
      orinaProteinas: labOrinaProteinas,
      orinaNitritos: labOrinaNitritos,
      pruebaEmbarazo: labPruebaEmbarazo,
      observaciones: labObservaciones,
    },
  });

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
            examen_fisico: JSON.stringify(buildExamenFisicoJson()),
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
  }, [
    pa, fc, fr, temp, satO2, peso, talla, motivo, antecedentes, examenFisico, planTratamiento, diagnosticos,
    formulaG, formulaP, fur, fpp, eg, alturaUterina, lcf, presentacion, imagenes,
    modalidadAtencion, tipoEcografia, prostataDt, prostataDap, prostataDl, prostataVejigaPre, prostataResiduoPost,
    prostataLobuloMedio, ecoDbp, ecoLf, ecoCa, ecoPfe, ecoFcf, ecoPlacenta, ecoIla, ecoHigado, ecoVesicula,
    ecoPancreasBazo, ecoLiquidoLibre, ecoRinonDer, ecoRinonIzq, ecoVejigaRenal, ecoPartesRegion,
    ecoPartesDimensiones, ecoPartesHallazgos, ecoBirads, ecoTirads, conclusionEcografica, sugerenciasEcograficas,
    tiempoEnfermedad, examenRegionalMedicina, descansoMedicoDias, labHemoglobina, labGlucosa,
    labOrinaLeucocitos, labOrinaProteinas, labOrinaNitritos, labPruebaEmbarazo, labObservaciones,
  ]);

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
          examen_fisico: JSON.stringify(buildExamenFisicoJson()),
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

      // Notificar a Admisión-Caja y otros módulos en tiempo real
      try {
        const canalCola = supabase.channel("cola-medica");
        await canalCola.send({
          type: "broadcast",
          event: "paciente_atendido",
          payload: {
            encuentroId: selectedPatient.id,
            paciente: selectedPatient.paciente,
            dni: selectedPatient.dni,
          },
        });
        if (typeof window !== "undefined") {
          localStorage.setItem("lm_paciente_atendido", Date.now().toString());
        }
      } catch (broadcastErr) {
        console.warn("Error enviando broadcast paciente_atendido:", broadcastErr);
      }
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

  // Sincronización en tiempo real de la cola de pacientes con el Sidebar Color Vino
  useEffect(() => {
    setPacientesEspera(pacientesFiltrados);
    setPacientesAtendidos(atendidosFiltrados);
    setSedeCola(sede);
  }, [pacientesFiltrados, atendidosFiltrados, sede, setPacientesEspera, setPacientesAtendidos, setSedeCola]);

  useEffect(() => {
    setSelectedPatientId(selectedPatient ? selectedPatient.id : null);
  }, [selectedPatient, setSelectedPatientId]);

  useEffect(() => {
    setOnSelectPatient(() => (p: PacienteEnConsulta) => handleSeleccionarPaciente(p));
    setOnReopenPatient(() => (p: PacienteEnConsulta) => {
      setEncuentroAReabrir(p);
      setShowReabrirModal(true);
    });
  }, [handleSeleccionarPaciente, setOnSelectPatient, setOnReopenPatient]);

  return (
    <div className="space-y-3 max-w-[1600px] mx-auto text-xs">
      {/* Barra de Control Clínico Superior */}
      <div className="bg-white border border-neutral-200 rounded-xl p-2.5 px-3 flex flex-wrap items-center justify-between shadow-xs gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-neutral-900 text-xs tracking-tight">{profesionalNombre}</span>
            <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${getCargoProfesional().badgeColor}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
              {getCargoProfesional().cargo} &bull; {getCargoProfesional().registro}
            </span>
          </div>
          <span className="text-neutral-300 hidden sm:inline">&bull;</span>
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

        <div className="flex items-center gap-2.5">
          {/* Indicador de Autoguardado Silencioso */}
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-neutral-400">
            {saveStatus === "saving" ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-neutral-500">Auto {lastSavedTime || "activo"}</span>
              </>
            )}
          </div>

          {/* Botón de Impresión Ficha Clínica A4 */}
          <button
            type="button"
            onClick={imprimirFichaClinicaA4}
            disabled={!selectedPatient}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold rounded-lg border border-neutral-300 transition disabled:opacity-40 shadow-xs"
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-black text-white font-bold rounded-lg transition disabled:opacity-40 shadow-xs"
            >
              <Lock className="w-3 h-3" />
              <span>Sellar & Firmar HCE</span>
            </button>
          ) : (
            <button
              onClick={() => setShowAdendaModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-700 hover:bg-brand-800 text-white font-bold rounded-lg transition shadow-xs"
            >
              <PlusCircle className="w-3 h-3" />
              <span>Incorporar Adenda</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* WORKSTATION CLÍNICO UNIFICADO (100% ANCHO EXPANDIDO)                      */}
      {/* ========================================================================= */}
      <div className="space-y-3">
          {/* Banner de Bloqueo Inmutable Post-Atención */}
          {(isSealed || selectedPatient?.estado === "ATENDIDO") && selectedPatient && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 p-3 rounded-xl flex items-start gap-2.5 shadow-xs">
              <Lock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div className="text-xs leading-snug w-full">
                <div className="font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-emerald-950">
                    HISTORIA CLÍNICA SELLADA &bull; ACTO MÉDICO INALTERABLE
                  </span>
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-200 text-emerald-800 rounded font-mono font-bold">
                    NTS N.° 139-MINSA
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800 mt-1">
                  Este registro clínico fue sellado digitalmente{fechaSellado ? ` el ${fechaSellado}` : ""}. Los campos de consulta han quedado en modo solo lectura. Toda ampliación debe realizarse en la pestaña <strong>Adendas Evolutivas</strong>.
                </p>
                {sealedHash && (
                  <div className="mt-2 p-1.5 px-2 rounded-lg bg-white border border-emerald-300 shadow-2xs flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span className="text-[9px] font-mono font-bold text-emerald-800 truncate select-all">
                      Firma Digital SHA-256: {sealedHash}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Barra de Paciente & Contexto Clínico Activo */}
          <div className="bg-white border border-neutral-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                {selectedPatient ? selectedPatient.paciente.charAt(0) : "P"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-extrabold text-sm text-neutral-900">
                    {selectedPatient ? selectedPatient.paciente : "Seleccione un paciente de la cola"}
                  </h2>
                  {selectedPatient && (
                    <span className="font-mono text-xs text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                      DNI: {selectedPatient.dni}
                    </span>
                  )}
                  {selectedPatient?.grupoSanguineo && (
                    <span className="font-mono text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                      {selectedPatient.grupoSanguineo}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5">
                  <span>Servicio: <strong className="text-neutral-800">{selectedPatient?.servicio || "--"}</strong></span>
                  <span>&bull;</span>
                  <span>Sede: <strong className="text-neutral-800">{selectedPatient?.sede || sede}</strong></span>
                  {selectedPatient?.alergias && selectedPatient.alergias !== "Ninguna" && (
                    <>
                      <span>&bull;</span>
                      <span className="text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Alergias: {selectedPatient.alergias}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Badge de Modalidad Asistencial Activa */}
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 shadow-2xs ${getCargoProfesional().badgeColor}`}>
                {modalidadAtencion === "OBSTETRICIA" && <Baby className="w-3.5 h-3.5" />}
                {modalidadAtencion === "GINECOLOGIA" && <Activity className="w-3.5 h-3.5" />}
                {modalidadAtencion === "ECOGRAFIA" && <Layers className="w-3.5 h-3.5" />}
                {modalidadAtencion === "MEDICINA_GENERAL" && <Stethoscope className="w-3.5 h-3.5" />}
                {modalidadAtencion === "LABORATORIO" && <FlaskConical className="w-3.5 h-3.5" />}
                <span>
                  {modalidadAtencion === "OBSTETRICIA"
                    ? "Control Obstétrico & Prenatal (COP 13102)"
                    : modalidadAtencion === "GINECOLOGIA"
                    ? "Ginecología Especializada (CMP 72450)"
                    : modalidadAtencion === "ECOGRAFIA"
                    ? `Informe Ecográfico: ${tipoEcografia.replace("_", " ")}`
                    : modalidadAtencion === "MEDICINA_GENERAL"
                    ? "Medicina General Ambulatoria (CMP)"
                    : "Exámenes de Laboratorio (POCT)"}
                </span>
              </span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* CINTA HORIZONTAL DE TRIAJE VITAL & EVALUACIÓN ANTROPOMÉTRICA (NTS 139)   */}
          {/* ========================================================================= */}
          <div className="bg-white border border-neutral-200 rounded-xl p-3 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-2 mb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                  <HeartPulse className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-xs text-neutral-800 uppercase tracking-wider">
                  Triaje Vital & Funciones Antropométricas
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">
                  NTS N.° 139-MINSA
                </span>
              </div>

              <div className="flex items-center gap-2">
                {isHipertension && (
                  <span className="text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                    ⚠️ Alerta: Presión Arterial Elevada
                  </span>
                )}
                {isHipoxia && (
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                    ⚠️ Alerta: SatO2 &lt; 95%
                  </span>
                )}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 border border-neutral-200 text-xs">
                  <span className="text-neutral-500 font-medium">IMC:</span>
                  <strong className="text-neutral-900 font-mono">{imc}</strong>
                  <span className="text-[10px] text-neutral-500 font-sans">
                    {parseFloat(imc) < 18.5
                      ? "(Bajo peso)"
                      : parseFloat(imc) < 25
                      ? "(Normal)"
                      : parseFloat(imc) < 30
                      ? "(Sobrepeso)"
                      : parseFloat(imc) >= 30
                      ? "(Obesidad)"
                      : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* Grid de 6 Controles Vitales Horizontales */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              <div>
                <label className="block text-[10px] text-neutral-500 font-bold mb-1">P.A. (mmHg)</label>
                <input
                  type="text"
                  disabled={isSealed}
                  value={pa}
                  onChange={(e) => setPa(e.target.value)}
                  placeholder="120/80"
                  className={`w-full px-2.5 py-1.5 border rounded-lg font-mono font-bold text-xs ${
                    isHipertension ? "border-rose-400 bg-rose-50 text-rose-900" : "border-neutral-200"
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] text-neutral-500 font-bold mb-1">F.C. (lpm)</label>
                <input
                  type="text"
                  disabled={isSealed}
                  value={fc}
                  onChange={(e) => setFc(e.target.value)}
                  placeholder="76"
                  className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-lg font-mono font-bold text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] text-neutral-500 font-bold mb-1">Temp (°C)</label>
                <input
                  type="text"
                  disabled={isSealed}
                  value={temp}
                  onChange={(e) => setTemp(e.target.value)}
                  placeholder="36.5"
                  className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-lg font-mono font-bold text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] text-neutral-500 font-bold mb-1">SatO2 (%)</label>
                <input
                  type="text"
                  disabled={isSealed}
                  value={satO2}
                  onChange={(e) => setSatO2(e.target.value)}
                  placeholder="98"
                  className={`w-full px-2.5 py-1.5 border rounded-lg font-mono font-bold text-xs ${
                    isHipoxia ? "border-amber-400 bg-amber-50 text-amber-900" : "border-neutral-200"
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] text-neutral-500 font-bold mb-1">Peso (kg)</label>
                <input
                  type="text"
                  disabled={isSealed}
                  value={peso}
                  onChange={(e) => setPeso(e.target.value)}
                  placeholder="62.5"
                  className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-lg font-mono font-bold text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] text-neutral-500 font-bold mb-1">Talla (m)</label>
                <input
                  type="text"
                  disabled={isSealed}
                  value={talla}
                  onChange={(e) => setTalla(e.target.value)}
                  placeholder="1.60"
                  className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-lg font-mono font-bold text-xs"
                />
              </div>
            </div>
          </div>

          {/* Formulario Clínico Principal */}
          <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-3.5 shadow-2xs">
            {/* ================================================================ */}
            {/* 1. CASO: OBSTETRICIA & CONTROL PRENATAL (COP 13102)               */}
            {/* ================================================================ */}
            {modalidadAtencion === "OBSTETRICIA" && (
              <div className="space-y-3">
                {/* Panel Perfil Obstétrico / Carnet Perinatal (Fila Amplia) */}
                <div className="p-3 bg-rose-50/40 border border-rose-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between border-b border-rose-100 pb-1">
                    <span className="font-bold text-[11px] text-rose-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Baby className="w-3.5 h-3.5 text-rose-700" />
                      Biometría Materno-Fetal & Regla de Naegele
                    </span>
                    <span className="text-[9px] font-mono text-rose-800 bg-rose-100/80 px-2 py-0.5 rounded font-bold">
                      Control Perinatal Oficial
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
                    <div>
                      <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">Fórmula G / P</label>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          disabled={isSealed}
                          value={formulaG}
                          onChange={(e) => setFormulaG(e.target.value)}
                          placeholder="G"
                          className="w-1/2 px-1.5 py-1.5 border border-neutral-200 rounded font-mono text-center font-bold text-xs bg-white"
                        />
                        <input
                          type="text"
                          disabled={isSealed}
                          value={formulaP}
                          onChange={(e) => setFormulaP(e.target.value)}
                          placeholder="P"
                          className="w-1/2 px-1.5 py-1.5 border border-neutral-200 rounded font-mono text-center font-bold text-xs bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">F.U.R. (Inicio)</label>
                      <input
                        type="date"
                        disabled={isSealed}
                        value={fur}
                        onChange={(e) => handleFurChange(e.target.value)}
                        className="w-full px-2 py-1.5 border border-neutral-200 rounded font-mono text-xs bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">F.P.P. (Naegele)</label>
                      <input
                        type="date"
                        disabled={isSealed}
                        value={fpp}
                        onChange={(e) => setFpp(e.target.value)}
                        className="w-full px-2 py-1.5 border border-emerald-300 rounded font-mono text-xs font-bold text-emerald-900 bg-emerald-50/40"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">EG Semanas</label>
                      <input
                        type="text"
                        disabled={isSealed}
                        value={eg}
                        onChange={(e) => setEg(e.target.value)}
                        placeholder="Auto por FUR"
                        className="w-full px-2 py-1.5 border border-brand-300 rounded font-mono font-bold text-brand-950 bg-brand-50/40 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">A.U. (cm)</label>
                      <input
                        type="text"
                        disabled={isSealed}
                        value={alturaUterina}
                        onChange={(e) => setAlturaUterina(e.target.value)}
                        placeholder="Ej: 24"
                        className="w-full px-2 py-1.5 border border-neutral-200 rounded font-mono text-xs bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">L.C.F. (lpm)</label>
                      <input
                        type="text"
                        disabled={isSealed}
                        value={lcf}
                        onChange={(e) => setLcf(e.target.value)}
                        placeholder="140"
                        className="w-full px-2 py-1.5 border border-neutral-200 rounded font-mono font-bold text-neutral-900 text-xs bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">Presentación</label>
                      <select
                        disabled={isSealed}
                        value={presentacion}
                        onChange={(e) => setPresentacion(e.target.value)}
                        className="w-full px-2 py-1.5 border border-neutral-200 rounded font-semibold text-xs bg-white"
                      >
                        <option value="Cefálica">Cefálica</option>
                        <option value="Podálica">Podálica</option>
                        <option value="Transversa">Transversa</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Motivo & Antecedentes en 2 Columnas amplias */}
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[11px] text-neutral-700 uppercase tracking-wider mb-1">
                      1. Motivo de Consulta & Relato Obstétrico
                    </label>
                    <textarea
                      rows={3}
                      disabled={isSealed}
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder="Gestante acude para evaluación de control prenatal..."
                      className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[11px] text-neutral-700 uppercase tracking-wider mb-1">
                      2. Antecedentes Obstétricos & Perinatales
                    </label>
                    <textarea
                      rows={3}
                      disabled={isSealed}
                      value={antecedentes}
                      onChange={(e) => setAntecedentes(e.target.value)}
                      placeholder="Partos previos, cesáreas, abortos, complicaciones, grupo sanguíneo de pareja..."
                      className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    />
                  </div>
                </div>

                {/* Examen Físico / Evaluación Materno-Fetal */}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                    <label className="block font-bold text-[11px] text-neutral-700 uppercase tracking-wider">
                      3. Examen Físico / Evaluación Materno-Fetal
                    </label>
                    {!isSealed && (
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-neutral-400 font-mono">Macros:</span>
                        <button
                          type="button"
                          onClick={() => insertarMacroExamen("Control Prenatal Normal: Gestante lúcida, afebril, hemodinámicamente estable. Altura uterina acorde a edad gestacional. LCF rítmicos presentes. Sin dinámica uterina ni sangrado vaginal. No edemas patológicos.")}
                          className="text-[9.5px] bg-rose-50 hover:bg-rose-100 text-rose-800 px-2 py-0.5 rounded border border-rose-200 font-medium transition"
                        >
                          + Prenatal Normal
                        </button>
                        <button
                          type="button"
                          onClick={() => insertarMacroExamen("Ecografía Obstétrica: Feto único activo en cefálica, biometría acorde a edad gestacional por FUR. Placenta fúndica posterior Grado I. ILA normal. LCF presentes rítmicos.")}
                          className="text-[9.5px] bg-rose-50 hover:bg-rose-100 text-rose-800 px-2 py-0.5 rounded border border-rose-200 font-medium transition"
                        >
                          + Eco Obstétrica
                        </button>
                      </div>
                    )}
                  </div>
                  <textarea
                    rows={3}
                    disabled={isSealed}
                    value={examenFisico}
                    onChange={(e) => setExamenFisico(e.target.value)}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  />
                </div>
              </div>
            )}

            {/* ================================================================ */}
            {/* 2. CASO: GINECOLOGÍA ESPECIALIZADA (CMP 72450 • RNE)              */}
            {/* ================================================================ */}
            {modalidadAtencion === "GINECOLOGIA" && (
              <div className="space-y-3">
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[11px] text-neutral-700 uppercase tracking-wider mb-1">
                      1. Motivo de Consulta Ginecológica
                    </label>
                    <textarea
                      rows={3}
                      disabled={isSealed}
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder="Paciente acude por flujo vaginal, dolor pélvico, chequeo preventivo o descarte..."
                      className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[11px] text-neutral-700 uppercase tracking-wider mb-1">
                      2. Antecedentes Ginecológicos (Menarquia, FUM, MAC, PAP)
                    </label>
                    <textarea
                      rows={3}
                      disabled={isSealed}
                      value={antecedentes}
                      onChange={(e) => setAntecedentes(e.target.value)}
                      placeholder="Menarquia, ciclos menstruales (RC), fecha última menstruación (FUM), método anticonceptivo (MAC), PAP previo, cirugías..."
                      className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                    <label className="block font-bold text-[11px] text-neutral-700 uppercase tracking-wider">
                      3. Examen Físico Ginecológico Preferencial (Especuloscopía & Cérvix)
                    </label>
                    {!isSealed && (
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-neutral-400 font-mono">Macros:</span>
                        <button
                          type="button"
                          onClick={() => insertarMacroExamen("Examen Ginecológico Normal: Abdomen blando, depresible, no doloroso a la palpación. Genitales externos conservados. Especuloscopía: Cérvix eutrófico, sin sangrado ni leucorrea patológica. Fondo de saco libre. Tacto bimanual: Útero en AVF, tamaño normal, no doloroso a la movilización, anexos libres.")}
                          className="text-[9.5px] bg-purple-50 hover:bg-purple-100 text-purple-800 px-2 py-0.5 rounded border border-purple-200 font-medium transition"
                        >
                          + Gineco Normal
                        </button>
                        <button
                          type="button"
                          onClick={() => insertarMacroExamen("Especuloscopía: Presencia de leucorrea blanquecina grumosa en paredes vaginales, adherida, no fétida. Cérvix eritematoso compatible con vulvovaginitis por Candida sp.")}
                          className="text-[9.5px] bg-purple-50 hover:bg-purple-100 text-purple-800 px-2 py-0.5 rounded border border-purple-200 font-medium transition"
                        >
                          + Vulvovaginitis
                        </button>
                        <button
                          type="button"
                          onClick={() => insertarMacroExamen("Especuloscopía: Se observa área eritematosa periorificial cervical rojiza de 10mm (Ectropión cervical / zona de transformación activa). Toma de muestra para PAP realizada.")}
                          className="text-[9.5px] bg-purple-50 hover:bg-purple-100 text-purple-800 px-2 py-0.5 rounded border border-purple-200 font-medium transition"
                        >
                          + Ectropión / PAP
                        </button>
                      </div>
                    )}
                  </div>
                  <textarea
                    rows={3}
                    disabled={isSealed}
                    value={examenFisico}
                    onChange={(e) => setExamenFisico(e.target.value)}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  />
                </div>
              </div>
            )}

            {/* ================================================================ */}
            {/* 3. CASO: ECOGRAFÍA ESPECIALIZADA (8 MODALIDADES)                  */}
            {/* ================================================================ */}
            {modalidadAtencion === "ECOGRAFIA" && (
              <div className="space-y-3">
                {/* 1. Ecografía Prostática & Vesicoprostática */}
                {tipoEcografia === "PROSTATICA" && (
                  <div className="p-3.5 bg-neutral-50/80 rounded-xl border border-neutral-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-neutral-200 pb-1.5">
                      <span className="font-bold text-xs text-neutral-800 flex items-center gap-1.5">
                        <Calculator className="w-4 h-4 text-sky-700" />
                        Biometría Prostática & Dinámica de Evacuación (Fórmula Elipsoide)
                      </span>
                      <span className="text-[10px] font-mono text-neutral-500">Vol = DT × DAP × DL × 0.52</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">D. Transverso (DT mm)</label>
                        <input
                          type="number"
                          disabled={isSealed}
                          value={prostataDt}
                          onChange={(e) => setProstataDt(e.target.value)}
                          placeholder="Ej: 46"
                          className="w-full px-2 py-1.5 border border-neutral-300 rounded font-mono text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">D. Anteroposterior (DAP mm)</label>
                        <input
                          type="number"
                          disabled={isSealed}
                          value={prostataDap}
                          onChange={(e) => setProstataDap(e.target.value)}
                          placeholder="Ej: 38"
                          className="w-full px-2 py-1.5 border border-neutral-300 rounded font-mono text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">D. Longitudinal (DL mm)</label>
                        <input
                          type="number"
                          disabled={isSealed}
                          value={prostataDl}
                          onChange={(e) => setProstataDl(e.target.value)}
                          placeholder="Ej: 42"
                          className="w-full px-2 py-1.5 border border-neutral-300 rounded font-mono text-xs bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Volumen Prostático Calculado</span>
                          <div className="text-lg font-black font-mono text-emerald-900 mt-0.5">{volumenProstataCc} cc</div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-emerald-700 block font-medium">Clasificación HBP:</span>
                          <span className="text-xs font-bold text-emerald-950 font-mono bg-emerald-200/80 px-2 py-0.5 rounded">
                            {gradoHbp}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 bg-neutral-100/80 border border-neutral-200 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider">Dinámica Vesical & Residuo</span>
                          <span className="text-[10px] font-mono font-bold text-neutral-800">
                            RPM: <strong className={parseFloat(porcentajeResiduo) > 20 ? "text-rose-700" : "text-emerald-700"}>{porcentajeResiduo}%</strong>
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            disabled={isSealed}
                            value={prostataVejigaPre}
                            onChange={(e) => setProstataVejigaPre(e.target.value)}
                            placeholder="Pre-micción (cc)"
                            className="px-2 py-1 border border-neutral-300 rounded text-xs bg-white"
                          />
                          <input
                            type="number"
                            disabled={isSealed}
                            value={prostataResiduoPost}
                            onChange={(e) => setProstataResiduoPost(e.target.value)}
                            placeholder="Post-micción (cc)"
                            className="px-2 py-1 border border-neutral-300 rounded text-xs bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-neutral-600 mb-1 font-semibold">Morfología de Lóbulo Medio & Cápsula</label>
                      <input
                        type="text"
                        disabled={isSealed}
                        value={prostataLobuloMedio}
                        onChange={(e) => setProstataLobuloMedio(e.target.value)}
                        placeholder="No protruye al piso vesical. Cápsula íntegra, contornos regulares..."
                        className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* 2. Ecografía Obstétrica Fetal */}
                {tipoEcografia === "OBSTETRICA" && (
                  <div className="p-3.5 bg-neutral-50/80 rounded-xl border border-neutral-200 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-neutral-200 pb-1">
                      <span className="font-bold text-xs text-neutral-800">Biometría Fetal Estandarizada</span>
                      <span className="text-[10px] font-mono text-neutral-500">Curvas Hadlock</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                      <div>
                        <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">D.B.P. (mm)</label>
                        <input
                          type="number"
                          disabled={isSealed}
                          value={ecoDbp}
                          onChange={(e) => setEcoDbp(e.target.value)}
                          placeholder="Ej: 54"
                          className="w-full px-2 py-1 border border-neutral-300 rounded font-mono text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">Long. Femoral LF (mm)</label>
                        <input
                          type="number"
                          disabled={isSealed}
                          value={ecoLf}
                          onChange={(e) => setEcoLf(e.target.value)}
                          placeholder="Ej: 40"
                          className="w-full px-2 py-1 border border-neutral-300 rounded font-mono text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">Circ. Abdominal CA (mm)</label>
                        <input
                          type="number"
                          disabled={isSealed}
                          value={ecoCa}
                          onChange={(e) => setEcoCa(e.target.value)}
                          placeholder="Ej: 180"
                          className="w-full px-2 py-1 border border-neutral-300 rounded font-mono text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">P.F.E. Estimado (g)</label>
                        <input
                          type="number"
                          disabled={isSealed}
                          value={ecoPfe}
                          onChange={(e) => setEcoPfe(e.target.value)}
                          placeholder="Ej: 650"
                          className="w-full px-2 py-1 border border-neutral-300 rounded font-mono text-xs bg-white font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                      <div>
                        <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">Frec. Cardíaca Fetal (lpm)</label>
                        <input
                          type="number"
                          disabled={isSealed}
                          value={ecoFcf}
                          onChange={(e) => setEcoFcf(e.target.value)}
                          placeholder="142"
                          className="w-full px-2 py-1 border border-neutral-300 rounded font-mono text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">Placenta</label>
                        <input
                          type="text"
                          disabled={isSealed}
                          value={ecoPlacenta}
                          onChange={(e) => setEcoPlacenta(e.target.value)}
                          className="w-full px-2 py-1 border border-neutral-300 rounded text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">Líquido Amniótico (ILA)</label>
                        <input
                          type="text"
                          disabled={isSealed}
                          value={ecoIla}
                          onChange={(e) => setEcoIla(e.target.value)}
                          className="w-full px-2 py-1 border border-neutral-300 rounded text-xs bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Ecografía Abdominal Completa */}
                {tipoEcografia === "ABDOMINAL" && (
                  <div className="p-3.5 bg-neutral-50/80 rounded-xl border border-neutral-200 space-y-2.5">
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">Hígado</label>
                        <textarea
                          rows={2}
                          disabled={isSealed}
                          value={ecoHigado}
                          onChange={(e) => setEcoHigado(e.target.value)}
                          placeholder="Morfología y ecogenicidad habitual, bordes regulares, sin lesiones focales..."
                          className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">Vesícula & Vías Biliares</label>
                        <textarea
                          rows={2}
                          disabled={isSealed}
                          value={ecoVesicula}
                          onChange={(e) => setEcoVesicula(e.target.value)}
                          placeholder="Paredes finas menores de 3mm, alitiásica. Vía biliar intra y extrahepática normal..."
                          className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">Páncreas & Bazo</label>
                        <input
                          type="text"
                          disabled={isSealed}
                          value={ecoPancreasBazo}
                          onChange={(e) => setEcoPancreasBazo(e.target.value)}
                          placeholder="Características ecográficas conservadas..."
                          className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">Cavidad Peritoneal</label>
                        <input
                          type="text"
                          disabled={isSealed}
                          value={ecoLiquidoLibre}
                          onChange={(e) => setEcoLiquidoLibre(e.target.value)}
                          placeholder="No se observa líquido libre en espacios de Morrison ni Douglas..."
                          className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white"
                        />
                      </div>
                    </div>

                    {!isSealed && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[9px] text-neutral-400 font-mono">Macros:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setEcoHigado("Hígado de tamaño y morfología conservada. Parénquima homogéneo sin lesiones focales ni difusas.");
                            setEcoVesicula("Vesícula biliar distendida de paredes delgadas (< 3mm), contenido anecoico sin litiasis. Vía biliar normal.");
                            setEcoPancreasBazo("Páncreas y bazo de características ecográficas normales.");
                            setEcoLiquidoLibre("No se observa líquido libre en cavidad peritoneal.");
                            setConclusionEcografica("Estudio ecográfico abdominal completo dentro de límites normales.");
                          }}
                          className="text-[9.5px] bg-sky-50 hover:bg-sky-100 text-sky-800 px-2 py-0.5 rounded border border-sky-200 font-medium transition"
                        >
                          + Abdomen Normal
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEcoHigado("Hígado con aumento difuso de su ecogenicidad (brillo hepático aumentado), atenuación sónica posterior leve. Compatible con esteatosis.");
                            setConclusionEcografica("1. Esteatosis Hepática Leve a Moderada (Grado I - II).\n2. Resto de parénquima abdominal evaluado sin alteraciones agudas.");
                            setSugerenciasEcograficas("Plan nutricional y evaluación de perfil lipídico y enzimas hepáticas (TGO, TGP).");
                          }}
                          className="text-[9.5px] bg-sky-50 hover:bg-sky-100 text-sky-800 px-2 py-0.5 rounded border border-sky-200 font-medium transition"
                        >
                          + Esteatosis Grado I-II
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEcoVesicula("Vesícula biliar distendida, presenta en su interior imágenes litiásicas múltiples de hasta 12mm que producen sombra acústica posterior neta.");
                            setConclusionEcografica("1. Colelitiasis vesicular sintomática sin signos ecográficos de colecistitis aguda.");
                            setSugerenciasEcograficas("Evaluación por Cirugía General para programación de colecistectomía laparoscópica electiva.");
                          }}
                          className="text-[9.5px] bg-sky-50 hover:bg-sky-100 text-sky-800 px-2 py-0.5 rounded border border-sky-200 font-medium transition"
                        >
                          + Colelitiasis
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Ecografía Renal */}
                {tipoEcografia === "RENAL" && (
                  <div className="p-3.5 bg-neutral-50/80 rounded-xl border border-neutral-200 space-y-2.5">
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">Riñón Derecho</label>
                        <textarea
                          rows={2}
                          disabled={isSealed}
                          value={ecoRinonDer}
                          onChange={(e) => setEcoRinonDer(e.target.value)}
                          placeholder="Morfología, dimensiones normales, espesor cortical conservado, sin litiasis ni ectasia..."
                          className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">Riñón Izquierdo</label>
                        <textarea
                          rows={2}
                          disabled={isSealed}
                          value={ecoRinonIzq}
                          onChange={(e) => setEcoRinonIzq(e.target.value)}
                          placeholder="Dimensiones habituales, adecuada diferenciación córtico-medular, sin hidronefrosis..."
                          className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">Vejiga Urinaria</label>
                      <input
                        type="text"
                        disabled={isSealed}
                        value={ecoVejigaRenal}
                        onChange={(e) => setEcoVejigaRenal(e.target.value)}
                        placeholder="Buena repleción, paredes finas y regulares, sin litiasis endoluminales..."
                        className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white"
                      />
                    </div>

                    {!isSealed && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[9px] text-neutral-400 font-mono">Macros:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setEcoRinonDer("Riñón derecho de situación y tamaño normal (105 x 44 mm). Parénquima y diferenciación córtico-medular conservada. Seno renal sin ectasias ni litiasis.");
                            setEcoRinonIzq("Riñón izquierdo de situación y tamaño normal (108 x 46 mm). Seno renal sin imágenes litiásicas ni dilatación calicial.");
                            setEcoVejigaRenal("Vejiga adecuadamente distendida, paredes delgadas y regulares.");
                            setConclusionEcografica("Estudio ecográfico renal y vesical bilateral dentro de límites normales.");
                          }}
                          className="text-[9.5px] bg-sky-50 hover:bg-sky-100 text-sky-800 px-2 py-0.5 rounded border border-sky-200 font-medium transition"
                        >
                          + Renal Bilateral Normal
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEcoRinonDer("Riñón derecho presenta en grupo calicial medio imagen hiperecogénica de 6.2 mm con sombra acústica posterior. Sin ectasia.");
                            setConclusionEcografica("1. Litiasis renal derecha única no obstructiva (6.2 mm).\n2. Riñón izquierdo y vejiga normales.");
                            setSugerenciasEcograficas("Evaluación urológica y análisis de sedimento de orina.");
                          }}
                          className="text-[9.5px] bg-sky-50 hover:bg-sky-100 text-sky-800 px-2 py-0.5 rounded border border-sky-200 font-medium transition"
                        >
                          + Litiasis Renal Derecha
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. Partes Blandas & Hernias */}
                {tipoEcografia === "PARTES_BLANDAS" && (
                  <div className="p-3.5 bg-neutral-50/80 rounded-xl border border-neutral-200 space-y-2.5">
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">Región Anatómica Explorada</label>
                        <input
                          type="text"
                          disabled={isSealed}
                          value={ecoPartesRegion}
                          onChange={(e) => setEcoPartesRegion(e.target.value)}
                          placeholder="Ej. Pared abdominal anterior, muslo derecho, región inguinal..."
                          className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">Dimensiones de la Lesión</label>
                        <input
                          type="text"
                          disabled={isSealed}
                          value={ecoPartesDimensiones}
                          onChange={(e) => setEcoPartesDimensiones(e.target.value)}
                          placeholder="Ej. 28 x 14 x 18 mm"
                          className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">Descripción de Hallazgos / Valsalva</label>
                      <textarea
                        rows={2}
                        disabled={isSealed}
                        value={ecoPartesHallazgos}
                        onChange={(e) => setEcoPartesHallazgos(e.target.value)}
                        placeholder="Masa nodular ovalada en TCSC, límites definidos, sin vascularización Doppler..."
                        className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white"
                      />
                    </div>

                    {!isSealed && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[9px] text-neutral-400 font-mono">Macros:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setEcoPartesHallazgos("A nivel del tejido celular subcutáneo se evidencia lesión sólida, ovalada, de contornos bien delimitados, discretamente hiperecogénica, compresible, sin captación Doppler.");
                            setConclusionEcografica("Hallazgos ecográficos compatibles con Tumoración Benigna de Tejido Adiposo (Lipoma en TCSC).");
                          }}
                          className="text-[9.5px] bg-sky-50 hover:bg-sky-100 text-sky-800 px-2 py-0.5 rounded border border-sky-200 font-medium transition"
                        >
                          + Lipoma TCSC
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEcoPartesHallazgos("Defecto de la pared con protrusión de saco herniario reducible con maniobra de Valsalva.");
                            setConclusionEcografica("Defecto herniario reducible sin signos de incarceración ni estrangulamiento agudo.");
                          }}
                          className="text-[9.5px] bg-sky-50 hover:bg-sky-100 text-sky-800 px-2 py-0.5 rounded border border-sky-200 font-medium transition"
                        >
                          + Hernia Reducible
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 6. Mamaria & Tiroidea */}
                {tipoEcografia === "MAMARIA" && (
                  <div className="p-3.5 bg-neutral-50/80 rounded-xl border border-neutral-200 space-y-2">
                    <label className="block text-[10px] text-neutral-600 font-semibold">Clasificación Ecográfica Mamaria (BI-RADS)</label>
                    <select
                      disabled={isSealed}
                      value={ecoBirads}
                      onChange={(e) => setEcoBirads(e.target.value)}
                      className="w-full p-2 border border-neutral-300 rounded-lg text-xs font-bold text-neutral-900 bg-white"
                    >
                      <option value="BI-RADS 1: Negativo / Hallazgos normales">BI-RADS 1: Negativo / Hallazgos normales</option>
                      <option value="BI-RADS 2: Hallazgos benignos (Quiste simple, fibroadenoma típico)">BI-RADS 2: Hallazgos benignos (Quiste simple / Fibroadenoma calcificado)</option>
                      <option value="BI-RADS 3: Probablemente benigno (< 2% malignidad) - Seguimiento 6 meses">BI-RADS 3: Probablemente benigno - Control en 6 meses</option>
                      <option value="BI-RADS 4: Sospecha de malignidad (Requiere biopsia)">BI-RADS 4: Sospecha de malignidad (Requiere biopsia)</option>
                    </select>
                  </div>
                )}

                {tipoEcografia === "TIROIDEA" && (
                  <div className="p-3.5 bg-neutral-50/80 rounded-xl border border-neutral-200 space-y-2">
                    <label className="block text-[10px] text-neutral-600 font-semibold">Clasificación Tiroidea (TI-RADS)</label>
                    <select
                      disabled={isSealed}
                      value={ecoTirads}
                      onChange={(e) => setEcoTirads(e.target.value)}
                      className="w-full p-2 border border-neutral-300 rounded-lg text-xs font-bold text-neutral-900 bg-white"
                    >
                      <option value="TI-RADS 1: Benigno / Sin nódulos">TI-RADS 1: Benigno / Sin nódulos</option>
                      <option value="TI-RADS 2: No sospechoso (Quiste coloide)">TI-RADS 2: No sospechoso / Benigno</option>
                      <option value="TI-RADS 3: Leve sospecha de malignidad">TI-RADS 3: Leve sospecha</option>
                      <option value="TI-RADS 4: Moderada sospecha de malignidad">TI-RADS 4: Moderada sospecha</option>
                    </select>
                  </div>
                )}

                {/* Conclusión & Sugerencias Ecográficas */}
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-[11px] text-sky-950 uppercase tracking-wider">
                        Conclusión Diagnóstica del Informe *
                      </label>
                      {!isSealed && (
                        <button
                          type="button"
                          onClick={() => insertarMacroConclusionEco("Estudio ecográfico dentro de límites normales para la edad y motivo de evaluación.")}
                          className="text-[9px] text-sky-700 font-bold hover:underline"
                        >
                          + Normal
                        </button>
                      )}
                    </div>
                    <textarea
                      rows={3}
                      disabled={isSealed}
                      value={conclusionEcografica}
                      onChange={(e) => setConclusionEcografica(e.target.value)}
                      placeholder="Conclusión diagnóstica del estudio ultrasonográfico..."
                      className="w-full p-2.5 border border-sky-300 bg-sky-50/30 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-sky-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[11px] text-neutral-700 uppercase tracking-wider mb-1">
                      Sugerencias & Recomendaciones Médicas
                    </label>
                    <textarea
                      rows={3}
                      disabled={isSealed}
                      value={sugerenciasEcograficas}
                      onChange={(e) => setSugerenciasEcograficas(e.target.value)}
                      placeholder="Controles de seguimiento, exámenes complementarios..."
                      className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ================================================================ */}
            {/* 4. CASO: MEDICINA GENERAL (CMP • CONSULTA AMBULATORIA)            */}
            {/* ================================================================ */}
            {modalidadAtencion === "MEDICINA_GENERAL" && (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2">
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">Tiempo de Enfermedad (TE)</label>
                      <input
                        type="text"
                        disabled={isSealed}
                        value={tiempoEnfermedad}
                        onChange={(e) => setTiempoEnfermedad(e.target.value)}
                        placeholder="Ej. 3 días, 1 semana..."
                        className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg font-mono text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">Descanso Médico Sugerido (Días)</label>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        disabled={isSealed}
                        value={descansoMedicoDias}
                        onChange={(e) => setDescansoMedicoDias(e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg font-mono text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Alertas / Comorbilidades:</span>
                    <span className="text-[9.5px] bg-white border border-neutral-200 text-neutral-700 px-2 py-0.5 rounded font-medium">HTA</span>
                    <span className="text-[9.5px] bg-white border border-neutral-200 text-neutral-700 px-2 py-0.5 rounded font-medium">DM2</span>
                    <span className="text-[9.5px] bg-white border border-neutral-200 text-neutral-700 px-2 py-0.5 rounded font-medium">Asma</span>
                    <span className="text-[9.5px] bg-white border border-neutral-200 text-neutral-700 px-2 py-0.5 rounded font-medium">Gastritis</span>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[11px] text-neutral-700 uppercase tracking-wider mb-1">
                      1. Motivo de Consulta & Relato Cronológico
                    </label>
                    <textarea
                      rows={3}
                      disabled={isSealed}
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder="Relato detallado de la sintomatología actual..."
                      className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[11px] text-neutral-700 uppercase tracking-wider mb-1">
                      2. Antecedentes Mórbidos, Quirúrgicos & Alergias
                    </label>
                    <textarea
                      rows={3}
                      disabled={isSealed}
                      value={antecedentes}
                      onChange={(e) => setAntecedentes(e.target.value)}
                      placeholder="Enfermedades crónicas, medicación habitual..."
                      className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                    <label className="block font-bold text-[11px] text-neutral-700 uppercase tracking-wider">
                      3. Examen Físico Regional Dirigido
                    </label>
                    {!isSealed && (
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-neutral-400 font-mono">Macros:</span>
                        <button
                          type="button"
                          onClick={() => insertarMacroExamenRegional("Examen General: Paciente en buen estado general, hidratado, orientado en tiempo y espacio. Faringe congestiva, no exudados. Murmullo vesicular pasa bien en ambos campos pulmonares, no ruidos agregados. Abdomen blando, no doloroso.")}
                          className="text-[9.5px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 font-medium transition"
                        >
                          + Normal General
                        </button>
                        <button
                          type="button"
                          onClick={() => insertarMacroExamenRegional("Columna lumbosacra con contractura paravertebral bilateral, dolor a la palpación y flexión anterior. Maniobra de Lasègue negativa. Sin déficit neurológico motor ni sensitivo.")}
                          className="text-[9.5px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 font-medium transition"
                        >
                          + Lumbalgia
                        </button>
                      </div>
                    )}
                  </div>
                  <textarea
                    rows={3}
                    disabled={isSealed}
                    value={examenRegionalMedicina}
                    onChange={(e) => setExamenRegionalMedicina(e.target.value)}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  />
                </div>
              </div>
            )}

            {/* ================================================================ */}
            {/* 5. CASO: EXÁMENES DE LABORATORIO & TIRAS (POCT RÁPIDO)            */}
            {/* ================================================================ */}
            {modalidadAtencion === "LABORATORIO" && (
              <div className="space-y-3">
                <div className="p-3.5 bg-amber-50/40 border border-amber-200 rounded-xl space-y-3">
                  <span className="font-bold text-xs text-amber-950 block">Panel de Pruebas Rápidas & Tiras Reactivas POCT</span>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">Leucocitos en Orina</label>
                      <select
                        disabled={isSealed}
                        value={labOrinaLeucocitos}
                        onChange={(e) => setLabOrinaLeucocitos(e.target.value)}
                        className={`w-full p-2 border rounded-lg text-xs font-bold ${
                          labOrinaLeucocitos === "Negativo" ? "border-emerald-300 text-emerald-900 bg-emerald-50/50" : "border-rose-400 text-rose-900 bg-rose-50"
                        }`}
                      >
                        <option value="Negativo">Negativo (Normal)</option>
                        <option value="Trazas">Trazas (±)</option>
                        <option value="Positivo (+)">Positivo (+)</option>
                        <option value="Positivo (++)">Positivo (++)</option>
                        <option value="Positivo (+++)">Positivo (+++)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">Proteínas en Orina</label>
                      <select
                        disabled={isSealed}
                        value={labOrinaProteinas}
                        onChange={(e) => setLabOrinaProteinas(e.target.value)}
                        className={`w-full p-2 border rounded-lg text-xs font-bold ${
                          labOrinaProteinas === "Negativo" ? "border-emerald-300 text-emerald-900 bg-emerald-50/50" : "border-rose-400 text-rose-900 bg-rose-50"
                        }`}
                      >
                        <option value="Negativo">Negativo (Normal)</option>
                        <option value="Trazas">Trazas (±)</option>
                        <option value="Positivo (+)">Positivo (+)</option>
                        <option value="Positivo (++)">Positivo (++)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">Nitritos en Orina</label>
                      <select
                        disabled={isSealed}
                        value={labOrinaNitritos}
                        onChange={(e) => setLabOrinaNitritos(e.target.value)}
                        className={`w-full p-2 border rounded-lg text-xs font-bold ${
                          labOrinaNitritos === "Negativo" ? "border-emerald-300 text-emerald-900 bg-emerald-50/50" : "border-rose-400 text-rose-900 bg-rose-50"
                        }`}
                      >
                        <option value="Negativo">Negativo (Normal)</option>
                        <option value="Positivo (+)">Positivo (+) (Sugiere ITU)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 border-t border-amber-200/60">
                    <div>
                      <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">Hemoglobina Capilar (g/dL)</label>
                      <input
                        type="number"
                        step="0.1"
                        disabled={isSealed}
                        value={labHemoglobina}
                        onChange={(e) => setLabHemoglobina(e.target.value)}
                        placeholder="Ej. 12.4"
                        className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg font-mono font-bold text-xs bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">Glucosa Rápida (mg/dL)</label>
                      <input
                        type="number"
                        disabled={isSealed}
                        value={labGlucosa}
                        onChange={(e) => setLabGlucosa(e.target.value)}
                        placeholder="Ej. 92"
                        className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg font-mono font-bold text-xs bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">Prueba de Embarazo (GCH)</label>
                      <select
                        disabled={isSealed}
                        value={labPruebaEmbarazo}
                        onChange={(e) => setLabPruebaEmbarazo(e.target.value)}
                        className={`w-full p-2 border rounded-lg text-xs font-bold ${
                          labPruebaEmbarazo === "Positiva (+)" ? "border-emerald-500 bg-emerald-50 text-emerald-900" : "border-neutral-300 bg-white"
                        }`}
                      >
                        <option value="No realizada">No realizada</option>
                        <option value="Negativa">Negativa (-)</option>
                        <option value="Positiva (+)">Positiva (+) Reactiva</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[11px] text-neutral-700 uppercase tracking-wider mb-1">
                    Observaciones Analíticas / Control de Calidad
                  </label>
                  <textarea
                    rows={2}
                    disabled={isSealed}
                    value={labObservaciones}
                    onChange={(e) => setLabObservaciones(e.target.value)}
                    placeholder="Detalles de la muestra o validación técnica..."
                    className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  />
                </div>
              </div>
            )}

            {/* ================================================================ */}
            {/* DIAGNÓSTICOS CIE-10 CONTEXTUALIZADOS Y FILTRADOS ESTRICTAMENTE    */}
            {/* ================================================================ */}
            <div className="space-y-2 pt-2 border-t border-neutral-100">
              <div className="flex items-center justify-between">
                <label className="font-bold text-[11px] text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-brand-700" />
                  <span>Diagnósticos CIE-10 *</span>
                  <span className="font-mono text-[9.5px] font-bold text-brand-800 bg-brand-50 px-2 py-0.2 rounded border border-brand-200 ml-1">
                    {modalidadAtencion === "ECOGRAFIA" ? tipoEcografia.replace("_", " ") : modalidadAtencion}
                  </span>
                </label>
                <span className="text-[10px] text-neutral-400">Contextual Dinámico</span>
              </div>

              {/* Quick Chips Contextuales según modalidad y sub-estudio exacto */}
              {!isSealed && (
                <div className="flex flex-wrap items-center gap-1.5 pb-1">
                  <span className="text-[9px] text-neutral-400 font-mono">Sugerencias:</span>
                  {getCie10Sugeridos(modalidadAtencion, tipoEcografia).map((c) => (
                    <button
                      key={c.codigo}
                      type="button"
                      onClick={() => handleAgregarCie(c)}
                      className="text-[9.5px] bg-neutral-100 hover:bg-neutral-200 text-neutral-800 px-2 py-0.5 rounded-md border border-neutral-200 font-semibold transition"
                    >
                      + {c.codigo} ({c.descripcion.length > 22 ? c.descripcion.slice(0, 22) + "..." : c.descripcion})
                    </button>
                  ))}
                </div>
              )}

              {/* Lista de Diagnósticos Seleccionados */}
              <div className="space-y-1">
                {diagnosticos.map((dx) => (
                  <div
                    key={dx.id}
                    className="flex items-center justify-between p-2 px-2.5 bg-neutral-50 rounded-lg border border-neutral-200 text-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold bg-neutral-200 text-neutral-800 px-1.5 py-0.5 rounded text-[10px]">
                        {dx.codigo}
                      </span>
                      <span className="font-semibold text-neutral-900">{dx.descripcion}</span>
                      <span className="text-[10px] font-mono text-neutral-400">({dx.tipo})</span>
                    </div>
                    {!isSealed && (
                      <button
                        type="button"
                        onClick={() => setDiagnosticos(diagnosticos.filter((d) => d.id !== dx.id))}
                        className="text-neutral-400 hover:text-rose-600 p-1 rounded hover:bg-white transition"
                        title="Quitar diagnóstico"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Input de Búsqueda Predictiva con Filtrado Contextual Inteligente */}
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
                    placeholder="Escriba código o patología (ej. Z34, gastritis, próstata, cálculo, lipoma)..."
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  />
                  {mostrarSugerenciasCie && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg z-20 max-h-52 overflow-y-auto">
                      {(() => {
                        const listaAFiltrar =
                          busquedaCie.trim().length === 0
                            ? getCie10Sugeridos(modalidadAtencion, tipoEcografia)
                            : CIE10_FRECUENTES.filter(
                                (c) =>
                                  c.codigo.toLowerCase().includes(busquedaCie.toLowerCase()) ||
                                  c.descripcion.toLowerCase().includes(busquedaCie.toLowerCase())
                              );

                        return (
                          <>
                            {listaAFiltrar.map((item) => (
                              <div
                                key={item.codigo}
                                onClick={() => handleAgregarCie(item)}
                                className="p-2.5 hover:bg-neutral-50 cursor-pointer border-b border-neutral-100 last:border-0 flex items-center justify-between"
                              >
                                <span className="font-medium text-neutral-800 text-xs">{item.descripcion}</span>
                                <span className="font-mono font-bold text-[10px] text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
                                  {item.codigo}
                                </span>
                              </div>
                            ))}
                            {busquedaCie.trim().length >= 2 && (
                              <div
                                onClick={() => {
                                  const partes = busquedaCie.trim().split(" ");
                                  const cod = /^[A-Za-z][0-9]/.test(partes[0]) ? partes[0].toUpperCase() : "CIE-ESP";
                                  const desc =
                                    /^[A-Za-z][0-9]/.test(partes[0]) && partes.length > 1
                                      ? partes.slice(1).join(" ")
                                      : busquedaCie.trim();
                                  handleAgregarCie({
                                    codigo: cod,
                                    descripcion: desc,
                                  });
                                }}
                                className="p-2.5 bg-brand-50 hover:bg-brand-100 text-brand-900 cursor-pointer border-t border-brand-200 font-bold text-xs flex items-center justify-between"
                              >
                                <span>+ Agregar diagnóstico libre: "{busquedaCie}"</span>
                                <span className="font-mono text-[9px] bg-brand-200 px-1.5 py-0.5 rounded">Manual</span>
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

            {/* ================================================================ */}
            {/* PLAN DE TRABAJO & PRESCRIPCIÓN MÉDICA (DCI)                       */}
            {/* ================================================================ */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                <label className="block font-bold text-[11px] text-neutral-700 uppercase tracking-wider">
                  Plan de Trabajo & Prescripción (DCI) *
                </label>
                {!isSealed && (
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-neutral-400 font-mono">Macros:</span>
                    {modalidadAtencion === "OBSTETRICIA" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => insertarMacroPlan("1. Sulfato Ferroso 300mg + Ácido Fólico 400mcg: 1 tab VO cada 24h con agua o cítricos.\n2. Calcio 500mg tab: 1 tab VO cada 12h.\n3. Ecografía morfológica de control a las 22 semanas.\n4. Signos de alarma explicados: cefalea intensa, zumbido de oídos, pérdidas vaginales de líquido o sangre.\n5. Próximo control prenatal programado en 4 semanas.")}
                          className="text-[9.5px] bg-rose-50 hover:bg-rose-100 text-rose-800 px-2 py-0.5 rounded border border-rose-200 font-medium transition"
                        >
                          + Control Prenatal
                        </button>
                      </>
                    ) : modalidadAtencion === "GINECOLOGIA" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => insertarMacroPlan("1. Clotrimazol 500mg óvulo vaginal: 1 óvulo dosis única al acostarse.\n2. Ketoconazol 2% crema: Aplicar en vulva cada 12h por 5 días.\n3. Ropa interior de algodón, evitar jabones perfumados y duchas vaginales.\n4. Reevaluación clínica en 10 días.")}
                          className="text-[9.5px] bg-purple-50 hover:bg-purple-100 text-purple-800 px-2 py-0.5 rounded border border-purple-200 font-medium transition"
                        >
                          + Tto Vaginitis
                        </button>
                        <button
                          type="button"
                          onClick={() => insertarMacroPlan("1. Ácido Mefenámico 500mg tab: 1 tab VO cada 8h por 3 días durante el inicio del ciclo.\n2. Medidas higiénico-dietéticas y calor local.")}
                          className="text-[9.5px] bg-purple-50 hover:bg-purple-100 text-purple-800 px-2 py-0.5 rounded border border-purple-200 font-medium transition"
                        >
                          + Dismenorrea
                        </button>
                      </>
                    ) : modalidadAtencion === "ECOGRAFIA" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => insertarMacroPlan("1. Entrega de informe ecográfico e imágenes impresas/digitales al paciente.\n2. Llevar informe a médico tratante para correlato clínico integral.\n3. Cumplir con recomendaciones y controles ecográficos sugeridos.")}
                          className="text-[9.5px] bg-sky-50 hover:bg-sky-100 text-sky-800 px-2 py-0.5 rounded border border-sky-200 font-medium transition"
                        >
                          + Plan Ecográfico
                        </button>
                      </>
                    ) : modalidadAtencion === "MEDICINA_GENERAL" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => insertarMacroPlan("1. Paracetamol 500mg tab: 1 tab VO c/8h por 3 días si hay fiebre o malestar.\n2. Abundante líquido oral tibio y reposo relativo.\n3. Signos de alarma explicados: dificultad respiratoria, fiebre persistente mayor a 38.5°C.")}
                          className="text-[9.5px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 font-medium transition"
                        >
                          + Tto IRA
                        </button>
                        <button
                          type="button"
                          onClick={() => insertarMacroPlan("1. Omeprazol 20mg cap: 1 cap VO en ayunas por 14 días.\n2. Dieta fraccionada baja en grasas, condimentos, café y cítricos.")}
                          className="text-[9.5px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 font-medium transition"
                        >
                          + Tto Gastritis
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => insertarMacroPlan("1. Lectura inmediata de resultados entregados al paciente.\n2. Interconsulta médica según hallazgos analíticos.")}
                          className="text-[9.5px] bg-amber-50 hover:bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200 font-medium transition"
                        >
                          + Plan Laboratorio
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              <textarea
                rows={3}
                disabled={isSealed}
                value={planTratamiento}
                onChange={(e) => setPlanTratamiento(e.target.value)}
                className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
            </div>
          </div>

          {/* ================================================================ */}
          {/* HERRAMIENTAS SECUNDARIAS INTEGRADAS EN PESTAÑAS INFERIORES         */}
          {/* (IMÁGENES ADJUNTAS | PRÓXIMO CONTROL & WHATSAPP | ADENDAS)       */}
          {/* ================================================================ */}
          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-2xs">
            {/* Header de Pestañas de Herramientas */}
            <div className="bg-neutral-50/80 border-b border-neutral-200 px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHerramientaActiva("imagenes")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                    herramientaActiva === "imagenes"
                      ? "bg-white text-neutral-900 shadow-xs border border-neutral-200"
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/70"
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5 text-sky-700" />
                  <span>Capturas & Ecografías ({imagenes.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHerramientaActiva("reagendar")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                    herramientaActiva === "reagendar"
                      ? "bg-white text-neutral-900 shadow-xs border border-neutral-200"
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/70"
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Próximo Control & WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHerramientaActiva("adendas")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                    herramientaActiva === "adendas"
                      ? "bg-white text-neutral-900 shadow-xs border border-neutral-200"
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/70"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-amber-700" />
                  <span>Adendas Evolutivas ({adendas.length})</span>
                </button>
              </div>

              {herramientaActiva === "imagenes" && !isSealed && (
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
                    className="text-[10px] font-bold text-brand-700 hover:text-brand-900 flex items-center gap-1 bg-white hover:bg-neutral-100 px-2.5 py-1 rounded-lg transition border border-neutral-300 shadow-2xs"
                  >
                    <Upload className="w-3 h-3" /> + Adjuntar Captura
                  </button>
                </>
              )}

              {herramientaActiva === "adendas" && isSealed && (
                <button
                  type="button"
                  onClick={() => setShowAdendaModal(true)}
                  className="text-[10px] font-bold text-white bg-amber-700 hover:bg-amber-800 px-2.5 py-1 rounded-lg transition flex items-center gap-1 shadow-2xs"
                >
                  <PlusCircle className="w-3 h-3" /> + Nueva Adenda
                </button>
              )}
            </div>

            {/* Contenido de la Pestaña Activa */}
            <div className="p-3.5">
              {/* PESTAÑA 1: IMÁGENES / ECOGRAFÍAS */}
              {herramientaActiva === "imagenes" && (
                <div>
                  {imagenes.length === 0 ? (
                    <div className="py-6 text-center text-neutral-400">
                      <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-40 text-neutral-400" />
                      <p className="font-semibold text-xs text-neutral-600">Sin imágenes adjuntas en este encuentro</p>
                      <p className="text-[10px] text-neutral-400 mt-0.5">Adjunte capturas del ecógrafo o exámenes radiográficos para incorporarlos al informe.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {imagenes.map((img) => (
                        <div
                          key={img.id}
                          className="p-2 bg-neutral-50 rounded-xl border border-neutral-200 flex flex-col justify-between group hover:border-neutral-300 transition"
                        >
                          <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black/5 flex items-center justify-center">
                            <img src={img.url} alt={img.titulo} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setModalImagen(img)}
                              className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition"
                              title="Ampliar imagen"
                            >
                              <Maximize2 className="w-5 h-5" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between mt-2 pt-1 border-t border-neutral-200/60">
                            <div className="truncate pr-1">
                              <span className="font-semibold text-neutral-900 block truncate text-[11px]">{img.titulo}</span>
                              <span className="text-[9.5px] text-neutral-400 font-mono">{img.hora}</span>
                            </div>
                            {!isSealed && (
                              <button
                                type="button"
                                onClick={() => setImagenes(imagenes.filter((i) => i.id !== img.id))}
                                className="p-1 text-neutral-400 hover:text-rose-600 rounded"
                                title="Eliminar imagen"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PESTAÑA 2: PRÓXIMO CONTROL & WHATSAPP */}
              {herramientaActiva === "reagendar" && (
                <form onSubmit={handleGuardarReagendamiento} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">Fecha de la Próxima Cita *</label>
                      <input
                        type="date"
                        required
                        value={reagendarFecha}
                        onChange={(e) => setReagendarFecha(e.target.value)}
                        className="w-full p-2 border border-neutral-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">Hora Programada *</label>
                      <input
                        type="time"
                        required
                        value={reagendarHora}
                        onChange={(e) => setReagendarHora(e.target.value)}
                        className="w-full p-2 border border-neutral-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">Sede</label>
                      <select
                        value={reagendarSede}
                        onChange={(e) => setReagendarSede(e.target.value)}
                        className="w-full p-2 border border-neutral-300 rounded-lg text-xs bg-white"
                      >
                        <option value="Independencia">Sede Independencia</option>
                        <option value="Vivanco">Sede Vivanco</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">Estudio / Motivo</label>
                      <input
                        type="text"
                        value={reagendarMotivo}
                        onChange={(e) => setReagendarMotivo(e.target.value)}
                        placeholder="Ej. Control Prenatal 28 sem..."
                        className="w-full p-2 border border-neutral-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-neutral-900 hover:bg-black text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Programar en Calendario</span>
                    </button>

                    <a
                      href={generarEnlaceWhatsApp()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 shadow-xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Enviar Recordatorio por WhatsApp</span>
                    </a>

                    {reagendadaExito && (
                      <span className="p-1.5 px-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-semibold">
                        ✓ Cita registrada exitosamente.
                      </span>
                    )}
                  </div>
                </form>
              )}

              {/* PESTAÑA 3: ADENDAS EVOLUTIVAS */}
              {herramientaActiva === "adendas" && (
                <div className="space-y-2">
                  {adendas.length === 0 ? (
                    <div className="py-6 text-center text-neutral-400">
                      <FileText className="w-6 h-6 mx-auto mb-1 opacity-40 text-neutral-400" />
                      <p className="font-semibold text-xs text-neutral-600">Sin adendas clínicas agregadas</p>
                      <p className="text-[10px] text-neutral-400 mt-0.5">
                        {isSealed
                          ? 'Use el botón "+ Nueva Adenda" para registrar notas de evolución o aclaraciones.'
                          : 'Las adendas se habilitan tras sellar la historia clínica.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {adendas.map((a, i) => (
                        <div key={i} className="p-3 bg-amber-50/40 rounded-xl border border-amber-200 text-xs space-y-1 shadow-2xs">
                          <div className="flex items-center justify-between text-[10px] border-b border-amber-100 pb-1 text-neutral-500">
                            <span className="font-bold text-neutral-900">
                              Adenda #{i + 1} &bull; {a.autor || "Profesional Responsable"}
                            </span>
                            <span className="font-mono text-[9px]">{a.fecha}</span>
                          </div>
                          <p className="text-neutral-800 leading-relaxed whitespace-pre-wrap">{a.texto}</p>
                          {a.hash && (
                            <div className="text-[9px] text-amber-900 font-mono break-all pt-0.5 bg-white p-1 rounded border border-amber-200">
                              Hash SHA-256: {a.hash}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
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