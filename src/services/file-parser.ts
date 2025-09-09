// 파일 파싱 서비스

export interface ParsedDocument {
  title: string
  content: string
  metadata: {
    fileType: string
    fileName: string
    fileSize: number
    pageCount?: number
    wordCount: number
    extractedAt: string
  }
  sections: DocumentSection[]
}

export interface DocumentSection {
  title: string
  content: string
  pageNumber?: number
  level: number // 1=제목, 2=부제목, 3=본문
}

export class FileParserService {
  
  // PDF 파일 파싱 (시뮬레이션)
  async parsePDF(file: File): Promise<ParsedDocument> {
    // 실제 구현에서는 PDF.js 또는 서버사이드 파싱 필요
    // 현재는 시뮬레이션된 파싱 결과 반환
    
    const content = await this.simulatePDFExtraction(file)
    
    return {
      title: this.extractTitle(file.name, content),
      content: content,
      metadata: {
        fileType: 'PDF',
        fileName: file.name,
        fileSize: file.size,
        pageCount: Math.ceil(content.length / 3000), // 페이지당 약 3000자로 추정
        wordCount: content.split(/\s+/).length,
        extractedAt: new Date().toISOString()
      },
      sections: this.extractSections(content)
    }
  }

  // DOCX 파일 파싱 (시뮬레이션)
  async parseDOCX(file: File): Promise<ParsedDocument> {
    // 실제 구현에서는 mammoth.js 또는 서버사이드 파싱 필요
    
    const content = await this.simulateDocxExtraction(file)
    
    return {
      title: this.extractTitle(file.name, content),
      content: content,
      metadata: {
        fileType: 'DOCX',
        fileName: file.name,
        fileSize: file.size,
        wordCount: content.split(/\s+/).length,
        extractedAt: new Date().toISOString()
      },
      sections: this.extractSections(content)
    }
  }

  // TXT 파일 파싱
  async parseTXT(file: File): Promise<ParsedDocument> {
    const content = await this.readTextFile(file)
    
    return {
      title: this.extractTitle(file.name, content),
      content: content,
      metadata: {
        fileType: 'TXT',
        fileName: file.name,
        fileSize: file.size,
        wordCount: content.split(/\s+/).length,
        extractedAt: new Date().toISOString()
      },
      sections: this.extractSections(content)
    }
  }

  // 파일 타입에 따른 파싱 라우터
  async parseFile(file: File): Promise<ParsedDocument> {
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    
    switch (fileExtension) {
      case 'pdf':
        return await this.parsePDF(file)
      case 'docx':
        return await this.parseDOCX(file)
      case 'txt':
        return await this.parseTXT(file)
      default:
        throw new Error(`지원하지 않는 파일 형식입니다: ${fileExtension}`)
    }
  }

