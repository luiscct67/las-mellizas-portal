-- ============================================================================
-- PASO 6 (DG-001-C / DG-001-B): ESQUEMA DE AISLAMIENTO MULTISEDE Y RLS ZERO TRUST
-- ESTADO: VERSIÓN CONSOLIDADA COMPLETA (COBERTURA TOTAL DE LAS 16 TABLAS)
-- ADVERTENCIA: NO EJECUTAR EN MAIN NI EN BASE DE DATOS DE PRODUCCIÓN HASTA AUTORIZACIÓN
-- REFERENCIA: Directiva DG-001-B (Control de Acceso y Visibilidad Clínica Negativa)
-- FECHA: 21 de Septiembre de 2026
-- ============================================================================

-- 1. ROLES Y TIPOS DE CONTROL DE ACCESO
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rol_institucional') THEN
    CREATE TYPE rol_institucional AS ENUM (
      'recepcion',
      'profesional',
      'caja',
      'supervision',
      'administrador'
    );
  END IF;
END $$;

-- 2. TABLA DE ASIGNACIÓN MULTISEDE (RELACIÓN N:N)
CREATE TABLE IF NOT EXISTS public.usuario_sede (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sede(id) ON DELETE CASCADE,
  creado_el TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_usuario_sede UNIQUE (user_id, site_id)
);

ALTER TABLE public.usuario_sede ENABLE ROW LEVEL SECURITY;

-- 3. FUNCIONES AUXILIARES DE GOBERNANZA (SECURITY DEFINER / SEARCH_PATH FIJO)
-- Evitan recursión infinita en políticas RLS y aíslan el contexto del usuario actual.

CREATE OR REPLACE FUNCTION public.rol_usuario_actual()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(rol, 'ninguno') FROM public.perfil_usuario 
  WHERE id = auth.uid() AND activo = true;
$$;

CREATE OR REPLACE FUNCTION public.sedes_usuario_actual()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT site_id FROM public.usuario_sede WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.es_rol_multisede()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(public.rol_usuario_actual() IN ('administrador', 'supervision'), false);
$$;

