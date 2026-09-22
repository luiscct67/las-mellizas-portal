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

async function updateCita() {
  await supabase.auth.signInWithPassword({
    email: 'admision.ind1@lasmellizasperu.com',
    password: 'Mellizas#2026!'
  });

  const { data, error } = await supabase
    .from('cita_reagendada')
    .update({
      site_id: 'b0000000-0000-0000-0000-000000000002' // Sede Vivanco
    })
    .eq('paciente_nombre', 'ejmnombre ejmapellido')
    .select();

  console.log("Cita actualizada a Sede Vivanco:", JSON.stringify(data, null, 2));
  if (error) console.error("Error al actualizar:", error);
}

updateCita();
