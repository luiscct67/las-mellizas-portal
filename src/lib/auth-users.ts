export interface UsuarioCredencial {
  id: string;
  email: string;
  nombre: string;
  passwordHash: string; // En demo guardamos el valor de verificación
  rol: "RECEPCION" | "PROFESIONAL" | "CAJA" | "SUPERVISION" | "ADMIN";
  sede: "Independencia" | "Vivanco" | "Todas las Sedes";
  colegiatura?: string; // CMP o COP
  especialidad?: string;
  cargo: string;
  requiereCambioPassword: boolean; // Si es true, debe cambiar contraseña en 1er login
  ultimoAcceso?: string;
  activo: boolean;
}

export const USUARIOS_INICIALES: UsuarioCredencial[] = [
  // Sede Independencia
  {
    id: "usr-ind-001",
    email: "recepcion.ind@lasmellizasperu.com",
    nombre: "Lucía Mendoza Quispe",
    passwordHash: "Mellizas#Ind2026!",
    rol: "RECEPCION",
    sede: "Independencia",
    cargo: "Admisión & Recepción",
    requiereCambioPassword: false,
    activo: true,
  },
  {
    id: "usr-ind-002",
    email: "medico.ind@lasmellizasperu.com",
    nombre: "Dr. Carlos Benavides Velarde",
    passwordHash: "Medico#Ind2026!",
    rol: "PROFESIONAL",
    sede: "Independencia",
    colegiatura: "CMP 54321 / RNE 23456",
    especialidad: "Ginecología & Obstetricia",
    cargo: "Médico Gineco-Obstetra",
    requiereCambioPassword: false,
    activo: true,
  },
  {
    id: "usr-ind-003",
    email: "caja.ind@lasmellizasperu.com",
    nombre: "Patricia Huamán Soto",
    passwordHash: "Caja#Ind2026!",
    rol: "CAJA",
    sede: "Independencia",
    cargo: "Cajera & Facturación",
    requiereCambioPassword: false,
    activo: true,
  },

  // Sede Vivanco
  {
    id: "usr-viv-001",
    email: "recepcion.viv@lasmellizasperu.com",
    nombre: "Marilú Quispe Paucar",
    passwordHash: "Mellizas#Viv2026!",
    rol: "RECEPCION",
    sede: "Vivanco",
    cargo: "Admisión & Recepción",
    requiereCambioPassword: false,
    activo: true,
  },
  {
    id: "usr-viv-002",
    email: "obstetra.viv@lasmellizasperu.com",
    nombre: "Lic. Sonia Rivas Alarcón",
    passwordHash: "Obstetra#Viv2026!",
    rol: "PROFESIONAL",
    sede: "Vivanco",
    colegiatura: "COP 12890",
    especialidad: "Obstetricia Integral & Salud Reproductiva",
    cargo: "Licenciada en Obstetricia",
    requiereCambioPassword: false,
    activo: true,
  },
  {
    id: "usr-viv-003",
    email: "caja.viv@lasmellizasperu.com",
    nombre: "Rosaura Pérez Cárdenas",
    passwordHash: "Caja#Viv2026!",
    rol: "CAJA",
    sede: "Vivanco",
    cargo: "Cajera & Cobranzas",
    requiereCambioPassword: false,
    activo: true,
  },

  // Dirección y Red
  {
    id: "usr-red-001",
    email: "supervision@lasmellizasperu.com",
    nombre: "Dra. Eliana Suárez Meza",
    passwordHash: "Auditor#Red2026!",
    rol: "SUPERVISION",
    sede: "Todas las Sedes",
    colegiatura: "CMP 38920 (Auditor Médico)",
    cargo: "Supervisión & Auditoría Red",
    requiereCambioPassword: false,
    activo: true,
  },
  {
    id: "usr-red-002",
    email: "admin@lasmellizasperu.com",
    nombre: "Dirección Técnica Red",
    passwordHash: "Director#Red2026!",
    rol: "ADMIN",
    sede: "Todas las Sedes",
    cargo: "Administración General",
    requiereCambioPassword: false,
    activo: true,
  },
];

const STORAGE_KEY = "lm_usuarios_credenciales_v1";

export function getUsuarios(): UsuarioCredencial[] {
  if (typeof window === "undefined") return USUARIOS_INICIALES;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(USUARIOS_INICIALES));
    return USUARIOS_INICIALES;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return USUARIOS_INICIALES;
  }
}

export function saveUsuarios(list: UsuarioCredencial[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function findUsuarioByEmail(email: string): UsuarioCredencial | undefined {
  const usuarios = getUsuarios();
  return usuarios.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
}

export function validarCredenciales(email: string, password: string): { ok: boolean; usuario?: UsuarioCredencial; error?: string } {
  const usuario = findUsuarioByEmail(email);
  if (!usuario) {
    return { ok: false, error: "Usuario no registrado en el sistema institucional." };
  }
  if (!usuario.activo) {
    return { ok: false, error: "Cuenta desactivada por la Administración. Contacte a Dirección Técnica." };
  }
  if (usuario.passwordHash !== password.trim()) {
    return { ok: false, error: "Contraseña incorrecta. Verifique mayúsculas, minúsculas y caracteres especiales." };
  }
  return { ok: true, usuario };
}

export function cambiarPasswordUsuario(email: string, nuevaClave: string): boolean {
  const usuarios = getUsuarios();
  const index = usuarios.findIndex((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (index === -1) return false;

  usuarios[index].passwordHash = nuevaClave.trim();
  usuarios[index].requiereCambioPassword = false;
  usuarios[index].ultimoAcceso = new Date().toLocaleString("es-PE");
  saveUsuarios(usuarios);
  return true;
}

export function crearNuevoUsuarioPorAdmin(datos: {
  email: string;
  nombre: string;
  rol: "RECEPCION" | "PROFESIONAL" | "CAJA" | "SUPERVISION" | "ADMIN";
  sede: "Independencia" | "Vivanco" | "Todas las Sedes";
  colegiatura?: string;
  especialidad?: string;
  cargo: string;
}): { usuario: UsuarioCredencial; passwordTemporal: string } {
  const usuarios = getUsuarios();

  // Generar contraseña temporal de 1 solo uso segura
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  let passwordTemporal = "Temp#";
  for (let i = 0; i < 6; i++) {
    passwordTemporal += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const nuevo: UsuarioCredencial = {
    id: `usr-${Date.now().toString().slice(-4)}`,
    email: datos.email.trim().toLowerCase(),
    nombre: datos.nombre.trim(),
    passwordHash: passwordTemporal,
    rol: datos.rol,
    sede: datos.sede,
    colegiatura: datos.colegiatura?.trim(),
    especialidad: datos.especialidad?.trim(),
    cargo: datos.cargo.trim(),
    requiereCambioPassword: true, // Obligatorio cambiar en primer uso
    activo: true,
  };

  usuarios.push(nuevo);
  saveUsuarios(usuarios);
  return { usuario: nuevo, passwordTemporal };
}

export function resetearPasswordTemporalPorAdmin(id: string): string | null {
  const usuarios = getUsuarios();
  const u = usuarios.find((item) => item.id === id);
  if (!u) return null;

  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  let nuevaTemporal = "Temp#";
  for (let i = 0; i < 6; i++) {
    nuevaTemporal += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  u.passwordHash = nuevaTemporal;
  u.requiereCambioPassword = true;
  saveUsuarios(usuarios);
  return nuevaTemporal;
}
