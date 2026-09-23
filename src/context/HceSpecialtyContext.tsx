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

interface HceSpecialtyContextType {
  modalidadAtencion: ModalidadAtencion;
  setModalidadAtencion: (m: ModalidadAtencion) => void;
  tipoEcografia: TipoEcografia;
  setTipoEcografia: (t: TipoEcografia) => void;
}

const HceSpecialtyContext = createContext<HceSpecialtyContextType | undefined>(undefined);

export function HceSpecialtyProvider({ children }: { children: React.ReactNode }) {
  const [modalidadAtencion, setModalidadAtencion] = useState<ModalidadAtencion>("OBSTETRICIA");
  const [tipoEcografia, setTipoEcografia] = useState<TipoEcografia>("OBSTETRICA");

  return (
    <HceSpecialtyContext.Provider
      value={{
        modalidadAtencion,
        setModalidadAtencion,
        tipoEcografia,
        setTipoEcografia,
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
