-- ============================================================================
-- ECOSISTEMA DIGITAL LAS MELLIZAS PERU S.A.C.
-- SCRIPT 03 - PASO 1 DE 2: REGISTRO DE ENUM 'RECEPCION_CAJA'
-- NOTA: PostgreSQL requiere ejecutar y confirmar (Run) este paso antes de usar
-- el nuevo valor en sentencias UPDATE o consultas.
-- ============================================================================

ALTER TYPE public.rol_usuario ADD VALUE IF NOT EXISTS 'RECEPCION_CAJA';
