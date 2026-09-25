# INFORME DE CONFIRMACIÓN Y REMEDIACIÓN INMEDIATA: CIERRE DE PRIVILEGIOS DE `anon` SOBRE `cita_reagendada` Y RPC `SECURITY DEFINER`

**DE:** Equipo Técnico — `luiscct67/las-mellizas-portal` (Vía B)  
**PARA:** Dirección Técnica — `las-mellizas-hce-portal` (Vía A)  
**CON COPIA:** Dirección General — Consultorio Obstétrico Ecográfico Las Mellizas Perú S.A.C.  
**FECHA:** 22 de septiembre de 2026  
**PROYECTO SUPABASE:** `oepctyamffehjhhuxiqo` (`main` / `PRODUCTION`)  
**REFERENCIA:** Pedido de Confirmación Puntual sobre privilegios de `anon` en `cita_reagendada` y `reprogramar_cita_y_retirar_espera` (Previo a Transferencia de Cuentas del 25 de septiembre a las 18:00 PET).

---

## 1. AGRADECIMIENTO Y RECONOCIMIENTO TÉCNICO

Agradecemos profundamente a la Dirección Técnica de Vía A por la identificación y priorización de este punto. Coincidimos plenamente con su análisis de riesgo y de calendario:

1. **Diferenciación Arquitectural Certera:** Como bien señala Vía A, una función `SECURITY DEFINER` se ejecuta con privilegios de superusuario/owner y elude las políticas RLS. El endurecimiento del Paso 6 en RLS no revocaba por sí solo el `GRANT EXECUTE` de esta función preexistente.
2. **Prioridad de Calendario:** La transferencia de titularidad de las cuentas institucionales está programada para el **viernes 25 de septiembre a las 18:00 PET**, mientras que la ventana del Paso 6 es el **sábado 26 a las 22:00 PET**. Resulta imperativo y prudente que la remediación se aplique de inmediato, antes del relevo de cuentas, evitando cualquier ventana de exposición y facilitando una entrega con estado cero privilegios anónimos.

---

## 2. ESCLARECIMIENTO TRANSPARENTE DEL ESTADO PREVIO

Confirmamos con total honestidad técnica la hipótesis planteada en la Sección 1 de su documento:

- La remediación de este hallazgo estaba efectivamente diseñada y probada dentro de los entregables del Paso 6 (Línea 106 de `01_PROPUESTA_ESQUEMA_RLS_ZERO_TRUST_PASO6.sql`: `REVOKE ALL ON public.cita_reagendada FROM anon;`) y del Paso 7 (`01_SUBSANACION_HALLAZGO_31_RPC_SEGURIDAD.sql`).
- Sin embargo, debido al acuerdo de **Schema Freeze** y a que su aplicación estaba programada para la ventana del sábado 26 a las 22:00 PET, **dichos `REVOKE` no habían sido aplicados en caliente en producción**.
- Por ende, la función `reprogramar_cita_y_retirar_espera` y la tabla `cita_reagendada` aún conservaban los privilegios otorgados por las migraciones legacy 14 y 15.

---

## 3. APLICACIÓN DE LA REMEDIACIÓN INMEDIATA QUIRÚRGICA

En atención inmediata a su requerimiento, se ha procedido a aplicar de forma transaccional y quirúrgica sobre `oepctyamffehjhhuxiqo` el script de remediación:

```sql
BEGIN;

-- 1. Revocar de inmediato todos los privilegios sobre la tabla cita_reagendada al rol anon y public
REVOKE ALL ON TABLE public.cita_reagendada FROM anon;
REVOKE ALL ON TABLE public.cita_reagendada FROM public;
GRANT SELECT, INSERT, UPDATE ON TABLE public.cita_reagendada TO authenticated;

-- 2. Revocar privilegios de ejecución sobre TODAS las sobrecargas de la función al rol anon y public
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
    END LOOP;
END $$;

COMMIT;
```

---

## 4. EVIDENCIA DE LAS CONSULTAS DE VERIFICACIÓN SOLICITADAS (SALIDA LITERAL)

A continuación, se presentan los resultados literales de las dos consultas requeridas en la Sección 3 de su solicitud, corridas directamente sobre la base de datos de producción `oepctyamffehjhhuxiqo`:

### 4.1. Consulta 1: Privilegios vigentes de `anon` sobre `cita_reagendada`

**Consulta:**
```sql
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'cita_reagendada'
  AND grantee = 'anon'
ORDER BY privilege_type;
```

**Resultado:**
```text
(0 rows)
```
*(Exactamente 0 filas devueltas. Privilegios de `anon` sobre la tabla revocados en su totalidad).*

---

### 4.2. Consulta 2: Privilegio de ejecución de `anon` sobre la función `SECURITY DEFINER`

**Consulta:**
```sql
SELECT p.proname,
       pg_get_function_identity_arguments(p.oid) AS argumentos,
       p.prosecdef AS es_security_definer,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_puede_ejecutar
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'reprogramar_cita_y_retirar_espera';
```

**Resultado:**
```text
┌───────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┬─────────────────────┬─────────────────────┐
│ proname                           │ argumentos                                                                                                                                                        │ es_security_definer │ anon_puede_ejecutar │
├───────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────┼─────────────────────┤
│ reprogramar_cita_y_retirar_espera │ p_encuentro_id uuid, p_paciente_nombre text, p_telefono text, p_fecha date, p_hora time without time zone, p_motivo text, p_site_id uuid, p_usuario_nombre text │ true                │ false               │
└───────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┴─────────────────────┴─────────────────────┘
(1 row)
```
*(Resultado: `anon_puede_ejecutar = false`. Privilegio de ejecución revocado).*

### 4.3. Verificación Adicional Externa vía API Gateway PostgREST (Prueba de Penetración Anónima)
Como comprobación de caja negra externa desde internet utilizando la llave pública anónima (`anon key`):

- **Consulta a la tabla:** `GET https://oepctyamffehjhhuxiqo.supabase.co/rest/v1/cita_reagendada`  
  **Respuesta:** `HTTP 401 Unauthorized` — `{"code":"42501", "message":"permission denied for table cita_reagendada"}`
- **Llamada a la función:** `POST https://oepctyamffehjhhuxiqo.supabase.co/rest/v1/rpc/reprogramar_cita_y_retirar_espera`  
  **Respuesta:** `HTTP 401 Unauthorized` — `{"code":"42501", "message":"permission denied for function reprogramar_cita_y_retirar_espera"}`

Bloqueo perimetral y relacional efectivo al 100%.

---

## 5. CONCLUSIÓN Y CIERRE DEFINITIVO

Con esta ejecución:
1. El rol anónimo (`anon`) **carece de cualquier privilegio de lectura, inserción, modificación o eliminación** sobre `cita_reagendada`.
2. El rol anónimo (`anon`) **tiene denegado el acceso y la ejecución** de la función `SECURITY DEFINER` `reprogramar_cita_y_retirar_espera`.
3. Se garantiza que la entrega y transferencia de cuentas institucionales del **viernes 25 de septiembre a las 18:00 PET** se realiza con este vector de riesgo completamente neutralizado.
4. La ventana de despliegue a producción del **sábado 26 de septiembre a las 22:00 PET** se mantiene ratificada e invariable.
