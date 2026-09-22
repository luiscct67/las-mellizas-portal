"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  KeyRound,
  ShieldAlert,
  Building2,
  Activity,
  ShieldCheck,
  Server,
  FileText,
  Check,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { isEmailAutorizado, obtenerCuentaAutorizada, normalizarEmail } from "@/lib/whitelist";

export default function SplitLoginView() {
  const router = useRouter();

  // Estados de formulario
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sedePreferida, setSedePreferida] = useState<"Independencia" | "Vivanco">("Independencia");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Modal cambio obligatorio de contraseña en Supabase Auth
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Zero Trust: Al entrar a login, limpiar cualquier sesión residual
  useEffect(() => {
    async function purgeSessionOnLogin() {
      try {
        await supabase.auth.signOut();
      } catch {}
      sessionStorage.clear();
    }
    purgeSessionOnLogin();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const emailTrimmed = email.trim();
    const emailNorm = normalizarEmail(emailTrimmed);

    // 1. Control de acceso: Validación contra padrón oficial
    if (!isEmailAutorizado(emailNorm)) {
      setLoading(false);
      setErrorMsg(
        "Acceso denegado: El correo ingresado no pertenece al padrón oficial autorizado de Las Mellizas Perú."
      );
      return;
    }

    try {
      // 2. Autenticación criptográfica en Supabase Auth
      let authResponse = await supabase.auth.signInWithPassword({
        email: emailNorm,
        password: password.trim(),
      });

      if (
        authResponse.error &&
        authResponse.error.message === "Invalid login credentials" &&
        emailNorm !== emailTrimmed.toLowerCase()
      ) {
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

      // Limpiar datos previos de sesión
      sessionStorage.clear();

      // 3. Consulta de perfil y rol
      const cuentaData = obtenerCuentaAutorizada(emailNorm);
      let userRole: string = cuentaData?.rol || "RECEPCION_CAJA";
      let sedeNombre: string = sedePreferida || cuentaData?.sede || "Independencia";
      let nombreCompleto: string = cuentaData?.nombre || "Personal Autorizado";
      let colegiatura: string = cuentaData?.colegiatura || "";

      if (emailNorm === "admin@lasmellizasperu.com") {
        userRole = "ADMIN";
        nombreCompleto = "Dirección Médica & Gestión";
        sedeNombre = sedePreferida;
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
              setErrorMsg(
                "Acceso denegado: Esta cuenta institucional se encuentra inactiva. Comuníquese con la Dirección Médica."
              );
              setLoading(false);
              return;
            }
            userRole = profile.rol;
            nombreCompleto = profile.nombre_completo || nombreCompleto;
            // Si el perfil tiene sede fija y no es admin, respeta su sede o la preferida elegida
            if (profile.sede?.nombre) {
              sedeNombre = sedePreferida || profile.sede.nombre;
            }
            if (profile.colegiatura) colegiatura = profile.colegiatura;
          }
        } catch {
          // En caso de latencia de red, conserva los datos del padrón oficial
        }
      }

      // Almacenar en sesión local
      sessionStorage.setItem("lm_rol", userRole);
      sessionStorage.setItem("lm_user", data.user.email || emailNorm);
      sessionStorage.setItem("lm_sede", sedeNombre);
      sessionStorage.setItem("lm_nombre", nombreCompleto);
      if (colegiatura) sessionStorage.setItem("lm_colegiatura", colegiatura);

      // Redirección por rol
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
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-neutral-950 font-sans antialiased selection:bg-brand-500 selection:text-white">
      {/* 
        ========================================================================
        PANEL IZQUIERDO (45%): IDENTIDAD INSTITUCIONAL, MONITORES Y CUMPLIMIENTO
        ========================================================================
      */}
      <div className="lg:w-[46%] xl:w-[44%] bg-gradient-to-br from-[#380b23] via-[#240516] to-[#12010b] text-white p-8 sm:p-12 lg:p-14 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-brand-900/40">
        {/* Destellos sutiles de fondo */}
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* 1. Encabezado de Marca & Membrete Oficial */}
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-inner">
              <img
                src="/logo.png"
                alt="Las Mellizas Perú"
                className="w-14 h-14 object-contain drop-shadow"
              />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-400/20 text-brand-200 border border-brand-300/30 text-[10px] font-black uppercase tracking-wider mb-1">
                <ShieldCheck className="w-3 h-3 text-brand-300" />
                <span>Portal Clínico Enterprise</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Las Mellizas Perú S.A.C.
              </h1>
              <p className="text-xs text-brand-200/80 font-medium">
                Consultorio Obstétrico Ecográfico &bull; RUC 20611827335
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Gestión Clínica y Financiera de Alta Disponibilidad
            </h2>
            <p className="text-xs sm:text-sm text-neutral-300/90 leading-relaxed font-normal">
              Acceso unificado para el flujo continuo de admisión, notas médicas obstétricas confidenciales y balance de caja en tiempo real.
            </p>
          </div>
        </div>

        {/* 2. Monitor de Red y Disponibilidad de Sedes en Tiempo Real */}
        <div className="relative z-10 my-8 sm:my-10 space-y-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-brand-200/70 tracking-wider uppercase">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Estado Operativo de Sedes</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400">DISPONIBLE 99.9%</span>
          </div>

          <div className="space-y-2.5">
            {/* Sede Independencia */}
            <div className="p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 backdrop-blur-sm transition flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-brand-900/50 border border-brand-700/50 flex items-center justify-center text-brand-200">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white leading-tight">Sede Independencia</h4>
                  <p className="text-[10px] text-neutral-400">Jr. Independencia 345 &bull; Admisión, Caja & Consultorios</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-bold text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>En línea</span>
              </div>
            </div>

            {/* Sede Vivanco */}
            <div className="p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 backdrop-blur-sm transition flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-900/50 border border-purple-700/50 flex items-center justify-center text-purple-200">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white leading-tight">Sede Vivanco</h4>
                  <p className="text-[10px] text-neutral-400">Jr. Vivanco 210 &bull; Admisión, Caja & Consultorios</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-bold text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>En línea</span>
              </div>
            </div>

            {/* Servidor Cloud Seguro */}
            <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-900/40 border border-blue-700/40 flex items-center justify-center text-blue-200">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white leading-tight">Nube Clínica Cifrada</h4>
                  <p className="text-[10px] text-neutral-400">Supabase Enterprise &bull; Cifrado TLS 1.3 / Reposo AES-256</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-[10px] font-bold text-blue-300">
                <Lock className="w-3 h-3 text-blue-300" />
                <span>Zero Trust</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Sellos Normativos MINSA / SUSALUD */}
        <div className="relative z-10 pt-6 border-t border-white/10 space-y-3">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-brand-300/80">
            Cumplimiento Sanitario & Secreto Profesional
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10 text-center">
              <span className="block text-[11px] font-black text-white">NTS N.º 139</span>
              <span className="block text-[9px] text-neutral-400">MINSA / DGIEM</span>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10 text-center">
              <span className="block text-[11px] font-black text-white">Ley 26842</span>
              <span className="block text-[9px] text-neutral-400">Secreto Médico</span>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10 text-center">
              <span className="block text-[11px] font-black text-white">Ley 29733</span>
              <span className="block text-[9px] text-neutral-400">Datos en Salud</span>
            </div>
          </div>
          <p className="text-[10px] text-neutral-400 text-center sm:text-left pt-1">
            &copy; 2026 Las Mellizas Perú S.A.C. &bull; Huamanga, Ayacucho, Perú.
          </p>
        </div>
      </div>

      {/* 
        ========================================================================
        PANEL DERECHO (55%): GATE DE ACCESO SEGURO ZERO TRUST
        ========================================================================
      */}
      <div className="flex-1 bg-[#faf8f6] p-6 sm:p-10 lg:p-14 flex flex-col justify-center items-center relative">
        <div className="w-full max-w-md bg-white rounded-3xl border border-neutral-200/90 p-8 sm:p-10 shadow-xl shadow-brand-950/5 space-y-6">
          {/* Header del Gate */}
          <div className="space-y-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
              <Lock className="w-3 h-3 text-emerald-600" />
              <span>Acceso Seguro Zero Trust &bull; Personal Autorizado</span>
            </div>
            <h2 className="text-2xl font-black text-neutral-900 tracking-tight pt-1">
              Iniciar Sesión
            </h2>
            <p className="text-xs text-neutral-500 font-medium">
              Ingrese sus credenciales institucionales para abrir su estación clínica.
            </p>
          </div>

          {/* Selector de Sede Operativa Táctil */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider">
              Sede de Atención Activa
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSedePreferida("Independencia")}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                  sedePreferida === "Independencia"
                    ? "bg-brand-900 text-white border-brand-900 shadow-xs"
                    : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100"
                }`}
              >
                {sedePreferida === "Independencia" && <Check className="w-3.5 h-3.5 text-brand-200" />}
                <span>Sede Independencia</span>
              </button>
              <button
                type="button"
                onClick={() => setSedePreferida("Vivanco")}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                  sedePreferida === "Vivanco"
                    ? "bg-brand-900 text-white border-brand-900 shadow-xs"
                    : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100"
                }`}
              >
                {sedePreferida === "Vivanco" && <Check className="w-3.5 h-3.5 text-brand-200" />}
                <span>Sede Vivanco</span>
              </button>
            </div>
          </div>

          {/* Alerta de Error / Acceso Denegado */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* Formulario Ciego de Autenticación */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                Correo Institucional
              </label>
              <input
                type="email"
                required
                autoFocus
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@lasmellizasperu.com"
                className="w-full px-4 py-3 rounded-2xl border border-neutral-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-700 transition bg-neutral-50/50 text-neutral-900"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider">
                  Contraseña Privada
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-brand-800 font-semibold hover:underline flex items-center gap-1"
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
                className="w-full px-4 py-3 rounded-2xl border border-neutral-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-700 transition bg-neutral-50/50 text-neutral-900"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-brand-800 hover:bg-brand-900 text-white font-bold py-3.5 px-4 rounded-2xl shadow-md shadow-brand-950/10 transition disabled:opacity-50"
              >
                <span>{loading ? "Validando en servidor..." : "Ingresar con Sesión Segura"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Nota de Auditoría Inmutable */}
          <div className="pt-4 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400">
            <span>Padrón Oficial Las Mellizas</span>
            <span>Auditoría RLS Inmutable</span>
          </div>
        </div>
      </div>

      {/* Modal Cambio de Contraseña */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
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
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
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
                  className="w-full py-3 bg-brand-800 hover:bg-brand-900 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
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
