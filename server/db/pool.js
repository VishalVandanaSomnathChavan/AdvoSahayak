const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'advo_sahayak',
  ssl: process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
  waitForConnections: true,
  connectionLimit: Math.min(20, Math.max(2, Number(process.env.MYSQL_POOL_SIZE) || 10)),
  queueLimit: 0,
  connectTimeout: 5000,
  supportBigNumbers: true,
  bigNumberStrings: true,
  dateStrings: false,
  timezone: 'Z',
  charset: 'utf8mb4',
});

async function query(sql, values = []) {
  const [rows] = await pool.execute(sql, values);
  return rows;
}

async function withTransaction(operation) {
  const connection = await pool.getConnection();
  let started = false;
  try {
    await connection.beginTransaction();
    started = true;
    const result = await operation(connection);
    await connection.commit();
    started = false;
    return result;
  } catch (error) {
    if (started) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('MySQL transaction rollback failed:', rollbackError.code || rollbackError.name);
      }
    }
    throw error;
  } finally {
    connection.release();
  }
}

async function isDatabaseReady() {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

module.exports = { pool, query, withTransaction, isDatabaseReady };
