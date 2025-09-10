// PDF/문서 파싱 서비스 - PDF.js + OCR + LLM

import { PDFDocument } from 'pdf-lib'

export class PdfParserService {
  
  /**
   * PDF 파일에서 텍스트 추출
   */
  async extractTextFromPdf(
    pdfBuffer: ArrayBuffer | Uint8Array,
    fileName: string
  ): Promise<{
    text: string
    pages: Array<{
      page_number: number
      content: string
      word_count: number
    }>
    metadata: {
      title?: string
      author?: string
      subject?: string
      creator?: string
      creation_date?: string
      modification_date?: string
      page_count: number
      file_size: number
    }
    extraction_method: 'pdf-parse' | 'pdf-lib' | 'fallback'
  }> {
    
    try {
      console.log(`📄 PDF 파싱 시작: ${fileName} (${pdfBuffer.byteLength} bytes)`)
      
      // Railway 환경에서 pdf-parse 사용 시도
      try {
        const pdfParse = require('pdf-parse')
        const uint8Buffer = Buffer.from(pdfBuffer)
        
        console.log('🚀 pdf-parse 라이브러리 사용 중...')
        const pdfData = await pdfParse(uint8Buffer)
        
        console.log(`✅ PDF 파싱 성공: ${pdfData.text.length}자, ${pdfData.numpages}페이지 (pdf-parse)`)
        
        // 페이지별 텍스트 분할 시도
        const textPerPage = Math.ceil(pdfData.text.length / pdfData.numpages)
        const pages = []
        
        for (let i = 0; i < pdfData.numpages; i++) {
          const start = i * textPerPage
          const end = Math.min((i + 1) * textPerPage, pdfData.text.length)
          const pageContent = pdfData.text.substring(start, end).trim()
          
          if (pageContent.length > 0) {
            pages.push({
              page_number: i + 1,
              content: pageContent,
              word_count: pageContent.split(/\s+/).length
            })
          }
        }
        
        const metadata = {
          title: pdfData.info?.Title || undefined,
          author: pdfData.info?.Author || undefined,
          subject: pdfData.info?.Subject || undefined,
          creator: pdfData.info?.Creator || undefined,
          creation_date: pdfData.info?.CreationDate || undefined,
          modification_date: pdfData.info?.ModDate || undefined,
          page_count: pdfData.numpages,
          file_size: pdfBuffer.byteLength
        }

        return {
          text: pdfData.text,
          pages: pages,
          metadata: metadata,
          extraction_method: 'pdf-parse'
        }
        
      } catch (pdfParseError) {
        console.log(`⚠️ pdf-parse 실패, pdf-lib 대안 시도: ${pdfParseError.message}`)
        return this.extractWithPdfLib(pdfBuffer, fileName)
      }
      
    } catch (error) {
      console.error('❌ PDF 파싱 완전 실패:', error)
      throw new Error(`PDF 파싱 오류: ${error.message}`)
    }
  }
  
  /**
   * PDF-lib을 사용한 대안 파싱
   */
  private async extractWithPdfLib(
    pdfBuffer: ArrayBuffer | Uint8Array,
    fileName: string
  ): Promise<{
    text: string
    pages: Array<{
      page_number: number
      content: string
      word_count: number
    }>
    metadata: {
      title?: string
      author?: string
      subject?: string
      creator?: string
      creation_date?: string
      modification_date?: string
      page_count: number
      file_size: number
    }
    extraction_method: 'pdf-lib' | 'fallback'
  }> {
    
    try {
      console.log(`🔄 pdf-lib 방식으로 PDF 파싱: ${fileName}`)
      
      // PDF 문서 로드
      const pdfDoc = await PDFDocument.load(pdfBuffer)
      const pageCount = pdfDoc.getPageCount()
      
      // 메타데이터 추출
      const metadata = {
        title: pdfDoc.getTitle() || undefined,
        author: pdfDoc.getAuthor() || undefined,
        subject: pdfDoc.getSubject() || undefined,
        creator: pdfDoc.getCreator() || undefined,
        creation_date: pdfDoc.getCreationDate()?.toISOString() || undefined,
        modification_date: pdfDoc.getModificationDate()?.toISOString() || undefined,
        page_count: pageCount,
        file_size: pdfBuffer.byteLength
      }

      console.log(`📋 PDF 메타데이터 추출: ${pageCount}페이지`)

      // 패턴 매칭 방식 텍스트 추출
      const extractionResult = await this.extractWithFallbackMethod(pdfBuffer)
      
      const pages = extractionResult.pages.map((content, index) => ({
        page_number: index + 1,
        content: content,
        word_count: content.split(/\s+/).length
      }))

      const allText = pages.map(page => page.content).join('\n\n')

      console.log(`📋 PDF-lib 텍스트 추출 완료: ${allText.length}자`)

      return {
        text: allText,
        pages: pages,
        metadata: metadata,
        extraction_method: extractionResult.method
      }
      
    } catch (error) {
      console.error('❌ PDF-lib도 실패:', error)
      throw new Error(`PDF 파싱 완전 실패: ${error.message}`)
    }
  }

