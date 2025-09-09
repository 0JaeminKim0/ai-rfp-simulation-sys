// JSON 기반 데이터 저장소 서비스 - Cloudflare KV + 로컬 스토리지

import type { 
  AIVirtualCustomer, 
  EvaluationSession, 
  ProposalEvaluation, 
  PresentationEvaluation, 
  IntegratedEvaluation 
} from '../types/ai-customer'

export class JsonStorageService {
  private kvNamespace?: KVNamespace
  private localCache: Map<string, any> = new Map()
  
  constructor(kvNamespace?: KVNamespace) {
    this.kvNamespace = kvNamespace
  }

  // =====================================================
  // AI 가상고객 관리
  // =====================================================

  /**
   * AI 가상고객 저장
   */
  async saveVirtualCustomer(customer: AIVirtualCustomer): Promise<string> {
    const customerId = customer.id || customer.customer_id || crypto.randomUUID()
    const customerWithId = { ...customer, id: customerId, customer_id: customerId }
    
    const key = `customer:${customerId}`
    const data = {
      ...customerWithId,
      updated_at: new Date().toISOString()
    }
    
    try {
      // KV 스토리지에 저장
      if (this.kvNamespace) {
        await this.kvNamespace.put(key, JSON.stringify(data), {
          metadata: {
            type: 'virtual_customer',
            company: customer.company_name,
            project: customer.project_name,
            customer_type: customer.customer_type
          }
        })
      }
      
      // 로컬 캐시에도 저장
      this.localCache.set(key, data)
      
      console.log(`AI 가상고객 저장 완료: ${customerId}`)
      return customerId
      
    } catch (error) {
      console.error('AI 가상고객 저장 실패:', error)
      throw new Error(`가상고객 저장 실패: ${error.message}`)
    }
  }

  /**
   * AI 가상고객 조회
   */
  async getVirtualCustomer(customerId: string): Promise<AIVirtualCustomer | null> {
    const key = `customer:${customerId}`
    
    try {
      // 로컬 캐시 확인
      if (this.localCache.has(key)) {
        return this.localCache.get(key)
      }
      
      // KV 스토리지에서 조회
      if (this.kvNamespace) {
        const data = await this.kvNamespace.get(key, 'json')
        if (data) {
          this.localCache.set(key, data) // 캐시에 저장
          return data as AIVirtualCustomer
        }
      }
      
      return null
      
    } catch (error) {
      console.error('AI 가상고객 조회 실패:', error)
      return null
    }
  }

  /**
   * 모든 AI 가상고객 조회 (간단한 목록)
   */
  async getAllVirtualCustomers(): Promise<AIVirtualCustomer[]> {
    const result = await this.listVirtualCustomers(100) // 최대 100개까지
    return result.customers
  }

