interface Props {
  metrics: {
    deploymentFrequency: { value: number; unit: string; trend: number; rating: string };
    leadTimeForChanges: { value: number; trend: number; rating: string };
    meanTimeToRecovery: { value: number; trend: number; rating: string };
    changeFailureRate: { value: number; trend: number; rating: string };
  };
}

import { Rocket, Clock, Wrench, Activity } from 'lucide-react';

export default function DORAMetrics({ metrics }: Props) {
  const cards = [
    {
      label: 'Deployment Frequency',
      value: metrics.deploymentFrequency.value,
      unit: metrics.deploymentFrequency.unit === 'per_day' ? '/day' : '/week',
      trend: metrics.deploymentFrequency.trend,
      rating: metrics.deploymentFrequency.rating,
      icon: <Rocket size={20} />,
      description: 'How often your org deploys to production',
      goodDirection: 'up',
    },
    {
      label: 'Lead Time for Changes',
      value: metrics.leadTimeForChanges.value,
      unit: 'min',
      trend: metrics.leadTimeForChanges.trend,
      rating: metrics.leadTimeForChanges.rating,
      icon: <Clock size={20} />,
      description: 'Time from commit to production deploy',
      goodDirection: 'down',
    },
    {
      label: 'Mean Time to Recovery',
      value: metrics.meanTimeToRecovery.value,
      unit: 'min',
      trend: metrics.meanTimeToRecovery.trend,
      rating: metrics.meanTimeToRecovery.rating,
      icon: <Wrench size={20} />,
      description: 'How quickly you recover from failures',
      goodDirection: 'down',
    },
    {
      label: 'Change Failure Rate',
      value: metrics.changeFailureRate.value,
      unit: '%',
      trend: metrics.changeFailureRate.trend,
      rating: metrics.changeFailureRate.rating,
      icon: <Activity size={20} />,
      description: 'Percentage of deploys causing failures',
      goodDirection: 'down',
    },
  ];

  return (
    <div className="dora-grid">
      {cards.map((card) => {
        const trendIsGood = card.goodDirection === 'up'
          ? card.trend >= 0
          : card.trend <= 0;

        return (
          <div key={card.label} className="dora-card">
            <span className={`rating-badge ${card.rating}`}>{card.rating}</span>
            <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{card.icon}</div>
            <div style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
              {card.label}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
                {card.value}
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                {card.unit}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={`stat-card-trend ${trendIsGood ? 'positive' : 'negative'}`}>
                {card.trend >= 0 ? '↑' : '↓'} {Math.abs(card.trend)}%
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>vs prev period</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '10px' }}>
              {card.description}
            </div>
          </div>
        );
      })}
    </div>
  );
}
