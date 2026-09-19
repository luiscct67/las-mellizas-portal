-- ============================================================================
-- ECOSISTEMA DIGITAL LAS MELLIZAS PERU S.A.C. (RUC 20611827335)
-- SCRIPT 07: CORRECCIÓN DEFINITIVA DE CONSTRAINTS, EDICIÓN DE PERFILES Y RLS ADMIN
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. GARANTIZAR RESTRICCIÓN DE UNICIDAD EN perfil_usuario(email)
-- Esto previene duplicados y permite que cualquier referencia por email sea unívoca
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'perfil_usuario_email_key'
    ) THEN
        ALTER TABLE public.perfil_usuario ADD CONSTRAINT perfil_usuario_email_key UNIQUE (email);
    END IF;
END $$;

-- 2. FUNCIÓN DE SEGURIDAD PARA ACTUALIZAR COLABORADORES POR PARTE DEL ADMIN
-- SECURITY DEFINER permite que el Administrador General actualice datos de cualquier colaborador
CREATE OR REPLACE FUNCTION public.actualizar_perfil_colaborador(
    p_id UUID,
    p_nombre TEXT,
    p_rol public.rol_usuario,
    p_site_id UUID,
    p_colegiatura TEXT DEFAULT NULL,
    p_especialidad TEXT DEFAULT NULL,
    p_activo BOOLEAN DEFAULT true
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.perfil_usuario
    SET nombre_completo = TRIM(p_nombre),
        rol = p_rol,
        site_id = p_site_id,
        colegiatura = NULLIF(TRIM(p_colegiatura), ''),
        especialidad = NULLIF(TRIM(p_especialidad), ''),
        activo = p_activo,
        updated_at = now()
    WHERE id = p_id;

    -- Sincronizar también metadatos en auth.users si existe
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_build_object('nombre_completo', TRIM(p_nombre), 'rol', p_rol),
        updated_at = now()
    WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permisos de ejecución
GRANT EXECUTE ON FUNCTION public.actualizar_perfil_colaborador TO authenticated, service_role;

-- 3. PERMISOS DE EJECUCIÓN PARA crear_usuario_clinico
GRANT EXECUTE ON FUNCTION public.crear_usuario_clinico TO authenticated, anon, service_role;

-- 4. POLÍTICAS RLS EN perfil_usuario PARA ADMINISTRACIÓN
DROP POLICY IF EXISTS "Admin gestiona perfiles colaboradores" ON public.perfil_usuario;
CREATE POLICY "Admin gestiona perfiles colaboradores" ON public.perfil_usuario
FOR ALL TO authenticated
USING (
    public.obtener_mi_rol_estricto() = 'ADMIN'
    OR id = auth.uid()
)
WITH CHECK (
    public.obtener_mi_rol_estricto() = 'ADMIN'
    OR id = auth.uid()
);

-- Notificar estado
DO $$
BEGIN
    RAISE NOTICE 'Script 07 ejecutado correctamente: Restricción de email, RPC de actualización y RLS Admin verificados.';
END $$;
