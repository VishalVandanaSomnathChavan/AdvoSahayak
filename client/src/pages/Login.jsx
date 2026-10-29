import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'register') await register(form.name, form.email, form.password);
      else await login(form.email, form.password);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to sign in. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand-mark">AS</div>
        <p className="eyebrow">LEGAL WORKFLOW MANAGEMENT</p>
        <h1>{mode === 'login' ? 'Welcome back' : 'Create your workspace'}</h1>
        <p className="muted">Securely manage cases, documents, and deadlines.</p>
        <form onSubmit={submit} className="form-stack">
          {mode === 'register' && (
            <label>Name<input autoComplete="name" required minLength="2" maxLength="100" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
          )}
          <label>Email<input type="email" autoComplete="email" required value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /></label>
          <label>Password<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength="10" maxLength="128" required value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} /></label>
          {error && <p className="error-message" role="alert">{error}</p>}
          <button className="button button-primary full-width" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        </form>
        <p className="auth-switch">
          {mode === 'login' ? 'New to AdvoSahayak?' : 'Already have an account?'}{' '}
          <button type="button" className="text-button" onClick={() => { setError(''); setMode(mode === 'login' ? 'register' : 'login'); }}>
            {mode === 'login' ? 'Create account' : 'Sign in'}
          </button>
        </p>
        <p className="auth-note">AI-generated content is a draft and must be reviewed by a qualified professional.</p>
      </section>
    </main>
  );
}
