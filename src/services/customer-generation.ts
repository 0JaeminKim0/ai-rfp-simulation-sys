// AI 가상고객 생성 서비스 - 딥리서치 + RFP 결합으로 30속성 페르소나 생성

import type { 
  DeepResearchData, 
  RfpAnalysisData, 
  AIVirtualCustomer, 
  CombinedAttributes 
} from '../types/ai-customer'

export class CustomerGenerationService {
  
  /**
   * 딥리서치 + RFP 데이터를 결합하여 AI 가상고객 생성
   */
  async generateVirtualCustomer(
    deepResearchData: DeepResearchData,
    rfpAnalysisData: RfpAnalysisData,
    companyName: string,
    department?: string
  ): Promise<Omit<AIVirtualCustomer, 'id' | 'created_at' | 'updated_at'>> {
    
    // 1. 30속성 통합 분석
    const combinedAttributes = await this.combineAttributes(deepResearchData, rfpAnalysisData)
    
    // 2. 페르소나 카드 생성
    const personaCard = await this.generatePersonaCard(
      combinedAttributes, 
      companyName, 
      department
    )
    
    // 3. 의사결정 스타일 분석
    const decisionMakingStyle = await this.analyzeDecisionMakingStyle(
      deepResearchData, 
      rfpAnalysisData
    )
    
    return {
      name: this.generatePersonaName(companyName, department),
      company_name: companyName,
      department: department || '경영진',
      version: 'v1.0',
      status: 'active',
      
      persona_summary: personaCard.summary,
      top3_priorities: personaCard.priorities,
      decision_making_style: decisionMakingStyle,
      
      deep_research_data: deepResearchData,
      rfp_analysis_data: rfpAnalysisData,
      combined_attributes: combinedAttributes
    }
  }

  /**
   * 딥리서치 15속성 + RFP 15속성 → 30속성 통합 분석
   */
  private async combineAttributes(
    deepResearch: DeepResearchData,
    rfpAnalysis: RfpAnalysisData
  ): Promise<CombinedAttributes> {
    
    // LLM을 활용한 속성 결합 및 새로운 인사이트 도출
    const prompt = this.buildCombinationPrompt(deepResearch, rfpAnalysis)
    
    // 시뮬레이션 결과 (실제로는 LLM API 호출)
    return {
      strategic_focus: this.deriveStrategicFocus(deepResearch, rfpAnalysis),
      risk_appetite: this.deriveRiskAppetite(deepResearch, rfpAnalysis),
      innovation_preference: this.deriveInnovationPreference(deepResearch, rfpAnalysis),
      budget_sensitivity: this.deriveBudgetSensitivity(deepResearch, rfpAnalysis),
      timeline_priority: this.deriveTimelinePriority(deepResearch, rfpAnalysis),
      quality_standards: this.deriveQualityStandards(deepResearch, rfpAnalysis),
      compliance_requirements: this.deriveComplianceRequirements(deepResearch, rfpAnalysis),
      stakeholder_priorities: this.deriveStakeholderPriorities(deepResearch, rfpAnalysis),
      technology_adoption: this.deriveTechnologyAdoption(deepResearch, rfpAnalysis),
      partnership_approach: this.derivePartnershipApproach(deepResearch, rfpAnalysis)
    }
  }

  /**
   * 페르소나 카드 생성 (한 줄 요약 + Top3 우선순위)
   */
  private async generatePersonaCard(
    attributes: CombinedAttributes,
    companyName: string,
    department?: string
  ): Promise<{
    summary: string;
    priorities: string[];
  }> {
    
    const summary = `${companyName} ${department || '경영진'}의 ${attributes.strategic_focus} 중심, ${attributes.risk_appetite} 성향의 의사결정자`
    
    const priorities = [
      this.extractTopPriority(attributes, 'primary'),
      this.extractTopPriority(attributes, 'secondary'), 
      this.extractTopPriority(attributes, 'tertiary')
    ]
    
    return { summary, priorities }
  }

  /**
   * 의사결정 스타일 분석
   */
  private async analyzeDecisionMakingStyle(
    deepResearch: DeepResearchData,
    rfpAnalysis: RfpAnalysisData
  ): Promise<string> {
    
    // 기업 문화와 RFP 특성을 바탕으로 의사결정 스타일 도출
    const culturalStyle = this.analyzeCulturalStyle(deepResearch)
    const projectStyle = this.analyzeProjectStyle(rfpAnalysis)
    
    return this.synthesizeDecisionStyle(culturalStyle, projectStyle)
  }

  // === 개별 속성 도출 메서드들 ===

