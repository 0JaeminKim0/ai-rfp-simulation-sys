// 데모 데이터 관리 서비스
import type { 
  DeepResearchData, 
  RfpAnalysisData, 
  AIVirtualCustomer,
  ProposalEvaluation,
  PresentationEvaluation
} from '../types/ai-customer'

export class DemoDataService {
  
  // 1️⃣ 샘플 딥리서치 데이터 (15속성) - 회사명 동적 적용
  static getSampleDeepResearchData(companyName: string = '샘플기업'): DeepResearchData {
    // 회사별 맞춤형 사업 영역 및 기본 정보
    const companyProfiles = {
      '네이버': { business: '검색, 플랫폼, AI, 클라우드 서비스', position: '국내 1위 검색포털, 글로벌 플랫폼 기업', domain: 'naver.com' },
      '삼성전자': { business: '반도체, 스마트폰, 디스플레이, 가전', position: '글로벌 반도체 1위, 스마트폰 제조사', domain: 'samsung.com' },
      '카카오': { business: '메신저, 플랫폼, 핀테크, 모빌리티', position: '국내 1위 메신저, 플랫폼 생태계 구축', domain: 'kakao.com' },
      'LG전자': { business: '가전, 차량부품, 에어솔루션', position: '글로벌 가전 브랜드, 친환경 가전 선도', domain: 'lg.com' },
      'SK하이닉스': { business: '메모리 반도체, DRAM, NAND Flash', position: '글로벌 메모리 반도체 2위', domain: 'skhynix.com' },
      '현대자동차': { business: '자동차 제조, 전기차, 수소차', position: '글로벌 자동차 제조사, 친환경차 선도', domain: 'hyundai.com' },
      '금고석유화학': { business: 'C4 화학제품, 합성수지, 특수화학', position: '국내 C4 화학 선도기업, 친환경 소재 개발', domain: 'kkpc.com' }
    }
    
    const profile = companyProfiles[companyName as keyof typeof companyProfiles] || 
                   { business: '다양한 사업 영역', position: '업계 선도 기업', domain: 'company.com' }
    
    return {
      1: {
        id: "1",
        name: "비전·미션",
        content: `${companyName}의 혁신과 지속가능한 성장을 추구`,
        source_url: `https://www.${profile.domain}`,
        source_type: "homepage",
        reliability_score: 9,
        llm_confidence: 0.95,
        extracted_at: new Date().toISOString()
      },
      2: {
        id: "2", 
        name: "핵심 사업영역",
        content: profile.business,
        source_url: `https://www.${profile.domain}/ir`,
        source_type: "ir_document",
        reliability_score: 10,
        llm_confidence: 0.98,
        extracted_at: new Date().toISOString()
      },
      3: {
        id: "3",
        name: "시장 포지셔닝", 
        content: profile.position,
        source_url: `${companyName}_analyst_report_2024.pdf`,
        source_type: "press_release",
        reliability_score: 8,
        llm_confidence: 0.87,
        extracted_at: new Date().toISOString()
      },
      4: {
        id: "4",
        name: "재무 전략 성향",
        content: "보수적 재무 운영, 단계적 투자 확대",
        source_url: "ir_presentation_q4_2024.pdf",
        source_type: "ir_document",
        reliability_score: 9,
        llm_confidence: 0.91,
        extracted_at: new Date().toISOString()
      },
      5: {
        id: "5",
        name: "R&D 지향성",
        content: "CNT, 수소소재, 친환경 신소재 집중",
        source_url: "esg_report_2024.pdf", 
        source_type: "esg_report",
        reliability_score: 9,
        llm_confidence: 0.93,
        extracted_at: new Date().toISOString()
      },
      6: {
        id: "6",
        name: "ESG 우선순위",
        content: "2050 Net Zero 목표, 2030 탄소 40% 감축",
        source_url: "esg_report_2024.pdf",
        source_type: "esg_report", 
        reliability_score: 10,
        llm_confidence: 0.97,
        extracted_at: new Date().toISOString()
      },
      7: {
        id: "7",
        name: "리스크 관리 태도",
        content: "원자재 가격 변동 헤지, 공급망 다변화",
        source_url: "annual_report_2024.pdf",
        source_type: "ir_document",
        reliability_score: 8,
        llm_confidence: 0.89,
        extracted_at: new Date().toISOString()
      },
      8: {
        id: "8",
        name: "글로벌 vs 로컬 지향성",
        content: "매출의 60% 해외, 미주·유럽 주요 고객",
        source_url: "ir_presentation_q4_2024.pdf",
        source_type: "ir_document",
        reliability_score: 9,
        llm_confidence: 0.94,
        extracted_at: new Date().toISOString()
      },
      9: {
        id: "9",
        name: "고객/이해관계자 성향",
        content: "B2B 대기업 고객 중심, 장기 파트너십 선호",
        source_url: "press_release_partnership.pdf",
        source_type: "press_release",
        reliability_score: 8,
        llm_confidence: 0.86,
        extracted_at: new Date().toISOString()
      },
      10: {
        id: "10",
        name: "디지털 전환 수준", 
        content: "ERP·MES 업그레이드 진행, DX 조직 신설",
        source_url: "news_dx_initiative.html",
        source_type: "news",
        reliability_score: 7,
        llm_confidence: 0.82,
        extracted_at: new Date().toISOString()
      },
      11: {
        id: "11",
        name: "조직문화·HR 방향",
        content: "안정적·장기 근속 중심, R&D 인재 확보 강화",
        source_url: "career_page.html",
        source_type: "homepage", 
        reliability_score: 7,
        llm_confidence: 0.78,
        extracted_at: new Date().toISOString()
      },
      12: {
        id: "12",
        name: "파트너십/생태계 전략",
        content: "산학협력 확대, 오픈이노베이션 시도",
        source_url: "conference_presentation_2024.pdf",
        source_type: "press_release",
        reliability_score: 8,
        llm_confidence: 0.85,
        extracted_at: new Date().toISOString()
      },
      13: {
        id: "13",
        name: "규제·정책 대응 성향",
        content: "화학물질 규제(REACH 등) 선제 대응",
        source_url: "esg_report_2024.pdf",
        source_type: "esg_report",
        reliability_score: 9,
        llm_confidence: 0.92,
        extracted_at: new Date().toISOString()
      },
      14: {
        id: "14", 
        name: "사회적 이미지/브랜드 톤",
        content: "신뢰, 안정, 지속가능 키워드 강조",
        source_url: "media_coverage_analysis.pdf",
        source_type: "news",
        reliability_score: 8,
        llm_confidence: 0.84,
        extracted_at: new Date().toISOString()
      },
      15: {
        id: "15",
        name: "단기 vs 장기 목표 균형", 
        content: "단기 수익 방어 + 장기 친환경 R&D 투자",
        source_url: "ceo_interview_2024.pdf",
        source_type: "press_release",
        reliability_score: 9,
        llm_confidence: 0.88,
        extracted_at: new Date().toISOString()
      }
    } as DeepResearchData
  }

