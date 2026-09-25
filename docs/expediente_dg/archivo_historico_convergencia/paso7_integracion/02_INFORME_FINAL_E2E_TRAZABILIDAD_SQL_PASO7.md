# INFORME FINAL DE TRAZABILIDAD SQL Y RPC END-TO-END — PASO 7

**DE:** Equipo Técnico — `luiscct67/las-mellizas-portal` (Vía B)  
**PARA:** Dirección Técnica — `las-mellizas-hce-portal` (Vía A)  
**CON COPIA:** Dirección General — Consultorio Obstétrico Ecográfico Las Mellizas Perú S.A.C.  
**FECHA:** 22 de septiembre de 2026  
**ESTADO:** DOCUMENTO DE CIERRE DEFINITIVO DEL PASO 7  
**ENTORNO DE PRUEBA:** Copia Física de Producción (`pg_cluster_paso6_workcopy`) / Supabase `oepctyamffehjhhuxiqo`  

---

## 1. RESUMEN EJECUTIVO

El presente documento consolida la trazabilidad técnica, SQL literal, llamadas RPC `SECURITY DEFINER`, contextos de sesión JWT simulados y respuestas del motor relacional PostgreSQL correspondientes a la simulación End-to-End (E2E) del flujo clínico-administrativo del Consultorio Las Mellizas.

Este reporte da cumplimiento exhaustivo al estándar de evidencia exigido por la Dirección Técnica para el cierre formal del **Paso 7**, habilitando la transición expedita hacia el **Paso 9 (Pase a Producción y Capacitación)** una vez ejecutada la ventana ratificada.

---

## 2. ACTORES, ROLES Y CONTEXTO DE SEGURIDAD SIMULADO

| Alias Actor | UUID de Usuario | Rol Institucional | Sede(s) Asignada(s) | Función en el Flujo |
| :--- | :--- | :--- | :--- | :--- |
| `uRecep` | `55555555-5555-5555-5555-555555555555` | `recepcion` | Independencia (`b000...0001`) | Admisión y emisión de orden de cobro |
| `uCajeraInd` | `c2222222-2222-2222-2222-222222222222` | `caja` | Independencia (`b000...0001`) | Cobro, liquidación y auditoría de pago |
| `uObsMulti` | `f4444444-4444-4444-4444-444444444444` | `profesional` | Independencia y Vivanco (Dual) | Atención médica, firma criptográfica y adenda |
| `uMedViv` | `d3333333-3333-3333-3333-333333333333` | `profesional` | Vivanco (`b000...0002`) | Control negativo de aislamiento multisede |
| `uAdmin` | `a1111111-1111-1111-1111-111111111111` | `administrador` | Todas (Bypass institucional) | Auditoría e inspección de bitácora WORM |

---

## 3. TRAZABILIDAD PASO A PASO DEL FLUJO CLÍNICO-ADMINISTRATIVO

### FASE 1: Admisión de Paciente y Apertura de Encuentro Clínico
- **Actor:** `uRecep` (Recepción Independencia)
- **Configuración de Sesión Supabase PostgREST:**
  ```sql
  SET SESSION "request.jwt.claim.sub" = '55555555-5555-5555-5555-555555555555';
  SET SESSION "request.jwt.claim.role" = 'authenticated';
  SET ROLE authenticated;
  ```
- **Sentencias SQL Ejecutadas:**
  ```sql
  -- 1.1 Inserción en maestro de pacientes
  INSERT INTO public.paciente (id, dni, nombres, apellidos)
  VALUES ('77777777-7777-7777-7777-777777777771', '72345678', 'María Elena', 'Quispe Huamán');

  -- 1.2 Registro de encuentro clínico asignado a Sede Independencia
  INSERT INTO public.encuentro (id, paciente_id, site_id, servicio_solicitado)
  VALUES (
    '77777777-7777-7777-7777-777777777772',
    '77777777-7777-7777-7777-777777777771',
    'b0000000-0000-0000-0000-000000000001',
    'Ecografía Obstétrica 4D'
  );
  ```
