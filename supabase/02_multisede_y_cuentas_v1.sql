-- ============================================================================
-- ECOSISTEMA DIGITAL LAS MELLIZAS PERU S.A.C. (RUC 20611827335)
-- SCRIPT DE AISLAMIENTO MULTISEDE Y CUENTAS INSTITUCIONALES (POSTGRESQL 15+)
-- APLICAR EN SUPABASE -> SQL EDITOR TRAS EJECUTAR 01_schema_supabase_v1.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ACTUALIZACIÓN DE TABLA PERFIL_USUARIO (CAMPOS PROFESIONALES MINSA)
-- ----------------------------------------------------------------------------
ALTER TABLE public.perfil_usuario 
ADD COLUMN IF NOT EXISTS colegiatura TEXT,
ADD COLUMN IF NOT EXISTS especialidad TEXT;

COMMENT ON COLUMN public.perfil_usuario.colegiatura IS 'Número de colegiatura CMP o COP obligatorio según NTS N° 139-MINSA';
COMMENT ON COLUMN public.perfil_usuario.especialidad IS 'Especialidad médica o rama obstétrica certificada';

-- ----------------------------------------------------------------------------
-- 2. FUNCIÓN DE AYUDA: OBTENER SEDE DEL USUARIO EN SESIÓN
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.obtener_mi_site_id()
RETURNS UUID AS $$
    SELECT site_id FROM public.perfil_usuario WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 3. POLÍTICAS RLS CON AISLAMIENTO ESTRICTO MULTISEDE
-- ----------------------------------------------------------------------------

-- POLÍTICAS: ENCUENTROS / ATENCIONES (AISLAMIENTO MULTISEDE)
-- Una recepcionista, médico o cajera de Independencia solo ve encuentros de Independencia.
-- Supervisión y Admin pueden ver consolidado de ambas sedes.
DROP POLICY IF EXISTS "Ver encuentros" ON public.encuentro;
CREATE POLICY "Ver encuentros multisede" ON public.encuentro FOR SELECT TO authenticated
USING (
    public.obtener_mi_rol() IN ('SUPERVISION', 'ADMIN') 
    OR site_id = public.obtener_mi_site_id()
);

DROP POLICY IF EXISTS "Crear encuentro" ON public.encuentro;
CREATE POLICY "Crear encuentro en sede propia" ON public.encuentro FOR INSERT TO authenticated
WITH CHECK (
    (public.obtener_mi_rol() = 'RECEPCION' AND site_id = public.obtener_mi_site_id())
    OR public.obtener_mi_rol() = 'ADMIN'
);

DROP POLICY IF EXISTS "Actualizar encuentro" ON public.encuentro;
CREATE POLICY "Actualizar encuentro en sede propia" ON public.encuentro FOR UPDATE TO authenticated
USING (
    (public.obtener_mi_rol() IN ('RECEPCION', 'PROFESIONAL') AND site_id = public.obtener_mi_site_id())
    OR public.obtener_mi_rol() = 'ADMIN'
);

-- POLÍTICAS: ÓRDENES DE PAGO (CAJA MULTISEDE)
-- El cajero de Vivanco no puede ver ni liquidar órdenes emitidas en Independencia.
ALTER TABLE public.orden_pago ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES public.sede(id);

DROP POLICY IF EXISTS "Ver órdenes de pago" ON public.orden_pago;
CREATE POLICY "Ver órdenes de pago por sede" ON public.orden_pago FOR SELECT TO authenticated
USING (
    public.obtener_mi_rol() IN ('SUPERVISION', 'ADMIN')
    OR site_id = public.obtener_mi_site_id()
    OR site_id IS NULL -- Para órdenes históricas migadas
);

DROP POLICY IF EXISTS "Crear órdenes de pago" ON public.orden_pago;
CREATE POLICY "Crear órdenes de pago por sede" ON public.orden_pago FOR INSERT TO authenticated
WITH CHECK (
    (public.obtener_mi_rol() IN ('RECEPCION', 'CAJA') AND (site_id = public.obtener_mi_site_id() OR site_id IS NULL))
    OR public.obtener_mi_rol() = 'ADMIN'
);

DROP POLICY IF EXISTS "Actualizar órdenes de pago" ON public.orden_pago;
CREATE POLICY "Cobrar orden en sede propia" ON public.orden_pago FOR UPDATE TO authenticated
USING (
    (public.obtener_mi_rol() = 'CAJA' AND (site_id = public.obtener_mi_site_id() OR site_id IS NULL))
    OR public.obtener_mi_rol() = 'ADMIN'
);