  // 텍스트 파일 읽기
  private async readTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = (e) => reject(new Error('파일 읽기 실패'))
      reader.readAsText(file, 'UTF-8')
    })
  }

  // PDF 추출 시뮬레이션 (실제로는 PDF.js 사용)
  private async simulatePDFExtraction(file: File): Promise<string> {
    // 파일 이름에 따른 샘플 내용 반환
    if (file.name.toLowerCase().includes('proposal') || file.name.toLowerCase().includes('제안')) {
      return `
프로젝트 제안서

1. 프로젝트 개요
본 제안서는 디지털 전환 프로젝트에 대한 포괄적인 솔루션을 제시합니다.

2. 현황 분석
현재 시스템의 주요 문제점들을 분석하고 개선 방향을 제시합니다.
- 레거시 시스템의 한계
- 데이터 통합의 필요성
- 업무 효율성 개선 요구

3. 제안 솔루션
다음과 같은 솔루션을 제안드립니다:
- ERP 시스템 고도화
- MES 시스템 연계
- ESG 데이터 통합 관리
- 클라우드 기반 인프라 구축

4. 기대 효과
- 업무 효율성 40% 향상
- 의사결정 속도 개선
- 비용 절감 효과
- ESG 경영 강화

5. 추진 일정
총 12개월 간의 단계적 추진 계획을 수립하였습니다.

6. 예산 계획
총 사업비 150억원 규모의 합리적인 예산 계획을 제시합니다.

7. 리스크 관리
프로젝트 리스크를 최소화하기 위한 관리 방안을 수립하였습니다.
      `.trim()
    } else if (file.name.toLowerCase().includes('rfp')) {
      return `
RFP 문서 (제안요청서)

1. 발주 개요
발주처: 금호석유화학 주식회사
담당부서: Digital Innovation팀
프로젝트명: ERP-MES-ESG 통합 DX 플랫폼 구축

2. 추진 배경
ESG 경영 강화와 글로벌 경쟁력 확보를 위한 디지털 전환이 필요한 상황입니다.

3. 프로젝트 목표
- ERP, MES, ESG 시스템 통합
- 데이터 기반 의사결정 지원
- 글로벌 ESG 규제 대응

4. 사업 범위
- ERP 시스템 고도화
- MES 시스템 연계 구축
- ESG 데이터 통합 관리 시스템 구축
- 클라우드 인프라 마이그레이션

5. 사업 일정
사업기간: 2025년 1월 ~ 2025년 12월 (총 12개월)

6. 예산 규모
총 사업비: 약 150억원 (부가세 별도)

7. 평가 기준
- 기술평가: 70점
- 가격평가: 30점

8. 참가 자격
대기업 대상 ERP/MES 통합 프로젝트 수행경험 3건 이상

9. 필수 기술역량
- 클라우드 기반 ERP 구축 경험
- ESG 데이터 관리 시스템 구축 경험
- 화학산업 도메인 이해

10. 특수 요구사항
- 시스템 다국어 지원 (한국어, 영어, 중국어)
- 글로벌 법인 확장 대응 가능
      `.trim()
    } else {
      return `
문서 내용

본 문서는 업로드된 PDF 파일의 내용을 나타냅니다.
실제 구현에서는 PDF.js 라이브러리를 사용하여
PDF 파일의 실제 내용을 추출할 수 있습니다.

주요 내용:
- 텍스트 추출
- 이미지 식별
- 테이블 구조 파싱
- 메타데이터 추출

현재는 시뮬레이션 모드로 운영되고 있으며,
실제 PDF 내용 추출을 위해서는 추가적인
서버사이드 처리가 필요합니다.
      `.trim()
    }
  }

  // DOCX 추출 시뮬레이션 (실제로는 mammoth.js 사용)
  private async simulateDocxExtraction(file: File): Promise<string> {
    // 실제로는 mammoth.js나 서버사이드 라이브러리 사용
    return `
Word 문서 내용

본 문서는 업로드된 DOCX 파일의 내용을 나타냅니다.
실제 구현에서는 mammoth.js 라이브러리를 사용하여
Word 문서의 실제 내용을 추출할 수 있습니다.

문서 구조:
- 제목과 부제목
- 본문 텍스트
- 표와 목록
- 이미지 및 도형

형식 정보:
- 폰트 스타일
- 문단 서식
- 페이지 레이아웃

현재는 시뮬레이션 모드로 운영되고 있으며,
실제 Word 문서 파싱을 위해서는 적절한
라이브러리 통합이 필요합니다.
    `.trim()
  }

  // 문서 제목 추출
  private extractTitle(fileName: string, content: string): string {
    // 파일명에서 확장자 제거
    let title = fileName.replace(/\.[^/.]+$/, '')
    
    // 내용에서 첫 번째 줄이나 제목 패턴 찾기
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    
    if (lines.length > 0) {
      const firstLine = lines[0]
      // 첫 번째 줄이 제목처럼 보이면 사용 (너무 길지 않고 특수문자가 적은 경우)
      if (firstLine.length < 100 && !firstLine.includes('.') && !firstLine.includes('?')) {
        title = firstLine
      }
    }
    
    return title
  }

  // 문서 섹션 추출
  private extractSections(content: string): DocumentSection[] {
    const sections: DocumentSection[] = []
    const lines = content.split('\n')
    
    let currentSection: DocumentSection | null = null
    let currentContent = ''
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      if (!line) continue
      
      // 제목 패턴 감지 (숫자. 로 시작하는 줄)
      const titleMatch = line.match(/^(\d+)\.\s*(.+)$/)
      if (titleMatch) {
        // 이전 섹션 저장
        if (currentSection) {
          currentSection.content = currentContent.trim()
          sections.push(currentSection)
        }
        
        // 새 섹션 시작
        currentSection = {
          title: titleMatch[2],
          content: '',
          level: 1
        }
        currentContent = ''
      } else if (currentSection) {
        // 현재 섹션에 내용 추가
        currentContent += line + '\n'
      } else {
        // 첫 번째 섹션 생성 (제목 없이 시작하는 경우)
        currentSection = {
          title: '서론',
          content: '',
          level: 1
        }
        currentContent = line + '\n'
      }
    }
    
    // 마지막 섹션 저장
    if (currentSection) {
      currentSection.content = currentContent.trim()
      sections.push(currentSection)
    }
    
    return sections
  }

  // RFP 속성 추출
  extractRfpAttributes(parsedDoc: ParsedDocument): any {
    const content = parsedDoc.content.toLowerCase()
    
    return {
      company: this.extractValue(content, ['발주처', '발주사', '회사명', '기업명']),
      department: this.extractValue(content, ['부서', '담당부서', '팀']),
      budget: this.extractValue(content, ['예산', '사업비', '비용']),
      duration: this.extractValue(content, ['기간', '일정', '개월']),
      scope: this.extractValue(content, ['범위', '사업범위', '프로젝트 범위']),
      requirements: this.extractValue(content, ['요구사항', '필수사항', '조건'])
    }
  }

  // 제안서 내용 추출
  extractProposalContent(parsedDoc: ParsedDocument): any {
    const sections = parsedDoc.sections
    
    return {
      overview: this.findSectionByKeywords(sections, ['개요', '요약', 'summary']),
      solution: this.findSectionByKeywords(sections, ['솔루션', '해결방안', '제안']),
      methodology: this.findSectionByKeywords(sections, ['방법론', '접근방식', 'methodology']),
      timeline: this.findSectionByKeywords(sections, ['일정', '계획', 'timeline']),
      budget: this.findSectionByKeywords(sections, ['예산', '비용', 'budget']),
      team: this.findSectionByKeywords(sections, ['팀', '조직', 'team'])
    }
  }

  private extractValue(content: string, keywords: string[]): string {
    for (const keyword of keywords) {
      const regex = new RegExp(`${keyword}[:\s]*([^\n]+)`, 'i')
      const match = content.match(regex)
      if (match) {
        return match[1].trim()
      }
    }
    return ''
  }

  private findSectionByKeywords(sections: DocumentSection[], keywords: string[]): string {
    for (const section of sections) {
      for (const keyword of keywords) {
        if (section.title.toLowerCase().includes(keyword.toLowerCase())) {
          return section.content
        }
      }
    }
    return ''
  }
}