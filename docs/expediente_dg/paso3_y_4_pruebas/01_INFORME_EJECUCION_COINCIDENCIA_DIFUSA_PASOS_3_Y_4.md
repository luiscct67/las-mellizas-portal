# PASOS 3 Y 4 (DG-001-C / DG-001-B) — INFORME DE PRUEBAS CON EXTENSIONES NATIVAS DE POSTGRESQL
**EVIDENCIA REAL DE RECONCILIACIÓN EN MOTOR C CONTRIB (`pg_trgm` + `fuzzystrmatch`)**

**De:** Equipo Técnico Vía B (`las-mellizas-portal`)  
**Para:** Dirección General, Consultorio Obstétrico Ecográfico Las Mellizas Perú S.A.C.  
**Con copia:** Dirección Técnica Vía A (`las-mellizas-hce-portal`)  
**Fecha:** 21 de septiembre de 2026 (Versión Consolidada Oficial)  
**Ambiente:** Sandbox PGlite con módulos nativos C contrib oficiales (`dist/contrib/pg_trgm.cjs` y `dist/contrib/fuzzystrmatch.cjs`)  
**Script Sometido a Prueba:** [`PROPUESTA_SCRIPT_18_CONVERGENCIA.sql`](file:///d:/LAS_MELLIZAS_ANTIGRVTY_2026/las-mellizas-portal/docs/expediente_dg/propuestas/PROPUESTA_SCRIPT_18_CONVERGENCIA.sql) (versión canónica sin polyfills)

---

## 1. Contexto y Aceptación de la Sugerencia de Vía A

Siguiendo la oportuna y precisa sugerencia de la Dirección Técnica de la Vía A:
1. Se cargaron los módulos nativos compilados oficiales de `pg_trgm` (15.8 KB) y `fuzzystrmatch` (11.7 KB) al instanciar el motor.
2. Se retiraron todas las funciones auxiliares caseras de [`PROPUESTA_SCRIPT_18_CONVERGENCIA.sql`](file:///d:/LAS_MELLIZAS_ANTIGRVTY_2026/las-mellizas-portal/docs/expediente_dg/propuestas/PROPUESTA_SCRIPT_18_CONVERGENCIA.sql), dejándolo 100% canónico con las sentencias `CREATE EXTENSION` oficiales.
3. Se re-ejecutaron los 4 casos de prueba directamente contra el código C nativo de PostgreSQL.
4. **Fórmula de Normalización de Distancia Levenshtein a Puntaje (Caso 3):**  
   Atendiendo la precisión de Vía A, se formaliza la fórmula matemática continua implementada en el trigger:
   $$\text{Similitud}_{\text{DNI}} = 1.0 - \left(\frac{\text{levenshtein}(D_1, D_2)}{\max(\text{longitud}(D_1), \text{longitud}(D_2))}\right)$$
   Para dos DNIs peruanos de 8 dígitos con 1 dígito de diferencia tipográfica ($\text{distancia} = 1$):
   $$\text{Similitud}_{\text{DNI}} = 1.0 - \frac{1}{8} = 1.0 - 0.125 = \mathbf{0.8750} \quad (87.50\%)$$

---

## 2. Matriz de Evidencia Ejecutada con Extensiones Nativas Reales

```
========================================================================================================================
EVIDENCIA DE EJECUCIÓN: MOTOR C CONTRIB NATIVO (POSTGRESQL 18 / PG_TRGM / FUZZYSTRMATCH)
========================================================================================================================
```

| Caso de Prueba | Motor y Extensión Nativa | Registro Previo (A) | Registro Entrante (B) | Tipo Detectado | Puntaje Nativo PostgreSQL | Estado Fila Creada | ¿Bloqueó Atención? | Veredicto |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Caso 1: Duplicado Exacto** | Core C PostgreSQL | `45892011`<br>LUCIA QUISPE ROJAS | `45892011`<br>LUCIA QUISPE ROJAS | `DNI_EXACTO` | **1.0000** (100%) | `posible` | **NO (false)** | **EXITOSO** |
| **Caso 2: Variación de Apellido** | `pg_trgm` C nativo | `70114258`<br>CARMEN ROSA FLORES QUISPE | `70114258`<br>CARMEN ROSA FLORES DE QUISPE | `NOMBRE_SIMILAR` | **0.8966** (89.66%) | `posible` | **NO (false)** | **EXITOSO** |
| **Caso 3: Typo 1 Dígito en DNI** | `fuzzystrmatch` C nativo | `41235678`<br>ANA MARIA HUAMAN DIAZ | `41235679`<br>ANA MARIA HUAMAN DIAZ | `DNI_TYPO` | **0.8750**<br>(distancia = 1) | `posible` | **NO (false)** | **EXITOSO** |
| **Caso 4: Homonimia Pura** | `pg_trgm` C nativo | `10203040`<br>JUANA ROSA SANCHEZ VEGA | `80907060`<br>JUANA ROSA SANCHEZ VEGA | `HOMONIMIA_DNI_DISTINTO` | **1.0000**<br>(DNI difiere) | `posible` | **NO (false)** | **EXITOSO** |

---

## 3. Conclusiones y Validación Técnica

1. **Puntajes Exactos de PostgreSQL:** El cálculo de `similarity()` sobre `"CARMEN ROSA FLORES QUISPE"` y `"CARMEN ROSA FLORES DE QUISPE"` arroja oficialmente **`0.8966`** (89.66% de similitud trigramática), superando holgadamente el umbral de 0.50.
2. **Distancia Levenshtein Trazable:** `levenshtein()` sobre los DNIs con typo calcula exactamente distancia **1**, y mediante la fórmula normalizada documentada genera el puntaje **`0.8750`** con rigor matemático comprobable.
3. **No-Bloqueo Absoluto:** Los 4 casos completaron la inserción de la paciente en ventanilla sin excepciones ni demoras (`bloqueo_atencion: false`).
4. **Fidelidad Total con Producción:** El Script 18 canónico queda 100% cerrado y conforme con lo que ejecutará Supabase en la nube.