  // 2️⃣ 샘플 RFP 분석 데이터 (15속성)
  static getSampleRfpAnalysisData(companyName: string = '샘플기업'): RfpAnalysisData {
    return {
      1: {
        id: "1",
        name: "발주사명",
        content: companyName,
        source_snippet: "발주처: 금호석유화학 주식회사",
        page_number: 1,
        section_title: "프로젝트 개요",
        extracted_at: new Date().toISOString()
      },
      2: {
        id: "2", 
        name: "발주부서",
        content: "Digital Innovation팀",
        source_snippet: "담당부서: Digital Innovation팀 (DX추진본부)",
        page_number: 2,
        section_title: "담당 조직",
        extracted_at: new Date().toISOString()
      },
      3: {
        id: "3",
        name: "프로젝트 배경",
        content: "ESG 경영 및 글로벌 경쟁 심화 대응",
        source_snippet: "ESG 경영 강화와 글로벌 경쟁력 확보를 위한 디지털 전환이 필요",
        page_number: 3,
        section_title: "추진 배경",
        extracted_at: new Date().toISOString()
      },
      4: {
        id: "4",
        name: "프로젝트 목표",
        content: "ERP–MES–ESG 통합 DX 플랫폼 구축",
        source_snippet: "ERP, MES, ESG 데이터를 통합한 디지털 플랫폼 구축을 통해...",
        page_number: 4,
        section_title: "프로젝트 목표",
        extracted_at: new Date().toISOString()
      },
      5: {
        id: "5",
        name: "프로젝트 범위",
        content: "ERP 고도화, MES 연계, ESG 데이터 통합",
        source_snippet: "- ERP 시스템 고도화\n- MES 시스템 연계\n- ESG 데이터 통합 관리",
        page_number: 5,
        section_title: "사업 범위",
        extracted_at: new Date().toISOString()
      },
      6: {
        id: "6",
        name: "프로젝트 기간",
        content: "2025.01 ~ 2025.12 (12개월)",
        source_snippet: "사업기간: 2025년 1월 ~ 2025년 12월 (총 12개월)",
        page_number: 6,
        section_title: "사업 일정",
        extracted_at: new Date().toISOString()
      },
      7: {
        id: "7", 
        name: "프로젝트 예산",
        content: "약 150억 원, Task 단위 산정",
        source_snippet: "총 사업비: 약 150억원 (부가세 별도, Task별 단가 산정)",
        page_number: 7,
        section_title: "사업 예산",
        extracted_at: new Date().toISOString()
      },
      8: {
        id: "8",
        name: "평가기준",
        content: "기술 70 : 가격 30",
        source_snippet: "평가 배점: 기술평가 70점, 가격평가 30점",
        page_number: 8,
        section_title: "평가 방법",
        extracted_at: new Date().toISOString()
      },
      9: {
        id: "9",
        name: "요구 산출물",
        content: "단계별 마스터플랜, PoC 보고서, 최종 통합 보고서",
        source_snippet: "주요 산출물:\n1) 단계별 마스터플랜\n2) PoC 검증 보고서\n3) 최종 통합 보고서",
        page_number: 9,
        section_title: "산출물 요구사항",
        extracted_at: new Date().toISOString()
      },
      10: {
        id: "10",
        name: "입찰사 요건",
        content: "대기업 ERP/MES 프로젝트 경험 3건 이상",
        source_snippet: "참가자격: 대기업 대상 ERP/MES 통합 프로젝트 수행경험 3건 이상",
        page_number: 10,
        section_title: "참가 자격",
        extracted_at: new Date().toISOString()
      },
      11: {
        id: "11",
        name: "준수사항", 
        content: "NDA, K-ESG 준수, 보안 가이드라인",
        source_snippet: "필수 준수사항:\n- 비밀유지협약(NDA) 체결\n- K-ESG 가이드라인 준수\n- 정보보안 가이드라인 준수",
        page_number: 11,
        section_title: "준수 사항",
        extracted_at: new Date().toISOString()
      },
      12: {
        id: "12",
        name: "리스크 관리 조건",
        content: "일정 지연 시 페널티, 핵심인력 교체 제한",
        source_snippet: "리스크 관리:\n- 일정 지연 시 지체상금 부과\n- 핵심 투입인력 임의 교체 금지",
        page_number: 12,
        section_title: "계약 조건",
        extracted_at: new Date().toISOString()
      },
      13: {
        id: "13",
        name: "필수 역량",
        content: "클라우드 ERP, ESG 데이터 관리, 화학산업 경험",
        source_snippet: "필수 기술역량:\n- 클라우드 기반 ERP 구축 경험\n- ESG 데이터 관리 시스템 구축 경험\n- 화학산업 도메인 이해",
        page_number: 13, 
        section_title: "기술 요구사항",
        extracted_at: new Date().toISOString()
      },
      14: {
        id: "14",
        name: "진행 일정",
        content: "RFP 발송(1월) → 접수(2월) → 제안/PT(3월) → 선정(4월)",
        source_snippet: "추진일정:\n1월: RFP 발송\n2월: 제안서 접수\n3월: 제안발표\n4월: 업체 선정",
        page_number: 14,
        section_title: "추진 일정",
        extracted_at: new Date().toISOString()
      },
      15: {
        id: "15",
        name: "특이조건/기타 요구",
        content: "다국어(영어/중국어) 지원 필수",
        source_snippet: "특수 요구사항:\n- 시스템 다국어 지원 (한국어, 영어, 중국어)\n- 글로벌 법인 확장 대응 가능",
        page_number: 15,
        section_title: "특수 요구사항",
        extracted_at: new Date().toISOString()
      }
    } as RfpAnalysisData
  }

