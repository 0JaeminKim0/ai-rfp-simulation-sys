// 프로덕션 환경 최적화 설정

export const PRODUCTION_CONFIG = {
  // OpenAI API 설정
  openai: {
    timeout: 8000, // 8초 타임아웃
    maxRetries: 1, // 최소 재시도
    maxTokens: {
      deepResearch: 1500,
      rfpAnalysis: 1500,
      customerGeneration: 2000,
      evaluation: 2500
    },
    models: {
      fast: 'gpt-4o-mini', // 빠른 응답용
      standard: 'gpt-4o',  // 표준 품질
      fallback: 'gpt-3.5-turbo' // 백업용
    }
  },
  
  // 응답 시간 제한
  responseTimeouts: {
    deepResearch: 7000,   // 7초
    rfpAnalysis: 5000,    // 5초
    customerGeneration: 8000, // 8초
    evaluation: 6000      // 6초
  },
  
  // Cloudflare Workers 제한
  cloudflare: {
    cpuTimeLimit: 10000,  // 10초 CPU 시간 (무료)
    memoryLimit: 128,     // 128MB 메모리
    requestTimeout: 10000 // 10초 요청 타임아웃
  },
  
  // 성능 모니터링
  monitoring: {
    enablePerformanceLog: true,
    logSlowRequests: true,
    slowRequestThreshold: 5000 // 5초 이상
  },

  // Fallback 전략
  fallback: {
    enableFallbackData: true,
    useStreamingForLargeRequests: true,
    chunkSize: 1000 // 청크 크기
  }
}

// 환경 감지 유틸리티
export function isProductionEnvironment(): boolean {
  // Cloudflare Workers 환경 감지
  return typeof process === 'undefined' || 
         !process.env?.NODE_ENV ||
         typeof globalThis?.navigator !== 'undefined'
}

export function isWorkersUnbound(): boolean {
  // Workers Unbound 업그레이드 완료 - 강제 활성화
  if (typeof process === 'undefined' && 
      typeof globalThis?.navigator !== 'undefined') {
    console.log('🚀 Workers Unbound 30초 제한 활용 (업그레이드 완료)')
    return true // Workers Unbound 공식 업그레이드 완료
  }
  
  console.log('🔧 개발 환경 - 30초 제한 시뮬레이션')
  return true // 개발에서도 30초 로직 테스트
}

// Workers Unbound 최적화 설정
export const UNBOUND_CONFIG = {
  openai: {
    timeout: 25000, // 25초 타임아웃 (30초 제한 내)
    maxRetries: 2,
    maxTokens: {
      deepResearch: 4000,    // 더 상세한 분석
      rfpAnalysis: 4000,     // 더 정확한 RFP 분석  
      customerGeneration: 5000, // 더 풍부한 페르소나
      evaluation: 4000
    }
  },
  performance: {
    enableDetailedLogging: true,
    trackCPUTime: true,
    warnThreshold: 20000 // 20초 경고
  }
}

// 성능 모니터링 유틸리티
export class PerformanceMonitor {
  private startTime: number
  
  constructor(private operationName: string) {
    this.startTime = Date.now()
    if (PRODUCTION_CONFIG.monitoring.enablePerformanceLog) {
      console.log(`[PERF] ${operationName} 시작`)
    }
  }
  
  end(success: boolean = true): number {
    const duration = Date.now() - this.startTime
    
    if (PRODUCTION_CONFIG.monitoring.enablePerformanceLog) {
      const status = success ? 'SUCCESS' : 'FAILED'
      console.log(`[PERF] ${this.operationName} ${status} - ${duration}ms`)
      
      if (PRODUCTION_CONFIG.monitoring.logSlowRequests && 
          duration > PRODUCTION_CONFIG.monitoring.slowRequestThreshold) {
        console.warn(`[PERF] SLOW REQUEST: ${this.operationName} took ${duration}ms`)
      }
    }
    
    return duration
  }
}

// CPU 시간 추적 (근사치)
export class CPUTimeTracker {
  private operations: Array<{name: string, start: number, end?: number}> = []
  
  startOperation(name: string): void {
    this.operations.push({
      name,
      start: Date.now()
    })
  }
  
  endOperation(name: string): void {
    const op = this.operations.find(o => o.name === name && !o.end)
    if (op) {
      op.end = Date.now()
    }
  }
  
  getTotalCPUTime(): number {
    return this.operations
      .filter(op => op.end)
      .reduce((total, op) => total + (op.end! - op.start), 0)
  }
  
  isNearLimit(): boolean {
    return this.getTotalCPUTime() > (PRODUCTION_CONFIG.cloudflare.cpuTimeLimit * 0.8)
  }
}