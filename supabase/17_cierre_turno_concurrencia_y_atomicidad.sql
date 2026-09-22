-- ==============================================================================
-- ECOSISTEMA DIGITAL LAS MELLIZAS PERU S.A.C. (RUC 20611827335)
-- SCRIPT 17: CONTROL DE CONCURRENCIA, ATOMICIDAD Y BLOQUEO DE TURNOS CERRADOS
-- Entorno: PostgreSQL 15 / Supabase
-- ==============================================================================

-- 1. FUNCIÓN DE SEGURIDAD: IMPEDIR SOBREESCRITURA DE TURNOS CERRADOS (RACE CONDITION PREVENTION)
CREATE OR REPLACE FUNCTION public.f_bloquear_modificacion_turno_cerrado()
RETURNS TRIGGER AS $$
BEGIN
    -- Si el registro ya estaba en estado CERRADA, se prohíbe cualquier mutación posterior
    IF OLD.estado = 'CERRADA' THEN
        RAISE EXCEPTION 'Operación denegada por seguridad: El turno de caja % ya se encuentra en estado CERRADA y es inmutable.', OLD.id;
    END IF;

    -- Si se intenta cambiar a CERRADA, asegurar que fecha_cierre esté presente
    IF NEW.estado = 'CERRADA' AND NEW.fecha_cierre IS NULL THEN
        NEW.fecha_cierre := now();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. TRIGGER BEFORE UPDATE SOBRE CAJA_TURNO
DROP TRIGGER IF EXISTS trg_bloquear_turno_cerrado ON public.caja_turno;
CREATE TRIGGER trg_bloquear_turno_cerrado
BEFORE UPDATE ON public.caja_turno
FOR EACH ROW
EXECUTE FUNCTION public.f_bloquear_modificacion_turno_cerrado();

COMMENT ON FUNCTION public.f_bloquear_modificacion_turno_cerrado IS 
'Bloquea modificaciones concurrentes sobre turnos ya cerrados, evitando sobreescritura de arqueos y descalces de caja.';
