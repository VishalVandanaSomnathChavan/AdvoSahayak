CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('lawyer', 'admin') NOT NULL DEFAULT 'lawyer',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cases (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_id BIGINT UNSIGNED NOT NULL,
  case_number VARCHAR(100) NOT NULL DEFAULT '',
  title VARCHAR(200) NOT NULL,
  client_name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  court VARCHAR(200) NOT NULL DEFAULT '',
  case_type VARCHAR(100) NOT NULL DEFAULT '',
  status ENUM('active', 'closed', 'pending') NOT NULL DEFAULT 'active',
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_cases_id_owner (id, owner_id),
  KEY ix_cases_owner_created (owner_id, created_at),
  KEY ix_cases_owner_status_archived (owner_id, status, archived),
  KEY ix_cases_owner_updated (owner_id, updated_at),
  CONSTRAINT fk_cases_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS case_parties (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  case_id BIGINT UNSIGNED NOT NULL,
  owner_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(200) NOT NULL,
  PRIMARY KEY (id),
  KEY ix_case_parties_case_owner (case_id, owner_id),
  CONSTRAINT fk_case_parties_case_owner FOREIGN KEY (case_id, owner_id) REFERENCES cases (id, owner_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS important_dates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  case_id BIGINT UNSIGNED NOT NULL,
  owner_id BIGINT UNSIGNED NOT NULL,
  label VARCHAR(200) NOT NULL DEFAULT '',
  date DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY ix_important_dates_case_owner (case_id, owner_id),
  CONSTRAINT fk_important_dates_case_owner FOREIGN KEY (case_id, owner_id) REFERENCES cases (id, owner_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS case_notes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  case_id BIGINT UNSIGNED NOT NULL,
  owner_id BIGINT UNSIGNED NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_case_notes_case_owner (case_id, owner_id),
  CONSTRAINT fk_case_notes_case_owner FOREIGN KEY (case_id, owner_id) REFERENCES cases (id, owner_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hearings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  case_id BIGINT UNSIGNED NOT NULL,
  owner_id BIGINT UNSIGNED NOT NULL,
  date DATETIME(3) NOT NULL,
  description VARCHAR(1000) NOT NULL,
  outcome VARCHAR(2000) NOT NULL DEFAULT '',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_hearings_owner_date (owner_id, date),
  KEY ix_hearings_case_owner (case_id, owner_id),
  CONSTRAINT fk_hearings_case_owner FOREIGN KEY (case_id, owner_id) REFERENCES cases (id, owner_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS deadlines (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  case_id BIGINT UNSIGNED NOT NULL,
  owner_id BIGINT UNSIGNED NOT NULL,
  date DATETIME(3) NOT NULL,
  description VARCHAR(1000) NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  confidence ENUM('verified', 'uncertain') NOT NULL DEFAULT 'verified',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_deadlines_owner_date (owner_id, completed, date),
  KEY ix_deadlines_case_owner (case_id, owner_id),
  CONSTRAINT fk_deadlines_case_owner FOREIGN KEY (case_id, owner_id) REFERENCES cases (id, owner_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS documents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_id BIGINT UNSIGNED NOT NULL,
  case_id BIGINT UNSIGNED NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(100) NOT NULL,
  mime_type VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
  size BIGINT UNSIGNED NOT NULL,
  status ENUM('processed', 'text_unavailable') NOT NULL,
  text LONGTEXT NOT NULL,
  page_count INT UNSIGNED NOT NULL DEFAULT 0,
  processing_note VARCHAR(200) NOT NULL DEFAULT '',
  uploaded_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_documents_stored_name (stored_name),
  UNIQUE KEY uq_documents_id_case_owner (id, case_id, owner_id),
  KEY ix_documents_owner_uploaded (owner_id, uploaded_at),
  KEY ix_documents_case_owner_uploaded (case_id, owner_id, uploaded_at),
  CONSTRAINT fk_documents_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_documents_case_owner FOREIGN KEY (case_id, owner_id) REFERENCES cases (id, owner_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tasks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_id BIGINT UNSIGNED NOT NULL,
  case_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  description VARCHAR(2000) NOT NULL DEFAULT '',
  due_date DATETIME(3) NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_tasks_owner_due (owner_id, completed, due_date),
  KEY ix_tasks_case_owner (case_id, owner_id),
  CONSTRAINT fk_tasks_case_owner FOREIGN KEY (case_id, owner_id) REFERENCES cases (id, owner_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_analyses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_id BIGINT UNSIGNED NOT NULL,
  case_id BIGINT UNSIGNED NOT NULL,
  document_id BIGINT UNSIGNED NULL,
  type ENUM('summary', 'question', 'brief', 'draft') NOT NULL,
  prompt VARCHAR(5000) NOT NULL,
  result MEDIUMTEXT NOT NULL,
  source_excerpt TEXT NOT NULL,
  reviewed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_ai_analyses_owner_case_created (owner_id, case_id, created_at),
  KEY ix_ai_analyses_document_owner (document_id, owner_id),
  CONSTRAINT fk_ai_analyses_case_owner FOREIGN KEY (case_id, owner_id) REFERENCES cases (id, owner_id) ON DELETE CASCADE,
  CONSTRAINT fk_ai_analyses_document_case_owner FOREIGN KEY (document_id, case_id, owner_id) REFERENCES documents (id, case_id, owner_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activities (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_id BIGINT UNSIGNED NOT NULL,
  case_id BIGINT UNSIGNED NOT NULL,
  type VARCHAR(40) NOT NULL,
  message VARCHAR(240) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_activities_owner_case_created (owner_id, case_id, created_at),
  CONSTRAINT fk_activities_case_owner FOREIGN KEY (case_id, owner_id) REFERENCES cases (id, owner_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
