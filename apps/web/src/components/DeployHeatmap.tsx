import { useMemo } from 'react';

interface HeatmapDay {
  date: string;
  count: number;
  successCount: number;
  failedCount: number;
}

interface Props {
  data: HeatmapDay[];
}

export default function DeployHeatmap({ data }: Props) {
  const cells = useMemo(() => {
    if (!data?.length) return [];

    // Create a map for quick lookup
    const dataMap = new Map(data.map(d => [d.date, d]));

    // Generate last 365 days
    const days: Array<{ date: string; count: number; level: number }> = [];
    const today = new Date();

    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayData = dataMap.get(dateStr);
      const count = dayData?.count || 0;

      let level = 0;
      if (count >= 8) level = 4;
      else if (count >= 5) level = 3;
      else if (count >= 3) level = 2;
      else if (count >= 1) level = 1;

      days.push({ date: dateStr, count, level });
    }

    return days;
  }, [data]);

  const totalDeploys = data?.reduce((sum, d) => sum + d.count, 0) || 0;

  return (
    <div>
      <div className="heatmap" style={{ justifyContent: 'flex-start' }}>
        {cells.map((cell) => (
          <div
            key={cell.date}
            className={`heatmap-cell level-${cell.level}`}
            title={`${cell.date}: ${cell.count} deployment${cell.count !== 1 ? 's' : ''}`}
          />
        ))}
      </div>
      <div className="heatmap-legend">
        <span>{totalDeploys} deployments in the last year</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Less</span>
          {[0, 1, 2, 3, 4].map(level => (
            <div key={level} className={`heatmap-cell level-${level}`} style={{ cursor: 'default' }} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
