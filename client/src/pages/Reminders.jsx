import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function Reminders() {
  const [reminders, setReminders] = useState([]);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api.getReminders(days)
      .then(({ reminders: items }) => { setReminders(items); setError(''); })
      .catch(requestError => setError(requestError.response?.data?.error || 'Unable to load reminders.'))
      .finally(() => setLoading(false));
  }, [days]);

  return <div className="page">
    <header className="page-header"><div><p className="eyebrow">UPCOMING WORK</p><h1>Reminders</h1><p className="muted">Upcoming user-entered hearings, verified deadlines, and open tasks. These are in-app reminders, not email or calendar alerts.</p></div>
      <label className="reminder-window">Time window<select value={days} onChange={event => setDays(Number(event.target.value))}><option value="7">Next 7 days</option><option value="14">Next 14 days</option><option value="30">Next 30 days</option></select></label>
    </header>
    {error && <div className="notice notice-error" role="alert">{error}</div>}
    <section className="content-card">
      {loading ? <div className="loading-panel">Loading reminders…</div> : reminders.length ? <div className="reminder-list">{reminders.map(item => (
        <article className={`reminder-row${item.overdue ? ' reminder-overdue' : ''}`} key={item.id}>
          <span className="reminder-type">{item.type}</span>
          <div className="reminder-copy"><strong>{item.title}</strong><Link to={`/case/${item.caseId}`}>{item.caseTitle}</Link></div>
          <time dateTime={new Date(item.date).toISOString()}>{item.overdue ? 'Overdue · ' : ''}{new Date(item.date).toLocaleString()}</time>
        </article>
      ))}</div> : <div className="empty-inline"><h3>You’re all caught up</h3><p>No upcoming items in the selected window.</p></div>}
    </section>
  </div>;
}
