// AI 가상고객 제안평가 시뮬레이터 타입 정의

// === 딥리서치 15속성 ===
export interface DeepResearchAttribute {
  id: string;
  name: string;
  content: string;
  source_url?: string;
  source_type: 'homepage' | 'esg_report' | 'ir_document' | 'press_release' | 'news';
  reliability_score: number; // 1-10
  llm_confidence: number; // 0-1
  extracted_at: string;
}

export interface DeepResearchData {
  [1]: DeepResearchAttribute; // 비전·미션
  [2]: DeepResearchAttribute; // 핵심 사업영역
  [3]: DeepResearchAttribute; // 시장 포지셔닝
  [4]: DeepResearchAttribute; // 재무 전략 성향
  [5]: DeepResearchAttribute; // R&D 지향성
  [6]: DeepResearchAttribute; // ESG 우선순위
  [7]: DeepResearchAttribute; // 리스크 관리 태도
  [8]: DeepResearchAttribute; // 글로벌 vs 로컬 지향성
  [9]: DeepResearchAttribute; // 고객/이해관계자 성향
  [10]: DeepResearchAttribute; // 디지털 전환 수준
  [11]: DeepResearchAttribute; // 조직문화·HR 방향
  [12]: DeepResearchAttribute; // 파트너십/생태계 전략
  [13]: DeepResearchAttribute; // 규제·정책 대응 성향
  [14]: DeepResearchAttribute; // 사회적 이미지/브랜드 톤
  [15]: DeepResearchAttribute; // 단기 vs 장기 목표 균형
}

// === RFP 분석 15속성 ===
export interface RfpAnalysisAttribute {
  id: string;
  name: string;
  content: string;
  source_snippet: string; // 원문 스니펫
  page_number?: number;
  section_title?: string;
  extracted_at: string;
}

export interface RfpAnalysisData {
  [1]: RfpAnalysisAttribute; // 발주사명
  [2]: RfpAnalysisAttribute; // 발주부서
  [3]: RfpAnalysisAttribute; // 프로젝트 배경
  [4]: RfpAnalysisAttribute; // 프로젝트 목표
  [5]: RfpAnalysisAttribute; // 프로젝트 범위
  [6]: RfpAnalysisAttribute; // 프로젝트 기간
  [7]: RfpAnalysisAttribute; // 프로젝트 예산
  [8]: RfpAnalysisAttribute; // 평가기준
  [9]: RfpAnalysisAttribute; // 요구 산출물
  [10]: RfpAnalysisAttribute; // 입찰사 요건
  [11]: RfpAnalysisAttribute; // 준수사항
  [12]: RfpAnalysisAttribute; // 리스크 관리 조건
  [13]: RfpAnalysisAttribute; // 필수 역량
  [14]: RfpAnalysisAttribute; // 진행 일정
  [15]: RfpAnalysisAttribute; // 특이조건/기타 요구
}

// === AI 가상고객 ===
export interface AIVirtualCustomer {
  id: string;
  name: string;
  company_name: string;
  department?: string;
  
  created_at: string;
  updated_at: string;
  version: string;
  status: 'active' | 'archived';
  
  // 페르소나 카드
  persona_summary: string; // 한 줄 요약
  top3_priorities: string[]; // Top 3 우선순위
  decision_making_style: string; // 의사결정 방식
  
  // 30속성 통합 데이터
  deep_research_data: DeepResearchData;
  rfp_analysis_data: RfpAnalysisData;
  combined_attributes: CombinedAttributes;
}

export interface CombinedAttributes {
  // 딥리서치 + RFP 결합된 30속성 최종 프로필
  strategic_focus: string;
  risk_appetite: string;
  innovation_preference: string;
  budget_sensitivity: string;
  timeline_priority: string;
  quality_standards: string;
  compliance_requirements: string;
  stakeholder_priorities: string;
  technology_adoption: string;
  partnership_approach: string;
  // ... 나머지 20개 속성
}

// === 6대 평가지표 ===
export type EvaluationMetric = 'clarity' | 'expertise' | 'persuasiveness' | 'logic' | 'creativity' | 'credibility';

export interface MetricScore {
  score: number; // 1-5
  comment: string;
}

export interface EvaluationScores {
  clarity: MetricScore;
  expertise: MetricScore;
  persuasiveness: MetricScore;
  logic: MetricScore;
  creativity: MetricScore;
  credibility: MetricScore;
}

// === 제안서 평가 ===
export interface ProposalEvaluation {
  id: string;
  customer_id: string;
  proposal_title: string;
  proposal_file_path?: string;
  
  scores: EvaluationScores;
  overall_comment: string;
  total_score: number; // 평균점수
  evaluation_date: string;
}

// === 발표 평가 ===
export interface PresentationEvaluation {
  id: string;
  customer_id: string;
  presentation_title: string;
  audio_file_path?: string;
  transcript_text?: string;
  
  scores: EvaluationScores;
  
  // 발표 보조지표
  speech_metrics: {
    speech_speed: number; // 분당 단어 수
    filler_words_count: number; // 군더더기어 개수
    pause_frequency: number; // 휴지 빈도
  };
  
  overall_comment: string;
  total_score: number;
  evaluation_date: string;
}

// === 통합 결과 ===
export interface IntegratedEvaluation {
  id: string;
  customer_id: string;
  proposal_evaluation_id?: string;
  presentation_evaluation_id?: string;
  
  project_title: string;
  
  // 최종 통합 점수 (가중평균)
  final_scores: {
    clarity: number;
    expertise: number;
    persuasiveness: number;
    logic: number;
    creativity: number;
    credibility: number;
    total: number;
  };
  
  // 통합 피드백
  feedback: {
    strengths: string; // 강점
    improvements: string; // 보완사항
    final_summary: string; // 총평
  };
  
  // 레이더 차트 데이터
  radar_chart_data: {
    proposal_scores: number[]; // 6개 지표 점수
    presentation_scores: number[]; // 6개 지표 점수  
    final_scores: number[]; // 최종 통합 점수
    labels: string[]; // 지표 라벨
  };
  
  created_at: string;
}

// === 평가 세션 ===
export interface EvaluationSession {
  id: string;
  session_name: string;
  customer_id?: string;
  current_stage: 'customer_generation' | 'proposal_evaluation' | 'presentation_evaluation' | 'results';
  
  progress: {
    customer_completed: boolean;
    proposal_completed: boolean;
    presentation_completed: boolean;
    results_completed: boolean;
  };
  
  created_at: string;
  updated_at: string;
}

// === API 응답 타입 ===
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// === 딥리서치 수집 요청 ===
export interface DeepResearchRequest {
  company_name: string;
  urls?: string[]; // 분석할 URL들
  research_depth: 'basic' | 'comprehensive';
}

// === RFP 파싱 요청 ===
export interface RfpParsingRequest {
  file_path: string;
  file_type: 'pdf' | 'docx' | 'txt';
  parsing_mode: 'auto' | 'guided';
}

// === LLM 평가 요청 ===
export interface LLMEvaluationRequest {
  customer_profile: AIVirtualCustomer;
  content: string; // 제안서 내용 또는 발표 transcript
  content_type: 'proposal' | 'presentation';
  evaluation_context?: string; // 추가 평가 맥락
}