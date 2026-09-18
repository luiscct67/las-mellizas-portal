"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UserCheck, Stethoscope, ReceiptText, ShieldCheck, MapPin, LogOut, ShieldAlert } from "lucide-react";

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

  useEffect(() => {
    const r = sessionStorage.getItem("lm_rol") || "RECEPCION";
    const u = sessionStorage.getItem("lm_user") || "usuario@lasmellizasperu.com";
    const s = sessionStorage.getItem("lm_sede") || "Independencia";
    setRol(r);
    setUser(u);
    setSede(s);
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

          {/* Navegación por módulos */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              const isAuthorized = item.roles.includes(rol);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                    isActive
                      ? "bg-brand-700 text-white shadow-sm"
                      : isAuthorized
                      ? "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                      : "text-neutral-400 opacity-60 hover:opacity-100"
                  }`}
                  title={!isAuthorized ? "Aislamiento clínico activo (Sin privilegios)" : ""}
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

      {/* Contenido principal del dashboard */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        {children}
      </main>

      {/* Footer de confidencialidad */}
      <footer className="border-t border-neutral-200 bg-white/70 py-3 px-6 text-center text-[11px] text-neutral-500 flex items-center justify-center gap-2">
        <ShieldAlert className="w-3.5 h-3.5 text-brand-700" />
        <span>Acceso Confidencial &bull; Cumplimiento Ley N.º 26842 (Secreto Médico) y Ley N.º 29733 (ANPD)</span>
      </footer>
    </div>
  );
}