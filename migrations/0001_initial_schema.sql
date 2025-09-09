-- RFP 기반 AI 가상고객 제안발표 시뮬레이터 데이터베이스 스키마

-- 1. 페르소나 필드 구조 정의 (17개 필드 스키마)
CREATE TABLE IF NOT EXISTS persona_fields_structure (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  field_name TEXT NOT NULL UNIQUE,
  field_type TEXT NOT NULL,
  description TEXT,
  data_source TEXT,
  example_values TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. 페르소나 평가 매핑 (6대 지표와 17개 필드 매핑)
CREATE TABLE IF NOT EXISTS persona_evaluation_mapping (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evaluation_metric TEXT NOT NULL,
  mapped_fields TEXT NOT NULL, -- JSON 배열
  description TEXT,
  default_weight REAL DEFAULT 0.0,
  field_weights TEXT, -- JSON 객체
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. 경영진 페르소나 데이터 (17개 필드 실제 데이터)
CREATE TABLE IF NOT EXISTS executive_personas_data (
  id TEXT PRIMARY KEY, -- UUID
  name TEXT NOT NULL,
  department TEXT,
  company TEXT,
  rank TEXT,
  version TEXT DEFAULT 'v1.0',
  kpi TEXT,
  evaluation_focus TEXT,
  budget_authority INTEGER CHECK (budget_authority BETWEEN 1 AND 10),
  decision_influence INTEGER CHECK (decision_influence BETWEEN 1 AND 10),
  technical_expertise INTEGER CHECK (technical_expertise BETWEEN 1 AND 10),
  industry_experience INTEGER,
  communication_style TEXT,
  risk_tolerance INTEGER CHECK (risk_tolerance BETWEEN 1 AND 10),
  innovation_openness INTEGER CHECK (innovation_openness BETWEEN 1 AND 10),
  team_dynamics TEXT,
  strategic_priority TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. 인터뷰 질문 프레임워크
CREATE TABLE IF NOT EXISTS interview_questions_framework (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id TEXT NOT NULL UNIQUE,
  question_category TEXT,
  interview_question TEXT NOT NULL,
  response_type TEXT,
  scoring_method TEXT,
  target_fields TEXT, -- JSON 배열
  evaluation_metrics_impact TEXT, -- JSON 객체
  example_responses TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. 인터뷰 응답 변환기
CREATE TABLE IF NOT EXISTS interview_response_converter (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_ref TEXT NOT NULL,
  target_field TEXT NOT NULL,
  response_pattern TEXT,
  field_value_conversion TEXT,
  scoring_formula TEXT,
  conversion_example TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. 점수 방법론 가이드
CREATE TABLE IF NOT EXISTS scoring_methodology_guide (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  field_name TEXT NOT NULL,
  scoring_scale TEXT,
  scoring_criteria TEXT,
  response_examples TEXT,
  score_mapping TEXT,
  data_processing_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. RFP 문서 및 파싱 신호
CREATE TABLE IF NOT EXISTS rfp_documents (
  id TEXT PRIMARY KEY, -- UUID
  title TEXT NOT NULL,
  filename TEXT,
  file_type TEXT,
  file_size INTEGER,
  content TEXT,
  company TEXT,
  status TEXT DEFAULT 'uploaded',
  analysis_result TEXT, -- JSON 객체
  analysis_summary TEXT,
  analyzed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. RFP 파싱 신호 상세
CREATE TABLE IF NOT EXISTS rfp_parsed_signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rfp_id TEXT NOT NULL,
  signal_type TEXT NOT NULL, -- KPI, 평가기준, 예산, 기술요건, 전략테마, 리스크, 혁신
  signal_content TEXT,
  confidence_score REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rfp_id) REFERENCES rfp_documents(id) ON DELETE CASCADE
);

-- 9. 제안서 문서
CREATE TABLE IF NOT EXISTS proposals (
  id TEXT PRIMARY KEY, -- UUID
  title TEXT NOT NULL,
  rfp_id TEXT,
  file_path TEXT,
  file_hash TEXT,
  content_summary TEXT,
  sections TEXT, -- JSON 객체 (요약, 방법론, 보안, 가격, 리스크, 팀 등)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rfp_id) REFERENCES rfp_documents(id) ON DELETE SET NULL
);

-- 10. 페르소나별 제안서 평가 점수
CREATE TABLE IF NOT EXISTS persona_proposal_scores (
  id TEXT PRIMARY KEY, -- UUID
  proposal_id TEXT NOT NULL,
  persona_id TEXT NOT NULL,
  clarity_score INTEGER,
  clarity_anchor TEXT,
  expertise_score INTEGER,
  expertise_anchor TEXT,
  persuasion_score INTEGER,
  persuasion_anchor TEXT,
  logic_score INTEGER,
  logic_anchor TEXT,
  creativity_score INTEGER,
  creativity_anchor TEXT,
  reliability_score INTEGER,
  reliability_anchor TEXT,
  total_weighted_score REAL,
  evaluation_feedback TEXT,
  evaluation_reasoning TEXT, -- JSON 객체
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE,
  FOREIGN KEY (persona_id) REFERENCES executive_personas_data(id) ON DELETE CASCADE
);

-- 11. 발표 세션
CREATE TABLE IF NOT EXISTS presentations (
  id TEXT PRIMARY KEY, -- UUID
  proposal_id TEXT,
  title TEXT,
  duration_seconds INTEGER,
  video_path TEXT,
  audio_path TEXT,
  transcript_path TEXT,
  session_metadata TEXT, -- JSON 객체
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE SET NULL
);

-- 12. STT 전사 데이터
CREATE TABLE IF NOT EXISTS stt_transcripts (
  id TEXT PRIMARY KEY, -- UUID
  presentation_id TEXT NOT NULL,
  transcript_text TEXT,
  word_timestamps TEXT, -- JSON 배열
  segment_timestamps TEXT, -- JSON 배열
  language_detected TEXT,
  confidence_scores TEXT, -- JSON 객체
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (presentation_id) REFERENCES presentations(id) ON DELETE CASCADE
);

-- 13. 페르소나별 발표 평가 점수
CREATE TABLE IF NOT EXISTS persona_presentation_scores (
  id TEXT PRIMARY KEY, -- UUID
  presentation_id TEXT NOT NULL,
  persona_id TEXT NOT NULL,
  clarity_score INTEGER,
  clarity_anchor TEXT,
  expertise_score INTEGER,
  expertise_anchor TEXT,
  persuasion_score INTEGER,
  persuasion_anchor TEXT,
  logic_score INTEGER,
  logic_anchor TEXT,
  creativity_score INTEGER,
  creativity_anchor TEXT,
  reliability_score INTEGER,
  reliability_anchor TEXT,
  total_weighted_score REAL,
  video_analysis TEXT, -- JSON 객체 (시선, 제스처, 표정, 슬라이드 일치율)
  audio_analysis TEXT, -- JSON 객체 (속도, 휴지, 억양 안정성, 키워드 커버리지)
  evaluation_feedback TEXT,
  evaluation_reasoning TEXT, -- JSON 객체
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (presentation_id) REFERENCES presentations(id) ON DELETE CASCADE,
  FOREIGN KEY (persona_id) REFERENCES executive_personas_data(id) ON DELETE CASCADE
);

-- 14. 최종 통합 점수 (선택사항)
CREATE TABLE IF NOT EXISTS persona_final_scores (
  id TEXT PRIMARY KEY, -- UUID
  persona_id TEXT NOT NULL,
  proposal_id TEXT,
  presentation_id TEXT,
  proposal_weight REAL DEFAULT 0.4,
  presentation_weight REAL DEFAULT 0.6,
  final_clarity REAL,
  final_expertise REAL,
  final_persuasion REAL,
  final_logic REAL,
  final_creativity REAL,
  final_reliability REAL,
  final_total_score REAL,
  expected_questions TEXT, -- JSON 배열
  recommended_answers TEXT, -- JSON 배열
  feedback_summary TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (persona_id) REFERENCES executive_personas_data(id) ON DELETE CASCADE,
  FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE SET NULL,
  FOREIGN KEY (presentation_id) REFERENCES presentations(id) ON DELETE SET NULL
);

-- 15. 루브릭 앵커 정의
CREATE TABLE IF NOT EXISTS rubric_anchors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  metric_name TEXT NOT NULL, -- clarity, expertise, persuasion, logic, creativity, reliability
  score_value INTEGER NOT NULL CHECK (score_value IN (20, 40, 60, 80, 100)),
  anchor_description TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(metric_name, score_value)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_personas_company ON executive_personas_data(company);
CREATE INDEX IF NOT EXISTS idx_personas_rank ON executive_personas_data(rank);
CREATE INDEX IF NOT EXISTS idx_proposals_rfp_id ON proposals(rfp_id);
CREATE INDEX IF NOT EXISTS idx_proposal_scores_persona ON persona_proposal_scores(persona_id);
CREATE INDEX IF NOT EXISTS idx_proposal_scores_proposal ON persona_proposal_scores(proposal_id);
CREATE INDEX IF NOT EXISTS idx_presentation_scores_persona ON persona_presentation_scores(persona_id);
CREATE INDEX IF NOT EXISTS idx_presentation_scores_presentation ON persona_presentation_scores(presentation_id);
CREATE INDEX IF NOT EXISTS idx_rfp_signals_type ON rfp_parsed_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_rfp_signals_rfp_id ON rfp_parsed_signals(rfp_id);