/*
  # Sistema Completo de Logística

  1. Tablas Creadas
    - `users`: Usuarios del sistema con autenticación
      - `id` (serial, primary key)
      - `username` (text, único)
      - `password` (text, hash bcrypt)
      - `role` (text: 'admin', 'driver', 'preparer')
      - `created_at` (timestamp)
    
    - `routes`: Rutas de entrega por día
      - `id` (serial, primary key)
      - `day_of_week` (text: día de la semana)
      - `priority_number` (integer: número de ruta)
      - `status` (text: 'pending', 'preparing', 'done')
      - `driver_name` (text, nullable)
      - `preparer_name` (text, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `carpet_requests`: Solicitudes de cambio de alfombras
      - `id` (serial, primary key)
      - `route_id` (integer, foreign key)
      - `details` (text)
      - `driver_name` (text)
      - `day_of_week` (text)
      - `priority_number` (integer)
      - `created_at` (timestamp)
    
    - `stock_issues`: Problemas de inventario
      - `id` (serial, primary key)
      - `item_name` (text)
      - `issue_type` (text: 'out_of_stock', 'discontinued')
      - `reported_at` (timestamp)

  2. Seguridad
    - RLS habilitado en todas las tablas
    - Políticas públicas para permitir operaciones (autenticación manejada en backend)

  3. Notas Importantes
    - Todas las contraseñas se almacenan con hash bcrypt
    - Sistema de tiempo real con actualizaciones instantáneas
*/

-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'driver', 'preparer')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear tabla de rutas
CREATE TABLE IF NOT EXISTS routes (
  id SERIAL PRIMARY KEY,
  day_of_week TEXT NOT NULL,
  priority_number INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'done')),
  driver_name TEXT,
  preparer_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear tabla de solicitudes de cambio
CREATE TABLE IF NOT EXISTS carpet_requests (
  id SERIAL PRIMARY KEY,
  route_id INTEGER REFERENCES routes(id) ON DELETE CASCADE,
  details TEXT NOT NULL,
  driver_name TEXT NOT NULL,
  day_of_week TEXT NOT NULL,
  priority_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear tabla de problemas de stock
CREATE TABLE IF NOT EXISTS stock_issues (
  id SERIAL PRIMARY KEY,
  item_name TEXT NOT NULL,
  issue_type TEXT NOT NULL CHECK (issue_type IN ('out_of_stock', 'discontinued')),
  reported_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS en todas las tablas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE carpet_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_issues ENABLE ROW LEVEL SECURITY;

-- Políticas para users (acceso público para este sistema)
CREATE POLICY "Public access to users" ON users FOR ALL USING (true) WITH CHECK (true);

-- Políticas para routes (acceso público)
CREATE POLICY "Public access to routes" ON routes FOR ALL USING (true) WITH CHECK (true);

-- Políticas para carpet_requests (acceso público)
CREATE POLICY "Public access to requests" ON carpet_requests FOR ALL USING (true) WITH CHECK (true);

-- Políticas para stock_issues (acceso público)
CREATE POLICY "Public access to stock" ON stock_issues FOR ALL USING (true) WITH CHECK (true);
