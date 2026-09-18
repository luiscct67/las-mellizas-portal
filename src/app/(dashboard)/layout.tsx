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
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [rol, setRol] = useState<string>("RECEPCION_CAJA");
  const [user, setUser] = useState<string>("operador@lasmellizasperu.com");
  const [sede, setSede] = useState<string>("Independencia");
  const [nombre, setNombre] = useState<string>("");
  const [colegiatura, setColegiatura] = useState<string>("");
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    let r = sessionStorage.getItem("lm_rol") || "RECEPCION_CAJA";
    // Normalizar roles legados a la arquitectura unificada
    if (r === "RECEPCION" || r === "CAJA") {
      r = "RECEPCION_CAJA";
    }

    const u = sessionStorage.getItem("lm_user") || "operador@lasmellizasperu.com";
    const s = sessionStorage.getItem("lm_sede") || "Independencia";
    const nom = sessionStorage.getItem("lm_nombre") || "";
    const col = sessionStorage.getItem("lm_colegiatura") || "";

    setRol(r);
    setUser(u);
    setSede(s);
    setNombre(nom);
    setColegiatura(col);
    setMounted(true);
  }, []);

  const handleLogout = () => {
    sessionStorage.clear();
    // Limpiar cookies de sesión
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
  const isAuthorizedCurrentRoute = !allowedRoles || allowedRoles.includes(rol);

  const getAuthorizedHome = () => {
    if (rol === "RECEPCION_CAJA") return "/admision-caja";
    if (rol === "PROFESIONAL") return "/hce";
    return "/supervision";
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-900">
        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
              <img
                src="/logo.png"
                alt="Logo Las Mellizas"
                className="w-7 h-7 object-contain shrink-0"
              />
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
        {/* Topbar Ultra-Compacto (44px) */}
        <header className="h-11 bg-white border-b border-neutral-200 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-sans font-medium text-neutral-700">Conexión Cifrada TLS 1.3</span>
            <span>&bull;</span>
            <span>Sede: {sede}</span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-neutral-400">
            <Lock className="w-3 h-3 text-neutral-400" />
            <span>Ley N.º 26842 (Secreto Médico) &bull; Ley N.º 29733 (ANPD)</span>
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
                <p className="text-xs text-neutral-500 mt-1">
                  Tu rol ({rol}) no tiene privilegios para visualizar el recurso solicitado.
                </p>
              </div>

              <Link
                href={getAuthorizedHome()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-black text-white text-xs font-bold rounded-lg transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver a mi módulo</span>
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}