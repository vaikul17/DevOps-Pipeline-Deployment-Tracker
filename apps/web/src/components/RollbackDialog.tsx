import { useState } from 'react';
import { X, History, AlertTriangle } from 'lucide-react';
import { useTriggerRollback } from '../hooks/useData';

interface Props {
  deployment: any;
  onClose: () => void;
}

export default function RollbackDialog({ deployment, onClose }: Props) {
  const [reason, setReason] = useState('');
  const triggerRollback = useTriggerRollback();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    triggerRollback.mutate(
      { id: deployment.id, reason },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={24} style={{ color: 'var(--status-warning)' }} /> Trigger Rollback
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            You are about to rollback the <strong>{deployment.environment?.name}</strong> environment to build <strong>#{deployment.build?.buildNumber}</strong>.
          </p>
        </div>

        <div className="card" style={{ background: 'var(--status-warning-bg)', borderColor: 'var(--status-warning-border)', marginBottom: 'var(--space-xl)' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <AlertTriangle size={20} style={{ color: 'var(--status-warning)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: '4px' }}>
                Are you sure?
              </strong>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                This will trigger a new deployment based on commit <code>{deployment.build?.commitSha?.slice(0, 7)}</code>. Make sure your CI/CD provider is configured to handle rollback webhooks or API calls.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Rollback Reason</label>
            <textarea
              className="form-input"
              placeholder="e.g., Critical bug in production preventing checkout..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              autoFocus
              required
              style={{ resize: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: 'var(--space-xl)' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ background: 'var(--status-warning)', color: '#000', textShadow: 'none', boxShadow: '0 4px 15px rgba(255, 184, 0, 0.4)' }} disabled={triggerRollback.isPending || !reason.trim()}>
              {triggerRollback.isPending ? 'Initiating...' : 'Confirm Rollback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
