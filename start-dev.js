#!/usr/bin/env node

// 개발용 서버 시작 스크립트
import { serve } from '@hono/node-server'

console.log('🚀 개발 서버 시작 중...')

try {
  // TypeScript 파일 직접 import
  const { default: app } = await import('./src/index.tsx')
  
  if (!app || typeof app.fetch !== 'function') {
    throw new Error('Invalid app: missing fetch method')
  }

  console.log('✅ App imported successfully')

  // 서버 시작
  serve({
    fetch: app.fetch,
    port: 3000,
    hostname: '0.0.0.0'
  })

  console.log('✅ 개발 서버 실행 중 - http://localhost:3000')
  console.log('🔗 Health check: http://localhost:3000/api/health')
  
} catch (error) {
  console.error('❌ 서버 시작 실패:', error.message)
  console.error('Stack:', error.stack)
  process.exit(1)
}