import { useState } from 'react';
import { useDORAMetrics, useHeatmap, useHealthMatrix, useProjects } from '../hooks/useData';
import DORAMetrics from '../components/DORAMetrics';
import DeployHeatmap from '../components/DeployHeatmap';
import HealthMatrix from '../components/HealthMatrix';
import { Target, Calendar, Activity } from 'lucide-react';

export default function Analytics() {
  const { data: projects } = useProjects();
  const [selectedProject, setSelectedProject] = useState<string>('');
  const { data: dora, isLoading: loadingDora } = useDORAMetrics(selectedProject || undefined);
  const { data: heatmap } = useHeatmap(selectedProject || undefined);
  const { data: health } = useHealthMatrix();

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Analytics</h2>
          <p className="page-header-subtitle">DORA metrics, deployment trends, and environment health</p>
        </div>
        <select
          className="filter-select"
          value={selectedProject}
          onChange={e => setSelectedProject(e.target.value)}
        >
          <option value="">All Projects</option>
          {projects?.map((p: any) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* DORA Metrics */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Target size={18} /> DORA Metrics
          <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 400 }}>Last 30 days</span>
        </h3>
        {loadingDora ? (
          <div className="dora-grid">
            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 140 }} />)}
          </div>
        ) : dora ? (
          <DORAMetrics metrics={dora} />
        ) : null}
      </div>

      {/* Heatmap */}
      {heatmap && heatmap.length > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="card-header">
            <div className="card-title"><Calendar size={16} /> Deployment Frequency Heatmap</div>
          </div>
          <DeployHeatmap data={heatmap} />
        </div>
      )}

      {/* Health Matrix */}
      {health && health.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Activity size={16} /> Environment Health Matrix</div>
          </div>
          <HealthMatrix data={health} />
        </div>
      )}
    </>
  );
}
