"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  KeyRound,
  Lock,
  ArrowRight,
  UserCheck,
  Stethoscope,
  ReceiptText,
  MapPin,
  Building2,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import {
  getUsuarios,
  validarCredenciales,
  cambiarPasswordUsuario,
  UsuarioCredencial,
} from "@/lib/auth-users";

export default function LoginPage() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<UsuarioCredencial[]>([]);
  const [selectedSedeTab, setSelectedSedeTab] = useState<"Independencia" | "Vivanco" | "Central">("Independencia");

  // Formulario login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Modal cambio obligatorio de contraseña (1 solo uso)
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPendingUser, setCurrentPendingUser] = useState<UsuarioCredencial | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    const list = getUsuarios();
    setUsuarios(list);
    // Seleccionar por defecto la primera cuenta de Independencia
    const defaultUser = list.find((u) => u.sede === "Independencia");
    if (defaultUser) {
      setEmail(defaultUser.email);
      setPassword(defaultUser.passwordHash);
    }
  }, []);

  const cuentasFiltradas = usuarios.filter((u) => {
    if (selectedSedeTab === "Independencia") return u.sede === "Independencia";
    if (selectedSedeTab === "Vivanco") return u.sede === "Vivanco";
    return u.sede === "Todas las Sedes";
  });

  const handleSelectCuenta = (cta: UsuarioCredencial) => {
    setEmail(cta.email);
    setPassword(cta.passwordHash);
    setErrorMsg(null);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const resultado = validarCredenciales(email, password);

    if (!resultado.ok || !resultado.usuario) {
      setLoading(false);
      setErrorMsg(resultado.error || "Error de autenticación.");
      return;
    }

    const usr = resultado.usuario;

    // Verificar si es contraseña temporal de 1 solo uso
    if (usr.requiereCambioPassword) {
      setLoading(false);
      setCurrentPendingUser(usr);
      setShowChangePasswordModal(true);
      return;
    }

    // Login exitoso
    completarInicioSesion(usr);
  };

  const completarInicioSesion = (usr: UsuarioCredencial) => {
    // Cookies de sesión validadas en el servidor por Next.js middleware.ts
    const effectiveRole = usr.rol === "RECEPCION" || usr.rol === "CAJA" ? "RECEPCION_CAJA" : usr.rol;
    document.cookie = `lm_auth_user=${encodeURIComponent(usr.email)}; path=/; max-age=86400; SameSite=Lax`;
    document.cookie = `lm_auth_role=${encodeURIComponent(effectiveRole)}; path=/; max-age=86400; SameSite=Lax`;

    sessionStorage.setItem("lm_rol", effectiveRole);
    sessionStorage.setItem("lm_user", usr.email);
    sessionStorage.setItem("lm_sede", usr.sede);
    sessionStorage.setItem("lm_nombre", usr.nombre);
    sessionStorage.setItem("lm_colegiatura", usr.colegiatura || "");

    setTimeout(() => {
      setLoading(false);
      if (effectiveRole === "RECEPCION_CAJA") router.push("/admision-caja");
      else if (usr.rol === "PROFESIONAL") router.push("/hce");
      else router.push("/supervision");
    }, 400);
  };

  const handleGuardarNuevaPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (newPassword.length < 8) {
      setModalError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setModalError("Las contraseñas no coinciden. Verifique ambas casillas.");
      return;
    }
    if (currentPendingUser && newPassword === currentPendingUser.passwordHash) {
      setModalError("La nueva contraseña debe ser distinta a la clave temporal asignada.");
      return;
    }

    if (!currentPendingUser) return;

    cambiarPasswordUsuario(currentPendingUser.email, newPassword);
    setShowChangePasswordModal(false);

    // Proceder al ingreso con la cuenta actualizada
    completarInicioSesion({ ...currentPendingUser, requiereCambioPassword: false, passwordHash: newPassword });
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
            Portal Clínico &bull; Autenticación con responsabilidad médica individual y secreto profesional.
          </p>
        </div>

        {/* Pestañas para elegir Sede */}
        <div className="mb-5">
          <label className="block text-[11px] font-extrabold text-neutral-500 uppercase tracking-wider mb-2">
            1. Sede Institucional
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-100 rounded-2xl border border-neutral-200">
            <button
              type="button"
              onClick={() => setSelectedSedeTab("Independencia")}
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
              onClick={() => setSelectedSedeTab("Vivanco")}
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
              onClick={() => setSelectedSedeTab("Central")}
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

        {/* Directorio de Cuentas Activas */}
        <div className="mb-5">
          <label className="block text-[11px] font-extrabold text-neutral-500 uppercase tracking-wider mb-2">
            2. Directorio de Personal Autorizado ({selectedSedeTab})
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
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
                        <span className="text-xs font-black text-neutral-900">{cta.nombre}</span>
                        <span className="text-[10px] bg-white px-1.5 py-0.2 rounded border border-neutral-200 text-neutral-600 font-semibold">
                          {cta.rol}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 font-medium">
                        {cta.cargo} {cta.colegiatura && `\u2022 ${cta.colegiatura}`}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    {cta.requiereCambioPassword ? (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full inline-block">
                        Clave Temporal
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-neutral-400 block">{cta.email.split("@")[0]}</span>
                    )}
                  </div>
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

        {/* Formulario de Login */}
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
                Contraseña de Acceso
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
              placeholder="Ingresa tu contraseña institucional..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-700 transition bg-neutral-50/50"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-brand-700 hover:bg-brand-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition disabled:opacity-50"
            >
              <span>{loading ? "Validando credenciales..." : "Ingresar con Responsabilidad Asignada"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Firma Personal &bull; No Repudio</span>
          </div>
          <span>Ley N.º 26842 &bull; NTS N.º 139-MINSA</span>
        </div>
      </div>

      {/* Modal Cambio Obligatorio de Contraseña (1 Solo Uso) */}
      {showChangePasswordModal && currentPendingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-neutral-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-3">
              <KeyRound className="w-6 h-6" />
            </div>

            <div className="text-center mb-5">
              <h3 className="text-lg font-black text-neutral-900">Cambio Obligatorio de Contraseña</h3>
              <p className="text-xs text-neutral-600 mt-1">
                Hola, <strong>{currentPendingUser.nombre}</strong>. Has ingresado con una contraseña temporal de un solo uso emitida por la Administración. Por seguridad y secreto profesional, debes definir tu contraseña privada.
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
                  Confirmar Nueva Contraseña *
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

              <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 text-[11px] text-neutral-600 space-y-1">
                <p className="font-bold text-neutral-800">Compromiso de Responsabilidad:</p>
                <p>
                  Esta clave es personal e intransferible. Todo registro médico, cobro o ingreso que realices quedará firmado digitalmente bajo tu nombre.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Activar mi Cuenta y Acceder</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}