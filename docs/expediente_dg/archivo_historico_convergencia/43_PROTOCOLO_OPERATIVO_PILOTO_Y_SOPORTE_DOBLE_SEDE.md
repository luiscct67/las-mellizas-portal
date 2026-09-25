# PROTOCOLO OPERATIVO DEL PILOTO ASISTENCIAL Y SOPORTE TÉCNICO EN VIVO (PASO 9)
## Operación Simultánea en Sede Independencia y Sede Vivanco — Periodo de Evaluación de 90 Días

**ENTIDAD:** Consultorio Obstétrico Ecográfico Las Mellizas Perú S.A.C.  
**RESPONSABLE TÉCNICO:** Dirección Técnica — `luiscct67/las-mellizas-portal` (Vía B)  
**EN COORDINACIÓN CON:** Dirección General y Dirección Técnica (Vía A)  
**FECHA DE INICIO DEL PILOTO:** Lunes 28 de septiembre de 2026, 08:00 hrs PET  
**SEDES INVOLUCRADAS:** Sede Independencia (Principal) y Sede Vivanco (Secundaria)  
**CUSTODIO OFICIAL DE CUENTAS:** `administracion@lasmellizasperu.com`  

---

## 1. MARCO ESTRATÉGICO Y POLÍTICA DE INFRAESTRUCTURA (90 DÍAS DE PRUEBA)

En cumplimiento de la directiva de Dirección Técnica y Dirección General, se establece el siguiente marco de gobernanza operativa:

1. **Titularidad Institucional (Viernes 25 de septiembre, 18:00 PET):**
   Las cuentas de Supabase (`oepctyamffehjhhuxiqo`), GitHub (`luiscct67/las-mellizas-portal`) y Vercel se transfieren formalmente a la custodia de:
   ```text
   administracion@lasmellizasperu.com
   ```
2. **Modelo de Infraestructura Gratuita (Free Tier) por 90 Días:**
   - Durante los primeros **90 días calendario** (del 28 de septiembre al 27 de diciembre de 2026), el sistema operará bajo el plan **Free Tier** de Supabase y Vercel como fase de prueba y validación integral.
   - **Objetivo:** Evaluar la estabilidad real, ergonomía de uso, ausencia de discrepancias o limitaciones relacionales sin incurrir en costos fijos mensuales prematuros.
   - **Criterio de Cierre (Día 90):** Si el sistema se consolida plenamente, se evaluará la migración al plan Supabase Pro para PITR; de presentarse incompatibilidades no subsanables, la Dirección General tendrá plena libertad para decidir alternativas arquitecturales sin penalizaciones.
3. **Mecanismo de Respaldo Compensatorio (Estrategia Anti-Desastres en Free Tier):**
   Para suplir la ausencia de backups continuos automáticos (PITR del plan Pro), se implementa un **protocolo de respaldo lógico diario al cierre de turno** (20:45 PET) mediante script automatizado de export que generará un archivo `.sql` cifrado y archivado en almacenamiento local redundante.

---

## 2. DESPLIEGUE OPERATIVO POR SEDE

```
┌─────────────────────────────────────────────────────────┐     ┌─────────────────────────────────────────────────────────┐
│                   SEDE INDEPENDENCIA                    │     │                      SEDE VIVANCO                       │
├─────────────────────────────────────────────────────────┤     ├─────────────────────────────────────────────────────────┤
│ • 2 Recepcionistas / Cajeras                            │     │ • 1 Recepcionista / Cajera                              │
│ • 2 Profesionales de la Salud (Obstetras / Ecografistas)│     │ • 1 Profesional de la Salud (Médico / Obstetra)         │
│ • Carga estimada: 35 - 50 atenciones diarias            │     │ • Carga estimada: 15 - 25 atenciones diarias            │
│ • Flujo: Admisión ➔ Cobro POS/Efectivo ➔ Ecografía      │     │ • Flujo: Admisión ➔ Cobro POS/Efectivo ➔ Consulta       │
│ • 2 Puntos de Venta (Terminales Web)                    │     │ • 1 Punto de Venta (Terminal Web)                       │
└─────────────────────────────────────────────────────────┘     └─────────────────────────────────────────────────────────┘
                                   │                                                                 │
                                   └───────────────────────────────┬─────────────────────────────────┘
                                                                   ▼
                                          Aislamiento Multisede Estricto Zero Trust
                                          (Personal de Vivanco no ve registros de Independencia)
```

### 2.1. Asignación de Usuarios y Perfiles

