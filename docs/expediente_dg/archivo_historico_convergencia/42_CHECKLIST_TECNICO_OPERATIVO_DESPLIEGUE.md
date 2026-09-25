# CHECKLIST TÉCNICO OPERATIVO MINUTO A MINUTO: PASE A PRODUCCIÓN (DDL PASO 6 ZERO TRUST)

**PROYECTO:** `las-mellizas-portal` (Vía B - Ecosistema Canónico Definitivo)  
**PROYECTO SUPABASE:** `oepctyamffehjhhuxiqo` (`PRODUCTION` / Free Tier 90 Días)  
**CUSTODIO OFICIAL INSTITUCIONAL:** `admin@lasmellizasperu.com`  
**RESPONSABLE DE EJECUCIÓN:** Dirección Técnica — `luiscct67/las-mellizas-portal`  
**VEEDORES TÉCNICOS:** Dirección General y Veeduría Técnica de Convergencia  
**VENTANA OFICIAL:** Sábado 26 de septiembre de 2026, 22:00 hrs PET  
**DURACIÓN TOTAL PROGRAMADA:** 60 minutos (22:00 a 23:00 hrs)  
**ESTADO DE REFERENCIA:** Schema Freeze Activo  

---

## 1. ESPECIFICACIÓN DEL ARTEFACTO DDL A DESPLEGAR

* **Archivo Oficial Certificado:** `docs/expediente_dg/paso6_rls_multisede/01_PROPUESTA_ESQUEMA_RLS_ZERO_TRUST_PASO6.sql`
* **Hash Criptográfico SHA-256 (Inmutable y Obligatorio):**
  ```text
  4a4ba4366e5238e80044af720b433d56e8ab5662577e3d0c787236dc73b174c8
  ```
* **Alcance Estructural del DDL:**
  1. Creación de tabla `usuario_sede` (relación N:N para cobertura multisede institucional).
  2. Implementación de 4 funciones de gobernanza `SECURITY DEFINER` con `search_path` aislado (`rol_usuario_actual`, `sedes_usuario_actual`, `es_rol_multisede`, `tiene_acceso_a_sede`).
  3. Revocación absoluta de permisos al rol anónimo (`anon`) en las 16 tablas.
  4. Barrido dinámico automático de las 9 políticas legacy abiertas detectadas previamente.
  5. Blindaje de las 16 tablas con `ENABLE ROW LEVEL SECURITY` y políticas Zero Trust.
  6. Inmutabilidad estricta de auditoría (`REVOKE INSERT, UPDATE, DELETE ON auditoria FROM authenticated, anon, public`).

---

## 2. CRONOGRAMA MINUTO A MINUTO (SÁBADO 26 DE SEPTIEMBRE)

```
[ 21:00 PET ] ────► [ 21:45 PET ] ────► [ 22:00 PET ] ────► [ 22:15 PET ] ────► [ 22:30 PET ] ────► [ 22:45 PET ] ────► [ 23:00 PET ]
T-60 min:           T-15 min:           T = 00 min:         T+15 min:           T+30 min:           T+45 min:           T+60 min:
Verificación        Respaldo Lógico     Apertura Ventana    Ejecución DDL       Portero Zero        Smoke Tests         Cierre de Ventana
Pre-vuelo           Local a Costo $0    y Aviso a Mesa      Paso 6 (Transacc.)  Trust (0 Filas)     E2E en Vivo         y Acta de Éxito
```

---

### ETAPA I: PREPARACIÓN Y VERIFICACIÓN PRE-VUELO (21:00 a 21:45 hrs / T - 60 min)

| Hora | Paso | Acción Operativa | Procedimiento / Comando | Validación Esperada | Check |
| :---: | :---: | :--- | :--- | :--- | :---: |
| **21:00** | **1.1** | Confirmación de Conectividad | Ingreso autenticado al Dashboard de Supabase con `admin@lasmellizasperu.com`. Acceder al SQL Editor. | Acceso fluido a consola y motor PostgreSQL de `oepctyamffehjhhuxiqo`. | [ ] |
| **21:15** | **1.2** | Verificación de Schema Freeze | Confirmar que ningún colaborador ni proceso haya alterado tablas o vistas desde la última certificación. | Cero modificaciones no autorizadas en el historial. | [ ] |
| **21:30** | **1.3** | Integridad Criptográfica del DDL | Ejecutar verificación de hash local: `Get-FileHash docs/expediente_dg/paso6_rls_multisede/01_PROPUESTA_ESQUEMA_RLS_ZERO_TRUST_PASO6.sql` | Hash **idéntico**: `4a4ba436...`. Si difiere en 1 solo caracter: **ABORTAR**. | [ ] |
| **21:40** | **1.4** | Notificación de Apertura | Emitir aviso breve en el canal de coordinación: *"Iniciando etapa preparatoria de la ventana de mantenimiento del 26-sep"*. | Mesa directiva notificada. | [ ] |

---

### ETAPA II: RESPALDO LÓGICO DE SEGURIDAD PREVENTIVO A COSTO $0 (21:45 a 22:00 hrs / T - 15 min)

En cumplimiento de la directiva de Dirección General (Régimen de 90 Días de Preproducción a Costo $0 sin suscripciones de pago), este respaldo en frío es **mandatorio antes de cualquier mutación del motor**:

| Hora | Paso | Acción Operativa | Procedimiento / Comando | Validación Esperada | Check |
| :---: | :---: | :--- | :--- | :--- | :---: |
| **21:45** | **2.1** | Ejecución de Respaldo Local | En terminal local del proyecto ejecutar: `node scripts/backup_diario_supabase.mjs` | Extracción de datos y generación de `VOLCADO_RESTAURABLE_*.sql` y `MANIFEST_*.json` en carpeta `/backups/`. | [ ] |
| **21:55** | **2.2** | Verificación del Manifiesto | Abrir el manifiesto generado y verificar que las tablas activas registraron su recuento correspondiente. | Manifiesto íntegro guardado localmente como salvaguarda de rollback. | [ ] |

