// Railway 배포용 Node.js 서버
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'

// Railway PORT 환경변수 사용 (기본값: 3000)  
const port = parseInt(process.env.PORT) || 3000

console.log(`🚀 Starting RFP AI Simulator on port ${port}`)
console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`)

try {
  // 빌드된 앱 임포트 시도
  let app;
  
  try {
    // ES modules 방식 시도
    const module = await import('./dist/index.js')
    app = module.default || module
  } catch (importError) {
    console.error('Import error:', importError.message)
    
    // fallback: CommonJS 방식 시도  
    const module = require('./dist/index.js')
    app = module.default || module
  }

  if (!app || typeof app.fetch !== 'function') {
    throw new Error('Invalid app: missing fetch method')
  }

  console.log('✅ App imported successfully')

  // Railway 환경에서 정적 파일 서빙
  app.use('/static/*', serveStatic({ root: './public' }))
  app.use('/*', serveStatic({ 
    root: './public',
    onNotFound: (path, c) => {
      console.log(`Static file not found: ${path}`)
    }
  }))

  // 서버 시작
  const server = serve({
    fetch: app.fetch,
    port: port,
    hostname: '0.0.0.0'
  })

  console.log(`✅ Server running on http://0.0.0.0:${port}`)
  console.log(`🔗 Health check: http://localhost:${port}/api/health`)
  console.log(`🌐 Railway URL: ${process.env.RAILWAY_STATIC_URL || 'N/A'}`)
  
} catch (error) {
  console.error('❌ Server startup failed:', error.message)
  console.error('Stack:', error.stack)
  process.exit(1)
}