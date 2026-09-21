-- ==============================================================================
-- SCRIPT 15: UNICIDAD Y ACTUALIZACIÓN DE CITAS REAGENDADAS
-- Entorno: Consultorio Obstétrico Ecográfico Las Mellizas
-- ==============================================================================

-- 1. Agregar columnas opcionales a cita_reagendada para mejor auditoría y trazabilidad
ALTER TABLE public.cita_reagendada 
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS encuentro_id UUID REFERENCES public.encuentro(id) ON DELETE SET NULL;

-- 2. Limpieza de duplicados históricos acumulados en cita_reagendada:
-- Conservar únicamente el registro más reciente por paciente cuando el estado sea 'PROGRAMADA'
DELETE FROM public.cita_reagendada c1
WHERE c1.estado = 'PROGRAMADA'
  AND c1.id NOT IN (
      SELECT DISTINCT ON (LOWER(TRIM(c2.paciente_nombre))) c2.id
      FROM public.cita_reagendada c2
      WHERE c2.estado = 'PROGRAMADA'
      ORDER BY LOWER(TRIM(c2.paciente_nombre)), c2.created_at DESC, c2.id DESC
  );

-- 3. Actualizar la función atómica reprogramar_cita_y_retirar_espera con lógica de UPSERT (Unicidad estricta)
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
    v_existing_cita_id UUID;
    v_accion TEXT := 'CREADA';
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

    -- 2. Si encontramos el encuentro activo, actualizarlo a CANCELADO sin tocar campos inexistentes
    IF v_target_encuentro_id IS NOT NULL THEN
        UPDATE public.encuentro
        SET estado = 'CANCELADO',
            updated_at = now()
        WHERE id = v_target_encuentro_id;
    END IF;

    -- 3. UNICIDAD: Verificar si ya existe una cita pendiente (estado = 'PROGRAMADA') para este paciente o encuentro
    SELECT id INTO v_existing_cita_id
    FROM public.cita_reagendada
    WHERE estado = 'PROGRAMADA'
      AND (
          (v_target_encuentro_id IS NOT NULL AND encuentro_id = v_target_encuentro_id)
          OR LOWER(TRIM(paciente_nombre)) = LOWER(TRIM(p_paciente_nombre))
      )
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_existing_cita_id IS NOT NULL THEN
        -- Actualizar la cita existente en lugar de duplicar registros
        UPDATE public.cita_reagendada
        SET telefono = COALESCE(TRIM(p_telefono), telefono),
            fecha = p_fecha,
            hora = p_hora,
            motivo = TRIM(p_motivo),
            site_id = v_site_id,
            encuentro_id = COALESCE(v_target_encuentro_id, encuentro_id),
            updated_at = now()
        WHERE id = v_existing_cita_id;

        v_cita_id := v_existing_cita_id;
        v_accion := 'ACTUALIZADA';

        -- Purgar cualquier duplicado residual previo para este paciente
        DELETE FROM public.cita_reagendada
        WHERE estado = 'PROGRAMADA'
          AND LOWER(TRIM(paciente_nombre)) = LOWER(TRIM(p_paciente_nombre))
          AND id <> v_existing_cita_id;
    ELSE
        -- Insertar nuevo registro con unicidad garantizada
        INSERT INTO public.cita_reagendada (
            paciente_nombre,
            telefono,
            fecha,
            hora,
            motivo,
            site_id,
            estado,
            encuentro_id,
            created_at,
            updated_at
        )
        VALUES (
            TRIM(p_paciente_nombre),
            TRIM(p_telefono),
            p_fecha,
            p_hora,
            TRIM(p_motivo),
            v_site_id,
            'PROGRAMADA',
            v_target_encuentro_id,
            now(),
            now()
        )
        RETURNING id INTO v_cita_id;
        v_accion := 'CREADA';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'cita_id', v_cita_id,
        'encuentro_id_cancelado', v_target_encuentro_id,
        'accion', v_accion
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reprogramar_cita_y_retirar_espera TO authenticated, service_role, anon;
