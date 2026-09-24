"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type SubModuloSupervision =
  | "personal"
  | "inventario"
  | "costos"
  | "auditoria";

export interface ServicioTarifario {
  id: string;
  codigo: string;
  nombre: string;
  categoria: "Ecografías" | "Consultas" | "Procedimientos" | "Laboratorio" | "Packs Promocionales";
  precio_venta: number;
  costo_operativo: number;
  descripcion?: string;
  activo: boolean;
  updated_at?: string;
}

interface SupervisionContextType {
  subModuloSupervision: SubModuloSupervision;
  setSubModuloSupervision: (m: SubModuloSupervision) => void;
  conteoPersonal: number;
  setConteoPersonal: (n: number) => void;
  conteoInventario: number;
  setConteoInventario: (n: number) => void;
  stockBajoInventario: number;
  setStockBajoInventario: (n: number) => void;
  conteoServicios: number;
  setConteoServicios: (n: number) => void;
  serviciosCustom: ServicioTarifario[];
  setServiciosCustom: React.Dispatch<React.SetStateAction<ServicioTarifario[]>>;
  actualizarServicioTarifario: (serv: ServicioTarifario) => void;
  agregarServicioTarifario: (serv: Omit<ServicioTarifario, "id">) => void;
}

const SupervisionContext = createContext<SupervisionContextType | undefined>(undefined);

