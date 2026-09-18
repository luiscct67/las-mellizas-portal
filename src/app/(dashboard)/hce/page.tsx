"use client";

import { useState } from "react";
import { Stethoscope, FileText, CheckCircle, PlusCircle, Lock, Sparkles, Clock, AlertTriangle } from "lucide-react";

export default function HcePage() {
  const [selectedPatient, setSelectedPatient] = useState({
    id: "enc-001",
    paciente: "Carla Mendoza Quispe",
    dni: "45892147",
    edad: "28 años",
    servicio: "Control Prenatal Reenfocado",
  });

  // Estado del formulario clínico
  const [motivo, setMotivo] = useState("Control de rutina 24 semanas de gestación. Refiere movimientos fetales activos, sin pérdidas transvaginales.");
  const [antecedentes, setAntecedentes] = useState("G2 P1001. No alergias medicamentosas conocidas. Sin cirugías previas.");
  const [examenFisico, setExamenFisico] = useState("PA: 110/70 mmHg. FC: 78 lpm. AU: 22 cm. LCF: 142 lpm regulares. Feto único en situación longitudinal cefálico.");
  const [diagnostico, setDiagnostico] = useState("Z34.8 - Supervisión de otros embarazos normales (24 sem)");
  const [planTratamiento, setPlanTratamiento] = useState("1. Continuar con Sulfato Ferroso 60mg + Ácido Fólico 400mcg VO c/24h.\n2. Solicitar Ecografía Obstétrica Morfológica de control.\n3. Signos de alarma explicados a la gestante.\n4. Próximo control en 4 semanas.");

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
      {/* Cabecera del Consultorio */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Consultorio Médico — Historia Clínica</h1>
          <p className="text-xs text-neutral-500">Redacción estructurada, autoguardado inmutable y sellado normativo (MINSA).</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold">Borrador Autoguardado</span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Panel lateral: Paciente actual y cola */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-sm">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200/50 inline-block mb-3">
              Paciente en Atención
            </span>
            <h2 className="text-base font-bold text-neutral-900 leading-snug">{selectedPatient.paciente}</h2>
            <div className="mt-3 space-y-1 text-xs text-neutral-600">
              <p><strong className="text-neutral-700">DNI:</strong> {selectedPatient.dni}</p>
              <p><strong className="text-neutral-700">Edad:</strong> {selectedPatient.edad}</p>
              <p><strong className="text-neutral-700">Servicio:</strong> {selectedPatient.servicio}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">Siguientes en Espera</h3>
            <div className="space-y-2">
              <div className="p-2.5 rounded-xl border border-neutral-100 hover:border-brand-200 transition cursor-pointer text-xs">
                <p className="font-bold text-neutral-800">Yolanda Flores Huamán</p>
                <p className="text-[11px] text-neutral-500">Ecografía Especializada (4D)</p>
              </div>
              <div className="p-2.5 rounded-xl border border-neutral-100 hover:border-brand-200 transition cursor-pointer text-xs">
                <p className="font-bold text-neutral-800">María Elena Paucar Rojas</p>
                <p className="text-[11px] text-neutral-500">Salud Integral de la Mujer</p>
              </div>
            </div>
          </div>
        </div>

        {/* Panel principal: Formulario HCE */}
        <div className="lg:col-span-3 space-y-5">
          <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-700" />
                <h2 className="font-extrabold text-neutral-900">Nota de Evolución / Atención Clínica</h2>
              </div>
              {notaCerrada ? (
                <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-xl border border-emerald-200">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Nota Cerrada &bull; Firma: {hashFirma?.substring(0, 8)}...</span>
                </div>
              ) : (
                <span className="text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 font-semibold">
                  Edición Abierta
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  1. Motivo de Consulta & Anamnesis
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
                  2. Antecedentes Gineco-Obstétricos & Patológicos
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

            {/* Acciones de Nota */}
            <div className="pt-4 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-3">
              {!notaCerrada ? (
                <button
                  type="button"
                  onClick={handleCerrarNota}
                  className="inline-flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-sm transition"
                >
                  <Lock className="w-4 h-4" />
                  <span>Sellar y Firmar Nota Clínica</span>
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
                Aislamiento Activo: Los diagnósticos y tratamientos no son visibles para el personal de Caja.
              </span>
            </div>
          </div>

          {/* Bloque de Adendas si existen */}
          {adendas.length > 0 && (
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-sm text-neutral-900">Adendas Médicas Incorporadas</h3>
              {adendas.map((ad) => (
                <div key={ad.id} className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-neutral-500 font-mono text-[10px]">
                    <span>Fecha: {ad.fecha}</span>
                    <span>Hash Firma: {ad.hash.substring(0, 12)}...</span>
                  </div>
                  <p className="text-neutral-800">{ad.texto}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Nueva Adenda */}
      {showAdendaModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-neutral-200">
            <h3 className="text-lg font-black text-neutral-900 mb-1">Nueva Adenda Médica</h3>
            <p className="text-xs text-neutral-500 mb-4">
              Por normativa del MINSA, las notas selladas no pueden modificarse. Las aclaraciones se incorporan como adendas inmutables.
            </p>

            <form onSubmit={handleAgregarAdenda} className="space-y-4">
              <textarea
                required
                rows={4}
                value={textoAdenda}
                onChange={(e) => setTextoAdenda(e.target.value)}
                placeholder="Escriba la precisión o aclaración médica..."
                className="w-full p-3 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
              />

              <div className="flex items-center justify-end gap-2.5">
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
                  Firmar y Agregar Adenda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}