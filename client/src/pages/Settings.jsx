import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function saveName(event) {
    event.preventDefault();
    setSaving(true); setError(''); setMessage('');
    try { await updateProfile({ name }); setMessage('Profile updated.'); }
    catch (requestError) { setError(requestError.response?.data?.error || 'Unable to update your profile.'); }
    finally { setSaving(false); }
  }

  async function changePassword(event) {
    event.preventDefault();
    setSaving(true); setError(''); setMessage('');
    try {
      await updateProfile({ name, currentPassword, password });
      setCurrentPassword(''); setPassword('');
      setMessage('Password updated.');
    } catch (requestError) { setError(requestError.response?.data?.error || 'Unable to update your password.'); }
    finally { setSaving(false); }
  }

  return <div className="page narrow-page">
    <header className="page-header"><div><p className="eyebrow">YOUR ACCOUNT</p><h1>Profile & settings</h1><p className="muted">Manage your profile and account credentials.</p></div></header>
    {error && <div className="notice notice-error" role="alert">{error}</div>}
    {message && <div className="notice notice-success" role="status">{message}</div>}
    <div className="settings-grid">
      <section className="content-card"><h2>Profile</h2><p className="muted">Your account identity and workspace profile.</p><form className="form-stack" onSubmit={saveName}><label>Email<input value={user?.email || ''} readOnly /></label><label>Display name<input required minLength="2" maxLength="100" value={name} onChange={event => setName(event.target.value)} /></label><button className="button button-primary" disabled={saving}>Save profile</button></form></section>
      <section className="content-card"><h2>Change password</h2><p className="muted">Use at least 10 characters for your new password.</p><form className="form-stack" onSubmit={changePassword}><label>Current password<input type="password" autoComplete="current-password" required value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} /></label><label>New password<input type="password" autoComplete="new-password" minLength="10" maxLength="128" required value={password} onChange={event => setPassword(event.target.value)} /></label><button className="button button-primary" disabled={saving}>Update password</button></form></section>
    </div>
    <p className="settings-disclaimer">AI-generated summaries, suggestions, and drafts are not legal advice or externally verified. Confirm critical information and deadlines with a qualified professional.</p>
  </div>;
}
