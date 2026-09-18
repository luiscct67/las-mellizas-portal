export type RolUsuario = 'RECEPCION_CAJA' | 'RECEPCION' | 'CAJA' | 'PROFESIONAL' | 'SUPERVISION' | 'ADMIN';
export type EstadoEncuentro = 'EN_ESPERA' | 'EN_ATENCION' | 'ATENDIDO' | 'CANCELADO';
export type EstadoOrden = 'PENDIENTE' | 'PAGADO' | 'ANULADO';
export type MedioPago = 'EFECTIVO' | 'YAPE' | 'PLIN' | 'TARJETA_POS' | 'TRANSFERENCIA';

export interface Sede {
  id: string;
  nombre: string;
  codigo: string;
  direccion: string;
  activa: boolean;
}

export interface PerfilUsuario {
  id: string;
  email: string;
  nombre_completo: string;
  rol: RolUsuario;
  site_id?: string;
  colegiatura?: string; // CMP o COP obligatorio según NTS N° 139-MINSA
  especialidad?: string;
  activo: boolean;
}

export interface Paciente {
  id: string;
  dni: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  email?: string;
  fecha_nacimiento?: string;
  direccion?: string;
  alergias?: string;
  grupo_sanguineo?: string;
  activo: boolean;
  created_at: string;
}

export interface Encuentro {
  id: string;
  paciente_id: string;
  site_id: string;
  profesional_id?: string;
  servicio_solicitado: string;
  estado: EstadoEncuentro;
  fecha_hora: string;
  paciente?: Paciente;
  sede?: Sede;
}

export interface TriajeVital {
  pa: string; // Presión arterial (mmHg)
  fc: string; // Frecuencia cardíaca (lpm)
  fr: string; // Frecuencia respiratoria (rpm)
  temp: string; // Temperatura (°C)
  sato2: string; // Saturación O2 (%)
  peso: string; // Peso (kg)
  talla: string; // Talla (m)
  imc: string; // IMC calculado
}

export interface PerfilObstetrico {
  formula_g: string; // G_
  formula_p: string; // P____
  fur: string; // Fecha última regla
  fpp: string; // Fecha probable de parto
  eg: string; // Edad gestacional
  au: string; // Altura uterina (cm)
  lcf: string; // Latidos cardiofetales (lpm)
  presentacion: string; // Cefálica, etc.
  movimientos: string;
}

export interface NotaClinica {
  id: string;
  encuentro_id: string;
  paciente_id: string;
  profesional_id: string;
  motivo_consulta: string;
  antecedentes?: string;
  examen_fisico?: string;
  diagnostico_cie10: string;
  plan_trabajo?: string;
  tratamiento?: string;
  triaje?: TriajeVital;
  obstetricia?: PerfilObstetrico;
  cerrada: boolean;
  fecha_cierre?: string;
  firma_hash?: string;
  created_at: string;
  updated_at: string;
}

export interface OrdenPago {
  id: string;
  encuentro_id?: string;
  paciente_id: string;
  site_id: string;
  monto: number;
  estado: EstadoOrden;
  concepto: string;
  created_at: string;
}

export interface Pago {
  id: string;
  orden_id: string;
  medio_pago: MedioPago;
  monto: number;
  numero_operacion?: string;
  cajero_id: string;
  created_at: string;
}

export interface AuditoriaEvento {
  id: string;
  usuario_id: string;
  site_id?: string;
  accion: string;
  entidad: string;
  entidad_id: string;
  detalle?: string;
  ip?: string;
  created_at: string;
}