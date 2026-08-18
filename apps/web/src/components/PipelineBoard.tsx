import { formatDistanceToNow } from 'date-fns';
import { RefreshCw, User, Clock } from 'lucide-react';

interface Props {
  environments: any[];
}

export default function PipelineBoard({ environments }: Props) {
  if (!environments?.length) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><RefreshCw size={48} /></div>
        <h3>No environments configured</h3>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'var(--status-success)';
      case 'failed': return 'var(--status-failed)';
      case 'in_progress': return 'var(--status-info)';
      case 'rolled_back': return 'var(--status-warning)';
      default: return 'var(--status-neutral)';
    }
  };

  return (
    <div className="pipeline-board">
      {environments.map((env) => {
        const latestDeploy = env.deployments?.[0];

        return (
          <div className="pipeline-lane" key={env.id}>
            <div className="pipeline-lane-header">
              <div className="pipeline-lane-name">
                <span
                  className="env-dot"
                  style={{ background: latestDeploy ? getStatusColor(latestDeploy.status) : 'var(--status-neutral)' }}
                />
                {env.name}
              </div>
              {env.isProduction && (
                <span style={{
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--status-failed-bg)',
                  color: 'var(--status-failed)',
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}>
                  PROD
                </span>
              )}
            </div>
            <div className="pipeline-lane-body">
              {latestDeploy ? (
                <div className="pipeline-deploy-card">
                  <div className="pipeline-deploy-build">
                    <span className="pipeline-deploy-number">#{latestDeploy.build?.buildNumber}</span>
                    <span className={`status-badge ${latestDeploy.status}`}>
                      {latestDeploy.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="pipeline-deploy-sha">
                    {latestDeploy.build?.commitSha?.slice(0, 7)}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    marginBottom: '8px',
                  }}>
                    {latestDeploy.build?.message}
                  </div>
                  <div className="pipeline-deploy-meta">
                    <span className="pipeline-deploy-author" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={12} /> {latestDeploy.initiator?.name || latestDeploy.build?.author}
                    </span>
                    <span>{formatDistanceToNow(new Date(latestDeploy.startedAt), { addSuffix: true })}</span>
                  </div>
                  {latestDeploy.durationMs && (
                    <div style={{
                      marginTop: '8px',
                      fontSize: '0.7rem',
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Clock size={12} /> {(latestDeploy.durationMs / 1000).toFixed(1)}s
                    </div>
                  )}
                </div>
              ) : (
                <div className="pipeline-no-deploy">
                  No deployments yet
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
