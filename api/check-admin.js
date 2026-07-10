const pool = require('./db');
const bcrypt = require('bcrypt');

async function checkAdmin() {
  try {
    const r = await pool.query('SELECT password_hash FROM users WHERE email = $1', ['admin@earney.com']);
    if (r.rows.length > 0) {
      const match = await bcrypt.compare('AdminSecurePassword2026!', r.rows[0].password_hash);
      console.log('Password match:', match);
      console.log('Hash preview:', r.rows[0].password_hash.substring(0, 20));
    } else {
      console.log('User not found');
    }
  } catch (e) {
    console.error(e.message);
  } finally {
    await pool.end();
  }
}

checkAdmin();
