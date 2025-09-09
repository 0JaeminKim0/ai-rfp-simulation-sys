// LLM 기반 6대 지표 평가 통합 서비스

import { OpenAIService } from './openai-service'
import { JsonStorageService } from './json-storage'
import { PdfParserService } from './pdf-parser-service'
import type { 
  AIVirtualCustomer, 
  EvaluationScores,
  ProposalEvaluation,
  PresentationEvaluation,
  IntegratedEvaluation
} from '../types/ai-customer'

export class LLMEvaluationService {
  private openaiService?: OpenAIService
  private storage: JsonStorageService
  private pdfParser: PdfParserService

  constructor(
    openaiApiKey?: string,
    kvNamespace?: KVNamespace
  ) {
    if (openaiApiKey) {
      this.openaiService = new OpenAIService(openaiApiKey)
    }
    this.storage = new JsonStorageService(kvNamespace)
    this.pdfParser = new PdfParserService()
  }

  /**
   * 제안서 평가 실행
   */
  async evaluateProposal(
    customerId: string,
    proposalFile?: File,
    proposalText?: string
  ): Promise<{
    evaluation_id: string
    proposal_evaluation: ProposalEvaluation
    summary: any
  }> {
    
    console.log(`제안서 평가 시작: 고객 ID ${customerId}`)
    
    // AI 가상고객 조회
    const customer = await this.storage.getVirtualCustomer(customerId)
    if (!customer) {
      throw new Error('AI 가상고객을 찾을 수 없습니다')
    }
    
    // 평가 세션 생성
    const sessionId = await this.storage.createEvaluationSession(customerId, {
      session_status: 'proposal_evaluating'
    })
    
    let content = proposalText || ''
    
    // 파일이 있는 경우 텍스트 추출
    if (proposalFile && !content) {
      console.log(`제안서 파일 파싱: ${proposalFile.name}`)
      
      const fileBuffer = await proposalFile.arrayBuffer()
      const validation = this.pdfParser.validateFileType(fileBuffer, proposalFile.name)
      
      if (!validation.isValid) {
        throw new Error('지원하지 않는 파일 형식입니다')
      }
      
      if (validation.fileType === 'pdf') {
        const pdfResult = await this.pdfParser.extractTextFromPdf(fileBuffer, proposalFile.name)
        content = pdfResult.text
      } else if (validation.fileType === 'docx') {
        const docxResult = await this.pdfParser.extractTextFromDocx(fileBuffer, proposalFile.name)
        content = docxResult.text
      }
      
      console.log(`텍스트 추출 완료: ${content.length}자`)
    }
    
    if (!content || content.length < 100) {
      throw new Error('평가할 제안서 내용이 충분하지 않습니다')
    }
    
    // AI 평가 실행
    let evaluationScores: EvaluationScores
    let proposalSummary: any = null
    
    if (this.openaiService) {
      // OpenAI 실제 평가
      console.log('OpenAI 제안서 평가 실행')
      
      evaluationScores = await this.openaiService.evaluateWithRubric(
        customer,
        content,
        'proposal'
      )
      
      // 제안서 요약도 생성
      proposalSummary = await this.openaiService.summarizeProposal(content)
      
    } else {
      // 기본 평가 (시뮬레이션)
      console.log('기본 제안서 평가 실행')
      evaluationScores = this.generateMockEvaluationScores(customer)
    }
    
    // 제안서 평가 결과 생성
    const proposalEvaluation: Omit<ProposalEvaluation, 'id' | 'evaluation_date'> = {
      session_id: sessionId,
      customer_id: customerId,
      proposal_title: proposalSummary?.executive_summary?.substring(0, 100) || '제안서',
      proposal_summary: proposalSummary?.executive_summary || '제안서 요약을 생성할 수 없습니다',
      clarity_score: evaluationScores.clarity.score,
      clarity_feedback: evaluationScores.clarity.rationale,
      expertise_score: evaluationScores.expertise.score,
      expertise_feedback: evaluationScores.expertise.rationale,
      persuasion_score: evaluationScores.persuasiveness.score,
      persuasion_feedback: evaluationScores.persuasiveness.rationale,
      logic_score: evaluationScores.logic.score,
      logic_feedback: evaluationScores.logic.rationale,
      creativity_score: evaluationScores.creativity.score,
      creativity_feedback: evaluationScores.creativity.rationale,
      reliability_score: evaluationScores.credibility.score,
      reliability_feedback: evaluationScores.credibility.rationale,
      overall_score: evaluationScores.overall_score,
      weighted_score: evaluationScores.weighted_score,
      key_strengths: evaluationScores.key_strengths,
      improvement_areas: evaluationScores.priority_improvements,
      detailed_feedback: evaluationScores.overall_summary
    }
    
    // 결과 저장
    const evaluationId = await this.storage.saveProposalEvaluation(sessionId, proposalEvaluation)
    
    // 세션 상태 업데이트
    await this.storage.updateEvaluationSession(sessionId, {
      session_status: 'proposal_completed',
      proposal_evaluation_id: evaluationId
    })
    
    console.log(`제안서 평가 완료: ${evaluationId}`)
    
    return {
      evaluation_id: evaluationId,
      proposal_evaluation: {
        id: evaluationId,
        evaluation_date: new Date().toISOString(),
        ...proposalEvaluation
      },
      summary: proposalSummary
    }
  }