| Sede | Usuario / Rol | Función en el Sistema | Permisos RLS Operativos |
| :--- | :--- | :--- | :--- |
| **Independencia** | Recepción / Caja 1 | Admisión de pacientes, emisión de tickets y cobro en caja | Inserción en `paciente`, `encuentro`, `orden_pago`, `pago`, `caja_turno` |
| **Independencia** | Recepción / Caja 2 | Apoyo en admisión y arqueo de turnos de caja | Mismos permisos circunscritos a Sede Independencia |
| **Independencia** | Profesional Clínico 1 | Registro de atenciones ecográficas, diagnóstico y firma | Acceso a `nota_clinica`, `adenda` asociadas a encuentros de Independencia |
| **Independencia** | Profesional Clínico 2 | Registro de notas de obstetricia / control prenatal | Mismos permisos asistenciales en Sede Independencia |
| **Vivanco** | Recepción / Caja 1 | Admisión y cobro exclusivo en Sede Vivanco | Acceso restringido exclusivamente al `site_id` de Vivanco |
| **Vivanco** | Profesional Clínico 1 | Registro de atenciones clínicas en Sede Vivanco | Acceso restringido exclusivamente a pacientes atendidos en Vivanco |
| **Ambas** | Profesional Dual (Móvil) | Profesional con rotación multisede asignada | Acceso habilitado a encuentros de ambas sedes mediante `usuario_sede` |
| **Ambas** | Administración General | Monitoreo centralizado y bitácora de auditoría | Bypass institucional autorizado para reportes consolidados |

---

## 3. PROTOCOLO DE CONTINGENCIA FÍSICA (PLAN DE CONTINUIDAD MÉDICA)

Durante la primera semana del piloto asistencial (28 de septiembre al 2 de octubre de 2026), se mantendrá en ambas sedes un **respaldo físico manual en paralelo** para garantizar que la atención de las pacientes jamás se interrumpa ante fallas de conectividad local:

1. **Contingencia en Admisión y Citas:**
   - Registro en cuaderno físico de citas / planilla de asistencia en ventanilla.
2. **Contingencia en Facturación y Cobranza:**
   - Mantener talonarios físicos de Boletas de Venta de contingencia autorizadas por SUNAT en cada caja.
   - En caso de caída de internet o fallo en el POS, emitir boleta física manual y asentar el cobro en la planilla de caja manual.
   - Una vez restablecido el servicio, la cajera regularizará los registros en el sistema web asociando el número de boleta física emitida.
3. **Contingencia en Atención Clínica:**
   - Fichas obstétricas y formatos ecográficos impresos en papel disponibles en cada consultorio.
   - En caso de interrupción del sistema, el profesional completará la atención en formato físico. Al restablecerse el sistema, transcribirá el diagnóstico y sellará la nota clínica digital con fecha diferida y adenda aclaratoria.

---

## 4. ESQUEMA DE SOPORTE TÉCNICO EN VIVO Y CANALES DE ESCALAMIENTO

Para brindar tranquilidad al personal operativo durante la primera semana de uso en vivo:

### 4.1. Horario de Soporte Técnico Activo
* **Lunes a Sábado:** De **07:45 hrs a 20:30 hrs PET** (cubriendo desde la apertura hasta el cierre de turnos).

### 4.2. Mesa de Ayuda y Canales de Comunicación
* **Canal Primario (Respuesta Inmediata):** Grupo de mensajería instantánea de alta prioridad: `[SOPORTE EN VIVO] Las Mellizas — Sistema Web 2026`.
* **Integrantes de la Mesa de Soporte:**
  - Dirección Técnica (Vía B) — Soporte de Nivel 2 y 3 (Base de datos / Infraestructura).
  - Jefatura de Operaciones / `administracion@lasmellizasperu.com` — Soporte Nivel 1.
  - Administradoras de Sede Independencia y Sede Vivanco.

### 4.3. Niveles de Severidad y Acuerdos de Nivel de Servicio (SLA)

| Severidad | Descripción del Incidente | Ejemplo | Tiempo Máximo de Respuesta | Tiempo Máximo de Solución |
| :---: | :--- | :--- | :---: | :---: |
| 🔴 **S1 - Crítico** | Bloqueo total que impide cobrar a una paciente o emitir diagnóstico clínico. | Error en pantalla de cobro o caída general de la base de datos. | **< 10 minutos** | **< 30 minutos** (o paso a contingencia física) |
| 🟡 **S2 - Alto** | Falla parcial que tiene solución alternativa (workaround). | No imprime el ticket pero el pago quedó guardado; lentitud en carga de agenda. | **< 20 minutos** | **< 60 minutos** |
| 🟢 **S3 - Menor** | Duda de usuario, solicitud cosmética o sugerencia de mejora de interfaz. | Consulta sobre cómo buscar a una paciente con doble apellido o filtro de fechas. | **< 45 minutos** | Mismo día hábil |

---

## 5. RITUAL DIARIO DE ARQUEO Y CONCILIACIÓN (CIERRE DE JORNADA)

Al término de la jornada operativa diaria (20:30 hrs PET) se ejecutará en ambas sedes el siguiente protocolo:

1. **Cierre de Turno en Pantalla:**
   - La cajera de cada sede ingresa al módulo de caja, valida el total recaudado en efectivo, transferencias y POS, y presiona **CERRAR TURNO**.
2. **Conciliación Cruzada:**
   - Contraste entre el reporte emitido por el sistema vs. el lote físico de vouchers de POS y el efectivo en bóveda.
3. **Backup Lógico Diario (20:45 PET):**
   - Ejecución del script de volcado de base de datos para asegurar los datos del día bajo el modelo Free Tier.
4. **Reporte Diario a Dirección General:**
   - Resumen ejecutivo enviado por `administracion@lasmellizasperu.com` con el número total de atenciones, monto cobrado y reporte de incidencias técnicas resueltas.
