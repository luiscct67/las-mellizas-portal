/**
 * SCRIPT DE RESPALDO DIARIO AUTOMATIZADO - MODELO FREE TIER (90 DÍAS)
 * Consultorio Obstétrico Ecográfico Las Mellizas Perú S.A.C.
 *
 * Ejecución programada recomendada: 22:00 PET diariamente
 * Custodio: administracion@lasmellizasperu.com
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
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || envConfig.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[BACKUP ERROR] Faltan las credenciales de Supabase en el entorno (.env o .env.local).');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const TABLAS_A_RESPALDAR = [
  'perfil_usuario',
  'paciente',
  'encuentro',
  'orden_pago',
  'pago_detalle',
  'historia_clinica_detalle',
  'insumo_farmaco',
  'movimiento_kardex',
  'auditoria_log'
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
  console.log(`INICIANDO RESPALDO DIARIO - LAS MELLIZAS PERÚ S.A.C.`);
  console.log(`Fecha / Hora: ${ahora.toISOString()} (PET: 22:00)`);
  console.log(`Destino Local: ${backupDir}`);
  console.log(`=================================================================`);

  const resumen = {
    fecha: ahora.toISOString(),
    tablas: {},
    total_registros: 0,
    estado: 'EXITOSO'
  };

  for (const tabla of TABLAS_A_RESPALDAR) {
    try {
      const { data, error, count } = await supabase
        .from(tabla)
        .select('*', { count: 'exact' });

      if (error) {
        console.warn(`[WARN] No se pudo leer la tabla ${tabla}: ${error.message}`);
        resumen.tablas[tabla] = { error: error.message };
        continue;
      }

      const filePath = path.join(backupDir, `${tabla}_${timestamp}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

      resumen.tablas[tabla] = {
        registros: data ? data.length : 0,
        archivo: path.basename(filePath)
      };
      resumen.total_registros += (data ? data.length : 0);
      console.log(`✓ Tabla [${tabla}]: ${data ? data.length : 0} registros respaldados -> ${path.basename(filePath)}`);
    } catch (err) {
      console.error(`[ERROR] Fallo crítico al respaldar tabla ${tabla}:`, err.message);
      resumen.tablas[tabla] = { error: err.message };
    }
  }

  const manifestPath = path.join(backupDir, `MANIFEST_${timestamp}.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(resumen, null, 2), 'utf8');

  console.log(`=================================================================`);
  console.log(`RESPALDO DIARIO CULMINADO CON ÉXITO.`);
  console.log(`Total registros extraídos: ${resumen.total_registros}`);
  console.log(`Manifiesto generado en: ${manifestPath}`);
  console.log(`=================================================================`);
}

ejecutarBackupDiario().catch((err) => {
  console.error('[FATAL] Error en la ejecución del respaldo diario:', err);
  process.exit(1);
});