---

### ETAPA III: EJECUCIÓN TRANSACCIONAL DEL DDL PASO 6 (22:00 a 22:15 hrs / T = 00 min)

| Hora | Paso | Acción Operativa | Procedimiento / Sentencias | Validación Esperada | Check |
| :---: | :---: | :--- | :--- | :--- | :---: |
| **22:00** | **3.1** | Carga en SQL Editor | Copiar el contenido exacto de `01_PROPUESTA_ESQUEMA_RLS_ZERO_TRUST_PASO6.sql` en una nueva pestaña del SQL Editor de Supabase. | El script completo (543 líneas) está pegado en el editor. | [ ] |
| **22:05** | **3.2** | Ejecución en Caliente | Presionar el botón **RUN** en Supabase. | Ejecución toma entre 3 y 8 segundos. | [ ] |
| **22:10** | **3.3** | Validación de Errores | Inspeccionar la salida inferior del editor. | `Success. No rows returned` y mensajes de eliminación de políticas obsoletas. **Cero errores.** | [ ] |

---

### ETAPA IV: COMPROBACIÓN CRÍTICA DEL PORTERO ZERO TRUST (22:15 a 22:30 hrs / T + 15 min)

> [!CRITICAL]
> **CRITERIO INNEGOCIABLE DE ACEPTACIÓN:** La consulta del Portero debe devolver **EXACTAMENTE 0 FILAS**. Si devuelve 1 o más filas con `true`, el despliegue no está concluido.

| Hora | Paso | Consulta SQL Literal | Resultado Esperado | Check |
| :---: | :---: | :--- | :--- | :---: |
| **22:15** | **4.1** | ```sql SELECT schemaname, tablename, policyname, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'public'   AND (qual = 'true' OR with_check = 'true'); ``` | **EXACTAMENTE 0 FILAS (Zero Trust Total).** | [ ] |
| **22:20** | **4.2** | ```sql SELECT tablename, rowsecurity, forcerowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename; ``` | Las 16 tablas con `rowsecurity = true` y `forcerowsecurity = true`. | [ ] |
| **22:25** | **4.3** | Registro de Evidencia | Tomar captura de pantalla nítida con fecha/hora de la consola mostrando 0 filas en el Portero. Guardarla en `docs/expediente_dg/`. | Evidencia gráfica archivada para la mesa técnica. | [ ] |

---

### ETAPA V: PRUEBAS DE HUMO (SMOKE TESTS) EN PRODUCCIÓN (22:30 a 22:45 hrs / T + 30 min)

| Hora | Paso | Prueba en Vivo (`https://las-mellizas-portal.vercel.app`) | Resultado Esperado | Check |
| :---: | :---: | :--- | :--- | :---: |
| **22:30** | **5.1** | Acceso Cajera / Recepción en Sede Independencia | Login con credencial oficial del padrón. Acceso a Módulo de Administración. Lista de espera visible. | Acceso concedido; cero alertas de RLS. | [ ] |
| **22:35** | **5.2** | Verificación de Aislamiento Clínico Negativo | Con usuario de caja, intentar consultar notas clínicas asistenciales. | Acceso denegado a nivel de base de datos (0 registros devueltos). | [ ] |
| **22:40** | **5.3** | Acceso Profesional Obstetra / Médico | Login con credencial clínica en Sede Independencia. Acceso a Consultorio HCE. | Carga de historia clínica, plantillas y selector de diagnóstico CIE-10. | [ ] |

---

### ETAPA VI: CIERRE DE VENTANA Y ACTA DE CONFORMIDAD (22:45 a 23:00 hrs / T + 45 min)

| Hora | Paso | Acción Operativa | Resultado Esperado | Check |
| :---: | :---: | :--- | :--- | :---: |
| **22:45** | **6.1** | Notificación de Éxito | Enviar mensaje formal a Dirección General con la captura de las 0 filas del Portero: *"Ventana culminada con éxito al 100%. Base de datos blindada en Zero Trust y 16/16 tablas aseguradas"*. | Conformidad emitida. | [ ] |
| **23:00** | **6.2** | Cierre Formal | Salida del SQL Editor y activación del sistema en modo operativo para la apertura del Lunes 28 de Septiembre. | Ecosistema listo para atención a pacientes. | [ ] |

---

## 3. PROTOCOLO DE CONTINGENCIA Y ROLLBACK (PLAN DE EMERGENCIA)

En caso de que en la Etapa III o IV ocurra un fallo que no pueda subsanarse en 10 minutos:

1. **Si la transacción sigue abierta en consola:** Ejecutar `ROLLBACK;` de inmediato.
2. **Si el DDL se aplicó parcialmente o causó bloqueo irrecuperable:**
   * Abrir el archivo `backups/YYYY-MM-DD/VOLCADO_RESTAURABLE_*.sql` generado en el Paso 2.1.
   * Pegar y ejecutar en el SQL Editor para restaurar el estado íntegro previo.
3. **Notificación de Contingencia:**
   * Informar a Dirección General: *"Despliegue abortado preventivamente. Se ejecutó Rollback limpio con el respaldo de las 21:45. Ningún dato fue alterado. El sistema continúa en estado pre-ventana"*.

---

*Documento técnico de control operativo aprobado para la Dirección General de Consultorio Obstétrico Ecográfico Las Mellizas Perú S.A.C.*
