-- ==============================================================================
-- SCRIPT 16: FIX CAJA TURNO FONDO INICIAL, PERMISOS Y RLS
-- Entorno: Consultorio Obstétrico Ecográfico Las Mellizas
-- ==============================================================================

-- 1. Asegurar columna fondo_inicial en caja_turno y sincronizar con monto_apertura
ALTER TABLE public.caja_turno 
    ADD COLUMN IF NOT EXISTS fondo_inicial NUMERIC(10,2) DEFAULT 0.00;

UPDATE public.caja_turno 
SET fondo_inicial = monto_apertura 
WHERE (fondo_inicial IS NULL OR fondo_inicial = 0.00) AND monto_apertura > 0;

-- 2. Asegurar permisos completos de lectura y escritura para la gestión de turnos
GRANT SELECT, INSERT, UPDATE, DELETE ON public.caja_turno TO authenticated, service_role, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.caja_egreso TO authenticated, service_role, anon;

-- 3. Actualizar políticas RLS de apertura y cierre de caja para evitar bloqueos
ALTER TABLE public.caja_turno ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Apertura de turno de caja" ON public.caja_turno;
CREATE POLICY "Apertura de turno de caja" ON public.caja_turno
    FOR INSERT TO authenticated, anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "Lectura turnos caja autorizados" ON public.caja_turno;
CREATE POLICY "Lectura turnos caja autorizados" ON public.caja_turno
    FOR SELECT TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Cierre y actualización de turno" ON public.caja_turno;
CREATE POLICY "Cierre y actualización de turno" ON public.caja_turno
    FOR UPDATE TO authenticated, anon
    USING (true)
    WITH CHECK (true);
