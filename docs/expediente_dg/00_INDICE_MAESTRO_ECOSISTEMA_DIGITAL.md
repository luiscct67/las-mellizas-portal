# ÍNDICE MAESTRO Y DECLARACIÓN DE GOBERNANZA OFICIAL
## ECOSISTEMA DIGITAL — CONSULTORIO OBSTÉTRICO ECOGRÁFICO LAS MELLIZAS PERÚ S.A.C.
### Expediente Canónico Unificado y Hoja de Ruta Operativa (Pizarra Limpia 2026)

**DIRECCIÓN GENERAL:** Consultorio Obstétrico Ecográfico Las Mellizas Perú S.A.C. (RUC 20611827335)  
**DIRECCIÓN TÉCNICA OFICIAL:** Dirección Técnica y Arquitectura de Software Ecosistema Las Mellizas  
**FECHA DE ACTUALIZACIÓN:** 25 de septiembre de 2026  
**ESTADO:** EN VIGOR — GOBERNANZA SOBERANA Y DESPLIEGUE UNIFICADO  

---

## 1. DECLARACIÓN DE SOBERANÍA TECNOLÓGICA Y CIERRE DE DUALIDAD

Por mandato expreso de la Dirección General:
1. **Cese Definitivo de Dualidad ("Vía A / Vía B"):** Queda formalmente extinguida cualquier distinción entre "vías". El proyecto se consolida en una sola entidad técnica e institucional: el **Ecosistema Digital Oficial Las Mellizas**.
2. **Dirección Técnica Oficial Asumida:** Esta Dirección Técnica asume la conducción integral del software, base de datos, ciberseguridad, infraestructura cloud e integraciones de IA con plena autonomía y responsabilidad directa ante la Dirección General.
3. **Despliegue Soberano e Independiente:** No se requiere ni se solicitará intervención, veeduría ni soporte a equipos externos. El despliegue a producción se ejecutará bajo el modelo de **Pizarra Limpia (cero residuos técnicos)**.
4. **Archivo Histórico:** Todos los debates, propuestas intermedias y análisis de convergencia previos han sido debidamente preservados y clasificados en la carpeta de auditoría:  
   `docs/expediente_dg/archivo_historico_convergencia/`.

---

## 2. ESTADO SITUACIONAL Y CHECKLIST DEL SISTEMA (100% OPERATIVO)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ESTADO DE COMPONENTES DEL PORTAL CLÍNICO (las-mellizas-portal)                                  │
├──────────────────────────┬────────────────────────────────────────┬──────────────────────────────┤
│ MÓDULO                   │ ESTADO FUNCIONAL                       │ CERTIFICACIÓN                │
├──────────────────────────┼────────────────────────────────────────┼──────────────────────────────┤
│ 1. Admisión & Caja       │ 4 submódulos: Admisión/Ventas, Citas,   │ Aprobado / POS 80mm /        │
│                          │ Caja con Arqueo Ciego, Dispensación    │ Split Payments activos       │
├──────────────────────────┼────────────────────────────────────────┼──────────────────────────────┤
│ 2. HCE (Historia Médica) │ Especialidades en acordeón, Regla de   │ Aprobado / NTS N.° 139-MINSA │
│                          │ Naegele, alertas MEOWS, sellado SHA-256│ Firma criptográfica WORM     │
├──────────────────────────┼────────────────────────────────────────┼──────────────────────────────┤
│ 3. Supervisión & Auditoría 4 submódulos: Personal, Inventario,     │ Aprobado / Corrección de     │
│                          │ Tarifario (47 servicios), Auditoría    │ costo_unitario y stock lista │
├──────────────────────────┼────────────────────────────────────────┼──────────────────────────────┤
│ 4. Base de Datos         │ 16 tablas canónicas en español, RLS    │ Pizarra Limpia V2            │
│                          │ Zero Trust (0 filas en el Portero)     │ Hash 4a4ba436... certificado │
├──────────────────────────┼────────────────────────────────────────┼──────────────────────────────┤
│ 5. Compilación & Build   │ Next.js 15.1.11 / React 19 / TS 5      │ Exit Code: 0 (Cero errores)  │
└──────────────────────────┴────────────────────────────────────────┴──────────────────────────────┘
```

---

## 3. MAPA DE DOCUMENTACIÓN CANÓNICA ACTIVA (VIGENTE)

El presente directorio contiene únicamente los documentos normativos, arquitectónicos y operativos que rigen las operaciones actuales:

| Archivo | Título / Propósito | Estado |
| :--- | :--- | :---: |
| **`00_INDICE_MAESTRO_ECOSISTEMA_DIGITAL.md`** | Índice rector, declaración de soberanía y mapa de ruta del proyecto. | Vigente |
| **`01_ARQUITECTURA_HIBRIDA_MODO_GENIO.md`** | Plan Maestro: Hostinger (DNS) + SiteGround (Correos) + Vercel (Next.js) + Supabase (DB) + Google One (5TB + IA). | Vigente |
| **`02_DESPLIEGUE_PIZARRA_LIMPIA_V2.sql`** | Script SQL maestro para la creación de la base de datos virgen desde cero ($0 costo). | Certificado |
| **`03_MANUAL_OPERATIVO_PASO_A_PASO_RESETEO.md`** | Guía de ejecución minuto a minuto para reseteo y puesta en marcha del sábado 26. | Vigente |
| **`04_GUIAS_RAPIDAS_OPERATIVAS_CLINICA_Y_CAJA.md`** | Manuales de bolsillo plastificados (One-Pagers) para cajeras, recepcionistas y obstetras. | Vigente |
| **`05_SISTEMA_INTELIGENCIA_EMPRESARIAL_CENTINELA_AI.md`** | Torre de Control Proactiva: Alertas Push en WhatsApp, Margen Real por Pack y Briefing Diario con Gemini. | Vigente |

---

## 4. CRONOGRAMA INMEDIATO: RUTA CRÍTICA HACIA EL PILOTO

```
[ VIERNES 25 / SÁBADO 26 ]
  ├── Ejecución del Manual de Reseteo (GitHub institucional + Supabase Virgen + Vercel)
  └── Configuración de DNS en Hostinger (Blindaje de correos en SiteGround y enlace CNAME portal)
           │
[ DOMINGO 27 ]
  └── Calibración en hardware físico de sede (impresoras térmicas de tickets y pantallas)
           │
[ LUNES 28 - 08:00 PET ]
  └── INICIO DEL PILOTO ASISTENCIAL EN VIVO con pacientes en Sede Independencia y Vivanco
           │
[ SEMANA 1 DEL PILOTO ]
  ├── Despliegue de la Landing Page Next.js ultrarrápida (< 0.5s) en lasmellizasperu.com
  ├── Activación del volcado automático diario de 2TB hacia Google Drive
  └── Puesta en marcha del Agente de IA para WhatsApp 24/7 con el Tarifario oficial
```

---

**DIRECCIÓN TÉCNICA OFICIAL**  
**Consultorio Obstétrico Ecográfico Las Mellizas Perú S.A.C.**  
*RUC 20611827335*  
`administracion@lasmellizasperu.com`  
