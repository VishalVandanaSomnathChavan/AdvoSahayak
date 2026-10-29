const { query, withTransaction } = require('../db/pool');
const Activity = require('./Activity');

const CASE_FIELDS = {
  caseNumber: 'case_number',
  title: 'title',
  clientName: 'client_name',
  description: 'description',
  court: 'court',
  caseType: 'case_type',
  status: 'status',
  archived: 'archived',
};

function mapChild(row, type) {
  const record = { _id: String(row.id), id: String(row.id) };
  if (type === 'hearing') {
    record.date = row.date;
    record.description = row.description;
    record.outcome = row.outcome;
  } else if (type === 'deadline') {
    record.date = row.date;
    record.description = row.description;
    record.completed = Boolean(row.completed);
    record.confidence = row.confidence;
  } else if (type === 'importantDate') {
    record.label = row.label;
    record.date = row.date;
  } else if (type === 'note') {
    record.content = row.content;
    record.createdAt = row.created_at;
  }
  return record;
}

function mapBase(row) {
  const id = String(row.id);
  return {
    _id: id,
    id,
    owner: String(row.owner_id),
    caseNumber: row.case_number,
    title: row.title,
    clientName: row.client_name,
    description: row.description,
    court: row.court,
    caseType: row.case_type,
    status: row.status,
    archived: Boolean(row.archived),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function hydrate(rows, connection) {
  if (!rows.length) return [];
  const ids = rows.map(row => row.id);
  const placeholders = ids.map(() => '?').join(', ');
  const ownerId = rows[0].owner_id;
  const select = connection
    ? async (sql, values) => {
      const [resultRows] = await connection.execute(sql, values);
      return resultRows;
    }
    : query;
  const [parties, dates, notes, hearings, deadlines, documents] = await Promise.all([
    select(`SELECT id, case_id, name FROM case_parties WHERE owner_id = ? AND case_id IN (${placeholders}) ORDER BY id`, [ownerId, ...ids]),
    select(`SELECT id, case_id, label, date FROM important_dates WHERE owner_id = ? AND case_id IN (${placeholders}) ORDER BY id`, [ownerId, ...ids]),
    select(`SELECT id, case_id, content, created_at FROM case_notes WHERE owner_id = ? AND case_id IN (${placeholders}) ORDER BY created_at`, [ownerId, ...ids]),
    select(`SELECT id, case_id, date, description, outcome FROM hearings WHERE owner_id = ? AND case_id IN (${placeholders}) ORDER BY date`, [ownerId, ...ids]),
    select(`SELECT id, case_id, date, description, completed, confidence FROM deadlines WHERE owner_id = ? AND case_id IN (${placeholders}) ORDER BY date`, [ownerId, ...ids]),
    select(`SELECT id, case_id, original_name, uploaded_at FROM documents WHERE owner_id = ? AND case_id IN (${placeholders}) ORDER BY uploaded_at DESC`, [ownerId, ...ids]),
  ]);
  const byId = new Map(rows.map(row => [String(row.id), mapBase(row)]));
  for (const list of [parties, dates, notes, hearings, deadlines, documents]) {
    for (const row of list) {
      const matter = byId.get(String(row.case_id));
      if (!matter) continue;
      if (list === parties) matter.parties = [...(matter.parties || []), row.name];
      if (list === dates) matter.importantDates = [...(matter.importantDates || []), mapChild(row, 'importantDate')];
      if (list === notes) matter.notes = [...(matter.notes || []), mapChild(row, 'note')];
      if (list === hearings) matter.hearings = [...(matter.hearings || []), mapChild(row, 'hearing')];
      if (list === deadlines) matter.deadlines = [...(matter.deadlines || []), mapChild(row, 'deadline')];
      if (list === documents) matter.documents = [...(matter.documents || []), {
        name: row.original_name,
        documentId: String(row.id),
        uploadedAt: row.uploaded_at,
      }];
    }
  }
  for (const matter of byId.values()) {
    matter.parties ||= [];
    matter.importantDates ||= [];
    matter.notes ||= [];
    matter.hearings ||= [];
    matter.deadlines ||= [];
    matter.documents ||= [];
  }
  return rows.map(row => byId.get(String(row.id)));
}

async function findOwnedCase(id, ownerId, { full = true } = {}) {
  const rows = await query('SELECT * FROM cases WHERE id = ? AND owner_id = ? LIMIT 1', [id, ownerId]);
  if (!rows.length) return null;
  return full ? (await hydrate(rows))[0] : mapBase(rows[0]);
}

async function existsOwned(id, ownerId) {
  const rows = await query('SELECT 1 FROM cases WHERE id = ? AND owner_id = ? LIMIT 1', [id, ownerId]);
  return rows.length > 0;
}

async function insertChildren(connection, table, values, ownerId, caseId) {
  if (!Array.isArray(values)) return;
  for (const value of values) {
    if (table === 'case_parties') {
      if (typeof value === 'string' && value.trim()) {
        await connection.execute('INSERT INTO case_parties (case_id, owner_id, name) VALUES (?, ?, ?)', [caseId, ownerId, value.trim().slice(0, 200)]);
      }
    } else if (table === 'important_dates') {
      if (value && typeof value === 'object') {
        await connection.execute('INSERT INTO important_dates (case_id, owner_id, label, date) VALUES (?, ?, ?, ?)', [caseId, ownerId, String(value.label || '').trim().slice(0, 200), value.date ? new Date(value.date) : null]);
      }
    } else if (table === 'case_notes') {
      if (value && typeof value.content === 'string') {
        await connection.execute('INSERT INTO case_notes (case_id, owner_id, content, created_at) VALUES (?, ?, ?, ?)', [caseId, ownerId, value.content, value.createdAt ? new Date(value.createdAt) : new Date()]);
      }
    }
  }
}

async function createCase(ownerId, data) {
  return withTransaction(async connection => {
    const [result] = await connection.execute(
      `INSERT INTO cases (owner_id, case_number, title, client_name, description, court, case_type, status, archived)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ownerId, (data.caseNumber || '').trim(), data.title.trim(), data.clientName.trim(), data.description.trim(), (data.court || '').trim(), (data.caseType || '').trim(), data.status || 'active', Boolean(data.archived)],
    );
    const id = result.insertId;
    await insertChildren(connection, 'case_parties', data.parties, ownerId, id);
    await insertChildren(connection, 'important_dates', data.importantDates, ownerId, id);
    await insertChildren(connection, 'case_notes', data.notes, ownerId, id);
    await Activity.create({ ownerId, caseId: id, type: 'case_created', message: 'Case created' }, connection);
    const [rows] = await connection.execute('SELECT * FROM cases WHERE id = ? AND owner_id = ?', [id, ownerId]);
    return (await hydrate(rows, connection))[0];
  });
}

async function listCases(ownerId, { archived, status, search, page, limit }) {
  const where = ['owner_id = ?', 'archived = ?'];
  const values = [ownerId, archived];
  if (status) {
    where.push('status = ?');
    values.push(status);
  }
  if (search) {
    const pattern = `%${search.slice(0, 100)}%`;
    where.push('(title LIKE ? OR client_name LIKE ? OR case_number LIKE ? OR court LIKE ?)');
    values.push(pattern, pattern, pattern, pattern);
  }
  const [countRows, rows] = await Promise.all([
    query(`SELECT COUNT(*) AS count FROM cases WHERE ${where.join(' AND ')}`, values),
    query(`SELECT * FROM cases WHERE ${where.join(' AND ')} ORDER BY updated_at DESC LIMIT ? OFFSET ?`, [...values, limit, (page - 1) * limit]),
  ]);
  return { cases: await hydrate(rows), total: Number(countRows[0].count) };
}

async function updateCase(id, ownerId, data) {
  const fields = Object.keys(data).filter(field => Object.hasOwn(CASE_FIELDS, field));
  if (!fields.length && !['parties', 'importantDates'].some(field => data[field] !== undefined)) return null;
  return withTransaction(async connection => {
    if (fields.length) {
      const assignments = fields.map(field => `${CASE_FIELDS[field]} = ?`);
      const values = fields.map(field => {
        if (field === 'archived') return Boolean(data[field]);
        return typeof data[field] === 'string' ? data[field].trim() : data[field];
      });
      await connection.execute(`UPDATE cases SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND owner_id = ?`, [...values, id, ownerId]);
    } else {
      const [rows] = await connection.execute('SELECT id FROM cases WHERE id = ? AND owner_id = ?', [id, ownerId]);
      if (!rows.length) return null;
    }
    for (const [field, table] of [['parties', 'case_parties'], ['importantDates', 'important_dates']]) {
      if (data[field] === undefined) continue;
      await connection.execute(`DELETE FROM ${table} WHERE case_id = ? AND owner_id = ?`, [id, ownerId]);
      await insertChildren(connection, table, data[field], ownerId, id);
    }
    const [rows] = await connection.execute('SELECT * FROM cases WHERE id = ? AND owner_id = ?', [id, ownerId]);
    if (!rows.length) return null;
    await Activity.create({ ownerId, caseId: id, type: 'case_updated', message: 'Case details updated' }, connection);
    return (await hydrate(rows, connection))[0];
  });
}

async function addNote(ownerId, caseId, content) {
  return withTransaction(async connection => {
    const [caseRows] = await connection.execute(
      'SELECT id FROM cases WHERE id = ? AND owner_id = ?',
      [caseId, ownerId],
    );
    if (!caseRows.length) return null;

    const [result] = await connection.execute(
      'INSERT INTO case_notes (case_id, owner_id, content) VALUES (?, ?, ?)',
      [caseId, ownerId, content],
    );
    await connection.execute(
      'UPDATE cases SET updated_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND owner_id = ?',
      [caseId, ownerId],
    );
    await Activity.create({ ownerId, caseId, type: 'note_added', message: 'A case note was added' }, connection);
    const [rows] = await connection.execute(
      'SELECT id, case_id, content, created_at FROM case_notes WHERE id = ? AND owner_id = ?',
      [result.insertId, ownerId],
    );
    return mapChild(rows[0], 'note');
  });
}

async function addItem(ownerId, caseId, type, data) {
  const table = type === 'hearing' ? 'hearings' : 'deadlines';
  return withTransaction(async connection => {
    const [caseRows] = await connection.execute('SELECT id FROM cases WHERE id = ? AND owner_id = ?', [caseId, ownerId]);
    if (!caseRows.length) return null;
    const [result] = await connection.execute(
      `INSERT INTO ${table} (case_id, owner_id, date, description${type === 'hearing' ? ', outcome' : ''})
       VALUES (?, ?, ?, ?${type === 'hearing' ? ', ?' : ''})`,
      [caseId, ownerId, data.date, data.description, ...(type === 'hearing' ? [data.outcome || ''] : [])],
    );
    const activityType = type === 'hearing' ? 'hearing_added' : 'deadline_added';
    await Activity.create({ ownerId, caseId, type: activityType, message: type === 'hearing' ? 'A hearing was added' : 'A case deadline was added' }, connection);
    const [rows] = await connection.execute(`SELECT * FROM ${table} WHERE id = ? AND owner_id = ?`, [result.insertId, ownerId]);
    return mapChild(rows[0], type);
  });
}

async function updateHearing(ownerId, caseId, hearingId, updates) {
  const allowed = { date: 'date', description: 'description', outcome: 'outcome' };
  const fields = Object.keys(updates).filter(field => Object.hasOwn(allowed, field));
  if (!fields.length) return null;
  return withTransaction(async connection => {
    const assignments = fields.map(field => `${allowed[field]} = ?`);
    const result = await connection.execute(
      `UPDATE hearings SET ${assignments.join(', ')} WHERE id = ? AND case_id = ? AND owner_id = ?`,
      [...fields.map(field => updates[field]), hearingId, caseId, ownerId],
    );
    if (!result[0].affectedRows) {
      const [existing] = await connection.execute('SELECT * FROM hearings WHERE id = ? AND case_id = ? AND owner_id = ?', [hearingId, caseId, ownerId]);
      if (!existing.length) return null;
    }
    await connection.execute('UPDATE cases SET updated_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND owner_id = ?', [caseId, ownerId]);
    await Activity.create({ ownerId, caseId, type: 'hearing_updated', message: 'A hearing was updated' }, connection);
    const [rows] = await connection.execute('SELECT * FROM hearings WHERE id = ? AND case_id = ? AND owner_id = ?', [hearingId, caseId, ownerId]);
    return mapChild(rows[0], 'hearing');
  });
}

async function updateDeadline(ownerId, caseId, deadlineId, completed) {
  return withTransaction(async connection => {
    const [rows] = await connection.execute(
      'SELECT * FROM deadlines WHERE id = ? AND case_id = ? AND owner_id = ?',
      [deadlineId, caseId, ownerId],
    );
    if (!rows.length) return null;
    await connection.execute('UPDATE deadlines SET completed = ? WHERE id = ? AND case_id = ? AND owner_id = ?', [completed, deadlineId, caseId, ownerId]);
    await connection.execute('UPDATE cases SET updated_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND owner_id = ?', [caseId, ownerId]);
    await Activity.create({ ownerId, caseId, type: completed ? 'deadline_completed' : 'deadline_reopened', message: completed ? 'A case deadline was completed' : 'A case deadline was reopened' }, connection);
    const [updated] = await connection.execute('SELECT * FROM deadlines WHERE id = ? AND case_id = ? AND owner_id = ?', [deadlineId, caseId, ownerId]);
    return mapChild(updated[0], 'deadline');
  });
}

async function dashboard(ownerId) {
  const [caseCounts, taskRows, hearingRows, deadlineRows] = await Promise.all([
    query(`SELECT COUNT(*) AS total,
                  SUM(CASE WHEN status <> 'closed' THEN 1 ELSE 0 END) AS open_count
           FROM cases WHERE owner_id = ? AND archived = FALSE`, [ownerId]),
    query('SELECT COUNT(*) AS count FROM tasks WHERE owner_id = ? AND completed = FALSE', [ownerId]),
    query(`SELECT COUNT(*) AS count FROM hearings h JOIN cases c ON c.id = h.case_id AND c.owner_id = h.owner_id
           WHERE h.owner_id = ? AND c.archived = FALSE AND h.date >= UTC_TIMESTAMP(3)`, [ownerId]),
    query(`SELECT COUNT(*) AS count FROM deadlines d JOIN cases c ON c.id = d.case_id AND c.owner_id = d.owner_id
           WHERE d.owner_id = ? AND c.archived = FALSE AND d.completed = FALSE AND d.date >= UTC_TIMESTAMP(3)`, [ownerId]),
  ]);
  return {
    totalCases: Number(caseCounts[0].total),
    openCases: Number(caseCounts[0].open_count || 0),
    pendingTasks: Number(taskRows[0].count),
    upcomingHearings: Number(hearingRows[0].count),
    upcomingDeadlines: Number(deadlineRows[0].count),
  };
}

async function listReminderCases(ownerId) {
  const rows = await query('SELECT * FROM cases WHERE owner_id = ? AND archived = FALSE', [ownerId]);
  const hydrated = await hydrate(rows);
  return hydrated.map(matter => ({
    _id: matter._id,
    title: matter.title,
    deadlines: matter.deadlines,
    hearings: matter.hearings,
  }));
}

module.exports = {
  createCase,
  findOwnedCase,
  existsOwned,
  listCases,
  updateCase,
  addNote,
  addItem,
  updateHearing,
  updateDeadline,
  dashboard,
  listReminderCases,
};
