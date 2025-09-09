-- AI 가상고객 제안평가 시뮬레이터 스키마 (v2.0)

-- 기존 테이블 삭제 (새 구조로 재설계)
DROP TABLE IF EXISTS persona_proposal_scores;
DROP TABLE IF EXISTS rfp_personas;
DROP TABLE IF EXISTS extracted_signals;
DROP TABLE IF EXISTS presentations;
DROP TABLE IF EXISTS proposals;
DROP TABLE IF EXISTS rubric_anchors;
DROP TABLE IF EXISTS personas;

-- 1. AI 가상고객 (30속성 기반)
CREATE TABLE IF NOT EXISTS ai_virtual_customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    company_name TEXT NOT NULL,
    department TEXT,
    
    -- 메타데이터
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version TEXT DEFAULT 'v1.0',
    status TEXT DEFAULT 'active', -- active, archived
    
    -- 딥리서치 15속성 (JSON 저장)
    deep_research_attributes TEXT, -- JSON: 15개 속성과 출처/신뢰도
    
    -- RFP 15속성 (JSON 저장)
    rfp_attributes TEXT, -- JSON: 15개 속성과 원문 스니펫/페이지
    
    -- 결합된 30속성 페르소나 카드
    persona_summary TEXT, -- 한 줄 요약
    top3_priorities TEXT, -- JSON: Top 3 우선순위
    decision_making_style TEXT, -- 의사결정 방식
    combined_attributes TEXT -- JSON: 30개 통합 속성
);

-- 2. 딥리서치 수집 데이터
CREATE TABLE IF NOT EXISTS deep_research_data (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES ai_virtual_customers(id),
    attribute_name TEXT NOT NULL, -- [1]~[15] 속성명
    content TEXT NOT NULL,
    source_url TEXT,
    source_type TEXT, -- homepage, esg_report, ir_document, press_release
    reliability_score INTEGER DEFAULT 5, -- 1-10
    extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    llm_confidence REAL DEFAULT 0.8 -- LLM 추출 신뢰도
);

