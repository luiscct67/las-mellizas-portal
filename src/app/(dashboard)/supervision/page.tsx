"use client";

import { useState } from "react";
import { ShieldCheck, Activity, Users, DollarSign, FileCheck, Lock, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function SupervisionPage() {
  const eventos = [
    {
      id: "ev-109",
      hora: "08:42:15",
      usuario: "obstetricia@lasmellizasperu.com",
      rol: "PROFESIONAL",
      accion: "SELLAR_NOTA_CLINICA",
      entidad: "nota_clinica",
      entidadId: "nc-4412",
      detalle: "Firma SHA-256 generada: e8b912a... Paciente Carla Mendoza",
    },
    {
      id: "ev-108",
      hora: "08:35:10",
      usuario: "caja@lasmellizasperu.com",
      rol: "CAJA",
      accion: "REGISTRAR_PAGO",
      entidad: "pago",
      entidadId: "pg-0812",
      detalle: "Monto S/ 90.00 Medio: YAPE. Orden ord-880",
    },
    {
      id: "ev-107",
      hora: "08:15:30",
      usuario: "recepcion.ind@lasmellizasperu.com",
      rol: "RECEPCION",
      accion: "CREAR_ENCUENTRO",
      entidad: "encuentro",
      entidadId: "enc-001",
      detalle: "Admisión Sede Independencia. Paciente Carla Mendoza",
    },
    {
      id: "ev-106",
      hora: "07:45:00",
      usuario: "recepcion.ind@lasmellizasperu.com",
      rol: "RECEPCION",
      accion: "INTENTO_ACCESO_DENEGADO",
      entidad: "nota_clinica",
      entidadId: "nc-4401",
      detalle: "Intento de lectura bloqueado por directiva RLS (Aislamiento Clínico)",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Supervisión, Trazabilidad & Auditoría</h1>
          <p className="text-xs text-neutral-500">Monitoreo inmutable en tiempo real, registro de eventos append-only y compliance normativo.</p>
        </div>

        <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-800 text-xs font-bold px-3 py-1.5 rounded-xl border border-purple-200">
          <ShieldCheck className="w-4 h-4 text-purple-600" />
          <span>Políticas RLS & Auditoría Criptográfica Activas</span>
        </div>
      </div>

      {/* Tarjetas de Métricas */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Atenciones Hoy</span>
            <Users className="w-4 h-4 text-brand-700" />
          </div>
          <span className="text-2xl font-black text-neutral-900">14</span>
          <span className="text-[11px] text-emerald-600 font-semibold block mt-1">+3 respecto a ayer</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Recaudación Caja</span>
            <DollarSign className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-2xl font-black text-neutral-900">{formatCurrency(980)}</span>
          <span className="text-[11px] text-neutral-400 block mt-1">Sedes Independencia & Vivanco</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Notas Firmadas</span>
            <FileCheck className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-2xl font-black text-neutral-900">12 / 14</span>
          <span className="text-[11px] text-blue-600 font-semibold block mt-1">85% selladas con hash</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Bloqueos RLS</span>
            <Lock className="w-4 h-4 text-purple-600" />
          </div>
          <span className="text-2xl font-black text-neutral-900">1</span>
          <span className="text-[11px] text-emerald-600 font-semibold block mt-1">Aislamiento clínico 100% efectivo</span>
        </div>
      </div>

      {/* Línea de Tiempo de Auditoría */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand-700" />
            <h2 className="font-extrabold text-sm text-neutral-900">Línea de Tiempo de Eventos Append-Only (Inmutable)</h2>
          </div>
          <span className="text-xs text-neutral-400">Trigger Postgres f_bloquear_delete activo</span>
        </div>

        <div className="divide-y divide-neutral-100">
          {eventos.map((ev) => (
            <div key={ev.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-neutral-400 font-bold">{ev.hora}</span>
                  <span
                    className={`font-black px-2 py-0.5 rounded-md text-[10px] ${
                      ev.accion.includes("DENEGADO")
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : ev.accion.includes("SELLAR")
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "bg-neutral-100 text-neutral-700"
                    }`}
                  >
                    {ev.accion}
                  </span>
                  <span className="text-neutral-500 font-medium">por {ev.usuario} ({ev.rol})</span>
                </div>
                <p className="text-neutral-700 pl-16 sm:pl-0 font-medium">{ev.detalle}</p>
              </div>

              <span className="font-mono text-[10px] text-neutral-400 bg-neutral-50 px-2 py-1 rounded-md self-start sm:self-center">
                {ev.id} &bull; {ev.entidad}:{ev.entidadId}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}