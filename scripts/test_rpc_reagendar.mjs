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

async function testRpc() {
  await supabase.auth.signInWithPassword({
    email: 'admision.ind1@lasmellizasperu.com',
    password: 'Mellizas#2026!'
  });

  console.log("Llamando RPC reprogramar_cita_y_retirar_espera para Vivanco...");
  const res = await supabase.rpc('reprogramar_cita_y_retirar_espera', {
    p_encuentro_id: null,
    p_paciente_nombre: 'Paciente Test Vivanco',
    p_telefono: '999111222',
    p_fecha: '2026-09-24',
    p_hora: '10:00',
    p_motivo: 'Control Ecográfico en Vivanco',
    p_site_id: 'b0000000-0000-0000-0000-000000000002',
    p_usuario_nombre: 'Admisión Independencia'
  });

  console.log("Respuesta RPC:", JSON.stringify(res, null, 2));

  // Verificar si se creó en cita_reagendada
  const { data: citas } = await supabase.from('cita_reagendada').select('*').eq('paciente_nombre', 'Paciente Test Vivanco');
  console.log("Citas encontradas para Paciente Test Vivanco:", JSON.stringify(citas, null, 2));
}

testRpc();
