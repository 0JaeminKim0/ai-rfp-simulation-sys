// 데이터베이스 서비스 클래스

import type { 
  AIVirtualCustomer,
  EvaluationSession,
  ProposalEvaluation,
  PresentationEvaluation,
  IntegratedEvaluation 
} from '../types/ai-customer'

export class DatabaseService {
  private db: D1Database

  constructor(db: D1Database) {
    this.db = db
  }

  // UUID 생성
  generateUUID(): string {
    return crypto.randomUUID()
  }

  // === AI 가상고객 관리 ===
  
  async getAllCustomers(): Promise<AIVirtualCustomer[]> {
    const result = await this.db.prepare(`
      SELECT * FROM ai_virtual_customers 
      WHERE status = 'active' 
      ORDER BY created_at DESC
    `).all()
    
    return (result.results as any[]).map(row => ({
      ...row,
      deep_research_data: JSON.parse(row.deep_research_data || '{}'),
      rfp_analysis_data: JSON.parse(row.rfp_analysis_data || '{}'),
      combined_attributes: JSON.parse(row.combined_attributes || '{}'),
      top3_priorities: JSON.parse(row.top3_priorities || '[]')
    }))
  }

  async getCustomerById(id: string): Promise<AIVirtualCustomer | null> {
    const result = await this.db.prepare(`
      SELECT * FROM ai_virtual_customers WHERE id = ?
    `).bind(id).first()

    if (!result) return null

    return {
      ...result,
      deep_research_data: JSON.parse((result as any).deep_research_data || '{}'),
      rfp_analysis_data: JSON.parse((result as any).rfp_analysis_data || '{}'),
      combined_attributes: JSON.parse((result as any).combined_attributes || '{}'),
      top3_priorities: JSON.parse((result as any).top3_priorities || '[]')
    } as AIVirtualCustomer
  }

