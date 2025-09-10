// 발표 평가 프론트엔드 스크립트

class PresentationEvaluationApp {
  constructor() {
    this.selectedCustomer = null
    this.mediaStream = null
    this.mediaRecorder = null
    this.recordedChunks = []
    this.isRecording = false
    this.recordingStartTime = null
    this.timerInterval = null
    this.audioContext = null
    this.audioAnalyser = null
    this.audioDataArray = null
    this.animationId = null
    
    // STT 관련
    this.recognition = null
    this.sttText = ''
    this.speechMetrics = {
      wordCount: 0,
      pauseCount: 0,
      fillerCount: 0,
      startTime: null
    }
    
    this.init()
  }

  init() {
    console.log('PresentationEvaluationApp init() 시작')
    this.setupEventListeners()
    this.loadCustomers()
    this.setupSpeechRecognition()
    console.log('PresentationEvaluationApp init() 완료')
    
    // 초기화 완료 후 즉시 데모 테스트 (개발용)
    if (window.location.search.includes('autotest=true')) {
      setTimeout(() => {
        console.log('자동 데모 테스트 실행')
        this.runDemoEvaluation()
      }, 2000)
    }
    
    // 5초 후 버튼 상태 확인 (디버깅용)
    setTimeout(() => {
      const requestMediaButton = document.getElementById('request-media')
      const demoButton = document.getElementById('demo-presentation-eval')
      console.log('5초 후 버튼 상태 확인:')
      console.log('request-media 버튼:', requestMediaButton ? '존재' : '없음')
      console.log('demo-presentation-eval 버튼:', demoButton ? '존재' : '없음')
    }, 5000)
  }

  setupEventListeners() {
    console.log('setupEventListeners 시작')
    
    // 고객 선택
    document.getElementById('customer-select')?.addEventListener('change', (e) => {
      console.log('고객 선택됨:', e.target.value)
      this.selectCustomer(e.target.value)
    })

    // 미디어 요청
    const requestMediaButton = document.getElementById('request-media')
    if (requestMediaButton) {
      console.log('request-media 버튼 발견됨')
      requestMediaButton.addEventListener('click', () => {
        console.log('request-media 버튼 클릭됨')
        this.requestMediaAccess()
      })
    } else {
      console.error('request-media 버튼을 찾을 수 없습니다')
    }

    // 녹화 컨트롤
    document.getElementById('start-recording')?.addEventListener('click', () => {
      this.startRecording()
    })

    document.getElementById('stop-recording')?.addEventListener('click', () => {
      this.stopRecording()
    })

    // 데모 평가
    document.getElementById('demo-presentation-eval')?.addEventListener('click', () => {
      this.runDemoEvaluation()
    })

    // 추가 데모 평가 버튼
    document.getElementById('demo-presentation-eval-alt')?.addEventListener('click', () => {
      this.runDemoEvaluation()
    })
  }