  // 3️⃣ 생성된 AI 가상고객 샘플
  static getSampleAIVirtualCustomer(companyName: string = '샘플기업'): AIVirtualCustomer {
    return {
      id: "demo-customer-kumho-2025",
      name: companyName,
      company_name: companyName,
      department: "Digital Innovation팀",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(), 
      version: "v2.0",
      status: "active",
      
      // 페르소나 카드
      persona_summary: "보수적이면서도 혁신적인 DX 추진, ESG와 글로벌 경쟁력을 동시에 추구하는 실용주의적 의사결정자",
      top3_priorities: [
        "ESG 경영 강화를 통한 글로벌 규제 선제 대응", 
        "ERP-MES 통합으로 데이터 기반 의사결정 구현",
        "안정적 실행과 단계적 확산을 통한 리스크 최소화"
      ],
      decision_making_style: "데이터 기반 + 단계적 검증 + 장기적 관점에서의 신중한 의사결정. 안정성을 중시하되 필요시 혁신적 기술 도입에 적극적",
      
      // 30속성 통합 데이터
      deep_research_data: this.getSampleDeepResearchData(companyName),
      rfp_analysis_data: this.getSampleRfpAnalysisData(companyName),
      combined_attributes: {
        strategic_focus: "ESG 기반 지속가능 성장 + 글로벌 경쟁력 강화",
        risk_appetite: "보수적 재무운영 + 선제적 규제대응",
        innovation_preference: "검증된 기술 기반 + 단계적 혁신 도입",
        budget_sensitivity: "중간 수준 (150억원 규모, 합리적 ROI 추구)",
        timeline_priority: "안정적 12개월 완수 > 조기 완료",
        quality_standards: "화학산업 특화 + 글로벌 ESG 기준",
        compliance_requirements: "REACH 등 화학규제 + K-ESG + 보안가이드라인",
        stakeholder_priorities: "B2B 고객 신뢰 + 장기 파트너십",
        technology_adoption: "클라우드 ERP + ESG 데이터 통합 지향",
        partnership_approach: "산학협력 + 오픈이노베이션 + 안정적 공급업체"
      }
    }
  }

