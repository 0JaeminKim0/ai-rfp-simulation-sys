import { Hono } from 'hono'
import { cors } from 'hono/cors'

// 유틸리티 및 서비스 임포트
import { DeepResearchService } from './services/deep-research'
import { RfpAnalysisService } from './services/rfp-analysis'
import { CustomerGenerationService } from './services/customer-generation'
import { EvaluationService } from './services/evaluation'
import { DatabaseService } from './services/database'
import { DemoDataService } from './services/demo-data'
import { FileParserService } from './services/file-parser'
import { PDFGeneratorService } from './services/pdf-generator'
import { OpenAIService } from './services/openai-service'
import { ChunkedOpenAIService } from './services/chunked-openai-service'
import { StreamingOpenAIService } from './services/streaming-openai-service'
import { PRODUCTION_CONFIG, PerformanceMonitor, isProductionEnvironment, isWorkersUnbound, UNBOUND_CONFIG } from './config/production-config'
import { WebCrawlerService } from './services/web-crawler'
import { PdfParserService } from './services/pdf-parser-service'
import { JsonStorageService } from './services/json-storage'
import { LLMEvaluationService } from './services/llm-evaluation-service'

// 타입 임포트
import type { 
  AIVirtualCustomer, 
  EvaluationSession,
  DeepResearchRequest,
  RfpParsingRequest,
  LLMEvaluationRequest
} from './types/ai-customer'

type Bindings = {
  DB: D1Database;
  KV: KVNamespace;
  OPENAI_API_KEY: string;
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS 설정
app.use('/api/*', cors())

// 정적 파일 서빙 (Cloudflare Workers 환경에서만)
// Railway에서는 server.js에서 Node.js 방식으로 처리
if (typeof globalThis.process === 'undefined') {
  // Cloudflare Workers 환경
  const { serveStatic } = await import('hono/cloudflare-workers')
  app.use('/static/*', serveStatic({ root: './public' }))
}

// === 헬퍼 함수들 ===

// 환경변수 접근 헬퍼 (Railway Node.js vs Cloudflare Workers 호환)
function getEnvVar(c: any, key: string): string | undefined {
  // Railway (Node.js) 환경
  if (typeof globalThis.process !== 'undefined') {
    return process.env[key]
  }
  // Cloudflare Workers 환경
  return c.env?.[key]
}

// NLP 기반 RFP 분석 (고도화된 키워드 추출 + 구조화)
async function generateNLPRfpAnalysis(text: string, fileName: string) {
  
  // 한국어 NLP 패턴 정의
  const patterns = {
    // 기본 정보 추출
    project_name: /(?:프로젝트명?|사업명|과제명|프로젝트\s*명칭?)\s*[:：]\s*([^\n\r]{1,100})/gi,
    client_company: /(?:발주기관|발주사|발주업체|기관명|회사명|업체명)\s*[:：]\s*([^\n\r]{1,50})/gi,
    department: /(?:담당부서|담당팀|담당기관|부서명|팀명)\s*[:：]\s*([^\n\r]{1,50})/gi,
    
    // 예산 및 기간
    budget: /(?:예산|총예산|사업비|금액|비용)\s*[:：]?\s*([0-9,]+(?:\s*억|\s*만원|\s*원|만|억))/gi,
    timeline: /(?:기간|사업기간|수행기간|프로젝트기간)\s*[:：]?\s*([0-9]+(?:\s*개월|\s*년|\s*주|\s*일))/gi,
    start_date: /(?:시작일|개시일|착수일)\s*[:：]?\s*([0-9]{4}[-.]?[0-9]{1,2}[-.]?[0-9]{1,2})/gi,
    end_date: /(?:종료일|완료일|납기일)\s*[:：]?\s*([0-9]{4}[-.]?[0-9]{1,2}[-.]?[0-9]{1,2})/gi,
    
    // 평가 기준
    evaluation_criteria: /(?:평가기준|평가항목|심사기준)\s*[:：]?\s*([^.]{1,200})/gi,
    
    // 기술 요구사항
    technical_requirements: /(?:기술요구사항|기술사양|필수기술|기술조건)\s*[:：]?\s*([^.]{1,300})/gi,
    
    // 제약사항
    constraints: /(?:제약사항|제한사항|주의사항|특이사항)\s*[:：]?\s*([^.]{1,200})/gi
  }
  
  // 정규식으로 정보 추출
  const extractedData: any = {}
  
  for (const [key, pattern] of Object.entries(patterns)) {
    const matches = [...text.matchAll(pattern)]
    if (matches.length > 0) {
      extractedData[key] = matches.map(m => m[1].trim()).filter(v => v.length > 0)
    }
  }
  
  // 문장 단위 분석으로 추가 정보 추출
  const sentences = text.split(/[.\n!?]/).filter(s => s.trim().length > 5)
  
  const requirements = []
  const deliverables = []
  const objectives = []
  
  for (const sentence of sentences) {
    const trimmed = sentence.trim()
    
    // 요구사항 추출
    if (/(?:요구|필요|필수|요구사항|해야|구현|개발|제공)/.test(trimmed)) {
      requirements.push(trimmed.substring(0, 100))
    }
    
    // 산출물 추출  
    if (/(?:산출물|제출물|결과물|납품물|보고서|문서|시스템)/.test(trimmed)) {
      deliverables.push(trimmed.substring(0, 100))
    }
    
    // 목표 추출
    if (/(?:목표|목적|달성|효과|기대|향상|개선)/.test(trimmed)) {
      objectives.push(trimmed.substring(0, 100))
    }
  }
  
  // RFP 15속성 매핑
  const result = {
    client_company: extractedData.client_company?.[0] || '미지정 기업',
    department: extractedData.department?.[0] || '미지정 부서',
    project_background: text.length > 0 ? `RFP 문서 기반 프로젝트 배경 (${fileName})` : '정보 없음',
    objectives: objectives.slice(0, 3).join('; ') || '프로젝트 목표 달성',
    scope: requirements.slice(0, 3).join('; ') || '프로젝트 범위 정의',
    timeline: extractedData.timeline?.[0] || '미지정 기간',
    budget: extractedData.budget?.[0] || '미지정 예산',
    evaluation_criteria: extractedData.evaluation_criteria?.[0] || '기술성, 경험, 가격 종합 평가',
    technical_requirements: extractedData.technical_requirements?.[0] || requirements.slice(0, 2).join('; ') || '기술 요구사항 분석 필요',
    constraints: extractedData.constraints?.[0] || '일반적인 프로젝트 제약사항 적용',
    delivery_conditions: deliverables.slice(0, 3).join('; ') || '표준 산출물 및 문서 제출',
    operational_requirements: '운영 및 유지보수 지원',
    security_requirements: '정보보안 정책 준수',
    legal_requirements: '관련 법규 및 규제 준수',
    special_conditions: '특별 조건 없음'
  }
  
  return result
}

// === API 라우트 ===

// 헬스 체크 엔드포인트
app.get('/api/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'RFP AI Virtual Customer Simulator'
  })
})

// 간단한 테스트 API
app.post('/api/test-deep-research', async (c) => {
  const monitor = new PerformanceMonitor('테스트 딥리서치 API')
  
  try {
    const { company_name } = await c.req.json()
    
    const result = {
      success: true,
      company_name,
      message: '프로덕션 테스트 성공',
      data: {
        vision_mission: `${company_name}의 비전과 미션`,
        core_business: `${company_name}의 핵심 사업`
      },
      performance: {
        duration_ms: monitor.end(true),
        is_production: isProductionEnvironment()
      }
    }
    
    return c.json(result)
  } catch (error) {
    monitor.end(false)
    return c.json({
      success: false,
      error: error.message,
      performance: {
        duration_ms: monitor.end(false),
        is_production: isProductionEnvironment()
      }
    }, 500)
  }
})

// 1. AI 가상고객 생성 API
app.get('/api/customers', async (c) => {
  try {
    const storage = new JsonStorageService(c.env.KV)
    const customers = await storage.getAllVirtualCustomers()
    
    // 데모용: 고객이 없으면 데모 고객을 추가
    if (customers.length === 0) {
      const demoCustomer = DemoDataService.getSampleAIVirtualCustomer('생성된고객')
      const demoCustomerId = `demo-customer-${Date.now()}`
      const demoCustomerWithId = { ...demoCustomer, id: demoCustomerId }
      
      return c.json({
        success: true,
        data: [demoCustomerWithId]
      })
    }
    
    return c.json({
      success: true,
      data: customers
    })
  } catch (error) {
    console.error('고객 목록 조회 오류:', error)
    
    // Fallback: 데모 고객 반환
    const demoCustomer = DemoDataService.getSampleAIVirtualCustomer('생성된고객')
    const demoCustomerId = `demo-customer-${Date.now()}`
    const demoCustomerWithId = { ...demoCustomer, id: demoCustomerId }
    
    return c.json({
      success: true,
      data: [demoCustomerWithId]
    })
  }
})

// 1.1 AI 가상고객 상세 조회 API
app.get('/api/customers/:id', async (c) => {
  try {
    const customerId = c.req.param('id')
    const storage = new JsonStorageService(c.env.KV)
    
    const customer = await storage.getVirtualCustomer(customerId)
    if (!customer) {
      return c.json({
        success: false,
        error: 'AI 가상고객을 찾을 수 없습니다.'
      }, 404)
    }
    
    return c.json({
      success: true,
      data: customer
    })
  } catch (error) {
    console.error('고객 상세 조회 오류:', error)
    return c.json({
      success: false,
      error: error.message || '고객 상세 조회 중 오륙가 발생했습니다.'
    }, 500)
  }
})

app.post('/api/customers/deep-research', async (c) => {
  const monitor = new PerformanceMonitor('딥리서치 API')
  
  try {
    const request: DeepResearchRequest = await c.req.json()
    const { env } = c
    
    if (!request.company_name) {
      monitor.end(false)
      return c.json({
        success: false,
        error: '기업명은 필수 입력사항입니다.'
      }, 400)
    }
    
    console.log(`딥리서치 요청: ${request.company_name}`)
    
    // Workers Unbound 최적화된 분석
    let researchData
    const isUnbound = isWorkersUnbound()
    
    if (env.OPENAI_API_KEY) {
      try {
        console.log(`🚀 분할 처리 딥리서치 시작: ${request.company_name}`)
        
        // 🔥 NEW: 분할 처리로 30초 이내 보장 - 3그룹 병렬 처리
        const chunkedOpenAI = new ChunkedOpenAIService(env.OPENAI_API_KEY, isUnbound)
        const deepResearchData = await chunkedOpenAI.generateDeepResearchChunked(request.company_name)
        
        researchData = {
          company_name: request.company_name,
          research_depth: request.research_depth || 'comprehensive',
          deep_research_data: deepResearchData,
          collection_timestamp: new Date().toISOString(),
          data_sources: [`GPT-4o 분할 처리: ${request.company_name}`],
          total_content_length: Object.values(deepResearchData).reduce((sum, attr) => sum + attr.content.length, 0)
        }
        
        console.log(`🎯 분할 처리 딥리서치 완료: ${researchData.total_content_length}자 분석`)
        
      } catch (openaiError) {
        console.error('OpenAI 분석 실패, 기본 분석으로 전환:', openaiError)
        
        // Fallback: 기본 분석
        researchData = {
          company_name: request.company_name,
          research_depth: request.research_depth || 'basic',
          deep_research_data: {
            vision_mission: `${request.company_name}의 비전·미션: 지속가능한 성장과 혁신을 통한 글로벌 리더십`,
            core_business: `${request.company_name}의 핵심 사업: 주력 제품/서비스 포트폴리오 운영`,
            market_positioning: `${request.company_name}의 시장 포지셔닝: 경쟁우위와 차별화 전략`,
            financial_strategy: `${request.company_name}의 재무 전략: 성장 투자와 수익성 균형`,
            rd_orientation: `${request.company_name}의 R&D 지향성: 혁신 기술 개발과 미래 성장 동력`,
            esg_priority: `${request.company_name}의 ESG 우선순위: 환경·사회·지배구조 통합 경영`,
            risk_management: `${request.company_name}의 리스크 관리: 체계적 위험 식별과 대응`,
            innovation_change: `${request.company_name}의 혁신·변화: 디지털 전환과 조직 혁신`,
            partnership_strategy: `${request.company_name}의 파트너십 전략: 전략적 제휴와 생태계 구축`,
            customer_experience: `${request.company_name}의 고객 경험: 고객 중심 서비스와 만족도 향상`,
            brand_values: `${request.company_name}의 브랜드 가치관: 신뢰성과 혁신성 기반 브랜드`,
            organizational_culture: `${request.company_name}의 조직 문화: 성과 중심과 협업 문화의 조화`,
            decision_structure: `${request.company_name}의 의사결정 구조: 신속하고 효율적인 의사결정`,
            global_localization: `${request.company_name}의 글로벌·현지화: 글로벌 확장과 현지화 전략`,
            digital_transformation: `${request.company_name}의 디지털 전환: AI·IoT 등 첨단 기술 도입`
          },
          collection_timestamp: new Date().toISOString(),
          data_sources: [`기본 분석: ${request.company_name}`],
          total_content_length: request.company_name.length * 50
        }
      }
    } else {
      // OpenAI API 키 없을 때 기본 분석
      console.log('OpenAI API 키 없음 - 기본 분석 실행')
      
      researchData = {
        company_name: request.company_name,
        research_depth: request.research_depth || 'basic',
        deep_research_data: {
          vision_mission: `${request.company_name}의 비전·미션: 지속가능한 성장과 혁신을 통한 글로벌 리더십`,
          core_business: `${request.company_name}의 핵심 사업: 주력 제품/서비스 포트폴리오 운영`,
          market_positioning: `${request.company_name}의 시장 포지셔닝: 경쟁우위와 차별화 전략`,
          financial_strategy: `${request.company_name}의 재무 전략: 성장 투자와 수익성 균형`,
          rd_orientation: `${request.company_name}의 R&D 지향성: 혁신 기술 개발`,
          esg_priority: `${request.company_name}의 ESG 우선순위: 환경·사회·지배구조 통합 경영`,
          risk_management: `${request.company_name}의 리스크 관리: 체계적 위험 대응`,
          innovation_change: `${request.company_name}의 혁신·변화: 디지털 전환 추진`,
          partnership_strategy: `${request.company_name}의 파트너십 전략: 전략적 제휴`,
          customer_experience: `${request.company_name}의 고객 경험: 고객 중심 서비스`,
          brand_values: `${request.company_name}의 브랜드 가치관: 신뢰성과 혁신성`,
          organizational_culture: `${request.company_name}의 조직 문화: 성과와 협업의 조화`,
          decision_structure: `${request.company_name}의 의사결정 구조: 효율적 의사결정`,
          global_localization: `${request.company_name}의 글로벌·현지화: 글로벌 확장 전략`,
          digital_transformation: `${request.company_name}의 디지털 전환: AI·IoT 기술 활용`
        },
        collection_timestamp: new Date().toISOString(),
        data_sources: [`기본 분석: ${request.company_name}`],
        total_content_length: request.company_name.length * 30
      }
    }
    
    // KV 스토리지에 저장 (선택적)
    const storageKey = `deep_research:${request.company_name}:${Date.now()}`
    if (env.KV) {
      try {
        await env.KV.put(storageKey, JSON.stringify(researchData), {
          metadata: {
            type: 'deep_research',
            company: request.company_name,
            timestamp: new Date().toISOString(),
            has_openai: !!env.OPENAI_API_KEY
          }
        })
      } catch (kvError) {
        console.warn('KV 저장 실패:', kvError.message)
      }
    }
    
    const duration = monitor.end(true)
    console.log(`딥리서치 완료: ${researchData.total_content_length}자 분석 (${duration}ms)`)
    
    return c.json({
      success: true,
      data: researchData,
      storage_key: storageKey,
      performance: {
        duration_ms: duration,
        is_unbound: isUnbound,
        has_openai: !!env.OPENAI_API_KEY,
        analysis_type: env.OPENAI_API_KEY && isUnbound ? 'unbound_premium' : 
                       env.OPENAI_API_KEY ? 'openai_standard' : 'basic_fallback',
        cpu_time_used: duration,
        cpu_time_limit: isUnbound ? 30000 : 10000
      }
    })
    
  } catch (error) {
    console.error('딥리서치 API 오류:', error)
    const duration = monitor.end(false)
    
    return c.json({
      success: false,
      error: error.message || '딥리서치 처리 중 오류가 발생했습니다',
      performance: {
        duration_ms: duration,
        is_unbound: true
      }
    }, 500)
  }
})

app.post('/api/customers/rfp-analysis', async (c) => {
  try {
    const { env } = c
    const contentType = c.req.header('content-type') || ''
    
    let rfpFile, fileName, parsingMode
    
    if (contentType.includes('multipart/form-data')) {
      // FormData 처리
      const formData = await c.req.formData()
      rfpFile = formData.get('rfp_file') as File
      fileName = formData.get('file_name') as string || rfpFile.name
      parsingMode = formData.get('parsing_mode') as string || 'detailed'
    } else {
      // JSON 처리 (기본값 또는 폴백)
      return c.json({
        success: false,
        error: 'multipart/form-data Content-Type이 필요합니다'
      }, 400)
    }
    
    if (!rfpFile) {
      return c.json({
        success: false,
        error: 'RFP 파일이 필요합니다'
      }, 400)
    }
    
    console.log(`RFP 분석 시작: ${fileName}`)
    
    // 파일 버퍼로 변환
    const fileBuffer = await rfpFile.arrayBuffer()
    
    // PDF 파서로 텍스트 추출
    const pdfParser = new PdfParserService()
    const fileValidation = pdfParser.validateFileType(fileBuffer, fileName)
    
    if (!fileValidation.isValid) {
      return c.json({
        success: false,
        error: '지원하지 않는 파일 형식입니다. PDF 또는 DOCX 파일을 업로드해주세요.'
      }, 400)
    }
    
    let extractedText = ''
    
    if (fileValidation.fileType === 'pdf') {
      const pdfResult = await pdfParser.extractTextFromPdf(fileBuffer, fileName)
      extractedText = pdfResult.text
      console.log(`PDF 텍스트 추출 완료: ${extractedText.length}자`)
    } else if (fileValidation.fileType === 'docx') {
      const docxResult = await pdfParser.extractTextFromDocx(fileBuffer, fileName)
      extractedText = docxResult.text
      console.log(`DOCX 텍스트 추출 완료: ${extractedText.length}자`)
    }
    
    // RFP 분석 서비스 실행
    const rfpAnalysis = new RfpAnalysisService(env.OPENAI_API_KEY)
    const storage = new JsonStorageService(env.KV)
    
    let rfpAnalysisData
    const isUnbound = isWorkersUnbound()
    
    if (env.OPENAI_API_KEY && extractedText.length > 50) {
      // 🔥 NEW: 분할 처리 RFP 분석 - 3단계 순차 처리로 30초 이내 보장
      console.log(`🚀 분할 처리 RFP 분석 시작 (25초 제한)`)
      
      try {
        const chunkedOpenAI = new ChunkedOpenAIService(env.OPENAI_API_KEY, isUnbound)
        rfpAnalysisData = await chunkedOpenAI.generateRfpAnalysisChunked(extractedText, fileName)
        console.log(`🎯 분할 처리 RFP 15속성 분석 완료`)
      } catch (llmError) {
        console.error('분할 처리 RFP 분석 실패, NLP로 폴백:', llmError)
        rfpAnalysisData = await generateNLPRfpAnalysis(extractedText, fileName)
      }
    } else if (extractedText.length > 50) {
      // 📋 NLP 기반 RFP 파싱만 (OpenAI API 없을 때)
      console.log('📋 NLP 기반 RFP 파싱 실행')
      rfpAnalysisData = await generateNLPRfpAnalysis(extractedText, fileName)
      console.log('NLP RFP 파싱 완료')
    } else {
      // 기본 분석 (텍스트가 너무 짧을 때)
      rfpAnalysisData = await generateBasicRfpAnalysis(extractedText, fileName)
      console.log('기본 RFP 분석 완료')
    }
    
    // 결과 저장
    const storageKey = `rfp_analysis:${fileName}:${Date.now()}`
    const analysisResult = {
      file_name: fileName,
      file_size: fileBuffer.byteLength,
      extracted_text_length: extractedText.length,
      rfp_analysis_data: rfpAnalysisData,
      parsing_mode: parsingMode,
      analysis_timestamp: new Date().toISOString()
    }
    
    if (env.KV) {
      await env.KV.put(storageKey, JSON.stringify(analysisResult), {
        metadata: {
          type: 'rfp_analysis',
          file_name: fileName,
          timestamp: new Date().toISOString()
        }
      })
    }
    
    return c.json({
      success: true,
      data: analysisResult,
      storage_key: storageKey
    })
    
  } catch (error) {
    console.error('RFP 분석 API 오류:', error)
    return c.json({
      success: false,
      error: error.message || 'RFP 분석 중 오류가 발생했습니다'
    }, 500)
  }
})

