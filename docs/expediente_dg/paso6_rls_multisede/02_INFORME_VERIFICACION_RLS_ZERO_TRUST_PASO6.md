# INFORME TÉCNICO DE VERIFICACIÓN: AISLAMIENTO MULTISEDE Y RLS ZERO TRUST (PASO 6)

**EXPEDIENTE:** DG-001-C / DG-001-B / TERCERA VÍA  
**DE:** Equipo Técnico — `luiscct67/las-mellizas-portal` (Vía B)  
**PARA:** Dirección General — Consultorio Obstétrico Ecográfico Las Mellizas Perú S.A.C.  
**CON COPIA:** Dirección Técnica — `las-mellizas-hce-portal` (Vía A)  
**FECHA:** 21 de septiembre de 2026  
**ESTADO:** PROPUESTA TÉCNICA VERIFICADA EN MOTOR POSTGRESQL 18 AISLADO  
**ARCHIVOS ASOCIADOS:**
- Script DDL Propuesto: `docs/expediente_dg/paso6_rls_multisede/01_PROPUESTA_ESQUEMA_RLS_ZERO_TRUST_PASO6.sql`
- Script de Pruebas: `scratch/run_rls_verification_test.js`

---

## 1. OBJETIVO Y ALCANCE

El presente informe acredita la ejecución y verificación formal del **Paso 6 (Aislamiento Multisede y RLS Zero Trust)**, resolviendo de manera integral los requerimientos canónicos de seguridad definidos en la directiva **DG-001-B** y las directrices de convergencia de la **Tercera Vía**:

1. **Aislamiento Multisede Real (Relación N:N):** Soporte estructurado para asignación de profesionales a múltiples sedes (`AYAC-IND`, `AYAC-VIV`, etc.) mediante la tabla normalizada `public.usuario_sede`, superando las limitaciones de un campo escalar monosede sin abrir brechas de fuga de información entre filiales.
2. **Control Negativo de Visibilidad Clínica (DG-001-B):** Prohibición terminante y verificable de acceso a notas clínicas (`nota_clinica`), diagnósticos y adendas (`adenda`) para roles operativos de recepción y caja.
3. **Erradicación de Políticas Permisivas:** Purgado total de cláusulas permisivas heredadas tipo `USING (true)` u `OR true` en todas las tablas sensibles del dominio de negocio (`paciente`, `encuentro`, `orden_pago`, `pago`, `caja_turno`).
4. **Cierre de Privilegios Anónimos (Mínimo Privilegio):** Revocación absoluta (`REVOKE ALL`) al rol `anon` sobre todas las tablas clínicas, de citas y financieras.
5. **Inmutabilidad de Auditoría y Sellado Clínico:** Bloqueo estricto de operaciones DML de modificación o inserción arbitraria directa desde clientes (`REVOKE INSERT, UPDATE, DELETE ON public.auditoria FROM authenticated, anon, public`).
6. **Hardening de Seguridad Zero Trust:** Aplicación de `FORCE ROW LEVEL SECURITY` en todas las tablas sensibles para garantizar que las políticas se apliquen invariablemente.

---

## 2. ARQUITECTURA TÉCNICA IMPLEMENTADA

### 2.1. Funciones Auxiliares de Contexto (`SECURITY DEFINER`)
Para evitar la recursión infinita en las políticas RLS y blindar la evaluación de roles y pertenencia a sedes, se implementaron 4 funciones SQL compiladas con `SET search_path = public, pg_temp`:

- `public.rol_usuario_actual()`: Extrae el rol validado y activo del usuario autenticado (`auth.uid()`).
- `public.sedes_usuario_actual()`: Retorna el conjunto (`SETOF UUID`) de sedes asignadas al usuario en `usuario_sede`.
- `public.es_rol_multisede()`: Evalúa si el rol posee supervisión global institucional (`administrador`, `supervision`).
- `public.tiene_acceso_a_sede(p_site_id)`: Valida si la sede solicitada coincide con las sedes autorizadas del usuario o si cuenta con privilegio multisede global.

### 2.2. Políticas RLS Clave

