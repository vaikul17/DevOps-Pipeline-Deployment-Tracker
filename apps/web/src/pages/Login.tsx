import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../services/api';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await register(email, password, name);
      } else {
        await login(email, password);
      }
      navigate('/');
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div className="sidebar-logo-icon" style={{ width: 48, height: 48, fontSize: 24, margin: '0 auto 16px', borderRadius: 12 }}>🚀</div>
          <h2>Welcome to SEQA</h2>
          <p>Release Pipeline Visualizer</p>
        </div>

        {error && (
          <div style={{
            background: 'var(--status-failed-bg)',
            border: '1px solid var(--status-failed-border)',
            color: 'var(--status-failed)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.82rem',
            marginBottom: '16px',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label className="form-label" htmlFor="name">Full Name</label>
              <input
                id="name"
                className="form-input"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              className="form-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.dev"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              className="form-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary login-btn"
            disabled={loading}
          >
            {loading ? '...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          {isRegister ? (
            <>Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setIsRegister(false); }}>Sign in</a></>
          ) : (
            <>Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); setIsRegister(true); }}>Create one</a></>
          )}
        </div>

        <div style={{
          marginTop: '24px',
          padding: '12px',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.72rem',
          color: 'var(--text-tertiary)',
        }}>
          <strong style={{ color: 'var(--text-secondary)' }}>Demo credentials:</strong>
          <div style={{ marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
            admin@acme.dev / password123
          </div>
        </div>
      </div>
    </div>
  );
}
