/**
 * PADRÓN OFICIAL Y EXCLUSIVO DE CUENTAS AUTORIZADAS
 * Consultorio Obstétrico Ecográfico Las Mellizas Perú S.A.C.
 * RUC: 20611827335
 */

export interface CuentaOficial {
  email: string;
  emailNormalized: string;
  nombre: string;
  rol: "RECEPCION_CAJA" | "PROFESIONAL" | "ADMIN";
  sede: "Independencia" | "Vivanco" | "Central";
  cargo: string;
  colegiatura?: string;
  especialidad?: string;
}

export function normalizarEmail(email: string): string {
  return email
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remueve tildes (ej. admisión -> admision)
}

export const PADRON_OFICIAL_AUTORIZADO: CuentaOficial[] = [
  // 1. Sede Independencia - Obstetricia
  {
    email: "obstetra.inv1@lasmellizasperu.com",
    emailNormalized: "obstetra.inv1@lasmellizasperu.com",
    nombre: "Obstetra Independencia 1",
    rol: "PROFESIONAL",
    sede: "Independencia",
    cargo: "Obstetra Especialista",
    especialidad: "Obstetricia y Monitoreo Fetal",
  },
  // 2. Sede Independencia - Medicina
  {
    email: "medico.inv2@lasmellizasperu.com",
    emailNormalized: "medico.inv2@lasmellizasperu.com",
    nombre: "Médico Independencia 2",
    rol: "PROFESIONAL",
    sede: "Independencia",
    cargo: "Médico Gineco-Obstetra",
    especialidad: "Ginecología y Obstetricia",
  },
  // 3. Sede Independencia - Medicina
  {
    email: "medici.inv1@lasmellizasperu.com",
    emailNormalized: "medici.inv1@lasmellizasperu.com",
    nombre: "Médico Independencia 1",
    rol: "PROFESIONAL",
    sede: "Independencia",
    cargo: "Médico Asistencial",
    especialidad: "Medicina Reproductiva y Ecografía",
  },
  // 4. Sede Independencia - Medicina
  {
    email: "medico.bar@lasmellizasperu.com",
    emailNormalized: "medico.bar@lasmellizasperu.com",
    nombre: "Médico Bar Independencia",
    rol: "PROFESIONAL",
    sede: "Independencia",
    cargo: "Médico Gineco-Obstetra",
    especialidad: "Ecografía Fetal Avanzada",
  },
  // 5. Sede Independencia - Medicina
  {
    email: "medico.cap@lasmellizasperu.com",
    emailNormalized: "medico.cap@lasmellizasperu.com",
    nombre: "Médico Cap Independencia",
    rol: "PROFESIONAL",
    sede: "Independencia",
    cargo: "Médico Gineco-Obstetra",
    especialidad: "Ginecología Integral",
  },
  // 6. Sede Independencia - Medicina
  {
    email: "medico.pmg@lasmellizasperu.com",
    emailNormalized: "medico.pmg@lasmellizasperu.com",
    nombre: "Médico PMG Independencia",
    rol: "PROFESIONAL",
    sede: "Independencia",
    cargo: "Médico Gineco-Obstetra",
    especialidad: "Obstetricia de Alto Riesgo",
  },
  // 7. Sede Vivanco - Obstetricia
  {
    email: "obstetra.yrp@lasmellizasperu.com",
    emailNormalized: "obstetra.yrp@lasmellizasperu.com",
    nombre: "Obstetra YRP Vivanco",
    rol: "PROFESIONAL",
    sede: "Vivanco",
    cargo: "Obstetra Especialista",
    especialidad: "Control Prenatal Reenfocado",
  },
  // 8. Sede Vivanco - Obstetricia
  {
    email: "obstetra.yen@lasmellizasperu.com",
    emailNormalized: "obstetra.yen@lasmellizasperu.com",
    nombre: "Obstetra YEN Vivanco",
    rol: "PROFESIONAL",
    sede: "Vivanco",
    cargo: "Obstetra Asistencial",
    especialidad: "Ecografía Obstétrica",
  },
  // 9. Sede Vivanco - Obstetricia
  {
    email: "obstetra.lis@lasmellizasperu.com",
    emailNormalized: "obstetra.lis@lasmellizasperu.com",
    nombre: "Obstetra LIS Vivanco",
    rol: "PROFESIONAL",
    sede: "Vivanco",
    cargo: "Obstetra Asistencial",
    especialidad: "Monitoreo Fetal y Psicoprofilaxis",
  },
  // 10. Sede Vivanco - Obstetricia
  {
    email: "obstetra.duo@lasmellizasperu.com",
    emailNormalized: "obstetra.duo@lasmellizasperu.com",
    nombre: "Obstetra DUO Vivanco",
    rol: "PROFESIONAL",
    sede: "Vivanco",
    cargo: "Obstetra Asistencial",
    especialidad: "Salud Reproductiva",
  },
  // 11. Sede Vivanco - Admisión & Caja
  {
    email: "admisión.viv2@lasmellizasperu.com",
    emailNormalized: "admision.viv2@lasmellizasperu.com",
    nombre: "Admisión & Caja Vivanco 2",
    rol: "RECEPCION_CAJA",
    sede: "Vivanco",
    cargo: "Operador de Admisión & Caja",
  },
  // 12. Sede Independencia - Admisión & Caja
  {
    email: "admisión.ind2@lasmellizasperu.com",
    emailNormalized: "admision.ind2@lasmellizasperu.com",
    nombre: "Admisión & Caja Independencia 2",
    rol: "RECEPCION_CAJA",
    sede: "Independencia",
    cargo: "Operador de Admisión & Caja",
  },
  // 13. Sede Vivanco - Admisión & Caja
  {
    email: "admisión.viv1@lasmellizasperu.com",
    emailNormalized: "admision.viv1@lasmellizasperu.com",
    nombre: "Admisión & Caja Vivanco 1",
    rol: "RECEPCION_CAJA",
    sede: "Vivanco",
    cargo: "Operador de Admisión & Caja",
  },
  // 14. Sede Vivanco - Admisión & Caja (Alternativa)
  {
    email: "admision.vivanco2@lasmellizasperu.com",
    emailNormalized: "admision.vivanco2@lasmellizasperu.com",
    nombre: "Admisión & Caja Vivanco 2 (Canónica)",
    rol: "RECEPCION_CAJA",
    sede: "Vivanco",
    cargo: "Operador de Admisión & Caja",
  },
  // 15. Sede Independencia - Obstetricia
  {
    email: "obstetra.inb2@lasmellizasperu.com",
    emailNormalized: "obstetra.inb2@lasmellizasperu.com",
    nombre: "Obstetra INB Independencia",
    rol: "PROFESIONAL",
    sede: "Independencia",
    cargo: "Obstetra Asistencial",
    especialidad: "Obstetricia Integral",
  },
  // 16. Administración General de la Red
  {
    email: "admin@lasmellizasperu.com",
    emailNormalized: "admin@lasmellizasperu.com",
    nombre: "Dirección Médica & Gestión",
    rol: "ADMIN",
    sede: "Central",
    cargo: "Administrador General Red",
    especialidad: "Dirección Médica",
  },
];

export function obtenerCuentaAutorizada(emailInput: string): CuentaOficial | null {
  const normalizado = normalizarEmail(emailInput);
  return (
    PADRON_OFICIAL_AUTORIZADO.find(
      (cta) =>
        cta.emailNormalized === normalizado ||
        cta.email.toLowerCase() === emailInput.trim().toLowerCase()
    ) || null
  );
}

export function isEmailAutorizado(emailInput: string): boolean {
  return obtenerCuentaAutorizada(emailInput) !== null;
}
