-- ============================================================================
-- ECOSISTEMA DIGITAL LAS MELLIZAS PERU S.A.C. (RUC 20611827335)
-- SCRIPT 08: PURGA DE CUENTAS OBSOLETAS Y GESTIÓN DE BAJA DEFINITIVA (ADMIN)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. FUNCIÓN DE ELIMINACIÓN REAL Y SEGURA DE USUARIOS (RPC)
-- Permite que el Administrador General elimine colaboradores de forma definitiva
-- tanto de public.perfil_usuario como de auth.users sin dejar rastro ni residuos.
CREATE OR REPLACE FUNCTION public.eliminar_usuario_clinico(
    p_id UUID DEFAULT NULL,
    p_email TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_target_id UUID := p_id;
    v_target_email TEXT := LOWER(TRIM(p_email));
BEGIN
    -- Proteger la cuenta principal del Administrador General
    IF v_target_email = 'admin@lasmellizasperu.com' THEN
        RAISE EXCEPTION 'Operación denegada: No es posible eliminar la cuenta principal de Administración General.';
    END IF;

    -- Si no se proporcionó UUID, buscarlo por correo en perfil_usuario o auth.users
    IF v_target_id IS NULL AND v_target_email IS NOT NULL THEN
        SELECT id INTO v_target_id FROM public.perfil_usuario WHERE email = v_target_email LIMIT 1;
        IF v_target_id IS NULL THEN
            SELECT id INTO v_target_id FROM auth.users WHERE email = v_target_email LIMIT 1;
        END IF;
    END IF;

    -- Eliminar referencias en perfil_usuario y auth.users
    IF v_target_id IS NOT NULL THEN
        -- Desvincular de citas y registros históricos sin romper integridad referencial
        UPDATE public.cita_reagendada SET profesional_id = NULL WHERE profesional_id = v_target_id;
        
        -- Eliminar de perfil_usuario
        DELETE FROM public.perfil_usuario WHERE id = v_target_id;
        
        -- Eliminar de auth.users
        DELETE FROM auth.users WHERE id = v_target_id;
    END IF;

    -- Limpieza complementaria por email si quedara algún registro huérfano
    IF v_target_email IS NOT NULL THEN
        DELETE FROM public.perfil_usuario WHERE email = v_target_email;
        DELETE FROM auth.users WHERE email = v_target_email;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permisos de ejecución
GRANT EXECUTE ON FUNCTION public.eliminar_usuario_clinico TO authenticated, service_role;

-- 2. POLÍTICA RLS PARA BORRADO DIRECTO POR PARTE DEL ADMINISTRADOR GENERAL
DROP POLICY IF EXISTS "Admin elimina perfiles colaboradores" ON public.perfil_usuario;
CREATE POLICY "Admin elimina perfiles colaboradores" ON public.perfil_usuario
FOR DELETE TO authenticated
USING (
    public.obtener_mi_rol_estricto() = 'ADMIN'
    AND email <> 'admin@lasmellizasperu.com'
);

-- 3. PURGA INMEDIATA DE LAS 4 CUENTAS OBSOLETAS SOLICITADAS POR LA DIRECCIÓN
-- Lucía Mendoza Quispe (admision.ind@lasmellizasperu.com)
-- Dr. Carlos Benavides Velarde (medico.ind@lasmellizasperu.com)
-- Marilú Quispe Paucar (admision.viv@lasmellizasperu.com)
-- Lic. Sonia Rivas Alarcón (obstetra.viv@lasmellizasperu.com)
DO $$
BEGIN
    PERFORM public.eliminar_usuario_clinico(NULL, 'admision.ind@lasmellizasperu.com');
    PERFORM public.eliminar_usuario_clinico(NULL, 'medico.ind@lasmellizasperu.com');
    PERFORM public.eliminar_usuario_clinico(NULL, 'admision.viv@lasmellizasperu.com');
    PERFORM public.eliminar_usuario_clinico(NULL, 'obstetra.viv@lasmellizasperu.com');
    
    RAISE NOTICE 'Script 08 ejecutado con éxito: Cuentas obsoletas purgadas y función de baja definitiva operativa.';
END $$;
