"use client";

import { useState } from "react";
import { ReceiptText, CreditCard, DollarSign, Smartphone, CheckCircle2, AlertCircle, ShieldCheck, Printer } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface OrdenMock {
  id: string;
  paciente: string;
  dni: string;
  servicio: string;
  sede: string;
  monto: number;
  estado: "PENDIENTE" | "PAGADO";
  fecha: string;
}

export default function CajaPage() {
  const [ordenes, setOrdenes] = useState<OrdenMock[]>([
    {
      id: "ord-881",
      paciente: "Carla Mendoza Quispe",
      dni: "45892147",
      servicio: "Control Prenatal Reenfocado",
      sede: "Sede Independencia",
      monto: 70.0,
      estado: "PENDIENTE",
      fecha: "18/09/2026 08:20",
    },
    {
      id: "ord-882",
      paciente: "Yolanda Flores Huamán",
      dni: "71245896",
      servicio: "Ecografía Especializada (4D)",
      sede: "Sede Independencia",
      monto: 150.0,
      estado: "PENDIENTE",
      fecha: "18/09/2026 08:35",
    },
    {
      id: "ord-880",
      paciente: "María Elena Paucar Rojas",
      dni: "10568942",
      servicio: "Salud Integral de la Mujer",
      sede: "Sede Independencia",
      monto: 90.0,
      estado: "PAGADO",
      fecha: "18/09/2026 07:50",
    },
  ]);

  const [selectedOrden, setSelectedOrden] = useState<OrdenMock | null>(null);
  const [medioPago, setMedioPago] = useState<"YAPE" | "PLIN" | "EFECTIVO" | "TARJETA_POS">("YAPE");
  const [referencia, setReferencia] = useState("");
  const [pagoExitoso, setPagoExitoso] = useState(false);

  const handleCobrar = (orden: OrdenMock) => {
    setSelectedOrden(orden);
    setPagoExitoso(false);
    setReferencia("");
  };

  const handleConfirmarPago = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrden) return;

    setOrdenes(
      ordenes.map((o) => (o.id === selectedOrden.id ? { ...o, estado: "PAGADO" } : o))
    );
    setPagoExitoso(true);
  };

  const totalRecaudadoHoy = ordenes
    .filter((o) => o.estado === "PAGADO")
    .reduce((acc, curr) => acc + curr.monto, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Módulo de Caja & Facturación</h1>
          <p className="text-xs text-neutral-500">Gestión de órdenes de cobro, emisión de comprobantes y cierre de caja.</p>
        </div>

        {/* Total recaudado */}
        <div className="bg-white px-4 py-2.5 rounded-2xl border border-neutral-200/80 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-neutral-400 block leading-tight">Total Cobrado Hoy</span>
            <span className="text-lg font-black text-brand-900">{formatCurrency(totalRecaudadoHoy)}</span>
          </div>
        </div>
      </div>

      {/* Banner de Aislamiento Clínico Garantizado */}
      <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-3.5 flex items-center gap-3 text-xs text-amber-900">
        <ShieldCheck className="w-4 h-4 text-amber-700 flex-shrink-0" />
        <span>
          <strong>Principio de Aislamiento Clínico Activo:</strong> Caja visualiza únicamente órdenes comerciales y montos administrativos. Ningún diagnóstico, antecedente o nota médica es accesible desde este módulo.
        </span>
      </div>

      {/* Tabla de Órdenes */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="font-bold text-sm text-neutral-800">Órdenes de Atención Emitidas</h2>
          <span className="text-xs text-neutral-400 font-medium">Sincronización con Admisión</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-600 text-xs font-bold uppercase tracking-wider border-b border-neutral-200">
              <tr>
                <th className="py-3 px-4">Orden</th>
                <th className="py-3 px-4">Paciente</th>
                <th className="py-3 px-4">DNI</th>
                <th className="py-3 px-4">Concepto / Arancel</th>
                <th className="py-3 px-4">Monto</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {ordenes.map((item) => (
                <tr key={item.id} className="hover:bg-neutral-50/80 transition">
                  <td className="py-3.5 px-4 font-mono text-xs text-neutral-500">{item.id}</td>
                  <td className="py-3.5 px-4 font-bold text-neutral-900">{item.paciente}</td>
                  <td className="py-3.5 px-4 font-mono text-xs text-neutral-600">{item.dni}</td>
                  <td className="py-3.5 px-4 text-neutral-700 text-xs font-semibold">{item.servicio}</td>
                  <td className="py-3.5 px-4 font-black text-brand-900 text-sm">{formatCurrency(item.monto)}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                        item.estado === "PENDIENTE"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {item.estado === "PENDIENTE" ? (
                        <AlertCircle className="w-3 h-3" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3" />
                      )}
                      <span>{item.estado}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {item.estado === "PENDIENTE" ? (
                      <button
                        onClick={() => handleCobrar(item)}
                        className="bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-sm transition"
                      >
                        Cobrar
                      </button>
                    ) : (
                      <button
                        onClick={() => alert(`Comprobante emitido para la orden ${item.id}`)}
                        className="inline-flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-900 font-semibold p-1"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Ticket</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Cobro */}
      {selectedOrden && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-neutral-200">
            {!pagoExitoso ? (
              <>
                <h3 className="text-lg font-black text-brand-900 mb-1">Registrar Cobro de Atención</h3>
                <p className="text-xs text-neutral-500 mb-4">Orden: {selectedOrden.id} &bull; {selectedOrden.paciente}</p>

                <div className="bg-brand-50/50 p-4 rounded-2xl border border-brand-100 mb-5 text-center">
                  <span className="text-xs text-neutral-500 uppercase font-bold block">Total a Cobrar</span>
                  <span className="text-3xl font-black text-brand-900">{formatCurrency(selectedOrden.monto)}</span>
                  <span className="text-xs text-neutral-600 block mt-1">{selectedOrden.servicio}</span>
                </div>

                <form onSubmit={handleConfirmarPago} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                      Medio de Pago
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setMedioPago("YAPE")}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                          medioPago === "YAPE"
                            ? "border-purple-600 bg-purple-50 text-purple-800 ring-1 ring-purple-600"
                            : "border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                        }`}
                      >
                        <Smartphone className="w-4 h-4 text-purple-600" />
                        <span>Yape</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMedioPago("PLIN")}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                          medioPago === "PLIN"
                            ? "border-sky-600 bg-sky-50 text-sky-800 ring-1 ring-sky-600"
                            : "border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                        }`}
                      >
                        <Smartphone className="w-4 h-4 text-sky-600" />
                        <span>Plin</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMedioPago("EFECTIVO")}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                          medioPago === "EFECTIVO"
                            ? "border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600"
                            : "border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                        }`}
                      >
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                        <span>Efectivo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMedioPago("TARJETA_POS")}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                          medioPago === "TARJETA_POS"
                            ? "border-blue-600 bg-blue-50 text-blue-800 ring-1 ring-blue-600"
                            : "border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                        }`}
                      >
                        <CreditCard className="w-4 h-4 text-blue-600" />
                        <span>Tarjeta POS</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      Código de Operación / Referencia (Opcional)
                    </label>
                    <input
                      type="text"
                      value={referencia}
                      onChange={(e) => setReferencia(e.target.value)}
                      placeholder="Ej. Operación #098124"
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-neutral-100">
                    <button
                      type="button"
                      onClick={() => setSelectedOrden(null)}
                      className="px-4 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-sm font-bold bg-brand-700 hover:bg-brand-800 text-white rounded-xl shadow"
                    >
                      Confirmar Pago
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="text-center py-4 space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-black text-neutral-900">¡Pago Registrado Exitosamente!</h3>
                <p className="text-xs text-neutral-500">
                  Comprobante emitido para {selectedOrden.paciente} por {formatCurrency(selectedOrden.monto)}.
                </p>
                <div className="pt-2 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedOrden(null)}
                    className="px-5 py-2.5 text-xs font-bold bg-neutral-900 text-white rounded-xl hover:bg-black"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}