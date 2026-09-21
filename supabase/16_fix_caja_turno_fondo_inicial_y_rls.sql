-- ==============================================================================
-- SCRIPT 16 (CORREGIDO Y AUTOSUFICIENTE): CREACIÓN Y CONFIGURACIÓN DE CAJA_TURNO Y CAJA_EGRESO
-- Entorno: Consultorio Obstétrico Ecográfico Las Mellizas
-- ==============================================================================

-- 1. CREACIÓN DE TABLA: public.caja_turno (SI NO EXISTE)
CREATE TABLE IF NOT EXISTS public.caja_turno (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES public.sede(id) ON DELETE SET NULL,
    cajero_id UUID REFERENCES public.perfil_usuario(id) ON DELETE SET NULL,
    cajero_nombre TEXT NOT NULL DEFAULT 'Operador de Ventanilla',
    fecha_apertura TIMESTAMPTZ NOT NULL DEFAULT now(),
    monto_apertura NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (monto_apertura >= 0),
    fondo_inicial NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (fondo_inicial >= 0),
    fecha_cierre TIMESTAMPTZ,
    monto_cierre_efectivo_declarado NUMERIC(10,2) DEFAULT 0.00,
    total_ingresos_efectivo NUMERIC(10,2) DEFAULT 0.00,
    total_ingresos_digital NUMERIC(10,2) DEFAULT 0.00,
    total_egresos NUMERIC(10,2) DEFAULT 0.00,
    efectivo_neto_esperado NUMERIC(10,2) DEFAULT 0.00,
    diferencia NUMERIC(10,2) DEFAULT 0.00,
    estado TEXT NOT NULL DEFAULT 'ABIERTA' CHECK (estado IN ('ABIERTA', 'CERRADA')),
    observaciones TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Asegurar columna fondo_inicial si la tabla ya existía previamente
ALTER TABLE public.caja_turno 
    ADD COLUMN IF NOT EXISTS fondo_inicial NUMERIC(10,2) DEFAULT 0.00;

-- Sincronizar registros donde fondo_inicial esté en 0 pero monto_apertura tenga valor
UPDATE public.caja_turno 
SET fondo_inicial = monto_apertura 
WHERE (fondo_inicial IS NULL OR fondo_inicial = 0.00) AND monto_apertura > 0;

-- Índices de optimización para caja_turno
CREATE INDEX IF NOT EXISTS idx_caja_turno_site_estado ON public.caja_turno(site_id, estado);
CREATE INDEX IF NOT EXISTS idx_caja_turno_fecha ON public.caja_turno(fecha_apertura DESC);


-- 2. CREACIÓN DE TABLA: public.caja_egreso (SI NO EXISTE)
CREATE TABLE IF NOT EXISTS public.caja_egreso (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    turno_id UUID REFERENCES public.caja_turno(id) ON DELETE CASCADE,
    site_id UUID REFERENCES public.sede(id) ON DELETE SET NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('GASTO_MENOR', 'VIATICO', 'PAGO_COLABORADOR', 'INSUMOS_MEDICOS', 'OTRO')),
    concepto TEXT NOT NULL,
    monto NUMERIC(10,2) NOT NULL CHECK (monto > 0),
    destinatario TEXT NOT NULL,
    aprobado_por TEXT NOT NULL,
    comprobante_ref TEXT,
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT now(),
    cajero_id UUID REFERENCES public.perfil_usuario(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de optimización para caja_egreso
CREATE INDEX IF NOT EXISTS idx_caja_egreso_turno ON public.caja_egreso(turno_id);
CREATE INDEX IF NOT EXISTS idx_caja_egreso_fecha ON public.caja_egreso(fecha_hora DESC);


-- 3. PERMISOS Y PRIVILEGIOS DE ACCESO
GRANT SELECT, INSERT, UPDATE, DELETE ON public.caja_turno TO authenticated, service_role, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.caja_egreso TO authenticated, service_role, anon;


-- 4. POLÍTICAS DE SEGURIDAD RLS FLEXIBLES (SIN BLOQUEOS OPERATIVOS)
ALTER TABLE public.caja_turno ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caja_egreso ENABLE ROW LEVEL SECURITY;

-- Políticas para caja_turno
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

-- Políticas para caja_egreso
DROP POLICY IF EXISTS "Lectura egresos autorizados" ON public.caja_egreso;
CREATE POLICY "Lectura egresos autorizados" ON public.caja_egreso
    FOR SELECT TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Registrar egreso de caja" ON public.caja_egreso;
CREATE POLICY "Registrar egreso de caja" ON public.caja_egreso
    FOR INSERT TO authenticated, anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "Eliminar o anular egreso de caja" ON public.caja_egreso;
CREATE POLICY "Eliminar o anular egreso de caja" ON public.caja_egreso
    FOR DELETE TO authenticated, anon
    USING (true);


-- 5. HABILITAR REALTIME PARA MONITOREO DE CAJA Y EGRESOS
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.caja_turno;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
        WHEN others THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.caja_egreso;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
        WHEN others THEN NULL;
    END;
END $$;
