const { query, withTransaction } = require('../db/pool');
const Activity = require('./Activity');
const { publicRecord } = require('./helpers');

function mapTask(row) {
  const task = publicRecord(row);
  if (!task) return null;
  task.owner = String(row.owner_id);
  task.case = String(row.case_id);
  task.dueDate = row.due_date;
  task.completed = Boolean(row.completed);
  task.completedAt = row.completed_at;
  task.createdAt = row.created_at;
  task.updatedAt = row.updated_at;
  delete task.owner_id;
  delete task.case_id;
  delete task.due_date;
  delete task.completed_at;
  delete task.created_at;
  delete task.updated_at;
  return task;
}

async function list(ownerId, { caseId, completed, limit = 200 } = {}) {
  const conditions = ['t.owner_id = ?'];
  const values = [ownerId];
  if (caseId) {
    conditions.push('t.case_id = ?');
    values.push(caseId);
  }
  if (completed !== undefined) {
    conditions.push('t.completed = ?');
    values.push(completed);
  }
  values.push(limit);
  const rows = await query(
    `SELECT t.*, c.title AS case_title, c.case_number AS case_number
     FROM tasks t JOIN cases c ON c.id = t.case_id AND c.owner_id = t.owner_id
     WHERE ${conditions.join(' AND ')} ORDER BY t.due_date ASC LIMIT ?`,
    values,
  );
  return rows.map(row => {
    const task = mapTask(row);
    task.case = { _id: String(row.case_id), id: String(row.case_id), title: row.case_title, caseNumber: row.case_number };
    return task;
  });
}

async function create(connection, { ownerId, caseId, title, description, dueDate }) {
  const [result] = await connection.execute(
    'INSERT INTO tasks (owner_id, case_id, title, description, due_date) VALUES (?, ?, ?, ?, ?)',
    [ownerId, caseId, title, description, dueDate],
  );
  const [rows] = await connection.execute('SELECT * FROM tasks WHERE id = ?', [result.insertId]);
  const task = mapTask(rows[0]);
  await Activity.create({ ownerId, caseId, type: 'task_created', message: 'A task was created' }, connection);
  return task;
}

async function updateCompletion(id, ownerId, completed) {
  return withTransaction(async connection => {
    const [existing] = await connection.execute('SELECT * FROM tasks WHERE id = ? AND owner_id = ? FOR UPDATE', [id, ownerId]);
    if (!existing.length) return null;
    await connection.execute(
      'UPDATE tasks SET completed = ?, completed_at = ? WHERE id = ? AND owner_id = ?',
      [completed, completed ? new Date() : null, id, ownerId],
    );
    const task = mapTask(existing[0]);
    await Activity.create({ ownerId, caseId: task.case, type: completed ? 'task_completed' : 'task_reopened', message: completed ? 'A task was completed' : 'A task was reopened' }, connection);
    const [rows] = await connection.execute('SELECT * FROM tasks WHERE id = ? AND owner_id = ?', [id, ownerId]);
    return mapTask(rows[0]);
  });
}

async function countOpen(ownerId) {
  const rows = await query('SELECT COUNT(*) AS count FROM tasks WHERE owner_id = ? AND completed = FALSE', [ownerId]);
  return Number(rows[0].count);
}

async function listOpenDue(ownerId, until) {
  const rows = await query(
    `SELECT t.*, c.title AS case_title, c.case_number AS case_number
     FROM tasks t JOIN cases c ON c.id = t.case_id AND c.owner_id = t.owner_id
     WHERE t.owner_id = ? AND t.completed = FALSE AND t.due_date <= ?
     ORDER BY t.due_date ASC LIMIT 200`,
    [ownerId, until],
  );
  return rows.map(row => {
    const task = mapTask(row);
    task.case = { _id: String(row.case_id), id: String(row.case_id), title: row.case_title, caseNumber: row.case_number };
    return task;
  });
}

module.exports = { list, create, updateCompletion, countOpen, listOpenDue };