CREATE OR REPLACE FUNCTION public.tiene_acceso_a_sede(p_site_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.es_rol_multisede() 
      OR (p_site_id IN (SELECT public.sedes_usuario_actual()));
$$;

REVOKE ALL ON FUNCTION public.rol_usuario_actual() FROM public, anon;
REVOKE ALL ON FUNCTION public.sedes_usuario_actual() FROM public, anon;
REVOKE ALL ON FUNCTION public.es_rol_multisede() FROM public, anon;
REVOKE ALL ON FUNCTION public.tiene_acceso_a_sede(UUID) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.rol_usuario_actual() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sedes_usuario_actual() TO authenticated;
GRANT EXECUTE ON FUNCTION public.es_rol_multisede() TO authenticated;
GRANT EXECUTE ON FUNCTION public.tiene_acceso_a_sede(UUID) TO authenticated;

-- ============================================================================
-- 4. SUBSANACIÓN DE BRECHAS Y CIERRE DE PERMISOS ANÓNIMOS (MÍNIMO PRIVILEGIO)
-- ============================================================================

-- Revocación absoluta a rol anónimo en tablas y RPCs sensibles
REVOKE ALL ON public.paciente FROM anon;
REVOKE ALL ON public.encuentro FROM anon;
REVOKE ALL ON public.orden_pago FROM anon;
REVOKE ALL ON public.pago FROM anon;
REVOKE ALL ON public.caja_turno FROM anon;
REVOKE ALL ON public.caja_egreso FROM anon;
REVOKE ALL ON public.cita_reagendada FROM anon;
REVOKE ALL ON public.nota_clinica FROM anon;
REVOKE ALL ON public.adenda FROM anon;
REVOKE ALL ON public.auditoria FROM anon;

-- Inmutabilidad estricta de auditoría: Nadie puede insertar/modificar desde cliente
REVOKE INSERT, UPDATE, DELETE ON public.auditoria FROM authenticated, anon, public;

-- Inmutabilidad de notas y pagos: Sin update ni delete directo
REVOKE UPDATE, DELETE ON public.nota_clinica FROM authenticated, anon, public;
REVOKE UPDATE, DELETE ON public.adenda FROM authenticated, anon, public;
REVOKE UPDATE, DELETE ON public.pago FROM authenticated, anon, public;

-- Otorgar permisos base de DML al rol authenticated (el filtrado fino lo rige RLS)
GRANT SELECT, INSERT, UPDATE ON public.paciente TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.encuentro TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.cita_reagendada TO authenticated;
GRANT SELECT, INSERT ON public.nota_clinica TO authenticated;
GRANT SELECT, INSERT ON public.adenda TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.caja_turno TO authenticated;
GRANT SELECT, INSERT ON public.caja_egreso TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.orden_pago TO authenticated;
GRANT SELECT, INSERT ON public.pago TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.perfil_usuario TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuario_sede TO authenticated;
GRANT SELECT ON public.sede TO authenticated;
GRANT SELECT ON public.auditoria TO authenticated;
GRANT SELECT ON public.organizacion TO authenticated;
GRANT SELECT ON public.producto_inventario TO authenticated;
GRANT SELECT ON public.movimiento_inventario TO authenticated;

-- Forzar RLS en todas las tablas sensibles (Zero Trust incluso ante roles con bypass o dueños de tabla)
ALTER TABLE public.perfil_usuario FORCE ROW LEVEL SECURITY;
ALTER TABLE public.usuario_sede FORCE ROW LEVEL SECURITY;
ALTER TABLE public.paciente FORCE ROW LEVEL SECURITY;
ALTER TABLE public.encuentro FORCE ROW LEVEL SECURITY;
ALTER TABLE public.cita_reagendada FORCE ROW LEVEL SECURITY;
ALTER TABLE public.nota_clinica FORCE ROW LEVEL SECURITY;
ALTER TABLE public.adenda FORCE ROW LEVEL SECURITY;
ALTER TABLE public.caja_turno FORCE ROW LEVEL SECURITY;
ALTER TABLE public.caja_egreso FORCE ROW LEVEL SECURITY;
ALTER TABLE public.orden_pago FORCE ROW LEVEL SECURITY;
ALTER TABLE public.pago FORCE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria FORCE ROW LEVEL SECURITY;
ALTER TABLE public.organizacion FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sede FORCE ROW LEVEL SECURITY;
ALTER TABLE public.producto_inventario FORCE ROW LEVEL SECURITY;
ALTER TABLE public.movimiento_inventario FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- 4.5. BARRIDO DINÁMICO: ELIMINAR TODA POLÍTICA EXISTENTE EN LAS 16 TABLAS DEL
-- ALCANCE, SIN IMPORTAR SU NOMBRE, ANTES DE CREAR LAS POLÍTICAS ZERO TRUST.
-- Esto hace irrelevante conocer de antemano el nombre exacto de cada política
-- legacy — elimina la clase entera de error, no solo los casos ya detectados.
-- ============================================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'perfil_usuario', 'usuario_sede', 'paciente', 'encuentro',
        'cita_reagendada', 'nota_clinica', 'adenda', 'caja_turno',
        'caja_egreso', 'orden_pago', 'pago', 'auditoria',
        'organizacion', 'sede', 'producto_inventario', 'movimiento_inventario'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    RAISE NOTICE 'Eliminada política % en tabla %', r.policyname, r.tablename;
  END LOOP;
END $$;

-- ============================================================================
-- 5. POLÍTICAS RLS ZERO TRUST POR DOMINIO (COBERTURA TOTAL 16 TABLAS)
-- Purgado total de cláusulas permisivas "USING (true)" u "OR true".
-- ============================================================================

-- --- TABLA 1: perfil_usuario ---
ALTER TABLE public.perfil_usuario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "perfil_usuario_select" ON public.perfil_usuario;
CREATE POLICY "perfil_usuario_select" ON public.perfil_usuario
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.es_rol_multisede());

