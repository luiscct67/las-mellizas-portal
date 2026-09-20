-- ==============================================================================
-- SCRIPT 14: ACTUALIZACIÓN DE CITAS REAGENDADAS, ENUM ENCUENTRO Y RLS
-- Entorno: Consultorio Obstétrico Ecográfico Las Mellizas
-- ==============================================================================

-- 1. Intentar agregar 'REPROGRAMADO' al tipo enum estado_encuentro si no existe
DO $$ 
BEGIN
    BEGIN
        ALTER TYPE public.estado_encuentro ADD VALUE IF NOT EXISTS 'REPROGRAMADO';
    EXCEPTION
        WHEN duplicate_object THEN NULL;
        WHEN others THEN NULL;
    END;
END $$;

-- 2. Asegurar que tabla cita_reagendada tenga permisos completos para usuarios autenticados
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cita_reagendada TO authenticated, service_role, anon;

-- 3. Habilitar Realtime explícito en cita_reagendada
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.cita_reagendada;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
        WHEN others THEN NULL;
    END;
END $$;

-- 4. Asegurar índice para consulta rápida de citas del día por sede y fecha
CREATE INDEX IF NOT EXISTS idx_cita_reagendada_site_fecha ON public.cita_reagendada(site_id, fecha, hora);

-- 5. FUNCIÓN ATÓMICA DE REPROGRAMACIÓN Y DESLISTE DE SALA DE ESPERA (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.reprogramar_cita_y_retirar_espera(
    p_encuentro_id UUID DEFAULT NULL,
    p_paciente_nombre TEXT DEFAULT NULL,
    p_telefono TEXT DEFAULT NULL,
    p_fecha DATE DEFAULT NULL,
    p_hora TIME DEFAULT '09:00',
    p_motivo TEXT DEFAULT 'Cita de seguimiento',
    p_site_id UUID DEFAULT NULL,
    p_usuario_nombre TEXT DEFAULT 'Ventanilla'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_target_encuentro_id UUID := p_encuentro_id;
    v_cita_id UUID;
    v_site_id UUID := p_site_id;
BEGIN
    IF p_fecha IS NULL THEN
        RAISE EXCEPTION 'La fecha de la cita es obligatoria.';
    END IF;

    IF p_paciente_nombre IS NULL OR length(trim(p_paciente_nombre)) = 0 THEN
        RAISE EXCEPTION 'El nombre de la paciente es obligatorio.';
    END IF;

    -- Si no se proporcionó site_id, tomar el de la primera sede
    IF v_site_id IS NULL THEN
        SELECT id INTO v_site_id FROM public.sede LIMIT 1;
    END IF;

    -- 1. Si no viene el encuentro_id explícito, buscar si hay un encuentro EN_ESPERA hoy para esta paciente
    IF v_target_encuentro_id IS NULL THEN
        SELECT e.id INTO v_target_encuentro_id
        FROM public.encuentro e
        LEFT JOIN public.paciente p ON p.id = e.paciente_id
        WHERE e.site_id = v_site_id
          AND e.estado = 'EN_ESPERA'
          AND (
              LOWER(TRIM(COALESCE(p.nombres, '') || ' ' || COALESCE(p.apellidos, ''))) = LOWER(TRIM(p_paciente_nombre))
              OR LOWER(TRIM(COALESCE(p.apellidos, '') || ' ' || COALESCE(p.nombres, ''))) = LOWER(TRIM(p_paciente_nombre))
              OR LOWER(TRIM(p_paciente_nombre)) LIKE '%' || LOWER(TRIM(COALESCE(p.apellidos, 'x-x'))) || '%'
              OR LOWER(TRIM(p_paciente_nombre)) LIKE '%' || LOWER(TRIM(COALESCE(p.nombres, 'x-x'))) || '%'
          )
        ORDER BY e.fecha_hora DESC
        LIMIT 1;
    END IF;

    -- 2. Si encontramos el encuentro activo, actualizarlo a CANCELADO para retirarlo de la vista del médico y de caja
    IF v_target_encuentro_id IS NOT NULL THEN
        UPDATE public.encuentro
        SET estado = 'CANCELADO',
            observaciones = 'REPROGRAMADO para el ' || p_fecha::text || ' a las ' || p_hora::text || ' (' || COALESCE(p_motivo, '') || ') por ' || COALESCE(p_usuario_nombre, 'Ventanilla'),
            updated_at = now()
        WHERE id = v_target_encuentro_id;
    END IF;

    -- 3. Insertar la cita en cita_reagendada
    INSERT INTO public.cita_reagendada (
        paciente_nombre,
        telefono,
        fecha,
        hora,
        motivo,
        site_id,
        estado
    )
    VALUES (
        TRIM(p_paciente_nombre),
        TRIM(p_telefono),
        p_fecha,
        p_hora,
        TRIM(p_motivo),
        v_site_id,
        'PROGRAMADA'
    )
    RETURNING id INTO v_cita_id;

    RETURN jsonb_build_object(
        'success', true,
        'cita_id', v_cita_id,
        'encuentro_id_cancelado', v_target_encuentro_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reprogramar_cita_y_retirar_espera TO authenticated, service_role, anon;
