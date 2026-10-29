import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function Hearings() {
  const [hearings, setHearings] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAllCases({ limit: 100 })
      .then(({ cases }) => {
        const allHearings = cases.flatMap(item => (item.hearings || []).map(hearing => ({
          ...hearing,
          caseId: item._id,
          caseTitle: item.title,
          court: item.court,
        })));
        setHearings(allHearings.sort((a, b) => new Date(a.date) - new Date(b.date)));
      })
      .catch(requestError => setError(requestError.response?.data?.error || 'Unable to load hearings.'))
      .finally(() => setLoading(false));
  }, []);

  return <div className="page">
    <header className="page-header"><div><p className="eyebrow">COURT CALENDAR</p><h1>Hearings</h1><p className="muted">Upcoming and recorded hearings across your cases.</p></div></header>
    {error && <div className="notice notice-error" role="alert">{error}</div>}
    <section className="content-card">
      {loading ? <div className="loading-panel">Loading hearings…</div> : hearings.length ? <div className="hearing-list">{hearings.map(hearing => <article className="hearing-row" key={`${hearing.caseId}-${hearing._id}`}><div className="date-tile"><strong>{new Date(hearing.date).toLocaleDateString(undefined, { day: '2-digit' })}</strong><span>{new Date(hearing.date).toLocaleDateString(undefined, { month: 'short' })}</span></div><div className="hearing-info"><strong>{hearing.description}</strong><Link to={`/case/${hearing.caseId}`}>{hearing.caseTitle}</Link><span>{hearing.court || 'Court not specified'} · {new Date(hearing.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>{hearing.outcome && <p>{hearing.outcome}</p>}</div><span className={new Date(hearing.date) < new Date() ? 'status-pill status-closed' : 'status-pill status-active'}>{new Date(hearing.date) < new Date() ? 'Completed' : 'Upcoming'}</span></article>)}</div> : <div className="empty-inline"><h3>No hearings scheduled</h3><p>Add a hearing from any case file to keep your court calendar up to date.</p></div>}
    </section>
  </div>;
}
