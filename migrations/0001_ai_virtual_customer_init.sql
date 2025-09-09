-- AI 가상고객 제안평가 시뮬레이터 초기 스키마

-- 1. AI 가상고객 테이블 (30속성 기반)
CREATE TABLE ai_virtual_customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    company_name TEXT NOT NULL,
    department TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version TEXT DEFAULT 'v1.0',
    status TEXT DEFAULT 'active',
    
    -- 페르소나 요약
    persona_summary TEXT,
    top3_priorities TEXT,
    decision_making_style TEXT,
    
    -- 30속성 통합 데이터 (JSON)
    deep_research_data TEXT,
    rfp_analysis_data TEXT,
    combined_attributes TEXT
);

-- 2. 제안서 평가 테이블
CREATE TABLE proposal_evaluations (
    id TEXT PRIMARY KEY,
    customer_id TEXT,
    proposal_title TEXT NOT NULL,
    proposal_file_path TEXT,
    
    clarity_score INTEGER,
    expertise_score INTEGER,
    persuasiveness_score INTEGER,
    logic_score INTEGER,
    creativity_score INTEGER,
    credibility_score INTEGER,
    
    clarity_comment TEXT,
    expertise_comment TEXT,
    persuasiveness_comment TEXT,
    logic_comment TEXT,
    creativity_comment TEXT,
    credibility_comment TEXT,
    
    overall_comment TEXT,
    total_score REAL,
    evaluation_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. 발표 평가 테이블
CREATE TABLE presentation_evaluations (
    id TEXT PRIMARY KEY,
    customer_id TEXT,
    presentation_title TEXT NOT NULL,
    audio_file_path TEXT,
    transcript_text TEXT,
    
    clarity_score INTEGER,
    expertise_score INTEGER,
    persuasiveness_score INTEGER,
    logic_score INTEGER,
    creativity_score INTEGER,
    credibility_score INTEGER,
    
    clarity_comment TEXT,
    expertise_comment TEXT,
    persuasiveness_comment TEXT,
    logic_comment TEXT,
    creativity_comment TEXT,
    credibility_comment TEXT,
    
    speech_speed REAL,
    filler_words_count INTEGER,
    pause_frequency REAL,
    
    overall_comment TEXT,
    total_score REAL,
    evaluation_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. 통합 결과 테이블
CREATE TABLE integrated_evaluations (
    id TEXT PRIMARY KEY,
    customer_id TEXT,
    proposal_evaluation_id TEXT,
    presentation_evaluation_id TEXT,
    
    project_title TEXT NOT NULL,
    
    final_clarity_score REAL,
    final_expertise_score REAL,
    final_persuasiveness_score REAL,
    final_logic_score REAL,
    final_creativity_score REAL,
    final_credibility_score REAL,
    final_total_score REAL,
    
    strengths TEXT,
    improvements TEXT,
    final_summary TEXT,
    
    radar_chart_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. 평가 세션 관리
CREATE TABLE evaluation_sessions (
    id TEXT PRIMARY KEY,
    session_name TEXT NOT NULL,
    customer_id TEXT,
    current_stage TEXT DEFAULT 'customer_generation',
    
    customer_completed BOOLEAN DEFAULT false,
    proposal_completed BOOLEAN DEFAULT false,
    presentation_completed BOOLEAN DEFAULT false,
    results_completed BOOLEAN DEFAULT false,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);