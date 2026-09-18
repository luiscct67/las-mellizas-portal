"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, KeyRound, Lock, ArrowRight, UserCheck, Stethoscope, ReceiptText, MapPin, Building2 } from "lucide-react";

interface CuentaDemo {
  email: string;
  rol: "RECEPCION" | "PROFESIONAL" | "CAJA" | "SUPERVISION" | "ADMIN";
  nombre: string;
  sede: "Independencia" | "Vivanco" | "Todas las Sedes";
  colegiatura?: string;
  cargo: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [selectedSedeTab, setSelectedSedeTab] = useState<"Independencia" | "Vivanco" | "Central">("Independencia");
  const [email, setEmail] = useState("recepcion.ind@lasmellizasperu.com");
  const [password, setPassword] = useState("••••••••••••");
  const [selectedRole, setSelectedRole] = useState<"RECEPCION" | "PROFESIONAL" | "CAJA" | "SUPERVISION" | "ADMIN">("RECEPCION");
  const [selectedSede, setSelectedSede] = useState<"Independencia" | "Vivanco" | "Todas las Sedes">("Independencia");
  const [colegiatura, setColegiatura] = useState<string>("");
  const [nombrePersonal, setNombrePersonal] = useState<string>("Lucía Mendoza (Admisión)");
  const [loading, setLoading] = useState(false);

  const cuentasPorSede: Record<"Independencia" | "Vivanco" | "Central", CuentaDemo[]> = {
    Independencia: [
      {
        email: "recepcion.ind@lasmellizasperu.com",
        rol: "RECEPCION",
        nombre: "Lucía Mendoza (Admisión)",
        sede: "Independencia",
        cargo: "Recepción & Citas",
      },
      {
        email: "medico.ind@lasmellizasperu.com",
        rol: "PROFESIONAL",
        nombre: "Dr. Carlos Benavides Velarde",
        sede: "Independencia",
        colegiatura: "CMP 54321 / RNE 23456",
        cargo: "Médico Gineco-Obstetra",
      },
      {
        email: "caja.ind@lasmellizasperu.com",
        rol: "CAJA",
        nombre: "Patricia Huamán (Caja)",
        sede: "Independencia",
        cargo: "Caja & Facturación",
      },
    ],
    Vivanco: [
      {
        email: "recepcion.viv@lasmellizasperu.com",
        rol: "RECEPCION",
        nombre: "Marilú Quispe (Admisión)",
        sede: "Vivanco",
        cargo: "Recepción & Citas",
      },
      {
        email: "obstetra.viv@lasmellizasperu.com",
        rol: "PROFESIONAL",
        nombre: "Lic. Sonia Rivas Alarcón",
        sede: "Vivanco",
        colegiatura: "COP 12890",
        cargo: "Licenciada en Obstetricia",
      },
      {
        email: "caja.viv@lasmellizasperu.com",
        rol: "CAJA",
        nombre: "Rosaura Pérez (Caja)",
        sede: "Vivanco",
        cargo: "Caja & Cobranzas",
      },
    ],
    Central: [
      {
        email: "supervision@lasmellizasperu.com",
        rol: "SUPERVISION",
        nombre: "Dra. Eliana Suárez (Auditoría Médica)",
        sede: "Todas las Sedes",
        colegiatura: "CMP 38920 / Auditor Médico",
        cargo: "Supervisión & Auditoría Red",
      },
      {
        email: "admin@lasmellizasperu.com",
        rol: "ADMIN",
        nombre: "Dirección Técnica Red",
        sede: "Todas las Sedes",
        cargo: "Administración General",
      },
    ],
  };

