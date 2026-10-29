import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import CaseDetails from './pages/CaseDetails';
import Research from './pages/Research';
import Drafting from './pages/Drafting';
import Login from './pages/Login';
import Tasks from './pages/Tasks';
import Hearings from './pages/Hearings';
import Settings from './pages/Settings';
import Documents from './pages/Documents';
import Reminders from './pages/Reminders';
import { AuthProvider, useAuth } from './context/AuthContext';

function Workspace() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading your workspace…</div>;
  if (!user) return <Login />;

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/case/:id" element={<CaseDetails />} />
          <Route path="/cases" element={<Dashboard />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/hearings" element={<Hearings />} />
          <Route path="/reminders" element={<Reminders />} />
          <Route path="/research" element={<Research />} />
          <Route path="/drafting" element={<Drafting />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return <Router><AuthProvider><Workspace /></AuthProvider></Router>;
}
