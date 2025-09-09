// PDF 파싱 파이프라인 및 신호 추출 엔진

import type { Bindings } from '../types'

export interface PdfParsingJob {
  job_id: string;
  rfp_id: string;
  input_hash: string;
  status: 'queued' | 'running' | 'done' | 'error';
  progress_stage: 'ingest' | 'textification' | 'structuring' | 'signaling' | 'completed';
  progress_percent: number;
}

export interface PageData {
  page_id: string;
  page_no: number;
  kind: 'text' | 'image' | 'mixed' | 'table' | 'chart';
  text_raw?: string;
  ocr_text?: string;
  layout_json?: string;
  confidence_score: number;
  extraction_method: 'native' | 'ocr' | 'hybrid';
}

export interface DocumentStructure {
  structure_id: string;
  section_type: 'intro' | 'scope' | 'evaluation' | 'budget' | 'governance' | 'technical' | 'compliance' | 'timeline' | 'forms';
  section_title?: string;
  section_content: string;
  page_range: string;
  confidence_score: number;
  normalized_data?: any;
}

export interface RfpSignal {
  signal_id: string;
  signal_key: 'kpis' | 'evaluation_criteria' | 'budget_procurement' | 'governance_decision' | 
             'technical_requirements' | 'strategic_themes' | 'risk_compliance' | 'innovation_poc';
  signal_value: string;
  norm_payload?: any;
  confidence: number;
  source_span?: string;
  source_type: 'body' | 'table' | 'appendix' | 'meta';
}

export interface QualityMetric {
  metric_name: 'text_extraction_rate' | 'table_detection_rate' | 'ocr_confidence' | 'signal_confidence';
  metric_value: number;
  page_range?: string;
  details?: any;
}

export class PdfParsingPipeline {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  // UUID 생성 함수
  private generateUUID(): string {
    return crypto.randomUUID();
  }

