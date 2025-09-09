// PDF 리포트 생성 서비스

import type { AIVirtualCustomer, ProposalEvaluation, PresentationEvaluation } from '../types/ai-customer'

export interface PDFReportData {
  customer: AIVirtualCustomer
  proposalEvaluation?: ProposalEvaluation  
  presentationEvaluation?: PresentationEvaluation
  finalScores: {
    clarity: number
    expertise: number
    persuasiveness: number
    logic: number
    creativity: number
    credibility: number
    total: number
  }
  feedback: {
    strengths: string
    improvements: string
    summary: string
  }
  generatedAt: string
}

export class PDFGeneratorService {
  
  // PDF 리포트 데이터 생성
  generateReportData(
    customer: AIVirtualCustomer,
    proposalEval?: ProposalEvaluation,
    presentationEval?: PresentationEvaluation
  ): PDFReportData {
    
    // 최종 점수 계산 (제안서 70% + 발표 30%)
    const proposalWeight = 0.7
    const presentationWeight = 0.3
    
    let finalScores = {
      clarity: 0,
      expertise: 0, 
      persuasiveness: 0,
      logic: 0,
      creativity: 0,
      credibility: 0,
      total: 0
    }
    
    if (proposalEval && presentationEval) {
      finalScores = {
        clarity: (proposalEval.scores.clarity.score * proposalWeight) + (presentationEval.scores.clarity.score * presentationWeight),
        expertise: (proposalEval.scores.expertise.score * proposalWeight) + (presentationEval.scores.expertise.score * presentationWeight),
        persuasiveness: (proposalEval.scores.persuasiveness.score * proposalWeight) + (presentationEval.scores.persuasiveness.score * presentationWeight),
        logic: (proposalEval.scores.logic.score * proposalWeight) + (presentationEval.scores.logic.score * presentationWeight),
        creativity: (proposalEval.scores.creativity.score * proposalWeight) + (presentationEval.scores.creativity.score * presentationWeight),
        credibility: (proposalEval.scores.credibility.score * proposalWeight) + (presentationEval.scores.credibility.score * presentationWeight),
        total: 0
      }
      
      finalScores.total = (finalScores.clarity + finalScores.expertise + finalScores.persuasiveness + 
                          finalScores.logic + finalScores.creativity + finalScores.credibility) / 6
    } else if (proposalEval) {
      finalScores = {
        clarity: proposalEval.scores.clarity.score,
        expertise: proposalEval.scores.expertise.score,
        persuasiveness: proposalEval.scores.persuasiveness.score,
        logic: proposalEval.scores.logic.score,
        creativity: proposalEval.scores.creativity.score,
        credibility: proposalEval.scores.credibility.score,
        total: proposalEval.total_score
      }
    }
    
    // 피드백 생성
    const feedback = this.generateFeedback(finalScores, proposalEval, presentationEval)
    
    return {
      customer,
      proposalEvaluation: proposalEval,
      presentationEvaluation: presentationEval,
      finalScores,
      feedback,
      generatedAt: new Date().toISOString()
    }
  }

