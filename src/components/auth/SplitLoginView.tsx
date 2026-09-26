"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  KeyRound,
  ShieldAlert,
  Sparkles,
  Quote,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { isEmailAutorizado, obtenerCuentaAutorizada, normalizarEmail } from "@/lib/whitelist";

// Máximas dinámicas, proactivas y de soporte psicológico para el equipo de salud
const MAXIMAS_CONSULTORIO = [
  {
    frase: "Cada vida que recibimos y cada madre que cuidamos es el latido más puro de nuestra vocación. Hoy tu atención marca la diferencia.",
    enfoque: "Vocación Obstétrica & Calidez Humana",
    autor: "Filosofía Las Mellizas",
  },
  {
    frase: "La precisión clínica y la calidez en el trato no son opuestos: son las dos alas de una atención en salud de excelencia.",
    enfoque: "Rigor Profesional & Empatía",
    autor: "Guía de Calidad Institucional",
  },
  {
    frase: "En cada latido fetal auscultado se renueva la esperanza de una familia. Tu serenidad y dedicación son su mayor tranquilidad.",
    enfoque: "Compromiso Materno-Perinatal",
    autor: "Cuidado Gestacional Las Mellizas",
  },
  {
    frase: "La empatía escucha lo que la paciente no siempre logra expresar. Atendamos hoy con ciencia rigurosa y corazón presente.",
    enfoque: "Humanización de la Salud",
    autor: "Atención Centrada en la Persona",
  },
  {
    frase: "La excelencia no es un acto aislado, sino el hábito constante de brindar en cada consulta lo mejor de nuestros conocimientos.",
    enfoque: "Cultura de Seguridad Sanitaria",
    autor: "Ética & Responsabilidad Médica",
  },
  {
    frase: "Cuidar a la mujer gestante es proteger el futuro de toda nuestra comunidad. Que tu jornada sea serena, certera y productiva.",
    enfoque: "Impacto Comunitario & Protección",
    autor: "Dirección Las Mellizas Perú",
  },
  {
    frase: "El trabajo colaborativo y la comunicación clara salvan vidas y fortalecen la confianza de quienes acuden a nuestro consultorio.",
    enfoque: "Unidad & Respaldo de Equipo",
    autor: "Alianza de Equipo Clínico",
  },
];

