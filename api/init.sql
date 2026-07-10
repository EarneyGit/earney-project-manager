-- Initialize Schema for Earney Projects Manager on Neon DB

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'employee',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  logo_url TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  client_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'Not Started',
  priority VARCHAR(50) DEFAULT 'Medium',
  start_time TIMESTAMP WITH TIME ZONE,
  deadline TIMESTAMP WITH TIME ZONE,
  budget NUMERIC DEFAULT 0,
  advance_payment NUMERIC DEFAULT 0,
  partial_payments NUMERIC DEFAULT 0,
  pending_payment NUMERIC DEFAULT 0,
  manager_id UUID REFERENCES users(id),
  manager_name VARCHAR(255),
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'todo',
  assigned_to UUID REFERENCES users(id),
  due_date TIMESTAMP WITH TIME ZONE,
  service_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  client_type VARCHAR(50) DEFAULT 'ongoing',
  frequency VARCHAR(50) DEFAULT 'monthly',
  custom_days TEXT,
  deliverable_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS company_funds (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  balance      NUMERIC DEFAULT 0,
  total_added  NUMERIC DEFAULT 0,
  total_spent  NUMERIC DEFAULT 0,
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fund_transfers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_company_id UUID REFERENCES companies(id),
  to_company_id   UUID REFERENCES companies(id),
  amount          NUMERIC NOT NULL CHECK (amount > 0),
  type            VARCHAR(20) NOT NULL CHECK (type IN ('transfer','return','deposit','withdrawal')),
  note            TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── FREELANCERS MODULE ───

CREATE TABLE IF NOT EXISTS freelancers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(255),
  phone           VARCHAR(50),
  skill_set       TEXT,
  rate_type       VARCHAR(20) DEFAULT 'daily'
                  CHECK (rate_type IN ('daily','hourly','project')),
  rate_amount     NUMERIC DEFAULT 0,
  company_id      UUID REFERENCES companies(id) ON DELETE SET NULL,
  status          VARCHAR(20) DEFAULT 'active'
                  CHECK (status IN ('active','inactive')),
  notes           TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS freelancer_assignments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id       UUID NOT NULL REFERENCES freelancers(id) ON DELETE CASCADE,
  project_id          UUID REFERENCES projects(id) ON DELETE SET NULL,
  title               VARCHAR(255) NOT NULL,
  description         TEXT,
  total_work_value    NUMERIC DEFAULT 0,
  advance_paid        NUMERIC DEFAULT 0,
  amount_paid         NUMERIC DEFAULT 0,
  pending_amount      NUMERIC GENERATED ALWAYS AS
                        (total_work_value - amount_paid) STORED,
  status              VARCHAR(20) DEFAULT 'ongoing'
                      CHECK (status IN ('ongoing','completed','cancelled')),
  start_date          DATE,
  end_date            DATE,
  created_by          UUID REFERENCES users(id),
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS freelancer_payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id     UUID NOT NULL REFERENCES freelancers(id) ON DELETE CASCADE,
  assignment_id     UUID REFERENCES freelancer_assignments(id) ON DELETE SET NULL,
  amount            NUMERIC NOT NULL CHECK (amount > 0),
  payment_type      VARCHAR(20) DEFAULT 'payment'
                    CHECK (payment_type IN ('advance','payment','bonus')),
  payment_mode      VARCHAR(50),
  payment_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  note              TEXT,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── ATTENDANCE MODULE ───

CREATE TABLE IF NOT EXISTS attendance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  freelancer_id   UUID REFERENCES freelancers(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'present'
                  CHECK (status IN ('present','absent','half-day','late','leave','holiday','work-from-home')),
  check_in        TIME,
  check_out       TIME,
  hours_worked    NUMERIC,
  day_amount      NUMERIC DEFAULT 0,
  notes           TEXT,
  marked_by       UUID REFERENCES users(id),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT attendance_user_date_unique       UNIQUE (user_id, date),
  CONSTRAINT attendance_freelancer_date_unique UNIQUE (freelancer_id, date),
  CONSTRAINT attendance_person_check CHECK (
    (user_id IS NOT NULL AND freelancer_id IS NULL) OR
    (user_id IS NULL AND freelancer_id IS NOT NULL)
  )
);

-- ─── VENDORS MODULE ───

CREATE TABLE IF NOT EXISTS vendors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(255),
  phone           VARCHAR(50),
  address         TEXT,
  gst_number      VARCHAR(20),
  category        VARCHAR(100),
  company_id      UUID REFERENCES companies(id) ON DELETE SET NULL,
  status          VARCHAR(20) DEFAULT 'active'
                  CHECK (status IN ('active','inactive')),
  notes           TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendor_bills (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id       UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  bill_number     VARCHAR(100),
  bill_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date        DATE,
  description     TEXT,
  items           JSONB DEFAULT '[]'::jsonb,
  total_amount    NUMERIC NOT NULL DEFAULT 0,
  advance_paid    NUMERIC DEFAULT 0,
  amount_paid     NUMERIC DEFAULT 0,
  pending_amount  NUMERIC GENERATED ALWAYS AS
                    (total_amount - amount_paid) STORED,
  status          VARCHAR(20) DEFAULT 'unpaid'
                  CHECK (status IN ('unpaid','partial','paid','cancelled')),
  category        VARCHAR(100),
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  note            TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendor_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id       UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  vendor_bill_id  UUID REFERENCES vendor_bills(id) ON DELETE SET NULL,
  amount          NUMERIC NOT NULL CHECK (amount > 0),
  payment_type    VARCHAR(20) DEFAULT 'payment'
                  CHECK (payment_type IN ('advance','payment')),
  payment_mode    VARCHAR(50),
  payment_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  note            TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
