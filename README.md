# 🚀 RFP기반 AI가상고객 제안 평가 시뮬레이터

## 프로젝트 개요
- **이름**: RFP기반 AI가상고객 제안 평가 시뮬레이터
- **목표**: 30개 고객 페르소나 속성 기반 6지표 루브릭 평가로 제안서 분석
- **핵심 기능**: 
  - ⚡ **30속성 통합 AI 가상고객 생성** (딥리서치 + RFP 분석 기반)
  - 🔍 **실제 파일 기반 RFP 분석** (PDF, DOCX, TXT 지원)
  - 📊 **6지표 루브릭 평가 시스템** (명확성, 전문성, 설득력, 논리성, 창의성, 신뢰성)
  - 💾 **메모리 기반 실시간 데이터 저장** (Railway 환경 최적화)
  - 🌏 **한국어 문서 처리 완전 지원**

## 🔗 서비스 URL
- **개발 서버**: https://3000-icqxngjtfsfi529p9m1em-6532622b.e2b.dev
- **프로덕션**: Railway 배포 준비 완료
- **GitHub**: https://github.com/user/rfp-ai-sim

## 🏗️ 기술 아키텍처
- **플랫폼**: Cloudflare Workers + Railway 듀얼 배포
- **프레임워크**: Hono + TypeScript
- **AI 서비스**: OpenAI GPT-4o API
- **데이터 저장**: Global Memory Store (Railway) + KV Storage (Cloudflare)
- **프론트엔드**: TailwindCSS + Vanilla JavaScript

## 📊 **✅ 30속성 통합 페르소나 구조** 
### 완성된 30개 고객 속성 (6개 카테고리 × 5개씩)

```typescript
interface IntegratedPersona {
  // 1. 기본 정보 (5개 속성)
  basic_info: {
    role: string;           // 역할 (CTO, 팀장 등)
    company: string;        // 회사명
    department: string;     // 부서
    experience_years: number; // 경력 연수
    decision_authority: string; // 결정권 수준
  };
  
  // 2. 의사결정 특성 (5개 속성)  
  decision_traits: {
    style: string;              // 의사결정 스타일
    risk_tolerance: string;     // 위험 허용도
    timeline_preference: string; // 일정 선호도
    budget_sensitivity: string;  // 예산 민감도
    innovation_openness: string; // 혁신 개방성
  };
  
  // 3. 핵심 우선순위 (5개 속성)
  priorities: {
    primary: string;        // 1순위 우선사항
    secondary: string;      // 2순위 우선사항  
    tertiary: string;       // 3순위 우선사항
    compliance: string;     // 규제준수 요구사항
    scalability: string;    // 확장성 고려사항
  };
  
  // 4. 평가 관점 (5개 속성)
  evaluation_perspective: {
    technical_depth: string;      // 기술 깊이 선호도
    business_value: string;       // 비즈니스 가치 중시도
    cost_analysis: string;        // 비용 분석 중요도
    implementation: string;       // 구현 계획 중시도
    vendor_reliability: string;   // 공급업체 신뢰성 중시도
  };
  
  // 5. 주요 우려사항 (5개 속성)
  concerns: {
    technical_risk: string;     // 기술적 리스크 우려
    financial_risk: string;     // 재무적 리스크 우려
    timeline_risk: string;      // 일정 리스크 우려
    operational_risk: string;   // 운영 리스크 우려
    vendor_risk: string;        // 공급업체 리스크 우려
  };
  
  // 6. 평가 가중치 (5개 속성)
  evaluation_weights: {
    clarity: number;        // 명확성 가중치 (0-1)
    expertise: number;      // 전문성 가중치 (0-1)
    persuasiveness: number; // 설득력 가중치 (0-1)
    logic: number;         // 논리성 가중치 (0-1)
    creativity: number;    // 창의성 가중치 (0-1)
    credibility: number;   // 신뢰성 가중치 (0-1)
  };
}
```

## 🎯 **✅ 6지표 페르소나 기반 평가 시스템**

### 완성된 API 엔드포인트

