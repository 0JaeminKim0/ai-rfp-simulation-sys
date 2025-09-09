// 평가 서비스 - 6대 지표 루브릭 기반 LLM 평가

import type { 
  AIVirtualCustomer, 
  ProposalEvaluation, 
  PresentationEvaluation, 
  IntegratedEvaluation,
  EvaluationScores,
  MetricScore 
} from '../types/ai-customer'

export class EvaluationService {
  
  // 6대 지표 루브릭 앵커 정의 (60-100점)
  private readonly RUBRIC_ANCHORS = {
    clarity: {
      1: "목적·범위·효과가 모호하거나 누락, 핵심 전달 실패",
      2: "일부 명확하나 전체적으로 불분명, 구조가 흐트러짐",
      3: "기본 흐름은 명확하나 세부 설명 부족, 중복/모호 표현 존재", 
      4: "목적·범위·효과가 잘 드러나고, 전체 구조가 이해 가능",
      5: "모든 메시지가 직관적으로 명확, 구조적·간결하며 완결성 확보"
    },
    expertise: {
      1: "업계/기술 근거 전혀 없음, 피상적 주장",
      2: "일부 용어나 개념만 언급, 최신성·정확성 부족", 
      3: "기본적인 전문 지식·사례는 있으나 깊이가 부족",
      4: "업계 표준·최신 트렌드·레퍼런스를 적절히 활용",
      5: "최신 기술·글로벌 레퍼런스 풍부, 깊이와 폭 모두 뛰어남"
    },
    persuasiveness: {
      1: "주장만 있고 근거·사례 없음, 고객 요구와 불일치",
      2: "제한된 근거 제시, 설득력 약함",
      3: "근거는 있으나 고객 Pain Point와 연결성이 약함",
      4: "데이터·사례를 통해 고객 요구와 논리적으로 연결", 
      5: "강력한 데이터·사례·스토리텔링으로 고객 확신 유발"
    },
    logic: {
      1: "구조 없음, 아이디어가 단절·모순적",
      2: "부분적 논리만 존재, 전개 과정에서 비약·누락 발생",
      3: "기본 구조(문제→목표→해결책)는 있으나 불완전",
      4: "일관된 논리 전개, 단계별 근거 설명 충실",
      5: "매우 체계적, 모든 단계가 명확히 연결, 모순·비약 없음"
    },
    creativity: {
      1: "기존 접근법 반복, 차별성 전혀 없음", 
      2: "소폭 차별화 있으나 기존과 유사, 참신성 낮음",
      3: "기본적인 차별화는 있으나 독창성 부족",
      4: "새로운 아이디어나 방법론 제시, 실행 가능성 확보",
      5: "혁신적이고 차별적인 아이디어, 고객 맥락에 최적화"
    },
    credibility: {
      1: "실행 가능성 전혀 없음, 레퍼런스 부재",
      2: "제한적 실행 가능성, 근거 부족",
      3: "일부 실행 근거 제시, 보완 필요", 
      4: "유사 프로젝트 경험·리스크 관리·규제 준수 근거 제시",
      5: "실행력 완벽 검증, 풍부한 레퍼런스와 리스크 대비책 확보"
    }
  }

