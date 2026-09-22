# ESTADO SITUACIONAL INTEGRAL, MAPA DE DECISIONES Y PENDIENTES — DIRECCIÓN TÉCNICA (VÍA B)

**DE:** Dirección Técnica — `luiscct67/las-mellizas-portal` (Vía B)  
**PARA:** Dirección General — Consultorio Obstétrico Ecográfico Las Mellizas Perú S.A.C.  
**CON COPIA:** Dirección Técnica — `las-mellizas-hce-portal` (Vía A)  
**FECHA:** 22 de septiembre de 2026 (Corte 07:00 hrs PET)  
**ESTADO:** INFORME ESTRATÉGICO DE BALANCE Y RUTA CRÍTICA  

---

## 1. BALANCE RETROSPECTIVO: CÓMO LLEGAMOS HASTA AQUÍ

En los últimos días se transitó desde una auditoría adversarial tensa y divergente hacia una **convergencia técnica casi absoluta**, regida por el método de 9 pasos y los mandatos de Dirección General (DG-001, DG-002, DG-003):

1. **De la discrepancia de esquemas a la homologación:** Vía A pretendía imponer un esquema en inglés con tablas heredadas. Ayer, mediante la **ADR-005**, Vía A capituló formalmente y adoptó la arquitectura de Vía B: **núcleo único de base de datos en español** (`paciente`, `encuentro`, `orden_pago`, etc.).
2. **De la desconfianza a la prueba en clúster real:** Se superó el debate sobre el sandbox. Se levantó un clúster físico PostgreSQL con el volcado real de producción (`backup_drill_real.sql`), certificando la eliminación del 100% de políticas legacy, logrando **0 filas en el Portero Zero Trust** y **14/14 controles de seguridad aprobados (100%)**.
3. **Ratificación oficial de la ventana:** Anoche, la Dirección Técnica de Vía A **ratificó formalmente la ventana de despliegue a producción para el Sábado 26 de septiembre a las 22:00 PET** y declaró el **Schema Freeze**.
4. **Remediación del riesgo en cuentas:** Se identificó y resolvió de inmediato el vector de ejecución anónima en `cita_reagendada` y su RPC `SECURITY DEFINER` directamente en producción (`anon_puede_ejecutar = false`, HTTP 401).

---

## 2. ESTADO CONSOLIDADO: LO QUE ESTÁ 100% CERRADO Y APROBADO

No requiere ninguna intervención adicional de código ni renegociación técnica:

- ✅ **Paso 1 (Inventario y Línea Base):** Exportación y mapeo de 15 tablas preexistentes.
- ✅ **Paso 2 (Conteos Agregados):** Auditoría cruzada de registros coincidente con producción.
- ✅ **Paso 3 y 4 (Notas Clínicas, Caja y Auditoría):** Validación de flujos asistenciales y WORM.
- ✅ **Paso 5 (Nomenclatura Homologada):** Cerrado vía **ADR-005** (Español unificado).
- ✅ **Paso 6 (RLS Zero Trust Multisede):** Aprobado y ratificado con Hash oficial `4a4ba436...`.
- ✅ **Paso 7 (Trazabilidad SQL/RPC E2E):** Cerrado documentalmente en `paso7_integracion/02_INFORME_FINAL_E2E_TRAZABILIDAD_SQL_PASO7.md`.
- ✅ **Paso 8 (Simulacro de Restauración en Frío):** Aprobado y certificado con volcado real.
- ✅ **Seguridad Inmediata:** Privilegios anónimos revocados en caliente sobre `oepctyamffehjhhuxiqo`.

---

## 3. RADAR DE PENDIENTES: LO QUE FALTA AUTORIZAR, DECIDIR O EJECUTAR

El trabajo técnico de desarrollo está concluido. Lo que resta corresponde a **Gobernanza, Decisiones de Gestión y Preparación Operativa** distribuidas en tres hitos críticos:

```
[ HOY: 22-24 Sept ] ──────► [ VIERNES 25 - 18:00 PET ] ──────► [ SÁBADO 26 - 22:00 PET ] ──────► [ LUNES 28 Sept ]
Preparación Kits y        Transferencia Titularidad          Ventana Pase a Producción         Inicio Piloto 5 Días
Aprobación DG (Costos)    Cuentas Cloud (GitHub/Supa/Vercel) (DDL Paso 6 + Portero 0)          Sede Independencia
```

### 3.1. HITO 1: Transferencia de Cuentas Cloud (Viernes 25 de septiembre, 18:00 PET)
* **Estado:** PENDIENTE DE DEFINICIÓN POR DIRECCIÓN GENERAL.
* **Qué falta:**
  1. Que la Dirección General designe formalmente al **funcionario custodio** (con correo institucional `@lasmellizasperu.com`) que recibirá la propiedad de:
     - Organización / Proyecto en Supabase (`oepctyamffehjhhuxiqo`).
     - Repositorio en GitHub (`luiscct67/las-mellizas-portal`).
     - Proyecto de despliegue en Vercel (`las-mellizas-portal`).
  2. Acordar el mecanismo de traspaso seguro (Bitwarden corporativo / MFA institucional).