  /**
   * 발표 평가 실행
   */
  async evaluatePresentation(
    customerId: string,
    presentationData: {
      transcription: string
      duration_seconds?: number
      speech_rate?: number
      pause_count?: number
      filler_words?: number
    }
  ): Promise<{
    evaluation_id: string
    presentation_evaluation: PresentationEvaluation
  }> {
    
    console.log(`발표 평가 시작: 고객 ID ${customerId}`)
    
    // AI 가상고객 조회
    const customer = await this.storage.getVirtualCustomer(customerId)
    if (!customer) {
      throw new Error('AI 가상고객을 찾을 수 없습니다')
    }
    
    // 기존 세션 찾기 또는 새로 생성
    let sessionId: string
    const existingSessions = await this.findCustomerSessions(customerId)
    
    if (existingSessions.length > 0) {
      sessionId = existingSessions[0].session_id
      await this.storage.updateEvaluationSession(sessionId, {
        session_status: 'presentation_evaluating'
      })
    } else {
      sessionId = await this.storage.createEvaluationSession(customerId, {
        session_status: 'presentation_evaluating'
      })
    }
    
    const { transcription } = presentationData
    
    if (!transcription || transcription.length < 50) {
      throw new Error('평가할 발표 내용이 충분하지 않습니다')
    }
    
    // AI 평가 실행
    let evaluationScores: EvaluationScores
    
    if (this.openaiService) {
      // OpenAI 실제 평가
      console.log('OpenAI 발표 평가 실행')
      
      const additionalContext = `
발표 시간: ${presentationData.duration_seconds || 0}초
말속도: ${presentationData.speech_rate || 0} 단어/분
휴지 횟수: ${presentationData.pause_count || 0}회
군더더기어: ${presentationData.filler_words || 0}회
      `.trim()
      
      evaluationScores = await this.openaiService.evaluateWithRubric(
        customer,
        transcription,
        'presentation',
        additionalContext
      )
      
    } else {
      // 기본 평가 (시뮬레이션)
      console.log('기본 발표 평가 실행')
      evaluationScores = this.generateMockEvaluationScores(customer)
    }
    
    // 발표 평가 결과 생성
    const presentationEvaluation: Omit<PresentationEvaluation, 'id' | 'evaluation_date'> = {
      session_id: sessionId,
      customer_id: customerId,
      transcription: transcription,
      duration_seconds: presentationData.duration_seconds || 0,
      speech_rate: presentationData.speech_rate || 0,
      pause_analysis: `휴지 횟수: ${presentationData.pause_count || 0}회`,
      filler_word_count: presentationData.filler_words || 0,
      clarity_score: evaluationScores.clarity.score,
      clarity_feedback: evaluationScores.clarity.rationale,
      delivery_score: evaluationScores.expertise.score, // 전달력으로 매핑
      delivery_feedback: evaluationScores.expertise.rationale,
      engagement_score: evaluationScores.persuasiveness.score, // 몰입도로 매핑
      engagement_feedback: evaluationScores.persuasiveness.rationale,
      structure_score: evaluationScores.logic.score, // 구조성으로 매핑
      structure_feedback: evaluationScores.logic.rationale,
      confidence_score: evaluationScores.credibility.score, // 자신감으로 매핑
      confidence_feedback: evaluationScores.credibility.rationale,
      innovation_score: evaluationScores.creativity.score, // 혁신성으로 매핑
      innovation_feedback: evaluationScores.creativity.rationale,
      overall_score: evaluationScores.overall_score,
      weighted_score: evaluationScores.weighted_score,
      key_strengths: evaluationScores.key_strengths,
      improvement_areas: evaluationScores.priority_improvements,
      detailed_feedback: evaluationScores.overall_summary
    }
    
    // 결과 저장
    const evaluationId = await this.storage.savePresentationEvaluation(sessionId, presentationEvaluation)
    
    // 세션 상태 업데이트
    await this.storage.updateEvaluationSession(sessionId, {
      session_status: 'presentation_completed',
      presentation_evaluation_id: evaluationId
    })
    
    console.log(`발표 평가 완료: ${evaluationId}`)
    
    return {
      evaluation_id: evaluationId,
      presentation_evaluation: {
        id: evaluationId,
        evaluation_date: new Date().toISOString(),
        ...presentationEvaluation
      }
    }
  }

