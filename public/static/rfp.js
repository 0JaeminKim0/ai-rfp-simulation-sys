// RFP 등록·파싱 페이지 관리자

class RfpManager {
    constructor() {
        this.uploadedFiles = new Map();
        this.currentStep = 1;
        this.maxFileSize = 50 * 1024 * 1024; // 50MB
        this.allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateStepDisplay();
    }

    setupEventListeners() {
        const fileInput = document.getElementById('file-input');
        const dropZone = document.getElementById('drop-zone');
        const analyzeBtn = document.getElementById('analyze-btn');
        const updatePersonasBtn = document.getElementById('update-personas-btn');

        // 파일 선택 이벤트
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }

        // 드래그 앤 드롭 이벤트
        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
            dropZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            dropZone.addEventListener('drop', (e) => this.handleFileDrop(e));
        }

        // 분석 시작 버튼
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => this.startAnalysis());
        }

        // 페르소나 업데이트 버튼
        if (updatePersonasBtn) {
            updatePersonasBtn.addEventListener('click', () => this.updatePersonas());
        }
    }

    // 파일 선택 처리
    handleFileSelect(event) {
        const files = Array.from(event.target.files);
        this.processFiles(files);
    }

    // 드래그 오버 처리
    handleDragOver(event) {
        event.preventDefault();
        const dropZone = document.getElementById('drop-zone');
        dropZone.classList.add('drag-over');
    }

    // 드래그 리브 처리
    handleDragLeave(event) {
        event.preventDefault();
        const dropZone = document.getElementById('drop-zone');
        dropZone.classList.remove('drag-over');
    }

    // 파일 드롭 처리
    handleFileDrop(event) {
        event.preventDefault();
        const dropZone = document.getElementById('drop-zone');
        dropZone.classList.remove('drag-over');
        
        const files = Array.from(event.dataTransfer.files);
        this.processFiles(files);
    }

    // 파일 처리
    async processFiles(files) {
        for (const file of files) {
            if (!this.validateFile(file)) continue;
            
            try {
                await this.uploadFile(file);
            } catch (error) {
                console.error('파일 업로드 실패:', error);
                this.showError(`${file.name} 업로드에 실패했습니다: ${error.message}`);
            }
        }
    }

    // 파일 유효성 검사
    validateFile(file) {
        // 파일 크기 검사
        if (file.size > this.maxFileSize) {
            this.showError(`${file.name}: 파일 크기가 50MB를 초과합니다.`);
            return false;
        }

        // 파일 타입 검사
        if (!this.allowedTypes.includes(file.type)) {
            this.showError(`${file.name}: 지원되지 않는 파일 형식입니다.`);
            return false;
        }

        return true;
    }

    // 파일 업로드
    async uploadFile(file) {
        const progressElement = this.showUploadProgress(file.name);
        
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await axios.post('/api/rfp/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                onUploadProgress: (progressEvent) => {
                    const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    this.updateUploadProgress(percentage);
                }
            });

            if (response.data.success) {
                const fileData = response.data.data;
                this.uploadedFiles.set(fileData.rfp_id, {
                    ...fileData,
                    file: file,
                    status: 'uploaded'
                });

                this.hideUploadProgress();
                this.displayUploadedFile(fileData);
                this.updateAnalyzeButton();
                
                this.showSuccess(`${file.name}이 성공적으로 업로드되었습니다.`);
            } else {
                throw new Error(response.data.error || '업로드에 실패했습니다.');
            }
        } catch (error) {
            this.hideUploadProgress();
            throw error;
        }
    }

    // 업로드 진행률 표시
    showUploadProgress(filename) {
        const placeholder = document.getElementById('upload-placeholder');
        const progressDiv = document.getElementById('upload-progress');
        
        if (placeholder && progressDiv) {
            placeholder.classList.add('hidden');
            progressDiv.classList.remove('hidden');
            
            document.getElementById('progress-filename').textContent = filename;
            document.getElementById('progress-percentage').textContent = '0%';
            document.getElementById('progress-bar').style.width = '0%';
        }
    }

    // 업로드 진행률 업데이트
    updateUploadProgress(percentage) {
        const percentageElement = document.getElementById('progress-percentage');
        const progressBar = document.getElementById('progress-bar');
        
        if (percentageElement && progressBar) {
            percentageElement.textContent = `${percentage}%`;
            progressBar.style.width = `${percentage}%`;
        }
    }

    // 업로드 진행률 숨기기
    hideUploadProgress() {
        const placeholder = document.getElementById('upload-placeholder');
        const progressDiv = document.getElementById('upload-progress');
        
        if (placeholder && progressDiv) {
            setTimeout(() => {
                progressDiv.classList.add('hidden');
                placeholder.classList.remove('hidden');
            }, 1000);
        }
    }

    // 업로드된 파일 표시
    displayUploadedFile(fileData) {
        const uploadedFilesContainer = document.getElementById('uploaded-files');
        if (!uploadedFilesContainer) return;

        const fileElement = document.createElement('div');
        fileElement.className = 'uploaded-file-card fade-in-up';
        fileElement.id = `file-${fileData.rfp_id}`;

        const fileExtension = this.getFileExtension(fileData.filename);
        const fileIcon = this.getFileIcon(fileExtension);
        const fileSize = this.formatFileSize(fileData.size);

        fileElement.innerHTML = `
            <div class="file-info">
                <div class="file-icon ${fileExtension}">
                    <i class="fas ${fileIcon}"></i>
                </div>
                <div class="file-details">
                    <h4 title="${fileData.filename}">${fileData.filename}</h4>
                    <p>${fileSize} • ${fileExtension.toUpperCase()}</p>
                </div>
            </div>
            <div class="file-actions">
                <span class="status-badge uploaded">업로드됨</span>
                <button class="btn-delete" onclick="rfpManager.removeFile('${fileData.rfp_id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        uploadedFilesContainer.appendChild(fileElement);
    }

    // 파일 제거
    async removeFile(rfpId) {
        if (confirm('이 파일을 삭제하시겠습니까?')) {
            try {
                const response = await axios.delete(`/api/rfp/${rfpId}`);
                
                if (response.data.success) {
                    this.uploadedFiles.delete(rfpId);
                    const fileElement = document.getElementById(`file-${rfpId}`);
                    if (fileElement) {
                        fileElement.remove();
                    }
                    
                    this.updateAnalyzeButton();
                    this.showSuccess('파일이 삭제되었습니다.');
                } else {
                    throw new Error(response.data.error || '파일 삭제에 실패했습니다.');
                }
            } catch (error) {
                console.error('파일 삭제 실패:', error);
                this.showError('파일 삭제에 실패했습니다.');
            }
        }
    }

    // 분석 시작
    async startAnalysis() {
        if (this.uploadedFiles.size === 0) {
            this.showError('분석할 파일을 먼저 업로드해주세요.');
            return;
        }

        this.setStep(2);
        this.showLoading('RFP 분석 중...');

        try {
            const analysisPromises = Array.from(this.uploadedFiles.keys()).map(rfpId => 
                this.analyzeRfpFile(rfpId)
            );

            const results = await Promise.all(analysisPromises);
            
            // 분석 결과 통합
            const combinedAnalysis = this.combineAnalysisResults(results);
            
            this.hideLoading();
            this.displayAnalysisResults(combinedAnalysis);
            this.setStep(3);
            
            this.showSuccess('RFP 분석이 완료되었습니다.');
        } catch (error) {
            console.error('RFP 분석 실패:', error);
            this.hideLoading();
            this.showError('RFP 분석에 실패했습니다.');
        }
    }

    // 개별 RFP 파일 분석
    async analyzeRfpFile(rfpId) {
        const response = await axios.post(`/api/rfp/${rfpId}/analyze`);
        
        if (!response.data.success) {
            throw new Error(response.data.error || '분석에 실패했습니다.');
        }

        // 파일 상태 업데이트
        const fileData = this.uploadedFiles.get(rfpId);
        if (fileData) {
            fileData.status = 'analyzed';
            fileData.analysis = response.data.data.analysis;
            this.updateFileStatus(rfpId, 'analyzed');
        }

        return response.data.data.analysis;
    }

    // 분석 결과 통합
    combineAnalysisResults(results) {
        const combined = {
            kpi: [],
            evaluation_criteria: [],
            budget_governance: [],
            technical_requirements: [],
            strategic_themes: [],
            risks_regulations: []
        };

        results.forEach(result => {
            Object.keys(combined).forEach(key => {
                if (result[key] && Array.isArray(result[key])) {
                    combined[key].push(...result[key]);
                }
            });
        });

        // 중복 제거
        Object.keys(combined).forEach(key => {
            combined[key] = [...new Set(combined[key])];
        });

        return combined;
    }

    // 분석 결과 표시
    displayAnalysisResults(analysis) {
        const resultsContainer = document.getElementById('analysis-results');
        if (!resultsContainer) return;

        // KPI 표시
        document.getElementById('extracted-kpi').innerHTML = 
            this.formatAnalysisItems(analysis.kpi);

        // 평가 기준 표시
        document.getElementById('extracted-criteria').innerHTML = 
            this.formatAnalysisItems(analysis.evaluation_criteria);

        // 예산·거버넌스 표시
        document.getElementById('extracted-budget').innerHTML = 
            this.formatAnalysisItems(analysis.budget_governance);

        // 기술 요건 표시
        document.getElementById('extracted-tech').innerHTML = 
            this.formatAnalysisItems(analysis.technical_requirements);

        resultsContainer.classList.remove('hidden');
        resultsContainer.classList.add('fade-in-up');

        // 페르소나 업데이트 버튼 표시
        const updateBtn = document.getElementById('update-personas-btn');
        if (updateBtn) {
            updateBtn.classList.remove('hidden');
        }
    }

    // 페르소나 업데이트
    async updatePersonas() {
        if (this.uploadedFiles.size === 0) {
            this.showError('업데이트할 RFP 분석 결과가 없습니다.');
            return;
        }

        this.showLoading('페르소나 업데이트 중...');

        try {
            const updatePromises = Array.from(this.uploadedFiles.keys()).map(rfpId => 
                axios.post(`/api/rfp/${rfpId}/update-personas`)
            );

            const results = await Promise.all(updatePromises);
            
            let totalUpdated = 0;
            const updateDetails = [];

            results.forEach(response => {
                if (response.data.success) {
                    totalUpdated += response.data.data.updated_personas;
                    updateDetails.push(...response.data.data.details);
                }
            });

            this.hideLoading();
            this.displayPersonaUpdateResults(totalUpdated, updateDetails);
            this.setStep(4);
            
            this.showSuccess(`${totalUpdated}개의 페르소나가 성공적으로 업데이트되었습니다.`);
        } catch (error) {
            console.error('페르소나 업데이트 실패:', error);
            this.hideLoading();
            this.showError('페르소나 업데이트에 실패했습니다.');
        }
    }

    // 페르소나 업데이트 결과 표시
    displayPersonaUpdateResults(totalUpdated, details) {
        const updatesContainer = document.getElementById('persona-updates');
        if (!updatesContainer) return;

        const updatesHtml = details.map(detail => `
            <div class="persona-update-item">
                <span class="persona-name">${detail.persona_name}</span>
                <span class="updated-fields">${detail.updated_fields.join(', ')}</span>
            </div>
        `).join('');

        updatesContainer.innerHTML = `
            <p class="mb-3 font-medium">총 ${totalUpdated}개의 페르소나가 업데이트되었습니다.</p>
            <div class="persona-update-result">
                ${updatesHtml}
            </div>
        `;
    }

    // 단계 설정
    setStep(step) {
        this.currentStep = step;
        this.updateStepDisplay();
    }

    // 단계 표시 업데이트
    updateStepDisplay() {
        for (let i = 1; i <= 4; i++) {
            const stepElement = document.getElementById(`step-${i}`);
            const lineElement = document.getElementById(`line-${i}`);
            
            if (stepElement) {
                stepElement.classList.remove('active', 'completed');
                
                if (i < this.currentStep) {
                    stepElement.classList.add('completed');
                } else if (i === this.currentStep) {
                    stepElement.classList.add('active');
                }
            }
            
            if (lineElement) {
                lineElement.classList.remove('active', 'completed');
                
                if (i < this.currentStep) {
                    lineElement.classList.add('completed');
                } else if (i === this.currentStep) {
                    lineElement.classList.add('active');
                }
            }
        }
    }

    // 분석 버튼 상태 업데이트
    updateAnalyzeButton() {
        const analyzeBtn = document.getElementById('analyze-btn');
        if (!analyzeBtn) return;

        if (this.uploadedFiles.size > 0) {
            analyzeBtn.disabled = false;
            analyzeBtn.classList.remove('disabled:bg-gray-400', 'disabled:cursor-not-allowed');
        } else {
            analyzeBtn.disabled = true;
            analyzeBtn.classList.add('disabled:bg-gray-400', 'disabled:cursor-not-allowed');
        }
    }

    // 파일 상태 업데이트
    updateFileStatus(rfpId, status) {
        const fileElement = document.getElementById(`file-${rfpId}`);
        if (!fileElement) return;

        const statusBadge = fileElement.querySelector('.status-badge');
        if (statusBadge) {
            statusBadge.className = `status-badge ${status}`;
            
            const statusTexts = {
                'uploaded': '업로드됨',
                'analyzing': '분석 중',
                'analyzed': '분석됨',
                'failed': '실패',
                'completed': '완료'
            };
            
            statusBadge.textContent = statusTexts[status] || status;
        }
    }

    // 분석 항목 포맷팅
    formatAnalysisItems(items) {
        if (!items || items.length === 0) {
            return '<p class="text-gray-500 italic">추출된 항목이 없습니다.</p>';
        }

        return `<ul class="space-y-1">${items.map(item => 
            `<li class="flex items-start"><i class="fas fa-check-circle text-green-500 mr-2 mt-1 text-xs"></i><span>${item}</span></li>`
        ).join('')}</ul>`;
    }

    // 유틸리티 함수들
    getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    }

    getFileIcon(extension) {
        const icons = {
            'pdf': 'fa-file-pdf',
            'doc': 'fa-file-word',
            'docx': 'fa-file-word',
            'txt': 'fa-file-alt'
        };
        return icons[extension] || 'fa-file';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showLoading(message = '처리 중...') {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
            overlay.querySelector('span').textContent = message;
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        // 간단한 토스트 구현 (실제로는 더 정교한 라이브러리 사용 권장)
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-md alert ${type}`;
        toast.innerHTML = `
            <div class="flex items-center">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'} mr-2"></i>
                <span>${message}</span>
                <button class="ml-4 text-lg" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 5000);
    }
}

// 전역 인스턴스
let rfpManager;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    rfpManager = new RfpManager();
});