  // 6대 지표 정의
  private readonly METRIC_DEFINITIONS = {
    clarity: "제안서/발표의 목적, 범위, 기대효과가 불분명하지 않고 직관적으로 전달되는가? 문장이 간결하며 중복·모호한 표현이 없는가? 구조(서론–본론–결론)가 논리적으로 구분되는가?",
    expertise: "제안서/발표 내용이 해당 산업·기술 분야의 특수성을 충분히 반영하는가? 최신 기술·업계 트렌드, 레퍼런스, 실적이 포함되어 있는가? 제안자가 전문 지식과 경험을 보유하고 있음을 드러내는가?",
    persuasiveness: "제안서/발표가 고객의 Pain Point와 요구사항을 직접적으로 해결하는 근거를 제시하는가? 데이터, 사례, 증거가 주장을 뒷받침하는가? 청중(고객)에게 '이 제안이 우리에게 꼭 필요하다'는 확신을 주는가?",
    logic: "문제 정의 → 목표 → 방법론 → 기대효과로 이어지는 흐름이 일관성 있게 연결되는가? 제안 항목 간 비약, 모순, 불일치가 없는가? 단계별 근거가 충분히 설명되어 있는가?",
    creativity: "기존 솔루션과 차별화된 새로운 아이디어, 접근법을 제시하는가? 제안이 고객사의 상황과 맥락에 맞춰 독창적으로 설계되었는가? 단순 반복이 아닌 혁신적 시각을 담고 있는가?",
    credibility: "제안서/발표가 실행 가능성을 뒷받침하는 근거를 충분히 제시하는가? 유사 프로젝트 레퍼런스, 검증된 방법론, 리스크 관리 계획이 포함되어 있는가? 규제·법규 준수, 윤리적·투명한 실행 방안이 드러나는가?"
  }

  /**
   * 제안서 평가 (LLM 기반 6대 지표 채점)
   */
  async evaluateProposal(
    customer: AIVirtualCustomer,
    proposalTitle: string,
    proposalContent: string
  ): Promise<Omit<ProposalEvaluation, 'id' | 'evaluation_date'>> {
    
    // 고객 관점 평가 프롬프트 구성
    const evaluationPrompt = this.buildProposalEvaluationPrompt(
      customer,
      proposalContent
    )
    
    // LLM을 통한 6대 지표 평가 (실제로는 LLM API 호출)
    const evaluationResult = await this.callLLMForEvaluation(
      evaluationPrompt,
      'proposal'
    )
    
    // 점수 및 코멘트 구조화
    const scores: EvaluationScores = {
      clarity: {
        score: evaluationResult.clarity_score,
        comment: evaluationResult.clarity_comment
      },
      expertise: {
        score: evaluationResult.expertise_score, 
        comment: evaluationResult.expertise_comment
      },
      persuasiveness: {
        score: evaluationResult.persuasiveness_score,
        comment: evaluationResult.persuasiveness_comment
      },
      logic: {
        score: evaluationResult.logic_score,
        comment: evaluationResult.logic_comment
      },
      creativity: {
        score: evaluationResult.creativity_score,
        comment: evaluationResult.creativity_comment
      },
      credibility: {
        score: evaluationResult.credibility_score,
        comment: evaluationResult.credibility_comment
      }
    }

    const totalScore = Object.values(scores).reduce((sum, metric) => sum + metric.score, 0) / 6

    return {
      customer_id: customer.id,
      proposal_title: proposalTitle,
      proposal_file_path: '', // 실제로는 업로드된 파일 경로
      scores,
      overall_comment: evaluationResult.overall_comment,
      total_score: Math.round(totalScore * 100) / 100
    }
  }

  /**
   * 발표 평가 (STT + LLM 기반 6대 지표 채점)
   */
  async evaluatePresentation(
    customer: AIVirtualCustomer,
    presentationTitle: string,
    audioFilePath: string
  ): Promise<Omit<PresentationEvaluation, 'id' | 'evaluation_date'>> {
    
    // 1. STT (음성을 텍스트로 변환)
    const transcriptResult = await this.performSTT(audioFilePath)
    
    // 2. 음성 분석 (보조지표)
    const speechMetrics = await this.analyzeSpeechMetrics(audioFilePath)
    
    // 3. 고객 관점 발표 평가
    const evaluationPrompt = this.buildPresentationEvaluationPrompt(
      customer,
      transcriptResult.text,
      speechMetrics
    )
    
    const evaluationResult = await this.callLLMForEvaluation(
      evaluationPrompt,
      'presentation'
    )
    
    // 점수 구조화
    const scores: EvaluationScores = {
      clarity: {
        score: evaluationResult.clarity_score,
        comment: evaluationResult.clarity_comment
      },
      expertise: {
        score: evaluationResult.expertise_score,
        comment: evaluationResult.expertise_comment
      },
      persuasiveness: {
        score: evaluationResult.persuasiveness_score,
        comment: evaluationResult.persuasiveness_comment
      },
      logic: {
        score: evaluationResult.logic_score,
        comment: evaluationResult.logic_comment
      },
      creativity: {
        score: evaluationResult.creativity_score,
        comment: evaluationResult.creativity_comment
      },
      credibility: {
        score: evaluationResult.credibility_score,
        comment: evaluationResult.credibility_comment
      }
    }

    const totalScore = Object.values(scores).reduce((sum, metric) => sum + metric.score, 0) / 6

    return {
      customer_id: customer.id,
      presentation_title: presentationTitle,
      audio_file_path: audioFilePath,
      transcript_text: transcriptResult.text,
      scores,
      speech_metrics: speechMetrics,
      overall_comment: evaluationResult.overall_comment,
      total_score: Math.round(totalScore * 100) / 100
    }
  }

