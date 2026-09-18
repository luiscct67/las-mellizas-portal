"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Activity,
  Users,
  DollarSign,
  FileCheck,
  Lock,
  AlertCircle,
  UserPlus,
  KeyRound,
  RefreshCw,
  Copy,
  Check,
  Building2,
  MapPin,
  Award,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  getUsuarios,
  crearNuevoUsuarioPorAdmin,
  resetearPasswordTemporalPorAdmin,
  UsuarioCredencial,
} from "@/lib/auth-users";

export default function SupervisionPage() {
  const [activeTab, setActiveTab] = useState<"auditoria" | "personal">("personal");
  const [usuarios, setUsuarios] = useState<UsuarioCredencial[]>([]);

  // Modal nuevo usuario
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [nuevoRol, setNuevoRol] = useState<"RECEPCION" | "PROFESIONAL" | "CAJA" | "SUPERVISION">("PROFESIONAL");
  const [nuevaSede, setNuevaSede] = useState<"Independencia" | "Vivanco">("Independencia");
  const [nuevaColegiatura, setNuevaColegiatura] = useState("");
  const [nuevaEspecialidad, setNuevaEspecialidad] = useState("");
  const [nuevoCargo, setNuevoCargo] = useState("Médico Especialista");

  // Modal credencial temporal generada
  const [credencialGenerada, setCredencialGenerada] = useState<{
    nombre: string;
    email: string;
    passwordTemporal: string;
    rol: string;
    sede: string;
  } | null>(null);

  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    setUsuarios(getUsuarios());
  }, []);

  const eventos = [
    {
      id: "ev-109",
      hora: "08:42:15",
      usuario: "obstetra.viv@lasmellizasperu.com",
      rol: "PROFESIONAL",
      accion: "SELLAR_NOTA_CLINICA",
      entidad: "nota_clinica",
      entidadId: "nc-4412",
      detalle: "Firma SHA-256 generada: e8b912a... Paciente Roxana Palomino (Sede Vivanco)",
    },
    {
      id: "ev-108",
      hora: "08:35:10",
      usuario: "caja.ind@lasmellizasperu.com",
      rol: "CAJA",
      accion: "REGISTRAR_PAGO",
      entidad: "pago",
      entidadId: "pg-0812",
      detalle: "Monto S/ 90.00 Medio: YAPE. Orden ord-ind-880 (Sede Independencia)",
    },
    {
      id: "ev-107",
      hora: "08:15:30",
      usuario: "recepcion.ind@lasmellizasperu.com",
      rol: "RECEPCION",
      accion: "CREAR_ENCUENTRO",
      entidad: "encuentro",
      entidadId: "enc-ind-001",
      detalle: "Admisión Sede Independencia. Paciente Carla Mendoza",
    },
    {
      id: "ev-106",
      hora: "07:45:00",
      usuario: "recepcion.viv@lasmellizasperu.com",
      rol: "RECEPCION",
      accion: "INTENTO_ACCESO_DENEGADO",
      entidad: "nota_clinica",
      entidadId: "nc-4401",
      detalle: "Intento de lectura bloqueado por directiva RLS (Aislamiento Clínico)",
    },
  ];

  const handleCrearUsuario = (e: React.FormEvent) => {
    e.preventDefault();
    const res = crearNuevoUsuarioPorAdmin({
      email: nuevoEmail,
      nombre: nuevoNombre,
      rol: nuevoRol,
      sede: nuevaSede,
      colegiatura: nuevaColegiatura,
      especialidad: nuevaEspecialidad,
      cargo: nuevoCargo,
    });

    setUsuarios(getUsuarios());
    setShowNewUserModal(false);

    // Mostrar credencial temporal generada para entregarla al colaborador
    setCredencialGenerada({
      nombre: nuevoNombre,
      email: nuevoEmail,
      passwordTemporal: res.passwordTemporal,
      rol: nuevoRol,
      sede: nuevaSede,
    });

    // Limpiar form
    setNuevoNombre("");
    setNuevoEmail("");
    setNuevaColegiatura("");
    setNuevaEspecialidad("");
  };

  const handleResetearClave = (usr: UsuarioCredencial) => {
    const temp = resetearPasswordTemporalPorAdmin(usr.id);
    if (temp) {
      setUsuarios(getUsuarios());
      setCredencialGenerada({
        nombre: usr.nombre,
        email: usr.email,
        passwordTemporal: temp,
        rol: usr.rol,
        sede: usr.sede,
      });
    }
  };

  const copiarCredenciales = () => {
    if (!credencialGenerada) return;
    const texto = `*Ecosistema Digital Las Mellizas Perú S.A.C.*\nCredencial de 1 Solo Uso:\n- Usuario: ${credencialGenerada.email}\n- Clave Temporal: ${credencialGenerada.passwordTemporal}\n- Sede: ${credencialGenerada.sede}\n- Rol: ${credencialGenerada.rol}\n\n*Nota:* Al ingresar se le exigirá crear su propia contraseña privada para asumir su responsabilidad institucional.`;
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Supervisión, Trazabilidad & Personal</h1>
          <p className="text-xs text-neutral-500">
            Administración de colaboradores, emisión de contraseñas de 1 solo uso y auditoría forense inmutable.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "personal" && (
            <button
              onClick={() => setShowNewUserModal(true)}
              className="inline-flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>Alta de Nuevo Colaborador</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200">
        <button
          onClick={() => setActiveTab("personal")}
          className={`pb-3 px-3 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === "personal"
              ? "border-brand-700 text-brand-700"
              : "border-transparent text-neutral-500 hover:text-neutral-800"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Gestión de Personal & Credenciales ({usuarios.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("auditoria")}
          className={`pb-3 px-3 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === "auditoria"
              ? "border-brand-700 text-brand-700"
              : "border-transparent text-neutral-500 hover:text-neutral-800"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Bitácora de Auditoría Forense (RLS)</span>
        </button>
      </div>

      {/* Contenido Pestaña Personal */}
      {activeTab === "personal" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-sm text-neutral-800">
                  Colaboradores Registrados por Sede y Rol
                </h2>
                <p className="text-xs text-neutral-400">
                  Cada miembro tiene asignado su propio usuario y contraseña para asumir responsabilidad médica y administrativa individual.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 text-neutral-600 text-xs font-bold uppercase tracking-wider border-b border-neutral-200">
                  <tr>
                    <th className="py-3 px-4">Colaborador</th>
                    <th className="py-3 px-4">Rol Asignado</th>
                    <th className="py-3 px-4">Sede</th>
                    <th className="py-3 px-4">Colegiatura / Especialidad</th>
                    <th className="py-3 px-4">Estado Clave</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {usuarios.map((usr) => (
                    <tr key={usr.id} className="hover:bg-neutral-50/80 transition">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-neutral-900 block leading-tight">{usr.nombre}</span>
                        <span className="text-[11px] font-mono text-neutral-500">{usr.email}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                            usr.rol === "RECEPCION"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : usr.rol === "PROFESIONAL"
                              ? "bg-blue-50 text-blue-800 border border-blue-200"
                              : usr.rol === "CAJA"
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : "bg-purple-50 text-purple-800 border border-purple-200"
                          }`}
                        >
                          {usr.rol}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-xs text-neutral-700 font-semibold">
                          <MapPin className="w-3 h-3 text-brand-700" />
                          <span>{usr.sede}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {usr.colegiatura ? (
                          <div>
                            <span className="font-mono font-bold text-blue-700">{usr.colegiatura}</span>
                            {usr.especialidad && (
                              <span className="text-neutral-500 block text-[11px]">{usr.especialidad}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-400 font-medium">{usr.cargo}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {usr.requiereCambioPassword ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                            <KeyRound className="w-3 h-3" />
                            <span>1 Solo Uso (Pendiente)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                            <Lock className="w-3 h-3" />
                            <span>Contraseña Privada</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleResetearClave(usr)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition"
                          title="Generar nueva contraseña temporal de 1 solo uso"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Resetear Clave</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Contenido Pestaña Auditoría */}
      {activeTab === "auditoria" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
              <h2 className="font-bold text-sm text-neutral-800">Log de Eventos Inmutables (Append-Only)</h2>
              <span className="text-xs text-neutral-400 font-medium">Cumplimiento ANPD & MINSA</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 text-neutral-600 text-xs font-bold uppercase tracking-wider border-b border-neutral-200">
                  <tr>
                    <th className="py-3 px-4">Hora</th>
                    <th className="py-3 px-4">Usuario</th>
                    <th className="py-3 px-4">Rol</th>
                    <th className="py-3 px-4">Acción</th>
                    <th className="py-3 px-4">Detalle del Registro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-mono text-xs">
                  {eventos.map((ev) => (
                    <tr key={ev.id} className="hover:bg-neutral-50/80 transition">
                      <td className="py-3.5 px-4 text-neutral-500">{ev.hora}</td>
                      <td className="py-3.5 px-4 text-neutral-900 font-sans font-medium">{ev.usuario}</td>
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-700">
                          {ev.rol}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`font-bold ${
                            ev.accion.includes("DENEGADO")
                              ? "text-rose-600"
                              : ev.accion.includes("SELLAR")
                              ? "text-purple-600"
                              : "text-emerald-600"
                          }`}
                        >
                          {ev.accion}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-sans text-xs text-neutral-600">{ev.detalle}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo Colaborador */}
      {showNewUserModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-neutral-200">
            <h3 className="text-lg font-black text-brand-900 mb-1">Dar de Alta a Nuevo Colaborador</h3>
            <p className="text-xs text-neutral-500 mb-4">
              La Dirección Técnica emitirá un usuario y una contraseña de 1 solo uso que el colaborador cambiará en su primer acceso.
            </p>

            <form onSubmit={handleCrearUsuario} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Nombres y Apellidos *</label>
                <input
                  type="text"
                  required
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  placeholder="Ej. Dra. Carmen Quispe"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Correo Institucional *</label>
                  <input
                    type="email"
                    required
                    value={nuevoEmail}
                    onChange={(e) => setNuevoEmail(e.target.value)}
                    placeholder="carmen.quispe@lasmellizasperu.com"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Sede Asignada *</label>
                  <select
                    value={nuevaSede}
                    onChange={(e) => setNuevaSede(e.target.value as "Independencia" | "Vivanco")}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-700"
                  >
                    <option value="Independencia">Sede Independencia</option>
                    <option value="Vivanco">Sede Vivanco</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Rol Operativo *</label>
                  <select
                    value={nuevoRol}
                    onChange={(e) => {
                      const r = e.target.value as any;
                      setNuevoRol(r);
                      if (r === "PROFESIONAL") setNuevoCargo("Médico Gineco-Obstetra");
                      else if (r === "RECEPCION") setNuevoCargo("Admisión & Citas");
                      else if (r === "CAJA") setNuevoCargo("Caja & Facturación");
                      else setNuevoCargo("Auditor Médico");
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-700"
                  >
                    <option value="PROFESIONAL">Profesional Médico / Obstetra</option>
                    <option value="RECEPCION">Recepción & Admisión</option>
                    <option value="CAJA">Caja & Cobranzas</option>
                    <option value="SUPERVISION">Supervisión & Auditoría</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Cargo / Puesto</label>
                  <input
                    type="text"
                    value={nuevoCargo}
                    onChange={(e) => setNuevoCargo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-700"
                  />
                </div>
              </div>

              {nuevoRol === "PROFESIONAL" && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50/70 rounded-xl border border-blue-200">
                  <div>
                    <label className="block text-xs font-bold text-blue-900 mb-1">
                      Colegiatura (CMP / COP) *
                    </label>
                    <input
                      type="text"
                      required
                      value={nuevaColegiatura}
                      onChange={(e) => setNuevaColegiatura(e.target.value)}
                      placeholder="Ej. CMP 65432 o COP 15200"
                      className="w-full px-3 py-2 rounded-xl border border-blue-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-blue-900 mb-1">
                      Especialidad / RNE
                    </label>
                    <input
                      type="text"
                      value={nuevaEspecialidad}
                      onChange={(e) => setNuevaEspecialidad(e.target.value)}
                      placeholder="Ej. Ginecología y Obstetricia"
                      className="w-full px-3 py-2 rounded-xl border border-blue-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-700"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowNewUserModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-brand-700 hover:bg-brand-800 text-white rounded-xl shadow"
                >
                  Crear y Generar Clave Temporal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Credencial Temporal Emitida */}
      {credencialGenerada && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-neutral-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-black text-neutral-900">Credencial Temporal de 1 Solo Uso</h3>
              <p className="text-xs text-neutral-500 mt-1">
                Entrega estos datos al colaborador. Al iniciar sesión, el sistema le exigirá definir su contraseña personal.
              </p>
            </div>

            <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200 space-y-2 text-xs font-mono">
              <p><strong>Colaborador:</strong> {credencialGenerada.nombre}</p>
              <p><strong>Usuario / Email:</strong> {credencialGenerada.email}</p>
              <p className="text-emerald-700 font-bold text-sm bg-emerald-50 p-2 rounded-xl border border-emerald-200 flex items-center justify-between">
                <span>Clave Temporal:</span>
                <span className="font-black text-base">{credencialGenerada.passwordTemporal}</span>
              </p>
              <p><strong>Sede:</strong> Sede {credencialGenerada.sede}</p>
              <p><strong>Rol:</strong> {credencialGenerada.rol}</p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={copiarCredenciales}
                className="flex-1 py-2.5 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
              >
                {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiado ? "¡Copiado al Portapapeles!" : "Copiar Credenciales"}</span>
              </button>
              <button
                type="button"
                onClick={() => setCredencialGenerada(null)}
                className="px-4 py-2.5 text-neutral-600 hover:bg-neutral-100 font-bold text-xs rounded-xl transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}