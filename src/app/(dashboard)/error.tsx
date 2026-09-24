"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, ShieldAlert } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard Error Boundary capturó una excepción:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 bg-[#f8f9fa]">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-neutral-200/80 shadow-xl text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <div>
          <h2 className="text-lg font-black text-neutral-900 tracking-tight">
            Aviso de Sincronización Clínica
          </h2>
          <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
            Se detectó un cambio reciente en la sesión o en los componentes de gobernanza. Pulse el botón inferior para restablecer la vista de forma segura.
          </p>
        </div>

        {error?.message && (
          <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-left">
            <span className="text-[10px] font-mono text-neutral-600 block break-words">
              {error.message}
            </span>
          </div>
        )}

        <div className="pt-2 flex items-center justify-center gap-2">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold rounded-xl transition shadow cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reintentar / Restaurar</span>
          </button>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            <span>Recargar Página</span>
          </button>
        </div>
      </div>
    </div>
  );
}
