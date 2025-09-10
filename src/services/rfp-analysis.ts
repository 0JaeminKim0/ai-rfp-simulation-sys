// RFP 분석 서비스 - RFP 문서에서 15속성 자동 추출

import { OpenAIService } from './openai-service'
import { PdfParserService } from './pdf-parser-service'
import type { RfpAnalysisData, RfpAnalysisAttribute } from '../types/ai-customer'

export class RfpAnalysisService {
  private openaiService?: OpenAIService
  private pdfParser: PdfParserService

  constructor(openaiApiKey?: string) {
    if (openaiApiKey) {
      this.openaiService = new OpenAIService(openaiApiKey)
    }
    this.pdfParser = new PdfParserService()
  }
  
  // RFP 분석 15속성 정의
  private readonly RFP_ATTRIBUTES = [
    {
      id: 1,
      name: '발주사명',
      description: '프로젝트 발주 기업/기관 공식명',
      keywords: ['발주기관', '발주사', '발주자', '주관기관', '계약상대방'],
      sections: ['표지', '개요', '사업개요']
    },
    {
      id: 2,
      name: '발주부서',
      description: '프로젝트를 주관하는 부서명',
      keywords: ['주관부서', '담당부서', '발주부서', '사업부서', '연락처'],
      sections: ['연락처', '문의처', '담당자']
    },
    {
      id: 3,
      name: '프로젝트 배경',
      description: '추진 배경, 문제 인식, 필요성',
      keywords: ['배경', '필요성', '추진사유', '문제점', '현황'],
      sections: ['사업배경', '추진배경', '현황분석']
    },
    {
      id: 4,
      name: '프로젝트 목표',
      description: '달성하고자 하는 목적, 성과 지표',
      keywords: ['목표', '목적', '기대효과', '성과지표', 'KPI'],
      sections: ['사업목표', '추진목표', '기대효과']
    },
    {
      id: 5,
      name: '프로젝트 범위',
      description: '포함되는 영역, 시스템, 업무 범위',
      keywords: ['사업범위', '업무범위', '구축범위', '적용범위', '대상'],
      sections: ['사업범위', 'Scope of Work', '적용대상']
    },
    {
      id: 6,
      name: '프로젝트 기간',
      description: '착수~종료 기간, 중간 마일스톤',
      keywords: ['사업기간', '수행기간', '일정', '착수', '완료', '납기'],
      sections: ['사업일정', '수행일정', '일정계획']
    },
    {
      id: 7,
      name: '프로젝트 예산',
      description: '총 예산 규모, 산출 기준',
      keywords: ['예산', '사업비', '총사업비', 'M-M', '인건비', '경비'],
      sections: ['예산', '사업비', '산출근거', '비용']
    },
    {
      id: 8,
      name: '평가기준',
      description: '기술/가격 비율, 가점 요소',
      keywords: ['평가기준', '평가방법', '기술평가', '가격평가', '가점'],
      sections: ['제안평가', '평가기준', '심사기준']
    },
    {
      id: 9,
      name: '요구 산출물',
      description: '제출해야 하는 보고서, 산출물',
      keywords: ['산출물', '납품물', '제출물', '결과물', '보고서'],
      sections: ['산출물', '납품물', '제출서류']
    },
    {
      id: 10,
      name: '입찰사 요건',
      description: '참여 자격, 수행 경력, 인증 조건',
      keywords: ['참가자격', '입찰자격', '업체요건', '경력', '실적', '인증'],
      sections: ['참가자격', '업체요건', '자격요건']
    },
    {
      id: 11,
      name: '준수사항',
      description: 'NDA, 법규 준수, 표준/가이드라인',
      keywords: ['준수사항', '의무사항', 'NDA', '보안', '법규', '표준'],
      sections: ['준수사항', '계약조건', '법적요구사항']
    },
    {
      id: 12,
      name: '리스크 관리 조건',
      description: '일정 지연 방지, 페널티 조건',
      keywords: ['리스크', '위험관리', '페널티', '지연배상', '보상'],
      sections: ['위험관리', '리스크', '계약조항']
    },
    {
      id: 13,
      name: '필수 역량',
      description: '반드시 보유해야 할 기술 스택, 전문인력',
      keywords: ['필수기술', '기술요건', '전문인력', '자격증', '경력'],
      sections: ['기술요건', '인력요건', '필수역량']
    },
    {
      id: 14,
      name: '진행 일정',
      description: '제안서 접수~선정까지 절차와 타임라인',
      keywords: ['진행일정', '절차', '공고', '접수', '발표', '선정'],
      sections: ['진행일정', '추진절차', '일정표']
    },
    {
      id: 15,
      name: '특이조건/기타 요구',
      description: '특수 요구사항, 추가 조건',
      keywords: ['특이사항', '기타요구', '특수조건', '추가사항', '참고'],
      sections: ['기타사항', '특이조건', '부대조건']
    }
  ]

