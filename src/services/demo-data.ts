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
      '현대자동차': { business: '자동차 제조, 전기차, 수소차', position: '글로벌 자동차 제조사, 친환경차 선도', domain: 'hyundai.com' }
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
  static getSampleProposalEvaluation(): ProposalEvaluation {
    return {
      id: "demo-proposal-eval-2025",
      customer_id: "demo-customer-kumho-2025", 
      proposal_title: "금호석유화학 DX 전략 수립 및 실행 (PwC 컨설팅)",
      proposal_file_path: "/uploads/pwc_kumho_proposal.pdf",
      
      scores: {
        clarity: { 
          score: 40,     // 4점 → 40점 (100점 만점)
          score_5: 4,    // 원본 5점 만점 점수
          score_100: 40, // 100점 만점 점수
          comment: "목적과 범위가 명확하고 ERP-MES-ESG 통합 방향성이 잘 드러남. 다만 기술적 세부사항에서 일부 모호한 표현 존재" 
        },
        expertise: { 
          score: 50,     // 5점 → 50점 (100점 만점)
          score_5: 5,    // 원본 5점 만점 점수
          score_100: 50, // 100점 만점 점수
          comment: "화학산업 특화 레퍼런스 5건과 글로벌 ESG 규제 대응 경험이 뛰어남. PwC Asset 활용 계획도 구체적" 
        },
        persuasiveness: { 
          score: 40,     // 4점 → 40점 (100점 만점)
          score_5: 4,    // 원본 5점 만점 점수
          score_100: 40, // 100점 만점 점수
          comment: "ESG 리스크 관리 강화와 의사결정 속도 향상 효과를 고객 관점에서 잘 어필. ROI 수치 제시가 설득력 있음" 
        },
        logic: { 
          score: 40,     // 4점 → 40점 (100점 만점)
          score_5: 4,    // 원본 5점 만점 점수
          score_100: 40, // 100점 만점 점수
          comment: "단계별 PoC 검증 방식이 논리적이고 리스크 최소화 접근이 타당함. 전체 추진 프로세스 체계적" 
        },
        creativity: { 
          score: 30,     // 3점 → 30점 (100점 만점)
          score_5: 3,    // 원본 5점 만점 점수
          score_100: 30, // 100점 만점 점수
          comment: "전통적인 ERP-MES 통합 방식에 ESG 연계를 추가한 정도. 획기적 혁신보다는 안정적 접근" 
        },
        credibility: { 
          score: 50,     // 5점 → 50점 (100점 만점)
          score_5: 5,    // 원본 5점 만점 점수
          score_100: 50, // 100점 만점 점수
          comment: "PwC 글로벌 네트워크와 화학산업 경험, 단계별 검증 방식 등 실현가능성이 매우 높음" 
        }
      },
      
      overall_comment: "ESG와 DX를 동시에 추구하는 금호석유화학의 니즈를 정확히 파악하고, 안정적이면서도 전문적인 실행 방안을 제시. 화학산업 도메인 경험과 글로벌 ESG 대응 역량이 강점. 다만 혁신적 차별화 요소는 다소 아쉬움",
      total_score_5: 4.17, // (4+5+4+4+3+5)/6 - 5점 만점
      total_score_100: 40, // 4.17 → 40점 (100점 만점)
      total_score: 40, // 기본은 100점 만점
      evaluation_date: new Date().toISOString()
    }
  }

  // 5️⃣ 샘플 발표 평가 결과 
  static getSamplePresentationEvaluation(): PresentationEvaluation {
    return {
      id: "demo-presentation-eval-2025",
      customer_id: "demo-customer-kumho-2025",
      presentation_title: "금호석유화학 DX 플랫폼 구축 제안 발표",
      audio_file_path: "/uploads/pwc_presentation_audio.wav",
      transcript_text: "안녕하십니까, PwC 컨설팅의 발표를 시작하겠습니다. 이번 제안의 핵심은 ERP, MES, ESG 시스템을 하나의 플랫폼으로 통합하는 것입니다. 이를 통해 금호석유화학은 글로벌 ESG 규제에 선제적으로 대응하고, 공정 데이터를 경영 의사결정에 직접 연결할 수 있습니다. 또한, 저희는 화학 산업 프로젝트 경험과 글로벌 ESG 대응 노하우를 바탕으로, 안정적인 실행을 보장합니다. 마지막으로, 단계별 PoC를 통해 리스크를 최소화하고, 12개월 내 성공적인 플랫폼 구축을 완수하겠습니다. 감사합니다.",
      
      scores: {
        clarity: { 
          score: 40,     // 4점 → 40점 (100점 만점)
          score_5: 4,    // 원본 5점 만점 점수
          score_100: 40, // 100점 만점 점수
          comment: "발표 구조가 명확하고 핵심 메시지 전달이 체계적. 다만 기술적 세부사항 설명 시 다소 빠른 진행" 
        },
        expertise: { 
          score: 50,     // 5점 → 50점 (100점 만점)
          score_5: 5,    // 원본 5점 만점 점수
          score_100: 50, // 100점 만점 점수
          comment: "화학산업과 ESG 규제에 대한 전문 지식이 발표 전반에 잘 드러남. 도메인 이해도 높음" 
        },
        persuasiveness: { 
          score: 40,     // 4점 → 40점 (100점 만점)
          score_5: 4,    // 원본 5점 만점 점수
          score_100: 40, // 100점 만점 점수
          comment: "고객의 ESG 경영 니즈와 리스크 최소화 요구를 정확히 짚어 설득력 있는 메시지 전달" 
        },
        logic: { 
          score: 40,     // 4점 → 40점 (100점 만점)
          score_5: 4,    // 원본 5점 만점 점수
          score_100: 40, // 100점 만점 점수
          comment: "통합→대응→실행 순서로 논리적 흐름 구성. 단계별 PoC 접근법이 체계적" 
        },
        creativity: { 
          score: 30,     // 3점 → 30점 (100점 만점)
          score_5: 3,    // 원본 5점 만점 점수
          score_100: 30, // 100점 만점 점수
          comment: "안정적이고 검증된 방식 위주. 혁신적 아이디어보다는 실용적 접근 강조" 
        },
        credibility: { 
          score: 50,     // 5점 → 50점 (100점 만점)
          score_5: 5,    // 원본 5점 만점 점수
          score_100: 50, // 100점 만점 점수
          comment: "PwC 브랜드와 구체적 경험 사례, 명확한 실행 약속으로 높은 신뢰성 확보" 
        }
      },
      
      speech_metrics: {
        speech_speed: 180, // 분당 180단어 (적정 속도)
        filler_words_count: 2, // '음', '어' 등 (매우 적음)
        pause_frequency: 0.8 // 초당 0.8회 휴지 (자연스러움)
      },
      
      overall_comment: "전문적이고 자신감 있는 발표로 고객의 니즈를 정확히 파악했음을 보여줌. 말의 속도와 휴지가 적절하여 듣기 편하며, 핵심 메시지 전달력이 우수. ESG와 DX 통합 방향성을 명확히 제시하여 신뢰성 높음",
      total_score_5: 4.17, // (4+5+4+4+3+5)/6 - 5점 만점
      total_score_100: 40, // 4.17 → 40점 (100점 만점)
      total_score: 40, // 기본은 100점 만점
      evaluation_date: new Date().toISOString()
    }
  }
}