  const handleSelectCuenta = (cta: CuentaDemo) => {
    setEmail(cta.email);
    setSelectedRole(cta.rol);
    setSelectedSede(cta.sede);
    setNombrePersonal(cta.nombre);
    setColegiatura(cta.colegiatura || "");
    setPassword("••••••••••••");
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Guardar en sesión de navegador
    sessionStorage.setItem("lm_rol", selectedRole);
    sessionStorage.setItem("lm_user", email);
    sessionStorage.setItem("lm_sede", selectedSede);
    sessionStorage.setItem("lm_nombre", nombrePersonal);
    sessionStorage.setItem("lm_colegiatura", colegiatura);

    setTimeout(() => {
      setLoading(false);
      if (selectedRole === "RECEPCION") router.push("/recepcion");
      else if (selectedRole === "PROFESIONAL") router.push("/hce");
      else if (selectedRole === "CAJA") router.push("/caja");
      else router.push("/supervision");
    }, 600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-100/50 p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-brand-200/70 p-8 shadow-xl shadow-brand-900/5">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-brand-700 text-white flex items-center justify-center font-extrabold text-xl mx-auto mb-3 shadow-lg shadow-brand-700/25">
            LM
          </div>
          <h2 className="text-2xl font-black text-brand-900">Iniciar Sesión</h2>
          <p className="text-xs text-neutral-500 mt-1">Ecosistema Digital Las Mellizas Perú S.A.C.</p>
        </div>

        {/* Pestañas para elegir Sede */}
        <div className="mb-6">
          <label className="block text-[11px] font-extrabold text-neutral-500 uppercase tracking-wider mb-2">
            1. Seleccionar Sede Institucional
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-100 rounded-2xl border border-neutral-200">
            <button
              type="button"
              onClick={() => {
                setSelectedSedeTab("Independencia");
                handleSelectCuenta(cuentasPorSede.Independencia[0]);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                selectedSedeTab === "Independencia"
                  ? "bg-white text-brand-900 shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-brand-700" />
              <span>Independencia</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedSedeTab("Vivanco");
                handleSelectCuenta(cuentasPorSede.Vivanco[0]);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                selectedSedeTab === "Vivanco"
                  ? "bg-white text-brand-900 shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-brand-700" />
              <span>Vivanco</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedSedeTab("Central");
                handleSelectCuenta(cuentasPorSede.Central[0]);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                selectedSedeTab === "Central"
                  ? "bg-white text-brand-900 shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-purple-700" />
              <span>Dirección Red</span>
            </button>
          </div>
        </div>

        {/* Cuentas preconfiguradas para la sede seleccionada */}
        <div className="mb-6">
          <label className="block text-[11px] font-extrabold text-neutral-500 uppercase tracking-wider mb-2">
            2. Cuentas Oficiales Disponibles ({selectedSedeTab})
          </label>
          <div className="space-y-2">
            {cuentasPorSede[selectedSedeTab].map((cta) => {
              const isSelected = email === cta.email;
              return (
                <button
                  key={cta.email}
                  type="button"
                  onClick={() => handleSelectCuenta(cta)}
                  className={`w-full p-3 rounded-2xl border text-left transition flex items-center justify-between ${
                    isSelected
                      ? "border-brand-700 bg-brand-50/70 ring-2 ring-brand-700/20"
                      : "border-neutral-200/80 bg-neutral-50/50 hover:bg-neutral-50 hover:border-neutral-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                        cta.rol === "RECEPCION"
                          ? "bg-emerald-100 text-emerald-800"
                          : cta.rol === "PROFESIONAL"
                          ? "bg-blue-100 text-blue-800"
                          : cta.rol === "CAJA"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      {cta.rol === "RECEPCION" && <UserCheck className="w-4 h-4" />}
                      {cta.rol === "PROFESIONAL" && <Stethoscope className="w-4 h-4" />}
                      {cta.rol === "CAJA" && <ReceiptText className="w-4 h-4" />}
                      {(cta.rol === "SUPERVISION" || cta.rol === "ADMIN") && <Shield className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-neutral-900">{cta.cargo}</span>
                        <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-neutral-200 text-neutral-500 font-semibold">
                          {cta.rol}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-600 font-medium">{cta.nombre}</p>
                      {cta.colegiatura && (
                        <p className="text-[10px] text-blue-700 font-mono font-bold mt-0.5">
                          {cta.colegiatura}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-mono text-neutral-400 block">{cta.email.split("@")[0]}</span>
                    {isSelected && (
                      <span className="text-[10px] font-bold text-brand-700 bg-brand-100 px-2 py-0.5 rounded-full inline-block mt-1">
                        Activo
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Formulario de Login */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
              Correo Institucional
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-700 transition bg-neutral-50/50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-700 transition bg-neutral-50/50"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-brand-700 hover:bg-brand-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition disabled:opacity-50"
            >
              <span>{loading ? "Verificando perfil y sede..." : `Acceder a Sede ${selectedSede}`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        <div className="mt-6 pt-5 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Aislamiento Multisede Estricto</span>
          </div>
          <span>Ley N.º 26842 &bull; NTS N.º 139</span>
        </div>
      </div>
    </div>
  );
}