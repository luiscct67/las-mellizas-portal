# PASO 5 (DG-001-C) — PROPUESTA DE HOMOLOGACIÓN DE NOMENCLATURA Y PADRÓN MAESTRO UNIFICADO
**CONVENCIÓN INSTITUCIONAL DE ESQUEMA — ECOSISTEMA DIGITAL LAS MELLIZAS**

**De:** Equipo Técnico Vía B (`las-mellizas-portal`)  
**Para:** Dirección General, Consultorio Obstétrico Ecográfico Las Mellizas Perú S.A.C.  
**Con copia:** Dirección Técnica Vía A (`las-mellizas-hce-portal`)  
**Fecha:** 21 de septiembre de 2026  
**Documento de Referencia:** Directivas DG-001-C, DG-001-B, DG-002 | Inventarios de Paso 1 y Conteos de Paso 2  

---

## 1. Justificación y Propósito del Paso 5

Tal como advirtió la Dirección General, el Padrón Maestro de Pacientes y el ecosistema no pueden convivir con una mezcla accidental de idiomas según de qué repositorio provenga cada tabla. Se requiere una **convención de nombres única, canónica y explícita**.

Actualmente:
* **Vía A** introdujo un esquema mayoritariamente en inglés (`organizations`, `sites`, `professionals`, `patients`, `appointment_requests`, `encounters`, `documents`, `consents`, `communications`, `audit_log`), con excepciones en español ya integradas (`perfiles`, `usuario_sede`, `coincidencias_pacientes`).
* **Vía B** estructuró su esquema 100% en español (`organizacion`, `sede`, `perfil_usuario`, `usuario_sede`, `paciente`, `encuentro`, `nota_clinica`, `adenda`, `orden_pago`, `pago`, `caja_turno`, `caja_egreso`, `producto_inventario`, `movimiento_inventario`, `cita_reagendada`, `auditoria`).

---

## 2. Análisis de Alternativas de Homologación

### Opción 1 (Recomendada): Convención Institucional en Español con Vistas de Compatibilidad
* **Criterio Operativo y Regulatorio:**  
  Las Mellizas Perú S.A.C. opera bajo las normativas del MINSA, SUSALUD y SUNAT. Conceptos como *arqueo ciego de caja*, *vale de egreso*, *adenda médica*, *colegiatura* y *boleta electrónica* carecen de traducciones directas en inglés sin perder rigor legal peruano.
* **Criterio de Menor Resistencia Técnica:**  
  La Vía A ya tiene en español sus tablas más recientes (`perfiles`, `usuario_sede`, `coincidencias_pacientes`). Homologar las 9 tablas restantes a español unifica el 100% del sistema sin tener que reescribir docenas de vistas y endpoints de caja y facturación.
* **Mecanismo de Compatibilidad Sinérgica (Vistas SQL):**  
  Para que ningún script o pipeline de la Vía A falle, se crean vistas de lectura/escritura (`CREATE VIEW public.patients AS SELECT ... FROM public.paciente`), permitiendo que ambos esquemas convivan con cero fricción.

### Opción 2: Convención 100% en Inglés
* Implica traducir entidades profundamente ligadas a la tributación y medicina peruana (`caja_turno` a `cash_register_shift`, `adenda` a `clinical_addendum`, `caja_egreso` a `cash_voucher`).
* Requiere refactorizar todos los Server Actions, componentes de interfaz y queries de ventanilla de la Vía B, incrementando el riesgo de regresiones operativas.

---

## 3. Matriz Canónica de Homologación de Entidades

A continuación se presenta la tabla unificada propuesta para el Padrón Maestro y su ecosistema:

| Dominio | Nombre Canónico Propuesto (Español) | Nombre Anterior Vía A | Nombre Anterior Vía B | Vista de Compatibilidad en Inglés |
| :--- | :--- | :--- | :--- | :--- |
| **Gobernanza** | `organizacion` | `organizations` | `organizacion` | `public.organizations` |
| **Sedes** | `sede` | `sites` | `sede` | `public.sites` |
| **Usuarios** | `perfil_usuario` | `perfiles` | `perfil_usuario` | `public.user_profiles` |
| **Multisede N:N**| `usuario_sede` | `usuario_sede` | `usuario_sede` | `public.user_sites` |
| **Padrón Maestro**| **`paciente`** | `patients` | `paciente` | **`public.patients`** |
| **Duplicados** | `coincidencias_pacientes` | `coincidencias_pacientes` | `coincidencias_pacientes` | `public.patient_matches` |
| **Profesionales**| `profesional` | `professionals` | Vinculado en `perfil_usuario` | `public.professionals` |
| **Solicitudes** | `solicitud_cita` | `appointment_requests` | `cita_reagendada` (agenda) | `public.appointment_requests` |
| **Encuentros** | `encuentro` | `encounters` | `encuentro` | `public.encounters` |
| **Historia HCE**| `nota_clinica` | `documents` | `nota_clinica` (SHA-256) | `public.documents` |
| **Adendas HCE** | `adenda` | *(No contemplado en A)*| `adenda` (Append-only) | `public.clinical_addenda` |
| **Consentimientos**| `consentimiento` | `consents` | *(Metadato en encuentro)*| `public.consents` |
| **Comunicaciones**| `comunicacion` | `communications` | *(Sin tabla dedicada)* | `public.communications` |
| **Caja / Turnos**| `caja_turno` | *(No implementado en A)*| `caja_turno` (Arqueo ciego) | `public.cash_shifts` |
| **Caja / Egresos**| `caja_egreso` | *(No implementado en A)*| `caja_egreso` | `public.cash_vouchers` |
| **Facturación** | `orden_pago` + `pago` | *(No implementado en A)*| `orden_pago` + `pago` (POS/Yape)| `public.payment_orders` |
| **Inventario** | `producto` + `movimiento` | *(No implementado en A)*| `producto_inventario` + kárdex | `public.inventory_items` |
| **Auditoría** | `auditoria` | `audit_log` | `auditoria` | `public.audit_log` |

