# PASO 1 (DG-001-C) — MATRIZ DE HOMOLOGACIÓN LÉXICA Y CONVENCIÓN DE NOMBRES
**Proyecto:** Ecosistema Digital Las Mellizas — Carril HCE/Caja  
**Fecha:** 21 de Septiembre de 2026  
**Propósito:** Identificación formal de la discrepancia de idioma entre esquemas (Inglés vs. Español) para decisión soberana de Dirección General en el Paso 5.

---

## 1. Mapeo Comparativo de Entidades (Vía A vs. Vía B)

| Entidad / Concepto de Negocio | Vía A (`las-mellizas-hce-portal`) | Vía B (`las-mellizas-portal`) | Equivalencia Semántica | Consideración Regulatoria / Técnica |
| :--- | :--- | :--- | :---: | :--- |
| **Padrón de Pacientes** | `patients` | `paciente` | 100% | Vía B singular, Vía A plural. |
| **Atenciones Clínicas** | `encounters` | `encuentro` | 100% | Ambos adoptan el concepto canónico HL7/MINSA. |
| **Historia / Nota Clínica** | `documents` / `hce_notes` | `nota_clinica` | 100% | Vía B sigue NTS N° 139-MINSA ("Nota Clínica"). |
| **Adendas Clínicas** | (En documents o adenda) | `adenda` | 100% | Término legal específico del MINSA. |
| **Organización / RUC** | `organizations` | `organizacion` | 100% | Las Mellizas Perú S.A.C. |
| **Sedes Clínicas** | `sites` | `sede` | 100% | Sede Independencia / Sede Vivanco. |
| **Profesionales / Staff** | `professionals` | `perfil_usuario` | 100% | Incluye colegiatura COP/CMP y especialidad. |
| **Órdenes de Cobro** | (En finance/orders) | `orden_pago` | 100% | Soporte para desglose de carrito multiservicio. |
| **Transacciones de Pago** | (En payments) | `pago` | 100% | Split payment (Efectivo/POS/Yape). |
| **Sesiones de Caja** | (No implementado en Vía A) | `caja_turno` | Exclusivo Vía B | Apertura, fondo inicial y arqueo ciego. |
| **Egresos / Vales de Caja**| (No implementado en Vía A) | `caja_egreso` | Exclusivo Vía B | Gastos menores y pagos a colaboradores. |
| **Inventario y Farmacia** | (No implementado en Vía A) | `producto_inventario` | Exclusivo Vía B | Insumos, medicamentos y stock mínimo. |
| **Kárdex de Movimientos** | (No implementado en Vía A) | `movimiento_inventario`| Exclusivo Vía B | Entradas, salidas de venta y dispensación. |
| **Citas Reagendadas** | `appointment_requests` | `cita_reagendada` | 100% | Control de unicidad de citas de ventanilla. |
| **Revisión de Coincidencias**| `coincidencias_pacientes` | (Adoptado de Vía A) | 100% | Cola humana de no-fusión automática. |
| **Bitácora de Auditoría** | `audit_log` | `auditoria` | 100% | Triggers inmutables append-only. |

---

## 2. Alternativas de Decisión para Dirección General (Paso 5)

### Opción 1: Esquema Canónico en Español (Recomendación Operativa)
- **Fundamento:** Todos los procesos regulatorios peruanos (MINSA, SUSALUD, SUNAT, Colegio de Obstetras/Médicos) se redactan en español. Facilita las auditorías fiscales, contables y sanitarias. Evita traducciones forzadas de términos locales como "boleta", "arqueo ciego", "colegiatura", "adenda", "egreso menor" o "kárdex".
- **Impacto en Vía A:** Requiere alinear los nombres de tablas en sus scripts DDL o utilizar alias/views.

### Opción 2: Esquema Canónico en Inglés (Estándar Internacional HL7 FHIR)
- **Fundamento:** Sigue las convenciones universales de ingeniería de software y el estándar internacional HL7 FHIR (`Patient`, `Encounter`, `DocumentReference`, `Practitioner`, `Coverage`).
- **Impacto en Vía B:** Requiere renombrar las tablas en PostgreSQL. 
- **Estrategia de Mitigación Cero Fricción:** Se pueden crear Vistas SQL automáticas en PostgreSQL (`CREATE VIEW paciente AS SELECT * FROM patients;`) o triggers de redirección, de manera que ni el frontend existente ni los componentes construidos sufran roturas de código.

---

## 3. Dictamen de la Vía B
La Vía B acatará sin reservas la convención única que determine la Dirección General en el Paso 5, garantizando que el modelo final sea 100% homogéneo y libre de mezclas arbitrarias.
