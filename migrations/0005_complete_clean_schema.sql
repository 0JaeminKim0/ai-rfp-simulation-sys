-- Complete clean schema with all required tables for PDF parsing pipeline
-- This replaces all previous migrations to avoid conflicts

-- Core RFP and personas tables (if not exists)
CREATE TABLE IF NOT EXISTS rfps (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  industry TEXT,
  budget_range TEXT,
  deadline DATE,
  requirements TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS personas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_url TEXT,
  position TEXT,
  department TEXT,
  influence_level INTEGER DEFAULT 5,
  budget_authority BOOLEAN DEFAULT false,
  technical_background BOOLEAN DEFAULT false,
  risk_tolerance TEXT DEFAULT 'medium',
  communication_style TEXT DEFAULT 'formal',
  decision_criteria TEXT,
  key_concerns TEXT,
  preferred_solutions TEXT,
  relationship_dynamics TEXT,
  time_constraints TEXT,
  information_sources TEXT,
  success_metrics TEXT,
  potential_objections TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rfp_personas (
  rfp_id TEXT,
  persona_id TEXT,
  relevance_score INTEGER DEFAULT 5,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (rfp_id, persona_id),
  FOREIGN KEY (rfp_id) REFERENCES rfps(id) ON DELETE CASCADE,
  FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE
);

-- PDF Parsing Pipeline Tables
CREATE TABLE IF NOT EXISTS rfp_ingest_jobs (
  job_id TEXT PRIMARY KEY,
  rfp_id TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  error_message TEXT,
  progress_stage TEXT, -- ingest, textification, structuring, signaling
  progress_percent INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  finished_at DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rfp_id) REFERENCES rfps(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rfp_pages (
  page_id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  raw_text TEXT,
  ocr_text TEXT,
  layout_data TEXT, -- JSON: bounding boxes, fonts, etc.
  processing_metadata TEXT, -- JSON: confidence scores, methods used
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES rfp_ingest_jobs(job_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rfp_document_structure (
  structure_id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  section_type TEXT NOT NULL, -- title, header, paragraph, list, table, etc.
  section_level INTEGER, -- hierarchy level (1=main section, 2=subsection, etc.)
  content TEXT NOT NULL,
  page_refs TEXT, -- JSON array of page_ids where this content appears
  confidence_score REAL DEFAULT 0.8,
  metadata TEXT, -- JSON: styling, positioning, etc.
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES rfp_ingest_jobs(job_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rfp_signals (
  signal_id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  signal_type TEXT NOT NULL, -- kpis, evaluation_criteria, budget_procurement, governance_decision, technical_requirements, strategic_themes, risk_compliance, innovation_poc
  signal_name TEXT NOT NULL,
  signal_value TEXT,
  confidence_score REAL DEFAULT 0.8,
  extraction_method TEXT, -- regex, keyword, ml_classification, etc.
  source_refs TEXT, -- JSON: references to structure_ids where signal was found
  metadata TEXT, -- JSON: additional context
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES rfp_ingest_jobs(job_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rfp_quality_metrics (
  metric_id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  metric_name TEXT NOT NULL, -- text_extraction_coverage, structure_accuracy, signal_density, etc.
  metric_value REAL NOT NULL,
  threshold REAL,
  status TEXT DEFAULT 'ok', -- ok, warning, error
  details TEXT, -- JSON: breakdown, suggestions
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES rfp_ingest_jobs(job_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS persona_state_adjustments (
  adjustment_id TEXT PRIMARY KEY,
  persona_id TEXT NOT NULL,
  rfp_id TEXT NOT NULL,
  field_name TEXT NOT NULL, -- one of the 17 persona fields
  original_value TEXT,
  adjusted_value TEXT,
  adjustment_reason TEXT,
  confidence_score REAL DEFAULT 0.8,
  source_signals TEXT, -- JSON array of signal_ids that triggered this adjustment
  user_confirmed BOOLEAN DEFAULT false,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE,
  FOREIGN KEY (rfp_id) REFERENCES rfps(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS persona_mapping_rules (
  rule_id TEXT PRIMARY KEY,
  rule_name TEXT NOT NULL,
  signal_type TEXT NOT NULL,
  signal_pattern TEXT, -- regex or keyword pattern
  target_persona_field TEXT NOT NULL,
  adjustment_logic TEXT NOT NULL, -- JSON: how to calculate new value
  precedence INTEGER DEFAULT 100,
  active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_signal_corrections (
  correction_id TEXT PRIMARY KEY,
  signal_id TEXT NOT NULL,
  user_id TEXT, -- if we have user management later
  original_value TEXT,
  corrected_value TEXT,
  correction_reason TEXT,
  locked BOOLEAN DEFAULT false, -- prevents future auto-adjustments
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (signal_id) REFERENCES rfp_signals(signal_id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rfp_ingest_jobs_rfp_id ON rfp_ingest_jobs(rfp_id);
CREATE INDEX IF NOT EXISTS idx_rfp_ingest_jobs_status ON rfp_ingest_jobs(status);
CREATE INDEX IF NOT EXISTS idx_rfp_pages_job_id ON rfp_pages(job_id);
CREATE INDEX IF NOT EXISTS idx_rfp_pages_page_number ON rfp_pages(job_id, page_number);
CREATE INDEX IF NOT EXISTS idx_rfp_document_structure_job_id ON rfp_document_structure(job_id);
CREATE INDEX IF NOT EXISTS idx_rfp_document_structure_section_type ON rfp_document_structure(section_type);
CREATE INDEX IF NOT EXISTS idx_rfp_signals_job_id ON rfp_signals(job_id);
CREATE INDEX IF NOT EXISTS idx_rfp_signals_type ON rfp_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_rfp_quality_metrics_job_id ON rfp_quality_metrics(job_id);
CREATE INDEX IF NOT EXISTS idx_persona_state_adjustments_persona_rfp ON persona_state_adjustments(persona_id, rfp_id);
CREATE INDEX IF NOT EXISTS idx_persona_state_adjustments_field ON persona_state_adjustments(field_name);
CREATE INDEX IF NOT EXISTS idx_persona_mapping_rules_signal_type ON persona_mapping_rules(signal_type);
CREATE INDEX IF NOT EXISTS idx_persona_mapping_rules_precedence ON persona_mapping_rules(precedence DESC);
CREATE INDEX IF NOT EXISTS idx_user_signal_corrections_signal_id ON user_signal_corrections(signal_id);

-- Triggers to automatically update updated_at columns
CREATE TRIGGER IF NOT EXISTS update_rfps_updated_at 
  AFTER UPDATE ON rfps
  BEGIN
    UPDATE rfps SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_personas_updated_at 
  AFTER UPDATE ON personas
  BEGIN
    UPDATE personas SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_rfp_personas_updated_at 
  AFTER UPDATE ON rfp_personas
  BEGIN
    UPDATE rfp_personas SET updated_at = CURRENT_TIMESTAMP WHERE rfp_id = NEW.rfp_id AND persona_id = NEW.persona_id;
  END;

CREATE TRIGGER IF NOT EXISTS update_rfp_ingest_jobs_updated_at 
  AFTER UPDATE ON rfp_ingest_jobs
  BEGIN
    UPDATE rfp_ingest_jobs SET updated_at = CURRENT_TIMESTAMP WHERE job_id = NEW.job_id;
  END;

CREATE TRIGGER IF NOT EXISTS update_rfp_pages_updated_at 
  AFTER UPDATE ON rfp_pages
  BEGIN
    UPDATE rfp_pages SET updated_at = CURRENT_TIMESTAMP WHERE page_id = NEW.page_id;
  END;

CREATE TRIGGER IF NOT EXISTS update_rfp_document_structure_updated_at 
  AFTER UPDATE ON rfp_document_structure
  BEGIN
    UPDATE rfp_document_structure SET updated_at = CURRENT_TIMESTAMP WHERE structure_id = NEW.structure_id;
  END;

CREATE TRIGGER IF NOT EXISTS update_rfp_signals_updated_at 
  AFTER UPDATE ON rfp_signals
  BEGIN
    UPDATE rfp_signals SET updated_at = CURRENT_TIMESTAMP WHERE signal_id = NEW.signal_id;
  END;

CREATE TRIGGER IF NOT EXISTS update_rfp_quality_metrics_updated_at 
  AFTER UPDATE ON rfp_quality_metrics
  BEGIN
    UPDATE rfp_quality_metrics SET updated_at = CURRENT_TIMESTAMP WHERE metric_id = NEW.metric_id;
  END;

CREATE TRIGGER IF NOT EXISTS update_persona_state_adjustments_updated_at 
  AFTER UPDATE ON persona_state_adjustments
  BEGIN
    UPDATE persona_state_adjustments SET updated_at = CURRENT_TIMESTAMP WHERE adjustment_id = NEW.adjustment_id;
  END;

CREATE TRIGGER IF NOT EXISTS update_persona_mapping_rules_updated_at 
  AFTER UPDATE ON persona_mapping_rules
  BEGIN
    UPDATE persona_mapping_rules SET updated_at = CURRENT_TIMESTAMP WHERE rule_id = NEW.rule_id;
  END;

CREATE TRIGGER IF NOT EXISTS update_user_signal_corrections_updated_at 
  AFTER UPDATE ON user_signal_corrections
  BEGIN
    UPDATE user_signal_corrections SET updated_at = CURRENT_TIMESTAMP WHERE correction_id = NEW.correction_id;
  END;