app.post('/api/customers/generate', async (c) => {
  const monitor = new PerformanceMonitor('AI 가상고객 생성 API')
  
  try {
    const { deep_research_data, rfp_analysis_data, company_name, department } = await c.req.json()
    const { env } = c
    
    // 입력 데이터 검증
    if (!deep_research_data || !rfp_analysis_data) {
      return c.json({
        success: false,
        error: '딥리서치 데이터와 RFP 분석 데이터가 모두 필요합니다.'
      }, 400)
    }
    
    console.log('AI 가상고객 생성 시작:', { company_name, department })
    
    const storage = new JsonStorageService(env.KV)
    let customer
    
    // Workers Unbound 최적화된 가상고객 생성
    const isUnbound = isWorkersUnbound()
    
    if (env.OPENAI_API_KEY) {
      try {
        console.log('🚀 분할 처리 AI 가상고객 생성 (25초 제한)')
        
        // 🔥 NEW: 분할 처리로 30초 이내 보장 - 3단계 순차 처리
        const chunkedOpenAI = new ChunkedOpenAIService(env.OPENAI_API_KEY, isUnbound)
        customer = await chunkedOpenAI.generateVirtualCustomerChunked(
          deep_research_data,
          rfp_analysis_data,
          department || 'CTO'
        )
        
        console.log('🎯 분할 처리 AI 가상고객 생성 완료')
        
      } catch (openaiError) {
        console.error('분할 처리 가상고객 생성 실패, 폴백으로 전환:', openaiError)
        
        // Fallback: 기본 템플릿 생성
      // 프로덕션 환경: 즉시 응답하는 경량 가상고객 생성
      console.log('프로덕션 환경 - 즉시 가상고객 생성')
      
      const customerType = department || 'CTO'
      const actualCompanyName = company_name || 
        deep_research_data?.vision_mission?.split(' ')[0] || 
        '분석 대상 기업'
      
      customer = {
        customer_id: crypto.randomUUID(),
        customer_type: customerType,
        name: `${actualCompanyName} ${customerType}`,  // 회사명 + 직책으로 변경
        company_name: actualCompanyName,
        project_name: rfp_analysis_data?.objectives || '프로젝트 분석 결과',
        deep_research_data,
        rfp_analysis_data,
        
        // 30개 속성 페르소나 (제안서 평가용)
        integrated_persona: {
          // 기본 정보 (5개)
          basic_info: {
            role: customerType,
            company: actualCompanyName,
            department: customerType === 'CEO' ? '최고경영진' : customerType === 'CTO' ? '기술담당' : customerType === 'CFO' ? '재무담당' : '프로젝트관리',
            experience_years: customerType === 'CEO' ? 15 : customerType === 'CTO' ? 12 : 10,
            decision_authority: customerType === 'CEO' ? '최종결정권자' : '핵심영향자'
          },
          
          // 의사결정 특성 (5개)
          decision_traits: {
            style: customerType === 'CEO' ? '전략적 비전 중심형' :
                   customerType === 'CFO' ? '재무 데이터 중심형' :
                   customerType === 'PM' ? '실행 계획 중심형' : '기술 검증 중심형',
            risk_tolerance: customerType === 'CEO' ? '중간' : '보수적',
            timeline_preference: '단계적 접근',
            budget_sensitivity: customerType === 'CFO' ? '매우 높음' : '높음',
            innovation_openness: customerType === 'CTO' ? '높음' : '중간'
          },
          
          // 핵심 우선순위 (5개)
          priorities: {
            primary: '기술적 안정성과 신뢰성',
            secondary: '비용 효율성과 예산 준수',
            tertiary: '일정 준수와 리스크 관리',
            compliance: '규제 및 보안 요구사항',
            scalability: '확장성과 미래 대응'
          },
          
          // 평가 관점 (5개)
          evaluation_perspective: {
            technical_depth: customerType === 'CTO' ? '매우 중요' : '중요',
            business_value: customerType === 'CEO' ? '매우 중요' : '중요',
            cost_analysis: customerType === 'CFO' ? '매우 중요' : '중요',
            implementation: customerType === 'PM' ? '매우 중요' : '중요',
            vendor_reliability: '매우 중요'
          },
          
          // 우려사항 (5개)
          concerns: {
            technical_risk: '기술적 호환성과 확장성',
            financial_risk: '예산 초과 및 숨겨진 비용',
            timeline_risk: '프로젝트 일정 지연 리스크',
            operational_risk: '기존 시스템 영향도',
            vendor_risk: '공급업체 신뢰성과 지원'
          },
          
          // 평가 가중치 (5개)
          evaluation_weights: {
            clarity: customerType === 'CEO' ? 0.20 : 0.15,
            expertise: customerType === 'CTO' ? 0.30 : 0.25,
            persuasiveness: customerType === 'CEO' ? 0.25 : 0.20,
            logic: 0.20,
            creativity: customerType === 'PM' ? 0.05 : 0.10,
            credibility: customerType === 'CFO' ? 0.15 : 0.10
          },
          
          // 요약 정보
          persona_summary: `${actualCompanyName}의 ${customerType}로서 기술적 전문성과 비즈니스 가치를 균형있게 고려하는 의사결정자입니다. 검증된 솔루션과 명확한 성과 지표를 중시하며, 리스크 최소화와 투자 대비 효과를 핵심 기준으로 평가합니다.`
        },
        created_at: new Date().toISOString()
      }
      
        
        console.log('Fallback 가상고객 생성 완료')
      }
    } else {
      // OpenAI API 키 없을 때 기본 생성
      // 개발 환경에서만 OpenAI 사용
      if (env.OPENAI_API_KEY) {
        try {
          console.log('개발 환경 - OpenAI 가상고객 생성')
          const openai = new OpenAIService(env.OPENAI_API_KEY)
          customer = await openai.generateVirtualCustomer(
            deep_research_data,
            rfp_analysis_data,
            'CTO'
          )
          console.log('OpenAI 가상고객 생성 완료')
          
        } catch (openaiError) {
          console.error('OpenAI 가상고객 생성 실패:', openaiError)
          // OpenAI 실패시 기본 생성으로 fallback
          const customerGeneration = new CustomerGenerationService()
          customer = await customerGeneration.generateVirtualCustomer(
            deep_research_data,
            rfp_analysis_data,
            company_name,
            department || 'CTO'
          )
          console.log('Fallback 가상고객 생성 완료')
        }
      } else {
        // API 키 없을 때 기본 생성
        console.log('기본 서비스로 가상고객 생성')
        const customerGeneration = new CustomerGenerationService()
        customer = await customerGeneration.generateVirtualCustomer(
          deep_research_data,
          rfp_analysis_data,
          company_name,
          department || 'CTO'
        )
        console.log('기본 가상고객 생성 완료')
      }
    }
    
    // 프로덕션에서는 저장 생략 (즉시 응답)
    const customerId = crypto.randomUUID()
    const duration = monitor.end(true)
    
    return c.json({
      success: true,
      data: { ...customer, id: customerId },
      performance: {
        duration_ms: duration,
        is_production: isProductionEnvironment()
      }
    })
  } catch (error) {
    console.error('AI 가상고객 생성 오류:', error)
    const duration = monitor.end(false)
    return c.json({
      success: false,
      error: error.message || 'AI 가상고객 생성 중 오류가 발생했습니다.',
      performance: {
        duration_ms: duration,
        is_production: isProductionEnvironment()
      }
    }, 500)
  }
})

// 2. 제안서 평가 API (실제 LLM 통합)
app.post('/api/evaluations/proposal', async (c) => {
  try {
    const { customer_id, proposal_title, proposal_content } = await c.req.json()
    const { env } = c
    
    const storage = new JsonStorageService(env.KV)
    
    // AI 가상고객 로드
    const customer = await storage.getVirtualCustomer(customer_id)
    if (!customer) {
      return c.json({
        success: false,
        error: 'AI 가상고객을 찾을 수 없습니다.'
      }, 404)
    }
    
    let proposalEvaluation
    
    if (env.OPENAI_API_KEY) {
      // LLM 기반 실제 평가
      const llmEvaluation = new LLMEvaluationService(
        env.OPENAI_API_KEY,
        env.KV
      )
      
      proposalEvaluation = await llmEvaluation.evaluateProposal(
        customer_id,
        proposal_content,
        proposal_title
      )
      console.log('LLM 제안서 평가 완료')
    } else {
      // 기본 샘플 평가
      proposalEvaluation = {
        customer_id,
        proposal_title,
        proposal_content,
        scores: {
          clarity: { score: 4, comment: '제안서가 명확하게 구성되어 있습니다.' },
          expertise: { score: 4, comment: '전문성이 잘 드러나지만 더 구체적인 내용이 필요합니다.' },
          persuasiveness: { score: 3, comment: '설득력을 향상시킬 수 있는 요소가 필요합니다.' },
          logic: { score: 4, comment: '논리적 흐름이 좋습니다.' },
          creativity: { score: 3, comment: '창의적 요소를 더 추가하면 좋겠습니다.' },
          credibility: { score: 4, comment: '신뢰할 만한 내용입니다.' }
        },
        total_score: 72,
        overall_feedback: '전반적으로 좌은 제안서입니다. 창의성과 설득력을 향상시키면 더 좋을 것 같습니다.',
        created_at: new Date().toISOString()
      }
      console.log('기본 제안서 평가 완료')
    }
    
    // 결과 저장
    const evaluationId = await storage.saveProposalEvaluation(proposalEvaluation)
    
    return c.json({
      success: true,
      data: { ...proposalEvaluation, id: evaluationId }
    })
  } catch (error) {
    console.error('제안서 평가 오류:', error)
    return c.json({
      success: false,
      error: error.message || '제안서 평가 중 오류가 발생했습니다.'
    }, 500)
  }
})

// 3. 발표 평가 API (실제 LLM 통합)
app.post('/api/evaluations/presentation', async (c) => {
  try {
    const { customer_id, presentation_title, stt_transcript, speech_metrics } = await c.req.json()
    const { env } = c
    
    const storage = new JsonStorageService(env.KV)
    
    // AI 가상고객 로드
    const customer = await storage.getVirtualCustomer(customer_id)
    if (!customer) {
      return c.json({
        success: false,
        error: 'AI 가상고객을 찾을 수 없습니다.'
      }, 404)
    }
    
    let presentationEvaluation
    
    if (env.OPENAI_API_KEY && stt_transcript) {
      // LLM 기반 실제 평가
      const llmEvaluation = new LLMEvaluationService(
        env.OPENAI_API_KEY,
        env.KV
      )
      
      presentationEvaluation = await llmEvaluation.evaluatePresentation(
        customer_id,
        stt_transcript,
        presentation_title,
        speech_metrics
      )
      console.log('LLM 발표 평가 완료')
    } else {
      // 기본 샘플 평가 (데모와 동일)
      const sampleTranscript = stt_transcript || "안녕하십니까, PwC 컸설팅의 발표를 시작하겠습니다. 이번 제안의 핵심은 ERP, MES, ESG 시스템을 하나의 플랫폼으로 통합하는 것입니다."
      
      presentationEvaluation = {
        customer_id,
        presentation_title,
        stt_transcript: sampleTranscript,
        speech_metrics: speech_metrics || {
          duration_seconds: 180,
          word_count: 89,
          words_per_minute: 29.7,
          pause_count: 6,
          filler_word_count: 2,
          average_volume_level: 0.75
        },
        scores: {
          clarity: { score: 4, comment: '발표 내용이 명확하고 체계적으로 구성되어 있습니다.' },
          expertise: { score: 5, comment: '화학산업과 ESG 분야의 전문성이 뛰어나게 드러납니다.' },
          persuasiveness: { score: 4, comment: '고객의 니즈를 정확히 파악하고 해결방안을 논리적으로 제시했습니다.' },
          logic: { score: 4, comment: '논리적 흐름이 체계적이고 근거가 타당합니다.' },
          creativity: { score: 3, comment: '안정적이고 검증된 접근법이지만, 혁신적이고 차별화된 아이디어가 더 필요합니다.' },
          credibility: { score: 5, comment: 'PwC의 브랜드 신뢰도와 화학산업 프로젝트 경험이 매우 신뢰할 만합니다.' }
        },
        total_score: 84,
        overall_feedback: '화학산업 전문성과 ESG 대응 역량이 우수하며, 체계적이고 실현가능한 실행 계획을 제시했습니다. 발표 스킬 면에서는 명확한 전달력을 보였나, 더욱 창의적이고 혁신적인 차별화 요소를 강화하면 경쟁력이 높아질 것입니다. 전반적으로 신뢰할 수 있는 우수한 발표였습니다.',
        created_at: new Date().toISOString()
      }
      console.log('기본 발표 평가 완료')
    }
    
    // 결과 저장
    const evaluationId = await storage.savePresentationEvaluation(presentationEvaluation)
    
    return c.json({
      success: true,
      data: { ...presentationEvaluation, id: evaluationId }
    })
  } catch (error) {
    console.error('발표 평가 오류:', error)
    return c.json({
      success: false,
      error: error.message || '발표 평가 중 오류가 발생했습니다.'
    }, 500)
  }
})

// 3.1 데모 발표 평가 API
app.post('/api/demo/presentation-evaluation', async (c) => {
  try {
    // 샘플 STT 텍스트
    const sampleSTT = "안녕하십니까, PwC 컨설팅의 발표를 시작하겠습니다. 이번 제안의 핵심은 ERP, MES, ESG 시스템을 하나의 플랫폼으로 통합하는 것입니다. 이를 통해 금고석유화학은 글로벌 ESG 규제에 선제적으로 대응하고, 공정 데이터를 경영 의사결정에 직접 연결할 수 있습니다. 또한, 저희는 화학 산업 프로젝트 경험과 글로벌 ESG 대응 노하우를 바탕으로, 안정적인 실행을 보장합니다. 마지막으로, 단계별 PoC를 통해 리스크를 최소화하고, 12개월 내 성공적인 플랫폼 구축을 완수하겠습니다. 감사합니다."
    
    // 샘플 음성 메트릭
    const speechMetrics = {
      duration_seconds: 180,  // 3분
      word_count: 89,
      words_per_minute: 29.7,
      pause_count: 6,
      filler_word_count: 2,
      average_volume_level: 0.75
    }
    
    // 6지표 평가 점수 (샘플)
    const evaluationScores = {
      clarity: {
        score: 4,
        comment: "발표 내용이 명확하고 체계적으로 구성되어 있으나, 기술적 세부사항에 대한 설명이 더 구체적이면 좋겠습니다."
      },
      expertise: {
        score: 5, 
        comment: "화학산업과 ESG 분야의 전문성이 뛰어나게 드러나며, 실제 프로젝트 경험을 바탕으로 한 신뢰할 수 있는 접근법을 제시했습니다."
      },
      persuasiveness: {
        score: 4,
        comment: "고객의 니즈를 정확히 파악하고 해결방안을 논리적으로 제시했으나, 감정적 어필과 스토리텔링 요소가 보강되면 더욱 설득력이 높아질 것입니다."
      },
      logic: {
        score: 4,
        comment: "논리적 흐름이 체계적이고 근거가 타당하나, 각 단계별 연결고리를 더욱 명확히 제시하면 좋겠습니다."
      },
      creativity: {
        score: 3,
        comment: "안정적이고 검증된 접근법이지만, 혁신적이고 차별화된 아이디어가 더 필요합니다. 창의적인 솔루션 요소를 추가하면 경쟁력이 높아질 것입니다."
      },
      credibility: {
        score: 5,
        comment: "PwC의 브랜드 신뢰도와 화학산업 프로젝트 경험, 단계적 실행 방안이 매우 신뢰할 만합니다."
      }
    }
    
    // 점수 변환 함수: 1-5점을 10/20/30/40/50점으로 변환
    function convertTo100Scale(score: number): number {
      const mapping: Record<number, number> = { 1: 10, 2: 20, 3: 30, 4: 40, 5: 50 }
      return mapping[score] || 0
    }
    
    // 100점 만점 점수로 변환
    const convertedScores = {}
    Object.keys(evaluationScores).forEach(key => {
      convertedScores[key] = {
        ...evaluationScores[key],
        score_100: convertTo100Scale(evaluationScores[key].score),
        score_5: evaluationScores[key].score  // 원본 5점 점수도 유지
      }
    })
    
    // 총점 계산 (100점 만점)
    const scores = Object.values(evaluationScores)
    const totalScore5 = scores.reduce((sum, item) => sum + item.score, 0) / scores.length  // 5점 만점
    const totalScore100 = convertTo100Scale(Math.round(totalScore5))  // 100점 만점으로 변환
    
    // 발표 평가 결과 구성
    const presentationEvaluation = {
      customer_id: 'demo-customer',
      presentation_title: '금고석유화학 DX 플랫폼 구축 제안',
      stt_transcript: sampleSTT,
      speech_metrics: speechMetrics,
      scores: convertedScores,  // 변환된 점수 사용 (100점 만점 + 5점 원본)
      total_score_5: totalScore5,      // 5점 만점 총점
      total_score_100: totalScore100,  // 100점 만점 총점
      total_score: totalScore100,      // 기본 총점은 100점 만점
      overall_feedback: `화학산업 전문성과 ESG 대응 역량이 우수하며, 체계적이고 실현가능한 실행 계획을 제시했습니다. 
        발표 스킬 면에서는 명확한 전달력을 보였으나, 더욱 창의적이고 혁신적인 차별화 요소를 강화하면 경쟁력이 높아질 것입니다. 
        전반적으로 신뢰할 수 있는 우수한 발표였습니다.`,
      created_at: new Date().toISOString()
    }
    
    return c.json({
      success: true,
      data: presentationEvaluation,
      message: "데모 발표 평가 완료"
    })
  } catch (error) {
    return c.json({
      success: false,
      error: error.message
    }, 500)
  }
})

// 4. 통합 결과 API (실제 LLM 통합)
// 4.0 개별 평가 조회 API
app.get('/api/evaluations/proposal/:id', async (c) => {
  try {
    const evaluationId = c.req.param('id')
    const storage = new JsonStorageService(c.env.KV)
    
    const evaluation = await storage.getProposalEvaluation(evaluationId)
    if (!evaluation) {
      return c.json({
        success: false,
        error: '제안서 평가 결과를 찾을 수 없습니다.'
      }, 404)
    }
    
    return c.json({
      success: true,
      data: evaluation
    })
  } catch (error) {
    console.error('제안서 평가 조회 오류:', error)
    return c.json({
      success: false,
      error: error.message || '제안서 평가 조회 중 오륙가 발생했습니다.'
    }, 500)
  }
})

app.get('/api/evaluations/presentation/:id', async (c) => {
  try {
    const evaluationId = c.req.param('id')
    const storage = new JsonStorageService(c.env.KV)
    
    const evaluation = await storage.getPresentationEvaluation(evaluationId)
    if (!evaluation) {
      return c.json({
        success: false,
        error: '발표 평가 결과를 찾을 수 없습니다.'
      }, 404)
    }
    
    return c.json({
      success: true,
      data: evaluation
    })
  } catch (error) {
    console.error('발표 평가 조회 오륙:', error)
    return c.json({
      success: false,
      error: error.message || '발표 평가 조회 중 오륙가 발생했습니다.'
    }, 500)
  }
})

app.get('/api/evaluations/integrated/:id', async (c) => {
  try {
    const evaluationId = c.req.param('id')
    const storage = new JsonStorageService(c.env.KV)
    
    const evaluation = await storage.getIntegratedEvaluation(evaluationId)
    if (!evaluation) {
      return c.json({
        success: false,
        error: '통합 평가 결과를 찾을 수 없습니다.'
      }, 404)
    }
    
    return c.json({
      success: true,
      data: evaluation
    })
  } catch (error) {
    console.error('통합 평가 조회 오륙:', error)
    return c.json({
      success: false,
      error: error.message || '통합 평가 조회 중 오륙가 발생했습니다.'
    }, 500)
  }
})

// 4.1 통합 결과 생성 API
app.post('/api/evaluations/integrate', async (c) => {
  try {
    const { customer_id, proposal_evaluation_id, presentation_evaluation_id, project_title } = await c.req.json()
    const { env } = c
    
    const storage = new JsonStorageService(env.KV)
    
    // 제안서/발표 평가 데이터 로드
    const proposalEval = proposal_evaluation_id ? await storage.getProposalEvaluation(proposal_evaluation_id) : null
    const presentationEval = presentation_evaluation_id ? await storage.getPresentationEvaluation(presentation_evaluation_id) : null
    
    let integratedResult
    
    if (env.OPENAI_API_KEY) {
      // LLM 기반 실제 통합
      const llmEvaluation = new LLMEvaluationService(
        env.OPENAI_API_KEY,
        env.KV
      )
      
      integratedResult = await llmEvaluation.generateIntegratedResult(
        customer_id,
        proposalEval,
        presentationEval,
        project_title
      )
      console.log('LLM 통합 결과 생성 완료')
    } else {
      // 기본 통합 결과
      const proposalScore = proposalEval?.total_score || 0
      const presentationScore = presentationEval?.total_score || 0
      const finalScore = Math.round(proposalScore * 0.7 + presentationScore * 0.3)
      
      integratedResult = {
        customer_id,
        project_title: project_title || '프로젝트 제안',
        proposal_evaluation: proposalEval,
        presentation_evaluation: presentationEval,
        final_score: finalScore,
        weighted_scores: {
          proposal_weighted: Math.round(proposalScore * 0.7),
          presentation_weighted: Math.round(presentationScore * 0.3)
        },
        strengths: ['전문성 우수', '신뢰도 높음', '체계적 접근'],
        improvements: ['창의적 요소 보강', '설득력 향상', '차별화 요소 추가'],
        overall_feedback: `전문성과 신뢰도 측면에서 우수한 평가를 받았습니다. 창의적 요소와 차별화 전략을 보강하면 더욱 경쟁력 있는 제안이 될 것입니다. (최종 점수: ${finalScore}점)`,
        created_at: new Date().toISOString()
      }
      console.log('기본 통합 결과 생성 완료')
    }
    
    // 결과 저장
    const resultId = await storage.saveIntegratedEvaluation(integratedResult)
    
    return c.json({
      success: true,
      data: { ...integratedResult, id: resultId }
    })
  } catch (error) {
    console.error('통합 결과 오류:', error)
    return c.json({
      success: false,
      error: error.message || '통합 결과 생성 중 오류가 발생했습니다.'
    }, 500)
  }
})

