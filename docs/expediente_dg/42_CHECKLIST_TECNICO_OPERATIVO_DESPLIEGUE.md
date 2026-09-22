# CHECKLIST TÉCNICO OPERATIVO PASO A PASO: PASE A PRODUCCIÓN (DDL PASO 6 ZERO TRUST)

**PROYECTO:** `las-mellizas-portal` (Vía B) / Proyecto Supabase `oepctyamffehjhhuxiqo` (`main` / `PRODUCTION`)  
**RESPONSABLE DE EJECUCIÓN:** Dirección Técnica — `luiscct67/las-mellizas-portal` (Vía B)  
**VEEDORES TÉCNICOS:** Dirección Técnica — `las-mellizas-hce-portal` (Vía A) y Dirección General  
**VENTANA BASE:** Sábado 26 de septiembre de 2026, 22:00 hrs PET (Fecha modular y adaptable ante reprogramación)  
**DURACIÓN ESTIMADA:** 60 - 90 minutos  
**ESTADO DE REFERENCIA:** Schema Freeze Vigente  

---

## 1. ESPECIFICACIÓN DEL ARTEFACTO DDL A DESPLEGAR

* **Archivo Oficial Certificado:** `docs/expediente_dg/paso6_rls_multisede/01_PROPUESTA_ESQUEMA_RLS_ZERO_TRUST_PASO6.sql`
* **Hash Criptográfico SHA-256 (64 caracteres):**
  ```text
  4a4ba4366e5238e80044af720b433d56e8ab5662577e3d0c787236dc73b174c8
  ```
* **Alcance Estructural:**
  - 16 tablas del esquema `public` protegidas con `ENABLE` y `FORCE ROW LEVEL SECURITY`.
  - Barrido dinámico previo de políticas legacy (Sección 4.5).
  - Políticas Zero Trust basadas en roles institucionales y aislamiento multisede (`usuario_sede`).
  - Creación de tabla `usuario_sede` y funciones auxiliares de seguridad (`rol_usuario_actual`, `tiene_acceso_a_sede`).

---

## 2. ETAPAS CRONOLÓGICAS DEL DESPLIEGUE

```
[ T - 60 min ] ──► [ T - 15 min ] ──► [ T = 00 min ] ──► [ T + 10 min ] ──► [ T + 20 min ] ──► [ T + 30 min ] ──► [ T + 45 min ]
Verificación     Backup Lógico      Apertura Ventana   Ejecución DDL      Portero Caliente    Smoke Tests E2E    Cierre y Acta
Pre-vuelo        Preventivo (Full)  y Aviso Mesa       Oficial Paso 6     (0 Filas)           Multisede          de Conformidad
```

---

### ETAPA I: PREPARACIÓN Y VERIFICACIÓN PRE-VUELO (T - 60 MIN)

| Paso | Acción | Comando / Procedimiento | Responsable | Validación Esperada | Check |
| :---: | :--- | :--- | :---: | :--- | :---: |
| **1.1** | Confirmación de Conectividad | Ingreso al Dashboard de Supabase (`oepctyamffehjhhuxiqo`) y apertura del SQL Editor. | Vía B | Acceso fluido a consola y motor PostgreSQL. | [ ] |
| **1.2** | Verificación de Schema Freeze | Revisar historial de migraciones / auditoría para asegurar que no hubo DDLs no autorizados. | Vía B | Cero cambios de esquema desde la ratificación. | [ ] |
| **1.3** | Integridad del Archivo DDL | Verificar localmente el hash SHA-256 del archivo SQL antes de copiarlo: `Get-FileHash docs/expediente_dg/paso6_rls_multisede/01_PROPUESTA_ESQUEMA_RLS_ZERO_TRUST_PASO6.sql` | Vía B | Hash idéntico a `4a4ba4366e5238e80044af720b433d56e8ab5662577e3d0c787236dc73b174c8`. | [ ] |
| **1.4** | Notificación de Inicio | Notificar a Vía A y Dirección General vía canal acordado el inicio de la fase de preparación. | Vía B | Mesa técnica en línea para seguimiento. | [ ] |

---

### ETAPA II: RESPALDO LÓGICO DE SEGURIDAD PREVENTIVO (T - 15 MIN)

Dado que el entorno opera bajo el modelo Free Tier durante los 90 días de evaluación (sin PITR automatizado continuo), este respaldo previo es un **requisito de seguridad mandatorio**:

| Paso | Acción | Procedimiento | Responsable | Validación Esperada | Check |
| :---: | :--- | :--- | :---: | :--- | :---: |
| **2.1** | Export Lógico Completo de Esquema y Datos | Ejecutar volcado de seguridad mediante CLI / pg_dump o export del SQL Editor: `pg_dump -h db.oepctyamffehjhhuxiqo.supabase.co -U postgres -d postgres --clean --if-exists > backup_pre_despliegue_YYYYMMDD_HHMM.sql` | Vía B | Archivo SQL generado y guardado en almacenamiento seguro local. | [ ] |
| **2.2** | Conteo de Línea Base Pre-Despliegue | Ejecutar consulta rápida de recuento de filas en las 15 tablas preexistentes. | Vía B | Tabla de recuentos guardada para contraste post-despliegue. | [ ] |

---

### ETAPA III: EJECUCIÓN TRANSACCIONAL DEL DDL (T = 00 MIN A T + 15 MIN)

