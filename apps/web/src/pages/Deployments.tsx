import { useState } from 'react';
import { useDeployments } from '../hooks/useData';
import { formatDistanceToNow, format } from 'date-fns';
import { Search } from 'lucide-react';

const STATUS_OPTIONS = ['', 'success', 'failed', 'in_progress', 'rolled_back', 'queued', 'cancelled'];

export default function Deployments() {
  const [statusFilter, setStatusFilter] = useState('');
  const [envFilter, setEnvFilter] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useDeployments({
    status: statusFilter || undefined,
    env: envFilter || undefined,
    limit: 50,
  });

  const deployments = data?.data || [];
  const filtered = deployments.filter((d: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.build?.commitSha?.toLowerCase().includes(q) ||
      d.build?.message?.toLowerCase().includes(q) ||
      d.build?.author?.toLowerCase().includes(q) ||
      d.build?.branch?.toLowerCase().includes(q) ||
      d.project?.name?.toLowerCase().includes(q) ||
      d.environment?.name?.toLowerCase().includes(q) ||
      String(d.build?.buildNumber).includes(q)
    );
  });

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Deployments</h2>
          <p className="page-header-subtitle">
            All deployment activity across your organization
          </p>
        </div>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
          {data?.pagination?.total || 0} total deployments
        </span>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <Search size={16} style={{ color: 'var(--text-muted)' }} />
        <input
          className="filter-input"
          type="text"
          placeholder="Search by commit, author, branch, project..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="filter-select"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.filter(Boolean).map(s => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
        <select
          className="filter-select"
          value={envFilter}
          onChange={e => setEnvFilter(e.target.value)}
        >
          <option value="">All Environments</option>
          <option value="development">Development</option>
          <option value="staging">Staging</option>
          <option value="canary">Canary</option>
          <option value="production">Production</option>
        </select>
        {(search || statusFilter || envFilter) && (
          <button className="btn btn-ghost" onClick={() => { setSearch(''); setStatusFilter(''); setEnvFilter(''); }}>
            Clear
          </button>
        )}
      </div>

      {/* Deployments Table */}
      <div className="card">
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton" style={{ height: 56 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Search size={48} /></div>
            <h3>No deployments found</h3>
            <p>Try adjusting your filters</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
                  {['Status', 'Build', 'Project', 'Environment', 'Branch', 'Author', 'Duration', 'Time'].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px',
                      textAlign: 'left',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: 'var(--text-muted)',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d: any) => (
                  <tr
                    key={d.id}
                    style={{
                      borderBottom: '1px solid var(--border-primary)',
                      transition: 'background 150ms ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 14px' }}>
                      <span className={`status-badge ${d.status}`}>{d.status.replace('_', ' ')}</span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-text)' }}>
                        #{d.build?.buildNumber}
                      </span>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {d.build?.commitSha?.slice(0, 7)}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 500, fontSize: '0.85rem' }}>
                      {d.project?.name}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: d.environment?.name === 'production' ? 'var(--status-failed-bg)' : 'var(--bg-surface)',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        color: d.environment?.name === 'production' ? 'var(--status-failed)' : 'var(--text-secondary)',
                      }}>
                        {d.environment?.name}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {d.build?.branch}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      @{d.build?.author}
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                      {d.durationMs ? `${(d.durationMs / 1000).toFixed(0)}s` : '—'}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '0.75rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                      {formatDistanceToNow(new Date(d.startedAt), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
