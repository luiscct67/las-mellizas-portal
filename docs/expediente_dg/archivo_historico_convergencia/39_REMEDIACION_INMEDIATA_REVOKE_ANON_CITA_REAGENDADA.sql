-- ==============================================================================
-- SCRIPT DE REMEDIACIÓN INMEDIATA: CIERRE DE PRIVILEGIOS DE ANON SOBRE CITA_REAGENDADA Y RPC
-- Entorno: Supabase Producción (oepctyamffehjhhuxiqo)
-- Requisito Previo a Transferencia de Cuentas (Viernes 25 de septiembre de 2026, 18:00 PET)
-- ==============================================================================

BEGIN;

-- 1. Revocar de inmediato todos los privilegios sobre la tabla cita_reagendada a los roles públicos/anónimos
REVOKE ALL ON TABLE public.cita_reagendada FROM anon;
REVOKE ALL ON TABLE public.cita_reagendada FROM public;

-- Asegurar privilegios para roles autenticados (sujetos a RLS)
GRANT SELECT, INSERT, UPDATE ON TABLE public.cita_reagendada TO authenticated;

-- 2. Revocar dinámicamente privilegios de ejecución sobre TODAS las sobrecargas de reprogramar_cita_y_retirar_espera
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' 
          AND p.proname = 'reprogramar_cita_y_retirar_espera'
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM anon;', r.proname, r.args);
        EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM public;', r.proname, r.args);
        EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated;', r.proname, r.args);
        RAISE NOTICE 'Privilegios revocados a anon y public para: %(%)', r.proname, r.args;
    END LOOP;
END $$;

COMMIT;

-- ==============================================================================
-- CONSULTAS DE VERIFICACIÓN POST-EJECUCIÓN (SALIDA SOLICITADA POR VÍA A)
-- ==============================================================================

-- 1. Privilegios vigentes de anon sobre la tabla (Debe arrojar 0 filas)
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'cita_reagendada'
  AND grantee = 'anon'
ORDER BY privilege_type;

-- 2. Privilegio de ejecución vigente de anon sobre la función (anon_puede_ejecutar debe ser FALSE)
SELECT p.proname,
       pg_get_function_identity_arguments(p.oid) AS argumentos,
       p.prosecdef AS es_security_definer,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_puede_ejecutar
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'reprogramar_cita_y_retirar_espera';
