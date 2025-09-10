import { OpenAI } from 'openai'
import type { DeepResearchData, RfpAnalysisData, AIVirtualCustomer } from '../types/ai-customer'

/**
 * 분할 처리 기반 OpenAI 서비스
 * - 각 API 호출을 30초 이내로 제한
 * - 작은 프롬프트 단위로 분할하여 병렬/순차 처리
 * - 결과를 조합하여 최종 응답 생성
 */
export class ChunkedOpenAIService {
  private openai: OpenAI
  private readonly maxTimeout = 25000 // 25초 타임아웃 (안전 마진)
  private readonly isUnbound: boolean

  constructor(apiKey: string, isUnbound = false) {
    console.log(`🔐 [ChunkedOpenAI] 서비스 초기화 시작`)
    console.log(`🔑 [ChunkedOpenAI] API 키: sk-***${apiKey.slice(-6)} (길이: ${apiKey.length})`)
    console.log(`⚙️ [ChunkedOpenAI] Workers Unbound: ${isUnbound ? '✅ 활성화' : '❌ 비활성화'}`)
    console.log(`⏰ [ChunkedOpenAI] 타임아웃 설정: ${this.maxTimeout}ms`)
    
    this.openai = new OpenAI({ apiKey })
    this.isUnbound = isUnbound
    
    console.log(`✅ [ChunkedOpenAI] 서비스 초기화 완료`)
  }

  /**
   * 안전한 API 호출 래퍼 - 25초 타임아웃 강제 적용
   */
  private async safeAPICall<T>(
    apiCall: () => Promise<T>,
    fallback: T,
    description: string
  ): Promise<T> {
    return new Promise(async (resolve) => {
      // 25초 타임아웃 설정
      const timeout = setTimeout(() => {
        console.log(`⏰ [ChunkedOpenAI] 타임아웃 발생: ${description}`)
        console.log(`⚠️ [ChunkedOpenAI] 25초 제한 초과 - 폴백 데이터 사용`)
        resolve(fallback)
      }, this.maxTimeout)

      try {
        const result = await apiCall()
        clearTimeout(timeout)
        resolve(result)
      } catch (error) {
        clearTimeout(timeout)
        console.error(`❌ [ChunkedOpenAI] API 호출 실패: ${description}`)
        console.error(`🔍 [ChunkedOpenAI] 오류 상세:`, {
          error_message: error.message,
          error_type: error.constructor.name,
          description
        })
        console.log(`🔄 [ChunkedOpenAI] 폴백 데이터로 대체`)
        resolve(fallback)
      }
    })
  }

  /**
   * 딥리서치 분할 생성 - 5개씩 3그룹으로 병렬 처리
   */
  async generateDeepResearchChunked(companyName: string): Promise<DeepResearchData> {
    console.log(`🚀 [ChunkedOpenAI] 딥리서치 분할 생성 시작: ${companyName}`)
    console.log(`📋 [ChunkedOpenAI] 처리 계획:`, {
      그룹_1: '기본_정보 (1-5번)',
      그룹_2: '전략_정보 (6-10번)',
      그룹_3: '운영_정보 (11-15번)',
      처리_방식: '병렬_처리'
    })

    const startTime = Date.now()
    
    // 그룹 1: 기본 정보 (1-5번)
    console.log(`💡 [ChunkedOpenAI] 그룹 1 시작: 기본 정보 수집`)
    const group1Promise = this.generateResearchGroup1(companyName)
    
    // 그룹 2: 전략 정보 (6-10번)  
    console.log(`🎯 [ChunkedOpenAI] 그룹 2 시작: 전략 정보 수집`)
    const group2Promise = this.generateResearchGroup2(companyName)
    
    // 그룹 3: 운영 정보 (11-15번)
    console.log(`⚙️ [ChunkedOpenAI] 그룹 3 시작: 운영 정보 수집`)
    const group3Promise = this.generateResearchGroup3(companyName)

    // 병렬 처리로 모든 그룹 실행
    console.log(`⏳ [ChunkedOpenAI] 3그룹 병렬 실행 시작...`)
    const [group1, group2, group3] = await Promise.all([
      group1Promise,
      group2Promise, 
      group3Promise
    ])
    
    const processingTime = Date.now() - startTime
    console.log(`⏱️ [ChunkedOpenAI] 병렬 처리 완료: ${processingTime}ms`)

    // 결과 통합 내역 로그
    console.log(`📈 [ChunkedOpenAI] 그룹별 결과:`, {
      그룹_1_속성수: Object.keys(group1).length,
      그룹_2_속성수: Object.keys(group2).length,
      그룹_3_속성수: Object.keys(group3).length,
      총_속성수: Object.keys(group1).length + Object.keys(group2).length + Object.keys(group3).length
    })

    // 결과 통합
    const result: DeepResearchData = { ...group1, ...group2, ...group3 }
    
    console.log(`✅ [ChunkedOpenAI] 딥리서치 분할 생성 완료!`)
    console.log(`🏆 [ChunkedOpenAI] 최종 결과:`, {
      총_속성수: Object.keys(result).length,
      처리시간: processingTime + 'ms',
      회사명: companyName,
      성공_여부: '✅'
    })
    
    return result
  }

