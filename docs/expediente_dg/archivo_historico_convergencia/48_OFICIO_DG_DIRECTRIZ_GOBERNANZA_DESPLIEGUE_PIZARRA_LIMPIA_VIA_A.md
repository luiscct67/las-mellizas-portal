# OFICIO CIRCULAR N.° 004-2026-DG/LM
## DIRECTRIZ EJECUTIVA DE GOBERNANZA Y MANDATO DE DESPLIEGUE EN PIZARRA LIMPIA (PROYECTO VIRGEN)

**DE:** Dirección General — Consultorio Obstétrico Ecográfico Las Mellizas Perú S.A.C. (RUC 20611827335)  
**PARA:** Dirección Técnica — Equipo de Desarrollo Vía A (`las-mellizas-hce-portal`)  
**CON COPIA:** Dirección Técnica — Equipo de Desarrollo Vía B (`las-mellizas-portal`)  
**CON COPIA:** Asesoría Legal Corporativa & Auditoría Médica de Calidad  
**FECHA:** 24 de septiembre de 2026  
**ESTADO:** DIRECTRIZ EJECUTIVA VINCULANTE E INAPELABLE  
**REFERENCIA:**  
1. `ADR-005: Homologación Canónica de Nomenclatura del Esquema en Español`  
2. `37_RATIFICACION_FINAL_HASH_Y_COBERTURA_PASO6.md`  
3. `38_ACUSE_RATIFICACION_VENTANA_Y_SCHEMA_FREEZE.md`  
4. Script Técnico Maestro: `00_DESPLIEGUE_PIZARRA_LIMPIA_V2.sql`  

---

## 1. ANTECEDENTES Y PROPÓSITO INSTITUCIONAL

Habiendo culminado de manera satisfactoria las rondas técnicas de auditoría adversarial, pruebas de penetración cruzada y el simulacro de restauración en frío (Pasos 1 al 8 del Plan de Convergencia), la Dirección General felicita a ambos equipos técnicos por el rigor demostrado.

No obstante, tras la revisión minuciosa del historial de migraciones acumuladas y los restos de datos de prueba (sintéticos) generados durante las fases de desarrollo, esta Dirección General ha identificado que **realizar una migración incremental o parchar sobre estructuras existentes acarrea un pasivo técnico y un riesgo de cumplimiento legal inaceptable** frente a la Superintendencia Nacional de Salud (SUSALUD) y la NTS N.° 139-MINSA (Gestión de la Historia Clínica).

En consecuencia, en uso de las facultades de gobernanza y representación legal que me asisten, **se emite formalmente la presente Directriz Ejecutiva que establece el Mandato de Despliegue en Pizarra Limpia**, de obligatorio cumplimiento para la Vía A y la Vía B.

---

## 2. DIRECTRIZ EJECUTIVA: MANDATO DE DESPLIEGUE EN PIZARRA LIMPIA

### 2.1. Definición y Alcance
El pase a producción programado para el **Sábado 26 de septiembre de 2026 a las 22:00 PET** **NO** se ejecutará mediante alteraciones intermedias ni arrastrará tablas legacy en inglés, datos de prueba ni triggers obsoletos. 

La puesta en marcha se realizará mediante la modalidad de **PIZARRA LIMPIA (Fresh Deployment)** sobre una instancia virgen de base de datos relacional PostgreSQL / Supabase, asegurando que el sistema inicie sus operaciones clínicas en un estado de pureza técnica absoluta.

### 2.2. Artefacto Oficial Certificado
El único artefacto técnico autorizado por la Dirección General para construir la estructura de producción es el script maestro:
- **Archivo:** `docs/expediente_dg/00_DESPLIEGUE_PIZARRA_LIMPIA_V2.sql`
- **Hash de Integridad:** Ratificado en el inventario SHA-256 institucional.

Dicho script consolida:
1. **Nomenclatura 100% en Español (ADR-005):** Las 16 tablas oficiales (`site`/`sede`, `perfil_usuario`, `paciente`, `encuentro`, `nota_clinica`, `adenda`, `orden_pago`, `pago`, `caja_turno`, `caja_egreso`, `producto_inventario`, `movimiento_inventario`, `cita_reagendada`, `auditoria`, etc.).
2. **Seguridad Zero Trust Multisede:** Políticas Row Level Security (RLS) estrictas con aislamiento estricto por `site_id` (Independencia y Vivanco) y rol asistencial, garantizando **0 filas en la consulta del Portero de Seguridad**.
3. **Inmutabilidad y Firma Digital:** Triggers de protección contra borrado (`no_del`) en registros médicos y financieros, complementados con sellado criptográfico SHA-256 para notas clínicas y arqueos de caja.
4. **Catálogo Asistencial Real:** Inserción limpia y única de las 2 sedes físicas habilitadas por SUSALUD, el padrón autorizado de colaboradores institucionales y el tarifario base de 47 prestaciones y servicios ecográficos.

---

## 3. POLÍTICA DE GOBERNANZA PRESUPUESTAL Y RESGUARDO ($0 COSTO CLOUD)

