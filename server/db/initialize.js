const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const fs = require('fs/promises');
const { pool } = require('./pool');

async function initializeDatabase() {
  const schema = await fs.readFile(path.join(__dirname, 'schema.sql'), 'utf8');
  const statements = schema.split(/;\s*(?:\r?\n|$)/).map(statement => statement.trim()).filter(Boolean);
  const connection = await pool.getConnection();
  try {
    for (const statement of statements) await connection.query(statement);
  } finally {
    connection.release();
  }
}

if (require.main === module) {
  initializeDatabase()
    .then(() => console.log('MySQL schema is ready.'))
    .catch(error => {
      console.error(`MySQL schema initialization failed (${error.code || error.name}). Check server-side MYSQL_* settings and database availability.`);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

module.exports = { initializeDatabase };
