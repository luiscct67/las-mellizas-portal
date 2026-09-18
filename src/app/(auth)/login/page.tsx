"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, KeyRound, Lock, ArrowRight, UserCheck, Stethoscope, ReceiptText } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<"RECEPCION" | "PROFESIONAL" | "CAJA" | "SUPERVISION">("RECEPCION");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Guardar rol en almacenamiento de sesión para la navegación del demo / portal
    sessionStorage.setItem("lm_rol", selectedRole);
    sessionStorage.setItem("lm_user", email || "usuario.institucional@lasmellizasperu.com");
    sessionStorage.setItem("lm_sede", "Independencia");

    setTimeout(() => {
      setLoading(false);
      if (selectedRole === "RECEPCION") router.push("/recepcion");
      else if (selectedRole === "PROFESIONAL") router.push("/hce");
      else if (selectedRole === "CAJA") router.push("/caja");
      else router.push("/supervision");
    }, 600);
  };

  const setDemoRole = (role: "RECEPCION" | "PROFESIONAL" | "CAJA" | "SUPERVISION", defaultEmail: string) => {
    setSelectedRole(role);
    setEmail(defaultEmail);
    setPassword("••••••••••••");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-100/50 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-brand-200/70 p-8 shadow-xl shadow-brand-900/5">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-brand-700 text-white flex items-center justify-center font-extrabold text-xl mx-auto mb-4 shadow-lg shadow-brand-700/25">
            LM
          </div>
          <h2 className="text-2xl font-black text-brand-900">Iniciar Sesión</h2>
          <p className="text-xs text-neutral-500 mt-1">Portal Clínico &bull; Las Mellizas Perú S.A.C.</p>
        </div>

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
              placeholder="nombre@lasmellizasperu.com"
              className="w-full px-4 py-3 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-brand-700 transition"
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
              placeholder="••••••••••••"
              className="w-full px-4 py-3 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-brand-700 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
              Rol de Acceso Asignado
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDemoRole("RECEPCION", "recepcion.ind@lasmellizasperu.com")}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition text-left ${
                  selectedRole === "RECEPCION"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600"
                    : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Recepción</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoRole("PROFESIONAL", "obstetricia@lasmellizasperu.com")}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition text-left ${
                  selectedRole === "PROFESIONAL"
                    ? "border-blue-600 bg-blue-50 text-blue-800 ring-1 ring-blue-600"
                    : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                <Stethoscope className="w-4 h-4 text-blue-600" />
                <span>Médico / HCE</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoRole("CAJA", "caja@lasmellizasperu.com")}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition text-left ${
                  selectedRole === "CAJA"
                    ? "border-amber-600 bg-amber-50 text-amber-800 ring-1 ring-amber-600"
                    : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                <ReceiptText className="w-4 h-4 text-amber-600" />
                <span>Caja</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoRole("SUPERVISION", "direccion@lasmellizasperu.com")}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition text-left ${
                  selectedRole === "SUPERVISION"
                    ? "border-purple-600 bg-purple-50 text-purple-800 ring-1 ring-purple-600"
                    : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                <Shield className="w-4 h-4 text-purple-600" />
                <span>Supervisión</span>
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-brand-700 hover:bg-brand-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition disabled:opacity-50"
            >
              <span>{loading ? "Verificando credenciales..." : "Acceder al Sistema"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-neutral-100 flex items-center justify-center gap-2 text-[11px] text-neutral-400">
          <Lock className="w-3.5 h-3.5" />
          <span>Cifrado TLS 1.3 &bull; Cumplimiento Ley N.º 29733 (ANPD)</span>
        </div>
      </div>
    </div>
  );
}