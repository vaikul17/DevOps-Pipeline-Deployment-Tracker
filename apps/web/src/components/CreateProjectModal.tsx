import { useState } from 'react';
import { X, Plus, GitCommit, Settings, Zap } from 'lucide-react';
import { useCreateProject } from '../hooks/useData';
import { useNavigate } from 'react-router-dom';

interface Props {
  onClose: () => void;
}

export default function CreateProjectModal({ onClose }: Props) {
  const [name, setName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [ciProvider, setCiProvider] = useState('github_actions');
  const createProject = useCreateProject();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    createProject.mutate(
      { name, repoUrl, ciProvider },
      {
        onSuccess: (data: any) => {
          onClose();
          navigate(`/projects/${data.id}`);
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
            <Zap size={24} style={{ color: 'var(--accent-text)' }} /> New Project
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Initialize a new pipeline tracker for your repository.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Project Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g., frontend-monorepo"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">{ciProvider === 'vercel' ? 'Vercel Project ID' : 'Repository URL'}</label>
            <div style={{ position: 'relative' }}>
              <GitCommit size={16} style={{ position: 'absolute', left: 16, top: 14, color: 'var(--text-tertiary)' }} />
              <input
                type={ciProvider === 'vercel' ? 'text' : 'url'}
                className="form-input"
                style={{ paddingLeft: 42 }}
                placeholder={ciProvider === 'vercel' ? 'prj_xxxxxxxxxxxxx' : 'https://github.com/org/repo'}
                value={repoUrl}
                onChange={e => setRepoUrl(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">CI/CD Provider</label>
            <div style={{ position: 'relative' }}>
              <Settings size={16} style={{ position: 'absolute', left: 16, top: 14, color: 'var(--text-tertiary)' }} />
              <select
                className="form-input"
                style={{ paddingLeft: 42, appearance: 'none', cursor: 'pointer' }}
                value={ciProvider}
                onChange={e => setCiProvider(e.target.value)}
              >
                <option value="github_actions">GitHub Actions</option>
                <option value="vercel">Vercel</option>
                <option value="gitlab_ci">GitLab CI</option>
                <option value="jenkins">Jenkins</option>
                <option value="custom">Custom Webhook</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: 'var(--space-2xl)' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={createProject.isPending || !name}>
              {createProject.isPending ? 'Creating...' : <><Plus size={16} /> Create Pipeline</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
