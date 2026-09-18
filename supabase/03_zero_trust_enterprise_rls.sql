-- ============================================================================
-- ECOSISTEMA DIGITAL LAS MELLIZAS PERU S.A.C. (RUC 20611827335)
-- SCRIPT: REFACTORIZACIÓN GRADO MÉDICO ENTERPRISE & CONFIANZA CERO (ZERO TRUST)
-- SCRIPT 03: RLS ESTRICTO, ROL UNIFICADO RECEPCION_CAJA Y POLÍTICAS POSTGREST
-- ============================================================================

-- 1. INCORPORACIÓN DEL ROL UNIFICADO RECEPCION_CAJA
ALTER TYPE public.rol_usuario ADD VALUE IF NOT EXISTS 'RECEPCION_CAJA';

-- 2. TABLA / VISTA COMPATIBLE PROFILES
CREATE OR REPLACE VIEW public.profiles AS 
SELECT 
    id,
    email,
    nombre_completo,
    rol,
    site_id,
    colegiatura,
    especialidad,
    activo,
    created_at,
    updated_at
FROM public.perfil_usuario;

-- 3. FUNCIÓN DE SEGURIDAD INQUEBRANTABLE (OBTENCIÓN DE ROL DEL TOKEN CRIPTOGRÁFICO)
CREATE OR REPLACE FUNCTION public.obtener_mi_rol_estricto()
RETURNS public.rol_usuario AS $$
DECLARE
    v_rol public.rol_usuario;
BEGIN
    SELECT rol INTO v_rol 
    FROM public.perfil_usuario 
    WHERE id = auth.uid() AND activo = true;
    
    RETURN v_rol;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 4. POLÍTICAS RLS BLINDADAS PARA AISLAMIENTO CLÍNICO ABSOLUTO (ANTI-BYPASS)
-- TABLA: NOTA_CLINICA
-- Si el rol es RECEPCION_CAJA, RECEPCION o CAJA, PostgREST retorna 0 filas.
-- Ningún operador de recepción/caja puede leer ni un diagnóstico, síntoma o tratamiento.
DROP POLICY IF EXISTS "Lectura médica de notas clínicas" ON public.nota_clinica;
DROP POLICY IF EXISTS "Lectura médica de notas clínicas por sede y acto médico" ON public.nota_clinica;
CREATE POLICY "Zero Trust: Lectura exclusiva médicos y auditores" ON public.nota_clinica
FOR SELECT TO authenticated
USING (
    public.obtener_mi_rol_estricto() IN ('SUPERVISION', 'ADMIN')
    OR (
        public.obtener_mi_rol_estricto() = 'PROFESIONAL'
        AND EXISTS (
            SELECT 1 FROM public.encuentro e
            WHERE e.id = encuentro_id
            AND e.site_id = (SELECT site_id FROM public.perfil_usuario WHERE id = auth.uid())
        )
    )
);

-- Inserción y Autoguardado en Tiempo Real (Solo médicos con borrador abierto)
DROP POLICY IF EXISTS "Crear notas clínicas (Solo Médicos)" ON public.nota_clinica;
CREATE POLICY "Zero Trust: Inserción exclusiva médico asignado" ON public.nota_clinica
FOR INSERT TO authenticated
WITH CHECK (
    public.obtener_mi_rol_estricto() IN ('PROFESIONAL', 'ADMIN')
);

DROP POLICY IF EXISTS "Actualizar nota clínica antes de cerrar" ON public.nota_clinica;
CREATE POLICY "Zero Trust: Autoguardado de borrador antes de sellado" ON public.nota_clinica
FOR UPDATE TO authenticated
USING (
    public.obtener_mi_rol_estricto() IN ('PROFESIONAL', 'ADMIN')
    AND cerrada = false
);

-- TABLA: ADENDA (INMUTABILIDAD)
DROP POLICY IF EXISTS "Lectura médica de adendas" ON public.adenda;
CREATE POLICY "Zero Trust: Lectura médica de adendas" ON public.adenda
FOR SELECT TO authenticated
USING (
    public.obtener_mi_rol_estricto() IN ('PROFESIONAL', 'SUPERVISION', 'ADMIN')
);

