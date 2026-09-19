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
  Edit3,
  CheckCircle2,
  ShieldAlert,
  Trash2,
  X,
  AlertTriangle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import {
  registrarOActualizarColaboradorReal,
  resetearPasswordColaboradorReal,
  obtenerColaboradoresReales,
  eliminarColaboradorReal,
} from "@/app/actions/admin-users";
import { PADRON_OFICIAL_AUTORIZADO } from "@/lib/whitelist";

export interface UsuarioCredencial {
  id: string;
  email: string;
  nombre: string;
  rol: "RECEPCION_CAJA" | "PROFESIONAL" | "SUPERVISION" | "ADMIN";
  sede: "Independencia" | "Vivanco" | "Todas las Sedes";
  colegiatura?: string;
  especialidad?: string;
  cargo: string;
  requiereCambioPassword?: boolean;
  activo: boolean;
}

export default function SupervisionPage() {
  const [activeTab, setActiveTab] = useState<"personal" | "auditoria">("personal");
  const [usuarios, setUsuarios] = useState<UsuarioCredencial[]>([]);
  const [currentRole, setCurrentRole] = useState<string>("ADMIN");

  // Modal nuevo usuario
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [nuevoRol, setNuevoRol] = useState<"RECEPCION_CAJA" | "PROFESIONAL" | "SUPERVISION">("PROFESIONAL");
  const [nuevaSede, setNuevaSede] = useState<"Independencia" | "Vivanco">("Independencia");
  const [nuevaColegiatura, setNuevaColegiatura] = useState("");
  const [nuevaEspecialidad, setNuevaEspecialidad] = useState("");
  const [nuevoCargo, setNuevoCargo] = useState("Médico Especialista");

  // Modal editar usuario (Exclusivo Admin General)
  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioCredencial | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRol, setEditRol] = useState<"RECEPCION_CAJA" | "PROFESIONAL" | "SUPERVISION" | "ADMIN">("PROFESIONAL");
  const [editSede, setEditSede] = useState<"Independencia" | "Vivanco" | "Todas las Sedes">("Independencia");
  const [editColegiatura, setEditColegiatura] = useState("");
  const [editEspecialidad, setEditEspecialidad] = useState("");
  const [editCargo, setEditCargo] = useState("");
  const [editActivo, setEditActivo] = useState(true);

  // Modal credencial temporal generada
  const [credencialGenerada, setCredencialGenerada] = useState<{
    nombre: string;
    email: string;
    passwordTemporal: string;
    rol: string;
    sede: string;
  } | null>(null);

  const [copiado, setCopiado] = useState(false);
  const [usuarioAEliminar, setUsuarioAEliminar] = useState<UsuarioCredencial | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal cambio voluntario de clave del Administrador General
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState(false);
  const [adminNewPassword, setAdminNewPassword] = useState("");
  const [adminConfirmPassword, setAdminConfirmPassword] = useState("");
  const [isAdminPasswordSaving, setIsAdminPasswordSaving] = useState(false);
  const [adminPasswordMsg, setAdminPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const cargarPersonal = async () => {
    try {
      // 1. Prioridad: Consulta en vivo con el cliente Supabase (autenticado como Admin)
      const { data: dbProfiles, error: dbError } = await supabase
        .from("perfil_usuario")
        .select("*, sede:site_id(nombre)")
        .order("created_at", { ascending: false });

      if (!dbError && dbProfiles && dbProfiles.length > 0) {
        setUsuarios(
          dbProfiles.map((p: any) => ({
            id: p.id,
            email: p.email,
            nombre: p.nombre_completo,
            rol: p.rol === "RECEPCION" || p.rol === "CAJA" ? "RECEPCION_CAJA" : p.rol,
            sede: p.sede?.nombre || (p.site_id === "b0000000-0000-0000-0000-000000000002" ? "Vivanco" : p.site_id ? "Independencia" : "Todas las Sedes"),
            colegiatura: p.colegiatura,
            especialidad: p.especialidad,
            cargo: p.especialidad || (p.rol === "PROFESIONAL" ? "Médico / Obstetra" : "Admisión & Caja"),
            activo: p.activo !== false,
          }))
        );
        return;
      }

      // 2. Fallback: Server Action
      const res = await obtenerColaboradoresReales();
      if (res.success && res.colaboradores.length > 0) {
        setUsuarios(
          res.colaboradores.map((p: any) => ({
            id: p.id,
            email: p.email,
            nombre: p.nombre_completo,
            rol: p.rol === "RECEPCION" || p.rol === "CAJA" ? "RECEPCION_CAJA" : p.rol,
            sede: p.sede?.nombre || (p.site_id === "b0000000-0000-0000-0000-000000000002" ? "Vivanco" : p.site_id ? "Independencia" : "Todas las Sedes"),
            colegiatura: p.colegiatura,
            especialidad: p.especialidad,
            cargo: p.especialidad || (p.rol === "PROFESIONAL" ? "Médico / Obstetra" : "Admisión & Caja"),
            activo: p.activo !== false,
          }))
        );
        return;
      }
    } catch (err) {
      console.error("Error al sincronizar personal:", err);
    }

    // 3. Fallback defensivo padrón oficial
    setUsuarios(
      PADRON_OFICIAL_AUTORIZADO.map((cta, idx) => ({
        id: `padron-${idx}`,
        email: cta.email,
        nombre: cta.nombre,
        rol: cta.rol,
        sede: cta.sede === "Central" ? "Todas las Sedes" : cta.sede,
        colegiatura: cta.colegiatura,
        especialidad: cta.especialidad,
        cargo: cta.cargo,
        activo: true,
      }))
    );
  };

  useEffect(() => {
    async function initAdminRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email === "admin@lasmellizasperu.com") {
        setCurrentRole("ADMIN");
        sessionStorage.setItem("lm_rol", "ADMIN");
      } else {
        const r = sessionStorage.getItem("lm_rol") || "SUPERVISION";
        setCurrentRole(r);
      }
      cargarPersonal();
    }
    initAdminRole();
  }, []);

  const isAdmin = currentRole === "ADMIN";

  interface EventoAuditoria {
    id: string;
    hora: string;
    usuario: string;
    rol: string;
    accion: string;
    entidad: string;
    entidadId: string;
    detalle: string;
  }

  const [eventosAuditoria, setEventosAuditoria] = useState<EventoAuditoria[]>([]);
  const [cargandoAuditoria, setCargandoAuditoria] = useState(false);

  const cargarAuditoriaReal = async () => {
    setCargandoAuditoria(true);
    try {
      const { data, error } = await supabase
        .from("auditoria")
        .select(`
          id,
          fecha_hora,
          accion,
          entidad,
          entidad_id,
          detalle,
          usuario:usuario_id (
            nombre_completo,
            email,
            rol
          )
        `)
        .order("fecha_hora", { ascending: false })
        .limit(50);

      if (!error && data) {
        const mapeados: EventoAuditoria[] = data.map((item: any) => {
          const usr = item.usuario || {};
          const d = new Date(item.fecha_hora);
          const horaStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
          let detalleStr = "";
          if (typeof item.detalle === "string") {
            detalleStr = item.detalle;
          } else if (item.detalle && typeof item.detalle === "object") {
            detalleStr = Object.entries(item.detalle)
              .map(([k, v]) => `${k}: ${v}`)
              .join(" | ");
          }

          return {
            id: item.id,
            hora: horaStr,
            usuario: usr.email || usr.nombre_completo || "Sistema / Transacción",
            rol: usr.rol || "AUDITORIA",
            accion: item.accion,
            entidad: item.entidad,
            entidadId: item.entidad_id || "",
            detalle: detalleStr || `${item.entidad}: ${item.entidad_id || "Operación registrada"}`,
          };
        });
        setEventosAuditoria(mapeados);
      }
    } catch (err) {
      console.warn("Error consultando auditoria:", err);
    } finally {
      setCargandoAuditoria(false);
    }
  };

  useEffect(() => {
    if (activeTab === "auditoria") {
      cargarAuditoriaReal();
    }
  }, [activeTab]);

  const handleConfirmarEliminar = async () => {
    if (!usuarioAEliminar || !isAdmin) return;
    if (usuarioAEliminar.email === "admin@lasmellizasperu.com") {
      alert("Operación denegada: No es posible eliminar la cuenta principal de Administración General.");
      setUsuarioAEliminar(null);
      return;
    }

    setIsDeleting(true);
    const res = await eliminarColaboradorReal(usuarioAEliminar.id, usuarioAEliminar.email);
    setIsDeleting(false);

    if (res.success) {
      if (usuarioEditando?.id === usuarioAEliminar.id) {
        setUsuarioEditando(null);
      }
      setUsuarioAEliminar(null);
      cargarPersonal();
    } else {
      alert("Error al dar de baja al colaborador: " + res.error);
    }
  };

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const passwordTemporal = "Mellizas#2026!";
    const res = await registrarOActualizarColaboradorReal({
      email: nuevoEmail,
      nombre: nuevoNombre,
      rol: nuevoRol,
      sede: nuevaSede,
      colegiatura: nuevaColegiatura,
      especialidad: nuevaEspecialidad,
      cargo: nuevoCargo,
      password: passwordTemporal,
    });

    if (res.success) {
      setShowNewUserModal(false);
      setCredencialGenerada({
        nombre: nuevoNombre,
        email: nuevoEmail,
        passwordTemporal,
        rol: nuevoRol,
        sede: nuevaSede,
      });

      setNuevoNombre("");
      setNuevoEmail("");
      setNuevaColegiatura("");
      setNuevaEspecialidad("");
      cargarPersonal();
    } else {
      alert("Error al registrar colaborador: " + res.error);
    }
  };

  const handleAbrirEditar = (usr: UsuarioCredencial) => {
    if (!isAdmin) return;
    setUsuarioEditando(usr);
    setEditNombre(usr.nombre);
    setEditEmail(usr.email);
    setEditRol(usr.rol);
    setEditSede(usr.sede);
    setEditColegiatura(usr.colegiatura || "");
    setEditEspecialidad(usr.especialidad || "");
    setEditCargo(usr.cargo);
    setEditActivo(usr.activo);
  };

  const [isSavingUser, setIsSavingUser] = useState(false);

  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioEditando) return;

    if (!isAdmin) {
      alert("Acceso denegado: Se requieren permisos de Administrador General (admin@lasmellizasperu.com) para modificar colaboradores.\n\nUsuario actual: " + (sessionStorage.getItem("lm_user") || "No identificado"));
      return;
    }

    setIsSavingUser(true);
    const cleanEmail = editEmail.trim().toLowerCase();
    const cleanNombre = editNombre.trim();
    const cleanColegiatura = editColegiatura.trim() || null;
    const cleanEspecialidad = editEspecialidad.trim() || null;
    const siteId = editSede === "Vivanco" ? "b0000000-0000-0000-0000-000000000002" : "b0000000-0000-0000-0000-000000000001";

    let success = false;
    let errorMessage = "";

    // 1. Si tenemos un UUID válido, intentar actualizar directamente con el cliente Supabase
    const isRealUuid = Boolean(usuarioEditando.id && !usuarioEditando.id.startsWith("padron-"));
    if (isRealUuid) {
      try {
        const { error: rpcErr } = await supabase.rpc("actualizar_perfil_colaborador", {
          p_id: usuarioEditando.id,
          p_nombre: cleanNombre,
          p_rol: editRol,
          p_site_id: siteId,
          p_colegiatura: cleanColegiatura,
          p_especialidad: cleanEspecialidad,
          p_activo: editActivo,
          p_email: cleanEmail,
        });

        if (!rpcErr) {
          success = true;
        } else {
          // Intentar actualización directa en perfil_usuario
          const { error: updateErr } = await supabase
            .from("perfil_usuario")
            .update({
              email: cleanEmail,
              nombre_completo: cleanNombre,
              rol: editRol,
              site_id: siteId,
              colegiatura: cleanColegiatura,
              especialidad: cleanEspecialidad,
              activo: editActivo,
              updated_at: new Date().toISOString(),
            })
            .eq("id", usuarioEditando.id);

          if (!updateErr) {
            success = true;
          } else {
            errorMessage = updateErr.message;
          }
        }
      } catch (err: any) {
        errorMessage = err.message;
      }
    }

    // 2. Fallback a Server Action (soporta también mapeo con emailAnterior)
    if (!success) {
      const res = await registrarOActualizarColaboradorReal({
        id: usuarioEditando.id,
        email: cleanEmail,
        emailAnterior: usuarioEditando.email,
        nombre: cleanNombre,
        rol: editRol,
        sede: editSede,
        colegiatura: cleanColegiatura || undefined,
        especialidad: cleanEspecialidad || undefined,
        cargo: editCargo,
        activo: editActivo,
      });

      if (res.success) {
        success = true;
      } else {
        errorMessage = res.error || errorMessage || "Error al actualizar perfil";
      }
    }

    setIsSavingUser(false);

    if (success) {
      setUsuarioEditando(null);
      await cargarPersonal();
      alert("✅ Cambios guardados exitosamente para " + cleanNombre);
    } else {
      alert("❌ Error al actualizar colaborador: " + errorMessage);
    }
  };

  const handleCambiarPasswordAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPasswordMsg(null);

    if (adminNewPassword.length < 8) {
      setAdminPasswordMsg({ type: "error", text: "La contraseña debe contener al menos 8 caracteres." });
      return;
    }
    if (adminNewPassword !== adminConfirmPassword) {
      setAdminPasswordMsg({ type: "error", text: "Las contraseñas ingresadas no coinciden." });
      return;
    }

    setIsAdminPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: adminNewPassword,
      });

      if (error) {
        setAdminPasswordMsg({ type: "error", text: error.message });
      } else {
        setAdminPasswordMsg({ type: "success", text: "Contraseña de Administrador General actualizada exitosamente." });
        setTimeout(() => {
          setShowAdminPasswordModal(false);
          setAdminNewPassword("");
          setAdminConfirmPassword("");
          setAdminPasswordMsg(null);
        }, 2000);
      }
    } catch (err: any) {
      setAdminPasswordMsg({ type: "error", text: err.message || "Error al actualizar la contraseña." });
    } finally {
      setIsAdminPasswordSaving(false);
    }
  };

  const handleResetearClave = async (usr: UsuarioCredencial) => {
    if (!isAdmin) return;
    const res = await resetearPasswordColaboradorReal(usr.email);
    if (res.success && res.passwordTemporal) {
      setCredencialGenerada({
        nombre: usr.nombre,
        email: usr.email,
        passwordTemporal: res.passwordTemporal,
        rol: usr.rol,
        sede: usr.sede,
      });
      cargarPersonal();
    } else {
      alert("Error al resetear contraseña: " + res.error);
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
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Supervisión, Personal & Auditoría</h1>
          <p className="text-xs text-neutral-500">
            Gobernanza clínica, administración de colaboradores y trazabilidad criptográfica.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setShowAdminPasswordModal(true)}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-sm transition"
            >
              <KeyRound className="w-4 h-4 text-brand-700" />
              <span>Cambiar mi Contraseña</span>
            </button>
          )}
          {activeTab === "personal" && isAdmin && (
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

      {/* Alerta de Perfil y Gobernanza */}
      {isAdmin ? (
        <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-900">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
            <div>
              <span className="font-extrabold">Modo Administrador General Activo:</span>
              <span className="ml-1 text-emerald-800">
                Tienes autorización para <strong>editar los datos sintéticos de cualquier colaborador</strong> (nombres reales, correos y colegiaturas CMP/COP) y emitir contraseñas temporales.
              </span>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-300">
            Control Total
          </span>
        </div>
      ) : (
        <div className="bg-purple-50 border border-purple-200 p-3.5 rounded-2xl flex items-center gap-2.5 text-xs text-purple-900">
          <ShieldAlert className="w-5 h-5 text-purple-700 shrink-0" />
          <div>
            <span className="font-extrabold">Perfil Auditor / Supervisión (Solo Lectura):</span>
            <span className="ml-1 text-purple-800">
              La edición de colaboradores y reseteo de claves está reservada exclusivamente a la <strong>Dirección General (ADMIN)</strong> para garantizar la segregación de funciones.
            </span>
          </div>
        </div>
      )}

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
                  Reemplaza los datos sintéticos por la información verídica de tu personal (CMP, COP, nombres completos).
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 text-neutral-600 text-xs font-bold uppercase tracking-wider border-b border-neutral-200">
                  <tr>
                    <th className="py-3 px-4">Colaborador</th>
                    <th className="py-3 px-4">Rol Asignado</th>
                    <th className="py-3 px-4">Sede Asignada</th>
                    <th className="py-3 px-4">Colegiatura / Especialidad</th>
                    <th className="py-3 px-4">Estado Clave</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {usuarios.map((usr) => (
                    <tr key={usr.id} className="hover:bg-neutral-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-neutral-900 block leading-tight">{usr.nombre}</span>
                          {!usr.activo && (
                            <span className="text-[9px] font-bold bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded">
                              Inactivo
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-neutral-500">{usr.email}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                            usr.rol === "RECEPCION_CAJA"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : usr.rol === "PROFESIONAL"
                              ? "bg-blue-50 text-blue-800 border border-blue-200"
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
                        {isAdmin ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleAbrirEditar(usr)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-brand-800 bg-brand-50 hover:bg-brand-100 rounded-lg border border-brand-200 transition"
                              title="Editar datos reales del colaborador"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Editar</span>
                            </button>
                            <button
                              onClick={() => handleResetearClave(usr)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition"
                              title="Generar nueva clave de 1 solo uso"
                            >
                              <RefreshCw className="w-3 h-3" />
                            </button>
                            {usr.email !== "admin@lasmellizasperu.com" && (
                              <button
                                onClick={() => setUsuarioAEliminar(usr)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition"
                                title="Eliminar cuenta y revocar acceso definitivamente"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-neutral-400 font-medium">Solo Lectura</span>
                        )}
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
              <div>
                <h2 className="font-bold text-sm text-neutral-800">Log de Eventos Inmutables (Append-Only)</h2>
                <span className="text-xs text-neutral-400 font-medium">Cumplimiento ANPD & MINSA &bull; Registro en Tiempo Real</span>
              </div>
              <button
                onClick={cargarAuditoriaReal}
                disabled={cargandoAuditoria}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${cargandoAuditoria ? "animate-spin" : ""}`} />
                <span>Actualizar Bitácora</span>
              </button>
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
                  {cargandoAuditoria && eventosAuditoria.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-neutral-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-brand-700" />
                        <span className="font-sans">Cargando registros forenses desde Supabase...</span>
                      </td>
                    </tr>
                  ) : eventosAuditoria.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-neutral-400 font-sans">
                        No se registran eventos de auditoría en la base de datos aún.
                      </td>
                    </tr>
                  ) : (
                    eventosAuditoria.map((ev) => (
                      <tr key={ev.id} className="hover:bg-neutral-50/80 transition">
                        <td className="py-3.5 px-4 text-neutral-500 whitespace-nowrap">{ev.hora}</td>
                        <td className="py-3.5 px-4 text-neutral-900 font-sans font-medium">{ev.usuario}</td>
                        <td className="py-3.5 px-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-700">
                            {ev.rol}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`font-bold ${
                              ev.accion.includes("DENEGADO") || ev.accion.includes("ELIMINAR") || ev.accion.includes("REVERTIR")
                                ? "text-amber-700"
                                : ev.accion.includes("SELLAR") || ev.accion.includes("HCE")
                                ? "text-purple-600"
                                : "text-emerald-600"
                            }`}
                          >
                            {ev.accion}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-sans text-xs text-neutral-600 break-words max-w-md">{ev.detalle}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Colaborador (Exclusivo Administrador General) */}
      {usuarioEditando && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-neutral-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-black text-brand-900">Editar Datos del Colaborador</h3>
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                Admin General
              </span>
            </div>
            <p className="text-xs text-neutral-500 mb-4">
              Actualiza la información sintética por los nombres, correo institucional y colegiatura oficial (CMP/COP) del trabajador.
            </p>

            <form onSubmit={handleGuardarEdicion} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Nombres y Apellidos Reales *
                </label>
                <input
                  type="text"
                  required
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs font-bold focus:ring-2 focus:ring-brand-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Correo Institucional Real *
                  </label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-brand-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Sede Asignada *
                  </label>
                  <select
                    value={editSede}
                    onChange={(e) => setEditSede(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-brand-700"
                  >
                    <option value="Independencia">Sede Independencia</option>
                    <option value="Vivanco">Sede Vivanco</option>
                    <option value="Todas las Sedes">Todas las Sedes (Central)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Rol Asignado *
                  </label>
                  <select
                    value={editRol}
                    onChange={(e) => setEditRol(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-brand-700"
                  >
                    <option value="PROFESIONAL">PROFESIONAL (Médico/Obstetra)</option>
                    <option value="RECEPCION_CAJA">RECEPCION_CAJA (Admisión & Caja Unificada)</option>
                    <option value="SUPERVISION">SUPERVISION (Auditoría)</option>
                    <option value="ADMIN">ADMIN (Dirección General)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Cargo o Puesto
                  </label>
                  <input
                    type="text"
                    value={editCargo}
                    onChange={(e) => setEditCargo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-brand-700"
                  />
                </div>
              </div>

              {(editRol === "PROFESIONAL" || editColegiatura) && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50/70 rounded-xl border border-blue-200">
                  <div>
                    <label className="block text-xs font-bold text-blue-900 mb-1">
                      Colegiatura Oficial (CMP / COP)
                    </label>
                    <input
                      type="text"
                      value={editColegiatura}
                      onChange={(e) => setEditColegiatura(e.target.value)}
                      placeholder="Ej. CMP 54321 o COP 12890"
                      className="w-full px-3 py-2 rounded-xl border border-blue-300 text-xs bg-white focus:ring-2 focus:ring-blue-700 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-blue-900 mb-1">
                      Especialidad / RNE
                    </label>
                    <input
                      type="text"
                      value={editEspecialidad}
                      onChange={(e) => setEditEspecialidad(e.target.value)}
                      placeholder="Ej. Ginecología y Obstetricia"
                      className="w-full px-3 py-2 rounded-xl border border-blue-300 text-xs bg-white focus:ring-2 focus:ring-blue-700"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chkActivo"
                  checked={editActivo}
                  onChange={(e) => setEditActivo(e.target.checked)}
                  className="rounded text-brand-700 focus:ring-brand-700"
                />
                <label htmlFor="chkActivo" className="text-xs font-bold text-neutral-700 cursor-pointer">
                  Cuenta activa (Desmarcar para suspender acceso por cese de personal)
                </label>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
                {usuarioEditando.email !== "admin@lasmellizasperu.com" ? (
                  <button
                    type="button"
                    onClick={() => {
                      const u = usuarioEditando;
                      setUsuarioEditando(null);
                      setUsuarioAEliminar(u);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Cuenta</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setUsuarioEditando(null)}
                    className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingUser}
                    className="px-5 py-2 text-xs font-bold bg-brand-700 hover:bg-brand-800 text-white rounded-xl shadow inline-flex items-center gap-1.5 disabled:opacity-60"
                  >
                    {isSavingUser ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Guardando cambios...</span>
                      </>
                    ) : (
                      <span>Guardar Cambios Oficiales</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmación de Eliminación Definitiva */}
      {usuarioAEliminar && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-rose-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto mb-4 border border-rose-200">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-black text-neutral-900 text-center mb-1">
              ¿Eliminar cuenta definitivamente?
            </h3>
            <p className="text-xs text-neutral-600 text-center mb-4 leading-relaxed">
              Está a punto de dar de baja y purgar la cuenta de:
              <br />
              <strong className="text-neutral-900 font-bold">{usuarioAEliminar.nombre}</strong>
              <br />
              <span className="font-mono text-neutral-500 text-[11px]">{usuarioAEliminar.email}</span>
            </p>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 mb-5 leading-relaxed">
              ⚠️ <strong>Principio de Confianza Cero:</strong> Esta acción revocará todos los accesos clínicos y tokens de sesión de manera irrevocable tanto en la base de datos como en Supabase Auth.
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setUsuarioAEliminar(null)}
                className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmarEliminar}
                className="px-5 py-2 text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white rounded-xl shadow transition inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sí, Eliminar Cuenta</span>
                  </>
                )}
              </button>
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
                      else if (r === "RECEPCION_CAJA") setNuevoCargo("Admisión & Caja Unificada");
                      else setNuevoCargo("Auditor Médico");
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-700"
                  >
                    <option value="PROFESIONAL">Profesional Médico / Obstetra</option>
                    <option value="RECEPCION_CAJA">Admisión & Caja Unificada</option>
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

      {/* Modal Cambio de Contraseña del Administrador General */}
      {showAdminPasswordModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-100 text-brand-800 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-neutral-900">Cambiar Mi Contraseña de Administrador</h3>
                  <p className="text-[11px] text-neutral-500">Dirección Médica & Gobernanza (admin@lasmellizasperu.com)</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAdminPasswordModal(false);
                  setAdminPasswordMsg(null);
                }}
                className="p-1 hover:bg-neutral-100 rounded-lg text-neutral-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {adminPasswordMsg && (
              <div
                className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                  adminPasswordMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {adminPasswordMsg.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{adminPasswordMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleCambiarPasswordAdmin} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Nueva Contraseña Privada *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={adminNewPassword}
                  onChange={(e) => setAdminNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres (letras, números, símbolos)"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-brand-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Confirmar Nueva Contraseña *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={adminConfirmPassword}
                  onChange={(e) => setAdminConfirmPassword(e.target.value)}
                  placeholder="Repita la nueva contraseña exactamente"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-brand-700"
                />
              </div>

              <p className="text-[11px] text-neutral-500 bg-neutral-50 p-2.5 rounded-xl border border-neutral-200 leading-relaxed">
                ℹ️ Esta acción actualizará de forma criptográfica su credencial en <strong>Supabase Auth</strong>. Asegúrese de guardar o recordar su nueva clave para futuros ingresos.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminPasswordModal(false);
                    setAdminPasswordMsg(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isAdminPasswordSaving}
                  className="px-5 py-2 text-xs font-bold bg-brand-700 hover:bg-brand-800 text-white rounded-xl shadow inline-flex items-center gap-1.5 disabled:opacity-60"
                >
                  {isAdminPasswordSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Actualizando...</span>
                    </>
                  ) : (
                    <span>Actualizar Mi Contraseña</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}