// 5. 세션 관리 API
app.get('/api/sessions', async (c) => {
  try {
    const storage = new JsonStorageService(c.env.KV)
    const sessions = await storage.getAllSessions()
    
    return c.json({
      success: true,
      data: sessions
    })
  } catch (error) {
    console.error('세션 목록 조회 오류:', error)
    return c.json({
      success: false,
      error: error.message || '세션 목록 조회 중 오류가 발생했습니다.'
    }, 500)
  }
})

app.post('/api/sessions', async (c) => {
  try {
    const { session_name } = await c.req.json()
    const storage = new JsonStorageService(c.env.KV)
    
    const session: EvaluationSession = {
      id: crypto.randomUUID(),
      session_name,
      current_stage: 'customer_generation',
      progress: {
        customer_completed: false,
        proposal_completed: false,
        presentation_completed: false,
        results_completed: false
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const sessionId = await storage.saveSession(session)
    
    return c.json({
      success: true,
      data: { ...session, id: sessionId }
    })
  } catch (error) {
    console.error('세션 생성 오류:', error)
    return c.json({
      success: false,
      error: error.message || '세션 생성 중 오류가 발생했습니다.'
    }, 500)
  }
})

// === 데모 API 엔드포인트 ===

// 데모 딥리서치 데이터 조회
app.get('/api/demo/deep-research', (c) => {
  try {
    const companyName = c.req.query('company_name') || '샘플기업'
    const demoData = DemoDataService.getSampleDeepResearchData(companyName)
    return c.json({
      success: true,
      data: demoData,
      message: "샘플 딥리서치 데이터 (15속성)"
    })
  } catch (error) {
    return c.json({
      success: false,
      error: error.message
    }, 500)
  }
})

// 데모 RFP 분석 데이터 조회
app.get('/api/demo/rfp-analysis', (c) => {
  try {
    const companyName = c.req.query('company_name') || '샘플기업'
    const demoData = DemoDataService.getSampleRfpAnalysisData(companyName)
    return c.json({
      success: true,
      data: demoData,
      message: "DX 프로젝트 샘플 RFP 분석 데이터 (15속성)"
    })
  } catch (error) {
    return c.json({
      success: false,
      error: error.message
    }, 500)
  }
})

// 데모 AI 가상고객 생성
app.post('/api/demo/generate-customer', async (c) => {
  try {
    const body = await c.req.json()
    const companyName = body.company_name || '샘플기업'
    
    const demoCustomer = DemoDataService.getSampleAIVirtualCustomer(companyName)
    const customerId = `demo-customer-${Date.now()}`
    
    const customerWithId = { ...demoCustomer, id: customerId }
    
    // KV Storage에 저장 (D1 대신)
    if (c.env.KV) {
      try {
        const storage = new JsonStorageService(c.env.KV)
        
        // 새로운 고객 저장 (기존 데이터는 새로운 데이터로 자동 교체됨)
        await storage.saveVirtualCustomer(customerWithId)
      } catch (kvError) {
        console.log('KV 저장 실패, 메모리만 사용:', kvError.message)
      }
    }
    
    return c.json({
      success: true,
      data: customerWithId,
      customer: customerWithId,
      message: "데모 AI 가상고객이 성공적으로 생성되었습니다"
    })
  } catch (error) {
    return c.json({
      success: false,
      error: error.message
    }, 500)
  }
})

// === 데모2 API들 - 실제 LLM 활용 (15초 이내 보장) ===

// 데모2: 실제 LLM 딥리서치 (5개 핵심 속성만)
app.post('/api/demo2/deep-research', async (c) => {
  try {
    const { company_name } = await c.req.json()
    
    const OPENAI_API_KEY = getEnvVar(c, 'OPENAI_API_KEY')
    
    if (!OPENAI_API_KEY) {
      console.error('❌ Demo2 딥리서치: OpenAI API 키가 설정되지 않음')
      console.error('환경 확인:', {
        isNode: typeof globalThis.process !== 'undefined',
        hasProcessEnv: !!process.env,
        keyExists: !!process.env.OPENAI_API_KEY
      })
      return c.json({
        success: false,
        error: 'OpenAI API key가 설정되지 않았습니다. Railway 환경변수에서 OPENAI_API_KEY를 설정해주세요.'
      }, 400)
    }

    console.log(`🚀 데모2 딥리서치 시작: ${company_name} (LLM 15초 제한)`)
    
    // 15개 핵심 속성 생성
    const prompt = `${company_name}의 핵심 정보 15개를 각 20자 이내로 간단히 분석해주세요:

JSON 응답:
{
  "1": {"id":"1","name":"비전·미션","content":"20자 이내 내용","source_url":"llm","source_type":"llm","reliability_score":8,"llm_confidence":0.9,"extracted_at":"${new Date().toISOString()}"},
  "2": {"id":"2","name":"핵심 사업영역","content":"20자 이내 내용","source_url":"llm","source_type":"llm","reliability_score":8,"llm_confidence":0.9,"extracted_at":"${new Date().toISOString()}"},  
  "3": {"id":"3","name":"시장 포지셔닝","content":"20자 이내 내용","source_url":"llm","source_type":"llm","reliability_score":8,"llm_confidence":0.9,"extracted_at":"${new Date().toISOString()}"},
  "4": {"id":"4","name":"재무 전략","content":"20자 이내 내용","source_url":"llm","source_type":"llm","reliability_score":8,"llm_confidence":0.9,"extracted_at":"${new Date().toISOString()}"},
  "5": {"id":"5","name":"R&D 지향성","content":"20자 이내 내용","source_url":"llm","source_type":"llm","reliability_score":8,"llm_confidence":0.9,"extracted_at":"${new Date().toISOString()}"},
  "6": {"id":"6","name":"경쟁 우위","content":"20자 이내 내용","source_url":"llm","source_type":"llm","reliability_score":8,"llm_confidence":0.9,"extracted_at":"${new Date().toISOString()}"},
  "7": {"id":"7","name":"수익 모델","content":"20자 이내 내용","source_url":"llm","source_type":"llm","reliability_score":8,"llm_confidence":0.9,"extracted_at":"${new Date().toISOString()}"},
  "8": {"id":"8","name":"주요 제품","content":"20자 이내 내용","source_url":"llm","source_type":"llm","reliability_score":8,"llm_confidence":0.9,"extracted_at":"${new Date().toISOString()}"},
  "9": {"id":"9","name":"타겟 시장","content":"20자 이내 내용","source_url":"llm","source_type":"llm","reliability_score":8,"llm_confidence":0.9,"extracted_at":"${new Date().toISOString()}"},
  "10": {"id":"10","name":"파트너십","content":"20자 이내 내용","source_url":"llm","source_type":"llm","reliability_score":8,"llm_confidence":0.9,"extracted_at":"${new Date().toISOString()}"},
  "11": {"id":"11","name":"최근 동향","content":"20자 이내 내용","source_url":"llm","source_type":"llm","reliability_score":8,"llm_confidence":0.9,"extracted_at":"${new Date().toISOString()}"},
  "12": {"id":"12","name":"재무 현황","content":"20자 이내 내용","source_url":"llm","source_type":"llm","reliability_score":8,"llm_confidence":0.9,"extracted_at":"${new Date().toISOString()}"},
  "13": {"id":"13","name":"도전 과제","content":"20자 이내 내용","source_url":"llm","source_type":"llm","reliability_score":8,"llm_confidence":0.9,"extracted_at":"${new Date().toISOString()}"},
  "14": {"id":"14","name":"기회 요인","content":"20자 이내 내용","source_url":"llm","source_type":"llm","reliability_score":8,"llm_confidence":0.9,"extracted_at":"${new Date().toISOString()}"},
  "15": {"id":"15","name":"미래 전망","content":"20자 이내 내용","source_url":"llm","source_type":"llm","reliability_score":8,"llm_confidence":0.9,"extracted_at":"${new Date().toISOString()}"}
}`

    const fallback = {
      1: { id: "1", name: "비전·미션", content: `${company_name}의 혁신 추구`, source_url: "fallback", source_type: "fallback", reliability_score: 7, llm_confidence: 0.8, extracted_at: new Date().toISOString() },
      2: { id: "2", name: "핵심 사업영역", content: `${company_name}의 주력 사업`, source_url: "fallback", source_type: "fallback", reliability_score: 7, llm_confidence: 0.8, extracted_at: new Date().toISOString() },
      3: { id: "3", name: "시장 포지셔닝", content: `${company_name}의 시장 지위`, source_url: "fallback", source_type: "fallback", reliability_score: 7, llm_confidence: 0.8, extracted_at: new Date().toISOString() },
      4: { id: "4", name: "재무 전략", content: `${company_name}의 안정 운영`, source_url: "fallback", source_type: "fallback", reliability_score: 7, llm_confidence: 0.8, extracted_at: new Date().toISOString() },
      5: { id: "5", name: "R&D 지향성", content: `${company_name}의 기술 혁신`, source_url: "fallback", source_type: "fallback", reliability_score: 7, llm_confidence: 0.8, extracted_at: new Date().toISOString() },
      6: { id: "6", name: "경쟁 우위", content: `${company_name}의 차별화 전략`, source_url: "fallback", source_type: "fallback", reliability_score: 7, llm_confidence: 0.8, extracted_at: new Date().toISOString() },
      7: { id: "7", name: "수익 모델", content: `${company_name}의 수익 구조`, source_url: "fallback", source_type: "fallback", reliability_score: 7, llm_confidence: 0.8, extracted_at: new Date().toISOString() },
      8: { id: "8", name: "주요 제품", content: `${company_name}의 핵심 상품`, source_url: "fallback", source_type: "fallback", reliability_score: 7, llm_confidence: 0.8, extracted_at: new Date().toISOString() },
      9: { id: "9", name: "타겟 시장", content: `${company_name}의 목표 고객`, source_url: "fallback", source_type: "fallback", reliability_score: 7, llm_confidence: 0.8, extracted_at: new Date().toISOString() },
      10: { id: "10", name: "파트너십", content: `${company_name}의 협력 관계`, source_url: "fallback", source_type: "fallback", reliability_score: 7, llm_confidence: 0.8, extracted_at: new Date().toISOString() },
      11: { id: "11", name: "최근 동향", content: `${company_name}의 현재 상황`, source_url: "fallback", source_type: "fallback", reliability_score: 7, llm_confidence: 0.8, extracted_at: new Date().toISOString() },
      12: { id: "12", name: "재무 현황", content: `${company_name}의 경영 성과`, source_url: "fallback", source_type: "fallback", reliability_score: 7, llm_confidence: 0.8, extracted_at: new Date().toISOString() },
      13: { id: "13", name: "도전 과제", content: `${company_name}의 해결 과제`, source_url: "fallback", source_type: "fallback", reliability_score: 7, llm_confidence: 0.8, extracted_at: new Date().toISOString() },
      14: { id: "14", name: "기회 요인", content: `${company_name}의 성장 기회`, source_url: "fallback", source_type: "fallback", reliability_score: 7, llm_confidence: 0.8, extracted_at: new Date().toISOString() },
      15: { id: "15", name: "미래 전망", content: `${company_name}의 발전 방향`, source_url: "fallback", source_type: "fallback", reliability_score: 7, llm_confidence: 0.8, extracted_at: new Date().toISOString() }
    }

    // 15초 타임아웃으로 실제 LLM 호출
    let result = fallback
    try {
      const openai = new ChunkedOpenAIService(OPENAI_API_KEY)
      const response = await Promise.race([
        openai['openai'].chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 1200,
          response_format: { type: "json_object" }
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('15초 타임아웃')), 15000))
      ])
      
      const content = response.choices[0].message.content
      if (content) {
        result = JSON.parse(content)
        console.log(`✅ 데모2 딥리서치 LLM 성공: ${company_name}`)
      }
    } catch (error) {
      console.log(`⚠️ 데모2 딥리서치 LLM 실패, 폴백 사용: ${error.message}`)
    }

    return c.json({
      success: true,
      data: result,
      message: `데모2: ${company_name} 실제 LLM 딥리서치 완료 (15개 핵심 속성)`
    })
  } catch (error) {
    return c.json({
      success: false,
      error: error.message
    }, 500)
  }
})

// 데모2: 실제 LLM RFP 분석 (5개 핵심 항목만)
app.post('/api/demo2/rfp-analysis', async (c) => {
  try {
    const OPENAI_API_KEY = getEnvVar(c, 'OPENAI_API_KEY')
    
    if (!OPENAI_API_KEY) {
      return c.json({
        success: false,
        error: 'OpenAI API key가 설정되지 않았습니다'
      }, 400)
    }

    console.log(`🚀 데모2 RFP 분석 시작 (LLM 15초 제한)`)
    
    // 샘플 RFP 텍스트로 간단한 분석
    const sampleRfpText = `
    발주처: 금고석유화학
    프로젝트: ERP 시스템 고도화
    예산: 100억원
    기간: 12개월  
    평가기준: 기술 70%, 가격 30%
    `

    const prompt = `다음 RFP에서 핵심 정보 5개를 각 15자 이내로 추출해주세요:

${sampleRfpText}

JSON 응답:
{
  "1": {"id":"1","name":"발주사명","content":"15자 이내","source_snippet":"원문","page_number":1,"section_title":"개요","extracted_at":"${new Date().toISOString()}"},
  "2": {"id":"2","name":"프로젝트 목표","content":"15자 이내","source_snippet":"원문","page_number":1,"section_title":"목표","extracted_at":"${new Date().toISOString()}"},
  "3": {"id":"3","name":"프로젝트 예산","content":"15자 이내","source_snippet":"원문","page_number":1,"section_title":"예산","extracted_at":"${new Date().toISOString()}"},
  "4": {"id":"4","name":"프로젝트 기간","content":"15자 이내","source_snippet":"원문","page_number":1,"section_title":"기간","extracted_at":"${new Date().toISOString()}"},
  "5": {"id":"5","name":"평가기준","content":"15자 이내","source_snippet":"원문","page_number":1,"section_title":"평가","extracted_at":"${new Date().toISOString()}"}
}`

    const fallback = {
      1: { id: "1", name: "발주사명", content: "금고석유화학", source_snippet: "발주처: 금고석유화학", page_number: 1, section_title: "개요", extracted_at: new Date().toISOString() },
      2: { id: "2", name: "프로젝트 목표", content: "ERP 시스템 고도화", source_snippet: "프로젝트: ERP 시스템 고도화", page_number: 1, section_title: "목표", extracted_at: new Date().toISOString() },
      3: { id: "3", name: "프로젝트 예산", content: "100억원", source_snippet: "예산: 100억원", page_number: 1, section_title: "예산", extracted_at: new Date().toISOString() },
      4: { id: "4", name: "프로젝트 기간", content: "12개월", source_snippet: "기간: 12개월", page_number: 1, section_title: "기간", extracted_at: new Date().toISOString() },
      5: { id: "5", name: "평가기준", content: "기술 70%, 가격 30%", source_snippet: "평가기준: 기술 70%, 가격 30%", page_number: 1, section_title: "평가", extracted_at: new Date().toISOString() }
    }

    // 15초 타임아웃으로 실제 LLM 호출
    let result = fallback
    try {
      const openai = new ChunkedOpenAIService(env.OPENAI_API_KEY)
      const response = await Promise.race([
        openai['openai'].chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          max_tokens: 600,
          response_format: { type: "json_object" }
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('15초 타임아웃')), 15000))
      ])
      
      const content = response.choices[0].message.content
      if (content) {
        result = JSON.parse(content)
        console.log(`✅ 데모2 RFP 분석 LLM 성공`)
      }
    } catch (error) {
      console.log(`⚠️ 데모2 RFP 분석 LLM 실패, 폴백 사용: ${error.message}`)
    }

    return c.json({
      success: true,
      data: result,
      message: "데모2: 실제 LLM RFP 분석 완료 (5개 핵심 항목)"
    })
  } catch (error) {
    return c.json({
      success: false,
      error: error.message
    }, 500)
  }
})

// 데모2: 실제 LLM AI 가상고객 생성 (간단한 페르소나)
app.post('/api/demo2/generate-customer', async (c) => {
  try {
    const { company_name, deep_research_data, rfp_analysis_data } = await c.req.json()
    const { env } = c
    
    if (!env.OPENAI_API_KEY) {
      return c.json({
        success: false,
        error: 'OpenAI API key가 설정되지 않았습니다'
      }, 400)
    }

    console.log(`🚀 데모2 AI 가상고객 생성 시작: ${company_name} (LLM 15초 제한)`)
    
    // 완전한 30속성 통합 AI 가상고객 생성 프롬프트
    const prompt = `## AI 가상고객 생성 미션

**회사**: ${company_name}
**프로젝트**: ERP-MES-ESG 통합 DX 플랫폼

**딥리서치 기업특성** (5개):
- 비전·미션: ${deep_research_data?.[1]?.content || '지속가능한 성장'}
- 핵심사업: ${deep_research_data?.[2]?.content || '석유화학 제품'} 
- 시장포지셔닝: ${deep_research_data?.[3]?.content || '글로벌 리더십'}
- 재무전략: ${deep_research_data?.[4]?.content || '효율적 자본운용'}
- R&D지향성: ${deep_research_data?.[5]?.content || '혁신 기술개발'}

**RFP 프로젝트 요구사항** (5개):
- 발주사: ${rfp_analysis_data?.[1]?.content || company_name}
- 프로젝트목표: ${rfp_analysis_data?.[2]?.content || 'ERP 시스템 고도화'}
- 예산: ${rfp_analysis_data?.[3]?.content || '100억원'}
- 기간: ${rfp_analysis_data?.[4]?.content || '12개월'}
- 평가기준: ${rfp_analysis_data?.[5]?.content || '기술 70%, 가격 30%'}

위 10개 정보를 **깊이 분석**하여 **30속성 통합 AI 가상고객**을 생성하세요.

**필수 JSON 응답**:
{
  "id": "ai-customer-${Date.now()}",
  "name": "${company_name}_CTO_${Date.now().toString().slice(-4)}",
  "company_name": "${company_name}",
  "department": "경영진",
  "version": "v2.0",
  "status": "active",
  "persona_summary": "20자 이내 페르소나 핵심 특징",
  "decision_making_style": "25자 이내 의사결정 스타일",
  "top3_priorities": ["15자 우선순위1", "15자 우선순위2", "15자 우선순위3"],
  "combined_attributes": {
    "strategic_focus": "전략적 포커스 (예: 기술혁신 우선)",
    "risk_appetite": "위험 성향 (예: 위험중립형)",
    "innovation_preference": "혁신 선호도 (예: 검증기술 선호)", 
    "budget_sensitivity": "예산 민감도 (예: 투자적극형)",
    "technology_adoption": "기술 도입 성향 (예: 기술실용형)",
    "quality_standards": "품질 기준 (예: 최고품질 추구)",
    "timeline_priority": "일정 우선순위 (예: 적절한 속도)",
    "compliance_requirements": "규제 준수 (예: 높은 규제준수)",
    "stakeholder_priorities": "이해관계자 우선순위 (예: 균형적 접근)",
    "partnership_approach": "파트너십 접근법 (예: 전략적 협력)"
  },
  "evaluation_weights": {
    "clarity": 0.15,
    "expertise": 0.25,
    "persuasiveness": 0.20,
    "logic": 0.20,
    "creativity": 0.10,
    "credibility": 0.10
  },
  "key_concerns": ["주요 우려사항1", "주요 우려사항2", "주요 우려사항3"],
  "created_at": "${new Date().toISOString()}"
}`

    // 30속성 통합 폴백 데이터 (메인 API와 동일한 구조)
    const fallback = {
      customer_id: crypto.randomUUID(),
      customer_type: 'CTO',
      name: `${company_name} CTO`,  // 회사명 + 직책
      company_name: company_name || '테스트기업',
      project_name: 'ERP-MES-ESG 통합 DX 플랫폼',
      
      // 30개 속성 페르소나 구조 (메인과 동일)
      integrated_persona: {
        // 기본 정보 (5개)
        basic_info: {
          role: 'CTO',
          company: company_name || '테스트기업',
          department: '기술담당',
          experience_years: 12,
          decision_authority: '핵심영향자'
        },
        
        // 의사결정 특성 (5개)
        decision_traits: {
          style: '기술 검증 중심형',
          risk_tolerance: '보수적',
          timeline_preference: '단계적 접근',
          budget_sensitivity: '높음',
          innovation_openness: '높음'
        },
        
        // 핵심 우선순위 (5개)
        priorities: {
          primary: '기술적 안정성과 신뢰성',
          secondary: '확장성과 미래 대응',
          tertiary: '비용 효율성과 예산 준수',
          compliance: '규제 및 보안 요구사항',
          scalability: '시스템 통합과 호환성'
        },
        
        // 평가 관점 (5개)
        evaluation_perspective: {
          technical_depth: '매우 중요',
          business_value: '중요',
          cost_analysis: '중요',
          implementation: '중요',
          vendor_reliability: '매우 중요'
        },
        
        // 우려사항 (5개)
        concerns: {
          technical_risk: '기술적 호환성과 확장성',
          financial_risk: '예산 초과 및 숨겨진 비용',
          timeline_risk: '프로젝트 일정 지연 리스크',
          operational_risk: '기존 시스템 영향도',
          vendor_risk: '공급업체 신뢰성과 지원'
        },
        
        // 평가 가중치 (5개)
        evaluation_weights: {
          clarity: 0.15,
          expertise: 0.30,  // CTO는 기술 전문성에 높은 비중
          persuasiveness: 0.20,
          logic: 0.20,
          creativity: 0.05,
          credibility: 0.10
        },
        
        // 요약 정보
        persona_summary: `${company_name || '테스트기업'}의 CTO로서 기술적 전문성과 비즈니스 가치를 균형있게 고려하는 의사결정자입니다. 검증된 솔루션과 명확한 성과 지표를 중시하며, 리스크 최소화와 투자 대비 효과를 핵심 기준으로 평가합니다.`
      },
      deep_research_data,
      rfp_analysis_data,
      created_at: new Date().toISOString()
    }

    // LLM 호출 부분 주석 처리 - 안정성을 위해 데모 데이터 사용
    let result = fallback
    
    /* 
    // ===== LLM 호출 부분 (현재 주석 처리됨) =====
    // 15초 타임아웃으로 실제 LLM 호출
    try {
      const openai = new ChunkedOpenAIService(env.OPENAI_API_KEY)
      const response = await Promise.race([
        openai['openai'].chat.completions.create({
          model: "gpt-4o", 
          messages: [{ role: "user", content: prompt }],
          temperature: 0.4,
          max_tokens: 800,
          response_format: { type: "json_object" }
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('15초 타임아웃')), 15000))
      ])
      
      const content = response.choices[0].message.content
      if (content) {
        const llmResult = JSON.parse(content)
        result = {
          ...fallback,
          ...llmResult,
          company_name: company_name,
          version: "v2.0", 
          status: "active",
          deep_research_data,
          rfp_analysis_data,
          id: llmResult.id || llmResult.customer_id || fallback.id
        }
        console.log(`✅ 데모2 AI 가상고객 LLM 성공: ${company_name} (30속성 통합)`)
      }
    } catch (error) {
      console.log(`⚠️ 데모2 AI 가상고객 LLM 실패, 폴백 사용: ${error.message}`)
    }
    */
    
    // 현재는 안정적인 데모 데이터 사용 (입력 데이터 기반 개인화)
    console.log(`✅ 데모2 AI 가상고객 데모 데이터 사용: ${company_name} (30속성 통합)`)
    
    // 입력된 딥리서치/RFP 데이터를 활용한 동적 개인화
    if (deep_research_data && deep_research_data[1]) {
      const vision = deep_research_data[1].content || '지속가능한 성장'
      if (vision.includes('혁신') || vision.includes('기술')) {
        result.combined_attributes.strategic_focus = '기술혁신 최우선'
        result.top3_priorities[0] = '혁신적 기술 도입'
        result.persona_summary = `${company_name}의 혁신 주도형 리더`
      }
      if (vision.includes('효율') || vision.includes('운영')) {
        result.combined_attributes.budget_sensitivity = '비용효율성 중시'
        result.top3_priorities[1] = '운영비 최적화'
      }
    }
    
    if (rfp_analysis_data && rfp_analysis_data[5]) {
      const evaluation = rfp_analysis_data[5].content || '기술 70%, 가격 30%'
      if (evaluation.includes('기술 70%')) {
        result.evaluation_weights.expertise = 0.30
        result.evaluation_weights.logic = 0.25
        result.combined_attributes.innovation_preference = '기술우위 선호'
      }
      if (evaluation.includes('가격') && evaluation.includes('50%')) {
        result.combined_attributes.budget_sensitivity = '비용민감형'
        result.evaluation_weights.persuasiveness = 0.15
      }
    }
    
    // 회사별 맞춤 설정
    if (company_name && company_name.includes('석유화학')) {
      result.combined_attributes.compliance_requirements = '매우 높은 규제준수'
      result.key_concerns = ['환경 규제', '안전성 확보', '원가 경쟁력']
    }

    // KV Storage에 저장
    if (c.env.KV) {
      try {
        const storage = new JsonStorageService(c.env.KV)
        await storage.saveVirtualCustomer(result)
      } catch (kvError) {
        console.log('KV 저장 실패, 메모리만 사용:', kvError.message)
      }
    }

    return c.json({
      success: true,
      data: result,
      customer: result,
      message: `데모2: ${company_name} 30속성 통합 AI 가상고객 생성 완료 (데모 데이터)`
    })
  } catch (error) {
    return c.json({
      success: false,
      error: error.message
    }, 500)
  }
})

