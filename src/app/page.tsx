import Link from "next/link";
import { Shield, ArrowRight, UserCheck, Stethoscope, ReceiptText, ShieldCheck } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-brand-50 via-white to-brand-100/30">
      <header className="border-b border-brand-200/60 bg-white/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-700 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-brand-700/20">
            LM
          </div>
          <div>
            <h1 className="font-extrabold text-brand-900 text-lg leading-tight">Las Mellizas Perú S.A.C.</h1>
            <p className="text-xs text-neutral-500">Portal Clínico & Administrativo v1.0</p>
          </div>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-sm transition-all"
        >
          <span>Acceder al Portal</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16 flex-1 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-800 text-xs font-bold px-3.5 py-1.5 rounded-full border border-brand-200 mb-6">
          <Shield className="w-3.5 h-3.5" />
          <span>Acceso Restringido y Seguro — Personal Autorizado</span>
        </div>

        <h2 className="text-4xl sm:text-5xl font-extrabold text-neutral-900 tracking-tight max-w-3xl mb-6">
          Gestión Clínica y Financiera de Alta Disponibilidad
        </h2>
        <p className="text-neutral-600 text-lg max-w-2xl mb-12">
          Plataforma moderna para la coordinación de atenciones, redacción confidencial de notas médicas y control de caja en las sedes de Huamanga.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full text-left">
          <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <UserCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-neutral-900 mb-1">Recepción</h3>
            <p className="text-xs text-neutral-500">Admisión rápida, padrón de pacientes y asignación de turno en sala.</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Stethoscope className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-neutral-900 mb-1">Consultorio Médico</h3>
            <p className="text-xs text-neutral-500">HCE estructurada con autoguardado, diagnóstico CIE-10 y adendas firmadas.</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <ReceiptText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-neutral-900 mb-1">Caja y Cobros</h3>
            <p className="text-xs text-neutral-500">Cobros por Yape, Plin, Tarjeta y Efectivo con aislamiento clínico total.</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-neutral-900 mb-1">Supervisión</h3>
            <p className="text-xs text-neutral-500">Trazabilidad en tiempo real, auditoría append-only y cumplimiento normativo.</p>
          </div>
        </div>
      </main>

      <footer className="border-t border-neutral-200/80 bg-white px-6 py-4 text-center text-xs text-neutral-500">
        Las Mellizas Perú S.A.C. &bull; RUC 20611827335 &bull; Sedes Independencia y Vivanco, Huamanga, Ayacucho
      </footer>
    </div>
  );
}