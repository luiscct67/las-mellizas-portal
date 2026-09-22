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

async function test() {
  console.log("Probando insert anónimo en cita_reagendada...");
  const res = await supabase.from('cita_reagendada').insert({
    paciente_nombre: 'Test Paciente',
    fecha: '2026-09-25',
    hora: '10:00',
    motivo: 'Control Ecográfico',
    site_id: 'b0000000-0000-0000-0000-000000000002',
    estado: 'PROGRAMADA'
  }).select();

  console.log("Resultado Insert:", JSON.stringify(res, null, 2));
}

test();
