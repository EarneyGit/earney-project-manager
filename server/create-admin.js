const pool = require('./db');
const bcrypt = require('bcrypt');

async function createAdmin() {
  try {
    const email = 'admin@earney.com';
    const password = 'AdminSecurePassword2026!';
    const fullName = 'Admin User';
    const role = 'admin';

    // Check if exists
    const checkRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (checkRes.rows.length > 0) {
      console.log('Admin user already exists:', email);
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await pool.query(
      'INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4)',
      [email, passwordHash, fullName, role]
    );

    console.log('Admin user created successfully.');
    console.log('Email:', email);
    console.log('Password:', password);
  } catch (err) {
    console.error('Failed to create admin user:', err);
  } finally {
    await pool.end();
  }
}

createAdmin();
