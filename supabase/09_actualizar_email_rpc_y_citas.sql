-- ============================================================================
-- ECOSISTEMA DIGITAL LAS MELLIZAS PERU S.A.C. (RUC 20611827335)
-- SCRIPT 09: ACTUALIZACION DE CORREOS EN RPC Y CORRECCION DE CUENTAS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. CORRECCION INMEDIATA DEL TYPO EN BASE DE DATOS (medici.inv1 -> medico.inv1)
DO $$
DECLARE
    v_target_id UUID;
BEGIN
    SELECT id INTO v_target_id FROM public.perfil_usuario WHERE email = 'medici.inv1@lasmellizasperu.com' LIMIT 1;
    
    IF v_target_id IS NOT NULL THEN
        -- Actualizar en perfil_usuario
        UPDATE public.perfil_usuario 
        SET email = 'medico.inv1@lasmellizasperu.com',
            updated_at = now()
        WHERE id = v_target_id;

        -- Actualizar en auth.users
        UPDATE auth.users 
        SET email = 'medico.inv1@lasmellizasperu.com',
            updated_at = now()
        WHERE id = v_target_id;

        RAISE NOTICE 'Cuenta corregida exitosamente de medici.inv1 a medico.inv1';
    END IF;
END $$;

-- 2. ELIMINAR CUALQUIER VERSIÓN PREVIA SOBRECARGADA PARA RESOLVER ERROR 42725
DROP FUNCTION IF EXISTS public.actualizar_perfil_colaborador(UUID, TEXT, public.rol_usuario, UUID, TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS public.actualizar_perfil_colaborador(UUID, TEXT, public.rol_usuario, UUID, TEXT, TEXT, BOOLEAN, TEXT);

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT oid::regprocedure AS func_sig
        FROM pg_proc
        WHERE proname = 'actualizar_perfil_colaborador'
          AND pronamespace = 'public'::regnamespace
    ) LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_sig || ' CASCADE';
    END LOOP;
END $$;

-- 3. FUNCION RPC MEJORADA CON SOPORTE COMPLETO DE MODIFICACION DE EMAIL
CREATE OR REPLACE FUNCTION public.actualizar_perfil_colaborador(
    p_id UUID,
    p_nombre TEXT,
    p_rol public.rol_usuario,
    p_site_id UUID,
    p_colegiatura TEXT DEFAULT NULL,
    p_especialidad TEXT DEFAULT NULL,
    p_activo BOOLEAN DEFAULT true,
    p_email TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_clean_email TEXT := LOWER(TRIM(p_email));
BEGIN
    -- 1. Actualizar tabla publica de perfiles
    UPDATE public.perfil_usuario
    SET email = COALESCE(v_clean_email, email),
        nombre_completo = TRIM(p_nombre),
        rol = p_rol,
        site_id = p_site_id,
        colegiatura = NULLIF(TRIM(p_colegiatura), ''),
        especialidad = NULLIF(TRIM(p_especialidad), ''),
        activo = p_activo,
        updated_at = now()
    WHERE id = p_id;

    -- 2. Sincronizar en auth.users si se modifico el email o metadatos
    IF v_clean_email IS NOT NULL THEN
        UPDATE auth.users
        SET email = v_clean_email,
            raw_user_meta_data = jsonb_build_object(
                'nombre_completo', TRIM(p_nombre),
                'rol', p_rol::text
            ),
            updated_at = now()
        WHERE id = p_id;
    ELSE
        UPDATE auth.users
        SET raw_user_meta_data = jsonb_build_object(
                'nombre_completo', TRIM(p_nombre),
                'rol', p_rol::text
            ),
            updated_at = now()
        WHERE id = p_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.actualizar_perfil_colaborador(UUID, TEXT, public.rol_usuario, UUID, TEXT, TEXT, BOOLEAN, TEXT) TO authenticated, service_role;

-- 4. POLITICAS RLS EN perfil_usuario PARA EDICION DIRECTA POR ADMIN
DROP POLICY IF EXISTS "Admin actualiza perfiles colaboradores" ON public.perfil_usuario;
CREATE POLICY "Admin actualiza perfiles colaboradores" ON public.perfil_usuario
FOR UPDATE TO authenticated
USING (
    public.obtener_mi_rol_estricto() = 'ADMIN'
    OR id = auth.uid()
)
WITH CHECK (
    public.obtener_mi_rol_estricto() = 'ADMIN'
    OR id = auth.uid()
);

-- 5. VERIFICACION DE PERMISOS EN TABLA cita_reagendada
GRANT SELECT, INSERT, UPDATE ON public.cita_reagendada TO authenticated, service_role;

DO $$
BEGIN
    RAISE NOTICE 'Script 09 ejecutado con exito: Sobrecargas eliminadas, RPC con soporte de email y correccion aplicada.';
END $$;
