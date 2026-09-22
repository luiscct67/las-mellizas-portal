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
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

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
      {/* COLUMNA 1: SIDEBAR IZQUIERDO MINIMALISTA ("CERO CURIOSIDAD")          */}
      {/* ==================================================================== */}
      <aside
        className={`${
          isCollapsed ? "w-16" : "w-60"
        } bg-neutral-950 text-neutral-300 border-r border-neutral-800 flex flex-col justify-between transition-all duration-200 sticky top-0 h-screen select-none shrink-0 z-40`}
      >
        <div>
          {/* Cabecera del Sidebar */}
          <div className="h-14 flex items-center justify-between px-3.5 border-b border-neutral-800">
            <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-7 h-7 rounded-lg bg-white p-0.5 flex items-center justify-center shrink-0 shadow-xs">
                <img
                  src="/logo-oficial.jpg"
                  alt="Logo Las Mellizas"
                  className="w-full h-full object-contain rounded-md"
                />
              </div>
              {!isCollapsed && (
                <div className="truncate">
                  <span className="font-bold text-xs text-white block leading-none truncate">
                    Las Mellizas
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono block mt-0.5">
                    Enterprise HCE
                  </span>
                </div>
              )}
            </Link>

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
              title={isCollapsed ? "Expandir menú" : "Colapsar menú"}
            >
              {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Sede Operativa Fija */}
          {!isCollapsed && (
            <div className="px-3.5 py-2.5 border-b border-neutral-800/80 bg-neutral-900/40 text-[11px] flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium text-neutral-400">
                <MapPin className="w-3 h-3 text-neutral-400" />
                <span>Sede {sede}</span>
              </span>
              <span className="text-[9px] font-mono text-neutral-400 uppercase bg-neutral-800 px-1 py-0.5 rounded">
                Zero Trust
              </span>
            </div>
          )}

          {/* Navegación Estricta Filtrada (Sin enlaces prohibidos en el DOM) */}
          <nav className="p-2 space-y-1">
            {authorizedNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                    isActive
                      ? "bg-white text-neutral-950 shadow-sm"
                      : "text-neutral-400 hover:text-white hover:bg-neutral-900"
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer del Sidebar: Identidad & Cierre */}
        <div className="p-2 border-t border-neutral-800">
          {!isCollapsed && (
            <div className="px-2 py-1.5 mb-1.5">
              <span className="text-xs font-bold text-white block truncate leading-tight">
                {nombre || user.split("@")[0]}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {colegiatura && (
                  <span className="text-[9px] font-mono text-blue-400 bg-blue-950/80 px-1 py-0.2 rounded border border-blue-900">
                    {colegiatura.split("/")[0]}
                  </span>
                )}
                <span className="text-[10px] font-mono text-neutral-400 uppercase">
                  {rol}
                </span>
              </div>
            </div>
          )}

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
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono border ${
              rol === "ADMIN" 
                ? "bg-purple-50 text-purple-700 border-purple-200" 
                : rol === "PROFESIONAL" 
                ? "bg-blue-50 text-blue-700 border-blue-200" 
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}>
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