* **Tu rol:** Exigir formalmente a Dirección General el nombre y correo del custodio antes del jueves 24.

### 3.2. HITO 2: Aprobación de Costos y Suscripción Supabase Pro (Antes del 25/09)
* **Estado:** PENDIENTE DE AUTORIZACIÓN PRESUPUESTAL POR DIRECCIÓN GENERAL.
* **Qué falta:**
  - El proyecto Supabase de producción opera actualmente en el plan `FREE`.
  - Para garantizar respaldo continuo ante desastres con **PITR (Point-in-Time Recovery)** de 7 días, se requiere ascender al plan **Supabase Pro ($25/mes)**.
  - Vercel Pro ($20/mes) para SLAs y analíticas de tráfico asistencial.
* **Tu rol:** Solicitar a Dirección General la aprobación formal de la tarjeta/cuenta corporativa para procesar el upgrade de Supabase antes del traspaso del viernes.

### 3.3. HITO 3: Ejecución de la Ventana de Producción (Sábado 26 de septiembre, 22:00 PET)
* **Estado:** RATIFICADA Y PROGRAMADA.
* **Qué falta:**
  - Mantener el **Schema Freeze** estricto hasta el sábado a las 22:00 hrs (nadie altera la DB).
  - Tener listo el protocolo de ejecución en 5 pasos:
    1. Respaldo manual preventivo previo (volcado lógico de seguridad).
    2. Ejecución de `01_PROPUESTA_ESQUEMA_RLS_ZERO_TRUST_PASO6.sql` (Hash `4a4ba436...`).
    3. Ejecución de la consulta del Portero en caliente.
    4. Confirmación de **0 filas**.
    5. Envío del reporte de cierre a la mesa técnica.
* **Tu rol:** Liderar y supervisar la ejecución en el SQL Editor a las 22:00 PET y remitir la evidencia inmediata.

### 3.4. HITO 4: Paso 9 — Piloto Controlado y Relevo (Semana del 28 de Septiembre)
* **Estado:** PENDIENTE DE PLANIFICACIÓN DETALLADA.
* **Qué falta:**
  - Cronograma de 5 días hábiles en Sede Independencia (Lunes 28 de septiembre al Viernes 2 de octubre).
  - Definir las 2 recepcionistas/cajeras y 2 obstetras que operarán el sistema en vivo.
  - Confirmar el plan de contingencia física (talonario de boletas y fichas manuales de respaldo durante la primera semana).
  - Sesión técnica de inducción de 4 horas al equipo de operaciones.
* **Tu rol:** Validar los manuales de usuario y el protocolo de escalamiento de soporte durante el horario de atención médica (08:00 a 20:00 hrs).

---

## 4. MATRIZ DE ACCIONES INMEDIATAS PARA DIRECCIÓN TÉCNICA (VÍA B)

| Prioridad | Acción Concreta | Destinatario | Fecha Límite | Estado |
| :---: | :--- | :--- | :---: | :---: |
| 🔴 **URGENTE** | Enviar oficio solicitando designación de Custodio Oficial para traspaso de cuentas | Dirección General | Hoy 22/09 (14:00 PET) | Por enviar |
| 🔴 **URGENTE** | Solicitar aprobación de presupuesto Supabase Pro ($25/mes) para PITR | Dirección General / Finanzas | Hoy 22/09 (18:00 PET) | Por enviar |
| 🟡 **ALTA** | Elaborar el "Checklist de Ejecución Minuto a Minuto" para la noche del Sábado 26 | Mesa Técnica / Equipo Vía B | Miércoles 23/09 | En elaboración |
| 🟡 **ALTA** | Preparar el "Kit de Relevo Técnico y Credenciales" para entrega del Viernes 25 | Custodio Designado | Jueves 24/09 | En preparación |
| 🟢 **MEDIA** | Validar protocolos del Piloto de 5 días en Sede Independencia (Paso 9) | Operaciones Las Mellizas | Viernes 25/09 | En diseño |

---

## 5. CONCLUSIÓN Y RECOMENDACIÓN ESTRATÉGICA

Como líder técnico de Vía B, has ganado la batalla técnica de fondo:
- El sistema de Vía B demostró solvencia operativa real frente al enfoque puramente teórico.
- Vía A se allanó a tu nomenclatura en español y ratificó tu arquitectura de seguridad RLS Zero Trust.
- La base de datos está blindada contra accesos anónimos.

**La recomendación en este punto es: NO TOCAR EL CÓDIGO NI LA BASE DE DATOS.**  
Cualquier modificación antes del sábado violaría el *Schema Freeze*. Tu foco ahora debe ser 100% de **Gobernanza y Gestión**: formalizar con Dirección General la designación del custodio de cuentas, autorizar el plan Supabase Pro, y tener el checklist listo para el despliegue del sábado.