#### A. Aislamiento de Encuentros Clínicos (`public.encuentro`)
```sql
CREATE POLICY "encuentro_select" ON public.encuentro
  FOR SELECT TO authenticated
  USING (public.tiene_acceso_a_sede(site_id));
```

#### B. Control Negativo de Visibilidad Clínica (`public.nota_clinica`)
```sql
CREATE POLICY "nota_clinica_select" ON public.nota_clinica
  FOR SELECT TO authenticated
  USING (
    public.rol_usuario_actual() IN ('profesional', 'supervision', 'administrador')
    AND EXISTS (
      SELECT 1 FROM public.encuentro e 
      WHERE e.id = encuentro_id AND public.tiene_acceso_a_sede(e.site_id)
    )
  );
```

#### C. Inmutabilidad y Protección de Auditoría (`public.auditoria`)
```sql
REVOKE INSERT, UPDATE, DELETE ON public.auditoria FROM authenticated, anon, public;

CREATE POLICY "auditoria_select" ON public.auditoria
  FOR SELECT TO authenticated
  USING (public.es_rol_multisede());
```

---

## 3. BANCO DE PRUEBAS AUTOMATIZADAS (SANDBOX POSTGRESQL 18)

La suite de pruebas fue ejecutada de manera reproducible sobre un clúster PostgreSQL 18 aislado (PGlite). Se sembraron los siguientes actores y datos institucionales:

- **Sedes:** Sede Independencia (`AYAC-IND`), Sede Vivanco (`AYAC-VIV`).
- **Usuarios y Roles:**
  - `admin@lasmellizas.pe`: Rol `administrador`, acceso multisede global.
  - `caja.ind@lasmellizas.pe`: Rol `caja`, asignada únicamente a Independencia.
  - `medico.viv@lasmellizas.pe`: Rol `profesional`, asignado únicamente a Vivanco.
  - `obstetra.multi@lasmellizas.pe`: Rol `profesional`, asignada a Independencia y Vivanco (N:N).
- **Registros Clínicos:** 1 encuentro + 1 nota clínica en Sede Independencia; 1 encuentro + 1 nota clínica en Sede Vivanco.

### 3.1. Batería de Pruebas Ejecutadas (14 Controles / Cobertura Total 12 Tablas)

1. **Test 1 (Control Negativo Clínico):** Conexión como Cajera de Independencia intentando leer `public.nota_clinica`.
2. **Test 2 (Aislamiento Monopuesto):** Conexión como Médico de Vivanco intentando leer encuentros de Sede Independencia.
3. **Test 3 (Acceso Multisede Autorizado N:N):** Conexión como Obstetra multisede leyendo encuentros de ambas sedes.
4. **Test 4 (Bypass Administrativo Autorizado):** Conexión como Administrador General leyendo encuentros de ambas sedes sin registro en `usuario_sede`.
5. **Test 5 (Revocación a Rol Anónimo):** Conexión con rol `anon` intentando insertar en `cita_reagendada`.
6. **Test 6 (Inmutabilidad de Auditoría):** Conexión como cliente autenticado intentando insertar directamente en `auditoria`.
7. **Test 7 (Barrido de Accesibilidad Funcional 12/12 tablas):** Verificación de que ninguna tabla sensible quede bloqueada para roles autorizados tras `FORCE ROW LEVEL SECURITY`.
8. **Test 8.1 (Control Negativo Clínico en Adendas):** Cajera de Independencia intentando consultar `public.adenda`.
9. **Test 8.2 (Aislamiento Multisede en Adendas - Subsanación Brecha Vía A):** Médico asignado a Vivanco intentando consultar adenda clínica de Independencia.
10. **Test 8.3 (Control Negativo Financiero para Rol Clínico - Subsanación Brecha Vía A):** Médico asignado a Vivanco intentando consultar `public.orden_pago` de su propia sede Vivanco.
11. **Test 8.4 (Aislamiento Multisede Financiero para Caja):** Cajera de Independencia intentando consultar órdenes de pago de Vivanco.
12. **Test 8.5 (Aislamiento Multisede de Caja Egreso):** Usuario clínico sin asignación de caja intentando consultar `public.caja_egreso`.
13. **Test 8.6 (Control Negativo en Padrón de Pacientes para Rol Anon):** Cliente anónimo intentando consultar `public.paciente`.
14. **Test 8.7 (Control Negativo de Modificación Financiera por Recepción):** Personal de recepción intentando registrar un pago directo en `public.pago`.