  /**
   * 통합 결과 생성 (제안서 70% + 발표 30% 가중평균)
   */
  async integrateResults(
    customerId: string,
    proposalEval: ProposalEvaluation | null,
    presentationEval: PresentationEvaluation | null,
    projectTitle: string
  ): Promise<Omit<IntegratedEvaluation, 'id' | 'created_at'>> {
    
    // 가중평균 계산 (제안서 70%, 발표 30%)
    const proposalWeight = 0.7
    const presentationWeight = 0.3
    
    const finalScores = {
      clarity: this.calculateWeightedScore(proposalEval?.scores.clarity.score, presentationEval?.scores.clarity.score, proposalWeight, presentationWeight),
      expertise: this.calculateWeightedScore(proposalEval?.scores.expertise.score, presentationEval?.scores.expertise.score, proposalWeight, presentationWeight),
      persuasiveness: this.calculateWeightedScore(proposalEval?.scores.persuasiveness.score, presentationEval?.scores.persuasiveness.score, proposalWeight, presentationWeight),
      logic: this.calculateWeightedScore(proposalEval?.scores.logic.score, presentationEval?.scores.logic.score, proposalWeight, presentationWeight),
      creativity: this.calculateWeightedScore(proposalEval?.scores.creativity.score, presentationEval?.scores.creativity.score, proposalWeight, presentationWeight),
      credibility: this.calculateWeightedScore(proposalEval?.scores.credibility.score, presentationEval?.scores.credibility.score, proposalWeight, presentationWeight),
      total: 0
    }

    finalScores.total = (finalScores.clarity + finalScores.expertise + finalScores.persuasiveness + 
                        finalScores.logic + finalScores.creativity + finalScores.credibility) / 6

    // 통합 피드백 생성
    const feedback = await this.generateIntegratedFeedback(
      proposalEval,
      presentationEval,
      finalScores
    )

    // 레이더 차트 데이터 생성
    const radarChartData = {
      proposal_scores: proposalEval ? [
        proposalEval.scores.clarity.score,
        proposalEval.scores.expertise.score,
        proposalEval.scores.persuasiveness.score,
        proposalEval.scores.logic.score,
        proposalEval.scores.creativity.score,
        proposalEval.scores.credibility.score
      ] : [0, 0, 0, 0, 0, 0],
      presentation_scores: presentationEval ? [
        presentationEval.scores.clarity.score,
        presentationEval.scores.expertise.score,
        presentationEval.scores.persuasiveness.score,
        presentationEval.scores.logic.score,
        presentationEval.scores.creativity.score,
        presentationEval.scores.credibility.score
      ] : [0, 0, 0, 0, 0, 0],
      final_scores: [
        finalScores.clarity,
        finalScores.expertise,
        finalScores.persuasiveness,
        finalScores.logic,
        finalScores.creativity,
        finalScores.credibility
      ],
      labels: ['명확성', '전문성', '설득력', '논리성', '창의성', '신뢰성']
    }

    return {
      customer_id: customerId,
      proposal_evaluation_id: proposalEval?.id,
      presentation_evaluation_id: presentationEval?.id,
      project_title: projectTitle,
      final_scores: finalScores,
      feedback,
      radar_chart_data: radarChartData
    }
  }

