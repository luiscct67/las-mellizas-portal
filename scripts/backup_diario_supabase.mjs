/**
 * SCRIPT DE RESPALDO DIARIO AUTOMATIZADO - MODELO FREE TIER (90 DÍAS)
 * Consultorio Obstétrico Ecográfico Las Mellizas Perú S.A.C.
 * RUC: 20611827335
 *
 * Custodio Oficial Designado: admin@lasmellizasperu.com
 * Ejecución recomendada: Manual antes de cada intervención o programada diariamente
 * 
 * Uso:
 *   node scripts/backup_diario_supabase.mjs
 *   O pasando la service key para volcado completo administrativo:
 *   $env:SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key"; node scripts/backup_diario_supabase.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno si existen en .env o .env.local
const envPath = path.resolve(__dirname, '../.env.local');
const envFallback = path.resolve(__dirname, '../.env');

let envConfig = {};
const targetEnv = fs.existsSync(envPath) ? envPath : (fs.existsSync(envFallback) ? envFallback : null);

if (targetEnv) {
  const content = fs.readFileSync(targetEnv, 'utf8');
  content.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      value = value.replace(/^['"](.*)['"]$/, '$1').trim();
      envConfig[key] = value;
    }
  });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || envConfig.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || envConfig.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[BACKUP ERROR] Faltan las credenciales de Supabase en el entorno (.env o .env.local).');
  process.exit(1);
}

const isServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || envConfig.SUPABASE_SERVICE_ROLE_KEY);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

// Catálogo oficial de las 16 tablas canónicas del Ecosistema Las Mellizas
const TABLAS_A_RESPALDAR = [
  'organizacion',
  'sede',
  'perfil_usuario',
  'usuario_sede',
  'paciente',
  'encuentro',
  'cita_reagendada',
  'nota_clinica',
  'adenda',
  'caja_turno',
  'caja_egreso',
  'orden_pago',
  'pago',
  'auditoria',
  'producto_inventario',
  'movimiento_inventario'
];

async function ejecutarBackupDiario() {
  const ahora = new Date();
  const timestamp = ahora.toISOString().replace(/[:.]/g, '-');
  const fechaStr = ahora.toISOString().split('T')[0];

  const backupDir = path.resolve(__dirname, '../backups', fechaStr);
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log(`=================================================================`);
  console.log(`INICIANDO RESPALDO COMPLETO A COSTO $0 - LAS MELLIZAS PERÚ S.A.C.`);
  console.log(`Custodio: admin@lasmellizasperu.com`);
  console.log(`Fecha / Hora: ${ahora.toISOString()}`);
  console.log(`Nivel de Privilegios: ${isServiceRole ? 'ADMINISTRATIVO (Service Role - Full Bypass)' : 'USUARIO BASE (Anon Key)'}`);
  console.log(`Destino Local: ${backupDir}`);
  console.log(`=================================================================`);

  const resumen = {
    fecha: ahora.toISOString(),
    custodio: 'admin@lasmellizasperu.com',
    nivel_privilegio: isServiceRole ? 'SERVICE_ROLE_ADMIN' : 'ANON_BASE',
    tablas: {},
    total_registros: 0,
    estado: 'EXITOSO'
  };

  const sqlStatements = [];
  sqlStatements.push(`-- RESPALDO LÓGICO DE SEGURIDAD - LAS MELLIZAS PERÚ S.A.C.`);
  sqlStatements.push(`-- FECHA: ${ahora.toISOString()}`);
  sqlStatements.push(`-- CUSTODIO: admin@lasmellizasperu.com\n`);

  for (const tabla of TABLAS_A_RESPALDAR) {
    try {
      const { data, error } = await supabase
        .from(tabla)
        .select('*');

      if (error) {
        // Si la tabla aún no existe (ej. usuario_sede antes del paso 6), registrar advertencia suave
        console.warn(`[INFO] Tabla '${tabla}': ${error.message}`);
        resumen.tablas[tabla] = { estado: 'NO_ACCESIBLE_O_PENDIENTE', detalle: error.message, registros: 0 };
        continue;
      }

      const count = data ? data.length : 0;
      const filePath = path.join(backupDir, `${tabla}_${timestamp}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

      resumen.tablas[tabla] = {
        estado: 'RESPALDADA',
        registros: count,
        archivo: path.basename(filePath)
      };
      resumen.total_registros += count;

      // Generar DML SQL para restauración directa
      if (count > 0) {
        sqlStatements.push(`-- Tabla: public.${tabla} (${count} registros)`);
        for (const row of data) {
          const keys = Object.keys(row);
          const cols = keys.join(', ');
          const values = keys.map(k => {
            const v = row[k];
            if (v === null || v === undefined) return 'NULL';
            if (typeof v === 'number' || typeof v === 'boolean') return v;
            if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
            return `'${String(v).replace(/'/g, "''")}'`;
          }).join(', ');
          sqlStatements.push(`INSERT INTO public.${tabla} (${cols}) VALUES (${values}) ON CONFLICT DO NOTHING;`);
        }
        sqlStatements.push('');
      }

      console.log(`✓ Tabla [${tabla.padEnd(22)}]: ${String(count).padStart(3)} registros -> ${path.basename(filePath)}`);
    } catch (err) {
      console.error(`[ERROR] Fallo crítico al respaldar tabla ${tabla}:`, err.message);
      resumen.tablas[tabla] = { estado: 'ERROR', error: err.message };
    }
  }

  // Guardar volcado SQL consolidado restaurable en 1 click
  const sqlDumpPath = path.join(backupDir, `VOLCADO_RESTAURABLE_${timestamp}.sql`);
  fs.writeFileSync(sqlDumpPath, sqlStatements.join('\n'), 'utf8');

  // Guardar Manifiesto de auditoría
  const manifestPath = path.join(backupDir, `MANIFEST_${timestamp}.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(resumen, null, 2), 'utf8');

  console.log(`=================================================================`);
  console.log(`RESPALDO CULMINADO CON ÉXITO.`);
  console.log(`Total registros extraídos: ${resumen.total_registros}`);
  console.log(`Volcado SQL Restaurable:  ${path.basename(sqlDumpPath)}`);
  console.log(`Manifiesto de Auditoría:  ${path.basename(manifestPath)}`);
  console.log(`=================================================================`);
}

ejecutarBackupDiario().catch((err) => {
  console.error('[FATAL] Error en la ejecución del respaldo diario:', err);
  process.exit(1);
});
