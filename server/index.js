const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./db');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Initialize DB schema
app.post('/api/init-db', async (req, res) => {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'init.sql')).toString();
    await pool.query(sql);
    res.json({ message: 'Database initialized successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to init db' });
  }
});

// Middleware for auth
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Admin only' });
  next();
};



// ─── AUTHENTICATION ───
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name as name, role',
      [email, hashedPassword, name, role || 'employee']
    );
    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Registration failed (email might exist)' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.full_name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.full_name, role: user.role }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, full_name as name, role FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json({ user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ─── USERS ───
// List users, optionally filtered by role — used by TaskManagement to assign tasks
app.get('/api/users', authenticate, async (req, res) => {
  try {
    const { role } = req.query;
    let query = 'SELECT id, email, full_name as name, role FROM users';
    const params = [];
    if (role) {
      query += ' WHERE role = $1';
      params.push(role);
    }
    query += ' ORDER BY full_name ASC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── COMPANIES ───
app.get('/api/companies', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM companies ORDER BY created_at ASC');
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/companies', authenticate, async (req, res) => {
  const { name, description, logoUrl } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO companies (name, description, logo_url, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description, logoUrl, req.user.id]
    );
    res.json(rows[0]);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/companies/:id', authenticate, async (req, res) => {
  const { name, description, logoUrl } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE companies SET name=$1, description=$2, logo_url=$3, updated_at=CURRENT_TIMESTAMP WHERE id=$4 RETURNING *',
      [name, description, logoUrl, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Company not found' });
    res.json(rows[0]);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/companies/:id', authenticate, async (req, res) => {
  try {
    await pool.query('DELETE FROM companies WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ─── PROJECTS ───
// Supports ?companyId=&managerId= filters
app.get('/api/projects', authenticate, async (req, res) => {
  try {
    const { companyId, managerId } = req.query;
    const conditions = [];
    const params = [];

    if (companyId) {
      params.push(companyId);
      conditions.push(`company_id = $${params.length}`);
    }
    if (managerId) {
      params.push(managerId);
      conditions.push(`manager_id = $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT * FROM projects ${where} ORDER BY created_at DESC`,
      params
    );
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/projects', authenticate, async (req, res) => {
  const p = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO projects
        (name, client_name, status, priority, start_time, deadline,
         budget, advance_payment, partial_payments, pending_payment,
         manager_id, manager_name, company_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        p.name, p.clientName, p.status, p.priority, p.startTime, p.deadline,
        p.budget || 0, p.advancePayment || 0,
        p.partialPayments || 0, p.pendingPayment || 0,
        p.managerId || req.user.id,
        p.managerName || req.user.name || null,
        p.companyId || null
      ]
    );
    res.json(rows[0]);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/projects/:id', authenticate, async (req, res) => {
  const p = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE projects SET
        name=$1, client_name=$2, status=$3, priority=$4,
        start_time=$5, deadline=$6, budget=$7, advance_payment=$8,
        partial_payments=$9, pending_payment=$10,
        manager_id=$11, manager_name=$12, company_id=$13,
        updated_at=CURRENT_TIMESTAMP
       WHERE id=$14 RETURNING *`,
      [
        p.name, p.clientName, p.status, p.priority,
        p.startTime, p.deadline, p.budget || 0, p.advancePayment || 0,
        p.partialPayments || 0, p.pendingPayment || 0,
        p.managerId || null, p.managerName || null, p.companyId || null,
        req.params.id
      ]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Project not found' });
    res.json(rows[0]);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/projects/:id', authenticate, async (req, res) => {
  try {
    await pool.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ─── TASKS ───
// Supports ?projectId=&assignedTo= filters
app.get('/api/tasks', authenticate, async (req, res) => {
  try {
    const { projectId, assignedTo } = req.query;
    const conditions = [];
    const params = [];

    if (projectId) {
      params.push(projectId);
      conditions.push(`project_id = $${params.length}`);
    }
    if (assignedTo) {
      params.push(assignedTo);
      conditions.push(`assigned_to = $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT * FROM tasks ${where} ORDER BY created_at DESC`,
      params
    );
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/tasks', authenticate, async (req, res) => {
  const { projectId, title, description, status, assignedTo, dueDate } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO tasks (project_id, title, description, status, assigned_to, due_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [projectId, title, description, status || 'todo', assignedTo || null, dueDate || null]
    );
    res.json(rows[0]);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/tasks/:id', authenticate, async (req, res) => {
  const { title, description, status, assignedTo, dueDate } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE tasks SET title=$1, description=$2, status=$3, assigned_to=$4, due_date=$5, updated_at=CURRENT_TIMESTAMP WHERE id=$6 RETURNING *',
      [title, description, status, assignedTo || null, dueDate || null, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json(rows[0]);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/tasks/:id', authenticate, async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ─── SERVICES ───
app.get('/api/services', authenticate, async (req, res) => {
  try {
    const { projectId } = req.query;
    const params = [];
    let query = 'SELECT * FROM services';
    if (projectId) {
      params.push(projectId);
      query += ' WHERE project_id = $1';
    }
    query += ' ORDER BY created_at DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/services', authenticate, async (req, res) => {
  const { projectId, name, description, clientType, frequency, customDays, deliverableCount } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO services (project_id, name, description, client_type, frequency, custom_days, deliverable_count)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [projectId, name, description, clientType || 'ongoing', frequency || 'monthly', customDays || null, deliverableCount || 1]
    );
    res.json(rows[0]);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/services/:id', authenticate, async (req, res) => {
  const { name, description, clientType, frequency, customDays, deliverableCount } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE services SET name=$1, description=$2, client_type=$3, frequency=$4, custom_days=$5, deliverable_count=$6
       WHERE id=$7 RETURNING *`,
      [name, description, clientType, frequency, customDays || null, deliverableCount, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Service not found' });
    res.json(rows[0]);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/services/:id', authenticate, async (req, res) => {
  try {
    await pool.query('DELETE FROM services WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ─── ADMIN FINANCE CONTROL ───
app.get('/api/admin/finance/overview', authenticate, adminOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.id as company_id, c.name, c.logo_url, 
             COALESCE(cf.balance, 0) as balance, 
             COALESCE(cf.total_added, 0) as total_added, 
             COALESCE(cf.total_spent, 0) as total_spent
      FROM companies c
      LEFT JOIN company_funds cf ON c.id = cf.company_id
      ORDER BY c.name ASC
    `);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/admin/finance/transfers', authenticate, adminOnly, async (req, res) => {
  try {
    const { companyId } = req.query;
    const params = [];
    let query = `
      SELECT ft.*, 
             fc.name as from_company_name, 
             tc.name as to_company_name,
             u.full_name as actioned_by_name
      FROM fund_transfers ft
      LEFT JOIN companies fc ON ft.from_company_id = fc.id
      LEFT JOIN companies tc ON ft.to_company_id = tc.id
      LEFT JOIN users u ON ft.created_by = u.id
    `;
    if (companyId) {
      params.push(companyId);
      query += ` WHERE ft.from_company_id = $1 OR ft.to_company_id = $1`;
    }
    query += ` ORDER BY ft.created_at DESC`;
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/admin/finance/deposit', authenticate, adminOnly, async (req, res) => {
  const { companyId, amount, note } = req.body;
  if (!companyId || !amount || amount <= 0) return res.status(400).json({ error: 'Invalid input' });
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Upsert funds
    await client.query(`
      INSERT INTO company_funds (company_id, balance, total_added)
      VALUES ($1, $2, $2)
      ON CONFLICT (company_id) DO UPDATE SET 
        balance = company_funds.balance + $2,
        total_added = company_funds.total_added + $2,
        updated_at = CURRENT_TIMESTAMP
    `, [companyId, amount]);
    
    // Log transfer
    await client.query(`
      INSERT INTO fund_transfers (to_company_id, amount, type, note, created_by)
      VALUES ($1, $2, 'deposit', $3, $4)
    `, [companyId, amount, note, req.user.id]);
    
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.post('/api/admin/finance/withdraw', authenticate, adminOnly, async (req, res) => {
  const { companyId, amount, note } = req.body;
  if (!companyId || !amount || amount <= 0) return res.status(400).json({ error: 'Invalid input' });
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Check balance
    const { rows } = await client.query('SELECT balance FROM company_funds WHERE company_id = $1 FOR UPDATE', [companyId]);
    if (rows.length === 0 || rows[0].balance < amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient funds' });
    }
    
    // Deduct funds
    await client.query(`
      UPDATE company_funds SET 
        balance = balance - $2,
        total_spent = total_spent + $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE company_id = $1
    `, [companyId, amount]);
    
    // Log transfer
    await client.query(`
      INSERT INTO fund_transfers (from_company_id, amount, type, note, created_by)
      VALUES ($1, $2, 'withdrawal', $3, $4)
    `, [companyId, amount, note, req.user.id]);
    
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

const handleTransferReturn = async (req, res, type) => {
  const { fromCompanyId, toCompanyId, amount, note } = req.body;
  if (!fromCompanyId || !toCompanyId || fromCompanyId === toCompanyId || !amount || amount <= 0) 
    return res.status(400).json({ error: 'Invalid input' });
    
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Check balance
    const { rows } = await client.query('SELECT balance FROM company_funds WHERE company_id = $1 FOR UPDATE', [fromCompanyId]);
    if (rows.length === 0 || rows[0].balance < amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient source funds' });
    }
    
    // Deduct from source
    await client.query(`
      UPDATE company_funds SET 
        balance = balance - $2,
        total_spent = total_spent + $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE company_id = $1
    `, [fromCompanyId, amount]);
    
    // Add to destination
    await client.query(`
      INSERT INTO company_funds (company_id, balance, total_added)
      VALUES ($1, $2, $2)
      ON CONFLICT (company_id) DO UPDATE SET 
        balance = company_funds.balance + $2,
        total_added = company_funds.total_added + $2,
        updated_at = CURRENT_TIMESTAMP
    `, [toCompanyId, amount]);
    
    // Log transfer
    await client.query(`
      INSERT INTO fund_transfers (from_company_id, to_company_id, amount, type, note, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [fromCompanyId, toCompanyId, amount, type, note, req.user.id]);
    
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

app.post('/api/admin/finance/transfer', authenticate, adminOnly, (req, res) => handleTransferReturn(req, res, 'transfer'));
app.post('/api/admin/finance/return', authenticate, adminOnly, (req, res) => handleTransferReturn(req, res, 'return'));

// ─── ADMIN INSIGHTS ───

app.get('/api/admin/insights/overview', authenticate, adminOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'Completed')::int                          AS completed_count,
        COUNT(*) FILTER (WHERE status = 'In Progress')::int                        AS in_progress_count,
        COUNT(*) FILTER (WHERE status = 'Not Started')::int                        AS not_started_count,
        COUNT(*) FILTER (WHERE deadline < NOW() AND status != 'Completed')::int    AS overdue_count,
        COUNT(*) FILTER (WHERE deadline BETWEEN NOW() AND NOW() + INTERVAL '7 days'
                               AND status != 'Completed')::int                     AS due_this_week_count,
        COUNT(*)::int                                                              AS total_projects,
        COALESCE(SUM(budget), 0)                                                   AS total_budget,
        COALESCE(SUM(advance_payment + partial_payments), 0)                       AS total_collected,
        COALESCE(SUM(pending_payment), 0)                                          AS total_pending,
        ROUND(
          CASE WHEN SUM(budget) > 0
            THEN (SUM(advance_payment + partial_payments) / SUM(budget)) * 100
            ELSE 0 END, 1
        )                                                                          AS collection_rate_pct
      FROM projects
    `);
    res.json(rows[0]);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/admin/insights/revenue-trend', authenticate, adminOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS month,
        DATE_TRUNC('month', created_at)                      AS month_date,
        COALESCE(SUM(budget), 0)                             AS budget,
        COALESCE(SUM(advance_payment + partial_payments), 0) AS collected,
        COALESCE(SUM(pending_payment), 0)                    AS pending
      FROM projects
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month_date ASC
    `);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/admin/insights/clients', authenticate, adminOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        client_name,
        COUNT(*)::int                                              AS project_count,
        COUNT(*) FILTER (WHERE status = 'Completed')::int          AS completed,
        COUNT(*) FILTER (WHERE status = 'In Progress')::int        AS in_progress,
        COUNT(*) FILTER (WHERE deadline < NOW()
                         AND status != 'Completed')::int           AS overdue,
        COALESCE(SUM(budget), 0)                                   AS total_budget,
        COALESCE(SUM(advance_payment + partial_payments), 0)       AS total_collected,
        COALESCE(SUM(pending_payment), 0)                          AS total_pending
      FROM projects
      WHERE client_name IS NOT NULL AND client_name != ''
      GROUP BY client_name
      ORDER BY total_budget DESC
      LIMIT 20
    `);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/admin/insights/projects-at-risk', authenticate, adminOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        p.id, p.name, p.client_name, p.status, p.priority,
        p.deadline, p.budget, p.pending_payment,
        p.manager_name,
        c.name AS company_name,
        CASE
          WHEN p.deadline < NOW() THEN 'overdue'
          WHEN p.deadline < NOW() + INTERVAL '7 days' THEN 'due_soon'
          ELSE 'at_risk'
        END AS risk_type,
        EXTRACT(EPOCH FROM (NOW() - p.deadline)) / 86400 AS days_overdue
      FROM projects p
      LEFT JOIN companies c ON c.id = p.company_id
      WHERE p.status != 'Completed'
        AND p.deadline IS NOT NULL
        AND p.deadline < NOW() + INTERVAL '14 days'
      ORDER BY p.deadline ASC
      LIMIT 50
    `);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/admin/insights/manager-workload', authenticate, adminOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        u.id,
        u.full_name,
        COUNT(DISTINCT p.id)::int                                          AS total_projects,
        COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'In Progress')::int AS active_projects,
        COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'Completed')::int   AS completed_projects,
        COUNT(DISTINCT p.id) FILTER (WHERE p.deadline < NOW()
                                     AND p.status != 'Completed')::int    AS overdue_projects,
        COUNT(DISTINCT t.id)::int                                          AS total_tasks,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'done')::int        AS completed_tasks,
        COALESCE(SUM(p.budget), 0)                                         AS managed_budget
      FROM users u
      LEFT JOIN projects p ON p.manager_id = u.id
      LEFT JOIN tasks t ON t.project_id = p.id
      WHERE u.role = 'manager'
      GROUP BY u.id, u.full_name
      ORDER BY total_projects DESC
    `);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/admin/insights/task-completion-rate', authenticate, adminOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)::int                                      AS total_tasks,
        COUNT(*) FILTER (WHERE status = 'done')::int       AS done,
        COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
        COUNT(*) FILTER (WHERE status = 'todo')::int       AS todo,
        COUNT(*) FILTER (WHERE due_date < NOW()
                         AND status != 'done')::int        AS overdue_tasks,
        ROUND(
          CASE WHEN COUNT(*) > 0
            THEN COUNT(*) FILTER (WHERE status = 'done')::numeric / COUNT(*) * 100
            ELSE 0 END, 1
        )                                                  AS completion_rate_pct
      FROM tasks
    `);
    res.json(rows[0] || { total_tasks: 0, done: 0, in_progress: 0, todo: 0, overdue_tasks: 0, completion_rate_pct: 0 });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/admin/insights/company-performance', authenticate, adminOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        c.id,
        c.name,
        COUNT(DISTINCT p.id)::int                                            AS project_count,
        COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'Completed')::int     AS completed,
        COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'In Progress')::int   AS in_progress,
        COALESCE(SUM(p.budget), 0)                                           AS total_budget,
        COALESCE(SUM(p.advance_payment + p.partial_payments), 0)            AS total_collected,
        COALESCE(cf.balance, 0)                                              AS wallet_balance,
        COALESCE(cf.total_added, 0)                                          AS funds_added,
        COALESCE(cf.total_spent, 0)                                          AS funds_spent
      FROM companies c
      LEFT JOIN projects p ON p.company_id = c.id
      LEFT JOIN company_funds cf ON cf.company_id = c.id
      GROUP BY c.id, c.name, cf.balance, cf.total_added, cf.total_spent
      ORDER BY total_budget DESC
    `);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/admin/insights/payment-aging', authenticate, adminOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        CASE
          WHEN deadline >= NOW() THEN 'current'
          WHEN deadline >= NOW() - INTERVAL '30 days' THEN '1-30 days'
          WHEN deadline >= NOW() - INTERVAL '60 days' THEN '31-60 days'
          WHEN deadline >= NOW() - INTERVAL '90 days' THEN '61-90 days'
          ELSE '90+ days'
        END AS aging_bucket,
        COUNT(*)::int AS project_count,
        COALESCE(SUM(pending_payment), 0) AS outstanding_amount
      FROM projects
      WHERE pending_payment > 0 AND status != 'Completed'
      GROUP BY aging_bucket
      ORDER BY MIN(deadline)
    `);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ─── ATTENDANCE ───

app.get('/api/attendance', authenticate, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const { userId, freelancerId, startDate, endDate, status, month, year, page = 1, limit = 100 } = req.query;

    const conditions = [];
    const params = [];
    let p = 1;

    if (!isAdmin) {
      conditions.push(`a.user_id = $${p++}`);
      params.push(req.user.id);
    } else {
      if (userId) { conditions.push(`a.user_id = $${p++}`); params.push(userId); }
      if (freelancerId) { conditions.push(`a.freelancer_id = $${p++}`); params.push(freelancerId); }
    }

    if (status) { conditions.push(`a.status = $${p++}`); params.push(status); }

    if (startDate && endDate) {
      conditions.push(`a.date BETWEEN $${p++} AND $${p++}`);
      params.push(startDate, endDate);
    } else if (month && year) {
      conditions.push(`EXTRACT(MONTH FROM a.date) = $${p++} AND EXTRACT(YEAR FROM a.date) = $${p++}`);
      params.push(Number(month), Number(year));
    } else if (year) {
      conditions.push(`EXTRACT(YEAR FROM a.date) = $${p++}`);
      params.push(Number(year));
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query(`
      SELECT
        a.*,
        u.full_name  AS employee_name,
        u.email      AS employee_email,
        u.role       AS employee_role,
        f.name       AS freelancer_name,
        f.rate_type  AS freelancer_rate_type,
        f.rate_amount AS freelancer_rate
      FROM attendance a
      LEFT JOIN users u ON u.id = a.user_id
      LEFT JOIN freelancers f ON f.id = a.freelancer_id
      ${where}
      ORDER BY a.date DESC
      LIMIT $${p++} OFFSET $${p++}
    `, [...params, Number(limit), (Number(page) - 1) * Number(limit)]);

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM attendance a ${where}`,
      params
    );

    res.json({ records: rows, total: countRows[0].total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

app.post('/api/admin/attendance', authenticate, adminOnly, async (req, res) => {
  try {
    const { userId, freelancerId, date, status, checkIn, checkOut, hoursWorked, dayAmount, notes } = req.body;
    if (!date || !status) return res.status(400).json({ error: 'date and status are required' });
    if (!userId && !freelancerId) return res.status(400).json({ error: 'userId or freelancerId required' });

    const { rows } = await pool.query(`
      INSERT INTO attendance (user_id, freelancer_id, date, status, check_in, check_out, hours_worked, day_amount, notes, marked_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (user_id, date) WHERE user_id IS NOT NULL
        DO UPDATE SET status = $4, check_in = $5, check_out = $6, hours_worked = $7, day_amount = $8, notes = $9, marked_by = $10, updated_at = NOW()
      RETURNING *
    `, [userId || null, freelancerId || null, date, status, checkIn || null, checkOut || null,
        hoursWorked || null, dayAmount || 0, notes || null, req.user.id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

app.put('/api/admin/attendance/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const { status, checkIn, checkOut, hoursWorked, dayAmount, notes } = req.body;
    const { rows } = await pool.query(`
      UPDATE attendance
      SET status = COALESCE($1, status),
          check_in = COALESCE($2, check_in),
          check_out = COALESCE($3, check_out),
          hours_worked = COALESCE($4, hours_worked),
          day_amount = COALESCE($5, day_amount),
          notes = COALESCE($6, notes),
          marked_by = $7,
          updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `, [status, checkIn, checkOut, hoursWorked, dayAmount, notes, req.user.id, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update attendance' });
  }
});

app.delete('/api/admin/attendance/:id', authenticate, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM attendance WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete attendance' });
  }
});

app.get('/api/admin/attendance/summary', authenticate, adminOnly, async (req, res) => {
  try {
    const { month, year, companyId } = req.query;
    const m = month || new Date().getMonth() + 1;
    const y = year || new Date().getFullYear();

    const { rows: empRows } = await pool.query(`
      SELECT
        u.id, u.full_name AS name, u.role, u.email,
        COUNT(*) FILTER (WHERE a.status = 'present')::int      AS present,
        COUNT(*) FILTER (WHERE a.status = 'absent')::int       AS absent,
        COUNT(*) FILTER (WHERE a.status = 'half-day')::int     AS half_day,
        COUNT(*) FILTER (WHERE a.status = 'late')::int         AS late,
        COUNT(*) FILTER (WHERE a.status = 'leave')::int        AS leave,
        COUNT(*) FILTER (WHERE a.status = 'work-from-home')::int AS wfh,
        COUNT(*)::int                                           AS total_marked
      FROM users u
      LEFT JOIN attendance a ON a.user_id = u.id
        AND EXTRACT(MONTH FROM a.date) = $1
        AND EXTRACT(YEAR FROM a.date) = $2
      WHERE u.role IN ('employee','manager')
      GROUP BY u.id, u.full_name, u.role, u.email
      ORDER BY u.full_name
    `, [m, y]);

    const { rows: freqRows } = await pool.query(`
      SELECT
        f.id, f.name, f.skill_set, f.rate_type, f.rate_amount,
        COUNT(*) FILTER (WHERE a.status = 'present')::int      AS present,
        COUNT(*) FILTER (WHERE a.status = 'absent')::int       AS absent,
        COUNT(*) FILTER (WHERE a.status = 'half-day')::int     AS half_day,
        COUNT(*)::int                                           AS total_days_marked,
        COALESCE(SUM(a.day_amount), 0)                         AS total_payable
      FROM freelancers f
      LEFT JOIN attendance a ON a.freelancer_id = f.id
        AND EXTRACT(MONTH FROM a.date) = $1
        AND EXTRACT(YEAR FROM a.date) = $2
      GROUP BY f.id, f.name, f.skill_set, f.rate_type, f.rate_amount
      ORDER BY f.name
    `, [m, y]);

    res.json({ employees: empRows, freelancers: freqRows, month: m, year: y });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch attendance summary' });
  }
});


// ─── FREELANCERS ───

app.get('/api/admin/freelancers', authenticate, adminOnly, async (req, res) => {
  const { companyId, status } = req.query;
  const conditions = [];
  const params = [];
  let p = 1;
  if (companyId) { conditions.push(`company_id = $${p++}`); params.push(companyId); }
  if (status)    { conditions.push(`status = $${p++}`); params.push(status); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query(`
    SELECT f.*, c.name AS company_name FROM freelancers f
    LEFT JOIN companies c ON c.id = f.company_id
    ${where} ORDER BY f.name
  `, params);
  res.json(rows);
});

app.get('/api/admin/freelancers/:id', authenticate, adminOnly, async (req, res) => {
  const { rows } = await pool.query(`SELECT f.*, c.name AS company_name FROM freelancers f LEFT JOIN companies c ON c.id = f.company_id WHERE f.id = $1`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  const { rows: assignments } = await pool.query(`SELECT fa.*, p.name AS project_name FROM freelancer_assignments fa LEFT JOIN projects p ON p.id = fa.project_id WHERE fa.freelancer_id = $1 ORDER BY fa.created_at DESC`, [req.params.id]);
  const { rows: payments } = await pool.query(`SELECT * FROM freelancer_payments WHERE freelancer_id = $1 ORDER BY payment_date DESC`, [req.params.id]);
  res.json({ ...rows[0], assignments, payments });
});

app.post('/api/admin/freelancers', authenticate, adminOnly, async (req, res) => {
  const { name, email, phone, skillSet, rateType, rateAmount, companyId, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const { rows } = await pool.query(`
    INSERT INTO freelancers (name, email, phone, skill_set, rate_type, rate_amount, company_id, notes, created_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
  `, [name, email||null, phone||null, skillSet||null, rateType||'daily', rateAmount||0, companyId||null, notes||null, req.user.id]);
  res.status(201).json(rows[0]);
});

app.put('/api/admin/freelancers/:id', authenticate, adminOnly, async (req, res) => {
  const { name, email, phone, skillSet, rateType, rateAmount, companyId, status, notes } = req.body;
  const { rows } = await pool.query(`
    UPDATE freelancers SET name=COALESCE($1,name), email=COALESCE($2,email), phone=COALESCE($3,phone),
    skill_set=COALESCE($4,skill_set), rate_type=COALESCE($5,rate_type), rate_amount=COALESCE($6,rate_amount),
    company_id=COALESCE($7,company_id), status=COALESCE($8,status), notes=COALESCE($9,notes), updated_at=NOW()
    WHERE id=$10 RETURNING *
  `, [name,email,phone,skillSet,rateType,rateAmount,companyId,status,notes, req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

app.delete('/api/admin/freelancers/:id', authenticate, adminOnly, async (req, res) => {
  await pool.query('DELETE FROM freelancers WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

app.post('/api/admin/freelancers/:id/assignments', authenticate, adminOnly, async (req, res) => {
  const { title, description, projectId, totalWorkValue, advancePaid, startDate, endDate } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  const paid = advancePaid || 0;
  const { rows } = await pool.query(`
    INSERT INTO freelancer_assignments
      (freelancer_id, project_id, title, description, total_work_value, advance_paid, amount_paid, start_date, end_date, created_by)
    VALUES ($1,$2,$3,$4,$5,$6,$6,$7,$8,$9) RETURNING *
  `, [req.params.id, projectId||null, title, description||null, totalWorkValue||0, paid, startDate||null, endDate||null, req.user.id]);
  if (paid > 0) {
    await pool.query(`
      INSERT INTO freelancer_payments (freelancer_id, assignment_id, amount, payment_type, payment_date, note, created_by)
      VALUES ($1,$2,$3,'advance',NOW(),'Advance on assignment creation',$4)
    `, [req.params.id, rows[0].id, paid, req.user.id]);
  }
  res.status(201).json(rows[0]);
});

app.put('/api/admin/freelancers/:id/assignments/:assignmentId', authenticate, adminOnly, async (req, res) => {
  const { title, description, totalWorkValue, amountPaid, status, endDate } = req.body;
  const { rows } = await pool.query(`
    UPDATE freelancer_assignments
    SET title=COALESCE($1,title), description=COALESCE($2,description),
        total_work_value=COALESCE($3,total_work_value), amount_paid=COALESCE($4,amount_paid),
        status=COALESCE($5,status), end_date=COALESCE($6,end_date), updated_at=NOW()
    WHERE id=$7 AND freelancer_id=$8 RETURNING *
  `, [title, description, totalWorkValue, amountPaid, status, endDate, req.params.assignmentId, req.params.id]);
  res.json(rows[0]);
});

app.post('/api/admin/freelancers/:id/payments', authenticate, adminOnly, async (req, res) => {
  const { assignmentId, amount, paymentType, paymentMode, paymentDate, note } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'amount must be > 0' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(`
      INSERT INTO freelancer_payments (freelancer_id, assignment_id, amount, payment_type, payment_mode, payment_date, note, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [req.params.id, assignmentId||null, amount, paymentType||'payment', paymentMode||null, paymentDate||new Date(), note||null, req.user.id]);
    if (assignmentId) {
      await client.query(`
        UPDATE freelancer_assignments SET amount_paid = amount_paid + $1, updated_at = NOW() WHERE id = $2
      `, [amount, assignmentId]);
    }
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Payment failed' });
  } finally {
    client.release();
  }
});


// ─── VENDORS ───

app.get('/api/admin/vendors', authenticate, adminOnly, async (req, res) => {
  const { companyId, status, category } = req.query;
  const conditions = [], params = []; let p = 1;
  if (companyId) { conditions.push(`v.company_id = $${p++}`); params.push(companyId); }
  if (status)    { conditions.push(`v.status = $${p++}`); params.push(status); }
  if (category)  { conditions.push(`v.category = $${p++}`); params.push(category); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query(`
    SELECT v.*, c.name AS company_name,
      COUNT(vb.id)::int AS bill_count,
      COALESCE(SUM(vb.total_amount), 0) AS total_billed,
      COALESCE(SUM(vb.amount_paid), 0)  AS total_paid,
      COALESCE(SUM(vb.pending_amount), 0) AS total_pending
    FROM vendors v
    LEFT JOIN companies c ON c.id = v.company_id
    LEFT JOIN vendor_bills vb ON vb.vendor_id = v.id AND vb.status != 'cancelled'
    ${where}
    GROUP BY v.id, c.name
    ORDER BY v.name
  `, params);
  res.json(rows);
});

app.get('/api/admin/vendors/:id', authenticate, adminOnly, async (req, res) => {
  const { rows } = await pool.query(`SELECT v.*, c.name AS company_name FROM vendors v LEFT JOIN companies c ON c.id = v.company_id WHERE v.id = $1`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  const { rows: bills } = await pool.query(`SELECT vb.*, p.name AS project_name FROM vendor_bills vb LEFT JOIN projects p ON p.id = vb.project_id WHERE vb.vendor_id = $1 ORDER BY vb.bill_date DESC`, [req.params.id]);
  const { rows: payments } = await pool.query(`SELECT * FROM vendor_payments WHERE vendor_id = $1 ORDER BY payment_date DESC`, [req.params.id]);
  res.json({ ...rows[0], bills, payments });
});

app.post('/api/admin/vendors', authenticate, adminOnly, async (req, res) => {
  const { name, email, phone, address, gstNumber, category, companyId, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const { rows } = await pool.query(`
    INSERT INTO vendors (name, email, phone, address, gst_number, category, company_id, notes, created_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
  `, [name, email||null, phone||null, address||null, gstNumber||null, category||null, companyId||null, notes||null, req.user.id]);
  res.status(201).json(rows[0]);
});

app.put('/api/admin/vendors/:id', authenticate, adminOnly, async (req, res) => {
  const { name, email, phone, address, gstNumber, category, companyId, status, notes } = req.body;
  const { rows } = await pool.query(`
    UPDATE vendors SET name=COALESCE($1,name), email=COALESCE($2,email), phone=COALESCE($3,phone),
    address=COALESCE($4,address), gst_number=COALESCE($5,gst_number), category=COALESCE($6,category),
    company_id=COALESCE($7,company_id), status=COALESCE($8,status), notes=COALESCE($9,notes), updated_at=NOW()
    WHERE id=$10 RETURNING *
  `, [name,email,phone,address,gstNumber,category,companyId,status,notes, req.params.id]);
  res.json(rows[0]);
});

app.delete('/api/admin/vendors/:id', authenticate, adminOnly, async (req, res) => {
  await pool.query('DELETE FROM vendors WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

app.post('/api/admin/vendors/:id/bills', authenticate, adminOnly, async (req, res) => {
  const { billNumber, billDate, dueDate, description, items, totalAmount, advancePaid, category, projectId, note } = req.body;
  if (!totalAmount || totalAmount <= 0) return res.status(400).json({ error: 'totalAmount required' });
  const advance = advancePaid || 0;
  const statusVal = advance >= totalAmount ? 'paid' : advance > 0 ? 'partial' : 'unpaid';
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(`
      INSERT INTO vendor_bills
        (vendor_id, bill_number, bill_date, due_date, description, items, total_amount, advance_paid, amount_paid, status, category, project_id, note, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,$9,$10,$11,$12,$13) RETURNING *
    `, [req.params.id, billNumber||null, billDate||new Date(), dueDate||null, description||null,
        JSON.stringify(items||[]), totalAmount, advance, statusVal, category||null, projectId||null, note||null, req.user.id]);
    if (advance > 0) {
      await client.query(`
        INSERT INTO vendor_payments (vendor_id, vendor_bill_id, amount, payment_type, payment_date, note, created_by)
        VALUES ($1,$2,$3,'advance',NOW(),'Advance on bill creation',$4)
      `, [req.params.id, rows[0].id, advance, req.user.id]);
    }
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to create bill' });
  } finally {
    client.release();
  }
});

app.put('/api/admin/vendors/:id/bills/:billId', authenticate, adminOnly, async (req, res) => {
  const { description, totalAmount, amountPaid, status, dueDate, note } = req.body;
  const { rows } = await pool.query(`
    UPDATE vendor_bills
    SET description=COALESCE($1,description), total_amount=COALESCE($2,total_amount),
        amount_paid=COALESCE($3,amount_paid), status=COALESCE($4,status),
        due_date=COALESCE($5,due_date), note=COALESCE($6,note), updated_at=NOW()
    WHERE id=$7 AND vendor_id=$8 RETURNING *
  `, [description, totalAmount, amountPaid, status, dueDate, note, req.params.billId, req.params.id]);
  res.json(rows[0]);
});

app.post('/api/admin/vendors/:id/payments', authenticate, adminOnly, async (req, res) => {
  const { vendorBillId, amount, paymentType, paymentMode, paymentDate, note } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'amount must be > 0' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(`
      INSERT INTO vendor_payments (vendor_id, vendor_bill_id, amount, payment_type, payment_mode, payment_date, note, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [req.params.id, vendorBillId||null, amount, paymentType||'payment', paymentMode||null, paymentDate||new Date(), note||null, req.user.id]);
    if (vendorBillId) {
      await client.query(`
        UPDATE vendor_bills
        SET amount_paid = amount_paid + $1,
            status = CASE
              WHEN amount_paid + $1 >= total_amount THEN 'paid'
              WHEN amount_paid + $1 > 0 THEN 'partial'
              ELSE 'unpaid' END,
            updated_at = NOW()
        WHERE id = $2
      `, [amount, vendorBillId]);
    }
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Payment failed' });
  } finally {
    client.release();
  }
});

// ─── INSIGHTS EXTENSIONS ───

app.get('/api/admin/insights/attendance-overview', authenticate, adminOnly, async (req, res) => {
  const { month, year } = req.query;
  const m = month || new Date().getMonth() + 1;
  const y = year || new Date().getFullYear();
  const { rows } = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE a.user_id IS NOT NULL AND a.status = 'present')::int      AS emp_present,
      COUNT(*) FILTER (WHERE a.user_id IS NOT NULL AND a.status = 'absent')::int       AS emp_absent,
      COUNT(*) FILTER (WHERE a.user_id IS NOT NULL AND a.status = 'leave')::int        AS emp_leave,
      COUNT(*) FILTER (WHERE a.freelancer_id IS NOT NULL AND a.status = 'present')::int AS fl_present,
      COALESCE(SUM(CASE WHEN a.freelancer_id IS NOT NULL THEN a.day_amount ELSE 0 END), 0) AS fl_total_payable
    FROM attendance a
    WHERE EXTRACT(MONTH FROM a.date) = $1 AND EXTRACT(YEAR FROM a.date) = $2
  `, [m, y]);
  res.json(rows[0]);
});

app.get('/api/admin/insights/freelancer-spend', authenticate, adminOnly, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT
      COUNT(DISTINCT f.id)::int AS total_freelancers,
      COUNT(DISTINCT fa.id)::int AS total_assignments,
      COALESCE(SUM(fa.total_work_value), 0) AS total_contracted,
      COALESCE(SUM(fa.amount_paid), 0)       AS total_paid,
      COALESCE(SUM(
        CASE WHEN fa.total_work_value > fa.amount_paid
          THEN fa.total_work_value - fa.amount_paid ELSE 0 END
      ), 0) AS total_pending
    FROM freelancers f
    LEFT JOIN freelancer_assignments fa ON fa.freelancer_id = f.id AND fa.status != 'cancelled'
  `);
  res.json(rows[0]);
});

app.get('/api/admin/insights/vendor-spend', authenticate, adminOnly, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT
      COUNT(DISTINCT v.id)::int AS total_vendors,
      COUNT(DISTINCT vb.id)::int AS total_bills,
      COALESCE(SUM(vb.total_amount), 0)    AS total_billed,
      COALESCE(SUM(vb.amount_paid), 0)     AS total_paid,
      COALESCE(SUM(vb.pending_amount), 0)  AS total_pending,
      COUNT(vb.id) FILTER (WHERE vb.due_date < NOW() AND vb.status != 'paid')::int AS overdue_bills
    FROM vendors v
    LEFT JOIN vendor_bills vb ON vb.vendor_id = v.id AND vb.status != 'cancelled'
  `);
  res.json(rows[0]);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
