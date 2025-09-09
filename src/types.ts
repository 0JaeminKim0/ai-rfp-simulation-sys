// RFP 기반 AI 가상고객 제안발표 시뮬레이터 타입 정의

export type Bindings = {
  DB: D1Database;
}

// 1. 페르소나 관련 타입
export interface PersonaField {
  id?: number;
  field_name: string;
  field_type: string;
  description?: string;
  data_source?: string;
  example_values?: string;
  created_at?: string;
}

export interface ExecutivePersona {
  id: string;
  name: string;
  department?: string;
  company?: string;
  rank?: string;
  version?: string;
  kpi?: string;
  evaluation_focus?: string;
  budget_authority?: number; // 1-10
  decision_influence?: number; // 1-10
  technical_expertise?: number; // 1-10
  industry_experience?: number; // 연수
  communication_style?: string;
  risk_tolerance?: number; // 1-10
  innovation_openness?: number; // 1-10
  team_dynamics?: string;
  strategic_priority?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PersonaEvaluationMapping {
  id?: number;
  evaluation_metric: string;
  mapped_fields: string[]; // JSON 배열
  description?: string;
  default_weight?: number;
  field_weights: Record<string, number>; // JSON 객체
  created_at?: string;
}

// 2. RFP 관련 타입
export interface RFPDocument {
  id: string;
  title: string;
  company?: string;
  file_path?: string;
  file_hash?: string;
  content_summary?: string;
  parsed_signals?: RFPSignals;
  created_at?: string;
  updated_at?: string;
}

export interface RFPSignals {
  kpi?: string[];
  tech_requirements?: string[];
  budget_range?: string;
  innovation_focus?: boolean;
  risk_factors?: string[];
  strategic_themes?: string[];
}

export interface RFPParsedSignal {
  id?: number;
  rfp_id: string;
  signal_type: string;
  signal_content?: string;
  confidence_score?: number;
  created_at?: string;
}

// 3. 제안서 관련 타입
export interface Proposal {
  id: string;
  title: string;
  rfp_id?: string;
  file_path?: string;
  file_hash?: string;
  content_summary?: string;
  sections?: ProposalSections;
  created_at?: string;
}

export interface ProposalSections {
  executive_summary?: string;
  methodology?: string;
  technical_approach?: string;
  security?: string;
  pricing?: string;
  risk_management?: string;
  team?: string;
  timeline?: string;
}

// 4. 발표 관련 타입
export interface Presentation {
  id: string;
  proposal_id?: string;
  title?: string;
  duration_seconds?: number;
  video_path?: string;
  audio_path?: string;
  transcript_path?: string;
  session_metadata?: PresentationMetadata;
  created_at?: string;
}

export interface PresentationMetadata {
  camera_quality?: string;
  audio_quality?: string;
  slide_count?: number;
  estimated_audience_size?: number;
}

export interface STTTranscript {
  id: string;
  presentation_id: string;
  transcript_text?: string;
  word_timestamps?: WordTimestamp[];
  segment_timestamps?: SegmentTimestamp[];
  language_detected?: string;
  confidence_scores?: ConfidenceScores;
  created_at?: string;
}

export interface WordTimestamp {
  word: string;
  start_time: number;
  end_time: number;
  confidence: number;
}

export interface SegmentTimestamp {
  text: string;
  start_time: number;
  end_time: number;
  speaker?: string;
}

export interface ConfidenceScores {
  overall: number;
  word_level_avg: number;
  segment_level_avg: number;
}

// 5. 평가 점수 관련 타입
export interface RubricAnchor {
  id?: number;
  metric_name: string;
  score_value: number; // 20, 40, 60, 80, 100
  anchor_description: string;
  created_at?: string;
}

export interface EvaluationScore {
  clarity_score?: number;
  clarity_anchor?: string;
  expertise_score?: number;
  expertise_anchor?: string;
  persuasion_score?: number;
  persuasion_anchor?: string;
  logic_score?: number;
  logic_anchor?: string;
  creativity_score?: number;
  creativity_anchor?: string;
  reliability_score?: number;
  reliability_anchor?: string;
  total_weighted_score?: number;
  evaluation_feedback?: string;
  evaluation_reasoning?: EvaluationReasoning;
}

export interface PersonaProposalScore extends EvaluationScore {
  id: string;
  proposal_id: string;
  persona_id: string;
  created_at?: string;
}

export interface PersonaPresentationScore extends EvaluationScore {
  id: string;
  presentation_id: string;
  persona_id: string;
  video_analysis?: VideoAnalysis;
  audio_analysis?: AudioAnalysis;
  created_at?: string;
}

export interface PersonaFinalScore {
  id: string;
  persona_id: string;
  proposal_id?: string;
  presentation_id?: string;
  proposal_weight?: number;
  presentation_weight?: number;
  final_clarity?: number;
  final_expertise?: number;
  final_persuasion?: number;
  final_logic?: number;
  final_creativity?: number;
  final_reliability?: number;
  final_total_score?: number;
  expected_questions?: string[];
  recommended_answers?: string[];
  feedback_summary?: string;
  created_at?: string;
}

export interface EvaluationReasoning {
  clarity_reasons?: string[];
  expertise_reasons?: string[];
  persuasion_reasons?: string[];
  logic_reasons?: string[];
  creativity_reasons?: string[];
  reliability_reasons?: string[];
  overall_assessment?: string;
}

export interface VideoAnalysis {
  eye_contact_score?: number;
  gesture_appropriateness?: number;
  facial_expression_score?: number;
  slide_alignment_score?: number;
  overall_presence?: number;
}

export interface AudioAnalysis {
  speech_rate?: number;
  pause_frequency?: number;
  filler_word_count?: number;
  intonation_stability?: number;
  keyword_coverage?: number;
  overall_delivery?: number;
}

// 6. 인터뷰 관련 타입
export interface InterviewQuestion {
  id?: number;
  question_id: string;
  question_category?: string;
  interview_question: string;
  response_type?: string;
  scoring_method?: string;
  target_fields?: string[];
  evaluation_metrics_impact?: Record<string, number>;
  example_responses?: string;
  created_at?: string;
}

export interface InterviewResponseConverter {
  id?: number;
  question_ref: string;
  target_field: string;
  response_pattern?: string;
  field_value_conversion?: string;
  scoring_formula?: string;
  conversion_example?: string;
  created_at?: string;
}

// 7. API 응답 타입
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface ValidationError {
  field: string;
  message: string;
}

// 8. 페이지네이션 옵션
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
  search?: string;
}