---

## 4. Estructura Canónica del Padrón Maestro de Pacientes (`public.paciente`)

Se formula el diseño detallado de la tabla maestra que unifica todos los identificadores de trazabilidad institucional requeridos por DG-001-B y DG-001-C:

```sql
CREATE TABLE IF NOT EXISTS public.paciente (
  -- 1. Identificador Universal Canónico (UUID v4)
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 2. Trazabilidad Institucional y Tenancy (Aporte Vía A - DG-001-C)
  organizacion_id UUID NOT NULL REFERENCES public.organizacion(id) ON DELETE RESTRICT,
  legacy_hc_id TEXT,             -- Identificador de historia clínica legada (Sede Independencia / Vivanco)
  source_system_id TEXT NOT NULL DEFAULT 'HISTORIA_FISICA_LOCAL', -- Sistema de procedencia
  merged_into_paciente_id UUID REFERENCES public.paciente(id) ON DELETE RESTRICT, -- Absorción por fusión canónica
  
  -- 3. Identidad Civil (Norma Técnica MINSA N° 139 / RENIEC)
  tipo_documento TEXT NOT NULL DEFAULT 'DNI' CHECK (tipo_documento IN ('DNI', 'CARNET_EXTRANJERIA', 'PASAPORTE', 'SIN_DOCUMENTO')),
  numero_documento TEXT,
  nombres TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  fecha_nacimiento DATE,
  sexo TEXT CHECK (sexo IN ('F', 'M')),
  
  -- 4. Datos de Contacto y Residencia (Atención de Emergencia)
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  sede_creacion_id UUID REFERENCES public.sede(id) ON DELETE RESTRICT,
  
  -- 5. Perfil Clínico Rápido (Aporte Vía B)
  alergias TEXT DEFAULT 'NO REFIERE',
  factor_sanguineo TEXT,
  
  -- 6. Trazabilidad Temporal
  creado_el TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_el TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Salvaguardas de Integridad
  CONSTRAINT chk_no_autofusion CHECK (id <> merged_into_paciente_id)
);

-- Índices de Rendimiento para Búsqueda y Detección Difusa
CREATE INDEX IF NOT EXISTS idx_paciente_doc ON public.paciente (tipo_documento, numero_documento);
CREATE INDEX IF NOT EXISTS idx_paciente_apellidos_trgm ON public.paciente USING gin (apellidos gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_paciente_nombres_trgm ON public.paciente USING gin (nombres gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_paciente_merged ON public.paciente (merged_into_paciente_id) WHERE merged_into_paciente_id IS NOT NULL;
```

---

## 5. Vistas de Compatibilidad para Consultas de la Vía A

Para garantizar que el software o scripts que esperan los nombres de la Vía A funcionen de inmediato sin romper nada:

```sql
CREATE OR REPLACE VIEW public.patients AS
SELECT 
  id AS patient_id,
  organizacion_id AS organization_id,
  legacy_hc_id,
  source_system_id,
  merged_into_paciente_id AS merged_into_patient_id,
  numero_documento AS document_number,
  (nombres || ' ' || apellidos) AS full_name,
  fecha_nacimiento AS birth_date,
  creado_el AS created_at
FROM public.paciente;

CREATE OR REPLACE VIEW public.audit_log AS
SELECT
  id AS audit_id,
  fecha_hora AS created_at,
  usuario_id AS user_id,
  site_id,
  accion AS action,
  entidad AS entity,
  entidad_id AS entity_id,
  detalle AS metadata
FROM public.auditoria;
```

---

## 6. Recomendación y Siguiente Acción

Se solicita a Dirección General y a la Dirección Técnica de la Vía A evaluar esta propuesta. Al ser aprobada:
1. Quedará oficializada la **Opción 1 (Español Canónico con Vistas de Compatibilidad)** como convención del Padrón Maestro.
2. Se procederá al **Paso 6 (Aislamiento Multisede y RLS Zero Trust)** para ensamblar las políticas de seguridad sobre este esquema consensuado.
