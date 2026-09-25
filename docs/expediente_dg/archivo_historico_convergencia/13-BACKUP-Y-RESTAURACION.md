# PLAN DE BACKUP Y RESTAURACION

## 1. Politica de Respaldo
- Snapshots diarios automaticos en Supabase.
- Script de exportacion logica (pg_dump) programado semanalmente.
- Respaldo cifrado de buckets de Storage (PDFs y ecografias).

## 2. Protocolo de Recuperacion ante Desastres (DRP)
- RTO (Recovery Time Objective): Menor a 2 horas.
- RPO (Recovery Point Objective): Menor a 24 horas (o 1 hora con PITR activo en plan Pro).
- Procedimiento: Restauracion de snapshot desde Supabase Dashboard o CLI a un nuevo proyecto en caso de corrupcion mayor.
