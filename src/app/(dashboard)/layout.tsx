"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Stethoscope,
  ShieldCheck,
  LogOut,
  MapPin,
  Lock,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ArrowLeft,
  DollarSign,
  UserCheck,
  Clock,
  Baby,
  Activity,
  Layers,
  FlaskConical,
  Check,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { HceSpecialtyProvider, useHceSpecialty } from "@/context/HceSpecialtyContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <HceSpecialtyProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </HceSpecialtyProvider>
  );
}

function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    modalidadAtencion,
    setModalidadAtencion,
    tipoEcografia,
    setTipoEcografia,
    pacientesEspera,
    pacientesAtendidos,
    selectedPatientId,
    vistaCola,
    setVistaCola,
    sedeCola,
    onSelectPatient,
    onReopenPatient,
  } = useHceSpecialty();

  const [rol, setRol] = useState<string | null>(null);
  const [user, setUser] = useState<string>("");
  const [sede, setSede] = useState<string>("Independencia");
  const [nombre, setNombre] = useState<string>("");
  const [colegiatura, setColegiatura] = useState<string>("");
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const [horaActual, setHoraActual] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setHoraActual(
        now.toLocaleTimeString("es-PE", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function syncUserSession() {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        sessionStorage.clear();
        router.push("/login");
        return;
      }

      const email = authUser.email || "";

      if (email === "admin@lasmellizasperu.com") {
        setRol("ADMIN");
        setUser(email);
        setNombre("Dirección Médica & Gestión");
        setSede("Todas las Sedes");
        setColegiatura("CMP 99881");
        sessionStorage.setItem("lm_rol", "ADMIN");
        sessionStorage.setItem("lm_user", email);
        sessionStorage.setItem("lm_nombre", "Dirección Médica & Gestión");
        sessionStorage.setItem("lm_sede", "Todas las Sedes");
        sessionStorage.setItem("lm_colegiatura", "CMP 99881");
        setMounted(true);
        return;
      }

      // Consultar perfil_usuario real
      const { data: profile } = await supabase
        .from("perfil_usuario")
        .select("rol, nombre_completo, site_id, colegiatura, especialidad, sede:site_id(nombre)")
        .eq("id", authUser.id)
        .maybeSingle();

      let detectedRole = profile?.rol || sessionStorage.getItem("lm_rol") || "RECEPCION_CAJA";
      if (detectedRole === "RECEPCION" || detectedRole === "CAJA") {
        detectedRole = "RECEPCION_CAJA";
      }

      const detectedNombre = profile?.nombre_completo || sessionStorage.getItem("lm_nombre") || email;
      const rawSede = (profile as any)?.sede?.nombre || sessionStorage.getItem("lm_sede") || "Independencia";
      const detectedSede = rawSede.replace(/^Sede\s+/i, "").trim();
      const detectedCol = profile?.colegiatura || sessionStorage.getItem("lm_colegiatura") || "";

      setRol(detectedRole);
      setUser(email);
      setNombre(detectedNombre);
      setSede(detectedSede);
      setColegiatura(detectedCol);

      sessionStorage.setItem("lm_rol", detectedRole);
      sessionStorage.setItem("lm_user", email);
      sessionStorage.setItem("lm_nombre", detectedNombre);
      sessionStorage.setItem("lm_sede", detectedSede);
      if (detectedCol) sessionStorage.setItem("lm_colegiatura", detectedCol);

      setMounted(true);
    }

    syncUserSession();
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    sessionStorage.clear();
    document.cookie = "lm_auth_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "lm_auth_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/login");
  };

  // ============================================================================
  // ARQUITECTURA "CERO CURIOSIDAD": EVALUACIÓN ESTRICTA EN EL DOM
  // Si el usuario no tiene el rol, los items NO SE RENDERIZAN en el DOM.
  // ============================================================================
  interface NavItem {
    href: string;
    label: string;
    icon: any;
    badge?: string;
  }

  const getAuthorizedNavItems = (): NavItem[] => {
    const items: NavItem[] = [];

    // Admisión y Caja Unificada
    if (rol === "RECEPCION_CAJA" || rol === "ADMIN") {
      items.push({
        href: "/admision-caja",
        label: "Admisión & Caja",
        icon: DollarSign,
      });
    }

    // Consultorio Médico / HCE
    if (rol === "PROFESIONAL" || rol === "SUPERVISION" || rol === "ADMIN") {
      items.push({
        href: "/hce",
        label: "Consultorio HCE",
        icon: Stethoscope,
      });
    }

    // Supervisión, Auditoría y Personal
    if (rol === "SUPERVISION" || rol === "ADMIN") {
      items.push({
        href: "/supervision",
        label: "Supervisión & Auditoría",
        icon: ShieldCheck,
      });
    }

    return items;
  };

  const authorizedNavItems = getAuthorizedNavItems();

  // Guardián contra manipulación forzada de URLs
  const routePermissions: Record<string, string[]> = {
    "/admision-caja": ["RECEPCION_CAJA", "ADMIN"],
    "/hce": ["PROFESIONAL", "SUPERVISION", "ADMIN"],
    "/supervision": ["SUPERVISION", "ADMIN"],
  };

  const currentPrefix = "/" + (pathname.split("/")[1] || "admision-caja");
  const allowedRoles = routePermissions[currentPrefix];
  const isAuthorizedCurrentRoute = !allowedRoles || (Boolean(rol) && allowedRoles.includes(rol as string));

  const getAuthorizedHome = () => {
    if (rol === "PROFESIONAL") return "/hce";
    if (rol === "SUPERVISION" || rol === "ADMIN") return "/supervision";
    return "/admision-caja";
  };

  if (!mounted) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-brand-50/40">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-700 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-brand-900 font-mono">Verificando Credenciales Clínicas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#f8f9fa] text-neutral-900 antialiased font-sans">
      {/* ==================================================================== */}
      {/* COLUMNA 1: SIDEBAR IZQUIERDO COLOR VINO INSTITUCIONAL                */}
      {/* ==================================================================== */}
      <aside
        className={`${
          isCollapsed ? "w-16" : "w-64"
        } bg-[#18030a] text-neutral-300 border-r border-[#300a16] flex flex-col justify-between transition-all duration-200 sticky top-0 h-screen select-none shrink-0 z-40`}
      >
        {/* Contenedor Superior con Scroll Suave para Submenús */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {/* Cabecera del Sidebar */}
          <div className="h-14 flex items-center justify-between px-3.5 border-b border-[#300a16] shrink-0">
            <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-white p-0.5 flex items-center justify-center shrink-0 shadow-xs">
                <img
                  src="/logo-oficial.jpg?v=2"
                  alt="Logo Las Mellizas"
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
              {!isCollapsed && (
                <div className="truncate">
                  <span className="font-bold text-xs text-white block leading-none truncate">
                    Las Mellizas
                  </span>
                  <span className="text-[10px] text-brand-300/80 font-mono block mt-0.5">
                    Enterprise HCE
                  </span>
                </div>
              )}
            </Link>

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-white transition"
              title={isCollapsed ? "Expandir menú" : "Colapsar menú"}
            >
              {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Sede Operativa Fija */}
          {!isCollapsed && (
            <div className="px-3.5 py-2 border-b border-[#300a16] bg-black/20 text-[11px] flex items-center justify-between shrink-0">
              <span className="flex items-center gap-1.5 font-medium text-neutral-400">
                <MapPin className="w-3 h-3 text-brand-400" />
                <span>Sede {sede}</span>
              </span>
              <span className="text-[9px] font-mono text-brand-300/90 uppercase bg-brand-950/80 border border-brand-800/60 px-1 py-0.2 rounded">
                Zero Trust
              </span>
            </div>
          )}

          {/* Navegación Estricta Filtrada con Selector Clínico Integrado */}
          <nav className="p-2 space-y-1.5 flex-1">
            {authorizedNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              const isHceItem = item.href === "/hce";

              return (
                <div key={item.href} className="space-y-1">
                  <Link
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                      isActive
                        ? "bg-white text-neutral-950 shadow-sm"
                        : "text-neutral-400 hover:text-white hover:bg-white/5"
                    }`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </Link>

                  {/* ========================================================== */}
                  {/* SELECTOR CLÍNICO RECOLOCADO EN EL ESPACIO COLOR VINO      */}
                  {/* (UBICADO DIRECTAMENTE DEBAJO DE "CONSULTORIO HCE")        */}
                  {/* ========================================================== */}
                  {isHceItem && isActive && (
                    <div
                      className={`mt-1.5 space-y-1 animate-in fade-in duration-200 ${
                        isCollapsed
                          ? "px-0.5"
                          : "pl-2 pr-0.5 border-l-2 border-brand-700/60 ml-2"
                      }`}
                    >
                      {!isCollapsed && (
                        <div className="flex items-center justify-between px-1 py-0.5 text-[9px] font-mono uppercase tracking-wider text-brand-300/80 font-bold">
                          <span>Perfil & Especialidad</span>
                          <span className="text-neutral-500">NTS 139</span>
                        </div>
                      )}

                      {/* 1. Obstetricia & Prenatal (COP 13102) */}
                      <button
                        type="button"
                        onClick={() => setModalidadAtencion("OBSTETRICIA")}
                        title={isCollapsed ? "Obstetricia & Prenatal (COP 13102 - Obstetra)" : undefined}
                        className={`w-full p-1.5 rounded-lg text-left transition flex items-center justify-between border ${
                          modalidadAtencion === "OBSTETRICIA"
                            ? "bg-rose-950/80 border-rose-500 text-white shadow-xs ring-1 ring-rose-500/40"
                            : "bg-black/20 border-[#300a16] text-neutral-300 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                              modalidadAtencion === "OBSTETRICIA"
                                ? "bg-rose-600 text-white"
                                : "bg-neutral-900 text-neutral-400"
                            }`}
                          >
                            <Baby className="w-3.5 h-3.5" />
                          </div>
                          {!isCollapsed && (
                            <div className="truncate">
                              <span className="text-[11px] font-bold block leading-tight truncate">
                                Obstetricia & Prenatal
                              </span>
                              <span className="text-[9px] font-mono text-rose-300 block">
                                COP 13102 • Obstetra
                              </span>
                            </div>
                          )}
                        </div>
                        {!isCollapsed && modalidadAtencion === "OBSTETRICIA" && (
                          <Check className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        )}
                      </button>

                      {/* 2. Ginecología Especializada (CMP 72450) */}
                      <button
                        type="button"
                        onClick={() => setModalidadAtencion("GINECOLOGIA")}
                        title={isCollapsed ? "Ginecología Especializada (CMP 72450 - Ginecólogo)" : undefined}
                        className={`w-full p-1.5 rounded-lg text-left transition flex items-center justify-between border ${
                          modalidadAtencion === "GINECOLOGIA"
                            ? "bg-purple-950/80 border-purple-500 text-white shadow-xs ring-1 ring-purple-500/40"
                            : "bg-black/20 border-[#300a16] text-neutral-300 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                              modalidadAtencion === "GINECOLOGIA"
                                ? "bg-purple-600 text-white"
                                : "bg-neutral-900 text-neutral-400"
                            }`}
                          >
                            <Activity className="w-3.5 h-3.5" />
                          </div>
                          {!isCollapsed && (
                            <div className="truncate">
                              <span className="text-[11px] font-bold block leading-tight truncate">
                                Ginecología Especializada
                              </span>
                              <span className="text-[9px] font-mono text-purple-300 block">
                                CMP 72450 • Ginecólogo
                              </span>
                            </div>
                          )}
                        </div>
                        {!isCollapsed && modalidadAtencion === "GINECOLOGIA" && (
                          <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        )}
                      </button>

                      {/* 3. Ecografía Especializada (8 Modalidades) */}
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => setModalidadAtencion("ECOGRAFIA")}
                          title={isCollapsed ? "Ecografía Especializada (8 modalidades)" : undefined}
                          className={`w-full p-1.5 rounded-lg text-left transition flex items-center justify-between border ${
                            modalidadAtencion === "ECOGRAFIA"
                              ? "bg-sky-950/80 border-sky-500 text-white shadow-xs ring-1 ring-sky-500/40"
                              : "bg-black/20 border-[#300a16] text-neutral-300 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                                modalidadAtencion === "ECOGRAFIA"
                                  ? "bg-sky-600 text-white"
                                  : "bg-neutral-900 text-neutral-400"
                              }`}
                            >
                              <Layers className="w-3.5 h-3.5" />
                            </div>
                            {!isCollapsed && (
                              <div className="truncate">
                                <span className="text-[11px] font-bold block leading-tight truncate">
                                  Ecografía Especializada
                                </span>
                                <span className="text-[9px] font-mono text-sky-300 block">
                                  8 Modalidades Clínicas
                                </span>
                              </div>
                            )}
                          </div>
                          {!isCollapsed && modalidadAtencion === "ECOGRAFIA" && (
                            <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          )}
                        </button>

                        {/* Sub-selector de las 8 Modalidades Ecográficas (desplegado si está en ECOGRAFIA) */}
                        {!isCollapsed && modalidadAtencion === "ECOGRAFIA" && (
                          <div className="ml-1.5 pl-2 border-l border-sky-800/60 space-y-1 py-1 animate-in fade-in duration-150">
                            <div className="flex items-center justify-between px-0.5 text-[8.5px] font-mono uppercase text-sky-300 font-bold">
                              <span>Modalidad:</span>
                              <span className="bg-sky-900/80 border border-sky-700/60 px-1 py-0.2 rounded text-[8px] text-sky-200">
                                {tipoEcografia === "TRANSVAGINAL"
                                  ? "Endocavitario"
                                  : tipoEcografia === "PARTES_BLANDAS" ||
                                    tipoEcografia === "MAMARIA" ||
                                    tipoEcografia === "TIROIDEA"
                                  ? "Lineal"
                                  : "Convexo"}
                              </span>
                            </div>
                            <select
                              value={tipoEcografia}
                              onChange={(e: any) => setTipoEcografia(e.target.value)}
                              className="w-full text-[10.5px] p-1.5 bg-[#120207] border border-sky-600 rounded-md text-sky-100 font-bold focus:outline-none focus:ring-1 focus:ring-sky-400 cursor-pointer"
                            >
                              <option value="OBSTETRICA">👶 Obstétrica / Fetal</option>
                              <option value="TRANSVAGINAL">🔬 Transvaginal / Pélvica</option>
                              <option value="ABDOMINAL">🩺 Abdominal Completa</option>
                              <option value="RENAL">💧 Renal y Vías Urinarias</option>
                              <option value="PROSTATICA">⚡ Prostática (Elipsoide)</option>
                              <option value="PARTES_BLANDAS">🩹 Partes Blandas / Hernias</option>
                              <option value="MAMARIA">🎗️ Mamaria (BI-RADS)</option>
                              <option value="TIROIDEA">🦋 Tiroidea (TI-RADS)</option>
                            </select>
                          </div>
                        )}
                      </div>

                      {/* 4. Medicina General */}
                      <button
                        type="button"
                        onClick={() => setModalidadAtencion("MEDICINA_GENERAL")}
                        title={isCollapsed ? "Medicina General (CMP)" : undefined}
                        className={`w-full p-1.5 rounded-lg text-left transition flex items-center justify-between border ${
                          modalidadAtencion === "MEDICINA_GENERAL"
                            ? "bg-emerald-950/80 border-emerald-500 text-white shadow-xs ring-1 ring-emerald-500/40"
                            : "bg-black/20 border-[#300a16] text-neutral-300 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                              modalidadAtencion === "MEDICINA_GENERAL"
                                ? "bg-emerald-600 text-white"
                                : "bg-neutral-900 text-neutral-400"
                            }`}
                          >
                            <Stethoscope className="w-3.5 h-3.5" />
                          </div>
                          {!isCollapsed && (
                            <div className="truncate">
                              <span className="text-[11px] font-bold block leading-tight truncate">
                                Medicina General
                              </span>
                              <span className="text-[9px] font-mono text-emerald-300 block">
                                CMP • Consulta Adulto
                              </span>
                            </div>
                          )}
                        </div>
                        {!isCollapsed && modalidadAtencion === "MEDICINA_GENERAL" && (
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        )}
                      </button>

                      {/* 5. Exámenes de Laboratorio */}
                      <button
                        type="button"
                        onClick={() => setModalidadAtencion("LABORATORIO")}
                        title={isCollapsed ? "Laboratorio POCT (Tiras & Pruebas)" : undefined}
                        className={`w-full p-1.5 rounded-lg text-left transition flex items-center justify-between border ${
                          modalidadAtencion === "LABORATORIO"
                            ? "bg-amber-950/80 border-amber-500 text-white shadow-xs ring-1 ring-amber-500/40"
                            : "bg-black/20 border-[#300a16] text-neutral-300 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                              modalidadAtencion === "LABORATORIO"
                                ? "bg-amber-600 text-white"
                                : "bg-neutral-900 text-neutral-400"
                            }`}
                          >
                            <FlaskConical className="w-3.5 h-3.5" />
                          </div>
                          {!isCollapsed && (
                            <div className="truncate">
                              <span className="text-[11px] font-bold block leading-tight truncate">
                                Laboratorio POCT
                              </span>
                              <span className="text-[9px] font-mono text-amber-300 block">
                                POCT • Tiras & Pruebas
                              </span>
                            </div>
                          )}
                        </div>
                        {!isCollapsed && modalidadAtencion === "LABORATORIO" && (
                          <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        )}
                      </button>

                      {/* ========================================================== */}
                      {/* CAJA 2: COLA DE PACIENTES EN LA COLUMNA COLOR VINO         */}
                      {/* ========================================================== */}
                      <div className="mt-2.5 p-2 rounded-xl bg-black/40 border border-[#380c1b] space-y-1.5 shadow-inner">
                        <div className="flex items-center justify-between border-b border-[#300a16] pb-1 px-0.5">
                          <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded-lg text-[9px] font-bold">
                            <button
                              type="button"
                              onClick={() => setVistaCola("espera")}
                              className={`px-1.5 py-0.5 rounded transition ${
                                vistaCola === "espera"
                                  ? "bg-brand-700 text-white shadow-xs"
                                  : "text-neutral-400 hover:text-white"
                              }`}
                            >
                              Espera ({pacientesEspera.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setVistaCola("atendidos")}
                              className={`px-1.5 py-0.5 rounded transition ${
                                vistaCola === "atendidos"
                                  ? "bg-brand-700 text-white shadow-xs"
                                  : "text-neutral-400 hover:text-white"
                              }`}
                            >
                              Atendidos ({pacientesAtendidos.length})
                            </button>
                          </div>
                          <span className="text-[8.5px] font-mono text-neutral-400 truncate max-w-[65px]">
                            {sedeCola}
                          </span>
                        </div>

                        {/* Lista de Pacientes con Clic Directo */}
                        <div className="space-y-1 max-h-52 overflow-y-auto pr-0.5">
                          {vistaCola === "espera" ? (
                            pacientesEspera.length === 0 ? (
                              <div className="py-4 text-center text-neutral-400">
                                <Clock className="w-4 h-4 mx-auto mb-1 opacity-40 text-neutral-400" />
                                <p className="font-bold text-[10px] text-neutral-300">Sin pacientes en espera</p>
                                <p className="text-[8.5px] text-neutral-500">Tiempo real activo</p>
                              </div>
                            ) : (
                              pacientesEspera.map((p) => {
                                const isSelected = selectedPatientId === p.id;
                                return (
                                  <div
                                    key={p.id}
                                    onClick={() => onSelectPatient && onSelectPatient(p)}
                                    className={`p-1.5 rounded-lg border text-left cursor-pointer transition ${
                                      isSelected
                                        ? "border-brand-500 bg-brand-950/90 text-white font-bold shadow-xs ring-1 ring-brand-500/40"
                                        : "border-[#300a16] bg-black/25 hover:bg-white/5 text-neutral-300 hover:text-white"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="truncate text-[11px] font-semibold">{p.paciente}</span>
                                      <span className="text-[8px] px-1 py-0.2 rounded font-mono font-bold bg-black/60 text-brand-200 border border-brand-800/40 shrink-0">
                                        {p.estado === "EN_ATENCION" ? "ATENCIÓN" : "ESPERA"}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-[9px] text-neutral-400 mt-0.5">
                                      <span className="truncate max-w-[125px]">{p.servicio}</span>
                                      <span className="font-mono text-neutral-400 shrink-0">{p.horaLlegada || p.edad}</span>
                                    </div>
                                  </div>
                                );
                              })
                            )
                          ) : (
                            pacientesAtendidos.length === 0 ? (
                              <div className="py-4 text-center text-neutral-400">
                                <CheckCircle2 className="w-4 h-4 mx-auto mb-1 opacity-40 text-emerald-400" />
                                <p className="font-bold text-[10px] text-neutral-300">Sin atenciones hoy</p>
                              </div>
                            ) : (
                              pacientesAtendidos.map((p) => (
                                <div
                                  key={p.id}
                                  className="p-1.5 rounded-lg border border-[#300a16] bg-black/25 text-left transition flex items-center justify-between gap-1"
                                >
                                  <div className="truncate min-w-0">
                                    <span className="font-semibold text-neutral-200 text-[10.5px] block truncate">{p.paciente}</span>
                                    <span className="text-[8.5px] text-neutral-400 block truncate">{p.servicio}</span>
                                  </div>
                                  {onReopenPatient && (
                                    <button
                                      type="button"
                                      onClick={() => onReopenPatient(p)}
                                      title="Reabrir caso clínico"
                                      className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-[8.5px] rounded border border-neutral-700 transition shrink-0"
                                    >
                                      Reabrir
                                    </button>
                                  )}
                                </div>
                              ))
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Footer del Sidebar: Solo Acción de Cierre Minimalista */}
        <div className="p-2 border-t border-[#300a16] shrink-0 bg-black/30">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-neutral-400 hover:text-rose-400 hover:bg-rose-950/20 transition"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* ==================================================================== */}
      {/* COLUMNA 2: WORKSPACE DERECHO DINÁMICO & FLUIDO                      */}
      {/* ==================================================================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar Ultra-Compacto & Ergonómico (44px) */}
        <header className="h-11 bg-white border-b border-neutral-200 px-4 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-neutral-600 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-sans font-semibold text-neutral-800">TLS 1.3 Cifrado</span>
            </div>
            <span className="text-neutral-300">&bull;</span>
            <div className="flex items-center gap-1.5 text-neutral-700 font-medium">
              <MapPin className="w-3.5 h-3.5 text-brand-700" />
              <span>Sede {sede}</span>
            </div>
            {horaActual && (
              <>
                <span className="text-neutral-300">&bull;</span>
                <div className="flex items-center gap-1.5 font-mono text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200/80 text-[11px]">
                  <Clock className="w-3 h-3 text-neutral-500" />
                  <span>{horaActual} PET</span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-neutral-500">
              <Lock className="w-3 h-3 text-neutral-400" />
              <span>NTS N.º 139 &bull; Ley 26842 (Secreto Médico)</span>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono border ${
                rol === "ADMIN"
                  ? "bg-purple-50 text-purple-700 border-purple-200"
                  : rol === "PROFESIONAL"
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}
            >
              {rol}
            </span>
          </div>
        </header>

        {/* Contenido Principal con Guardia de Seguridad */}
        <main className="flex-1 p-5 overflow-y-auto">
          {isAuthorizedCurrentRoute ? (
            children
          ) : (
            <div className="max-w-md mx-auto my-16 bg-white border border-rose-200 rounded-2xl p-6 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>

              <div>
                <h2 className="text-base font-bold text-neutral-900">Acceso No Autorizado</h2>
                <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                  Tu usuario actual (<strong className="font-mono text-neutral-800">{user || "No identificado"}</strong>) con rol <strong>{rol || "Desconocido"}</strong> no tiene permisos para acceder al módulo de {pathname.includes("supervision") ? "SUPERVISIÓN" : "este recurso"}.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2.5 pt-2">
                <Link
                  href={getAuthorizedHome()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-xl transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver a mi módulo</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold rounded-xl transition shadow"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Cerrar Sesión e Iniciar como Admin</span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}