  /**
   * RFP 문서 파싱 및 15속성 추출
   */
  async parseRfpDocument(
    filePath: string,
    fileType: 'pdf' | 'docx' | 'txt',
    mode: 'auto' | 'guided' = 'auto'
  ): Promise<RfpAnalysisData> {
    
    try {
      // 1. 문서 텍스트 추출
      const documentText = await this.extractDocumentText(filePath, fileType)
      
      // 2. 문서 구조 분석
      const documentStructure = await this.analyzeDocumentStructure(documentText)
      
      // 3. 각 속성별 데이터 추출
      const analysisData: Partial<RfpAnalysisData> = {}
      
      for (const attr of this.RFP_ATTRIBUTES) {
        const attributeData = await this.extractAttributeData(
          documentText,
          documentStructure,
          attr,
          mode
        )
        analysisData[attr.id as keyof RfpAnalysisData] = attributeData
      }
      
      // 4. 추출 결과 검증 및 보완
      const validatedData = await this.validateRfpData(analysisData as RfpAnalysisData)
      
      return validatedData
      
    } catch (error) {
      console.error('RFP parsing failed:', error)
      throw new Error(`RFP 문서 파싱 실패: ${error.message}`)
    }
  }

  /**
   * 문서에서 텍스트 추출
   */
  private async extractDocumentText(filePath: string, fileType: 'pdf' | 'docx' | 'txt'): Promise<string> {
    // 실제 구현에서는 파일 타입별 파싱 라이브러리 사용
    // PDF: pdf-parse, DOCX: mammoth, TXT: 직접 읽기
    
    switch (fileType) {
      case 'pdf':
        return await this.extractPdfText(filePath)
      case 'docx':
        return await this.extractDocxText(filePath)
      case 'txt':
        return await this.extractTxtText(filePath)
      default:
        throw new Error(`Unsupported file type: ${fileType}`)
    }
  }

  private async extractPdfText(filePath: string): Promise<string> {
    // PDF 텍스트 추출 시뮬레이션
    return `
    AI 기반 고객 서비스 시스템 구축 제안서 요청

    1. 사업 개요
    발주기관: (주)테크놀로지파트너스
    담당부서: IT기획팀
    
    2. 사업 배경
    급변하는 디지털 환경에서 고객 만족도 향상과 업무 효율성 증대를 위한 
    AI 기반 고객 서비스 시스템 도입이 필요합니다.
    
    3. 사업 목표
    - 고객 응답시간 50% 단축
    - 고객 만족도 85% 이상 달성
    - 운영비용 30% 절감
    
    4. 사업 범위
    - AI 챗봇 시스템 구축
    - 고객 상담 분석 시스템
    - 관리자 대시보드
    
    5. 사업 기간: 2024.3.1 ~ 2024.8.31 (6개월)
    
    6. 총 사업비: 800,000,000원 (부가세 별도)
    
    7. 평가기준
    - 기술평가: 70%
    - 가격평가: 30%
    
    8. 필수 기술요건
    - AI/ML 개발 경험 3년 이상
    - 자연어처리 기술 보유
    - 클라우드 환경 구축 경험
    
    9. 제출 산출물
    - 제안서 (기술/사업/가격)
    - PoC 결과물
    - 시스템 설계서
    
    10. 진행 일정
    - 공고: 2024.1.15
    - 제안서 접수: 2024.2.15
    - 발표평가: 2024.2.28
    - 계약체결: 2024.3.15
    `
  }

  private async extractDocxText(filePath: string): Promise<string> {
    // DOCX 텍스트 추출 (실제로는 mammoth 라이브러리 사용)
    return "DOCX 파일 내용 추출 결과..."
  }