export const CATALOGO_SERVICIOS_BASE: Omit<ServicioTarifario, "id">[] = [
  // --- PACKS PROMOCIONALES INTEGRALES ---
  { codigo: "PCK-001", nombre: "Pack Integral: Consulta + Ecografía 5D + PAP", precio_venta: 220, costo_operativo: 80, categoria: "Packs Promocionales", descripcion: "Paquete ginecológico preventivo integral y ecografía HD", activo: true },
  { codigo: "PCK-002", nombre: "Pack Embarazo Control Inicial: Eco Genética + Perfil Prenatal", precio_venta: 210, costo_operativo: 75, categoria: "Packs Promocionales", descripcion: "Descarte genético I trimestre + analítica completa", activo: true },
  { codigo: "PCK-003", nombre: "Pack Chequeo Ginecológico Anual: Colposcopía + PAP + Eco Transvaginal", precio_venta: 190, costo_operativo: 65, categoria: "Packs Promocionales", descripcion: "Chequeo preventivo integral femenino anual", activo: true },
  { codigo: "PCK-004", nombre: "Pack Descarte ITS Integral: Rápido Dual + Frotis Vaginal + Orina", precio_venta: 110, costo_operativo: 35, categoria: "Packs Promocionales", descripcion: "Evaluación integral de salud urogenital", activo: true },
  { codigo: "PCK-005", nombre: "Pack Urológico: Eco Renal + Vesicoprostática", precio_venta: 120, costo_operativo: 40, categoria: "Packs Promocionales", descripcion: "Evaluación urológica integral de riñones, vejiga y próstata", activo: true },

  // --- ECOGRAFÍAS DE APOYO DIAGNÓSTICO (OBSTÉTRICAS Y GENERALES) ---
  { codigo: "ECO-001", nombre: "Ecografía Especializada 4D / 5D (HD Live)", precio_venta: 150, costo_operativo: 50, categoria: "Ecografías", descripcion: "Visualización fetal volumétrica en tiempo real con video", activo: true },
  { codigo: "ECO-002", nombre: "Ecografía Obstétrica Morfológica (Semana 20-24)", precio_venta: 140, costo_operativo: 45, categoria: "Ecografías", descripcion: "Evaluación anatómica fetal y marcadores de bienestar", activo: true },
  { codigo: "ECO-003", nombre: "Ecografía Doppler Materno-Fetal", precio_venta: 160, costo_operativo: 55, categoria: "Ecografías", descripcion: "Flujometría de arterias uterinas y cordón umbilical", activo: true },
  { codigo: "ECO-004", nombre: "Ecografía Genética / I Trimestre (Semana 11-14)", precio_venta: 120, costo_operativo: 40, categoria: "Ecografías", descripcion: "Translucencia nucal, hueso nasal y ductus venoso", activo: true },
  { codigo: "ECO-005", nombre: "Ecografía de Apoyo Diagnóstico: Obstétrica Control", precio_venta: 70, costo_operativo: 25, categoria: "Ecografías", descripcion: "Biometría fetal, líquido amniótico y placenta", activo: true },
  { codigo: "ECO-006", nombre: "Ecografía de Apoyo Diagnóstico: Transvaginal", precio_venta: 80, costo_operativo: 25, categoria: "Ecografías", descripcion: "Útero, endometrio y anexos ováricos de alta resolución", activo: true },
  { codigo: "ECO-007", nombre: "Ecografía de Apoyo Diagnóstico: Pélvica", precio_venta: 70, costo_operativo: 25, categoria: "Ecografías", descripcion: "Vía suprapúbica para descarte ginecológico", activo: true },
  { codigo: "ECO-008", nombre: "Ecografía Mamaria Bilateral", precio_venta: 80, costo_operativo: 28, categoria: "Ecografías", descripcion: "Evaluación ecográfica de ambas mamas y axilas (BI-RADS)", activo: true },
  { codigo: "ECO-009", nombre: "Ecografía Tiroidea", precio_venta: 80, costo_operativo: 28, categoria: "Ecografías", descripcion: "Evaluación de glándula tiroides y nódulos (TI-RADS)", activo: true },
  { codigo: "ECO-010", nombre: "Ecografía Abdominal Completa", precio_venta: 90, costo_operativo: 30, categoria: "Ecografías", descripcion: "Hígado, vesícula, páncreas, bazo y riñones", activo: true },
  { codigo: "ECO-011", nombre: "Ecografía Renal y Vías Urinarias", precio_venta: 80, costo_operativo: 28, categoria: "Ecografías", descripcion: "Riñones, vejiga y descarte de litiasis", activo: true },
  { codigo: "ECO-012", nombre: "Ecografía Prostática (Vesicoprostática)", precio_venta: 80, costo_operativo: 28, categoria: "Ecografías", descripcion: "Evaluación suprapúbica con cálculo de residuo postmiccional", activo: true },
  { codigo: "ECO-013", nombre: "Ecografía de Partes Blandas y Pared", precio_venta: 70, costo_operativo: 25, categoria: "Ecografías", descripcion: "Tejido celular subcutáneo, lipomas y hernias", activo: true },
  { codigo: "ECO-014", nombre: "Monitoreo Fetal Electrónico (NST)", precio_venta: 50, costo_operativo: 15, categoria: "Ecografías", descripcion: "Registro cardiotocográfico no estresante basal", activo: true },
  { codigo: "ECO-015", nombre: "Perfil Biofísico Fetal (PBF)", precio_venta: 120, costo_operativo: 40, categoria: "Ecografías", descripcion: "Evaluación ecográfica de bienestar + Monitoreo fetal", activo: true },

  // --- CONSULTAS OBSTÉTRICAS Y MÉDICAS ---
  { codigo: "CON-001", nombre: "Control Prenatal Reenfocado", precio_venta: 70, costo_operativo: 25, categoria: "Consultas", descripcion: "Evaluación clínica integral, triaje y carnet perinatal (Obstetra - COP)", activo: true },
  { codigo: "CON-002", nombre: "Consulta Obstétrica", precio_venta: 70, costo_operativo: 25, categoria: "Consultas", descripcion: "Evaluación de la gestación, bienestar materno y salud sexual (Obstetra - COP)", activo: true },
  { codigo: "CON-003", nombre: "Consejería en Planificación Familiar", precio_venta: 60, costo_operativo: 20, categoria: "Consultas", descripcion: "Orientación personalizada y prescripción anticonceptiva (Obstetra - COP)", activo: true },
  { codigo: "CON-004", nombre: "Consulta Médica Ginecológica Especializada", precio_venta: 80, costo_operativo: 30, categoria: "Consultas", descripcion: "Evaluación especializada por gineco-obstetra (Médico - CMP)", activo: true },
  { codigo: "CON-005", nombre: "Consulta Ginecológica de Control (Médico)", precio_venta: 50, costo_operativo: 20, categoria: "Consultas", descripcion: "Revisión de resultados y seguimiento médico (Médico - CMP)", activo: true },
  { codigo: "CON-006", nombre: "Consulta Médica de Fertilidad y Pareja", precio_venta: 100, costo_operativo: 35, categoria: "Consultas", descripcion: "Estudio clínico de infertilidad y salud reproductiva (Médico - CMP)", activo: true },
  { codigo: "CON-007", nombre: "Evaluación Médica de Climaterio y Menopausia", precio_venta: 90, costo_operativo: 30, categoria: "Consultas", descripcion: "Terapia de reemplazo hormonal y salud ósea (Médico - CMP)", activo: true },
  { codigo: "CON-008", nombre: "Consulta de Medicina General", precio_venta: 50, costo_operativo: 18, categoria: "Consultas", descripcion: "Evaluación clínica integral del adulto y medicina ambulatoria (Médico - CMP)", activo: true },
  { codigo: "CON-009", nombre: "Consulta de Control / Lectura de Exámenes (Medicina General)", precio_venta: 30, costo_operativo: 10, categoria: "Consultas", descripcion: "Seguimiento médico y evaluación de análisis clínicos (Médico - CMP)", activo: true },

  // --- PROCEDIMIENTOS GINECOLÓGICOS & PREVENCIÓN ---
  { codigo: "PRC-001", nombre: "Prevención Cáncer Cervical (PAP)", precio_venta: 50, costo_operativo: 18, categoria: "Procedimientos", descripcion: "Toma de citología exfoliativa cervical Papanicolaou", activo: true },
  { codigo: "PRC-002", nombre: "Colposcopía Digital Diagnóstica", precio_venta: 100, costo_operativo: 35, categoria: "Procedimientos", descripcion: "Examen microscópico digital del cuello uterino", activo: true },
  { codigo: "PRC-003", nombre: "Pack Preventivo: Colposcopía + PAP", precio_venta: 130, costo_operativo: 45, categoria: "Procedimientos", descripcion: "Evaluación combinada de alta precisión para cuello uterino", activo: true },
  { codigo: "PRC-004", nombre: "Cauterización / Crioterapia Cervical", precio_venta: 180, costo_operativo: 60, categoria: "Procedimientos", descripcion: "Tratamiento de ectropión / heridas de cuello uterino", activo: true },
  { codigo: "PRC-005", nombre: "Inserción de DIU T de Cobre", precio_venta: 120, costo_operativo: 40, categoria: "Procedimientos", descripcion: "Colocación de dispositivo intrauterino con guía médica", activo: true },
  { codigo: "PRC-006", nombre: "Inserción de DIU Hormonal (Mirena/Kyleena)", precio_venta: 250, costo_operativo: 90, categoria: "Procedimientos", descripcion: "Colocación especializada de sistema intrauterino", activo: true },
  { codigo: "PRC-007", nombre: "Retiro de Dispositivo Intrauterino (DIU)", precio_venta: 70, costo_operativo: 25, categoria: "Procedimientos", descripcion: "Extracción segura de DIU o revisión de hilos", activo: true },
  { codigo: "PRC-008", nombre: "Inserción de Implante Subdérmico", precio_venta: 150, costo_operativo: 50, categoria: "Procedimientos", descripcion: "Colocación de implante anticonceptivo subdérmico", activo: true },
  { codigo: "PRC-009", nombre: "Retiro de Implante Subdérmico", precio_venta: 90, costo_operativo: 30, categoria: "Procedimientos", descripcion: "Extracción ambulatoria con anestesia local", activo: true },
  { codigo: "PRC-010", nombre: "Biopsia de Cérvix / Endometrio", precio_venta: 160, costo_operativo: 55, categoria: "Procedimientos", descripcion: "Toma de muestra tisular para estudio anatomopatológico", activo: true },
  { codigo: "PRC-011", nombre: "Lavado y Curación Ginecológica", precio_venta: 40, costo_operativo: 12, categoria: "Procedimientos", descripcion: "Tratamiento tópico y antisepsia vaginal", activo: true },

  // --- LABORATORIO CLÍNICO Y DESPISTAJE RÁPIDO ---
  { codigo: "LAB-001", nombre: "Descarte Rápido ITS (VIH + Sífilis)", precio_venta: 45, costo_operativo: 15, categoria: "Laboratorio", descripcion: "Prueba rápida dual en suero/sangre capilar", activo: true },
  { codigo: "LAB-002", nombre: "Prueba de Embarazo Rápida en Sangre (HCG)", precio_venta: 35, costo_operativo: 10, categoria: "Laboratorio", descripcion: "Detección temprana de subunidad beta en 15 min", activo: true },
  { codigo: "LAB-003", nombre: "Hemoglobina y Hematocrito Rápido", precio_venta: 20, costo_operativo: 6, categoria: "Laboratorio", descripcion: "Dosaje instantáneo para descarte de anemia materna", activo: true },
  { codigo: "LAB-004", nombre: "Examen Completo de Orina + Tira Reactiva", precio_venta: 25, costo_operativo: 8, categoria: "Laboratorio", descripcion: "Descarte de infección urinaria o proteinuria gestacional", activo: true },
  { codigo: "LAB-005", nombre: "Cultivo y Antibiograma de Secreción Vaginal", precio_venta: 60, costo_operativo: 22, categoria: "Laboratorio", descripcion: "Identificación microbiológica y sensibilidad a antibióticos", activo: true },
  { codigo: "LAB-006", nombre: "Grupo Sanguíneo y Factor Rh", precio_venta: 25, costo_operativo: 7, categoria: "Laboratorio", descripcion: "Determinación de grupo ABO y compatibilidad Rh", activo: true },
  { codigo: "LAB-007", nombre: "Perfil Prenatal Básico Completo", precio_venta: 120, costo_operativo: 42, categoria: "Laboratorio", descripcion: "Hemograma, glucosa, grupo, VIH, RPR y orina completa", activo: true },
];