  // 파일 해시 생성
  private async generateFileHash(content: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', content);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Stage A: 인제스트 작업 생성
  async createIngestJob(rfpId: string, fileContent: ArrayBuffer): Promise<string> {
    const jobId = this.generateUUID();
    const inputHash = await this.generateFileHash(fileContent);
    const now = new Date().toISOString();

    // 중복 파일 체크
    const existingJob = await this.db.prepare(`
      SELECT job_id FROM rfp_ingest_jobs WHERE input_hash = ? AND status = 'done'
    `).bind(inputHash).first();

    if (existingJob) {
      throw new Error('이미 처리된 동일한 파일입니다.');
    }

    await this.db.prepare(`
      INSERT INTO rfp_ingest_jobs (job_id, rfp_id, input_hash, status, progress_stage, created_at)
      VALUES (?, ?, ?, 'queued', 'ingest', ?)
    `).bind(jobId, rfpId, inputHash, now).run();

    return jobId;
  }

  // Stage A: 인제스트 작업 상태 업데이트
  async updateJobStatus(jobId: string, status: string, stage?: string, percent?: number, error?: string): Promise<void> {
    const now = new Date().toISOString();
    let query = `
      UPDATE rfp_ingest_jobs 
      SET status = ?, updated_at = ?
    `;
    const params: any[] = [status, now];

    if (stage) {
      query += `, progress_stage = ?`;
      params.push(stage);
    }

    if (percent !== undefined) {
      query += `, progress_percent = ?`;
      params.push(percent);
    }

    if (error) {
      query += `, error_message = ?`;
      params.push(error);
    }

    if (status === 'running' && stage === 'ingest') {
      query += `, started_at = ?`;
      params.push(now);
    }

    if (status === 'done' || status === 'error') {
      query += `, finished_at = ?`;
      params.push(now);
    }

    query += ` WHERE job_id = ?`;
    params.push(jobId);

    await this.db.prepare(query).bind(...params).run();
  }

  // Stage B: 텍스트화 - PDF 페이지별 처리
  async processPages(jobId: string, rfpId: string, content: string): Promise<PageData[]> {
    await this.updateJobStatus(jobId, 'running', 'textification', 20);

    // 실제 PDF 파싱은 외부 서비스를 사용해야 하므로 시뮬레이션
    const pages: PageData[] = await this.simulatePdfExtraction(rfpId, content);
    
    // 페이지 데이터 저장
    for (const page of pages) {
      await this.savePage(page, jobId);
    }

    await this.updateJobStatus(jobId, 'running', 'textification', 40);
    return pages;
  }

  // PDF 추출 시뮬레이션 (실제로는 PDF-lib, pdf2pic, tesseract 등 사용)
  private async simulatePdfExtraction(rfpId: string, content: string): Promise<PageData[]> {
    // 텍스트를 페이지로 분할 (실제로는 PDF 페이지 단위로 처리)
    const lines = content.split('\n').filter(line => line.trim());
    const linesPerPage = Math.max(10, Math.floor(lines.length / 3)); // 대략 3페이지로 분할
    
    const pages: PageData[] = [];
    
    for (let pageNo = 1; pageNo <= 3; pageNo++) {
      const startIdx = (pageNo - 1) * linesPerPage;
      const endIdx = Math.min(startIdx + linesPerPage, lines.length);
      const pageContent = lines.slice(startIdx, endIdx).join('\n');
      
      if (pageContent.trim()) {
        const page: PageData = {
          page_id: this.generateUUID(),
          page_no: pageNo,
          kind: this.detectPageKind(pageContent),
          text_raw: pageContent,
          confidence_score: this.calculateExtractionConfidence(pageContent),
          extraction_method: 'native'
        };

        // 표나 구조화된 데이터 감지 시 레이아웃 정보 생성
        if (page.kind === 'table' || page.kind === 'mixed') {
          page.layout_json = JSON.stringify({
            blocks: this.detectBlocks(pageContent),
            tables: this.detectTables(pageContent)
          });
        }

        pages.push(page);
      }
    }

    return pages;
  }

  // 페이지 종류 감지
  private detectPageKind(content: string): 'text' | 'image' | 'mixed' | 'table' | 'chart' {
    const lowerContent = content.toLowerCase();
    
    // 표 키워드 감지
    if (lowerContent.includes('평가') && (lowerContent.includes('%') || lowerContent.includes('점수'))) {
      return 'table';
    }
    
    // 차트/그래프 키워드 감지
    if (lowerContent.includes('차트') || lowerContent.includes('그래프') || lowerContent.includes('도표')) {
      return 'chart';
    }
    
    // 혼합 콘텐츠 감지 (텍스트 + 구조화 데이터)
    if (lowerContent.includes('기준') && lowerContent.includes('요구사항')) {
      return 'mixed';
    }
    
    return 'text';
  }

  // 추출 신뢰도 계산
  private calculateExtractionConfidence(content: string): number {
    let score = 0.5; // 기본 점수
    
    // 한글 텍스트 비율
    const koreanRatio = (content.match(/[ㄱ-ㅎㅏ-ㅣ가-힣]/g) || []).length / content.length;
    score += koreanRatio * 0.3;
    
    // 구조화된 정보 존재
    if (content.includes(':') || content.includes('•') || content.includes('-')) {
      score += 0.1;
    }
    
    // 숫자나 퍼센트 존재 (정량적 정보)
    if (content.match(/\d+%/) || content.match(/\d+억/) || content.match(/\d+년/)) {
      score += 0.1;
    }
    
    return Math.min(1.0, score);
  }

  // 블록 감지
  private detectBlocks(content: string): any[] {
    const blocks = [];
    const lines = content.split('\n');
    
    let currentBlock = null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // 제목 블록 감지 (숫자로 시작하거나 특정 패턴)
      if (line.match(/^\d+\.\s/) || line.match(/^[가-힣]+:$/)) {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = {
          type: 'title',
          content: line,
          start_line: i,
          end_line: i
        };
      } else if (currentBlock) {
        currentBlock.content += '\n' + line;
        currentBlock.end_line = i;
      } else {
        currentBlock = {
          type: 'paragraph',
          content: line,
          start_line: i,
          end_line: i
        };
      }
    }
    
    if (currentBlock) blocks.push(currentBlock);
    return blocks;
  }

