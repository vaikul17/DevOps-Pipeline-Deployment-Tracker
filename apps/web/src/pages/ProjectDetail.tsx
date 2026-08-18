import { useParams, Link } from 'react-router-dom';
import { useProject, useDeploymentTimeline, useRollbacks } from '../hooks/useData';
import PipelineBoard from '../components/PipelineBoard';
import DeploymentTimeline from '../components/DeploymentTimeline';
import RollbackPanel from '../components/RollbackPanel';
import { useState } from 'react';
import { Search, Kanban, GitCommit, History, CheckCircle, Settings } from 'lucide-react';
import IntegrationModal from '../components/IntegrationModal';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading } = useProject(id);
  const { data: timeline } = useDeploymentTimeline(id);
  const { data: rollbackData } = useRollbacks({ projectId: id, limit: 15 });
  const [selectedEnv, setSelectedEnv] = useState<string>('');
  const [isIntegrationModalOpen, setIsIntegrationModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div>
        <div className="skeleton" style={{ width: 300, height: 32, marginBottom: 24 }} />
        <div className="skeleton" style={{ height: 200, marginBottom: 24 }} />
        <div className="skeleton" style={{ height: 300 }} />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><Search size={48} /></div>
        <h3>Project not found</h3>
        <p>The project you're looking for doesn't exist.</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>← Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <>
      {isIntegrationModalOpen && <IntegrationModal project={project} onClose={() => setIsIntegrationModalOpen(false)} />}
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <Link to="/" style={{ color: 'var(--text-tertiary)', textDecoration: 'none', fontSize: '0.85rem' }}>
              Dashboard
            </Link>
            <span style={{ color: 'var(--text-muted)' }}>/</span>
            <h2 style={{ margin: 0 }}>{project.name}</h2>
          </div>
          <p className="page-header-subtitle">
            {project.environments?.length || 0} environments • {project._count?.deployments || 0} deployments • {project._count?.builds || 0} builds
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{
            padding: '4px 12px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--accent-bg)',
            color: 'var(--accent-text)',
            fontSize: '0.72rem',
            fontWeight: 600,
            fontFamily: 'var(--font-mono)',
          }}>
            {project.ciProvider?.replace('_', ' ')}
          </span>
        </div>
        <div>
          <button className="btn btn-ghost" onClick={() => setIsIntegrationModalOpen(true)}>
            <Settings size={14} /> Integrations
          </button>
        </div>
      </div>

      {/* Pipeline Board */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="card-header">
          <div className="card-title"><Kanban size={16} /> Pipeline Board</div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
            Latest deployment per environment
          </span>
        </div>
        <PipelineBoard environments={project.environments || []} />
      </div>

      {/* Timeline */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="card-header">
          <div className="card-title"><GitCommit size={16} /> Deployment Timeline</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              className="filter-select"
              value={selectedEnv}
              onChange={e => setSelectedEnv(e.target.value)}
              style={{ padding: '4px 28px 4px 10px', fontSize: '0.75rem' }}
            >
              <option value="">All Environments</option>
              {project.environments?.map((env: any) => (
                <option key={env.id} value={env.name}>{env.name}</option>
              ))}
            </select>
          </div>
        </div>
        {timeline && timeline.length > 0 ? (
          <DeploymentTimeline deployments={timeline} />
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon"><GitCommit size={48} /></div>
            <h3>No deployment data</h3>
            <p>Deployments will appear here once created</p>
          </div>
        )}
      </div>

      {/* Rollbacks */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', maxHeight: '500px' }}>
        <div className="card-header">
          <div className="card-title"><History size={16} /> Rollback History</div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
            {rollbackData?.pagination?.total || 0} total
          </span>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, paddingRight: '4px' }}>
          {rollbackData?.data?.length ? (
            <RollbackPanel rollbacks={rollbackData.data} />
          ) : (
            <div className="empty-state" style={{ padding: '32px' }}>
              <div className="empty-state-icon"><CheckCircle size={48} /></div>
              <h3>No rollbacks</h3>
              <p>Clean deployment history!</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