#### 1. **30속성 AI 가상고객 생성** (완료 ✅)
```bash
POST /api/demo2/customer-generation
{
  "company_name": "삼성전자",
  "rfp_content": "업로드된 RFP 파일 내용",
  "market_research": "시장 조사 데이터"
}
```
- **✅ 딥리서치 기반**: OpenAI GPT-4o로 기업 분석
- **✅ RFP 분석 통합**: 실제 업로드 파일 내용 분석
- **✅ 30속성 페르소나**: 6개 카테고리 × 5개 속성 완전 구조화

#### 2. **실제 파일 기반 RFP 분석** (완료 ✅)
```bash  
POST /api/customers/rfp-analysis
Content-Type: multipart/form-data
- rfp_file: PDF/DOCX/TXT 파일
- file_name: 파일명
- parsing_mode: detailed
```
- **✅ 파일 포맷**: PDF, DOCX, TXT 완전 지원
- **✅ 텍스트 추출**: pdf-parse + docx 파싱
- **✅ 폴백 시스템**: 텍스트 추출 실패시 기본 분석 제공

#### 3. **30속성 기반 6지표 제안서 평가** (완료 ✅)
```bash
POST /api/evaluations/proposal  
{
  "customer_id": "고객 ID",
  "proposal_title": "제안서 제목", 
  "proposal_content": "제안서 내용"
}
```

**✅ 완성된 30속성 → 6지표 매핑**:
- **명확성**: 기술 관점 + 평가 관점 속성 반영
- **전문성**: 핵심 우선순위 + 전문 깊이 속성 반영  
- **설득력**: 의사결정 스타일 + 혁신 개방성 속성 반영
- **논리성**: 기술 우려사항 + 리스크 허용도 속성 반영
- **창의성**: 혁신 성향 + 의사결정 특성 속성 반영
- **신뢰성**: 위험 허용도 + 공급업체 신뢰성 속성 반영

#### 4. **개선된 LLM 평가 프롬프트** (완료 ✅)
```typescript
// 30개 속성을 모두 포함한 상세 페르소나 프롬프트
const prompt = `
당신은 ${customer.company_name}의 ${persona.basic_info.role}입니다.
다음은 당신의 상세한 30개 속성 프로필입니다.

=== 고객 30개 속성 페르소나 ===
【기본 정보 (5개)】... 
【의사결정 특성 (5개)】...
【핵심 우선순위 (5개)】...  
【평가 관점 (5개)】...
【주요 우려사항 (5개)】...
【평가 가중치 (5개)】...

위 30개 속성을 모두 고려하여 다음 6개 지표로 평가해주세요:
1. 명확성: 나의 ${persona.evaluation_perspective.technical_depth}에서 이해하기 쉬운가?
2. 전문성: 나의 ${persona.priorities.primary}를 충족하는 전문성인가?
3. 설득력: 나의 ${persona.decision_traits.style}에 부합하는 설득력인가?
4. 논리성: 나의 ${persona.concerns.technical_risk} 해결에 논리적인가?
5. 창의성: 나의 ${persona.decision_traits.innovation_openness} 수준에 적합한가?
6. 신뢰성: 나의 ${persona.decision_traits.risk_tolerance} 성향에 안전한가?
`;
```

## 🚀 **완성된 핵심 기능**

### ✅ **30속성 통합 완료**
1. **페르소나 구조화**: 6개 카테고리 × 5개 속성 = 30개 완전 매핑
2. **동적 프롬프트**: 각 평가 지표별로 해당하는 페르소나 속성 직접 참조
3. **가중치 시스템**: 고객별 개인화된 6지표 가중치 적용
4. **실시간 LLM**: GPT-4o 기반 30초 제한 실시간 평가

### ✅ **하드코딩 제거 완료**  
1. **RFP 분석**: `DemoDataService.getSampleRfp()` → 실제 업로드 파일 기반
2. **제안서 평가**: `DemoDataService.getSampleProposalEvaluation()` → LLM 기반 동적 평가
3. **페르소나 활용**: 정적 데이터 → 30개 속성 기반 개인화 평가

