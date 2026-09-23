"use client";

import React, { createContext, useContext, useState } from "react";

export type ModalidadAtencion =
  | "OBSTETRICIA"
  | "GINECOLOGIA"
  | "ECOGRAFIA"
  | "MEDICINA_GENERAL"
  | "LABORATORIO";

export type TipoEcografia =
  | "OBSTETRICA"
  | "TRANSVAGINAL"
  | "ABDOMINAL"
  | "RENAL"
  | "PROSTATICA"
  | "PARTES_BLANDAS"
  | "MAMARIA"
  | "TIROIDEA";

export interface PatientQueueItem {
  id: string;
  pacienteId?: string;
  paciente: string;
  dni: string;
  edad: string;
  servicio: string;
  alergias?: string;
  grupoSanguineo?: string;
  sede: string;
  estado?: string;
  telefono?: string;
  horaLlegada?: string;
}

interface HceSpecialtyContextType {
  modalidadAtencion: ModalidadAtencion;
  setModalidadAtencion: (m: ModalidadAtencion) => void;
  tipoEcografia: TipoEcografia;
  setTipoEcografia: (t: TipoEcografia) => void;

  // Cola de Pacientes compartida entre Sidebar y HCE
  pacientesEspera: PatientQueueItem[];
  setPacientesEspera: (items: PatientQueueItem[]) => void;
  pacientesAtendidos: PatientQueueItem[];
  setPacientesAtendidos: (items: PatientQueueItem[]) => void;
  selectedPatientId: string | null;
  setSelectedPatientId: (id: string | null) => void;
  vistaCola: "espera" | "atendidos";
  setVistaCola: (v: "espera" | "atendidos") => void;
  sedeCola: string;
  setSedeCola: (s: string) => void;
  onSelectPatient: ((p: PatientQueueItem) => void) | null;
  setOnSelectPatient: (fn: ((p: PatientQueueItem) => void) | null) => void;
  onReopenPatient: ((p: PatientQueueItem) => void) | null;
  setOnReopenPatient: (fn: ((p: PatientQueueItem) => void) | null) => void;
}

const HceSpecialtyContext = createContext<HceSpecialtyContextType | undefined>(undefined);

export function HceSpecialtyProvider({ children }: { children: React.ReactNode }) {
  const [modalidadAtencion, setModalidadAtencion] = useState<ModalidadAtencion>("OBSTETRICIA");
  const [tipoEcografia, setTipoEcografia] = useState<TipoEcografia>("OBSTETRICA");

  const [pacientesEspera, setPacientesEspera] = useState<PatientQueueItem[]>([]);
  const [pacientesAtendidos, setPacientesAtendidos] = useState<PatientQueueItem[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [vistaCola, setVistaCola] = useState<"espera" | "atendidos">("espera");
  const [sedeCola, setSedeCola] = useState<string>("Vivanco");

  const [onSelectPatient, setOnSelectPatient] = useState<((p: PatientQueueItem) => void) | null>(null);
  const [onReopenPatient, setOnReopenPatient] = useState<((p: PatientQueueItem) => void) | null>(null);

  return (
    <HceSpecialtyContext.Provider
      value={{
        modalidadAtencion,
        setModalidadAtencion,
        tipoEcografia,
        setTipoEcografia,
        pacientesEspera,
        setPacientesEspera,
        pacientesAtendidos,
        setPacientesAtendidos,
        selectedPatientId,
        setSelectedPatientId,
        vistaCola,
        setVistaCola,
        sedeCola,
        setSedeCola,
        onSelectPatient,
        setOnSelectPatient,
        onReopenPatient,
        setOnReopenPatient,
      }}
    >
      {children}
    </HceSpecialtyContext.Provider>
  );
}

export function useHceSpecialty() {
  const context = useContext(HceSpecialtyContext);
  if (!context) {
    throw new Error("useHceSpecialty debe ser utilizado dentro de un HceSpecialtyProvider");
  }
  return context;
}