La Dirección General ratifica que el proyecto iniciará su fase de pilotaje asistencial (90 días) bajo una política estricta de **optimización de costos a cero dólares ($0 USD en infraestructura cloud)**:

1. **Free Tier de Supabase y Vercel:** Se utilizarán las capacidades nativas optimizadas de la capa gratuita de ambos proveedores durante los primeros 3 meses de operación.
2. **Estrategia de Resguardo y Recuperación (Disaster Recovery):** 
   - Para suplir el PITR de planes de pago, la Dirección Técnica de Vía B ha implementado un protocolo de volcado lógico diario automatizado (`pg_dump` vía script institucional) programado al cierre de operaciones de cada jornada (22:00 PET).
   - Las copias de seguridad comprimidas y cifradas serán depositadas automáticamente en el repositorio custodio bajo titularidad exclusiva de:  
     `administracion@lasmellizasperu.com`
3. **Autorización Presupuestal Futura:** Cualquier ascenso de plan (*upgrade* a Supabase Pro o Vercel Pro) queda supeditado a la evaluación de volumen transaccional que emitirá la Dirección General al cumplirse los primeros 60 días del piloto.

---

## 4. INSTRUCCIONES ESPECÍFICAS PARA LA DIRECCIÓN TÉCNICA DE VÍA A

Se instruye al equipo técnico de Vía A dar estricto cumplimiento a los siguientes requerimientos de gobernanza:

1. **Mantenimiento del Schema Freeze:** Respetar la congelación total de esquemas hasta el inicio de la ventana del sábado 26 de septiembre a las 22:00 PET. Queda desautorizado cualquier intento de inyección de código SQL divergente.
2. **Rol de Veeduría en la Ventana de Despliegue:**
   - La Vía A actuará en calidad de **Veedor Técnico y Testigo de Integridad** durante la ejecución del script maestro `00_DESPLIEGUE_PIZARRA_LIMPIA_V2.sql`.
   - Vía A deberá verificar de manera conjunta la ejecución de la consulta canónica del **Portero Zero Trust**, certificando el retorno de **cero (0) filas en políticas permisivas**.
3. **Entrega de Accesos y Relevo Institucional (Viernes 25 - 18:00 PET):**
   - Vía A deberá transferir la propiedad absoluta y sin reservas de cualquier repositorio, cuenta de Supabase, DNS, dominio o webhook de su administración hacia la cuenta institucional de la empresa:  
     **`administracion@lasmellizasperu.com`**
4. **Desactivación de Servicios Sintéticos:** Desconectar de forma definitiva cualquier base de pruebas previa o sandbox que contenga DNI ficticios o historiales no conformes con la NTS N.° 139-MINSA.

---

## 5. CRONOGRAMA DE EJECUCIÓN Y PRÓXIMOS PASOS

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ CRONOGRAMA OFICIAL DE PASO A PRODUCCIÓN Y GOBERNANZA                                        │
├──────────────────────────┬───────────────────────┬──────────────────────────────────────────┤
│ FECHA Y HORA             │ HITO                  │ RESPONSABLES                             │
├──────────────────────────┼───────────────────────┼──────────────────────────────────────────┤
│ Viernes 25/09 - 18:00 PET│ Relevo y Custodia     │ Vía A y Vía B entregan credenciales y    │
│                          │ de Cuentas Cloud      │ titularidad a administracion@...         │
├──────────────────────────┼───────────────────────┼──────────────────────────────────────────┤
│ Sábado 26/09 - 22:00 PET │ Ventana de Despliegue │ Ejecución de Pizarra Limpia V2           │
│                          │ Pizarra Limpia        │ Veeduría Vía A / Ejecución Vía B         │
├──────────────────────────┼───────────────────────┼──────────────────────────────────────────┤
│ Domingo 27/09 - 15:00 PET│ Verificación Física   │ Pruebas en hardware de sede              │
│                          │ de Conectividad y POS │ (Impresoras térmicas 80mm y red)         │
├──────────────────────────┼───────────────────────┼──────────────────────────────────────────┤
│ Lunes 28/09 - 08:00 PET  │ Inicio del Piloto     │ Apertura asistencial en Independencia    │
│                          │ Operativo Asistencial │ y Vivanco (Personal clínico en vivo)     │
└──────────────────────────┴───────────────────────┴──────────────────────────────────────────┘
```

---

## 6. DISPOSICIÓN FINAL Y VIGENCIA

La presente Directriz Ejecutiva entra en vigencia a partir de su publicación en el repositorio institucional y notificación formal. Cualquier duda de interpretación será dirimida de manera sumaria por esta Dirección General.

Con este marco de certeza técnica, jurídica y operativa, aseguramos que el Consultorio Obstétrico Ecográfico Las Mellizas Perú S.A.C. cuente con una plataforma digital moderna, segura y de calidad médica insuperable.

Comuníquese, publíquese y cúmplase.

---

**DIRECCIÓN GENERAL**  
**Consultorio Obstétrico Ecográfico Las Mellizas Perú S.A.C.**  
*RUC 20611827335*  
*Sede Independencia / Sede Vivanco*  
`administracion@lasmellizasperu.com`  
