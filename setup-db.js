import bcrypt from 'bcrypt';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function setup() {
  console.log('\n🚀 CONFIGURANDO BASE DE DATOS\n');

  console.log('📝 Creando usuarios...');

  const users = [
    { username: 'admin', password: 'admin123', role: 'admin' },
    { username: 'driver1', password: 'driver123', role: 'driver' },
    { username: 'driver2', password: 'driver123', role: 'driver' },
    { username: 'preparer1', password: 'prep123', role: 'preparer' }
  ];

  for (const user of users) {
    const hash = await bcrypt.hash(user.password, 10);
    const { error } = await supabase
      .from('users')
      .insert({ username: user.username, password_hash: hash, role: user.role });

    if (error && !error.message.includes('duplicate')) {
      console.error(`❌ Error creando ${user.username}:`, error.message);
    } else {
      console.log(`✅ ${user.username} (${user.password})`);
    }
  }

  console.log('\n📍 Creando rutas...');

  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  const routes = [];

  for (const day of days) {
    for (let i = 1; i <= 8; i++) {
      routes.push({ day, route_number: i, status: 'pending' });
    }
  }

  const { data, error } = await supabase
    .from('routes')
    .insert(routes)
    .select();

  if (error) {
    console.error('❌ Error:', error.message);
  } else {
    console.log(`✅ ${data.length} rutas creadas`);
  }

  console.log('\n✨ BASE DE DATOS LISTA\n');
  console.log('CREDENCIALES:');
  console.log('  admin / admin123');
  console.log('  driver1 / driver123');
  console.log('  driver2 / driver123');
  console.log('  preparer1 / prep123\n');
}

setup();
