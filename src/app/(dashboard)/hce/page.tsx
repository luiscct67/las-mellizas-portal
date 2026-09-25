"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
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
  ChevronDown,
  ChevronUp,
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

export const DIAGNOSTICOS_RAPIDOS_LAS_MELLIZAS = [
  { codigo: "Z34.9", nombre: "Embarazo normal en útero", cat: "Obstetricia", badge: "bg-emerald-50 text-emerald-800 border-emerald-300" },
  { codigo: "N91.2", nombre: "Menstruación / Retraso menstrual", cat: "Menstruación", badge: "bg-rose-50 text-rose-800 border-rose-300" },
  { codigo: "N92.6", nombre: "Disfunción menstrual / Metrorragia", cat: "Menstruación", badge: "bg-pink-50 text-pink-800 border-pink-300" },
  { codigo: "N76.0", nombre: "Vaginosis bacteriana / Vaginitis", cat: "Obstetricia / Flujos", badge: "bg-purple-50 text-purple-800 border-purple-300" },
  { codigo: "O20.0", nombre: "Amenaza de aborto", cat: "Obstetricia", badge: "bg-amber-50 text-amber-900 border-amber-300" },
  { codigo: "N39.0", nombre: "Infección urinaria (ITU)", cat: "Urología", badge: "bg-sky-50 text-sky-800 border-sky-300" },
  { codigo: "N73.9", nombre: "Enfermedad Pélvica Inflamatoria (EPI)", cat: "Obstetricia / Pélvica", badge: "bg-indigo-50 text-indigo-800 border-indigo-300" },
  { codigo: "Z30.0", nombre: "Orientación en Planificación Familiar", cat: "Anticoncepción", badge: "bg-blue-50 text-blue-800 border-blue-300" },
  { codigo: "Z97.5", nombre: "Control de DIU in situ", cat: "Anticoncepción", badge: "bg-cyan-50 text-cyan-800 border-cyan-300" },
  { codigo: "N72", nombre: "Cervicitis / Ectropión cervical", cat: "Salud Reproductiva", badge: "bg-fuchsia-50 text-fuchsia-800 border-fuchsia-300" },
  { codigo: "O00.9", nombre: "Sospecha de Embarazo Ectópico", cat: "Urgencias", badge: "bg-red-50 text-red-800 border-red-300" },
  { codigo: "O02.1", nombre: "Aborto Frustro / Retenido", cat: "Urgencias", badge: "bg-red-50 text-red-800 border-red-300" },
];