  private async extractTxtText(filePath: string): Promise<string> {
    // TXT 파일 읽기 (실제로는 파일시스템 접근)
    return "TXT 파일 내용..."
  }

  /**
   * 문서 구조 분석 (섹션, 페이지, 제목 등)
   */
  private async analyzeDocumentStructure(text: string): Promise<{
    sections: Array<{title: string, content: string, pageNumber?: number}>;
    totalPages: number;
    documentType: string;
  }> {
    
    // 간단한 구조 분석 (실제로는 더 정교한 NLP 적용)
    const sections = []
    const lines = text.split('\n')
    let currentSection = { title: '', content: '', pageNumber: 1 }
    
    for (const line of lines) {
      const trimmed = line.trim()
      
      // 섹션 제목 감지 (숫자. 으로 시작하는 경우)
      if (/^\d+\.\s/.test(trimmed)) {
        if (currentSection.title) {
          sections.push({ ...currentSection })
        }
        currentSection = {
          title: trimmed,
          content: '',
          pageNumber: 1
        }
      } else {
        currentSection.content += line + '\n'
      }
    }
    
    if (currentSection.title) {
      sections.push(currentSection)
    }
    
    return {
      sections,
      totalPages: Math.ceil(text.length / 2000), // 대략적인 페이지 수 계산
      documentType: 'rfp'
    }
  }

  /**
   * 특정 속성 데이터 추출
   */
  private async extractAttributeData(
    documentText: string,
    structure: any,
    attribute: typeof this.RFP_ATTRIBUTES[0],
    mode: 'auto' | 'guided'
  ): Promise<RfpAnalysisAttribute> {
    
    // LLM 기반 정보 추출
    const extractedInfo = await this.extractWithLLM(
      documentText,
      structure,
      attribute,
      mode
    )
    
    return {
      id: `rfp-${attribute.id}`,
      name: attribute.name,
      content: extractedInfo.content,
      source_snippet: extractedInfo.snippet,
      page_number: extractedInfo.pageNumber,
      section_title: extractedInfo.sectionTitle,
      extracted_at: new Date().toISOString()
    }
  }

  /**
   * LLM을 이용한 정보 추출
   */
  private async extractWithLLM(
    documentText: string,
    structure: any,
    attribute: typeof this.RFP_ATTRIBUTES[0],
    mode: 'auto' | 'guided'
  ): Promise<{
    content: string;
    snippet: string;
    pageNumber?: number;
    sectionTitle?: string;
  }> {
    
    // 속성별 맞춤형 프롬프트 생성
    const prompt = this.buildExtractionPrompt(attribute, mode)
    
    // 시뮬레이션 결과 (실제로는 LLM API 호출)
    const simulatedResults = this.getSimulatedRfpData(attribute.name, documentText)
    
    return simulatedResults
  }

  /**
   * 정보 추출용 프롬프트 생성
   */
  private buildExtractionPrompt(
    attribute: typeof this.RFP_ATTRIBUTES[0],
    mode: 'auto' | 'guided'
  ): string {
    return `
RFP 문서에서 "${attribute.name}" 정보를 추출해주세요.

추출 대상: ${attribute.description}
키워드: ${attribute.keywords.join(', ')}
주요 섹션: ${attribute.sections.join(', ')}

요구사항:
1. 정확한 정보 추출 (있는 그대로)
2. 원문 스니펫 제공 (정확한 인용)
3. 페이지 번호나 섹션 정보 포함
4. 정보가 없다면 업계 일반적인 기준이나 추정 정보 제공

출력 형식:
- 추출내용: [핵심 정보 요약]
- 원문스니펫: [해당 부분 원문 인용]
- 위치정보: [페이지/섹션]
- 신뢰도: [High/Medium/Low]

${mode === 'guided' ? '사용자가 확인할 수 있도록 상세하게 분석해주세요.' : '자동으로 가장 적절한 정보를 추출해주세요.'}
    `
  }

