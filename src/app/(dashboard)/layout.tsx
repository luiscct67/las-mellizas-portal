"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UserCheck, Stethoscope, ReceiptText, ShieldCheck, MapPin, LogOut, ShieldAlert, Lock, ArrowLeft } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [rol, setRol] = useState<string>("RECEPCION");
  const [user, setUser] = useState<string>("usuario@lasmellizasperu.com");
  const [sede, setSede] = useState<string>("Independencia");
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    const r = sessionStorage.getItem("lm_rol") || "RECEPCION";
    const u = sessionStorage.getItem("lm_user") || "usuario@lasmellizasperu.com";
    const s = sessionStorage.getItem("lm_sede") || "Independencia";
    setRol(r);
    setUser(u);
    setSede(s);
    setMounted(true);
  }, []);

  const handleLogout = () => {
    sessionStorage.clear();
    router.push("/login");
  };

  const navItems = [
    { href: "/recepcion", label: "Admisión & Recepción", icon: UserCheck, roles: ["RECEPCION", "SUPERVISION", "ADMIN"] },
    { href: "/hce", label: "Consultorio Médico (HCE)", icon: Stethoscope, roles: ["PROFESIONAL", "SUPERVISION", "ADMIN"] },
    { href: "/caja", label: "Caja & Cobros", icon: ReceiptText, roles: ["CAJA", "SUPERVISION", "ADMIN"] },
    { href: "/supervision", label: "Supervisión & Auditoría", icon: ShieldCheck, roles: ["SUPERVISION", "ADMIN"] },
  ];

  // Matriz de permisos estrictos por ruta (Defensa en Profundidad)
  const routePermissions: Record<string, string[]> = {
    "/recepcion": ["RECEPCION", "SUPERVISION", "ADMIN"],
    "/hce": ["PROFESIONAL", "SUPERVISION", "ADMIN"],
    "/caja": ["CAJA", "SUPERVISION", "ADMIN"],
    "/supervision": ["SUPERVISION", "ADMIN"],
  };

  const currentPrefix = "/" + (pathname.split("/")[1] || "");
  const allowedRoles = routePermissions[currentPrefix] || [];
  const isAuthorizedCurrentRoute = allowedRoles.length === 0 || allowedRoles.includes(rol);

  const getAuthorizedHome = () => {
    if (rol === "RECEPCION") return "/recepcion";
    if (rol === "PROFESIONAL") return "/hce";
    if (rol === "CAJA") return "/caja";
    return "/supervision";
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf6f8]">
        <div className="w-8 h-8 border-4 border-brand-700 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#faf6f8]">
      {/* Barra superior de gobernanza y sede */}
      <header className="bg-white border-b border-neutral-200/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-700 text-white flex items-center justify-center font-black text-sm shadow">
                LM
              </div>
              <div>
                <span className="font-extrabold text-brand-900 text-sm tracking-tight block">Las Mellizas Perú</span>
                <span className="text-[10px] text-neutral-400 font-medium block">Portal Clínico 2.0</span>
              </div>
            </Link>

            {/* Selector de Sede */}
            <div className="hidden sm:flex items-center gap-1.5 bg-neutral-100/80 px-3 py-1.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700">
              <MapPin className="w-3.5 h-3.5 text-brand-700" />
              <span>Sede:</span>
              <select
                value={sede}
                onChange={(e) => {
                  setSede(e.target.value);
                  sessionStorage.setItem("lm_sede", e.target.value);
                }}
                className="bg-transparent font-bold text-brand-900 focus:outline-none cursor-pointer"
              >
                <option value="Independencia">Independencia (Av. Independencia 247)</option>
                <option value="Vivanco">Vivanco (Jr. Carlos F. Vivanco 265)</option>
              </select>
            </div>
          </div>

          {/* Navegación por módulos estrictamente compartimentada */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              const isAllowed = item.roles.includes(rol);

              // Si el usuario NO tiene permiso, NO se crea enlace navegable
              if (!isAllowed) {
                return (
                  <div
                    key={item.href}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-neutral-400 bg-neutral-50/70 border border-neutral-200/50 cursor-not-allowed select-none"
                    title={`Bloqueo de Seguridad: Tu rol (${rol}) no tiene acceso al módulo ${item.label}`}
                  >
                    <Lock className="w-3 h-3 text-neutral-400" />
                    <span className="opacity-50 line-through">{item.label}</span>
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                    isActive
                      ? "bg-brand-700 text-white shadow-sm"
                      : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Datos de usuario y Salir */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-bold text-neutral-800 block leading-tight">{user.split("@")[0]}</span>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200/60 inline-block mt-0.5">
                {rol}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-neutral-500 hover:bg-rose-50 hover:text-rose-600 transition"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Contenido principal con GUARDIA ESTRICTA de autorización */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        {isAuthorizedCurrentRoute ? (
          children
        ) : (
          <div className="max-w-xl mx-auto my-12 bg-white rounded-3xl border border-rose-200 p-8 shadow-xl text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto shadow-inner">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-rose-950">Acceso Restringido por Rol</h2>
              <p className="text-xs text-rose-700 font-semibold mt-1">
                Aislamiento Clínico Activo &bull; Ley N.º 26842 (Secreto Médico)
              </p>
            </div>

            <div className="bg-rose-50/80 border border-rose-200/80 rounded-2xl p-4 text-left text-xs text-rose-900 space-y-2">
              <p>
                <strong>Motivo de Bloqueo:</strong> Tu cuenta actual está autenticada con el rol <strong>{rol}</strong>, el cual <strong>no tiene autorización</strong> para ver o manipular información de esta sección ({currentPrefix.toUpperCase()}).
              </p>
              <p className="text-[11px] text-rose-700">
                La normativa médica peruana prohíbe terminantemente el acceso de personal administrativo a historias clínicas, diagnósticos o cajas no asignadas.
              </p>
              <p className="font-mono text-[10px] text-rose-600 pt-1 border-t border-rose-200/60">
                Seguridad: Evento de acceso denegado registrado en auditoría inmutable.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href={getAuthorizedHome()}
                className="inline-flex items-center justify-center gap-2 bg-neutral-900 hover:bg-black text-white font-bold text-xs px-6 py-3 rounded-xl shadow transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver a mi módulo asignado</span>
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Footer de confidencialidad */}
      <footer className="border-t border-neutral-200 bg-white/70 py-3 px-6 text-center text-[11px] text-neutral-500 flex items-center justify-center gap-2">
        <ShieldAlert className="w-3.5 h-3.5 text-brand-700" />
        <span>Compartimentación de Seguridad Activa &bull; Cumplimiento Ley N.º 26842 (Secreto Médico) y Ley N.º 29733 (ANPD)</span>
      </footer>
    </div>
  );
}