  private deriveStrategicFocus(deepResearch: DeepResearchData, rfpAnalysis: RfpAnalysisData): string {
    // 비전·미션 + 프로젝트 목표를 결합하여 전략적 포커스 도출
    const vision = deepResearch[1]?.content || ''
    const projectGoals = rfpAnalysis[4]?.content || ''
    
    if (vision.includes('혁신') || projectGoals.includes('AI')) {
      return '기술혁신 우선'
    } else if (vision.includes('고객') || projectGoals.includes('서비스')) {
      return '고객가치 중심'
    } else if (vision.includes('효율') || projectGoals.includes('비용')) {
      return '운영효율성 중심'
    } else {
      return '균형적 성장'
    }
  }

  private deriveRiskAppetite(deepResearch: DeepResearchData, rfpAnalysis: RfpAnalysisData): string {
    // 리스크 관리 태도 + 프로젝트 조건을 결합
    const riskManagement = deepResearch[7]?.content || ''
    const riskConditions = rfpAnalysis[12]?.content || ''
    
    if (riskManagement.includes('보수적') || riskConditions.includes('페널티')) {
      return '위험회피형'
    } else if (riskManagement.includes('적극적') || riskConditions.includes('혁신')) {
      return '위험추구형'
    } else {
      return '위험중립형'
    }
  }

  private deriveInnovationPreference(deepResearch: DeepResearchData, rfpAnalysis: RfpAnalysisData): string {
    // R&D 지향성 + 기술요건을 결합
    const rdOrientation = deepResearch[5]?.content || ''
    const techRequirements = rfpAnalysis[13]?.content || ''
    
    if (rdOrientation.includes('선도') || techRequirements.includes('최신')) {
      return '선도기술 선호'
    } else if (rdOrientation.includes('안정') || techRequirements.includes('검증')) {
      return '검증기술 선호'
    } else {
      return '실용기술 선호'
    }
  }

  private deriveBudgetSensitivity(deepResearch: DeepResearchData, rfpAnalysis: RfpAnalysisData): string {
    // 재무 전략 + 프로젝트 예산을 결합
    const financialStrategy = deepResearch[4]?.content || ''
    const budget = rfpAnalysis[7]?.content || ''
    
    if (financialStrategy.includes('절감') || budget.includes('효율')) {
      return '비용민감형'
    } else if (financialStrategy.includes('투자') || budget.includes('충분')) {
      return '투자적극형'
    } else {
      return '예산균형형'
    }
  }

  private deriveTimelinePriority(deepResearch: DeepResearchData, rfpAnalysis: RfpAnalysisData): string {
    // 목표 균형 + 프로젝트 기간을 결합
    const goalBalance = deepResearch[15]?.content || ''
    const timeline = rfpAnalysis[6]?.content || ''
    
    if (goalBalance.includes('단기') || timeline.includes('긴급')) {
      return '단기성과 중시'
    } else if (goalBalance.includes('장기') || timeline.includes('단계적')) {
      return '장기안정 중시'
    } else {
      return '적절한 속도'
    }
  }

  private deriveQualityStandards(deepResearch: DeepResearchData, rfpAnalysis: RfpAnalysisData): string {
    // ESG 우선순위 + 요구 산출물을 결합
    const esgPriority = deepResearch[6]?.content || ''
    const deliverables = rfpAnalysis[9]?.content || ''
    
    if (esgPriority.includes('최고') || deliverables.includes('상세')) {
      return '최고품질 추구'
    } else if (esgPriority.includes('표준') || deliverables.includes('기본')) {
      return '표준품질 지향'
    } else {
      return '실용품질 중심'
    }
  }

  private deriveComplianceRequirements(deepResearch: DeepResearchData, rfpAnalysis: RfpAnalysisData): string {
    // 규제 대응 + 준수사항을 결합
    const compliance = deepResearch[13]?.content || ''
    const requirements = rfpAnalysis[11]?.content || ''
    
    if (compliance.includes('엄격') || requirements.includes('법규')) {
      return '높은 규제준수'
    } else if (compliance.includes('기본') || requirements.includes('표준')) {
      return '표준 규제준수'
    } else {
      return '최소 규제준수'
    }
  }

  private deriveStakeholderPriorities(deepResearch: DeepResearchData, rfpAnalysis: RfpAnalysisData): string {
    // 이해관계자 성향 + 평가기준을 결합
    const stakeholders = deepResearch[9]?.content || ''
    const evaluation = rfpAnalysis[8]?.content || ''
    
    if (stakeholders.includes('고객') || evaluation.includes('사용자')) {
      return '고객우선주의'
    } else if (stakeholders.includes('주주') || evaluation.includes('수익')) {
      return '주주가치 중심'
    } else {
      return '균형적 접근'
    }
  }

