import { NavLink, useLocation } from 'react-router-dom';
import { getStoredUser, logout } from '../services/api';
import { LayoutDashboard, Rocket, LineChart, Hexagon, LogOut } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', icon: <LayoutDashboard size={16} />, label: 'Dashboard' },
  { path: '/deployments', icon: <Rocket size={16} />, label: 'Deployments' },
  { path: '/analytics', icon: <LineChart size={16} />, label: 'Analytics' },
];

export default function Sidebar() {
  const user = getStoredUser();
  const location = useLocation();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Hexagon size={16} strokeWidth={2.5} />
        </div>
        <div>
          <h1>SEQA</h1>
          <span>Visualizer</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-section">Overview</div>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-link ${isActive && (item.path === '/' ? location.pathname === '/' : true) ? 'active' : ''}`
            }
            end={item.path === '/'}
          >
            <span className="sidebar-link-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        <div className="sidebar-section">System</div>
        <div style={{ padding: '8px 12px', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span>Status</span>
            <span style={{ color: 'var(--status-success)' }}>Operational</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span>API</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>v1.0.0</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Environment</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>dev</span>
          </div>
        </div>
      </nav>

      {/* User Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-avatar">
          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sidebar-user-name">{user?.name || 'User'}</div>
          <div className="sidebar-user-role">{user?.role || 'viewer'}</div>
        </div>
        <button
          onClick={logout}
          className="btn btn-ghost"
          style={{ padding: '6px', color: 'var(--text-muted)' }}
          title="Log out"
        >
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  );
}
