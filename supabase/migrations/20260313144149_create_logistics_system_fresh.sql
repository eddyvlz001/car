/*
  # Sistema de Logística - Base de Datos Completamente Nueva

  1. Tablas Nuevas
    - `users` (usuarios del sistema)
      - `id` (serial, clave primaria)
      - `username` (text, único, no nulo)
      - `password_hash` (text, no nulo)
      - `role` (text, no nulo: admin/driver/preparer)
      - `created_at` (timestamptz, default now())

    - `routes` (rutas de entrega)
      - `id` (serial, clave primaria)
      - `day` (text, no nulo: MONDAY-SUNDAY)
      - `route_number` (integer, no nulo)
      - `status` (text, default pending: pending/preparing/done)
      - `driver` (text, nullable)
      - `preparer` (text, nullable)
      - `updated_at` (timestamptz, default now())

    - `carpet_requests` (solicitudes de cambio de alfombras)
      - `id` (serial, clave primaria)
      - `route_id` (integer, foreign key a routes)
      - `details` (text, no nulo)
      - `driver_name` (text, no nulo)
      - `day` (text, no nulo)
      - `route_number` (integer, no nulo)
      - `created_at` (timestamptz, default now())

    - `stock_issues` (problemas de inventario)
      - `id` (serial, clave primaria)
      - `item` (text, no nulo)
      - `type` (text, no nulo: out_of_stock/discontinued)
      - `created_at` (timestamptz, default now())

  2. Seguridad
    - RLS habilitado en todas las tablas
    - Políticas públicas de acceso (autenticación en backend)

  3. Índices
    - Índice en users.username para búsquedas rápidas
    - Índice en routes(day, route_number) para ordenamiento
*/

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'driver', 'preparer')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS routes (
  id SERIAL PRIMARY KEY,
  day TEXT NOT NULL CHECK (day IN ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY')),
  route_number INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'done')),
  driver TEXT,
  preparer TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(day, route_number)
);

CREATE TABLE IF NOT EXISTS carpet_requests (
  id SERIAL PRIMARY KEY,
  route_id INTEGER REFERENCES routes(id) ON DELETE CASCADE,
  details TEXT NOT NULL,
  driver_name TEXT NOT NULL,
  day TEXT NOT NULL,
  route_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_issues (
  id SERIAL PRIMARY KEY,
  item TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('out_of_stock', 'discontinued')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_routes_day_number ON routes(day, route_number);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE carpet_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to routes" ON routes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to requests" ON carpet_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to stock" ON stock_issues FOR ALL USING (true) WITH CHECK (true);