  /**
   * 통합 평가 결과 생성
   */
  async generateIntegratedResult(
    sessionId: string
  ): Promise<{
    integrated_evaluation: IntegratedEvaluation
    complete_results: any
  }> {
    
    console.log(`통합 평가 시작: 세션 ID ${sessionId}`)
    
    // 세션의 모든 평가 결과 조회
    const sessionResults = await this.storage.getSessionEvaluations(sessionId)
    
    if (!sessionResults.proposal_evaluation || !sessionResults.presentation_evaluation) {
      throw new Error('제안서와 발표 평가가 모두 완료되어야 통합 결과를 생성할 수 있습니다')
    }
    
    const { proposal_evaluation, presentation_evaluation, customer } = sessionResults
    
    // 6대 지표별 통합 점수 계산 (제안서 70%, 발표 30%)
    const integratedScores = {
      clarity: Math.round(proposal_evaluation.clarity_score * 0.7 + presentation_evaluation.clarity_score * 0.3),
      expertise: Math.round(proposal_evaluation.expertise_score * 0.7 + presentation_evaluation.delivery_score * 0.3),
      persuasiveness: Math.round(proposal_evaluation.persuasion_score * 0.7 + presentation_evaluation.engagement_score * 0.3),
      logic: Math.round(proposal_evaluation.logic_score * 0.7 + presentation_evaluation.structure_score * 0.3),
      creativity: Math.round(proposal_evaluation.creativity_score * 0.7 + presentation_evaluation.innovation_score * 0.3),
      credibility: Math.round(proposal_evaluation.reliability_score * 0.7 + presentation_evaluation.confidence_score * 0.3)
    }
    
    // 최종 통합 점수
    const finalScore = Math.round(proposal_evaluation.overall_score * 0.7 + presentation_evaluation.overall_score * 0.3)
    
    // 종합 피드백 생성
    let comprehensiveFeedback = ''
    
    if (this.openaiService && customer) {
      // OpenAI로 종합 피드백 생성
      const feedbackPrompt = `
다음 평가 결과를 바탕으로 종합적인 피드백을 제공해주세요:

고객: ${customer.company_name} ${customer.customer_type}
프로젝트: ${customer.project_name}

제안서 평가 (70%):
- 전체 점수: ${proposal_evaluation.overall_score}점
- 주요 강점: ${proposal_evaluation.key_strengths?.join(', ')}
- 개선 영역: ${proposal_evaluation.improvement_areas?.join(', ')}

발표 평가 (30%):
- 전체 점수: ${presentation_evaluation.overall_score}점  
- 주요 강점: ${presentation_evaluation.key_strengths?.join(', ')}
- 개선 영역: ${presentation_evaluation.improvement_areas?.join(', ')}

최종 통합 점수: ${finalScore}점

고객의 우선순위 (${customer.integrated_persona.top3_priorities.join(', ')})를 고려하여 
300자 내외의 종합 피드백을 작성해주세요.
      `
      
      try {
        const response = await this.openaiService.openai.chat.completions.create({
          model: "gpt-4-turbo-preview",
          messages: [{ role: "user", content: feedbackPrompt }],
          temperature: 0.3,
          max_tokens: 500
        })
        
        comprehensiveFeedback = response.choices[0].message.content || '종합 피드백을 생성할 수 없습니다'
        
      } catch (error) {
        console.error('종합 피드백 생성 오류:', error)
        comprehensiveFeedback = '종합 피드백을 생성할 수 없습니다'
      }
    } else {
      // 기본 피드백
      comprehensiveFeedback = `제안서 ${proposal_evaluation.overall_score}점과 발표 ${presentation_evaluation.overall_score}점을 종합하여 최종 ${finalScore}점을 획득하셨습니다. 전반적으로 균형잡힌 제안이었으나, 추가적인 개선을 통해 더 나은 결과를 얻을 수 있을 것입니다.`
    }
    
    // 통합 평가 결과 생성
    const integratedEvaluation: Omit<IntegratedEvaluation, 'id' | 'evaluation_date'> = {
      session_id: sessionId,
      customer_id: customer?.customer_id || '',
      proposal_score: proposal_evaluation.overall_score,
      presentation_score: presentation_evaluation.overall_score,
      final_score: finalScore,
      integrated_clarity: integratedScores.clarity,
      integrated_expertise: integratedScores.expertise,  
      integrated_persuasiveness: integratedScores.persuasiveness,
      integrated_logic: integratedScores.logic,
      integrated_creativity: integratedScores.creativity,
      integrated_credibility: integratedScores.credibility,
      comprehensive_feedback: comprehensiveFeedback,
      recommendation_priority: [
        ...proposal_evaluation.improvement_areas?.slice(0, 2) || [],
        ...presentation_evaluation.improvement_areas?.slice(0, 1) || []
      ],
      overall_strengths: [
        ...proposal_evaluation.key_strengths?.slice(0, 2) || [],
        ...presentation_evaluation.key_strengths?.slice(0, 1) || []
      ]
    }
    
    // 결과 저장
    const integrationId = await this.storage.saveIntegratedEvaluation(sessionId, integratedEvaluation)
    
    // 세션 상태 최종 업데이트
    await this.storage.updateEvaluationSession(sessionId, {
      session_status: 'completed',
      integrated_evaluation_id: integrationId
    })
    
    console.log(`통합 평가 완료: ${integrationId}`)
    
    return {
      integrated_evaluation: {
        id: integrationId,
        evaluation_date: new Date().toISOString(),
        ...integratedEvaluation
      },
      complete_results: {
        session: sessionResults.session,
        customer: sessionResults.customer,
        proposal_evaluation: sessionResults.proposal_evaluation,
        presentation_evaluation: sessionResults.presentation_evaluation,
        integrated_evaluation: {
          id: integrationId,
          evaluation_date: new Date().toISOString(),
          ...integratedEvaluation
        }
      }
    }
  }