  // === 프라이빗 메서드들 ===

  /**
   * 제안서 평가 프롬프트 구성
   */
  private buildProposalEvaluationPrompt(customer: AIVirtualCustomer, content: string): string {
    return `
당신은 ${customer.company_name} ${customer.department}의 ${customer.name}입니다.

【고객사 프로필】
- 기업 요약: ${customer.persona_summary}
- 핵심 우선순위: ${customer.top3_priorities.join(', ')}
- 의사결정 방식: ${customer.decision_making_style}
- 전략적 포커스: ${customer.combined_attributes.strategic_focus}
- 위험 선호도: ${customer.combined_attributes.risk_appetite}
- 혁신 성향: ${customer.combined_attributes.innovation_preference}
- 예산 민감도: ${customer.combined_attributes.budget_sensitivity}

【평가 대상 제안서】
${content}

【평가 지침】
위 제안서를 우리 회사 관점에서 다음 6대 지표로 평가해주세요:

1. 명확성 (Clarity): ${this.METRIC_DEFINITIONS.clarity}
2. 전문성 (Expertise): ${this.METRIC_DEFINITIONS.expertise}
3. 설득력 (Persuasiveness): ${this.METRIC_DEFINITIONS.persuasiveness}
4. 논리성 (Logic): ${this.METRIC_DEFINITIONS.logic}
5. 창의성 (Creativity): ${this.METRIC_DEFINITIONS.creativity}
6. 신뢰성 (Credibility): ${this.METRIC_DEFINITIONS.credibility}

【루브릭 기준】
각 지표는 60-100점으로 채점하며, 기준은 다음과 같습니다:
${this.formatRubricAnchors()}

【출력 형식】
각 지표별로 다음 형식으로 평가해주세요:

명확성: [점수]점 - [구체적 근거와 코멘트]
전문성: [점수]점 - [구체적 근거와 코멘트]
설득력: [점수]점 - [구체적 근거와 코멘트]
논리성: [점수]점 - [구체적 근거와 코멘트]
창의성: [점수]점 - [구체적 근거와 코멘트]
신뢰성: [점수]점 - [구체적 근거와 코멘트]

종합 총평: [200자 이내로 전체적인 평가 의견]
    `
  }

  /**
   * 발표 평가 프롬프트 구성
   */
  private buildPresentationEvaluationPrompt(
    customer: AIVirtualCustomer, 
    transcript: string, 
    speechMetrics: any
  ): string {
    return `
당신은 ${customer.company_name} ${customer.department}의 ${customer.name}입니다.

【고객사 프로필】
- 기업 요약: ${customer.persona_summary}
- 핵심 우선순위: ${customer.top3_priorities.join(', ')}
- 의사결정 방식: ${customer.decision_making_style}

【발표 내용 (STT 결과)】
${transcript}

【발표 보조지표】
- 말속도: ${speechMetrics.speech_speed}분당 단어 수
- 군더더기어: ${speechMetrics.filler_words_count}회
- 휴지 빈도: ${speechMetrics.pause_frequency}%

【평가 지침】
위 발표를 우리 회사 관점에서 6대 지표로 평가해주세요.
발표 특성상 전달력, 설득력, 명확성을 특히 중시하여 평가하시기 바랍니다.

【출력 형식】
명확성: [점수]점 - [발표 전달력 관점에서 코멘트]
전문성: [점수]점 - [전문성 전달 관점에서 코멘트]
설득력: [점수]점 - [청중 설득력 관점에서 코멘트]
논리성: [점수]점 - [발표 논리 전개 관점에서 코멘트]
창의성: [점수]점 - [발표 참신성 관점에서 코멘트]
신뢰성: [점수]점 - [발표자 신뢰도 관점에서 코멘트]

종합 총평: [발표 전반에 대한 평가 의견]
    `
  }

