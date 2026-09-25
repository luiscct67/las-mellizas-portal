# MANUAL OPERATIVO PASO A PASO: RESETEO LIMPIO Y PUESTA EN PRODUCCIÓN
## CONSULTORIO OBSTÉTRICO ECOGRÁFICO LAS MELLIZAS PERÚ S.A.C.
### Guía "A Prueba de Fallos" para Dirección General (Sábado 26 de Septiembre)

**OBJETIVO:** Dejar el ecosistema formateado de raíz, 100% bajo control de Dirección General, sin dependencias externas, con base de datos virgen y publicado en `portal.lasmellizasperu.com` en menos de 20 minutos.

---

## FASE 1: FORMATEO Y SOBERANÍA EN GITHUB (5 MINUTOS)

### 1.1. Limpieza de Miembros Externos
1. Inicia sesión en la cuenta oficial de **GitHub** de Las Mellizas.
2. Ve a **Settings** (Configuración) ➔ **Collaborators** (o *People / Members* si es Organización).
3. **Elimina a cualquier usuario ajeno** a la administración de Las Mellizas.
4. En **Settings ➔ SSH and GPG keys** y **Personal access tokens**, elimina cualquier clave remanente.

### 1.2. Creación del Repositorio Canónico Institucional
1. En GitHub, haz clic en **New repository** (Nuevo repositorio).
2. Nombre sugerido: **`las-mellizas-portal-oficial`**
3. Visibilidad: **Private** (Privado).
4. No marques "Add README", "Add .gitignore" (déjalo completamente vacío).
5. Haz clic en **Create repository**.
6. Copia la URL del repositorio (ej. `https://github.com/cuenta-las-mellizas/las-mellizas-portal-oficial.git`).

### 1.3. Subida del Código Limpio desde la Terminal Local
En esta máquina ejecutaremos:
```bash
git remote set-url origin https://github.com/cuenta-las-mellizas/las-mellizas-portal-oficial.git
git push -u origin main
```
*¡Listo! Tu GitHub oficial ahora tiene el 100% del código compilado, el expediente normativo y el script de base de datos.*

---

## FASE 2: PIZARRA LIMPIA EN SUPABASE (3 MINUTOS)

### 2.1. Crear Proyecto Virgen
1. Entra a [supabase.com](https://supabase.com) con la cuenta institucional (`administracion@lasmellizasperu.com`).
2. Haz clic en **New Project** (Nuevo Proyecto).
3. Configuración:
   - **Name:** `las-mellizas-produccion`
   - **Database Password:** Genera una contraseña segura y guárdala.
   - **Region:** `South America (São Paulo)` o `East US (North Virginia)` (baja latencia para Perú).
   - **Pricing Plan:** `Free tier ($0/month)`.
4. Haz clic en **Create new project** (tarda 60-90 segundos en aprovisionar).

### 2.2. Ejecutar el Script Maestro de Pizarra Limpia
1. En el menú lateral izquierdo de Supabase, entra a **SQL Editor**.
2. Haz clic en **New query** (Nueva consulta).
3. Abre el archivo local:  
   [`02_DESPLIEGUE_PIZARRA_LIMPIA_V2.sql`](file:///d:/LAS_MELLIZAS_ANTIGRVTY_2026/las-mellizas-portal/docs/expediente_dg/02_DESPLIEGUE_PIZARRA_LIMPIA_V2.sql)
4. Copia todo su contenido y pégalo en el editor de Supabase.
5. Haz clic en **Run** (Ejecutar).
6. **Resultado esperado:** Mensaje `Success. No rows returned` en 15 segundos.
   - Se crearon las 16 tablas oficiales en español.
   - Se crearon las sedes oficiales (Independencia y Vivanco).
   - Se activó el RLS Zero Trust.
   - Se inyectó el tarifario de 47 prestaciones médicas.

### 2.3. Copiar las Claves de Conexión
1. En Supabase, ve a **Project Settings** (engranaje) ➔ **API**.
2. Copia:
   - **Project URL** (`https://xxxxxxxxxxxx.supabase.co`)
   - **Project API Keys ➔ `anon` `public`** (`eyJhbGci...`)

---

## FASE 3: DESPLIEGUE Y PUBLICACIÓN EN VERCEL (4 MINUTOS)

### 3.1. Importar el Repositorio de GitHub
1. Entra a [vercel.com](https://vercel.com) con tu cuenta oficial.
2. Haz clic en **Add New... ➔ Project**.
3. Selecciona tu repositorio de GitHub: `las-mellizas-portal-oficial`.
4. En **Framework Preset**, Vercel detectará automáticamente **Next.js**.

### 3.2. Configurar Variables de Entorno
En la sección **Environment Variables**, añade:
* `NEXT_PUBLIC_SUPABASE_URL` = (Pega la Project URL de Supabase)
* `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (Pega la anon key de Supabase)
* `NEXT_PUBLIC_APP_URL` = `https://portal.lasmellizasperu.com`

### 3.3. Desplegar
1. Haz clic en **Deploy**.
2. En 90 segundos verás la pantalla de celebración con el portal en vivo.

---

## FASE 4: EL PUENTE DNS EN HOSTINGER (3 MINUTOS)

### 4.1. Proteger los Correos de SiteGround (No tocar MX)
1. Entra a tu panel de **Hostinger ➔ Dominios ➔ lasmellizasperu.com ➔ DNS / Servidores de nombres**.
2. **VERIFICACIÓN OBLIGATORIA:** Revisa que los registros **MX** sigan apuntando a SiteGround (ej. `mail.lasmellizasperu.com` o los provistos por SiteGround). **NO LOS MODIFIQUES**. Esto asegura que tus 5 correos institucionales sigan funcionando sin interrupción.

### 4.2. Crear el Subdominio para el Portal
1. En la misma pantalla de **Zona DNS** de Hostinger, busca la opción **Añadir Registro**:
   - **Tipo:** `CNAME`
   - **Nombre / Host:** `portal`
   - **Apunta a:** `cname.vercel-dns.com`
   - **TTL:** `300` (o el valor mínimo permitido)
2. Haz clic en **Añadir Registro**.

### 4.3. Vincular el Subdominio en Vercel
1. En Vercel, entra a tu proyecto ➔ **Settings ➔ Domains**.
2. Escribe: `portal.lasmellizasperu.com` y haz clic en **Add**.
3. Vercel validará el CNAME y emitirá automáticamente el certificado SSL seguro (**HTTPS** con candado verde).

---

## FASE 5: CHECKLIST DE VERIFICACIÓN FINAL (DOMINGO 27)

Realiza esta prueba de 2 minutos para certificar el éxito total:

1. **Ingreso Web:** Abre en el navegador `https://portal.lasmellizasperu.com`.
2. **Login:** Inicia sesión con la cuenta de Administración General (`admin@lasmellizasperu.com`).
3. **Módulo de Admisión & Caja:** Verifica que cargue la lista de pacientes y el botón de apertura de caja.
4. **Módulo HCE:** Verifica que se desplieguen las especialidades obstétricas y la calculadora de Naegele.
5. **Módulo de Supervisión:** Verifica que aparezcan los 47 servicios en el Tarifario y los 10 medicamentos en Inventario.

*¡El sistema estará 100% listo y blindado para recibir a la primera paciente el Lunes 28 a las 08:00 PET!*