  /**
   * 고객의 세션 찾기
   */
  private async findCustomerSessions(customerId: string): Promise<any[]> {
    // 간단한 구현 - 실제로는 더 정교한 검색 필요
    return []
  }

  /**
   * 모의 평가 점수 생성 (LLM 없을 때)
   */
  private generateMockEvaluationScores(customer: AIVirtualCustomer): EvaluationScores {
    // 고객 우선순위에 따른 가중치 적용한 모의 점수
    const priorities = customer.integrated_persona.top3_priorities
    
    const baseScores = {
      clarity: 3 + Math.floor(Math.random() * 2), // 3-4점
      expertise: 3 + Math.floor(Math.random() * 2),
      persuasiveness: 3 + Math.floor(Math.random() * 2),
      logic: 3 + Math.floor(Math.random() * 2), 
      creativity: 2 + Math.floor(Math.random() * 2), // 2-3점 (보수적)
      credibility: 4 + Math.floor(Math.random() * 1) // 4점 (높은 신뢰도)
    }
    
    return {
      clarity: {
        score: baseScores.clarity,
        rationale: `명확성 ${baseScores.clarity}점 - 기본 평가 결과`,
        improvement_suggestions: '구체적인 개선 방안 제시 필요'
      },
      expertise: {
        score: baseScores.expertise,
        rationale: `전문성 ${baseScores.expertise}점 - 기본 평가 결과`,
        improvement_suggestions: '전문성 강화 필요'
      },
      persuasiveness: {
        score: baseScores.persuasiveness,
        rationale: `설득력 ${baseScores.persuasiveness}점 - 기본 평가 결과`,
        improvement_suggestions: '설득력 개선 필요'
      },
      logic: {
        score: baseScores.logic,
        rationale: `논리성 ${baseScores.logic}점 - 기본 평가 결과`,
        improvement_suggestions: '논리 구조 보완 필요'
      },
      creativity: {
        score: baseScores.creativity,
        rationale: `창의성 ${baseScores.creativity}점 - 기본 평가 결과`,
        improvement_suggestions: '창의적 요소 추가 필요'
      },
      credibility: {
        score: baseScores.credibility,
        rationale: `신뢰성 ${baseScores.credibility}점 - 기본 평가 결과`,
        improvement_suggestions: '레퍼런스 보강 필요'
      },
      overall_score: Math.round((Object.values(baseScores).reduce((sum, score) => sum + score, 0) / 6) * 20),
      weighted_score: Math.round((Object.values(baseScores).reduce((sum, score) => sum + score, 0) / 6) * 20),
      evaluation_date: new Date().toISOString(),
      overall_summary: '기본 평가 모드로 생성된 결과입니다',
      key_strengths: ['전반적인 완성도', '기본 요구사항 충족'],
      priority_improvements: ['구체성 강화', '차별화 요소 추가', '근거 보강']
    }
  }
}