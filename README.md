# Portal Clínico Las Mellizas Perú S.A.C.
**Arquitectura:** Next.js 15 (App Router, React 19, TypeScript, Tailwind CSS) + Supabase (PostgreSQL 15+ Cloud con RLS) + Vercel + GitHub  
**RUC:** 20611827335 &bull; Huamanga, Ayacucho, Perú

---

## 1. Módulos Implementados

* **Recepción & Admisión (`/recepcion`):** Padrón de pacientes, búsqueda rápida en tiempo real por DNI/Nombres, y asignación de atenciones a sala de espera.
* **Consultorio Médico / HCE (`/hce`):** Redacción clínica estructurada (Anamnesis, Examen Físico, Diagnóstico CIE-10, Tratamiento/Receta), autoguardado continuo de borrador, sellado con firma criptográfica inmutable y sistema de adendas conforme a normativa MINSA.
* **Caja & Facturación (`/caja`):** Gestión de órdenes pendientes de cobro, registro de pagos por Efectivo, Yape, Plin y Tarjeta POS, con **Aislamiento Clínico Absoluto** garantizado a nivel de base de datos (Caja no tiene acceso a diagnósticos ni notas clínicas).
* **Supervisión & Auditoría (`/supervision`):** Métricas operativas, control de directivas RLS y línea de tiempo de eventos inmutable (*append-only*).

---

## 2. Puesta en Producción en 3 Pasos (Costo \$0 / mes)

### Paso 1: Configurar la Base de Datos en Supabase (2 minutos)
1. Entra a [app.supabase.com](https://app.supabase.com) y crea una cuenta gratuita.
2. Crea un nuevo proyecto:
   * **Name:** `las-mellizas-portal`
   * **Database Password:** (Genera una segura y guárdala)
   * **Region:** `South America (São Paulo)` o `US East (N. Virginia)`
3. Ve a la sección **SQL Editor** en el menú lateral izquierdo de Supabase.
4. Abre el archivo `supabase/01_schema_supabase_v1.sql` de este proyecto, copia todo su contenido, pégalo en el editor de Supabase y presiona **Run**.
   * *Esto creará automáticamente las tablas, tipos, índices, triggers inmutables y políticas de seguridad RLS.*
5. Ve a **Project Settings > API** y copia:
   * `Project URL`
   * `anon public key`
6. Crea tu archivo `.env.local` en este directorio copiando `.env.example`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anonima-aqui
   ```

---

### Paso 2: Subir el Código a GitHub (1 minuto)
En este directorio (`las-mellizas-portal`):
```bash
git init
git add .
git commit -m "feat: Portal Clínico Las Mellizas v1.0 (Next.js 15 + Supabase + Tailwind)"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/las-mellizas-portal.git
git push -u origin main
```

---

### Paso 3: Desplegar en Vercel (1 minuto)
1. Entra a [vercel.com](https://vercel.com) e inicia sesión con tu cuenta de GitHub.
2. Presiona **Add New... > Project** e importa el repositorio `las-mellizas-portal`.
3. En la sección **Environment Variables**, agrega las dos variables de Supabase:
   * `NEXT_PUBLIC_SUPABASE_URL`
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Presiona **Deploy**. En menos de 60 segundos tu portal estará **en vivo en internet** con HTTPS automático de grado bancario.
5. *(Opcional)* En **Settings > Domains**, puedes enlazar tu dominio propio institucional: `portal.lasmellizasperu.com`.

---

## 3. Ejecución Local en Desarrollo

Para probar o continuar desarrollando en tu computadora:
```bash
# 1. Instalar dependencias
cmd /c npm install

# 2. Iniciar servidor de desarrollo
cmd /c npm run dev
```
Abre [http://localhost:3000](http://localhost:3000) en tu navegador.