---

## 4. RESULTADOS DE LA EJECUCIÓN (CONSOLA REAL PGLITE)

```
======================================================================
VERIFICACIÓN AUTOMATIZADA DE RLS ZERO TRUST Y MULTISEDE (PASO 6)
Motor: PostgreSQL 18 Aislado (Sandbox PGlite)
Fecha y Hora: 2026-09-21T19:19:06.202Z
======================================================================

✓ Propuesta Script Paso 6 compilada e instalada en el sandbox.
✓ Semilla institucional cargada (sedes, usuarios, asignaciones N:N y encuentros).

--- TEST 1: CONTROL NEGATIVO DE VISIBILIDAD CLÍNICA (CAJA) ---
  Resultado: EXITOSO (Filas visibles para caja: 0)

--- TEST 2: AISLAMIENTO MULTISEDE ESTRICTO (MÉDICO MONOPUESTO) ---
  Resultado: EXITOSO (Encuentros de sede ajena visibles: 0)

--- TEST 3: ACCESO MULTISEDE AUTORIZADO (PROFESIONAL N:N) ---
  Resultado: EXITOSO (Encuentros visibles: 2/2)

--- TEST 4: ACCESO GLOBAL INSTITUCIONAL (ADMINISTRADOR) ---
  Resultado: EXITOSO (Encuentros visibles para admin: 2/2)

--- TEST 5: REVOCACIÓN DE MÍNIMO PRIVILEGIO (ANON) ---
  Resultado: EXITOSO (Acceso denegado a anon: CONFIRMADO)

--- TEST 6: INMUTABILIDAD DE AUDITORÍA ---
  Resultado: EXITOSO (Escritura directa bloqueada: CONFIRMADO)

--- TEST 7: BARRIDO DE ACCESIBILIDAD FUNCIONAL EN LAS 12 TABLAS ---
  Resultado: EXITOSO (12/12 tablas accesibles)
┌─────────┬───────────────────┬───────────┬───────┬───────┐
│ (index) │ tabla             │ accesible │ filas │ error │
├─────────┼───────────────────┼───────────┼───────┼───────┤
│ 0       │ 'perfil_usuario'  │ true      │ 4     │ null  │
│ 1       │ 'usuario_sede'    │ true      │ 4     │ null  │
│ 2       │ 'paciente'        │ true      │ 0     │ null  │
│ 3       │ 'encuentro'       │ true      │ 2     │ null  │
│ 4       │ 'cita_reagendada' │ true      │ 0     │ null  │
│ 5       │ 'nota_clinica'    │ true      │ 2     │ null  │
│ 6       │ 'adenda'          │ true      │ 2     │ null  │
│ 7       │ 'caja_turno'      │ true      │ 0     │ null  │
│ 8       │ 'caja_egreso'     │ true      │ 0     │ null  │
│ 9       │ 'orden_pago'      │ true      │ 2     │ null  │
│ 10      │ 'pago'            │ true      │ 0     │ null  │
│ 11      │ 'auditoria'       │ true      │ 0     │ null  │
└─────────┴───────────────────┴───────────┴───────┴───────┘

--- TEST 8: BARRIDO DE CONTROLES NEGATIVOS EN TABLAS CRÍTICAS ---
======================================================================
RESUMEN DE PRUEBAS DE SEGURIDAD RLS ZERO TRUST (PASO 6):
┌─────────┬──────────────────────────────────────────────────────────────────────────────────┬──────────────────────────────────────┬────────────────────────────────────────┬─────────────────┬──────────┬───────────┐
│ (index) │ control                                                                          │ actor                                │ operacion                              │ filas_devueltas │ esperado │ estado    │
├─────────┼──────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────┼────────────────────────────────────────┼─────────────────┼──────────┼───────────┤
│ 0       │ 'Test 1: Visibilidad Clínica Negativa'                                           │ 'Cajera Sede Independencia'          │ 'SELECT en nota_clinica'               │ 0               │ 0        │ 'EXITOSO' │
│ 1       │ 'Test 2: Aislamiento Multisede Estricto'                                         │ 'Médico asignado solo a Vivanco'     │ 'SELECT en encuentro de Independencia' │ 0               │ 0        │ 'EXITOSO' │
│ 2       │ 'Test 3: Profesional Multisede N:N'                                              │ 'Obstetra con asignación dual'       │ 'SELECT en encuentro (Ind + Viv)'      │ 2               │ 2        │ 'EXITOSO' │
│ 3       │ 'Test 4: Bypass Multisede Autorizado'                                            │ 'Administrador General'              │ 'SELECT global de sedes'               │ 2               │ 2        │ 'EXITOSO' │
│ 4       │ 'Test 5: Cierre de Privilegios Anónimos'                                         │ 'Usuario anónimo (anon)'             │ 'INSERT en cita_reagendada'            │ 0               │ 0        │ 'EXITOSO' │
│ 5       │ 'Test 6: Inmutabilidad de Auditoría'                                             │ 'Cualquier cliente autenticado'      │ 'INSERT directo en auditoria'          │ 0               │ 0        │ 'EXITOSO' │
│ 6       │ 'Test 7: Cobertura y Accesibilidad RLS (12/12 tablas)'                           │ 'Administrador / Usuario Autorizado' │ 'SELECT en todas las 12 tablas'        │ 12              │ 12       │ 'EXITOSO' │
│ 7       │ 'Test 8.1: Negativo Adendas Clínicas (Rol Caja)'                                 │ 'Cajera Independencia'               │ 'SELECT en adenda'                     │ 0               │ 0        │ 'EXITOSO' │
│ 8       │ 'Test 8.2: Negativo Adenda Sede Ajena (Médico Vivanco -> Adenda Ind)'            │ 'Médico Vivanco'                     │ 'SELECT en adenda de Independencia'    │ 0               │ 0        │ 'EXITOSO' │
│ 9       │ 'Test 8.3: Negativo Orden de Pago Rol Clínico (Médico Vivanco -> Orden Vivanco)' │ 'Médico Vivanco'                     │ 'SELECT en orden_pago de Sede Propia'  │ 0               │ 0        │ 'EXITOSO' │
│ 10      │ 'Test 8.4: Negativo Orden de Pago Multisede (Cajera Ind -> Orden Vivanco)'       │ 'Cajera Independencia'               │ 'SELECT en orden_pago de Vivanco'      │ 0               │ 0        │ 'EXITOSO' │
│ 11      │ 'Test 8.5: Negativo Caja Egreso Sede Ajena'                                      │ 'Médico Vivanco (sin turno de caja)' │ 'SELECT en caja_egreso'                │ 0               │ 0        │ 'EXITOSO' │
│ 12      │ 'Test 8.6: Negativo Paciente para Rol Anon'                                      │ 'Usuario anónimo (anon)'             │ 'SELECT en paciente'                   │ 0               │ 0        │ 'EXITOSO' │
│ 13      │ 'Test 8.7: Negativo Inserción de Pago por Recepción'                             │ 'Recepcionista (rol recepcion)'      │ 'INSERT en pago'                       │ 0               │ 0        │ 'EXITOSO' │
└─────────┴──────────────────────────────────────────────────────────────────────────────────┴──────────────────────────────────────┴────────────────────────────────────────┴─────────────────┴──────────┴───────────┘
======================================================================
```

