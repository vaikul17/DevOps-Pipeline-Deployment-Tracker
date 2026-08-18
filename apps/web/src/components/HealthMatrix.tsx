import { Link } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle, AlertTriangle, HelpCircle } from 'lucide-react';

const HEALTH_ICONS: Record<string, JSX.Element> = {
  healthy: <CheckCircle2 />,
  deploying: <Loader2 />,
  failed: <XCircle />,
  stale: <AlertTriangle />,
  unknown: <HelpCircle />,
};

interface Props {
  data: any[];
}

export default function HealthMatrix({ data }: Props) {
  if (!data?.length) return null;

  // Collect all unique environment names across projects
  const allEnvNames = Array.from(new Set(data.flatMap(p => p.environments.map((e: any) => e.envName))));
  const envOrder = ['development', 'staging', 'canary', 'production'];
  allEnvNames.sort((a, b) => {
    const ai = envOrder.indexOf(a);
    const bi = envOrder.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return (
    <table className="health-matrix">
      <thead>
        <tr>
          <th style={{ minWidth: 160 }}>Project</th>
          {allEnvNames.map(env => (
            <th key={env}>{env}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((project) => (
          <tr key={project.projectId}>
            <td>
              <Link
                to={`/projects/${project.projectId}`}
                style={{ color: 'inherit', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-text)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'inherit')}
              >
                {project.projectName}
              </Link>
            </td>
            {allEnvNames.map(envName => {
              const env = project.environments.find((e: any) => e.envName === envName);
              return (
                <td key={envName}>
                  {env ? (
                    <div
                      className={`health-cell ${env.status}`}
                      title={`${envName}: ${env.status}${env.lastDeployedAt ? ` (${new Date(env.lastDeployedAt).toLocaleDateString()})` : ''}`}
                    >
                      {HEALTH_ICONS[env.status] || <HelpCircle />}
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
