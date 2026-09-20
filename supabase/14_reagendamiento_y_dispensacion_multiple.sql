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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cita_reagendada TO authenticated, service_role;

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
