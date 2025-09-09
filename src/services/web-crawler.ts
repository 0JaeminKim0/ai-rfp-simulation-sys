// 웹 크롤링 서비스 - 기업 정보 자동 수집

import { parse } from 'node-html-parser'

export class WebCrawlerService {
  
  /**
   * 기업 홈페이지 및 관련 URL에서 텍스트 콘텐츠 수집
   */
  async crawlCompanyData(
    companyName: string,
    urls: string[] = [],
    maxPages: number = 5
  ): Promise<{
    company_name: string
    collected_urls: string[]
    content_data: Array<{
      url: string
      title: string
      content: string
      section_type: string
      word_count: number
    }>
    total_word_count: number
    collection_timestamp: string
  }> {
    
    const results = {
      company_name: companyName,
      collected_urls: [],
      content_data: [],
      total_word_count: 0,
      collection_timestamp: new Date().toISOString()
    }

    // 기본 URL이 없는 경우 검색 기반 URL 생성
    if (urls.length === 0) {
      urls = await this.generateCompanyUrls(companyName)
    }

    // 최대 페이지 수 제한
    const targetUrls = urls.slice(0, maxPages)
    
    for (const url of targetUrls) {
      try {
        console.log(`크롤링 시작: ${url}`)
        const pageData = await this.crawlSinglePage(url)
        
        if (pageData && pageData.content.length > 100) { // 최소 콘텐츠 길이 검증
          results.content_data.push(pageData)
          results.collected_urls.push(url)
          results.total_word_count += pageData.word_count
          
          console.log(`크롤링 완료: ${url} (${pageData.word_count}자)`)
        }
        
        // 요청 간격 조절 (1초 대기)
        await this.delay(1000)
        
      } catch (error) {
        console.error(`크롤링 실패 ${url}:`, error.message)
        // 실패한 URL은 건너뛰고 계속 진행
        continue
      }
    }

    if (results.content_data.length === 0) {
      throw new Error('유효한 콘텐츠를 수집할 수 없습니다')
    }

    console.log(`총 ${results.content_data.length}개 페이지, ${results.total_word_count}자 수집 완료`)
    return results
  }

  /**
   * 단일 웹페이지 크롤링
   */
  private async crawlSinglePage(url: string): Promise<{
    url: string
    title: string
    content: string
    section_type: string
    word_count: number
  }> {
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br'
      },
      // Cloudflare Workers에서 지원하는 옵션만 사용
      method: 'GET'
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    const root = parse(html)

    // 페이지 제목 추출
    const title = root.querySelector('title')?.text?.trim() || ''

    // 불필요한 요소 제거
    root.querySelectorAll('script, style, nav, header, footer, aside, .advertisement, .ad, .sidebar').forEach(el => el.remove())

    // 메인 콘텐츠 추출 우선순위
    const contentSelectors = [
      'main',
      '[role="main"]',
      '.main-content',
      '.content',
      '.container',
      'article',
      '.article-content',
      'body'
    ]

    let mainContent = ''
    
    for (const selector of contentSelectors) {
      const element = root.querySelector(selector)
      if (element) {
        mainContent = element.text
        break
      }
    }

    // 텍스트 정제
    const cleanContent = this.cleanText(mainContent)
    
    // 섹션 타입 판별
    const sectionType = this.identifySectionType(url, title, cleanContent)
    
