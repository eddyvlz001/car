import bcrypt from 'bcrypt';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Faltan variables de entorno de Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function populateDatabase() {
  console.log('\n🚀 Iniciando población de base de datos...\n');

  try {
    // Limpiar tablas
    console.log('🧹 Limpiando tablas existentes...');
    await supabase.from('carpet_requests').delete().neq('id', 0);
    await supabase.from('stock_issues').delete().neq('id', 0);
    await supabase.from('routes').delete().neq('id', 0);
    await supabase.from('users').delete().neq('id', 0);
    console.log('✅ Tablas limpiadas\n');

    // Crear usuarios
    console.log('👥 Creando usuarios...');
    const users = [
      { username: 'admin', password: 'admin123', role: 'admin' },
      { username: 'driver1', password: 'driver123', role: 'driver' },
      { username: 'driver2', password: 'driver123', role: 'driver' },
      { username: 'preparer1', password: 'prep123', role: 'preparer' },
      { username: 'preparer2', password: 'prep123', role: 'preparer' }
    ];

    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      const { error } = await supabase
        .from('users')
        .insert({ username: user.username, password: hashedPassword, role: user.role });

      if (error) {
        console.error(`❌ Error creando ${user.username}:`, error.message);
      } else {
        console.log(`  ✅ ${user.username} (${user.role}) - contraseña: ${user.password}`);
      }
    }

    // Crear rutas
    console.log('\n📍 Creando rutas...');
    const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    const routes = [];

    for (const day of days) {
      for (let i = 1; i <= 8; i++) {
        routes.push({
          day_of_week: day,
          priority_number: i,
          status: 'pending',
          driver_name: null,
          preparer_name: null
        });
      }
    }

    const { data: insertedRoutes, error: routesError } = await supabase
      .from('routes')
      .insert(routes)
      .select();

    if (routesError) {
      console.error('❌ Error creando rutas:', routesError.message);
    } else {
      console.log(`✅ ${insertedRoutes.length} rutas creadas (8 por día x 7 días)`);
    }

    // Verificar
    console.log('\n🔍 Verificando datos...');
    const { data: usersData } = await supabase.from('users').select('username, role');
    const { data: routesData } = await supabase.from('routes').select('id');

    console.log('\n📊 RESUMEN FINAL:');
    console.log(`  👥 Usuarios: ${usersData?.length || 0}`);
    console.log(`  📍 Rutas: ${routesData?.length || 0}`);

    console.log('\n✨ ¡BASE DE DATOS LISTA!\n');
    console.log('🔐 CREDENCIALES DE ACCESO:');
    console.log('  Admin:        admin / admin123');
    console.log('  Conductor 1:  driver1 / driver123');
    console.log('  Conductor 2:  driver2 / driver123');
    console.log('  Preparador 1: preparer1 / prep123');
    console.log('  Preparador 2: preparer2 / prep123');
    console.log('');

  } catch (error) {
    console.error('❌ Error general:', error);
    process.exit(1);
  }
}

populateDatabase()
  .then(() => {
    console.log('✅ Proceso completado exitosamente');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
