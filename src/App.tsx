import React, { useEffect, useState, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  LayoutDashboard, 
  Truck, 
  Package, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  Plus,
  Search,
  RefreshCcw,
  BarChart3,
  User,
  Bell,
  LogOut,
  Lock
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Route, RouteStatus, CarpetRequest, StockIssue, DAY_COLORS } from './types';

interface UserAuth {
  id: number;
  username: string;
  role: 'driver' | 'preparer' | 'admin';
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function Login({ onLogin }: { onLogin: (user: UserAuth) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        const user = await res.json();
        onLogin(user);
      } else {
        setError('Usuario o contraseña incorrectos');
      }
    } catch (err) {
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-3xl shadow-xl border border-zinc-200 w-full max-w-md space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-200">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-zinc-900">Logística App</h1>
          <p className="text-zinc-500">Ingresa a tu cuenta para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700 ml-1">Usuario</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input 
                  type="text" 
                  required
                  className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="Tu usuario"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700 ml-1">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input 
                  type="password" 
                  required
                  className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4" />
              {error}
            </motion.div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
          >
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="text-center pt-4">
          <p className="text-xs text-zinc-400 uppercase font-bold tracking-widest">Sistema de Logística v2.0</p>
        </div>
      </motion.div>
    </div>
  );
}

const socket: Socket = io();