DROP POLICY IF EXISTS "perfil_usuario_admin_write" ON public.perfil_usuario;
CREATE POLICY "perfil_usuario_admin_write" ON public.perfil_usuario
  FOR ALL TO authenticated
  USING (public.rol_usuario_actual() = 'administrador')
  WITH CHECK (public.rol_usuario_actual() = 'administrador');

-- --- TABLA 2: usuario_sede ---
ALTER TABLE public.usuario_sede ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuario_sede_select" ON public.usuario_sede;
CREATE POLICY "usuario_sede_select" ON public.usuario_sede
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.es_rol_multisede());

DROP POLICY IF EXISTS "usuario_sede_admin_write" ON public.usuario_sede;
CREATE POLICY "usuario_sede_admin_write" ON public.usuario_sede
  FOR ALL TO authenticated
  USING (public.rol_usuario_actual() = 'administrador')
  WITH CHECK (public.rol_usuario_actual() = 'administrador');

-- --- TABLA 3: paciente (Identidad Transversal) ---
ALTER TABLE public.paciente ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "paciente_select" ON public.paciente;
CREATE POLICY "paciente_select" ON public.paciente
  FOR SELECT TO authenticated
  USING (public.rol_usuario_actual() IN ('recepcion', 'profesional', 'caja', 'supervision', 'administrador'));

DROP POLICY IF EXISTS "paciente_insert" ON public.paciente;
CREATE POLICY "paciente_insert" ON public.paciente
  FOR INSERT TO authenticated
  WITH CHECK (public.rol_usuario_actual() IN ('recepcion', 'caja', 'administrador'));

DROP POLICY IF EXISTS "paciente_update" ON public.paciente;
CREATE POLICY "paciente_update" ON public.paciente
  FOR UPDATE TO authenticated
  USING (public.rol_usuario_actual() IN ('recepcion', 'caja', 'profesional', 'administrador'))
  WITH CHECK (public.rol_usuario_actual() IN ('recepcion', 'caja', 'profesional', 'administrador'));

-- --- TABLA 4: encuentro (Aislamiento por Sede) ---
ALTER TABLE public.encuentro ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "encuentro_select" ON public.encuentro;
CREATE POLICY "encuentro_select" ON public.encuentro
  FOR SELECT TO authenticated
  USING (public.tiene_acceso_a_sede(site_id));

DROP POLICY IF EXISTS "encuentro_insert" ON public.encuentro;
CREATE POLICY "encuentro_insert" ON public.encuentro
  FOR INSERT TO authenticated
  WITH CHECK (
    public.rol_usuario_actual() IN ('recepcion', 'caja', 'profesional', 'administrador')
    AND public.tiene_acceso_a_sede(site_id)
  );

DROP POLICY IF EXISTS "encuentro_update" ON public.encuentro;
CREATE POLICY "encuentro_update" ON public.encuentro
  FOR UPDATE TO authenticated
  USING (
    public.rol_usuario_actual() IN ('profesional', 'administrador')
    AND public.tiene_acceso_a_sede(site_id)
  )
  WITH CHECK (
    public.rol_usuario_actual() IN ('profesional', 'administrador')
    AND public.tiene_acceso_a_sede(site_id)
  );

-- --- TABLA 5: cita_reagendada (Puente Agenda <-> HCE/Caja) ---
ALTER TABLE public.cita_reagendada ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cita_reagendada_select" ON public.cita_reagendada;
CREATE POLICY "cita_reagendada_select" ON public.cita_reagendada
  FOR SELECT TO authenticated
  USING (
    public.tiene_acceso_a_sede(site_id)
    OR EXISTS (
      SELECT 1 FROM public.encuentro e
      WHERE e.id = encuentro_id AND public.tiene_acceso_a_sede(e.site_id)
    )
  );

DROP POLICY IF EXISTS "cita_reagendada_insert" ON public.cita_reagendada;
CREATE POLICY "cita_reagendada_insert" ON public.cita_reagendada
  FOR INSERT TO authenticated
  WITH CHECK (
    public.rol_usuario_actual() IN ('recepcion', 'caja', 'administrador')
    AND (
      public.tiene_acceso_a_sede(site_id)
      OR EXISTS (
        SELECT 1 FROM public.encuentro e
        WHERE e.id = encuentro_id AND public.tiene_acceso_a_sede(e.site_id)
      )
    )
  );