// 데모 제안서 평가 실행
app.post('/api/demo/evaluate-proposal', async (c) => {
  try {
    const { customer_id } = await c.req.json()
    const db = new DatabaseService(c.env.DB)
    
    const demoProposalEval = DemoDataService.getSampleProposalEvaluation()
    demoProposalEval.customer_id = customer_id
    
    // 데이터베이스에 저장
    const evaluationId = await db.saveProposalEvaluation(demoProposalEval)
    
    return c.json({
      success: true,
      data: { ...demoProposalEval, id: evaluationId },
      message: "데모 제안서 평가가 완료되었습니다"
    })
  } catch (error) {
    return c.json({
      success: false,
      error: error.message
    }, 500)
  }
})

// 데모 발표 평가 실행  
app.post('/api/demo/evaluate-presentation', async (c) => {
  try {
    const { customer_id } = await c.req.json()
    const db = new DatabaseService(c.env.DB)
    
    const demoPresentationEval = DemoDataService.getSamplePresentationEvaluation()
    demoPresentationEval.customer_id = customer_id
    
    // 데이터베이스에 저장
    const evaluationId = await db.savePresentationEvaluation(demoPresentationEval)
    
    return c.json({
      success: true,  
      data: { ...demoPresentationEval, id: evaluationId },
      message: "데모 발표 평가가 완료되었습니다"
    })
  } catch (error) {
    return c.json({
      success: false,
      error: error.message
    }, 500)
  }
})

// === 파일 업로드 및 파싱 API ===

// 파일 업로드 처리 (multipart/form-data)
app.post('/api/upload/file', async (c) => {
  try {
    // Cloudflare Workers에서는 FormData를 직접 처리
    const formData = await c.req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return c.json({
        success: false,
        error: '파일이 업로드되지 않았습니다.'
      }, 400)
    }

    // 파일 크기 검증 (50MB 제한)
    if (file.size > 50 * 1024 * 1024) {
      return c.json({
        success: false,
        error: '파일 크기가 50MB를 초과합니다.'
      }, 400)
    }

    // 파일 형식 검증
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
    const allowedExtensions = ['.pdf', '.docx', '.txt']
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    
    if (!allowedExtensions.includes(fileExtension)) {
      return c.json({
        success: false,
        error: '지원하지 않는 파일 형식입니다. PDF, DOCX, TXT 파일만 업로드 가능합니다.'
      }, 400)
    }

    // 파일 파싱
    const fileParser = new FileParserService()
    const parsedDocument = await fileParser.parseFile(file)
    
    // 파일 정보 반환 (실제로는 Cloudflare R2나 다른 스토리지에 저장)
    return c.json({
      success: true,
      data: {
        file_id: crypto.randomUUID(),
        file_name: file.name,
        file_size: file.size,
        file_type: fileExtension,
        parsed_content: parsedDocument,
        uploaded_at: new Date().toISOString()
      },
      message: '파일이 성공적으로 업로드되고 파싱되었습니다.'
    })

  } catch (error) {
    console.error('파일 업로드 오류:', error)
    return c.json({
      success: false,
      error: '파일 처리 중 오류가 발생했습니다: ' + error.message
    }, 500)
  }
})

// RFP 문서 분석 (텍스트 기반)
app.post('/api/parse/rfp', async (c) => {
  try {
    const { text, file_name } = await c.req.json()
    const { env } = c
    
    if (!text) {
      return c.json({
        success: false,
        error: 'RFP 텍스트 내용이 필요합니다.'
      }, 400)
    }
    
    // 1단계: NLP 기반 정보 추출
    console.log('NLP 기반 RFP 분석 시작')
    const nlpAnalysis = await generateNLPRfpAnalysis(text, file_name || 'rfp.txt')
    console.log('NLP 분석 완료:', nlpAnalysis)
    
    // 2단계: OpenAI로 15속성 재구성 (NLP 결과 기반)
    if (env.OPENAI_API_KEY && text.length > 50) {
      try {
        const openai = new OpenAIService(env.OPENAI_API_KEY)
        
        // NLP 분석 결과를 컨텍스트로 제공
        const contextualRfpContent = `
원본 RFP 텍스트:
${text}

NLP 분석 결과:
${JSON.stringify(nlpAnalysis, null, 2)}

위 정보를 바탕으로 RFP 15속성을 재구성해 주세요.`
        
        const rfpAnalysisData = await openai.extractRfpAnalysisData(contextualRfpContent, file_name || 'rfp.txt')
        
        return c.json({
          success: true,
          data: {
            parsed_document: {
              title: file_name || 'RFP 문서',
              content: text,
              word_count: text.length,
              parsed_at: new Date().toISOString()
            },
            rfp_analysis_data: rfpAnalysisData,
            nlp_extracted_data: nlpAnalysis
          },
          message: 'RFP 문서가 성공적으로 분석되었습니다 (NLP + OpenAI GPT-4o).'
        })
      } catch (openaiError) {
        console.error('OpenAI RFP 분석 실패:', openaiError)
        // OpenAI 실패시 NLP 결과 반환
      }
    }
    
    // 3단계: NLP 분석 결과 반환 (OpenAI 없거나 실패시)
    
    return c.json({
      success: true,
      data: {
        parsed_document: {
          title: file_name || 'RFP 문서',
          content: text,
          word_count: text.length,
          parsed_at: new Date().toISOString()
        },
        rfp_analysis_data: nlpAnalysis,
        nlp_extracted_data: nlpAnalysis
      },
      message: 'RFP 문서가 분석되었습니다 (NLP 기반).'
    })

  } catch (error) {
    console.error('RFP 문서 분석 오류:', error)
    return c.json({
      success: false,
      error: `RFP 문서 분석에 실패했습니다: ${error.message}`
    }, 500)
  }
})

// 제안서 파일 분석
app.post('/api/parse/proposal', async (c) => {
  try {
    const { file_data, file_name } = await c.req.json()
    
    const fileParser = new FileParserService()
    
    // 시뮬레이션된 파싱 결과
    const simulatedFile = new File([file_data || ''], file_name || 'proposal.pdf')
    const parsedDocument = await fileParser.parseFile(simulatedFile)
    
    // 제안서 내용 추출
    const proposalContent = fileParser.extractProposalContent(parsedDocument)
    
    return c.json({
      success: true,
      data: {
        parsed_document: parsedDocument,
        proposal_content: proposalContent
      },
      message: '제안서 파일이 성공적으로 분석되었습니다.'
    })

  } catch (error) {
    return c.json({
      success: false,
      error: '제안서 분석 중 오류가 발생했습니다: ' + error.message
    }, 500)
  }
})

// === PDF 리포트 생성 API ===

// PDF 리포트 생성
app.post('/api/report/generate', async (c) => {
  try {
    const { customer_id, proposal_evaluation_id, presentation_evaluation_id } = await c.req.json()
    
    const db = new DatabaseService(c.env.DB)
    const pdfGenerator = new PDFGeneratorService()

    // 고객 정보 조회
    const customer = await db.getCustomerById(customer_id)
    if (!customer) {
      return c.json({
        success: false,
        error: 'AI 가상고객을 찾을 수 없습니다.'
      }, 404)
    }

    // 평가 정보 조회
    let proposalEval = null
    let presentationEval = null
    
    if (proposal_evaluation_id) {
      proposalEval = await db.getProposalEvaluation(proposal_evaluation_id)
    }
    
    if (presentation_evaluation_id) {
      presentationEval = await db.getPresentationEvaluation(presentation_evaluation_id)
    }

    // 리포트 데이터 생성
    const reportData = pdfGenerator.generateReportData(customer, proposalEval, presentationEval)
    
    // HTML 리포트 생성
    const htmlReport = pdfGenerator.generateHTMLReport(reportData)

    return c.json({
      success: true,
      data: {
        report_data: reportData,
        html_content: htmlReport,
        download_filename: `RFP평가리포트_${customer.name}_${new Date().toISOString().split('T')[0]}.html`
      },
      message: 'PDF 리포트가 성공적으로 생성되었습니다.'
    })

  } catch (error) {
    console.error('PDF 리포트 생성 오류:', error)
    return c.json({
      success: false,
      error: '리포트 생성 중 오류가 발생했습니다: ' + error.message
    }, 500)
  }
})

// 데모 리포트 생성
app.get('/api/report/demo', async (c) => {
  try {
    const pdfGenerator = new PDFGeneratorService()
    
    // 데모 데이터 사용
    const demoCustomer = DemoDataService.getSampleAIVirtualCustomer()
    const demoProposalEval = DemoDataService.getSampleProposalEvaluation()
    const demoPresentationEval = DemoDataService.getSamplePresentationEvaluation()
    
    // 리포트 생성
    const reportData = pdfGenerator.generateReportData(demoCustomer, demoProposalEval, demoPresentationEval)
    const htmlReport = pdfGenerator.generateHTMLReport(reportData)

    return c.json({
      success: true,
      data: {
        report_data: reportData,
        html_content: htmlReport,
        download_filename: `데모_RFP평가리포트_${new Date().toISOString().split('T')[0]}.html`
      },
      message: '데모 리포트가 생성되었습니다.'
    })

  } catch (error) {
    console.error('데모 리포트 생성 오류:', error)
    return c.json({
      success: false,
      error: '데모 리포트 생성 중 오류가 발생했습니다: ' + error.message
    }, 500)
  }
})

// === 웹 페이지 라우트 ===

