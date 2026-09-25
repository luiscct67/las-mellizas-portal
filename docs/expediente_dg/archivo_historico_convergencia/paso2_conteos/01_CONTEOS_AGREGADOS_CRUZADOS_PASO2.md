# PASO 2 (DG-001-C) — INFORME DE CONTEOS AGREGADOS CRUZADOS
**EXPEDIENTE TÉCNICO DE CONVERGENCIA — TERCERA VÍA**

**De:** Equipo Técnico Vía B (`las-mellizas-portal`)  
**Para:** Dirección General, Consultorio Obstétrico Ecográfico Las Mellizas Perú S.A.C.  
**Con copia:** Dirección Técnica Vía A (`las-mellizas-hce-portal`)  
**Fecha:** 21 de septiembre de 2026  
**Fuentes de Verificación:**
- Vía A: `01-CONTEOS-AGREGADOS.md` (SHA-256 verificado en paquete `via-a-export-2026-09-21.zip`, proyecto Supabase `las-mellizas-hce-dev`).
- Vía B: `docs/expediente_dg/paso1_export/04_CONTEOS_AGREGADOS_ENTORNO.md` (consulta en vivo proyecto Supabase `oepctyamffehjhhuxiqo`).

---

## 1. Tabla Comparativa de Conteos Agregados

| Dominio Funcional | Entidad Vía A (Inglés) | Conteo A | Entidad Vía B (Español) | Conteo B | Naturaleza de los Datos | Estado de Colisión |
| :--- | :--- | :---: | :--- | :---: | :--- | :--- |
| **Gobernanza / Tenancy** | `organizations` | 1 | `organizacion` | 1 | Semilla institucional (Las Mellizas S.A.C., RUC 20611827335) | Identidad 1:1 idéntica |
| **Sedes Operativas** | `sites` | 2 | `sede` | 2 | Sede Independencia y Sede Vivanco | Identidad 1:1 idéntica |
| **Usuarios y Roles** | `perfiles` | 5 | `perfil_usuario` | 15 | Cuentas de desarrollo / preproducción | Sin conflicto (roles homologables) |
| **Padrón de Pacientes** | `patients` | 1 | `paciente` | 24 | **100% Sintéticos / Pruebas E2E** | **0 colisiones reales** |
| **Profesionales** | `professionals` | 0 | Asignado en `perfil_usuario` | 6 | Perfiles asistenciales vinculados | Homologable en convergencia |
| **Citas y Solicitudes** | `appointment_requests` | 0 | `cita_reagendada` | 5 | Solicitudes vs agenda de reagendamiento | No colisionan |
| **Encuentros Clínicos** | `encounters` | 0 | `encuentro` | 31 | Pruebas de flujo de atención / cola | Datos de prueba interna |
| **Historias / Documentos** | `documents` | 0 | `nota_clinica` + `adenda` | 18 | Notas obstétricas con sellado criptográfico | Superioridad funcional Vía B |
| **Caja y Ventanilla** | *(No implementado en A)* | - | `caja_turno` + `caja_egreso` | 14 | Turnos, egresos y arqueos ciegos | Aporte operativo exclusivo Vía B |
| **Facturación / Pagos** | *(No implementado en A)* | - | `orden_pago` + `pago` | 63 | Órdenes de cobro y pagos fraccionados | Aporte operativo exclusivo Vía B |
| **Inventario / Kárdex** | *(No implementado en A)* | - | `producto` + `movimiento` | 30 | Catálogo e insumos clínicos | Aporte operativo exclusivo Vía B |
| **Consentimientos** | `consents` | 0 | *(Metadato en encuentro)* | - | Estructura canónica de Vía A | A incorporar como tabla |
| **Comunicaciones** | `communications` | 0 | *(Sin tabla dedicada)* | - | Trazabilidad de avisos (no clínica) | A incorporar como tabla |
| **Auditoría Global** | `audit_log` | 0 | `auditoria` | 14 | Trazabilidad inmutable de eventos | A unificar bajo trigger Vía A |
| **Coincidencias Pacientes**| `coincidencias_pacientes`| 0 | Propuesta Script 18 | 0 | Motor difuso 4 casos para Paso 3 y 4 | Estructura homologada |

---

## 2. Hallazgos Clave del Paso 2

1. **Ausencia Absoluta de Datos de Pacientes Reales en Ambos Repositorios:**
   - Vía A tiene **1 paciente sintético** insertado para verificar su trigger.
   - Vía B tiene **24 pacientes sintéticos** creados para pruebas E2E de ventanilla, triage y caja.
   - **Ningún repositorio contiene historias clínicas de pacientes reales de las sedes de Ayacucho**.

2. **Diagnóstico de Riesgo para Pasos 3 y 4 (Colisiones y Duplicados):**
   - No existe riesgo de contaminación ni solapamiento destructivo entre las bases actuales de Vía A y Vía B, dado que ambos repositorios están operando en aislamiento con datos de laboratorio/ingeniería.
   - El verdadero ejercicio de los Pasos 3 (detección de colisiones) y 4 (detección de homonimias/duplicados) ocurrirá cuando Dirección General autorice la ingesta de los libros de registro o historias legadas reales de las sedes físicas (bajo la Directiva DG-002, Gate de Datos).

3. **Complementariedad Funcional Demostrada:**
   - Vía A ha construido la armadura de gobernanza y control RLS (9 tablas, 3 migraciones, estricta separación tenancy).
   - Vía B ha construido los módulos transaccionales de supervivencia clínica del negocio: ventanilla de admisión, módulo de caja con arqueo ciego y pagos fraccionados, kárdex de farmacia/insumos y notas clínicas con firma criptográfica.
   - La convergencia de la Tercera Vía no destruye valor; toma el armazón normativo de Vía A e inserta el motor de negocio probado de Vía B.

---

## 3. Conclusión del Paso 2

El Paso 2 queda técnicamente consolidado y listo para ser evaluado por Dirección General y la Dirección Técnica de Vía A, habilitando el diseño de la estrategia de homologación de los Pasos 3 y 4.
