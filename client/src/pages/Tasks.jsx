import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [cases, setCases] = useState([]);
  const [form, setForm] = useState({ caseId: '', title: '', description: '', dueDate: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [taskData, caseData] = await Promise.all([api.getTasks(), api.getAllCases({ limit: 100 })]);
      setTasks(taskData);
      setCases(caseData.cases);
      if (!form.caseId && caseData.cases.length) setForm(value => ({ ...value, caseId: caseData.cases[0]._id }));
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to load tasks.');
    } finally { setLoading(false); }
  }, [form.caseId]);

  useEffect(() => { refresh(); }, [refresh]);

  async function create(event) {
    event.preventDefault();
    try {
      await api.createTask(form);
      setForm(value => ({ ...value, title: '', description: '', dueDate: '' }));
      await refresh();
    } catch (requestError) { setError(requestError.response?.data?.error || 'Unable to create task.'); }
  }

  async function toggle(task) {
    try { await api.updateTask(task._id, !task.completed); await refresh(); }
    catch (requestError) { setError(requestError.response?.data?.error || 'Unable to update task.'); }
  }

  const today = new Date();
  return <div className="page">
    <header className="page-header"><div><p className="eyebrow">KEEP WORK MOVING</p><h1>Tasks & deadlines</h1><p className="muted">Track case-specific follow-ups. Confirm all legal deadlines independently.</p></div></header>
    {error && <div className="notice notice-error" role="alert">{error}</div>}
    <div className="detail-grid tasks-layout">
      <section className="content-card"><h2>Add a task</h2><form className="form-stack" onSubmit={create}>
        <label>Case<select required value={form.caseId} onChange={event => setForm({ ...form, caseId: event.target.value })}><option value="">Select a case</option>{cases.map(item => <option value={item._id} key={item._id}>{item.title}</option>)}</select></label>
        <label>Task<input required maxLength="200" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} /></label>
        <label>Details<textarea maxLength="2000" rows="3" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></label>
        <label>Due date<input required type="date" value={form.dueDate} onChange={event => setForm({ ...form, dueDate: event.target.value })} /></label>
        <button className="button button-primary" disabled={!cases.length}>Create task</button>
      </form></section>
      <section className="content-card"><div className="section-heading"><div><h2>Your tasks</h2><p className="muted">{tasks.filter(item => !item.completed).length} pending</p></div></div>
        {loading ? <p className="muted">Loading tasks…</p> : tasks.length ? <div className="task-list">{tasks.map(task => {
          const overdue = !task.completed && new Date(task.dueDate) < new Date(today.toDateString());
          return <article className={`task-row${task.completed ? ' task-complete' : ''}`} key={task._id}>
            <input type="checkbox" checked={task.completed} onChange={() => toggle(task)} aria-label={`${task.completed ? 'Reopen' : 'Complete'} ${task.title}`} />
            <div className="task-content"><strong>{task.title}</strong><p>{task.description}</p><small><Link to={`/case/${task.case?._id}`}>{task.case?.title || 'Case'}</Link> · <span className={overdue ? 'overdue' : ''}>{overdue ? 'Overdue · ' : 'Due '}{new Date(task.dueDate).toLocaleDateString()}</span></small></div>
            <span className={task.completed ? 'status-pill status-active' : overdue ? 'status-pill status-closed' : 'status-pill status-pending'}>{task.completed ? 'Done' : overdue ? 'Overdue' : 'Open'}</span>
          </article>;
        })}</div> : <div className="empty-inline"><h3>No tasks yet</h3><p>Create a task and link it to a case.</p></div>}
      </section>
    </div>
  </div>;
}