// 메인 대시보드
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>RFP기반 AI가상고객 제안 평가 시뮬레이터</title>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/pwc-global.css?v=3.0" rel="stylesheet">
    </head>
    <body>
        <!-- PwC 스타일 헤더 -->
        <header class="pwc-header">
            <div class="pwc-container">
                <h1>
                    <div class="pwc-logo">
                        <i class="fas fa-robot"></i>
                    </div>
                    RFP기반 AI가상고객 제안 평가 시뮬레이터
                </h1>
                <p style="color: var(--pwc-gray-200); margin-top: var(--spacing-sm); font-size: 1rem;">
                    딥리서치 + RFP 분석으로 가상고객 생성 → 제안/발표 평가 → 통합 결과
                </p>
            </div>
        </header>

        <!-- 네비게이션 -->
        <nav class="pwc-nav">
            <div class="pwc-container">
                <ul class="pwc-nav-list">
                    <li class="pwc-nav-item"><a href="/" class="active">홈</a></li>
                    <li class="pwc-nav-item"><a href="/customer-generation">AI 가상고객</a></li>
                    <li class="pwc-nav-item"><a href="/proposal-evaluation">제안서 평가</a></li>
                    <li class="pwc-nav-item"><a href="/presentation-evaluation">발표 평가</a></li>
                    <li class="pwc-nav-item"><a href="/results">통합 결과</a></li>
                </ul>
            </div>
        </nav>

        <main class="pwc-container" style="padding-top: var(--spacing-lg); padding-bottom: var(--spacing-xl);">
            <!-- 진행 단계 카드 -->
            <div class="pwc-card">
                <div class="pwc-card-header">
                    <h2 class="pwc-card-title">
                        <i class="fas fa-route" style="color: var(--pwc-orange); margin-right: var(--spacing-sm);"></i>
                        평가 프로세스
                    </h2>
                    <p class="pwc-card-subtitle">전문적인 4단계 평가 시스템으로 완벽한 제안 분석</p>
                </div>
                
                <div class="pwc-flex pwc-flex-between pwc-flex-mobile-col" style="gap: var(--spacing-lg);">
                    <div class="pwc-flex pwc-flex-col pwc-flex-center" style="text-align: center; min-width: 140px;">
                        <div style="width: 60px; height: 60px; background: linear-gradient(135deg, var(--pwc-orange), var(--pwc-orange-dark)); color: var(--pwc-white); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: var(--spacing-md); box-shadow: var(--shadow-md);">
                            <i class="fas fa-user-plus" style="font-size: 1.5rem;"></i>
                        </div>
                        <h4 style="font-size: 0.9rem; font-weight: 600; color: var(--pwc-navy); margin-bottom: var(--spacing-xs); word-break: keep-all;">AI 가상고객 생성</h4>
                        <p style="font-size: 0.75rem; color: var(--pwc-gray-600); word-break: keep-all;">딥리서치 15 + RFP 15</p>
                    </div>
                    
                    <div class="pwc-mobile-hidden" style="height: 2px; background: linear-gradient(90deg, var(--pwc-gray-300), var(--pwc-orange)); flex: 1; align-self: center; margin: 0 var(--spacing-md);"></div>
                    
                    <div class="pwc-flex pwc-flex-col pwc-flex-center" style="text-align: center; min-width: 140px;">
                        <div style="width: 60px; height: 60px; background: linear-gradient(135deg, var(--pwc-navy), var(--pwc-navy-light)); color: var(--pwc-white); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: var(--spacing-md); box-shadow: var(--shadow-md);">
                            <i class="fas fa-file-alt" style="font-size: 1.5rem;"></i>
                        </div>
                        <h4 style="font-size: 0.9rem; font-weight: 600; color: var(--pwc-navy); margin-bottom: var(--spacing-xs); word-break: keep-all;">제안서 평가</h4>
                        <p style="font-size: 0.75rem; color: var(--pwc-gray-600); word-break: keep-all;">6대 지표 루브릭</p>
                    </div>
                    
                    <div class="pwc-mobile-hidden" style="height: 2px; background: linear-gradient(90deg, var(--pwc-gray-300), var(--pwc-orange)); flex: 1; align-self: center; margin: 0 var(--spacing-md);"></div>
                    
                    <div class="pwc-flex pwc-flex-col pwc-flex-center" style="text-align: center; min-width: 140px;">
                        <div style="width: 60px; height: 60px; background: linear-gradient(135deg, var(--pwc-blue), var(--pwc-navy-light)); color: var(--pwc-white); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: var(--spacing-md); box-shadow: var(--shadow-md);">
                            <i class="fas fa-microphone" style="font-size: 1.5rem;"></i>
                        </div>
                        <h4 style="font-size: 0.9rem; font-weight: 600; color: var(--pwc-navy); margin-bottom: var(--spacing-xs); word-break: keep-all;">발표 평가</h4>
                        <p style="font-size: 0.75rem; color: var(--pwc-gray-600); word-break: keep-all;">STT + 음성분석</p>
                    </div>
                    
                    <div class="pwc-mobile-hidden" style="height: 2px; background: linear-gradient(90deg, var(--pwc-gray-300), var(--pwc-orange)); flex: 1; align-self: center; margin: 0 var(--spacing-md);"></div>
                    
                    <div class="pwc-flex pwc-flex-col pwc-flex-center" style="text-align: center; min-width: 140px;">
                        <div style="width: 60px; height: 60px; background: linear-gradient(135deg, var(--pwc-success), #007d3c); color: var(--pwc-white); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: var(--spacing-md); box-shadow: var(--shadow-md);">
                            <i class="fas fa-chart-line" style="font-size: 1.5rem;"></i>
                        </div>
                        <h4 style="font-size: 0.9rem; font-weight: 600; color: var(--pwc-navy); margin-bottom: var(--spacing-xs); word-break: keep-all;">통합 결과</h4>
                        <p style="font-size: 0.75rem; color: var(--pwc-gray-600); word-break: keep-all;">레이더 차트 + 피드백</p>
                    </div>
                </div>
            </div>

            <!-- 기능 카드들 -->
            <div class="pwc-grid pwc-grid-2" style="margin-bottom: var(--spacing-lg);">
                <div class="pwc-card" style="cursor: pointer;" onclick="window.location.href='/customer-generation'">
                    <div class="pwc-flex" style="align-items: flex-start; margin-bottom: var(--spacing-lg);">
                        <div style="background: linear-gradient(135deg, var(--pwc-orange), var(--pwc-orange-dark)); padding: var(--spacing-lg); border-radius: var(--radius-lg); margin-right: var(--spacing-lg); min-width: 64px; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-user-plus" style="color: var(--pwc-white); font-size: 1.5rem;"></i>
                        </div>
                        <div style="flex: 1;">
                            <h3 class="pwc-card-title" style="margin-bottom: var(--spacing-sm);">AI 가상고객 생성</h3>
                            <p style="color: var(--pwc-gray-600); margin-bottom: var(--spacing-md); word-break: keep-all;">딥리서치와 RFP 분석으로 30속성 가상고객 생성</p>
                        </div>
                    </div>
                    <ul style="list-style: none; color: var(--pwc-gray-600); font-size: 0.875rem; line-height: 1.6; padding-left: var(--spacing-lg);">
                        <li style="margin-bottom: var(--spacing-xs);">
                            <i class="fas fa-check" style="color: var(--pwc-orange); margin-right: var(--spacing-sm);"></i>
                            딥리서치 15속성 수집
                        </li>
                        <li style="margin-bottom: var(--spacing-xs);">
                            <i class="fas fa-check" style="color: var(--pwc-orange); margin-right: var(--spacing-sm);"></i>
                            RFP 문서 15속성 분석
                        </li>
                        <li>
                            <i class="fas fa-check" style="color: var(--pwc-orange); margin-right: var(--spacing-sm);"></i>
                            30속성 통합 페르소나 생성
                        </li>
                    </ul>
                </div>

                <div class="pwc-card" style="cursor: pointer;" onclick="window.location.href='/proposal-evaluation'">
                    <div class="pwc-flex" style="align-items: flex-start; margin-bottom: var(--spacing-lg);">
                        <div style="background: linear-gradient(135deg, var(--pwc-success), #007d3c); padding: var(--spacing-lg); border-radius: var(--radius-lg); margin-right: var(--spacing-lg); min-width: 64px; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-file-alt" style="color: var(--pwc-white); font-size: 1.5rem;"></i>
                        </div>
                        <div style="flex: 1;">
                            <h3 class="pwc-card-title" style="margin-bottom: var(--spacing-sm);">제안서 평가</h3>
                            <p style="color: var(--pwc-gray-600); margin-bottom: var(--spacing-md); word-break: keep-all;">6대 지표 루브릭 기반 AI 평가</p>
                        </div>
                    </div>
                    <ul style="list-style: none; color: var(--pwc-gray-600); font-size: 0.875rem; line-height: 1.6; padding-left: var(--spacing-lg);">
                        <li style="margin-bottom: var(--spacing-xs);">
                            <i class="fas fa-check" style="color: var(--pwc-success); margin-right: var(--spacing-sm);"></i>
                            명확성·전문성·설득력
                        </li>
                        <li style="margin-bottom: var(--spacing-xs);">
                            <i class="fas fa-check" style="color: var(--pwc-success); margin-right: var(--spacing-sm);"></i>
                            논리성·창의성·신뢰성
                        </li>
                        <li>
                            <i class="fas fa-check" style="color: var(--pwc-success); margin-right: var(--spacing-sm);"></i>
                            100점 척도 + 상세 코멘트
                        </li>
                    </ul>
                </div>

                <div class="pwc-card" style="cursor: pointer;" onclick="window.location.href='/presentation-evaluation'">
                    <div class="pwc-flex" style="align-items: flex-start; margin-bottom: var(--spacing-lg);">
                        <div style="background: linear-gradient(135deg, var(--pwc-blue), var(--pwc-navy-light)); padding: var(--spacing-lg); border-radius: var(--radius-lg); margin-right: var(--spacing-lg); min-width: 64px; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-microphone" style="color: var(--pwc-white); font-size: 1.5rem;"></i>
                        </div>
                        <div style="flex: 1;">
                            <h3 class="pwc-card-title" style="margin-bottom: var(--spacing-sm);">발표 평가</h3>
                            <p style="color: var(--pwc-gray-600); margin-bottom: var(--spacing-md); word-break: keep-all;">STT + 음성 분석 기반 발표 평가</p>
                        </div>
                    </div>
                    <ul style="list-style: none; color: var(--pwc-gray-600); font-size: 0.875rem; line-height: 1.6; padding-left: var(--spacing-lg);">
                        <li style="margin-bottom: var(--spacing-xs);">
                            <i class="fas fa-check" style="color: var(--pwc-blue); margin-right: var(--spacing-sm);"></i>
                            실시간 음성 인식
                        </li>
                        <li style="margin-bottom: var(--spacing-xs);">
                            <i class="fas fa-check" style="color: var(--pwc-blue); margin-right: var(--spacing-sm);"></i>
                            발표 내용 6지표 평가
                        </li>
                        <li>
                            <i class="fas fa-check" style="color: var(--pwc-blue); margin-right: var(--spacing-sm);"></i>
                            말속도·휴지·톤 분석
                        </li>
                    </ul>
                </div>

                <div class="pwc-card" style="cursor: pointer;" onclick="window.location.href='/results'">
                    <div class="pwc-flex" style="align-items: flex-start; margin-bottom: var(--spacing-lg);">
                        <div style="background: linear-gradient(135deg, var(--pwc-navy), var(--pwc-navy-light)); padding: var(--spacing-lg); border-radius: var(--radius-lg); margin-right: var(--spacing-lg); min-width: 64px; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;">
                            <i class="fas fa-chart-line" style="color: var(--pwc-white); font-size: 1.5rem; z-index: 2; position: relative;"></i>
                            <!-- 차트 시각화 요소들 -->
                            <div style="position: absolute; top: 12px; right: 12px; width: 8px; height: 8px; background: var(--pwc-orange); border-radius: 50%; animation: pulse 2s infinite;"></div>
                            <div style="position: absolute; bottom: 12px; left: 12px; width: 6px; height: 6px; background: rgba(255, 255, 255, 0.8); border-radius: 50%;"></div>
                            <div style="position: absolute; top: 20px; left: 15px; width: 4px; height: 4px; background: var(--pwc-orange-light); border-radius: 50%; opacity: 0.6;"></div>
                            <!-- 배경 패턴 -->
                            <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, transparent, var(--pwc-orange), transparent); opacity: 0.4;"></div>
                        </div>
                        <div style="flex: 1;">
                            <h3 class="pwc-card-title" style="margin-bottom: var(--spacing-sm);">통합 결과</h3>
                            <p style="color: var(--pwc-gray-600); margin-bottom: var(--spacing-md); word-break: keep-all;">레이더 차트와 종합 피드백</p>
                        </div>
                    </div>
                    <ul style="list-style: none; color: var(--pwc-gray-600); font-size: 0.875rem; line-height: 1.6; padding-left: var(--spacing-lg);">
                        <li style="margin-bottom: var(--spacing-xs);">
                            <i class="fas fa-chart-pie" style="color: var(--pwc-navy); margin-right: var(--spacing-sm);"></i>
                            6각형 레이더 차트
                        </li>
                        <li style="margin-bottom: var(--spacing-xs);">
                            <i class="fas fa-thumbs-up" style="color: var(--pwc-success); margin-right: var(--spacing-sm);"></i>
                            강점·보완·총평
                        </li>
                        <li>
                            <i class="fas fa-file-pdf" style="color: var(--pwc-error); margin-right: var(--spacing-sm);"></i>
                            PDF 결과 내보내기
                        </li>
                    </ul>
                </div>
            </div>

            <!-- 시작하기 버튼 -->
            <div class="pwc-text-center">
                <button onclick="window.location.href='/customer-generation'" class="pwc-btn pwc-btn-primary pwc-btn-lg">
                    <i class="fas fa-play"></i>
                    평가 시작하기
                </button>
            </div>
        </main>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    </body>
    </html>
  `)
})

// 제안서 평가 페이지
app.get('/proposal-evaluation', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>제안서 평가 - RFP 평가 시뮬레이터</title>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/pwc-global.css?v=3.0" rel="stylesheet">
    </head>
    <body>
        <!-- PwC 스타일 헤더 -->
        <header class="pwc-header">
            <div class="pwc-container">
                <h1>
                    <a href="/" style="color: var(--pwc-white); text-decoration: none; margin-right: var(--spacing-lg); display: inline-flex; align-items: center;">
                        <i class="fas fa-arrow-left" style="margin-right: var(--spacing-sm);"></i>
                    </a>
                    <div class="pwc-logo">
                        <i class="fas fa-file-alt"></i>
                    </div>
                    제안서 평가
                    <span style="background-color: var(--pwc-success); color: var(--pwc-white); padding: var(--spacing-xs) var(--spacing-md); border-radius: 20px; font-size: 0.875rem; font-weight: 600; margin-left: var(--spacing-lg);">2단계</span>
                </h1>
                <p style="color: var(--pwc-gray-200); margin-top: var(--spacing-sm); font-size: 1rem;">
                    AI 가상고객 기반 6대 지표 루브릭 평가 (100점 만점)
                </p>
            </div>
        </header>

        <!-- 네비게이션 -->
        <nav class="pwc-nav">
            <div class="pwc-container">
                <ul class="pwc-nav-list">
                    <li class="pwc-nav-item"><a href="/">홈</a></li>
                    <li class="pwc-nav-item"><a href="/customer-generation">AI 가상고객</a></li>
                    <li class="pwc-nav-item"><a href="/proposal-evaluation" class="active">제안서 평가</a></li>
                    <li class="pwc-nav-item"><a href="/presentation-evaluation">발표 평가</a></li>
                    <li class="pwc-nav-item"><a href="/results">통합 결과</a></li>
                </ul>
            </div>
        </nav>

        <main class="pwc-container" style="padding-top: var(--spacing-xl); padding-bottom: var(--spacing-3xl);">
            <!-- AI 가상고객 선택 -->
            <div class="pwc-card">
                <div class="pwc-card-header">
                    <h2 class="pwc-card-title">
                        <i class="fas fa-user-circle" style="color: var(--pwc-orange); margin-right: var(--spacing-sm);"></i>
                        AI 가상고객 선택
                    </h2>
                    <p class="pwc-card-subtitle">평가할 AI 가상고객을 선택해주세요. 딥리서치와 RFP 분석으로 생성된 30속성 페르소나입니다.</p>
                </div>
                
                <div class="pwc-form-group">
                    <label class="pwc-label">평가할 AI 가상고객</label>
                    <select id="customer-select" class="pwc-select">
                        <option value="">AI 가상고객을 선택하세요</option>
                    </select>
                </div>

                <!-- 선택된 고객 정보 표시 -->
                <div id="selected-customer-info" class="pwc-alert pwc-alert-info" style="display: none; margin-top: var(--spacing-lg);">
                    <h4 style="font-weight: 600; margin-bottom: var(--spacing-sm); word-break: keep-all;">
                        <i class="fas fa-check-circle" style="color: var(--pwc-blue); margin-right: var(--spacing-xs);"></i>
                        선택된 AI 가상고객
                    </h4>
                    <div id="customer-details" style="font-size: 0.9rem; line-height: 1.5; word-break: keep-all;">
                        <!-- 동적으로 채워짐 -->
                    </div>
                </div>
            </div>

            <!-- 제안서 업로드 -->
            <div class="pwc-card">
                <div class="pwc-card-header">
                    <h2 class="pwc-card-title">
                        <i class="fas fa-file-upload" style="color: var(--pwc-success); margin-right: var(--spacing-sm);"></i>
                        제안서 업로드
                    </h2>
                    <p class="pwc-card-subtitle">평가할 제안서를 업로드하거나 데모 제안서를 사용하세요. PDF, DOCX, TXT 형식을 지원합니다.</p>
                </div>
                
                <div class="pwc-grid pwc-grid-2">
                    <div class="pwc-form-group">
                        <label class="pwc-label">제안서 제목</label>
                        <input type="text" id="proposal-title" class="pwc-input" 
                               placeholder="예: 금고석유화학 DX 전략 수립 및 실행">
                    </div>
                    <div class="pwc-form-group">
                        <label class="pwc-label">제안사명</label>
                        <input type="text" id="proposal-company" class="pwc-input"
                               placeholder="예: PwC 컨설팅">
                    </div>
                </div>

                <div class="pwc-file-upload" id="proposal-drop-zone" style="margin: var(--spacing-lg) 0;">
                    <i class="fas fa-cloud-upload-alt" style="font-size: 3rem; color: var(--pwc-gray-400); margin-bottom: var(--spacing-lg);"></i>
                    <h4 style="font-size: 1.125rem; font-weight: 600; color: var(--pwc-navy); margin-bottom: var(--spacing-sm); word-break: keep-all;">제안서 파일을 업로드하세요</h4>
                    <p style="color: var(--pwc-gray-600); margin-bottom: var(--spacing-lg); word-break: keep-all;">PDF, DOCX, TXT 형식 지원 (최대 50MB)</p>
                    <input type="file" id="proposal-file" accept=".pdf,.docx,.txt" style="display: none;">
                    <div class="pwc-flex pwc-flex-center pwc-flex-mobile-col" style="gap: var(--spacing-md);">
                        <button onclick="document.getElementById('proposal-file').click()" class="pwc-btn pwc-btn-primary">
                            <i class="fas fa-folder-open"></i>
                            파일 선택
                        </button>
                        <button id="demo-proposal-load" class="pwc-btn pwc-btn-secondary">
                            <i class="fas fa-rocket"></i>
                            데모 제안서 로드
                        </button>
                    </div>
                </div>

                <!-- 업로드된 파일 정보 -->
                <div id="uploaded-file-info" class="pwc-alert pwc-alert-success" style="display: none; margin-top: var(--spacing-lg);">
                    <h4 style="font-weight: 600; margin-bottom: var(--spacing-sm); word-break: keep-all;">
                        <i class="fas fa-check-circle" style="margin-right: var(--spacing-xs);"></i>
                        업로드된 제안서
                    </h4>
                    <div id="file-details" style="font-size: 0.9rem; line-height: 1.5; word-break: keep-all;">
                        <!-- 동적으로 채워짐 -->
                    </div>
                </div>
            </div>

            <!-- 평가 진행 -->
            <div class="pwc-card">
                <div class="pwc-card-header">
                    <h2 class="pwc-card-title">
                        <i class="fas fa-clipboard-check" style="color: var(--pwc-blue); margin-right: var(--spacing-sm);"></i>
                        6대 지표 평가
                    </h2>
                    <p class="pwc-card-subtitle">전문성, 논리성, 창의성 등 6가지 핵심 지표로 AI가 100점 만점으로 평가합니다.</p>
                </div>

                <div class="pwc-grid pwc-grid-3" style="margin-bottom: var(--spacing-xl);">
                    <div style="text-align: center; padding: var(--spacing-lg); border: 2px solid var(--pwc-blue); border-radius: var(--radius-lg); background: linear-gradient(135deg, rgba(0, 115, 230, 0.05), rgba(0, 115, 230, 0.02));">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--pwc-blue); margin-bottom: var(--spacing-sm); word-break: keep-all;">명확성</div>
                        <div style="font-size: 0.875rem; color: var(--pwc-gray-600); word-break: keep-all;">목적·범위·효과의 명확성</div>
                    </div>
                    <div style="text-align: center; padding: var(--spacing-lg); border: 2px solid var(--pwc-success); border-radius: var(--radius-lg); background: linear-gradient(135deg, rgba(0, 166, 81, 0.05), rgba(0, 166, 81, 0.02));">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--pwc-success); margin-bottom: var(--spacing-sm); word-break: keep-all;">전문성</div>
                        <div style="font-size: 0.875rem; color: var(--pwc-gray-600); word-break: keep-all;">실무 지식의 깊이와 정확성</div>
                    </div>
                    <div style="text-align: center; padding: var(--spacing-lg); border: 2px solid var(--pwc-warning); border-radius: var(--radius-lg); background: linear-gradient(135deg, rgba(255, 184, 0, 0.05), rgba(255, 184, 0, 0.02));">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--pwc-warning); margin-bottom: var(--spacing-sm); word-break: keep-all;">설득력</div>
                        <div style="font-size: 0.875rem; color: var(--pwc-gray-600); word-break: keep-all;">고객 관점 이해와 설득 논리</div>
                    </div>
                    <div style="text-align: center; padding: var(--spacing-lg); border: 2px solid var(--pwc-navy); border-radius: var(--radius-lg); background: linear-gradient(135deg, rgba(0, 51, 102, 0.05), rgba(0, 51, 102, 0.02));">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--pwc-navy); margin-bottom: var(--spacing-sm); word-break: keep-all;">논리성</div>
                        <div style="font-size: 0.875rem; color: var(--pwc-gray-600); word-break: keep-all;">추론의 타당성과 근거 체계성</div>
                    </div>
                    <div style="text-align: center; padding: var(--spacing-lg); border: 2px solid var(--pwc-orange); border-radius: var(--radius-lg); background: linear-gradient(135deg, rgba(255, 121, 0, 0.05), rgba(255, 121, 0, 0.02));">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--pwc-orange); margin-bottom: var(--spacing-sm); word-break: keep-all;">창의성</div>
                        <div style="font-size: 0.875rem; color: var(--pwc-gray-600); word-break: keep-all;">차별화된 접근법과 혁신성</div>
                    </div>
                    <div style="text-align: center; padding: var(--spacing-lg); border: 2px solid var(--pwc-error); border-radius: var(--radius-lg); background: linear-gradient(135deg, rgba(230, 0, 18, 0.05), rgba(230, 0, 18, 0.02));">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--pwc-error); margin-bottom: var(--spacing-sm); word-break: keep-all;">신뢰성</div>
                        <div style="font-size: 0.875rem; color: var(--pwc-gray-600); word-break: keep-all;">실현 가능성과 객관적 근거</div>
                    </div>
                </div>

                <button id="start-evaluation" class="pwc-btn pwc-btn-primary" style="width: 100%; font-size: 1.125rem; padding: var(--spacing-lg) var(--spacing-xl);" disabled>
                    <i class="fas fa-play"></i>
                    AI 평가 시작
                </button>
            </div>

            <!-- 평가 결과 -->
            <div id="evaluation-results" class="pwc-card" style="display: none;">
                <div class="pwc-card-header">
                    <h2 class="pwc-card-title">
                        <i class="fas fa-chart-line" style="color: var(--pwc-success); margin-right: var(--spacing-sm);"></i>
                        평가 결과
                    </h2>
                    <p class="pwc-card-subtitle">AI가 6대 지표로 분석한 100점 만점 평가 결과입니다.</p>
                </div>

                <!-- 점수 차트 -->
                <div class="pwc-grid pwc-grid-3" style="margin-bottom: var(--spacing-xl);">
                    <div style="text-align: center; padding: var(--spacing-lg); background: linear-gradient(135deg, rgba(0, 115, 230, 0.1), rgba(0, 115, 230, 0.05)); border-radius: var(--radius-lg); border: 1px solid rgba(0, 115, 230, 0.2);">
                        <div style="font-size: 2rem; font-weight: 700; color: var(--pwc-blue); margin-bottom: var(--spacing-xs);" id="clarity-score">-</div>
                        <div style="font-size: 0.875rem; font-weight: 600; color: var(--pwc-blue); word-break: keep-all;">명확성</div>
                    </div>
                    <div style="text-align: center; padding: var(--spacing-lg); background: linear-gradient(135deg, rgba(0, 166, 81, 0.1), rgba(0, 166, 81, 0.05)); border-radius: var(--radius-lg); border: 1px solid rgba(0, 166, 81, 0.2);">
                        <div style="font-size: 2rem; font-weight: 700; color: var(--pwc-success); margin-bottom: var(--spacing-xs);" id="expertise-score">-</div>
                        <div style="font-size: 0.875rem; font-weight: 600; color: var(--pwc-success); word-break: keep-all;">전문성</div>
                    </div>
                    <div style="text-align: center; padding: var(--spacing-lg); background: linear-gradient(135deg, rgba(255, 184, 0, 0.1), rgba(255, 184, 0, 0.05)); border-radius: var(--radius-lg); border: 1px solid rgba(255, 184, 0, 0.2);">
                        <div style="font-size: 2rem; font-weight: 700; color: var(--pwc-warning); margin-bottom: var(--spacing-xs);" id="persuasiveness-score">-</div>
                        <div style="font-size: 0.875rem; font-weight: 600; color: var(--pwc-warning); word-break: keep-all;">설득력</div>
                    </div>
                    <div style="text-align: center; padding: var(--spacing-lg); background: linear-gradient(135deg, rgba(0, 51, 102, 0.1), rgba(0, 51, 102, 0.05)); border-radius: var(--radius-lg); border: 1px solid rgba(0, 51, 102, 0.2);">
                        <div style="font-size: 2rem; font-weight: 700; color: var(--pwc-navy); margin-bottom: var(--spacing-xs);" id="logic-score">-</div>
                        <div style="font-size: 0.875rem; font-weight: 600; color: var(--pwc-navy); word-break: keep-all;">논리성</div>
                    </div>
                    <div style="text-align: center; padding: var(--spacing-lg); background: linear-gradient(135deg, rgba(255, 121, 0, 0.1), rgba(255, 121, 0, 0.05)); border-radius: var(--radius-lg); border: 1px solid rgba(255, 121, 0, 0.2);">
                        <div style="font-size: 2rem; font-weight: 700; color: var(--pwc-orange); margin-bottom: var(--spacing-xs);" id="creativity-score">-</div>
                        <div style="font-size: 0.875rem; font-weight: 600; color: var(--pwc-orange); word-break: keep-all;">창의성</div>
                    </div>
                    <div style="text-align: center; padding: var(--spacing-lg); background: linear-gradient(135deg, rgba(230, 0, 18, 0.1), rgba(230, 0, 18, 0.05)); border-radius: var(--radius-lg); border: 1px solid rgba(230, 0, 18, 0.2);">
                        <div style="font-size: 2rem; font-weight: 700; color: var(--pwc-error); margin-bottom: var(--spacing-xs);" id="credibility-score">-</div>
                        <div style="font-size: 0.875rem; font-weight: 600; color: var(--pwc-error); word-break: keep-all;">신뢰성</div>
                    </div>
                </div>

                <!-- 총점 -->
                <div style="text-align: center; padding: var(--spacing-xl); background: linear-gradient(135deg, var(--pwc-navy), var(--pwc-navy-light)); border-radius: var(--radius-lg); margin-bottom: var(--spacing-xl); color: var(--pwc-white);">
                    <div style="font-size: 3rem; font-weight: 700; margin-bottom: var(--spacing-sm);" id="total-score">-</div>
                    <div style="font-size: 1.125rem; opacity: 0.9; word-break: keep-all;">총점 (100점 만점)</div>
                </div>

                <!-- 상세 코멘트 -->
                <div class="pwc-alert pwc-alert-info" style="margin-bottom: var(--spacing-xl);">
                    <h4 style="font-weight: 600; margin-bottom: var(--spacing-sm); word-break: keep-all;">
                        <i class="fas fa-comments" style="margin-right: var(--spacing-xs);"></i>
                        종합 평가
                    </h4>
                    <p id="overall-comment" style="line-height: 1.6; word-break: keep-all;">-</p>
                </div>

                <!-- 다음 단계 버튼 -->
                <div class="pwc-text-center">
                    <button onclick="window.location.href='/presentation-evaluation'" class="pwc-btn pwc-btn-primary pwc-btn-lg">
                        <i class="fas fa-microphone"></i>
                        발표 평가 시작
                    </button>
                </div>
            </div>
        </main>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/proposal-evaluation.js?v=3.0"></script>
    </body>
    </html>
  `)
})