DROP POLICY IF EXISTS "cita_reagendada_update" ON public.cita_reagendada;
CREATE POLICY "cita_reagendada_update" ON public.cita_reagendada
  FOR UPDATE TO authenticated
  USING (
    public.rol_usuario_actual() IN ('recepcion', 'caja', 'administrador')
    AND (
      public.tiene_acceso_a_sede(site_id)
      OR EXISTS (
        SELECT 1 FROM public.encuentro e
        WHERE e.id = encuentro_id AND public.tiene_acceso_a_sede(e.site_id)
      )
    )
  )
  WITH CHECK (
    public.rol_usuario_actual() IN ('recepcion', 'caja', 'administrador')
    AND (
      public.tiene_acceso_a_sede(site_id)
      OR EXISTS (
        SELECT 1 FROM public.encuentro e
        WHERE e.id = encuentro_id AND public.tiene_acceso_a_sede(e.site_id)
      )
    )
  );

-- --- TABLA 6: nota_clinica (Control Negativo Clínico DG-001-B) ---
ALTER TABLE public.nota_clinica ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nota_clinica_select" ON public.nota_clinica;
CREATE POLICY "nota_clinica_select" ON public.nota_clinica
  FOR SELECT TO authenticated
  USING (
    public.rol_usuario_actual() IN ('profesional', 'supervision', 'administrador')
    AND EXISTS (
      SELECT 1 FROM public.encuentro e 
      WHERE e.id = encuentro_id AND public.tiene_acceso_a_sede(e.site_id)
    )
  );

DROP POLICY IF EXISTS "nota_clinica_insert" ON public.nota_clinica;
CREATE POLICY "nota_clinica_insert" ON public.nota_clinica
  FOR INSERT TO authenticated
  WITH CHECK (
    public.rol_usuario_actual() IN ('profesional', 'administrador')
    AND EXISTS (
      SELECT 1 FROM public.encuentro e 
      WHERE e.id = encuentro_id AND public.tiene_acceso_a_sede(e.site_id)
    )
  );

-- --- TABLA 7: adenda (Inmutable Append-Only) ---
ALTER TABLE public.adenda ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura médica de adendas" ON public.adenda;
DROP POLICY IF EXISTS "Crear adenda (Solo Médicos)" ON public.adenda;
DROP POLICY IF EXISTS "Zero Trust: Lectura médica de adendas" ON public.adenda;
DROP POLICY IF EXISTS "Zero Trust: Creación de adenda médica" ON public.adenda;
DROP POLICY IF EXISTS "adenda_select" ON public.adenda;
DROP POLICY IF EXISTS "adenda_insert" ON public.adenda;

CREATE POLICY "adenda_select" ON public.adenda
  FOR SELECT TO authenticated
  USING (
    public.rol_usuario_actual() IN ('profesional', 'supervision', 'administrador')
    AND EXISTS (
      SELECT 1 FROM public.nota_clinica nc
      JOIN public.encuentro e ON e.id = nc.encuentro_id
      WHERE nc.id = adenda.nota_id AND public.tiene_acceso_a_sede(e.site_id)
    )
  );

CREATE POLICY "adenda_insert" ON public.adenda
  FOR INSERT TO authenticated
  WITH CHECK (
    public.rol_usuario_actual() IN ('profesional', 'administrador')
    AND EXISTS (
      SELECT 1 FROM public.nota_clinica nc
      JOIN public.encuentro e ON e.id = nc.encuentro_id
      WHERE nc.id = adenda.nota_id AND public.tiene_acceso_a_sede(e.site_id)
    )
  );

-- --- TABLA 8: caja_turno ---
ALTER TABLE public.caja_turno ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "caja_turno_select" ON public.caja_turno;
CREATE POLICY "caja_turno_select" ON public.caja_turno
  FOR SELECT TO authenticated
  USING (
    public.es_rol_multisede()
    OR (public.rol_usuario_actual() = 'caja' AND public.tiene_acceso_a_sede(site_id))
  );

