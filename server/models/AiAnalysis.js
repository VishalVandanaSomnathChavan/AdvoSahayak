const { pool, query, withTransaction } = require('../db/pool');
const { publicRecord } = require('./helpers');
const Activity = require('./Activity');

function mapAnalysis(row) {
  const analysis = publicRecord(row);
  if (!analysis) return null;
  analysis.owner = String(row.owner_id);
  analysis.case = String(row.case_id);
  analysis.document = row.document_id == null ? undefined : String(row.document_id);
  analysis.reviewed = Boolean(row.reviewed);
  analysis.createdAt = row.created_at;
  analysis.updatedAt = row.updated_at;
  delete analysis.owner_id;
  delete analysis.case_id;
  delete analysis.document_id;
  delete analysis.created_at;
  delete analysis.updated_at;
  return analysis;
}

async function create(data) {
  return withTransaction(async connection => {
    const [result] = await connection.execute(
      `INSERT INTO ai_analyses
       (owner_id, case_id, document_id, type, prompt, result, source_excerpt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.ownerId, data.caseId, data.documentId || null, data.type, data.prompt, data.result, data.sourceExcerpt],
    );
    const [rows] = await connection.execute('SELECT * FROM ai_analyses WHERE id = ?', [result.insertId]);
    await Activity.create({ ownerId: data.ownerId, caseId: data.caseId, type: 'ai_generated', message: 'AI-generated content was saved for human review' }, connection);
    return mapAnalysis(rows[0]);
  });
}

async function listForCase(ownerId, caseId) {
  const rows = await query(
    'SELECT * FROM ai_analyses WHERE case_id = ? AND owner_id = ? ORDER BY created_at DESC LIMIT 100',
    [caseId, ownerId],
  );
  return rows.map(mapAnalysis);
}

async function updateReviewed(ownerId, id, reviewed) {
  const [result] = await pool.execute(
    'UPDATE ai_analyses SET reviewed = ? WHERE id = ? AND owner_id = ?',
    [reviewed, id, ownerId],
  );
  if (!result.affectedRows) {
    const existing = await query('SELECT * FROM ai_analyses WHERE id = ? AND owner_id = ?', [id, ownerId]);
    return mapAnalysis(existing[0]);
  }
  const rows = await query('SELECT * FROM ai_analyses WHERE id = ? AND owner_id = ?', [id, ownerId]);
  return mapAnalysis(rows[0]);
}

module.exports = { create, listForCase, updateReviewed };