  /**
   * LLM 평가 호출 (시뮬레이션)
   */
  private async callLLMForEvaluation(prompt: string, type: 'proposal' | 'presentation'): Promise<any> {
    // 실제로는 LLM API (GPT-4, Claude 등) 호출
    // 현재는 시뮬레이션 결과 반환
    
    const simulatedScores = {
      clarity_score: Math.floor(Math.random() * 2) + 3, // 3-4점
      clarity_comment: "목적과 범위는 명확하게 제시되었으나, 일부 기대효과 설명이 추상적입니다.",
      
      expertise_score: Math.floor(Math.random() * 2) + 4, // 4-5점  
      expertise_comment: "업계 최신 트렌드와 레퍼런스가 잘 반영되어 있어 전문성이 돋보입니다.",
      
      persuasiveness_score: Math.floor(Math.random() * 2) + 3, // 3-4점
      persuasiveness_comment: "데이터 기반 근거는 충분하나, 우리 회사 Pain Point와의 연결성을 더 강화할 필요가 있습니다.",
      
      logic_score: Math.floor(Math.random() * 2) + 4, // 4-5점
      logic_comment: "문제 정의부터 해결방안까지 논리적 흐름이 일관성 있게 구성되었습니다.",
      
      creativity_score: Math.floor(Math.random() * 2) + 3, // 3-4점
      creativity_comment: "기존 접근법에서 일부 차별화된 요소가 있으나, 더 혁신적인 아이디어가 기대됩니다.",
      
      credibility_score: Math.floor(Math.random() * 2) + 4, // 4-5점
      credibility_comment: "유사 프로젝트 경험과 리스크 관리 계획이 체계적으로 제시되어 실행 가능성이 높아 보입니다.",
      
      overall_comment: type === 'proposal' 
        ? "전반적으로 체계적이고 전문적인 제안서입니다. 특히 기술적 전문성과 실행 계획이 우수하나, 우리 회사 고유의 요구사항에 대한 맞춤형 접근이 더 필요합니다."
        : "발표 내용이 논리적이고 전문성을 잘 보여주었습니다. 다만 핵심 메시지 전달에서 좀 더 임팩트 있는 스토리텔링이 필요해 보입니다."
    }
    
    return simulatedScores
  }

  /**
   * STT (음성을 텍스트로 변환)
   */
  private async performSTT(audioFilePath: string): Promise<{
    text: string;
    confidence: number;
    duration: number;
  }> {
    // 실제로는 STT API (Google Speech-to-Text, Azure Speech 등) 호출
    // 현재는 시뮬레이션 결과 반환
    
    return {
      text: `
      안녕하세요, 저희 ABC컨설팅의 제안 발표를 시작하겠습니다. 
      
      먼저 귀사의 디지털 전환 프로젝트에 대한 저희의 이해와 접근 방안을 말씀드리겠습니다. 
      
      귀사께서 요구하신 AI 기반 고객 서비스 시스템은 단순한 기술 도입을 넘어서, 
      고객 경험의 혁신과 운영 효율성 제고라는 전략적 목표를 달성하는 핵심 수단이라고 판단됩니다.
      
      저희가 제안하는 솔루션의 핵심 차별점은 세 가지입니다. 
      첫째, 귀사의 기존 시스템과의 seamless한 통합, 
      둘째, 업계 선도 수준의 AI 기술 적용, 
      셋째, 지속적인 학습과 개선이 가능한 플랫폼 구조입니다.
      
      특히 저희는 지난 3년간 유사한 규모의 프로젝트를 성공적으로 수행한 경험을 바탕으로, 
      검증된 방법론과 리스크 관리 체계를 보유하고 있습니다.
      `,
      confidence: 0.92,
      duration: 180 // 3분
    }
  }

  /**
   * 음성 분석 (보조지표)
   */
  private async analyzeSpeechMetrics(audioFilePath: string): Promise<{
    speech_speed: number;
    filler_words_count: number;
    pause_frequency: number;
  }> {
    // 실제로는 음성 분석 라이브러리 사용
    // 현재는 시뮬레이션 결과 반환
    
    return {
      speech_speed: 180, // 분당 단어 수 (적정: 150-200)
      filler_words_count: 8, // 군더더기어 개수 ("음", "어", "그" 등)
      pause_frequency: 12 // 휴지 빈도 (%)
    }
  }

