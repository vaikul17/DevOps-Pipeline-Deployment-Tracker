import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Check, X, Loader2, History, Clock, Minus, GitCommit, User, Globe, Timer } from 'lucide-react';
import RollbackDialog from './RollbackDialog';

const STATUS_ICONS: Record<string, JSX.Element> = {
  success: <Check size={14} />,
  failed: <X size={14} />,
  in_progress: <Loader2 size={14} className="spin" />,
  rolled_back: <History size={14} />,
  queued: <Clock size={14} />,
  cancelled: <Minus size={14} />,
};

interface Props {
  deployments: any[];
}

export default function DeploymentTimeline({ deployments }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [rollbackDeployment, setRollbackDeployment] = useState<any>(null);

  if (!deployments?.length) return null;

  // Show last 30 deployments for readability, reversed so newest is at the top
  const visible = [...deployments].slice(-30).reverse();

  return (
    <div className="timeline-container">
      <div className="timeline-track">
        <div className="timeline-line" />
        <div className="timeline-nodes" role="list" aria-label="Deployment timeline">
          {visible.map((dep) => (
            <div
              key={dep.id}
              className="timeline-node"
              onMouseEnter={() => setHoveredId(dep.id)}
              onMouseLeave={() => setHoveredId(null)}
              role="listitem"
              aria-label={`Build #${dep.build?.buildNumber} — ${dep.status}`}
            >
              {/* Tooltip */}
              {hoveredId === dep.id && (
                <div className="timeline-node-tooltip" role="tooltip">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong style={{ fontFamily: 'var(--font-mono)' }}>
                      #{dep.build?.buildNumber}
                    </strong>
                    <span className={`status-badge ${dep.status}`} style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                      {dep.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    {dep.build?.message}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><GitCommit size={12} /> {dep.build?.commitSha?.slice(0, 7)} on {dep.build?.branch}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><User size={12} /> @{dep.build?.author}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Globe size={12} /> {dep.environment?.name}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={12} /> {format(new Date(dep.startedAt), 'MMM d, HH:mm')}</span>
                    {dep.durationMs && <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Timer size={12} /> {(dep.durationMs / 1000).toFixed(1)}s</span>}
                  </div>
                  {dep.rollbacks?.length > 0 && (
                    <div style={{
                      marginTop: '8px',
                      padding: '6px 8px',
                      background: 'var(--status-warning-bg)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.7rem',
                      color: 'var(--status-warning)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '4px',
                    }}>
                      <History size={12} style={{ marginTop: '2px', flexShrink: 0 }} /> Rolled back: {dep.rollbacks[0].reason?.slice(0, 60)}...
                    </div>
                  )}
                  {dep.status === 'success' && (
                    <button 
                      className="btn btn-ghost" 
                      style={{ marginTop: '12px', width: '100%', fontSize: '0.75rem', borderColor: 'var(--status-warning)', color: 'var(--status-warning)' }}
                      onClick={() => setRollbackDeployment(dep)}
                    >
                      <History size={12} /> Rollback to this build
                    </button>
                  )}
                </div>
              )}

              {/* Node */}
              <div className={`timeline-node-dot ${dep.status}`}>
                {STATUS_ICONS[dep.status] || '●'}
              </div>
              <span className="timeline-node-label">#{dep.build?.buildNumber}</span>
              <span className="timeline-node-time">
                {formatDistanceToNow(new Date(dep.startedAt), { addSuffix: true })}
              </span>
            </div>
          ))}
        </div>
      </div>
      {rollbackDeployment && (
        <RollbackDialog
          deployment={rollbackDeployment}
          onClose={() => setRollbackDeployment(null)}
        />
      )}
    </div>
  );
}