// 9. 대시보드/통계 관련 타입
export interface DashboardStats {
  total_personas: number;
  total_proposals: number;
  total_presentations: number;
  average_scores: {
    clarity: number;
    expertise: number;
    persuasion: number;
    logic: number;
    creativity: number;
    reliability: number;
  };
  recent_evaluations: Array<{
    id: string;
    title: string;
    score: number;
    created_at: string;
  }>;
}

// 10. LLM 평가 요청/응답 타입
export interface LLMEvaluationRequest {
  content: string;
  persona: ExecutivePersona;
  evaluation_type: 'proposal' | 'presentation';
  context?: {
    rfp_signals?: RFPSignals;
    presentation_transcript?: string;
    slide_content?: string[];
  };
}

export interface LLMEvaluationResponse {
  scores: {
    clarity: { score: number; anchor: string; reasoning: string };
    expertise: { score: number; anchor: string; reasoning: string };
    persuasion: { score: number; anchor: string; reasoning: string };
    logic: { score: number; anchor: string; reasoning: string };
    creativity: { score: number; anchor: string; reasoning: string };
    reliability: { score: number; anchor: string; reasoning: string };
  };
  total_weighted_score: number;
  overall_feedback: string;
  expected_questions?: string[];
  recommended_improvements?: string[];
}