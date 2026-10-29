const bcrypt = require('bcryptjs');
const { query } = require('../db/pool');

function mapUser(row) {
  if (!row) return null;
  const id = String(row.id);
  return { _id: id, id, name: row.name, email: row.email, role: row.role, createdAt: row.created_at };
}

async function findByEmail(email) {
  const rows = await query('SELECT id, name, email, password, role, created_at FROM users WHERE email = ? LIMIT 1', [email]);
  return rows[0] || null;
}

async function findPublicById(id) {
  const rows = await query('SELECT id, name, email, role, created_at FROM users WHERE id = ? LIMIT 1', [id]);
  return mapUser(rows[0]);
}

async function findWithPassword(id) {
  const rows = await query('SELECT id, name, email, password, role FROM users WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function create({ name, email, password }) {
  const hashedPassword = await bcrypt.hash(password, 12);
  const result = await query(
    'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
    [name, email, hashedPassword],
  );
  return { _id: String(result.insertId), id: String(result.insertId), name, email, role: 'lawyer' };
}

async function updateProfile(id, updates) {
  const assignments = [];
  const values = [];
  if (updates.name !== undefined) {
    assignments.push('name = ?');
    values.push(updates.name);
  }
  if (updates.password !== undefined) {
    assignments.push('password = ?');
    values.push(await bcrypt.hash(updates.password, 12));
  }
  if (!assignments.length) return findPublicById(id);
  values.push(id);
  await query(`UPDATE users SET ${assignments.join(', ')} WHERE id = ?`, values);
  return findPublicById(id);
}

async function verifyPassword(user, password) {
  return Boolean(user && await bcrypt.compare(password, user.password));
}

module.exports = { findByEmail, findPublicById, findWithPassword, create, updateProfile, verifyPassword };
