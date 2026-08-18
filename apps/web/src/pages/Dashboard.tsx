import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjects, useStats, useHealthMatrix, useActivityFeed, useHeatmap, useDORAMetrics } from '../hooks/useData';
import { formatDistanceToNow } from 'date-fns';
import HealthMatrix from '../components/HealthMatrix';
import ActivityFeed from '../components/ActivityFeed';
import DeployHeatmap from '../components/DeployHeatmap';
import DORAMetrics from '../components/DORAMetrics';
import { RefreshCw, Activity, Calendar, Package, ChevronRight, Zap, Inbox, Plus } from 'lucide-react';
import CreateProjectModal from '../components/CreateProjectModal';

export default function Dashboard() {
  const { data: projects, isLoading: loadingProjects } = useProjects();
  const { data: stats, isLoading: loadingStats } = useStats();
  const { data: health } = useHealthMatrix();
  const { data: activity } = useActivityFeed();
  const { data: heatmap } = useHeatmap();
  const { data: dora } = useDORAMetrics();
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <>
      {isCreateModalOpen && <CreateProjectModal onClose={() => setIsCreateModalOpen(false)} />}
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p className="page-header-subtitle">Release pipeline overview across all projects</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-ghost" onClick={() => window.location.reload()}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
            <Plus size={14} /> New Project
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-label">Total Projects</div>
          <div className="stat-card-value" style={{ color: 'var(--accent-text)' }}>
            {loadingStats ? <div className="skeleton" style={{ width: 60, height: 36 }} /> : stats?.totalProjects || 0}
          </div>
          <span className="stat-card-trend positive">Active</span>
        </div>

        <div className="stat-card">
          <div className="stat-card-label">Total Deployments</div>
          <div className="stat-card-value">
            {loadingStats ? <div className="skeleton" style={{ width: 80, height: 36 }} /> : stats?.totalDeployments?.toLocaleString() || 0}
          </div>
          <span className="stat-card-trend positive">↑ {stats?.recentDeploys || 0} today</span>
        </div>

        <div className="stat-card">
          <div className="stat-card-label">Success Rate</div>
          <div className="stat-card-value" style={{ color: 'var(--status-success)' }}>
            {loadingStats ? <div className="skeleton" style={{ width: 70, height: 36 }} /> : `${stats?.successRate || 0}%`}
          </div>
          <span className={`stat-card-trend ${(stats?.successRate || 0) >= 90 ? 'positive' : 'negative'}`}>
            {(stats?.successRate || 0) >= 90 ? '✓ Healthy' : '⚠ Below target'}
          </span>
        </div>

        <div className="stat-card">
          <div className="stat-card-label">Rollbacks</div>
          <div className="stat-card-value" style={{ color: 'var(--status-warning)' }}>
            {loadingStats ? <div className="skeleton" style={{ width: 50, height: 36 }} /> : stats?.totalRollbacks || 0}
          </div>
          <span className="stat-card-trend negative">↩ Tracked</span>
        </div>
      </div>

      {/* DORA Metrics */}
      {dora && <DORAMetrics metrics={dora} />}

      {/* Main Content Grid */}
      <div className="grid-2col">
        <div>
          {/* Environment Health Matrix */}
          {health && health.length > 0 && (
            <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
              <div className="card-header">
                <div className="card-title"><Activity size={16} /> Environment Health Matrix</div>
              </div>
              <HealthMatrix data={health} />
            </div>
          )}

          {/* Deploy Heatmap */}
          {heatmap && heatmap.length > 0 && (
            <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
              <div className="card-header">
                <div className="card-title"><Calendar size={16} /> Deployment Activity (Past Year)</div>
              </div>
              <DeployHeatmap data={heatmap} />
            </div>
          )}

          {/* Projects List */}
          <div className="card">
            <div className="card-header">
              <div className="card-title"><Package size={16} /> Projects</div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                {projects?.length || 0} total
              </span>
            </div>
            {loadingProjects ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 64 }} />)}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {projects?.map((project: any) => (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-primary)',
                      textDecoration: 'none',
                      color: 'inherit',
                      transition: 'all 150ms ease',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-border)';
                      (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-primary)';
                      (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)';
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '2px' }}>
                        {project.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', display: 'flex', gap: '12px' }}>
                        <span>{project.environments?.length || 0} environments</span>
                        <span>{project._count?.deployments || 0} deploys</span>
                        <span>{project._count?.builds || 0} builds</span>
                      </div>
                    </div>
                    <span style={{ color: 'var(--text-muted)' }}><ChevronRight size={16} /></span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Activity Feed */}
        <div>
          <div className="card" style={{ position: 'sticky', top: 'var(--space-xl)' }}>
            <div className="card-header">
              <div className="card-title"><Zap size={16} /> Live Activity</div>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', background: 'var(--status-success)',
                animation: 'neon-pulse 2s ease-in-out infinite',
              }} />
            </div>
            {activity ? <ActivityFeed events={activity} /> : (
              <div className="empty-state">
                <div className="empty-state-icon"><Inbox size={48} /></div>
                <h3>No activity yet</h3>
                <p>Deployment events will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