  async loadCustomers() {
    try {
      if (typeof axios === 'undefined') {
        throw new Error('Axios가 로드되지 않았습니다.')
      }
      
      const response = await axios.get('/api/customers')
      
      if (response.data.success) {
        const select = document.getElementById('customer-select')
        const customers = response.data.data

        customers.forEach(customer => {
          const option = document.createElement('option')
          option.value = customer.id
          option.textContent = `${customer.name} (${customer.company_name})`
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
      alert('고객 목록을 불러오는 중 오류가 발생했습니다: ' + error.message)
    }
  }

  selectCustomer(customerId) {
    if (!customerId) {
      this.selectedCustomer = null
      return
    }

    const select = document.getElementById('customer-select')
    const selectedOption = select.options[select.selectedIndex]
    
    this.selectedCustomer = {
      id: customerId,
      name: selectedOption.textContent
    }
  }

  async requestMediaAccess() {
    let helpMessageTimeout = null
    
    try {
      console.log('미디어 접근 요청 시작')
      this.showLoading('카메라와 마이크 권한 요청 중...<br><br>🔒 <strong>브라우저 상단에 권한 팝업이 나타나면 "허용"을 클릭해주세요</strong>')

      // 브라우저 지원 체크
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('이 브라우저는 WebRTC 미디어 접근을 지원하지 않습니다. Chrome 브라우저를 사용해주세요.')
      }

      console.log('getUserMedia 호출 - 권한 요청')
      
      // 3초 후 추가 안내 메시지 (권한이 허용되면 취소됨)
      helpMessageTimeout = setTimeout(() => {
        // 로딩 상태인 경우에만 업데이트
        const loadingOverlay = document.getElementById('loading-overlay')
        if (loadingOverlay) {
          this.showLoading('브라우저 권한 대기 중...<br><br>📋 <strong>팝업이 보이지 않으면:</strong><br>1. 브라우저 주소창 옆 카메라 아이콘 클릭<br>2. "허용"으로 설정 변경<br>3. 페이지 새로고침')
        }
      }, 3000)
      
      // 미디어 스트림 요청
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })
      
      // 권한 허용 성공 시 타이머 취소
      clearTimeout(helpMessageTimeout)
      console.log('미디어 스트림 획득 성공:', stream)

      // 미디어 연결 중 단계
      this.showLoading('미디어 연결 중...<br><br>⚡ 카메라와 마이크에 연결하고 있습니다.')
      
      this.mediaStream = stream
      
      // 비디오 프리뷰 설정
      const videoPreview = document.getElementById('preview-video')
      videoPreview.srcObject = stream

      // 오디오 분석 설정
      this.setupAudioAnalysis(stream)

      // UI 업데이트
      console.log('UI 업데이트 시작')
      const mediaSetup = document.getElementById('media-setup')
      const videoPreviewSection = document.getElementById('video-preview')
      
      console.log('media-setup 요소:', mediaSetup)
      console.log('video-preview 요소:', videoPreviewSection)
      
      if (mediaSetup) {
        mediaSetup.classList.add('hidden')
        console.log('media-setup 숨김 처리 완료')
      }
      
      if (videoPreviewSection) {
        videoPreviewSection.classList.remove('hidden')
        console.log('video-preview 표시 처리 완료')
      }

      this.hideLoading()
      this.showSuccessMessage('✅ 카메라와 마이크 연결 성공!<br><br>🎯 이제 "녹화 시작" 버튼을 클릭하여 발표를 시작하세요.<br>📝 실시간 STT로 음성이 텍스트로 변환됩니다.')

    } catch (error) {
      // 에러 발생 시에도 타이머 정리
      if (helpMessageTimeout) {
        clearTimeout(helpMessageTimeout)
      }
      
      console.error('미디어 접근 오류:', error)
      this.hideLoading()
      
      let errorMessage = '카메라와 마이크 접근에 실패했습니다.'
      let suggestion = '아래 "데모 평가 실행" 버튼으로 동일한 AI 평가를 체험해보세요!'
      
      if (error.name === 'NotAllowedError') {
        errorMessage = '카메라와 마이크 권한이 거부되었습니다.'
      } else if (error.name === 'NotFoundError') {
        errorMessage = '카메라 또는 마이크를 찾을 수 없습니다.'
      } else if (error.name === 'NotReadableError') {
        errorMessage = '미디어 장치가 사용 중입니다.'
      }
      
      alert(`${errorMessage}\n\n💡 해결방법:\n1. 브라우저 새로고침 후 권한 "허용" 클릭\n2. Chrome 브라우저 사용 (권장)\n3. ${suggestion}`)
    }
  }

  setupAudioAnalysis(stream) {
    try {
      // Web Audio API 설정
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const source = this.audioContext.createMediaStreamSource(stream)
      this.audioAnalyser = this.audioContext.createAnalyser()
      
      this.audioAnalyser.fftSize = 256
      const bufferLength = this.audioAnalyser.frequencyBinCount
      this.audioDataArray = new Uint8Array(bufferLength)
      
      source.connect(this.audioAnalyser)
      
      // 오디오 레벨 시각화 시작
      this.updateAudioLevel()
      
    } catch (error) {
      console.error('오디오 분석 설정 오류:', error)
    }
  }