-- POLÍTICAS: NOTAS CLÍNICAS (AISLAMIENTO CLÍNICO + MULTISEDE)
DROP POLICY IF EXISTS "Lectura médica de notas clínicas" ON public.nota_clinica;
CREATE POLICY "Lectura médica de notas clínicas por sede y acto médico" ON public.nota_clinica FOR SELECT TO authenticated
USING (
    public.obtener_mi_rol() IN ('SUPERVISION', 'ADMIN')
    OR (
        public.obtener_mi_rol() = 'PROFESIONAL'
        AND EXISTS (
            SELECT 1 FROM public.encuentro e 
            WHERE e.id = encuentro_id 
            AND e.site_id = public.obtener_mi_site_id()
        )
    )
);

-- ----------------------------------------------------------------------------
-- 4. TRIGGER INTELIGENTE PARA VINCULACIÓN AUTOMÁTICA DE PERFILES
-- Cada vez que creas un usuario en Supabase Auth, se asigna su rol y sede
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_crear_perfil_nuevo_usuario()
RETURNS TRIGGER AS $$
DECLARE
    v_site_id UUID;
    v_rol public.rol_usuario;
    v_nombre TEXT;
    v_colegiatura TEXT;
    v_especialidad TEXT;
BEGIN
    -- Sede Independencia: b0000000-0000-0000-0000-000000000001
    -- Sede Vivanco:       b0000000-0000-0000-0000-000000000002
    IF NEW.email ILIKE '%viv%' THEN
        v_site_id := 'b0000000-0000-0000-0000-000000000002'::uuid;
    ELSE
        v_site_id := 'b0000000-0000-0000-0000-000000000001'::uuid;
    END IF;

    -- Detección de Rol según correo o metadata
    IF NEW.email ILIKE '%recepcion%' THEN
        v_rol := 'RECEPCION';
        v_nombre := 'Admisión ' || CASE WHEN NEW.email ILIKE '%viv%' THEN 'Vivanco' ELSE 'Independencia' END;
    ELSIF NEW.email ILIKE '%medico%' OR NEW.email ILIKE '%obstetra%' OR NEW.email ILIKE '%hce%' THEN
        v_rol := 'PROFESIONAL';
        IF NEW.email ILIKE '%viv%' THEN
            v_nombre := 'Lic. Sonia Rivas Alarcón';
            v_colegiatura := 'COP 12890';
            v_especialidad := 'Obstetricia Integral';
        ELSE
            v_nombre := 'Dr. Carlos Benavides Velarde';
            v_colegiatura := 'CMP 54321 / RNE 23456';
            v_especialidad := 'Ginecología y Obstetricia';
        END IF;
    ELSIF NEW.email ILIKE '%caja%' THEN
        v_rol := 'CAJA';
        v_nombre := 'Caja & Cobranzas ' || CASE WHEN NEW.email ILIKE '%viv%' THEN 'Vivanco' ELSE 'Independencia' END;
    ELSIF NEW.email ILIKE '%supervision%' OR NEW.email ILIKE '%auditor%' THEN
        v_rol := 'SUPERVISION';
        v_nombre := 'Auditoría Médica y Financiera Red';
        v_site_id := NULL; -- Acceso multisede
    ELSE
        v_rol := 'ADMIN';
        v_nombre := 'Dirección General';
        v_site_id := NULL; -- Acceso multisede
    END IF;

    -- Sobrescribir con metadata si fue provista en el registro
    IF NEW.raw_user_meta_data->>'rol' IS NOT NULL THEN
        v_rol := (NEW.raw_user_meta_data->>'rol')::public.rol_usuario;
    END IF;
    IF NEW.raw_user_meta_data->>'nombre_completo' IS NOT NULL THEN
        v_nombre := NEW.raw_user_meta_data->>'nombre_completo';
    END IF;

    INSERT INTO public.perfil_usuario (id, email, nombre_completo, rol, site_id, colegiatura, especialidad, activo)
    VALUES (NEW.id, NEW.email, v_nombre, v_rol, v_site_id, v_colegiatura, v_especialidad, true)
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        nombre_completo = EXCLUDED.nombre_completo,
        rol = EXCLUDED.rol,
        site_id = EXCLUDED.site_id,
        colegiatura = EXCLUDED.colegiatura,
        especialidad = EXCLUDED.especialidad,
        updated_at = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auth_crear_perfil ON auth.users;
CREATE TRIGGER trg_auth_crear_perfil
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.f_crear_perfil_nuevo_usuario();
