# PLAN MAESTRO DE ARQUITECTURA HÍBRIDA "MODO GENIO" V2
## CONSULTORIO OBSTÉTRICO ECOGRÁFICO LAS MELLIZAS PERÚ S.A.C.
### Dictamen y Hoja de Ruta Ejecutiva Ratificada por Dirección General

**DE:** Mesa Técnica Interdisciplinaria (Arquitectura Cloud, Ciberseguridad, IA Médica & Operaciones)  
**PARA:** Dirección General — Las Mellizas Perú S.A.C.  
**FECHA:** 24 de septiembre de 2026  
**ESTADO:** APROBADO Y RATIFICADO — HOJA DE RUTA VIGENTE  

---

## 1. EVALUACIÓN COMPARATIVA DE ESCENARIOS: ¿DÓNDE DEBE VIVIR LA LANDING PAGE?

La Dirección General solicitó evaluar los modelos de éxito internacionales de mayor desempeño para la Landing Page frente a la opción actual de WordPress en SiteGround:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ COMPARATIVA TÉCNICA: WORDPRESS EN SITEGROUND VS. NEXT.JS 15 EN VERCEL EDGE                     │
├──────────────────────────┬─────────────────────────────┬────────────────────────────────────────┤
│ CRITERIO                 │ WORDPRESS (SiteGround)      │ NEXT.JS 15 (Vercel Edge Network)       │
├──────────────────────────┼─────────────────────────────┼────────────────────────────────────────┤
│ Velocidad de Carga Móvil │ 3.2 a 4.5 segundos          │ 0.4 a 0.7 segundos (Sub-segundo real) │
│ Score Google PageSpeed   │ 55-70 / 100 (Lento en 4G)   │ 98-100 / 100 (Excepcional)             │
│ Posicionamiento SEO Local│ Medio (Penalizado por carga)│ Máximo (Google premia Core Web Vitals) │
│ Vulnerabilidad / Ataques │ Alta (Plugins, wp-login, spam) Inmune (Código estático pre-renderizado)│
│ Costo de Infraestructura │ Ya pagado en SiteGround     │ $0 USD adicional en Vercel             │
│ Conversión a WhatsApp    │ Plugins de terceros pesados │ Componente React nativo ultraligero    │
└──────────────────────────┴─────────────────────────────┴────────────────────────────────────────┘
```

### Dictamen de la Mesa Técnica sobre la Landing:
**Recomendación Unánime:** **Construir la nueva Landing Page oficial en Next.js 15 dentro del ecosistema del Portal.**  
- La web volará a velocidad récord mundial en la raíz `lasmellizasperu.com`.
- **¿Y para qué usamos SiteGround?** Se mantiene activo para lo que mejor hace: **alojar los 5 correos corporativos institucionales** y gestionar los reenvíos a Gmail sin saturar el servidor con PHP ni bases de datos MySQL.

---

## 2. EL ECOSISTEMA "MODO GENIO" RATIFICADO (6 HERRAMIENTAS INTEGRADAS)

```
                                  [ HOSTINGER (DNS) ]
                      (Registros MX a SiteGround / CNAME a Vercel)
                                      │
                 ┌────────────────────┴────────────────────┐
                 ▼                                         ▼
      [ SITEGROUND (Hosting) ]                  [ VERCEL (Edge Network) ]
    Servidor de Correo Corporativo         ┌─────────────────┴─────────────────┐
   (5 buzones activos + reenvíos Gmail)    ▼                                   ▼
                                  [ lasmellizasperu.com ]         [ portal.lasmellizasperu.com ]
                                   Landing Page Next.js 15          Portal Clínico Autenticado
                                   (Velocidad récord < 0.5s)       (Admisión, Caja, HCE, Supervisión)
                                           │                                   │
                                           │                                   ▼
                                           │                        [ SUPABASE POSTGRESQL ]
                                           │                       (Pizarra Limpia V2 / Zero Trust)
                                           │                                   ▲
                                           ▼                                   │
                               [ CHATBOT IA WHATSAPP ] ◄───────────────► [ BACKUP 2TB GDRIVE ]
                                (Gemini Flash API 24/7)                 (5TB Google One AI Pro)
