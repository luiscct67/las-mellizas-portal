# INFORME DE SUBSANACIÓN Y RATIFICACIÓN TÉCNICA — PASO 6 Y PASO 7

**DE:** Equipo Técnico — `luiscct67/las-mellizas-portal` (Vía B)  
**PARA:** Dirección Técnica — `las-mellizas-hce-portal` (Vía A)  
**CON COPIA:** Dirección General — Consultorio Obstétrico Ecográfico Las Mellizas Perú S.A.C.  
**FECHA:** 22 de septiembre de 2026  
**PROYECTO SUPABASE:** `oepctyamffehjhhuxiqo` (`main` / `PRODUCTION`)  
**REFERENCIA:** Respuesta definitiva a las observaciones formuladas en `35_verificacion-copia-trabajo-y-e2e-paso7.md`  

---

## 1. RESPUESTA AL HALLAZGO 2.1: DISCREPANCIA DE HASH SHA-256

Aceptamos plenamente la observación. Se aclara de forma transparente el origen de ambos valores, el diff exacto entre versiones y la certificación del hash único de 64 caracteres.

### 1.1. Hash SHA-256 Único, Oficial y Completo (64 caracteres)
El archivo efectivamente aplicado sobre la copia real de trabajo (`pg_cluster_paso6_workcopy`), y cuyo contenido está depositado en `01_PROPUESTA_ESQUEMA_RLS_ZERO_TRUST_PASO6.sql`, tiene el siguiente hash criptográfico SHA-256:

```text
4a4ba4366e5238e80044af720b433d56e8ab5662577e3d0c787236dc73b174c8  01_PROPUESTA_ESQUEMA_RLS_ZERO_TRUST_PASO6.sql
```

### 1.2. Cuadro Comparativo y Diff Literal entre Versiones
El hash previo (`4545c62b...`) correspondía a la versión preliminar antes de incorporar tres ajustes técnicos requeridos por el esquema real de producción:

| Componente | Versión Anterior (`4545c62b...`) | Versión Oficial Corregida (`4a4ba436...`) | Razón Técnica de Producción |
| :--- | :--- | :--- | :--- |
| **`caja_turno_update`** | `usuario_id = auth.uid()` | `cajero_id = auth.uid()` | En el esquema real de producción, la columna física de `caja_turno` se denomina `cajero_id`. La versión anterior fallaba en tiempo de compilación. |
| **Permisos Base DML** | `GRANT SELECT` a 13 tablas | `GRANT SELECT` a las 16 tablas completas | Se añadieron explícitamente `organizacion`, `producto_inventario` y `movimiento_inventario` para acceso de clientes autenticados. |
| **Catálogos Base** | `organizacion_select` y `sede_select` con `USING (true)` | Reforzadas con rol institucional estricto | Erradica cualquier cláusula abierta en catálogos compartidos. |

**Diff literal del cambio:**
```text
--- 01_PROPUESTA_ESQUEMA_RLS_ZERO_TRUST_PASO6.sql (Versión 4545c62b...)
+++ 01_PROPUESTA_ESQUEMA_RLS_ZERO_TRUST_PASO6.sql (Versión Oficial 4a4ba436...)
@@ -133,3 +133,6 @@
+GRANT SELECT ON public.organizacion TO authenticated;
+GRANT SELECT ON public.producto_inventario TO authenticated;
+GRANT SELECT ON public.movimiento_inventario TO authenticated;
@@ -393,1 +396,1 @@
-    (public.rol_usuario_actual() = 'caja' AND usuario_id = auth.uid() AND estado = 'ABIERTA')
+    (public.rol_usuario_actual() = 'caja' AND cajero_id = auth.uid() AND estado = 'ABIERTA')
@@ -522,1 +525,1 @@
-CREATE POLICY "organizacion_select" ON public.organizacion FOR SELECT TO authenticated USING (true);
+CREATE POLICY "organizacion_select" ON public.organizacion FOR SELECT TO authenticated USING (public.rol_usuario_actual() IN ('recepcion', 'profesional', 'caja', 'supervision', 'administrador'));
@@ -529,1 +532,1 @@
-CREATE POLICY "sede_select" ON public.sede FOR SELECT TO authenticated USING (true);
+CREATE POLICY "sede_select" ON public.sede FOR SELECT TO authenticated USING (public.rol_usuario_actual() IN ('recepcion', 'profesional', 'caja', 'supervision', 'administrador'));
```