  // 4️⃣ 샘플 제안서 평가 결과
  static getSampleProposalEvaluation(companyName: string = '금고석유화학'): ProposalEvaluation {
    return {
      id: "demo-proposal-eval-2025",
      customer_id: "demo-customer-kumho-2025", 
      proposal_title: "금호석유화학 DX 전략 수립 및 실행 (PwC 컨설팅)",
      proposal_file_path: "/uploads/pwc_kumho_proposal.pdf",
      
      scores: {
        clarity: { 
          score: 82,     // 100점 척도 직접 점수
          score_5: 4,    // 원본 5점 만점 점수 (호환성용)
          score_100: 82, // 100점 만점 점수
          comment: "목적과 범위가 명확하고 ERP-MES-ESG 통합 방향성이 잘 드러남. 다만 기술적 세부사항에서 일부 모호한 표현 존재" 
        },
        expertise: { 
          score: 89,     // 100점 척도 직접 점수
          score_5: 5,    // 원본 5점 만점 점수 (호환성용)
          score_100: 89, // 100점 만점 점수
          comment: "화학산업 특화 레퍼런스 5건과 글로벌 ESG 규제 대응 경험이 뛰어남. PwC Asset 활용 계획도 구체적" 
        },
        persuasiveness: { 
          score: 84,     // 100점 척도 직접 점수
          score_5: 4,    // 원본 5점 만점 점수 (호환성용)
          score_100: 84, // 100점 만점 점수
          comment: "ESG 리스크 관리 강화와 의사결정 속도 향상 효과를 고객 관점에서 잘 어필. ROI 수치 제시가 설득력 있음" 
        },
        logic: { 
          score: 86,     // 100점 척도 직접 점수
          score_5: 4,    // 원본 5점 만점 점수 (호환성용)
          score_100: 86, // 100점 만점 점수
          comment: "단계별 PoC 검증 방식이 논리적이고 리스크 최소화 접근이 타당함. 전체 추진 프로세스 체계적" 
        },
        creativity: { 
          score: 75,     // 100점 척도 직접 점수
          score_5: 3,    // 원본 5점 만점 점수 (호환성용)
          score_100: 75, // 100점 만점 점수
          comment: "전통적인 ERP-MES 통합 방식에 ESG 연계를 추가한 정도. 획기적 혁신보다는 안정적 접근" 
        },
        credibility: { 
          score: 91,     // 100점 척도 직접 점수
          score_5: 5,    // 원본 5점 만점 점수 (호환성용)
          score_100: 91, // 100점 만점 점수
          comment: "PwC 글로벌 네트워크와 화학산업 경험, 단계별 검증 방식 등 실현가능성이 매우 높음" 
        }
      },
      
      overall_comment: "ESG와 DX를 동시에 추구하는 금고석유화학의 니즈를 정확히 파악하고, 안정적이면서도 전문적인 실행 방안을 제시. 화학산업 도메인 경험과 글로벌 ESG 대응 역량이 강점. 다만 혁신적 차별화 요소는 다소 아쉬움",
      total_score_5: 4.17, // (4+5+4+4+3+5)/6 - 5점 만점 (호환성용)
      total_score_100: 84.5, // (82+89+84+86+75+91)/6 - 100점 만점
      total_score: 84.5, // 기본은 100점 만점
      evaluation_date: new Date().toISOString()
    }
  }

