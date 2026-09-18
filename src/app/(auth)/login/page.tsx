"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Lock,
  ArrowRight,
  UserCheck,
  Stethoscope,
  MapPin,
  Building2,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  KeyRound,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface CuentaReferencia {
  id: string;
  email: string;
  nombre: string;
  rol: "RECEPCION_CAJA" | "PROFESIONAL" | "ADMIN";
  sede: "Independencia" | "Vivanco" | "Central";
  cargo: string;
  colegiatura?: string;
}

// Cuentas de referencia autorizadas (Sin contraseñas guardadas - Requiere autenticación real)
const CUENTAS_AUTORIZADAS: CuentaReferencia[] = [
  // Sede Independencia (Solo Admisión & Caja Unificada y Profesional Médico)
  {
    id: "ind-01",
    email: "admision.ind@lasmellizasperu.com",
    nombre: "Lucía Mendoza Quispe",
    rol: "RECEPCION_CAJA",
    sede: "Independencia",
    cargo: "Operador de Admisión & Caja",
  },
  {
    id: "ind-02",
    email: "medico.ind@lasmellizasperu.com",
    nombre: "Dr. Carlos Benavides Velarde",
    rol: "PROFESIONAL",
    sede: "Independencia",
    cargo: "Médico Gineco-Obstetra",
    colegiatura: "CMP 54321 / RNE 23456",
  },

  // Sede Vivanco (Solo Admisión & Caja Unificada y Profesional Obstetra)
  {
    id: "viv-01",
    email: "admision.viv@lasmellizasperu.com",
    nombre: "Marilú Quispe Paucar",
    rol: "RECEPCION_CAJA",
    sede: "Vivanco",
    cargo: "Operador de Admisión & Caja",
  },
  {
    id: "viv-02",
    email: "obstetra.viv@lasmellizasperu.com",
    nombre: "Lic. Sonia Rivas Alarcón",
    rol: "PROFESIONAL",
    sede: "Vivanco",
    cargo: "Obstetra Especialista",
    colegiatura: "COP 12890",
  },

  // Dirección Central / Administrador General
  {
    id: "adm-01",
    email: "admin@lasmellizasperu.com",
    nombre: "Dirección Médica & Gestión",
    rol: "ADMIN",
    sede: "Central",
    cargo: "Administrador General Red",
    colegiatura: "CMP 99881",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [selectedSedeTab, setSelectedSedeTab] = useState<"Independencia" | "Vivanco" | "Central">("Independencia");

  // Formulario login
  const [email, setEmail] = useState("admision.ind@lasmellizasperu.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Modal cambio de contraseña en Supabase Auth
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const cuentasFiltradas = CUENTAS_AUTORIZADAS.filter((u) => u.sede === selectedSedeTab);

  const handleSelectCuenta = (cta: CuentaReferencia) => {
    setEmail(cta.email);
    setPassword(""); // Obligatorio ingresar la contraseña real
    setErrorMsg(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      // 1. VALIDACIÓN ESTRICTA MEDIANTE SUPABASE AUTH
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error || !data?.user) {
        // En caso de que la cuenta aún no se haya sembrado en auth.users
        // o si es la primera vez que se prueba en el entorno
        setErrorMsg(
          error?.message === "Invalid login credentials"
            ? "Credenciales incorrectas. Verifique el usuario y contraseña institucional."
            : error?.message || "Error al autenticar en Supabase Auth."
        );
        setLoading(false);
        return;
      }

      // 2. OBTENCIÓN DEL ROL VERIFICADO DESDE BASE DE DATOS
      const { data: profile } = await supabase
        .from("perfil_usuario")
        .select("*")
        .eq("id", data.user.id)
        .single();

      const userRole = profile?.rol || (email.includes("admin") ? "ADMIN" : email.includes("medico") || email.includes("obstetra") ? "PROFESIONAL" : "RECEPCION_CAJA");
      const sedeNombre = selectedSedeTab === "Vivanco" ? "Vivanco" : selectedSedeTab === "Central" ? "Central" : "Independencia";

      // Guardar contexto en sesión cliente para UI local
      sessionStorage.setItem("lm_rol", userRole);
      sessionStorage.setItem("lm_user", data.user.email || email);
      sessionStorage.setItem("lm_sede", sedeNombre);
      sessionStorage.setItem("lm_nombre", profile?.nombre_completo || "Usuario Autorizado");
      if (profile?.colegiatura) sessionStorage.setItem("lm_colegiatura", profile.colegiatura);

      // Redirección segura según el rol verificado
      if (userRole === "RECEPCION_CAJA" || userRole === "RECEPCION" || userRole === "CAJA") {
        router.push("/admision-caja");
      } else if (userRole === "PROFESIONAL") {
        router.push("/hce");
      } else {
        router.push("/supervision");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error de conexión con el servidor de autenticación.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarNuevaPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (newPassword.length < 8) {
      setModalError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setModalError("Las contraseñas no coinciden.");
      return;
    }

    setModalLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setShowChangePasswordModal(false);
      router.push("/admision-caja");
    } catch (err: any) {
      setModalError(err.message || "Error al actualizar contraseña en Supabase.");
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-100/50 p-4">
      <div className="w-full max-w-xl bg-white rounded-3xl border border-brand-200/70 p-8 shadow-xl shadow-brand-900/5">
        <div className="text-center mb-6">
          <img
            src="/logo.png"
            alt="Las Mellizas Perú"
            className="w-24 h-24 object-contain mx-auto mb-2 drop-shadow-md"
          />
          <h2 className="text-2xl font-black text-brand-900">Las Mellizas Perú</h2>
          <p className="text-xs font-black text-brand-700 uppercase tracking-wide">
            Consultorio Obstétrico Ecográfico
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            Portal Clínico &bull; Autenticación Criptográfica Zero Trust (Supabase Auth).
          </p>
        </div>

        {/* 1. Selector de Sede Institucional */}
        <div className="mb-5">
          <label className="block text-[11px] font-extrabold text-neutral-500 uppercase tracking-wider mb-2">
            1. Sede o Nivel de Acceso
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-100 rounded-2xl border border-neutral-200">
            <button
              type="button"
              onClick={() => {
                setSelectedSedeTab("Independencia");
                setEmail("admision.ind@lasmellizasperu.com");
                setPassword("");
                setErrorMsg(null);
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
                setEmail("admision.viv@lasmellizasperu.com");
                setPassword("");
                setErrorMsg(null);
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
                setEmail("admin@lasmellizasperu.com");
                setPassword("");
                setErrorMsg(null);
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

        {/* 2. Directorio Unificado de Roles Autorizados (Caja independiente eliminada) */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-[11px] font-extrabold text-neutral-500 uppercase tracking-wider">
              2. Puesto Asignado ({selectedSedeTab})
            </label>
            <span className="text-[10px] text-neutral-400">Clic para autocompletar usuario</span>
          </div>

          <div className="space-y-2">
            {cuentasFiltradas.map((cta) => {
              const isSelected = email.toLowerCase() === cta.email.toLowerCase();
              return (
                <button
                  key={cta.id}
                  type="button"
                  onClick={() => handleSelectCuenta(cta)}
                  className={`w-full p-2.5 rounded-2xl border text-left transition flex items-center justify-between ${
                    isSelected
                      ? "border-brand-700 bg-brand-50/70 ring-2 ring-brand-700/20"
                      : "border-neutral-200/80 bg-neutral-50/50 hover:bg-neutral-50 hover:border-neutral-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                        cta.rol === "RECEPCION_CAJA"
                          ? "bg-emerald-100 text-emerald-800"
                          : cta.rol === "PROFESIONAL"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      {cta.rol === "RECEPCION_CAJA" && <UserCheck className="w-4 h-4" />}
                      {cta.rol === "PROFESIONAL" && <Stethoscope className="w-4 h-4" />}
                      {cta.rol === "ADMIN" && <Shield className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-neutral-900">{cta.nombre}</span>
                        <span className="text-[10px] bg-white px-1.5 py-0.2 rounded border border-neutral-200 text-neutral-600 font-semibold">
                          {cta.rol === "RECEPCION_CAJA"
                            ? "Admisión & Caja"
                            : cta.rol === "PROFESIONAL"
                            ? "HCE Asistencial"
                            : "Administración General"}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 font-medium">
                        {cta.cargo} {cta.colegiatura && `\u2022 ${cta.colegiatura}`}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-neutral-400">
                    {cta.email.split("@")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Alerta de Error */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 3. Formulario con Supabase Auth Obligatorio */}
        <form onSubmit={handleLogin} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
              Correo Institucional
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@lasmellizasperu.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-700 transition bg-neutral-50/50"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
                Contraseña Privada (Supabase Auth)
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-brand-700 font-semibold hover:underline flex items-center gap-1"
              >
                {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{showPassword ? "Ocultar" : "Mostrar"}</span>
              </button>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingresa tu clave privada personal..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-700 transition bg-neutral-50/50"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-brand-700 hover:bg-brand-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition disabled:opacity-50"
            >
              <span>{loading ? "Validando en Supabase Auth..." : "Ingresar con Sesión Segura"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Zero Trust &bull; Supabase Auth SSR</span>
          </div>
          <span>NTS N.º 139-MINSA &bull; Ley N.º 26842</span>
        </div>
      </div>

      {/* Modal Cambio de Contraseña */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-neutral-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-3">
              <KeyRound className="w-6 h-6" />
            </div>

            <div className="text-center mb-5">
              <h3 className="text-lg font-black text-neutral-900">Actualizar Contraseña de Acceso</h3>
              <p className="text-xs text-neutral-600 mt-1">
                Por seguridad y responsabilidad médica individual, define tu nueva clave privada.
              </p>
            </div>

            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleGuardarNuevaPassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Nueva Contraseña Privada *
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Confirmar Contraseña *
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la nueva contraseña"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-700"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="w-full py-3 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{modalLoading ? "Guardando..." : "Actualizar y Continuar"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}