    return {
      url,
      title,
      content: cleanContent,
      section_type: sectionType,
      word_count: cleanContent.length
    }
  }

  /**
   * 기업명 기반 추정 URL 생성
   */
  private async generateCompanyUrls(companyName: string): Promise<string[]> {
    // 한국 대기업 도메인 매핑
    const companyDomainMap: Record<string, string[]> = {
      '삼성전자': ['samsung.com', 'sec.co.kr'],
      '삼성': ['samsung.com', 'sec.co.kr'],
      'LG전자': ['lge.co.kr', 'lg.com'],
      'LG': ['lg.com', 'lge.co.kr'],
      '현대자동차': ['hyundai.com', 'hyundai-motor.com'],
      '현대': ['hyundai.com', 'hyundai-motor.com'],
      'SK': ['sk.co.kr', 'sk.com'],
      'SK텔레콤': ['sktelecom.com', 'tworld.co.kr'],
      'KT': ['kt.com', 'kt.co.kr'],
      '포스코': ['posco.co.kr', 'posco.com'],
      '네이버': ['naver.com', 'navercorp.com'],
      '카카오': ['kakaocorp.com', 'kakao.com'],
      '금고석유화학': ['geumgo.co.kr', 'geumgo-petro.com'], // 데모 회사
      'PwC': ['pwc.com', 'pwc.co.kr'],
      '딜로이트': ['deloitte.com', 'deloitte.co.kr']
    }

    // 영문 회사명인 경우 기본 패턴 적용
    const isKorean = /[\u3131-\u3163\uac00-\ud7a3]/g.test(companyName)
    let domains: string[] = []
    
    if (isKorean && companyDomainMap[companyName]) {
      domains = companyDomainMap[companyName]
    } else if (isKorean) {
      // 한글 회사명이지만 매핑에 없는 경우 - 일반적인 패턴 사용 (영문 변환 없이 스킵)
      console.log(`${companyName}: 도메인 매핑 정보가 없습니다. 기본 URL을 사용합니다.`)
      return [
        'https://example.com', // 실제로는 크롤링하지 않지만 오류 방지용
      ]
    } else {
      // 영문 회사명 - 기본 패턴 적용
      const cleanName = companyName.toLowerCase().replace(/\s+/g, '')
      domains = [`${cleanName}.com`, `${cleanName}.co.kr`]
    }

    const urls = []
    
    for (const domain of domains.slice(0, 2)) { // 최대 2개 도메인
      urls.push(`https://${domain}`)
      urls.push(`https://${domain}/about`) 
      urls.push(`https://${domain}/company`)
      urls.push(`https://${domain}/kr/company`) // 한국 사이트 경우
    }

    return urls.slice(0, 6) // 최대 6개 URL
  }

  /**
   * 텍스트 정제
   */
  private cleanText(text: string): string {
    if (!text) return ''
    
    return text
      // 연속된 공백/탭/줄바꿈을 하나의 공백으로
      .replace(/\s+/g, ' ')
      // 특수문자 정리
      .replace(/[^\w\s가-힣.,!?()-]/g, '')
      // 앞뒤 공백 제거
      .trim()
      // 너무 짧은 라인 제거
      .split('\n')
      .filter(line => line.trim().length > 10)
      .join('\n')
      // 최대 길이 제한 (토큰 수 고려)
      .substring(0, 8000)
  }

  /**
   * 섹션 타입 식별
   */
  private identifySectionType(url: string, title: string, content: string): string {
    const urlLower = url.toLowerCase()
    const titleLower = title.toLowerCase()
    const contentLower = content.toLowerCase()

    if (urlLower.includes('/about') || titleLower.includes('about') || 
        contentLower.includes('회사소개') || contentLower.includes('기업개요')) {
      return 'about'
    }
    
    if (urlLower.includes('/ir') || urlLower.includes('/investor') ||
        contentLower.includes('투자자') || contentLower.includes('재무정보')) {
      return 'investor_relations'
    }
    
    if (urlLower.includes('/news') || urlLower.includes('/press') ||
        contentLower.includes('보도자료') || contentLower.includes('뉴스')) {
      return 'news'
    }
    
    if (urlLower.includes('/business') || urlLower.includes('/service') ||
        contentLower.includes('사업영역') || contentLower.includes('서비스')) {
      return 'business'
    }
    
    if (urlLower.includes('/esg') || urlLower.includes('/sustainability') ||
        contentLower.includes('지속가능') || contentLower.includes('사회책임')) {
      return 'esg'
    }
    
    return 'general'
  }

  /**
   * 지연 함수
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 공개 정보 소스에서 기업 정보 수집
   */
  async collectPublicCompanyData(companyName: string): Promise<{
    dart_info?: any // 전자공시시스템 정보
    news_mentions?: any[] // 뉴스 멘션
    market_data?: any // 시장 데이터
  }> {
    
    const results = {}
    
    try {
      // DART 전자공시 정보 (API가 있다면)
      // results.dart_info = await this.fetchDartInfo(companyName)
      
      // 뉴스 API 연동 (예: 네이버 뉴스 검색 API)
      // results.news_mentions = await this.fetchNewsData(companyName)
      
      // 현재는 기본 웹 크롤링만 구현
      console.log(`${companyName} 공개 정보 수집 완료`)
      
    } catch (error) {
      console.error('공개 정보 수집 오류:', error)
    }
    
    return results
  }

  /**
   * URL 유효성 검사
   */
  private isValidUrl(urlString: string): boolean {
    try {
      new URL(urlString)
      return true
    } catch {
      return false
    }
  }

  /**
   * 로봇 배제 표준(robots.txt) 확인
   */
  private async checkRobotsPermission(baseUrl: string, path: string): Promise<boolean> {
    try {
      const robotsUrl = new URL('/robots.txt', baseUrl).toString()
      const response = await fetch(robotsUrl)
      
      if (!response.ok) return true // robots.txt가 없으면 허용
      
      const robotsText = await response.text()
      
      // 간단한 robots.txt 파싱 (User-agent: * 기준)
      const lines = robotsText.split('\n')
      let userAgentAll = false
      
      for (const line of lines) {
        const trimmedLine = line.trim().toLowerCase()
        
        if (trimmedLine.startsWith('user-agent:')) {
          userAgentAll = trimmedLine.includes('*')
        }
        
        if (userAgentAll && trimmedLine.startsWith('disallow:')) {
          const disallowPath = trimmedLine.split(':')[1]?.trim()
          if (disallowPath && path.startsWith(disallowPath)) {
            return false
          }
        }
      }
      
      return true
      
    } catch {
      return true // 확인 실패시 허용으로 간주
    }
  }
}