| Paso | Acción | Sentencias / Procedimiento | Responsable | Validación Esperada | Check |
| :---: | :--- | :--- | :---: | :--- | :---: |
| **3.1** | Apertura de Transacción | En el SQL Editor de Supabase, pegar el contenido completo de `01_PROPUESTA_ESQUEMA_RLS_ZERO_TRUST_PASO6.sql`. Asegurar que inicia con `BEGIN;` y finaliza con `COMMIT;`. | Vía B | Script completo cargado en el editor. | [ ] |
| **3.2** | Ejecución en Caliente | Presionar **RUN** en el SQL Editor de Supabase. | Vía B | Tiempo de ejecución estimado: 3 a 7 segundos. | [ ] |
| **3.3** | Validación de Resultado de Ejecución | Verificar que la consola devuelva: `Success. No rows returned` o mensajes `NOTICE: Eliminada política...`. | Vía B | **Cero errores de ejecución (0 syntax errors, 0 relation errors).** | [ ] |

---

### ETAPA IV: COMPROBACIÓN DEL PORTERO ZERO TRUST (T + 15 MIN A T + 25 MIN)

**Criterio de Aceptación Crítico y Mandatorio:** El Portero debe devolver **EXACTAMENTE 0 FILAS**.

| Paso | Acción | Consulta SQL Literal a Ejecutar | Responsable | Validación Esperada | Check |
| :---: | :--- | :--- | :---: | :--- | :---: |
| **4.1** | Ejecución de Consulta del Portero | ```sql SELECT schemaname, tablename, policyname, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'public'   AND (qual = 'true' OR with_check = 'true'); ``` | Vía B | **Devuelve 0 filas (Zero Trust Total).** Ninguna política permisiva abierta. | [ ] |
| **4.2** | Captura de Pantalla y Log | Tomar captura de pantalla de la salida del SQL Editor y copiar el texto literal del resultado. | Vía B | Evidencia gráfica y textual almacenada. | [ ] |
| **4.3** | Verificación de 16 Tablas RLS | ```sql SELECT tablename, rowsecurity, forcerowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename; ``` | Vía B | 16/16 tablas con `rowsecurity = true` y `forcerowsecurity = true`. | [ ] |

---

### ETAPA V: PRUEBAS DE HUMO (SMOKE TESTS) DE NAVEGACIÓN Y MULTISEDE (T + 25 MIN A T + 45 MIN)

| Paso | Prueba | Procedimiento de Verificación | Responsable | Resultado Esperado | Check |
| :---: | :--- | :--- | :---: | :--- | :---: |
| **5.1** | Acceso Recepción Independencia | Iniciar sesión en la app web con rol `recepcion` asignado a Independencia. Visualizar lista de pacientes y agendar cita. | Vía B | Carga de agenda correcta; pacientes de Independencia visibles. | [ ] |
| **5.2** | Aislamiento Multisede Estricto | Iniciar sesión con profesional asignado exclusivamente a Vivanco. Intentar consultar atenciones de Independencia. | Vía B | Acceso bloqueado silenciosamente (0 registros mostrados). | [ ] |
| **5.3** | Cobro en Caja | Iniciar sesión con rol `caja` en Independencia. Generar ticket y cobrar orden de pago. | Vía B | Pago registrado exitosamente; orden marcada como `PAGADO`. | [ ] |
| **5.4** | Sellado Clínico Inmutable | Iniciar sesión con obstetra. Registrar atención médica con diagnóstico. | Vía B | Nota guardada; intento de modificación bloqueado por políticas RLS. | [ ] |
| **5.5** | Bitácora de Auditoría WORM | Consultar tabla `public.auditoria` como administrador. | Vía B | Los 3 eventos del flujo (orden, pago, nota) asentados cronológicamente. | [ ] |

---

### ETAPA VI: CIERRE DE VENTANA Y ACTA FORMAL (T + 45 MIN A T + 60 MIN)

| Paso | Acción | Procedimiento | Responsable | Validación Esperada | Check |
| :---: | :--- | :--- | :---: | :--- | :---: |
| **6.1** | Emisión de Reporte Inmediato | Enviar por correo institucional / chat técnico el reporte con la captura y salida del Portero en 0 filas a Dirección Técnica (Vía A) y Dirección General. | Vía B | Vía A y DG reciben la evidencia en caliente. | [ ] |
| **6.2** | Declaración de Cierre Exitoso | Formalizar el cierre de la ventana de mantenimiento y habilitar el sistema para las operaciones de la siguiente semana. | Vía B y Vía A | Sistema en línea y 100% operativo en producción. | [ ] |

---

## 3. PROTOCOLO DE CONTINGENCIA Y ROLLBACK (PLAN B)

Si durante la Etapa III o IV ocurriera un error irrecuperable o el Portero arrojara políticas abiertas que no pudieran resolverse en 15 minutos:

1. **Aborto Inmediato:**
   Si la transacción sigue abierta: ejecutar `ROLLBACK;`.
2. **Restauración desde Respaldo Preventivo:**
   Si la transacción ya se completó pero se detecta inconsistencia crítica:
   - Ejecutar la restauración del archivo `backup_pre_despliegue_YYYYMMDD_HHMM.sql` generado en el Paso 2.1.
3. **Notificación:**
   Informar inmediatamente a Dirección General y Dirección Técnica de Vía A:
   - "Despliegue abortado / Rollback ejecutado limpiamente. Base de datos restablecida a su estado previo sin pérdida de datos. Se reprogramará la ventana".