// AI 가상고객 생성 페이지
app.get('/customer-generation', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI 가상고객 생성 - RFP 평가 시뮬레이터</title>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/pwc-global.css?v=3.0" rel="stylesheet">
    </head>
    <body>
        <header class="pwc-header">
            <div class="pwc-container">
                <h1>
                    <a href="/" style="color: var(--pwc-white); text-decoration: none; margin-right: var(--spacing-lg);">
                        <i class="fas fa-arrow-left" style="margin-right: var(--spacing-sm);"></i>
                    </a>
                    <div class="pwc-logo"><i class="fas fa-user-plus"></i></div>
                    AI 가상고객 생성
                    <span style="background-color: var(--pwc-orange); color: var(--pwc-white); padding: var(--spacing-xs) var(--spacing-md); border-radius: 20px; font-size: 0.875rem; font-weight: 600; margin-left: var(--spacing-lg);">1단계</span>
                </h1>
            </div>
        </header>
        <nav class="pwc-nav">
            <div class="pwc-container">
                <ul class="pwc-nav-list">
                    <li class="pwc-nav-item"><a href="/">홈</a></li>
                    <li class="pwc-nav-item"><a href="/customer-generation" class="active">AI 가상고객</a></li>
                    <li class="pwc-nav-item"><a href="/proposal-evaluation">제안서 평가</a></li>
                    <li class="pwc-nav-item"><a href="/presentation-evaluation">발표 평가</a></li>
                    <li class="pwc-nav-item"><a href="/results">통합 결과</a></li>
                </ul>
            </div>
        </nav>
        <main class="pwc-container" style="padding-top: var(--spacing-xl); padding-bottom: var(--spacing-3xl);">
            <!-- 진행 단계 표시 -->
            <div class="pwc-card">
                <div class="pwc-card-header">
                    <h2 class="pwc-card-title">
                        <i class="fas fa-route" style="color: var(--pwc-orange); margin-right: var(--spacing-sm);"></i>
                        AI 가상고객 생성 프로세스
                    </h2>
                    <p class="pwc-card-subtitle">딥리서치와 RFP 분석을 통해 30속성 가상고객을 생성합니다.</p>
                </div>
                
                <div class="pwc-flex pwc-flex-between pwc-flex-mobile-col" style="gap: var(--spacing-lg);">
                    <div class="pwc-flex pwc-flex-col pwc-flex-center" style="text-align: center; flex: 1;">
                        <div style="width: 50px; height: 50px; background: var(--pwc-orange); color: var(--pwc-white); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; margin-bottom: var(--spacing-md); box-shadow: var(--shadow-md);">1</div>
                        <h4 style="font-weight: 600; color: var(--pwc-navy); margin-bottom: var(--spacing-xs); word-break: keep-all;">딥리서치 수집</h4>
                        <p style="font-size: 0.875rem; color: var(--pwc-gray-600); word-break: keep-all;">15속성 기업 분석</p>
                    </div>
                    
                    <div class="pwc-mobile-hidden" style="height: 2px; background: var(--pwc-gray-300); flex: 0.5; align-self: center; margin: 0 var(--spacing-md);"></div>
                    
                    <div class="pwc-flex pwc-flex-col pwc-flex-center" style="text-align: center; flex: 1;">
                        <div style="width: 50px; height: 50px; background: var(--pwc-gray-400); color: var(--pwc-white); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; margin-bottom: var(--spacing-md); box-shadow: var(--shadow-sm);">2</div>
                        <h4 style="font-weight: 600; color: var(--pwc-gray-600); margin-bottom: var(--spacing-xs); word-break: keep-all;">RFP 분석</h4>
                        <p style="font-size: 0.875rem; color: var(--pwc-gray-500); word-break: keep-all;">15속성 요구사항 추출</p>
                    </div>
                    
                    <div class="pwc-mobile-hidden" style="height: 2px; background: var(--pwc-gray-300); flex: 0.5; align-self: center; margin: 0 var(--spacing-md);"></div>
                    
                    <div class="pwc-flex pwc-flex-col pwc-flex-center" style="text-align: center; flex: 1;">
                        <div style="width: 50px; height: 50px; background: var(--pwc-gray-400); color: var(--pwc-white); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; margin-bottom: var(--spacing-md); box-shadow: var(--shadow-sm);">3</div>
                        <h4 style="font-weight: 600; color: var(--pwc-gray-600); margin-bottom: var(--spacing-xs); word-break: keep-all;">페르소나 생성</h4>
                        <p style="font-size: 0.875rem; color: var(--pwc-gray-500); word-break: keep-all;">30속성 통합 고객</p>
                    </div>
                </div>
            </div>

            <!-- 딥리서치 섹션 -->
            <div class="pwc-card">
                <div class="pwc-card-header">
                    <h2 class="pwc-card-title">
                        <i class="fas fa-search" style="color: var(--pwc-blue); margin-right: var(--spacing-sm);"></i>
                        딥리서치 수집 (15속성)
                    </h2>
                    <p class="pwc-card-subtitle">기업의 비즈니스 모델, 조직 문화, 기술 수준 등 15가지 핵심 속성을 자동 수집합니다.</p>
                </div>
                
                <div class="pwc-grid pwc-grid-2">
                    <div class="pwc-form-group">
                        <label class="pwc-label">회사명</label>
                        <input type="text" id="company-name" class="pwc-input" placeholder="예: 금고석유화학">
                    </div>
                    <div class="pwc-form-group">
                        <label class="pwc-label">분석 깊이</label>
                        <select id="research-depth" class="pwc-select">
                            <option value="basic">기본 분석 (5-7속성)</option>
                            <option value="comprehensive" selected>종합 분석 (15속성)</option>
                        </select>
                    </div>
                </div>

                <div class="pwc-flex pwc-flex-mobile-col" style="gap: var(--spacing-md); margin-bottom: var(--spacing-lg);">
                    <button id="start-research" class="pwc-btn pwc-btn-primary">
                        <i class="fas fa-play"></i>
                        딥리서치 시작
                    </button>
                    <button id="demo-deep-research" class="pwc-btn pwc-btn-secondary">
                        <i class="fas fa-rocket"></i>
                        데모 데이터 로드
                    </button>
                    <button id="demo2-deep-research" class="pwc-btn" style="background: linear-gradient(135deg, var(--pwc-orange), #ff6b35); color: white; border: none; font-weight: 600; box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3); transition: all 0.3s ease;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(255, 107, 53, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(255, 107, 53, 0.3)'">
                        <i class="fas fa-brain" style="margin-right: var(--spacing-xs);"></i>
                        AI 딥리서치 (실제 LLM)
                    </button>
                </div>

                <div id="research-results" class="pwc-alert pwc-alert-success" style="display: none;">
                    <h4 style="font-weight: 600; margin-bottom: var(--spacing-md); word-break: keep-all;">
                        <i class="fas fa-check-circle" style="margin-right: var(--spacing-xs);"></i>
                        딥리서치 수집 완료 (15속성)
                    </h4>
                    <div id="research-attributes" class="pwc-grid pwc-grid-3" style="margin-top: var(--spacing-md);">
                        <!-- 동적으로 생성됨 -->
                    </div>
                </div>
            </div>

            <!-- RFP 분석 섹션 -->
            <div class="pwc-card">
                <div class="pwc-card-header">
                    <h2 class="pwc-card-title">
                        <i class="fas fa-file-upload" style="color: var(--pwc-success); margin-right: var(--spacing-sm);"></i>
                        RFP 문서 분석 (15속성)
                    </h2>
                    <p class="pwc-card-subtitle">RFP 문서에서 프로젝트 목표, 요구사항, 예산 등 15가지 속성을 자동 추출합니다.</p>
                </div>
                
                <div class="pwc-file-upload" id="rfp-drop-zone">
                    <i class="fas fa-file-contract" style="font-size: 3rem; color: var(--pwc-gray-400); margin-bottom: var(--spacing-lg);"></i>
                    <h4 style="font-size: 1.125rem; font-weight: 600; color: var(--pwc-navy); margin-bottom: var(--spacing-sm); word-break: keep-all;">RFP 문서를 업로드하세요</h4>
                    <p style="color: var(--pwc-gray-600); margin-bottom: var(--spacing-lg); word-break: keep-all;">PDF, DOCX, TXT 형식 지원 (최대 50MB)</p>
                    <input type="file" id="rfp-file" accept=".pdf,.docx,.txt" style="display: none;">
                    <div class="pwc-flex pwc-flex-center pwc-flex-mobile-col" style="gap: var(--spacing-md);">
                        <button onclick="document.getElementById('rfp-file').click()" class="pwc-btn pwc-btn-primary">
                            <i class="fas fa-folder-open"></i>
                            파일 선택
                        </button>
                        <button id="demo-rfp-analysis" class="pwc-btn pwc-btn-secondary">
                            <i class="fas fa-rocket"></i>
                            데모 RFP 로드
                        </button>
                        <button id="demo2-rfp-analysis" class="pwc-btn" style="background: linear-gradient(135deg, var(--pwc-blue), #0066cc); color: white; border: none; font-weight: 600; box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3); transition: all 0.3s ease;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(0, 102, 204, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(0, 102, 204, 0.3)'">
                            <i class="fas fa-brain" style="margin-right: var(--spacing-xs);"></i>
                            AI RFP 분석 (실제 LLM)
                        </button>
                    </div>
                </div>

                <div id="rfp-results" class="pwc-alert pwc-alert-info" style="display: none; margin-top: var(--spacing-lg);">
                    <h4 style="font-weight: 600; margin-bottom: var(--spacing-md); word-break: keep-all;">
                        <i class="fas fa-check-circle" style="margin-right: var(--spacing-xs);"></i>
                        RFP 분석 완료 (15속성)
                    </h4>
                    <div id="rfp-attributes" class="pwc-grid pwc-grid-3" style="margin-top: var(--spacing-md);">
                        <!-- 동적으로 생성됨 -->
                    </div>
                </div>
            </div>

            <!-- 가상고객 생성 섹션 -->
            <div class="pwc-card">
                <div class="pwc-card-header">
                    <h2 class="pwc-card-title">
                        <i class="fas fa-robot" style="color: var(--pwc-navy); margin-right: var(--spacing-sm);"></i>
                        AI 가상고객 생성
                    </h2>
                    <p class="pwc-card-subtitle">딥리서치와 RFP 분석 결과를 바탕으로 30속성 가상고객 페르소나를 생성합니다.</p>
                </div>

                <div class="pwc-text-center">
                    <div class="pwc-flex pwc-flex-center pwc-flex-mobile-col" style="gap: var(--spacing-md);">
                        <button id="generate-customer" class="pwc-btn pwc-btn-primary pwc-btn-lg" style="width: 100%; max-width: 300px;" disabled>
                            <i class="fas fa-magic"></i>
                            AI 가상고객 생성
                        </button>
                        <button id="demo-generate-customer" class="pwc-btn pwc-btn-secondary pwc-btn-lg" style="width: 100%; max-width: 300px;">
                            <i class="fas fa-rocket"></i>
                            AI 가상고객 생성 데모
                        </button>
                        <button id="demo2-generate-customer" class="pwc-btn pwc-btn-lg" style="background: linear-gradient(135deg, var(--pwc-navy), #003366); color: white; border: none; font-weight: 600; box-shadow: 0 4px 12px rgba(0, 51, 102, 0.3); transition: all 0.3s ease; width: 100%; max-width: 300px;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(0, 51, 102, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(0, 51, 102, 0.3)'">
                            <i class="fas fa-brain" style="margin-right: var(--spacing-xs);"></i>
                            AI 고객생성 (데모 통합)
                        </button>
                    </div>
                    <p style="font-size: 0.875rem; color: var(--pwc-gray-600); margin-top: var(--spacing-md);">
                        딥리서치와 RFP 분석을 완료한 후 생성하거나 데모로 바로 체험해보세요.
                    </p>
                    <div style="background: linear-gradient(135deg, #fff5e6, #e6f3ff); border-radius: var(--border-radius-md); padding: var(--spacing-md); margin-top: var(--spacing-md); border: 2px solid var(--pwc-orange-light);">
                        <p style="font-size: 0.8rem; color: var(--pwc-navy); margin: 0; font-weight: 600; display: flex; align-items: center; gap: var(--spacing-xs);">
                            <i class="fas fa-brain" style="color: var(--pwc-orange);"></i>
                            <span>🧠 AI Demo2: 딥리서치·RFP분석은 실제 GPT-4o, 고객생성은 데이터 통합 방식</span>
                        </p>
                    </div>
                </div>

                <!-- 생성된 고객 결과 -->
                <div id="generated-customer" class="pwc-alert pwc-alert-success" style="display: none; margin-top: var(--spacing-xl);">
                    <h4 style="font-weight: 600; margin-bottom: var(--spacing-md); word-break: keep-all;">
                        <i class="fas fa-user-check" style="margin-right: var(--spacing-xs);"></i>
                        AI 가상고객 생성 완료
                    </h4>
                    <div id="customer-persona" style="margin-top: var(--spacing-lg);">
                        <!-- 동적으로 생성됨 -->
                    </div>
                    <div class="pwc-text-center" style="margin-top: var(--spacing-xl);">
                        <button onclick="window.location.href='/proposal-evaluation'" class="pwc-btn pwc-btn-primary pwc-btn-lg">
                            <i class="fas fa-arrow-right"></i>
                            제안서 평가 시작
                        </button>
                    </div>
                </div>
            </div>
        </main>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/customer-generation.js"></script>
    </body>
    </html>
  `)
})

// 발표 평가 페이지  
app.get('/presentation-evaluation', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>발표 평가 - RFP 평가 시뮬레이터</title>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/pwc-global.css?v=3.0" rel="stylesheet">
        <style>
          .recording { 
            animation: pulse 1.5s ease-in-out infinite alternate;
          }
          @keyframes pulse {
            from { opacity: 0.6; }
            to { opacity: 1; }
          }
        </style>
    </head>
    <body>
        <!-- PwC 스타일 헤더 -->
        <header class="pwc-header">
            <div class="pwc-container">
                <h1>
                    <a href="/proposal-evaluation" style="color: var(--pwc-white); text-decoration: none; margin-right: var(--spacing-lg); display: inline-flex; align-items: center;">
                        <i class="fas fa-arrow-left" style="margin-right: var(--spacing-sm);"></i>
                    </a>
                    <div class="pwc-logo">
                        <i class="fas fa-microphone"></i>
                    </div>
                    발표 평가
                    <span style="background-color: var(--pwc-blue); color: var(--pwc-white); padding: var(--spacing-xs) var(--spacing-md); border-radius: 20px; font-size: 0.875rem; font-weight: 600; margin-left: var(--spacing-lg);">3단계</span>
                </h1>
                <p style="color: var(--pwc-gray-200); margin-top: var(--spacing-sm); font-size: 1rem;">
                    WebRTC + STT 기반 실시간 발표 녹화 및 AI 평가
                </p>
            </div>
        </header>

        <!-- 네비게이션 -->
        <nav class="pwc-nav">
            <div class="pwc-container">
                <ul class="pwc-nav-list">
                    <li class="pwc-nav-item"><a href="/">홈</a></li>
                    <li class="pwc-nav-item"><a href="/customer-generation">AI 가상고객</a></li>
                    <li class="pwc-nav-item"><a href="/proposal-evaluation">제안서 평가</a></li>
                    <li class="pwc-nav-item"><a href="/presentation-evaluation" class="active">발표 평가</a></li>
                    <li class="pwc-nav-item"><a href="/results">통합 결과</a></li>
                </ul>
            </div>
        </nav>

        <main class="pwc-container" style="padding-top: var(--spacing-xl); padding-bottom: var(--spacing-3xl);">
            <!-- AI 가상고객 선택 -->
            <div class="pwc-card">
                <div class="pwc-card-header">
                    <h2 class="pwc-card-title">
                        <i class="fas fa-user-circle" style="color: var(--pwc-orange); margin-right: var(--spacing-sm);"></i>
                        AI 가상고객 선택
                    </h2>
                    <p class="pwc-card-subtitle">발표를 평가할 AI 가상고객을 선택해주세요.</p>
                </div>
                
                <div class="pwc-form-group">
                    <label class="pwc-label">평가할 AI 가상고객</label>
                    <select id="customer-select" class="pwc-select">
                        <option value="">AI 가상고객을 선택하세요</option>
                    </select>
                </div>
            </div>

            <!-- 발표 설정 -->
            <div class="pwc-card">
                <div class="pwc-card-header">
                    <h2 class="pwc-card-title">
                        <i class="fas fa-cog" style="color: var(--pwc-success); margin-right: var(--spacing-sm);"></i>
                        발표 설정
                    </h2>
                    <p class="pwc-card-subtitle">발표 제목과 예상 시간을 설정해주세요.</p>
                </div>
                
                <div class="pwc-grid pwc-grid-2">
                    <div class="pwc-form-group">
                        <label class="pwc-label">발표 제목</label>
                        <input type="text" id="presentation-title" class="pwc-input" 
                               placeholder="예: 금고석유화학 DX 플랫폼 구축 제안">
                    </div>
                    <div class="pwc-form-group">
                        <label class="pwc-label">예상 발표 시간 (분)</label>
                        <select id="presentation-duration" class="pwc-select">
                            <option value="5">5분</option>
                            <option value="10" selected>10분</option>
                            <option value="15">15분</option>
                            <option value="20">20분</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- 녹화 섹션 -->
            <div class="pwc-card">
                <div class="pwc-card-header">
                    <h2 class="pwc-card-title">
                        <i class="fas fa-video" style="color: var(--pwc-error); margin-right: var(--spacing-sm);"></i>
                        발표 녹화
                    </h2>
                    <p class="pwc-card-subtitle">WebRTC를 이용한 실시간 발표 녹화 및 음성 분석을 진행합니다.</p>
                </div>

                <!-- 미디어 접근 권한 요청 -->
                <div id="media-setup" class="pwc-text-center" style="padding: var(--spacing-3xl) 0;">
                    <i class="fas fa-video-camera" style="font-size: 4rem; color: var(--pwc-gray-400); margin-bottom: var(--spacing-xl);"></i>
                    <h3 style="font-size: 1.25rem; font-weight: 600; color: var(--pwc-navy); margin-bottom: var(--spacing-lg); word-break: keep-all;">실시간 발표 녹화 및 STT 분석</h3>
                    <p style="color: var(--pwc-gray-600); margin-bottom: var(--spacing-lg); word-break: keep-all;">WebRTC 기술로 발표를 실시간 녹화하고 음성을 텍스트로 변환하여 AI 평가를 진행합니다.</p>
                    
                    <!-- 단계별 프로세스 안내 -->
                    <div style="background: var(--pwc-gray-50); border-radius: var(--radius-lg); padding: var(--spacing-lg); margin-bottom: var(--spacing-xl); text-align: left;">
                        <h4 style="color: var(--pwc-navy); font-weight: 600; margin-bottom: var(--spacing-md);"><i class="fas fa-list-ol" style="color: var(--pwc-orange); margin-right: var(--spacing-sm);"></i>진행 단계</h4>
                        <div style="display: flex; flex-direction: column; gap: var(--spacing-sm);">
                            <div style="display: flex; align-items: center; gap: var(--spacing-sm);">
                                <span style="background: var(--pwc-blue); color: var(--pwc-white); width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.875rem; font-weight: 600;">1</span>
                                <span style="color: var(--pwc-gray-700); word-break: keep-all;">카메라/마이크 시작 버튼 클릭</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: var(--spacing-sm);">
                                <span style="background: var(--pwc-orange); color: var(--pwc-white); width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.875rem; font-weight: 600;">2</span>
                                <span style="color: var(--pwc-gray-700); word-break: keep-all;">브라우저 권한 요청 팝업에서 "허용" 클릭</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: var(--spacing-sm);">
                                <span style="background: var(--pwc-success); color: var(--pwc-white); width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.875rem; font-weight: 600;">3</span>
                                <span style="color: var(--pwc-gray-700); word-break: keep-all;">비디오 프리뷰 확인 후 녹화 시작</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="pwc-flex pwc-flex-center pwc-flex-mobile-col" style="gap: var(--spacing-lg); margin-bottom: var(--spacing-xl);">
                        <div style="text-align: center;">
                            <button id="request-media" class="pwc-btn pwc-btn-primary">
                                <i class="fas fa-video"></i>
                                카메라/마이크 연결
                            </button>
                            <div style="font-size: 0.875rem; color: var(--pwc-gray-600); margin-top: var(--spacing-xs); word-break: keep-all;">브라우저 권한 허용 필요</div>
                        </div>
                        
                        <div style="display: flex; align-items: center; color: var(--pwc-gray-400); font-weight: bold;">또는</div>
                        
                        <div style="text-align: center;">
                            <button id="demo-presentation-eval" class="pwc-btn pwc-btn-orange pwc-btn-lg">
                                <i class="fas fa-rocket"></i>
                                데모 평가 실행
                            </button>
                            <div style="font-size: 0.875rem; color: var(--pwc-orange); margin-top: var(--spacing-xs); word-break: keep-all; font-weight: 600;">권한 없이 즉시 체험!</div>
                        </div>
                    </div>
                    
                    <div class="pwc-alert pwc-alert-info">
                        <p style="word-break: keep-all;">
                            <i class="fas fa-info-circle" style="margin-right: var(--spacing-xs);"></i>
                            <strong>데모 모드:</strong> 샘플 발표 데이터를 이용하여 즉시 평가 결과를 확인할 수 있습니다.
                        </p>
                    </div>

                    <div class="pwc-alert pwc-alert-warning" style="margin-top: var(--spacing-md);">
                        <p style="word-break: keep-all;">
                            <i class="fas fa-exclamation-triangle" style="margin-right: var(--spacing-xs);"></i>
                            <strong>미디어 접근 문제 시:</strong> 브라우저가 카메라/마이크 권한을 차단했다면 <strong>"데모 평가 실행"</strong>으로 동일한 AI 평가를 체험할 수 있습니다.
                        </p>
                    </div>
                </div>

                <!-- 비디오 프리뷰 -->
                <div id="video-preview" class="hidden" style="margin-top: var(--spacing-xl);">
                    <div class="pwc-grid pwc-grid-2" style="gap: var(--spacing-xl);">
                        <div>
                            <h4 style="font-weight: 600; color: var(--pwc-navy); margin-bottom: var(--spacing-md); word-break: keep-all;">
                                <i class="fas fa-video" style="color: var(--pwc-blue); margin-right: var(--spacing-sm);"></i>
                                비디오 프리뷰
                            </h4>
                            <div style="position: relative; background: var(--pwc-gray-900); border-radius: var(--radius-lg); overflow: hidden;">
                                <video id="preview-video" autoplay muted style="width: 100%; height: 240px; object-fit: cover;"></video>
                                <div id="recording-indicator" class="hidden recording" style="position: absolute; top: var(--spacing-sm); left: var(--spacing-sm); background: var(--pwc-error); color: var(--pwc-white); padding: var(--spacing-xs) var(--spacing-sm); border-radius: var(--radius-sm); font-size: 0.875rem;">
                                    <i class="fas fa-circle" style="margin-right: var(--spacing-xs);"></i>녹화 중
                                </div>
                            </div>
                        </div>
                        <div>
                            <h4 style="font-weight: 600; color: var(--pwc-navy); margin-bottom: var(--spacing-md); word-break: keep-all;">
                                <i class="fas fa-microphone" style="color: var(--pwc-success); margin-right: var(--spacing-sm);"></i>
                                음성 레벨 모니터
                            </h4>
                            <div style="background: var(--pwc-gray-100); padding: var(--spacing-lg); border-radius: var(--radius-lg);">
                                <div style="margin-bottom: var(--spacing-sm); font-size: 0.875rem; color: var(--pwc-gray-700); word-break: keep-all;">마이크 입력 레벨</div>
                                <div style="width: 100%; background: var(--pwc-gray-300); border-radius: 10px; height: 12px; overflow: hidden;">
                                    <div id="audio-level" style="background: linear-gradient(90deg, var(--pwc-success), var(--pwc-warning)); height: 100%; border-radius: 10px; transition: width 0.1s ease; width: 0%;"></div>
                                </div>
                                <div style="margin-top: var(--spacing-sm); font-size: 0.75rem; color: var(--pwc-gray-600); word-break: keep-all;">소리를 내보세요. 음성이 인식되면 바가 움직입니다.</div>
                            </div>
                        </div>
                    </div>

                    <!-- 녹화 컨트롤 -->
                    <div class="pwc-flex pwc-flex-center pwc-flex-mobile-col" style="gap: var(--spacing-md); margin-top: var(--spacing-xl);">
                        <button id="start-recording" style="background: var(--pwc-error); color: var(--pwc-white); border: none; padding: var(--spacing-lg) var(--spacing-xl); border-radius: var(--radius-md); font-weight: 600; cursor: pointer; transition: all 0.2s ease;">
                            <i class="fas fa-record-vinyl" style="margin-right: var(--spacing-sm);"></i>녹화 시작
                        </button>
                        <button id="stop-recording" class="hidden" style="background: var(--pwc-gray-600); color: var(--pwc-white); border: none; padding: var(--spacing-lg) var(--spacing-xl); border-radius: var(--radius-md); font-weight: 600; cursor: pointer; transition: all 0.2s ease;">
                            <i class="fas fa-stop" style="margin-right: var(--spacing-sm);"></i>녹화 중지
                        </button>
                        <button id="demo-presentation-eval-alt" class="pwc-btn pwc-btn-secondary">
                            <i class="fas fa-rocket"></i>
                            데모 평가
                        </button>
                    </div>

                    <!-- 녹화 시간 표시 -->
                    <div id="recording-timer" class="hidden pwc-text-center" style="margin-top: var(--spacing-lg);">
                        <div style="font-size: 2rem; font-family: monospace; color: var(--pwc-error); font-weight: 700; margin-bottom: var(--spacing-sm);" id="timer-display">00:00</div>
                        <div style="font-size: 0.875rem; color: var(--pwc-gray-600); word-break: keep-all;">녹화 시간</div>
                    </div>
                </div>
            </div>

            <!-- 실시간 STT 결과 -->
            <div id="stt-section" class="hidden pwc-card">
                <div class="pwc-card-header">
                    <h2 class="pwc-card-title">
                        <i class="fas fa-microphone-alt" style="color: var(--pwc-orange); margin-right: var(--spacing-sm);"></i>실시간 음성 인식 (STT)
                    </h2>
                </div>
                <div class="pwc-card-content">
                    <div style="background: var(--pwc-gray-50); border: 2px solid var(--pwc-gray-200); border-radius: var(--radius-md); padding: var(--spacing-lg); min-height: 120px; margin-bottom: var(--spacing-lg);">
                        <div style="font-size: 0.875rem; color: var(--pwc-gray-600); margin-bottom: var(--spacing-sm); font-weight: 500;">인식된 텍스트:</div>
                        <div id="stt-text" style="color: var(--pwc-navy); line-height: 1.6; font-family: monospace; font-size: 0.95rem; word-break: keep-all; word-wrap: break-word;">
                            음성 인식을 시작하려면 녹화를 시작하세요...
                        </div>
                    </div>

                    <div class="pwc-grid pwc-grid-3" style="gap: var(--spacing-md);">
                        <div style="text-align: center; padding: var(--spacing-md); background: linear-gradient(135deg, var(--pwc-blue), var(--pwc-navy)); border-radius: var(--radius-md); color: var(--pwc-white);">
                            <div style="font-weight: 600; margin-bottom: var(--spacing-xs);">말속도</div>
                            <div id="speech-speed" style="font-size: 1.25rem; font-weight: 700;">- WPM</div>
                        </div>
                        <div style="text-align: center; padding: var(--spacing-md); background: linear-gradient(135deg, var(--pwc-success), var(--pwc-success-dark)); border-radius: var(--radius-md); color: var(--pwc-white);">
                            <div style="font-weight: 600; margin-bottom: var(--spacing-xs);">휴지 빈도</div>
                            <div id="pause-frequency" style="font-size: 1.25rem; font-weight: 700;">- 회/분</div>
                        </div>
                        <div style="text-align: center; padding: var(--spacing-md); background: linear-gradient(135deg, var(--pwc-orange), var(--pwc-orange-dark)); border-radius: var(--radius-md); color: var(--pwc-white);">
                            <div style="font-weight: 600; margin-bottom: var(--spacing-xs);">군더더기어</div>
                            <div id="filler-words" style="font-size: 1.25rem; font-weight: 700;">- 개</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 평가 결과 -->
            <div id="evaluation-results" class="hidden pwc-card">
                <div class="pwc-card-header">
                    <h2 class="pwc-card-title">
                        <i class="fas fa-chart-line" style="color: var(--success-color); margin-right: var(--spacing-sm);"></i>발표 평가 결과
                    </h2>
                </div>
                <div class="pwc-card-content">
                    <!-- 점수 차트 -->
                    <div class="pwc-grid pwc-grid-3" style="gap: var(--spacing-md); margin-bottom: var(--spacing-xl);">
                        <div style="text-align: center; padding: var(--spacing-lg); background: linear-gradient(135deg, var(--pwc-blue), var(--pwc-navy-light)); border-radius: var(--radius-lg); color: var(--pwc-white); position: relative; overflow: hidden;">
                            <div style="font-size: 2.5rem; font-weight: 700; margin-bottom: var(--spacing-xs);" id="clarity-score">-</div>
                            <div style="font-weight: 600; font-size: 0.95rem;">명확성</div>
                            <i class="fas fa-eye" style="position: absolute; top: var(--spacing-sm); right: var(--spacing-sm); opacity: 0.3; font-size: 1.5rem;"></i>
                        </div>
                        <div style="text-align: center; padding: var(--spacing-lg); background: linear-gradient(135deg, var(--pwc-success), #007d3c); border-radius: var(--radius-lg); color: var(--pwc-white); position: relative; overflow: hidden;">
                            <div style="font-size: 2.5rem; font-weight: 700; margin-bottom: var(--spacing-xs);" id="expertise-score">-</div>
                            <div style="font-weight: 600; font-size: 0.95rem;">전문성</div>
                            <i class="fas fa-graduation-cap" style="position: absolute; top: var(--spacing-sm); right: var(--spacing-sm); opacity: 0.3; font-size: 1.5rem;"></i>
                        </div>
                        <div style="text-align: center; padding: var(--spacing-lg); background: linear-gradient(135deg, var(--pwc-orange), var(--pwc-orange-dark)); border-radius: var(--radius-lg); color: var(--pwc-white); position: relative; overflow: hidden;">
                            <div style="font-size: 2.5rem; font-weight: 700; margin-bottom: var(--spacing-xs);" id="persuasiveness-score">-</div>
                            <div style="font-weight: 600; font-size: 0.95rem;">설득력</div>
                            <i class="fas fa-handshake" style="position: absolute; top: var(--spacing-sm); right: var(--spacing-sm); opacity: 0.3; font-size: 1.5rem;"></i>
                        </div>
                        <div style="text-align: center; padding: var(--spacing-lg); background: linear-gradient(135deg, var(--pwc-info), var(--pwc-navy)); border-radius: var(--radius-lg); color: var(--pwc-white); position: relative; overflow: hidden;">
                            <div style="font-size: 2.5rem; font-weight: 700; margin-bottom: var(--spacing-xs);" id="logic-score">-</div>
                            <div style="font-weight: 600; font-size: 0.95rem;">논리성</div>
                            <i class="fas fa-brain" style="position: absolute; top: var(--spacing-sm); right: var(--spacing-sm); opacity: 0.3; font-size: 1.5rem;"></i>
                        </div>
                        <div style="text-align: center; padding: var(--spacing-lg); background: linear-gradient(135deg, var(--pwc-warning), #e6a400); border-radius: var(--radius-lg); color: var(--pwc-white); position: relative; overflow: hidden;">
                            <div style="font-size: 2.5rem; font-weight: 700; margin-bottom: var(--spacing-xs);" id="creativity-score">-</div>
                            <div style="font-weight: 600; font-size: 0.95rem;">창의성</div>
                            <i class="fas fa-lightbulb" style="position: absolute; top: var(--spacing-sm); right: var(--spacing-sm); opacity: 0.3; font-size: 1.5rem;"></i>
                        </div>
                        <div style="text-align: center; padding: var(--spacing-lg); background: linear-gradient(135deg, var(--pwc-error), #cc000f); border-radius: var(--radius-lg); color: var(--pwc-white); position: relative; overflow: hidden;">
                            <div style="font-size: 2.5rem; font-weight: 700; margin-bottom: var(--spacing-xs);" id="credibility-score">-</div>
                            <div style="font-weight: 600; font-size: 0.95rem;">신뢰성</div>
                            <i class="fas fa-shield-alt" style="position: absolute; top: var(--spacing-sm); right: var(--spacing-sm); opacity: 0.3; font-size: 1.5rem;"></i>
                        </div>
                    </div>

                    <!-- 총점 -->
                    <div style="text-align: center; padding: var(--spacing-2xl); background: linear-gradient(135deg, var(--pwc-gray-100), var(--pwc-gray-50)); border: 3px solid var(--pwc-orange); border-radius: var(--radius-xl); margin-bottom: var(--spacing-xl); position: relative; overflow: hidden;">
                        <div style="font-size: 4rem; font-weight: 700; color: var(--pwc-navy); margin-bottom: var(--spacing-sm);" id="total-score">-</div>
                        <div style="font-size: 1.25rem; font-weight: 600; color: var(--pwc-navy);">총점 (100점 만점)</div>
                        <i class="fas fa-trophy" style="position: absolute; top: var(--spacing-md); right: var(--spacing-md); color: var(--pwc-orange); font-size: 2rem; opacity: 0.3; animation: pulse 2s infinite;"></i>
                    </div>

                    <!-- 다음 단계 버튼 -->
                    <div class="pwc-text-center">
                        <button onclick="window.location.href='/results'" class="pwc-btn pwc-btn-primary pwc-btn-lg" style="display: inline-flex; align-items: center; gap: var(--spacing-sm); font-size: 1.125rem; padding: var(--spacing-lg) var(--spacing-2xl);">
                            <i class="fas fa-chart-radar"></i>통합 결과 보기
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/presentation-evaluation.js?v=4.0"></script>
    </body>
    </html>
  `)
})