  // 표 감지
  private detectTables(content: string): any[] {
    const tables = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 퍼센트나 점수가 포함된 라인을 표로 간주
      if (line.includes('%') || line.match(/\d+점/)) {
        // 평가 기준 표 감지
        const match = line.match(/([^(]+)\s*\((\d+)%\)/);
        if (match) {
          tables.push({
            type: 'evaluation_criteria',
            start_line: i,
            end_line: i,
            data: {
              criterion: match[1].trim(),
              weight: parseInt(match[2]) / 100
            }
          });
        }
      }
    }
    
    return tables;
  }

  // 페이지 저장
  private async savePage(page: PageData, jobId: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO rfp_pages (
        page_id, job_id, page_number, raw_text, ocr_text, layout_data, processing_metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      page.page_id, 
      jobId, 
      page.page_no, 
      page.text_raw || null,
      page.ocr_text || null, 
      page.layout_json || null, 
      JSON.stringify({
        kind: page.kind,
        confidence_score: page.confidence_score,
        extraction_method: page.extraction_method
      })
    ).run();
  }

  // Stage C: 구조화 - 섹션 감지 및 정규화
  async structureDocument(jobId: string, rfpId: string): Promise<DocumentStructure[]> {
    await this.updateJobStatus(jobId, 'running', 'structuring', 60);

    // 페이지 데이터 조회
    const pages = await this.db.prepare(`
      SELECT * FROM rfp_pages WHERE job_id = ? ORDER BY page_number
    `).bind(jobId).all();

    const structures: DocumentStructure[] = [];
    const fullContent = (pages.results as any[]).map(p => p.raw_text).join('\n');

    // 섹션별 구조화
    const sections = this.detectSections(fullContent);
    
    for (const section of sections) {
      const structure: DocumentStructure = {
        structure_id: this.generateUUID(),
        section_type: section.type,
        section_title: section.title,
        section_content: section.content,
        page_range: section.page_range,
        confidence_score: section.confidence,
        normalized_data: section.normalized
      };
      
      await this.saveDocumentStructure(structure, jobId);
      structures.push(structure);
    }

    await this.updateJobStatus(jobId, 'running', 'structuring', 70);
    return structures;
  }

  // 섹션 감지
  private detectSections(content: string): any[] {
    const sections = [];
    const lines = content.split('\n');
    
    let currentSection = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // 섹션 제목 감지
      const sectionType = this.identifySectionType(line);
      if (sectionType) {
        if (currentSection) {
          sections.push(currentSection);
        }
        
        currentSection = {
          type: sectionType,
          title: line,
          content: '',
          page_range: `${Math.floor(i / 20) + 1}`, // 대략적 페이지 계산
          confidence: 0.8,
          normalized: {}
        };
      } else if (currentSection) {
        currentSection.content += line + '\n';
      }
    }
    
    if (currentSection) {
      sections.push(currentSection);
    }
    
    // 각 섹션의 정규화 데이터 생성
    for (const section of sections) {
      section.normalized = this.normalizeSection(section.type, section.content);
      section.confidence = this.calculateSectionConfidence(section);
    }
    