  async saveCustomer(customer: Omit<AIVirtualCustomer, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const id = this.generateUUID()
    const now = new Date().toISOString()

    await this.db.prepare(`
      INSERT INTO ai_virtual_customers (
        id, name, company_name, department, version, status,
        persona_summary, top3_priorities, decision_making_style,
        deep_research_data, rfp_analysis_data, combined_attributes,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      customer.name,
      customer.company_name,
      customer.department || '',
      customer.version,
      customer.status,
      customer.persona_summary,
      JSON.stringify(customer.top3_priorities),
      customer.decision_making_style,
      JSON.stringify(customer.deep_research_data),
      JSON.stringify(customer.rfp_analysis_data),
      JSON.stringify(customer.combined_attributes),
      now,
      now
    ).run()

    return id
  }

  // === 평가 세션 관리 ===

  async getAllSessions(): Promise<EvaluationSession[]> {
    const result = await this.db.prepare(`
      SELECT * FROM evaluation_sessions 
      ORDER BY created_at DESC
    `).all()
    
    return (result.results as any[]).map(row => ({
      ...row,
      progress: {
        customer_completed: Boolean(row.customer_completed),
        proposal_completed: Boolean(row.proposal_completed),
        presentation_completed: Boolean(row.presentation_completed),
        results_completed: Boolean(row.results_completed)
      }
    }))
  }

  async saveSession(session: Omit<EvaluationSession, 'created_at' | 'updated_at'>): Promise<string> {
    const now = new Date().toISOString()

    await this.db.prepare(`
      INSERT INTO evaluation_sessions (
        id, session_name, customer_id, current_stage,
        customer_completed, proposal_completed, presentation_completed, results_completed,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      session.id,
      session.session_name,
      session.customer_id || '',
      session.current_stage,
      session.progress.customer_completed,
      session.progress.proposal_completed,
      session.progress.presentation_completed,
      session.progress.results_completed,
      now,
      now
    ).run()

    return session.id
  }

  async updateSession(id: string, updates: Partial<EvaluationSession>): Promise<void> {
    const now = new Date().toISOString()
    
    if (updates.progress) {
      await this.db.prepare(`
        UPDATE evaluation_sessions 
        SET current_stage = ?, customer_completed = ?, proposal_completed = ?, 
            presentation_completed = ?, results_completed = ?, updated_at = ?
        WHERE id = ?
      `).bind(
        updates.current_stage || '',
        updates.progress.customer_completed,
        updates.progress.proposal_completed,
        updates.progress.presentation_completed,
        updates.progress.results_completed,
        now,
        id
      ).run()
    }
  }

  // === 제안서 평가 관리 ===

  async saveProposalEvaluation(evaluation: Omit<ProposalEvaluation, 'id' | 'evaluation_date'>): Promise<string> {
    const id = this.generateUUID()
    const now = new Date().toISOString()

    await this.db.prepare(`
      INSERT INTO proposal_evaluations (
        id, customer_id, proposal_title, proposal_file_path,
        clarity_score, expertise_score, persuasiveness_score, 
        logic_score, creativity_score, credibility_score,
        clarity_comment, expertise_comment, persuasiveness_comment,
        logic_comment, creativity_comment, credibility_comment,
        overall_comment, total_score, evaluation_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      evaluation.customer_id,
      evaluation.proposal_title,
      evaluation.proposal_file_path || '',
      evaluation.scores.clarity.score,
      evaluation.scores.expertise.score,
      evaluation.scores.persuasiveness.score,
      evaluation.scores.logic.score,
      evaluation.scores.creativity.score,
      evaluation.scores.credibility.score,
      evaluation.scores.clarity.comment,
      evaluation.scores.expertise.comment,
      evaluation.scores.persuasiveness.comment,
      evaluation.scores.logic.comment,
      evaluation.scores.creativity.comment,
      evaluation.scores.credibility.comment,
      evaluation.overall_comment,
      evaluation.total_score,
      now
    ).run()

    return id
  }

  async getProposalEvaluation(id: string): Promise<ProposalEvaluation | null> {
    const result = await this.db.prepare(`
      SELECT * FROM proposal_evaluations WHERE id = ?
    `).bind(id).first()

    if (!result) return null

    const row = result as any
    return {
      id: row.id,
      customer_id: row.customer_id,
      proposal_title: row.proposal_title,
      proposal_file_path: row.proposal_file_path,
      scores: {
        clarity: { score: row.clarity_score, comment: row.clarity_comment },
        expertise: { score: row.expertise_score, comment: row.expertise_comment },
        persuasiveness: { score: row.persuasiveness_score, comment: row.persuasiveness_comment },
        logic: { score: row.logic_score, comment: row.logic_comment },
        creativity: { score: row.creativity_score, comment: row.creativity_comment },
        credibility: { score: row.credibility_score, comment: row.credibility_comment }
      },
      overall_comment: row.overall_comment,
      total_score: row.total_score,
      evaluation_date: row.evaluation_date
    }
  }

  // === 발표 평가 관리 ===

  async savePresentationEvaluation(evaluation: Omit<PresentationEvaluation, 'id' | 'evaluation_date'>): Promise<string> {
    const id = this.generateUUID()
    const now = new Date().toISOString()

    await this.db.prepare(`
      INSERT INTO presentation_evaluations (
        id, customer_id, presentation_title, audio_file_path, transcript_text,
        clarity_score, expertise_score, persuasiveness_score, 
        logic_score, creativity_score, credibility_score,
        clarity_comment, expertise_comment, persuasiveness_comment,
        logic_comment, creativity_comment, credibility_comment,
        speech_speed, filler_words_count, pause_frequency,
        overall_comment, total_score, evaluation_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      evaluation.customer_id,
      evaluation.presentation_title,
      evaluation.audio_file_path || '',
      evaluation.transcript_text || '',
      evaluation.scores.clarity.score,
      evaluation.scores.expertise.score,
      evaluation.scores.persuasiveness.score,
      evaluation.scores.logic.score,
      evaluation.scores.creativity.score,
      evaluation.scores.credibility.score,
      evaluation.scores.clarity.comment,
      evaluation.scores.expertise.comment,
      evaluation.scores.persuasiveness.comment,
      evaluation.scores.logic.comment,
      evaluation.scores.creativity.comment,
      evaluation.scores.credibility.comment,
      evaluation.speech_metrics.speech_speed,
      evaluation.speech_metrics.filler_words_count,
      evaluation.speech_metrics.pause_frequency,
      evaluation.overall_comment,
      evaluation.total_score,
      now
    ).run()

    return id
  }

  async getPresentationEvaluation(id: string): Promise<PresentationEvaluation | null> {
    const result = await this.db.prepare(`
      SELECT * FROM presentation_evaluations WHERE id = ?
    `).bind(id).first()

    if (!result) return null

    const row = result as any
    return {
      id: row.id,
      customer_id: row.customer_id,
      presentation_title: row.presentation_title,
      audio_file_path: row.audio_file_path,
      transcript_text: row.transcript_text,
      scores: {
        clarity: { score: row.clarity_score, comment: row.clarity_comment },
        expertise: { score: row.expertise_score, comment: row.expertise_comment },
        persuasiveness: { score: row.persuasiveness_score, comment: row.persuasiveness_comment },
        logic: { score: row.logic_score, comment: row.logic_comment },
        creativity: { score: row.creativity_score, comment: row.creativity_comment },
        credibility: { score: row.credibility_score, comment: row.credibility_comment }
      },
      speech_metrics: {
        speech_speed: row.speech_speed,
        filler_words_count: row.filler_words_count,
        pause_frequency: row.pause_frequency
      },
      overall_comment: row.overall_comment,
      total_score: row.total_score,
      evaluation_date: row.evaluation_date
    }
  }

  // === 통합 결과 관리 ===

  async saveIntegratedEvaluation(evaluation: Omit<IntegratedEvaluation, 'id' | 'created_at'>): Promise<string> {
    const id = this.generateUUID()
    const now = new Date().toISOString()

    await this.db.prepare(`
      INSERT INTO integrated_evaluations (
        id, customer_id, proposal_evaluation_id, presentation_evaluation_id,
        project_title, final_clarity_score, final_expertise_score, 
        final_persuasiveness_score, final_logic_score, final_creativity_score, 
        final_credibility_score, final_total_score,
        strengths, improvements, final_summary, radar_chart_data, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      evaluation.customer_id,
      evaluation.proposal_evaluation_id || '',
      evaluation.presentation_evaluation_id || '',
      evaluation.project_title,
      evaluation.final_scores.clarity,
      evaluation.final_scores.expertise,
      evaluation.final_scores.persuasiveness,
      evaluation.final_scores.logic,
      evaluation.final_scores.creativity,
      evaluation.final_scores.credibility,
      evaluation.final_scores.total,
      evaluation.feedback.strengths,
      evaluation.feedback.improvements,
      evaluation.feedback.final_summary,
      JSON.stringify(evaluation.radar_chart_data),
      now
    ).run()

    return id
  }


}