-- 3. RFP 분석 데이터
CREATE TABLE IF NOT EXISTS rfp_analysis_data (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES ai_virtual_customers(id),
    rfp_file_path TEXT NOT NULL,
    attribute_name TEXT NOT NULL, -- [1]~[15] 속성명
    content TEXT NOT NULL,
    source_snippet TEXT, -- 원문 스니펫
    page_number INTEGER,
    section_title TEXT,
    extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. 제안서 평가
CREATE TABLE IF NOT EXISTS proposal_evaluations (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES ai_virtual_customers(id),
    proposal_title TEXT NOT NULL,
    proposal_file_path TEXT,
    
    -- 6대 지표 점수 (1-5)
    clarity_score INTEGER,
    expertise_score INTEGER,
    persuasiveness_score INTEGER,
    logic_score INTEGER,
    creativity_score INTEGER,
    credibility_score INTEGER,
    
    -- 지표별 코멘트
    clarity_comment TEXT,
    expertise_comment TEXT,
    persuasiveness_comment TEXT,
    logic_comment TEXT,
    creativity_comment TEXT,
    credibility_comment TEXT,
    
    -- 총평 및 메타데이터
    overall_comment TEXT,
    total_score REAL, -- 6지표 평균
    evaluation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    llm_model_used TEXT DEFAULT 'gpt-4o'
);

-- 5. 발표 평가
CREATE TABLE IF NOT EXISTS presentation_evaluations (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES ai_virtual_customers(id),
    presentation_title TEXT NOT NULL,
    audio_file_path TEXT,
    
    -- STT 결과
    transcript_text TEXT,
    
    -- 6대 지표 점수 (1-5)
    clarity_score INTEGER,
    expertise_score INTEGER,
    persuasiveness_score INTEGER,
    logic_score INTEGER,
    creativity_score INTEGER,
    credibility_score INTEGER,
    
    -- 지표별 코멘트
    clarity_comment TEXT,
    expertise_comment TEXT,
    persuasiveness_comment TEXT,
    logic_comment TEXT,
    creativity_comment TEXT,
    credibility_comment TEXT,
    
    -- 발표 보조지표
    speech_speed REAL, -- 분당 단어 수
    filler_words_count INTEGER, -- 군더더기어 개수
    pause_frequency REAL, -- 휴지 빈도
    
    -- 총평 및 메타데이터
    overall_comment TEXT,
    total_score REAL, -- 6지표 평균
    evaluation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    llm_model_used TEXT DEFAULT 'gpt-4o'
);

-- 6. 통합 평가 결과
CREATE TABLE IF NOT EXISTS integrated_evaluations (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES ai_virtual_customers(id),
    proposal_evaluation_id TEXT REFERENCES proposal_evaluations(id),
    presentation_evaluation_id TEXT REFERENCES presentation_evaluations(id),
    
    project_title TEXT NOT NULL,
    
    -- 최종 통합 점수 (제안서 70% + 발표 30% 가중평균)
    final_clarity_score REAL,
    final_expertise_score REAL,
    final_persuasiveness_score REAL,
    final_logic_score REAL,
    final_creativity_score REAL,
    final_credibility_score REAL,
    final_total_score REAL,
    
    -- 통합 피드백
    strengths TEXT, -- 강점
    improvements TEXT, -- 보완사항
    final_summary TEXT, -- 총평
    
    -- 레이더 차트 데이터 (JSON)
    radar_chart_data TEXT, -- 제안서/발표/최종 3중 비교 데이터
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    exported_pdf_path TEXT -- PDF 내보내기 경로
);

-- 7. 루브릭 앵커 (6대 지표별 1-5점 기준)
CREATE TABLE IF NOT EXISTS evaluation_rubrics (
    id TEXT PRIMARY KEY,
    metric_name TEXT NOT NULL, -- clarity, expertise, persuasiveness, logic, creativity, credibility
    score_level INTEGER NOT NULL, -- 1-5
    anchor_description TEXT NOT NULL,
    detailed_criteria TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. 프로젝트 세션 관리
CREATE TABLE IF NOT EXISTS evaluation_sessions (
    id TEXT PRIMARY KEY,
    session_name TEXT NOT NULL,
    customer_id TEXT REFERENCES ai_virtual_customers(id),
    current_stage TEXT DEFAULT 'customer_generation', -- customer_generation, proposal_evaluation, presentation_evaluation, results
    
    -- 진행 상태
    customer_completed BOOLEAN DEFAULT false,
    proposal_completed BOOLEAN DEFAULT false,
    presentation_completed BOOLEAN DEFAULT false,
    results_completed BOOLEAN DEFAULT false,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 초기 루브릭 앵커 데이터 삽입
INSERT INTO evaluation_rubrics (id, metric_name, score_level, anchor_description, detailed_criteria) VALUES
-- 명확성 (Clarity) 루브릭
('clarity-1', 'clarity', 1, '목적과 범위가 불분명하고 이해하기 어려움', '문장이 복잡하고 모호하며, 구조가 논리적이지 않음'),
('clarity-2', 'clarity', 2, '일부 내용은 명확하나 전체적으로 이해에 어려움', '중요 내용 일부가 불분명하고 구조에 일관성 부족'),
('clarity-3', 'clarity', 3, '대체로 명확하나 일부 개선 필요', '핵심 메시지는 전달되나 세부사항에서 모호함'),
('clarity-4', 'clarity', 4, '명확하고 이해하기 쉬우며 구조가 논리적', '목적, 범위, 기대효과가 분명하고 간결함'),
('clarity-5', 'clarity', 5, '매우 명확하고 직관적이며 완벽한 구조', '모든 내용이 간결하고 논리적으로 완벽하게 구성됨'),

-- 전문성 (Expertise) 루브릭
('expertise-1', 'expertise', 1, '해당 분야 전문성이 거의 드러나지 않음', '일반적 내용에 그치고 전문 지식 부족'),
('expertise-2', 'expertise', 2, '기본적 전문성은 있으나 깊이 부족', '업계 지식은 있으나 최신 트렌드나 심화 내용 부족'),
('expertise-3', 'expertise', 3, '적절한 전문성을 보유하고 있음', '해당 분야 지식과 일부 레퍼런스 포함'),
('expertise-4', 'expertise', 4, '높은 전문성과 풍부한 경험을 보여줌', '최신 트렌드, 레퍼런스, 실적이 충분히 포함'),
('expertise-5', 'expertise', 5, '탁월한 전문성과 업계 선도적 지식', '최고 수준의 전문성과 혁신적 인사이트 제시'),

-- 설득력 (Persuasiveness) 루브릭
('persuasiveness-1', 'persuasiveness', 1, '고객 요구사항과 연결성이 약하고 근거 부족', 'Pain Point 해결 방안이 불분명'),
('persuasiveness-2', 'persuasiveness', 2, '일부 요구사항은 다루나 설득력 부족', '근거가 약하고 고객 관점에서 매력도 낮음'),
('persuasiveness-3', 'persuasiveness', 3, '요구사항을 적절히 다루고 어느 정도 설득적', '기본적 근거는 제시하나 강한 확신 부족'),
('persuasiveness-4', 'persuasiveness', 4, '고객 Pain Point를 잘 해결하고 설득적', '충분한 데이터와 사례로 뒷받침'),
('persuasiveness-5', 'persuasiveness', 5, '매우 설득적이며 고객이 확신할 수 있는 근거', '완벽한 Pain Point 해결과 강력한 증거 제시'),

-- 논리성 (Logic) 루브릭
('logic-1', 'logic', 1, '논리적 흐름이 없고 일관성 부족', '문제정의부터 해결방안까지 연결고리 약함'),
('logic-2', 'logic', 2, '기본적 논리는 있으나 비약이나 모순 존재', '일부 구간에서 논리적 연결 부족'),
('logic-3', 'logic', 3, '대체로 논리적이나 일부 개선 필요', '전체적 흐름은 있으나 세부 근거 보완 필요'),
('logic-4', 'logic', 4, '논리적이고 일관성 있는 구성', '문제-목표-방법론-효과가 체계적으로 연결'),
('logic-5', 'logic', 5, '완벽한 논리적 구조와 일관성', '모든 단계가 치밀하게 연결된 완벽한 논리'),

-- 창의성 (Creativity) 루브릭
('creativity-1', 'creativity', 1, '기존 솔루션의 단순 반복, 차별화 없음', '새로운 아이디어나 접근법 부재'),
('creativity-2', 'creativity', 2, '일부 새로운 시도는 있으나 혁신성 부족', '기존 방식에 약간의 변화만 시도'),
('creativity-3', 'creativity', 3, '적절한 수준의 창의적 접근', '일부 독창적 아이디어나 차별화 포인트 존재'),
('creativity-4', 'creativity', 4, '창의적이고 혁신적인 아이디어 제시', '고객 상황에 맞는 독창적 솔루션'),
('creativity-5', 'creativity', 5, '매우 혁신적이고 독창적인 접근', '업계 선도적이고 게임체인징 아이디어'),

-- 신뢰성 (Credibility) 루브릭
('credibility-1', 'credibility', 1, '실행 가능성에 대한 근거 부족', '레퍼런스나 검증된 방법론 없음'),
('credibility-2', 'credibility', 2, '기본적 실행 계획은 있으나 신뢰성 부족', '일부 근거는 있으나 리스크 관리 미흡'),
('credibility-3', 'credibility', 3, '실행 가능한 계획과 어느 정도 신뢰성', '기본적 레퍼런스와 방법론 포함'),
('credibility-4', 'credibility', 4, '높은 신뢰성과 검증된 실행력', '풍부한 레퍼런스와 체계적 리스크 관리'),
('credibility-5', 'credibility', 5, '매우 높은 신뢰성과 완벽한 실행 보장', '완벽한 레퍼런스, 방법론, 리스크 관리 체계');