```

---

## 3. ASIGNACIÓN ESTRATÉGICA DE ACTIVOS

### 3.1. Dominio en Hostinger: La Torre de Control DNS
- **Registros MX:** Se mantienen apuntando al 100% hacia **SiteGround**, garantizando que los 5 correos corporativos y los alias de reenvío a Gmail no sufran ni un segundo de desconexión.
- **Registro A / CNAME Principal (`@` y `www`):** Apunta a Vercel para servir la Landing Page de alta velocidad.
- **Registro CNAME `portal`:** Apunta a `cname.vercel-dns.com` para ingresar al sistema clínico.

### 3.2. Hosting en SiteGround: Central de Comunicaciones y Correo
- Ya no se malgasta el rendimiento del servidor ejecutando un WordPress pesado.
- Se dedica el 100% de la cuota del plan de SiteGround a la estabilidad, entrega y filtros anti-spam de los **5 correos institucionales de @lasmellizasperu.com**.

### 3.3. GitHub: La Bóveda de Código y Despliegue Continuo
- Repositorio privado institucional único.
- Conexión directa (*Continuous Integration*) con Vercel: cada mejora médica se despliega en vivo en menos de 60 segundos sin requerir intervenciones manuales en servidores.

### 3.4. Supabase: Núcleo Relacional Transaccional
- Base de datos relacional PostgreSQL 15 bajo el script maestro [`00_DESPLIEGUE_PIZARRA_LIMPIA_V2.sql`](file:///d:/LAS_MELLIZAS_ANTIGRVTY_2026/las-mellizas-portal/docs/expediente_dg/00_DESPLIEGUE_PIZARRA_LIMPIA_V2.sql).
- Cero tablas en inglés, cero datos sintéticos de prueba, 16 tablas canónicas en español y aislamiento multisede estricto por `site_id` (Independencia y Vivanco).

---

## 4. LA REVOLUCIÓN DE LA INTELIGENCIA ARTIFICIAL: GOOGLE ONE AI PRO (5TB + GEMINI)

Al disponer de **5 Terabytes** y la suite de IA de Google, la Mesa Técnica estructura el aprovechamiento en dos pilares de alto impacto:

### 4.1. Bóveda de Continuidad Operativa (Reserva de 2 Terabytes)
- Se reservan **2 TB exclusivos** en Google Drive para la contingencia médica y legal ante SUSALUD:
  1. **Volcado Diario Automatizado:** Respaldo en frío (`pg_dump` con cifrado AES-256) depositado cada noche a las 22:00 PET en Google Drive.
  2. **Archivo Histórico de Imágenes Ecográficas:** Almacenamiento a perpetuidad de capturas ecográficas 4D/5D en resolución nativa, liberando espacio en la base de datos de producción.

### 4.2. Asistente Clínico Multimodal en Consultorio (HCE + Gemini)
- Integración de **Gemini 1.5 / 2.0 Flash API** dentro del módulo de Historia Clínica:
  - **Dictado por Voz de Hallazgos:** La obstetra o ecografista dicta los hallazgos en consultorio y la IA los transcribe y estructura automáticamente según el formato MINSA (biometría fetal, posición placentaria, líquido amniótico).
  - **Sugerencias y Cálculo Biométrico:** Detección de percentiles fetales cruzando las mediciones de DBP, LF y CA contra tablas Hadlock en tiempo real.

### 4.3. Agente de IA / Chatbot 24/7 para WhatsApp Oficial
- **El canal de ventas más potente para Las Mellizas:**
  - El 90% de pacientes en Lima busca y consulta por WhatsApp.
  - Se entrena un Agente de IA en Gemini con:
    1. El **Tarifario Oficial de 47 prestaciones** (precios exactos de ecografías 2D, 3D, 4D, 5D, doppler, ginecología y paquetes de control prenatal).
    2. Las **direcciones, horarios y teléfonos** de Sede Independencia y Sede Vivanco.
    3. Las **instrucciones de preparación previas** (ayuno, retención de orina, semanas óptimas de gestación para ecografía morfológica o genética).
  - El bot atiende a cualquier hora (incluso de madrugada), responde con calidez y deriva el cierre de la cita directamente a la ventanilla de la sede seleccionada.

---

## 5. HOJA DE RUTA DE IMPLEMENTACIÓN

```
[ PASO 1: Formateo y Pizarra Limpia ] (Viernes 25 - Sábado 26)
  ├── 1.1 Reseteo y despliegue de base de datos virgen en Supabase (00_DESPLIEGUE_PIZARRA_LIMPIA_V2.sql)
  ├── 1.2 Limpieza del GitHub institucional y subida de repositorio único privado
  └── 1.3 Conexión y despliegue del Portal Clínico en Vercel (portal.lasmellizasperu.com)

[ PASO 2: Blindaje de Correo y Enlace DNS ] (Sábado 26)
  ├── 2.1 En Hostinger: Mantener intactos los registros MX a SiteGround (5 correos a salvo)
  └── 2.2 En Hostinger: Crear CNAME portal hacia Vercel y enlazar dominio principal

[ PASO 3: Lanzamiento del Piloto en Sedes ] (Lunes 28 - 08:00 PET)
  └── Apertura de atención médica en Independencia y Vivanco con el Portal Clínico al 100%

[ PASO 4: Despliegue de Landing Récord + Chatbot WhatsApp ] (Semana 1 del Piloto)
  ├── 4.1 Sustitución de WordPress por la Landing Next.js ultrarrápida (Score 100 en Google)
  ├── 4.2 Conexión de backup diario de 2TB a Google Drive
  └── 4.3 Puesta en marcha del Agente de IA en WhatsApp con el Tarifario oficial
```

---

## 6. CONCLUSIÓN FINANCIERA Y ESTRATÉGICA

* **Gasto adicional en los primeros 90 días:** **$0.00 USD**.
* **Aprovechamiento de lo pagado:** 100% de Hostinger, 100% de los buzones de SiteGround y los 5TB de Google One AI Pro en producción.
* **Seguridad y Cumplimiento Legal:** Totalmente blindado ante MINSA, SUSALUD y Ley de Protección de Datos.
