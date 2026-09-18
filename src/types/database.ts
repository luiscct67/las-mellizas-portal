export type RolUsuario = 'RECEPCION' | 'PROFESIONAL' | 'CAJA' | 'SUPERVISION' | 'ADMIN';
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
  cerrada: boolean;
  fecha_cierre?: string;
  hash_firma?: string;
  created_at: string;
  updated_at: string;
}

export interface Adenda {
  id: string;
  nota_id: string;
  profesional_id: string;
  texto: string;
  fecha_hora: string;
  hash_firma?: string;
}

export interface OrdenPago {
  id: string;
  encuentro_id: string;
  paciente_id: string;
  site_id: string;
  servicio: string;
  monto: number;
  estado: EstadoOrden;
  created_at: string;
  paciente?: Paciente;
}

export interface Pago {
  id: string;
  orden_id: string;
  cajero_id: string;
  medio_pago: MedioPago;
  monto: number;
  referencia?: string;
  fecha_hora: string;
}

export interface Auditoria {
  id: string;
  fecha_hora: string;
  usuario_id?: string;
  site_id?: string;
  accion: string;
  entidad: string;
  entidad_id?: string;
  detalle?: Record<string, any>;
}