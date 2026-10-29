import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';

const tabs = ['Overview', 'Documents', 'Hearings & dates', 'Activity', 'AI assistant'];

export default function CaseDetails() {
  const { id } = useParams();
  const [caseData, setCaseData] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [activity, setActivity] = useState([]);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [tab, setTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [question, setQuestion] = useState('');
  const [selectedDocument, setSelectedDocument] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [editingHearing, setEditingHearing] = useState('');
  const [hearingForm, setHearingForm] = useState({ description: '', date: '', outcome: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [matter, docs, results, events] = await Promise.all([
        api.getCase(id), api.listDocuments(id), api.getAnalyses(id), api.getActivity(id),
      ]);
      setCaseData(matter);
      setEditForm({
        title: matter.title,
        clientName: matter.clientName,
        caseNumber: matter.caseNumber || '',
        court: matter.court || '',
        caseType: matter.caseType || '',
        description: matter.description,
        parties: (matter.parties || []).join('\n'),
        importantDates: matter.importantDates || [],
      });
      setDocuments(docs);
      setAnalyses(results);
      setActivity(events);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to load this case.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function submit(action) {
    setBusy(true);
    setError('');
    try {
      await action();
      await load();
      return true;
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'That action could not be completed.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    await submit(() => api.uploadDocument(id, file));
    event.target.value = '';
  }

  async function runAi(type, prompt = '', documentId) {
    await submit(async () => {
      const result = await api.runAi(id, type, { prompt, documentId: documentId || selectedDocument || undefined });
      if (type === 'question') setQuestion('');
      setAnalyses(previous => [result.analysis, ...previous]);
    });
  }

  async function download(document) {
    try {
      const blob = await api.downloadDocument(document._id);
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = document.originalName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Download failed.');
    }
  }

  async function removeDocument(document) {
    if (!window.confirm(`Permanently delete "${document.originalName}"?`)) return;
    await submit(() => api.deleteDocument(document._id));
  }

  function startHearingEdit(hearing) {
    setEditingHearing(hearing._id);
    setHearingForm({
      description: hearing.description,
      date: new Date(hearing.date).toISOString().slice(0, 10),
      outcome: hearing.outcome || '',
    });
  }

  if (loading) return <div className="page"><div className="loading-panel">Loading case…</div></div>;
  if (!caseData) return <div className="page"><div className="notice notice-error">{error || 'Case not found.'}</div><Link to="/" className="text-button">Back to dashboard</Link></div>;

  return (
    <div className="page">
      <Link to="/" className="back-link">← All cases</Link>
      <header className="case-detail-header">
        <div><p className="eyebrow">{caseData.caseNumber || 'CASE FILE'}{caseData.court ? ` · ${caseData.court}` : ''}</p><h1>{caseData.title}</h1><p className="muted">{caseData.clientName}{caseData.caseType ? ` · ${caseData.caseType}` : ''}</p></div>
        <div className="header-actions">
          <span className={`status-pill status-${caseData.status}`}>{caseData.status}</span>
          <select aria-label="Case status" value={caseData.status} onChange={event => submit(() => api.updateCase(id, { status: event.target.value }))}>
            <option value="active">Active</option><option value="pending">Pending</option><option value="closed">Closed</option>
          </select>
          <button className="button button-secondary" disabled={busy || caseData.archived} onClick={() => submit(() => api.updateCase(id, { archived: true }))}>{caseData.archived ? 'Archived' : 'Archive'}</button>
        </div>
      </header>
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      <nav className="tab-bar" aria-label="Case sections">{tabs.map(item => <button key={item} className={tab === item ? 'tab active' : 'tab'} onClick={() => setTab(item)}>{item}</button>)}</nav>

      {tab === 'Overview' && <section className="detail-grid">
        <article className="content-card wide-card"><div className="section-heading"><div><h2>Case overview</h2><p className="muted">Matter details and notes</p></div><button className="button button-secondary" onClick={() => setEditing(!editing)}>{editing ? 'Cancel edit' : 'Edit case'}</button></div>
          {editing ? <form className="form-stack" onSubmit={event => {
            event.preventDefault();
            submit(async () => {
              await api.updateCase(id, {
                ...editForm,
                parties: editForm.parties.split(/\r?\n/).map(party => party.trim()).filter(Boolean),
                importantDates: editForm.importantDates.map(item => ({ ...item, date: item.date || null })),
              });
              setEditing(false);
            });
          }}>
            <div className="form-row"><label>Title<input required maxLength="200" value={editForm?.title || ''} onChange={event => setEditForm({ ...editForm, title: event.target.value })} /></label><label>Client name<input required maxLength="200" value={editForm?.clientName || ''} onChange={event => setEditForm({ ...editForm, clientName: event.target.value })} /></label></div>
            <div className="form-row"><label>Case number<input maxLength="100" value={editForm?.caseNumber || ''} onChange={event => setEditForm({ ...editForm, caseNumber: event.target.value })} /></label><label>Court<input maxLength="200" value={editForm?.court || ''} onChange={event => setEditForm({ ...editForm, court: event.target.value })} /></label></div>
            <label>Case type<input maxLength="100" value={editForm?.caseType || ''} onChange={event => setEditForm({ ...editForm, caseType: event.target.value })} /></label>
            <label>Description<textarea required maxLength="10000" rows="4" value={editForm?.description || ''} onChange={event => setEditForm({ ...editForm, description: event.target.value })} /></label>
            <label>Parties (one name per line)<textarea maxLength="10000" rows="3" value={editForm?.parties || ''} onChange={event => setEditForm({ ...editForm, parties: event.target.value })} /></label>
            <div className="form-stack">
              <h3>Important dates</h3>
              {(editForm?.importantDates || []).map((item, index) => (
                <div className="form-row" key={`important-date-${index}`}>
                  <label>Date label<input maxLength="200" value={item.label || ''} onChange={event => setEditForm({
                    ...editForm,
                    importantDates: editForm.importantDates.map((date, dateIndex) => dateIndex === index ? { ...date, label: event.target.value } : date),
                  })} /></label>
                  <label>Date<input type="date" value={item.date ? new Date(item.date).toISOString().slice(0, 10) : ''} onChange={event => setEditForm({
                    ...editForm,
                    importantDates: editForm.importantDates.map((date, dateIndex) => dateIndex === index ? { ...date, date: event.target.value } : date),
                  })} /></label>
                  <button type="button" className="button button-secondary" onClick={() => setEditForm({
                    ...editForm,
                    importantDates: editForm.importantDates.filter((_, dateIndex) => dateIndex !== index),
                  })}>Remove date</button>
                </div>
              ))}
              <button type="button" className="button button-secondary" onClick={() => setEditForm({
                ...editForm,
                importantDates: [...editForm.importantDates, { label: '', date: null }],
              })}>Add important date</button>
            </div>
            <button className="button button-primary" disabled={busy}>Save changes</button>
          </form> : <><p className="prose">{caseData.description}</p>
          <div className="detail-facts"><div><span>Case number</span><strong>{caseData.caseNumber || 'Not provided'}</strong></div><div><span>Court</span><strong>{caseData.court || 'Not provided'}</strong></div><div><span>Case type</span><strong>{caseData.caseType || 'Not provided'}</strong></div><div><span>Created</span><strong>{new Date(caseData.createdAt).toLocaleDateString()}</strong></div></div>
          {!!caseData.importantDates?.length && <div className="timeline">{caseData.importantDates.map(item => <article className="timeline-item" key={item._id}><strong>{item.label || 'Important date'}</strong>{item.date && <span>{new Date(item.date).toLocaleDateString()}</span>}</article>)}</div>}
          </>}
          <div className="case-notes-section">
            <h3>Case notes</h3>
            {caseData.notes?.length ? <div className="activity-list">{caseData.notes.map(note => <article className="activity-row" key={note._id}><span className="activity-dot" /><div><p>{note.content}</p><small>{new Date(note.createdAt).toLocaleString()}</small></div></article>)}</div> : <p className="muted">No notes recorded.</p>}
            <form className="form-stack" onSubmit={event => {
              event.preventDefault();
              submit(async () => {
                await api.addNote(id, noteContent);
                setNoteContent('');
              });
            }}>
              <label>Add a note<textarea rows="3" maxLength="10000" required value={noteContent} onChange={event => setNoteContent(event.target.value)} /></label>
              <button className="button button-secondary" disabled={busy || !noteContent.trim()}>Save note</button>
            </form>
          </div>
        </article>
        <article className="content-card"><h2>Next steps</h2><p className="muted">Keep your case moving with a task or hearing record.</p><Link className="button button-primary" to="/tasks">Manage tasks</Link><button className="button button-secondary spaced-button" onClick={() => setTab('Hearings & dates')}>Add hearing or deadline</button></article>
      </section>}

      {tab === 'Documents' && <section className="content-card">
        <div className="section-heading"><div><h2>Case documents</h2><p className="muted">Private PDFs are stored on the server and only available to your account.</p></div><label className="button button-primary upload-button">＋ Upload PDF<input type="file" accept="application/pdf,.pdf" onChange={upload} disabled={busy} /></label></div>
        {busy && <p className="muted">Processing document…</p>}
        {documents.length ? <div className="document-list">{documents.map(doc => <article className="document-row" key={doc._id}><span className="document-icon">PDF</span><div className="document-info"><strong>{doc.originalName}</strong><small>{(doc.size / 1024 / 1024).toFixed(2)} MB · {doc.pageCount} pages · {doc.status === 'processed' ? 'Text extracted' : doc.status.startsWith('ocr_') ? 'OCR text extracted' : doc.processingNote || 'Text unavailable'}</small></div><button className="button button-secondary" onClick={() => download(doc)}>Download</button><button className="button button-secondary" disabled={doc.status === 'text_unavailable'} onClick={() => runAi('summary', '', doc._id)}>Summarize</button><button className="button button-danger" onClick={() => removeDocument(doc)}>Delete</button></article>)}</div> : <div className="empty-inline"><h3>No documents yet</h3><p>Upload a PDF to keep it linked to this case and use it in the AI assistant.</p></div>}
      </section>}

      {tab === 'Hearings & dates' && <section className="detail-grid">
        <article className="content-card"><h2>Hearings</h2>{!caseData.hearings?.length && <p className="muted">No hearings recorded.</p>}
          <div className="timeline">
            {[...(caseData.hearings || [])].sort((a, b) => new Date(a.date) - new Date(b.date)).map(hearing => (
              <article className="timeline-item" key={hearing._id}>
                {editingHearing === hearing._id ? (
                  <form className="form-stack" onSubmit={event => {
                    event.preventDefault();
                    submit(async () => {
                      await api.updateHearing(id, hearing._id, hearingForm);
                      setEditingHearing('');
                    });
                  }}>
                    <label>Hearing details<input required maxLength="1000" value={hearingForm.description} onChange={event => setHearingForm({ ...hearingForm, description: event.target.value })} /></label>
                    <label>Date<input type="date" required value={hearingForm.date} onChange={event => setHearingForm({ ...hearingForm, date: event.target.value })} /></label>
                    <label>Outcome<input maxLength="2000" value={hearingForm.outcome} onChange={event => setHearingForm({ ...hearingForm, outcome: event.target.value })} /></label>
                    <div className="inline-actions"><button className="button button-primary" disabled={busy}>Save hearing</button><button type="button" className="button button-secondary" onClick={() => setEditingHearing('')}>Cancel</button></div>
                  </form>
                ) : (
                  <>
                    <strong>{hearing.description}</strong><span>{new Date(hearing.date).toLocaleDateString()}</span>
                    {hearing.outcome && <p>{hearing.outcome}</p>}
                    <button className="text-button" onClick={() => startHearingEdit(hearing)}>Edit hearing</button>
                  </>
                )}
              </article>
            ))}
          </div>
          <HearingForm onSubmit={data => submit(() => api.addHearing(id, data))} disabled={busy} />
        </article>
        <article className="content-card"><h2>Deadlines</h2>{caseData.deadlines?.length ? <div className="timeline">{[...caseData.deadlines].sort((a, b) => new Date(a.date) - new Date(b.date)).map(deadline => <div className="timeline-item" key={deadline._id}><strong>{deadline.description}</strong><span>{new Date(deadline.date).toLocaleDateString()} · {deadline.confidence === 'uncertain' ? 'AI suggestion — unverified' : deadline.completed ? 'Completed' : 'Verified by user'}</span>{deadline.confidence !== 'uncertain' && <button className="text-button" disabled={busy} onClick={() => submit(() => api.updateDeadline(id, deadline._id, !deadline.completed))}>{deadline.completed ? 'Reopen deadline' : 'Mark completed'}</button>}</div>)}</div> : <p className="muted">No deadlines recorded.</p>}
          <DeadlineForm onSubmit={data => submit(() => api.addDeadline(id, data))} disabled={busy} />
        </article>
      </section>}

      {tab === 'Activity' && <section className="content-card"><h2>Case activity</h2><p className="muted">Recent updates recorded for this matter.</p>
        {activity.length ? <div className="activity-list">{activity.map(item => <article className="activity-row" key={item._id}><span className="activity-dot" /><div><strong>{item.message}</strong><small>{new Date(item.createdAt).toLocaleString()}</small></div></article>)}</div> : <div className="empty-inline">No activity recorded yet.</div>}
      </section>}

      {tab === 'AI assistant' && <section className="ai-layout">
        <article className="content-card ai-prompt-card"><p className="eyebrow">CASE-GROUNDED ASSISTANCE</p><h2>Ask about this case</h2><p className="muted">Answers use the case facts and selected source document. The assistant does not verify external legal authorities.</p>
          <label>Source PDF (optional)<select value={selectedDocument} onChange={event => setSelectedDocument(event.target.value)}><option value="">Use case facts only</option>{documents.filter(doc => doc.status !== 'text_unavailable').map(doc => <option value={doc._id} key={doc._id}>{doc.originalName}</option>)}</select></label>
          <label>Question<textarea rows="4" maxLength="5000" value={question} onChange={event => setQuestion(event.target.value)} placeholder="Ask a question based on this matter…" /></label>
          <button className="button button-primary" disabled={busy || !question.trim()} onClick={() => runAi('question', question)}>Ask assistant</button>
          <div className="ai-actions"><button className="button button-secondary" disabled={busy || !documents.length} onClick={() => setTab('Documents')}>Summarize a document</button><button className="button button-secondary" disabled={busy} onClick={() => runAi('brief', 'Create a structured case brief from the case facts and available source document.')}>Generate case brief</button></div>
          {!documents.length && <p className="small-note">Upload a PDF for document-grounded analysis.</p>}
        </article>
        <section className="analysis-list"><div className="section-heading"><div><h2>Saved AI work</h2><p className="muted">All results require human review.</p></div></div>
          {analyses.length ? analyses.map(item => <article className="analysis-card" key={item._id}><div className="analysis-meta"><span className="status-pill status-pending">{item.type}</span><span>{new Date(item.createdAt).toLocaleString()}</span></div><p className="analysis-result">{item.result}</p>{item.sourceExcerpt && <details><summary>Source excerpt</summary><blockquote>{item.sourceExcerpt}</blockquote></details>}<div className="analysis-footer"><span>{item.reviewed ? 'Reviewed' : 'Not reviewed'}</span><button className="text-button" onClick={() => submit(() => api.reviewAnalysis(item._id, !item.reviewed))}>{item.reviewed ? 'Mark unreviewed' : 'Mark reviewed'}</button></div></article>) : <div className="empty-inline">No AI results saved yet.</div>}
        </section>
      </section>}
    </div>
  );
}

function DeadlineForm({ onSubmit, disabled }) {
  const [form, setForm] = useState({ description: '', date: '' });
  async function submit(event) { event.preventDefault(); if (await onSubmit(form)) setForm({ description: '', date: '' }); }
  return <form className="subform" onSubmit={submit}><h3>Add a deadline</h3><label>Description<input required maxLength="500" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></label><label>Date<input type="date" required value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} /></label><button className="button button-secondary" disabled={disabled}>Add deadline</button></form>;
}

function HearingForm({ onSubmit, disabled }) {
  const [form, setForm] = useState({ description: '', date: '', outcome: '' });
  async function submit(event) { event.preventDefault(); if (await onSubmit(form)) setForm({ description: '', date: '', outcome: '' }); }
  return <form className="subform" onSubmit={submit}><h3>Schedule a hearing</h3><label>Hearing details<input required maxLength="500" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></label><label>Date<input type="date" required value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} /></label><label>Outcome (optional)<input maxLength="1000" value={form.outcome} onChange={event => setForm({ ...form, outcome: event.target.value })} /></label><button className="button button-secondary" disabled={disabled}>Add hearing</button></form>;
}