  updateAudioLevel() {
    if (!this.audioAnalyser) return
    
    this.audioAnalyser.getByteFrequencyData(this.audioDataArray)
    
    // 평균 오디오 레벨 계산
    let sum = 0
    for (let i = 0; i < this.audioDataArray.length; i++) {
      sum += this.audioDataArray[i]
    }
    const average = sum / this.audioDataArray.length
    
    // 레벨 바 업데이트 (0-100%)
    const level = Math.min(100, (average / 128) * 100)
    const audioLevelBar = document.getElementById('audio-level')
    if (audioLevelBar) {
      audioLevelBar.style.width = level + '%'
      
      // 색상 변경 (낮음: 빨강, 중간: 노랑, 높음: 초록)
      if (level < 20) {
        audioLevelBar.style.background = 'var(--pwc-error)'
      } else if (level < 50) {
        audioLevelBar.style.background = 'var(--pwc-warning)'
      } else {
        audioLevelBar.style.background = 'var(--pwc-success)'
      }
    }
    
    // 애니메이션 계속 실행
    this.animationId = requestAnimationFrame(() => this.updateAudioLevel())
  }

  setupSpeechRecognition() {
    // Web Speech API 설정
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      console.log('Web Speech API 사용 가능')
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      this.recognition = new SpeechRecognition()
      
      this.recognition.continuous = true
      this.recognition.interimResults = true
      this.recognition.lang = 'ko-KR'
      
      this.recognition.onresult = (event) => {
        let finalTranscript = ''
        let interimTranscript = ''
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' '
            this.analyzeSpeech(transcript)
          } else {
            interimTranscript += transcript
          }
        }
        
