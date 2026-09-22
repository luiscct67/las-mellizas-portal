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

async function check() {
  const { data: citas, error: errCitas } = await supabase
    .from('cita_reagendada')
    .select('*');
  console.log('CITAS TOTALES:', citas?.length);
  console.log('CITAS DETALLE:', JSON.stringify(citas, null, 2));
  if (errCitas) console.error('ERR CITAS:', errCitas);

  const { data: sites, error: errSites } = await supabase
    .from('sites')
    .select('*');
  console.log('SITES:', JSON.stringify(sites, null, 2));
}

check();
