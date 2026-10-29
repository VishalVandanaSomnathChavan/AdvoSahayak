import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [cases, setCases] = useState([]);
  const [search, setSearch] = useState('');
  const [caseId, setCaseId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const results = await api.searchDocuments({ search, caseId: caseId || undefined });
      setDocuments(results);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to load documents.');
    } finally { setLoading(false); }
  }, [search, caseId]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    api.getAllCases({ limit: 100 })
      .then(({ cases: items }) => setCases(items))
      .catch(requestError => setError(requestError.response?.data?.error || 'Unable to load cases.'));
  }, []);

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
      setError(requestError.response?.data?.error || 'Document download failed.');
    }
  }

  async function remove(document) {
    if (!window.confirm(`Permanently delete "${document.originalName}"?`)) return;
    try {
      await api.deleteDocument(document._id);
      await refresh();
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Document deletion failed.');
    }
  }

  return <div className="page">
    <header className="page-header"><div><p className="eyebrow">PRIVATE CASE FILES</p><h1>Documents</h1><p className="muted">PDFs and extracted text linked to your cases.</p></div></header>
    {error && <div className="notice notice-error" role="alert">{error}</div>}
    <section className="content-card">
      <div className="document-filters">
        <label className="search-field"><span aria-hidden="true">⌕</span><input aria-label="Search documents" placeholder="Search document name" value={search} onChange={event => setSearch(event.target.value)} /></label>
        <label className="document-case-filter"><span className="sr-only">Filter by case</span><select aria-label="Filter by case" value={caseId} onChange={event => setCaseId(event.target.value)}><option value="">All cases</option>{cases.map(item => <option value={item._id} key={item._id}>{item.title}</option>)}</select></label>
      </div>
      {loading ? <div className="loading-panel">Loading documents…</div> : documents.length ? <div className="document-list global-document-list">
        {documents.map(doc => <article className="document-row" key={doc._id}>
          <span className="document-icon">PDF</span>
          <div className="document-info"><strong>{doc.originalName}</strong><small>{(doc.size / 1024 / 1024).toFixed(2)} MB · {doc.pageCount} pages · {doc.status === 'processed' ? 'Text extracted' : 'No selectable text'}</small></div>
          <Link className="document-case-link" to={`/case/${doc.case?._id}`}>{doc.case?.caseNumber ? `${doc.case.caseNumber} · ` : ''}{doc.case?.title || 'Open case'}</Link>
          <button className="button button-secondary" onClick={() => download(doc)}>Download</button>
          <button className="button button-danger" onClick={() => remove(doc)}>Delete</button>
        </article>)}
      </div> : <div className="empty-inline"><h3>{search || caseId ? 'No matching documents' : 'No documents uploaded'}</h3><p>Upload a PDF from the Documents section of a case file.</p>{caseId && <Link className="button button-primary" to={`/case/${caseId}`}>Open case</Link>}</div>}
    </section>
  </div>;
}
