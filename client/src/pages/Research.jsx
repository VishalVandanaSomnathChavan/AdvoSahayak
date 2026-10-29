import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function Research() {
  const [cases, setCases] = useState([]);
  const [caseId, setCaseId] = useState('');
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getAllCases({ limit: 100 })
      .then(({ cases: items }) => { setCases(items); if (items.length) setCaseId(items[0]._id); })
      .catch(requestError => setError(requestError.response?.data?.error || 'Unable to load cases.'));
  }, []);

  async function ask(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResult('');
    try {
      const response = await api.runAi(caseId, 'question', { prompt: question });
      setResult(response.analysis.result);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'The assistant could not complete this request.');
    } finally { setLoading(false); }
  }

  return <div className="page narrow-page">
    <header className="page-header"><div><p className="eyebrow">CASE-GROUNDED AI</p><h1>AI assistant</h1><p className="muted">Ask questions about a matter. Responses are AI-generated and are not legal advice.</p></div></header>
    {error && <div className="notice notice-error" role="alert">{error}</div>}
    <section className="content-card">
      {cases.length ? <form className="form-stack" onSubmit={ask}>
        <label>Case<select required value={caseId} onChange={event => setCaseId(event.target.value)}>{cases.map(item => <option key={item._id} value={item._id}>{item.title} — {item.clientName}</option>)}</select></label>
        <label>Question<textarea required maxLength="5000" rows="5" value={question} onChange={event => setQuestion(event.target.value)} placeholder="Ask for a summary of the key facts, identify issues to discuss, or ask about uploaded material." /></label>
        <p className="small-note">The assistant uses the case record. To ask about the contents of a PDF, use its case file and select the document for AI analysis.</p>
        <button className="button button-primary" disabled={!caseId || loading}>{loading ? 'Thinking…' : 'Ask about this case'}</button>
      </form> : <div className="empty-inline"><h3>Create a case to begin</h3><p>The assistant grounds its response in a selected case rather than returning fabricated legal research.</p><Link className="button button-primary" to="/">Go to cases</Link></div>}
    </section>
    {result && <section className="content-card ai-answer"><p className="eyebrow">AI-GENERATED RESPONSE</p><div className="prose">{result}</div><p className="ai-disclaimer">Review all facts and legal information. No external legal authorities are independently verified.</p></section>}
  </div>;
}