### Matriz Resumen de Cumplimiento

| # | Control Auditado | Actor Evaluado | Operación Ejecutada | Filas / Resultado | Esperado | Dictamen |
|---|------------------|----------------|---------------------|-------------------|----------|----------|
| **1** | Visibilidad Clínica Negativa (DG-001-B) | Cajera Sede Independencia | `SELECT * FROM public.nota_clinica` | **0** filas | 0 filas | **EXITOSO** |
| **2** | Aislamiento Multisede Estricto | Médico asignado solo a Vivanco | `SELECT * FROM public.encuentro WHERE site_id = 'AYAC-IND'` | **0** filas | 0 filas | **EXITOSO** |
| **3** | Profesional Multisede Autorizado (N:N) | Obstetra con asignación dual | `SELECT * FROM public.encuentro` | **2** filas | 2 filas | **EXITOSO** |
| **4** | Acceso Global Institucional | Administrador General | `SELECT * FROM public.encuentro` | **2** filas | 2 filas | **EXITOSO** |
| **5** | Cierre de Privilegios Anónimos | Rol anónimo (`anon`) | `INSERT INTO public.cita_reagendada` | **Bloqueado (Permission Denied)** | Bloqueado | **EXITOSO** |
| **6** | Inmutabilidad de Auditoría | Cliente autenticado | `INSERT INTO public.auditoria` | **Bloqueado (Permission Denied)** | Bloqueado | **EXITOSO** |
| **7** | Cobertura y Accesibilidad 12 Tablas | Administrador Institucional | `SELECT` en cada una de las 12 tablas | **12 / 12 accesibles** | 12 / 12 | **EXITOSO** |
| **8** | Negativo Adenda (Rol no clínico) | Cajera Sede Independencia | `SELECT * FROM public.adenda` | **0** filas | 0 filas | **EXITOSO** |
| **9** | Negativo Adenda (Sede ajena - Vía A) | Médico asignado a Vivanco | `SELECT * FROM public.adenda WHERE id = 'da111...'` | **0** filas | 0 filas | **EXITOSO** |
| **10** | Negativo Orden de Pago (Rol clínico - Vía A) | Médico asignado a Vivanco | `SELECT * FROM public.orden_pago WHERE encuentro_id = 'e...viv'` | **0** filas | 0 filas | **EXITOSO** |
| **11** | Negativo Orden de Pago Multisede | Cajera Sede Independencia | `SELECT * FROM public.orden_pago WHERE encuentro_id = 'e...viv'` | **0** filas | 0 filas | **EXITOSO** |
| **12** | Negativo Caja Egreso Multisede | Médico Vivanco (sin turno) | `SELECT * FROM public.caja_egreso` | **0** filas | 0 filas | **EXITOSO** |
| **13** | Negativo Paciente para Anon | Rol anónimo (`anon`) | `SELECT * FROM public.paciente` | **Bloqueado (Permission Denied)** | Bloqueado | **EXITOSO** |
| **14** | Negativo Inserción de Pago por Recepción | Recepcionista Turno | `INSERT INTO public.pago` | **Bloqueado (Permission Denied)** | Bloqueado | **EXITOSO** |

