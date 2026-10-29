const { query } = require('../db/pool');
const { publicRecord } = require('./helpers');

async function create({ ownerId, caseId, type, message }, connection) {
  if (connection) {
    const [result] = await connection.execute(
      'INSERT INTO activities (owner_id, case_id, type, message) VALUES (?, ?, ?, ?)',
      [ownerId, caseId, type, message],
    );
    const [rows] = await connection.execute('SELECT * FROM activities WHERE id = ?', [result.insertId]);
    return publicRecord(rows[0]);
  }
  const result = await query(
    'INSERT INTO activities (owner_id, case_id, type, message) VALUES (?, ?, ?, ?)',
    [ownerId, caseId, type, message],
  );
  const rows = await query('SELECT * FROM activities WHERE id = ?', [result.insertId]);
  return publicRecord(rows[0]);
}

async function listForCase(ownerId, caseId) {
  const rows = await query(
    'SELECT * FROM activities WHERE owner_id = ? AND case_id = ? ORDER BY created_at DESC LIMIT 100',
    [ownerId, caseId],
  );
  return rows.map(row => {
    const activity = publicRecord(row);
    activity.owner = String(row.owner_id);
    activity.case = String(row.case_id);
    activity.createdAt = row.created_at;
    delete activity.owner_id;
    delete activity.case_id;
    delete activity.created_at;
    return activity;
  });
}

module.exports = { create, listForCase };
