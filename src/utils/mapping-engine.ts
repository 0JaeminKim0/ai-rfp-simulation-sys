// RFP 신호 → 페르소나 17필드 자동 조정 매핑 엔진

import type { Bindings, ExecutivePersona } from '../types'
import type { RfpSignal } from './pdf-parser'

export interface ImpactRule {
  rule_id: string;
  rule_name: string;
  persona_field: string;
  rfp_signal_key: string;
  match_type: 'exact' | 'includes' | 'regex' | 'threshold' | 'semantic';
  match_pattern?: string;
  transform_type: 'set' | 'append' | 'merge' | 'scale' | 'boost_weight' | 'set_threshold';
  transform_payload?: any;
  impact_strength: number;
  precedence: number;
  source_priority: number;
  enabled: boolean;
}

export interface PersonaState {
  // 17개 기본 필드 + 확장 상태
  persona: ExecutivePersona;
  // 동적 상태 (가중치, 임계값, 포커스 키워드)
  weights: {
    clarity: number;
    expertise: number;
    persuasion: number;
    logic: number;
    creativity: number;
    reliability: number;
  };
  thresholds: {
    min_clarity: number;
    min_expertise: number;
    min_persuasion: number;
    min_logic: number;
    min_creativity: number;
    min_reliability: number;
  };
  focus_keywords: {
    boost_keywords: string[];
    penalty_keywords: string[];
  };
}

export interface StateAdjustment {
  persona_id: string;
  field_name: string;
  original_value: any;
  adjusted_value: any;
  adjustment_reason: string;
  confidence_score: number;
}

export class PersonaMappingEngine {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  private generateUUID(): string {
    return crypto.randomUUID();
  }

  // ========================================
  // 1. 규칙 관리
  // ========================================