  /**
   * 가중평균 점수 계산
   */
  private calculateWeightedScore(
    proposalScore: number | undefined,
    presentationScore: number | undefined,
    proposalWeight: number,
    presentationWeight: number
  ): number {
    if (proposalScore && presentationScore) {
      return Math.round((proposalScore * proposalWeight + presentationScore * presentationWeight) * 100) / 100
    } else if (proposalScore) {
      return proposalScore
    } else if (presentationScore) {
      return presentationScore
    } else {
      return 0
    }
  }

  /**
   * 통합 피드백 생성
   */
  private async generateIntegratedFeedback(
    proposalEval: ProposalEvaluation | null,
    presentationEval: PresentationEvaluation | null,
    finalScores: any
  ): Promise<{
    strengths: string;
    improvements: string;
    final_summary: string;
  }> {
    
    // 강점 분석 (4점 이상 지표들)
    const strengths = []
    const improvements = []
    
    Object.entries(finalScores).forEach(([metric, score]: [string, any]) => {
      if (metric !== 'total' && score >= 4) {
        strengths.push(this.getMetricName(metric))
      } else if (metric !== 'total' && score < 3) {
        improvements.push(this.getMetricName(metric))
      }
    })
    
    return {
      strengths: strengths.length > 0 
        ? `${strengths.join(', ')} 영역에서 우수한 성과를 보여주었습니다.`
        : "전반적으로 균형잡힌 제안이었습니다.",
      improvements: improvements.length > 0
        ? `${improvements.join(', ')} 영역에서 추가적인 보완이 필요합니다.`
        : "대부분의 영역에서 양호한 수준을 보였습니다.",
      final_summary: `총 ${finalScores.total}점으로 ${this.getOverallGrade(finalScores.total)} 수준의 제안입니다. ${this.getDetailedSummary(finalScores)}`
    }
  }

  /**
   * 루브릭 앵커 포맷팅
   */
  private formatRubricAnchors(): string {
    return Object.entries(this.RUBRIC_ANCHORS)
      .map(([metric, anchors]) => {
        const metricName = this.getMetricName(metric)
        const anchorText = Object.entries(anchors)
          .map(([score, description]) => `${score}점: ${description}`)
          .join('\n')
        return `\n【${metricName}】\n${anchorText}`
      }).join('\n')
  }

  /**
   * 지표명 한국어 변환
   */
  private getMetricName(metric: string): string {
    const names: Record<string, string> = {
      clarity: '명확성',
      expertise: '전문성', 
      persuasiveness: '설득력',
      logic: '논리성',
      creativity: '창의성',
      credibility: '신뢰성'
    }
    return names[metric] || metric
  }

  /**
   * 전체 등급 판정
   */
  private getOverallGrade(score: number): string {
    if (score >= 4.5) return '매우 우수한'
    if (score >= 4.0) return '우수한'  
    if (score >= 3.5) return '양호한'
    if (score >= 3.0) return '보통의'
    return '개선이 필요한'
  }

  /**
   * 상세 총평 생성
   */
  private getDetailedSummary(scores: any): string {
    const maxScore = Math.max(...Object.values(scores).filter((s: any) => typeof s === 'number'))
    const minScore = Math.min(...Object.values(scores).filter((s: any) => typeof s === 'number'))
    
    const maxMetric = Object.entries(scores).find(([k, v]) => v === maxScore && k !== 'total')?.[0]
    const minMetric = Object.entries(scores).find(([k, v]) => v === minScore && k !== 'total')?.[0]
    
    return `특히 ${this.getMetricName(maxMetric || '')}(${maxScore}점)에서 강점을 보였고, ${this.getMetricName(minMetric || '')}(${minScore}점) 부분에서 추가 보완을 권장합니다.`
  }
}