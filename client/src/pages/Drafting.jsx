import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const draftTypes = [
  { id: 'case-summary', label: 'Case brief', prompt: 'Prepare a structured case brief with background, parties, key facts, open questions, and issues requiring professional review.' },
  { id: 'hearing-notes', label: 'Hearing preparation notes', prompt: 'Prepare a hearing preparation checklist from the available case facts. Mark assumptions and items requiring verification.' },
  { id: 'correspondence', label: 'Correspondence draft', prompt: 'Draft a neutral correspondence outline for professional review. Do not invent dates, commitments, legal authorities, or facts.' },
  { id: 'custom', label: 'Custom draft', prompt: '' },
];

export default function Drafting() {
  const [cases, setCases] = useState([]);
  const [caseId, setCaseId] = useState('');
  const [type, setType] = useState(draftTypes[0].id);
  const [instruction, setInstruction] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getAllCases({ limit: 100 })
      .then(({ cases: items }) => { setCases(items); if (items.length) setCaseId(items[0]._id); })
      .catch(requestError => setError(requestError.response?.data?.error || 'Unable to load cases.'));
  }, []);

  async function generate(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    setResult('');
    try {
      const selected = draftTypes.find(item => item.id === type);
      const prompt = type === 'custom' ? instruction : `${selected.prompt}${instruction.trim() ? `\nAdditional instruction: ${instruction.trim()}` : ''}`;
      const response = await api.runAi(caseId, 'draft', { prompt });
      setResult(response.analysis.result);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to generate a draft.');
    } finally { setLoading(false); }
  }

  function download() {
    const blob = new Blob([result], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `advosahayak-draft-${Date.now()}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return <div className="page narrow-page">
    <header className="page-header"><div><p className="eyebrow">HUMAN-REVIEWED OUTPUT</p><h1>Drafting workspace</h1><p className="muted">Generate working drafts from a case record. Nothing is filed or sent.</p></div></header>
    {error && <div className="notice notice-error" role="alert">{error}</div>}
    <section className="content-card">
      {cases.length ? <form className="form-stack" onSubmit={generate}>
        <label>Case<select required value={caseId} onChange={event => setCaseId(event.target.value)}>{cases.map(item => <option key={item._id} value={item._id}>{item.title} — {item.clientName}</option>)}</select></label>
        <label>Draft type<select value={type} onChange={event => setType(event.target.value)}>{draftTypes.map(item => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label>
        <label>{type === 'custom' ? 'Instructions' : 'Additional instructions (optional)'}<textarea rows="4" maxLength="5000" required={type === 'custom'} value={instruction} onChange={event => setInstruction(event.target.value)} /></label>
        <button className="button button-primary" disabled={loading}>{loading ? 'Generating draft…' : 'Generate draft'}</button>
      </form> : <div className="empty-inline"><h3>No cases available</h3><p>Create a case before generating a draft.</p><Link to="/" className="button button-primary">Go to cases</Link></div>}
    </section>
    {result && <section className="content-card ai-answer"><div className="section-heading"><div><p className="eyebrow">AI-GENERATED DRAFT</p><h2>Review before use</h2></div><button className="button button-secondary" onClick={download}>Download .txt</button></div><pre className="draft-output">{result}</pre><p className="ai-disclaimer">Verify all facts and legal information with a qualified professional. This draft is not independently verified.</p></section>}
  </div>;
}