  /**
   * AI 가상고객 목록 조회
   */
  async listVirtualCustomers(
    limit: number = 50, 
    cursor?: string
  ): Promise<{
    customers: AIVirtualCustomer[]
    cursor?: string
    hasMore: boolean
  }> {
    
    try {
      if (!this.kvNamespace) {
        // 로컬 캐시에서만 조회
        const customers = Array.from(this.localCache.entries())
          .filter(([key]) => key.startsWith('customer:'))
          .map(([, value]) => value as AIVirtualCustomer)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, limit)
        
        return {
          customers,
          hasMore: false
        }
      }
      
      // KV 스토리지에서 조회
      const listResult = await this.kvNamespace.list({
        prefix: 'customer:',
        limit: limit,
        cursor: cursor
      })
      
      const customers: AIVirtualCustomer[] = []
      
      for (const key of listResult.keys) {
        const data = await this.kvNamespace.get(key.name, 'json')
        if (data) {
          customers.push(data as AIVirtualCustomer)
        }
      }
      
      // 생성일 기준 내림차순 정렬
      customers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
      return {
        customers,
        cursor: listResult.cursor,
        hasMore: !listResult.list_complete
      }
      
    } catch (error) {
      console.error('AI 가상고객 목록 조회 실패:', error)
      return { customers: [], hasMore: false }
    }
  }

  /**
   * AI 가상고객 검색
   */
  async searchVirtualCustomers(query: string): Promise<AIVirtualCustomer[]> {
    const queryLower = query.toLowerCase()
    
    try {
      const { customers } = await this.listVirtualCustomers(100)
      
      return customers.filter(customer => 
        customer.company_name?.toLowerCase().includes(queryLower) ||
        customer.project_name?.toLowerCase().includes(queryLower) ||
        customer.customer_type?.toLowerCase().includes(queryLower) ||
        customer.integrated_persona?.persona_summary?.toLowerCase().includes(queryLower)
      )
      
    } catch (error) {
      console.error('AI 가상고객 검색 실패:', error)
      return []
    }
  }

  // =====================================================
  // 평가 세션 관리
  // =====================================================

  /**
   * 평가 세션 생성
   */
  async createEvaluationSession(
    customerId: string,
    sessionData?: Partial<EvaluationSession>
  ): Promise<string> {
    
    const sessionId = crypto.randomUUID()
    const session: EvaluationSession = {
      session_id: sessionId,
      customer_id: customerId,
      session_status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...sessionData
    }
    
    const key = `session:${sessionId}`
    
    try {
      if (this.kvNamespace) {
        await this.kvNamespace.put(key, JSON.stringify(session), {
          metadata: {
            type: 'evaluation_session',
            customer_id: customerId,
            status: session.session_status
          }
        })
      }
      
      this.localCache.set(key, session)
      
      console.log(`평가 세션 생성 완료: ${sessionId}`)
      return sessionId
      
    } catch (error) {
      console.error('평가 세션 생성 실패:', error)
      throw new Error(`세션 생성 실패: ${error.message}`)
    }
  }

  /**
   * 평가 세션 조회
   */
  async getEvaluationSession(sessionId: string): Promise<EvaluationSession | null> {
    const key = `session:${sessionId}`
    
    try {
      if (this.localCache.has(key)) {
        return this.localCache.get(key)
      }
      
      if (this.kvNamespace) {
        const data = await this.kvNamespace.get(key, 'json')
        if (data) {
          this.localCache.set(key, data)
          return data as EvaluationSession
        }
      }
      
      return null
      
    } catch (error) {
      console.error('평가 세션 조회 실패:', error)
      return null
    }
  }

  /**
   * 평가 세션 업데이트
   */
  async updateEvaluationSession(
    sessionId: string, 
    updates: Partial<EvaluationSession>
  ): Promise<boolean> {
    
    try {
      const existing = await this.getEvaluationSession(sessionId)
      if (!existing) {
        throw new Error('세션을 찾을 수 없습니다')
      }
      
      const updated = {
        ...existing,
        ...updates,
        updated_at: new Date().toISOString()
      }
      
      const key = `session:${sessionId}`
      
      if (this.kvNamespace) {
        await this.kvNamespace.put(key, JSON.stringify(updated))
      }
      
      this.localCache.set(key, updated)
      
      return true
      
    } catch (error) {
      console.error('평가 세션 업데이트 실패:', error)
      return false
    }
  }

  // =====================================================
  // 평가 결과 저장
  // =====================================================

  /**
   * 제안서 평가 결과 저장
   */
  async saveProposalEvaluation(
    sessionId: string,
    evaluation: Omit<ProposalEvaluation, 'id' | 'evaluation_date'>
  ): Promise<string> {
    
    const evaluationId = crypto.randomUUID()
    const evaluationData: ProposalEvaluation = {
      id: evaluationId,
      session_id: sessionId,
      evaluation_date: new Date().toISOString(),
      ...evaluation
    }
    
    const key = `proposal_eval:${evaluationId}`
    
    try {
      if (this.kvNamespace) {
        await this.kvNamespace.put(key, JSON.stringify(evaluationData), {
          metadata: {
            type: 'proposal_evaluation',
            session_id: sessionId,
            overall_score: evaluation.overall_score
          }
        })
      }
      
      this.localCache.set(key, evaluationData)
      
      console.log(`제안서 평가 저장 완료: ${evaluationId}`)
      return evaluationId
      
    } catch (error) {
      console.error('제안서 평가 저장 실패:', error)
      throw new Error(`제안서 평가 저장 실패: ${error.message}`)
    }
  }

  /**
   * 발표 평가 결과 저장
   */
  async savePresentationEvaluation(
    sessionId: string,
    evaluation: Omit<PresentationEvaluation, 'id' | 'evaluation_date'>
  ): Promise<string> {
    
    const evaluationId = crypto.randomUUID()
    const evaluationData: PresentationEvaluation = {
      id: evaluationId,
      session_id: sessionId,
      evaluation_date: new Date().toISOString(),
      ...evaluation
    }
    
    const key = `presentation_eval:${evaluationId}`
    
    try {
      if (this.kvNamespace) {
        await this.kvNamespace.put(key, JSON.stringify(evaluationData), {
          metadata: {
            type: 'presentation_evaluation',
            session_id: sessionId,
            overall_score: evaluation.overall_score
          }
        })
      }
      
      this.localCache.set(key, evaluationData)
      
      console.log(`발표 평가 저장 완료: ${evaluationId}`)
      return evaluationId
      
    } catch (error) {
      console.error('발표 평가 저장 실패:', error)
      throw new Error(`발표 평가 저장 실패: ${error.message}`)
    }
  }

  /**
   * 통합 평가 결과 저장
   */
  async saveIntegratedEvaluation(
    sessionId: string,
    evaluation: Omit<IntegratedEvaluation, 'id' | 'evaluation_date'>
  ): Promise<string> {
    
    const evaluationId = crypto.randomUUID()
    const evaluationData: IntegratedEvaluation = {
      id: evaluationId,
      session_id: sessionId,
      evaluation_date: new Date().toISOString(),
      ...evaluation
    }
    
    const key = `integrated_eval:${evaluationId}`
    
    try {
      if (this.kvNamespace) {
        await this.kvNamespace.put(key, JSON.stringify(evaluationData), {
          metadata: {
            type: 'integrated_evaluation',
            session_id: sessionId,
            final_score: evaluation.final_score
          }
        })
      }
      
      this.localCache.set(key, evaluationData)
      
      console.log(`통합 평가 저장 완료: ${evaluationId}`)
      return evaluationId
      
    } catch (error) {
      console.error('통합 평가 저장 실패:', error)
      throw new Error(`통합 평가 저장 실패: ${error.message}`)
    }
  }

  // =====================================================
  // 평가 결과 조회
  // =====================================================

  /**
   * 세션별 모든 평가 결과 조회
   */
  async getSessionEvaluations(sessionId: string): Promise<{
    session: EvaluationSession | null
    customer: AIVirtualCustomer | null
    proposal_evaluation: ProposalEvaluation | null
    presentation_evaluation: PresentationEvaluation | null
    integrated_evaluation: IntegratedEvaluation | null
  }> {
    
    try {
      // 세션 정보 조회
      const session = await this.getEvaluationSession(sessionId)
      if (!session) {
        return {
          session: null,
          customer: null,
          proposal_evaluation: null,
          presentation_evaluation: null,
          integrated_evaluation: null
        }
      }
      
      // 고객 정보 조회
      const customer = await this.getVirtualCustomer(session.customer_id)
      
      // 평가 결과들 조회
      const [proposalEval, presentationEval, integratedEval] = await Promise.all([
        this.findEvaluationBySession(sessionId, 'proposal'),
        this.findEvaluationBySession(sessionId, 'presentation'),
        this.findEvaluationBySession(sessionId, 'integrated')
      ])
      
      return {
        session,
        customer,
        proposal_evaluation: proposalEval,
        presentation_evaluation: presentationEval,
        integrated_evaluation: integratedEval
      }
      
    } catch (error) {
      console.error('세션 평가 결과 조회 실패:', error)
      return {
        session: null,
        customer: null,
        proposal_evaluation: null,
        presentation_evaluation: null,
        integrated_evaluation: null
      }
    }
  }

  /**
   * 특정 타입의 평가 결과 찾기
   */
  private async findEvaluationBySession(
    sessionId: string, 
    type: 'proposal' | 'presentation' | 'integrated'
  ): Promise<any> {
    
    const prefix = `${type}_eval:`
    
    try {
      // 로컬 캐시 검색
      for (const [key, value] of this.localCache.entries()) {
        if (key.startsWith(prefix) && value.session_id === sessionId) {
          return value
        }
      }
      
      // KV 스토리지 검색
      if (this.kvNamespace) {
        const listResult = await this.kvNamespace.list({
          prefix: prefix,
          limit: 100
        })
        
        for (const key of listResult.keys) {
          const data = await this.kvNamespace.get(key.name, 'json')
          if (data && data.session_id === sessionId) {
            return data
          }
        }
      }
      
      return null
      
    } catch (error) {
      console.error(`${type} 평가 결과 검색 실패:`, error)
      return null
    }
  }

  // =====================================================
  // 데이터 관리
  // =====================================================

  /**
   * 데이터 백업
   */
  async backupData(): Promise<{
    customers: AIVirtualCustomer[]
    sessions: EvaluationSession[]
    evaluations: any[]
    backup_timestamp: string
  }> {
    
    try {
      const customers = (await this.listVirtualCustomers(1000)).customers
      
      const sessions: EvaluationSession[] = []
      const evaluations: any[] = []
      
      // 로컬 캐시에서 세션과 평가 데이터 수집
      for (const [key, value] of this.localCache.entries()) {
        if (key.startsWith('session:')) {
          sessions.push(value)
        } else if (key.includes('_eval:')) {
          evaluations.push(value)
        }
      }
      
      const backupData = {
        customers,
        sessions,
        evaluations,
        backup_timestamp: new Date().toISOString()
      }
      
      // 백업 파일로 저장
      if (this.kvNamespace) {
        const backupKey = `backup:${Date.now()}`
        await this.kvNamespace.put(backupKey, JSON.stringify(backupData), {
          metadata: {
            type: 'data_backup',
            customers_count: customers.length,
            sessions_count: sessions.length,
            evaluations_count: evaluations.length
          }
        })
      }
      
      console.log(`데이터 백업 완료: 고객 ${customers.length}개, 세션 ${sessions.length}개, 평가 ${evaluations.length}개`)
      
      return backupData
      
    } catch (error) {
      console.error('데이터 백업 실패:', error)
      throw new Error(`데이터 백업 실패: ${error.message}`)
    }
  }

  /**
   * 캐시 정리
   */
  clearCache(): void {
    this.localCache.clear()
    console.log('로컬 캐시 정리 완료')
  }

  // =====================================================
  // 세션 관리
  // =====================================================

  /**
   * 세션 저장
   */
  async saveSession(session: EvaluationSession): Promise<string> {
    const sessionId = session.id || crypto.randomUUID()
    const sessionWithId = { ...session, id: sessionId }
    
    const key = `session:${sessionId}`
    const sessionData = {
      ...sessionWithId,
      updated_at: new Date().toISOString()
    }
    
    try {
      // KV 스토리지에 저장
      if (this.kvNamespace) {
        await this.kvNamespace.put(key, JSON.stringify(sessionData), {
          metadata: {
            type: 'evaluation_session',
            session_id: sessionId,
            created_at: sessionData.created_at
          }
        })
      }
      
      // 로컬 캐시에 저장
      this.localCache.set(key, sessionData)
      
      console.log(`세션 저장 완료: ${sessionId}`)
      return sessionId
      
    } catch (error) {
      console.error('세션 저장 실패:', error)
      throw new Error(`세션 저장 실패: ${error.message}`)
    }
  }



  /**
   * 모든 세션 조회
   */
  async getAllSessions(): Promise<EvaluationSession[]> {
    try {
      const sessions: EvaluationSession[] = []
      
      // 로컬 캐시에서 조회
      for (const [key, value] of this.localCache.entries()) {
        if (key.startsWith('session:')) {
          sessions.push(value as EvaluationSession)
        }
      }
      
      // KV 스토리지에서 조회 (로컬 캐시에 없는 데이터)
      if (this.kvNamespace) {
        const listResult = await this.kvNamespace.list({
          prefix: 'session:',
          limit: 100
        })
        
        for (const key of listResult.keys) {
          if (!this.localCache.has(key.name)) {
            const data = await this.kvNamespace.get(key.name, 'json')
            if (data) {
              sessions.push(data as EvaluationSession)
              this.localCache.set(key.name, data) // 캐시에 저장
            }
          }
        }
      }
      
      // 생성일 기준 내림차순 정렬
      sessions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
      return sessions
      
    } catch (error) {
      console.error('세션 목록 조회 실패:', error)
      return []
    }
  }

  /**
   * 데이터 통계
   */
  async getDataStats(): Promise<{
    customers_count: number
    sessions_count: number
    evaluations_count: number
    cache_size: number
    storage_type: 'kv' | 'cache_only'
  }> {
    
    try {
      const { customers } = await this.listVirtualCustomers(1000)
      
      let sessionsCount = 0
      let evaluationsCount = 0
      
      for (const [key] of this.localCache.entries()) {
        if (key.startsWith('session:')) {
          sessionsCount++
        } else if (key.includes('_eval:')) {
          evaluationsCount++
        }
      }
      
      return {
        customers_count: customers.length,
        sessions_count: sessionsCount,
        evaluations_count: evaluationsCount,
        cache_size: this.localCache.size,
        storage_type: this.kvNamespace ? 'kv' : 'cache_only'
      }
      
    } catch (error) {
      console.error('데이터 통계 조회 실패:', error)
      return {
        customers_count: 0,
        sessions_count: 0,
        evaluations_count: 0,
        cache_size: 0,
        storage_type: 'cache_only'
      }
    }
  }
}