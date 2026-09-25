# ADR-005 — Homologación de Nomenclatura del Esquema: Núcleo en Español

**Proyecto:** `las-mellizas-hce-portal` (DG-002, Ciclo 4)  
**Fecha de decisión:** 22 de septiembre de 2026  
**Decide:** Dirección Técnica de Vía A, por delegación de Dirección General, cerrando el Paso 5 del método de convergencia de 9 pasos.  
**Estado:** DECIDIDO — pendiente de ejecución técnica (ver Sección 5).  
**Registro Institucional:** Expediente Técnico Dirección General — Consultorio Obstétrico Ecográfico Las Mellizas Perú S.A.C.  

---

## 1. Contexto

El esquema de este repositorio nació en inglés (`organizations`, `sites`, `professionals`, `patients`, `appointment_requests`, `encounters`, `documents`, `consents`, `communications`, `audit_log` — Paso 1, migración `0001_init_schema.sql`), mientras que Vía B construyó el suyo consistentemente en español desde el inicio (`paciente`, `encuentro`, `orden_pago`, etc.). Esta discrepancia fue señalada como hallazgo de fondo en la comparativa adversarial v2, y Vía B propuso formalmente («Propuesta de Homologación de Nomenclatura, Paso 5») un núcleo en español con vistas de compatibilidad en inglés para no romper su propio frontend.

Un dato relevante que no estaba explícito al recibir esa propuesta: **desde el Paso 2 en adelante, este mismo repositorio ya viene nombrando toda tabla nueva en español** — `coincidencias_pacientes` (Paso 2), `notas_clinicas`/`notas_clinicas_adendas` (Paso 3), `caja_turnos`/`ordenes_pago`/`pagos`/`caja_egresos` (Paso 4). Es decir, la inconsistencia real no es "inglés vs. español entre las dos vías" — es que **este propio repositorio ya está dividido internamente entre las 10 tablas originales del Paso 1 (inglés) y todo lo construido después (español)**.

## 2. Decisión

**Se adopta el español como la única convención de nomenclatura de tablas para este esquema, de forma retroactiva y hacia adelante.** Las 10 tablas del Paso 1 se renombran a su equivalente en español antes de iniciar el Paso 5 funcional propio de este repositorio (Agenda), para no seguir acumulando el mismo tipo de deuda que motivó esta decisión.

| Nombre actual (inglés) | Nombre nuevo (español) |
|---|---|
| `organizations` | `organizaciones` |
| `sites` | `sedes` |
| `professionals` | `profesionales` |
| `patients` | `pacientes` |
| `appointment_requests` | `solicitudes_cita` |
| `encounters` | `encuentros` |
| `documents` | `documentos` |
| `consents` | `consentimientos` |
| `communications` | `comunicaciones` |
| `audit_log` | `auditoria` |

**Se descarta la alternativa de vistas de compatibilidad bilingües** (la técnica que sí es correcta y que se reconoce como válida en la propuesta de Vía B) porque aquí no aplica el motivo que la justifica allá: Vía B necesitaba no romper un frontend ajeno que no controla en esta decisión. Este repositorio es de un solo equipo, sin datos reales todavía, con una suite de CI que verifica cada cambio — el costo de renombrar una vez, ahora, es menor que el costo permanente de mantener dos nombres para cada entidad indefinidamente. Una vista de compatibilidad aquí sería postergar el problema, no resolverlo.

## 3. Qué NO cambia — identificadores mandatados por DG-001-C

Las columnas de identificador transversal exigidas por DG-001-C (`organization_id`, `site_id`, `patient_id`, `encounter_id`, `document_id`, `legacy_hc_id`, `source_system_id`, y sus equivalentes de clave foránea) **se mantienen exactamente como están** — estas no son una elección de nomenclatura libre de este equipo, son un mandato de gobernanza explícito, independiente del idioma en que se llame la tabla que las contiene. Esta decisión es de nivel tabla/entidad, no de columna: no se homologan aquí los demás nombres de columna (por ejemplo `first_name`, `last_name`, `date_of_birth` de `patients`/`pacientes`), dado que tocar esas columnas obliga a revisar cada política RLS, cada función `SECURITY DEFINER` y cada componente de la aplicación que las referencia — un costo y una superficie de riesgo mucho mayor, sin un beneficio proporcional al del renombrado de tablas. Queda como mejora opcional de menor prioridad, no como parte de este cierre.

## 4. Por qué esto cierra el Paso 5 del método de convergencia

El Paso 5 (nomenclatura homologada, aprobada por DG) queda decidido con esta ADR. No se adopta literalmente la propuesta de Vía B (vistas bilingües), pero sí su principio de fondo (núcleo único en español) — de hecho con un compromiso más fuerte, porque aquí se resuelve por renombrado real, no por una capa de compatibilidad adicional. Esto no afecta ni retrasa nada de lo ya cerrado con Vía B (Pasos 1-9 son independientes de cómo cada repositorio nombra sus propias tablas internamente) y no requiere comunicación ni acuerdo de Vía B — es una decisión interna de este repositorio.

## 5. Ejecución — qué falta, en el orden correcto

Renombrar una tabla en PostgreSQL (`ALTER TABLE ... RENAME TO ...`) no rompe las políticas RLS ni los triggers ya asociados (siguen ligados por OID, no por nombre), pero **sí puede romper cualquier función `SECURITY DEFINER` o cuerpo de política que mencione el nombre viejo como texto SQL literal** (por ejemplo, una función que hace `SELECT ... FROM patients ...` dentro de su cuerpo). Antes de escribir la migración de renombrado, es necesario releer el SQL real y vigente de las migraciones `0002` a `0005` (no las descripciones narrativas ya archivadas) para identificar cada función/política que referencia alguna de las 10 tablas por nombre, y redefinirla en la misma migración con el nombre nuevo. Ejecutar este renombrado sin ese paso previo generaría errores en tiempo de ejecución («relation "patients" does not exist»), exactamente el tipo de evidencia-antes-que-narrativa que este proceso le ha exigido a Vía B en cada ronda — corresponde aplicarnos el mismo estándar a nosotros mismos.

En paralelo, toda la capa de aplicación (Server Actions y componentes de página de los Pasos 1-4) que invoca `.from('patients')`, `.from('encounters')`, etc. vía `supabase-js` necesita actualizarse al nombre nuevo, y `database.types.ts` debe regenerarse desde Supabase Studio después de aplicar la migración — siguiendo el mismo protocolo ya establecido desde el Paso 2 (copiar el archivo real y completo, no reconstruirlo a mano).

**Este trabajo se inicia a continuación, como el próximo paso de ejecución de este mismo repositorio, con la misma disciplina de verificación por CI ya usada en los Pasos 1-4** — no se ejecuta a ciegas sobre las descripciones ya archivadas de las funciones existentes.