  /**
   * 대안 방식 텍스트 추출 (Cloudflare Workers 호환)
   */
  private async extractWithFallbackMethod(pdfBuffer: ArrayBuffer): Promise<{
    pages: string[]
    method: 'pdf-lib' | 'fallback'
  }> {
    
    try {
      // PDF 구조를 분석하여 텍스트 객체를 찾아 추출하는 간단한 방식
      const uint8Array = new Uint8Array(pdfBuffer)
      const pdfString = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array)
      
      // PDF 내 텍스트 스트림 패턴 매칭
      const textPatterns = [
        /BT\s+.*?ET/gs,  // 기본 텍스트 블록
        /\(([^)]+)\)\s*Tj/g,  // 텍스트 표시 명령
        /\[([^\]]+)\]\s*TJ/g,  // 배열 형태 텍스트
        /\/F\d+\s+\d+\s+Tf\s+([^(]+)/g  // 폰트 설정 후 텍스트
      ]

      let extractedTexts = []
      
      for (const pattern of textPatterns) {
        const matches = pdfString.match(pattern)
        if (matches) {
          extractedTexts.push(...matches)
        }
      }

      // 추출된 텍스트 정제
      const cleanTexts = extractedTexts
        .map(text => this.cleanPdfText(text))
        .filter(text => text.length > 5) // 너무 짧은 텍스트 제거
      
      // 페이지 구분 시도 (완전하지 않음)
      const combinedText = cleanTexts.join('\n')
      const estimatedPages = this.estimatePageBreaks(combinedText)
      