  // HTML 리포트 생성 (PDF 변환용)
  generateHTMLReport(reportData: PDFReportData): string {
    const { customer, proposalEvaluation, presentationEvaluation, finalScores, feedback } = reportData
    
    return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RFP 평가 리포트 - ${customer.name}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
        
        body {
            font-family: 'Noto Sans KR', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: white;
        }
        
        .header {
            text-align: center;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .header h1 {
            color: #2563eb;
            margin: 0;
            font-size: 24px;
            font-weight: 700;
        }
        
        .header p {
            color: #666;
            margin: 5px 0;
            font-size: 14px;
        }
        
        .section {
            margin-bottom: 30px;
            padding: 20px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
        }
        
        .section h2 {
            color: #1f2937;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 10px;
            margin-bottom: 15px;
            font-size: 18px;
            font-weight: 600;
        }
        
        .customer-info {
            background: #f8fafc;
        }
        
        .scores-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin: 15px 0;
        }
        
        .score-card {
            text-align: center;
            padding: 15px;
            background: #f1f5f9;
            border-radius: 6px;
            border: 1px solid #cbd5e1;
        }
        
        .score-value {
            font-size: 24px;
            font-weight: 700;
            color: #2563eb;
        }
        
        .score-label {
            font-size: 12px;
            color: #64748b;
            margin-top: 5px;
        }
        
        .final-score {
            text-align: center;
            padding: 25px;
            background: linear-gradient(135deg, #2563eb, #3b82f6);
            color: white;
            border-radius: 8px;
            margin: 20px 0;
        }
        
        .final-score .score {
            font-size: 36px;
            font-weight: 700;
            margin-bottom: 5px;
        }
        
        .feedback-section {
            background: #fefefe;
        }
        
        .feedback-item {
            margin-bottom: 15px;
            padding: 12px;
            border-left: 4px solid #2563eb;
            background: #f8fafc;
        }
        
        .feedback-item h3 {
            margin: 0 0 8px 0;
            color: #1f2937;
            font-size: 14px;
            font-weight: 600;
        }
        
        .feedback-item p {
            margin: 0;
            font-size: 13px;
            line-height: 1.5;
        }
        
        .priorities-list {
            list-style: none;
            padding: 0;
        }
        
        .priorities-list li {
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
            font-size: 14px;
        }
        
        .priorities-list li:last-child {
            border-bottom: none;
        }
        
        .footer {
            text-align: center;
            padding: 20px 0;
            border-top: 1px solid #e5e7eb;
            color: #666;
            font-size: 12px;
        }
        
        .evaluation-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 20px 0;
        }
        
        .eval-card {
            padding: 15px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
        }
        
        .eval-card h3 {
            margin: 0 0 10px 0;
            color: #374151;
            font-size: 16px;
        }
        
        .comment-box {
            background: #f9fafb;
            padding: 10px;
            border-radius: 4px;
            font-size: 12px;
            line-height: 1.4;
            color: #4b5563;
        }
        
        @media print {
            body { font-size: 12px; }
            .section { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>RFP 기반 AI 가상고객 제안평가 리포트</h1>
        <p>AI 가상고객: ${customer.name} (${customer.company_name})</p>
        <p>생성일시: ${new Date(reportData.generatedAt).toLocaleString('ko-KR')}</p>
    </div>

    <div class="section customer-info">
        <h2>AI 가상고객 정보</h2>
        <p><strong>이름:</strong> ${customer.name}</p>
        <p><strong>회사:</strong> ${customer.company_name}</p>
        <p><strong>부서:</strong> ${customer.department || 'N/A'}</p>
        <p><strong>페르소나 요약:</strong> ${customer.persona_summary}</p>
        <p><strong>의사결정 스타일:</strong> ${customer.decision_making_style}</p>
        
        <h3>Top 3 우선순위</h3>
        <ul class="priorities-list">
            ${customer.top3_priorities.map(priority => `<li>• ${priority}</li>`).join('')}
        </ul>
    </div>

    <div class="section">
        <h2>종합 평가 점수</h2>
        
        <div class="scores-grid">
            <div class="score-card">
                <div class="score-value">${finalScores.clarity.toFixed(1)}</div>
                <div class="score-label">명확성</div>
            </div>
            <div class="score-card">
                <div class="score-value">${finalScores.expertise.toFixed(1)}</div>
                <div class="score-label">전문성</div>
            </div>
            <div class="score-card">
                <div class="score-value">${finalScores.persuasiveness.toFixed(1)}</div>
                <div class="score-label">설득력</div>
            </div>
            <div class="score-card">
                <div class="score-value">${finalScores.logic.toFixed(1)}</div>
                <div class="score-label">논리성</div>
            </div>
            <div class="score-card">
                <div class="score-value">${finalScores.creativity.toFixed(1)}</div>
                <div class="score-label">창의성</div>
            </div>
            <div class="score-card">
                <div class="score-value">${finalScores.credibility.toFixed(1)}</div>
                <div class="score-label">신뢰성</div>
            </div>
        </div>

        <div class="final-score">
            <div class="score">${finalScores.total.toFixed(2)}</div>
            <div>최종 종합 점수 (5점 만점)</div>
        </div>
    </div>

    ${proposalEvaluation || presentationEvaluation ? `
    <div class="section">
        <h2>세부 평가 내역</h2>
        
        <div class="evaluation-details">
            ${proposalEvaluation ? `
            <div class="eval-card">
                <h3>제안서 평가 (70% 반영)</h3>
                <p><strong>제목:</strong> ${proposalEvaluation.proposal_title}</p>
                <p><strong>총점:</strong> ${proposalEvaluation.total_score.toFixed(2)}/5.0</p>
                <div class="comment-box">
                    ${proposalEvaluation.overall_comment}
                </div>
            </div>
            ` : ''}
            
            ${presentationEvaluation ? `
            <div class="eval-card">
                <h3>발표 평가 (30% 반영)</h3>
                <p><strong>제목:</strong> ${presentationEvaluation.presentation_title}</p>
                <p><strong>총점:</strong> ${presentationEvaluation.total_score.toFixed(2)}/5.0</p>
                <p><strong>말속도:</strong> ${presentationEvaluation.speech_metrics?.speech_speed || 'N/A'} WPM</p>
                <p><strong>휴지 빈도:</strong> ${presentationEvaluation.speech_metrics?.pause_frequency || 'N/A'}</p>
                <div class="comment-box">
                    ${presentationEvaluation.overall_comment}
                </div>
            </div>
            ` : ''}
        </div>
    </div>
    ` : ''}

    <div class="section feedback-section">
        <h2>종합 피드백</h2>
        
        <div class="feedback-item">
            <h3>🌟 주요 강점</h3>
            <p>${feedback.strengths}</p>
        </div>
        
        <div class="feedback-item">
            <h3>💡 개선 방향</h3>
            <p>${feedback.improvements}</p>
        </div>
        
        <div class="feedback-item">
            <h3>📋 종합 평가</h3>
            <p>${feedback.summary}</p>
        </div>
    </div>

    <div class="footer">
        <p>본 리포트는 RFP 기반 AI 가상고객 제안평가 시뮬레이터에 의해 생성되었습니다.</p>
        <p>© 2025 PwC Korea. All rights reserved.</p>
    </div>
</body>
</html>
    `.trim()
  }

  // 피드백 생성
  private generateFeedback(
    finalScores: any, 
    proposalEval?: ProposalEvaluation,
    presentationEval?: PresentationEvaluation
  ): { strengths: string; improvements: string; summary: string } {
    
    // 강점 분석
    const strengths = []
    if (finalScores.expertise >= 4.5) strengths.push('전문성이 매우 뛰어남')
    if (finalScores.credibility >= 4.5) strengths.push('높은 신뢰성과 실현가능성')
    if (finalScores.clarity >= 4.0) strengths.push('명확하고 체계적인 구성')
    if (finalScores.logic >= 4.0) strengths.push('논리적이고 체계적인 접근')
    
    if (strengths.length === 0) {
      strengths.push('기본적인 요구사항을 충족하는 수준')
    }

    // 개선사항 분석  
    const improvements = []
    if (finalScores.creativity < 3.5) improvements.push('더욱 창의적이고 차별화된 접근 필요')
    if (finalScores.clarity < 3.5) improvements.push('메시지 전달의 명확성 개선 필요')
    if (finalScores.persuasiveness < 3.5) improvements.push('고객 관점에서의 설득력 강화 필요')
    
    if (improvements.length === 0) {
      improvements.push('전반적으로 우수한 수준이며, 세부적인 완성도 향상 권장')
    }

    // 총평
    let summary = ''
    if (finalScores.total >= 4.5) {
      summary = '매우 우수한 제안으로 고객의 요구사항을 정확히 파악하고 전문적인 해결방안을 제시했습니다.'
    } else if (finalScores.total >= 4.0) {
      summary = '전반적으로 우수한 제안이며, 고객의 니즈를 잘 이해하고 적절한 솔루션을 제안했습니다.'
    } else if (finalScores.total >= 3.5) {
      summary = '기본적인 요구사항은 충족하나, 일부 영역에서 추가적인 보완이 필요합니다.'
    } else {
      summary = '기본 수준의 제안이며, 여러 영역에서 개선이 필요합니다.'
    }

    return {
      strengths: strengths.join(', '),
      improvements: improvements.join(', '),
      summary: summary
    }
  }

  // PDF 다운로드를 위한 Blob 생성 (클라이언트 사이드)
  generatePDFBlob(htmlContent: string): string {
    // 실제 구현에서는 jsPDF, puppeteer, 또는 서버사이드 PDF 생성 필요
    // 현재는 HTML을 반환하여 브라우저에서 인쇄 기능 사용
    return htmlContent
  }
}