# DIAGRAMA DE COMPONENTES DEL SISTEMA

`mermaid
graph TD
    subgraph Navegador [Cliente Web / PWA]
        UI_Adm[Ventanilla Admision y Caja]
        UI_HCE[Modulo Consultorio HCE]
        UI_Sup[Panel de Supervision y Turnos]
    end

    subgraph Vercel [Hosting Edge Serverless]
        NextApp[Next.js 15 App Router]
        AuthMiddleware[Middleware de Sesion]
        API_Routes[Endpoints /api/]
    end

    subgraph Supabase [Backend as a Service]
        PG[(PostgreSQL 15)]
        AuthEngine[Supabase Auth Engine]
        RT[Realtime Engine / WebSocket]
        Storage[Supabase Storage Buckets]
    end

    UI_Adm -->|HTTPS| NextApp
    UI_HCE -->|HTTPS| NextApp
    UI_Sup -->|HTTPS| NextApp
    NextApp -->|JWT Session| AuthMiddleware
    NextApp -->|PostgREST + RLS| PG
    UI_Adm -->|Broadcast Canal cola-medica| RT
    RT -->|Notificacion Instantanea| UI_HCE
    UI_HCE -->|Subida PDF / Imagenes| Storage
`