export function SupervisionProvider({ children }: { children: React.ReactNode }) {
  const [subModuloSupervision, setSubModuloSupervision] = useState<SubModuloSupervision>("personal");
  const [conteoPersonal, setConteoPersonal] = useState<number>(14);
  const [conteoInventario, setConteoInventario] = useState<number>(0);
  const [stockBajoInventario, setStockBajoInventario] = useState<number>(0);
  const [conteoServicios, setConteoServicios] = useState<number>(CATALOGO_SERVICIOS_BASE.length);

  // Inicialización de servicios con persistencia local resiliente
  const [serviciosCustom, setServiciosCustom] = useState<ServicioTarifario[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("lm_catalogo_servicios_custom");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (err) {
        console.warn("Aviso al cargar catalogo local:", err);
      }
    }
    return CATALOGO_SERVICIOS_BASE.map((s, idx) => ({
      ...s,
      id: `srv-${idx + 1}-${s.codigo.toLowerCase()}`,
    }));
  });

  useEffect(() => {
    setConteoServicios(serviciosCustom.filter((s) => s.activo).length);
  }, [serviciosCustom]);

  const guardarEnStorage = (items: ServicioTarifario[]) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("lm_catalogo_servicios_custom", JSON.stringify(items));
        window.dispatchEvent(new Event("storage"));
      } catch (err) {
        console.warn("Aviso guardando catalogo en storage:", err);
      }
    }
  };

  const actualizarServicioTarifario = (serv: ServicioTarifario) => {
    setServiciosCustom((prev) => {
      const next = prev.map((item) =>
        item.id === serv.id ? { ...serv, updated_at: new Date().toISOString() } : item
      );
      guardarEnStorage(next);
      return next;
    });
  };

  const agregarServicioTarifario = (serv: Omit<ServicioTarifario, "id">) => {
    setServiciosCustom((prev) => {
      const nuevo: ServicioTarifario = {
        ...serv,
        id: `srv-${Date.now()}-${serv.codigo.toLowerCase()}`,
        updated_at: new Date().toISOString(),
      };
      const next = [nuevo, ...prev];
      guardarEnStorage(next);
      return next;
    });
  };

  return (
    <SupervisionContext.Provider
      value={{
        subModuloSupervision,
        setSubModuloSupervision,
        conteoPersonal,
        setConteoPersonal,
        conteoInventario,
        setConteoInventario,
        stockBajoInventario,
        setStockBajoInventario,
        conteoServicios,
        setConteoServicios,
        serviciosCustom,
        setServiciosCustom,
        actualizarServicioTarifario,
        agregarServicioTarifario,
      }}
    >
      {children}
    </SupervisionContext.Provider>
  );
}

export function useSupervision() {
  const context = useContext(SupervisionContext);
  if (!context) {
    throw new Error("useSupervision debe ser utilizado dentro de un SupervisionProvider");
  }
  return context;
}
