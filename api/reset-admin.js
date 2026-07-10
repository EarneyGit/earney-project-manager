const pool = require('./db');
const bcrypt = require('bcrypt');

async function resetAdmin() {
  try {
    const email = 'admin@earney.com';
    const newPassword = 'Admin@2026!';
    
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);
    
    const res = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email, role',
      [hash, email]
    );
    
    if (res.rows.length > 0) {
      console.log('✅ Admin password reset successfully!');
      console.log('Email:', email);
      console.log('New Password:', newPassword);
    } else {
      console.log('❌ User not found');
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}

resetAdmin();