- **Políticas RLS Evaluadas:** `paciente_insert` y `encuentro_insert` (`site_id = public.sede_usuario_actual()`).
- **Resultado del Motor:** `INSERT 0 1` en ambas tablas. Estado: `REGISTRADO_EXITOSO`.

---

### FASE 2: Generación de Orden de Pago / Ticket
- **Actor:** `uRecep` (Recepción Independencia)
- **Sentencia SQL Ejecutada:**
  ```sql
  INSERT INTO public.orden_pago (id, encuentro_id, monto, estado)
  VALUES ('77777777-7777-7777-7777-777777777773', '77777777-7777-7777-7777-777777777772', 220.00, 'PENDIENTE');
  ```
- **Políticas RLS Evaluadas:** `orden_pago_insert` (`rol_usuario_actual() IN ('recepcion', 'caja', 'administrador')`).
- **Resultado del Motor:** `INSERT 0 1`. Orden creada en estado `PENDIENTE`.

---

### FASE 3: Cobro en Caja y Asiento de Auditoría
- **Actor:** `uCajeraInd` (Caja Independencia)
- **Configuración de Sesión Supabase PostgREST:**
  ```sql
  SET SESSION "request.jwt.claim.sub" = 'c2222222-2222-2222-2222-222222222222';
  SET SESSION "request.jwt.claim.role" = 'authenticated';
  SET ROLE authenticated;
  ```
- **Sentencias SQL / RPC Ejecutadas:**
  ```sql
  -- 3.1 Registrar cobro en caja
  INSERT INTO public.pago (id, orden_id, monto, medio_pago)
  VALUES ('77777777-7777-7777-7777-777777777774', '77777777-7777-7777-7777-777777777773', 220.00, 'TARJETA_POS');

  -- 3.2 Actualizar estado de orden
  UPDATE public.orden_pago SET estado = 'PAGADO'
  WHERE id = '77777777-7777-7777-7777-777777777773';

  -- 3.3 RPC de auditoría del sistema (Security Definer)
  SELECT public.registrar_auditoria_sistema(
    'COBRO_COMPLETADO',
    'pago',
    '77777777-7777-7777-7777-777777777774',
    '{"monto": 220.00, "medio_pago": "TARJETA_POS"}'::jsonb
  );
  ```
- **Políticas RLS Evaluadas:** `pago_insert`, `orden_pago_update` y validación de sede en turno.
- **Resultado del Motor:** Pago asentado, orden en `PAGADO` y evento de auditoría insertado. Estado: `COBRADO_Y_PAGADO`.

---

### FASE 4: Atención Clínica y Sellado Criptográfico SHA-256
- **Actor:** `uObsMulti` (Profesional Médico / Obstetra)
- **Configuración de Sesión Supabase PostgREST:**
  ```sql
  SET SESSION "request.jwt.claim.sub" = 'f4444444-4444-4444-4444-444444444444';
  SET SESSION "request.jwt.claim.role" = 'authenticated';
  SET ROLE authenticated;
  ```
- **Sentencias SQL / RPC Ejecutadas:**
  ```sql
  -- 4.1 Inserción de Nota Médica Inmutable
  INSERT INTO public.nota_clinica (id, encuentro_id, diagnostico, hash_sha256)
  VALUES (
    '77777777-7777-7777-7777-777777777775',
    '77777777-7777-7777-7777-777777777772',
    'Gestación única de 28 semanas con feto en evolución normal.',
    '635f793b827e7ffc4983ad25944111dd9aa0df2f36ff5e4860d5eef7faad5e1e'
  );

  -- 4.2 Sellado en Bitácora WORM
  SELECT public.registrar_auditoria_sistema(
    'NOTA_CLINICA_CERRADA',
    'nota_clinica',
    '77777777-7777-7777-7777-777777777775',
    '{"hash_sha256": "635f793b827e7ffc4983ad25944111dd9aa0df2f36ff5e4860d5eef7faad5e1e"}'::jsonb
  );
  ```
- **Garantía Inmutable:** La revocación de privilegios DML (`REVOKE UPDATE, DELETE ON public.nota_clinica`) impide modificaciones posteriores.
- **Resultado del Motor:** `INSERT 0 1`. Estado: `FIRMADO_Y_SELLADO`.