        this.sttText += finalTranscript
        this.updateSTTDisplay(this.sttText + interimTranscript)
      }
      
      this.recognition.onerror = (event) => {
        console.error('STT 오류:', event.error)
        if (event.error === 'not-allowed') {
          alert('마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크 접근을 허용해주세요.')
        } else if (event.error === 'no-speech') {
          console.log('음성이 감지되지 않았습니다.')
        } else if (event.error === 'network') {
          console.error('네트워크 오류로 음성 인식에 실패했습니다.')
        }
      }
      
      this.recognition.onstart = () => {
        console.log('음성 인식이 시작되었습니다.')
      }
      
      this.recognition.onend = () => {
        console.log('음성 인식이 종료되었습니다.')
      }
    } else {
      console.warn('Web Speech API가 지원되지 않습니다.')
      alert('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome, Safari, Edge를 사용해주세요.')
    }
  }

  analyzeSpeech(transcript) {
    // 단어 수 계산
    const words = transcript.trim().split(/\s+/).filter(word => word.length > 0)
    this.speechMetrics.wordCount += words.length
    
    // 군더더기어 탐지 (한국어)
    const fillerWords = ['음', '어', '그', '뭐', '저기', '이제', '그래서', '아', '네']
    words.forEach(word => {
      if (fillerWords.includes(word)) {
        this.speechMetrics.fillerCount++
      }
    })
    
    // 휴지 감지 (간단한 방법: 문장 끝 기호 기준)
    if (transcript.match(/[.!?]/)) {
      this.speechMetrics.pauseCount++
    }
    
    this.updateSpeechMetrics()
  }

  updateSTTDisplay(text) {
    const sttTextElement = document.getElementById('stt-text')
    if (sttTextElement) {
      const displayText = text || '음성을 인식하고 있습니다...'
      
      // 실시간 타이핑 효과
      sttTextElement.style.background = 'linear-gradient(90deg, var(--pwc-orange), var(--pwc-blue))'
      sttTextElement.style.backgroundSize = '200% 100%'
      sttTextElement.style.animation = 'gradient 2s ease infinite'
      sttTextElement.style.backgroundClip = 'text'
      sttTextElement.style.webkitBackgroundClip = 'text'
      sttTextElement.style.color = 'transparent'
      
      setTimeout(() => {
        sttTextElement.style.background = 'none'
        sttTextElement.style.color = 'var(--pwc-navy)'
        sttTextElement.style.animation = 'none'
      }, 1000)
      
      sttTextElement.textContent = displayText
      
      // STT 섹션이 숨겨져 있다면 표시
      const sttSection = document.getElementById('stt-section')
      if (sttSection && sttSection.classList.contains('hidden')) {
        sttSection.classList.remove('hidden')
        sttSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
  }

  updateSpeechMetrics() {
    if (!this.speechMetrics.startTime) return
    
    const elapsedMinutes = (Date.now() - this.speechMetrics.startTime) / (1000 * 60)
    const wpm = Math.round(this.speechMetrics.wordCount / elapsedMinutes) || 0
    const pausesPerMinute = Math.round(this.speechMetrics.pauseCount / elapsedMinutes) || 0
    
    document.getElementById('speech-speed').textContent = wpm + ' WPM'
    document.getElementById('pause-frequency').textContent = pausesPerMinute + ' 회/분'
    document.getElementById('filler-words').textContent = this.speechMetrics.fillerCount + ' 개'
  }

  startRecording() {
    console.log('녹화 시작 시도')
    if (!this.mediaStream) {
      console.error('미디어 스트림이 없습니다.')
      alert('먼저 카메라와 마이크를 연결해주세요.')
      return
    }
    
    console.log('미디어 스트림 상태:', this.mediaStream.active)

    try {
      // MediaRecorder 설정 - 브라우저 호환성 체크
      let mimeType = 'video/webm;codecs=vp9,opus'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8,opus'
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm'
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = '' // 기본값 사용
          }
        }
      }
      
      console.log('사용할 mimeType:', mimeType)
      this.mediaRecorder = new MediaRecorder(this.mediaStream, 
        mimeType ? { mimeType: mimeType } : undefined
      )
      
      console.log('MediaRecorder 생성 성공:', this.mediaRecorder.state)
      this.recordedChunks = []
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data)
        }
      }
      
      this.mediaRecorder.onstop = () => {
        this.processRecording()
      }
      
      // 녹화 시작
      console.log('MediaRecorder 시작')
      this.mediaRecorder.start(1000) // 1초마다 데이터 수집
      this.isRecording = true
      this.recordingStartTime = Date.now()
      this.speechMetrics.startTime = Date.now()
      
      console.log('녹화 시작됨 - 상태:', this.mediaRecorder.state)
      
      // STT 시작
      if (this.recognition) {
        console.log('STT 시작')
        this.sttText = ''
        try {
          this.recognition.start()
        } catch (error) {
          console.error('STT 시작 오류:', error)
        }
      } else {
        console.warn('STT가 설정되지 않았습니다.')
      }
      
      // UI 업데이트
      console.log('녹화 시작 - UI 업데이트')
      document.getElementById('start-recording')?.classList.add('hidden')
      document.getElementById('stop-recording')?.classList.remove('hidden')
      document.getElementById('recording-indicator')?.classList.remove('hidden')
      document.getElementById('recording-timer')?.classList.remove('hidden')
      document.getElementById('stt-section')?.classList.remove('hidden')
      console.log('녹화 UI 업데이트 완료')
      
      // 타이머 시작
      this.startTimer()
      
      this.showSuccessMessage('녹화가 시작되었습니다!')
      
    } catch (error) {
      console.error('녹화 시작 오류:', error)
      alert('녹화 시작에 실패했습니다: ' + error.message)
    }
  }

  stopRecording() {
    if (!this.mediaRecorder || !this.isRecording) return
    
    try {
      // 녹화 중지
      this.mediaRecorder.stop()
      this.isRecording = false
      
      // STT 중지
      if (this.recognition) {
        this.recognition.stop()
      }
      
      // 타이머 중지
      if (this.timerInterval) {
        clearInterval(this.timerInterval)
      }
      
      // UI 업데이트
      console.log('녹화 중지 - UI 업데이트')
      document.getElementById('start-recording')?.classList.remove('hidden')
      document.getElementById('stop-recording')?.classList.add('hidden')
      document.getElementById('recording-indicator')?.classList.add('hidden')
      console.log('녹화 중지 UI 업데이트 완료')
      
      this.showSuccessMessage('녹화가 완료되었습니다!')
      
    } catch (error) {
      console.error('녹화 중지 오류:', error)
      alert('녹화 중지 중 오류가 발생했습니다: ' + error.message)
    }
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      if (!this.recordingStartTime) return
      
      const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000)
      const minutes = Math.floor(elapsed / 60)
      const seconds = elapsed % 60
      
      const timerDisplay = document.getElementById('timer-display')
      if (timerDisplay) {
        timerDisplay.textContent = 
          `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      }
    }, 1000)
  }

  async processRecording() {
    try {
      this.showLoading('녹화된 발표를 분석 중...')
      
      // 녹화 데이터 처리
      const blob = new Blob(this.recordedChunks, { type: 'video/webm' })
      const recordingUrl = URL.createObjectURL(blob)
      
      // 실제 평가 실행 (또는 데모)
      await this.evaluatePresentation(blob)
      
    } catch (error) {
      console.error('녹화 처리 오류:', error)
      alert('녹화 분석 중 오류가 발생했습니다: ' + error.message)
    } finally {
      this.hideLoading()
    }
  }

  async evaluatePresentation(recordingBlob) {
    if (!this.selectedCustomer) {
      alert('AI 가상고객을 먼저 선택해주세요.')
      return
    }

    try {
      // 데모 발표 평가 API 호출
      const response = await axios.post('/api/demo/presentation-evaluation', {
        customer_id: this.selectedCustomer.id,
        presentation_title: document.getElementById('presentation-title').value || '금호석유화학 DX 플랫폼 구축 제안',
        transcript_text: this.sttText,
        speech_metrics: this.speechMetrics
      })

      if (response.data.success) {
        this.displayEvaluationResults(response.data.data)
      }

    } catch (error) {
      console.error('발표 평가 오류:', error)
      alert('발표 평가 중 오류가 발생했습니다: ' + error.message)
    }
  }

  async runDemoEvaluation() {
    try {
      this.showLoading('데모 발표 평가를 실행 중...')
      
      // 데모 데이터로 STT 텍스트 설정
      const demoSTTText = "안녕하십니까, PwC 컨설팅의 발표를 시작하겠습니다. 이번 제안의 핵심은 ERP, MES, ESG 시스템을 하나의 플랫폼으로 통합하는 것입니다. 이를 통해 금호석유화학은 글로벌 ESG 규제에 선제적으로 대응하고, 공정 데이터를 경영 의사결정에 직접 연결할 수 있습니다. 또한, 저희는 화학 산업 프로젝트 경험과 글로벌 ESG 대응 노하우를 바탕으로, 안정적인 실행을 보장합니다. 마지막으로, 단계별 PoC를 통해 리스크를 최소화하고, 12개월 내 성공적인 플랫폼 구축을 완수하겠습니다. 감사합니다."
      this.sttText = demoSTTText
      
      // STT 섹션 표시 및 텍스트 업데이트
      document.getElementById('stt-section').classList.remove('hidden')
      this.updateSTTDisplay(this.sttText)
      
      // 데모 음성 메트릭 설정
      this.speechMetrics = {
        wordCount: 89,
        pauseCount: 6,
        fillerCount: 2,
        startTime: Date.now() - 180000, // 3분 전
        duration: 180,
        wordsPerMinute: 29.7,
        averageVolumeLevel: 0.75
      }
      this.updateSpeechMetrics()
      
      // 고객 선택 (없으면 첫 번째 고객 자동 선택)
      if (!this.selectedCustomer) {
        const select = document.getElementById('customer-select')
        if (select.options.length > 1) {
          select.selectedIndex = 1
          this.selectCustomer(select.value)
        }
      }
      
      // 발표 제목 설정
      const titleInput = document.getElementById('presentation-title')
      if (!titleInput.value) {
        titleInput.value = '금호석유화학 DX 플랫폼 구축 제안'
      }
      
      // 데모 평가 실행
      await this.evaluatePresentation(null)
      
    } catch (error) {
      console.error('데모 발표 평가 오류:', error)
      alert('데모 평가 중 오류가 발생했습니다: ' + error.message)
    } finally {
      this.hideLoading()
    }
  }

  displayEvaluationResults(evaluationData) {
    // 점수 표시 (100점 만점 직접 평가)
    document.getElementById('clarity-score').textContent = evaluationData.scores.clarity.score + '점'
    document.getElementById('expertise-score').textContent = evaluationData.scores.expertise.score + '점'
    document.getElementById('persuasiveness-score').textContent = evaluationData.scores.persuasiveness.score + '점'
    document.getElementById('logic-score').textContent = evaluationData.scores.logic.score + '점'
    document.getElementById('creativity-score').textContent = evaluationData.scores.creativity.score + '점'
    // Support both reliability and credibility for backward compatibility
    const reliabilityScore = evaluationData.scores.reliability || evaluationData.scores.credibility;
    document.getElementById('reliability-score').textContent = reliabilityScore.score + '점'
    
    // 총점 표시 (100점 만점)
    document.getElementById('total-score').textContent = Math.round(evaluationData.total_score) + '점'
    
    // 결과 섹션 표시
    document.getElementById('evaluation-results').classList.remove('hidden')
    document.getElementById('evaluation-results').scrollIntoView({ behavior: 'smooth' })
    
    this.showSuccessMessage('발표 평가가 완료되었습니다!')
  }

  // 정리 함수
  cleanup() {
    // 미디어 스트림 정리
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop())
    }
    
    // 오디오 컨텍스트 정리
    if (this.audioContext) {
      this.audioContext.close()
    }
    
    // 애니메이션 정리
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }
    
    // 타이머 정리
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
    }
  }

  showLoading(message = '처리 중...') {
    // 기존 로딩 오버레이 제거
    this.hideLoading()
    
    const overlay = document.createElement('div')
    overlay.id = 'loading-overlay'
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    `
    overlay.innerHTML = `
      <div style="
        background: var(--pwc-white);
        border-radius: var(--radius-lg);
        padding: var(--spacing-2xl);
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
        border: 3px solid var(--pwc-blue);
        max-width: 500px;
        width: 90%;
        text-align: center;
      ">
        <div style="margin-bottom: var(--spacing-xl);">
          <i class="fas fa-spinner fa-spin" style="color: var(--pwc-blue); font-size: 2rem; margin-bottom: var(--spacing-md);"></i>
          <div style="font-size: 1.125rem; font-weight: 600; color: var(--pwc-navy); line-height: 1.6; word-break: keep-all;">${message}</div>
        </div>
        <div style="width: 100%; height: 8px; background: var(--pwc-gray-200); border-radius: 4px; overflow: hidden;">
          <div style="height: 100%; background: linear-gradient(90deg, var(--pwc-blue), var(--pwc-orange)); border-radius: 4px; width: 70%; animation: pulse 1.5s ease-in-out infinite;"></div>
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

  showSuccessMessage(message) {
    const successDiv = document.createElement('div')
    successDiv.style.cssText = `
      position: fixed;
      top: var(--spacing-lg);
      right: var(--spacing-lg);
      background: linear-gradient(135deg, var(--pwc-success), var(--pwc-success-dark));
      color: var(--pwc-white);
      padding: var(--spacing-xl);
      border-radius: var(--radius-md);
      box-shadow: 0 10px 30px rgba(34, 197, 94, 0.3);
      z-index: 9999;
      transition: all 0.3s ease;
      border: 2px solid var(--pwc-success);
      max-width: 450px;
      word-break: keep-all;
      line-height: 1.5;
    `
    successDiv.innerHTML = `
      <div style="text-align: center;">
        <i class="fas fa-check-circle" style="font-size: 1.5rem; margin-bottom: var(--spacing-sm);"></i>
        <div style="font-weight: 600; font-size: 1rem;">${message}</div>
      </div>
    `
    
    document.body.appendChild(successDiv)
    
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

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', () => {
  if (window.presentationApp) {
    window.presentationApp.cleanup()
  }
})

// 디버깅을 위한 테스트 함수
window.testDemo = function() {
  console.log('테스트 함수 호출됨')
  if (window.presentationApp) {
    console.log('presentationApp 존재함')
    window.presentationApp.runDemoEvaluation()
  } else {
    console.error('presentationApp이 존재하지 않음')
  }
}

// 미디어 접근 테스트 함수 
window.testMediaAccess = function() {
  console.log('미디어 접근 테스트 시작')
  if (window.presentationApp) {
    console.log('presentationApp 존재함, 미디어 접근 시도')
    window.presentationApp.requestMediaAccess()
  } else {
    console.error('presentationApp이 존재하지 않음')
  }
}

// 20초 후 자동 테스트 (개발용)
setTimeout(() => {
  console.log('20초 경과 - 자동 데모 테스트 시도')
  if (window.location.search.includes('autotest=true')) {
    console.log('autotest 파라미터 감지됨, 데모 실행')
    window.testDemo()
  }
}, 20000)

// 앱 초기화
let presentationApp
document.addEventListener('DOMContentLoaded', () => {
  console.log('PresentationEvaluationApp 초기화 시작')
  try {
    presentationApp = new PresentationEvaluationApp()
    window.presentationApp = presentationApp
    console.log('PresentationEvaluationApp 초기화 완료')
  } catch (error) {
    console.error('PresentationEvaluationApp 초기화 오류:', error)
  }
})