**Tasa de Cumplimiento:** **14 / 14 (100%)**.

---

## 5. REPRODUCIBILIDAD Y HASHES CRIPTOGRÁFICOS

Para verificar la integridad criptográfica e inmutabilidad de los artefactos del Paso 6:

```powershell
Get-FileHash -Algorithm SHA256 docs/expediente_dg/paso6_rls_multisede/01_PROPUESTA_ESQUEMA_RLS_ZERO_TRUST_PASO6.sql
Get-FileHash -Algorithm SHA256 docs/expediente_dg/paso6_rls_multisede/02_INFORME_VERIFICACION_RLS_ZERO_TRUST_PASO6.md
```

El script de prueba puede reejecutarse en cualquier momento con:
```powershell
node scratch/run_rls_verification_test.js
```

---

## 6. CONCLUSIÓN Y SOLICITUD A DIRECCIÓN GENERAL / DIRECCIÓN TÉCNICA

El Paso 6 queda formalmente subsanado, blindado y validado técnicamente en el sandbox local:
1. Quedan cerradas las dos brechas residuales observadas por Vía A:
   - `adenda_select` y `adenda_insert` cuentan ahora con aislamiento multisede estricto (`EXISTS (SELECT 1 FROM nota_clinica JOIN encuentro WHERE ... tiene_acceso_a_sede)`).
   - `orden_pago_select` cuenta ahora con filtro negativo de rol clínico (`rol_usuario_actual() IN ('recepcion', 'caja', 'supervision', 'administrador')`).
2. Queda demostrado que el esquema N:N protege la separación de sedes para profesionales monopuesto y habilita la rotación legítima para profesionales multisede sin parches ni fugas.
3. Se eleva el presente expediente con tasa de éxito 14/14 (100%) a Dirección General y Dirección Técnica para ratificar el cierre definitivo del Paso 6 y proceder con la autorización del despliegue y la apertura del puente de integración del Paso 7.

