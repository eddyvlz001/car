import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Route {
  id: number;
  day: string;
  route_number: number;
  status: string;
  driver: string | null;
  preparer: string | null;
}

export default function AdminPanel() {
  const [routes, setRoutes] = useState<Route[]>([]);

  useEffect(() => {
    loadRoutes();

    const channel = supabase
      .channel('routes_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'routes' },
        () => {
          loadRoutes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadRoutes = async () => {
    const { data } = await supabase
      .from('routes')
      .select('*')
      .order('day')
      .order('route_number');

    if (data) setRoutes(data);
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

  const statusNames: Record<string, string> = {
    pending: 'Pendiente',
    preparing: 'En Preparación',
    done: 'Completado'
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-slate-100 text-slate-700',
    preparing: 'bg-amber-100 text-amber-700',
    done: 'bg-green-100 text-green-700'
  };

  const groupedRoutes = routes.reduce((acc, route) => {
    if (!acc[route.day]) acc[route.day] = [];
    acc[route.day].push(route);
    return acc;
  }, {} as Record<string, Route[]>);

  const daysOrder = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Panel de Administración</h2>
        <p className="text-slate-600">Vista general de todas las rutas del sistema</p>
      </div>

      {daysOrder.map(day => {
        const dayRoutes = groupedRoutes[day] || [];
        if (dayRoutes.length === 0) return null;

        return (
          <div key={day} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-800 px-6 py-4">
              <h3 className="text-xl font-bold text-white">{dayNames[day]}</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {dayRoutes.map(route => (
                  <div
                    key={route.id}
                    className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg font-bold text-slate-900">
                        Ruta {route.route_number}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[route.status]}`}>
                        {statusNames[route.status]}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-slate-500">Conductor:</span>
                        <span className="ml-2 text-slate-900 font-medium">
                          {route.driver || 'Sin asignar'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Preparador:</span>
                        <span className="ml-2 text-slate-900 font-medium">
                          {route.preparer || 'Sin asignar'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
