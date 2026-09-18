"use client";

import { useState, useEffect } from "react";
import { ReceiptText, CreditCard, DollarSign, Smartphone, CheckCircle2, AlertCircle, ShieldCheck, Printer, MapPin } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface OrdenMock {
  id: string;
  paciente: string;
  dni: string;
  servicio: string;
  sede: "Independencia" | "Vivanco";
  monto: number;
  estado: "PENDIENTE" | "PAGADO";
  fecha: string;
}

export default function CajaPage() {
  const [sede, setSede] = useState<string>("Independencia");

  useEffect(() => {
    const s = sessionStorage.getItem("lm_sede") || "Independencia";
    setSede(s);

    const handleStorageChange = () => {
      const updatedSede = sessionStorage.getItem("lm_sede") || "Independencia";
      setSede(updatedSede);
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const [ordenes, setOrdenes] = useState<OrdenMock[]>([
    // Sede Independencia
    {
      id: "ord-ind-881",
      paciente: "Carla Mendoza Quispe",
      dni: "45892147",
      servicio: "Control Prenatal Reenfocado",
      sede: "Independencia",
      monto: 70.0,
      estado: "PENDIENTE",
      fecha: "18/09/2026 08:20",
    },
    {
      id: "ord-ind-882",
      paciente: "Yolanda Flores Huamán",
      dni: "71245896",
      servicio: "Ecografía Especializada (4D)",
      sede: "Independencia",
      monto: 150.0,
      estado: "PENDIENTE",
      fecha: "18/09/2026 08:35",
    },
    {
      id: "ord-ind-880",
      paciente: "María Elena Paucar Rojas",
      dni: "10568942",
      servicio: "Salud Integral de la Mujer",
      sede: "Independencia",
      monto: 90.0,
      estado: "PAGADO",
      fecha: "18/09/2026 07:50",
    },
    // Sede Vivanco
    {
      id: "ord-viv-501",
      paciente: "Roxana Palomino Quispe",
      dni: "42198754",
      servicio: "Control Prenatal Reenfocado",
      sede: "Vivanco",
      monto: 70.0,
      estado: "PENDIENTE",
      fecha: "18/09/2026 08:25",
    },
    {
      id: "ord-viv-502",
      paciente: "Diana Huamán Cárdenas",
      dni: "70541298",
      servicio: "Planificación Familiar Integral",
      sede: "Vivanco",
      monto: 80.0,
      estado: "PENDIENTE",
      fecha: "18/09/2026 08:45",
    },
    {
      id: "ord-viv-500",
      paciente: "Lucía Cárdenas Bautista",
      dni: "44890123",
      servicio: "Prevención Cáncer Cervical",
      sede: "Vivanco",
      monto: 60.0,
      estado: "PAGADO",
      fecha: "18/09/2026 07:55",
    },
  ]);

  const [selectedOrden, setSelectedOrden] = useState<OrdenMock | null>(null);
  const [medioPago, setMedioPago] = useState<"YAPE" | "PLIN" | "EFECTIVO" | "TARJETA_POS">("YAPE");
  const [referencia, setReferencia] = useState("");
  const [pagoExitoso, setPagoExitoso] = useState(false);

  // Filtrado de órdenes por sede
  const ordenesFiltradas = ordenes.filter(
    (o) => sede === "Todas las Sedes" || o.sede === sede
  );

  const totalCobradoHoy = ordenesFiltradas
    .filter((o) => o.estado === "PAGADO")
    .reduce((acc, curr) => acc + curr.monto, 0);

  const totalPendiente = ordenesFiltradas
    .filter((o) => o.estado === "PENDIENTE")
    .reduce((acc, curr) => acc + curr.monto, 0);

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

  const direccionSede =
    sede === "Vivanco"
      ? "Jr. Carlos F. Vivanco N.º 265, Huamanga"
      : "Av. Independencia N.º 247, Huamanga";

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Módulo de Caja & Facturación</h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-50 text-amber-900 px-2.5 py-1 rounded-lg border border-amber-200">
              <MapPin className="w-3 h-3 text-amber-700" />
              <span>Sede {sede}</span>
            </span>
          </div>
          <p className="text-xs text-neutral-500">
            Aislamiento financiero multisede: Sólo se liquidan órdenes correspondientes a Sede {sede}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-emerald-50 border border-emerald-200/80 px-4 py-2 rounded-xl text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
              Cobrado Hoy ({sede})
            </span>
            <span className="text-lg font-black text-emerald-900">
              {formatCurrency(totalCobradoHoy)}
            </span>
          </div>

          <div className="bg-amber-50 border border-amber-200/80 px-4 py-2 rounded-xl text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
              Pendiente ({sede})
            </span>
            <span className="text-lg font-black text-amber-900">
              {formatCurrency(totalPendiente)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Listado de Órdenes de la Sede */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
              <h2 className="font-bold text-sm text-neutral-800">
                Órdenes de Pago Registradas &bull; {sede}
              </h2>
              <span className="text-xs text-neutral-400 font-medium">
                {ordenesFiltradas.length} órdenes en cola
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 text-neutral-600 text-xs font-bold uppercase tracking-wider border-b border-neutral-200">
                  <tr>
                    <th className="py-3 px-4">Orden</th>
                    <th className="py-3 px-4">Paciente</th>
                    <th className="py-3 px-4">Servicio</th>
                    {sede === "Todas las Sedes" && <th className="py-3 px-4">Sede</th>}
                    <th className="py-3 px-4">Monto</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {ordenesFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-neutral-400">
                        No hay órdenes para la Sede {sede}.
                      </td>
                    </tr>
                  ) : (
                    ordenesFiltradas.map((ord) => (
                      <tr key={ord.id} className="hover:bg-neutral-50/80 transition">
                        <td className="py-3.5 px-4 font-mono text-xs font-bold text-neutral-600">{ord.id}</td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-neutral-900 block leading-tight">{ord.paciente}</span>
                          <span className="text-[11px] font-mono text-neutral-500">DNI {ord.dni}</span>
                        </td>
                        <td className="py-3.5 px-4 text-neutral-700 text-xs font-medium">{ord.servicio}</td>
                        {sede === "Todas las Sedes" && (
                          <td className="py-3.5 px-4">
                            <span className="text-[10px] font-bold bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded">
                              {ord.sede}
                            </span>
                          </td>
                        )}
                        <td className="py-3.5 px-4 font-extrabold text-neutral-900">{formatCurrency(ord.monto)}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                              ord.estado === "PENDIENTE"
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            }`}
                          >
                            {ord.estado === "PENDIENTE" ? (
                              <AlertCircle className="w-3 h-3" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                            <span>{ord.estado}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {ord.estado === "PENDIENTE" ? (
                            <button
                              onClick={() => handleCobrar(ord)}
                              className="px-3 py-1.5 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs rounded-xl shadow-sm transition"
                            >
                              Cobrar
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedOrden(ord);
                                setPagoExitoso(true);
                              }}
                              className="inline-flex items-center gap-1 text-xs text-brand-700 font-bold hover:underline"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Recibo</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Panel de Cobro y Comprobante */}
        <div className="lg:col-span-1">
          {selectedOrden ? (
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-sm space-y-4">
              {!pagoExitoso ? (
                <>
                  <div className="border-b border-neutral-100 pb-3">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/50 inline-block mb-1.5">
                      Procesar Cobro &bull; {selectedOrden.sede}
                    </span>
                    <h3 className="font-bold text-neutral-900 text-base">{selectedOrden.paciente}</h3>
                    <p className="text-xs text-neutral-500 mt-0.5">{selectedOrden.servicio}</p>
                    <div className="text-2xl font-black text-brand-900 mt-2">
                      {formatCurrency(selectedOrden.monto)}
                    </div>
                  </div>

                  <form onSubmit={handleConfirmarPago} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-2 uppercase tracking-wider">
                        Medio de Pago
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setMedioPago("YAPE")}
                          className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition ${
                            medioPago === "YAPE"
                              ? "border-purple-600 bg-purple-50 text-purple-900 ring-1 ring-purple-600"
                              : "border-neutral-200 text-neutral-600"
                          }`}
                        >
                          <Smartphone className="w-4 h-4 text-purple-600" />
                          <span>Yape</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setMedioPago("PLIN")}
                          className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition ${
                            medioPago === "PLIN"
                              ? "border-cyan-600 bg-cyan-50 text-cyan-900 ring-1 ring-cyan-600"
                              : "border-neutral-200 text-neutral-600"
                          }`}
                        >
                          <Smartphone className="w-4 h-4 text-cyan-600" />
                          <span>Plin</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setMedioPago("EFECTIVO")}
                          className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition ${
                            medioPago === "EFECTIVO"
                              ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-600"
                              : "border-neutral-200 text-neutral-600"
                          }`}
                        >
                          <DollarSign className="w-4 h-4 text-emerald-600" />
                          <span>Efectivo</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setMedioPago("TARJETA_POS")}
                          className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition ${
                            medioPago === "TARJETA_POS"
                              ? "border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-600"
                              : "border-neutral-200 text-neutral-600"
                          }`}
                        >
                          <CreditCard className="w-4 h-4 text-blue-600" />
                          <span>Tarjeta POS</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1">
                        N.º Operación / Referencia (Opcional)
                      </label>
                      <input
                        type="text"
                        value={referencia}
                        onChange={(e) => setReferencia(e.target.value)}
                        placeholder="Ej. OP-458921"
                        className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-700"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-brand-700 hover:bg-brand-800 text-white font-bold text-sm rounded-xl shadow transition flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirmar Pago de {formatCurrency(selectedOrden.monto)}</span>
                    </button>
                  </form>
                </>
              ) : (
                /* Ticket de Pago Impreso */
                <div className="space-y-4">
                  <div className="p-4 border-2 border-dashed border-neutral-300 rounded-2xl bg-neutral-50/70 text-xs font-mono space-y-2">
                    <div className="text-center pb-2 border-b border-neutral-200">
                      <p className="font-extrabold text-sm text-neutral-900">LAS MELLIZAS PERÚ S.A.C.</p>
                      <p className="text-[10px] text-neutral-500">RUC: 20611827335</p>
                      <p className="text-[10px] text-neutral-500">{direccionSede}</p>
                      <p className="text-[10px] font-bold text-brand-800 mt-1">SEDE {selectedOrden.sede.toUpperCase()}</p>
                    </div>

                    <div className="space-y-1 pt-1 text-[11px]">
                      <p><strong>Comprobante:</strong> TICKET-{selectedOrden.id}</p>
                      <p><strong>Fecha/Hora:</strong> {new Date().toLocaleString("es-PE")}</p>
                      <p><strong>Paciente:</strong> {selectedOrden.paciente}</p>
                      <p><strong>DNI:</strong> {selectedOrden.dni}</p>
                      <p><strong>Concepto:</strong> {selectedOrden.servicio}</p>
                      <p><strong>Medio:</strong> {medioPago}</p>
                      {referencia && <p><strong>Ref:</strong> {referencia}</p>}
                    </div>

                    <div className="pt-2 border-t border-neutral-200 flex justify-between items-center font-bold text-sm text-neutral-900">
                      <span>TOTAL PAGADO:</span>
                      <span>{formatCurrency(selectedOrden.monto)}</span>
                    </div>

                    <p className="text-[10px] text-center text-neutral-400 pt-2 border-t border-neutral-200">
                      Agradecemos su confianza &bull; Que Dios bendiga su salud
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => window.print()}
                      className="flex-1 py-2.5 bg-neutral-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Imprimir Ticket</span>
                    </button>
                    <button
                      onClick={() => setSelectedOrden(null)}
                      className="px-4 py-2.5 text-neutral-600 hover:bg-neutral-100 font-bold text-xs rounded-xl transition"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-neutral-400 text-xs">
              <ReceiptText className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
              <p className="font-semibold text-neutral-600">Ninguna orden seleccionada</p>
              <p className="text-[11px] mt-1">Haz clic en &quot;Cobrar&quot; o &quot;Recibo&quot; en la lista de {sede}.</p>
            </div>
          )}

          <div className="mt-4 p-4 bg-white rounded-2xl border border-neutral-200/80 text-[11px] text-neutral-500 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-neutral-700">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Protección de Confidencialidad</span>
            </div>
            <p className="text-[10px] text-neutral-400 leading-relaxed">
              El personal de caja gestiona exclusivamente conceptos arancelarios y cobros. Ningún dato clínico confidencial ni diagnóstico CIE-10 es visible en este terminal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}