  // 기본 규칙 시드 데이터 생성
  async seedDefaultRules(): Promise<void> {
    const defaultRules: Omit<ImpactRule, 'rule_id'>[] = [
      // 평가 기준 기반 가중치 조정
      {
        rule_name: '기술 중심 평가 시 전문성 가중치 증가',
        persona_field: 'state.weights',
        rfp_signal_key: 'evaluation_criteria',
        match_type: 'threshold',
        match_pattern: 'tech>=0.35',
        transform_type: 'boost_weight',
        transform_payload: { metric: 'expertise', delta: 0.08, cap: 0.45 },
        impact_strength: 0.8,
        precedence: 10,
        source_priority: 2,
        enabled: true
      },
      {
        rule_name: '가격 중심 평가 시 신뢰성 가중치 증가',
        persona_field: 'state.weights',
        rfp_signal_key: 'evaluation_criteria',
        match_type: 'threshold',
        match_pattern: 'price>=0.35',
        transform_type: 'boost_weight',
        transform_payload: { metric: 'reliability', delta: 0.06, cap: 0.4 },
        impact_strength: 0.7,
        precedence: 10,
        source_priority: 2,
        enabled: true
      },
      
      // KPI 기반 필드 조정
      {
        rule_name: 'R&D 투자 KPI 시 기술 전문성 증가',
        persona_field: 'technical_expertise',
        rfp_signal_key: 'kpis',
        match_type: 'includes',
        match_pattern: 'R&D|투자|연구개발',
        transform_type: 'scale',
        transform_payload: { factor: 1.2, max: 10 },
        impact_strength: 0.6,
        precedence: 20,
        source_priority: 3,
        enabled: true
      },
      {
        rule_name: '수익성 KPI 시 예산 권한 중시',
        persona_field: 'budget_authority',
        rfp_signal_key: 'kpis',
        match_type: 'includes',
        match_pattern: '수익|ROI|매출|이익',
        transform_type: 'scale',
        transform_payload: { factor: 1.1, max: 10 },
        impact_strength: 0.5,
        precedence: 20,
        source_priority: 3,
        enabled: true
      },
      
      // 기술 요구사항 기반 조정
      {
        rule_name: 'AI/ML 요구사항 시 기술 전문성 및 혁신성 증가',
        persona_field: 'technical_expertise',
        rfp_signal_key: 'technical_requirements',
        match_type: 'includes',
        match_pattern: 'AI|ML|인공지능|머신러닝',
        transform_type: 'scale',
        transform_payload: { factor: 1.3, max: 10 },
        impact_strength: 0.8,
        precedence: 5,
        source_priority: 1,
        enabled: true
      },
      {
        rule_name: 'AI/ML 요구사항 시 혁신 개방성 증가',
        persona_field: 'innovation_openness',
        rfp_signal_key: 'technical_requirements',
        match_type: 'includes',
        match_pattern: 'AI|ML|인공지능|머신러닝',
        transform_type: 'scale',
        transform_payload: { factor: 1.2, max: 10 },
        impact_strength: 0.7,
        precedence: 5,
        source_priority: 1,
        enabled: true
      },
      {
        rule_name: '보안 요구사항 시 신뢰성 가중치 증가',
        persona_field: 'state.weights',
        rfp_signal_key: 'technical_requirements',
        match_type: 'includes',
        match_pattern: '보안|Security|ISO27001',
        transform_type: 'boost_weight',
        transform_payload: { metric: 'reliability', delta: 0.05, cap: 0.35 },
        impact_strength: 0.6,
        precedence: 15,
        source_priority: 2,
        enabled: true
      },
      
      // 전략 테마 기반 조정
      {
        rule_name: 'ESG 전략 시 지속가능성 중시',
        persona_field: 'strategic_priority',
        rfp_signal_key: 'strategic_themes',
        match_type: 'includes',
        match_pattern: 'ESG|지속가능|환경|친환경',
        transform_type: 'append',
        transform_payload: { value: 'ESG 경영 강화' },
        impact_strength: 0.7,
        precedence: 25,
        source_priority: 3,
        enabled: true
      },
      {
        rule_name: '디지털 전환 전략 시 혁신성 중시',
        persona_field: 'innovation_openness',
        rfp_signal_key: 'strategic_themes',
        match_type: 'includes',
        match_pattern: 'DX|디지털|전환|Digital',
        transform_type: 'scale',
        transform_payload: { factor: 1.15, max: 10 },
        impact_strength: 0.6,
        precedence: 25,
        source_priority: 3,
        enabled: true
      },
      
      // 예산 규모 기반 조정
      {
        rule_name: '대규모 예산 시 의사결정 영향력 중시',
        persona_field: 'decision_influence',
        rfp_signal_key: 'budget_procurement',
        match_type: 'threshold',
        match_pattern: 'budget_amount>=5000000000', // 50억 이상
        transform_type: 'scale',
        transform_payload: { factor: 1.2, max: 10 },
        impact_strength: 0.5,
        precedence: 30,
        source_priority: 4,
        enabled: true
      },
      
      // 리스크 및 규제 기반 조정
      {
        rule_name: '엄격한 규제 환경 시 신뢰성 가중치 증가',
        persona_field: 'state.weights',
        rfp_signal_key: 'risk_compliance',
        match_type: 'includes',
        match_pattern: '개인정보|PII|GDPR|규제|Compliance',
        transform_type: 'boost_weight',
        transform_payload: { metric: 'reliability', delta: 0.07, cap: 0.4 },
        impact_strength: 0.8,
        precedence: 8,
        source_priority: 1,
        enabled: true
      },
      {
        rule_name: '리스크 관리 중요 시 위험 감수성 조정',
        persona_field: 'risk_tolerance',
        rfp_signal_key: 'risk_compliance',
        match_type: 'includes',
        match_pattern: '리스크|위험|Risk',
        transform_type: 'scale',
        transform_payload: { factor: 0.9, min: 1 }, // 리스크 중시 시 감수성 낮춤
        impact_strength: 0.6,
        precedence: 30,
        source_priority: 3,
        enabled: true
      }
    ];

    for (const rule of defaultRules) {
      await this.createRule(rule);
    }
  }