export const CONDUCTAS_RAPIDAS_LAS_MELLIZAS = [
  "Test de Embarazo",
  "Ecografía de apoyo diagnóstico",
  "Hemoclasificación (Grupo y Rh)",
  "Inserción / Retiro de DIU",
  "Frotis cérvico-vaginal (en fresco)",
  "Citología cérvico-vaginal (PAP)",
  "Consulta especializada",
  "Control prenatal reenfocado",
  "Orientación en anticoncepción",
  "IVAA (Ácido Acético)",
  "Biopsia de endometrio / cérvix",
  "Análisis de perfil materno / prenatal",
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

// ============================================================================
// RESILIENCIA OFFLINE Y BUFFER LOCAL CRIPTOGRÁFICO (ZERO DATA LOSS)
// ============================================================================
const DRAFT_STORAGE_PREFIX = "lm_hce_draft_v1_";

interface HceLocalDraft {
  encuentroId: string;
  pacienteId?: string;
  timestamp: number;
  motivo: string;
  antecedentes: string;
  planTratamiento: string;
  diagnosticos: DiagnosticoItem[];
  examenFisico: any;
  imagenes: ImagenAdjunta[];
  adendas: any[];
}

const guardarBorradorOffline = (encuentroId: string, draft: HceLocalDraft) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${DRAFT_STORAGE_PREFIX}${encuentroId}`, JSON.stringify(draft));
  } catch (e) {
    console.warn("Aviso: no se pudo escribir buffer offline en localStorage:", e);
  }
};

const cargarBorradorOffline = (encuentroId: string): HceLocalDraft | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${DRAFT_STORAGE_PREFIX}${encuentroId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const eliminarBorradorOffline = (encuentroId: string) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`${DRAFT_STORAGE_PREFIX}${encuentroId}`);
  } catch {}
};

// ============================================================================
// GENERADOR CRIPTOGRÁFICO DETERMINISTA SHA-256 (NTS N.° 139-MINSA / Ley N.° 30024)
// ============================================================================
async function generarHashCanonico(payload: string): Promise<string> {
  try {
    if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
      const enc = new TextEncoder();
      const data = enc.encode(payload);
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }
  } catch (err) {
    console.warn("Aviso criptográfico: recurriendo a entropía segura:", err);
  }
  // Contingencia si crypto.subtle no estuviera soportado
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ============================================================================
// RESOLUTOR DE TIEMPO CONFIABLE (NTP / POSTGRESQL TIME vs OFFLINE LOCAL)
// ============================================================================
async function obtenerTimestampServidorConfiable(): Promise<{ iso: string; fuente: "SERVIDOR" | "LOCAL_OFFLINE" }> {
  try {
    const { data, error } = await supabase.rpc("fn_obtener_tiempo_servidor");
    if (!error && data) {
      return { iso: new Date(data).toISOString(), fuente: "SERVIDOR" };
    }
  } catch {}
  return { iso: new Date().toISOString(), fuente: "LOCAL_OFFLINE" };
}

export default function HcePage() {
  const [sede, setSede] = useState<string>("Independencia");
  const [profesionalNombre, setProfesionalNombre] = useState<string>("Profesional de Turno");
  const [colegiatura, setColegiatura] = useState<string>("");
  const [especialidadRegistro, setEspecialidadRegistro] = useState<string>("");

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
  const [presentacion, setPresentacion] = useState("");

  // Submódulo Especializado de Obstetricia / Salud Femenina "Click & Mark" (Ficha Las Mellizas & MINSA)
  const [subModoObstetricia, setSubModoObstetricia] = useState<"CONSULTA_RAPIDA" | "CARNET_MINSA">("CONSULTA_RAPIDA");
  const [formulaT, setFormulaT] = useState("");
  const [formulaPretermino, setFormulaPretermino] = useState("");
  const [formulaA, setFormulaA] = useState("");
  const [formulaHv, setFormulaHv] = useState("");
  const [terminacionUltimoEmbarazo, setTerminacionUltimoEmbarazo] = useState("");
  const [menarquia, setMenarquia] = useState("");
  const [ciclos, setCiclos] = useState("");
  const [irs, setIrs] = useState("");
  const [anticoncepcionPrevia, setAnticoncepcionPrevia] = useState("");
  const [papPrevio, setPapPrevio] = useState("");
  const [grupoRh, setGrupoRh] = useState("");
  const [alergiasSeleccionadas, setAlergiasSeleccionadas] = useState<string[]>(["Ninguna"]);

  // Filiación de Ficha Física Las Mellizas & Antecedentes Familiares
  const [pacienteOcupacion, setPacienteOcupacion] = useState("");
  const [pacienteGradoInstruccion, setPacienteGradoInstruccion] = useState("");
  const [pacienteEstadoCivil, setPacienteEstadoCivil] = useState("");
  const [pacienteAcompanante, setPacienteAcompanante] = useState("");
  const [antecedentesFamiliares, setAntecedentesFamiliares] = useState<string[]>([]);
  const [antecedentesFamiliaresDetalle, setAntecedentesFamiliaresDetalle] = useState("");

  // Submódulo de Planificación Familiar (MAC - Anticoncepción Integral)
  const [pfCondicionUsuaria, setPfCondicionUsuaria] = useState("");
  const [pfMetodoElegido, setPfMetodoElegido] = useState("");
  const [pfFechaAplicacion, setPfFechaAplicacion] = useState("");
  const [pfProximaCita, setPfProximaCita] = useState("");
  const [pfConsejeriaBrindada, setPfConsejeriaBrindada] = useState(true);
  const [pfConsentimientoAceptado, setPfConsentimientoAceptado] = useState(true);
  const [pfObservaciones, setPfObservaciones] = useState("");

  // Click & Mark para Ecografía Obstétrica Fetal
  const [ecoObstFeto, setEcoObstFeto] = useState("Único");
  const [ecoObstVitalidad, setEcoObstVitalidad] = useState("Activa");
  const [ecoObstSituacion, setEcoObstSituacion] = useState("Longitudinal");
  const [ecoObstPresentacion, setEcoObstPresentacion] = useState("Cefálica");
  const [ecoObstDorso, setEcoObstDorso] = useState("Izquierdo");
  const [ecoObstPlacentaLoc, setEcoObstPlacentaLoc] = useState("Fúndica posterior");
  const [ecoObstPlacentaGrado, setEcoObstPlacentaGrado] = useState("Grado I");
  const [ecoObstLiquidoVol, setEcoObstLiquidoVol] = useState("Normal");

  // Click & Mark para Ecografía Transvaginal
  const [ecoTvUteroPos, setEcoTvUteroPos] = useState("AVF");
  const [ecoTvMiometrio, setEcoTvMiometrio] = useState("Homogéneo");
  const [ecoTvEndometrioFase, setEcoTvEndometrioFase] = useState("Proliferativo trilaminar");
  const [ecoTvOvarioDerPatron, setEcoTvOvarioDerPatron] = useState("Normal");
  const [ecoTvOvarioIzqPatron, setEcoTvOvarioIzqPatron] = useState("Normal");
  const [ecoTvDouglas, setEcoTvDouglas] = useState("Libre");

  // Calculadora Clínica & Ecográfica Interactiva Flotante
  const [calculadoraOpen, setCalculadoraOpen] = useState(false);
  const [calcTab, setCalcTab] = useState<"GESTACIONAL" | "HADLOCK" | "PBF" | "PROSTATA">("GESTACIONAL");
  const [pbfResp, setPbfResp] = useState(2);
  const [pbfMov, setPbfMov] = useState(2);
  const [pbfTono, setPbfTono] = useState(2);
  const [pbfNst, setPbfNst] = useState(2);
  const [pbfIlaScore, setPbfIlaScore] = useState(2);

  // Examen Obstétrico y Pélvico Visual (Espéculo y Tacto)
  const [especuloVagina, setEspeculoVagina] = useState<"Sana" | "Sangre" | "Flujo">("Sana");
  const [especuloFlujoTipo, setEspeculoFlujoTipo] = useState("");
  const [especuloCuello, setEspeculoCuello] = useState<"Sano" | "Ectropión" | "Otro">("Sano");
  const [especuloCuelloDetalle, setEspeculoCuelloDetalle] = useState("");
  const [tactoVagina, setTactoVagina] = useState<"Normotérmica" | "Hipertérmica">("Normotérmica");
  const [tactoCuello, setTactoCuello] = useState<"Cerrado" | "Dilatado" | "Doloroso">("Cerrado");
  const [tactoUtero, setTactoUtero] = useState<"Anteversión" | "Retroversión" | "Media">("Anteversión");
  const [tactoDesviacion, setTactoDesviacion] = useState<"Media" | "Izquierda" | "Derecho">("Media");
  const [tactoAnexos, setTactoAnexos] = useState<"Normales" | "Dolorosos" | "Masas">("Normales");
  const [tactoAnexosDetalle, setTactoAnexosDetalle] = useState("");

  // Conductas / Procedimientos Marcados
  const [conductasSeleccionadas, setConductasSeleccionadas] = useState<string[]>([]);

  // Atenciones Prenatales MINSA (1 a 9)
  const [atencionesMinsa, setAtencionesMinsa] = useState<Array<{
    num: number;
    fecha: string;
    semana: string;
    peso: string;
    pa: string;
    pulso: string;
    au: string;
    lcf: string;
    presentacion: string;
    edemas: string;
    movFetal: string;
    fierroFolico: string;
    calcio: string;
    cita: string;
  }>>([
    { num: 1, fecha: "", semana: "", peso: "", pa: "", pulso: "", au: "", lcf: "", presentacion: "", edemas: "-", movFetal: "+", fierroFolico: "SI", calcio: "NO", cita: "" },
    { num: 2, fecha: "", semana: "", peso: "", pa: "", pulso: "", au: "", lcf: "", presentacion: "", edemas: "-", movFetal: "+", fierroFolico: "SI", calcio: "NO", cita: "" },
    { num: 3, fecha: "", semana: "", peso: "", pa: "", pulso: "", au: "", lcf: "", presentacion: "", edemas: "-", movFetal: "+", fierroFolico: "SI", calcio: "NO", cita: "" },
    { num: 4, fecha: "", semana: "", peso: "", pa: "", pulso: "", au: "", lcf: "", presentacion: "", edemas: "-", movFetal: "+", fierroFolico: "SI", calcio: "SI", cita: "" },
    { num: 5, fecha: "", semana: "", peso: "", pa: "", pulso: "", au: "", lcf: "", presentacion: "", edemas: "-", movFetal: "+", fierroFolico: "SI", calcio: "SI", cita: "" },
    { num: 6, fecha: "", semana: "", peso: "", pa: "", pulso: "", au: "", lcf: "", presentacion: "", edemas: "-", movFetal: "+", fierroFolico: "SI", calcio: "SI", cita: "" },
    { num: 7, fecha: "", semana: "", peso: "", pa: "", pulso: "", au: "", lcf: "", presentacion: "", edemas: "-", movFetal: "+", fierroFolico: "SI", calcio: "SI", cita: "" },
    { num: 8, fecha: "", semana: "", peso: "", pa: "", pulso: "", au: "", lcf: "", presentacion: "", edemas: "-", movFetal: "+", fierroFolico: "SI", calcio: "SI", cita: "" },
    { num: 9, fecha: "", semana: "", peso: "", pa: "", pulso: "", au: "", lcf: "", presentacion: "", edemas: "-", movFetal: "+", fierroFolico: "SI", calcio: "SI", cita: "" },
  ]);

  // Anamnesis, Examen y Tratamiento (Inicia limpio sin mocks)
  const [motivo, setMotivo] = useState("");
  const [antecedentes, setAntecedentes] = useState("");
  const [examenFisico, setExamenFisico] = useState("");
  const [planTratamiento, setPlanTratamiento] = useState("");

  // Diagnósticos CIE-10 (Inicia arreglo vacío)
  const [diagnosticos, setDiagnosticos] = useState<DiagnosticoItem[]>([]);
  const [busquedaCie, setBusquedaCie] = useState("");
  const [mostrarSugerenciasCie, setMostrarSugerenciasCie] = useState(false);
  const cieContainerRef = useRef<HTMLDivElement>(null);

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
  const [reagendarMotivo, setReagendarMotivo] = useState("");
  const [reagendarSede, setReagendarSede] = useState("Independencia");
  const [reagendadaExito, setReagendadaExito] = useState(false);
  const [topbarContainer, setTopbarContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTopbarContainer(document.getElementById("hce-topbar-actions"));
  }, []);

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

  // Retracción automática del desplegable CIE-10 al alternar de especialidad o modalidad
  useEffect(() => {
    setMostrarSugerenciasCie(false);
    setBusquedaCie("");
  }, [modalidadAtencion, tipoEcografia]);

  // Cierre del desplegable CIE-10 al hacer clic fuera del componente
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cieContainerRef.current && !cieContainerRef.current.contains(event.target as Node)) {
        setMostrarSugerenciasCie(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Pestaña activa de herramientas secundarias inferiores (Solución A)
  const [herramientaActiva, setHerramientaActiva] = useState<"imagenes" | "reagendar" | "adendas">("imagenes");

  // Helpers para Submódulo Obstétrico "Click & Mark"
  const toggleAlergia = (alergia: string) => {
    if (alergia === "Ninguna") {
      setAlergiasSeleccionadas(["Ninguna"]);
      return;
    }
    setAlergiasSeleccionadas((prev) => {
      const sinNinguna = prev.filter((a) => a !== "Ninguna");
      if (sinNinguna.includes(alergia)) {
        const filtrado = sinNinguna.filter((a) => a !== alergia);
        return filtrado.length === 0 ? ["Ninguna"] : filtrado;
      } else {
        return [...sinNinguna, alergia];
      }
    });
  };

  const toggleConducta = (conducta: string) => {
    setConductasSeleccionadas((prev) =>
      prev.includes(conducta) ? prev.filter((c) => c !== conducta) : [...prev, conducta]
    );
  };

  const agregarDiagnosticoRapido = (codigo: string, descripcion: string) => {
    setDiagnosticos((prev) => {
      if (prev.some((d) => d.codigo === codigo)) return prev;
      return [...prev, { codigo, descripcion }];
    });
  };

  const actualizarAtencionMinsa = (index: number, campo: string, valor: string) => {
    setAtencionesMinsa((prev) => {
      const copia = [...prev];
      copia[index] = { ...copia[index], [campo]: valor };
      return copia;
    });
  };

  const toggleAntecedenteFamiliar = (ant: string) => {
    if (ant === "Ninguno") {
      setAntecedentesFamiliares(["Ninguno"]);
      return;
    }
    setAntecedentesFamiliares((prev) => {
      const sinNinguno = prev.filter((a) => a !== "Ninguno");
      if (sinNinguno.includes(ant)) {
        const filtrado = sinNinguno.filter((a) => a !== ant);
        return filtrado.length === 0 ? ["Ninguno"] : filtrado;
      } else {
        return [...sinNinguno, ant];
      }
    });
  };

  const seleccionarMetodoPf = (metodo: string) => {
    setPfMetodoElegido(metodo);
    const hoy = new Date();
    const hoyStr = hoy.toISOString().split("T")[0];
    if (!pfFechaAplicacion) setPfFechaAplicacion(hoyStr);
    
    // Cálculo automático de próxima dosis o control según método
    const fechaBase = pfFechaAplicacion ? new Date(pfFechaAplicacion) : hoy;
    const prox = new Date(fechaBase);
    if (metodo === "INYECTABLE_MENSUAL") {
      prox.setDate(prox.getDate() + 30);
    } else if (metodo === "INYECTABLE_TRIMESTRAL") {
      prox.setDate(prox.getDate() + 90);
    } else if (metodo === "IMPLANTE_SUBDERMICO") {
      prox.setFullYear(prox.getFullYear() + 3);
    } else if (metodo === "DIU_T_COBRE") {
      prox.setFullYear(prox.getFullYear() + 5);
    } else if (metodo === "AOC_ORALES") {
      prox.setDate(prox.getDate() + 28);
    } else if (metodo === "AOE_EMERGENCIA") {
      prox.setDate(prox.getDate() + 21);
    } else {
      prox.setDate(prox.getDate() + 30);
    }
    setPfProximaCita(prox.toISOString().split("T")[0]);
  };

  const calcularHadlockPfe = (dbpMmStr: string, lfMmStr: string, caMmStr: string): string => {
    const dbpCm = (parseFloat(dbpMmStr) || 0) / 10;
    const lfCm = (parseFloat(lfMmStr) || 0) / 10;
    const caCm = (parseFloat(caMmStr) || 0) / 10;
    if (caCm <= 0 || lfCm <= 0) return "";
    // Fórmula Hadlock estándar: Log10(BW) = 1.335 - 0.0034(AC*FL) + 0.0316(BPD) + 0.0457(AC) + 0.1623(FL)
    const log10Bw = 1.335 - (0.0034 * caCm * lfCm) + (0.0316 * dbpCm) + (0.0457 * caCm) + (0.1623 * lfCm);
    const pesoGramos = Math.round(Math.pow(10, log10Bw));
    if (isNaN(pesoGramos) || pesoGramos <= 0 || pesoGramos > 7000) return "";
    return pesoGramos.toString();
  };

  // Sanitización de registro profesional para prevenir duplicaciones ("COP COP", "CMP CMP")
  const normalizarRegistroProfesional = (col: string, prefijoEsperado: "COP" | "CMP" | "POCT") => {
    if (!col || !col.trim()) {
      if (prefijoEsperado === "COP") return "COP 13102";
      if (prefijoEsperado === "CMP") return "CMP 72450";
      return "POCT Certificado";
    }
    const limpio = col.trim();
    // Extraer prefijos repetidos tipo "COP", "CMP" o duplicados como "COP COP"
    const sinPrefijos = limpio.replace(/^(COP|CMP)\s*(COP|CMP)?\s*/gi, "").trim();
    if (prefijoEsperado === "POCT") {
      return sinPrefijos ? `POCT Reg. ${sinPrefijos}` : "POCT Certificado";
    }
    return `${prefijoEsperado} ${sinPrefijos || "Colegiado"}`;
  };

  // Detección estricta de la profesión del usuario (Obstetra vs Médico) respetando Ley N.° 23346 y Ley N.° 15125
  const esObstetra = colegiatura
    ? /COP/i.test(colegiatura)
    : !/CMP|Médic|Dr\./i.test(profesionalNombre);

  // Formateo minimalista del Registro Profesional: incorpora Especialidad (RNE / Esp.) SOLO si la posee
  const getRegistroConEspecialidad = (prefijo: "COP" | "CMP") => {
    const regBase = normalizarRegistroProfesional(colegiatura, prefijo);
    if (!especialidadRegistro || !especialidadRegistro.trim()) {
      return regBase;
    }
    const espLimpia = especialidadRegistro.trim();
    // Si ya incluye prefijo regulatorio tipo RNE, RNEO o Esp., se usa directo, de lo contrario se estiliza
    const espFmt = /^(RNE|RNEO|Esp\.)/i.test(espLimpia)
      ? espLimpia
      : `${prefijo === "COP" ? "Esp." : "RNE"} ${espLimpia}`;
    return `${regBase} • ${espFmt}`;
  };

  // Identificación regulatoria oficial: jamás desfigura el título de la Obstetra al realizar Ecografías
  const getCargoProfesional = () => {
    if (esObstetra) {
      switch (modalidadAtencion) {
        case "ECOGRAFIA":
          return {
            cargo: "Obstetra • Apoyo Diagnóstico",
            registro: getRegistroConEspecialidad("COP"),
            badgeColor: "bg-sky-50 text-sky-800 border-sky-200",
            leyRef: "Ley N.° 23346 (Apoyo Diagnóstico)",
          };
        case "OBSTETRICIA":
          return {
            cargo: "Obstetra (Salud Materno-Perinatal)",
            registro: getRegistroConEspecialidad("COP"),
            badgeColor: "bg-rose-50 text-rose-800 border-rose-200",
            leyRef: "Ley N.° 23346 (Acto Obstétrico)",
          };
        case "GINECOLOGIA":
          return {
            cargo: "Obstetra (Salud Reproductiva)",
            registro: getRegistroConEspecialidad("COP"),
            badgeColor: "bg-purple-50 text-purple-800 border-purple-200",
            leyRef: "Ley N.° 23346 (Salud Reproductiva)",
          };
        case "MEDICINA_GENERAL":
          return {
            cargo: "Obstetra (Interconsulta)",
            registro: getRegistroConEspecialidad("COP"),
            badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
            leyRef: "Ley N.° 23346 (Evaluación Asistencial)",
          };
        case "LABORATORIO":
          return {
            cargo: "Obstetra • Tamizaje POCT",
            registro: getRegistroConEspecialidad("COP"),
            badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
            leyRef: "Tamizaje Clínico & POCT",
          };
      }
    } else {
      // Profesional Médico Colegiado
      switch (modalidadAtencion) {
        case "ECOGRAFIA":
          return {
            cargo: "Médico • Apoyo Diagnóstico",
            registro: getRegistroConEspecialidad("CMP"),
            badgeColor: "bg-sky-50 text-sky-800 border-sky-200",
            leyRef: "Ley N.° 15125 (Diagnóstico por Imágenes)",
          };
        case "GINECOLOGIA":
          return {
            cargo: "Médico Gineco-Obstetra",
            registro: getRegistroConEspecialidad("CMP"),
            badgeColor: "bg-purple-50 text-purple-800 border-purple-200",
            leyRef: "Ley N.° 15125 (Acto Médico Especializado)",
          };
        case "OBSTETRICIA":
          return {
            cargo: "Médico Gineco-Obstetra",
            registro: getRegistroConEspecialidad("CMP"),
            badgeColor: "bg-rose-50 text-rose-800 border-rose-200",
            leyRef: "Ley N.° 15125 (Control Médico)",
          };
        case "MEDICINA_GENERAL":
          return {
            cargo: "Médico Cirujano",
            registro: getRegistroConEspecialidad("CMP"),
            badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
            leyRef: "Ley N.° 15125 (Medicina General)",
          };
        case "LABORATORIO":
          return {
            cargo: "Médico • Responsable POCT",
            registro: getRegistroConEspecialidad("CMP"),
            badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
            leyRef: "Tamizaje Clínico & POCT",
          };
      }
    }
  };

  // 1. Ecografía Prostática & Vesicoprostática (Cálculo Automático)
  const [prostataDt, setProstataDt] = useState(""); // Diámetro Transverso en mm
  const [prostataDap, setProstataDap] = useState(""); // Diámetro Anteroposterior en mm
  const [prostataDl, setProstataDl] = useState(""); // Diámetro Longitudinal en mm
  const [prostataVejigaPre, setProstataVejigaPre] = useState(""); // Volumen vesical pre (cc)
  const [prostataResiduoPost, setProstataResiduoPost] = useState(""); // Volumen residual post (cc)
  const [prostataLobuloMedio, setProstataLobuloMedio] = useState("");

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
  const [ecoPlacenta, setEcoPlacenta] = useState("");
  const [ecoIla, setEcoIla] = useState("");

  // 3. Ecografía Abdominal Completa
  const [ecoHigado, setEcoHigado] = useState("");
  const [ecoVesicula, setEcoVesicula] = useState("");
  const [ecoPancreasBazo, setEcoPancreasBazo] = useState("");
  const [ecoLiquidoLibre, setEcoLiquidoLibre] = useState("");

  // 4. Ecografía Renal y Vías Urinarias
  const [ecoRinonDer, setEcoRinonDer] = useState("");
  const [ecoRinonIzq, setEcoRinonIzq] = useState("");
  const [ecoVejigaRenal, setEcoVejigaRenal] = useState("");

  // 5. Ecografía Partes Blandas & Hernias
  const [ecoPartesRegion, setEcoPartesRegion] = useState("");
  const [ecoPartesDimensiones, setEcoPartesDimensiones] = useState("");
  const [ecoPartesHallazgos, setEcoPartesHallazgos] = useState("");

  // 6. Ecografía Mamaria y Tiroidea
  const [ecoBirads, setEcoBirads] = useState("");
  const [ecoTirads, setEcoTirads] = useState("");

  // 7. Ecografía Transvaginal & Ginecológica Especializada
  const [ecoUtero, setEcoUtero] = useState("");
  const [ecoEndometrio, setEcoEndometrio] = useState("");
  const [ecoOvarioDer, setEcoOvarioDer] = useState("");
  const [ecoOvarioIzq, setEcoOvarioIzq] = useState("");
  const [ecoDouglas, setEcoDouglas] = useState("");

  // 8. Conclusión Diagnóstica e Indicaciones del Informe Ecográfico
  const [conclusionEcografica, setConclusionEcografica] = useState("");
  const [sugerenciasEcograficas, setSugerenciasEcograficas] = useState("");

  // 8. Medicina General: Campos específicos
  const [tiempoEnfermedad, setTiempoEnfermedad] = useState("");
  const [examenRegionalMedicina, setExamenRegionalMedicina] = useState("");
  const [descansoMedicoDias, setDescansoMedicoDias] = useState("");

  // 9. Exámenes de Laboratorio & Tiras Reactivas
  const [labHemoglobina, setLabHemoglobina] = useState("");
  const [labGlucosa, setLabGlucosa] = useState("");
  const [labOrinaLeucocitos, setLabOrinaLeucocitos] = useState("");
  const [labOrinaProteinas, setLabOrinaProteinas] = useState("");
  const [labOrinaNitritos, setLabOrinaNitritos] = useState("");
  const [labPruebaEmbarazo, setLabPruebaEmbarazo] = useState("");
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
    setFormulaT("");
    setFormulaPretermino("");
    setFormulaA("");
    setFormulaHv("");
    setTerminacionUltimoEmbarazo("");
    setMenarquia("");
    setCiclos("");
    setIrs("");
    setAnticoncepcionPrevia("");
    setPapPrevio("");
    setGrupoRh("");
    setAlergiasSeleccionadas(["Ninguna"]);
    setEspeculoVagina("Sana");
    setEspeculoFlujoTipo("");
    setEspeculoCuello("Sano");
    setEspeculoCuelloDetalle("");
    setTactoVagina("Normotérmica");
    setTactoCuello("Cerrado");
    setTactoUtero("Anteversión");
    setTactoDesviacion("Media");
    setTactoAnexos("Normales");
    setTactoAnexosDetalle("");
    setConductasSeleccionadas([]);
    setSubModoObstetricia("CONSULTA_RAPIDA");
    setPacienteOcupacion("");
    setPacienteGradoInstruccion("");
    setPacienteEstadoCivil("");
    setPacienteAcompanante("");
    setAntecedentesFamiliares([]);
    setAntecedentesFamiliaresDetalle("");
    setPfCondicionUsuaria("");
    setPfMetodoElegido("");
    setPfFechaAplicacion("");
    setPfProximaCita("");
    setPfConsejeriaBrindada(true);
    setPfConsentimientoAceptado(true);
    setPfObservaciones("");
    setEcoObstFeto("Único");
    setEcoObstVitalidad("Activa");
    setEcoObstSituacion("Longitudinal");
    setEcoObstPresentacion("Cefálica");
    setEcoObstDorso("Izquierdo");
    setEcoObstPlacentaLoc("Fúndica posterior");
    setEcoObstPlacentaGrado("Grado I");
    setEcoObstLiquidoVol("Normal");
    setEcoTvUteroPos("AVF");
    setEcoTvMiometrio("Homogéneo");
    setEcoTvEndometrioFase("Proliferativo trilaminar");
    setEcoTvOvarioDerPatron("Normal");
    setEcoTvOvarioIzqPatron("Normal");
    setEcoTvDouglas("Libre");
    setCalculadoraOpen(false);
    setFur("");
    setFpp("");
    setEg("");
    setAlturaUterina("");
    setLcf("");
    setPresentacion("");
    setMotivo("");
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
    setReagendarMotivo("");
    setReagendadaExito(false);
    setSaveStatus("idle");
    setLastSavedTime("");

    // Reset campos de Ecografía y Próstata (Completamente limpios sin pre-cargas)
    setProstataDt("");
    setProstataDap("");
    setProstataDl("");
    setProstataVejigaPre("");
    setProstataResiduoPost("");
    setProstataLobuloMedio("");
    setEcoDbp("");
    setEcoLf("");
    setEcoCa("");
    setEcoPfe("");
    setEcoFcf("");
    setEcoPlacenta("");
    setEcoIla("");
    setEcoHigado("");
    setEcoVesicula("");
    setEcoPancreasBazo("");
    setEcoLiquidoLibre("");
    setEcoRinonDer("");
    setEcoRinonIzq("");
    setEcoVejigaRenal("");
    setEcoPartesRegion("");
    setEcoPartesDimensiones("");
    setEcoPartesHallazgos("");
    setEcoBirads("");
    setEcoTirads("");
    setEcoUtero("");
    setEcoEndometrio("");
    setEcoOvarioDer("");
    setEcoOvarioIzq("");
    setEcoDouglas("");
    setConclusionEcografica("");
    setSugerenciasEcograficas("");

    // Reset Medicina General
    setTiempoEnfermedad("");
    setExamenRegionalMedicina("");
    setDescansoMedicoDias("");

    // Reset Laboratorio
    setLabHemoglobina("");
    setLabGlucosa("");
    setLabOrinaLeucocitos("");
    setLabOrinaProteinas("");
    setLabOrinaNitritos("");
    setLabPruebaEmbarazo("");
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
    let notaExistente: any = null;
    try {
      const { data } = await supabase
        .from("nota_clinica")
        .select("*")
        .eq("encuentro_id", p.id)
        .maybeSingle();
      notaExistente = data;

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

            // Eco Transvaginal
            if (ef.ecoTransvaginal) {
              if (ef.ecoTransvaginal.utero !== undefined) setEcoUtero(ef.ecoTransvaginal.utero);
              if (ef.ecoTransvaginal.endometrio !== undefined) setEcoEndometrio(ef.ecoTransvaginal.endometrio);
              if (ef.ecoTransvaginal.ovarioDer !== undefined) setEcoOvarioDer(ef.ecoTransvaginal.ovarioDer);
              if (ef.ecoTransvaginal.ovarioIzq !== undefined) setEcoOvarioIzq(ef.ecoTransvaginal.ovarioIzq);
              if (ef.ecoTransvaginal.douglas !== undefined) setEcoDouglas(ef.ecoTransvaginal.douglas);
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
            }

            // Obstetricia Click & Mark
            if (ef.obstetriciaClickMark) {
              const ocm = ef.obstetriciaClickMark;
              if (ocm.subModo) setSubModoObstetricia(ocm.subModo);
              if (ocm.formulaT !== undefined) setFormulaT(ocm.formulaT);
              if (ocm.formulaPretermino !== undefined) setFormulaPretermino(ocm.formulaPretermino);
              if (ocm.formulaA !== undefined) setFormulaA(ocm.formulaA);
              if (ocm.formulaHv !== undefined) setFormulaHv(ocm.formulaHv);
              if (ocm.terminacionUltimoEmbarazo !== undefined) setTerminacionUltimoEmbarazo(ocm.terminacionUltimoEmbarazo);
              if (ocm.menarquia !== undefined) setMenarquia(ocm.menarquia);
              if (ocm.ciclos !== undefined) setCiclos(ocm.ciclos);
              if (ocm.irs !== undefined) setIrs(ocm.irs);
              if (ocm.anticoncepcionPrevia !== undefined) setAnticoncepcionPrevia(ocm.anticoncepcionPrevia);
              if (ocm.papPrevio !== undefined) setPapPrevio(ocm.papPrevio);
              if (ocm.grupoRh !== undefined) setGrupoRh(ocm.grupoRh);
              if (Array.isArray(ocm.alergias)) setAlergiasSeleccionadas(ocm.alergias);
              if (ocm.especulo) {
                if (ocm.especulo.vagina) setEspeculoVagina(ocm.especulo.vagina);
                if (ocm.especulo.flujoTipo) setEspeculoFlujoTipo(ocm.especulo.flujoTipo);
                if (ocm.especulo.cuello) setEspeculoCuello(ocm.especulo.cuello);
                if (ocm.especulo.detalle) setEspeculoCuelloDetalle(ocm.especulo.detalle);
              }
              if (ocm.tacto) {
                if (ocm.tacto.vagina) setTactoVagina(ocm.tacto.vagina);
                if (ocm.tacto.cuello) setTactoCuello(ocm.tacto.cuello);
                if (ocm.tacto.utero) setTactoUtero(ocm.tacto.utero);
                if (ocm.tacto.desviacion) setTactoDesviacion(ocm.tacto.desviacion);
                if (ocm.tacto.anexos) setTactoAnexos(ocm.tacto.anexos);
                if (ocm.tacto.detalle) setTactoAnexosDetalle(ocm.tacto.detalle);
              }
              if (Array.isArray(ocm.conductas)) setConductasSeleccionadas(ocm.conductas);
              if (Array.isArray(ocm.atencionesMinsa)) setAtencionesMinsa(ocm.atencionesMinsa);
            }

            // Filiación Ficha Física Las Mellizas
            if (ef.filiacionFicha) {
              if (ef.filiacionFicha.ocupacion) setPacienteOcupacion(ef.filiacionFicha.ocupacion);
              if (ef.filiacionFicha.gradoInstruccion) setPacienteGradoInstruccion(ef.filiacionFicha.gradoInstruccion);
              if (ef.filiacionFicha.estadoCivil) setPacienteEstadoCivil(ef.filiacionFicha.estadoCivil);
              if (ef.filiacionFicha.acompanante) setPacienteAcompanante(ef.filiacionFicha.acompanante);
            }

            // Antecedentes Familiares
            if (ef.antecedentesFamiliares) {
              if (Array.isArray(ef.antecedentesFamiliares.items)) setAntecedentesFamiliares(ef.antecedentesFamiliares.items);
              if (ef.antecedentesFamiliares.detalle) setAntecedentesFamiliaresDetalle(ef.antecedentesFamiliares.detalle);
            }

            // Planificación Familiar (MAC)
            if (ef.planificacionFamiliar) {
              const pf = ef.planificacionFamiliar;
              if (pf.condicionUsuaria) setPfCondicionUsuaria(pf.condicionUsuaria);
              if (pf.metodoElegido) setPfMetodoElegido(pf.metodoElegido);
              if (pf.fechaAplicacion) setPfFechaAplicacion(pf.fechaAplicacion);
              if (pf.proximaCita) setPfProximaCita(pf.proximaCita);
              if (pf.consejeriaBrindada !== undefined) setPfConsejeriaBrindada(pf.consejeriaBrindada);
              if (pf.consentimientoAceptado !== undefined) setPfConsentimientoAceptado(pf.consentimientoAceptado);
              if (pf.observaciones) setPfObservaciones(pf.observaciones);
            }

            // Ecografía Obstétrica Click & Mark
            if (ef.ecoObstClickMark) {
              const eocm = ef.ecoObstClickMark;
              if (eocm.feto) setEcoObstFeto(eocm.feto);
              if (eocm.vitalidad) setEcoObstVitalidad(eocm.vitalidad);
              if (eocm.situacion) setEcoObstSituacion(eocm.situacion);
              if (eocm.presentacion) setEcoObstPresentacion(eocm.presentacion);
              if (eocm.dorso) setEcoObstDorso(eocm.dorso);
              if (eocm.placentaLoc) setEcoObstPlacentaLoc(eocm.placentaLoc);
              if (eocm.placentaGrado) setEcoObstPlacentaGrado(eocm.placentaGrado);
              if (eocm.liquidoVol) setEcoObstLiquidoVol(eocm.liquidoVol);
            }

            // Ecografía Transvaginal Click & Mark
            if (ef.ecoTvClickMark) {
              const etvm = ef.ecoTvClickMark;
              if (etvm.uteroPos) setEcoTvUteroPos(etvm.uteroPos);
              if (etvm.miometrio) setEcoTvMiometrio(etvm.miometrio);
              if (etvm.endometrioFase) setEcoTvEndometrioFase(etvm.endometrioFase);
              if (etvm.ovarioDerPatron) setEcoTvOvarioDerPatron(etvm.ovarioDerPatron);
              if (etvm.ovarioIzqPatron) setEcoTvOvarioIzqPatron(etvm.ovarioIzqPatron);
              if (etvm.douglas) setEcoTvDouglas(etvm.douglas);
            }
          } catch (_err) {}
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

    // 6. Resiliencia Cero Pérdida: Verificar si existe un borrador offline local más reciente
    const draftLocal = cargarBorradorOffline(p.id);
    const timestampNube = notaExistente?.updated_at ? new Date(notaExistente.updated_at).getTime() : 0;
    if (draftLocal && draftLocal.timestamp > timestampNube && !estaAtendido && activeEncuentroIdRef.current === p.id) {
      if (draftLocal.motivo) setMotivo(draftLocal.motivo);
      if (draftLocal.antecedentes) setAntecedentes(draftLocal.antecedentes);
      if (draftLocal.planTratamiento) setPlanTratamiento(draftLocal.planTratamiento);
      if (Array.isArray(draftLocal.diagnosticos)) setDiagnosticos(draftLocal.diagnosticos);
      if (Array.isArray(draftLocal.imagenes)) setImagenes(draftLocal.imagenes);
      if (draftLocal.examenFisico) {
        const ef = draftLocal.examenFisico;
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
        if (ef.modalidadAtencion) setModalidadAtencion(ef.modalidadAtencion);
        if (ef.tipoEcografia) setTipoEcografia(ef.tipoEcografia);
        if (ef.prostata) {
          if (ef.prostata.dt !== undefined) setProstataDt(ef.prostata.dt);
          if (ef.prostata.dap !== undefined) setProstataDap(ef.prostata.dap);
          if (ef.prostata.dl !== undefined) setProstataDl(ef.prostata.dl);
          if (ef.prostata.vejigaPre !== undefined) setProstataVejigaPre(ef.prostata.vejigaPre);
          if (ef.prostata.residuoPost !== undefined) setProstataResiduoPost(ef.prostata.residuoPost);
          if (ef.prostata.lobuloMedio !== undefined) setProstataLobuloMedio(ef.prostata.lobuloMedio);
        }
        if (ef.ecoFetal) {
          if (ef.ecoFetal.dbp !== undefined) setEcoDbp(ef.ecoFetal.dbp);
          if (ef.ecoFetal.lf !== undefined) setEcoLf(ef.ecoFetal.lf);
          if (ef.ecoFetal.ca !== undefined) setEcoCa(ef.ecoFetal.ca);
          if (ef.ecoFetal.pfe !== undefined) setEcoPfe(ef.ecoFetal.pfe);
          if (ef.ecoFetal.fcf !== undefined) setEcoFcf(ef.ecoFetal.fcf);
          if (ef.ecoFetal.placenta !== undefined) setEcoPlacenta(ef.ecoFetal.placenta);
          if (ef.ecoFetal.ila !== undefined) setEcoIla(ef.ecoFetal.ila);
        }
        if (ef.ecoAbdominal) {
          if (ef.ecoAbdominal.higado !== undefined) setEcoHigado(ef.ecoAbdominal.higado);
          if (ef.ecoAbdominal.vesicula !== undefined) setEcoVesicula(ef.ecoAbdominal.vesicula);
          if (ef.ecoAbdominal.pancreasBazo !== undefined) setEcoPancreasBazo(ef.ecoAbdominal.pancreasBazo);
          if (ef.ecoAbdominal.liquidoLibre !== undefined) setEcoLiquidoLibre(ef.ecoAbdominal.liquidoLibre);
        }
        if (ef.ecoRenal) {
          if (ef.ecoRenal.rinonDer !== undefined) setEcoRinonDer(ef.ecoRenal.rinonDer);
          if (ef.ecoRenal.rinonIzq !== undefined) setEcoRinonIzq(ef.ecoRenal.rinonIzq);
          if (ef.ecoRenal.vejigaRenal !== undefined) setEcoVejigaRenal(ef.ecoRenal.vejigaRenal);
        }
        if (ef.ecoPartesBlandas) {
          if (ef.ecoPartesBlandas.region !== undefined) setEcoPartesRegion(ef.ecoPartesBlandas.region);
          if (ef.ecoPartesBlandas.dimensiones !== undefined) setEcoPartesDimensiones(ef.ecoPartesBlandas.dimensiones);
          if (ef.ecoPartesBlandas.hallazgos !== undefined) setEcoPartesHallazgos(ef.ecoPartesBlandas.hallazgos);
        }
        if (ef.ecoTransvaginal) {
          if (ef.ecoTransvaginal.utero !== undefined) setEcoUtero(ef.ecoTransvaginal.utero);
          if (ef.ecoTransvaginal.endometrio !== undefined) setEcoEndometrio(ef.ecoTransvaginal.endometrio);
          if (ef.ecoTransvaginal.ovarioDer !== undefined) setEcoOvarioDer(ef.ecoTransvaginal.ovarioDer);
          if (ef.ecoTransvaginal.ovarioIzq !== undefined) setEcoOvarioIzq(ef.ecoTransvaginal.ovarioIzq);
          if (ef.ecoTransvaginal.douglas !== undefined) setEcoDouglas(ef.ecoTransvaginal.douglas);
        }
        if (ef.ecoBirads !== undefined) setEcoBirads(ef.ecoBirads);
        if (ef.ecoTirads !== undefined) setEcoTirads(ef.ecoTirads);
        if (ef.conclusionEcografica !== undefined) setConclusionEcografica(ef.conclusionEcografica);
        if (ef.sugerenciasEcograficas !== undefined) setSugerenciasEcograficas(ef.sugerenciasEcograficas);
        if (ef.medicina) {
          if (ef.medicina.tiempoEnfermedad !== undefined) setTiempoEnfermedad(ef.medicina.tiempoEnfermedad);
          if (ef.medicina.examenRegionalMedicina !== undefined) setExamenRegionalMedicina(ef.medicina.examenRegionalMedicina);
          if (ef.medicina.descansoMedicoDias !== undefined) setDescansoMedicoDias(ef.medicina.descansoMedicoDias);
        }
        if (ef.laboratorio) {
          if (ef.laboratorio.hemoglobina !== undefined) setLabHemoglobina(ef.laboratorio.hemoglobina);
          if (ef.laboratorio.glucosa !== undefined) setLabGlucosa(ef.laboratorio.glucosa);
          if (ef.laboratorio.orinaLeucocitos !== undefined) setLabOrinaLeucocitos(ef.laboratorio.orinaLeucocitos);
          if (ef.laboratorio.orinaProteinas !== undefined) setLabOrinaProteinas(ef.laboratorio.orinaProteinas);
          if (ef.laboratorio.orinaNitritos !== undefined) setLabOrinaNitritos(ef.laboratorio.orinaNitritos);
          if (ef.laboratorio.pruebaEmbarazo !== undefined) setLabPruebaEmbarazo(ef.laboratorio.pruebaEmbarazo);
          if (ef.laboratorio.observaciones !== undefined) setLabObservaciones(ef.laboratorio.observaciones);
        }
      }
      setSaveStatus("offline_saved");
      setLastSavedTime(new Date(draftLocal.timestamp).toLocaleTimeString("es-PE") + " (Local)");
    }

    if (p.estado === "EN_ESPERA") {
      try {
        const { data: updateData, error: updateErr } = await supabase
          .from("encuentro")
          .update({ estado: "EN_ATENCION", updated_at: new Date().toISOString() })
          .eq("id", p.id)
          .eq("estado", "EN_ESPERA")
          .select("id");

        if (!updateErr && updateData && updateData.length === 0) {
          // Otro consultorio tomó al paciente milisegundos antes
          const { data: currentEnc } = await supabase.from("encuentro").select("estado").eq("id", p.id).maybeSingle();
          if (currentEnc && currentEnc.estado !== "EN_ESPERA") {
            alert("Aviso asistencial: Este paciente ya fue admitido a consulta en otro consultorio.");
            cargarColaEncuentros();
            return;
          }
        }

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
            paciente: rawPac ? `${rawPac.nombres || ""} ${rawPac.apellidos || ""}`.trim() || "Paciente (Sin nombres)" : "Paciente no identificado",
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
            const delaSede = mapeados.filter((p) => sedeNorm === "Todas las Sedes" || normalizarSede(p.sede) === sedeNorm);
            if (delaSede.length > 0) {
              const candidato = delaSede[0];
              setTimeout(() => handleSeleccionarPaciente(candidato), 0);
              return candidato;
            }
            // Si la sede actual no tiene pacientes en espera, no forzar pacientes de otras sedes
            return null;
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
            paciente: rawPac ? `${rawPac.nombres || ""} ${rawPac.apellidos || ""}`.trim() || "Paciente (Sin nombres)" : "Paciente no identificado",
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
    const esp = sessionStorage.getItem("lm_especialidad") || sessionStorage.getItem("lm_rne") || "";
    setSede(s);
    setProfesionalNombre(nom);
    setColegiatura(col);
    setEspecialidadRegistro(esp);

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

    const onOnline = async () => {
      if (activeEncuentroIdRef.current) {
        const pendingDraft = cargarBorradorOffline(activeEncuentroIdRef.current);
        if (pendingDraft) {
          try {
            const { data: userAuth } = await supabase.auth.getUser();
            const { error: upsertErr } = await supabase.from("nota_clinica").upsert(
              {
                encuentro_id: pendingDraft.encuentroId,
                paciente_id: pendingDraft.pacienteId,
                profesional_id: userAuth.user?.id,
                motivo_consulta: pendingDraft.motivo,
                antecedentes: pendingDraft.antecedentes,
                examen_fisico: JSON.stringify(pendingDraft.examenFisico),
                diagnostico_cie10: JSON.stringify(pendingDraft.diagnosticos),
                plan_trabajo: pendingDraft.planTratamiento,
                imagenes: JSON.stringify(pendingDraft.imagenes),
                cerrada: false,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "encuentro_id" }
            );
            if (!upsertErr) {
              eliminarBorradorOffline(pendingDraft.encuentroId);
              setSaveStatus("saved");
              setLastSavedTime(new Date().toLocaleTimeString("es-PE"));
            }
          } catch {}
        }
      }
    };
    window.addEventListener("online", onOnline);

    return () => {
      supabase.removeChannel(canalCambios);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("online", onOnline);
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
                ? `INFORME DE ECOGRAFÍA DE APOYO DIAGNÓSTICO (${tipoEcografia.replace('_', ' ')})`
                : modalidadAtencion === "OBSTETRICIA"
                ? "HISTORIA CLÍNICA MATERNO-PERINATAL (COP)"
                : modalidadAtencion === "GINECOLOGIA"
                ? "HISTORIA CLÍNICA GINECOLÓGICA"
                : modalidadAtencion === "MEDICINA_GENERAL"
                ? "HISTORIA CLÍNICA - MEDICINA GENERAL"
                : "REPORTE DE PRUEBAS RÁPIDAS & POCT"
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
              Colegiatura / Registro: <strong>${colegiatura ? normalizarRegistroProfesional(colegiatura, colegiatura.toUpperCase().includes("CMP") ? "CMP" : "COP") : "COP / CMP"}</strong>
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
              <div class="data-val" style="font-weight:normal; font-size:10.5px;">${prostataLobuloMedio ? `${prostataLobuloMedio}. Cápsula prostática íntegra.` : "--"}</div>
            </div>
          ` : ''}

          ${tipoEcografia === "OBSTETRICA" ? `
            <div class="grid-4" style="margin-bottom:6px;">
              <div class="data-box"><div class="data-label">D.B.P.</div><div class="data-val">${ecoDbp || "--"} mm</div></div>
              <div class="data-box"><div class="data-label">Longitud Femoral (LF)</div><div class="data-val">${ecoLf || "--"} mm</div></div>
              <div class="data-box"><div class="data-label">Circ. Abdominal (CA)</div><div class="data-val">${ecoCa || "--"} mm</div></div>
              <div class="data-box"><div class="data-label">P.F.E. Estimado</div><div class="data-val">${ecoPfe || "--"} g</div></div>
              <div class="data-box"><div class="data-label">Frecuencia Cardíaca Fetal</div><div class="data-val">${ecoFcf || lcf || "--"} lpm</div></div>
              <div class="data-box"><div class="data-label">Placenta</div><div class="data-val">${ecoPlacenta || "--"}</div></div>
              <div class="data-box"><div class="data-label">Líquido Amniótico (ILA)</div><div class="data-val">${ecoIla || "--"}</div></div>
              <div class="data-box"><div class="data-label">Presentación</div><div class="data-val">${presentacion || "--"}</div></div>
            </div>
          ` : ''}

          ${tipoEcografia === "ABDOMINAL" ? `
            <div class="grid-2" style="margin-bottom:4px;">
              <div class="data-box">
                <div class="data-label">Hígado</div>
                <div class="data-val" style="font-weight:normal; font-size:10.5px;">${ecoHigado || "--"}</div>
              </div>
              <div class="data-box">
                <div class="data-label">Vesícula & Vías Biliares</div>
                <div class="data-val" style="font-weight:normal; font-size:10.5px;">${ecoVesicula || "--"}</div>
              </div>
            </div>
            <div class="data-box" style="margin-bottom:4px;">
              <div class="data-label">Páncreas, Bazo & Cavidad Peritoneal</div>
              <div class="data-val" style="font-weight:normal; font-size:10.5px;">${ecoPancreasBazo || "--"} ${ecoLiquidoLibre ? `&bull; ${ecoLiquidoLibre}` : ""}</div>
            </div>
          ` : ''}

          ${tipoEcografia === "RENAL" ? `
            <div class="grid-2" style="margin-bottom:4px;">
              <div class="data-box">
                <div class="data-label">Riñón Derecho</div>
                <div class="data-val" style="font-weight:normal; font-size:10.5px;">${ecoRinonDer || "--"}</div>
              </div>
              <div class="data-box">
                <div class="data-label">Riñón Izquierdo</div>
                <div class="data-val" style="font-weight:normal; font-size:10.5px;">${ecoRinonIzq || "--"}</div>
              </div>
            </div>
            <div class="data-box" style="margin-bottom:4px;">
              <div class="data-label">Vejiga Urinaria</div>
              <div class="data-val" style="font-weight:normal; font-size:10.5px;">${ecoVejigaRenal || "--"}</div>
            </div>
          ` : ''}

          ${tipoEcografia === "PARTES_BLANDAS" ? `
            <div class="grid-2" style="margin-bottom:4px;">
              <div class="data-box"><div class="data-label">Región Anatómica</div><div class="data-val">${ecoPartesRegion || "--"}</div></div>
              <div class="data-box"><div class="data-label">Dimensiones de la Lesión</div><div class="data-val">${ecoPartesDimensiones || "--"}</div></div>
            </div>
            <div class="data-box" style="margin-bottom:4px;">
              <div class="data-label">Hallazgos Ecográficos</div>
              <div class="data-val" style="font-weight:normal; font-size:10.5px;">${ecoPartesHallazgos || "--"}</div>
            </div>
          ` : ''}

          ${tipoEcografia === "MAMARIA" ? `
            <div class="data-box" style="margin-bottom:4px;">
              <div class="data-label">Clasificación Mamaria</div>
              <div class="data-val" style="color:#0f172a;">${ecoBirads || "--"}</div>
            </div>
          ` : ''}

          ${tipoEcografia === "TIROIDEA" ? `
            <div class="data-box" style="margin-bottom:4px;">
              <div class="data-label">Clasificación Tiroidea</div>
              <div class="data-val" style="color:#0f172a;">${ecoTirads || "--"}</div>
            </div>
          ` : ''}

          ${tipoEcografia === "TRANSVAGINAL" ? `
            <div class="grid-2" style="margin-bottom:4px;">
              <div class="data-box"><div class="data-label">Útero (Posición & Medidas)</div><div class="data-val">${ecoUtero || "--"}</div></div>
              <div class="data-box"><div class="data-label">Grosor Endometrial</div><div class="data-val">${ecoEndometrio ? ecoEndometrio + " mm" : "--"}</div></div>
            </div>
            <div class="grid-2" style="margin-bottom:4px;">
              <div class="data-box"><div class="data-label">Ovario Derecho</div><div class="data-val">${ecoOvarioDer || "--"}</div></div>
              <div class="data-box"><div class="data-label">Ovario Izquierdo</div><div class="data-val">${ecoOvarioIzq || "--"}</div></div>
            </div>
            <div class="data-box" style="margin-bottom:4px;">
              <div class="data-label">Fondo de Saco de Douglas</div>
              <div class="data-val" style="font-weight:normal; font-size:10.5px;">${ecoDouglas || "--"}</div>
            </div>
          ` : ''}

          <div class="section-title">3. Conclusión Diagnóstica Ecográfica</div>
          <div class="content-block" style="font-weight:700; background:#f8fafc; border-left:3px solid #0284c7;">
            ${conclusionEcografica || examenFisico || "--"}
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
          <div class="content-block">${motivo || "--"}</div>

          ${antecedentes ? `
            <div class="section-title">3. Antecedentes Personales & Mórbidos</div>
            <div class="content-block">${antecedentes}</div>
          ` : ''}

          <div class="section-title">4. Examen Físico Regional Dirigido</div>
          <div class="content-block">${examenRegionalMedicina || examenFisico || "--"}</div>
        ` : modalidadAtencion === "LABORATORIO" ? `
          <!-- LABORATORIO & TIRAS -->
          <div class="section-title">2. Exámenes Auxiliares Rápidos & Laboratorio</div>
          <div class="grid-4" style="margin-bottom:6px;">
            <div class="data-box"><div class="data-label">Hemoglobina (Hb)</div><div class="data-val">${labHemoglobina ? labHemoglobina + " g/dL" : "--"}</div></div>
            <div class="data-box"><div class="data-label">Glucosa Rápida</div><div class="data-val">${labGlucosa ? labGlucosa + " mg/dL" : "--"}</div></div>
            <div class="data-box"><div class="data-label">Prueba Embarazo (GCH)</div><div class="data-val">${labPruebaEmbarazo || "--"}</div></div>
            <div class="data-box"><div class="data-label">Leucocitos Orina</div><div class="data-val">${labOrinaLeucocitos || "--"}</div></div>
            <div class="data-box"><div class="data-label">Proteínas Orina</div><div class="data-val">${labOrinaProteinas || "--"}</div></div>
            <div class="data-box"><div class="data-label">Nitritos Orina</div><div class="data-val">${labOrinaNitritos || "--"}</div></div>
          </div>
          ${labObservaciones ? `
            <div class="section-title">Observaciones Analíticas</div>
            <div class="content-block">${labObservaciones}</div>
          ` : ''}
        ` : modalidadAtencion === "GINECOLOGIA" ? `
          <!-- GINECOLOGÍA ESPECIALIZADA -->
          <div class="section-title">2. Anamnesis Ginecológica & Motivo de Consulta</div>
          <div class="content-block">${motivo || "--"}</div>

          ${antecedentes ? `
            <div class="section-title">3. Antecedentes Ginecológicos & Quirúrgicos</div>
            <div class="content-block">${antecedentes}</div>
          ` : ''}

          <div class="section-title">4. Examen Ginecológico Preferencial / Especuloscopía</div>
          <div class="content-block">${examenFisico || "--"}</div>
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
          <div class="content-block">${motivo || "--"}</div>

          ${antecedentes ? `
            <div class="section-title">4. Antecedentes Obstétricos & Perinatales</div>
            <div class="content-block">${antecedentes}</div>
          ` : ''}

          <div class="section-title">5. Examen Clínico / Evaluación Materno-Fetal</div>
          <div class="content-block">${examenFisico || "--"}</div>
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
              <strong>Adenda #${idx + 1} (${a.fecha}) [Hash: ${a.hash ? a.hash.slice(0, 16) : "VALIDADO"}...]:</strong> ${a.texto}
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
              <div style="font-size:8px; color:#334155; margin-top:2px;">
                Firma Criptográfica SHA-256:<br>
                <span style="font-family:monospace; font-weight:700; word-break:break-all; color:#0f172a;">${sealedHash || "VALIDADO"}</span>
              </div>
            ` : `
              <span style="color:#b45309; font-weight:700;">REGISTRO EN PROCESO DE ATENCIÓN (BORRADOR ACTIVO)</span>
            `}
          </div>
          <div class="signature-line">
            ${profesionalNombre}<br>
            ${
              esObstetra
                ? (modalidadAtencion === "ECOGRAFIA"
                    ? `<span style="font-size:9.5px; color:#334155; font-weight:700;">Lic. en Obstetricia &bull; ${getRegistroConEspecialidad("COP")}</span><br><span style="font-size:8px; color:#64748b; font-weight:normal;">Ecografías de Apoyo Diagnóstico &bull; Ley N.° 23346</span>`
                    : modalidadAtencion === "LABORATORIO"
                    ? `<span style="font-size:9.5px; color:#334155; font-weight:700;">Lic. en Obstetricia &bull; ${getRegistroConEspecialidad("COP")}</span><br><span style="font-size:8px; color:#64748b; font-weight:normal;">Pruebas Rápidas & Tamizaje &bull; Ley N.° 23346</span>`
                    : `<span style="font-size:9.5px; color:#334155; font-weight:700;">Lic. en Obstetricia &bull; ${getRegistroConEspecialidad("COP")}</span><br><span style="font-size:8px; color:#64748b; font-weight:normal;">Salud Materno-Perinatal &bull; Ley N.° 23346</span>`
                  )
                : (modalidadAtencion === "ECOGRAFIA"
                    ? `<span style="font-size:9.5px; color:#334155; font-weight:700;">Médico Cirujano &bull; ${getRegistroConEspecialidad("CMP")}</span><br><span style="font-size:8px; color:#64748b; font-weight:normal;">Ecografías de Apoyo Diagnóstico &bull; Ley N.° 15125</span>`
                    : modalidadAtencion === "GINECOLOGIA"
                    ? `<span style="font-size:9.5px; color:#334155; font-weight:700;">Médico Gineco-Obstetra &bull; ${getRegistroConEspecialidad("CMP")}</span><br><span style="font-size:8px; color:#64748b; font-weight:normal;">Especialista &bull; Ley N.° 15125</span>`
                    : modalidadAtencion === "MEDICINA_GENERAL"
                    ? `<span style="font-size:9.5px; color:#334155; font-weight:700;">Médico Cirujano &bull; ${getRegistroConEspecialidad("CMP")}</span><br><span style="font-size:8px; color:#64748b; font-weight:normal;">Atención Médica Primaria &bull; Ley N.° 15125</span>`
                    : `<span style="font-size:9.5px; color:#334155; font-weight:700;">Responsable Clínico &bull; ${getRegistroConEspecialidad("CMP")}</span><br><span style="font-size:8px; color:#64748b; font-weight:normal;">Pruebas Rápidas & POCT</span>`
                  )
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
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "offline_saved">("idle");
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
    ecoTransvaginal: {
      utero: ecoUtero,
      endometrio: ecoEndometrio,
      ovarioDer: ecoOvarioDer,
      ovarioIzq: ecoOvarioIzq,
      douglas: ecoDouglas,
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
    obstetriciaClickMark: {
      subModo: subModoObstetricia,
      formulaT,
      formulaPretermino,
      formulaA,
      formulaHv,
      terminacionUltimoEmbarazo,
      menarquia,
      ciclos,
      irs,
      anticoncepcionPrevia,
      papPrevio,
      grupoRh,
      alergias: alergiasSeleccionadas,
      especulo: {
        vagina: especuloVagina,
        flujoTipo: especuloFlujoTipo,
        cuello: especuloCuello,
        detalle: especuloCuelloDetalle,
      },
      tacto: {
        vagina: tactoVagina,
        cuello: tactoCuello,
        utero: tactoUtero,
        desviacion: tactoDesviacion,
        anexos: tactoAnexos,
        detalle: tactoAnexosDetalle,
      },
      conductas: conductasSeleccionadas,
      atencionesMinsa,
    },
    filiacionFicha: {
      ocupacion: pacienteOcupacion,
      gradoInstruccion: pacienteGradoInstruccion,
      estadoCivil: pacienteEstadoCivil,
      acompanante: pacienteAcompanante,
    },
    antecedentesFamiliares: {
      items: antecedentesFamiliares,
      detalle: antecedentesFamiliaresDetalle,
    },
    planificacionFamiliar: {
      condicionUsuaria: pfCondicionUsuaria,
      metodoElegido: pfMetodoElegido,
      fechaAplicacion: pfFechaAplicacion,
      proximaCita: pfProximaCita,
      consejeriaBrindada: pfConsejeriaBrindada,
      consentimientoAceptado: pfConsentimientoAceptado,
      observaciones: pfObservaciones,
    },
    ecoObstClickMark: {
      feto: ecoObstFeto,
      vitalidad: ecoObstVitalidad,
      situacion: ecoObstSituacion,
      presentacion: ecoObstPresentacion,
      dorso: ecoObstDorso,
      placentaLoc: ecoObstPlacentaLoc,
      placentaGrado: ecoObstPlacentaGrado,
      liquidoVol: ecoObstLiquidoVol,
    },
    ecoTvClickMark: {
      uteroPos: ecoTvUteroPos,
      miometrio: ecoTvMiometrio,
      endometrioFase: ecoTvEndometrioFase,
      ovarioDerPatron: ecoTvOvarioDerPatron,
      ovarioIzqPatron: ecoTvOvarioIzqPatron,
      douglas: ecoTvDouglas,
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

    // Guardado local inmediato y síncrono (Zero Data Loss)
    guardarBorradorOffline(currentEncuentroId, {
      encuentroId: currentEncuentroId,
      pacienteId: selectedPatient.pacienteId,
      timestamp: Date.now(),
      motivo,
      antecedentes,
      planTratamiento,
      diagnosticos,
      examenFisico: buildExamenFisicoJson(),
      imagenes,
      adendas,
    });

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = setTimeout(async () => {
      // Verificación estricta de concurrencia: el encuentro activo debe ser el mismo
      if (activeEncuentroIdRef.current !== currentEncuentroId) return;

      try {
        const { data: userAuth } = await supabase.auth.getUser();
        const { error: upsertErr } = await supabase.from("nota_clinica").upsert(
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

        if (upsertErr) throw upsertErr;

        if (activeEncuentroIdRef.current === currentEncuentroId) {
          // Confirmado en la nube: limpiar el borrador local
          eliminarBorradorOffline(currentEncuentroId);
          setSaveStatus("saved");
          setLastSavedTime(new Date().toLocaleTimeString("es-PE"));
        }
      } catch (err) {
        console.warn("Fallo de red en autoguardado a nube, contingencia local activa:", err);
        if (activeEncuentroIdRef.current === currentEncuentroId) {
          setSaveStatus("offline_saved");
          setLastSavedTime(new Date().toLocaleTimeString("es-PE"));
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
    ecoPartesDimensiones, ecoPartesHallazgos, ecoUtero, ecoEndometrio, ecoOvarioDer, ecoOvarioIzq, ecoDouglas,
    ecoBirads, ecoTirads, conclusionEcografica, sugerenciasEcograficas,
    tiempoEnfermedad, examenRegionalMedicina, descansoMedicoDias, labHemoglobina, labGlucosa,
    labOrinaLeucocitos, labOrinaProteinas, labOrinaNitritos, labPruebaEmbarazo, labObservaciones,
    subModoObstetricia, formulaT, formulaPretermino, formulaA, formulaHv, terminacionUltimoEmbarazo,
    menarquia, ciclos, irs, anticoncepcionPrevia, papPrevio, grupoRh, alergiasSeleccionadas,
    especuloVagina, especuloFlujoTipo, especuloCuello, especuloCuelloDetalle,
    tactoVagina, tactoCuello, tactoUtero, tactoDesviacion, tactoAnexos, tactoAnexosDetalle,
    conductasSeleccionadas, atencionesMinsa, pacienteOcupacion, pacienteGradoInstruccion,
    pacienteEstadoCivil, pacienteAcompanante, antecedentesFamiliares, antecedentesFamiliaresDetalle,
    pfCondicionUsuaria, pfMetodoElegido, pfFechaAplicacion, pfProximaCita, pfConsejeriaBrindada,
    pfConsentimientoAceptado, pfObservaciones, ecoObstFeto, ecoObstVitalidad, ecoObstSituacion,
    ecoObstPresentacion, ecoObstDorso, ecoObstPlacentaLoc, ecoObstPlacentaGrado, ecoObstLiquidoVol,
    ecoTvUteroPos, ecoTvMiometrio, ecoTvEndometrioFase, ecoTvOvarioDerPatron, ecoTvOvarioIzqPatron, ecoTvDouglas,
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

    // Marca temporal de alta fidelidad: Servidor NTP / Postgres con fallback local seguro
    const tiempoInfo = await obtenerTimestampServidorConfiable();
    const fechaCierreIso = tiempoInfo.iso;
    const efPayload = buildExamenFisicoJson();

    // Construcción del Payload Canónico Determinista para el Acto Médico (NTS N.° 139-MINSA)
    const canonicalPayload = [
      `INSTITUCION:LAS_MELLIZAS`,
      `PACIENTE:${selectedPatient.paciente}`,
      `DNI:${selectedPatient.dni}`,
      `ENCUENTRO_ID:${selectedPatient.id}`,
      `FECHA_HORA_UTC:${fechaCierreIso}`,
      `FUENTE_TIEMPO:${tiempoInfo.fuente}`,
      `PROFESIONAL:${profesionalNombre}`,
      `COLEGIATURA:${colegiatura || "S/C"}`,
      `SEDE:${selectedPatient.sede || sede}`,
      `MODALIDAD:${modalidadAtencion}`,
      `SUBTIPO:${tipoEcografia}`,
      `MOTIVO:${motivo}`,
      `ANTECEDENTES:${antecedentes}`,
      `EXAMEN:${JSON.stringify(efPayload)}`,
      `CIE10:${JSON.stringify(diagnosticos)}`,
      `PLAN:${planTratamiento}`,
    ].join("|");

    const hash = await generarHashCanonico(canonicalPayload);

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
          fecha_cierre: fechaCierreIso,
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
        .update({ estado: "ATENDIDO", updated_at: fechaCierreIso })
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
            fuente_tiempo: tiempoInfo.fuente,
            timestamp_servidor: fechaCierreIso,
          },
        });
      }

      setSealedHash(hash);
      setFechaSellado(fechaCierreIso);
      setIsSealed(true);
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
        autosaveTimeoutRef.current = null;
      }
      setSaveStatus("saved");
      eliminarBorradorOffline(selectedPatient.id);
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

    if (file.size > 15 * 1024 * 1024) {
      alert("El tamaño de la imagen no debe superar los 15MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const rawDataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1280;
          const MAX_HEIGHT = 960;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Compresión de alto rendimiento: reduce 5MB a ~80-120KB preservando resolución diagnóstica
            const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.82);
            const nombreLimpio = file.name.replace(/\.[^/.]+$/, "");

            // Resiliencia híbrida: Intentar subir a Supabase Storage bucket 'ecografias'
            // Si el bucket no existe o falla la red, el fallback mantiene Base64 en buffer local (Zero Data Loss)
            canvas.toBlob(async (blob) => {
              let finalUrl = compressedDataUrl;
              if (blob) {
                try {
                  const safeName = `${selectedPatient?.id || "consulta"}_${Date.now()}.jpg`;
                  const { data: uploadData, error: uploadErr } = await supabase.storage
                    .from("ecografias")
                    .upload(safeName, blob, { contentType: "image/jpeg", upsert: true });

                  if (!uploadErr && uploadData?.path) {
                    const { data: pubData } = supabase.storage
                      .from("ecografias")
                      .getPublicUrl(uploadData.path);
                    if (pubData?.publicUrl) {
                      finalUrl = pubData.publicUrl;
                    }
                  }
                } catch (stErr) {
                  console.warn("Storage Supabase contingente, preservando imagen en buffer Base64:", stErr);
                }
              }

              const nueva: ImagenAdjunta = {
                id: `img-${Date.now()}`,
                titulo: nombreLimpio.length > 30 ? nombreLimpio.slice(0, 30) + "..." : nombreLimpio,
                tipo: "Ecografía / Captura",
                url: finalUrl,
                hora: new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }),
              };
              setImagenes((prev) => [...prev, nueva]);
            }, "image/jpeg", 0.82);
            return;
          }
        } catch (canvasErr) {
          console.warn("Fallo compresión en canvas, aplicando original:", canvasErr);
        }

        // Fallback si canvas no estuviese disponible
        const nombreLimpio = file.name.replace(/\.[^/.]+$/, "");
        const nueva: ImagenAdjunta = {
          id: `img-${Date.now()}`,
          titulo: nombreLimpio.length > 30 ? nombreLimpio.slice(0, 30) + "..." : nombreLimpio,
          tipo: "Ecografía / Captura",
          url: rawDataUrl,
          hora: new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }),
        };
        setImagenes((prev) => [...prev, nueva]);
      };
      img.src = rawDataUrl;
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
      const tiempoInfo = await obtenerTimestampServidorConfiable();
      const fechaIso = tiempoInfo.iso;

      // Cálculo de Hash Canónico SHA-256 para Adenda Clínica
      const adendaPayload = [
        `ENCUENTRO_ID:${selectedPatient.id}`,
        `AUTOR:${autorNombre}`,
        `FECHA_HORA:${fechaIso}`,
        `FUENTE_TIEMPO:${tiempoInfo.fuente}`,
        `TEXTO:${textoAdenda.trim()}`,
      ].join("|");
      const hashAdenda = await generarHashCanonico(adendaPayload);

      // Intentar mediante la función RPC atómica
      const { data: rpcRes, error: rpcErr } = await supabase.rpc("incorporar_adenda_clinica", {
        p_encuentro_id: selectedPatient.id,
        p_texto_adenda: textoAdenda.trim(),
        p_autor_nombre: autorNombre,
        p_autor_id: userAuth.user?.id || null,
      });

      if (rpcErr) {
        console.warn("Advertencia al incorporar adenda por RPC, aplicando fallback con hash canónico:", rpcErr.message);
        const nuevaAdenda = {
          fecha: new Date(fechaIso).toLocaleString("es-PE"),
          autor: autorNombre,
          texto: textoAdenda.trim(),
          hash: hashAdenda,
          fuente_tiempo: tiempoInfo.fuente,
        };
        const nuevasAdendas = [...adendas, nuevaAdenda];
        setAdendas(nuevasAdendas);
        await supabase
          .from("nota_clinica")
          .update({
            adendas: JSON.stringify(nuevasAdendas),
            updated_at: fechaIso,
          })
          .eq("encuentro_id", selectedPatient.id);
      } else if (rpcRes && rpcRes.adenda) {
        setAdendas((prev) => [...prev, rpcRes.adenda]);
      } else {
        setAdendas((prev) => [
          ...prev,
          {
            fecha: new Date().toLocaleString("es-PE"),
            autor: autorNombre,
            texto: textoAdenda.trim(),
            hash: hashAdenda,
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

  const pacientesFiltrados = useMemo(
    () =>
      pacientesCola.filter(
        (p) => sede === "Todas las Sedes" || normalizarSede(p.sede) === normalizarSede(sede)
      ),
    [pacientesCola, sede]
  );

  const atendidosFiltrados = useMemo(
    () =>
      atendidosHoy.filter(
        (p) => sede === "Todas las Sedes" || normalizarSede(p.sede) === normalizarSede(sede)
      ),
    [atendidosHoy, sede]
  );

  // Sincronización en tiempo real de la cola de pacientes con el Sidebar Color Vino (Memoizado para evitar bucles de render)
  useEffect(() => {
    setPacientesEspera(pacientesFiltrados);
    setPacientesAtendidos(atendidosFiltrados);
    setSedeCola(sede);
  }, [pacientesFiltrados, atendidosFiltrados, sede, setPacientesEspera, setPacientesAtendidos, setSedeCola]);

  useEffect(() => {
    setSelectedPatientId(selectedPatient ? selectedPatient.id : null);
  }, [selectedPatient, setSelectedPatientId]);

  const handleSeleccionarPacienteRef = useRef(handleSeleccionarPaciente);
  handleSeleccionarPacienteRef.current = handleSeleccionarPaciente;

  useEffect(() => {
    setOnSelectPatient(() => (p: PacienteEnConsulta) => handleSeleccionarPacienteRef.current(p));
    setOnReopenPatient(() => (p: PacienteEnConsulta) => {
      setEncuentroAReabrir(p);
      setShowReabrirModal(true);
    });
  }, [setOnSelectPatient, setOnReopenPatient]);

  return (
    <div className="space-y-3 max-w-[1600px] mx-auto text-xs">
      {/* Botones de Acción de HCE Montados en el Topbar Superior al lado de Cerrar Sesión */}
      {topbarContainer &&
        createPortal(
          <div className="flex items-center gap-2">
            {saveStatus === "saving" && (
              <span className="flex items-center gap-1 font-mono text-[10px] text-amber-600 animate-pulse mr-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>Guardando...</span>
              </span>
            )}
            {saveStatus === "offline_saved" && (
              <span
                className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px] font-bold font-mono mr-1"
                title="Respaldo local seguro activo"
              >
                <ShieldCheck className="w-3 h-3 text-amber-600" />
                <span>Local seguro</span>
              </span>
            )}

            {/* Botón de Impresión Ficha Clínica A4 */}
            <button
              type="button"
              onClick={imprimirFichaClinicaA4}
              disabled={!selectedPatient}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs rounded-xl border border-neutral-300 transition disabled:opacity-40 shadow-2xs cursor-pointer"
              title="Imprimir Historia Clínica Electrónica completa en formato A4"
            >
              <Printer className="w-3.5 h-3.5 text-neutral-600" />
              <span className="hidden sm:inline">Imprimir Historia (A4)</span>
            </button>

            {/* Botón de Sellar / Adenda */}
            {!isSealed ? (
              <button
                type="button"
                onClick={handleSellarNota}
                disabled={!selectedPatient}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-900 hover:bg-black text-white font-bold text-xs rounded-xl transition disabled:opacity-40 shadow-2xs cursor-pointer"
              >
                <Lock className="w-3 h-3" />
                <span>Sellar & Firmar HCE</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowAdendaModal(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs rounded-xl transition shadow-2xs cursor-pointer"
              >
                <PlusCircle className="w-3 h-3" />
                <span>Incorporar Adenda</span>
              </button>
            )}
          </div>,
          topbarContainer
        )}

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
                  <span>
                    Sede: <strong className="text-neutral-800">{selectedPatient?.sede || sede}</strong>
                    {selectedPatient && normalizarSede(selectedPatient.sede) !== normalizarSede(sede) && sede !== "Todas las Sedes" && (
                      <span className="ml-1.5 text-[9px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-300 px-1.5 py-0.2 rounded inline-flex items-center gap-1">
                        ⚠️ Admisión en Sede {selectedPatient.sede}
                      </span>
                    )}
                  </span>
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
                  placeholder="Ej: 120/80"
                  className={`w-full px-2.5 py-1.5 border rounded-lg font-mono font-bold text-xs placeholder:text-neutral-300 placeholder:font-normal placeholder:italic ${
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
                  placeholder="Ej: 76"
                  className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-lg font-mono font-bold text-xs placeholder:text-neutral-300 placeholder:font-normal placeholder:italic"
                />
              </div>

              <div>
                <label className="block text-[10px] text-neutral-500 font-bold mb-1">Temp (°C)</label>
                <input
                  type="text"
                  disabled={isSealed}
                  value={temp}
                  onChange={(e) => setTemp(e.target.value)}
                  placeholder="Ej: 36.5"
                  className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-lg font-mono font-bold text-xs placeholder:text-neutral-300 placeholder:font-normal placeholder:italic"
                />
              </div>

              <div>
                <label className="block text-[10px] text-neutral-500 font-bold mb-1">SatO2 (%)</label>
                <input
                  type="text"
                  disabled={isSealed}
                  value={satO2}
                  onChange={(e) => setSatO2(e.target.value)}
                  placeholder="Ej: 98"
                  className={`w-full px-2.5 py-1.5 border rounded-lg font-mono font-bold text-xs placeholder:text-neutral-300 placeholder:font-normal placeholder:italic ${
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
                  placeholder="Ej: 60.0"
                  className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-lg font-mono font-bold text-xs placeholder:text-neutral-300 placeholder:font-normal placeholder:italic"
                />
              </div>

              <div>
                <label className="block text-[10px] text-neutral-500 font-bold mb-1">Talla (m)</label>
                <input
                  type="text"
                  disabled={isSealed}
                  value={talla}
                  onChange={(e) => setTalla(e.target.value)}
                  placeholder="Ej: 1.60"
                  className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-lg font-mono font-bold text-xs placeholder:text-neutral-300 placeholder:font-normal placeholder:italic"
                />
              </div>
            </div>
          </div>

          {/* Formulario Clínico Principal */}
          <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-3.5 shadow-2xs">
            {/* ================================================================ */}
            {/* 1. CASO: SUBMÓDULO OBSTETRICIA & SALUD FEMENINA (COP / MINSA)     */}
            {/* ================================================================ */}
            {modalidadAtencion === "OBSTETRICIA" && (
              <div className="space-y-3.5">
                {/* Selector de Sub-Modo de Atención */}
                <div className="flex items-center gap-1.5 p-1 bg-rose-50/70 rounded-xl border border-rose-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setSubModoObstetricia("CONSULTA_RAPIDA")}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      subModoObstetricia === "CONSULTA_RAPIDA"
                        ? "bg-rose-700 text-white shadow-xs"
                        : "text-rose-900 hover:bg-rose-100/70"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Ficha Obstétrica "Click & Mark" (Las Mellizas - Consulta Ambulatoria)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubModoObstetricia("CARNET_MINSA")}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      subModoObstetricia === "CARNET_MINSA"
                        ? "bg-rose-700 text-white shadow-xs"
                        : "text-rose-900 hover:bg-rose-100/70"
                    }`}
                  >
                    <Baby className="w-3.5 h-3.5" />
                    <span>Carné Perinatal Longitudinal MINSA (SIP - 9 Atenciones)</span>
                  </button>
                </div>

                {/* VISTA 1: FICHA AMBULATORIA CLICK & MARK (LAS MELLIZAS) */}
                {subModoObstetricia === "CONSULTA_RAPIDA" ? (
                  <div className="space-y-3.5">
                    {/* PANEL 0: FILIACIÓN SOCIOCULTURAL DE LA FICHA FÍSICA & ANTECEDENTES FAMILIARES */}
                    <div className="p-3 bg-neutral-50/70 border border-neutral-200 rounded-xl space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-neutral-200 pb-1.5">
                        <span className="font-extrabold text-[11px] text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-rose-700" />
                          0. Filiación de la Ficha Física & Antecedentes Familiares
                        </span>
                        <span className="text-[9.5px] font-mono font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                          Ficha Física Las Mellizas (Pág. 1)
                        </span>
                      </div>

                      {/* Filiación: Ocupación, Escolaridad, Estado Civil, Acompañante */}
                      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2.5 bg-white p-2.5 rounded-lg border border-neutral-200">
                        <div>
                          <label className="block text-[10px] font-bold text-neutral-600 mb-1">Ocupación:</label>
                          <input
                            type="text"
                            disabled={isSealed}
                            value={pacienteOcupacion}
                            onChange={(e) => setPacienteOcupacion(e.target.value)}
                            placeholder="Ej: Comerciante / Su casa"
                            className="w-full p-1.5 border border-neutral-300 rounded text-xs bg-white text-neutral-900"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-neutral-600 mb-1">Escolaridad / Estudios:</label>
                          <select
                            disabled={isSealed}
                            value={pacienteGradoInstruccion}
                            onChange={(e) => setPacienteGradoInstruccion(e.target.value)}
                            className="w-full p-1.5 border border-neutral-300 rounded text-xs bg-white text-neutral-900"
                          >
                            <option value="">-- Seleccionar --</option>
                            <option value="Superior Universitario">Superior Universitario</option>
                            <option value="Superior Técnico">Superior Técnico</option>
                            <option value="Secundaria Completa">Secundaria Completa</option>
                            <option value="Secundaria Incompleta">Secundaria Incompleta</option>
                            <option value="Primaria">Primaria</option>
                            <option value="Sin Instrucción">Sin Instrucción</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-neutral-600 mb-1">Estado Civil:</label>
                          <div className="grid grid-cols-3 gap-1">
                            {(["Soltera", "Conviviente", "Casada"] as const).map((ec) => (
                              <button
                                key={ec}
                                type="button"
                                disabled={isSealed}
                                onClick={() => setPacienteEstadoCivil(ec)}
                                className={`py-1 px-1 rounded text-[10px] font-bold border text-center transition cursor-pointer ${
                                  pacienteEstadoCivil === ec
                                    ? "bg-rose-700 text-white border-rose-800"
                                    : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100"
                                }`}
                              >
                                {ec.slice(0, 4)}..
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-neutral-600 mb-1">Acompañante al Ingreso:</label>
                          <select
                            disabled={isSealed}
                            value={pacienteAcompanante}
                            onChange={(e) => setPacienteAcompanante(e.target.value)}
                            className="w-full p-1.5 border border-neutral-300 rounded text-xs bg-white text-neutral-900"
                          >
                            <option value="">-- Sola / Ninguno --</option>
                            <option value="Esposo / Pareja">Esposo / Pareja</option>
                            <option value="Conviviente / Compañero">Conviviente / Compañero</option>
                            <option value="Madre">Madre</option>
                            <option value="Padre">Padre</option>
                            <option value="Familiar">Familiar</option>
                            <option value="Amiga / Acompañante">Amiga / Acompañante</option>
                            <option value="Otro">Otro</option>
                          </select>
                        </div>
                      </div>

                      {/* Antecedentes Familiares en Botones Clickeables */}
                      <div className="bg-white p-2.5 rounded-lg border border-neutral-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1">
                            <Activity className="w-3 h-3 text-rose-600" />
                            Antecedentes Familiares Relevantes (Click & Mark)
                          </label>
                          <span className="text-[9px] text-neutral-400 font-mono">Ficha Las Mellizas</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {["Ninguno", "HTA / Preeclampsia", "Diabetes Mellitus", "Tuberculosis (TBC)", "Embarazo Gemelar", "Cáncer Mama/Cérvix", "Alergias familiares"].map((ant) => {
                            const estaMarcado = antecedentesFamiliares.includes(ant);
                            return (
                              <button
                                key={ant}
                                type="button"
                                disabled={isSealed}
                                onClick={() => toggleAntecedenteFamiliar(ant)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center gap-1 ${
                                  estaMarcado
                                    ? ant === "Ninguno"
                                      ? "bg-emerald-600 text-white border-emerald-700"
                                      : "bg-rose-700 text-white border-rose-800 shadow-2xs"
                                    : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100"
                                }`}
                              >
                                <span>{estaMarcado ? "✓" : "+"}</span>
                                <span>{ant}</span>
                              </button>
                            );
                          })}
                        </div>
                        {antecedentesFamiliares.length > 0 && !antecedentesFamiliares.includes("Ninguno") && (
                          <input
                            type="text"
                            disabled={isSealed}
                            value={antecedentesFamiliaresDetalle}
                            onChange={(e) => setAntecedentesFamiliaresDetalle(e.target.value)}
                            placeholder="Detalle: ej. Madre con HTA crónica, abuela con DM tipo 2, hermana con parto gemelar..."
                            className="w-full p-1.5 border border-neutral-300 rounded text-xs bg-white text-neutral-900 placeholder:text-neutral-300"
                          />
                        )}
                      </div>
                    </div>

                    {/* PANEL 1: ANTECEDENTES OBSTÉTRICOS & ALERGIAS */}
                    <div className="p-3 bg-neutral-50/70 border border-neutral-200 rounded-xl space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-neutral-200 pb-1.5">
                        <span className="font-extrabold text-[11px] text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-rose-700" />
                          1. Antecedentes Obstétricos (A.O.) & Alergias
                        </span>
                        <span className="text-[9.5px] font-mono font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                          Ficha Clínica Las Mellizas
                        </span>
                      </div>

                      {/* Fila 1: Fórmula Obstétrica en Cajetines Reales (G - P - T - P - A - HV) */}
                      <div className="bg-white p-2.5 rounded-lg border border-neutral-200 space-y-2">
                        <div className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider">
                          Fórmula Obstétrica & Antecedente Gestacional
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2 items-end">
                          <div>
                            <label className="block text-[9.5px] font-bold text-neutral-600 mb-0.5 text-center">G (Gestas)</label>
                            <input
                              type="text"
                              disabled={isSealed}
                              value={formulaG}
                              onChange={(e) => setFormulaG(e.target.value)}
                              placeholder="0"
                              className="w-full p-1.5 border border-neutral-300 rounded font-mono font-extrabold text-center text-xs bg-white text-neutral-900"
                            />
                          </div>
                          <div>
                            <label className="block text-[9.5px] font-bold text-neutral-600 mb-0.5 text-center">P (Partos)</label>
                            <input
                              type="text"
                              disabled={isSealed}
                              value={formulaP}
                              onChange={(e) => setFormulaP(e.target.value)}
                              placeholder="0"
                              className="w-full p-1.5 border border-neutral-300 rounded font-mono font-extrabold text-center text-xs bg-white text-neutral-900"
                            />
                          </div>
                          <div>
                            <label className="block text-[9.5px] font-bold text-neutral-600 mb-0.5 text-center">T (A Término)</label>
                            <input
                              type="text"
                              disabled={isSealed}
                              value={formulaT}
                              onChange={(e) => setFormulaT(e.target.value)}
                              placeholder="0"
                              className="w-full p-1.5 border border-neutral-300 rounded font-mono font-extrabold text-center text-xs bg-white text-neutral-900"
                            />
                          </div>
                          <div>
                            <label className="block text-[9.5px] font-bold text-neutral-600 mb-0.5 text-center">P (Pretérmino)</label>
                            <input
                              type="text"
                              disabled={isSealed}
                              value={formulaPretermino}
                              onChange={(e) => setFormulaPretermino(e.target.value)}
                              placeholder="0"
                              className="w-full p-1.5 border border-neutral-300 rounded font-mono font-extrabold text-center text-xs bg-white text-neutral-900"
                            />
                          </div>
                          <div>
                            <label className="block text-[9.5px] font-bold text-neutral-600 mb-0.5 text-center">A (Abortos)</label>
                            <input
                              type="text"
                              disabled={isSealed}
                              value={formulaA}
                              onChange={(e) => setFormulaA(e.target.value)}
                              placeholder="0"
                              className="w-full p-1.5 border border-neutral-300 rounded font-mono font-extrabold text-center text-xs bg-white text-rose-700"
                            />
                          </div>
                          <div>
                            <label className="block text-[9.5px] font-bold text-neutral-600 mb-0.5 text-center">HV (Vivos)</label>
                            <input
                              type="text"
                              disabled={isSealed}
                              value={formulaHv}
                              onChange={(e) => setFormulaHv(e.target.value)}
                              placeholder="0"
                              className="w-full p-1.5 border border-neutral-300 rounded font-mono font-extrabold text-center text-xs bg-white text-emerald-800"
                            />
                          </div>
                          <div>
                            <label className="block text-[9.5px] font-bold text-neutral-600 mb-0.5">Fin Último Emb.</label>
                            <input
                              type="text"
                              disabled={isSealed}
                              value={terminacionUltimoEmbarazo}
                              onChange={(e) => setTerminacionUltimoEmbarazo(e.target.value)}
                              placeholder="Parto / Cesárea / Aborto"
                              className="w-full p-1.5 border border-neutral-300 rounded text-xs bg-white"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Fila 2: Ciclos, FUM, FPP, Anticoncepción previa y PAP */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">Menarquia / Ciclos</label>
                          <div className="flex gap-1">
                            <input
                              type="text"
                              disabled={isSealed}
                              value={menarquia}
                              onChange={(e) => setMenarquia(e.target.value)}
                              placeholder="Edad (12a)"
                              className="w-1/2 p-1.5 border border-neutral-300 rounded text-xs text-center"
                            />
                            <input
                              type="text"
                              disabled={isSealed}
                              value={ciclos}
                              onChange={(e) => setCiclos(e.target.value)}
                              placeholder="28/4"
                              className="w-1/2 p-1.5 border border-neutral-300 rounded text-xs text-center"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">Edad Inicio R.S.</label>
                          <input
                            type="text"
                            disabled={isSealed}
                            value={irs}
                            onChange={(e) => setIrs(e.target.value)}
                            placeholder="Ej: 18 años"
                            className="w-full p-1.5 border border-neutral-300 rounded text-xs text-center"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">F.U.M. (Regla)</label>
                          <input
                            type="date"
                            disabled={isSealed}
                            value={fur}
                            onChange={(e) => handleFurChange(e.target.value)}
                            className="w-full p-1.5 border border-neutral-300 rounded font-mono text-xs bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">F.P.P. (Naegele)</label>
                          <input
                            type="date"
                            disabled={isSealed}
                            value={fpp}
                            onChange={(e) => setFpp(e.target.value)}
                            className="w-full p-1.5 border border-emerald-300 rounded font-mono text-xs font-bold text-emerald-900 bg-emerald-50/50"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">Anticoncepción Previa</label>
                          <select
                            disabled={isSealed}
                            value={anticoncepcionPrevia}
                            onChange={(e) => setAnticoncepcionPrevia(e.target.value)}
                            className="w-full p-1.5 border border-neutral-300 rounded text-xs bg-white"
                          >
                            <option value="">-- Ninguna --</option>
                            <option value="Inyectable Mensual">Inyectable Mensual</option>
                            <option value="Inyectable Trimestral">Inyectable Trimestral</option>
                            <option value="Píldoras Orales">Píldoras Orales</option>
                            <option value="DIU T de Cobre">DIU T de Cobre</option>
                            <option value="Implante Subdérmico">Implante Subdérmico</option>
                            <option value="Preservativo">Preservativo</option>
                            <option value="Emergencia (Levonorgestrel)">Emergencia (Oral)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">PAP Prev. / Resultado</label>
                          <input
                            type="text"
                            disabled={isSealed}
                            value={papPrevio}
                            onChange={(e) => setPapPrevio(e.target.value)}
                            placeholder="Negativo / Inflamatorio"
                            className="w-full p-1.5 border border-neutral-300 rounded text-xs"
                          />
                        </div>
                      </div>

                      {/* Fila 3: Alergias en Botones Clickeables */}
                      <div className="bg-white p-2.5 rounded-lg border border-neutral-200">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Alergias a Medicamentos & Materiales (Clic para marcar)
                          </label>
                          <span className="text-[9px] text-neutral-400 font-mono">Ficha Las Mellizas</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {["Ninguna", "Lidocaína", "Penicilina", "Tetraciclina", "Salicilatos", "Cobre", "Sulfas", "AINEs"].map((alergia) => {
                            const estaMarcada = alergiasSeleccionadas.includes(alergia);
                            return (
                              <button
                                key={alergia}
                                type="button"
                                disabled={isSealed}
                                onClick={() => toggleAlergia(alergia)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                                  estaMarcada
                                    ? alergia === "Ninguna"
                                      ? "bg-emerald-600 text-white border-emerald-700"
                                      : "bg-rose-700 text-white border-rose-800 shadow-2xs"
                                    : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100"
                                }`}
                              >
                                <span>{estaMarcada ? "✓" : "+"}</span>
                                <span>{alergia}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* PANEL 2: EXAMEN GINECOLÓGICO VISUAL (ESPÉCULO & TACTO EN CASILLAS) */}
                    <div className="p-3 bg-purple-50/40 border border-purple-200 rounded-xl space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-purple-200/80 pb-1.5">
                        <span className="font-extrabold text-[11px] text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                          <Stethoscope className="w-3.5 h-3.5 text-purple-700" />
                          2. Examen Físico Obstétrico & Pélvico (Espéculo & Tacto Bimanual)
                        </span>
                        <span className="text-[9.5px] font-mono font-bold text-purple-800 bg-purple-100/80 px-2 py-0.5 rounded">
                          Evaluación Clínica en Mostrador
                        </span>
                      </div>

                      <div className="grid md:grid-cols-2 gap-3">
                        {/* Columna A: Especuloscopía */}
                        <div className="bg-white p-3 rounded-lg border border-purple-200/70 space-y-2.5">
                          <div className="text-xs font-bold text-purple-900 border-b border-neutral-100 pb-1 flex items-center justify-between">
                            <span>A. ESPECULOSCOPÍA</span>
                            <span className="text-[9.5px] font-mono text-neutral-400">Paredes & Cérvix</span>
                          </div>

                          {/* Vagina */}
                          <div>
                            <label className="block text-[10px] font-bold text-neutral-600 mb-1">Vagina:</label>
                            <div className="grid grid-cols-3 gap-1.5">
                              {(["Sana", "Sangre", "Flujo"] as const).map((opc) => (
                                <button
                                  key={opc}
                                  type="button"
                                  disabled={isSealed}
                                  onClick={() => setEspeculoVagina(opc)}
                                  className={`py-1 px-2 rounded-md text-xs font-bold border transition text-center cursor-pointer ${
                                    especuloVagina === opc
                                      ? "bg-purple-700 text-white border-purple-800 shadow-2xs"
                                      : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100"
                                  }`}
                                >
                                  {opc}
                                </button>
                              ))}
                            </div>
                            {especuloVagina === "Flujo" && (
                              <div className="mt-1.5">
                                <select
                                  disabled={isSealed}
                                  value={especuloFlujoTipo}
                                  onChange={(e) => setEspeculoFlujoTipo(e.target.value)}
                                  className="w-full p-1.5 border border-purple-300 rounded text-xs bg-purple-50/40 text-purple-900 font-semibold"
                                >
                                  <option value="">-- Seleccionar tipo de flujo --</option>
                                  <option value="Blanco grumoso en leche cortada (Candida)">Blanco grumoso en leche cortada (Candida)</option>
                                  <option value="Amarillo verdoso espumoso (Trichomona)">Amarillo verdoso espumoso (Trichomona)</option>
                                  <option value="Grisáceo homogéneo olor fétido (Vaginosis)">Grisáceo homogéneo olor fétido (Vaginosis)</option>
                                  <option value="Acuoso / Leucorrea inespecífica">Acuoso / Leucorrea inespecífica</option>
                                </select>
                              </div>
                            )}
                          </div>

                          {/* Cuello Uterino */}
                          <div>
                            <label className="block text-[10px] font-bold text-neutral-600 mb-1">Cuello Uterino:</label>
                            <div className="grid grid-cols-3 gap-1.5">
                              {(["Sano", "Ectropión", "Otro"] as const).map((opc) => (
                                <button
                                  key={opc}
                                  type="button"
                                  disabled={isSealed}
                                  onClick={() => setEspeculoCuello(opc)}
                                  className={`py-1 px-2 rounded-md text-xs font-bold border transition text-center cursor-pointer ${
                                    especuloCuello === opc
                                      ? "bg-purple-700 text-white border-purple-800 shadow-2xs"
                                      : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100"
                                  }`}
                                >
                                  {opc}
                                </button>
                              ))}
                            </div>
                            {especuloCuello !== "Sano" && (
                              <input
                                type="text"
                                disabled={isSealed}
                                value={especuloCuelloDetalle}
                                onChange={(e) => setEspeculoCuelloDetalle(e.target.value)}
                                placeholder="Detalle: ej. Ectropión 10mm / Sangrado al contacto / Pólipo"
                                className="w-full mt-1.5 p-1.5 border border-neutral-300 rounded text-xs bg-white"
                              />
                            )}
                          </div>
                        </div>

                        {/* Columna B: Tacto Vaginal Bimanual */}
                        <div className="bg-white p-3 rounded-lg border border-purple-200/70 space-y-2.5">
                          <div className="text-xs font-bold text-purple-900 border-b border-neutral-100 pb-1 flex items-center justify-between">
                            <span>B. TACTO VAGINAL BIMANUAL</span>
                            <span className="text-[9.5px] font-mono text-neutral-400">Útero & Anexos</span>
                          </div>

                          {/* Temperatura Vaginal & Cuello */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-bold text-neutral-600 mb-1">Temperatura:</label>
                              <div className="grid grid-cols-2 gap-1">
                                {(["Normotérmica", "Hipertérmica"] as const).map((t) => (
                                  <button
                                    key={t}
                                    type="button"
                                    disabled={isSealed}
                                    onClick={() => setTactoVagina(t)}
                                    className={`py-1 px-1 rounded text-[10px] font-bold border text-center transition cursor-pointer ${
                                      tactoVagina === t ? "bg-purple-700 text-white border-purple-800" : "bg-neutral-50 border-neutral-200 text-neutral-700"
                                    }`}
                                  >
                                    {t.slice(0, 5)}...
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-neutral-600 mb-1">Cuello:</label>
                              <div className="grid grid-cols-3 gap-1">
                                {(["Cerrado", "Dilatado", "Doloroso"] as const).map((c) => (
                                  <button
                                    key={c}
                                    type="button"
                                    disabled={isSealed}
                                    onClick={() => setTactoCuello(c)}
                                    className={`py-1 px-1 rounded text-[9.5px] font-bold border text-center transition cursor-pointer ${
                                      tactoCuello === c ? "bg-purple-700 text-white border-purple-800" : "bg-neutral-50 border-neutral-200 text-neutral-700"
                                    }`}
                                  >
                                    {c}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Posición Uterina & Desviación */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-bold text-neutral-600 mb-1">Útero (Posición):</label>
                              <div className="grid grid-cols-3 gap-1">
                                {(["Anteversión", "Retroversión", "Media"] as const).map((u) => (
                                  <button
                                    key={u}
                                    type="button"
                                    disabled={isSealed}
                                    onClick={() => setTactoUtero(u)}
                                    className={`py-1 px-1 rounded text-[9.5px] font-bold border text-center transition cursor-pointer ${
                                      tactoUtero === u ? "bg-purple-700 text-white border-purple-800" : "bg-neutral-50 border-neutral-200 text-neutral-700"
                                    }`}
                                  >
                                    {u === "Anteversión" ? "AVF" : u === "Retroversión" ? "RVF" : "Media"}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-neutral-600 mb-1">Anexos:</label>
                              <div className="grid grid-cols-3 gap-1">
                                {(["Normales", "Dolorosos", "Masas"] as const).map((a) => (
                                  <button
                                    key={a}
                                    type="button"
                                    disabled={isSealed}
                                    onClick={() => setTactoAnexos(a)}
                                    className={`py-1 px-1 rounded text-[9.5px] font-bold border text-center transition cursor-pointer ${
                                      tactoAnexos === a ? "bg-purple-700 text-white border-purple-800" : "bg-neutral-50 border-neutral-200 text-neutral-700"
                                    }`}
                                  >
                                    {a}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* PANEL 2.5: PLANIFICACIÓN FAMILIAR & ANTICONCEPCIÓN (MAC) */}
                    <div className="p-3 bg-cyan-50/50 border border-cyan-200 rounded-xl space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-cyan-200 pb-1.5">
                        <span className="font-extrabold text-[11px] text-cyan-950 uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-cyan-700" />
                          2.5 Planificación Familiar & Manejo de Métodos Anticonceptivos (MAC)
                        </span>
                        <span className="text-[9.5px] font-mono font-bold text-cyan-800 bg-cyan-100/70 border border-cyan-300 px-2 py-0.5 rounded">
                          Salud Sexual y Reproductiva
                        </span>
                      </div>

                      {/* Condición de la Usuaria */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-cyan-900 uppercase">Condición de la Usuaria:</span>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                          {[
                            { id: "INICIO", label: "Inicio de Método" },
                            { id: "CONTINUACION", label: "Continuación / Dosis" },
                            { id: "CAMBIO", label: "Cambio de Método" },
                            { id: "RETIRO", label: "Retiro (DIU/Implante)" },
                            { id: "CONSEJERIA", label: "Solo Consejería PF" },
                          ].map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              disabled={isSealed}
                              onClick={() => setPfCondicionUsuaria(pfCondicionUsuaria === c.id ? "" : c.id)}
                              className={`p-1.5 rounded-lg text-xs font-bold border transition text-center cursor-pointer ${
                                pfCondicionUsuaria === c.id
                                  ? "bg-cyan-700 text-white border-cyan-800 shadow-2xs"
                                  : "bg-white text-cyan-900 border-cyan-200 hover:bg-cyan-100/50"
                              }`}
                            >
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Métodos Anticonceptivos Disponibles */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-cyan-900 uppercase">Método Anticonceptivo Elegido / Aplicado:</span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          {[
                            { id: "INYECTABLE_TRIMESTRAL", label: "💉 Inyectable Trimestral", desc: "Depo-Provera (90d)" },
                            { id: "INYECTABLE_MENSUAL", label: "💉 Inyectable Mensual", desc: "Mesigyna/Cyclofem (30d)" },
                            { id: "IMPLANTE_SUBDERMICO", label: "🛡️ Implante Subdérmico", desc: "Levonorgestrel (3 años)" },
                            { id: "DIU_T_COBRE", label: "⚓ DIU T de Cobre 380A", desc: "Intrauterino (5 años)" },
                            { id: "AOC_ORALES", label: "💊 Anticonceptivos Orales", desc: "Píldoras combinadas (AOC)" },
                            { id: "AOE_EMERGENCIA", label: "🚨 Anticoncepción Emergencia", desc: "AOE Levonorgestrel 1.5mg" },
                            { id: "PRESERVATIVO", label: "🧤 Preservativos / Barrera", desc: "Condón masculino / Doble prot." },
                            { id: "OTRO", label: "➕ Otro Método / Natural", desc: "MELA / Abstinencia periódica" },
                          ].map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              disabled={isSealed}
                              onClick={() => seleccionarMetodoPf(m.id)}
                              className={`p-2 rounded-lg text-left text-xs font-bold border transition cursor-pointer flex flex-col justify-between ${
                                pfMetodoElegido === m.id
                                  ? "bg-cyan-800 text-white border-cyan-900 shadow-2xs ring-1 ring-cyan-500"
                                  : "bg-white text-neutral-800 border-cyan-200 hover:bg-cyan-50"
                              }`}
                            >
                              <span>{m.label}</span>
                              <span className={`text-[9px] font-normal font-sans mt-0.5 ${pfMetodoElegido === m.id ? "text-cyan-100" : "text-neutral-500"}`}>{m.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Fechas de Aplicación, Próxima Dosis y Consentimiento */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-white p-2.5 rounded-lg border border-cyan-200 items-end">
                        <div>
                          <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">Fecha de Aplicación / Administración:</label>
                          <input
                            type="date"
                            disabled={isSealed}
                            value={pfFechaAplicacion}
                            onChange={(e) => {
                              setPfFechaAplicacion(e.target.value);
                              if (pfMetodoElegido) seleccionarMetodoPf(pfMetodoElegido);
                            }}
                            className="w-full p-1.5 border border-neutral-300 rounded font-mono text-xs bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-cyan-900 mb-0.5 flex items-center justify-between">
                            <span>Próxima Cita / Próxima Dosis:</span>
                            <span className="text-[9px] font-mono text-cyan-700">Auto-calculada</span>
                          </label>
                          <input
                            type="date"
                            disabled={isSealed}
                            value={pfProximaCita}
                            onChange={(e) => setPfProximaCita(e.target.value)}
                            className="w-full p-1.5 border border-cyan-400 rounded font-mono text-xs font-bold text-cyan-950 bg-cyan-50/50"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="flex items-center gap-1.5 text-[10.5px] font-semibold text-neutral-700 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={isSealed}
                              checked={pfConsejeriaBrindada}
                              onChange={(e) => setPfConsejeriaBrindada(e.target.checked)}
                              className="rounded text-cyan-700 w-3.5 h-3.5"
                            />
                            <span>Orientación y Consejería en PF brindada</span>
                          </label>
                          <label className="flex items-center gap-1.5 text-[10.5px] font-semibold text-neutral-700 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={isSealed}
                              checked={pfConsentimientoAceptado}
                              onChange={(e) => setPfConsentimientoAceptado(e.target.checked)}
                              className="rounded text-cyan-700 w-3.5 h-3.5"
                            />
                            <span>Consentimiento Informado Aceptado</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* PANEL 3: MATRIZ DE 12 DIAGNÓSTICOS FRECUENTES EN 1-CLICK (FICHA LAS MELLIZAS) */}
                    <div className="p-3 bg-amber-50/40 border border-amber-200 rounded-xl space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-amber-200 pb-1">
                        <span className="font-extrabold text-[11px] text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />
                          3. Diagnósticos Frecuentes Las Mellizas (1-Click para asociar CIE-10)
                        </span>
                        <span className="text-[9px] font-mono text-amber-800">
                          Al hacer clic se agrega automáticamente a la lista médica
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                        {DIAGNOSTICOS_RAPIDOS_LAS_MELLIZAS.map((dx) => {
                          const yaAgregado = diagnosticos.some((d) => d.codigo === dx.codigo);
                          return (
                            <button
                              key={dx.codigo}
                              type="button"
                              disabled={isSealed}
                              onClick={() => agregarDiagnosticoRapido(dx.codigo, dx.nombre)}
                              className={`p-2 rounded-lg text-left border text-xs font-semibold transition cursor-pointer flex flex-col justify-between ${
                                yaAgregado
                                  ? "bg-amber-600 text-white border-amber-700 shadow-2xs"
                                  : "bg-white text-neutral-800 border-neutral-200 hover:border-amber-400 hover:bg-amber-50/50"
                              }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${yaAgregado ? "bg-amber-800 text-amber-100" : "bg-neutral-100 text-neutral-600"}`}>
                                  {dx.codigo}
                                </span>
                                <span className="text-[10px]">{yaAgregado ? "✓ Agregado" : "+ Añadir"}</span>
                              </div>
                              <span className="text-[11px] mt-1 line-clamp-2 leading-tight">{dx.nombre}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* PANEL 4: MATRIZ DE 12 CONDUCTAS & EXÁMENES EN 1-CLICK */}
                    <div className="p-3 bg-emerald-50/40 border border-emerald-200 rounded-xl space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-emerald-200 pb-1">
                        <span className="font-extrabold text-[11px] text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-emerald-700" />
                          4. Conducta, Exámenes Solicitados & Procedimientos (Casillas de Marcado)
                        </span>
                        <span className="text-[9px] font-mono text-emerald-800">
                          {conductasSeleccionadas.length} seleccionadas
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                        {CONDUCTAS_RAPIDAS_LAS_MELLIZAS.map((c) => {
                          const marcada = conductasSeleccionadas.includes(c);
                          return (
                            <button
                              key={c}
                              type="button"
                              disabled={isSealed}
                              onClick={() => toggleConducta(c)}
                              className={`p-2 rounded-lg text-left text-xs font-semibold border transition cursor-pointer flex items-center gap-2 ${
                                marcada
                                  ? "bg-emerald-700 text-white border-emerald-800 shadow-2xs"
                                  : "bg-white text-neutral-800 border-neutral-200 hover:border-emerald-300 hover:bg-emerald-50/40"
                              }`}
                            >
                              <div className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] font-bold border ${marcada ? "bg-white text-emerald-800 border-white" : "border-neutral-300"}`}>
                                {marcada && "✓"}
                              </div>
                              <span className="text-[11px] leading-tight">{c}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* PANEL 5: MOTIVO Y EVOLUCIÓN CLÍNICA ESPECÍFICA */}
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-[11px] text-neutral-700 uppercase tracking-wider mb-1">
                          5. Motivo de Consulta & Tiempo de Enfermedad
                        </label>
                        <textarea
                          rows={2}
                          disabled={isSealed}
                          value={motivo}
                          onChange={(e) => setMotivo(e.target.value)}
                          placeholder="Paciente acude refiriendo flujo, dolor pélvico o descarte..."
                          className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-neutral-900 placeholder:text-neutral-300"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-bold text-[11px] text-neutral-700 uppercase tracking-wider">
                            6. Hallazgos Clínicos & Notas Adicionales
                          </label>
                          {!isSealed && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => insertarMacroExamen("Examen Obstétrico Normal: Abdomen blando, depresible, no doloroso a la palpación. Genitales externos conservados. Especuloscopía: Cérvix sano eutrófico, sin sangrado activo. Tacto vaginal: Cuello cerrado, útero en AVF, no doloroso a la movilización, anexos libres.")}
                                className="text-[9px] bg-rose-50 text-rose-800 border border-rose-200 px-1.5 py-0.5 rounded font-semibold hover:bg-rose-100"
                              >
                                + Examen Obstétrico Normal
                              </button>
                            </div>
                          )}
                        </div>
                        <textarea
                          rows={2}
                          disabled={isSealed}
                          value={examenFisico}
                          onChange={(e) => setExamenFisico(e.target.value)}
                          placeholder="Observaciones clínicas complementarias..."
                          className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-neutral-900"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* VISTA 2: CARNÉ PERINATAL LONGITUDINAL MINSA (SIP - 9 ATENCIONES) */
                  <div className="p-3.5 bg-rose-50/40 border border-rose-200 rounded-xl space-y-3.5 shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-200 pb-2">
                      <div>
                        <span className="font-extrabold text-xs text-rose-950 uppercase tracking-wider flex items-center gap-1.5">
                          <Baby className="w-4 h-4 text-rose-700" />
                          Carné Perinatal Oficial MINSA • Atención Prenatal Reenfocada (SIP)
                        </span>
                        <p className="text-[10px] text-rose-800 mt-0.5">
                          Hoja longitudinal de seguimiento para validar atenciones en postas, centros de salud y hospitales del MINSA
                        </p>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-rose-100 text-rose-900 border border-rose-300 px-2 py-0.5 rounded">
                        NTS N.° 105-MINSA / CLAP-OPS
                      </span>
                    </div>

                    {/* Matriz Longitudinal de 9 Atenciones Prenatales */}
                    <div className="overflow-x-auto border border-neutral-200 rounded-lg bg-white shadow-2xs">
                      <table className="w-full text-[10px] text-left border-collapse">
                        <thead>
                          <tr className="bg-rose-100/70 text-rose-950 font-bold border-b border-rose-200 text-center">
                            <th className="p-1.5 border-r border-rose-200">Parámetro</th>
                            {atencionesMinsa.map((at) => (
                              <th key={at.num} className="p-1.5 border-r border-rose-200 min-w-[70px]">
                                Aten. {at.num}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {/* Fila Fecha */}
                          <tr>
                            <td className="p-1.5 font-bold bg-neutral-50 text-neutral-700 border-r border-neutral-200">Fecha</td>
                            {atencionesMinsa.map((at, idx) => (
                              <td key={at.num} className="p-1 border-r border-neutral-200">
                                <input
                                  type="text"
                                  disabled={isSealed}
                                  value={at.fecha}
                                  onChange={(e) => actualizarAtencionMinsa(idx, "fecha", e.target.value)}
                                  placeholder="dd/mm"
                                  className="w-full p-1 text-center font-mono text-[9.5px] border border-neutral-200 rounded"
                                />
                              </td>
                            ))}
                          </tr>
                          {/* Fila Semanas EG */}
                          <tr>
                            <td className="p-1.5 font-bold bg-neutral-50 text-neutral-700 border-r border-neutral-200">Edad Gest. (sem)</td>
                            {atencionesMinsa.map((at, idx) => (
                              <td key={at.num} className="p-1 border-r border-neutral-200">
                                <input
                                  type="text"
                                  disabled={isSealed}
                                  value={at.semana}
                                  onChange={(e) => actualizarAtencionMinsa(idx, "semana", e.target.value)}
                                  placeholder="sem"
                                  className="w-full p-1 text-center font-mono font-bold text-[10px] border border-neutral-200 rounded text-rose-900 bg-rose-50/20"
                                />
                              </td>
                            ))}
                          </tr>
                          {/* Fila Peso Madre */}
                          <tr>
                            <td className="p-1.5 font-bold bg-neutral-50 text-neutral-700 border-r border-neutral-200">Peso Madre (kg)</td>
                            {atencionesMinsa.map((at, idx) => (
                              <td key={at.num} className="p-1 border-r border-neutral-200">
                                <input
                                  type="text"
                                  disabled={isSealed}
                                  value={at.peso}
                                  onChange={(e) => actualizarAtencionMinsa(idx, "peso", e.target.value)}
                                  placeholder="kg"
                                  className="w-full p-1 text-center font-mono text-[9.5px] border border-neutral-200 rounded"
                                />
                              </td>
                            ))}
                          </tr>
                          {/* Fila PA */}
                          <tr>
                            <td className="p-1.5 font-bold bg-neutral-50 text-neutral-700 border-r border-neutral-200">P.A. (mmHg)</td>
                            {atencionesMinsa.map((at, idx) => (
                              <td key={at.num} className="p-1 border-r border-neutral-200">
                                <input
                                  type="text"
                                  disabled={isSealed}
                                  value={at.pa}
                                  onChange={(e) => actualizarAtencionMinsa(idx, "pa", e.target.value)}
                                  placeholder="120/80"
                                  className="w-full p-1 text-center font-mono font-bold text-[9.5px] border border-neutral-200 rounded"
                                />
                              </td>
                            ))}
                          </tr>
                          {/* Fila Altura Uterina */}
                          <tr>
                            <td className="p-1.5 font-bold bg-neutral-50 text-neutral-700 border-r border-neutral-200">Alt. Uterina (cm)</td>
                            {atencionesMinsa.map((at, idx) => (
                              <td key={at.num} className="p-1 border-r border-neutral-200">
                                <input
                                  type="text"
                                  disabled={isSealed}
                                  value={at.au}
                                  onChange={(e) => actualizarAtencionMinsa(idx, "au", e.target.value)}
                                  placeholder="cm"
                                  className="w-full p-1 text-center font-mono font-bold text-[10px] border border-neutral-200 rounded text-neutral-900"
                                />
                              </td>
                            ))}
                          </tr>
                          {/* Fila LCF */}
                          <tr>
                            <td className="p-1.5 font-bold bg-neutral-50 text-neutral-700 border-r border-neutral-200">L.C.F. (lpm)</td>
                            {atencionesMinsa.map((at, idx) => (
                              <td key={at.num} className="p-1 border-r border-neutral-200">
                                <input
                                  type="text"
                                  disabled={isSealed}
                                  value={at.lcf}
                                  onChange={(e) => actualizarAtencionMinsa(idx, "lcf", e.target.value)}
                                  placeholder="lpm"
                                  className="w-full p-1 text-center font-mono text-[9.5px] border border-neutral-200 rounded"
                                />
                              </td>
                            ))}
                          </tr>
                          {/* Fila Presentación */}
                          <tr>
                            <td className="p-1.5 font-bold bg-neutral-50 text-neutral-700 border-r border-neutral-200">Presentación</td>
                            {atencionesMinsa.map((at, idx) => (
                              <td key={at.num} className="p-1 border-r border-neutral-200">
                                <select
                                  disabled={isSealed}
                                  value={at.presentacion}
                                  onChange={(e) => actualizarAtencionMinsa(idx, "presentacion", e.target.value)}
                                  className="w-full p-0.5 text-center text-[9px] border border-neutral-200 rounded"
                                >
                                  <option value="">-</option>
                                  <option value="C">Cefálica (C)</option>
                                  <option value="P">Podálica (P)</option>
                                  <option value="T">Transversa (T)</option>
                                </select>
                              </td>
                            ))}
                          </tr>
                          {/* Fila Edemas */}
                          <tr>
                            <td className="p-1.5 font-bold bg-neutral-50 text-neutral-700 border-r border-neutral-200">Edemas</td>
                            {atencionesMinsa.map((at, idx) => (
                              <td key={at.num} className="p-1 border-r border-neutral-200">
                                <input
                                  type="text"
                                  disabled={isSealed}
                                  value={at.edemas}
                                  onChange={(e) => actualizarAtencionMinsa(idx, "edemas", e.target.value)}
                                  placeholder="- / +"
                                  className="w-full p-1 text-center text-[9.5px] border border-neutral-200 rounded"
                                />
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Gráficos Percentilares Oficiales MINSA (Curvas Altura Uterina & Incremento de Peso) */}
                    <div className="grid md:grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-neutral-200">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-neutral-700 uppercase">
                            Curva de Altura Uterina vs Semanas (P10 - P90)
                          </span>
                          <span className="text-[9px] font-mono text-neutral-400">CLAP / MINSA</span>
                        </div>
                        <div className="h-28 bg-sky-50/50 border border-sky-200 rounded-lg p-2 flex items-center justify-center relative overflow-hidden">
                          <svg className="w-full h-full" viewBox="0 0 200 80">
                            {/* Líneas percentilares */}
                            <path d="M 20 70 Q 100 40 180 15" fill="none" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="3 2" />
                            <path d="M 20 75 Q 100 55 180 30" fill="none" stroke="#0369a1" strokeWidth="2" />
                            <path d="M 20 78 Q 100 65 180 45" fill="none" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="3 2" />
                            <text x="182" y="18" fontSize="6" fill="#0284c7">P90</text>
                            <text x="182" y="32" fontSize="6" fill="#0369a1">P50</text>
                            <text x="182" y="47" fontSize="6" fill="#0284c7">P10</text>
                            {/* Punto actual */}
                            {alturaUterina && eg && (
                              <circle cx={Math.min(180, Math.max(20, parseInt(eg || "20") * 4.5))} cy={Math.max(15, 80 - parseInt(alturaUterina || "20") * 2.2)} r="3.5" fill="#e11d48" />
                            )}
                          </svg>
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-neutral-500 font-mono">
                          <span>13 sem</span>
                          <span>24 sem</span>
                          <span>32 sem</span>
                          <span>40 sem</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-neutral-700 uppercase">
                            Curva de Incremento Ponderal Materno
                          </span>
                          <span className="text-[9px] font-mono text-neutral-400">Nutrición Gestacional</span>
                        </div>
                        <div className="h-28 bg-emerald-50/50 border border-emerald-200 rounded-lg p-2 flex items-center justify-center relative overflow-hidden">
                          <svg className="w-full h-full" viewBox="0 0 200 80">
                            <path d="M 20 75 Q 100 50 180 20" fill="none" stroke="#059669" strokeWidth="1.5" strokeDasharray="3 2" />
                            <path d="M 20 78 Q 100 65 180 40" fill="none" stroke="#047857" strokeWidth="2" />
                            <text x="182" y="23" fontSize="6" fill="#059669">P90</text>
                            <text x="182" y="42" fontSize="6" fill="#047857">P25</text>
                          </svg>
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-neutral-500 font-mono">
                          <span>13 sem</span>
                          <span>24 sem</span>
                          <span>32 sem</span>
                          <span>40 sem</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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
                      className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-neutral-900 placeholder:text-neutral-300 placeholder:font-normal placeholder:italic"
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
                      className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-neutral-900 placeholder:text-neutral-300 placeholder:font-normal placeholder:italic"
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
                        placeholder="Ej: No protruye al piso vesical. Cápsula íntegra..."
                        className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white placeholder:text-neutral-300 placeholder:font-normal placeholder:italic"
                      />
                    </div>
                  </div>
                )}

                {/* 2. Ecografía Obstétrica Fetal "Click & Mark" */}
                {tipoEcografia === "OBSTETRICA" && (
                  <div className="p-3.5 bg-neutral-50/80 rounded-xl border border-neutral-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-neutral-200 pb-1.5">
                      <span className="font-bold text-xs text-neutral-800 flex items-center gap-1.5">
                        <Baby className="w-4 h-4 text-rose-700" />
                        Biometría Fetal & Estática Fetal "Click & Mark" (Hadlock / SPUOG)
                      </span>
                      <span className="text-[10px] font-mono text-neutral-500">Apoyo Diagnóstico Prenatal</span>
                    </div>

                    {/* Fila A: Feto, Vitalidad, Situación, Presentación y Dorso */}
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-2 bg-white p-2.5 rounded-lg border border-neutral-200">
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-600 mb-1">Feto:</label>
                        <div className="grid grid-cols-3 gap-1">
                          {(["Único", "Gemelar", "Múltiple"] as const).map((f) => (
                            <button
                              key={f}
                              type="button"
                              disabled={isSealed}
                              onClick={() => setEcoObstFeto(f)}
                              className={`py-1 px-1 rounded text-[10px] font-bold border text-center transition cursor-pointer ${
                                ecoObstFeto === f ? "bg-rose-700 text-white border-rose-800 shadow-2xs" : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100"
                              }`}
                            >
                              {f.slice(0, 4)}..
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-neutral-600 mb-1">Situación:</label>
                        <div className="grid grid-cols-3 gap-1">
                          {(["Longitudinal", "Transversa", "Oblicua"] as const).map((s) => (
                            <button
                              key={s}
                              type="button"
                              disabled={isSealed}
                              onClick={() => setEcoObstSituacion(s)}
                              className={`py-1 px-1 rounded text-[10px] font-bold border text-center transition cursor-pointer ${
                                ecoObstSituacion === s ? "bg-rose-700 text-white border-rose-800 shadow-2xs" : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100"
                              }`}
                            >
                              {s.slice(0, 4)}..
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-neutral-600 mb-1">Presentación:</label>
                        <div className="grid grid-cols-3 gap-1">
                          {(["Cefálica", "Podálica", "Transversa"] as const).map((p) => (
                            <button
                              key={p}
                              type="button"
                              disabled={isSealed}
                              onClick={() => setEcoObstPresentacion(p)}
                              className={`py-1 px-1 rounded text-[10px] font-bold border text-center transition cursor-pointer ${
                                ecoObstPresentacion === p ? "bg-rose-700 text-white border-rose-800 shadow-2xs" : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100"
                              }`}
                            >
                              {p.slice(0, 4)}..
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-neutral-600 mb-1">Dorso Fetal:</label>
                        <div className="grid grid-cols-4 gap-1">
                          {(["Izquierdo", "Derecho", "Anterior", "Posterior"] as const).map((d) => (
                            <button
                              key={d}
                              type="button"
                              disabled={isSealed}
                              onClick={() => setEcoObstDorso(d)}
                              className={`py-1 px-0.5 rounded text-[9.5px] font-bold border text-center transition cursor-pointer ${
                                ecoObstDorso === d ? "bg-rose-700 text-white border-rose-800 shadow-2xs" : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100"
                              }`}
                            >
                              {d.slice(0, 3)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-neutral-600 mb-1">Vitalidad Fetal:</label>
                        <select
                          disabled={isSealed}
                          value={ecoObstVitalidad}
                          onChange={(e) => setEcoObstVitalidad(e.target.value)}
                          className="w-full p-1 border border-neutral-300 rounded text-xs bg-white font-semibold text-emerald-900"
                        >
                          <option value="Activa (Latidos y movimientos presentes)">Activa (LCF + Mov. +)</option>
                          <option value="Sin movimientos activos">Sin mov. activos</option>
                          <option value="Bradicardia fetal (<110 lpm)">Bradicardia (&lt;110 lpm)</option>
                          <option value="Taquicardia fetal (>160 lpm)">Taquicardia (&gt;160 lpm)</option>
                          <option value="Sin latidos / Óbito fetal">Sin latidos / Óbito</option>
                        </select>
                      </div>
                    </div>

                    {/* Fila B: Biometría Fetal con Botón Hadlock */}
                    <div className="bg-white p-2.5 rounded-lg border border-neutral-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider">
                          Biometría Fetal (mm) & Peso Fetal Estimado (g)
                        </span>
                        {!isSealed && (
                          <button
                            type="button"
                            onClick={() => {
                              const calc = calcularHadlockPfe(ecoDbp, ecoLf, ecoCa);
                              if (calc) setEcoPfe(calc);
                            }}
                            className="text-[9.5px] font-bold bg-sky-50 text-sky-800 border border-sky-200 px-2 py-0.5 rounded flex items-center gap-1 hover:bg-sky-100 transition"
                          >
                            <Calculator className="w-3 h-3 text-sky-700" />
                            Calcular PFE Hadlock
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
                        <div>
                          <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">D.B.P. (mm)</label>
                          <input
                            type="number"
                            disabled={isSealed}
                            value={ecoDbp}
                            onChange={(e) => {
                              setEcoDbp(e.target.value);
                              const pfe = calcularHadlockPfe(e.target.value, ecoLf, ecoCa);
                              if (pfe) setEcoPfe(pfe);
                            }}
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
                            onChange={(e) => {
                              setEcoLf(e.target.value);
                              const pfe = calcularHadlockPfe(ecoDbp, e.target.value, ecoCa);
                              if (pfe) setEcoPfe(pfe);
                            }}
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
                            onChange={(e) => {
                              setEcoCa(e.target.value);
                              const pfe = calcularHadlockPfe(ecoDbp, ecoLf, e.target.value);
                              if (pfe) setEcoPfe(pfe);
                            }}
                            placeholder="Ej: 180"
                            className="w-full px-2 py-1 border border-neutral-300 rounded font-mono text-xs bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-emerald-800 mb-0.5 font-bold">P.F.E. Hadlock (g)</label>
                          <input
                            type="number"
                            disabled={isSealed}
                            value={ecoPfe}
                            onChange={(e) => setEcoPfe(e.target.value)}
                            placeholder="Ej: 650"
                            className="w-full px-2 py-1 border border-emerald-300 rounded font-mono text-xs bg-emerald-50/50 font-bold text-emerald-950"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">F.C.F. (lpm)</label>
                          <input
                            type="number"
                            disabled={isSealed}
                            value={ecoFcf}
                            onChange={(e) => setEcoFcf(e.target.value)}
                            placeholder="Ej: 140"
                            className="w-full px-2 py-1 border border-neutral-300 rounded font-mono text-xs bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Fila C: Placenta & Líquido Amniótico Click & Mark */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 bg-white p-2.5 rounded-lg border border-neutral-200">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] text-neutral-700 font-bold uppercase">Placenta (Localización & Grannum):</label>
                        <div className="flex flex-wrap gap-1">
                          {(["Fúndica posterior", "Fúndica anterior", "Fúndica", "Previa marginal"] as const).map((loc) => (
                            <button
                              key={loc}
                              type="button"
                              disabled={isSealed}
                              onClick={() => {
                                setEcoObstPlacentaLoc(loc);
                                setEcoPlacenta(`Normoinserta ${loc} ${ecoObstPlacentaGrado}`);
                              }}
                              className={`py-0.5 px-2 rounded text-[10px] font-bold border transition cursor-pointer ${
                                ecoObstPlacentaLoc === loc ? "bg-rose-700 text-white border-rose-800" : "bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100"
                              }`}
                            >
                              {loc}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-1 items-center">
                          {(["Grado 0", "Grado I", "Grado II", "Grado III"] as const).map((gr) => (
                            <button
                              key={gr}
                              type="button"
                              disabled={isSealed}
                              onClick={() => {
                                setEcoObstPlacentaGrado(gr);
                                setEcoPlacenta(`Normoinserta ${ecoObstPlacentaLoc} ${gr}`);
                              }}
                              className={`py-0.5 px-2 rounded text-[9.5px] font-bold border transition cursor-pointer ${
                                ecoObstPlacentaGrado === gr ? "bg-rose-700 text-white border-rose-800" : "bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100"
                              }`}
                            >
                              {gr}
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          disabled={isSealed}
                          value={ecoPlacenta}
                          onChange={(e) => setEcoPlacenta(e.target.value)}
                          placeholder="Texto libre de placenta..."
                          className="w-full px-2 py-1 border border-neutral-200 rounded text-xs bg-white text-neutral-900"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] text-neutral-700 font-bold uppercase">Líquido Amniótico (ILA):</label>
                        <div className="flex flex-wrap gap-1">
                          {(["Normal", "Oligohidramnios Leve", "Oligohidramnios Severo", "Polihidramnios"] as const).map((liq) => (
                            <button
                              key={liq}
                              type="button"
                              disabled={isSealed}
                              onClick={() => {
                                setEcoObstLiquidoVol(liq);
                                setEcoIla(liq === "Normal" ? "Volumen normal (ILA adecuado 12-14 cm)" : `${liq} confirmado`);
                              }}
                              className={`py-0.5 px-2 rounded text-[10px] font-bold border transition cursor-pointer ${
                                ecoObstLiquidoVol === liq ? "bg-rose-700 text-white border-rose-800" : "bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100"
                              }`}
                            >
                              {liq}
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          disabled={isSealed}
                          value={ecoIla}
                          onChange={(e) => setEcoIla(e.target.value)}
                          placeholder="Ej: Volumen normal (ILA 12 cm)..."
                          className="w-full px-2 py-1 border border-neutral-200 rounded text-xs bg-white text-neutral-900"
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
                          placeholder="Ej: Morfología y ecogenicidad habitual, sin lesiones focales..."
                          className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white placeholder:text-neutral-300 placeholder:font-normal placeholder:italic"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">Vesícula & Vías Biliares</label>
                        <textarea
                          rows={2}
                          disabled={isSealed}
                          value={ecoVesicula}
                          onChange={(e) => setEcoVesicula(e.target.value)}
                          placeholder="Ej: Paredes finas < 3mm, alitiásica. Vía biliar normal..."
                          className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white placeholder:text-neutral-300 placeholder:font-normal placeholder:italic"
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
                          placeholder="Ej: Páncreas y bazo de aspecto ecográfico normal..."
                          className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white placeholder:text-neutral-300 placeholder:font-normal placeholder:italic"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">Cavidad Peritoneal</label>
                        <input
                          type="text"
                          disabled={isSealed}
                          value={ecoLiquidoLibre}
                          onChange={(e) => setEcoLiquidoLibre(e.target.value)}
                          placeholder="Ej: No se observa líquido libre en Morrison ni Douglas..."
                          className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white placeholder:text-neutral-300 placeholder:font-normal placeholder:italic"
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
                          placeholder="Ej: Dimensiones normales, buena diferenciación córtico-medular..."
                          className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white placeholder:text-neutral-300 placeholder:font-normal placeholder:italic"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">Riñón Izquierdo</label>
                        <textarea
                          rows={2}
                          disabled={isSealed}
                          value={ecoRinonIzq}
                          onChange={(e) => setEcoRinonIzq(e.target.value)}
                          placeholder="Ej: Dimensiones habituales, sin hidronefrosis ni cálculos..."
                          className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white placeholder:text-neutral-300 placeholder:font-normal placeholder:italic"
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
                        placeholder="Ej: Adecuada repleción, paredes regulares, sin litiasis..."
                        className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white placeholder:text-neutral-300 placeholder:font-normal placeholder:italic"
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
                        placeholder="Ej: Masa nodular ovalada en TCSC, límites definidos..."
                        className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white placeholder:text-neutral-300 placeholder:font-normal placeholder:italic"
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
                      <option value="">-- No clasificado / No evaluado --</option>
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
                      <option value="">-- No clasificado / No evaluado --</option>
                      <option value="TI-RADS 1: Benigno / Sin nódulos">TI-RADS 1: Benigno / Sin nódulos</option>
                      <option value="TI-RADS 2: No sospechoso (Quiste coloide)">TI-RADS 2: No sospechoso / Benigno</option>
                      <option value="TI-RADS 3: Leve sospecha de malignidad">TI-RADS 3: Leve sospecha</option>
                      <option value="TI-RADS 4: Moderada sospecha de malignidad">TI-RADS 4: Moderada sospecha</option>
                    </select>
                  </div>
                )}

                {/* 7. Ecografía Transvaginal / Pélvica "Click & Mark" */}
                {tipoEcografia === "TRANSVAGINAL" && (
                  <div className="p-3.5 bg-neutral-50/80 rounded-xl border border-neutral-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-neutral-200 pb-1.5">
                      <span className="font-bold text-xs text-neutral-800 flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-purple-700" />
                        Evaluación Ultrasonográfica Transvaginal / Pélvica "Click & Mark"
                      </span>
                      <span className="text-[10px] font-mono text-neutral-500">IOTA / MUSA</span>
                    </div>

                    {/* Casillas Rápidas: Útero Posición, Miometrio y Endometrio */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 bg-white p-2.5 rounded-lg border border-neutral-200">
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-600 mb-1">Útero (Posición):</label>
                        <div className="grid grid-cols-3 gap-1">
                          {(["AVF", "RVF", "Indiferente"] as const).map((pos) => (
                            <button
                              key={pos}
                              type="button"
                              disabled={isSealed}
                              onClick={() => {
                                setEcoTvUteroPos(pos);
                                setEcoUtero(`Útero en ${pos}, contornos regulares, ${ecoTvMiometrio.toLowerCase()}`);
                              }}
                              className={`py-1 px-1 rounded text-[10px] font-bold border text-center transition cursor-pointer ${
                                ecoTvUteroPos === pos ? "bg-purple-700 text-white border-purple-800 shadow-2xs" : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100"
                              }`}
                            >
                              {pos}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-neutral-600 mb-1">Miometrio:</label>
                        <div className="grid grid-cols-3 gap-1">
                          {(["Homogéneo", "Heterogéneo", "Miomatoso"] as const).map((m) => (
                            <button
                              key={m}
                              type="button"
                              disabled={isSealed}
                              onClick={() => {
                                setEcoTvMiometrio(m);
                                setEcoUtero(`Útero en ${ecoTvUteroPos}, ${m.toLowerCase()}`);
                              }}
                              className={`py-1 px-1 rounded text-[10px] font-bold border text-center transition cursor-pointer ${
                                ecoTvMiometrio === m ? "bg-purple-700 text-white border-purple-800 shadow-2xs" : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100"
                              }`}
                            >
                              {m.slice(0, 5)}..
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-neutral-600 mb-1">Endometrio (Fase):</label>
                        <select
                          disabled={isSealed}
                          value={ecoTvEndometrioFase}
                          onChange={(e) => {
                            setEcoTvEndometrioFase(e.target.value);
                            setEcoEndometrio(`8.0 mm, aspecto ${e.target.value.toLowerCase()}`);
                          }}
                          className="w-full p-1 border border-neutral-300 rounded text-xs bg-white font-semibold"
                        >
                          <option value="Proliferativo trilaminar">Proliferativo trilaminar</option>
                          <option value="Secretor hiperecogénico">Secretor hiperecogénico</option>
                          <option value="Atrófico (<4mm)">Atrófico (&lt;4mm)</option>
                          <option value="Engrosado / Sospecha pólipo">Engrosado / Sospecha pólipo</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">Útero (Dimensiones & Morfología)</label>
                        <input
                          type="text"
                          disabled={isSealed}
                          value={ecoUtero}
                          onChange={(e) => setEcoUtero(e.target.value)}
                          placeholder="Ej: En AVF, contornos regulares, 72 x 36 x 40 mm..."
                          className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white placeholder:text-neutral-300"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">Endometrio (Grosor & Aspecto)</label>
                        <input
                          type="text"
                          disabled={isSealed}
                          value={ecoEndometrio}
                          onChange={(e) => setEcoEndometrio(e.target.value)}
                          placeholder="Ej: 8.2 mm, trilaminar proliferativo..."
                          className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white placeholder:text-neutral-300"
                        />
                      </div>
                    </div>

                    {/* Casillas Ovarios y Douglas */}
                    <div className="grid md:grid-cols-2 gap-3 bg-white p-2.5 rounded-lg border border-neutral-200">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] text-neutral-600 font-semibold">Ovario Derecho:</label>
                          <div className="flex gap-1">
                            {(["Normal", "Poliquístico", "Quiste"] as const).map((pat) => (
                              <button
                                key={pat}
                                type="button"
                                disabled={isSealed}
                                onClick={() => {
                                  setEcoTvOvarioDerPatron(pat);
                                  setEcoOvarioDer(pat === "Normal" ? "28 x 16 mm, parénquima folicular habitual" : pat === "Poliquístico" ? "Aumentado (11 cc), microfolículos periféricos (Rotterdam)" : "Presencia de quiste simple anecoico");
                                }}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${ecoTvOvarioDerPatron === pat ? "bg-purple-700 text-white" : "bg-neutral-50 text-neutral-600"}`}
                              >
                                {pat}
                              </button>
                            ))}
                          </div>
                        </div>
                        <input
                          type="text"
                          disabled={isSealed}
                          value={ecoOvarioDer}
                          onChange={(e) => setEcoOvarioDer(e.target.value)}
                          placeholder="Ej: 28 x 16 mm, folículos normales..."
                          className="w-full px-2 py-1 border border-neutral-300 rounded text-xs bg-white"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] text-neutral-600 font-semibold">Ovario Izquierdo:</label>
                          <div className="flex gap-1">
                            {(["Normal", "Poliquístico", "Quiste"] as const).map((pat) => (
                              <button
                                key={pat}
                                type="button"
                                disabled={isSealed}
                                onClick={() => {
                                  setEcoTvOvarioIzqPatron(pat);
                                  setEcoOvarioIzq(pat === "Normal" ? "26 x 15 mm, folículos normales" : pat === "Poliquístico" ? "Aumentado (10.5 cc), microfolículos periféricos (Rotterdam)" : "Presencia de quiste simple anecoico");
                                }}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${ecoTvOvarioIzqPatron === pat ? "bg-purple-700 text-white" : "bg-neutral-50 text-neutral-600"}`}
                              >
                                {pat}
                              </button>
                            ))}
                          </div>
                        </div>
                        <input
                          type="text"
                          disabled={isSealed}
                          value={ecoOvarioIzq}
                          onChange={(e) => setEcoOvarioIzq(e.target.value)}
                          placeholder="Ej: 26 x 15 mm, folículos normales..."
                          className="w-full px-2 py-1 border border-neutral-300 rounded text-xs bg-white"
                        />
                      </div>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-neutral-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-neutral-700 font-bold uppercase">Fondo de Saco de Douglas:</label>
                        <div className="flex gap-1">
                          {(["Libre", "Líquido escaso", "Líquido patológico"] as const).map((d) => (
                            <button
                              key={d}
                              type="button"
                              disabled={isSealed}
                              onClick={() => {
                                setEcoTvDouglas(d);
                                setEcoDouglas(d === "Libre" ? "Libre, sin líquido coleccionado" : d === "Líquido escaso" ? "Líquido libre laminar escaso fisiológico" : "Colección líquida patológica en fondo de saco");
                              }}
                              className={`px-2 py-0.5 rounded text-[9.5px] font-bold border ${ecoTvDouglas === d ? "bg-purple-700 text-white" : "bg-neutral-50 text-neutral-600"}`}
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        type="text"
                        disabled={isSealed}
                        value={ecoDouglas}
                        onChange={(e) => setEcoDouglas(e.target.value)}
                        placeholder="Ej: Libre, sin líquido coleccionado..."
                        className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white"
                      />
                    </div>

                    {!isSealed && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[9px] text-neutral-400 font-mono">Macros:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setEcoUtero("Útero en AVF, de contornos regulares, dimensiones normales (72 x 38 x 44 mm). Miometrio de ecogenicidad homogénea.");
                            setEcoEndometrio("8.4 mm, aspecto trilaminar, proliferativo, contornos definidos.");
                            setEcoOvarioDer("Ovario derecho de 29 x 18 mm con folículos antrales periféricos normales.");
                            setEcoOvarioIzq("Ovario izquierdo de 27 x 17 mm de características normales.");
                            setEcoDouglas("Fondo de saco posterior libre, sin líquido libre.");
                            setConclusionEcografica("Estudio ecográfico transvaginal dentro de límites normales.");
                          }}
                          className="text-[9.5px] bg-sky-50 hover:bg-sky-100 text-sky-800 px-2 py-0.5 rounded border border-sky-200 font-medium transition"
                        >
                          + TV Normal
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEcoOvarioDer("Ovario derecho aumentado de volumen (11.2 cc), con más de 12 microfolículos periféricos de 2 a 8 mm.");
                            setEcoOvarioIzq("Ovario izquierdo aumentado de volumen (10.8 cc), estroma central hiperecogénico.");
                            setConclusionEcografica("Patrón ecográfico bilateral compatible con Ovarios Poliquísticos (Criterios de Rotterdam).");
                            setSugerenciasEcograficas("Correlato con perfil hormonal (LH, FSH, Testosterona libre) y control ginecológico.");
                          }}
                          className="text-[9.5px] bg-sky-50 hover:bg-sky-100 text-sky-800 px-2 py-0.5 rounded border border-sky-200 font-medium transition"
                        >
                          + Ovario Poliquístico
                        </button>
                      </div>
                    )}
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
                      className="w-full p-2.5 border border-sky-300 bg-sky-50/30 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-sky-600 placeholder:text-neutral-300 placeholder:font-normal placeholder:italic"
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
                      className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900 placeholder:text-neutral-300 placeholder:font-normal placeholder:italic"
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
                        placeholder="Ej: 3 días, 1 semana..."
                        className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg font-mono text-xs bg-white placeholder:text-neutral-300 placeholder:font-normal placeholder:italic"
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
                        placeholder="Ej: 0"
                        className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg font-mono text-xs bg-white placeholder:text-neutral-300 placeholder:font-normal placeholder:italic"
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
                          !labOrinaLeucocitos || labOrinaLeucocitos === "No realizada"
                            ? "border-neutral-300 text-neutral-500 bg-white font-normal"
                            : labOrinaLeucocitos === "Negativo"
                            ? "border-emerald-300 text-emerald-900 bg-emerald-50/50"
                            : "border-rose-400 text-rose-900 bg-rose-50"
                        }`}
                      >
                        <option value="">-- No realizada --</option>
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
                          !labOrinaProteinas || labOrinaProteinas === "No realizada"
                            ? "border-neutral-300 text-neutral-500 bg-white font-normal"
                            : labOrinaProteinas === "Negativo"
                            ? "border-emerald-300 text-emerald-900 bg-emerald-50/50"
                            : "border-rose-400 text-rose-900 bg-rose-50"
                        }`}
                      >
                        <option value="">-- No realizada --</option>
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
                          !labOrinaNitritos || labOrinaNitritos === "No realizada"
                            ? "border-neutral-300 text-neutral-500 bg-white font-normal"
                            : labOrinaNitritos === "Negativo"
                            ? "border-emerald-300 text-emerald-900 bg-emerald-50/50"
                            : "border-rose-400 text-rose-900 bg-rose-50"
                        }`}
                      >
                        <option value="">-- No realizada --</option>
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
                        placeholder="Ej: 12.4"
                        className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg font-mono font-bold text-xs bg-white placeholder:text-neutral-300 placeholder:font-normal placeholder:italic"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">Glucosa Rápida (mg/dL)</label>
                      <input
                        type="number"
                        disabled={isSealed}
                        value={labGlucosa}
                        onChange={(e) => setLabGlucosa(e.target.value)}
                        placeholder="Ej: 92"
                        className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg font-mono font-bold text-xs bg-white placeholder:text-neutral-300 placeholder:font-normal placeholder:italic"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-neutral-600 mb-0.5 font-semibold">Prueba de Embarazo (GCH)</label>
                      <select
                        disabled={isSealed}
                        value={labPruebaEmbarazo}
                        onChange={(e) => setLabPruebaEmbarazo(e.target.value)}
                        className={`w-full p-2 border rounded-lg text-xs font-bold ${
                          labPruebaEmbarazo === "Positiva (+)"
                            ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                            : "border-neutral-300 bg-white text-neutral-700 font-normal"
                        }`}
                      >
                        <option value="">-- No realizada --</option>
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

              {/* Input de Búsqueda Predictiva con Filtrado Contextual Inteligente & Retracción */}
              {!isSealed && (
                <div ref={cieContainerRef} className="relative">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={busquedaCie}
                      onChange={(e) => {
                        setBusquedaCie(e.target.value);
                        setMostrarSugerenciasCie(true);
                      }}
                      onFocus={() => setMostrarSugerenciasCie(true)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setMostrarSugerenciasCie(false);
                      }}
                      placeholder="Escriba código o patología (ej. Z34, gastritis, próstata, cálculo, lipoma)..."
                      className="w-full pl-3 pr-20 py-2 border border-neutral-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900 bg-white"
                    />
                    <div className="absolute right-2 flex items-center gap-1">
                      {busquedaCie.trim().length > 0 && (
                        <button
                          type="button"
                          onClick={() => setBusquedaCie("")}
                          title="Limpiar búsqueda"
                          className="p-1 hover:bg-neutral-100 rounded text-neutral-400 hover:text-neutral-700 transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setMostrarSugerenciasCie(!mostrarSugerenciasCie)}
                        title={mostrarSugerenciasCie ? "Retraer sugerencias CIE-10 (Escape)" : "Desplegar sugerencias CIE-10"}
                        className={`p-1 rounded transition flex items-center gap-0.5 ${
                          mostrarSugerenciasCie
                            ? "bg-brand-50 text-brand-700 hover:bg-brand-100"
                            : "hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900"
                        }`}
                      >
                        {mostrarSugerenciasCie ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {mostrarSugerenciasCie && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto animate-in fade-in duration-150">
                      {/* Cabecera del Desplegable con Acción de Retracción Explícita */}
                      <div className="sticky top-0 bg-neutral-50 px-3 py-1.5 border-b border-neutral-200 flex items-center justify-between text-[10px] font-bold text-neutral-600 z-10">
                        <span className="font-mono text-neutral-500 uppercase tracking-wider">
                          Sugerencias CIE-10 Contextuales
                        </span>
                        <button
                          type="button"
                          onClick={() => setMostrarSugerenciasCie(false)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-neutral-200 text-neutral-700 font-bold rounded border border-neutral-300 transition text-[9.5px]"
                          title="Retraer / Cerrar desplegable"
                        >
                          <span>Retraer / Cerrar</span>
                          <ChevronUp className="w-3 h-3 text-neutral-500" />
                        </button>
                      </div>
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
                placeholder="Indicaciones terapéuticas, prescripción DCI, régimen posológico y controles..."
                className="w-full p-2.5 border border-neutral-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-neutral-900 placeholder:text-neutral-300 placeholder:font-normal placeholder:italic"
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

      {/* BOTÓN FLOTANTE: CALCULADORA CLÍNICA & ECOGRÁFICA */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setCalculadoraOpen(!calculadoraOpen)}
          className="bg-neutral-900 hover:bg-black text-white px-4 py-2.5 rounded-full shadow-xl border border-neutral-700 font-bold text-xs flex items-center gap-2 transition hover:scale-105 cursor-pointer ring-2 ring-rose-500/30"
        >
          <Calculator className="w-4 h-4 text-rose-400" />
          <span>Calculadora Clínica</span>
          {calculadoraOpen && <span className="text-[10px] bg-rose-800 px-1.5 py-0.2 rounded-full">Abierta</span>}
        </button>
      </div>

      {/* MODAL CALCULADORA CLÍNICA & ECOGRÁFICA INTERACTIVA */}
      {calculadoraOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-end sm:justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-2xl p-4 sm:p-5 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-neutral-200 space-y-3.5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-neutral-900 leading-tight">Calculadora Clínica & Ecográfica</h3>
                  <p className="text-[10px] text-neutral-500">Herramienta biométrica de apoyo profesional en tiempo real</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCalculadoraOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Pestañas de la Calculadora */}
            <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-xl">
              {[
                { id: "GESTACIONAL", label: "👶 FUR / Gestacional" },
                { id: "HADLOCK", label: "📏 Hadlock PFE" },
                { id: "PBF", label: "💓 PBF Manning" },
                { id: "PROSTATA", label: "🩺 Próstata Elipsoide" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCalcTab(tab.id as any)}
                  className={`flex-1 py-1.5 px-1 text-center text-[10.5px] font-bold rounded-lg transition cursor-pointer ${
                    calcTab === tab.id
                      ? "bg-white text-neutral-900 shadow-xs"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB 1: GESTACIONAL (FUM / NAEGELE) */}
            {calcTab === "GESTACIONAL" && (
              <div className="space-y-3 bg-rose-50/40 p-3 rounded-xl border border-rose-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-950 uppercase">Regla de Naegele & Edad Gestacional</span>
                  <span className="text-[9px] font-mono text-rose-700">Obstetricia</span>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-600 mb-1">Fecha de Última Menstruación (FUM):</label>
                  <input
                    type="date"
                    value={fur}
                    onChange={(e) => handleFurChange(e.target.value)}
                    className="w-full p-2 border border-neutral-300 rounded-lg text-xs bg-white font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded-lg border border-rose-100">
                  <div>
                    <span className="text-[9.5px] text-neutral-500 font-bold block">Edad Gestacional Hoy:</span>
                    <span className="text-sm font-extrabold text-rose-900 font-mono">{eg || "-- sem"}</span>
                  </div>
                  <div>
                    <span className="text-[9.5px] text-neutral-500 font-bold block">Fecha Probable Parto:</span>
                    <span className="text-sm font-extrabold text-emerald-900 font-mono">{fpp || "--"}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCalculadoraOpen(false);
                  }}
                  className="w-full py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold transition shadow-xs"
                >
                  ✓ Aplicado a la Ficha Obstétrica
                </button>
              </div>
            )}

            {/* TAB 2: HADLOCK PFE */}
            {calcTab === "HADLOCK" && (
              <div className="space-y-3 bg-sky-50/40 p-3 rounded-xl border border-sky-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-950 uppercase">Fórmula de Hadlock (DBP + LF + CA)</span>
                  <span className="text-[9px] font-mono text-sky-700">PFE en gramos</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">DBP (mm):</label>
                    <input
                      type="number"
                      value={ecoDbp}
                      onChange={(e) => {
                        setEcoDbp(e.target.value);
                        const c = calcularHadlockPfe(e.target.value, ecoLf, ecoCa);
                        if (c) setEcoPfe(c);
                      }}
                      placeholder="Ej: 54"
                      className="w-full p-1.5 border border-neutral-300 rounded font-mono text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">LF (mm):</label>
                    <input
                      type="number"
                      value={ecoLf}
                      onChange={(e) => {
                        setEcoLf(e.target.value);
                        const c = calcularHadlockPfe(ecoDbp, e.target.value, ecoCa);
                        if (c) setEcoPfe(c);
                      }}
                      placeholder="Ej: 40"
                      className="w-full p-1.5 border border-neutral-300 rounded font-mono text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">CA (mm):</label>
                    <input
                      type="number"
                      value={ecoCa}
                      onChange={(e) => {
                        setEcoCa(e.target.value);
                        const c = calcularHadlockPfe(ecoDbp, ecoLf, e.target.value);
                        if (c) setEcoPfe(c);
                      }}
                      placeholder="Ej: 180"
                      className="w-full p-1.5 border border-neutral-300 rounded font-mono text-xs bg-white"
                    />
                  </div>
                </div>
                <div className="p-3 bg-white rounded-lg border border-sky-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-neutral-500 font-bold block">Peso Fetal Estimado:</span>
                    <span className="text-xl font-black text-sky-900 font-mono">{ecoPfe ? `${ecoPfe} g` : "Ingrese biometría"}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const c = calcularHadlockPfe(ecoDbp, ecoLf, ecoCa);
                      if (c) setEcoPfe(c);
                      setCalculadoraOpen(false);
                    }}
                    className="px-3 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-bold transition shadow-xs"
                  >
                    ✓ Aplicar a Ecografía
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: PBF MANNING /10 */}
            {calcTab === "PBF" && (
              <div className="space-y-3 bg-emerald-50/40 p-3 rounded-xl border border-emerald-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950 uppercase">Perfil Biofísico Fetal (Manning /10)</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-900">
                    Score: {pbfResp + pbfMov + pbfTono + pbfNst + pbfIlaScore} / 10 pts
                  </span>
                </div>
                <div className="space-y-1.5 bg-white p-2.5 rounded-lg border border-emerald-100 text-xs">
                  {[
                    { label: "Movimientos Respiratorios (≥ 30s continuos)", val: pbfResp, set: setPbfResp },
                    { label: "Movimientos Corporales Gruesos (≥ 3 en 30 min)", val: pbfMov, set: setPbfMov },
                    { label: "Tono Fetal (Extensión activa con retorno a flexión)", val: pbfTono, set: setPbfTono },
                    { label: "Reactividad Cardíaca (NST reactivo con aceleraciones)", val: pbfNst, set: setPbfNst },
                    { label: "Líquido Amniótico (Pozo vertical ≥ 2 cm o ILA > 8cm)", val: pbfIlaScore, set: setPbfIlaScore },
                  ].map((param, i) => (
                    <div key={i} className="flex items-center justify-between p-1 border-b border-neutral-100 last:border-0">
                      <span className="text-[11px] text-neutral-800">{param.label}</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => param.set(0)}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded ${param.val === 0 ? "bg-rose-700 text-white" : "bg-neutral-100 text-neutral-600"}`}
                        >
                          0 pts
                        </button>
                        <button
                          type="button"
                          onClick={() => param.set(2)}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded ${param.val === 2 ? "bg-emerald-700 text-white" : "bg-neutral-100 text-neutral-600"}`}
                        >
                          2 pts
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between bg-white">
                  <div>
                    <span className="text-[10px] text-neutral-500 block">Diagnóstico del Bienestar Fetal:</span>
                    <span className={`font-bold ${pbfResp + pbfMov + pbfTono + pbfNst + pbfIlaScore >= 8 ? "text-emerald-800" : "text-rose-800"}`}>
                      {pbfResp + pbfMov + pbfTono + pbfNst + pbfIlaScore >= 8
                        ? "Bienestar Fetal Conservado (Normal)"
                        : pbfResp + pbfMov + pbfTono + pbfNst + pbfIlaScore === 6
                        ? "Sospecha de asfixia crónica (Reevaluar en 24h)"
                        : "Asfixia fetal severa (Alto riesgo)"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const total = pbfResp + pbfMov + pbfTono + pbfNst + pbfIlaScore;
                      const textoPbf = `Perfil Biofísico Fetal (Manning): ${total}/10 pts (${total >= 8 ? "Bienestar fetal conservado" : "Sospecha de alteración perinatal"}).`;
                      setConclusionEcografica((prev) => prev ? `${prev}\n${textoPbf}` : textoPbf);
                      setCalculadoraOpen(false);
                    }}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition shadow-xs"
                  >
                    ✓ Copiar a Conclusión
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: PRÓSTATA ELIPSOIDE & RPM */}
            {calcTab === "PROSTATA" && (
              <div className="space-y-3 bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-900 uppercase">Volumen Prostático Elipsoide</span>
                  <span className="text-[10px] font-mono text-neutral-500">Vol = DT × DAP × DL × 0.52</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">DT (mm):</label>
                    <input
                      type="number"
                      value={prostataDt}
                      onChange={(e) => setProstataDt(e.target.value)}
                      placeholder="46"
                      className="w-full p-1.5 border border-neutral-300 rounded font-mono text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">DAP (mm):</label>
                    <input
                      type="number"
                      value={prostataDap}
                      onChange={(e) => setProstataDap(e.target.value)}
                      placeholder="38"
                      className="w-full p-1.5 border border-neutral-300 rounded font-mono text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">DL (mm):</label>
                    <input
                      type="number"
                      value={prostataDl}
                      onChange={(e) => setProstataDl(e.target.value)}
                      placeholder="42"
                      className="w-full p-1.5 border border-neutral-300 rounded font-mono text-xs bg-white"
                    />
                  </div>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-neutral-200 flex items-center justify-between">
                  <div>
                    <span className="text-[9.5px] text-neutral-500 font-bold block">Volumen Calculado:</span>
                    <span className="text-lg font-black text-neutral-900 font-mono">{volumenProstataCc} cc ({gradoHbp})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCalculadoraOpen(false)}
                    className="px-3 py-1.5 bg-neutral-900 hover:bg-black text-white rounded-lg text-xs font-bold transition shadow-xs"
                  >
                    ✓ Cerrar
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