export default function App() {
  const [user, setUser] = useState<UserAuth | null>(null);
  const [view, setView] = useState<'dashboard' | 'preparer' | 'driver' | 'reports' | 'users'>('dashboard');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [requests, setRequests] = useState<CarpetRequest[]>([]);
  const [stockIssues, setStockIssues] = useState<StockIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAlerts, setActiveAlerts] = useState<Route[]>([]);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Try to load user from localStorage
    const savedUser = localStorage.getItem('logistics_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      // Set initial view based on role
      if (parsed.role === 'driver') setView('driver');
      else if (parsed.role === 'preparer') setView('preparer');
      else setView('dashboard');
    }
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('logistics_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('logistics_user');
    }
  }, [user]);

  const handleLogout = () => {
    setUser(null);
    setView('dashboard');
  };

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.loop = true;
  }, []);

  const [audioEnabled, setAudioEnabled] = useState(false);

  useEffect(() => {
    if (activeAlerts.length > 0 && view === 'preparer' && audioEnabled) {
      audioRef.current?.play().catch(() => {});
    } else {
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
    }
  }, [activeAlerts, view, audioEnabled]);

  useEffect(() => {
    fetchData();

    socket.on('route_updated', (updatedRoute: Route) => {
      setRoutes(prev => prev.map(r => r.id === updatedRoute.id ? updatedRoute : r));
      
      // If a driver starts a route (status becomes 'preparing'), alert the preparer
      if (updatedRoute.status === 'preparing' && updatedRoute.driver_name) {
        setActiveAlerts(prev => {
          if (prev.find(a => a.id === updatedRoute.id)) return prev;
          return [...prev, updatedRoute];
        });
      }
    });

    socket.on('request_created', (newRequest: CarpetRequest) => {
      setRequests(prev => [...prev, newRequest]);
    });

    socket.on('request_resolved', (id: number) => {
      setRequests(prev => prev.filter(r => r.id !== Number(id)));
    });

    socket.on('stock_updated', (issues: StockIssue[]) => {
      setStockIssues(issues);
    });

    return () => {
      socket.off('route_updated');
      socket.off('request_created');
      socket.off('request_resolved');
      socket.off('stock_updated');
    };
  }, []);

  const fetchData = async () => {
    try {
      console.log('Fetching data from API...');
      const [routesRes, requestsRes, stockRes] = await Promise.all([
        fetch('/api/routes'),
        fetch('/api/requests'),
        fetch('/api/stock-issues')
      ]);

      console.log('Routes response status:', routesRes.status);
      console.log('Requests response status:', requestsRes.status);
      console.log('Stock response status:', stockRes.status);

      const routesData = await routesRes.json();
      const requestsData = await requestsRes.json();
      const stockData = await stockRes.json();

      console.log('Routes loaded:', routesData.length);
      console.log('Requests loaded:', requestsData.length);
      console.log('Stock issues loaded:', stockData.length);

      setRoutes(routesData);
      setRequests(requestsData);
      setStockIssues(stockData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateRouteStatus = async (id: number, status: RouteStatus, driverName?: string, preparerName?: string) => {
    await fetch(`/api/routes/${id}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status, driver_name: driverName, preparer_name: preparerName })
    });
  };

  const updateBatchRouteStatus = async (ids: number[], status: RouteStatus, driverName?: string, preparerName?: string) => {
    await fetch('/api/routes/batch-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ids, status, driver_name: driverName, preparer_name: preparerName })
    });
  };

  const createRequest = async (routeId: number, details: string, driverName: string) => {
    await fetch('/api/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ route_id: routeId, details, driver_name: driverName })
    });
  };

  const resolveRequest = async (id: number) => {
    await fetch(`/api/requests/${id}/resolve`, {
      method: 'POST'
    });
  };

  const reportStockIssue = async (itemName: string, issueType: 'out_of_stock' | 'discontinued') => {
    await fetch('/api/stock-issues', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ item_name: itemName, issue_type: issueType })
    });
  };

  const deleteStockIssue = async (id: number) => {
    await fetch(`/api/stock-issues/${id}`, {
      method: 'DELETE'
    });
  };

  const dismissAlert = (routeId: number) => {
    setActiveAlerts(prev => prev.filter(a => a.id !== routeId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-50">
        <div className="flex flex-col items-center gap-4">
          <RefreshCcw className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-zinc-500 font-medium">Cargando logística...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <nav className="bg-white border-b border-zinc-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 flex-shrink-0">
                <div className="absolute inset-0 rounded-full border-2 border-zinc-100" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] font-black text-zinc-800">WPL</span>
                </div>
                <svg className="absolute inset-0 w-full h-full rotate-[-90deg]" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="48" fill="none" stroke="#f43f5e" strokeWidth="4" strokeDasharray="15 15" />
                  <circle cx="50" cy="50" r="48" fill="none" stroke="#3b82f6" strokeWidth="4" strokeDasharray="15 15" strokeDashoffset="-15" />
                  <circle cx="50" cy="50" r="48" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="15 15" strokeDashoffset="-30" />
                  <circle cx="50" cy="50" r="48" fill="none" stroke="#f59e0b" strokeWidth="4" strokeDasharray="15 15" strokeDashoffset="-45" />
                </svg>
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-base sm:text-lg font-serif font-bold tracking-tighter text-zinc-900 uppercase">White Plains Linen</span>
                <span className="text-[8px] font-serif italic text-zinc-500 uppercase tracking-widest opacity-60">Linens à la CARTE</span>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-4">
              <NavButton 
                active={view === 'dashboard'} 
                onClick={() => setView('dashboard')}
                icon={<LayoutDashboard className="w-4 h-4" />}
                label="Dashboard"
              />
              {(user.role === 'preparer' || user.role === 'admin') && (
                <NavButton 
                  active={view === 'preparer'} 
                  onClick={() => setView('preparer')}
                  icon={<Package className="w-4 h-4" />}
                  label="Preparador"
                />
              )}
              {(user.role === 'driver' || user.role === 'admin') && (
                <NavButton 
                  active={view === 'driver'} 
                  onClick={() => setView('driver')}
                  icon={<Truck className="w-4 h-4" />}
                  label="Conductor"
                />
              )}
              {(user.role === 'admin') && (
                <>
                  <NavButton 
                    active={view === 'reports'} 
                    onClick={() => setView('reports')}
                    icon={<BarChart3 className="w-4 h-4" />}
                    label="Reportes"
                  />
                  <NavButton 
                    active={view === 'users'} 
                    onClick={() => setView('users')}
                    icon={<User className="w-4 h-4" />}
                    label="Usuarios"
                  />
                </>
              )}

              <div className="h-6 w-px bg-zinc-200 mx-1" />

              {user.role === 'preparer' && (
                <div className="relative">
                  <button 
                    className={cn(
                      "p-2 rounded-lg transition-all relative",
                      activeAlerts.length > 0 ? "bg-red-50 text-red-600 animate-bounce" : "text-zinc-400 hover:bg-zinc-100"
                    )}
                  >
                    <Bell className="w-5 h-5" />
                    {activeAlerts.length > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full border-2 border-white" />
                    )}
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 pl-2">
                <div className="hidden md:block text-right">
                  <p className="text-xs font-bold text-zinc-900 leading-none">{user.username}</p>
                  <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-tighter">{user.role}</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-zinc-900">¡Hola, {user.username}! 👋</h1>
          <p className="text-zinc-500">Bienvenido de nuevo al sistema de logística en tiempo real.</p>
        </div>
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Dashboard user={user} routes={routes} requests={requests} stockIssues={stockIssues} />
            </motion.div>
          )}
          {view === 'preparer' && (
            <motion.div 
              key="preparer"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <PreparerPanel
                user={user}
                routes={routes}
                requests={requests}
                stockIssues={stockIssues}
                onUpdateStatus={updateRouteStatus}
                onResolveRequest={resolveRequest}
                onReportStock={reportStockIssue}
                onDeleteStock={deleteStockIssue}
                activeAlerts={activeAlerts}
                onDismissAlert={dismissAlert}
                audioEnabled={audioEnabled}
                onEnableAudio={() => setAudioEnabled(true)}
              />
            </motion.div>
          )}
          {view === 'driver' && (
            <motion.div 
              key="driver"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <DriverPanel 
                user={user}
                routes={routes} 
                onUpdateStatus={updateRouteStatus}
                onCreateRequest={createRequest}
                onBatchUpdateStatus={updateBatchRouteStatus}
              />
            </motion.div>
          )}
          {view === 'reports' && (
            <motion.div 
              key="reports"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <ReportsPanel routes={routes} stockIssues={stockIssues} />
            </motion.div>
          )}
          {view === 'users' && (
            <motion.div 
              key="users"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <UsersPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
        active 
          ? "bg-blue-50 text-blue-700" 
          : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
      )}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}

// --- Dashboard Component ---
function Dashboard({ user, routes, requests, stockIssues }: { user: UserAuth; routes: Route[]; requests: CarpetRequest[]; stockIssues: StockIssue[] }) {
  const stats = useMemo(() => {
    const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    return days.map(day => {
      const dayRoutes = routes.filter(r => r.day_of_week === day);
      const done = dayRoutes.filter(r => r.status === 'done').length;
      const total = dayRoutes.length;
      const percentage = total > 0 ? Math.round((done / total) * 100) : 0;
      return { name: day, done, total, percentage };
    });
  }, [routes]);

  const overallProgress = useMemo(() => {
    const total = routes.length;
    const done = routes.filter(r => r.status === 'done').length;
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }, [routes]);

  const activeRoutes = useMemo(() => {
    return routes.filter(r => r.status === 'preparing');
  }, [routes]);

  return (
    <div className="space-y-6">
      {/* Role-specific Active Routes Section */}
      {(user.role === 'preparer' || user.role === 'admin' || user.role === 'driver') && activeRoutes.length > 0 && (
        <div className="bg-blue-600 p-6 rounded-2xl shadow-lg shadow-blue-200 text-white">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Truck className="w-5 h-5" />
            {user.role === 'preparer' ? 'Rutas Solicitadas por Conductores' : 'Rutas en Progreso'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeRoutes.map(route => (
              <div key={route.id} className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-xl flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold opacity-70 uppercase">{route.day_of_week}</p>
                  <p className="text-xl font-black">Ruta {route.priority_number}</p>
                  <p className="text-xs mt-1 bg-white/20 inline-block px-2 py-0.5 rounded-full">
                    {route.driver_name || 'Conductor'}
                  </p>
                </div>
                <div className="animate-pulse">
                  <Clock className="w-6 h-6" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          title="Progreso Semanal" 
          value={`${overallProgress}%`} 
          subtitle="Rutas completadas"
          icon={<BarChart3 className="w-5 h-5 text-blue-600" />}
          color="blue"
        />
        {user.role === 'preparer' && (
          <StatCard 
            title="Pedidos Pendientes" 
            value={requests.length.toString()} 
            subtitle="Cambios de alfombra"
            icon={<RefreshCcw className="w-5 h-5 text-orange-600" />}
            color="orange"
          />
        )}
        <StatCard 
          title="Alertas de Stock" 
          value={stockIssues.length.toString()} 
          subtitle="Items no disponibles"
          icon={<AlertCircle className="w-5 h-5 text-red-600" />}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-zinc-400" />
            Eficiencia por Día (%)
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} domain={[0, 100]} />
                <Tooltip 
                  cursor={{ fill: '#f4f4f5' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
                  {stats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.percentage === 100 ? '#10b981' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-zinc-400" />
            Estado de Rutas (Total)
          </h3>
          <div className="h-[300px] w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Completas', value: routes.filter(r => r.status === 'done').length },
                    { name: 'Preparando', value: routes.filter(r => r.status === 'preparing').length },
                    { name: 'Pendientes', value: routes.filter(r => r.status === 'pending').length },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#f59e0b" />
                  <Cell fill="#e4e4e7" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-bold">{overallProgress}%</span>
              <span className="text-xs text-zinc-500">Total</span>
            </div>
          </div>
        </div>
      </div>

      {user.role === 'preparer' && (
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <RefreshCcw className="w-5 h-5 text-orange-600" />
            Pedidos de Cambio Recientes
          </h3>
          {requests.length === 0 ? (
            <p className="text-zinc-500 text-sm py-4">No hay pedidos pendientes en este momento.</p>
          ) : (
            <div className="space-y-3">
              {requests.slice(0, 5).map(req => (
                <div key={req.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <RefreshCcw className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Ruta {req.priority_number} ({req.day_of_week})</p>
                      <p className="text-xs text-zinc-500">{req.details}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">{req.driver_name || 'Conductor'}</p>
                    <p className="text-[10px] text-zinc-400">{new Date(req.created_at).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, subtitle, icon, color }: { title: string; value: string; subtitle: string; icon: React.ReactNode; color: 'blue' | 'orange' | 'red' }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-100',
    orange: 'bg-orange-50 border-orange-100',
    red: 'bg-red-50 border-red-100',
  };

  return (
    <div className={cn("p-6 rounded-2xl border shadow-sm", colors[color])}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-white rounded-lg shadow-sm">{icon}</div>
      </div>
      <div className="space-y-1">
        <h4 className="text-sm font-medium text-zinc-500">{title}</h4>
        <div className="text-3xl font-bold text-zinc-900">{value}</div>
        <p className="text-xs text-zinc-400">{subtitle}</p>
      </div>
    </div>
  );
}

// --- Preparer Panel Component ---
function PreparerPanel({
  user,
  routes,
  requests,
  stockIssues,
  onUpdateStatus,
  onResolveRequest,
  onReportStock,
  onDeleteStock,
  activeAlerts,
  onDismissAlert,
  audioEnabled,
  onEnableAudio
}: {
  user: UserAuth;
  routes: Route[];
  requests: CarpetRequest[];
  stockIssues: StockIssue[];
  onUpdateStatus: (id: number, status: RouteStatus, driverName?: string, preparerName?: string) => any;
  onResolveRequest: (id: number) => any;
  onReportStock: (name: string, type: 'out_of_stock' | 'discontinued') => any;
  onDeleteStock: (id: number) => any;
  activeAlerts: Route[];
  onDismissAlert: (id: number) => any;
  audioEnabled: boolean;
  onEnableAudio: () => void;
}) {
  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

  const getDefaultDay = () => {
    return 'MONDAY'; // Default to Monday to show the full route list
  };

  // Helper function to get the next day (delivery day based on prep day)
  const getDeliveryDay = (prepDay: string): string => {
    const dayIndex = days.indexOf(prepDay);
    return days[(dayIndex + 1) % 7];
  };

  // Helper function to get the prep day (one day before delivery)
  const getPrepDay = (deliveryDay: string): string => {
    const dayIndex = days.indexOf(deliveryDay);
    return days[(dayIndex - 1 + 7) % 7];
  };

  const [filter, setFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'routes' | 'requests' | 'stock'>('routes');
  const [preparerName, setPreparerName] = useState(user.username);
  const [selectedDay, setSelectedDay] = useState(getDefaultDay());

  // Get the delivery day based on the selected prep day
  const deliveryDay = getDeliveryDay(selectedDay);

  // Filter routes by delivery day (which is one day after prep day)
  const filteredRoutes = routes.filter(r =>
    r.day_of_week === deliveryDay && (
      r.priority_number.toString().includes(filter) ||
      r.day_of_week.toLowerCase().includes(filter.toLowerCase())
    )
  );

  useEffect(() => {
    console.log('PreparerPanel - Total routes:', routes.length);
    console.log('PreparerPanel - Selected day:', selectedDay);
    console.log('PreparerPanel - Filtered routes:', filteredRoutes.length);
    console.log('PreparerPanel - Filter value:', filter);
  }, [routes, selectedDay, filteredRoutes, filter]);

  const isDayFinished = useMemo(() => {
    const dayRoutes = routes.filter(r => r.day_of_week === deliveryDay);
    return dayRoutes.length > 0 && dayRoutes.every(r => r.status === 'done');
  }, [routes, deliveryDay]);

  return (
    <div className="space-y-6">
      {!audioEnabled && (
        <div className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 animate-bounce" />
            <p className="text-sm font-bold">Activa el sonido para recibir notificaciones de carga</p>
          </div>
          <button
            onClick={onEnableAudio}
            className="px-6 py-2 bg-white text-blue-600 rounded-xl font-bold text-sm hover:bg-blue-50 transition-all"
          >
            ACTIVAR SONIDO
          </button>
        </div>
      )}
      {activeAlerts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-[100] space-y-3 max-w-sm w-full">
          <AnimatePresence>
            {activeAlerts.map(alert => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="bg-blue-600 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 border-2 border-white/20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center animate-pulse">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold">¡Nueva Carga Iniciada!</div>
                    <div className="text-xs opacity-90">Ruta {alert.priority_number} • {alert.driver_name}</div>
                  </div>
                </div>
                <button 
                  onClick={() => onDismissAlert(alert.id)}
                  className="px-4 py-2 bg-white text-blue-600 rounded-xl font-bold text-xs hover:bg-blue-50 transition-colors"
                >
                  ACEPTAR
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-zinc-900">Panel de Preparación</h2>
          <p className="text-xs text-zinc-500">
            Preparando hoy <span className="font-bold text-blue-600">{selectedDay}</span> para entregar <span className="font-bold text-green-600">{deliveryDay}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex bg-zinc-100 p-1 rounded-xl">
            <TabButton active={activeTab === 'routes'} onClick={() => setActiveTab('routes')} label="Rutas" count={routes.filter(r => r.status !== 'done').length} />
            {user.role === 'preparer' && (
              <TabButton active={activeTab === 'requests'} onClick={() => setActiveTab('requests')} label="Pedidos" count={requests.length} />
            )}
            <TabButton active={activeTab === 'stock'} onClick={() => setActiveTab('stock')} label="Stock" count={stockIssues.length} />
          </div>
        </div>
      </div>

      {activeTab === 'routes' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative w-full md:w-48">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <select 
                className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                value={selectedDay}
                onChange={e => setSelectedDay(e.target.value)}
              >
                {days.filter(d => d !== 'SUNDAY' || routes.some(r => r.day_of_week === 'SUNDAY')).map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Buscar por prioridad..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                value={filter}
                onChange={e => setFilter(e.target.value)}
              />
            </div>
            <div className="relative w-full md:w-64">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Nombre del Preparador..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                value={preparerName}
                onChange={e => setPreparerName(e.target.value)}
              />
            </div>
          </div>

          {isDayFinished && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between"
            >
              <div className="flex items-center gap-3 text-green-700">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">¡Todas las rutas para entregar el {deliveryDay} han sido completadas!</span>
              </div>
              <p className="text-xs text-green-600">Puedes seleccionar otro día para continuar preparando.</p>
            </motion.div>
          )}

          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Día</th>
                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Prioridad</th>
                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Conductor</th>
                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Preparador</th>
                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredRoutes.map(route => (
                    <tr key={route.id} className={cn(route.status === 'done' && "bg-zinc-50/50 opacity-70")}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn("px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider", DAY_COLORS[route.day_of_week].bg, DAY_COLORS[route.day_of_week].text)}>
                          {route.day_of_week}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-lg">
                        {route.priority_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600">
                        {route.driver_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600">
                        {route.preparer_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                          route.status === 'done' ? "bg-green-100 text-green-700" :
                          route.status === 'preparing' ? "bg-orange-100 text-orange-700" :
                          "bg-zinc-100 text-zinc-700"
                        )}>
                          {route.status === 'done' ? 'Hecho' : route.status === 'preparing' ? 'Preparando' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end gap-1">
                          <StatusButtonSmall 
                            active={route.status === 'pending'} 
                            onClick={() => onUpdateStatus(route.id, 'pending')}
                            label="P"
                            color="zinc"
                          />
                          <StatusButtonSmall 
                            active={route.status === 'preparing'} 
                            onClick={() => onUpdateStatus(route.id, 'preparing', undefined, preparerName)}
                            label="Prep"
                            color="orange"
                          />
                          <StatusButtonSmall 
                            active={route.status === 'done'} 
                            onClick={() => onUpdateStatus(route.id, 'done', undefined, preparerName)}
                            label="Hecho"
                            color="green"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-zinc-300">
              <RefreshCcw className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
              <p className="text-zinc-500">No hay pedidos de cambio pendientes</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {requests.map(req => (
                <div key={req.id} className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
                      <RefreshCcw className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">Ruta {req.priority_number}</span>
                        <span className="text-xs text-zinc-400 uppercase">{req.day_of_week}</span>
                        {req.driver_name && (
                          <span className="text-[10px] bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-500 font-bold uppercase tracking-tighter">
                            {req.driver_name}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-600 mt-1">{req.details}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => onResolveRequest(req.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Resolver
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'stock' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm h-fit">
            <h3 className="font-bold mb-4">Reportar Problema de Stock</h3>
            <StockForm onSubmit={onReportStock} />
          </div>
          <div className="lg:col-span-2 space-y-4">
            {stockIssues.map(issue => (
              <div key={issue.id} className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    issue.issue_type === 'out_of_stock' ? "bg-red-50 text-red-600" : "bg-zinc-100 text-zinc-600"
                  )}>
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold">{issue.item_name}</div>
                    <div className="text-xs text-zinc-500">
                      {issue.issue_type === 'out_of_stock' ? 'Sin Stock' : 'Descontinuado'} • Reportado el {new Date(issue.reported_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => onDeleteStock(issue.id)}
                  className="p-2 text-zinc-400 hover:text-red-600 transition-colors"
                >
                  <Plus className="w-5 h-5 rotate-45" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
        active ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
      )}
    >
      {label}
      {count > 0 && (
        <span className={cn(
          "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
          active ? "bg-blue-600 text-white" : "bg-zinc-200 text-zinc-600"
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

function StatusButton({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color: 'zinc' | 'orange' | 'green' }) {
  const colors = {
    zinc: active ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
    orange: active ? "bg-orange-600 text-white" : "bg-orange-50 text-orange-600 hover:bg-orange-100",
    green: active ? "bg-green-600 text-white" : "bg-green-50 text-green-600 hover:bg-green-100",
  };

  return (
    <button
      onClick={onClick}
      className={cn("flex-1 py-1.5 rounded-lg text-xs font-medium transition-all", colors[color])}
    >
      {label}
    </button>
  );
}

function StockForm({ onSubmit }: { onSubmit: (name: string, type: 'out_of_stock' | 'discontinued') => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'out_of_stock' | 'discontinued'>('out_of_stock');

  return (
    <form className="space-y-4" onSubmit={e => { e.preventDefault(); onSubmit(name, type); setName(''); }}>
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1 block">Nombre del Item</label>
        <input 
          type="text" 
          required
          className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="Ej: Alfombra Persa Azul"
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1 block">Tipo de Problema</label>
        <select 
          className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          value={type}
          onChange={e => setType(e.target.value as any)}
        >
          <option value="out_of_stock">Sin Stock</option>
          <option value="discontinued">Ya no existe</option>
        </select>
      </div>
      <button className="w-full py-2 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 transition-colors">
        Reportar
      </button>
    </form>
  );
}

// --- Users Panel Component ---
function UsersPanel() {
  const [users, setUsers] = useState<UserAuth[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'driver' | 'preparer' | 'admin'>('driver');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password, role })
      });
      if (res.ok) {
        setSuccess('Usuario creado exitosamente');
        setUsername('');
        setPassword('');
        setRole('driver');
        fetchUsers();
      } else {
        const data = await res.json();
        setError(data.error || 'Error al crear usuario');
      }
    } catch (err) {
      setError('Error de conexión');
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-zinc-500">Cargando usuarios...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-zinc-900">Gestión de Usuarios</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm h-fit">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" />
            Crear Nuevo Usuario
          </h3>
          <form className="space-y-4" onSubmit={handleCreateUser}>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1 block">Usuario</label>
              <input 
                type="text" 
                required
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Nombre de usuario"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1 block">Contraseña</label>
              <input 
                type="password" 
                required
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1 block">Rol</label>
              <select 
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={role}
                onChange={e => setRole(e.target.value as any)}
              >
                <option value="driver">Conductor</option>
                <option value="preparer">Preparador</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-green-50 text-green-600 rounded-lg text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {success}
              </div>
            )}

            <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
              Crear Usuario
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-zinc-400" />
            Usuarios Registrados
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Usuario</th>
                  <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Rol</th>
                  <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {users.map(u => (
                  <tr key={u.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">{u.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">{u.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                        u.role === 'admin' ? "bg-purple-100 text-purple-700" :
                        u.role === 'preparer' ? "bg-blue-100 text-blue-700" :
                        "bg-zinc-100 text-zinc-700"
                      )}>
                        {u.role === 'admin' ? 'Administrador' : u.role === 'preparer' ? 'Preparador' : 'Conductor'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button 
                        onClick={() => handleDeleteUser(u.id)}
                        className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar Usuario"
                      >
                        <Plus className="w-5 h-5 rotate-45" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Driver Panel Component ---
function StatusButtonSmall({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color: 'zinc' | 'orange' | 'green' }) {
  const colors = {
    zinc: active ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
    orange: active ? "bg-orange-600 text-white" : "bg-orange-50 text-orange-600 hover:bg-orange-100",
    green: active ? "bg-green-600 text-white" : "bg-green-50 text-green-600 hover:bg-green-100",
  };

  return (
    <button
      onClick={onClick}
      className={cn("px-3 py-1 rounded-md text-[10px] font-bold transition-all", colors[color])}
    >
      {label}
    </button>
  );
}

// --- Reports Panel Component ---
function ReportsPanel({ routes, stockIssues }: { routes: Route[]; stockIssues: StockIssue[] }) {
  const [reportType, setReportType] = useState<'day' | 'week' | 'stock' | 'detail'>('day');

  const dailyStats = useMemo(() => {
    const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    return days.map(day => {
      const dayRoutes = routes.filter(r => r.day_of_week === day);
      const done = dayRoutes.filter(r => r.status === 'done').length;
      const total = dayRoutes.length;
      return { name: day, done, total, percentage: total > 0 ? Math.round((done / total) * 100) : 0 };
    });
  }, [routes]);

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CarpetLogix';
    workbook.lastModifiedBy = 'CarpetLogix';
    workbook.created = new Date();
    workbook.modified = new Date();

    const addSheetHeader = (sheet: ExcelJS.Worksheet, title: string) => {
      sheet.mergeCells('A1:E1');
      const titleCell = sheet.getCell('A1');
      titleCell.value = title;
      titleCell.font = { name: 'Arial Black', size: 16, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      sheet.getRow(1).height = 30;
    };

    const styleHeader = (row: ExcelJS.Row) => {
      row.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    };

    // Sheet 1: Rendimiento Diario
    const dailySheet = workbook.addWorksheet('Rendimiento Diario');
    addSheetHeader(dailySheet, 'REPORTE DE RENDIMIENTO DIARIO');
    dailySheet.addRow([]);
    const dailyHeader = dailySheet.addRow(['Día', 'Rutas Totales', 'Rutas Completadas', 'Eficiencia (%)']);
    styleHeader(dailyHeader);
    
    dailyStats.forEach(s => {
      const row = dailySheet.addRow([s.name, s.total, s.done, s.percentage]);
      const efficiencyCell = row.getCell(4);
      if (s.percentage >= 90) efficiencyCell.font = { color: { argb: 'FF059669' }, bold: true };
      else if (s.percentage < 50) efficiencyCell.font = { color: { argb: 'FFDC2626' }, bold: true };
    });
    dailySheet.getColumn(1).width = 20;
    dailySheet.getColumn(2).width = 15;
    dailySheet.getColumn(3).width = 15;
    dailySheet.getColumn(4).width = 15;

    // Sheet 2: Stock
    const stockSheet = workbook.addWorksheet('Problemas de Stock');
    addSheetHeader(stockSheet, 'REPORTE DE STOCK FALTANTE');
    stockSheet.addRow([]);
    const stockHeader = stockSheet.addRow(['Item', 'Tipo de Problema', 'Fecha Reporte']);
    styleHeader(stockHeader);
    stockIssues.forEach(i => {
      stockSheet.addRow([i.item_name, i.issue_type === 'out_of_stock' ? 'Sin Stock' : 'Descontinuado', new Date(i.reported_at).toLocaleString()]);
    });
    stockSheet.getColumn(1).width = 30;
    stockSheet.getColumn(2).width = 20;
    stockSheet.getColumn(3).width = 25;

    // Sheet 3: Todas las Rutas
    const routesSheet = workbook.addWorksheet('Todas las Rutas');
    addSheetHeader(routesSheet, 'REPORTE GENERAL DE RUTAS');
    routesSheet.addRow([]);
    const routesHeader = routesSheet.addRow(['ID', 'Día', 'Prioridad', 'Estado', 'Conductor', 'Preparador', 'Actualización']);
    styleHeader(routesHeader);
    routes.forEach(r => {
      const row = routesSheet.addRow([r.id, r.day_of_week, r.priority_number, r.status, r.driver_name || '-', r.preparer_name || '-', new Date(r.updated_at).toLocaleString()]);
      const statusCell = row.getCell(4);
      if (r.status === 'done') statusCell.font = { color: { argb: 'FF059669' } };
      if (r.status === 'preparing') statusCell.font = { color: { argb: 'FFD97706' } };
    });
    routesSheet.columns.forEach(col => col.width = 15);
    routesSheet.getColumn(7).width = 25;

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Reporte_Profesional_Logistica_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-zinc-900">Módulo de Reportes</h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={exportToExcel}
            className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-all flex items-center gap-2 shadow-sm"
          >
            <BarChart3 className="w-4 h-4" />
            Exportar a Excel
          </button>
          <div className="flex bg-zinc-100 p-1 rounded-xl overflow-x-auto max-w-full">
            <TabButton active={reportType === 'day'} onClick={() => setReportType('day')} label="Por Día" count={0} />
            <TabButton active={reportType === 'week'} onClick={() => setReportType('week')} label="Semanal" count={0} />
            <TabButton active={reportType === 'stock'} onClick={() => setReportType('stock')} label="Stock" count={0} />
            <TabButton active={reportType === 'detail'} onClick={() => setReportType('detail')} label="Detalle" count={0} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {reportType === 'day' && (
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <h3 className="text-lg font-bold mb-6">Rendimiento Diario</h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="done" name="Completadas" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="total" name="Total" fill="#e4e4e7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {reportType === 'week' && (
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <h3 className="text-lg font-bold mb-6">Resumen Semanal de Rutas</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Día</th>
                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Rutas</th>
                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Completadas</th>
                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Eficiencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {dailyStats.map(stat => (
                    <tr key={stat.name}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium">{stat.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{stat.total}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{stat.done}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden max-w-[100px]">
                            <div className="h-full bg-blue-600" style={{ width: `${stat.percentage}%` }} />
                          </div>
                          <span className="text-xs font-bold">{stat.percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {reportType === 'stock' && (
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <h3 className="text-lg font-bold mb-6">Reporte de Stock Faltante</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Item</th>
                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Problema</th>
                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Fecha Reporte</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {stockIssues.map(issue => (
                    <tr key={issue.id}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium">{issue.item_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                          issue.issue_type === 'out_of_stock' ? "bg-red-100 text-red-700" : "bg-zinc-100 text-zinc-700"
                        )}>
                          {issue.issue_type === 'out_of_stock' ? 'Sin Stock' : 'Descontinuado'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                        {new Date(issue.reported_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {reportType === 'detail' && (
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Detalle General de Rutas</h3>
              <span className="text-xs text-zinc-400 font-medium">Mostrando todas las rutas registradas</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Día</th>
                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Prioridad</th>
                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Conductor</th>
                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Preparador</th>
                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Actualizado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {routes.map(route => (
                    <tr key={route.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{route.day_of_week}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">{route.priority_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600">{route.driver_name || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-bold">{route.preparer_name || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                          route.status === 'done' ? "bg-green-100 text-green-700" :
                          route.status === 'preparing' ? "bg-orange-100 text-orange-700" :
                          "bg-zinc-100 text-zinc-700"
                        )}>
                          {route.status === 'done' ? 'Hecho' : route.status === 'preparing' ? 'Preparando' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-zinc-400">
                        {new Date(route.updated_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DriverPanel({ user, routes, onUpdateStatus, onCreateRequest, onBatchUpdateStatus }: { 
  user: UserAuth;
  routes: Route[]; 
  onUpdateStatus: (id: number, status: RouteStatus, driverName: string) => any;
  onCreateRequest: (routeId: number, details: string, driverName: string) => any;
  onBatchUpdateStatus: (ids: number[], status: RouteStatus, driverName: string) => any;
}) {
  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  
  const getDefaultDay = () => {
    return 'MONDAY'; // Default to Monday to show the full route list
  };

  const [driverName, setDriverName] = useState(user.username);
  const [selectedRouteIds, setSelectedRouteIds] = useState<number[]>([]);
  const [requestDetails, setRequestDetails] = useState('');
  const [activeTab, setActiveTab] = useState<'select' | 'request'>('select');
  const [selectedDay, setSelectedDay] = useState(getDefaultDay());

  const targetPendingRoutes = routes.filter(r => r.day_of_week === selectedDay && r.status === 'pending');

  useEffect(() => {
    console.log('DriverPanel - Total routes:', routes.length);
    console.log('DriverPanel - Selected day:', selectedDay);
    console.log('DriverPanel - Pending routes for day:', targetPendingRoutes.length);
  }, [routes, selectedDay, targetPendingRoutes]);

  const toggleRouteSelection = (id: number) => {
    setSelectedRouteIds(prev => 
      prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id]
    );
  };

  const canConfirmCarga = driverName.trim().length > 0 && selectedRouteIds.length > 0;
  const canSendRequest = driverName.trim().length > 0 && selectedRouteIds.length > 0 && requestDetails.trim().length > 0;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-zinc-900">Portal del Conductor</h2>
        <div className="flex justify-center">
          <div className="flex bg-zinc-100 p-1 rounded-xl">
            <TabButton active={activeTab === 'select'} onClick={() => setActiveTab('select')} label="Seleccionar Rutas" count={0} />
            <TabButton active={activeTab === 'request'} onClick={() => setActiveTab('request')} label="Pedidos / Reportes" count={0} />
          </div>
        </div>
        <div className="flex items-center justify-center gap-3">
          <span className="text-xs font-bold text-zinc-500 uppercase">Día de Trabajo:</span>
          <select 
            className="bg-white border border-zinc-200 rounded-lg px-3 py-1 text-sm font-bold text-blue-600 outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedDay}
            onChange={e => {
              setSelectedDay(e.target.value);
              setSelectedRouteIds([]);
            }}
          >
            {days.map(day => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-6">
        <div className="space-y-4">
          <h3 className="font-bold flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            1. Identificación
          </h3>
          <input 
            type="text" 
            placeholder="Escribe tu nombre aquí..."
            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-lg"
            value={driverName}
            onChange={e => setDriverName(e.target.value)}
          />
          {!driverName && <p className="text-xs text-red-500 font-medium">Debes ingresar tu nombre para continuar.</p>}
        </div>

        {activeTab === 'select' && (
          <>
            <div className="space-y-4">
              <h3 className="font-bold flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                2. Seleccionar Rutas para Cargar ({selectedDay})
              </h3>
              {targetPendingRoutes.length === 0 ? (
                <div className="p-8 text-center bg-zinc-50 rounded-xl border border-dashed border-zinc-300">
                  <CheckCircle2 className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
                  <p className="text-zinc-500">No hay rutas pendientes para {selectedDay}.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {targetPendingRoutes.map(route => (
                    <button
                      key={route.id}
                      onClick={() => toggleRouteSelection(route.id)}
                      className={cn(
                        "p-4 rounded-xl border text-center transition-all relative",
                        selectedRouteIds.includes(route.id) 
                          ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200 scale-105" 
                          : "bg-white border-zinc-200 hover:border-blue-300"
                      )}
                    >
                      {selectedRouteIds.includes(route.id) && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div className="text-xs uppercase font-bold opacity-60 mb-1">{route.day_of_week}</div>
                      <div className="text-2xl font-black">{route.priority_number}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4">
              <button 
                disabled={!canConfirmCarga}
                onClick={() => {
                  onBatchUpdateStatus(selectedRouteIds, 'preparing', driverName);
                  setSelectedRouteIds([]);
                  alert('¡Rutas enviadas! El preparador ha sido notificado.');
                }}
                className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed flex flex-col items-center justify-center gap-1"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6" />
                  <span>Confirmar Carga de {selectedRouteIds.length} Rutas</span>
                </div>
                {!canConfirmCarga && (
                  <span className="text-[10px] opacity-80 uppercase tracking-widest">
                    {!driverName ? 'Falta tu nombre' : 'Selecciona al menos una ruta'}
                  </span>
                )}
              </button>
            </div>
          </>
        )}

        {activeTab === 'request' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-bold flex items-center gap-2">
                <RefreshCcw className="w-5 h-5 text-orange-600" />
                2. Enviar Pedido o Reporte al Preparador
              </h3>
              <p className="text-xs text-zinc-500">Selecciona las rutas afectadas y describe el cambio necesario.</p>
              
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
                {routes.filter(r => r.day_of_week === selectedDay).map(route => (
                  <button
                    key={route.id}
                    onClick={() => toggleRouteSelection(route.id)}
                    className={cn(
                      "py-2 rounded-lg border text-xs font-bold transition-all",
                      selectedRouteIds.includes(route.id) 
                        ? "bg-orange-600 border-orange-600 text-white" 
                        : "bg-white border-zinc-200"
                    )}
                  >
                    R{route.priority_number}
                  </button>
                ))}
              </div>

              <textarea 
                placeholder="Describe el cambio de color, tamaño, calidad o cualquier reporte..."
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none min-h-[150px]"
                value={requestDetails}
                onChange={e => setRequestDetails(e.target.value)}
              />
            </div>

            <button 
              disabled={!canSendRequest}
              onClick={() => {
                selectedRouteIds.forEach(id => onCreateRequest(id, requestDetails, driverName));
                setSelectedRouteIds([]);
                setRequestDetails('');
                alert('¡Pedido enviado al preparador!');
              }}
              className="w-full py-4 bg-orange-600 text-white rounded-xl font-bold text-lg hover:bg-orange-700 transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed flex flex-col items-center justify-center gap-1"
            >
              <div className="flex items-center gap-2">
                <RefreshCcw className="w-6 h-6" />
                <span>Enviar Pedido ({selectedRouteIds.length})</span>
              </div>
              {!canSendRequest && (
                <span className="text-[10px] opacity-80 uppercase tracking-widest">
                  {!driverName ? 'Falta tu nombre' : selectedRouteIds.length === 0 ? 'Selecciona rutas' : 'Escribe el detalle'}
                </span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
