import { useState } from 'react';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import DriverPanel from './components/DriverPanel';
import PreparerPanel from './components/PreparerPanel';

interface User {
  id: number;
  username: string;
  role: 'admin' | 'driver' | 'preparer';
}

function App() {
  const [user, setUser] = useState<User | null>(null);

  const handleLogout = () => {
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Sistema de Logística</h1>
            <p className="text-sm text-slate-600 mt-1">
              {user.username} ({user.role === 'admin' ? 'Administrador' : user.role === 'driver' ? 'Conductor' : 'Preparador'})
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user.role === 'admin' && <AdminPanel />}
        {user.role === 'driver' && <DriverPanel user={user} />}
        {user.role === 'preparer' && <PreparerPanel user={user} />}
      </main>
    </div>
  );
}

export default App;
