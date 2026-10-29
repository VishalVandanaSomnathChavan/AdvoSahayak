const { query, withTransaction } = require('../db/pool');
const Activity = require('./Activity');

function mapDocument(row, { includeText = true, includeStoredName = true } = {}) {
  if (!row) return null;
  const id = String(row.id);
  const document = {
    _id: id,
    id,
    owner: String(row.owner_id),
    case: String(row.case_id),
    originalName: row.original_name,
    size: Number(row.size),
    mimeType: row.mime_type,
    status: row.status,
    pageCount: row.page_count,
    processingNote: row.processing_note,
    uploadedAt: row.uploaded_at,
  };
  if (includeText) document.text = row.text;
  if (includeStoredName) document.storedName = row.stored_name;
  if (row.case_title !== undefined) {
    document.case = {
      _id: String(row.case_id),
      id: String(row.case_id),
      title: row.case_title,
      caseNumber: row.case_number,
    };
  }
  return document;
}

async function findOwnedCase(ownerId, caseId) {
  const rows = await query('SELECT id FROM cases WHERE id = ? AND owner_id = ? LIMIT 1', [caseId, ownerId]);
  return rows.length > 0;
}

async function create(data) {
  return withTransaction(async connection => {
    const [result] = await connection.execute(
      `INSERT INTO documents
       (owner_id, case_id, original_name, stored_name, size, status, text, page_count, processing_note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.ownerId, data.caseId, data.originalName, data.storedName, data.size, data.status, data.text, data.pageCount, data.processingNote],
    );
    const [rows] = await connection.execute('SELECT * FROM documents WHERE id = ?', [result.insertId]);
    await Activity.create({ ownerId: data.ownerId, caseId: data.caseId, type: 'document_uploaded', message: 'A document was uploaded' }, connection);
    return mapDocument(rows[0]);
  });
}

async function listForCase(ownerId, caseId) {
  const rows = await query(
    `SELECT id, owner_id, case_id, original_name, mime_type, size, status, page_count, processing_note, uploaded_at
     FROM documents WHERE case_id = ? AND owner_id = ? ORDER BY uploaded_at DESC`,
    [caseId, ownerId],
  );
  return rows.map(row => mapDocument(row, { includeText: false, includeStoredName: false }));
}

async function listAll(ownerId, { caseId, search }) {
  const conditions = ['d.owner_id = ?'];
  const values = [ownerId];
  if (caseId) {
    conditions.push('d.case_id = ?');
    values.push(caseId);
  }
  if (search) {
    conditions.push('d.original_name LIKE ?');
    values.push(`%${search.slice(0, 100)}%`);
  }
  values.push(200);
  const rows = await query(
    `SELECT d.id, d.owner_id, d.case_id, d.original_name, d.mime_type, d.size, d.status, d.page_count,
            d.processing_note, d.uploaded_at, c.title AS case_title, c.case_number
     FROM documents d JOIN cases c ON c.id = d.case_id AND c.owner_id = d.owner_id
     WHERE ${conditions.join(' AND ')} ORDER BY d.uploaded_at DESC LIMIT ?`,
    values,
  );
  return rows.map(row => mapDocument(row, { includeText: false, includeStoredName: false }));
}

async function findOwned(id, ownerId) {
  const rows = await query('SELECT * FROM documents WHERE id = ? AND owner_id = ? LIMIT 1', [id, ownerId]);
  return mapDocument(rows[0]);
}

async function removeOwned(id, ownerId) {
  return withTransaction(async connection => {
    const [rows] = await connection.execute(
      'SELECT id, owner_id, case_id, stored_name, original_name FROM documents WHERE id = ? AND owner_id = ? FOR UPDATE',
      [id, ownerId],
    );
    if (!rows.length) return null;
    const document = mapDocument(rows[0]);
    document.storedName = rows[0].stored_name;
    await connection.execute('DELETE FROM documents WHERE id = ? AND owner_id = ?', [id, ownerId]);
    await Activity.create({ ownerId, caseId: document.case, type: 'document_deleted', message: 'A case document was deleted' }, connection);
    return document;
  });
}

module.exports = { findOwnedCase, create, listForCase, listAll, findOwned, removeOwned };
