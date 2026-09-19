-- ============================================================================
-- ECOSISTEMA DIGITAL LAS MELLIZAS PERU S.A.C. (RUC 20611827335)
-- SCRIPT 11: CORRECCIÓN DEFINITIVA DE EDICIÓN DE COLABORADORES & RLS ADMIN
-- ============================================================================

-- 1. ELIMINAR CUALQUIER VERSIÓN PREVIA SOBRECARGADA DE actualizar_perfil_colaborador
DROP FUNCTION IF EXISTS public.actualizar_perfil_colaborador(UUID, TEXT, public.rol_usuario, UUID, TEXT, TEXT, BOOLEAN, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.actualizar_perfil_colaborador(UUID, TEXT, public.rol_usuario, UUID, TEXT, TEXT, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS public.actualizar_perfil_colaborador(UUID, TEXT, public.rol_usuario, UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.actualizar_perfil_colaborador(UUID, TEXT, public.rol_usuario, UUID) CASCADE;

-- 2. FUNCIÓN RPC UNIFICADA Y SEGURA (SECURITY DEFINER)
-- Actualiza datos en perfil_usuario y sincroniza auth.users
CREATE OR REPLACE FUNCTION public.actualizar_perfil_colaborador(
    p_id UUID,
    p_nombre TEXT,
    p_rol public.rol_usuario,
    p_site_id UUID DEFAULT NULL,
    p_colegiatura TEXT DEFAULT NULL,
    p_especialidad TEXT DEFAULT NULL,
    p_activo BOOLEAN DEFAULT true,
    p_email TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_clean_email TEXT := LOWER(TRIM(p_email));
    v_clean_nombre TEXT := TRIM(p_nombre);
    v_operador_email TEXT;
    v_old_email TEXT;
    v_conflict_id UUID;
BEGIN
    -- Verificar si existe el perfil objetivo
    SELECT email INTO v_old_email FROM public.perfil_usuario WHERE id = p_id;
    IF v_old_email IS NULL THEN
        -- Intentar resolver por email si el id no coincidió
        IF v_clean_email IS NOT NULL THEN
            SELECT id INTO p_id FROM public.perfil_usuario WHERE email = v_clean_email LIMIT 1;
        END IF;
        
        IF p_id IS NULL THEN
            RAISE EXCEPTION 'Colaborador no encontrado en la base de datos (ID: %)', p_id;
        END IF;
    END IF;

    -- Validar que el nuevo correo no pertenezca a OTRO usuario diferente
    IF v_clean_email IS NOT NULL THEN
        SELECT id INTO v_conflict_id 
        FROM public.perfil_usuario 
        WHERE email = v_clean_email AND id <> p_id 
        LIMIT 1;

        IF v_conflict_id IS NOT NULL THEN
            RAISE EXCEPTION 'El correo % ya se encuentra asignado a otro colaborador.', v_clean_email;
        END IF;
    END IF;

    -- 1. Actualizar perfil_usuario
    UPDATE public.perfil_usuario
    SET email = COALESCE(v_clean_email, email),
        nombre_completo = v_clean_nombre,
        rol = p_rol,
        site_id = p_site_id,
        colegiatura = NULLIF(TRIM(p_colegiatura), ''),
        especialidad = NULLIF(TRIM(p_especialidad), ''),
        activo = p_activo,
        updated_at = now()
    WHERE id = p_id;

    -- 2. Sincronizar en auth.users
    IF v_clean_email IS NOT NULL THEN
        UPDATE auth.users
        SET email = v_clean_email,
            raw_user_meta_data = jsonb_build_object(
                'nombre_completo', v_clean_nombre,
                'rol', p_rol::text
            ),
            updated_at = now()
        WHERE id = p_id;
    ELSE
        UPDATE auth.users
        SET raw_user_meta_data = jsonb_build_object(
                'nombre_completo', v_clean_nombre,
                'rol', p_rol::text
            ),
            updated_at = now()
        WHERE id = p_id;
    END IF;

    -- 3. Asentar traza inmutable en auditoria
    SELECT email INTO v_operador_email FROM auth.users WHERE id = auth.uid();
    INSERT INTO public.auditoria (
        usuario_id,
        site_id,
        accion,
        entidad,
        entidad_id,
        detalle
    ) VALUES (
        auth.uid(),
        p_site_id,
        'MODIFICAR_COLABORADOR',
        'perfil_usuario',
        p_id::text,
        jsonb_build_object(
            'colaborador', v_clean_nombre,
            'email', COALESCE(v_clean_email, v_old_email),
            'rol', p_rol::text,
            'activo', p_activo,
            'operador', COALESCE(v_operador_email, 'admin@lasmellizasperu.com')
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'id', p_id,
        'email', COALESCE(v_clean_email, v_old_email),
        'nombre', v_clean_nombre
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.actualizar_perfil_colaborador(UUID, TEXT, public.rol_usuario, UUID, TEXT, TEXT, BOOLEAN, TEXT) TO authenticated, service_role;

-- 3. POLÍTICAS RLS DESBLOQUEADAS PARA EDICIÓN DE PERFILES POR ADMINISTRACIÓN
DROP POLICY IF EXISTS "Auto-actualización perfil propio" ON public.perfil_usuario;
DROP POLICY IF EXISTS "Admin actualiza perfiles colaboradores" ON public.perfil_usuario;
DROP POLICY IF EXISTS "Admin gestiona perfiles colaboradores" ON public.perfil_usuario;
DROP POLICY IF EXISTS "Admin y usuarios gestionan perfiles" ON public.perfil_usuario;

CREATE POLICY "Admin y usuarios gestionan perfiles" ON public.perfil_usuario
FOR UPDATE TO authenticated
USING (
    public.obtener_mi_rol_estricto() = 'ADMIN'
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'admin@lasmellizasperu.com'
    OR id = auth.uid()
)
WITH CHECK (
    public.obtener_mi_rol_estricto() = 'ADMIN'
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'admin@lasmellizasperu.com'
    OR id = auth.uid()
);

-- Habilitar lectura para todos los autenticados
DROP POLICY IF EXISTS "Lectura perfiles" ON public.perfil_usuario;
CREATE POLICY "Lectura perfiles" ON public.perfil_usuario
FOR SELECT TO authenticated
USING (true);
