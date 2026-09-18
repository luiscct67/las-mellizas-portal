"use client";

import { useState, useEffect } from "react";
import {
  Stethoscope,
  FileText,
  CheckCircle,
  PlusCircle,
  Lock,
  Sparkles,
  Clock,
  AlertTriangle,
  ShieldCheck,
  MapPin,
  Award,
  UserPlus,
  Search,
  Image as ImageIcon,
  Upload,
  Eye,
  Trash2,
  Calendar,
  HeartPulse,
  Baby,
  Activity,
  Maximize2,
  X,
  FileSpreadsheet,
} from "lucide-react";

interface PacienteHce {
  id: string;
  paciente: string;
  dni: string;
  edad: string;
  telefono: string;
  servicio: string;
  sede: "Independencia" | "Vivanco";
  alergias?: string;
  grupoSanguineo?: string;
}

interface ImagenAdjunta {
  id: string;
  titulo: string;
  tipo: "Ecografía" | "Laboratorio" | "Colposcopía" | "Otro";
  fecha: string;
  url: string;
}

interface DiagnosticoCie {
  id: string;
  codigo: string;
  descripcion: string;
  tipo: "Presuntivo" | "Definitivo" | "Repetido";
}

export default function HcePage() {
  const [sede, setSede] = useState<string>("Independencia");
  const [profesionalNombre, setProfesionalNombre] = useState<string>("Dr. Carlos Benavides Velarde");
  const [profesionalColegiatura, setProfesionalColegiatura] = useState<string>("CMP 54321 / RNE 23456");

  // Pacientes pre-cargados en sede
  const [pacientesIndependencia, setPacientesIndependencia] = useState<PacienteHce[]>([
    {
      id: "enc-ind-001",
      paciente: "Carla Mendoza Quispe",
      dni: "45892147",
      edad: "28 años",
      telefono: "966 123 456",
      servicio: "Control Prenatal Reenfocado",
      sede: "Independencia",
      alergias: "Ninguna conocida",
      grupoSanguineo: "O Rh(+)",
    },
    {
      id: "enc-ind-002",
      paciente: "Yolanda Flores Huamán",
      dni: "71245896",
      edad: "32 años",
      telefono: "966 987 654",
      servicio: "Ecografía Especializada (4D)",
      sede: "Independencia",
      alergias: "Penicilina (Reacción urticarial)",
      grupoSanguineo: "A Rh(+)",
    },
  ]);

  const [pacientesVivanco, setPacientesVivanco] = useState<PacienteHce[]>([
    {
      id: "enc-viv-001",
      paciente: "Roxana Palomino Quispe",
      dni: "42198754",
      edad: "25 años",
      telefono: "966 333 444",
      servicio: "Control Prenatal Reenfocado",
      sede: "Vivanco",
      alergias: "Sulfas",
      grupoSanguineo: "O Rh(+)",
    },
    {
      id: "enc-viv-002",
      paciente: "Diana Huamán Cárdenas",
      dni: "70541298",
      edad: "29 años",
      telefono: "966 555 777",
      servicio: "Planificación Familiar Integral",
      sede: "Vivanco",
      alergias: "Ninguna",
      grupoSanguineo: "B Rh(+)",
    },
  ]);

  const [selectedPatient, setSelectedPatient] = useState<PacienteHce>(pacientesIndependencia[0]);

  // Modal nueva paciente espontánea en consultorio
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [nuevoDni, setNuevoDni] = useState("");
  const [nuevoNombres, setNuevoNombres] = useState("");
  const [nuevoApellidos, setNuevoApellidos] = useState("");
  const [nuevoEdad, setNuevoEdad] = useState("");
  const [nuevoTelefono, setNuevoTelefono] = useState("");
  const [nuevoServicio, setNuevoServicio] = useState("Control Prenatal Reenfocado");
  const [nuevoAlergias, setNuevoAlergias] = useState("Ninguna");
  const [nuevoGrupo, setNuevoGrupo] = useState("O Rh(+)");

  // 1. Triaje / Funciones Vitales (NTS N.º 139-MINSA)
  const [pa, setPa] = useState("110/70");
  const [fc, setFc] = useState("78");
  const [fr, setFr] = useState("18");
  const [temp, setTemp] = useState("36.6");
  const [satO2, setSatO2] = useState("98");
  const [peso, setPeso] = useState("62.5");
  const [talla, setTalla] = useState("1.58");

  // Cálculo de IMC automático
  const pesoNum = parseFloat(peso) || 0;
  const tallaNum = parseFloat(talla) || 0;
  const imc = tallaNum > 0 ? (pesoNum / (tallaNum * tallaNum)).toFixed(1) : "0.0";
  const imcNum = parseFloat(imc);
  const estadoNutricional =
    imcNum === 0
      ? "—"
      : imcNum < 18.5
      ? "Bajo Peso"
      : imcNum < 25
      ? "Normopeso"
      : imcNum < 30
      ? "Sobrepeso"
      : "Obesidad";

  // 2. Módulo Obstétrico Específico (Gineco-Obstetricia)
  const [esCasoObstetrico, setEsCasoObstetrico] = useState(true);
  const [formulaG, setFormulaG] = useState("G2");
  const [formulaP, setFormulaP] = useState("P1001");
  const [fur, setFur] = useState("2026-04-02");
  const [fpp, setFpp] = useState("2027-01-09");
  const [egSemanas, setEgSemanas] = useState("24 sem 2 d");
  const [alturaUterina, setAlturaUterina] = useState("22");
  const [lcf, setLcf] = useState("142");
  const [movFetales, setMovFetales] = useState("Presentes / Activos");
  const [presentacion, setPresentacion] = useState("Cefálica");
  const [dinamicaUterina, setDinamicaUterina] = useState("Ausente (Tono normal)");
  const [perdidasVaginales, setPerdidasVaginales] = useState("Ninguna");

  // 3. Anamnesis y Antecedentes
  const [tiempoEnfermedad, setTiempoEnfermedad] = useState("3 días");
  const [motivoConsulta, setMotivoConsulta] = useState(
    "Control prenatal de rutina correspondiente al segundo trimestre. Refiere movimientos fetales activos, sin contracciones ni pérdidas."
  );
  const [antecedentesMedicos, setAntecedentesMedicos] = useState("Niega HTA, DM2, Asma.");
  const [antecedentesGineco, setAntecedentesGineco] = useState(
    "Menarquia: 13 años. RC: 28/4 regular. PAP hace 8 meses: Negativo para lesión intraepitelial. MAC previo: Inyectable trimestral."
  );
  const [antecedentesQuirurgicos, setAntecedentesQuirurgicos] = useState("Apendicectomía a los 18 años sin complicaciones.");

  // 4. Examen Físico
  const [examenGeneral, setExamenGeneral] = useState(
    "Paciente en buen estado general, hidratada, lúcida, colaboradora orientada en tiempo, espacio y persona."
  );
  const [examenMamas, setExamenMamas] = useState("Simétricas, blandas, sin nódulos ni adenopatías axilares palpables. Pezones formados.");
  const [examenAbdomen, setExamenAbdomen] = useState(
    "Grávido por útero aumentado de tamaño compatible con EG, no doloroso a la palpación superficial ni profunda."
  );
  const [examenGinecologico, setExamenGinecologico] = useState(
    "Genitales externos normales. Al examen especular: Cérvix cerrado, sin sangrado ni pérdidas de líquido."
  );

  // 5. Diagnósticos CIE-10 Múltiples
  const [diagnosticos, setDiagnosticos] = useState<DiagnosticoCie[]>([
    {
      id: "dx-1",
      codigo: "Z34.8",
      descripcion: "Supervisión de otros embarazos normales (24 sem)",
      tipo: "Definitivo",
    },
    {
      id: "dx-2",
      codigo: "Z36.8",
      descripcion: "Pesquisa prenatal para otras anomalías (Eco Morfológica)",
      tipo: "Presuntivo",
    },
  ]);
  const [nuevoDxCodigo, setNuevoDxCodigo] = useState("");
  const [nuevoDxDesc, setNuevoDxDesc] = useState("");
  const [nuevoDxTipo, setNuevoDxTipo] = useState<"Presuntivo" | "Definitivo" | "Repetido">("Presuntivo");

  // 6. Plan de Trabajo y Exámenes Solicitados
  const [planTrabajo, setPlanTrabajo] = useState(
    "1. Solicitar Hemograma, Glucosa, Urocultivo y Perfil de Tolerancia a la Glosa (Sem 24-28).\n2. Realizar Ecografía Obstétrica Morfológica de Alta Resolución.\n3. Consejería en nutrición materna y signos de alarma obstétricos."
  );

  // 7. Tratamiento y Receta Médica DCI
  const [receta, setReceta] = useState(
    "1. Sulfato Ferroso 60 mg + Ácido Fólico 400 mcg: 1 tableta VO cada 24 horas (en ayunas o con jugo de naranja) por 60 días.\n2. Calcio 500 mg: 1 tableta VO cada 24 horas (con almuerzo) por 60 días."
  );

  // 8. Galería de Imágenes y Archivos Clínicos Adjuntos
  const [imagenes, setImagenes] = useState<ImagenAdjunta[]>([
    {
      id: "img-01",
      titulo: "Ecografía Obstétrica 2D / Perfil Biofísico",
      tipo: "Ecografía",
      fecha: "18/09/2026 08:30",
      url: "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=600&auto=format&fit=crop&q=80",
    },
    {
      id: "img-02",
      titulo: "Ecografía 4D Facial Fetal",
      tipo: "Ecografía",
      fecha: "18/09/2026 08:35",
      url: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=600&auto=format&fit=crop&q=80",
    },
  ]);

  // Modal subir imagen
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [nuevoImgTitulo, setNuevoImgTitulo] = useState("");
  const [nuevoImgTipo, setNuevoImgTipo] = useState<"Ecografía" | "Laboratorio" | "Colposcopía" | "Otro">("Ecografía");
  const [nuevoImgUrl, setNuevoImgUrl] = useState("");
  const [modalVisualizarImg, setModalVisualizarImg] = useState<ImagenAdjunta | null>(null);

  // Cierre y Sello
  const [notaCerrada, setNotaCerrada] = useState(false);
  const [hashFirma, setHashFirma] = useState<string | null>(null);
  const [fechaCierre, setFechaCierre] = useState<string | null>(null);

  // Adendas
  const [showAdendaModal, setShowAdendaModal] = useState(false);
  const [textoAdenda, setTextoAdenda] = useState("");
  const [adendas, setAdendas] = useState<{ id: string; fecha: string; texto: string; hash: string }[]>([]);

  useEffect(() => {
    const s = sessionStorage.getItem("lm_sede") || "Independencia";
    const nom = sessionStorage.getItem("lm_nombre");
    const col = sessionStorage.getItem("lm_colegiatura");

    setSede(s);
    if (s === "Vivanco") {
      setProfesionalNombre(nom || "Lic. Sonia Rivas Alarcón");
      setProfesionalColegiatura(col || "COP 12890");
      setSelectedPatient(pacientesVivanco[0]);
    } else {
      setProfesionalNombre(nom || "Dr. Carlos Benavides Velarde");
      setProfesionalColegiatura(col || "CMP 54321 / RNE 23456");
      setSelectedPatient(pacientesIndependencia[0]);
    }
  }, []);

  const colaActual = sede === "Vivanco" ? pacientesVivanco : pacientesIndependencia;

  const handleCrearPacienteConsultorio = (e: React.FormEvent) => {
    e.preventDefault();
    const sedeActual = (sede === "Vivanco" ? "Vivanco" : "Independencia") as "Independencia" | "Vivanco";
    const nuevo: PacienteHce = {
      id: `enc-${Date.now().toString().slice(-4)}`,
      paciente: `${nuevoNombres} ${nuevoApellidos}`,
      dni: nuevoDni,
      edad: `${nuevoEdad} años`,
      telefono: nuevoTelefono,
      servicio: nuevoServicio,
      sede: sedeActual,
      alergias: nuevoAlergias,
      grupoSanguineo: nuevoGrupo,
    };

    if (sedeActual === "Vivanco") {
      setPacientesVivanco([nuevo, ...pacientesVivanco]);
    } else {
      setPacientesIndependencia([nuevo, ...pacientesIndependencia]);
    }

    setSelectedPatient(nuevo);
    setNotaCerrada(false);
    setHashFirma(null);
    setShowNewPatientModal(false);

    // Reset form
    setNuevoDni("");
    setNuevoNombres("");
    setNuevoApellidos("");
    setNuevoEdad("");
    setNuevoTelefono("");
  };

  const handleAgregarDiagnostico = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoDxCodigo.trim() || !nuevoDxDesc.trim()) return;

    const dx: DiagnosticoCie = {
      id: `dx-${Date.now()}`,
      codigo: nuevoDxCodigo.trim().toUpperCase(),
      descripcion: nuevoDxDesc.trim(),
      tipo: nuevoDxTipo,
    };
    setDiagnosticos([...diagnosticos, dx]);
    setNuevoDxCodigo("");
    setNuevoDxDesc("");
  };

  const handleEliminarDx = (id: string) => {
    if (notaCerrada) return;
    setDiagnosticos(diagnosticos.filter((d) => d.id !== id));
  };

  const handleSubirImagen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoImgTitulo.trim()) return;

    const nueva: ImagenAdjunta = {
      id: `img-${Date.now()}`,
      titulo: nuevoImgTitulo,
      tipo: nuevoImgTipo,
      fecha: new Date().toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" }),
      url:
        nuevoImgUrl.trim() ||
        "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=600&auto=format&fit=crop&q=80",
    };

    setImagenes([...imagenes, nueva]);
    setNuevoImgTitulo("");
    setNuevoImgUrl("");
    setShowUploadModal(false);
  };

  const handleCerrarNota = () => {
    if (diagnosticos.length === 0) {
      alert("Debe registrar al menos un diagnóstico CIE-10 antes de cerrar la historia clínica.");
      return;
    }
    const simulatedHash = Array.from(crypto.getRandomValues(new Uint8Array(20)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    setHashFirma(simulatedHash);
    setFechaCierre(new Date().toLocaleString("es-PE"));
    setNotaCerrada(true);
  };

  const handleAgregarAdenda = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textoAdenda.trim()) return;

    const nueva = {
      id: `ad-${Date.now().toString().slice(-4)}`,
      fecha: new Date().toLocaleString("es-PE"),
      texto: textoAdenda,
      hash: Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
    };

    setAdendas([...adendas, nueva]);
    setTextoAdenda("");
    setShowAdendaModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Cabecera del Consultorio: Profesional, Colegiatura y Sede */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-200 text-brand-700 flex items-center justify-center font-bold">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-neutral-900 text-base">{profesionalNombre}</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                <Award className="w-3.5 h-3.5 text-blue-600" />
                {profesionalColegiatura}
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5 flex items-center gap-2">
              <span className="flex items-center gap-1 font-semibold text-brand-800">
                <MapPin className="w-3 h-3 text-brand-700" /> Sede {sede}
              </span>
              <span className="text-neutral-300">&bull;</span>
              <span className="text-emerald-700 font-medium">
                Historia Clínica Oficial NTS N.º 139-MINSA/DGIEM &bull; Ambulatoria
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewPatientModal(true)}
            className="inline-flex items-center gap-1.5 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Ingreso Directo de Paciente</span>
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Panel Lateral: Paciente Activa, Selector de Cola y Ficha */}
        <div className="lg:col-span-1 space-y-4">
          {/* Ficha de la Paciente en Atención */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200/50 inline-block">
                Paciente en Consulta ({sede})
              </span>
            </div>
            <h2 className="text-base font-black text-neutral-900 leading-snug">{selectedPatient.paciente}</h2>
            <div className="mt-3 space-y-1.5 text-xs text-neutral-600">
              <p>
                <strong className="text-neutral-700">DNI:</strong> {selectedPatient.dni}
              </p>
              <p>
                <strong className="text-neutral-700">Edad:</strong> {selectedPatient.edad}
              </p>
              <p>
                <strong className="text-neutral-700">Teléfono:</strong> {selectedPatient.telefono}
              </p>
              <p>
                <strong className="text-neutral-700">Servicio:</strong> {selectedPatient.servicio}
              </p>
              <p>
                <strong className="text-neutral-700">Grupo Sang.:</strong>{" "}
                <span className="font-bold text-brand-800">{selectedPatient.grupoSanguineo || "O Rh(+)"}</span>
              </p>
              {selectedPatient.alergias && selectedPatient.alergias !== "Ninguna" && (
                <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px] font-bold mt-2">
                  <AlertTriangle className="w-3.5 h-3.5 inline mr-1 text-rose-600" />
                  Alergias: {selectedPatient.alergias}
                </div>
              )}
            </div>
          </div>

          {/* Cola de Pacientes en Espera */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2.5">
              Lista de Espera en Sede {sede}
            </h3>
            <div className="space-y-2">
              {colaActual.map((p) => {
                const isCurrent = p.id === selectedPatient.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedPatient(p);
                      setNotaCerrada(false);
                      setHashFirma(null);
                    }}
                    className={`p-2.5 rounded-xl border transition cursor-pointer text-xs ${
                      isCurrent
                        ? "border-brand-700 bg-brand-50/70 font-bold"
                        : "border-neutral-100 hover:border-brand-200 hover:bg-neutral-50"
                    }`}
                  >
                    <p className="font-bold text-neutral-900">{p.paciente}</p>
                    <p className="text-[11px] text-neutral-500">
                      DNI {p.dni} &bull; {p.servicio}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Estado de Firma y Sello */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-sm space-y-2 text-xs">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 block">
              Gobernanza del Acto Médico
            </span>
            {notaCerrada && hashFirma ? (
              <div className="space-y-1 text-emerald-800 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                <div className="flex items-center gap-1 font-bold">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Historia Sellada & Firmada</span>
                </div>
                <p className="text-[10px] font-mono break-all text-emerald-700">Hash: {hashFirma}</p>
                <p className="text-[10px] text-emerald-600">Fecha: {fechaCierre}</p>
              </div>
            ) : (
              <div className="text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200">
                <div className="flex items-center gap-1 font-bold">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Acto Médico en Curso (Borrador)</span>
                </div>
                <p className="text-[10px] text-amber-700 mt-1">
                  Abierta por {profesionalColegiatura}. Recuerde sellar al concluir la consulta.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Panel Principal: Historia Clínica Completa NTS N.º 139-MINSA */}
        <div className="lg:col-span-3 space-y-5">
          {/* SECCIÓN 1: TRIAJE Y FUNCIONES VITALES */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-rose-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800">
                  1. Triaje & Funciones Vitales (NTS N.º 139-MINSA)
                </h3>
              </div>
              <span className="text-[11px] font-bold text-neutral-500">
                IMC: <strong className="text-brand-900">{imc}</strong> ({estadoNutricional})
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-0.5">P.A. (mmHg)</label>
                <input
                  type="text"
                  disabled={notaCerrada}
                  value={pa}
                  onChange={(e) => setPa(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg border border-neutral-200 text-xs font-bold text-neutral-900 focus:ring-1 focus:ring-brand-700"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-0.5">F.C. (lpm)</label>
                <input
                  type="text"
                  disabled={notaCerrada}
                  value={fc}
                  onChange={(e) => setFc(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg border border-neutral-200 text-xs font-bold text-neutral-900 focus:ring-1 focus:ring-brand-700"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-0.5">F.R. (rpm)</label>
                <input
                  type="text"
                  disabled={notaCerrada}
                  value={fr}
                  onChange={(e) => setFr(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg border border-neutral-200 text-xs font-bold text-neutral-900 focus:ring-1 focus:ring-brand-700"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-0.5">Temp (°C)</label>
                <input
                  type="text"
                  disabled={notaCerrada}
                  value={temp}
                  onChange={(e) => setTemp(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg border border-neutral-200 text-xs font-bold text-neutral-900 focus:ring-1 focus:ring-brand-700"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-0.5">SatO2 (%)</label>
                <input
                  type="text"
                  disabled={notaCerrada}
                  value={satO2}
                  onChange={(e) => setSatO2(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg border border-neutral-200 text-xs font-bold text-neutral-900 focus:ring-1 focus:ring-brand-700"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-0.5">Peso (kg)</label>
                <input
                  type="text"
                  disabled={notaCerrada}
                  value={peso}
                  onChange={(e) => setPeso(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg border border-neutral-200 text-xs font-bold text-neutral-900 focus:ring-1 focus:ring-brand-700"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-0.5">Talla (m)</label>
                <input
                  type="text"
                  disabled={notaCerrada}
                  value={talla}
                  onChange={(e) => setTalla(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg border border-neutral-200 text-xs font-bold text-neutral-900 focus:ring-1 focus:ring-brand-700"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: PERFIL OBSTÉTRICO ESPECIALIZADO (Médicos & Obstetras) */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <div className="flex items-center gap-2">
                <Baby className="w-4 h-4 text-purple-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800">
                  2. Evaluación Obstétrica Especializada (Ginecología & Obstetricia)
                </h3>
              </div>
              <label className="flex items-center gap-1.5 text-xs text-neutral-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={esCasoObstetrico}
                  onChange={(e) => setEsCasoObstetrico(e.target.checked)}
                  className="rounded text-brand-700 focus:ring-brand-700"
                />
                <span className="font-semibold">Activar Formulario Materno-Fetal</span>
              </label>
            </div>

            {esCasoObstetrico && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">
                    Fórmula Obstétrica (G P)
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      disabled={notaCerrada}
                      value={formulaG}
                      onChange={(e) => setFormulaG(e.target.value)}
                      placeholder="G2"
                      className="w-1/3 px-2 py-1.5 rounded-lg border border-neutral-200 text-xs font-bold"
                    />
                    <input
                      type="text"
                      disabled={notaCerrada}
                      value={formulaP}
                      onChange={(e) => setFormulaP(e.target.value)}
                      placeholder="P1001"
                      className="w-2/3 px-2 py-1.5 rounded-lg border border-neutral-200 text-xs font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">
                    F.U.R. (Última Regla)
                  </label>
                  <input
                    type="date"
                    disabled={notaCerrada}
                    value={fur}
                    onChange={(e) => setFur(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-neutral-200 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">
                    F.P.P. (Regla Naegele)
                  </label>
                  <input
                    type="date"
                    disabled={notaCerrada}
                    value={fpp}
                    onChange={(e) => setFpp(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-neutral-200 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">
                    Edad Gestacional (EG)
                  </label>
                  <input
                    type="text"
                    disabled={notaCerrada}
                    value={egSemanas}
                    onChange={(e) => setEgSemanas(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-neutral-200 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">
                    Altura Uterina (AU cm)
                  </label>
                  <input
                    type="text"
                    disabled={notaCerrada}
                    value={alturaUterina}
                    onChange={(e) => setAlturaUterina(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-neutral-200 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">
                    L.C.F. (Latidos Fetales)
                  </label>
                  <input
                    type="text"
                    disabled={notaCerrada}
                    value={lcf}
                    onChange={(e) => setLcf(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-neutral-200 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">
                    Presentación Fetal
                  </label>
                  <select
                    disabled={notaCerrada}
                    value={presentacion}
                    onChange={(e) => setPresentacion(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-neutral-200 text-xs font-bold"
                  >
                    <option>Cefálica</option>
                    <option>Podálica / Pelviana</option>
                    <option>Transversa</option>
                    <option>No determinada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">
                    Movimientos Fetales
                  </label>
                  <select
                    disabled={notaCerrada}
                    value={movFetales}
                    onChange={(e) => setMovFetales(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-neutral-200 text-xs font-bold"
                  >
                    <option>Presentes / Activos</option>
                    <option>Disminuidos</option>
                    <option>Ausentes</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* SECCIÓN 3: ANAMNESIS & ANTECEDENTES */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800 border-b border-neutral-100 pb-2">
              3. Anamnesis & Antecedentes Clínicos
            </h3>

            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">
                  Tiempo de Enfermedad / Evolución
                </label>
                <input
                  type="text"
                  disabled={notaCerrada}
                  value={tiempoEnfermedad}
                  onChange={(e) => setTiempoEnfermedad(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-neutral-200 text-xs"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">
                  Motivo de Consulta & Relato Cronológico *
                </label>
                <textarea
                  rows={2}
                  disabled={notaCerrada}
                  value={motivoConsulta}
                  onChange={(e) => setMotivoConsulta(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-1 focus:ring-brand-700"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-neutral-100">
              <div>
                <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">
                  Antecedentes Gineco-Obstétricos (Menarquia, RC, PAP, MAC)
                </label>
                <textarea
                  rows={2}
                  disabled={notaCerrada}
                  value={antecedentesGineco}
                  onChange={(e) => setAntecedentesGineco(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-1 focus:ring-brand-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">
                  Antecedentes Patológicos & Quirúrgicos
                </label>
                <textarea
                  rows={2}
                  disabled={notaCerrada}
                  value={antecedentesMedicos + " " + antecedentesQuirurgicos}
                  onChange={(e) => setAntecedentesMedicos(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-1 focus:ring-brand-700"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 4: EXAMEN FÍSICO SEGMENTARIO */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800 border-b border-neutral-100 pb-2">
              4. Examen Físico Segmentario & Ginecológico
            </h3>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">
                  Examen de Mamas (Descarte patológico)
                </label>
                <textarea
                  rows={2}
                  disabled={notaCerrada}
                  value={examenMamas}
                  onChange={(e) => setExamenMamas(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-neutral-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">
                  Examen Abdominal
                </label>
                <textarea
                  rows={2}
                  disabled={notaCerrada}
                  value={examenAbdomen}
                  onChange={(e) => setExamenAbdomen(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-neutral-200 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-600 mb-0.5">
                Evaluación Ginecológica (Especuloscopía / Tacto Vaginal / Flujos)
              </label>
              <textarea
                rows={2}
                disabled={notaCerrada}
                value={examenGinecologico}
                onChange={(e) => setExamenGinecologico(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-neutral-200 text-xs"
              />
            </div>
          </div>

          {/* SECCIÓN 5: DIAGNÓSTICOS CIE-10 ESTRUCTURADOS */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800">
                5. Diagnósticos CIE-10 (Norma Oficial MINSA) *
              </h3>
              <span className="text-[11px] text-neutral-400 font-medium">Mínimo 1 diagnóstico requerido</span>
            </div>

            <div className="space-y-2">
              {diagnosticos.map((dx) => (
                <div
                  key={dx.id}
                  className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-extrabold bg-brand-100 text-brand-900 px-2 py-0.5 rounded text-[11px]">
                      {dx.codigo}
                    </span>
                    <span className="font-bold text-neutral-800">{dx.descripcion}</span>
                    <span className="text-[10px] bg-white border border-neutral-200 px-2 py-0.5 rounded text-neutral-600 font-semibold">
                      {dx.tipo}
                    </span>
                  </div>

                  {!notaCerrada && (
                    <button
                      type="button"
                      onClick={() => handleEliminarDx(dx.id)}
                      className="text-neutral-400 hover:text-rose-600 transition p-1"
                      title="Quitar diagnóstico"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {!notaCerrada && (
              <form onSubmit={handleAgregarDiagnostico} className="grid sm:grid-cols-12 gap-2 pt-2">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    placeholder="Código (ej. Z34.8)"
                    value={nuevoDxCodigo}
                    onChange={(e) => setNuevoDxCodigo(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-neutral-300 text-xs font-mono font-bold"
                  />
                </div>
                <div className="sm:col-span-6">
                  <input
                    type="text"
                    placeholder="Descripción diagnóstica según CIE-10..."
                    value={nuevoDxDesc}
                    onChange={(e) => setNuevoDxDesc(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-neutral-300 text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <select
                    value={nuevoDxTipo}
                    onChange={(e) => setNuevoDxTipo(e.target.value as any)}
                    className="w-full px-2 py-1.5 rounded-xl border border-neutral-300 text-xs"
                  >
                    <option value="Presuntivo">Presuntivo</option>
                    <option value="Definitivo">Definitivo</option>
                    <option value="Repetido">Repetido</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="w-full py-1.5 bg-neutral-900 hover:bg-black text-white text-xs font-bold rounded-xl transition"
                  >
                    + Agregar Dx
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* SECCIÓN 6: GALERÍA DE IMÁGENES Y ADJUNTOS MÉDICOS */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-brand-700" />
                <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800">
                  6. Imágenes Médicas & Archivos Clínicos Adjuntos ({imagenes.length})
                </h3>
              </div>

              {!notaCerrada && (
                <button
                  type="button"
                  onClick={() => setShowUploadModal(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-xl border border-brand-200 transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Adjuntar Ecografía / Examen</span>
                </button>
              )}
            </div>

            {imagenes.length === 0 ? (
              <p className="text-xs text-neutral-400 py-3 text-center">
                No hay imágenes ni informes adjuntos en esta atención.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {imagenes.map((img) => (
                  <div
                    key={img.id}
                    className="group relative rounded-xl border border-neutral-200 overflow-hidden bg-neutral-50 shadow-sm hover:shadow-md transition"
                  >
                    <div className="h-28 w-full bg-neutral-900 overflow-hidden relative">
                      <img
                        src={img.url}
                        alt={img.titulo}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <button
                        type="button"
                        onClick={() => setModalVisualizarImg(img)}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white"
                      >
                        <Maximize2 className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="p-2.5 space-y-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-1.5 py-0.2 rounded inline-block">
                        {img.tipo}
                      </span>
                      <p className="text-xs font-bold text-neutral-900 truncate" title={img.titulo}>
                        {img.titulo}
                      </p>
                      <span className="text-[10px] text-neutral-400 block">{img.fecha}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECCIÓN 7: PLAN DE TRABAJO, TRATAMIENTO & RECETA DCI */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800 border-b border-neutral-100 pb-2">
              7. Plan de Trabajo, Exámenes Auxiliares & Receta Médica (DCI)
            </h3>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-neutral-600 mb-1">
                  Plan de Trabajo & Exámenes Solicitados
                </label>
                <textarea
                  rows={4}
                  disabled={notaCerrada}
                  value={planTrabajo}
                  onChange={(e) => setPlanTrabajo(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-neutral-200 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-600 mb-1">
                  Prescripción Farmacológica (Denominación Común Internacional)
                </label>
                <textarea
                  rows={4}
                  disabled={notaCerrada}
                  value={receta}
                  onChange={(e) => setReceta(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-neutral-200 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 8: ADENDAS INMUTABLES REGISTRADAS */}
          {adendas.length > 0 && (
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800 border-b border-neutral-100 pb-2">
                Adendas Inmutables Incorporadas
              </h3>
              {adendas.map((ad) => (
                <div key={ad.id} className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs space-y-1">
                  <div className="flex items-center justify-between text-neutral-500 font-mono text-[11px]">
                    <span>Fecha y Hora: {ad.fecha}</span>
                    <span>Hash Criptográfico: {ad.hash.slice(0, 16)}...</span>
                  </div>
                  <p className="text-neutral-900 font-medium">{ad.texto}</p>
                </div>
              ))}
            </div>
          )}

          {/* ACCIONES Y CIERRE DE HISTORIA CLÍNICA */}
          <div className="p-4 bg-white rounded-2xl border border-neutral-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3">
            {!notaCerrada ? (
              <button
                type="button"
                onClick={handleCerrarNota}
                className="inline-flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md transition"
              >
                <Lock className="w-4 h-4" />
                <span>Sellar y Firmar Historia Clínica ({profesionalColegiatura.split(" ")[0]})</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowAdendaModal(true)}
                className="inline-flex items-center gap-2 bg-neutral-900 hover:bg-black text-white font-bold text-sm px-5 py-3 rounded-xl shadow-md transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Incorporar Adenda Inmutable (NTS N.º 139)</span>
              </button>
            )}

            <div className="text-right text-xs text-neutral-400">
              <p>Firma Electrónica Avanzada: {profesionalNombre}</p>
              <p className="font-mono text-[11px] text-neutral-500">{profesionalColegiatura} &bull; Sede {sede}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Ingreso Directo de Paciente */}
      {showNewPatientModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-neutral-200">
            <h3 className="text-lg font-black text-brand-900 mb-1">Ingreso Directo a Consultorio</h3>
            <p className="text-xs text-neutral-500 mb-4">
              Registrar paciente para apertura de historia clínica inmediata en Sede {sede}.
            </p>

            <form onSubmit={handleCrearPacienteConsultorio} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">DNI *</label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    value={nuevoDni}
                    onChange={(e) => setNuevoDni(e.target.value)}
                    placeholder="8 dígitos"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-brand-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Edad (Años) *</label>
                  <input
                    type="number"
                    required
                    value={nuevoEdad}
                    onChange={(e) => setNuevoEdad(e.target.value)}
                    placeholder="Ej. 28"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-brand-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Nombres *</label>
                  <input
                    type="text"
                    required
                    value={nuevoNombres}
                    onChange={(e) => setNuevoNombres(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-brand-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Apellidos *</label>
                  <input
                    type="text"
                    required
                    value={nuevoApellidos}
                    onChange={(e) => setNuevoApellidos(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-brand-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="tel"
                    value={nuevoTelefono}
                    onChange={(e) => setNuevoTelefono(e.target.value)}
                    placeholder="999 999 999"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-brand-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Grupo Sanguíneo</label>
                  <select
                    value={nuevoGrupo}
                    onChange={(e) => setNuevoGrupo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-brand-700"
                  >
                    <option>O Rh(+)</option>
                    <option>O Rh(-)</option>
                    <option>A Rh(+)</option>
                    <option>A Rh(-)</option>
                    <option>B Rh(+)</option>
                    <option>AB Rh(+)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Alergias Medicamentosas</label>
                <input
                  type="text"
                  value={nuevoAlergias}
                  onChange={(e) => setNuevoAlergias(e.target.value)}
                  placeholder="Ej. Ninguna / Penicilina / Sulfas..."
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-brand-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Motivo / Servicio Solicitado</label>
                <select
                  value={nuevoServicio}
                  onChange={(e) => setNuevoServicio(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-brand-700"
                >
                  <option>Control Prenatal Reenfocado</option>
                  <option>Ecografía Especializada (3D / 4D / 5D / Doppler)</option>
                  <option>Consulta Médica Ginecológica</option>
                  <option>Consulta de Medicina General</option>
                  <option>Planificación Familiar & Asesoría</option>
                  <option>Prevención de Cáncer Cervical (PAP/Colposcopía)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowNewPatientModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-brand-700 hover:bg-brand-800 text-white rounded-xl shadow"
                >
                  Abrir Historia en Consultorio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Subir Imagen o Informe */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-neutral-200">
            <h3 className="text-lg font-black text-brand-900 mb-1">Adjuntar Imagen o Examen Clínico</h3>
            <p className="text-xs text-neutral-500 mb-4">
              Incorpora ecografías, fotos colposcópicas o informes a la historia clínica.
            </p>

            <form onSubmit={handleSubirImagen} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Tipo de Estudio *</label>
                <select
                  value={nuevoImgTipo}
                  onChange={(e) => setNuevoImgTipo(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-brand-700"
                >
                  <option value="Ecografía">Ecografía Obstétrica / Ginecológica</option>
                  <option value="Laboratorio">Informe de Laboratorio (Hemograma, etc.)</option>
                  <option value="Colposcopía">Foto / Informe de Colposcopía</option>
                  <option value="Otro">Otro Estudio Clínico</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Título / Descripción del Estudio *</label>
                <input
                  type="text"
                  required
                  value={nuevoImgTitulo}
                  onChange={(e) => setNuevoImgTitulo(e.target.value)}
                  placeholder="Ej. Ecografía 4D Sem 24 - Corte Facial"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-brand-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">URL de Imagen o Archivo (Opcional)</label>
                <input
                  type="url"
                  value={nuevoImgUrl}
                  onChange={(e) => setNuevoImgUrl(e.target.value)}
                  placeholder="https://... (o se usará muestra clínica institucional)"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-brand-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-brand-700 hover:bg-brand-800 text-white rounded-xl shadow"
                >
                  Adjuntar a la Historia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Visor Modal de Imagen en Gran Resolución */}
      {modalVisualizarImg && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="max-w-4xl w-full bg-neutral-900 rounded-3xl overflow-hidden shadow-2xl border border-neutral-800">
            <div className="p-4 bg-neutral-950 flex items-center justify-between text-white border-b border-neutral-800">
              <div>
                <h4 className="font-bold text-sm">{modalVisualizarImg.titulo}</h4>
                <p className="text-[11px] text-neutral-400">
                  {modalVisualizarImg.tipo} &bull; {modalVisualizarImg.fecha}
                </p>
              </div>
              <button
                onClick={() => setModalVisualizarImg(null)}
                className="p-2 rounded-xl hover:bg-neutral-800 transition text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-black">
              <img
                src={modalVisualizarImg.url}
                alt={modalVisualizarImg.titulo}
                className="max-h-[70vh] max-w-full object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal Adenda Inmutable */}
      {showAdendaModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-neutral-200">
            <h3 className="text-lg font-black text-brand-900 mb-1">Incorporar Adenda a Nota Médica</h3>
            <p className="text-xs text-neutral-500 mb-4">
              Por normativa NTS N.º 139-MINSA, las notas selladas no pueden modificarse. Cualquier precisión debe incorporarse como adenda fechada e inmutable.
            </p>

            <form onSubmit={handleAgregarAdenda} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Texto de la Adenda *</label>
                <textarea
                  rows={4}
                  required
                  value={textoAdenda}
                  onChange={(e) => setTextoAdenda(e.target.value)}
                  placeholder="Especifique la información clínica adicional o rectificación..."
                  className="w-full p-3 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdendaModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-neutral-900 hover:bg-black text-white rounded-xl shadow"
                >
                  Guardar Adenda Inmutable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}