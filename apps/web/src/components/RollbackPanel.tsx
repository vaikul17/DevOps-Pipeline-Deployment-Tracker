import { formatDistanceToNow } from 'date-fns';
import { Globe, Package, User } from 'lucide-react';

interface Props {
  rollbacks: any[];
}

export default function RollbackPanel({ rollbacks }: Props) {
  if (!rollbacks?.length) return null;

  return (
    <div>
      {rollbacks.map((r) => (
        <div key={r.id} className="rollback-item">
          <div className="rollback-marker" />
          <div className="rollback-content">
            <div className="rollback-title">
              #{r.deployment?.build?.buildNumber} → #{r.targetDeployment?.build?.buildNumber}
              <span className={`status-badge ${r.status}`} style={{ marginLeft: '8px', fontSize: '0.6rem', padding: '1px 6px' }}>
                {r.status}
              </span>
            </div>
            <div className="rollback-reason">{r.reason}</div>
            <div className="rollback-meta">
              <span className="rollback-category">{r.category}</span>
              <span><Globe size={12} /> {r.deployment?.environment?.name}</span>
              <span><Package size={12} /> {r.deployment?.project?.name}</span>
              <span><User size={12} /> {r.initiator?.name}</span>
              <span>{formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
