// 데이터베이스 유틸리티 함수들

import type { Bindings, ExecutivePersona, PaginationOptions, ApiResponse } from '../types'

export class DatabaseHelper {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  // UUID 생성 함수
  generateUUID(): string {
    return crypto.randomUUID();
  }

  // 페이지네이션 헬퍼
  async paginate<T>(
    baseQuery: string,
    countQuery: string,
    params: any[] = [],
    options: PaginationOptions = {}
  ): Promise<{ items: T[]; pagination: any }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    // 정렬 옵션 추가
    let finalQuery = baseQuery;
    if (options.sort_by) {
      const sortOrder = options.sort_order === 'DESC' ? 'DESC' : 'ASC';
      finalQuery += ` ORDER BY ${options.sort_by} ${sortOrder}`;
    }
    finalQuery += ` LIMIT ? OFFSET ?`;

    // 데이터 조회
    const [itemsResult, countResult] = await Promise.all([
      this.db.prepare(finalQuery).bind(...params, limit, offset).all(),
      this.db.prepare(countQuery).bind(...params).first()
    ]);

    const total = (countResult as any)?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      items: itemsResult.results as T[],
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1
      }
    };
  }

  // 검색 조건 추가 헬퍼
  buildSearchCondition(searchFields: string[], searchTerm?: string): { condition: string; params: string[] } {
    if (!searchTerm) {
      return { condition: '', params: [] };
    }

    const conditions = searchFields.map(field => `${field} LIKE ?`);
    const params = searchFields.map(() => `%${searchTerm}%`);

    return {
      condition: ` AND (${conditions.join(' OR ')})`,
      params
    };
  }

  // 페르소나 조회 헬퍼
  async getPersonas(options: PaginationOptions = {}): Promise<{ personas: ExecutivePersona[]; pagination: any }> {
    let baseQuery = `
      SELECT id, name, avatar_url, position, department, influence_level, budget_authority, 
             technical_background, risk_tolerance, communication_style, decision_criteria, 
             key_concerns, preferred_solutions, relationship_dynamics, time_constraints, 
             information_sources, success_metrics, potential_objections, created_at, updated_at
      FROM personas
      WHERE 1=1
    `;

    let countQuery = `SELECT COUNT(*) as count FROM personas WHERE 1=1`;
    let params: any[] = [];

    // 검색 조건 추가
    if (options.search) {
      const searchCondition = this.buildSearchCondition(
        ['name', 'position', 'department'], 
        options.search
      );
      baseQuery += searchCondition.condition;
      countQuery += searchCondition.condition;
      params.push(...searchCondition.params);
    }

    const result = await this.paginate<ExecutivePersona>(
      baseQuery, countQuery, params, options
    );

    return {
      personas: result.items,
      pagination: result.pagination
    };
  }

  // 페르소나 단일 조회
  async getPersonaById(id: string): Promise<ExecutivePersona | null> {
    const result = await this.db.prepare(`
      SELECT id, name, avatar_url, position, department, influence_level, budget_authority, 
             technical_background, risk_tolerance, communication_style, decision_criteria, 
             key_concerns, preferred_solutions, relationship_dynamics, time_constraints, 
             information_sources, success_metrics, potential_objections, created_at, updated_at
      FROM personas WHERE id = ?
    `).bind(id).first();

    return result as ExecutivePersona | null;
  }

  // 페르소나 생성
  async createPersona(persona: Omit<ExecutivePersona, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const id = this.generateUUID();
    const now = new Date().toISOString();

    await this.db.prepare(`
      INSERT INTO personas (
        id, name, avatar_url, position, department, influence_level, budget_authority,
        technical_background, risk_tolerance, communication_style, decision_criteria,
        key_concerns, preferred_solutions, relationship_dynamics, time_constraints,
        information_sources, success_metrics, potential_objections, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, persona.name, persona.avatar_url || '/static/avatars/default.jpg', 
      persona.position, persona.department, persona.influence_level || 5,
      persona.budget_authority || false, persona.technical_background || 'low',
      persona.risk_tolerance || 'medium', persona.communication_style || 'formal',
      persona.decision_criteria || 'Cost-effectiveness and ROI',
      persona.key_concerns || 'Budget constraints and delivery timeline',
      persona.preferred_solutions || 'Proven solutions with clear ROI',
      persona.relationship_dynamics || 'Collaborative team member',
      persona.time_constraints || 'Standard project timeline',
      persona.information_sources || 'Team reports and industry updates',
      persona.success_metrics || 'Project completion and budget adherence',
      persona.potential_objections || 'High costs or unproven technology',
      now, now
    ).run();

    return id;
  }

  // 페르소나 업데이트
  async updatePersona(id: string, updates: Partial<ExecutivePersona>): Promise<boolean> {
    const now = new Date().toISOString();
    
    const fields: string[] = [];
    const values: any[] = [];

    // 동적으로 업데이트할 필드 구성
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      return false;
    }

    fields.push('updated_at = ?');
    values.push(now, id);

    const result = await this.db.prepare(`
      UPDATE personas 
      SET ${fields.join(', ')}
      WHERE id = ?
    `).bind(...values).run();

    return result.changes > 0;
  }

  // 페르소나 삭제
  async deletePersona(id: string): Promise<boolean> {
    const result = await this.db.prepare(`
      DELETE FROM personas WHERE id = ?
    `).bind(id).run();

    return result.changes > 0;
  }

  // 루브릭 앵커 조회
  async getRubricAnchors(metricName?: string) {
    let query = 'SELECT * FROM rubric_anchors';
    const params: any[] = [];

    if (metricName) {
      query += ' WHERE metric_name = ?';
      params.push(metricName);
    }

    query += ' ORDER BY metric_name, score_value';

    const result = await this.db.prepare(query).bind(...params).all();
    return result.results;
  }

  // 페르소나 평가 매핑 조회
  async getEvaluationMappings() {
    const result = await this.db.prepare(`
      SELECT * FROM persona_evaluation_mapping ORDER BY evaluation_metric
    `).all();

    return result.results.map((row: any) => ({
      ...row,
      mapped_fields: JSON.parse(row.mapped_fields || '[]'),
      field_weights: JSON.parse(row.field_weights || '{}')
    }));
  }

  // 회사별 페르소나 통계
  async getPersonaStatsByCompany() {
    const result = await this.db.prepare(`
      SELECT 
        department as company,
        COUNT(*) as total_personas,
        AVG(influence_level) as avg_budget_authority,
        AVG(influence_level) as avg_decision_influence,
        AVG(CASE WHEN technical_background = 1 THEN 8 ELSE 3 END) as avg_technical_expertise,
        AVG(CASE WHEN risk_tolerance = 'high' THEN 8 WHEN risk_tolerance = 'medium' THEN 5 ELSE 2 END) as avg_risk_tolerance,
        AVG(CASE WHEN risk_tolerance = 'high' THEN 8 WHEN risk_tolerance = 'medium' THEN 5 ELSE 2 END) as avg_innovation_openness
      FROM personas
      WHERE department IS NOT NULL
      GROUP BY department
      ORDER BY total_personas DESC
    `).all();

    return result.results;
  }

  // 대시보드 통계
  async getDashboardStats() {
    const [personasCount, proposalsCount, presentationsCount] = await Promise.all([
      this.db.prepare('SELECT COUNT(*) as count FROM personas').first(),
      this.db.prepare('SELECT COUNT(*) as count FROM proposals').first(),
      this.db.prepare('SELECT COUNT(*) as count FROM presentations').first()
    ]);

    const avgScores = await this.db.prepare(`
      SELECT 
        AVG(CAST(clarity_score as REAL)) as avg_clarity,
        AVG(CAST(expertise_score as REAL)) as avg_expertise,
        AVG(CAST(persuasion_score as REAL)) as avg_persuasion,
        AVG(CAST(logic_score as REAL)) as avg_logic,
        AVG(CAST(creativity_score as REAL)) as avg_creativity,
        AVG(CAST(reliability_score as REAL)) as avg_reliability
      FROM persona_proposal_scores
      WHERE created_at >= datetime('now', '-30 days')
    `).first();

    return {
      total_personas: (personasCount as any)?.count || 0,
      total_proposals: (proposalsCount as any)?.count || 0,
      total_presentations: (presentationsCount as any)?.count || 0,
      average_scores: {
        clarity: Math.round((avgScores as any)?.avg_clarity || 0),
        expertise: Math.round((avgScores as any)?.avg_expertise || 0),
        persuasion: Math.round((avgScores as any)?.avg_persuasion || 0),
        logic: Math.round((avgScores as any)?.avg_logic || 0),
        creativity: Math.round((avgScores as any)?.avg_creativity || 0),
        reliability: Math.round((avgScores as any)?.avg_reliability || 0)
      }
    };
  }

  // 트랜잭션 헬퍼 (D1에서는 제한적 지원)
  async executeTransaction(queries: Array<{ query: string; params: any[] }>) {
    const results = [];
    
    for (const { query, params } of queries) {
      try {
        const result = await this.db.prepare(query).bind(...params).run();
        results.push(result);
      } catch (error) {
        console.error('Transaction query failed:', error);
        throw error;
      }
    }

    return results;
  }

  // =============================================================================
  // RFP 관련 메서드들
  // =============================================================================

  // 모든 페르소나 조회 (페이지네이션 없이)
  async getAllPersonas(): Promise<ExecutivePersona[]> {
    const result = await this.db.prepare(`
      SELECT * FROM executive_personas_data ORDER BY created_at DESC
    `).all();
    
    return result.results as ExecutivePersona[];
  }

  // RFP 문서 생성
  async createRfpDocument(rfp: {
    title: string;
    filename: string;
    file_type: string;
    file_size: number;
    content: string;
    status: string;
  }): Promise<string> {
    const id = this.generateUUID();
    const now = new Date().toISOString();

    await this.db.prepare(`
      INSERT INTO rfp_documents (
        id, title, filename, file_type, file_size, content, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, rfp.title, rfp.filename, rfp.file_type, rfp.file_size, 
      rfp.content, rfp.status, now, now
    ).run();

    return id;
  }

  // RFP 문서 조회 (ID)
  async getRfpDocumentById(id: string): Promise<any> {
    const result = await this.db.prepare(`
      SELECT * FROM rfp_documents WHERE id = ?
    `).bind(id).first();

    if (result && (result as any).analysis_result) {
      try {
        (result as any).analysis_result = JSON.parse((result as any).analysis_result);
      } catch (error) {
        console.error('Failed to parse analysis_result:', error);
        (result as any).analysis_result = null;
      }
    }

    return result;
  }

  // RFP 문서 목록 조회
  async getRfpDocuments(options: PaginationOptions = {}): Promise<{ documents: any[]; pagination: any }> {
    const baseQuery = `
      SELECT id, title, filename, file_type, file_size, status, 
             created_at, updated_at, analyzed_at, analysis_summary
      FROM rfp_documents
      WHERE 1=1
    `;

    const countQuery = `SELECT COUNT(*) as count FROM rfp_documents WHERE 1=1`;
    let params: any[] = [];

    // 검색 조건 추가 (필요시)
    if (options.search) {
      const searchCondition = this.buildSearchCondition(['title', 'filename'], options.search);
      // baseQuery += searchCondition.condition;
      // countQuery += searchCondition.condition;
      params.push(...searchCondition.params);
    }

    const result = await this.paginate(
      baseQuery, countQuery, params, 
      { ...options, sort_by: options.sort_by || 'created_at' }
    );

    return {
      documents: result.items,
      pagination: result.pagination
    };
  }

  // RFP 상태 업데이트
  async updateRfpStatus(id: string, status: string): Promise<boolean> {
    const now = new Date().toISOString();
    
    let additionalFields = '';
    const params: any[] = [status, now];

    // 상태에 따른 추가 필드 업데이트
    if (status === 'analyzed') {
      additionalFields = ', analyzed_at = ?';
      params.splice(1, 0, now); // status 다음에 analyzed_at 삽입
    }

    params.push(id); // WHERE 절용 ID

    const result = await this.db.prepare(`
      UPDATE rfp_documents 
      SET status = ?, updated_at = ?${additionalFields}
      WHERE id = ?
    `).bind(...params).run();

    return result.changes > 0;
  }

  // RFP 분석 결과 업데이트
  async updateRfpAnalysis(id: string, analysisResult: any): Promise<boolean> {
    const now = new Date().toISOString();
    
    // 분석 요약 생성
    const summary = this.generateAnalysisSummary(analysisResult);

    const result = await this.db.prepare(`
      UPDATE rfp_documents 
      SET analysis_result = ?, analysis_summary = ?, analyzed_at = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      JSON.stringify(analysisResult), 
      summary, 
      now, 
      now, 
      id
    ).run();

    return result.changes > 0;
  }

  // RFP 문서 삭제
  async deleteRfpDocument(id: string): Promise<boolean> {
    const result = await this.db.prepare(`
      DELETE FROM rfp_documents WHERE id = ?
    `).bind(id).run();

    return result.changes > 0;
  }

  // 분석 요약 생성 헬퍼
  private generateAnalysisSummary(analysisResult: any): string {
    const summaryParts = [];
    
    if (analysisResult.kpi && analysisResult.kpi.length > 0) {
      summaryParts.push(`KPI ${analysisResult.kpi.length}개`);
    }
    
    if (analysisResult.evaluation_criteria && analysisResult.evaluation_criteria.length > 0) {
      summaryParts.push(`평가기준 ${analysisResult.evaluation_criteria.length}개`);
    }
    
    if (analysisResult.technical_requirements && analysisResult.technical_requirements.length > 0) {
      summaryParts.push(`기술요건 ${analysisResult.technical_requirements.length}개`);
    }
    
    if (analysisResult.strategic_themes && analysisResult.strategic_themes.length > 0) {
      summaryParts.push(`전략테마 ${analysisResult.strategic_themes.length}개`);
    }

    return summaryParts.length > 0 ? summaryParts.join(', ') + ' 추출' : '분석 완료';
  }

  // RFP 업로드 통계
  async getRfpUploadStats() {
    const [totalCount, statusStats] = await Promise.all([
      this.db.prepare('SELECT COUNT(*) as count FROM rfp_documents').first(),
      this.db.prepare(`
        SELECT status, COUNT(*) as count 
        FROM rfp_documents 
        GROUP BY status
      `).all()
    ]);

    return {
      total_documents: (totalCount as any)?.count || 0,
      by_status: (statusStats.results as any[]) || []
    };
  }

  // =============================================================================
  // PDF 파싱 파이프라인 관련 메서드들
  // =============================================================================

  // 인제스트 작업 조회
  async getIngestJob(jobId: string) {
    const result = await this.db.prepare(`
      SELECT * FROM rfp_ingest_jobs WHERE job_id = ?
    `).bind(jobId).first();
    
    return result;
  }

  // RFP 페이지 조회
  async getRfpPages(rfpId: string) {
    const result = await this.db.prepare(`
      SELECT * FROM rfp_pages WHERE rfp_id = ? ORDER BY page_no
    `).bind(rfpId).all();
    
    return result.results;
  }

  // RFP 문서 구조 조회
  async getRfpDocumentStructure(rfpId: string) {
    const result = await this.db.prepare(`
      SELECT * FROM rfp_document_structure WHERE rfp_id = ? ORDER BY section_type
    `).bind(rfpId).all();
    
    return result.results.map((row: any) => ({
      ...row,
      normalized_data: row.normalized_data ? JSON.parse(row.normalized_data) : null
    }));
  }

  // RFP 파싱 신호 조회 (확장된 필드 포함)
  async getRfpSignalsExtended(rfpId: string) {
    // 가장 최근의 성공한 작업 ID 조회
    const latestJob = await this.db.prepare(`
      SELECT job_id FROM rfp_ingest_jobs 
      WHERE rfp_id = ? AND status = 'done'
      ORDER BY created_at DESC 
      LIMIT 1
    `).bind(rfpId).first() as any;
    
    if (!latestJob) {
      return [];
    }
    
    const result = await this.db.prepare(`
      SELECT 
        signal_id, signal_type as signal_key, signal_value,
        metadata, confidence_score as confidence, source_refs as source_span, 
        extraction_method as source_type
      FROM rfp_signals 
      WHERE job_id = ?
      ORDER BY confidence_score DESC
    `).bind(latestJob.job_id).all();
    
    return result.results.map((row: any) => ({
      ...row,
      norm_payload: row.norm_payload ? JSON.parse(row.norm_payload) : null,
      is_locked: Boolean(row.is_locked)
    }));
  }

  // 품질 메트릭 조회
  async getRfpQualityMetrics(rfpId: string) {
    const result = await this.db.prepare(`
      SELECT * FROM rfp_quality_metrics WHERE rfp_id = ? ORDER BY measured_at DESC
    `).bind(rfpId).all();
    
    return result.results.map((row: any) => ({
      ...row,
      details: row.details ? JSON.parse(row.details) : null
    }));
  }

  // 페르소나 상태 스냅샷 조회
  async getPersonaStateSnapshots(rfpId: string, personaId?: string) {
    let query = `
      SELECT ps.*, ep.name as persona_name
      FROM persona_state_snapshots ps
      JOIN executive_personas_data ep ON ps.persona_id = ep.id
      WHERE ps.rfp_id = ?
    `;
    const params: any[] = [rfpId];
    
    if (personaId) {
      query += ` AND ps.persona_id = ?`;
      params.push(personaId);
    }
    
    query += ` ORDER BY ps.applied_at DESC`;
    
    const result = await this.db.prepare(query).bind(...params).all();
    
    return result.results.map((row: any) => ({
      ...row,
      original_value: row.original_value ? JSON.parse(row.original_value) : null,
      adjusted_value: row.adjusted_value ? JSON.parse(row.adjusted_value) : null
    }));
  }

  // 매핑 규칙 조회
  async getPersonaImpactRules(enabled?: boolean) {
    let query = `SELECT * FROM persona_mapping_rules`;
    const params: any[] = [];
    
    if (enabled !== undefined) {
      query += ` WHERE active = ?`;
      params.push(enabled ? 1 : 0);
    }
    
    query += ` ORDER BY precedence ASC, source_priority ASC`;
    
    const result = await this.db.prepare(query).bind(...params).all();
    
    return result.results.map((row: any) => ({
      ...row,
      transform_payload: row.transform_payload ? JSON.parse(row.transform_payload) : null,
      enabled: Boolean(row.enabled)
    }));
  }

  // 사용자 수정사항 저장
  async saveUserCorrection(rfpId: string, correction: {
    signal_id?: string;
    original_value: string;
    corrected_value: string;
    correction_type: 'signal_value' | 'confidence' | 'classification';
    user_id?: string;
  }) {
    const correctionId = this.generateUUID();
    const now = new Date().toISOString();
    
    await this.db.prepare(`
      INSERT INTO rfp_user_corrections (
        correction_id, rfp_id, signal_id, original_value, corrected_value,
        correction_type, user_id, corrected_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      correctionId, rfpId, correction.signal_id, correction.original_value,
      correction.corrected_value, correction.correction_type, correction.user_id, now
    ).run();
    
    return correctionId;
  }

  // RFP 종합 분석 결과 조회
  async getRfpComprehensiveAnalysis(rfpId: string) {
    const [
      rfpDoc,
      pages,
      structures, 
      signals,
      metrics,
      snapshots
    ] = await Promise.all([
      this.getRfpDocumentById(rfpId),
      this.getRfpPages(rfpId),
      this.getRfpDocumentStructure(rfpId),
      this.getRfpSignalsExtended(rfpId),
      this.getRfpQualityMetrics(rfpId),
      this.getPersonaStateSnapshots(rfpId)
    ]);
    
    return {
      document: rfpDoc,
      pages: pages,
      structures: structures,
      signals: signals,
      quality_metrics: metrics,
      persona_adjustments: snapshots,
      processing_summary: {
        total_pages: (pages as any[]).length,
        total_structures: (structures as any[]).length,
        total_signals: (signals as any[]).length,
        avg_signal_confidence: (signals as any[]).length > 0 
          ? (signals as any[]).reduce((sum: number, s: any) => sum + s.confidence, 0) / (signals as any[]).length
          : 0,
        total_persona_adjustments: (snapshots as any[]).length
      }
    };
  }
}

// API 응답 헬퍼
export function createApiResponse<T>(
  success: boolean, 
  data?: T, 
  message?: string, 
  error?: string,
  pagination?: any
): ApiResponse<T> {
  const response: ApiResponse<T> = { success };
  
  if (data !== undefined) response.data = data;
  if (message) response.message = message;
  if (error) response.error = error;
  if (pagination) response.pagination = pagination;
  
  return response;
}

// 유효성 검사 헬퍼
export function validatePersona(persona: Partial<ExecutivePersona>): string[] {
  const errors: string[] = [];

  if (!persona.name?.trim()) {
    errors.push('이름은 필수 항목입니다.');
  }

  if (persona.budget_authority && (persona.budget_authority < 1 || persona.budget_authority > 10)) {
    errors.push('예산 권한은 1-10 사이의 값이어야 합니다.');
  }

  if (persona.decision_influence && (persona.decision_influence < 1 || persona.decision_influence > 10)) {
    errors.push('의사결정 영향력은 1-10 사이의 값이어야 합니다.');
  }

  if (persona.technical_expertise && (persona.technical_expertise < 1 || persona.technical_expertise > 10)) {
    errors.push('기술 전문성은 1-10 사이의 값이어야 합니다.');
  }

  if (persona.risk_tolerance && (persona.risk_tolerance < 1 || persona.risk_tolerance > 10)) {
    errors.push('위험 감수성은 1-10 사이의 값이어야 합니다.');
  }

  if (persona.innovation_openness && (persona.innovation_openness < 1 || persona.innovation_openness > 10)) {
    errors.push('혁신 개방성은 1-10 사이의 값이어야 합니다.');
  }

  if (persona.industry_experience && persona.industry_experience < 0) {
    errors.push('업계 경험은 0 이상이어야 합니다.');
  }

  return errors;
}