### 1.3. Subsanación Documental
La Sección 5 de `RESPUESTA_UNIFICADA_VIA_A_PASO6.md` ha sido resincronizada con el código fuente del DDL oficial, reflejando el hash unificado `4a4ba4366e5238e80044af720b433d56e8ab5662577e3d0c787236dc73b174c8` y alineándose al archivo de control `SHA256SUMS.txt`.

---

## 2. RESPUESTA AL HALLAZGO 2.2: ORIGEN DE LAS POLÍTICAS "ANTES" EN LA COPIA REAL

### 2.1. Declaración del Origen
Confirmamos que **ocurrió la segunda alternativa: se aplicó una siembra manual controlada sobre la copia con datos reales**.

- **Causa raíz:** El archivo `backup_drill_real.sql` (proveniente del Paso 8) fue generado para evaluar la restauración de tablas y datos relacionales (`CREATE TABLE` e `INSERT INTO`), sin incluir los metadatos de `pg_policies`.
- Al crear la copia física persistente (`pg_cluster_paso6_workcopy`), se restauraron las 15 tablas con datos reales y, en el Paso 5 del script de prueba, se inyectaron las 9 políticas legacy permisivas conocidas (las mismas de la Sección 1.2) para validar que el script las purgara.

### 2.2. Garantía Operativa del Barrido Dinámico (Sección 4.5)
El script oficial no depende de conocer los nombres previos de las políticas en producción. La Sección 4.5 del DDL ejecuta:

```sql
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'perfil_usuario', 'usuario_sede', 'paciente', 'encuentro',
        'cita_reagendada', 'nota_clinica', 'adenda', 'caja_turno',
        'caja_egreso', 'orden_pago', 'pago', 'auditoria',
        'organizacion', 'sede', 'producto_inventario', 'movimiento_inventario'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    RAISE NOTICE 'Eliminada política % en tabla %', r.policyname, r.tablename;
  END LOOP;
END $$;
```

**Conclusión técnica:** El bucle consulta `pg_policies` dinámicamente al momento de ejecutarse en `oepctyamffehjhhuxiqo`. Cualquier política existente en esas 16 tablas (se llame como se llame y existan 3, 9 o 40) es detectada y eliminada antes de crear las políticas Zero Trust.

### 2.3. Consulta de Solo Lectura Directa en Producción
Para contrastar la línea base en caliente en el SQL Editor de Supabase sobre el proyecto real `oepctyamffehjhhuxiqo`:

```sql
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

## 3. RESPUESTA AL PUNTO 3: TRAZABILIDAD SQL LITERAL DEL E2E (PASO 7)

Detalle de la llamada SQL literal, contexto de sesión y resultado obtenido en cada una de las 7 fases ejecutadas sobre la base de datos real:

### FASE 1: Admisión / Recepción (Creación de Paciente y Encuentro en Sede Independencia)
- **Actor:** Recepcionista (`uRecep` / `55555555-5555-5555-5555-555555555555`), rol `recepcion`.
- **Sesión SQL:**
  ```sql
  SET SESSION "request.jwt.claim.sub" = '55555555-5555-5555-5555-555555555555';
  SET SESSION "request.jwt.claim.role" = 'authenticated';
  SET ROLE authenticated;
  ```
- **Llamadas SQL Literales:**
  ```sql
  INSERT INTO public.paciente (id, dni, nombres, apellidos)
  VALUES ('77777777-7777-7777-7777-777777777771', '72345678', 'María Elena', 'Quispe Huamán');

  INSERT INTO public.encuentro (id, paciente_id, site_id, servicio_solicitado)
  VALUES (
    '77777777-7777-7777-7777-777777777772',
    '77777777-7777-7777-7777-777777777771',
    'b0000000-0000-0000-0000-000000000001',
    'Ecografía Obstétrica 4D'
  );
  ```
- **Resultado del Motor:** Evaluado contra `paciente_insert` y `encuentro_insert`. Ambas inserciones admitidas.
- **Estado:** `REGISTRADO_EXITOSO` (1 fila insertada en cada tabla).

---

### FASE 2: Generación de Ticket / Orden de Pago
- **Actor:** Recepcionista (`uRecep`).
- **Llamada SQL Literal:**
  ```sql
  INSERT INTO public.orden_pago (id, encuentro_id, monto, estado)
  VALUES ('77777777-7777-7777-7777-777777777773', '77777777-7777-7777-7777-777777777772', 220.00, 'PENDIENTE');
  ```
- **Resultado del Motor:** Validado contra `orden_pago_insert` (`rol IN ('recepcion', 'caja', 'administrador')` y sede del encuentro autorizada).
- **Estado:** `GENERADO_PENDIENTE` (1 fila insertada en `orden_pago`).

---

### FASE 3: Cobro y Liquidación en Caja
- **Actor:** Cajera Sede Independencia (`uCajeraInd` / `c2222222-2222-2222-2222-222222222222`), rol `caja`.
- **Sesión SQL:**
  ```sql
  SET SESSION "request.jwt.claim.sub" = 'c2222222-2222-2222-2222-222222222222';
  SET SESSION "request.jwt.claim.role" = 'authenticated';
  SET ROLE authenticated;
  ```
- **Llamadas SQL Literales:**
  ```sql
  -- 3.1 Registrar cobro en caja
  INSERT INTO public.pago (id, orden_id, monto, medio_pago)
  VALUES ('77777777-7777-7777-7777-777777777774', '77777777-7777-7777-7777-777777777773', 220.00, 'TARJETA_POS');

  -- 3.2 Marcar orden como PAGADO
  UPDATE public.orden_pago SET estado = 'PAGADO'
  WHERE id = '77777777-7777-7777-7777-777777777773';

  -- 3.3 Asentar auditoría interna vía SECURITY DEFINER
  SELECT public.registrar_auditoria_sistema(
    'COBRO_COMPLETADO', 'pago', '77777777-7777-7777-7777-777777777774',
    '{"monto": 220.00, "medio_pago": "TARJETA_POS"}'::jsonb
  );
  ```
- **Resultado del Motor:** Pago asentado bajo política `pago_insert`; orden actualizada bajo `orden_pago_update`; auditoría sellada.
- **Estado:** `COBRADO_Y_PAGADO` (Transacción liquidada y auditada).

---

### FASE 4: Atención Médica y Sellado Criptográfico SHA-256
- **Actor:** Profesional de la Salud con asignación multisede (`uObsMulti` / `f4444444-4444-4444-4444-444444444444`), rol `profesional`.
- **Sesión SQL:**
  ```sql
  SET SESSION "request.jwt.claim.sub" = 'f4444444-4444-4444-4444-444444444444';
  SET SESSION "request.jwt.claim.role" = 'authenticated';
  SET ROLE authenticated;
  ```
- **Llamada SQL Literal:**
  ```sql
  INSERT INTO public.nota_clinica (id, encuentro_id, diagnostico, hash_sha256)
  VALUES (
    '77777777-7777-7777-7777-777777777775',
    '77777777-7777-7777-7777-777777777772',
    'Gestación única de 28 semanas con feto en evolución normal.',
    '635f793b827e7ffc4983ad25944111dd9aa0df2f36ff5e4860d5eef7faad5e1e'
  );

  SELECT public.registrar_auditoria_sistema(
    'NOTA_CLINICA_CERRADA', 'nota_clinica', '77777777-7777-7777-7777-777777777775',
    '{"hash_sha256": "635f793b827e7ffc4983ad25944111dd9aa0df2f36ff5e4860d5eef7faad5e1e"}'::jsonb
  );
  ```
- **Resultado del Motor:** Inserción admitida bajo `nota_clinica_insert`. Inmutabilidad garantizada por revocación de DML destructivo (`REVOKE UPDATE, DELETE ON nota_clinica`).
- **Estado:** `FIRMADO_Y_SELLADO` (Nota inmutable con hash SHA-256).

---

### FASE 5: Adenda Médica Append-Only
- **Actor:** Profesional Clínico (`uObsMulti`).
- **Llamada SQL Literal:**
  ```sql
  INSERT INTO public.adenda (id, nota_id, contenido, hash_sha256)
  VALUES (
    '77777777-7777-7777-7777-777777777776',
    '77777777-7777-7777-7777-777777777775',
    'Se adjuntan tomas doppler fetales a color.',
    'ba0a6e382fa0570b7fa9d012435f3b79dae13ef512df52c8033ca82bb81aa42c'
  );

  SELECT public.registrar_auditoria_sistema(
    'ADENDA_REGISTRADA', 'adenda', '77777777-7777-7777-7777-777777777776',
    '{"hash_adenda": "ba0a6e382fa0570b7fa9d012435f3b79dae13ef512df52c8033ca82bb81aa42c"}'::jsonb
  );
  ```
- **Resultado del Motor:** Inserción autorizada bajo `adenda_insert` con verificación relacional de nota y sede (`public.tiene_acceso_a_sede(e.site_id)`).
- **Estado:** `ADENDA_INCORPORADA` (1 fila insertada y auditada).

---

### FASE 6: Controles Negativos Cruzados Post-Atención
1. **Control 6.1 (Cajera intenta leer diagnóstico/nota):**
   - Contexto: `uCajeraInd` (rol `caja`).
   - SQL: `SELECT count(*)::int as cnt FROM public.nota_clinica WHERE id = '77777777-7777-7777-7777-777777777775';`
   - Salida del motor: `cnt: 0` (Bloqueo Zero Trust).
   - Estado: `ACCESO_DENEGADO_OK`.
2. **Control 6.2 (Médico ajeno intenta leer encuentro de Independencia):**
   - Contexto: `uMedViv` (Médico exclusivo Sede Vivanco).
   - SQL: `SELECT count(*)::int as cnt FROM public.encuentro WHERE id = '77777777-7777-7777-7777-777777777772';`
   - Salida del motor: `cnt: 0` (Aislamiento multisede estricto).
   - Estado: `ACCESO_DENEGADO_OK`.

---

### FASE 7: Verificación en Bitácora de Auditoría WORM
- **Actor:** Administrador General (`uAdmin` / `a1111111-1111-1111-1111-111111111111`).
- **SQL Literal:**
  ```sql
  SELECT accion, tabla, registro_id
  FROM public.auditoria
  WHERE tabla IN ('pago', 'nota_clinica', 'adenda')
  ORDER BY creado_el DESC LIMIT 3;
  ```
- **Salida Cruda del Motor:**
  ```text
  ┌─────────┬────────────────────────┬────────────────┬────────────────────────────────────────┐
  │ (index) │ accion                 │ tabla          │ registro_id                            │
  ├─────────┼────────────────────────┼────────────────┼────────────────────────────────────────┤
  │ 0       │ 'ADENDA_REGISTRADA'    │ 'adenda'       │ '77777777-7777-7777-7777-777777777776' │
  │ 1       │ 'NOTA_CLINICA_CERRADA' │ 'nota_clinica' │ '77777777-7777-7777-7777-777777777775' │
  │ 2       │ 'COBRO_COMPLETADO'     │ 'pago'         │ '77777777-7777-7777-7777-777777777774' │
  └─────────┴────────────────────────┴────────────────┴────────────────────────────────────────┘
  ```
- **Estado:** `TRAZABILIDAD_TOTAL_OK` (3 eventos inmutables registrados secuencialmente).

---

## 4. RATIFICACIÓN TÉCNICA SOLICITADA

Habiendo:
1. Homologado el **hash SHA-256 de 64 caracteres** (`4a4ba4366e5238e80044af720b433d56e8ab5662577e3d0c787236dc73b174c8`) en todos los archivos y secciones.
2. Esclarecido con total transparencia el origen de la siembra en la copia física y fundamentado por qué el barrido dinámico es inmune al estado de producción.
3. Entregado la evidencia SQL literal paso a paso del flujo E2E del Paso 7.

Solicitamos a la Dirección Técnica de Vía A dar por solventadas las observaciones y proceder con la **ratificación formal de la ventana de mantenimiento del sábado 26 de septiembre a las 22:00 PET**, declarando el **Schema Freeze** operativo.
