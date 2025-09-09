// 제안서 평가 프론트엔드 스크립트

class ProposalEvaluationApp {
  constructor() {
    this.selectedCustomer = null
    this.uploadedProposal = null
    this.evaluationResult = null
    
    this.init()
  }

  init() {
    this.setupEventListeners()
    this.loadCustomers()
  }

  setupEventListeners() {
    // 고객 선택 이벤트
    document.getElementById('customer-select')?.addEventListener('change', (e) => {
      this.selectCustomer(e.target.value)
    })

    // 제안서 파일 업로드
    document.getElementById('proposal-file')?.addEventListener('change', (e) => {
      this.handleProposalUpload(e.target.files[0])
    })

    // 데모 제안서 로드
    document.getElementById('demo-proposal-load')?.addEventListener('click', () => {
      this.loadDemoProposal()
    })

    // 평가 시작 버튼
    document.getElementById('start-evaluation')?.addEventListener('click', () => {
      this.startEvaluation()
    })

    // 드래그 앤 드롭 설정
    this.setupDragDrop()
  }

  setupDragDrop() {
    const dropZone = document.getElementById('proposal-drop-zone')
    if (!dropZone) return

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault()
      dropZone.classList.add('border-green-500', 'bg-green-50')
    })

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('border-green-500', 'bg-green-50')
    })

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault()
      dropZone.classList.remove('border-green-500', 'bg-green-50')
      
      const files = e.dataTransfer.files
      if (files.length > 0) {
        this.handleProposalUpload(files[0])
      }
    })
  }

  async loadCustomers() {
    try {
      const response = await axios.get('/api/customers')
      
      if (response.data.success) {
        const select = document.getElementById('customer-select')
        const customers = response.data.data

        // 고객이 없을 때 안내 메시지
        if (customers.length === 0) {
          const option = document.createElement('option')
          option.value = ''
          option.textContent = '먼저 AI 가상고객을 생성해주세요 (고객 생성 페이지에서)'
          option.disabled = true
          select.appendChild(option)
          return
        }

        // 옵션 추가
        customers.forEach(customer => {
          const option = document.createElement('option')
          option.value = customer.id
          option.textContent = customer.name || customer.company_name || '고객 정보 없음'
          select.appendChild(option)
        })

        // URL 파라미터에서 고객 ID 확인
        const urlParams = new URLSearchParams(window.location.search)
        const customerId = urlParams.get('customer_id')
        if (customerId) {
          select.value = customerId
          this.selectCustomer(customerId)
        }
      }
    } catch (error) {
      console.error('고객 목록 로드 오류:', error)
      this.showError('AI 가상고객 목록을 불러오는데 실패했습니다.')
    }
  }

  async selectCustomer(customerId) {
    if (!customerId) {
      document.getElementById('selected-customer-info').classList.add('hidden')
      this.selectedCustomer = null
      this.checkEvaluationReady()
      return
    }

    try {
      // 고객 정보 표시 (실제로는 API에서 상세 정보를 가져와야 함)
      const select = document.getElementById('customer-select')
      const selectedOption = select.options[select.selectedIndex]
      
      this.selectedCustomer = {
        id: customerId,
        name: selectedOption.textContent
      }

      const customerInfo = document.getElementById('selected-customer-info')
      const customerDetails = document.getElementById('customer-details')
      
      customerDetails.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <strong>선택된 고객:</strong> ${selectedOption.textContent}
          </div>
          <div>
            <strong>상태:</strong> <span class="text-green-600">활성</span>
          </div>
        </div>
      `
      
      customerInfo.style.display = 'block'
      this.checkEvaluationReady()

    } catch (error) {
      console.error('고객 선택 오류:', error)
      this.showError('고객 정보를 불러오는데 실패했습니다.')
    }
  }

  async handleProposalUpload(file) {
    if (!file) return

    // 파일 크기 확인 (50MB 제한)
    if (file.size > 50 * 1024 * 1024) {
      this.showError('파일 크기가 50MB를 초과합니다.')
      return
    }

    // 파일 형식 확인
    const allowedTypes = ['.pdf', '.docx', '.txt']
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase()
    
    if (!allowedTypes.includes(fileExtension)) {
      this.showError('지원하지 않는 파일 형식입니다. PDF, DOCX, TXT 파일만 업로드 가능합니다.')
      return
    }

    try {
      this.showLoading('파일을 업로드하고 분석 중...')

      // FormData 생성 및 파일 업로드
      const formData = new FormData()
      formData.append('file', file)

      const response = await axios.post('/api/upload/file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      if (response.data.success) {
        this.uploadedProposal = {
          file: file,
          name: file.name,
          size: file.size,
          type: fileExtension,
          parsedContent: response.data.data.parsed_content,
          fileId: response.data.data.file_id
        }

        this.displayUploadedFile()
        this.checkEvaluationReady()
        this.showSuccessMessage('파일이 성공적으로 업로드되고 분석되었습니다!')
      } else {
        throw new Error(response.data.error)
      }

    } catch (error) {
      console.error('파일 업로드 오류:', error)
      this.showError('파일 업로드 중 오류가 발생했습니다: ' + error.message)
    } finally {
      this.hideLoading()
    }
  }

  loadDemoProposal() {
    // 데모 제안서 정보 설정
    document.getElementById('proposal-title').value = '금호석유화학 DX 전략 수립 및 실행'
    document.getElementById('proposal-company').value = 'PwC 컨설팅'

    this.uploadedProposal = {
      file: null,
      name: 'pwc_kumho_dx_proposal.pdf',
      size: 2560000, // 2.56MB
      type: '.pdf',
      isDemo: true,
      content: `
프로젝트명: 금호석유화학 DX 전략 수립 및 실행
제안사: PwC 컨설팅

목표: ERP–MES–ESG 시스템을 통합해 데이터 기반 의사결정 강화

방법론:
- 글로벌 벤치마킹 기반 진단
- ERP·MES 데이터 통합 플랫폼 설계  
- ESG 지표 자동화 리포팅 구현

차별화 포인트:
- 화학산업 특화 레퍼런스 5건 보유
- 글로벌 ESG 규제 대응 경험 풍부
- PwC Project Cost Management Asset 적용

기대효과:
- 데이터 신뢰성 제고, ESG 리스크 관리 강화
- 의사결정 속도 향상 (보고서 작성 시간 40% 단축 예상)

리스크 대응:
- 단계별 PoC 검증 → 안정적 확산
- 공급망 데이터 품질 강화
      `
    }

    this.displayUploadedFile()
    this.checkEvaluationReady()
    this.showSuccessMessage('데모 제안서가 성공적으로 로드되었습니다!')
  }

  displayUploadedFile() {
    const fileInfo = document.getElementById('uploaded-file-info')
    const fileDetails = document.getElementById('file-details')
    
    const fileSizeMB = (this.uploadedProposal.size / (1024 * 1024)).toFixed(2)
    
    fileDetails.innerHTML = `
      <div class="pwc-grid pwc-grid-2" style="gap: var(--spacing-md);">
        <div style="word-break: keep-all;">
          <strong>파일명:</strong> ${this.uploadedProposal.name}
        </div>
        <div style="word-break: keep-all;">
          <strong>크기:</strong> ${fileSizeMB}MB
        </div>
        <div style="word-break: keep-all;">
          <strong>형식:</strong> ${this.uploadedProposal.type.toUpperCase()}
        </div>
        <div style="word-break: keep-all;">
          <strong>상태:</strong> <span style="color: var(--success-color); font-weight: 600;">업로드 완료</span>
        </div>
      </div>
    `
    
    fileInfo.classList.remove('hidden')
  }

  checkEvaluationReady() {
    const startButton = document.getElementById('start-evaluation')
    
    if (this.selectedCustomer && this.uploadedProposal) {
      startButton.disabled = false
      startButton.classList.remove('bg-gray-400')
      startButton.classList.add('bg-purple-600', 'hover:bg-purple-700')
    } else {
      startButton.disabled = true
      startButton.classList.add('bg-gray-400')
      startButton.classList.remove('bg-purple-600', 'hover:bg-purple-700')
    }
  }

  async startEvaluation() {
    if (!this.selectedCustomer || !this.uploadedProposal) {
      this.showError('AI 가상고객과 제안서를 모두 선택해주세요.')
      return
    }

    try {
      this.showLoading('AI가 제안서를 평가하고 있습니다...')

      let evaluationData
      
      if (this.uploadedProposal.isDemo) {
        // 데모 데이터 사용
        const response = await axios.post('/api/demo/evaluate-proposal', {
          customer_id: this.selectedCustomer.id
        })
        evaluationData = response.data.data
      } else {
        // 실제 파일 평가
        const proposalTitle = document.getElementById('proposal-title').value || this.uploadedProposal.name
        let proposalContent = ''

        // 파싱된 내용 사용
        if (this.uploadedProposal.parsedContent) {
          proposalContent = this.uploadedProposal.parsedContent.content
        } else {
          proposalContent = '파일 내용을 읽을 수 없습니다.'
        }
        
        const response = await axios.post('/api/evaluations/proposal', {
          customer_id: this.selectedCustomer.id,
          proposal_title: proposalTitle,
          proposal_content: proposalContent
        })
        evaluationData = response.data.data
      }

      this.evaluationResult = evaluationData
      this.displayEvaluationResults()

    } catch (error) {
      console.error('제안서 평가 오류:', error)
      this.showError('제안서 평가 중 오류가 발생했습니다: ' + error.message)
    } finally {
      this.hideLoading()
    }
  }

  displayEvaluationResults() {
    if (!this.evaluationResult) return

    const resultsSection = document.getElementById('evaluation-results')
    
    // 각 지표별 점수 표시 (100점 만점)
    document.getElementById('clarity-score').textContent = this.evaluationResult.scores.clarity.score + '점'
    document.getElementById('expertise-score').textContent = this.evaluationResult.scores.expertise.score + '점'
    document.getElementById('persuasiveness-score').textContent = this.evaluationResult.scores.persuasiveness.score + '점'
    document.getElementById('logic-score').textContent = this.evaluationResult.scores.logic.score + '점'
    document.getElementById('creativity-score').textContent = this.evaluationResult.scores.creativity.score + '점'
    document.getElementById('credibility-score').textContent = this.evaluationResult.scores.credibility.score + '점'
    
    // 총점 표시 (100점 만점)
    document.getElementById('total-score').textContent = Math.round(this.evaluationResult.total_score) + '점'
    
    // 종합 코멘트 표시
    document.getElementById('overall-comment').textContent = this.evaluationResult.overall_comment

    resultsSection.style.display = 'block'
    resultsSection.scrollIntoView({ behavior: 'smooth' })
  }

  showLoading(message = '처리 중...') {
    const overlay = document.createElement('div')
    overlay.id = 'loading-overlay'
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    `
    overlay.innerHTML = `
      <div style="
        background: var(--pwc-white);
        border-radius: var(--border-radius-lg);
        padding: var(--spacing-xl);
        box-shadow: var(--shadow-xl);
        border: 3px solid var(--pwc-navy);
        max-width: 400px;
        width: 90%;
      ">
        <div style="display: flex; align-items: center; gap: var(--spacing-md); margin-bottom: var(--spacing-lg);">
          <i class="fas fa-spinner fa-spin" style="color: var(--pwc-navy); font-size: 1.5rem;"></i>
          <span style="font-size: 1.125rem; font-weight: 600; color: var(--pwc-navy); word-break: keep-all;">${message}</span>
        </div>
        <div style="width: 100%; height: 8px; background: var(--neutral-200); border-radius: 4px; overflow: hidden;">
          <div style="height: 100%; background: linear-gradient(90deg, var(--pwc-navy), var(--pwc-orange)); border-radius: 4px; width: 70%; animation: pulse 1.5s ease-in-out infinite;"></div>
        </div>
      </div>
    `
    document.body.appendChild(overlay)
  }

  hideLoading() {
    const overlay = document.getElementById('loading-overlay')
    if (overlay) {
      overlay.remove()
    }
  }

  showError(message) {
    alert('오류: ' + message)
  }

  showSuccessMessage(message) {
    const successDiv = document.createElement('div')
    successDiv.style.cssText = `
      position: fixed;
      top: var(--spacing-lg);
      right: var(--spacing-lg);
      background: linear-gradient(135deg, var(--success-color), var(--pwc-success));
      color: var(--pwc-white);
      padding: var(--spacing-lg);
      border-radius: var(--border-radius-md);
      box-shadow: var(--shadow-lg);
      z-index: 9999;
      transition: opacity 0.3s ease;
      border: 2px solid var(--success-color-light);
      max-width: 400px;
      word-break: keep-all;
    `
    successDiv.innerHTML = `
      <div style="display: flex; align-items: center; gap: var(--spacing-sm);">
        <i class="fas fa-check-circle" style="font-size: 1.25rem;"></i>
        <span style="font-weight: 600;">${message}</span>
      </div>
    `
    
    document.body.appendChild(successDiv)
    
    // 3초 후 자동 제거
    setTimeout(() => {
      successDiv.style.opacity = '0'
      setTimeout(() => {
        if (successDiv.parentNode) {
          successDiv.parentNode.removeChild(successDiv)
        }
      }, 300)
    }, 3000)
  }
}

// 앱 초기화
let proposalApp
document.addEventListener('DOMContentLoaded', () => {
  proposalApp = new ProposalEvaluationApp()
})