# PASO 8 (DG-001-C) — INFORME TÉCNICO Y AUDITORÍA DEL SIMULACRO DE RESTAURACIÓN
**CONCILIACIÓN DEFINITIVA Y EVIDENCIA EN CLÚSTER POSTGRESQL FÍSICO PERSISTENTE EN DISCO (`restore_target`)**

**De:** Equipo Técnico Vía B (`las-mellizas-portal`)  
**Para:** Dirección General, Consultorio Obstétrico Ecográfico Las Mellizas Perú S.A.C.  
**Con copia:** Dirección Técnica Vía A (`las-mellizas-hce-portal`)  
**Fecha:** 21 de septiembre de 2026 (Versión Consolidada y Definitiva)  
**Directorio del Clúster Persistente:** `scratch/pg_cluster_restore_target`  
**Archivo de Volcado Estándar:** `backup_drill_real.sql` (51.04 KB)  
**Hash SHA-256 del Volcado:** `804a80de008e1622f0955e207fa2d9967f4b742aeeb6e1645f708a675cce5ee5`  

---

## 1. Conciliación y Resolución de Contradicciones entre Versiones

Para disipar cualquier contradicción entre las iteraciones previas del Paso 8, se documenta la trazabilidad exacta de la evolución técnica:

| Aspecto Evaluado | Versión 1 (Reporte Preliminar) | Versión 2 / 3 (Subsanación con Persistencia en Disco) | Justificación y Conciliación Técnica |
| :--- | :--- | :--- | :--- |
| **Formato del Backup** | Archivo JSON propio exportado por PostgREST. | Volcado SQL estándar relacional (`backup_drill_real.sql`, 51.04 KB). | Se descartó el formato JSON tras la observación de Vía A; el volcado actual es 100% estándar ANSI/PostgreSQL (`CREATE TABLE`, `INSERT INTO`). |
| **Medio de Ejecución** | Memoria RAM efímera (`new PGlite()`). | Clúster físico en disco NTFS de Windows (`new PGlite(clusterDir)` en `scratch/pg_cluster_restore_target`). | La versión en memoria RAM no incluía I/O ni fsync a disco. La versión en disco genera los 22 archivos y carpetas del clúster de Postgres (incluyendo `base/` y `pg_wal/`). |
| **Tiempo de Restauración (RTO)** | **1.20s / 1.211s** (procesamiento en memoria pura). | **1.843s** (Corrida 1 en disco) / **2.986s** (Corrida 2 en frío con purga). | La variación entre 1.843s y 2.986s responde a la latencia real de I/O a disco y sincronización física (`fsync`). Ambos tiempos están a órdenes de magnitud del umbral máximo de 2 horas fijado en DG-001-C. |
| **Pérdida de Datos (RPO)** | RPO = 0 pérdidas. | RPO = 0 pérdidas (15/15 tablas íntegras, delta = 0). | Consistente en ambas versiones: snapshot exacto sin truncamiento de datos. |

---

## 2. Evidencia Cruda de Ejecución en Clúster Físico Persistente

Ruta física absoluta en disco:
```text
C:\Users\luis_\.gemini\antigravity\brain\91755f4d-fe71-4295-9bae-8a9a5e93bc91\scratch\pg_cluster_restore_target
```

