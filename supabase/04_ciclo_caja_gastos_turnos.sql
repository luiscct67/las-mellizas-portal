-- ============================================================================
-- ECOSISTEMA DIGITAL LAS MELLIZAS PERU S.A.C. (RUC 20611827335)
-- SCRIPT 04: CICLO FINANCIERO INTEGRAL DE CAJA (APERTURA, GASTOS Y ARQUEO)
-- ============================================================================

-- 1. TABLA: TURNOS Y APERTURA/CIERRE DE CAJA
CREATE TABLE IF NOT EXISTS public.caja_turno (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES public.sede(id) ON DELETE RESTRICT,
    cajero_id UUID REFERENCES public.perfil_usuario(id),
    cajero_nombre TEXT NOT NULL,
    fecha_apertura TIMESTAMPTZ NOT NULL DEFAULT now(),
    monto_apertura NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (monto_apertura >= 0),
    fecha_cierre TIMESTAMPTZ,
    monto_cierre_efectivo_declarado NUMERIC(10,2) CHECK (monto_cierre_efectivo_declarado >= 0),
    total_ingresos_efectivo NUMERIC(10,2) DEFAULT 0.00 CHECK (total_ingresos_efectivo >= 0),
    total_ingresos_digital NUMERIC(10,2) DEFAULT 0.00 CHECK (total_ingresos_digital >= 0),
    total_egresos NUMERIC(10,2) DEFAULT 0.00 CHECK (total_egresos >= 0),
    efectivo_neto_esperado NUMERIC(10,2) DEFAULT 0.00,
    diferencia NUMERIC(10,2) DEFAULT 0.00,
    estado TEXT NOT NULL DEFAULT 'ABIERTA' CHECK (estado IN ('ABIERTA', 'CERRADA')),
    observaciones TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_caja_turno_site_estado ON public.caja_turno(site_id, estado);
CREATE INDEX IF NOT EXISTS idx_caja_turno_fecha ON public.caja_turno(fecha_apertura DESC);

-- 2. TABLA: EGRESOS DE CAJA Y PAGOS A COLABORADORES
CREATE TABLE IF NOT EXISTS public.caja_egreso (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    turno_id UUID REFERENCES public.caja_turno(id) ON DELETE RESTRICT,
    site_id UUID REFERENCES public.sede(id) ON DELETE RESTRICT,
    tipo TEXT NOT NULL CHECK (tipo IN ('GASTO_MENOR', 'VIATICO', 'PAGO_COLABORADOR', 'INSUMOS_MEDICOS', 'OTRO')),
    concepto TEXT NOT NULL,
    monto NUMERIC(10,2) NOT NULL CHECK (monto > 0),
    destinatario TEXT NOT NULL,
    aprobado_por TEXT NOT NULL,
    comprobante_ref TEXT,
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT now(),
    cajero_id UUID REFERENCES public.perfil_usuario(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_caja_egreso_turno ON public.caja_egreso(turno_id);
CREATE INDEX IF NOT EXISTS idx_caja_egreso_fecha ON public.caja_egreso(fecha_hora DESC);

-- 3. HABILITACIÓN DE SEGURIDAD RLS
ALTER TABLE public.caja_turno ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caja_egreso ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS RLS: CAJA_TURNO
DROP POLICY IF EXISTS "Lectura turnos caja autorizados" ON public.caja_turno;
CREATE POLICY "Lectura turnos caja autorizados" ON public.caja_turno
FOR SELECT TO authenticated
USING (
    public.obtener_mi_rol_estricto() IN ('SUPERVISION', 'ADMIN')
    OR site_id = (SELECT site_id FROM public.perfil_usuario WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Apertura de turno de caja" ON public.caja_turno;
CREATE POLICY "Apertura de turno de caja" ON public.caja_turno
FOR INSERT TO authenticated
WITH CHECK (
    public.obtener_mi_rol_estricto() IN ('RECEPCION_CAJA', 'RECEPCION', 'CAJA', 'ADMIN')
);

DROP POLICY IF EXISTS "Cierre y actualización de turno" ON public.caja_turno;
CREATE POLICY "Cierre y actualización de turno" ON public.caja_turno
FOR UPDATE TO authenticated
USING (
    public.obtener_mi_rol_estricto() IN ('RECEPCION_CAJA', 'RECEPCION', 'CAJA', 'ADMIN')
);

-- POLÍTICAS RLS: CAJA_EGRESO
DROP POLICY IF EXISTS "Lectura egresos autorizados" ON public.caja_egreso;
CREATE POLICY "Lectura egresos autorizados" ON public.caja_egreso
FOR SELECT TO authenticated
USING (
    public.obtener_mi_rol_estricto() IN ('SUPERVISION', 'ADMIN')
    OR site_id = (SELECT site_id FROM public.perfil_usuario WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Registrar egreso de caja" ON public.caja_egreso;
CREATE POLICY "Registrar egreso de caja" ON public.caja_egreso
FOR INSERT TO authenticated
WITH CHECK (
    public.obtener_mi_rol_estricto() IN ('RECEPCION_CAJA', 'RECEPCION', 'CAJA', 'ADMIN')
);
