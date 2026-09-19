"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  KeyRound,
  ShieldAlert,
  LogOut,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { isEmailAutorizado, obtenerCuentaAutorizada, normalizarEmail } from "@/lib/whitelist";

export default function LoginPage() {
  const router = useRouter();

  // Formulario ciego minimalista
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Sesión activa detectada
  const [activeSessionUser, setActiveSessionUser] = useState<string | null>(null);
  const [activeSessionRole, setActiveSessionRole] = useState<string | null>(null);

  useEffect(() => {
    async function checkCurrentSession() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setActiveSessionUser(user.email);
        const r = user.email === "admin@lasmellizasperu.com" ? "ADMIN" : (sessionStorage.getItem("lm_rol") || "RECEPCION_CAJA");
        setActiveSessionRole(r);
      }
    }
    checkCurrentSession();
  }, []);

  const handleCerrarSesionActiva = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    sessionStorage.clear();
    setActiveSessionUser(null);
    setActiveSessionRole(null);
    setEmail("");
    setPassword("");
  };

  // Modal cambio obligatorio de contraseña en Supabase Auth
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const emailTrimmed = email.trim();
    const emailNorm = normalizarEmail(emailTrimmed);

    // 1. CONTROL DE ACCESO ESTRICTO: VALIDACIÓN CONTRA EL PADRÓN OFICIAL EXCLUSIVO
    if (!isEmailAutorizado(emailNorm)) {
      setLoading(false);
      setErrorMsg(
        "Acceso denegado: El correo ingresado no pertenece al padrón oficial autorizado de Las Mellizas Perú."
      );
      return;
    }

    try {
      // 2. AUTENTICACIÓN CRIPTOGRÁFICA EN SUPABASE AUTH
      // Intentar primero con el email normalizado, fallback al literal
      let authResponse = await supabase.auth.signInWithPassword({
        email: emailNorm,
        password: password.trim(),
      });

      if (authResponse.error && authResponse.error.message === "Invalid login credentials" && emailNorm !== emailTrimmed.toLowerCase()) {
        authResponse = await supabase.auth.signInWithPassword({
          email: emailTrimmed.toLowerCase(),
          password: password.trim(),
        });
      }

      const { data, error } = authResponse;

      if (error || !data?.user) {
        setErrorMsg(
          error?.message === "Invalid login credentials"
            ? "Contraseña o correo incorrectos. Verifique sus credenciales institucionales."
            : error?.message || "Error al autenticar en el servidor de seguridad."
        );
        setLoading(false);
        return;
      }

      // Limpiar datos previos de sesión para evitar contaminación cruzada de roles
      sessionStorage.clear();

      // 3. CONSULTA DEL ROL ASIGNADO EN BASE DE DATOS
      const cuentaData = obtenerCuentaAutorizada(emailNorm);
      let userRole: string = cuentaData?.rol || "RECEPCION_CAJA";
      let sedeNombre: string = cuentaData?.sede || "Independencia";
      let nombreCompleto: string = cuentaData?.nombre || "Personal Autorizado";
      let colegiatura: string = cuentaData?.colegiatura || "";

      if (emailNorm === "admin@lasmellizasperu.com") {
        userRole = "ADMIN";
        nombreCompleto = "Dirección Médica & Gestión";
        sedeNombre = "Todas las Sedes";
      } else {
        try {
          const { data: profile } = await supabase
            .from("perfil_usuario")
            .select("*, sede:site_id(nombre)")
            .eq("id", data.user.id)
            .maybeSingle();

          if (profile) {
            if (profile.activo === false) {
              await supabase.auth.signOut();
              sessionStorage.clear();
              setErrorMsg("Acceso denegado: Esta cuenta institucional se encuentra inactiva. Comuníquese con la Dirección Médica.");
              setLoading(false);
              return;
            }
            userRole = profile.rol;
            nombreCompleto = profile.nombre_completo || nombreCompleto;
            if (profile.sede?.nombre) sedeNombre = profile.sede.nombre;
            if (profile.colegiatura) colegiatura = profile.colegiatura;
          }
        } catch {
          // En caso de latencia de red, usa los datos del padrón oficial
        }
      }

      // Almacenar datos en sesión cliente para la interfaz local
      sessionStorage.setItem("lm_rol", userRole);
      sessionStorage.setItem("lm_user", data.user.email || emailNorm);
      sessionStorage.setItem("lm_sede", sedeNombre);
      sessionStorage.setItem("lm_nombre", nombreCompleto);
      if (colegiatura) sessionStorage.setItem("lm_colegiatura", colegiatura);

      // Redirección blindada por rol
      if (userRole === "RECEPCION_CAJA") {
        router.push("/admision-caja");
      } else if (userRole === "PROFESIONAL") {
        router.push("/hce");
      } else {
        router.push("/supervision");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error de comunicación con el servidor.");
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
      <div className="w-full max-w-md bg-white rounded-3xl border border-brand-200/70 p-8 shadow-xl shadow-brand-900/5">
        {/* Membrete Institucional Ciego (Sin listados de cuentas) */}
        <div className="text-center mb-7">
          <img
            src="/logo.png"
            alt="Las Mellizas Perú"
            className="w-24 h-24 object-contain mx-auto mb-2 drop-shadow-md"
          />
          <h1 className="text-2xl font-black text-brand-900 tracking-tight">Las Mellizas Perú</h1>
          <p className="text-xs font-black text-brand-700 uppercase tracking-widest mt-0.5">
            Consultorio Obstétrico Ecográfico
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-[10px] font-bold text-neutral-600 mt-2.5">
            <Lock className="w-3 h-3 text-emerald-600" />
            <span>Portal Clínico &bull; Acceso Restringido Zero Trust</span>
          </div>
        </div>

        {/* Alerta de Error / Acceso Denegado */}
        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* Sesión Activa Detectada Previamente */}
        {activeSessionUser && (
          <div className="mb-5 p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-center justify-between shadow-xs">
            <div className="min-w-0 pr-2">
              <p className="font-bold text-[11px] uppercase tracking-wider text-amber-900">Sesión Detectada en Navegador</p>
              <p className="font-mono text-[11px] text-amber-800 truncate">{activeSessionUser}</p>
              <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-amber-200/70 text-[10px] font-bold text-amber-950">
                Rol: {activeSessionRole || "Sin rol"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (activeSessionRole === "PROFESIONAL") router.push("/hce");
                  else if (activeSessionRole === "ADMIN" || activeSessionRole === "SUPERVISION") router.push("/supervision");
                  else router.push("/admision-caja");
                }}
                className="px-2.5 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold rounded-xl text-[11px] transition shadow-xs"
              >
                Ir a Módulo
              </button>
              <button
                type="button"
                onClick={handleCerrarSesionActiva}
                className="px-2.5 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold rounded-xl text-[11px] transition flex items-center gap-1 shadow-xs"
                title="Cerrar esta sesión para ingresar con otra cuenta"
              >
                <LogOut className="w-3 h-3" />
                <span>Cerrar</span>
              </button>
            </div>
          </div>
        )}

        {/* Formulario Ciego de Autenticación */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
              Correo Institucional
            </label>
            <input
              type="text"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@lasmellizasperu.com"
              className="w-full px-4 py-3 rounded-2xl border border-neutral-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-700 transition bg-neutral-50/50"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
                Contraseña Privada
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-brand-700 font-semibold hover:underline flex items-center gap-1"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPassword ? "Ocultar" : "Mostrar"}</span>
              </button>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••••••"
              className="w-full px-4 py-3 rounded-2xl border border-neutral-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-700 transition bg-neutral-50/50"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-brand-700 hover:bg-brand-800 text-white font-bold py-3.5 px-4 rounded-2xl shadow-md shadow-brand-900/10 transition disabled:opacity-50"
            >
              <span>{loading ? "Validando en servidor..." : "Ingresar con Sesión Segura"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400">
          <span>Padrón Oficial Las Mellizas</span>
          <span>NTS N.º 139-MINSA</span>
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-700"
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-700"
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