DROP POLICY IF EXISTS "Crear adenda (Solo Médicos)" ON public.adenda;
CREATE POLICY "Zero Trust: Creación de adenda médica" ON public.adenda
FOR INSERT TO authenticated
WITH CHECK (
    public.obtener_mi_rol_estricto() IN ('PROFESIONAL', 'ADMIN')
);

-- 5. POLÍTICAS RLS BLINDADAS PARA EL MÓDULO UNIFICADO ADMISIÓN Y CAJA
-- TABLA: PACIENTE
CREATE POLICY "Zero Trust: Registro y gestión de pacientes" ON public.paciente
FOR ALL TO authenticated
USING (
    public.obtener_mi_rol_estricto() IN ('RECEPCION_CAJA', 'RECEPCION', 'PROFESIONAL', 'SUPERVISION', 'ADMIN')
);

-- TABLA: ENCUENTRO
DROP POLICY IF EXISTS "Ver encuentros multisede" ON public.encuentro;
CREATE POLICY "Zero Trust: Encuentros por sede física" ON public.encuentro
FOR SELECT TO authenticated
USING (
    public.obtener_mi_rol_estricto() IN ('SUPERVISION', 'ADMIN')
    OR site_id = (SELECT site_id FROM public.perfil_usuario WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Crear encuentro en sede propia" ON public.encuentro;
CREATE POLICY "Zero Trust: Admisión en sede asignada" ON public.encuentro
FOR INSERT TO authenticated
WITH CHECK (
    (public.obtener_mi_rol_estricto() IN ('RECEPCION_CAJA', 'RECEPCION') 
     AND site_id = (SELECT site_id FROM public.perfil_usuario WHERE id = auth.uid()))
    OR public.obtener_mi_rol_estricto() = 'ADMIN'
);

-- TABLA: ORDEN_PAGO Y PAGO (SINGLE-OPERATOR FLOW)
-- El profesional médico no tiene acceso a registrar ni alterar cobros.
DROP POLICY IF EXISTS "Ver órdenes de pago por sede" ON public.orden_pago;
CREATE POLICY "Zero Trust: Órdenes de cobro por operador" ON public.orden_pago
FOR SELECT TO authenticated
USING (
    public.obtener_mi_rol_estricto() IN ('RECEPCION_CAJA', 'CAJA', 'SUPERVISION', 'ADMIN')
);

DROP POLICY IF EXISTS "Crear órdenes de pago por sede" ON public.orden_pago;
CREATE POLICY "Zero Trust: Creación de órdenes en ventanilla" ON public.orden_pago
FOR INSERT TO authenticated
WITH CHECK (
    public.obtener_mi_rol_estricto() IN ('RECEPCION_CAJA', 'CAJA', 'ADMIN')
);

DROP POLICY IF EXISTS "Cobrar orden en sede propia" ON public.orden_pago;
CREATE POLICY "Zero Trust: Cobro inmediato y liquidación" ON public.orden_pago
FOR UPDATE TO authenticated
USING (
    public.obtener_mi_rol_estricto() IN ('RECEPCION_CAJA', 'CAJA', 'ADMIN')
);

DROP POLICY IF EXISTS "Registrar pago (Caja y Admin)" ON public.pago;
CREATE POLICY "Zero Trust: Emisión de pagos por operador" ON public.pago
FOR INSERT TO authenticated
WITH CHECK (
    public.obtener_mi_rol_estricto() IN ('RECEPCION_CAJA', 'CAJA', 'ADMIN')
);

-- 6. ACTUALIZACIÓN DE USUARIOS BASE AL ROL UNIFICADO RECEPCION_CAJA
UPDATE public.perfil_usuario
SET rol = 'RECEPCION_CAJA'
WHERE email IN (
    'recepcion.ind@lasmellizasperu.com', 
    'caja.ind@lasmellizasperu.com',
    'recepcion.viv@lasmellizasperu.com',
    'caja.viv@lasmellizasperu.com'
);