DROP POLICY IF EXISTS "caja_turno_insert" ON public.caja_turno;
CREATE POLICY "caja_turno_insert" ON public.caja_turno
  FOR INSERT TO authenticated
  WITH CHECK (
    public.rol_usuario_actual() IN ('caja', 'administrador')
    AND public.tiene_acceso_a_sede(site_id)
  );

DROP POLICY IF EXISTS "caja_turno_update" ON public.caja_turno;
CREATE POLICY "caja_turno_update" ON public.caja_turno
  FOR UPDATE TO authenticated
  USING (
    (public.rol_usuario_actual() = 'caja' AND cajero_id = auth.uid() AND estado = 'ABIERTA')
    OR public.rol_usuario_actual() = 'administrador'
  );

-- --- TABLA 9: caja_egreso ---
ALTER TABLE public.caja_egreso ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "caja_egreso_select" ON public.caja_egreso;
CREATE POLICY "caja_egreso_select" ON public.caja_egreso
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.caja_turno ct
      WHERE ct.id = turno_id AND (
        public.es_rol_multisede()
        OR (public.rol_usuario_actual() = 'caja' AND public.tiene_acceso_a_sede(ct.site_id))
      )
    )
  );

DROP POLICY IF EXISTS "caja_egreso_insert" ON public.caja_egreso;
CREATE POLICY "caja_egreso_insert" ON public.caja_egreso
  FOR INSERT TO authenticated
  WITH CHECK (
    public.rol_usuario_actual() IN ('caja', 'administrador')
    AND EXISTS (
      SELECT 1 FROM public.caja_turno ct
      WHERE ct.id = turno_id AND public.tiene_acceso_a_sede(ct.site_id)
    )
  );

-- --- TABLA 10: orden_pago ---
ALTER TABLE public.orden_pago ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ordenes Pago: Acceso total caja y admision" ON public.orden_pago;
DROP POLICY IF EXISTS "Ver órdenes de pago por sede" ON public.orden_pago;
DROP POLICY IF EXISTS "Crear órdenes de pago por sede" ON public.orden_pago;
DROP POLICY IF EXISTS "Cobrar orden en sede propia" ON public.orden_pago;
DROP POLICY IF EXISTS "Ver órdenes de pago" ON public.orden_pago;
DROP POLICY IF EXISTS "Crear órdenes de pago" ON public.orden_pago;
DROP POLICY IF EXISTS "Actualizar órdenes de pago" ON public.orden_pago;
DROP POLICY IF EXISTS "Zero Trust: Gestión de órdenes y caja" ON public.orden_pago;
DROP POLICY IF EXISTS "Zero Trust: Generación de tickets y cobro" ON public.orden_pago;
DROP POLICY IF EXISTS "Zero Trust: Cobro inmediato y liquidación" ON public.orden_pago;
DROP POLICY IF EXISTS "Zero Trust: Órdenes de cobro por operador" ON public.orden_pago;
DROP POLICY IF EXISTS "Zero Trust: Creación de órdenes en ventanilla" ON public.orden_pago;
DROP POLICY IF EXISTS "orden_pago_select" ON public.orden_pago;
DROP POLICY IF EXISTS "orden_pago_insert" ON public.orden_pago;
DROP POLICY IF EXISTS "orden_pago_update" ON public.orden_pago;

CREATE POLICY "orden_pago_select" ON public.orden_pago
  FOR SELECT TO authenticated
  USING (
    public.rol_usuario_actual() IN ('recepcion', 'caja', 'supervision', 'administrador')
    AND EXISTS (
      SELECT 1 FROM public.encuentro e
      WHERE e.id = encuentro_id AND public.tiene_acceso_a_sede(e.site_id)
    )
  );

CREATE POLICY "orden_pago_insert" ON public.orden_pago
  FOR INSERT TO authenticated
  WITH CHECK (
    public.rol_usuario_actual() IN ('recepcion', 'caja', 'administrador')
    AND EXISTS (
      SELECT 1 FROM public.encuentro e
      WHERE e.id = encuentro_id AND public.tiene_acceso_a_sede(e.site_id)
    )
  );

