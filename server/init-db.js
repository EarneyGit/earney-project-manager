const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function initDb() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'init.sql')).toString();
    console.log('Running init.sql...');
    await pool.query(sql);
    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Failed to init database:', err);
  } finally {
    await pool.end();
  }
}

initDb();
