"use client";

import { useState, useEffect } from "react";
import { Stethoscope, FileText, CheckCircle, PlusCircle, Lock, Sparkles, Clock, AlertTriangle, ShieldCheck, MapPin, Award } from "lucide-react";

interface PacienteHce {
  id: string;
  paciente: string;
  dni: string;
  edad: string;
  servicio: string;
  sede: "Independencia" | "Vivanco";
}

export default function HcePage() {
  const [sede, setSede] = useState<string>("Independencia");
  const [profesionalNombre, setProfesionalNombre] = useState<string>("Dr. Carlos Benavides Velarde");
  const [profesionalColegiatura, setProfesionalColegiatura] = useState<string>("CMP 54321 / RNE 23456");

  // Pacientes en consultorio por sede
  const pacientesIndependencia: PacienteHce[] = [
    {
      id: "enc-ind-001",
      paciente: "Carla Mendoza Quispe",
      dni: "45892147",
      edad: "28 años",
      servicio: "Control Prenatal Reenfocado",
      sede: "Independencia",
    },
    {
      id: "enc-ind-002",
      paciente: "Yolanda Flores Huamán",
      dni: "71245896",
      edad: "32 años",
      servicio: "Ecografía Especializada (4D)",
      sede: "Independencia",
    },
  ];

  const pacientesVivanco: PacienteHce[] = [
    {
      id: "enc-viv-001",
      paciente: "Roxana Palomino Quispe",
      dni: "42198754",
      edad: "25 años",
      servicio: "Control Prenatal Reenfocado",
      sede: "Vivanco",
    },
    {
      id: "enc-viv-002",
      paciente: "Diana Huamán Cárdenas",
      dni: "70541298",
      edad: "29 años",
      servicio: "Planificación Familiar Integral",
      sede: "Vivanco",
    },
  ];

  const [selectedPatient, setSelectedPatient] = useState<PacienteHce>(pacientesIndependencia[0]);

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

  const colaSede = (sede === "Vivanco" ? pacientesVivanco : pacientesIndependencia).filter(
    p => p.id !== selectedPatient.id
  );

  // Estado del formulario clínico
  const [motivo, setMotivo] = useState(
    "Control de rutina 24 semanas de gestación. Refiere movimientos fetales activos, sin pérdidas transvaginales."
  );
  const [antecedentes, setAntecedentes] = useState(
    "G2 P1001. No alergias medicamentosas conocidas. Sin cirugías previas."
  );
  const [examenFisico, setExamenFisico] = useState(
    "PA: 110/70 mmHg. FC: 78 lpm. AU: 22 cm. LCF: 142 lpm regulares. Feto único en situación longitudinal cefálico."
  );
  const [diagnostico, setDiagnostico] = useState("Z34.8 - Supervisión de otros embarazos normales (24 sem)");
  const [planTratamiento, setPlanTratamiento] = useState(
    "1. Continuar con Sulfato Ferroso 60mg + Ácido Fólico 400mcg VO c/24h.\n2. Solicitar Ecografía Obstétrica Morfológica de control.\n3. Signos de alarma explicados a la gestante.\n4. Próximo control en 4 semanas."
  );

  const [notaCerrada, setNotaCerrada] = useState(false);
  const [hashFirma, setHashFirma] = useState<string | null>(null);
  const [showAdendaModal, setShowAdendaModal] = useState(false);
  const [textoAdenda, setTextoAdenda] = useState("");
  const [adendas, setAdendas] = useState<{ id: string; fecha: string; texto: string; hash: string }[]>([]);

  // Sellar y cerrar nota médica
  const handleCerrarNota = () => {
    if (!diagnostico.trim()) {
      alert("Debe ingresar un diagnóstico CIE-10 antes de cerrar la nota.");
      return;
    }
    const simulatedHash = Array.from(crypto.getRandomValues(new Uint8Array(20)))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    setHashFirma(simulatedHash);
    setNotaCerrada(true);
  };

  // Agregar adenda médica
  const handleAgregarAdenda = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textoAdenda.trim()) return;

    const nueva = {
      id: `ad-${Date.now().toString().slice(-4)}`,
      fecha: new Date().toLocaleString("es-PE"),
      texto: textoAdenda,
      hash: Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, "0"))
        .join(""),
    };

    setAdendas([...adendas, nueva]);
    setTextoAdenda("");
    setShowAdendaModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Banner de Responsabilidad Profesional y Sede */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-neutral-900 text-sm sm:text-base">{profesionalNombre}</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                <Award className="w-3 h-3 text-blue-600" />
                {profesionalColegiatura}
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5 flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-brand-700" />
              <span>Sede Operativa Asignada: <strong>{sede}</strong></span>
              <span className="text-neutral-300">&bull;</span>
              <span className="text-emerald-700 font-medium">Acto Médico Activo &bull; NTS N.º 139-MINSA</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-neutral-600 bg-neutral-100 px-3 py-1.5 rounded-xl border border-neutral-200">
            Control Need-to-Know: Solo Pacientes de {sede}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Panel lateral: Paciente actual y cola de la sede */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-sm">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200/50 inline-block mb-3">
              Paciente en Atención ({sede})
            </span>
            <h2 className="text-base font-bold text-neutral-900 leading-snug">{selectedPatient.paciente}</h2>
            <div className="mt-3 space-y-1 text-xs text-neutral-600">
              <p><strong className="text-neutral-700">DNI:</strong> {selectedPatient.dni}</p>
              <p><strong className="text-neutral-700">Edad:</strong> {selectedPatient.edad}</p>
              <p><strong className="text-neutral-700">Servicio:</strong> {selectedPatient.servicio}</p>
              <p><strong className="text-neutral-700">Sede:</strong> Sede {selectedPatient.sede}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">
              Siguientes en Espera ({sede})
            </h3>
            {colaSede.length === 0 ? (
              <p className="text-xs text-neutral-400">No hay más pacientes en espera para esta sede.</p>
            ) : (
              <div className="space-y-2">
                {colaSede.map(pac => (
                  <div
                    key={pac.id}
                    onClick={() => {
                      setSelectedPatient(pac);
                      setNotaCerrada(false);
                      setHashFirma(null);
                    }}
                    className="p-2.5 rounded-xl border border-neutral-100 hover:border-brand-200 hover:bg-neutral-50 transition cursor-pointer text-xs"
                  >
                    <p className="font-bold text-neutral-800">{pac.paciente}</p>
                    <p className="text-[11px] text-neutral-500">{pac.servicio}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 text-[11px] text-amber-900 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
              <span>Garantía de Secreto Médico</span>
            </div>
            <p className="text-[10px] text-amber-800 leading-relaxed">
              El personal de Recepción y Caja no tiene visibilidad de este formulario ni de los diagnósticos CIE-10 redactados.
            </p>
          </div>
        </div>

        {/* Panel Principal: Redacción Médica */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-neutral-100">
              <div>
                <h3 className="text-lg font-black text-neutral-900">Nota de Evolución Clínica</h3>
                <p className="text-xs text-neutral-500">
                  Formato Oficial NTS N.º 139-MINSA/DGIEM &bull; Sede {sede}
                </p>
              </div>

              {notaCerrada && hashFirma && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Nota Cerrada &bull; Sello: {hashFirma.slice(0, 10)}...</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  1. Motivo de Consulta y Anamnesis
                </label>
                <textarea
                  disabled={notaCerrada}
                  rows={2}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="w-full p-3 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700 disabled:bg-neutral-50 disabled:text-neutral-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  2. Antecedentes Gineco-Obstétricos
                </label>
                <textarea
                  disabled={notaCerrada}
                  rows={2}
                  value={antecedentes}
                  onChange={(e) => setAntecedentes(e.target.value)}
                  className="w-full p-3 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700 disabled:bg-neutral-50 disabled:text-neutral-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  3. Examen Físico / Evaluación Obstétrica
                </label>
                <textarea
                  disabled={notaCerrada}
                  rows={2}
                  value={examenFisico}
                  onChange={(e) => setExamenFisico(e.target.value)}
                  className="w-full p-3 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700 disabled:bg-neutral-50 disabled:text-neutral-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  4. Diagnóstico (CIE-10) *
                </label>
                <input
                  type="text"
                  disabled={notaCerrada}
                  value={diagnostico}
                  onChange={(e) => setDiagnostico(e.target.value)}
                  className="w-full p-3 rounded-xl border border-neutral-200 text-sm font-semibold text-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-700 disabled:bg-neutral-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  5. Plan de Trabajo, Tratamiento & Receta
                </label>
                <textarea
                  disabled={notaCerrada}
                  rows={4}
                  value={planTratamiento}
                  onChange={(e) => setPlanTratamiento(e.target.value)}
                  className="w-full p-3 rounded-xl border border-neutral-200 text-sm font-mono text-xs focus:outline-none focus:ring-2 focus:ring-brand-700 disabled:bg-neutral-50 disabled:text-neutral-600"
                />
              </div>
            </div>

            {/* Adendas registradas */}
            {adendas.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-neutral-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                  Adendas Inmutables Incorporadas
                </h4>
                {adendas.map((ad) => (
                  <div key={ad.id} className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs space-y-1">
                    <div className="flex items-center justify-between text-neutral-500 font-mono text-[11px]">
                      <span>Fecha: {ad.fecha}</span>
                      <span>Hash: {ad.hash.slice(0, 12)}...</span>
                    </div>
                    <p className="text-neutral-800 font-medium">{ad.texto}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Acciones de Nota */}
            <div className="pt-4 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-3">
              {!notaCerrada ? (
                <button
                  type="button"
                  onClick={handleCerrarNota}
                  className="inline-flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-sm transition"
                >
                  <Lock className="w-4 h-4" />
                  <span>Sellar y Firmar Electrónicamente ({profesionalColegiatura.split(" ")[0]})</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAdendaModal(true)}
                  className="inline-flex items-center gap-2 bg-neutral-900 hover:bg-black text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-sm transition"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Incorporar Adenda Inmutable</span>
                </button>
              )}

              <span className="text-xs text-neutral-400">
                Firma y colegiatura institucional anexadas automáticamente al cierre.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Adenda */}
      {showAdendaModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-neutral-200">
            <h3 className="text-lg font-black text-brand-900 mb-1">Incorporar Adenda a Nota Médica</h3>
            <p className="text-xs text-neutral-500 mb-4">
              Por normativa NTS N.º 139-MINSA, las notas selladas no pueden modificarse. Cualquier precisión debe incorporarse como adenda fechada e inmutable.
            </p>

            <form onSubmit={handleAgregarAdenda} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Texto de la Adenda *
                </label>
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