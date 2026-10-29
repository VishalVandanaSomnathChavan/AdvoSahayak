import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const emptyCase = { title: '', clientName: '', caseNumber: '', court: '', caseType: '', description: '' };

export default function Dashboard() {
  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyCase);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [caseResult, dashboard] = await Promise.all([
        api.getAllCases({ search, limit: 50 }),
        api.getDashboard(),
      ]);
      setCases(caseResult.cases);
      setStats(dashboard);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not load cases. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { refresh(); }, [refresh]);

  async function createCase(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.createCase(form);
      setForm(emptyCase);
      setShowForm(false);
      await refresh();
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not create case.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div><p className="eyebrow">OVERVIEW</p><h1>Your workspace</h1><p className="muted">A clear view of your active matters and next steps.</p></div>
        <button className="button button-primary" onClick={() => setShowForm(true)}>＋ New case</button>
      </header>
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      <section className="stat-grid" aria-label="Workspace statistics">
        {[
          ['Total cases', stats?.totalCases],
          ['Open matters', stats?.openCases],
          ['Upcoming hearings', stats?.upcomingHearings],
          ['Pending tasks', stats?.pendingTasks],
        ].map(([label, value], index) => (
          <article className="stat-card" key={label}><span className={`stat-icon icon-${index}`}>{['▤', '◉', '◷', '✓'][index]}</span><div><p>{label}</p><strong>{value ?? '—'}</strong></div></article>
        ))}
      </section>
      <section className="section-heading">
        <div><h2>Cases</h2><p className="muted">{cases.length} {cases.length === 1 ? 'matter' : 'matters'} shown</p></div>
        <label className="search-field"><span aria-hidden="true">⌕</span><input aria-label="Search cases" placeholder="Search title, client, or court" value={search} onChange={event => setSearch(event.target.value)} /></label>
      </section>
      {loading ? <div className="loading-panel">Loading cases…</div> : cases.length ? (
        <section className="case-grid">
          {cases.map(caseItem => (
            <Link to={`/case/${caseItem._id}`} className="case-card" key={caseItem._id}>
              <div className="case-card-top"><span className={`status-pill status-${caseItem.status}`}>{caseItem.status}</span><span className="case-number">{caseItem.caseNumber || 'Matter'}</span></div>
              <h3>{caseItem.title}</h3>
              <p className="case-description">{caseItem.description}</p>
              <div className="case-meta"><span>Client</span><strong>{caseItem.clientName}</strong></div>
              {caseItem.court && <div className="case-meta"><span>Court</span><strong>{caseItem.court}</strong></div>}
              <div className="case-card-footer"><span>Updated {new Date(caseItem.updatedAt).toLocaleDateString()}</span><span aria-hidden="true">→</span></div>
            </Link>
          ))}
        </section>
      ) : <div className="empty-state"><span className="empty-icon">▤</span><h2>{search ? 'No matching cases' : 'Your case list is empty'}</h2><p>{search ? 'Try another search term.' : 'Create a case to start organizing your legal workflow.'}</p>{!search && <button className="button button-primary" onClick={() => setShowForm(true)}>Create a case</button>}</div>}

      {showForm && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setShowForm(false); }}>
        <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="create-case-title">
          <div className="modal-header"><div><p className="eyebrow">NEW MATTER</p><h2 id="create-case-title">Create a case</h2></div><button className="icon-button" aria-label="Close dialog" onClick={() => setShowForm(false)}>×</button></div>
          <form onSubmit={createCase} className="form-stack">
            <div className="form-row"><label>Case title<input required maxLength="200" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} /></label><label>Client name<input required maxLength="200" value={form.clientName} onChange={event => setForm({ ...form, clientName: event.target.value })} /></label></div>
            <div className="form-row"><label>Case number<input maxLength="100" value={form.caseNumber} onChange={event => setForm({ ...form, caseNumber: event.target.value })} /></label><label>Court<input maxLength="200" value={form.court} onChange={event => setForm({ ...form, court: event.target.value })} /></label></div>
            <label>Case type<input maxLength="100" value={form.caseType} onChange={event => setForm({ ...form, caseType: event.target.value })} /></label>
            <label>Description<textarea required maxLength="10000" rows="4" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></label>
            {error && <p className="error-message" role="alert">{error}</p>}
            <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? 'Creating…' : 'Create case'}</button></div>
          </form>
        </section>
      </div>}
    </div>
  );
}
