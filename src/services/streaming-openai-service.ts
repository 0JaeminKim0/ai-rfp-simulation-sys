// 스트리밍 OpenAI API 서비스 (큰 응답에 대한 스트리밍 처리)

import OpenAI from 'openai'
import type { 
  AIVirtualCustomer, 
  DeepResearchData,
  RfpAnalysisData 
} from '../types/ai-customer'

export class StreamingOpenAIService {
  private openai: OpenAI
  private readonly isProduction: boolean
  
  constructor(apiKey: string) {
    this.isProduction = typeof process === 'undefined' || !process.env?.NODE_ENV
    
    this.openai = new OpenAI({
      apiKey: apiKey,
      fetch: globalThis.fetch,
      timeout: this.isProduction ? 10000 : 30000,
      maxRetries: 1
    })
  }

  /**
   * 스트리밍 딥리서치 데이터 추출 (부분 응답 허용)
   */
  async streamDeepResearchData(
    companyName: string,
    webContent: string,
    onProgress?: (chunk: string) => void
  ): Promise<DeepResearchData> {
    
    const prompt = `
당신은 기업 분석 전문가입니다. ${companyName}의 15가지 딥리서치 속성을 간략하게 분석해주세요.

다음 15개 속성을 각각 2-3줄로 간단히 분석해주세요:
1. 비전·미션 2. 핵심 사업영역 3. 시장 포지셔닝 4. 재무 전략 성향 5. R&D 지향성
6. ESG 우선순위 7. 리스크 관리 태도 8. 혁신·변화 성향 9. 파트너십 전략 10. 고객 경험 중시도
11. 브랜드 가치관 12. 조직 문화 특성 13. 의사결정 구조 14. 글로벌·현지화 전략 15. 디지털 전환 수준

JSON 형식으로 간결하게 응답하세요.
`

    try {
      if (this.isProduction) {
        // 프로덕션에서는 스트리밍 대신 빠른 단일 요청
        const response = await this.openai.chat.completions.create({
          model: "gpt-4o-mini", // 더 빠른 모델 사용
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 1500, // 토큰 수 제한
          response_format: { type: "json_object" }
        })

        const content = response.choices[0].message.content
        if (!content) throw new Error('응답이 비어있습니다')
        
        return JSON.parse(content) as DeepResearchData
      } else {
        // 개발 환경에서는 스트리밍 사용
        const stream = await this.openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 3000,
          stream: true,
          response_format: { type: "json_object" }
        })

        let fullResponse = ''
        
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || ''
          fullResponse += content
          
          if (onProgress) {
            onProgress(content)
          }
        }

        if (!fullResponse.trim()) {
          throw new Error('스트리밍 응답이 비어있습니다')
        }

        return JSON.parse(fullResponse) as DeepResearchData
      }
      
    } catch (error) {
      console.error('스트리밍 딥리서치 오류:', error)
      
      // Fallback 데이터 제공
      return {
        vision_mission: `${companyName}의 비전과 미션 분석`,
        core_business: `${companyName}의 핵심 사업영역`,
        market_positioning: `${companyName}의 시장 포지셔닝`,
        financial_strategy: `${companyName}의 재무 전략`,
        rd_orientation: `${companyName}의 R&D 지향성`,
        esg_priority: `${companyName}의 ESG 우선순위`,
        risk_management: `${companyName}의 리스크 관리`,
        innovation_change: `${companyName}의 혁신 성향`,
        partnership_strategy: `${companyName}의 파트너십 전략`,
        customer_experience: `${companyName}의 고객 경험 중시도`,
        brand_values: `${companyName}의 브랜드 가치관`,
        organizational_culture: `${companyName}의 조직 문화`,
        decision_structure: `${companyName}의 의사결정 구조`,
        global_localization: `${companyName}의 글로벌 전략`,
        digital_transformation: `${companyName}의 디지털 전환`
      }
    }
  }

  /**
   * 청크 단위 가상고객 생성 (메모리 효율적)
   */
  async generateCustomerInChunks(
    deepResearch: DeepResearchData,
    rfpAnalysis: RfpAnalysisData,
    customerType: 'CTO' | 'CFO' | 'CEO' | 'PM' = 'CTO'
  ): Promise<AIVirtualCustomer> {
    
    const companyName = deepResearch.vision_mission.split(' ')[0] || 'Sample Company'
    const projectName = rfpAnalysis.objectives || 'Sample Project'

    if (this.isProduction) {
      // 프로덕션에서는 간소화된 페르소나 생성
      const simplifiedCustomer: AIVirtualCustomer = {
        customer_id: crypto.randomUUID(),
        customer_type: customerType,
        company_name: companyName,
        project_name: projectName,
        deep_research_data: deepResearch,
        rfp_analysis_data: rfpAnalysis,
        integrated_persona: {
          top3_priorities: ['기술 안정성', '비용 효율성', '구현 일정'],
          decision_style: '데이터 기반 신중형',
          persona_summary: `${customerType} 역할의 실무형 의사결정자로, 기술적 전문성과 비즈니스 가치를 균형있게 고려합니다.`,
          key_concerns: ['기술적 리스크', '예산 관리', '일정 준수'],
          evaluation_weights: {
            clarity: 0.15,
            expertise: 0.25,
            persuasiveness: 0.20,
            logic: 0.20,
            creativity: 0.10,
            credibility: 0.10
          }
        },
        created_at: new Date().toISOString()
      }
      
      return simplifiedCustomer
    } else {
      // 개발 환경에서는 전체 AI 생성 로직 사용
      const prompt = `
${customerType} 역할의 AI 가상고객을 생성해주세요.
회사: ${companyName}
프로젝트: ${projectName}

간단한 JSON 형식으로 페르소나를 생성하세요.
`
      
      try {
        const response = await this.openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.4,
          max_tokens: 2000,
          response_format: { type: "json_object" }
        })

        const content = response.choices[0].message.content
        if (!content) throw new Error('응답이 비어있습니다')
        
        const result = JSON.parse(content) as Partial<AIVirtualCustomer>
        
        // 필수 필드 보완
        return {
          customer_id: crypto.randomUUID(),
          customer_type: customerType,
          company_name: companyName,
          project_name: projectName,
          deep_research_data: deepResearch,
          rfp_analysis_data: rfpAnalysis,
          integrated_persona: result.integrated_persona || {
            top3_priorities: ['기술 안정성', '비용 효율성', '구현 일정'],
            decision_style: '데이터 기반 신중형',
            persona_summary: `${customerType} 역할의 의사결정자`,
            key_concerns: ['기술적 리스크', '예산 관리', '일정 준수'],
            evaluation_weights: {
              clarity: 0.15,
              expertise: 0.25,
              persuasiveness: 0.20,
              logic: 0.20,
              creativity: 0.10,
              credibility: 0.10
            }
          },
          created_at: new Date().toISOString()
        } as AIVirtualCustomer
        
      } catch (error) {
        console.error('청크 기반 고객 생성 오류:', error)
        throw error
      }
    }
  }

  /**
   * 응답 크기 사전 확인
   */
  async checkResponseSize(prompt: string): Promise<number> {
    // 대략적인 토큰 수 추정 (1 토큰 ≈ 4자)
    const estimatedTokens = Math.ceil(prompt.length / 4)
    return estimatedTokens
  }

  /**
   * 적응형 모델 선택 (응답 크기에 따라)
   */
  getOptimalModel(estimatedTokens: number): string {
    if (this.isProduction) {
      return estimatedTokens > 1000 ? "gpt-4o-mini" : "gpt-4o"
    } else {
      return "gpt-4o"
    }
  }
}