      return {
        pages: estimatedPages.length > 0 ? estimatedPages : [combinedText],
        method: 'fallback'
      }
      
    } catch (error) {
      console.error('대안 방식 추출 실패:', error)
      
      // 최후 수단: 바이너리에서 일반 텍스트 패턴 찾기
      const uint8Array = new Uint8Array(pdfBuffer)
      const fallbackText = this.extractPlainTextFromBinary(uint8Array)
      
      return {
        pages: [fallbackText],
        method: 'fallback'
      }
    }
  }

  /**
   * PDF 텍스트 정제
   */
  private cleanPdfText(rawText: string): string {
    return rawText
      // PDF 명령어 제거
      .replace(/BT|ET|Tj|TJ|Tf|Td|TD/g, '')
      // 괄호 제거
      .replace(/[()]/g, '')
      // 대괄호와 내용 정리
      .replace(/\[|\]/g, '')
      // 숫자만으로 된 라인 제거 (좌표값 등)
      .replace(/^\d+(\.\d+)?\s*$/gm, '')
      // 연속 공백 정리
      .replace(/\s+/g, ' ')
      // 특수 문자 정리
      .replace(/[^\w\s가-힣.,!?()-]/g, '')
      .trim()
  }

  /**
   * 페이지 구분 추정
   */
  private estimatePageBreaks(text: string): string[] {
    // 간단한 페이지 구분 휴리스틱
    const pageBreakPatterns = [
      /\f/g,  // 폼 피드 문자
      /페이지\s*\d+/gi,
      /Page\s*\d+/gi,
      /-\s*\d+\s*-/g  // 페이지 번호 패턴
    ]

    let pages = [text]
    
    for (const pattern of pageBreakPatterns) {
      const newPages = []
      for (const page of pages) {
        const splits = page.split(pattern)
        newPages.push(...splits.filter(split => split.trim().length > 50))
      }
      if (newPages.length > pages.length) {
        pages = newPages
        break
      }
    }
    
    return pages
  }

  /**
   * 바이너리에서 플레인 텍스트 추출 (최후 수단)
   */
  private extractPlainTextFromBinary(uint8Array: Uint8Array): string {
    let text = ''
    
    // UTF-8로 디코딩 시도
    try {
      const decoded = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array)
      
      // 일반 텍스트 패턴 추출 (영문, 한글, 숫자, 기본 구두점)
      const textMatches = decoded.match(/[a-zA-Z가-힣0-9\s.,!?()/-]+/g)
      
      if (textMatches) {
        text = textMatches
          .filter(match => match.trim().length > 3)
          .join('\n')
          .substring(0, 10000) // 최대 길이 제한
      }
      
    } catch (error) {
      console.error('바이너리 텍스트 추출 실패:', error)
    }
    
    return text || '텍스트 추출에 실패했습니다.'
  }

  /**
   * DOCX 파일 처리 (JSZip을 사용한 정확한 파싱 - Railway 전용)
   */
  async extractTextFromDocx(
    docxBuffer: ArrayBuffer,
    fileName: string
  ): Promise<{
    text: string
    extraction_method: string
  }> {
    
    try {
      console.log(`📄 DOCX 파싱 시작: ${fileName} (${docxBuffer.byteLength} bytes)`)
      
      // Railway 환경에서 JSZip 사용 가능
      const JSZip = require('jszip')
      const zip = new JSZip()
      
      // DOCX 파일 로드 (ZIP으로 압축된 XML 파일들)
      const docxZip = await zip.loadAsync(docxBuffer)
      
      // document.xml 파일에서 텍스트 추출
      const documentXml = docxZip.file('word/document.xml')
      
      if (!documentXml) {
        console.warn('⚠️ document.xml을 찾을 수 없음, 대안 방법 시도')
        return this.extractDocxFallback(docxBuffer, fileName)
      }
      
      const xmlContent = await documentXml.async('string')
      console.log(`📋 document.xml 추출 완료: ${xmlContent.length} bytes`)
      
      // Word XML에서 텍스트 추출
      const extractedTexts = []
      
      // <w:t> 태그에서 텍스트 추출 (Word 문서의 텍스트 런)
      const textMatches = xmlContent.match(/<w:t[^>]*>([^<]+)<\/w:t>/g)
      if (textMatches) {
        for (const match of textMatches) {
          const text = match.replace(/<[^>]+>/g, '').trim()
          if (text.length > 0) {
            extractedTexts.push(text)
          }
        }
      }
      
      // <w:p> 태그 단위로도 추출 시도 (단락)
      const paragraphMatches = xmlContent.match(/<w:p[^>]*>.*?<\/w:p>/gs)
      if (paragraphMatches) {
        for (const paragraph of paragraphMatches) {
          const textInParagraph = paragraph.match(/<w:t[^>]*>([^<]*)<\/w:t>/g)
          if (textInParagraph) {
            const paragraphText = textInParagraph
              .map(t => t.replace(/<[^>]+>/g, ''))
              .join('')
              .trim()
            if (paragraphText.length > 0) {
              extractedTexts.push(paragraphText)
            }
          }
        }
      }
      
      // 텍스트 정제 및 결합
      const cleanText = extractedTexts
        .filter(text => text && text.trim().length > 1)
        .map(text => text.trim())
        .join(' ')
        .replace(/\s+/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .substring(0, 50000) // 50KB 제한
      
      console.log(`✅ DOCX 텍스트 추출 성공: ${cleanText.length}자 (JSZip 방식)`)
      
      if (cleanText.length < 10) {
        console.warn('⚠️ 추출된 텍스트가 너무 짧음, 대안 방법 시도')
        return this.extractDocxFallback(docxBuffer, fileName)
      }
      
      return {
        text: cleanText,
        extraction_method: 'jszip_docx'
      }
      
    } catch (error) {
      console.error('❌ JSZip DOCX 파싱 오류:', error)
      console.log('🔄 대안 방법으로 재시도...')
      return this.extractDocxFallback(docxBuffer, fileName)
    }
  }
  
  /**
   * DOCX 대안 파싱 방법 (JSZip 실패시)
   */
  private async extractDocxFallback(
    docxBuffer: ArrayBuffer,
    fileName: string
  ): Promise<{
    text: string
    extraction_method: string
  }> {
    
    try {
      console.log(`🔄 DOCX 대안 파싱 시작: ${fileName}`)
      
      // 바이너리에서 직접 텍스트 패턴 찾기
      const uint8Array = new Uint8Array(docxBuffer)
      const text = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array)
      
      // 더 정교한 XML 텍스트 패턴
      const patterns = [
        /<w:t[^>]*>([^<]+)<\/w:t>/g,
        /<text[^>]*>([^<]+)<\/text>/g,
        /\bword\/document\.xml.*?<w:t[^>]*>([^<]+)<\/w:t>/g,
        />[가-힣a-zA-Z0-9\s.,!?():\-\/\[\]{}'"@#$%^&*+=<>~`|\\]{5,}<\/w:t>/g
      ]
      
      let extractedTexts = []
      
      for (const pattern of patterns) {
        const matches = [...text.matchAll(pattern)]
        extractedTexts.push(...matches.map(match => match[1] || match[0].replace(/<[^>]+>/g, '')))
      }
      
      const cleanText = extractedTexts
        .filter(text => text && text.trim().length > 3)
        .map(text => text.trim())
        .join(' ')
        .replace(/\s+/g, ' ')
        .substring(0, 20000)
      
      console.log(`📋 DOCX 대안 파싱 완료: ${cleanText.length}자`)
      
      return {
        text: cleanText || `파일명 기반 분석: ${fileName}`,
        extraction_method: 'docx_fallback'
      }
      
    } catch (error) {
      console.error('❌ DOCX 대안 파싱도 실패:', error)
      return {
        text: `DOCX 파싱 실패 - 파일: ${fileName}`,
        extraction_method: 'docx_error'
      }
    }
  }

  /**
   * 문서 구조 분석
   */
  async analyzeDocumentStructure(
    text: string,
    fileName: string
  ): Promise<{
    sections: Array<{
      title: string
      content: string
      section_type: 'header' | 'body' | 'table' | 'list' | 'conclusion'
      word_count: number
    }>
    document_type: 'rfp' | 'proposal' | 'report' | 'presentation' | 'other'
    key_topics: string[]
    estimated_reading_time: number
  }> {
    
    console.log(`문서 구조 분석 시작: ${fileName}`)
    
    // 문서 타입 추정
    const documentType = this.estimateDocumentType(text, fileName)
    
    // 섹션 구분
    const sections = this.identifyDocumentSections(text)
    
    // 핵심 토픽 추출 (간단한 키워드 기반)
    const keyTopics = this.extractKeyTopics(text)
    
    // 읽기 시간 추정 (분당 200단어 기준)
    const wordCount = text.split(/\s+/).length
    const estimatedReadingTime = Math.ceil(wordCount / 200)
    
    console.log(`문서 구조 분석 완료: ${sections.length}개 섹션, ${keyTopics.length}개 주제`)
    
    return {
      sections,
      document_type: documentType,
      key_topics: keyTopics,
      estimated_reading_time: estimatedReadingTime
    }
  }

  /**
   * 문서 타입 추정
   */
  private estimateDocumentType(text: string, fileName: string): 'rfp' | 'proposal' | 'report' | 'presentation' | 'other' {
    const textLower = text.toLowerCase()
    const fileNameLower = fileName.toLowerCase()
    
    // RFP 키워드
    const rfpKeywords = ['request for proposal', 'rfp', '제안요청서', '입찰공고', '사업계획', '요구사항', '평가기준']
    if (rfpKeywords.some(keyword => textLower.includes(keyword) || fileNameLower.includes(keyword))) {
      return 'rfp'
    }
    
    // 제안서 키워드
    const proposalKeywords = ['제안서', 'proposal', '사업제안', '기술제안', '솔루션', '방안', '추진계획']
    if (proposalKeywords.some(keyword => textLower.includes(keyword) || fileNameLower.includes(keyword))) {
      return 'proposal'
    }
    
    // 보고서 키워드
    const reportKeywords = ['보고서', 'report', '분석', '결과', '현황', '실적']
    if (reportKeywords.some(keyword => textLower.includes(keyword) || fileNameLower.includes(keyword))) {
      return 'report'
    }
    
    // 발표자료 키워드
    const presentationKeywords = ['발표', 'presentation', 'ppt', '설명자료', '브리핑']
    if (presentationKeywords.some(keyword => textLower.includes(keyword) || fileNameLower.includes(keyword))) {
      return 'presentation'
    }
    
    return 'other'
  }

  /**
   * 문서 섹션 식별
   */
  private identifyDocumentSections(text: string): Array<{
    title: string
    content: string
    section_type: 'header' | 'body' | 'table' | 'list' | 'conclusion'
    word_count: number
  }> {
    
    const sections = []
    
    // 섹션 구분 패턴 (제목, 번호 등)
    const sectionPatterns = [
      /^\d+\.\s+(.+)/gm,  // 1. 제목
      /^제\d+장\s+(.+)/gm,  // 제1장 제목
      /^[가-힣]+\s*[:：]\s*(.+)/gm,  // 개요: 내용
      /^[A-Z][^\n]{10,50}/gm  // 영문 제목 패턴
    ]
    
    let currentSection = {
      title: '문서 시작',
      content: '',
      section_type: 'body' as const,
      word_count: 0
    }
    
    const lines = text.split('\n')
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      
      if (!trimmedLine) continue
      
      // 섹션 제목 감지
      let isNewSection = false
      for (const pattern of sectionPatterns) {
        const match = trimmedLine.match(pattern)
        if (match) {
          // 이전 섹션 저장
          if (currentSection.content.trim()) {
            currentSection.word_count = currentSection.content.split(/\s+/).length
            sections.push({ ...currentSection })
          }
          
          // 새 섹션 시작
          currentSection = {
            title: match[1] || trimmedLine,
            content: '',
            section_type: this.determineSectionType(trimmedLine),
            word_count: 0
          }
          isNewSection = true
          break
        }
      }
      
      if (!isNewSection) {
        currentSection.content += line + '\n'
      }
    }
    
    // 마지막 섹션 추가
    if (currentSection.content.trim()) {
      currentSection.word_count = currentSection.content.split(/\s+/).length
      sections.push(currentSection)
    }
    
    return sections.length > 0 ? sections : [{
      title: '전체 문서',
      content: text,
      section_type: 'body' as const,
      word_count: text.split(/\s+/).length
    }]
  }

  /**
   * 섹션 타입 결정
   */
  private determineSectionType(title: string): 'header' | 'body' | 'table' | 'list' | 'conclusion' {
    const titleLower = title.toLowerCase()
    
    if (titleLower.includes('목차') || titleLower.includes('차례') || titleLower.includes('개요')) {
      return 'header'
    }
    
    if (titleLower.includes('표') || titleLower.includes('table') || titleLower.includes('비교')) {
      return 'table'
    }
    
    if (titleLower.includes('목록') || titleLower.includes('list') || titleLower.includes('항목')) {
      return 'list'
    }
    
    if (titleLower.includes('결론') || titleLower.includes('마무리') || titleLower.includes('요약') || 
        titleLower.includes('conclusion') || titleLower.includes('summary')) {
      return 'conclusion'
    }
    
    return 'body'
  }

  /**
   * 핵심 토픽 추출 (간단한 키워드 기반)
   */
  private extractKeyTopics(text: string): string[] {
    // 한국어 불용어
    const stopWords = new Set([
      '그리고', '하지만', '그러나', '또한', '따라서', '이것', '그것', '이에', '대한', '위한', '통해', '대해',
      '있는', '없는', '되는', '하는', '같은', '다른', '새로운', '기본', '주요', '전체', '일반', '특별'
    ])
    
    // 단어 빈도 계산
    const words = text
      .toLowerCase()
      .replace(/[^\w가-힣\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
    
    const wordCount = new Map<string, number>()
    
    for (const word of words) {
      wordCount.set(word, (wordCount.get(word) || 0) + 1)
    }
    
    // 빈도 상위 키워드 반환
    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word)
  }

  /**
   * 파일 타입 검증
   */
  validateFileType(buffer: ArrayBuffer, fileName: string): {
    isValid: boolean
    fileType: 'pdf' | 'docx' | 'txt' | 'unknown'
    mimeType: string
  } {
    const uint8Array = new Uint8Array(buffer)
    
    // PDF 시그니처: %PDF
    if (uint8Array[0] === 0x25 && uint8Array[1] === 0x50 && 
        uint8Array[2] === 0x44 && uint8Array[3] === 0x46) {
      return {
        isValid: true,
        fileType: 'pdf',
        mimeType: 'application/pdf'
      }
    }
    
    // DOCX 시그니처: PK (ZIP 파일)
    if (uint8Array[0] === 0x50 && uint8Array[1] === 0x4B && fileName.endsWith('.docx')) {
      return {
        isValid: true,
        fileType: 'docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      }
    }

    // TXT 파일 검증 (파일 확장자와 텍스트 내용 검사)
    if (fileName.toLowerCase().endsWith('.txt')) {
      try {
        // UTF-8 텍스트인지 검증
        const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer)
        return {
          isValid: true,
          fileType: 'txt',
          mimeType: 'text/plain'
        }
      } catch (e) {
        // UTF-8 디코딩 실패 시 바이너리 파일로 간주
      }
    }
    
    return {
      isValid: false,
      fileType: 'unknown',
      mimeType: 'application/octet-stream'
    }
  }
}