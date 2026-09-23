"use client";

import React, { createContext, useContext, useState } from "react";

export type SubModuloAdmision =
  | "ADMISION_VENTA"
  | "CITAS_REAGENDAMIENTOS"
  | "CAJA_ARQUEO"
  | "DISPENSACION";

export interface PacienteTurnoAdmision {
  id: string;
  encuentroId?: string;
  paciente: string;
  dni: string;
  servicio: string;
  monto: number;
  medioPago: string;
  hora: string;
  estadoConsultorio: "EN_ESPERA" | "EN_ATENCION" | "ATENDIDO" | "CANCELADO" | "REPROGRAMADO";
  sede: string;
}

interface AdmisionContextType {
  subModuloActivo: SubModuloAdmision;
  setSubModuloActivo: (m: SubModuloAdmision) => void;

  // Monitor de Pacientes de Ventanilla en tiempo real para la columna vino
  pacientesTurno: PacienteTurnoAdmision[];
  setPacientesTurno: (items: PacienteTurnoAdmision[]) => void;
  vistaColaAdmision: "espera" | "atendidos" | "todos";
  setVistaColaAdmision: (v: "espera" | "atendidos" | "todos") => void;

  // Estado de caja compartido
  cajaAbierta: boolean;
  setCajaAbierta: (v: boolean) => void;
  fondoApertura: number;
  setFondoApertura: (v: number) => void;
}

const AdmisionContext = createContext<AdmisionContextType | undefined>(undefined);

export function AdmisionProvider({ children }: { children: React.ReactNode }) {
  const [subModuloActivo, setSubModuloActivo] = useState<SubModuloAdmision>("ADMISION_VENTA");
  const [pacientesTurno, setPacientesTurno] = useState<PacienteTurnoAdmision[]>([]);
  const [vistaColaAdmision, setVistaColaAdmision] = useState<"espera" | "atendidos" | "todos">("espera");
  const [cajaAbierta, setCajaAbierta] = useState<boolean>(true);
  const [fondoApertura, setFondoApertura] = useState<number>(50);

  return (
    <AdmisionContext.Provider
      value={{
        subModuloActivo,
        setSubModuloActivo,
        pacientesTurno,
        setPacientesTurno,
        vistaColaAdmision,
        setVistaColaAdmision,
        cajaAbierta,
        setCajaAbierta,
        fondoApertura,
        setFondoApertura,
      }}
    >
      {children}
    </AdmisionContext.Provider>
  );
}

export function useAdmision() {
  const context = useContext(AdmisionContext);
  if (!context) {
    throw new Error("useAdmision debe ser utilizado dentro de un AdmisionProvider");
  }
  return context;
}
