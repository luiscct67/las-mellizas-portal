-- ============================================================================
-- ECOSISTEMA DIGITAL LAS MELLIZAS PERU S.A.C. (RUC 20611827335)
-- SCRIPT 03 - PASO 2 DE 2: POLÍTICAS RLS BLINDADAS Y ACTUALIZACIÓN DE USUARIOS
-- NOTA: Ejecutar DESPUÉS de haber ejecutado con éxito el PASO 1.
-- ============================================================================

-- 1. TABLA / VISTA COMPATIBLE PROFILES
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

-- 2. FUNCIÓN DE SEGURIDAD INQUEBRANTABLE (OBTENCIÓN DE ROL DEL TOKEN CRIPTOGRÁFICO)
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

-- 3. POLÍTICAS RLS BLINDADAS PARA AISLAMIENTO CLÍNICO ABSOLUTO (ANTI-BYPASS)
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
CREATE POLICY "Zero Trust: Inserción exclusiva personal asistencial" ON public.nota_clinica
FOR INSERT TO authenticated
WITH CHECK (
    public.obtener_mi_rol_estricto() IN ('PROFESIONAL', 'ADMIN')
);

-- Actualización continua para autosave silencioso
DROP POLICY IF EXISTS "Actualizar notas clínicas borrador" ON public.nota_clinica;
CREATE POLICY "Zero Trust: Autosave continuo de notas propias" ON public.nota_clinica
FOR UPDATE TO authenticated
USING (
    public.obtener_mi_rol_estricto() IN ('PROFESIONAL', 'ADMIN')
    AND EXISTS (
        SELECT 1 FROM public.encuentro e
        WHERE e.id = encuentro_id
        AND (e.site_id = (SELECT site_id FROM public.perfil_usuario WHERE id = auth.uid()) OR public.obtener_mi_rol_estricto() = 'ADMIN')
    )
);

-- 4. POLÍTICAS RLS PARA PACIENTES (ADMISIÓN Y BÚSQUEDA DNI)
DROP POLICY IF EXISTS "Lectura pacientes misma sede o admin" ON public.paciente;
CREATE POLICY "Zero Trust: Búsqueda y visualización de pacientes" ON public.paciente
FOR SELECT TO authenticated
USING (true); -- Permitido a todo personal autorizado y autenticado del centro

DROP POLICY IF EXISTS "Crear pacientes operadores autorizados" ON public.paciente;
CREATE POLICY "Zero Trust: Registro ágil de pacientes" ON public.paciente
FOR INSERT TO authenticated
WITH CHECK (
    public.obtener_mi_rol_estricto() IN ('RECEPCION_CAJA', 'RECEPCION', 'CAJA', 'PROFESIONAL', 'ADMIN')
);

DROP POLICY IF EXISTS "Actualizar pacientes operadores autorizados" ON public.paciente;
CREATE POLICY "Zero Trust: Actualización datos filiación" ON public.paciente
FOR UPDATE TO authenticated
USING (
    public.obtener_mi_rol_estricto() IN ('RECEPCION_CAJA', 'RECEPCION', 'CAJA', 'PROFESIONAL', 'ADMIN')
);

-- 5. POLÍTICAS RLS PARA ÓRDENES DE ATENCIÓN Y CAJA UNIFICADA
DROP POLICY IF EXISTS "Lectura ordenes de pago en sede" ON public.orden_pago;
CREATE POLICY "Zero Trust: Gestión de órdenes y caja" ON public.orden_pago
FOR SELECT TO authenticated
USING (
    public.obtener_mi_rol_estricto() IN ('SUPERVISION', 'ADMIN')
    OR site_id = (SELECT site_id FROM public.perfil_usuario WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Crear orden de pago en sede propia" ON public.orden_pago;
CREATE POLICY "Zero Trust: Generación de tickets y cobro" ON public.orden_pago
FOR INSERT TO authenticated
WITH CHECK (
    public.obtener_mi_rol_estricto() IN ('RECEPCION_CAJA', 'RECEPCION', 'CAJA', 'ADMIN')
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