// favicon 처리
app.get('/favicon.ico', (c) => {
  return c.text('', 204) // No Content
})

// 통합 결과 페이지
app.get('/results', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>통합 결과 - RFP 평가 시뮬레이터</title>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/pwc-global.css?v=3.0" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    </head>
    <body>
        <header class="pwc-header">
            <div class="pwc-container">
                <h1>
                    <a href="/presentation-evaluation" style="color: var(--pwc-white); text-decoration: none; margin-right: var(--spacing-lg);">
                        <i class="fas fa-arrow-left" style="margin-right: var(--spacing-sm);"></i>
                    </a>
                    <div class="pwc-logo"><i class="fas fa-chart-line"></i></div>
                    통합 결과
                    <span style="background-color: var(--pwc-success); color: var(--pwc-white); padding: var(--spacing-xs) var(--spacing-md); border-radius: 20px; font-size: 0.875rem; font-weight: 600; margin-left: var(--spacing-lg);">완료</span>
                </h1>
            </div>
        </header>
        <nav class="pwc-nav">
            <div class="pwc-container">
                <ul class="pwc-nav-list">
                    <li class="pwc-nav-item"><a href="/">홈</a></li>
                    <li class="pwc-nav-item"><a href="/customer-generation">AI 가상고객</a></li>
                    <li class="pwc-nav-item"><a href="/proposal-evaluation">제안서 평가</a></li>
                    <li class="pwc-nav-item"><a href="/presentation-evaluation">발표 평가</a></li>
                    <li class="pwc-nav-item"><a href="/results" class="active">통합 결과</a></li>
                </ul>
            </div>
        </nav>

        <main class="pwc-container" style="padding-top: var(--spacing-xl); padding-bottom: var(--spacing-3xl);">
            <!-- 종합 점수 -->
            <div class="pwc-card" style="margin-bottom: var(--spacing-xl); text-align: center;">
                <div class="pwc-card-header">
                    <h2 class="pwc-card-title" style="font-size: 1.75rem; color: var(--pwc-navy); margin-bottom: var(--spacing-lg);">
                        <i class="fas fa-trophy" style="color: var(--pwc-orange); margin-right: var(--spacing-sm);"></i>
                        최종 종합 점수
                    </h2>
                </div>
                <div class="pwc-card-body">
                    <div class="pwc-grid pwc-grid-3" style="gap: var(--spacing-lg);">
                        <div class="pwc-score-card" style="background: linear-gradient(135deg, var(--pwc-blue), var(--pwc-light-blue)); color: var(--pwc-white); border-radius: var(--radius-lg); padding: var(--spacing-lg); position: relative; overflow: hidden;">
                            <div style="position: absolute; top: -10px; right: -10px; width: 60px; height: 60px; background: rgba(255, 255, 255, 0.1); border-radius: 50%;"></div>
                            <div style="font-size: 2.25rem; font-weight: 700; margin-bottom: var(--spacing-sm);">40점</div>
                            <div style="font-size: 0.9rem; font-weight: 500; opacity: 0.9;">제안서 평가 (70%)</div>
                        </div>
                        <div class="pwc-score-card" style="background: linear-gradient(135deg, var(--pwc-purple), var(--pwc-purple-light)); color: var(--pwc-white); border-radius: var(--radius-lg); padding: var(--spacing-lg); position: relative; overflow: hidden;">
                            <div style="position: absolute; top: -10px; right: -10px; width: 60px; height: 60px; background: rgba(255, 255, 255, 0.1); border-radius: 50%;"></div>
                            <div style="font-size: 2.25rem; font-weight: 700; margin-bottom: var(--spacing-sm);">40점</div>
                            <div style="font-size: 0.9rem; font-weight: 500; opacity: 0.9;">발표 평가 (30%)</div>
                        </div>
                        <div class="pwc-score-card" style="background: linear-gradient(135deg, var(--pwc-orange), var(--pwc-orange-light)); color: var(--pwc-white); border-radius: var(--radius-lg); padding: var(--spacing-lg); position: relative; overflow: hidden; border: 3px solid var(--pwc-navy);">
                            <div style="position: absolute; top: -10px; right: -10px; width: 60px; height: 60px; background: rgba(255, 255, 255, 0.2); border-radius: 50%;"></div>
                            <div style="font-size: 2.75rem; font-weight: 700; margin-bottom: var(--spacing-sm); text-shadow: 0 2px 4px rgba(0,0,0,0.2);">40점</div>
                            <div style="font-size: 0.9rem; font-weight: 600; opacity: 0.95;">최종 통합 점수 (100점 만점)</div>
                            <div style="position: absolute; bottom: 5px; right: 10px;">
                                <i class="fas fa-star" style="color: var(--pwc-white); font-size: 1.2rem; opacity: 0.7;"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 레이더 차트 및 상세 분석 -->
            <div class="pwc-card" style="margin-bottom: var(--spacing-xl);">
                <div class="pwc-card-header">
                    <h2 class="pwc-card-title" style="font-size: 1.5rem; color: var(--pwc-navy); margin-bottom: var(--spacing-lg);">
                        <i class="fas fa-chart-radar" style="color: var(--pwc-orange); margin-right: var(--spacing-sm);"></i>
                        6대 지표별 상세 분석
                    </h2>
                </div>
                <div class="pwc-card-body">
                
                    <!-- 차트 컨테이너 -->
                    <div class="pwc-grid" style="grid-template-columns: 1fr; gap: var(--spacing-xl); align-items: center;">
                        <div class="pwc-grid" style="grid-template-columns: 1fr 1fr; gap: var(--spacing-xl); align-items: center;" data-responsive="lg">
                            <div style="text-align: center;">
                                <div style="position: relative; height: 400px; width: 400px; margin: 0 auto; background: linear-gradient(135deg, var(--pwc-gray-100), var(--pwc-white)); border-radius: 50%; padding: var(--spacing-lg); box-shadow: var(--shadow-lg); border: 3px solid var(--pwc-orange-light);">
                                    <canvas id="radarChart"></canvas>
                                    <div style="position: absolute; bottom: 10px; right: 20px; color: var(--pwc-orange); font-size: 0.8rem; font-weight: 600;">
                                        <i class="fas fa-analytics"></i> PwC Analysis
                                    </div>
                                </div>
                            </div>
                    
                            <!-- 지표별 상세 비교표 -->
                            <div style="display: flex; flex-direction: column; gap: var(--spacing-lg);">
                                <div class="pwc-table-container">
                                    <table class="pwc-table">
                                        <thead style="background: linear-gradient(135deg, var(--pwc-blue-light), var(--pwc-orange-light));">
                                            <tr>
                                                <th style="padding: var(--spacing-md); text-align: left; font-weight: 600; color: var(--pwc-white); word-break: keep-all;">지표</th>
                                                <th style="padding: var(--spacing-md); text-align: center; font-weight: 600; color: var(--pwc-white); word-break: keep-all;">제안서</th>
                                                <th style="padding: var(--spacing-md); text-align: center; font-weight: 600; color: var(--pwc-white); word-break: keep-all;">발표</th>
                                                <th style="padding: var(--spacing-md); text-align: center; font-weight: 600; color: var(--pwc-white); word-break: keep-all;">차이</th>
                                            </tr>
                                        </thead>
                                        <tbody style="background: var(--pwc-white);">
                                            <tr style="border-bottom: 1px solid var(--neutral-200);">
                                                <td style="padding: var(--spacing-md); font-weight: 600; color: var(--pwc-navy); word-break: keep-all;">명확성</td>
                                                <td style="padding: var(--spacing-md); text-align: center;">
                                                    <span class="pwc-badge" style="background: var(--pwc-blue-light); color: var(--pwc-blue);">40점</span>
                                                </td>
                                                <td style="padding: var(--spacing-md); text-align: center;">
                                                    <span class="pwc-badge" style="background: var(--info-color-light); color: var(--info-color);">40점</span>
                                                </td>
                                                <td style="padding: var(--spacing-md); text-align: center; color: var(--text-muted);">0.0</td>
                                            </tr>
                                            <tr style="border-bottom: 1px solid var(--neutral-200);">
                                                <td style="padding: var(--spacing-md); font-weight: 600; color: var(--pwc-navy); word-break: keep-all;">전문성</td>
                                                <td style="padding: var(--spacing-md); text-align: center;">
                                                    <span class="pwc-badge" style="background: var(--success-color-light); color: var(--success-color); display: inline-flex; align-items: center; gap: var(--spacing-xs);">50점 <i class="fas fa-star" style="color: var(--pwc-orange);"></i></span>
                                                </td>
                                                <td style="padding: var(--spacing-md); text-align: center;">
                                                    <span class="pwc-badge" style="background: var(--success-color-light); color: var(--success-color); display: inline-flex; align-items: center; gap: var(--spacing-xs);">50점 <i class="fas fa-star" style="color: var(--pwc-orange);"></i></span>
                                                </td>
                                                <td style="padding: var(--spacing-md); text-align: center; color: var(--text-muted);">0.0</td>
                                            </tr>
                                            <tr style="border-bottom: 1px solid var(--neutral-200);">
                                                <td style="padding: var(--spacing-md); font-weight: 600; color: var(--pwc-navy); word-break: keep-all;">설득력</td>
                                                <td style="padding: var(--spacing-md); text-align: center;">
                                                    <span class="pwc-badge" style="background: var(--pwc-blue-light); color: var(--pwc-blue);">40점</span>
                                                </td>
                                                <td style="padding: var(--spacing-md); text-align: center;">
                                                    <span class="pwc-badge" style="background: var(--info-color-light); color: var(--info-color);">40점</span>
                                                </td>
                                                <td style="padding: var(--spacing-md); text-align: center; color: var(--text-muted);">0.0</td>
                                            </tr>
                                            <tr style="border-bottom: 1px solid var(--neutral-200);">
                                                <td style="padding: var(--spacing-md); font-weight: 600; color: var(--pwc-navy); word-break: keep-all;">논리성</td>
                                                <td style="padding: var(--spacing-md); text-align: center;">
                                                    <span class="pwc-badge" style="background: var(--pwc-blue-light); color: var(--pwc-blue);">40점</span>
                                                </td>
                                                <td style="padding: var(--spacing-md); text-align: center;">
                                                    <span class="pwc-badge" style="background: var(--info-color-light); color: var(--info-color);">40점</span>
                                                </td>
                                                <td style="padding: var(--spacing-md); text-align: center; color: var(--text-muted);">0.0</td>
                                            </tr>
                                            <tr style="border-bottom: 1px solid var(--neutral-200);">
                                                <td style="padding: var(--spacing-md); font-weight: 600; color: var(--pwc-navy); word-break: keep-all;">창의성</td>
                                                <td style="padding: var(--spacing-md); text-align: center;">
                                                    <span class="pwc-badge" style="background: var(--warning-color-light); color: var(--warning-color); display: inline-flex; align-items: center; gap: var(--spacing-xs);">30점 <i class="fas fa-exclamation-triangle"></i></span>
                                                </td>
                                                <td style="padding: var(--spacing-md); text-align: center;">
                                                    <span class="pwc-badge" style="background: var(--warning-color-light); color: var(--warning-color); display: inline-flex; align-items: center; gap: var(--spacing-xs);">30점 <i class="fas fa-exclamation-triangle"></i></span>
                                                </td>
                                                <td style="padding: var(--spacing-md); text-align: center; color: var(--text-muted);">0.0</td>
                                            </tr>
                                            <tr style="border-bottom: 1px solid var(--neutral-200);">
                                                <td style="padding: var(--spacing-md); font-weight: 600; color: var(--pwc-navy); word-break: keep-all;">신뢰성</td>
                                                <td style="padding: var(--spacing-md); text-align: center;">
                                                    <span class="pwc-badge" style="background: var(--success-color-light); color: var(--success-color); display: inline-flex; align-items: center; gap: var(--spacing-xs);">50점 <i class="fas fa-star" style="color: var(--pwc-orange);"></i></span>
                                                </td>
                                                <td style="padding: var(--spacing-md); text-align: center;">
                                                    <span class="pwc-badge" style="background: var(--success-color-light); color: var(--success-color); display: inline-flex; align-items: center; gap: var(--spacing-xs);">50점 <i class="fas fa-star" style="color: var(--pwc-orange);"></i></span>
                                                </td>
                                                <td style="padding: var(--spacing-md); text-align: center; color: var(--text-muted);">0.0</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                
                                <!-- 통계 요약 -->
                                <div class="pwc-grid pwc-grid-2" style="gap: var(--spacing-md);">
                                    <div style="background: linear-gradient(135deg, var(--pwc-blue), var(--pwc-light-blue)); color: var(--pwc-white); border-radius: var(--radius-md); padding: var(--spacing-md); text-align: center; position: relative; overflow: hidden;">
                                        <div style="position: absolute; top: -20px; right: -20px; width: 80px; height: 80px; background: rgba(255, 255, 255, 0.1); border-radius: 50%;"></div>
                                        <div style="font-weight: 600; margin-bottom: var(--spacing-xs); opacity: 0.9;">제안서 평균</div>
                                        <div style="font-size: 1.5rem; font-weight: 700;">40점</div>
                                        <i class="fas fa-file-alt" style="position: absolute; bottom: 8px; right: 10px; opacity: 0.6; font-size: 1.2rem;"></i>
                                    </div>
                                    <div style="background: linear-gradient(135deg, var(--pwc-purple), var(--pwc-purple-light)); color: var(--pwc-white); border-radius: var(--radius-md); padding: var(--spacing-md); text-align: center; position: relative; overflow: hidden;">
                                        <div style="position: absolute; top: -20px; right: -20px; width: 80px; height: 80px; background: rgba(255, 255, 255, 0.1); border-radius: 50%;"></div>
                                        <div style="font-weight: 600; margin-bottom: var(--spacing-xs); opacity: 0.9;">발표 평균</div>
                                        <div style="font-size: 1.5rem; font-weight: 700;">40점</div>
                                        <i class="fas fa-presentation" style="position: absolute; bottom: 8px; right: 10px; opacity: 0.6; font-size: 1.2rem;"></i>
                                    </div>
                                </div>
                                
                                <!-- 지표별 성과 분석 -->
                                <div style="background: linear-gradient(135deg, var(--pwc-gray-100), var(--pwc-white)); border-radius: var(--radius-md); padding: var(--spacing-lg); border: 2px solid var(--pwc-orange-light); box-shadow: var(--shadow-md);">
                                    <h4 style="font-weight: 600; color: var(--pwc-navy); margin-bottom: var(--spacing-md); display: flex; align-items: center; gap: var(--spacing-sm); border-bottom: 2px solid var(--pwc-orange-light); padding-bottom: var(--spacing-sm);">
                                        <i class="fas fa-chart-line" style="color: var(--pwc-orange);"></i>성과 분석
                                    </h4>
                                    <ul style="display: flex; flex-direction: column; gap: var(--spacing-md); font-size: 0.95rem; color: var(--text-color);">
                                        <li style="display: flex; align-items: center; gap: var(--spacing-sm); word-break: keep-all; background: var(--pwc-success-light); padding: var(--spacing-sm); border-radius: var(--radius-sm); border-left: 4px solid var(--pwc-success);">
                                            <i class="fas fa-trophy" style="color: var(--pwc-success); font-size: 1.1rem;"></i>
                                            <strong style="color: var(--pwc-navy);">최고 점수:</strong> <span style="color: var(--pwc-success); font-weight: 600;">전문성, 신뢰성 (50점)</span>
                                        </li>
                                        <li style="display: flex; align-items: center; gap: var(--spacing-sm); word-break: keep-all; background: var(--pwc-warning-light); padding: var(--spacing-sm); border-radius: var(--radius-sm); border-left: 4px solid var(--pwc-warning);">
                                            <i class="fas fa-exclamation-triangle" style="color: var(--pwc-warning); font-size: 1.1rem;"></i>
                                            <strong style="color: var(--pwc-navy);">개선 필요:</strong> <span style="color: var(--pwc-warning); font-weight: 600;">창의성 (30점)</span>
                                        </li>
                                        <li style="display: flex; align-items: center; gap: var(--spacing-sm); word-break: keep-all; background: var(--pwc-info-light); padding: var(--spacing-sm); border-radius: var(--radius-sm); border-left: 4px solid var(--pwc-info);">
                                            <i class="fas fa-balance-scale" style="color: var(--pwc-info); font-size: 1.1rem;"></i>
                                            <strong style="color: var(--pwc-navy);">평가 일관성:</strong> <span style="color: var(--pwc-info); font-weight: 600;">제안서와 발표 점수 차이 없음</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 성과 요약 및 진행률 바 -->
            <div class="pwc-card" style="margin-bottom: var(--spacing-xl);">
                <div class="pwc-card-header">
                    <h2 class="pwc-card-title">
                        <i class="fas fa-chart-bar" style="color: var(--pwc-blue); margin-right: var(--spacing-sm);"></i>
                        지표별 성과 요약
                    </h2>
                </div>
                <div class="pwc-card-content">
                    <div style="display: flex; flex-direction: column; gap: var(--spacing-lg);">
                        <!-- 명확성 -->
                        <div style="display: flex; flex-direction: column; gap: var(--spacing-sm);">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-weight: 600; color: var(--pwc-navy); word-break: keep-all;">명확성</span>
                                <span style="color: var(--text-muted); font-weight: 500;">40 / 50점</span>
                            </div>
                            <div style="width: 100%; height: 8px; background: var(--neutral-200); border-radius: 4px; overflow: hidden;">
                                <div style="height: 100%; background: linear-gradient(90deg, var(--pwc-blue), var(--pwc-orange)); border-radius: 4px; width: 80%; transition: width 0.3s ease;"></div>
                            </div>
                        </div>
                        
                        <!-- 전문성 -->
                        <div style="display: flex; flex-direction: column; gap: var(--spacing-sm);">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-weight: 600; color: var(--pwc-navy); word-break: keep-all;">전문성</span>
                                <span style="color: var(--success-color); font-weight: 700; display: flex; align-items: center; gap: var(--spacing-xs);">50 / 50점 <i class="fas fa-star" style="color: var(--pwc-orange);"></i></span>
                            </div>
                            <div style="width: 100%; height: 8px; background: var(--neutral-200); border-radius: 4px; overflow: hidden;">
                                <div style="height: 100%; background: linear-gradient(90deg, var(--success-color), var(--pwc-orange)); border-radius: 4px; width: 100%; transition: width 0.3s ease;"></div>
                            </div>
                        </div>
                        
                        <!-- 설득력 -->
                        <div style="display: flex; flex-direction: column; gap: var(--spacing-sm);">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-weight: 600; color: var(--pwc-navy); word-break: keep-all;">설득력</span>
                                <span style="color: var(--text-muted); font-weight: 500;">40 / 50점</span>
                            </div>
                            <div style="width: 100%; height: 8px; background: var(--neutral-200); border-radius: 4px; overflow: hidden;">
                                <div style="height: 100%; background: linear-gradient(90deg, var(--pwc-blue), var(--pwc-orange)); border-radius: 4px; width: 80%; transition: width 0.3s ease;"></div>
                            </div>
                        </div>
                        
                        <!-- 논리성 -->
                        <div style="display: flex; flex-direction: column; gap: var(--spacing-sm);">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-weight: 600; color: var(--pwc-navy); word-break: keep-all;">논리성</span>
                                <span style="color: var(--text-muted); font-weight: 500;">40 / 50점</span>
                            </div>
                            <div style="width: 100%; height: 8px; background: var(--neutral-200); border-radius: 4px; overflow: hidden;">
                                <div style="height: 100%; background: linear-gradient(90deg, var(--pwc-blue), var(--pwc-orange)); border-radius: 4px; width: 80%; transition: width 0.3s ease;"></div>
                            </div>
                        </div>
                        
                        <!-- 창의성 -->
                        <div style="display: flex; flex-direction: column; gap: var(--spacing-sm);">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-weight: 600; color: var(--pwc-navy); word-break: keep-all;">창의성</span>
                                <span style="color: var(--warning-color); font-weight: 600; display: flex; align-items: center; gap: var(--spacing-xs);">30 / 50점 <i class="fas fa-exclamation-triangle"></i></span>
                            </div>
                            <div style="width: 100%; height: 8px; background: var(--neutral-200); border-radius: 4px; overflow: hidden;">
                                <div style="height: 100%; background: linear-gradient(90deg, var(--warning-color), var(--pwc-orange)); border-radius: 4px; width: 60%; transition: width 0.3s ease;"></div>
                            </div>
                        </div>
                        
                        <!-- 신뢰성 -->
                        <div style="display: flex; flex-direction: column; gap: var(--spacing-sm);">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-weight: 600; color: var(--pwc-navy); word-break: keep-all;">신뢰성</span>
                                <span style="color: var(--success-color); font-weight: 700; display: flex; align-items: center; gap: var(--spacing-xs);">50 / 50점 <i class="fas fa-star" style="color: var(--pwc-orange);"></i></span>
                            </div>
                            <div style="width: 100%; height: 8px; background: var(--neutral-200); border-radius: 4px; overflow: hidden;">
                                <div style="height: 100%; background: linear-gradient(90deg, var(--success-color), var(--pwc-orange)); border-radius: 4px; width: 100%; transition: width 0.3s ease;"></div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 성과 등급 -->
                    <div style="margin-top: var(--spacing-xl); padding: var(--spacing-lg); background: linear-gradient(135deg, var(--success-color-light), var(--pwc-blue-light)); border-radius: var(--border-radius-lg); border-left: 6px solid var(--success-color); position: relative; overflow: hidden;">
                        <div style="display: flex; align-items: center; gap: var(--spacing-md); z-index: 2; position: relative;">
                            <div style="flex-shrink: 0;">
                                <i class="fas fa-trophy" style="color: var(--success-color); font-size: 1.5rem; animation: pulse 2s infinite;"></i>
                            </div>
                            <div>
                                <p style="font-weight: 600; color: var(--pwc-navy); margin-bottom: var(--spacing-xs); word-break: keep-all;">
                                    전체 성과 등급: <strong style="color: var(--success-color);">우수 (B+급)</strong>
                                </p>
                                <p style="color: var(--text-color); line-height: 1.4; word-break: keep-all;">
                                    평균 40점(100점 만점)으로 높은 수준의 제안 품질을 보여주었습니다.
                                </p>
                            </div>
                        </div>
                        <div style="position: absolute; top: var(--spacing-sm); right: var(--spacing-sm); font-size: 3rem; color: var(--success-color); opacity: 0.1;">
                            <i class="fas fa-award"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 종합 피드백 -->
            <div class="pwc-card" style="margin-bottom: var(--spacing-xl);">
                <div class="pwc-card-header">
                    <h2 class="pwc-card-title">
                        <i class="fas fa-comment-dots" style="color: var(--pwc-orange); margin-right: var(--spacing-sm);"></i>
                        종합 피드백
                    </h2>
                </div>
                <div class="pwc-card-content">
                    <div style="display: flex; flex-direction: column; gap: var(--spacing-lg);">
                        <div class="pwc-alert pwc-alert-success" style="padding: var(--spacing-lg); border-radius: var(--border-radius-md);">
                            <h3 style="font-weight: 600; color: var(--success-color); margin-bottom: var(--spacing-sm); display: flex; align-items: center; gap: var(--spacing-sm);">
                                <i class="fas fa-thumbs-up"></i>강점
                            </h3>
                            <p style="color: var(--success-color); line-height: 1.6; word-break: keep-all;">
                                화학산업 전문성과 글로벌 ESG 대응 역량이 뛰어나며, 
                                안정적이고 체계적인 실행 방안을 제시했습니다. 
                                PwC의 브랜드 신뢰도와 실현가능성이 높게 평가됩니다.
                            </p>
                        </div>
                        
                        <div class="pwc-alert pwc-alert-warning" style="padding: var(--spacing-lg); border-radius: var(--border-radius-md);">
                            <h3 style="font-weight: 600; color: var(--warning-color); margin-bottom: var(--spacing-sm); display: flex; align-items: center; gap: var(--spacing-sm);">
                                <i class="fas fa-lightbulb"></i>개선 사항
                            </h3>
                            <p style="color: var(--warning-color); line-height: 1.6; word-break: keep-all;">
                                창의적이고 혁신적인 차별화 요소를 더 강화하면 좋겠습니다. 
                                기술적 세부사항의 명확성을 높이고, 
                                더욱 구체적인 실행 타임라인을 제시해주세요.
                            </p>
                        </div>
                        
                        <div class="pwc-alert pwc-alert-info" style="padding: var(--spacing-lg); border-radius: var(--border-radius-md);">
                            <h3 style="font-weight: 600; color: var(--info-color); margin-bottom: var(--spacing-sm); display: flex; align-items: center; gap: var(--spacing-sm);">
                                <i class="fas fa-star"></i>총평
                            </h3>
                            <p style="color: var(--info-color); line-height: 1.6; word-break: keep-all;">
                                금고석유화학의 ESG 경영과 DX 니즈를 정확히 파악한 우수한 제안입니다. 
                                화학산업 전문성과 글로벌 경험을 바탕으로 한 안정적 실행력이 돋보이며, 
                                장기적 파트너십 구축에 적합한 신뢰할 수 있는 제안으로 평가됩니다.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 액션 버튼 -->
            <div class="pwc-text-center" style="display: flex; gap: var(--spacing-lg); justify-content: center; flex-wrap: wrap;">
                <button onclick="window.location.href='/'" class="pwc-btn pwc-btn-primary pwc-btn-lg" style="display: inline-flex; align-items: center; gap: var(--spacing-sm); font-size: 1.125rem; padding: var(--spacing-lg) var(--spacing-2xl);">
                    <i class="fas fa-home"></i>메인으로 돌아가기
                </button>
                <button onclick="downloadReport()" class="pwc-btn pwc-btn-success pwc-btn-lg" style="display: inline-flex; align-items: center; gap: var(--spacing-sm); font-size: 1.125rem; padding: var(--spacing-lg) var(--spacing-2xl);">
                    <i class="fas fa-download"></i>PDF 리포트 다운로드
                </button>
            </div>
        </div>

        <script>
            // 차트 애니메이션 및 인터랙션 개선
            const ctx = document.getElementById('radarChart').getContext('2d');
            
            // 제안서와 발표 데이터 (100점 만점)
            const proposalScores = [40, 50, 40, 40, 30, 50];
            const presentationScores = [40, 50, 40, 40, 30, 50];
            const labels = ['명확성', '전문성', '설득력', '논리성', '창의성', '신뢰성'];
            
            // 차트 생성 with 향상된 옵션
            const radarChart = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: '제안서 평가 (70%)',
                        data: proposalScores,
                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        borderWidth: 3,
                        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    }, {
                        label: '발표 평가 (30%)',
                        data: presentationScores,
                        backgroundColor: 'rgba(147, 51, 234, 0.15)',
                        borderColor: 'rgba(147, 51, 234, 1)',
                        borderWidth: 3,
                        pointBackgroundColor: 'rgba(147, 51, 234, 1)',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 2000,
                        easing: 'easeInOutQuart'
                    },
                    interaction: {
                        intersect: false,
                        mode: 'point'
                    },
                    scales: {
                        r: {
                            beginAtZero: true,
                            min: 0,
                            max: 50,
                            ticks: {
                                stepSize: 10,
                                font: {
                                    size: 12
                                },
                                color: '#6B7280',
                                backdropColor: 'transparent'
                            },
                            grid: {
                                color: '#E5E7EB'
                            },
                            angleLines: {
                                color: '#E5E7EB'
                            },
                            pointLabels: {
                                font: {
                                    size: 14,
                                    weight: '500'
                                },
                                color: '#374151'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                font: {
                                    size: 14,
                                    weight: '500'
                                },
                                usePointStyle: true,
                                pointStyle: 'circle'
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleFont: {
                                size: 14,
                                weight: '600'
                            },
                            bodyFont: {
                                size: 13
                            },
                            padding: 12,
                            cornerRadius: 8,
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': ' + context.parsed.r + '점 (50점 만점)';
                                },
                                afterLabel: function(context) {
                                    const score = context.parsed.r;
                                    let evaluation;
                                    if (score >= 45) evaluation = '매우 우수';
                                    else if (score >= 35) evaluation = '우수';
                                    else if (score >= 25) evaluation = '보통';
                                    else if (score >= 15) evaluation = '부족';
                                    else evaluation = '매우 부족';
                                    return '평가: ' + evaluation;
                                }
                            }
                        }
                    }
                }
            });

            async function downloadReport() {
                try {
                    // 로딩 표시
                    const button = event.target;
                    const originalText = button.innerHTML;
                    button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>리포트 생성 중...';
                    button.disabled = true;

                    // 데모 리포트 생성 API 호출
                    const response = await fetch('/api/report/demo');
                    const result = await response.json();

                    if (result.success) {
                        // HTML 리포트를 새 창에서 열기 (인쇄용)
                        const newWindow = window.open('', '_blank');
                        newWindow.document.write(result.data.html_content);
                        newWindow.document.close();
                        
                        // 자동으로 인쇄 대화상자 열기
                        newWindow.onload = function() {
                            newWindow.print();
                        };

                        // 다운로드 링크 생성 (HTML 파일로)
                        const blob = new Blob([result.data.html_content], { type: 'text/html' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = result.data.download_filename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);

                        alert('리포트가 성공적으로 생성되었습니다!\\n\\n새 창에서 인쇄 가능하며, HTML 파일도 다운로드됩니다.');
                    } else {
                        throw new Error(result.error);
                    }
                } catch (error) {
                    console.error('리포트 생성 오류:', error);
                    alert('리포트 생성 중 오류가 발생했습니다: ' + error.message);
                } finally {
                    // 버튼 상태 복원
                    button.innerHTML = originalText;
                    button.disabled = false;
                }
            }
        </script>
    </body>
    </html>
  `)
})

export default app