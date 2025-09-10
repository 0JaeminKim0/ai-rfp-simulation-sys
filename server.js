// Railway 배포용 Node.js 서버 (tsx 사용)
import { register } from 'tsx/esm/api'

// TypeScript 지원 등록
register()

// Railway PORT 환경변수 사용 (기본값: 3000)  
const port = parseInt(process.env.PORT) || 3000

console.log(`🚀 Starting RFP AI Simulator on port ${port}`)
console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`)
console.log(`🌐 Railway Environment: ${process.env.RAILWAY_ENVIRONMENT_NAME || 'N/A'}`)
console.log(`🔗 Railway Public URL: ${process.env.RAILWAY_PUBLIC_DOMAIN || 'N/A'}`)
console.log(`🆔 Railway Service ID: ${process.env.RAILWAY_SERVICE_ID || 'N/A'}`)
console.log(`🔑 OpenAI API Key: ${process.env.OPENAI_API_KEY ? '✅ 설정됨 (길이: ' + process.env.OPENAI_API_KEY.length + ')' : '❌ 미설정'}`)

try {
  console.log('📦 Importing TypeScript source with tsx...')
  
  // TypeScript 소스 직접 import
  const module = await import('./src/index.tsx')
  const app = module.default || module

  if (!app || typeof app.fetch !== 'function') {
    console.error('❌ App validation failed')
    console.error('App type:', typeof app)
    console.error('App keys:', app ? Object.keys(app) : 'null/undefined')
    console.error('Has fetch method:', app && typeof app.fetch === 'function')
    throw new Error('Invalid app: missing fetch method')
  }

  console.log('✅ App imported and validated successfully')
  console.log('🔧 App type:', typeof app)
  console.log('🔧 Has fetch method:', typeof app.fetch === 'function')

  // Hono 앱을 Node.js 서버로 실행
  const { serve } = await import('@hono/node-server')
  const { serveStatic } = await import('@hono/node-server/serve-static')
  
  // Railway 환경에서 정적 파일 서빙 (앱에 추가)
  app.use('/static/*', serveStatic({ root: './public' }))
  app.use('/*', serveStatic({ 
    root: './public',
    onNotFound: (path, c) => {
      console.log(`Static file not found: ${path}`)
    }
  }))

  console.log('✅ Static file serving configured')

  // 서버 시작
  const server = serve({
    fetch: app.fetch,
    port: port,
    hostname: '0.0.0.0'
  })

  console.log(`✅ Server running on http://0.0.0.0:${port}`)
  console.log(`🔗 Health check: http://localhost:${port}/health`)
  console.log(`🔗 API Health check: http://localhost:${port}/api/health`)
  console.log(`🌐 Railway URL: ${process.env.RAILWAY_STATIC_URL || 'N/A'}`)
  
} catch (error) {
  console.error('❌ Server startup failed:', error.message)
  console.error('📋 Error details:', {
    name: error.name,
    message: error.message,
    stack: error.stack?.split('\n').slice(0, 5).join('\n')
  })
  process.exit(1)
}