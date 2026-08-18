import { formatDistanceToNow } from 'date-fns';
import { Rocket, History, Package, Globe, User } from 'lucide-react';

interface Props {
  events: any[];
}

export default function ActivityFeed({ events }: Props) {
  if (!events?.length) return null;

  return (
    <div className="activity-feed">
      {events.slice(0, 25).map((event) => (
        <div key={event.id} className="activity-item">
          <div className={`activity-icon ${event.type}`}>
            {event.type === 'deployment' ? <Rocket size={14} /> : <History size={14} />}
          </div>
          <div className="activity-content">
            <div className="activity-title">
              {event.title}
              <span className={`status-badge ${event.status}`} style={{ fontSize: '0.6rem', padding: '1px 6px' }}>
                {event.status.replace('_', ' ')}
              </span>
            </div>
            <div className="activity-desc">{event.description}</div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Package size={12} /> {event.project}</span>
              {event.environment && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Globe size={12} /> {event.environment}</span>}
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><User size={12} /> {event.actor}</span>
            </div>
          </div>
          <div className="activity-time">
            {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
          </div>
        </div>
      ))}
    </div>
  );
}
