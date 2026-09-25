-- ============================================================================
-- PASO 7 (DG-001-C / DG-001-B): SUBSANACIÓN DEFINITIVA DEL HALLAZGO 3.1
-- CIERRE DE SOBRECARGAS VULNERABLES EN RPC Y PUENTE CANÓNICO AGENDA <-> HCE/CAJA
-- FECHA: 21 de Septiembre de 2026
-- ARCHIVO: docs/expediente_dg/paso7_integracion/01_SUBSANACION_HALLAZGO_31_RPC_SEGURIDAD.sql
-- ============================================================================

-- 1. ELIMINACIÓN EXPLÍCITA DE SOBRECARGAS VULNERABLES ANTERIORES
-- Erradica la versión vulnerable que permitía anon y búsqueda difusa por texto
DROP FUNCTION IF EXISTS public.reprogramar_cita_y_retirar_espera(UUID, TEXT, TEXT, DATE, TIME, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS public.reprogramar_cita_y_retirar_espera(UUID, UUID, TEXT, DATE, TIME, TEXT, UUID, TEXT);

-- 2. HIGIENE Y REVOCACIÓN INMEDIATA DE PRIVILEGIOS AL ROL ANÓNIMO
REVOKE ALL ON public.cita_reagendada FROM anon;

-- 3. HARDENING DE TABLA: ACTIVAR Y FORZAR ROW LEVEL SECURITY
ALTER TABLE public.cita_reagendada ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cita_reagendada FORCE ROW LEVEL SECURITY;

-- Concesión exclusiva al rol autenticado (sujeta a políticas RLS)
GRANT SELECT, INSERT, UPDATE ON public.cita_reagendada TO authenticated;

-- 4. REESCRITURA CANÓNICA DE LA FUNCIÓN DE REAGENDAMIENTO (PUENTE AGENDA <-> HCE/CAJA)
-- Correcciones implementadas:
-- a) Búsqueda e identificación por paciente_id estricto (UUID), erradicando el LIKE '%...%' difuso.
-- b) Validación de autenticación (auth.uid() no nulo).
-- c) Validación de rol operativo (recepción, profesional, caja, administración).
-- d) Validación obligatoria de sede mediante public.tiene_acceso_a_sede(p_site_id).
-- e) Obligatoriedad de sede para todos (incluso multisede no puede dejar site_id NULL).
-- f) Inmutabilidad de search_path (SET search_path = public, pg_temp).

CREATE OR REPLACE FUNCTION public.reprogramar_cita_y_retirar_espera(
    p_paciente_id UUID,
    p_encuentro_id UUID DEFAULT NULL,
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
SET search_path = public, pg_temp
AS $$
DECLARE
    v_cajero_id UUID := auth.uid();
    v_target_encuentro_id UUID := p_encuentro_id;
    v_cita_id UUID;
    v_site_id UUID := p_site_id;
    v_existing_cita_id UUID;
    v_accion TEXT := 'CREADA';
    v_paciente_existe BOOLEAN;
BEGIN
    -- CANDADO 1: Verificación de sesión de usuario
    IF v_cajero_id IS NULL THEN
        RAISE EXCEPTION 'Sesión no válida o usuario anónimo no autorizado'
            USING ERRCODE = '28000';
    END IF;

    -- CANDADO 2: Verificación de rol institucional
    IF NOT (public.rol_usuario_actual() IN ('recepcion', 'profesional', 'caja', 'administrador')) THEN
        RAISE EXCEPTION 'Rol no autorizado para reprogramar citas'
            USING ERRCODE = '42501';
    END IF;

    -- CANDADO 3: Parámetros obligatorios y existencia en Padrón Maestro
    IF p_fecha IS NULL THEN
        RAISE EXCEPTION 'La fecha de la cita es obligatoria.' USING ERRCODE = '22023';
    END IF;

    IF p_paciente_id IS NULL THEN
        RAISE EXCEPTION 'El paciente_id es obligatorio para vincular la cita.' USING ERRCODE = '22023';
    END IF;

    SELECT EXISTS (SELECT 1 FROM public.paciente WHERE id = p_paciente_id) INTO v_paciente_existe;
    IF NOT v_paciente_existe THEN
        RAISE EXCEPTION 'El paciente_id especificado no existe en el Padrón Maestro.' USING ERRCODE = '23503';
    END IF;

    -- CANDADO 4: Verificación estricta de sede autorizada (Aislamiento Multisede)
    -- Si no viene especificada, inferirla de la sede del usuario asignado
    IF v_site_id IS NULL THEN
        SELECT site_id INTO v_site_id FROM public.usuario_sede WHERE user_id = v_cajero_id LIMIT 1;
    END IF;

    -- Exigir sede explícita y no nula para todos los roles (incluyendo multisede)
    IF v_site_id IS NULL THEN
        RAISE EXCEPTION 'Debe especificarse la sede clínica (site_id) para registrar la cita.' USING ERRCODE = '22023';
    END IF;

    IF NOT public.tiene_acceso_a_sede(v_site_id) THEN
        RAISE EXCEPTION 'Acceso denegado: El usuario no tiene autorización para operar en la sede solicitada (%)', v_site_id
            USING ERRCODE = '42501';
    END IF;

    -- 1. Si no viene el encuentro_id explícito, buscar si hay un encuentro activo en espera hoy
    IF v_target_encuentro_id IS NULL THEN
        SELECT e.id INTO v_target_encuentro_id
        FROM public.encuentro e
        WHERE e.site_id = v_site_id
          AND e.paciente_id = p_paciente_id
          AND e.estado = 'EN_ESPERA'
        ORDER BY e.fecha_hora DESC
        LIMIT 1;
    END IF;

    -- 2. Si encontramos el encuentro activo, cancelarlo por reagendamiento
    IF v_target_encuentro_id IS NOT NULL THEN
        UPDATE public.encuentro
        SET estado = 'CANCELADO',
            updated_at = now()
        WHERE id = v_target_encuentro_id;
    END IF;

    -- 3. UNICIDAD Y ACTUALIZACIÓN POR PACIENTE_ID (No por coincidencia difusa de texto)
    SELECT id INTO v_existing_cita_id
    FROM public.cita_reagendada
    WHERE estado = 'PROGRAMADA'
      AND paciente_id = p_paciente_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_existing_cita_id IS NOT NULL THEN
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
    ELSE
        INSERT INTO public.cita_reagendada (
            paciente_id,
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
            p_paciente_id,
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

    -- Bitácora inmutable de auditoría
    INSERT INTO public.auditoria (accion, entidad, entidad_id, detalles, usuario_id)
    VALUES (
        'CITA_REAGENDADA',
        'cita_reagendada',
        v_cita_id,
        jsonb_build_object(
            'paciente_id', p_paciente_id,
            'accion', v_accion,
            'site_id', v_site_id,
            'encuentro_cancelado', v_target_encuentro_id
        ),
        v_cajero_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'cita_id', v_cita_id,
        'encuentro_id_cancelado', v_target_encuentro_id,
        'accion', v_accion
    );
END;
$$;

-- 5. CONCESIÓN SEGURA EXCLUSIVA A USUARIOS AUTENTICADOS
REVOKE ALL ON FUNCTION public.reprogramar_cita_y_retirar_espera(UUID, UUID, TEXT, DATE, TIME, TEXT, UUID, TEXT) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.reprogramar_cita_y_retirar_espera(UUID, UUID, TEXT, DATE, TIME, TEXT, UUID, TEXT) TO authenticated;