  private deriveTechnologyAdoption(deepResearch: DeepResearchData, rfpAnalysis: RfpAnalysisData): string {
    // 디지털 전환 + 필수 역량을 결합
    const digitalTransformation = deepResearch[10]?.content || ''
    const capabilities = rfpAnalysis[13]?.content || ''
    
    if (digitalTransformation.includes('선도') || capabilities.includes('AI')) {
      return '기술선도형'
    } else if (digitalTransformation.includes('추격') || capabilities.includes('클라우드')) {
      return '기술추격형'
    } else {
      return '기술실용형'
    }
  }

  private derivePartnershipApproach(deepResearch: DeepResearchData, rfpAnalysis: RfpAnalysisData): string {
    // 생태계 전략 + 입찰사 요건을 결합
    const ecosystem = deepResearch[12]?.content || ''
    const bidderRequirements = rfpAnalysis[10]?.content || ''
    
    if (ecosystem.includes('개방') || bidderRequirements.includes('협력')) {
      return '개방형 협력'
    } else if (ecosystem.includes('선별') || bidderRequirements.includes('실적')) {
      return '선별적 협력'
    } else {
      return '전략적 협력'
    }
  }

  // === 유틸리티 메서드들 ===

  private generatePersonaName(companyName: string, department?: string): string {
    const deptSuffix = department ? `_${department}` : '_Executive'
    const timestamp = Date.now().toString().slice(-4)
    return `AI_${companyName}${deptSuffix}_${timestamp}`
  }

  private extractTopPriority(attributes: CombinedAttributes, level: 'primary' | 'secondary' | 'tertiary'): string {
    const priorities = [
      `전략적 포커스: ${attributes.strategic_focus}`,
      `혁신 선호도: ${attributes.innovation_preference}`,
      `품질 기준: ${attributes.quality_standards}`,
      `기술 도입: ${attributes.technology_adoption}`,
      `파트너십: ${attributes.partnership_approach}`
    ]
    
    const index = { primary: 0, secondary: 1, tertiary: 2 }[level]
    return priorities[index] || priorities[0]
  }

  private buildCombinationPrompt(deepResearch: DeepResearchData, rfpAnalysis: RfpAnalysisData): string {
    return `
AI 가상고객 생성을 위한 30속성 통합 분석

딥리서치 데이터 (15속성):
${Object.values(deepResearch).map(attr => `- ${attr.name}: ${attr.content}`).join('\n')}

RFP 분석 데이터 (15속성):
${Object.values(rfpAnalysis).map(attr => `- ${attr.name}: ${attr.content}`).join('\n')}

요청사항:
1. 두 데이터셋을 종합하여 통일된 가상고객 프로필 생성
2. 전략적 성향, 의사결정 패턴, 우선순위 도출
3. 제안 평가 시 중요하게 여길 요소들 예측
4. 일관된 페르소나 특성 보장

출력: 30개 통합 속성으로 구성된 AI 가상고객 프로필
    `
  }

  private analyzeCulturalStyle(deepResearch: DeepResearchData): string {
    // 조직문화 + 리더십 스타일 분석
    const culture = deepResearch[11]?.content || ''
    if (culture.includes('수직') || culture.includes('위계')) {
      return '하향식'
    } else if (culture.includes('수평') || culture.includes('협력')) {
      return '협업식'
    } else {
      return '혼합식'
    }
  }

  private analyzeProjectStyle(rfpAnalysis: RfpAnalysisData): string {
    // 프로젝트 특성 + 평가 방식 분석
    const evaluation = rfpAnalysis[8]?.content || ''
    if (evaluation.includes('기술') && evaluation.includes('70')) {
      return '기술중심형'
    } else if (evaluation.includes('가격') && evaluation.includes('50')) {
      return '비용중심형'
    } else {
      return '균형형'
    }
  }

  private synthesizeDecisionStyle(culturalStyle: string, projectStyle: string): string {
    const combinations: Record<string, Record<string, string>> = {
      '하향식': {
        '기술중심형': '신중한 기술 검토 후 탑다운 결정',
        '비용중심형': '예산 효율성 우선 위계적 결정',
        '균형형': '종합적 검토 후 경영진 최종 결정'
      },
      '협업식': {
        '기술중심형': '기술팀 의견 수렴 후 합의적 결정',
        '비용중심형': '부서 간 협의를 통한 비용 최적화',
        '균형형': '다면적 검토와 관련자 합의 중시'
      },
      '혼합식': {
        '기술중심형': '기술 전문성과 경영 판단의 조화',
        '비용중심형': '효율성과 전략성의 균형 추구',
        '균형형': '상황별 적응적 의사결정 스타일'
      }
    }
    
    return combinations[culturalStyle]?.[projectStyle] || '데이터 기반 합리적 결정'
  }
}