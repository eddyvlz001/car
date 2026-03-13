import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

interface Route {
  id: number;
  day: string;
  route_number: number;
  status: string;
  driver: string | null;
  preparer: string | null;
}

interface User {
  id: number;
  username: string;
  role: string;
}

interface DriverPanelProps {
  user: User;
  socket: Socket | null;
}

export default function DriverPanel({ user, socket }: DriverPanelProps) {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedDay, setSelectedDay] = useState('MONDAY');
  const [selectedRoutes, setSelectedRoutes] = useState<number[]>([]);

  useEffect(() => {
    loadRoutes();

    if (socket) {
      socket.on('route_updated', (route: Route) => {
        setRoutes(prev => prev.map(r => r.id === route.id ? route : r));
      });
    }

    return () => {
      socket?.off('route_updated');
    };
  }, [socket]);

  const loadRoutes = async () => {
    const res = await fetch('/api/routes');
    const data = await res.json();
    setRoutes(data);
  };

  const dayNames: Record<string, string> = {
    MONDAY: 'Lunes',
    TUESDAY: 'Martes',
    WEDNESDAY: 'Miércoles',
    THURSDAY: 'Jueves',
    FRIDAY: 'Viernes',
    SATURDAY: 'Sábado',
    SUNDAY: 'Domingo'
  };

  const daysOrder = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

  const filteredRoutes = routes.filter(r => r.day === selectedDay);

  const handleSelectRoute = (id: number) => {
    setSelectedRoutes(prev =>
      prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id]
    );
  };

  const handleTakeRoutes = async () => {
    if (selectedRoutes.length === 0) return;

    await fetch('/api/routes/batch-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids: selectedRoutes,
        status: 'preparing',
        driver: user.username
      })
    });

    setSelectedRoutes([]);
  };

  const handleCompleteRoutes = async () => {
    if (selectedRoutes.length === 0) return;

    await fetch('/api/routes/batch-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids: selectedRoutes,
        status: 'done'
      })
    });

    setSelectedRoutes([]);
  };

  const statusColors: Record<string, string> = {
    pending: 'border-slate-300 bg-slate-50',
    preparing: 'border-amber-400 bg-amber-50',
    done: 'border-green-400 bg-green-50'
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Panel de Conductor</h2>
        <p className="text-slate-600">Selecciona y gestiona tus rutas de entrega</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <div className="flex gap-2 flex-wrap mb-6">
          {daysOrder.map(day => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedDay === day
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {dayNames[day]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          {filteredRoutes.map(route => (
            <button
              key={route.id}
              onClick={() => handleSelectRoute(route.id)}
              className={`p-4 border-2 rounded-lg transition-all ${
                selectedRoutes.includes(route.id)
                  ? 'border-slate-800 bg-slate-100 shadow-md'
                  : statusColors[route.status]
              }`}
            >
              <div className="text-2xl font-bold text-slate-900 mb-1">
                {route.route_number}
              </div>
              <div className="text-xs text-slate-600">
                {route.status === 'done' ? '✓ Completado' :
                 route.status === 'preparing' ? '⏳ Preparando' :
                 '○ Pendiente'}
              </div>
              {route.driver && (
                <div className="text-xs text-slate-500 mt-1 truncate">
                  {route.driver}
                </div>
              )}
            </button>
          ))}
        </div>

        {selectedRoutes.length > 0 && (
          <div className="flex gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-700 font-medium">
              {selectedRoutes.length} ruta(s) seleccionada(s)
            </span>
            <div className="flex-1"></div>
            <button
              onClick={handleTakeRoutes}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
            >
              Tomar Rutas
            </button>
            <button
              onClick={handleCompleteRoutes}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Completar Rutas
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
