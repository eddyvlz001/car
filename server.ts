import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import bcrypt from 'bcrypt';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (error || !user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    res.json({
      id: user.id,
      username: user.username,
      role: user.role
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.get('/api/routes', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('routes')
      .select('*')
      .order('day')
      .order('route_number');

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo rutas' });
  }
});

app.post('/api/routes/:id/status', async (req, res) => {
  try {
    const { status, driver, preparer } = req.body;
    const updates: any = { status, updated_at: new Date().toISOString() };
    if (driver !== undefined) updates.driver = driver;
    if (preparer !== undefined) updates.preparer = preparer;

    const { data, error } = await supabase
      .from('routes')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    io.emit('route_updated', data);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Error actualizando ruta' });
  }
});

app.post('/api/routes/batch-status', async (req, res) => {
  try {
    const { ids, status, driver, preparer } = req.body;
    const updates: any = { status, updated_at: new Date().toISOString() };
    if (driver) updates.driver = driver;
    if (preparer) updates.preparer = preparer;

    const { data, error } = await supabase
      .from('routes')
      .update(updates)
      .in('id', ids)
      .select();

    if (error) throw error;
    data?.forEach(r => io.emit('route_updated', r));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Error en actualización masiva' });
  }
});

app.get('/api/requests', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('carpet_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo solicitudes' });
  }
});

app.post('/api/requests', async (req, res) => {
  try {
    const { route_id, details, driver_name } = req.body;

    const { data: route } = await supabase
      .from('routes')
      .select('day, route_number')
      .eq('id', route_id)
      .single();

    const { data, error } = await supabase
      .from('carpet_requests')
      .insert({
        route_id,
        details,
        driver_name,
        day: route?.day || '',
        route_number: route?.route_number || 0
      })
      .select()
      .single();

    if (error) throw error;
    io.emit('request_created', data);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Error creando solicitud' });
  }
});

app.delete('/api/requests/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('carpet_requests')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    io.emit('request_resolved', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error eliminando solicitud' });
  }
});

app.get('/api/stock', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('stock_issues')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo stock' });
  }
});

app.post('/api/stock', async (req, res) => {
  try {
    const { item, type } = req.body;

    const { data, error } = await supabase
      .from('stock_issues')
      .insert({ item, type })
      .select()
      .single();

    if (error) throw error;

    const { data: all } = await supabase
      .from('stock_issues')
      .select('*')
      .order('created_at', { ascending: false });

    io.emit('stock_updated', all);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Error reportando stock' });
  }
});

app.delete('/api/stock/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('stock_issues')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    const { data: all } = await supabase
      .from('stock_issues')
      .select('*')
      .order('created_at', { ascending: false });

    io.emit('stock_updated', all);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error eliminando stock' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, role')
      .order('id');

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo usuarios' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const hash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('users')
      .insert({ username, password_hash: hash, role })
      .select('id, username, role')
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Usuario ya existe' });
      }
      throw error;
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Error creando usuario' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error eliminando usuario' });
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
}

startServer();
