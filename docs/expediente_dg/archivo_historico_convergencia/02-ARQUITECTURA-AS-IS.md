# ARQUITECTURA AS-IS - ECOSISTEMA DIGITAL LAS MELLIZAS

## 1. Trinomio Cloud
- **GitHub:** Repositorio privado (luiscct67/las-mellizas-portal). CI/CD automatizado via webhooks hacia Vercel.
- **Vercel:** Hosting Edge Serverless. Next.js 15.1.7 (React 19, App Router, Tailwind CSS, Lucide Icons).
- **Supabase:** PostgreSQL 15, Auth (JWT con cookies HTTP-only), Realtime (WebSocket para cola de pacientes), Storage S3-compatible, RLS granular.

## 2. Flujo de Datos y Conexiones
El cliente web (navegador) interactua con Vercel para paginas SSR y Client Components. Las transacciones de datos se realizan directamente hacia Supabase mediante el SDK oficial supabase-js usando la clave ANON publica respetando RLS en cliente, y SERVICE_ROLE en endpoints administrativos restringidos.