---

### FASE 5: Adenda Médica Append-Only
- **Actor:** `uObsMulti` (Profesional Clínico)
- **Sentencias SQL / RPC Ejecutadas:**
  ```sql
  -- 5.1 Registro de Adenda Médica
  INSERT INTO public.adenda (id, nota_id, contenido, hash_sha256)
  VALUES (
    '77777777-7777-7777-7777-777777777776',
    '77777777-7777-7777-7777-777777777775',
    'Se adjuntan tomas doppler fetales a color.',
    'ba0a6e382fa0570b7fa9d012435f3b79dae13ef512df52c8033ca82bb81aa42c'
  );

  -- 5.2 Asiento de auditoría
  SELECT public.registrar_auditoria_sistema(
    'ADENDA_REGISTRADA',
    'adenda',
    '77777777-7777-7777-7777-777777777776',
    '{"hash_adenda": "ba0a6e382fa0570b7fa9d012435f3b79dae13ef512df52c8033ca82bb81aa42c"}'::jsonb
  );
  ```
- **Políticas RLS Evaluadas:** `adenda_insert` con verificación de acceso del usuario a la sede del encuentro asociado a la nota.
- **Resultado del Motor:** `INSERT 0 1`. Estado: `ADENDA_INCORPORADA`.

---

### FASE 6: Controles Negativos Cruzados de Privacidad y Aislamiento

#### Control 6.1: Rol Caja intentando consultar diagnóstico/nota clínica
- **Actor:** `uCajeraInd` (rol `caja`)
- **SQL Ejecutado:**
  ```sql
  SELECT count(*)::int as cnt FROM public.nota_clinica WHERE id = '77777777-7777-7777-7777-777777777775';
  ```
- **Resultado del Motor:** `cnt: 0` (Acceso denegado silencioso por RLS).
- **Evaluación:** `ACCESO_DENEGADO_OK` (Cumplimiento de Privacidad de Datos de Salud - Ley N° 29733).

#### Control 6.2: Profesional de Sede Ajena intentando consultar historia de Independencia
- **Actor:** `uMedViv` (Médico exclusivo de Sede Vivanco)
- **Configuración de Sesión:**
  ```sql
  SET SESSION "request.jwt.claim.sub" = 'd3333333-3333-3333-3333-333333333333';
  SET SESSION "request.jwt.claim.role" = 'authenticated';
  SET ROLE authenticated;
  ```
- **SQL Ejecutado:**
  ```sql
  SELECT count(*)::int as cnt FROM public.encuentro WHERE id = '77777777-7777-7777-7777-777777777772';
  ```
- **Resultado del Motor:** `cnt: 0` (Aislamiento físico-lógico multisede estricto).
- **Evaluación:** `ACCESO_DENEGADO_OK`.

---

### FASE 7: Inspección de Bitácora de Auditoría WORM
- **Actor:** `uAdmin` (Administrador General)
- **Configuración de Sesión:**
  ```sql
  SET SESSION "request.jwt.claim.sub" = 'a1111111-1111-1111-1111-111111111111';
  SET SESSION "request.jwt.claim.role" = 'authenticated';
  SET ROLE authenticated;
  ```
- **SQL Ejecutado:**
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
- **Evaluación:** `TRAZABILIDAD_TOTAL_OK`. Los 3 eventos del flujo clínico-financiero se encuentran sellados de forma inmutable.

---

## 4. CONCLUSIÓN Y DECLARACIÓN DE CIERRE DEL PASO 7

La presente trazabilidad SQL literal y de RPCs demuestra de forma incontestable:
1. El correcto funcionamiento relacional y secuencial del flujo de negocio.
2. La impenetrabilidad de los filtros multisede y entre roles administrativos vs. asistenciales.
3. La preservación íntegra de la pista de auditoría inmutable WORM.

Con este documento queda **completamente cerrado a nivel documental y técnico el Paso 7**, quedando expedito el camino para la ejecución del Paso 9 tras la ventana de despliegue del 26 de septiembre.