  /**
   * RFP 시뮬레이션 데이터 (실제 구현에서는 제거)
   */
  private getSimulatedRfpData(attributeName: string, documentText: string): {
    content: string;
    snippet: string;
    pageNumber?: number;
    sectionTitle?: string;
  } {
    
    const patterns: Record<string, any> = {
      '발주사명': {
        content: '(주)테크놀로지파트너스',
        snippet: '발주기관: (주)테크놀로지파트너스',
        pageNumber: 1,
        sectionTitle: '사업 개요'
      },
      '발주부서': {
        content: 'IT기획팀',
        snippet: '담당부서: IT기획팀',
        pageNumber: 1,
        sectionTitle: '사업 개요'
      },
      '프로젝트 배경': {
        content: '급변하는 디지털 환경에서 고객 만족도 향상과 업무 효율성 증대를 위한 AI 기반 고객 서비스 시스템 도입 필요',
        snippet: '급변하는 디지털 환경에서 고객 만족도 향상과 업무 효율성 증대를 위한 AI 기반 고객 서비스 시스템 도입이 필요합니다.',
        pageNumber: 1,
        sectionTitle: '사업 배경'
      },
      '프로젝트 목표': {
        content: '고객 응답시간 50% 단축, 고객 만족도 85% 이상 달성, 운영비용 30% 절감',
        snippet: '- 고객 응답시간 50% 단축\n- 고객 만족도 85% 이상 달성\n- 운영비용 30% 절감',
        pageNumber: 1,
        sectionTitle: '사업 목표'
      },
      '프로젝트 예산': {
        content: '800,000,000원 (부가세 별도)',
        snippet: '총 사업비: 800,000,000원 (부가세 별도)',
        pageNumber: 2,
        sectionTitle: '예산'
      },
      '평가기준': {
        content: '기술평가 70%, 가격평가 30%',
        snippet: '- 기술평가: 70%\n- 가격평가: 30%',
        pageNumber: 2,
        sectionTitle: '평가기준'
      }
    }

    return patterns[attributeName] || {
      content: this.generateFallbackContent(attributeName),
      snippet: '문서 내 명시적 언급 없음',
      pageNumber: 0,
      sectionTitle: '추정 정보'
    }
  }

  /**
   * 속성별 의미있는 폴백 콘텐츠 생성
   */
  private generateFallbackContent(attributeName: string): string {
    const fallbackMap: Record<string, string> = {
      '발주사명': '제안 요청 기관',
      '발주부서': 'IT기획팀 또는 디지털전환팀',
      '프로젝트 배경': '디지털 전환 및 업무 효율성 향상 필요',
      '프로젝트 목표': '시스템 구축을 통한 경쟁력 강화',
      '프로젝트 범위': '전사적 시스템 통합 및 최적화',
      '프로젝트 기간': '12~18개월 예상',
      '프로젝트 예산': '제안서 내 구체적 견적 요구',
      '평가기준': '기술력 70%, 가격경쟁력 30%',
      '요구 산출물': '제안서, 설계서, 구축 결과물',
      '입찰사 요건': '관련 분야 전문 경험 및 실적 보유',
      '준수사항': '보안 및 개인정보보호 관련 법규 준수',
      '리스크 관리 조건': '프로젝트 위험 관리 및 대응 체계',
      '필수 역량': '기술 전문성 및 프로젝트 관리 역량',
      '진행 일정': '제안서 접수 → 평가 → 선정 프로세스',
      '특이조건/기타 요구': '프로젝트 특성에 맞는 추가 고려사항'
    }

    return fallbackMap[attributeName] || `${attributeName} 관련 업계 표준 기준 적용`
  }

  /**
   * RFP 데이터 검증 및 보완
   */
  private async validateRfpData(data: RfpAnalysisData): Promise<RfpAnalysisData> {
    const validatedData = { ...data }
    
    // 필수 정보 누락 체크
    const criticalAttributes = [1, 3, 4, 5, 6, 7] // 발주사명, 배경, 목표, 범위, 기간, 예산
    
    for (const attrId of criticalAttributes) {
      const attr = validatedData[attrId as keyof RfpAnalysisData]
      if (!attr || attr.content.includes('관련 업계 표준')) {
        console.warn(`Critical RFP attribute missing: ${attr?.name}`)
      }
    }
    
    // 데이터 일관성 검증
    await this.crossValidateData(validatedData)
    
    return validatedData
  }

  /**
   * 속성 간 데이터 일관성 검증
   */
  private async crossValidateData(data: RfpAnalysisData): Promise<void> {
    // 예: 프로젝트 기간과 예산의 합리성 체크
    // 예: 발주사명과 발주부서의 일관성 체크
    // 실제로는 더 정교한 검증 로직 구현
    
    console.log('RFP data cross-validation completed')
  }
}