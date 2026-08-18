import { useState } from 'react';
import { X, Check, Copy, ShieldAlert, GitMerge, RefreshCw, Key, History } from 'lucide-react';
import { useSyncGitHub, useSyncVercel } from '../hooks/useData';

interface Props {
  project: any;
  onClose: () => void;
}

export default function IntegrationModal({ project, onClose }: Props) {
  let initialCiConfig: any = {};
  try {
    if (project.ciConfig) initialCiConfig = JSON.parse(project.ciConfig);
  } catch (e) {}

  const [selectedProvider, setSelectedProvider] = useState(project.ciProvider || 'github_actions');
  const [vercelProjectId, setVercelProjectId] = useState(
    initialCiConfig.vercelProjectId || 
    (project.ciProvider === 'vercel' || project.repoUrl?.startsWith('prj_') ? project.repoUrl : '')
  );
  const [vercelTeamId, setVercelTeamId] = useState(initialCiConfig.vercelTeamId || '');
  const [copied, setCopied] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [vercelToken, setVercelToken] = useState(initialCiConfig.vercelToken || '');
  const [syncResult, setSyncResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const syncMutation = useSyncGitHub();
  const syncVercelMutation = useSyncVercel();

  const [baseUrl, setBaseUrl] = useState(() => {
    return window.location.hostname === 'localhost' 
      ? 'http://localhost:3001' 
      : `${window.location.protocol}//${window.location.hostname}`;
  });

  const webhookUrl = `${baseUrl}/api/v1/webhooks/${selectedProvider === 'vercel' ? 'vercel' : 'github'}`;
  
  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSync = () => {
    setSyncResult(null);
    if (selectedProvider === 'vercel') {
      syncVercelMutation.mutate({ id: project.id, vercelToken, vercelProjectId, vercelTeamId }, {
        onSuccess: (data: any) => {
          setSyncResult({ success: true, message: `Successfully synced ${data.data?.imported || 0} past deployments!` });
        },
        onError: (error: any) => {
          setSyncResult({ success: false, message: error.response?.data?.error || 'Failed to sync with Vercel' });
        }
      });
    } else {
      syncMutation.mutate({ id: project.id, githubToken }, {
        onSuccess: (data: any) => {
          setSyncResult({ success: true, message: `Successfully synced ${data.data?.imported || 0} past deployments!` });
        },
        onError: (error: any) => {
          setSyncResult({ success: false, message: error.response?.data?.error || 'Failed to sync with GitHub' });
        }
      });
    }
  };

  const isVercel = selectedProvider === 'vercel';
  const isSyncing = syncMutation.isPending || syncVercelMutation.isPending;

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GitMerge size={24} style={{ color: 'var(--accent-text)' }} /> Webhook Integrations
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
            Connect your repository to automatically track deployments.
          </p>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Integration Provider</label>
            <select
              className="form-input"
              style={{ cursor: 'pointer', appearance: 'none', background: 'rgba(0,0,0,0.5)' }}
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
            >
              <option value="github_actions">GitHub Actions</option>
              <option value="vercel">Vercel</option>
            </select>
          </div>
        </div>

        <div className="card" style={{ background: 'rgba(0, 229, 255, 0.05)', borderColor: 'var(--accent-border)', marginBottom: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <ShieldAlert size={20} style={{ color: 'var(--accent-text)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: '4px' }}>
                {isVercel ? 'Vercel Webhook Setup' : 'GitHub Actions Setup'}
              </strong>
              {isVercel ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  1. Go to your project on Vercel.<br/>
                  2. Navigate to <strong>Settings &gt; Webhooks</strong>.<br/>
                  3. Create a new webhook and paste the Payload URL below.<br/>
                  4. Select events like <strong>deployment-created</strong> and <strong>deployment-ready</strong>.
                </p>
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  1. Go to your repository on GitHub.<br/>
                  2. Navigate to <strong>Settings &gt; Webhooks &gt; Add webhook</strong>.<br/>
                  3. Paste the Payload URL below.<br/>
                  4. Select <strong>application/json</strong> for the Content type.<br/>
                  5. Select <strong>Workflow runs</strong> for the events to trigger the webhook.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Backend API URL</label>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
            If you are running locally, use a service like ngrok. If deployed, enter your backend URL (e.g., your Render URL).
          </p>
          <input
            type="text"
            className="form-input"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', marginBottom: '12px' }}
          />

          <label className="form-label">Payload URL (Copy this to Vercel/GitHub)</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="form-input"
              value={webhookUrl}
              readOnly
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent-text)' }}
            />
            <button className="btn btn-primary" onClick={handleCopy} style={{ flexShrink: 0, padding: '0 16px' }}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <div style={{ marginTop: 'var(--space-2xl)', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-xl)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={18} style={{ color: 'var(--accent-start)' }} /> Retroactive Data Sync
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
            Instantly pull the last 30 deployment runs from {isVercel ? 'Vercel' : 'your GitHub repository'} to populate your dashboard.
          </p>
          
          <div className="form-group">
            <label className="form-label">
              {isVercel ? 'Vercel Access Token (Required)' : 'GitHub Personal Access Token (Optional for public repos)'}
            </label>
            
            {isVercel && (
              <div style={{ marginBottom: '12px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Vercel Project ID (e.g. prj_xxxx)"
                  value={vercelProjectId}
                  onChange={(e) => setVercelProjectId(e.target.value)}
                />
              </div>
            )}
            
            {isVercel && (
              <div style={{ marginBottom: '12px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Vercel Team ID (Optional: team_xxxx)"
                  value={vercelTeamId}
                  onChange={(e) => setVercelTeamId(e.target.value)}
                />
              </div>
            )}
            
            <div style={{ position: 'relative' }}>
              <Key size={16} style={{ position: 'absolute', left: 16, top: 14, color: 'var(--text-tertiary)' }} />
              {isVercel ? (
                <input
                  type="password"
                  className="form-input"
                  placeholder="Vercel Token (vtkn_xxxx)"
                  value={vercelToken}
                  onChange={(e) => setVercelToken(e.target.value)}
                  style={{ paddingLeft: '44px' }}
                />
              ) : (
                <input
                  type="password"
                  className="form-input"
                  placeholder="ghp_xxxxxxxxxxxx"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  style={{ paddingLeft: '44px' }}
                />
              )}
            </div>
          </div>

          {syncResult && (
            <div style={{ 
              padding: '12px', 
              borderRadius: '8px', 
              marginBottom: '16px',
              backgroundColor: syncResult.success ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 61, 113, 0.1)',
              color: syncResult.success ? 'var(--status-success)' : 'var(--status-error)',
              fontSize: '0.85rem'
            }}>
              {syncResult.message}
            </div>
          )}

          <button 
            className="btn btn-primary" 
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={handleSync}
            disabled={isSyncing || (isVercel && !vercelToken)}
          >
            {isSyncing ? (
              <><RefreshCw size={18} className="spin" /> Syncing with {isVercel ? 'Vercel' : 'GitHub'}...</>
            ) : (
              <><RefreshCw size={18} /> Sync Historical Data</>
            )}
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2xl)' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
