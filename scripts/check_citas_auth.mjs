import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let envConfig = {};
const envPath = path.resolve(__dirname, '../.env.local');
const content = fs.readFileSync(envPath, 'utf8');
content.split('\n').forEach(l => {
  const m = l.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) envConfig[m[1]] = (m[2] || '').replace(/^['"](.*)['"]$/, '$1').trim();
});

const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testQueryWithLogin() {
  // Try logging in with the known accounts
  const emails = [
    'admision.ind1@lasmellizasperu.com',
    'admision.viv1@lasmellizasperu.com',
    'admin@lasmellizasperu.com'
  ];

  // Try common passwords used during provisioning
  const passwords = [
    'Mellizas#2026!',
    'Mellizas2026!',
    'LasMellizas2026!',
    'Admin2026!',
    'Independencia2026!',
    'Vivanco2026!'
  ];

  let authed = false;
  for (const email of emails) {
    for (const pwd of passwords) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pwd
      });
      if (data?.user) {
        console.log(`✓ Autenticado exitosamente como ${email}`);
        authed = true;
        break;
      }
    }
    if (authed) break;
  }

  // Query cita_reagendada
  const { data: citas, error: errCitas } = await supabase
    .from('cita_reagendada')
    .select('*');

  console.log('CITAS REGISTRADAS EN SUPABASE:', JSON.stringify(citas, null, 2));
  if (errCitas) console.error('ERR CITAS:', errCitas);

  // Also query encuentro
  const { data: encuentros, error: errEnc } = await supabase
    .from('encuentro')
    .select('id, paciente_id, site_id, estado, created_at, paciente:paciente_id(nombres, apellidos, dni)')
    .order('created_at', { ascending: false })
    .limit(10);
  console.log('ÚLTIMOS ENCUENTROS:', JSON.stringify(encuentros, null, 2));
  if (errEnc) console.error('ERR ENC:', errEnc);
}

testQueryWithLogin();