  // 규칙 생성
  async createRule(rule: Omit<ImpactRule, 'rule_id'>): Promise<string> {
    const ruleId = this.generateUUID();
    const now = new Date().toISOString();

    await this.db.prepare(`
      INSERT OR IGNORE INTO rfp_persona_impact_rules (
        rule_id, rule_name, persona_field, rfp_signal_key, match_type, match_pattern,
        transform_type, transform_payload, impact_strength, precedence, source_priority,
        enabled, description, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      ruleId, rule.rule_name, rule.persona_field, rule.rfp_signal_key, rule.match_type,
      rule.match_pattern, rule.transform_type, JSON.stringify(rule.transform_payload),
      rule.impact_strength, rule.precedence, rule.source_priority, rule.enabled,
      rule.rule_name, now, now
    ).run();

    return ruleId;
  }

  // 활성 규칙 조회
  async getActiveRules(): Promise<ImpactRule[]> {
    const result = await this.db.prepare(`
      SELECT * FROM rfp_persona_impact_rules 
      WHERE enabled = 1 
      ORDER BY precedence ASC, source_priority ASC
    `).all();

    return result.results.map((row: any) => ({
      ...row,
      transform_payload: row.transform_payload ? JSON.parse(row.transform_payload) : null,
      enabled: Boolean(row.enabled)
    })) as ImpactRule[];
  }

  // ========================================
  // 2. 페르소나 상태 관리
  // ========================================

  // 기본 상태 로드
  async loadPersonaState(personaId: string): Promise<PersonaState> {
    const persona = await this.db.prepare(`
      SELECT * FROM executive_personas_data WHERE id = ?
    `).bind(personaId).first() as ExecutivePersona;

    if (!persona) {
      throw new Error(`Persona not found: ${personaId}`);
    }

    // 기본 가중치 (균등 분배)
    const defaultWeights = {
      clarity: 1/6,
      expertise: 1/6,
      persuasion: 1/6,
      logic: 1/6,
      creativity: 1/6,
      reliability: 1/6
    };

    // 기본 임계값 (페르소나 특성에 따라 조정)
    const defaultThresholds = this.calculateDefaultThresholds(persona);

    // 기본 키워드 (페르소나 필드에서 추출)
    const defaultKeywords = this.extractPersonaKeywords(persona);

    return {
      persona,
      weights: defaultWeights,
      thresholds: defaultThresholds,
      focus_keywords: defaultKeywords
    };
  }

  // 기본 임계값 계산 (페르소나 특성 반영)
  private calculateDefaultThresholds(persona: ExecutivePersona): PersonaState['thresholds'] {
    const baseThreshold = 60; // 기본 60점
    
    return {
      min_clarity: baseThreshold + (persona.communication_style === '분석적' ? 5 : 0),
      min_expertise: baseThreshold + Math.floor((persona.technical_expertise - 5) * 2),
      min_persuasion: baseThreshold + Math.floor((persona.decision_influence - 5) * 2),
      min_logic: baseThreshold + (persona.team_dynamics === '수평적' ? 3 : 0),
      min_creativity: baseThreshold + Math.floor((persona.innovation_openness - 5) * 2),
      min_reliability: baseThreshold + Math.floor((persona.industry_experience - 15) * 0.5)
    };
  }

  // 페르소나 키워드 추출
  private extractPersonaKeywords(persona: ExecutivePersona): PersonaState['focus_keywords'] {
    const boostKeywords: string[] = [];
    const penaltyKeywords: string[] = [];

    // KPI 및 전략 우선순위에서 키워드 추출
    if (persona.kpi) {
      const kpiWords = persona.kpi.split(/[,\s]+/).filter(w => w.length > 2);
      boostKeywords.push(...kpiWords);
    }

    if (persona.strategic_priority) {
      const strategyWords = persona.strategic_priority.split(/[,\s]+/).filter(w => w.length > 2);
      boostKeywords.push(...strategyWords);
    }

    // 직급/회사에 따른 키워드
    if (persona.rank?.includes('CTO') || persona.rank?.includes('기술')) {
      boostKeywords.push('기술', '혁신', 'AI', '디지털');
      penaltyKeywords.push('단순', '기존방식');
    }

    if (persona.rank?.includes('CFO') || persona.rank?.includes('재무')) {
      boostKeywords.push('ROI', '비용', '효율', '수익');
      penaltyKeywords.push('고비용', '비효율');
    }

    return {
      boost_keywords: [...new Set(boostKeywords)], // 중복 제거
      penalty_keywords: [...new Set(penaltyKeywords)]
    };
  }

  // ========================================
  // 3. 신호 매칭 로직
  // ========================================

  // 신호와 규칙 매칭
  private matchSignalWithRule(signal: RfpSignal, rule: ImpactRule): boolean {
    if (signal.signal_key !== rule.rfp_signal_key) return false;

    switch (rule.match_type) {
      case 'exact':
        return signal.signal_value === rule.match_pattern;
      
      case 'includes':
        return rule.match_pattern 
          ? new RegExp(rule.match_pattern, 'i').test(signal.signal_value)
          : false;
      
      case 'regex':
        return rule.match_pattern 
          ? new RegExp(rule.match_pattern).test(signal.signal_value)
          : false;
      
      case 'threshold':
        return this.evaluateThresholdCondition(signal, rule.match_pattern);
      
      case 'semantic':
        return this.evaluateSemanticMatch(signal, rule.match_pattern);
      
      default:
        return false;
    }
  }

  // 임계값 조건 평가
  private evaluateThresholdCondition(signal: RfpSignal, pattern?: string): boolean {
    if (!pattern || !signal.norm_payload) return false;

    try {
      // 패턴: "tech>=0.35" 또는 "budget_amount>=5000000000"
      const match = pattern.match(/^(\w+)(>=|<=|>|<|==)(.+)$/);
      if (!match) return false;

      const [, field, operator, valueStr] = match;
      const targetValue = parseFloat(valueStr);
      const actualValue = signal.norm_payload[field];

      if (actualValue === undefined || actualValue === null) return false;

      switch (operator) {
        case '>=': return actualValue >= targetValue;
        case '<=': return actualValue <= targetValue;
        case '>': return actualValue > targetValue;
        case '<': return actualValue < targetValue;
        case '==': return actualValue === targetValue;
        default: return false;
      }
    } catch (error) {
      console.error('Threshold evaluation error:', error);
      return false;
    }
  }

  // 의미론적 매칭 (간단한 키워드 기반)
  private evaluateSemanticMatch(signal: RfpSignal, pattern?: string): boolean {
    if (!pattern) return false;

    // 간단한 의미론적 매칭 (실제로는 임베딩 벡터 사용 권장)
    const semanticGroups = {
      'technology': ['기술', '테크', 'AI', 'ML', '인공지능', '혁신', '디지털'],
      'finance': ['재무', '예산', '비용', '수익', 'ROI', '투자', '자금'],
      'quality': ['품질', '신뢰', '안정', '보안', '규제', '준수'],
      'strategy': ['전략', '방향', '목표', '비전', '계획', '로드맵']
    };

    const patternGroup = semanticGroups[pattern as keyof typeof semanticGroups];
    if (!patternGroup) return false;

    return patternGroup.some(keyword => 
      signal.signal_value.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  // ========================================
  // 4. 상태 변환 로직
  // ========================================

  // 변환 적용
  private applyTransform(
    state: PersonaState, 
    rule: ImpactRule, 
    effectiveStrength: number
  ): PersonaState {
    const newState = JSON.parse(JSON.stringify(state)); // 깊은 복사

    switch (rule.transform_type) {
      case 'set':
        this.applySetTransform(newState, rule, effectiveStrength);
        break;
      case 'append':
        this.applyAppendTransform(newState, rule, effectiveStrength);
        break;
      case 'scale':
        this.applyScaleTransform(newState, rule, effectiveStrength);
        break;
      case 'boost_weight':
        this.applyBoostWeightTransform(newState, rule, effectiveStrength);
        break;
      case 'set_threshold':
        this.applySetThresholdTransform(newState, rule, effectiveStrength);
        break;
    }

    return newState;
  }

  // 값 설정 변환
  private applySetTransform(state: PersonaState, rule: ImpactRule, strength: number): void {
    if (!rule.transform_payload?.value) return;

    const fieldPath = rule.persona_field.split('.');
    let target: any = state;

    // 중첩 필드 접근
    for (let i = 0; i < fieldPath.length - 1; i++) {
      if (!target[fieldPath[i]]) return;
      target = target[fieldPath[i]];
    }

    const finalField = fieldPath[fieldPath.length - 1];
    target[finalField] = rule.transform_payload.value;
  }

  // 값 추가 변환
  private applyAppendTransform(state: PersonaState, rule: ImpactRule, strength: number): void {
    if (!rule.transform_payload?.value) return;

    const fieldPath = rule.persona_field.split('.');
    let target: any = state;

    for (let i = 0; i < fieldPath.length - 1; i++) {
      if (!target[fieldPath[i]]) return;
      target = target[fieldPath[i]];
    }

    const finalField = fieldPath[fieldPath.length - 1];
    const currentValue = target[finalField] || '';
    
    if (typeof currentValue === 'string') {
      const newValue = rule.transform_payload.value;
      if (!currentValue.includes(newValue)) {
        target[finalField] = currentValue ? `${currentValue}, ${newValue}` : newValue;
      }
    }
  }

  // 스케일 변환 (숫자 필드)
  private applyScaleTransform(state: PersonaState, rule: ImpactRule, strength: number): void {
    const { factor, max, min } = rule.transform_payload || {};
    if (!factor) return;

    const fieldPath = rule.persona_field.split('.');
    let target: any = state;

    for (let i = 0; i < fieldPath.length - 1; i++) {
      if (!target[fieldPath[i]]) return;
      target = target[fieldPath[i]];
    }

    const finalField = fieldPath[fieldPath.length - 1];
    const currentValue = target[finalField];

    if (typeof currentValue === 'number') {
      let newValue = currentValue * (1 + (factor - 1) * strength);
      
      if (max !== undefined) newValue = Math.min(newValue, max);
      if (min !== undefined) newValue = Math.max(newValue, min);
      
      target[finalField] = Math.round(newValue * 100) / 100; // 소수점 2자리
    }
  }

  // 가중치 증가 변환
  private applyBoostWeightTransform(state: PersonaState, rule: ImpactRule, strength: number): void {
    const { metric, delta, cap } = rule.transform_payload || {};
    if (!metric || !delta) return;

    if (state.weights[metric] !== undefined) {
      const boost = delta * strength;
      const newWeight = Math.min(state.weights[metric] + boost, cap || 1.0);
      
      // 가중치 재정규화 (합계 = 1)
      const totalOtherWeights = Object.entries(state.weights)
        .filter(([k]) => k !== metric)
        .reduce((sum, [, v]) => sum + v, 0);
      
      const remainingWeight = 1.0 - newWeight;
      const scaleFactor = remainingWeight / totalOtherWeights;
      
      // 다른 가중치들을 비례적으로 조정
      for (const key in state.weights) {
        if (key === metric) {
          state.weights[key as keyof PersonaState['weights']] = newWeight;
        } else {
          state.weights[key as keyof PersonaState['weights']] *= scaleFactor;
        }
      }
    }
  }

  // 임계값 설정 변환
  private applySetThresholdTransform(state: PersonaState, rule: ImpactRule, strength: number): void {
    const { metric, value } = rule.transform_payload || {};
    if (!metric || !value) return;

    const thresholdKey = `min_${metric}` as keyof PersonaState['thresholds'];
    if (state.thresholds[thresholdKey] !== undefined) {
      const adjustment = (value - state.thresholds[thresholdKey]) * strength;
      state.thresholds[thresholdKey] = Math.max(0, Math.min(100, 
        state.thresholds[thresholdKey] + adjustment
      ));
    }
  }

  // ========================================
  // 5. 메인 매핑 프로세스
  // ========================================

  // 페르소나 상태 자동 조정
  async adjustPersonaState(
    personaId: string, 
    rfpId: string, 
    signals: RfpSignal[]
  ): Promise<StateAdjustment[]> {
    // 현재 상태 로드
    const originalState = await this.loadPersonaState(personaId);
    let currentState = JSON.parse(JSON.stringify(originalState));
    
    // 활성 규칙 조회
    const rules = await this.getActiveRules();
    
    const adjustments: StateAdjustment[] = [];
    
    // 각 신호에 대해 규칙 적용
    for (const signal of signals) {
      for (const rule of rules) {
        if (this.matchSignalWithRule(signal, rule)) {
          // 효과적 강도 계산
          const effectiveStrength = this.calculateEffectiveStrength(
            signal, rule, currentState
          );
          
          if (effectiveStrength > 0.01) { // 최소 임계값
            const beforeValue = this.getFieldValue(currentState, rule.persona_field);
            
            // 변환 적용
            currentState = this.applyTransform(currentState, rule, effectiveStrength);
            
            const afterValue = this.getFieldValue(currentState, rule.persona_field);
            
            // 변경사항이 있으면 기록
            if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
              adjustments.push({
                persona_id: personaId,
                field_name: rule.persona_field,
                original_value: beforeValue,
                adjusted_value: afterValue,
                adjustment_reason: `${rule.rule_name} (신호: ${signal.signal_key})`,
                confidence_score: signal.confidence * rule.impact_strength
              });
            }
          }
        }
      }
    }
    
    // 상태 정규화
    this.normalizeState(currentState);
    
    // 실제 페르소나 필드 업데이트
    await this.updatePersonaFields(personaId, currentState);
    
    // 조정 이력 저장
    for (const adjustment of adjustments) {
      await this.saveStateAdjustment(adjustment, rfpId);
    }
    
    return adjustments;
  }

  // 효과적 강도 계산
  private calculateEffectiveStrength(
    signal: RfpSignal, 
    rule: ImpactRule, 
    state: PersonaState
  ): number {
    let strength = rule.impact_strength * signal.confidence;
    
    // 소스 우선순위에 따른 가중치
    const sourcePriorityWeights = { 1: 1.0, 2: 0.9, 3: 0.8, 4: 0.7, 5: 0.6 };
    const sourceWeight = sourcePriorityWeights[rule.source_priority as keyof typeof sourcePriorityWeights] || 0.5;
    
    strength *= sourceWeight;
    
    // 신뢰도 게이팅
    if (signal.confidence < 0.6) {
      strength *= 0.5; // 낮은 신뢰도 시 영향력 감소
    }
    
    return Math.min(1.0, strength);
  }

  // 필드 값 조회
  private getFieldValue(state: PersonaState, fieldPath: string): any {
    const path = fieldPath.split('.');
    let current: any = state;
    
    for (const segment of path) {
      if (current && typeof current === 'object' && segment in current) {
        current = current[segment];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  // 상태 정규화
  private normalizeState(state: PersonaState): void {
    // 가중치 합계를 1로 정규화
    const weightSum = Object.values(state.weights).reduce((sum, w) => sum + w, 0);
    if (weightSum > 0) {
      for (const key in state.weights) {
        state.weights[key as keyof PersonaState['weights']] /= weightSum;
      }
    }
    
    // 임계값 범위 제한 (0-100)
    for (const key in state.thresholds) {
      const thresholdKey = key as keyof PersonaState['thresholds'];
      state.thresholds[thresholdKey] = Math.max(0, Math.min(100, state.thresholds[thresholdKey]));
    }
    
    // 페르소나 필드 값 범위 제한
    if (state.persona.technical_expertise) {
      state.persona.technical_expertise = Math.max(1, Math.min(10, state.persona.technical_expertise));
    }
    if (state.persona.budget_authority) {
      state.persona.budget_authority = Math.max(1, Math.min(10, state.persona.budget_authority));
    }
    if (state.persona.decision_influence) {
      state.persona.decision_influence = Math.max(1, Math.min(10, state.persona.decision_influence));
    }
    if (state.persona.risk_tolerance) {
      state.persona.risk_tolerance = Math.max(1, Math.min(10, state.persona.risk_tolerance));
    }
    if (state.persona.innovation_openness) {
      state.persona.innovation_openness = Math.max(1, Math.min(10, state.persona.innovation_openness));
    }
  }

  // 페르소나 필드 업데이트
  private async updatePersonaFields(personaId: string, state: PersonaState): Promise<void> {
    const now = new Date().toISOString();
    
    await this.db.prepare(`
      UPDATE executive_personas_data 
      SET 
        kpi = ?, evaluation_focus = ?, strategic_priority = ?,
        technical_expertise = ?, budget_authority = ?, decision_influence = ?,
        risk_tolerance = ?, innovation_openness = ?,
        updated_at = ?
      WHERE id = ?
    `).bind(
      state.persona.kpi, state.persona.evaluation_focus, state.persona.strategic_priority,
      state.persona.technical_expertise, state.persona.budget_authority, state.persona.decision_influence,
      state.persona.risk_tolerance, state.persona.innovation_openness,
      now, personaId
    ).run();
  }

  // 조정 이력 저장
  private async saveStateAdjustment(adjustment: StateAdjustment, rfpId: string): Promise<void> {
    const now = new Date().toISOString();
    
    await this.db.prepare(`
      INSERT INTO persona_state_snapshots (
        snapshot_id, persona_id, rfp_id, field_name, original_value, 
        adjusted_value, adjustment_reason, confidence_score, applied_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      this.generateUUID(), adjustment.persona_id, rfpId, adjustment.field_name,
      JSON.stringify(adjustment.original_value), JSON.stringify(adjustment.adjusted_value),
      adjustment.adjustment_reason, adjustment.confidence_score, now
    ).run();
  }

  // RFP에 대한 모든 페르소나 조정
  async adjustAllPersonasForRfp(rfpId: string, signals: RfpSignal[]): Promise<{
    total_personas: number;
    adjustments: StateAdjustment[];
  }> {
    // 모든 활성 페르소나 조회
    const personas = await this.db.prepare(`
      SELECT id FROM executive_personas_data
    `).all();

    const allAdjustments: StateAdjustment[] = [];
    
    for (const persona of personas.results as any[]) {
      const personaAdjustments = await this.adjustPersonaState(
        persona.id, rfpId, signals
      );
      allAdjustments.push(...personaAdjustments);
    }
    
    return {
      total_personas: personas.results.length,
      adjustments: allAdjustments
    };
  }

  // 조정 이력 조회
  async getAdjustmentHistory(rfpId: string, personaId?: string): Promise<StateAdjustment[]> {
    let query = `
      SELECT 
        persona_id, field_name, original_value, adjusted_value, 
        adjustment_reason, confidence_score, applied_at
      FROM persona_state_snapshots 
      WHERE rfp_id = ?
    `;
    const params: any[] = [rfpId];
    
    if (personaId) {
      query += ` AND persona_id = ?`;
      params.push(personaId);
    }
    
    query += ` ORDER BY applied_at DESC`;
    
    const result = await this.db.prepare(query).bind(...params).all();
    
    return result.results.map((row: any) => ({
      persona_id: row.persona_id,
      field_name: row.field_name,
      original_value: JSON.parse(row.original_value),
      adjusted_value: JSON.parse(row.adjusted_value),
      adjustment_reason: row.adjustment_reason,
      confidence_score: row.confidence_score
    })) as StateAdjustment[];
  }
}