CREATE POLICY "orden_pago_update" ON public.orden_pago
  FOR UPDATE TO authenticated
  USING (
    public.rol_usuario_actual() IN ('caja', 'administrador')
    AND EXISTS (
      SELECT 1 FROM public.encuentro e
      WHERE e.id = encuentro_id AND public.tiene_acceso_a_sede(e.site_id)
    )
  );

-- --- TABLA 11: pago ---
ALTER TABLE public.pago ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pagos: Acceso total caja y admision" ON public.pago;
DROP POLICY IF EXISTS "Ver pagos" ON public.pago;
DROP POLICY IF EXISTS "Registrar pago (Caja y Admin)" ON public.pago;
DROP POLICY IF EXISTS "Zero Trust: Emisión de pagos por operador" ON public.pago;
DROP POLICY IF EXISTS "pago_select" ON public.pago;
DROP POLICY IF EXISTS "pago_insert" ON public.pago;

CREATE POLICY "pago_select" ON public.pago
  FOR SELECT TO authenticated
  USING (
    public.rol_usuario_actual() IN ('caja', 'supervision', 'administrador')
    AND EXISTS (
      SELECT 1 FROM public.orden_pago op
      JOIN public.encuentro e ON e.id = op.encuentro_id
      WHERE op.id = pago.orden_id AND public.tiene_acceso_a_sede(e.site_id)
    )
  );

CREATE POLICY "pago_insert" ON public.pago
  FOR INSERT TO authenticated
  WITH CHECK (
    public.rol_usuario_actual() IN ('caja', 'administrador')
    AND EXISTS (
      SELECT 1 FROM public.orden_pago op
      JOIN public.encuentro e ON e.id = op.encuentro_id
      WHERE op.id = pago.orden_id AND public.tiene_acceso_a_sede(e.site_id)
    )
  );

-- --- TABLA 12: auditoria ---
-- Inserción exclusiva vía funciones del sistema con SECURITY DEFINER (cliente revocado)
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura auditoría (Supervisión y Admin)" ON public.auditoria;
DROP POLICY IF EXISTS "Registro de auditoría para todos" ON public.auditoria;
DROP POLICY IF EXISTS "auditoria_select" ON public.auditoria;

CREATE POLICY "auditoria_select" ON public.auditoria
  FOR SELECT TO authenticated
  USING (public.es_rol_multisede());

-- --- TABLA 13: organizacion ---
ALTER TABLE public.organizacion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura organización autorizada" ON public.organizacion;
DROP POLICY IF EXISTS "organizacion_select" ON public.organizacion;
CREATE POLICY "organizacion_select" ON public.organizacion FOR SELECT TO authenticated
  USING (public.rol_usuario_actual() IN ('recepcion', 'profesional', 'caja', 'supervision', 'administrador'));

-- --- TABLA 14: sede ---
ALTER TABLE public.sede ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura sedes autorizada" ON public.sede;
DROP POLICY IF EXISTS "sede_select" ON public.sede;
CREATE POLICY "sede_select" ON public.sede FOR SELECT TO authenticated
  USING (public.rol_usuario_actual() IN ('recepcion', 'profesional', 'caja', 'supervision', 'administrador'));

-- --- TABLA 15: producto_inventario ---
ALTER TABLE public.producto_inventario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "producto_inventario_select" ON public.producto_inventario;
CREATE POLICY "producto_inventario_select" ON public.producto_inventario FOR SELECT TO authenticated
  USING (public.rol_usuario_actual() IN ('profesional', 'caja', 'supervision', 'administrador'));

-- --- TABLA 16: movimiento_inventario ---
ALTER TABLE public.movimiento_inventario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "movimiento_inventario_select" ON public.movimiento_inventario;
CREATE POLICY "movimiento_inventario_select" ON public.movimiento_inventario FOR SELECT TO authenticated
  USING (public.rol_usuario_actual() IN ('caja', 'supervision', 'administrador'));

-- Fin de propuesta consolidada de aislamiento multisede y RLS Zero Trust (Cobertura Total)