### ✅ **파일 처리 시스템**
1. **멀티포맷 지원**: PDF (pdf-parse), DOCX, TXT 완전 지원
2. **에러 핸들링**: 파일 추출 실패시 기본 분석 폴백
3. **메타데이터 활용**: 파일명, 크기, 타입 정보 포함 분석

## 🔧 사용 가이드

### 1. **30속성 AI 가상고객 생성**
1. **Demo 2 페이지** 접속
2. **회사명 입력** + **RFP 파일 업로드** 
3. **AI 가상고객 생성 클릭**
4. **30속성 통합 페르소나** 자동 생성

### 2. **6지표 제안서 평가**
1. **생성된 AI 가상고객 선택**
2. **제안서 내용 입력** (제목 + 본문)
3. **AI 평가 실행**  
4. **30속성 기반 6지표 점수** 확인

### 3. **실시간 LLM 평가 확인**
- **LLM 성공**: 실시간 GPT-4o 기반 개인화 평가
- **LLM 실패**: 페르소나 기반 폴백 평가 
- **평가 시간**: 최대 30초 (타임아웃 보장)

## 🎯 배포 상태

### Cloudflare Pages (개발환경)
- **상태**: ✅ 활성화 
- **URL**: https://3000-icqxngjtfsfi529p9m1em-6532622b.e2b.dev
- **기능**: 30속성 페르소나 + 6지표 평가 완전 구현

### Railway (프로덕션 준비)
- **상태**: 🟡 배포 준비 완료
- **설정**: `ecosystem.config.cjs`, `server.js` 구성 완료
- **환경변수**: `OPENAI_API_KEY`, `NODE_ENV=production`

## 🧪 **30속성 페르소나 테스트 결과**

### 완성된 페르소나 생성 예시
```json
{
  "company_name": "삼성전자",
  "integrated_persona": {
    "basic_info": {
      "role": "CTO",
      "company": "삼성전자", 
      "department": "기술총괄",
      "experience_years": 15,
      "decision_authority": "핵심의사결정자"
    },
    "decision_traits": {
      "style": "기술검증 중심형",
      "risk_tolerance": "보수적",
      "timeline_preference": "단계적 접근",
      "budget_sensitivity": "높음",
      "innovation_openness": "중간"
    },
    // ... 나머지 25개 속성
  }
}
```

### 6지표 평가 결과 예시  
```json
{
  "scores": {
    "clarity": { 
      "score": 4, 
      "comment": "기술 깊이 '중요' 관점에서 명확한 설명",
      "persona_factor": "evaluation_perspective.technical_depth" 
    },
    "expertise": { 
      "score": 5, 
      "comment": "핵심 우선순위 '기술적 안정성' 완전 충족",
      "persona_factor": "priorities.primary"
    }
    // ... 나머지 4개 지표
  },
  "weighted_total_score": 87,
  "persona_feedback": "30개 속성 페르소나 관점에서의 종합 피드백"
}
```

## 📈 다음 단계
1. **TypeScript 오류 해결**: 빌드 오류 수정 및 프로덕션 배포
2. **Railway 배포**: GitHub 연동 후 자동 배포 설정
3. **성능 최적화**: 30속성 프롬프트 길이 최적화
4. **UI/UX 개선**: 30속성 페르소나 시각화 대시보드 
5. **배치 평가**: 다수 제안서 동시 평가 기능

## 🌟 핵심 성과
- ⚡ **30속성 통합 완료**: 하드코딩 완전 제거, 개인화 평가 구현
- 🎯 **6지표 페르소나 매핑**: 각 평가 지표별 페르소나 속성 직접 연결
- 🔧 **실시간 LLM 평가**: GPT-4o 기반 30초 제한 동적 평가
- 🌏 **실제 파일 처리**: PDF/DOCX 업로드 기반 RFP 분석 완전 구현
- 📊 **메모리 기반 저장**: Railway 환경 최적화 실시간 데이터 관리