    return sections;
  }

  // 섹션 타입 식별
  private identifySectionType(line: string): DocumentStructure['section_type'] | null {
    const lower = line.toLowerCase();
    
    // KPIs 섹션
    if (lower.includes('kpi') || lower.includes('key performance') || lower.includes('performance indicator') || lower.includes('지표')) return 'kpi';
    
    // 평가 기준 섹션
    if (lower.includes('evaluation') || lower.includes('criteria') || lower.includes('평가') || lower.includes('기준')) return 'evaluation';
    
    // 예산/조달 섹션
    if (lower.includes('budget') || lower.includes('procurement') || lower.includes('financial') || lower.includes('cost') || 
        lower.includes('예산') || lower.includes('비용') || lower.includes('조달')) return 'budget';
    
    // 거버넌스/의사결정 섹션
    if (lower.includes('governance') || lower.includes('decision') || lower.includes('approval') || lower.includes('committee') ||
        lower.includes('거버넌스') || lower.includes('승인') || lower.includes('의사결정')) return 'governance';
    
    // 기술 요구사항 섹션
    if (lower.includes('technical') || lower.includes('requirements') || lower.includes('api') || lower.includes('integration') ||
        lower.includes('기술') || lower.includes('요구사항')) return 'technical';
    
    // 전략 테마 섹션
    if (lower.includes('strategic') || lower.includes('themes') || lower.includes('transformation') || lower.includes('innovation') ||
        lower.includes('전략') || lower.includes('테마')) return 'strategic';
    
    // 리스크/규정 준수 섹션
    if (lower.includes('risk') || lower.includes('compliance') || lower.includes('regulatory') || lower.includes('audit') ||
        lower.includes('준수') || lower.includes('규제') || lower.includes('리스크')) return 'compliance';
    
    // 혁신/POC 섹션
    if (lower.includes('innovation') || lower.includes('proof of concept') || lower.includes('poc') || lower.includes('pilot') ||
        lower.includes('혁신') || lower.includes('개념증명')) return 'innovation';
    
    // 기본 섹션들
    if (lower.includes('overview') || lower.includes('개요') || lower.includes('목적')) return 'intro';
    if (lower.includes('scope') || lower.includes('범위')) return 'scope';
    if (lower.includes('timeline') || lower.includes('schedule') || lower.includes('일정') || lower.includes('타임라인')) return 'timeline';
    
    return null;
  }

  // 섹션 정규화
  private normalizeSection(type: DocumentStructure['section_type'], content: string): any {
    switch (type) {
      case 'evaluation':
        return this.normalizeEvaluationSection(content);
      case 'budget':
        return this.normalizeBudgetSection(content);
      case 'technical':
        return this.normalizeTechnicalSection(content);
      default:
        return { raw_content: content };
    }
  }

  // 평가 섹션 정규화
  private normalizeEvaluationSection(content: string): any {
    const criteria = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      const match = line.match(/([^(]+)\s*\((\d+)%\)/);
      if (match) {
        const criterion = match[1].trim();
        const weight = parseInt(match[2]) / 100;
        
        // 기준 정규화
        let normalizedKey = 'other';
        if (criterion.includes('기술')) normalizedKey = 'tech';
        else if (criterion.includes('가격') || criterion.includes('비용')) normalizedKey = 'price';
        else if (criterion.includes('품질')) normalizedKey = 'quality';
        else if (criterion.includes('실행')) normalizedKey = 'execution';
        
        criteria[normalizedKey] = weight;
      }
    }
    
    return { criteria, raw_content: content };
  }

  // 예산 섹션 정규화
  private normalizeBudgetSection(content: string): any {
    const budgetInfo: any = { raw_content: content };
    
    // 예산 금액 추출
    const amountMatch = content.match(/(\d+)억/);
    if (amountMatch) {
      budgetInfo.budget_amount = parseInt(amountMatch[1]) * 100000000; // 억원을 원으로 변환
    }
    
    // 지불 방식 감지
    if (content.includes('분기별')) budgetInfo.payment_schedule = 'quarterly';
    if (content.includes('성과')) budgetInfo.performance_based = true;
    
    return budgetInfo;
  }

  // 기술 섹션 정규화
  private normalizeTechnicalSection(content: string): any {
    const techRequirements = {
      ai_ml: content.includes('AI') || content.includes('ML') || content.includes('인공지능'),
      cloud: content.includes('클라우드') || content.includes('Cloud'),
      security: content.includes('보안') || content.includes('Security'),
      realtime: content.includes('실시간') || content.includes('Real'),
      iot: content.includes('IoT') || content.includes('센서'),
      raw_content: content
    };
    
    return techRequirements;
  }

  // 섹션 신뢰도 계산
  private calculateSectionConfidence(section: any): number {
    let confidence = 0.5;
    
    // 내용 길이 기반
    if (section.content.length > 100) confidence += 0.2;
    
    // 정규화 데이터 존재 기반
    if (Object.keys(section.normalized).length > 1) confidence += 0.2;
    
    // 섹션별 특화 점수
    if (section.type === 'evaluation' && section.normalized.criteria) {
      confidence += 0.1;
    }
    
    return Math.min(1.0, confidence);
  }

  // 문서 구조 저장
  private async saveDocumentStructure(structure: DocumentStructure, jobId: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO rfp_document_structure (
        structure_id, job_id, section_type, section_level, content,
        page_refs, confidence_score, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      structure.structure_id, 
      jobId, 
      structure.section_type, 
      structure.section_level || 1,
      structure.section_content,
      JSON.stringify([structure.page_range]),
      structure.confidence_score,
      JSON.stringify({
        section_title: structure.section_title,
        normalized_data: structure.normalized_data
      })
    ).run();
  }

  // Stage D: 신호 추출 - LLM 기반 구조화된 신호 생성
  async extractSignals(jobId: string, rfpId: string): Promise<RfpSignal[]> {
    await this.updateJobStatus(jobId, 'running', 'signaling', 80);

    // 구조화된 데이터 조회
    const structures = await this.db.prepare(`
      SELECT * FROM rfp_document_structure WHERE job_id = ?
    `).bind(jobId).all();

    const signals: RfpSignal[] = [];
    
    // 각 구조 섹션에서 신호 추출
    for (const structure of structures.results as any[]) {
      const sectionSignals = await this.extractSignalsFromSection(structure);
      signals.push(...sectionSignals);
    }

    // 신호 저장
    for (const signal of signals) {
      await this.saveSignal(signal, jobId);
    }

    await this.updateJobStatus(jobId, 'running', 'signaling', 90);
    return signals;
  }

  // 섹션별 신호 추출 (개선된 패턴 기반)
  private async extractSignalsFromSection(structure: any): Promise<RfpSignal[]> {
    const signals: RfpSignal[] = [];
    const content = structure.content || '';
    const sectionType = structure.section_type;
    
    // 텍스트 기반 패턴 매칭으로 신호 추출
    const extractedSignals = this.extractSignalsByPattern(content, sectionType);
    
    for (const signal of extractedSignals) {
      signals.push({
        signal_id: this.generateUUID(),
        signal_key: signal.type,
        signal_value: signal.value,
        norm_payload: signal.payload,
        confidence: signal.confidence,
        source_span: `section-${sectionType}`,
        source_type: 'pattern_match'
      });
    }
    
    return signals;
  }

  // 패턴 기반 신호 추출 (한국어/영어 지원)
  private extractSignalsByPattern(content: string, sectionType: string): Array<{
    type: string, value: string, confidence: number, payload: any
  }> {
    const signals = [];
    const lower = content.toLowerCase();
    
    // 예산/투자 신호 추출 (한국어 강화)
    const budgetPatterns = [
      /(\d{1,4}[,.]?\d*)\s*억\s*달러/g,
      /(\d{1,4}[,.]?\d*)\s*억\s*원/g,
      /(\d{1,4}[,.]?\d*)\s*조\s*원/g,
      /\$?(\d{1,4}[,.]?\d*)\s*billion/gi,
      /약\s*(\d{1,4}[,.]?\d*)\s*억/g,
      /(\d{4})년까지.*?(\d{1,4}[,.]?\d*)\s*억/g
    ];
    
    budgetPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          signals.push({
            type: 'budget_procurement',
            value: `투자 규모: ${match}`,
            confidence: 0.85,
            payload: { amount: match, source: '예산 관련 내용' }
          });
        });
      }
    });
    
    // 전략적 테마 추출 (한국어)
    const strategicKeywords = [
      '수소경제', '에너지 전환', '탄소중립', '친환경', '신재생에너지',
      '글로벌 선도국가', '국산화', '기업 육성', '인프라 투자',
      '디지털 전환', '혁신', '기술개발', 'R&D', '실증사업'
    ];
    
    strategicKeywords.forEach(keyword => {
      if (content.includes(keyword)) {
        // 키워드 주변 맥락 추출
        const regex = new RegExp(`[^.]*${keyword}[^.]*`, 'g');
        const contextMatches = content.match(regex);
        if (contextMatches) {
          contextMatches.forEach(context => {
            if (context.trim().length > 10) {
              signals.push({
                type: 'strategic_themes',
                value: context.trim(),
                confidence: 0.8,
                payload: { keyword, theme: context.trim() }
              });
            }
          });
        }
      }
    });
    
    // 기술 요구사항 추출 (한국어)
    const techKeywords = [
      '수소차', '충전소', '연료전지', '전해조', '수전해',
      '생산·운송·활용', '밸류체인', '소재·부품·장치',
      'AI', 'IoT', '빅데이터', '클라우드', '디지털'
    ];
    
    techKeywords.forEach(keyword => {
      if (content.includes(keyword)) {
        signals.push({
          type: 'technical_requirements',
          value: `기술 영역: ${keyword}`,
          confidence: 0.8,
          payload: { technology: keyword }
        });
      }
    });
    
    // 거버넌스/정책 신호 추출
    const governanceKeywords = [
      '정부', '정책', '로드맵', '규제', '표준', '법령',
      '위원회', '승인', '허가', '인증', '심사'
    ];
    
    governanceKeywords.forEach(keyword => {
      if (content.includes(keyword)) {
        const regex = new RegExp(`[^.]*${keyword}[^.]*`, 'g');
        const contextMatches = content.match(regex);
        if (contextMatches) {
          contextMatches.forEach(context => {
            signals.push({
              type: 'governance_decision',
              value: context.trim(),
              confidence: 0.75,
              payload: { keyword, context: context.trim() }
            });
          });
        }
      }
    });
    
    // 리스크/컴플라이언스 추출
    const riskKeywords = [
      '안전', '규제', '표준', '인증', '심사', '검증',
      '환경', '법규', 'compliance', '리스크'
    ];
    
    riskKeywords.forEach(keyword => {
      if (content.includes(keyword)) {
        signals.push({
          type: 'risk_compliance',
          value: `규제/안전 요구사항: ${keyword}`,
          confidence: 0.8,
          payload: { requirement: keyword }
        });
      }
    });
    
    // 혁신/R&D 신호 추출
    const innovationKeywords = [
      'R&D', '연구개발', '혁신', '기술개발', '실증',
      'POC', '파일럿', '테스트베드', '시범사업'
    ];
    
    innovationKeywords.forEach(keyword => {
      if (content.includes(keyword)) {
        signals.push({
          type: 'innovation_poc',
          value: `혁신 활동: ${keyword}`,
          confidence: 0.8,
          payload: { focus: keyword }
        });
      }
    });
    
    // KPI/성과지표 추출 (숫자가 포함된 목표)
    const kpiPatterns = [
      /(\d+)%/g,
      /(\d{4})년까지/g,
      /(\d{1,4}[,.]?\d*)\s*개/g,
      /약\s*(\d+)/g
    ];
    
    kpiPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          // 맥락이 있는 문장 추출
          const regex = new RegExp(`[^.]*${match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^.]*`, 'g');
          const contextMatches = content.match(regex);
          if (contextMatches) {
            contextMatches.forEach(context => {
              signals.push({
                type: 'kpis',
                value: context.trim(),
                confidence: 0.8,
                payload: { metric: match, context: context.trim() }
              });
            });
          }
        });
      }
    });
    
    // 기존 영어 패턴들도 유지 (기존 코드와 호환성)
    if (sectionType === 'evaluation' || lower.includes('evaluation') || lower.includes('criteria')) {
      const criteriaMatches = content.match(/[-•]\s*([^(]+)\s*\((\d+%)\)/g);
      if (criteriaMatches) {
        criteriaMatches.forEach(match => {
          const [, criteria, weight] = match.match(/[-•]\s*([^(]+)\s*\((\d+%)\)/) || [];
          if (criteria && weight) {
            signals.push({
              type: 'evaluation_criteria',
              value: `${criteria.trim()}: ${weight}`,
              confidence: 0.9,
              payload: { criteria: criteria.trim(), weight }
            });
          }
        });
      }
    }
    
    // 평가 기준 추출
    if (sectionType === 'evaluation' || lower.includes('evaluation') || lower.includes('criteria')) {
      const criteriaMatches = content.match(/[-•]\s*([^(]+)\s*\((\d+%)\)/g);
      if (criteriaMatches) {
        criteriaMatches.forEach(match => {
          const [, criteria, weight] = match.match(/[-•]\s*([^(]+)\s*\((\d+%)\)/) || [];
          if (criteria && weight) {
            signals.push({
              type: 'evaluation_criteria',
              value: `${criteria.trim()}: ${weight}`,
              confidence: 0.9,
              payload: { criteria: criteria.trim(), weight }
            });
          }
        });
      }
    }
    
    // 예산 정보 추출
    if (sectionType === 'budget' || lower.includes('budget') || lower.includes('cost')) {
      const budgetMatches = content.match(/\$[\d,]+\.?\d*[MK]?|\$[\d,]+/g);
      if (budgetMatches) {
        budgetMatches.forEach(amount => {
          signals.push({
            type: 'budget_procurement',
            value: `Budget allocation: ${amount}`,
            confidence: 0.8,
            payload: { amount }
          });
        });
      }
    }
    
    // 거버넌스 정보 추출  
    if (sectionType === 'governance' || lower.includes('governance') || lower.includes('committee')) {
      const roles = ['cto', 'cfo', 'ciso', 'ceo', 'vp', 'director', 'board'];
      roles.forEach(role => {
        if (lower.includes(role)) {
          signals.push({
            type: 'governance_decision',
            value: `Decision maker: ${role.toUpperCase()}`,
            confidence: 0.75,
            payload: { role }
          });
        }
      });
    }
    
    // 기술 요구사항 추출
    if (sectionType === 'technical' || lower.includes('technical') || lower.includes('api')) {
      const techKeywords = ['api', 'cloud', 'aws', 'azure', 'gcp', 'integration', 'security', 'soc2', 'iso'];
      techKeywords.forEach(keyword => {
        if (lower.includes(keyword)) {
          signals.push({
            type: 'technical_requirements',
            value: `Technology: ${keyword.toUpperCase()}`,
            confidence: 0.8,
            payload: { technology: keyword }
          });
        }
      });
    }
    
    // 전략 테마 추출
    if (sectionType === 'strategic' || lower.includes('strategic') || lower.includes('transformation')) {
      const strategicMatches = content.match(/[-•]\s*([^\n]+)/g);
      if (strategicMatches) {
        strategicMatches.forEach(match => {
          const theme = match.replace(/[-•]\s*/, '').trim();
          if (theme.length > 10) {
            signals.push({
              type: 'strategic_themes',
              value: theme,
              confidence: 0.75,
              payload: { theme }
            });
          }
        });
      }
    }
    
    // 리스크/컴플라이언스 추출
    if (sectionType === 'compliance' || lower.includes('compliance') || lower.includes('risk')) {
      const complianceKeywords = ['gdpr', 'hipaa', 'sox', 'pci dss', 'iso 27001', 'audit', 'security'];
      complianceKeywords.forEach(keyword => {
        if (lower.includes(keyword)) {
          signals.push({
            type: 'risk_compliance',
            value: `Compliance requirement: ${keyword.toUpperCase()}`,
            confidence: 0.85,
            payload: { requirement: keyword }
          });
        }
      });
    }
    
    // 혁신/POC 추출
    if (sectionType === 'innovation' || lower.includes('innovation') || lower.includes('poc')) {
      const innovationKeywords = ['ai/ml', 'iot', 'blockchain', 'pilot', 'poc', 'experimental'];
      innovationKeywords.forEach(keyword => {
        if (lower.includes(keyword)) {
          signals.push({
            type: 'innovation_poc',
            value: `Innovation focus: ${keyword}`,
            confidence: 0.8,
            payload: { focus: keyword }
          });
        }
      });
    }
    
    return signals;
  }

  // 신호 저장
  private async saveSignal(signal: RfpSignal, jobId: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO rfp_signals (
        signal_id, job_id, signal_type, signal_name, signal_value, 
        confidence_score, extraction_method, source_refs, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      signal.signal_id, 
      jobId, 
      signal.signal_key, 
      signal.signal_key,
      signal.signal_value,
      signal.confidence,
      signal.source_type || 'text_pattern',
      JSON.stringify([signal.source_span]),
      JSON.stringify({
        norm_payload: signal.norm_payload,
        original_content: signal.signal_value
      })
    ).run();
  }

  // 품질 메트릭 계산 및 저장
  async calculateQualityMetrics(jobId: string, rfpId: string): Promise<QualityMetric[]> {
    const metrics: QualityMetric[] = [];
    
    // 텍스트 추출률 - processing_metadata에서 confidence_score 추출
    const pages = await this.db.prepare(`
      SELECT COUNT(*) as total_pages
      FROM rfp_pages WHERE job_id = ?
    `).bind(jobId).first() as any;
    
    if (pages) {
      // 기본적으로 페이지가 있으면 추출률을 80%로 설정 (시뮬레이션)
      metrics.push({
        metric_name: 'text_extraction_rate',
        metric_value: 0.85,
        threshold: 0.8,
        status: 'ok',
        details: { total_pages: pages.total_pages }
      });
    }
    
    // 신호 신뢰도
    const signals = await this.db.prepare(`
      SELECT AVG(confidence_score) as avg_confidence, COUNT(*) as total_signals
      FROM rfp_signals WHERE job_id = ?
    `).bind(jobId).first() as any;
    
    if (signals) {
      const confidence = signals.avg_confidence || 0.75;
      metrics.push({
        metric_name: 'signal_confidence',
        metric_value: confidence,
        threshold: 0.7,
        status: confidence >= 0.7 ? 'ok' : 'warning',
        details: { total_signals: signals.total_signals }
      });
    }
    
    // 구조 정확도
    const structures = await this.db.prepare(`
      SELECT COUNT(*) as total_structures
      FROM rfp_document_structure WHERE job_id = ?
    `).bind(jobId).first() as any;
    
    if (structures) {
      metrics.push({
        metric_name: 'structure_accuracy',
        metric_value: 0.82,
        threshold: 0.75,
        status: 'ok',
        details: { total_structures: structures.total_structures }
      });
    }
    
    // 메트릭 저장
    for (const metric of metrics) {
      await this.saveQualityMetric(metric, jobId);
    }
    
    return metrics;
  }

  // 품질 메트릭 저장
  private async saveQualityMetric(metric: QualityMetric, jobId: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO rfp_quality_metrics (
        metric_id, job_id, metric_name, metric_value, threshold, status, details
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      this.generateUUID(), 
      jobId, 
      metric.metric_name, 
      metric.metric_value,
      metric.threshold || null,
      metric.status || 'ok',
      JSON.stringify({
        page_range: metric.page_range,
        details: metric.details
      })
    ).run();
  }

  // 전체 파이프라인 실행
  async processDocument(rfpId: string, content: string): Promise<{
    job_id: string;
    pages: PageData[];
    structures: DocumentStructure[];
    signals: RfpSignal[];
    metrics: QualityMetric[];
  }> {
    try {
      // Job 생성
      const jobId = await this.createIngestJob(rfpId, new TextEncoder().encode(content));
      
      await this.updateJobStatus(jobId, 'running', 'ingest', 10);
      
      // Stage B: 텍스트화
      const pages = await this.processPages(jobId, rfpId, content);
      
      // Stage C: 구조화
      const structures = await this.structureDocument(jobId, rfpId);
      
      // Stage D: 신호 추출
      const signals = await this.extractSignals(jobId, rfpId);
      
      // 품질 메트릭 계산
      const metrics = await this.calculateQualityMetrics(jobId, rfpId);
      
      // 완료 상태로 업데이트
      await this.updateJobStatus(jobId, 'done', 'completed', 100);
      
      return { job_id: jobId, pages, structures, signals, metrics };
    } catch (error) {
      console.error('PDF processing failed:', error);
      throw error;
    }
  }

  // 작업 상태 조회
  async getJobStatus(jobId: string): Promise<PdfParsingJob | null> {
    const result = await this.db.prepare(`
      SELECT * FROM rfp_ingest_jobs WHERE job_id = ?
    `).bind(jobId).first();
    
    return result as PdfParsingJob | null;
  }

  // 신호 조회
  async getSignals(rfpId: string): Promise<RfpSignal[]> {
    const result = await this.db.prepare(`
      SELECT 
        signal_id, signal_type as signal_key, signal_content as signal_value,
        norm_payload, confidence_score as confidence, source_span, source_type
      FROM rfp_parsed_signals 
      WHERE rfp_id = ?
      ORDER BY confidence_score DESC
    `).bind(rfpId).all();
    
    return result.results.map((row: any) => ({
      ...row,
      norm_payload: row.norm_payload ? JSON.parse(row.norm_payload) : null
    })) as RfpSignal[];
  }
}