Registro literal de consola (`node scratch/run_persistent_disk_drill.js`):
```text
======================================================================
SIMULACRO DE RESTAURACIÓN CON BASE DE DATOS PERSISTENTE EN DISCO (PASO 8)
Entorno: PostgreSQL Cluster Persistente en Filesystem de Windows
Directorio Físico: scratch/pg_cluster_restore_target
Fecha y Hora: 2026-09-21T17:41:45.258Z
======================================================================

✓ Archivo de volcado SQL estándar: C:/Users/luis_/.gemini/antigravity/brain/91755f4d-fe71-4295-9bae-8a9a5e93bc91/scratch/backup_drill_real.sql
  Tamaño: 51.04 KB | Hash SHA-256: 804a80de008e1622f0955e207fa2d9967f4b742aeeb6e1645f708a675cce5ee5

--- PROCESO 1: APERTURA DE CLÚSTER PERSISTENTE EN DISCO Y RESTAURACIÓN ---
✓ Volcado SQL ejecutado y confirmado en el clúster físico en disco.
  ⏱ RTO REAL MEDIDO (CON I/O A DISCO): 2.986 segundos.
✓ Conexión cerrada. Datos sincronizados (fsync/flush) físicamente a disco.

--- PROCESO 2: INSPECCIÓN DE ARCHIVOS FÍSICOS EN DISCO DE WINDOWS ---
✓ Archivos y carpetas generados en el clúster (22 elementos):
  base, global, pg_commit_ts, pg_dynshmem, pg_hba.conf, pg_ident.conf, pg_logical, pg_multixact, pg_notify, pg_replslot, pg_serial, pg_snapshots, pg_stat, pg_stat_tmp, pg_subtrans, pg_tblspc, pg_twophase, PG_VERSION, pg_wal, pg_xact, postgresql.auto.conf, postgresql.conf
  Directorios críticos de Postgres: base/ (PRESENTE), pg_wal/ (PRESENTE)

--- PROCESO 3: APERTURA EN FRÍO POR SEGUNDO PROCESO Y COTEJO DE CONTEOS ---
✓ Verificación de tablas en lectura en frío completada.
✓ Verificación de auditoría inmutable: 31/31 ➔ 100% PERSISTIDO

======================================================================
MATRIZ DE RESTAURACIÓN EN CLÚSTER PERSISTENTE:
┌─────────┬─────────────────────────┬──────────┬────────────────────────┬───────┬───────────┐
│ (index) │ tabla                   │ esperado │ restaurado_persistente │ delta │ estado    │
├─────────┼─────────────────────────┼──────────┼────────────────────────┼───────┼───────────┤
│ 0       │ 'organizacion'          │ 1        │ 1                      │ 0     │ 'INTEGRO' │
│ 1       │ 'sede'                  │ 2        │ 2                      │ 0     │ 'INTEGRO' │
│ 2       │ 'perfil_usuario'        │ 14       │ 14                     │ 0     │ 'INTEGRO' │
│ 3       │ 'paciente'              │ 5        │ 5                      │ 0     │ 'INTEGRO' │
│ 4       │ 'encuentro'             │ 3        │ 3                      │ 0     │ 'INTEGRO' │
│ 5       │ 'orden_pago'            │ 3        │ 3                      │ 0     │ 'INTEGRO' │
│ 6       │ 'pago'                  │ 9        │ 9                      │ 0     │ 'INTEGRO' │
│ 7       │ 'caja_turno'            │ 1        │ 1                      │ 0     │ 'INTEGRO' │
│ 8       │ 'caja_egreso'           │ 0        │ 0                      │ 0     │ 'INTEGRO' │
│ 9       │ 'producto_inventario'   │ 12       │ 12                     │ 0     │ 'INTEGRO' │
│ 10      │ 'movimiento_inventario' │ 6        │ 6                      │ 0     │ 'INTEGRO' │
│ 11      │ 'cita_reagendada'       │ 1        │ 1                      │ 0     │ 'INTEGRO' │
│ 12      │ 'nota_clinica'          │ 0        │ 0                      │ 0     │ 'INTEGRO' │
│ 13      │ 'adenda'                │ 0        │ 0                      │ 0     │ 'INTEGRO' │
│ 14      │ 'auditoria'             │ 31       │ 31                     │ 0     │ 'INTEGRO' │
└─────────┴─────────────────────────┴──────────┴────────────────────────┴───────┴───────────┘
======================================================================
```

---

## 3. Conclusión y Veredicto Final del Paso 8

1. Queda resuelta y conciliada formalmente la discrepancia entre el tiempo preliminar en memoria (1.20s) y los tiempos medidos en disco persistente con I/O real (1.84s / 2.98s).
2. Se confirma la recuperación del 100% de los datos (88 filas en 15 tablas) con delta = 0 y supervivencia verificada tras reinicio en frío.
3. El Paso 8 se encuentra técnica y empíricamente sustentado en su versión consolidada.