export default function SplitLoginView() {
  const router = useRouter();

  // Estados de formulario
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Máxima dinámica del día (rotación automática determinística por día del año + selector interactivo)
  const [indiceMaxima, setIndiceMaxima] = useState(0);

  useEffect(() => {
    const ahora = new Date();
    const inicioAnio = new Date(ahora.getFullYear(), 0, 0);
    const diffDias = Math.floor((ahora.getTime() - inicioAnio.getTime()) / 86400000);
    setIndiceMaxima(Math.abs(diffDias) % MAXIMAS_CONSULTORIO.length);
  }, []);

  const maximaActual = MAXIMAS_CONSULTORIO[indiceMaxima] || MAXIMAS_CONSULTORIO[0];

  // Fecha del día formateada en español
  const fechaHoyStr = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("es-PE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date());
    } catch {
      return "Jornada Clínica Oficial";
    }
  }, []);

  // Modal cambio obligatorio de contraseña en Supabase Auth
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Limpiar cualquier sesión residual al cargar la pantalla de login
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
        "Correo no reconocido en el padrón institucional. Verifique que sus credenciales estén correctamente escritas, en minúsculas y sin espacios."
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
            ? "Contraseña o correo incorrectos. Por favor revise sus credenciales (recuerde escribir sin tildes ni espacios)."
            : error?.message || "Error al conectar con el servidor de autenticación."
        );
        setLoading(false);
        return;
      }

      // Limpiar datos previos de sesión
      sessionStorage.clear();

      // 3. Consulta de perfil y rol oficial
      const cuentaData = obtenerCuentaAutorizada(emailNorm);
      let userRole: string = cuentaData?.rol || "RECEPCION_CAJA";
      let sedeNombre: string = cuentaData?.sede || "Independencia";
      let nombreCompleto: string = cuentaData?.nombre || "Personal Autorizado";
      let colegiatura: string = cuentaData?.colegiatura || "";

      let userProfile: any = null;
      if (emailNorm === "admin@lasmellizasperu.com") {
        userRole = "ADMIN";
        nombreCompleto = "Dirección Médica & Gestión";
        sedeNombre = cuentaData?.sede || "Independencia";
      } else {
        try {
          const { data: profile } = await supabase
            .from("perfil_usuario")
            .select("*, sede:site_id(nombre)")
            .eq("id", data.user.id)
            .maybeSingle();

          userProfile = profile;

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
            if (profile.sede?.nombre) {
              sedeNombre = profile.sede.nombre;
            }
            if (profile.colegiatura) colegiatura = profile.colegiatura;
          }
        } catch {
          // En caso de latencia de red, conserva los datos del padrón oficial
        }
      }

      // Almacenar en sesión local y cookies de sesión
      sessionStorage.setItem("lm_rol", userRole);
      sessionStorage.setItem("lm_user", data.user.email || emailNorm);
      sessionStorage.setItem("lm_sede", sedeNombre);
      sessionStorage.setItem("lm_nombre", nombreCompleto);
      if (colegiatura) sessionStorage.setItem("lm_colegiatura", colegiatura);
      if (userProfile?.especialidad) sessionStorage.setItem("lm_especialidad", userProfile.especialidad);

      document.cookie = `lm_auth_user=${encodeURIComponent(data.user.email || emailNorm)}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `lm_auth_role=${encodeURIComponent(userRole)}; path=/; max-age=86400; SameSite=Lax`;

      // Redirección por rol con navegación completa y limpia
      if (userRole === "RECEPCION_CAJA") {
        window.location.href = "/admision-caja";
      } else if (userRole === "PROFESIONAL") {
        window.location.href = "/hce";
      } else {
        window.location.href = "/supervision";
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
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#faf8f6] font-sans antialiased selection:bg-brand-800 selection:text-white">
      {/* 
        ========================================================================
        PANEL IZQUIERDO: IDENTIDAD INSTITUCIONAL & MÁXIMA CLÍNICA DEL DÍA
        ========================================================================
      */}
      <div className="lg:w-[46%] xl:w-[44%] bg-gradient-to-br from-[#380b23] via-[#240516] to-[#12010b] text-white p-8 sm:p-12 lg:p-14 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-brand-900/40">
        {/* Destellos sutiles de fondo para profundidad visual */}
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* 1. Membrete Oficial & Identificación Legal */}
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 p-1.5 rounded-2xl bg-white shadow-2xl shadow-black/40 border border-white/50 shrink-0 flex items-center justify-center overflow-hidden">
              <img
                src="/logo-oficial.jpg?v=2"
                alt="Consultorio Obstétrico Ecográfico Las Mellizas Perú S.A.C."
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight">
                Consultorio Obstétrico Ecográfico
                <span className="block text-brand-200">Las Mellizas Perú S.A.C.</span>
              </h1>
              <p className="text-xs text-brand-200/90 font-mono font-semibold mt-1">
                RUC: 20611827335
              </p>
            </div>
          </div>

          <div className="pt-2">
            <div className="flex items-baseline gap-2.5 flex-wrap">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-none">
                Gestión Clínica
              </h2>
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-md bg-white/10 text-brand-200 border border-white/15">
                v2.6
              </span>
            </div>
          </div>
        </div>

        {/* 2. Máxima Dinámica del Consultorio (Soporte Proactivo y Psicológico) */}
        <div className="relative z-10 my-8 sm:my-10 space-y-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-brand-200/80 tracking-wider uppercase">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Máxima del Consultorio &bull; Pensamiento del Día</span>
            </div>
            <span className="text-[10px] font-mono text-brand-200/70 capitalize">
              {fechaHoyStr}
            </span>
          </div>

          <div className="relative p-5 sm:p-6 rounded-2xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/15 backdrop-blur-md transition-all shadow-xl shadow-black/20 group">
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-brand-500/20 border border-brand-400/30 flex items-center justify-center text-brand-200 shrink-0 mt-0.5">
                <Quote className="w-4 h-4 text-brand-300" />
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-sm sm:text-[15px] font-medium text-white/95 leading-relaxed italic">
                  &ldquo;{maximaActual.frase}&rdquo;
                </p>
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="block text-[11px] font-bold text-brand-200">
                      {maximaActual.autor}
                    </span>
                    <span className="block text-[10px] text-brand-300/70 font-medium">
                      {maximaActual.enfoque}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIndiceMaxima((prev) => (prev + 1) % MAXIMAS_CONSULTORIO.length)}
                    title="Ver otra reflexión institucional"
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-brand-200 text-[10px] flex items-center gap-1 transition opacity-70 group-hover:opacity-100"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span className="hidden sm:inline">Siguiente</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Sellos Normativos MINSA / SUSALUD & Respaldo Sanitario */}
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
            &copy; 2026 Consultorio Obstétrico Ecográfico Las Mellizas Perú S.A.C. &bull; Huamanga, Ayacucho, Perú.
          </p>
        </div>
      </div>

      {/* 
        ========================================================================
        PANEL DERECHO: ACCESO DIRECTO, LIMPIO Y PROFESIONAL
        ========================================================================
      */}
      <div className="flex-1 bg-[#faf8f6] p-6 sm:p-10 lg:p-14 flex flex-col justify-center items-center relative">
        <div className="w-full max-w-md bg-white rounded-3xl border border-neutral-200/90 p-8 sm:p-10 shadow-xl shadow-brand-950/5 space-y-6">
          {/* Encabezado Directo de Inicio de Sesión */}
          <div className="space-y-1 text-center sm:text-left">
            <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
              Iniciar Sesión
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 font-medium">
              Ingrese sus credenciales institucionales para abrir su estación clínica.
            </p>
          </div>

          {/* Alerta de Error / Validación */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* Formulario Limpio y Directo */}
          <form onSubmit={handleLogin} autoComplete="off" className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                Correo Institucional
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  name="lm_user_id"
                  required
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  data-lpignore="true"
                  value={email}
                  onChange={(e) => {
                    const sanitized = e.target.value
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "")
                      .toLowerCase()
                      .replace(/\s+/g, "");
                    setEmail(sanitized);
                  }}
                  placeholder="usuario@ejemplo.com"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-neutral-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-800 focus:border-transparent transition bg-neutral-50/50 text-neutral-900 placeholder:text-neutral-400"
                />
              </div>
              <p className="text-[10px] text-neutral-400 mt-1">
                Ingrese su correo asignado en minúsculas y sin espacios.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider">
                  Contraseña
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
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="lm_security_token"
                  required
                  autoComplete="new-password"
                  spellCheck={false}
                  data-lpignore="true"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-neutral-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-800 focus:border-transparent transition bg-neutral-50/50 text-neutral-900 placeholder:text-neutral-400"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-brand-800 hover:bg-brand-900 text-white font-bold py-3.5 px-4 rounded-2xl shadow-md shadow-brand-950/15 transition disabled:opacity-50 active:scale-[0.99] cursor-pointer"
              >
                <span>{loading ? "Validando en servidor..." : "Ingresar con Sesión Segura"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Pie de Auditoría Institucional */}
          <div className="pt-4 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400">
            <span>Padrón Oficial Las Mellizas</span>
            <span>Acceso Auditado</span>
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
