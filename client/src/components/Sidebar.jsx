import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const items = [
  { path: '/', label: 'Dashboard', icon: '⌂' },
  { path: '/cases', label: 'Cases', icon: '▤' },
  { path: '/documents', label: 'Documents', icon: '▧' },
  { path: '/hearings', label: 'Hearings', icon: '◷' },
  { path: '/reminders', label: 'Reminders', icon: '◉' },
  { path: '/tasks', label: 'Tasks & deadlines', icon: '✓' },
  { path: '/research', label: 'AI assistant', icon: '✳' },
  { path: '/drafting', label: 'Document drafts', icon: '✎' },
  { path: '/settings', label: 'Profile & settings', icon: '⚙' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [logoutError, setLogoutError] = useState('');
  return (
    <aside className="sidebar">
      <NavLink to="/" className="sidebar-brand">
        <span className="brand-mark small">AS</span>
        <span><strong>AdvoSahayak</strong><small>Legal workspace</small></span>
      </NavLink>
      <p className="nav-caption">WORKSPACE</p>
      <nav className="side-nav" aria-label="Main navigation">
        {items.map(item => (
          <NavLink key={item.path} to={item.path} end={item.path === '/'} aria-label={item.label} title={item.label} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <span className="nav-icon" aria-hidden="true">{item.icon}</span>{item.label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="user-profile"><div className="avatar">{user?.name?.slice(0, 1).toUpperCase()}</div><span><strong>{user?.name}</strong><small>{user?.email}</small></span></div>
        {logoutError && <p className="sidebar-error" role="alert">{logoutError}</p>}
        <button className="logout-button" onClick={() => { setLogoutError(''); logout().catch(() => setLogoutError('Sign out failed. Try again.')); }}>Sign out</button>
      </div>
    </aside>
  );
}
