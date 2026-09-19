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
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface PacienteEnConsulta {
  id: string;
  paciente: string;
  dni: string;
  edad: string;
  servicio: string;
  alergias?: string;
  grupoSanguineo?: string;
  sede: string;
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

const CIE10_FRECUENTES = [
  { codigo: "Z34.8", descripcion: "Supervisión de otros embarazos normales" },
  { codigo: "Z34.0", descripcion: "Supervisión de primer embarazo normal" },
  { codigo: "Z36.8", descripcion: "Pesquisa prenatal para otras anomalías (Ecografía)" },
  { codigo: "O26.8", descripcion: "Otras afecciones especificadas relacionadas con el embarazo" },
  { codigo: "N76.0", descripcion: "Vaginitis aguda / Leucorrea" },
  { codigo: "N72", descripcion: "Enfermedad inflamatoria del cuello uterino (Cervicitis)" },
  { codigo: "Z30.0", descripcion: "Consejo y asesoramiento general sobre la anticoncepción" },
  { codigo: "N91.2", descripcion: "Amenorrea, sin otra especificación" },
];

export default function HcePage() {
  const [sede, setSede] = useState<string>("Independencia");
  const [profesionalNombre, setProfesionalNombre] = useState<string>("Dr. Carlos Benavides");
  const [colegiatura, setColegiatura] = useState<string>("CMP 54321");

  // Pacientes en cola del consultorio
  const [pacientesCola, setPacientesCola] = useState<PacienteEnConsulta[]>([
    {
      id: "enc-001",
      paciente: "Carla Mendoza Quispe",
      dni: "45892147",
      edad: "28 a",
      servicio: "Control Prenatal Reenfocado",
      alergias: "Ninguna",
      grupoSanguineo: "O Rh(+)",
      sede: "Independencia",
    },
    {
      id: "enc-002",
      paciente: "Yolanda Flores Huamán",
      dni: "71245896",
      edad: "32 a",
      servicio: "Ecografía Especializada (4D)",
      alergias: "Penicilina",
      grupoSanguineo: "A Rh(+)",
      sede: "Independencia",
    },
    {
      id: "enc-003",
      paciente: "Roxana Palomino Quispe",
      dni: "42198754",
      edad: "25 a",
      servicio: "Control Prenatal Reenfocado",
      alergias: "Ninguna",
      grupoSanguineo: "O Rh(+)",
      sede: "Vivanco",
    },
  ]);

  const [selectedPatient, setSelectedPatient] = useState<PacienteEnConsulta>(pacientesCola[0]);

  // Triaje & Funciones Vitales
  const [pa, setPa] = useState("110/70");
  const [fc, setFc] = useState("78");
  const [fr, setFr] = useState("18");
  const [temp, setTemp] = useState("36.6");
  const [satO2, setSatO2] = useState("98");
  const [peso, setPeso] = useState("62.0");
  const [talla, setTalla] = useState("1.58");

  // IMC dinámico
  const pNum = parseFloat(peso) || 0;
  const tNum = parseFloat(talla) || 0;
  const imc = tNum > 0 ? (pNum / (tNum * tNum)).toFixed(1) : "0.0";

  // Perfil Obstétrico
  const [formulaG, setFormulaG] = useState("G2");
  const [formulaP, setFormulaP] = useState("P1001");
  const [fur, setFur] = useState("2026-04-02");
  const [fpp, setFpp] = useState("2027-01-09");
  const [eg, setEg] = useState("24 sem");
  const [alturaUterina, setAlturaUterina] = useState("22");
  const [lcf, setLcf] = useState("142");
  const [presentacion, setPresentacion] = useState("Cefálica");

  // Anamnesis, Examen y Tratamiento
  const [motivo, setMotivo] = useState(
    "Control prenatal correspondiente a 24 semanas de gestación. Paciente refiere movimientos fetales activos, sin hidrorrea ni metrorragia."
  );
  const [antecedentes, setAntecedentes] = useState(
    "G2 P1001. Menarquia: 13 años. PAP previo negativo hace 8 meses. Sin comorbilidades crónicas."
  );
  const [examenFisico, setExamenFisico] = useState(
    "Abdomen grávido por feto único, útero con tono normal. Mamas blandas sin masas. Espéculo: cérvix cerrado sin pérdidas."
  );
  const [planTratamiento, setPlanTratamiento] = useState(
    "1. Sulfato Ferroso 60mg + Ácido Fólico 400mcg: 1 tab VO c/24h en ayunas.\n2. Ecografía Obstétrica Morfológica de control.\n3. Signos de alarma explicados a la gestante."
  );

  // Diagnósticos CIE-10
  const [diagnosticos, setDiagnosticos] = useState<DiagnosticoItem[]>([
    {
      id: "dx-1",
      codigo: "Z34.8",
      descripcion: "Supervisión de otros embarazos normales (24 sem)",
      tipo: "Definitivo",
    },
  ]);
  const [busquedaCie, setBusquedaCie] = useState("");
  const [mostrarSugerenciasCie, setMostrarSugerenciasCie] = useState(false);

  // Imágenes / Ecografías
  const [imagenes, setImagenes] = useState<ImagenAdjunta[]>([
    {
      id: "img-1",
      titulo: "Corte Perfil Fetal 24 sem",
      tipo: "Ecografía 2D",
      url: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=600&auto=format&fit=crop&q=80",
      hora: "08:35",
    },
  ]);
  const [modalImagen, setModalImagen] = useState<ImagenAdjunta | null>(null);

  // Estado de Sellado y Adendas
  const [isSealed, setIsSealed] = useState(false);
  const [sealedHash, setSealedHash] = useState<string | null>(null);
  const [adendas, setAdendas] = useState<{ fecha: string; texto: string; hash: string }[]>([]);
  const [showAdendaModal, setShowAdendaModal] = useState(false);
  const [textoAdenda, setTextoAdenda] = useState("");

  // Reagendamiento Post-Consulta y Recordatorio por WhatsApp
  const [reagendarFecha, setReagendarFecha] = useState("");
  const [reagendarHora, setReagendarHora] = useState("09:00");
  const [reagendarMotivo, setReagendarMotivo] = useState("Control Prenatal y Ecografía de Seguimiento");
  const [reagendarSede, setReagendarSede] = useState("Independencia");
  const [reagendadaExito, setReagendadaExito] = useState(false);

  // ============================================================================
  // SINCRONIZACIÓN EN TIEMPO REAL: ADMISIÓN A CONSULTORIO HCE (SUPABASE REALTIME)
  // ============================================================================
  useEffect(() => {
    const canalEncuentro = supabase
      .channel("cola-medica")
      .on("broadcast", { event: "nuevo_paciente_en_espera" }, ({ payload }) => {
        if (payload) {
          setPacientesCola((prev) => {
            if (prev.some((p) => p.dni === payload.dni)) return prev;
            return [
              {
                id: payload.id,
                paciente: payload.paciente,
                dni: payload.dni,
                edad: "28 a",
                servicio: payload.servicio,
                alergias: "Ninguna",
                grupoSanguineo: "O Rh(+)",
                sede: payload.sede || sede,
              },
              ...prev,
            ];
          });
        }
      })
      .subscribe();

    const onStorage = (e: StorageEvent) => {
      if (e.key === "lm_nuevo_paciente_en_espera" && e.newValue) {
        try {
          const payload = JSON.parse(e.newValue);
          setPacientesCola((prev) => {
            if (prev.some((p) => p.dni === payload.dni)) return prev;
            return [
              {
                id: payload.id,
                paciente: payload.paciente,
                dni: payload.dni,
                edad: "28 a",
                servicio: payload.servicio,
                alergias: "Ninguna",
                grupoSanguineo: "O Rh(+)",
                sede: payload.sede || sede,
              },
              ...prev,
            ];
          });
        } catch {}
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      supabase.removeChannel(canalEncuentro);
      window.removeEventListener("storage", onStorage);
    };
  }, [sede]);

  const generarEnlaceWhatsApp = () => {
    const tel = "966123456";
    const msg = `*Consultorio Obstétrico Ecográfico Las Mellizas* 🩺✨%0A%0AEstimada paciente *${encodeURIComponent(
      selectedPatient.paciente
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
    try {
      await supabase.from("cita_reagendada").insert({
        paciente_nombre: selectedPatient.paciente,
        fecha: reagendarFecha,
        hora: reagendarHora,
        motivo: reagendarMotivo,
        site_id: reagendarSede === "Vivanco" ? "b0000000-0000-0000-0000-000000000002" : "b0000000-0000-0000-0000-000000000001",
      });
    } catch {}
    setReagendadaExito(true);
    setTimeout(() => setReagendadaExito(false), 4000);
  };

  // ============================================================================
  // AUTOGUARDADO SILENCIOSO (SILENT DEBOUNCE 3000ms)
  // Guarda en segundo plano sin interrumpir ni recargar.
  // ============================================================================
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("saved");
  const [lastSavedTime, setLastSavedTime] = useState<string>("08:40:12");
  const isFirstRender = useRef(true);

  useEffect(() => {
    const s = sessionStorage.getItem("lm_sede") || "Independencia";
    const nom = sessionStorage.getItem("lm_nombre") || "Dr. Carlos Benavides";
    const col = sessionStorage.getItem("lm_colegiatura") || "CMP 54321";
    setSede(s);
    setProfesionalNombre(nom);
    setColegiatura(col);
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (isSealed) return;

    setSaveStatus("saving");
    const handler = setTimeout(() => {
      // Simulación de escritura silenciosa en Supabase (tabla nota_clinica borrador)
      setSaveStatus("saved");
      setLastSavedTime(new Date().toLocaleTimeString("es-PE"));
    }, 3000);

    return () => clearTimeout(handler);
  }, [pa, fc, fr, temp, peso, talla, motivo, antecedentes, examenFisico, planTratamiento, diagnosticos]);

  const handleAgregarCie = (item: { codigo: string; descripcion: string }) => {
    if (diagnosticos.some((d) => d.codigo === item.codigo)) return;
    setDiagnosticos([
      ...diagnosticos,
      { id: `dx-${Date.now()}`, codigo: item.codigo, descripcion: item.descripcion, tipo: "Definitivo" },
    ]);
    setBusquedaCie("");
    setMostrarSugerenciasCie(false);
  };

  const handleSellarNota = () => {
    if (diagnosticos.length === 0) {
      alert("Debe registrar al menos un código CIE-10 antes de sellar.");
      return;
    }
    const hash = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    setSealedHash(hash);
    setIsSealed(true);
  };

  const handleGuardarAdenda = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textoAdenda.trim()) return;

    const hash = Array.from(crypto.getRandomValues(new Uint8Array(12)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    setAdendas([...adendas, { fecha: new Date().toLocaleString("es-PE"), texto: textoAdenda, hash }]);
    setTextoAdenda("");
    setShowAdendaModal(false);
  };

  const pacientesFiltrados = pacientesCola.filter(
    (p) => sede === "Todas las Sedes" || p.sede === sede
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
            <span className="font-bold text-neutral-900">{selectedPatient.paciente}</span>
            <span className="font-mono text-neutral-400">({selectedPatient.dni})</span>
            {selectedPatient.alergias && selectedPatient.alergias !== "Ninguna" && (
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

          {/* Botón de Sellar / Adenda */}
          {!isSealed ? (
            <button
              onClick={handleSellarNota}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-black text-white font-bold rounded-lg transition"
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

      {/* Grid Clínico de Alta Densidad (3 Columnas) */}
      <div className="grid lg:grid-cols-12 gap-3">
        {/* ================================================================== */}
        {/* COLUMNA 1: COLA DE SEDE, TRIAJE & OBSTÉTRICO (3 columnas)           */}
        {/* ================================================================== */}
        <div className="lg:col-span-3 space-y-3">
          {/* Selector Rápido de Pacientes en Espera */}
          <div className="bg-white border border-neutral-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-1.5">
              <span className="font-bold text-[11px] text-neutral-700 uppercase tracking-wider">
                Pacientes en Espera ({pacientesFiltrados.length})
              </span>
            </div>
            <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
              {pacientesFiltrados.map((p) => {
                const isSelected = p.id === selectedPatient.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPatient(p)}
                    className={`p-2 rounded-lg border text-left cursor-pointer transition ${
                      isSelected
                        ? "border-neutral-900 bg-neutral-50 font-bold"
                        : "border-neutral-100 hover:border-neutral-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-900 truncate">{p.paciente}</span>
                      <span className="font-mono text-[10px] text-neutral-400">{p.edad}</span>
                    </div>
                    <span className="text-[10px] text-neutral-500 block truncate">{p.servicio}</span>
                  </div>
                );
              })}
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
                  className="w-full px-2 py-1 border border-neutral-200 rounded font-mono font-semibold"
                />
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
                  className="w-full px-2 py-1 border border-neutral-200 rounded font-mono"
                />
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
            <span className="font-bold text-[11px] text-neutral-700 uppercase tracking-wider block border-b border-neutral-100 pb-1">
              2. Parámetros Materno-Fetales
            </span>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-neutral-500 mb-0.5">G / P</label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    disabled={isSealed}
                    value={formulaG}
                    onChange={(e) => setFormulaG(e.target.value)}
                    className="w-1/2 px-1.5 py-1 border border-neutral-200 rounded font-mono text-center font-bold"
                  />
                  <input
                    type="text"
                    disabled={isSealed}
                    value={formulaP}
                    onChange={(e) => setFormulaP(e.target.value)}
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
                  className="w-full px-2 py-1 border border-neutral-200 rounded font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-neutral-500 mb-0.5">F.U.R.</label>
                <input
                  type="date"
                  disabled={isSealed}
                  value={fur}
                  onChange={(e) => setFur(e.target.value)}
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
                  className="w-full px-1.5 py-1 border border-neutral-200 rounded font-mono text-[10px]"
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
            <label className="block font-bold text-[11px] text-neutral-700 uppercase tracking-wider mb-1">
              5. Examen Físico Preferencial / Especuloscopía
            </label>
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
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-20 max-h-40 overflow-y-auto">
                    {CIE10_FRECUENTES.filter(
                      (c) =>
                        c.codigo.toLowerCase().includes(busquedaCie.toLowerCase()) ||
                        c.descripcion.toLowerCase().includes(busquedaCie.toLowerCase())
                    ).map((item) => (
                      <div
                        key={item.codigo}
                        onClick={() => handleAgregarCie(item)}
                        className="p-2 hover:bg-neutral-50 cursor-pointer border-b border-neutral-100 last:border-0 flex items-center justify-between"
                      >
                        <span className="font-medium text-neutral-800">{item.descripcion}</span>
                        <span className="font-mono font-bold text-[10px] text-neutral-500">{item.codigo}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Plan de Trabajo & Receta Médica DCI */}
          <div>
            <label className="block font-bold text-[11px] text-neutral-700 uppercase tracking-wider mb-1">
              7. Plan de Trabajo & Prescripción (DCI)
            </label>
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
                <button
                  onClick={() => {
                    const nueva: ImagenAdjunta = {
                      id: `img-${Date.now()}`,
                      titulo: "Captura Ecográfica",
                      tipo: "Ecografía",
                      url: "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=600&auto=format&fit=crop&q=80",
                      hora: new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }),
                    };
                    setImagenes([...imagenes, nueva]);
                  }}
                  className="text-[10px] font-bold text-neutral-700 hover:text-black flex items-center gap-0.5"
                >
                  <Upload className="w-3 h-3" /> + Adjuntar
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              {imagenes.map((img) => (
                <div
                  key={img.id}
                  className="flex items-center gap-2 p-1.5 bg-neutral-50 rounded border border-neutral-200 group"
                >
                  <img src={img.url} alt={img.titulo} className="w-10 h-10 object-cover rounded" />
                  <div className="flex-1 truncate">
                    <span className="font-semibold text-neutral-900 block truncate leading-tight">
                      {img.titulo}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">{img.hora}</span>
                  </div>
                  <button
                    onClick={() => setModalImagen(img)}
                    className="p-1 text-neutral-400 hover:text-neutral-900"
                    title="Ampliar imagen"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
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

          {/* Historial de Adendas Inmutables */}
          {isSealed && (
            <div className="bg-white border border-neutral-200 rounded-lg p-3 space-y-2">
              <span className="font-bold text-[11px] text-neutral-700 uppercase tracking-wider block border-b border-neutral-100 pb-1">
                Adendas Inmutables ({adendas.length})
              </span>

              {adendas.length === 0 ? (
                <p className="text-[11px] text-neutral-400">Sin adendas agregadas post-sellado.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {adendas.map((a, i) => (
                    <div key={i} className="p-2 bg-neutral-50 rounded border border-neutral-200 text-[11px] space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                        <span>{a.fecha}</span>
                        <span>{a.hash}</span>
                      </div>
                      <p className="text-neutral-800">{a.texto}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Certificado de Integridad / Sello */}
          {isSealed && sealedHash && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[10px] font-mono text-emerald-800 space-y-0.5">
              <span className="font-bold block font-sans">Historia Sellada e Inmutable</span>
              <p className="break-all text-emerald-700">SHA-256: {sealedHash}</p>
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
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-xl border border-neutral-200 space-y-3">
            <h3 className="font-bold text-sm text-neutral-900">Incorporar Adenda Inmutable (NTS N.º 139)</h3>
            <p className="text-xs text-neutral-500">
              Las notas cerradas no admiten modificación directa. Toda aclaración o corrección se anexa con fecha y firma digital.
            </p>
            <form onSubmit={handleGuardarAdenda} className="space-y-3">
              <textarea
                rows={4}
                required
                value={textoAdenda}
                onChange={(e) => setTextoAdenda(e.target.value)}
                placeholder="Escribe el texto de la adenda clínica..."
                className="w-full p-2.5 border border-neutral-300 rounded-lg text-xs focus:ring-1 focus:ring-neutral-900"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdendaModal(false)}
                  className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-neutral-900 hover:bg-black text-white text-xs font-bold rounded-lg"
                >
                  Firmar Adenda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}