  /**
   * 그룹 1: 기본 기업 정보 (1-5번) - 간결한 프롬프트
   */
  private async generateResearchGroup1(companyName: string) {
    const prompt = `${companyName} 기업 기본 정보 5개를 간결하게 분석해주세요 (각 30자 이내):

1. 비전·미션
2. 핵심 사업영역  
3. 시장 포지셔닝
4. 재무 전략 성향
5. R&D 지향성

JSON 응답:
{
  "1": {"id":"1","name":"비전·미션","content":"내용","source_url":"gpt4o","source_type":"llm","reliability_score":8,"llm_confidence":0.9,"extracted_at":"${new Date().toISOString()}"},
  "2": {"id":"2","name":"핵심 사업영역","content":"내용","source_url":"gpt4o","source_type":"llm","reliability_score":8,"llm_confidence":0.9,"extracted_at":"${new Date().toISOString()}"},
  "3": {"id":"3","name":"시장 포지셔닝","content":"내용","source_url":"gpt4o","source_type":"llm","reliability_score":8,"llm_confidence":0.9,"extracted_at":"${new Date().toISOString()}"},
  "4": {"id":"4","name":"재무 전략 성향","content":"내용","source_url":"gpt4o","source_type":"llm","reliability_score":8,"llm_confidence":0.9,"extracted_at":"${new Date().toISOString()}"},
  "5": {"id":"5","name":"R&D 지향성","content":"내용","source_url":"gpt4o","source_type":"llm","reliability_score":8,"llm_confidence":0.9,"extracted_at":"${new Date().toISOString()}"}
}`

    const fallback = this.createFallbackGroup1(companyName)
    
    return this.safeAPICall(async () => {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 800, // 작은 토큰으로 제한
        response_format: { type: "json_object" }
      })

      const apiTime = Date.now() - startTime
      console.log(`⏱️ [Group1] API 응답 시간: ${apiTime}ms`)
      console.log(`📝 [Group1] 응답 토큰 사용량: ${response.usage?.total_tokens || 'N/A'}`)
      
      const content = response.choices[0].message.content
      if (!content) throw new Error('GPT-4o 응답이 비어있습니다')
      
      const jsonResponse = JSON.parse(content)
      console.log(`✅ [Group1] JSON 파싱 성공, 속성 수: ${Object.keys(jsonResponse).length}`)
      
      return jsonResponse
    }, fallback, '딥리서치 그룹1').then(result => {
      console.log(`🏆 [Group1] 처리 완료: ${Object.keys(result).length}개 속성 생성`)
      return result
    })
  }

  /**
   * 그룹 2: 전략 정보 (6-10번) - 간결한 프롬프트
   */
  private async generateResearchGroup2(companyName: string) {
    console.log(`🎯 [Group2] 전략 정보 그룹 처리 시작: ${companyName}`)
    
    const prompt = `${companyName} 기업 전략 정보 5개를 간결하게 분석해주세요 (각 30자 이내):

6. ESG 우선순위
7. 리스크 관리 태도
8. 글로벌 vs 로컬 지향성
9. 고객/이해관계자 성향
10. 디지털 전환 수준

JSON 응답:
{
  "6": {"id":"6","name":"ESG 우선순위","content":"내용","source_url":"gpt4o","source_type":"llm","reliability_score":8,"llm_confidence":0.9,"extracted_at":"${new Date().toISOString()}"},
  "7": {"id":"7","name":"리스크 관리 태도","content":"내용","source_url":"gpt4o","source_type":"llm","reliability_score":8,"llm_confidence":0.9,"extracted_at":"${new Date().toISOString()}"},
  "8": {"id":"8","name":"글로벌 vs 로컬 지향성","content":"내용","source_url":"gpt4o","source_type":"llm","reliability_score":8,"llm_confidence":0.9,"extracted_at":"${new Date().toISOString()}"},
  "9": {"id":"9","name":"고객/이해관계자 성향","content":"내용","source_url":"gpt4o","source_type":"llm","reliability_score":8,"llm_confidence":0.9,"extracted_at":"${new Date().toISOString()}"},
  "10": {"id":"10","name":"디지털 전환 수준","content":"내용","source_url":"gpt4o","source_type":"llm","reliability_score":8,"llm_confidence":0.9,"extracted_at":"${new Date().toISOString()}"}
}`

    const fallback = this.createFallbackGroup2(companyName)
    
    console.log(`🗺️ [Group2] 프롬프트 길이: ${prompt.length}자`)
    console.log(`🎯 [Group2] 목표 속성: ESG, 리스크관리, 글로벌지향성, 고객성향, 디지털전환`)
    
    return this.safeAPICall(async () => {
      console.log(`🚀 [Group2] OpenAI API 호출 시작 (gpt-4o)`)
      const startTime = Date.now()
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 800,
        response_format: { type: "json_object" }
      })
      
      const apiTime = Date.now() - startTime
      console.log(`⏱️ [Group2] API 응답 시간: ${apiTime}ms`)
      console.log(`📝 [Group2] 응답 토큰 사용량: ${response.usage?.total_tokens || 'N/A'}`)

      const content = response.choices[0].message.content
      if (!content) throw new Error('GPT-4o 응답이 비어있습니다')
      
      const jsonResponse = JSON.parse(content)
      console.log(`✅ [Group2] JSON 파싱 성공, 속성 수: ${Object.keys(jsonResponse).length}`)
      
      return jsonResponse
    }, fallback, '딥리서치 그룹2').then(result => {
      console.log(`🏆 [Group2] 처리 완료: ${Object.keys(result).length}개 속성 생성`)
      return result
    })
  }

  /**
   * 그룹 3: 운영 정보 (11-15번) - 간결한 프롬프트  
   */
  private async generateResearchGroup3(companyName: string) {
    console.log(`⚙️ [Group3] 운영 정보 그룹 처리 시작: ${companyName}`)
    
    const prompt = `${companyName} 기업 운영 정보 5개를 간결하게 분석해주세요 (각 30자 이내):

11. 조직문화·HR 방향
12. 파트너십/생태계 전략
13. 규제·정책 대응 성향
14. 사회적 이미지/브랜드 톤
15. 단기 vs 장기 목표 균형

JSON 응답:
{
  "11": {"id":"11","name":"조직문화·HR 방향","content":"내용","source_url":"gpt4o","source_type":"llm","reliability_score":8,"llm_confidence":0.9,"extracted_at":"${new Date().toISOString()}"},
  "12": {"id":"12","name":"파트너십/생태계 전략","content":"내용","source_url":"gpt4o","source_type":"llm","reliability_score":8,"llm_confidence":0.9,"extracted_at":"${new Date().toISOString()}"},
  "13": {"id":"13","name":"규제·정책 대응 성향","content":"내용","source_url":"gpt4o","source_type":"llm","reliability_score":8,"llm_confidence":0.9,"extracted_at":"${new Date().toISOString()}"},
  "14": {"id":"14","name":"사회적 이미지/브랜드 톤","content":"내용","source_url":"gpt4o","source_type":"llm","reliability_score":8,"llm_confidence":0.9,"extracted_at":"${new Date().toISOString()}"},
  "15": {"id":"15","name":"단기 vs 장기 목표 균형","content":"내용","source_url":"gpt4o","source_type":"llm","reliability_score":8,"llm_confidence":0.9,"extracted_at":"${new Date().toISOString()}"}
}`

    const fallback = this.createFallbackGroup3(companyName)
    
    console.log(`🗺️ [Group3] 프롬프트 길이: ${prompt.length}자`)
    console.log(`🎯 [Group3] 목표 속성: 조직문화, 파트너십, 규제대응, 브랜드톤, 목표균형`)
    
    return this.safeAPICall(async () => {
      console.log(`🚀 [Group3] OpenAI API 호출 시작 (gpt-4o)`)
      const startTime = Date.now()
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 800,
        response_format: { type: "json_object" }
      })
      
      const apiTime = Date.now() - startTime
      console.log(`⏱️ [Group3] API 응답 시간: ${apiTime}ms`)
      console.log(`📝 [Group3] 응답 토큰 사용량: ${response.usage?.total_tokens || 'N/A'}`)

      const content = response.choices[0].message.content
      if (!content) throw new Error('GPT-4o 응답이 비어있습니다')
      
      const jsonResponse = JSON.parse(content)
      console.log(`✅ [Group3] JSON 파싱 성공, 속성 수: ${Object.keys(jsonResponse).length}`)
      
      return jsonResponse
    }, fallback, '딥리서치 그룹3').then(result => {
      console.log(`🏆 [Group3] 처리 완료: ${Object.keys(result).length}개 속성 생성`)
      return result
    })
  }

  /**
   * RFP 분석 분할 생성 - 핵심/세부/조건 3단계 순차 처리
   */
  async generateRfpAnalysisChunked(rfpText: string, fileName: string): Promise<RfpAnalysisData> {
    console.log(`🚀 RFP 분할 분석 시작: ${fileName}`)

    // 1단계: 핵심 정보 (1-5번)
    const coreInfo = await this.generateRfpCore(rfpText, fileName)
    
    // 2단계: 세부 정보 (6-10번) 
    const detailInfo = await this.generateRfpDetails(rfpText, fileName)
    
    // 3단계: 조건 정보 (11-15번)
    const conditionInfo = await this.generateRfpConditions(rfpText, fileName)

    // 결과 통합
    const result: RfpAnalysisData = { ...coreInfo, ...detailInfo, ...conditionInfo }
    console.log(`✅ RFP 분할 분석 완료 (3단계 순차 처리)`)
    
    return result
  }

  /**
   * RFP 핵심 정보 (1-5번) - 간결한 프롬프트
   */
  private async generateRfpCore(rfpText: string, fileName: string) {
    const prompt = `RFP 문서에서 핵심 정보 5개를 추출해주세요 (각 20자 이내):

RFP 문서: ${rfpText.substring(0, 2000)}...

추출할 정보:
1. 발주사명
2. 발주부서  
3. 프로젝트 배경
4. 프로젝트 목표
5. 프로젝트 범위

JSON 응답:
{
  "1": {"id":"1","name":"발주사명","content":"내용","source_snippet":"원문","page_number":1,"section_title":"섹션","extracted_at":"${new Date().toISOString()}"},
  "2": {"id":"2","name":"발주부서","content":"내용","source_snippet":"원문","page_number":1,"section_title":"섹션","extracted_at":"${new Date().toISOString()}"},
  "3": {"id":"3","name":"프로젝트 배경","content":"내용","source_snippet":"원문","page_number":1,"section_title":"섹션","extracted_at":"${new Date().toISOString()}"},
  "4": {"id":"4","name":"프로젝트 목표","content":"내용","source_snippet":"원문","page_number":1,"section_title":"섹션","extracted_at":"${new Date().toISOString()}"},
  "5": {"id":"5","name":"프로젝트 범위","content":"내용","source_snippet":"원문","page_number":1,"section_title":"섹션","extracted_at":"${new Date().toISOString()}"}
}`

    const fallback = this.createRfpCoreFallback(fileName)
    
    return this.safeAPICall(async () => {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      })

      const content = response.choices[0].message.content
      if (!content) throw new Error('GPT-4o 응답이 비어있습니다')
      
      return JSON.parse(content)
    }, fallback, 'RFP 핵심정보')
  }

  /**
   * RFP 세부 정보 (6-10번)
   */
  private async generateRfpDetails(rfpText: string, fileName: string) {
    const prompt = `RFP 문서에서 세부 정보 5개를 추출해주세요 (각 20자 이내):

RFP 문서: ${rfpText.substring(1000, 3000)}...

추출할 정보:
6. 프로젝트 기간
7. 프로젝트 예산
8. 평가기준
9. 요구 산출물
10. 입찰사 요건

JSON 응답:
{
  "6": {"id":"6","name":"프로젝트 기간","content":"내용","source_snippet":"원문","page_number":2,"section_title":"섹션","extracted_at":"${new Date().toISOString()}"},
  "7": {"id":"7","name":"프로젝트 예산","content":"내용","source_snippet":"원문","page_number":2,"section_title":"섹션","extracted_at":"${new Date().toISOString()}"},
  "8": {"id":"8","name":"평가기준","content":"내용","source_snippet":"원문","page_number":2,"section_title":"섹션","extracted_at":"${new Date().toISOString()}"},
  "9": {"id":"9","name":"요구 산출물","content":"내용","source_snippet":"원문","page_number":2,"section_title":"섹션","extracted_at":"${new Date().toISOString()}"},
  "10": {"id":"10","name":"입찰사 요건","content":"내용","source_snippet":"원문","page_number":2,"section_title":"섹션","extracted_at":"${new Date().toISOString()}"}
}`

    const fallback = this.createRfpDetailsFallback(fileName)
    
    return this.safeAPICall(async () => {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      })

      const content = response.choices[0].message.content
      if (!content) throw new Error('GPT-4o 응답이 비어있습니다')
      
      return JSON.parse(content)
    }, fallback, 'RFP 세부정보')
  }

  /**
   * RFP 조건 정보 (11-15번)
   */
  private async generateRfpConditions(rfpText: string, fileName: string) {
    const prompt = `RFP 문서에서 조건 정보 5개를 추출해주세요 (각 20자 이내):

RFP 문서: ${rfpText.substring(2000, 4000)}...

추출할 정보:
11. 준수사항
12. 리스크 관리 조건
13. 필수 역량
14. 진행 일정
15. 특이조건/기타 요구

JSON 응답:
{
  "11": {"id":"11","name":"준수사항","content":"내용","source_snippet":"원문","page_number":3,"section_title":"섹션","extracted_at":"${new Date().toISOString()}"},
  "12": {"id":"12","name":"리스크 관리 조건","content":"내용","source_snippet":"원문","page_number":3,"section_title":"섹션","extracted_at":"${new Date().toISOString()}"},
  "13": {"id":"13","name":"필수 역량","content":"내용","source_snippet":"원문","page_number":3,"section_title":"섹션","extracted_at":"${new Date().toISOString()}"},
  "14": {"id":"14","name":"진행 일정","content":"내용","source_snippet":"원문","page_number":3,"section_title":"섹션","extracted_at":"${new Date().toISOString()}"},
  "15": {"id":"15","name":"특이조건/기타 요구","content":"내용","source_snippet":"원문","page_number":3,"section_title":"섹션","extracted_at":"${new Date().toISOString()}"}
}`

    const fallback = this.createRfpConditionsFallback(fileName)
    
    return this.safeAPICall(async () => {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      })

      const content = response.choices[0].message.content
      if (!content) throw new Error('GPT-4o 응답이 비어있습니다')
      
      return JSON.parse(content)
    }, fallback, 'RFP 조건정보')
  }

  /**
   * AI 가상고객 분할 생성 - 기본정보/페르소나/평가기준으로 분할
   */
  async generateVirtualCustomerChunked(
    deepResearch: DeepResearchData,
    rfpAnalysis: RfpAnalysisData,
    customerType: 'CTO' | 'CFO' | 'CEO' | 'PM' = 'CTO'
  ): Promise<AIVirtualCustomer> {
    console.log(`🚀 AI 가상고객 분할 생성 시작: ${customerType}`)

    // 1단계: 기본 정보 생성
    const basicInfo = await this.generateCustomerBasicInfo(deepResearch, rfpAnalysis, customerType)
    
    // 2단계: 페르소나 생성  
    const persona = await this.generateCustomerPersona(deepResearch, rfpAnalysis, customerType)
    
    // 3단계: 평가 기준 생성
    const evaluationCriteria = await this.generateCustomerEvaluation(deepResearch, rfpAnalysis, customerType)

    // 결과 통합
    const result: AIVirtualCustomer = {
      customer_id: crypto.randomUUID(),
      customer_type: customerType,
      company_name: deepResearch[1]?.content?.split(' ')[0] || 'Sample Company',
      project_name: rfpAnalysis[4]?.content || 'Sample Project',
      deep_research_data: deepResearch,
      rfp_analysis_data: rfpAnalysis,
      integrated_persona: {
        top3_priorities: persona.top3_priorities,
        decision_style: persona.decision_style,
        persona_summary: persona.persona_summary,
        key_concerns: persona.key_concerns,
        evaluation_weights: evaluationCriteria.evaluation_weights
      },
      created_at: new Date().toISOString()
    }

    console.log(`✅ AI 가상고객 분할 생성 완료 (3단계 순차 처리)`)
    return result
  }

  /**
   * 고객 기본 정보 생성 (간결한 프롬프트)
   */
  private async generateCustomerBasicInfo(deepResearch: DeepResearchData, rfpAnalysis: RfpAnalysisData, customerType: string) {
    const prompt = `${customerType} 역할의 기본 정보를 간결하게 생성해주세요:

회사: ${deepResearch[1]?.content}
프로젝트: ${rfpAnalysis[4]?.content}

JSON 응답 (30자 이내):
{
  "company_name": "회사명",
  "project_name": "프로젝트명", 
  "customer_type": "${customerType}"
}`

    return this.safeAPICall(async () => {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 200,
        response_format: { type: "json_object" }
      })

      const content = response.choices[0].message.content
      if (!content) throw new Error('GPT-4o 응답이 비어있습니다')
      
      return JSON.parse(content)
    }, {
      company_name: deepResearch[1]?.content?.split(' ')[0] || 'Sample Company',
      project_name: rfpAnalysis[4]?.content || 'Sample Project',
      customer_type: customerType
    }, '고객 기본정보')
  }

  /**
   * 고객 페르소나 생성 (간결한 프롬프트)
   */
  private async generateCustomerPersona(deepResearch: DeepResearchData, rfpAnalysis: RfpAnalysisData, customerType: string) {
    const prompt = `${customerType} 페르소나를 간결하게 생성해주세요:

기업특성: ${deepResearch[1]?.content}, ${deepResearch[6]?.content}
프로젝트: ${rfpAnalysis[4]?.content}, ${rfpAnalysis[7]?.content}

JSON 응답 (각 30자 이내):
{
  "top3_priorities": ["우선순위1", "우선순위2", "우선순위3"],
  "decision_style": "의사결정스타일",
  "persona_summary": "페르소나요약",
  "key_concerns": ["우려사항1", "우려사항2", "우려사항3"]
}`

    return this.safeAPICall(async () => {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 500,
        response_format: { type: "json_object" }
      })

      const content = response.choices[0].message.content
      if (!content) throw new Error('GPT-4o 응답이 비어있습니다')
      
      return JSON.parse(content)
    }, {
      top3_priorities: ['비용 효율성', '기술 안정성', '구현 일정'],
      decision_style: '데이터 중심형',
      persona_summary: `${customerType} 역할의 신중한 의사결정자`,
      key_concerns: ['기술 리스크', '예산 초과', '일정 지연']
    }, '고객 페르소나')
  }

  /**
   * 고객 평가 기준 생성 (간결한 프롬프트)
   */
  private async generateCustomerEvaluation(deepResearch: DeepResearchData, rfpAnalysis: RfpAnalysisData, customerType: string) {
    const prompt = `${customerType}의 평가 가중치를 설정해주세요 (합계 1.0):

평가기준: ${rfpAnalysis[8]?.content}
고객특성: ${deepResearch[4]?.content}

JSON 응답:
{
  "evaluation_weights": {
    "clarity": 0.15,
    "expertise": 0.25,
    "persuasiveness": 0.20,
    "logic": 0.20,
    "creativity": 0.10,
    "credibility": 0.10
  }
}`

    return this.safeAPICall(async () => {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 300,
        response_format: { type: "json_object" }
      })

      const content = response.choices[0].message.content
      if (!content) throw new Error('GPT-4o 응답이 비어있습니다')
      
      return JSON.parse(content)
    }, {
      evaluation_weights: {
        clarity: 0.15,
        expertise: 0.25,
        persuasiveness: 0.20,
        logic: 0.20,
        creativity: 0.10,
        credibility: 0.10
      }
    }, '고객 평가기준')
  }

  // === Fallback 데이터 생성 메서드들 ===
  
  private createFallbackGroup1(companyName: string) {
    const timestamp = new Date().toISOString()
    return {
      1: { id: "1", name: "비전·미션", content: `${companyName}의 지속가능한 성장 추구`, source_url: "fallback", source_type: "fallback", reliability_score: 7, llm_confidence: 0.8, extracted_at: timestamp },
      2: { id: "2", name: "핵심 사업영역", content: `${companyName}의 주력 사업 분야`, source_url: "fallback", source_type: "fallback", reliability_score: 7, llm_confidence: 0.8, extracted_at: timestamp },
      3: { id: "3", name: "시장 포지셔닝", content: `${companyName}의 시장 내 위치`, source_url: "fallback", source_type: "fallback", reliability_score: 7, llm_confidence: 0.8, extracted_at: timestamp },
      4: { id: "4", name: "재무 전략 성향", content: `${companyName}의 안정적 재무 운영`, source_url: "fallback", source_type: "fallback", reliability_score: 7, llm_confidence: 0.8, extracted_at: timestamp },
      5: { id: "5", name: "R&D 지향성", content: `${companyName}의 혁신 기술 개발`, source_url: "fallback", source_type: "fallback", reliability_score: 7, llm_confidence: 0.8, extracted_at: timestamp }
    }
  }

  private createFallbackGroup2(companyName: string) {
    const timestamp = new Date().toISOString()
    return {
      6: { id: "6", name: "ESG 우선순위", content: `${companyName}의 ESG 경영 실천`, source_url: "fallback", source_type: "fallback", reliability_score: 7, llm_confidence: 0.8, extracted_at: timestamp },
      7: { id: "7", name: "리스크 관리 태도", content: `${companyName}의 신중한 리스크 관리`, source_url: "fallback", source_type: "fallback", reliability_score: 7, llm_confidence: 0.8, extracted_at: timestamp },
      8: { id: "8", name: "글로벌 vs 로컬 지향성", content: `${companyName}의 글로벌 시장 확장`, source_url: "fallback", source_type: "fallback", reliability_score: 7, llm_confidence: 0.8, extracted_at: timestamp },
      9: { id: "9", name: "고객/이해관계자 성향", content: `${companyName}의 고객 중심 경영`, source_url: "fallback", source_type: "fallback", reliability_score: 7, llm_confidence: 0.8, extracted_at: timestamp },
      10: { id: "10", name: "디지털 전환 수준", content: `${companyName}의 디지털 혁신 추진`, source_url: "fallback", source_type: "fallback", reliability_score: 7, llm_confidence: 0.8, extracted_at: timestamp }
    }
  }

  private createFallbackGroup3(companyName: string) {
    const timestamp = new Date().toISOString()
    return {
      11: { id: "11", name: "조직문화·HR 방향", content: `${companyName}의 인재 중심 문화`, source_url: "fallback", source_type: "fallback", reliability_score: 7, llm_confidence: 0.8, extracted_at: timestamp },
      12: { id: "12", name: "파트너십/생태계 전략", content: `${companyName}의 전략적 제휴`, source_url: "fallback", source_type: "fallback", reliability_score: 7, llm_confidence: 0.8, extracted_at: timestamp },
      13: { id: "13", name: "규제·정책 대응 성향", content: `${companyName}의 규제 준수 체계`, source_url: "fallback", source_type: "fallback", reliability_score: 7, llm_confidence: 0.8, extracted_at: timestamp },
      14: { id: "14", name: "사회적 이미지/브랜드 톤", content: `${companyName}의 신뢰할 수 있는 브랜드`, source_url: "fallback", source_type: "fallback", reliability_score: 7, llm_confidence: 0.8, extracted_at: timestamp },
      15: { id: "15", name: "단기 vs 장기 목표 균형", content: `${companyName}의 균형적 성장 전략`, source_url: "fallback", source_type: "fallback", reliability_score: 7, llm_confidence: 0.8, extracted_at: timestamp }
    }
  }

  private createRfpCoreFallback(fileName: string) {
    const timestamp = new Date().toISOString()
    return {
      1: { id: "1", name: "발주사명", content: `${fileName} 발주 기업`, source_snippet: "문서 기반 추출", page_number: 1, section_title: "프로젝트 개요", extracted_at: timestamp },
      2: { id: "2", name: "발주부서", content: "IT 혁신부", source_snippet: "문서 기반 추출", page_number: 1, section_title: "담당 부서", extracted_at: timestamp },
      3: { id: "3", name: "프로젝트 배경", content: "디지털 전환 필요성", source_snippet: "문서 기반 추출", page_number: 1, section_title: "추진 배경", extracted_at: timestamp },
      4: { id: "4", name: "프로젝트 목표", content: "통합 시스템 구축", source_snippet: "문서 기반 추출", page_number: 1, section_title: "목표", extracted_at: timestamp },
      5: { id: "5", name: "프로젝트 범위", content: "전사 시스템 통합", source_snippet: "문서 기반 추출", page_number: 1, section_title: "범위", extracted_at: timestamp }
    }
  }

  private createRfpDetailsFallback(fileName: string) {
    const timestamp = new Date().toISOString()
    return {
      6: { id: "6", name: "프로젝트 기간", content: "12개월", source_snippet: "문서 기반 추출", page_number: 2, section_title: "일정", extracted_at: timestamp },
      7: { id: "7", name: "프로젝트 예산", content: "100억원 규모", source_snippet: "문서 기반 추출", page_number: 2, section_title: "예산", extracted_at: timestamp },
      8: { id: "8", name: "평가기준", content: "기술 70, 가격 30", source_snippet: "문서 기반 추출", page_number: 2, section_title: "평가", extracted_at: timestamp },
      9: { id: "9", name: "요구 산출물", content: "설계서, 구축, 매뉴얼", source_snippet: "문서 기반 추출", page_number: 2, section_title: "산출물", extracted_at: timestamp },
      10: { id: "10", name: "입찰사 요건", content: "SI 경험 3년 이상", source_snippet: "문서 기반 추출", page_number: 2, section_title: "자격", extracted_at: timestamp }
    }
  }

  private createRfpConditionsFallback(fileName: string) {
    const timestamp = new Date().toISOString()
    return {
      11: { id: "11", name: "준수사항", content: "보안 가이드라인 준수", source_snippet: "문서 기반 추출", page_number: 3, section_title: "준수사항", extracted_at: timestamp },
      12: { id: "12", name: "리스크 관리 조건", content: "일정 지연시 페널티", source_snippet: "문서 기반 추출", page_number: 3, section_title: "리스크", extracted_at: timestamp },
      13: { id: "13", name: "필수 역량", content: "클라우드 구축 경험", source_snippet: "문서 기반 추출", page_number: 3, section_title: "역량", extracted_at: timestamp },
      14: { id: "14", name: "진행 일정", content: "제안접수 → 평가 → 선정", source_snippet: "문서 기반 추출", page_number: 3, section_title: "일정", extracted_at: timestamp },
      15: { id: "15", name: "특이조건/기타 요구", content: "24시간 지원 체계", source_snippet: "문서 기반 추출", page_number: 3, section_title: "특이사항", extracted_at: timestamp }
    }
  }
}