  // 5️⃣ 샘플 발표 평가 결과 
  static getSamplePresentationEvaluation(companyName: string = 'KHNP'): PresentationEvaluation {
    return {
      id: "demo-presentation-eval-2025",
      customer_id: "demo-customer-khnp-2025",
      presentation_title: "KHNP 수력양수 발전 운영체계 고도화 제안 발표",
      audio_file_path: "/uploads/khnp_presentation_audio.wav",
      transcript_text: "안녕하십니까, 오늘 발표에서는 KHNP 수력양수 발전 운영체계를 한 단계 더 고도화하기 위한 저희의 제안을 공유드리고자 합니다. 최근 전력 시장은 신재생 에너지 확대와 전력 수요 변동성 증가라는 이중 과제에 직면해 있으며, 이에 따라 안정적인 전력 운영이 어느 때보다 중요한 상황입니다. 오늘은 이러한 변화 속에서 우리가 어떻게 효율적이고 미래지향적인 운영체계를 구축할 수 있을지 말씀드리겠습니다. 현재 수력양수 운영체계는 실시간 대응은 가능하지만, 급격한 수요 변동이나 신재생 발전량 예측 오차에는 한계가 존재합니다. 또한 축적된 데이터와 AI를 활용한 예측·분석 기반의 의사결정이 미흡하여, 발전소 운영 효율성이 충분히 극대화되지 못하고 있습니다. 결과적으로, 신재생 확대라는 새로운 환경에 대응하기 위해서는 기존 체계만으로는 부족하다는 점이 명확해지고 있습니다. 저희는 이를 해결하기 위해 크게 세 가지 운영체계 개편 방향을 제안합니다. 첫째, 실시간 모니터링과 자동화 시스템을 강화하여 급변하는 수요와 공급 상황에 즉각적으로 대응할 수 있는 체계를 마련합니다. 둘째, 인공지능과 빅데이터를 활용한 예측 기반 의사결정을 도입함으로써 설비 활용 효율을 높이고, 나아가 안정적이고 경제적인 전력 운영을 실현하고자 합니다. 새로운 운영체계가 도입되면, 무엇보다도 전력 수급 안정성이 크게 강화되어 국가 에너지 운영에 기여할 수 있습니다. 또한 AI와 데이터 기반의 예측 시스템은 설비 효율을 극대화하여 불필요한 비용을 절감하고, 운영 전반의 경제성을 향상시킵니다. 나아가 이러한 체계는 향후 신재생 발전 확대에 따른 불확실성에도 유연하게 대응할 수 있는 기반을 마련합니다. 정리하자면, 수력양수 발전의 운영체계 개편은 단순한 시스템 개선이 아니라, 미래 전력 산업의 안정성과 지속가능성을 보장하기 위한 필수 과제입니다. 오늘 제안드린 방향은 실시간 대응 능력 강화, 예측 기반 의사결정 도입, 그리고 데이터 활용 고도화를 통해 그 과제를 실현하고자 합니다. 끝으로, 본 제안이 KHNP가 한 단계 더 도약하는 계기가 되기를 기대하며 발표를 마치겠습니다, 감사합니다.",
      
      scores: {
        clarity: { 
          score: 88,     // 100점 척도 직접 점수
          score_5: 4,    // 원본 5점 만점 점수 (호환성용)
          score_100: 88, // 100점 만점 점수
          comment: "수력양수 발전 운영체계 개편 방향이 명확하고 체계적으로 설명되어 있으며, 현재 문제점과 해결방안이 잘 정리되어 있습니다." 
        },
        expertise: { 
          score: 92,     // 100점 척도 직접 점수
          score_5: 5,    // 원본 5점 만점 점수 (호환성용)
          score_100: 92, // 100점 만점 점수
          comment: "전력산업과 수력양수 발전 분야의 깊은 이해를 바탕으로 전문적이고 실무적인 접근법을 제시했으며, 기술적 전문성이 뛰어납니다." 
        },
        persuasiveness: { 
          score: 84,     // 100점 척도 직접 점수
          score_5: 4,    // 원본 5점 만점 점수 (호환성용)
          score_100: 84, // 100점 만점 점수
          comment: "KHNP의 현재 상황과 미래 과제를 정확히 분석하고, 신재생 에너지 확대 환경에 맞는 설득력 있는 대안을 제시했습니다." 
        },
        logic: { 
          score: 89,     // 100점 척도 직접 점수
          score_5: 4,    // 원본 5점 만점 점수 (호환성용)
          score_100: 89, // 100점 만점 점수
          comment: "문제 진단부터 해결방안까지 논리적 연결이 체계적이며, 단계별 접근 방식이 합리적으로 구성되어 있습니다." 
        },
        creativity: { 
          score: 74,     // 100점 척도 직접 점수
          score_5: 3,    // 원본 5점 만점 점수 (호환성용)
          score_100: 74, // 100점 만점 점수
          comment: "AI와 빅데이터를 활용한 예측 기반 운영체계는 혁신적이나, 구체적인 차별화 요소와 구현 방법론이 더 구체화되면 좋겠습니다." 
        },
        credibility: { 
          score: 93,     // 100점 척도 직접 점수
          score_5: 5,    // 원본 5점 만점 점수 (호환성용)
          score_100: 93, // 100점 만점 점수
          comment: "전력 수급 안정성과 경제성 향상에 대한 실현 가능한 방안을 제시했으며, KHNP의 역량과 미래 전망에 부합하는 신뢰할 만한 제안입니다." 
        }
      },
      
      speech_metrics: {
        speech_speed: 150, // 분당 150단어 (적정 속도)
        filler_words_count: 3, // '음', '어' 등 (전문적 수준)
        pause_frequency: 0.6 // 초당 0.6회 휴지 (논리적 구간별)
      },
      
      overall_comment: "전력산업과 수력양수 발전 분야의 전문성이 뛰어나게 드러나며, 체계적이고 실현가능한 운영체계 개편 방안을 제시했습니다. 발표 구성과 논리적 흐름이 우수하고 미래지향적 관점에서 문제를 분석했으나, 구체적인 구현 방법론과 경제성 분석이 더 보강되면 좋겠습니다. 전반적으로 KHNP의 미래 발전 방향을 제시한 전문적이고 설득력 있는 발표였습니다.",
      total_score_5: 4.33, // (88+92+84+89+74+93)/6/20 - 5점 만점 (호환성용)
      total_score_100: 86.67, // (88+92+84+89+74+93)/6 - 100점 만점
      total_score: 86.67, // 기본은 100점 만점
      evaluation_date: new Date().toISOString()
    }
  }
}