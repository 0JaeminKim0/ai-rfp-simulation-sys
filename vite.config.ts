import { defineConfig } from 'vite'
import pages from '@hono/vite-cloudflare-pages'

const isRailwayBuild = process.env.RAILWAY || process.env.RAILWAY_ENVIRONMENT

export default defineConfig({
  plugins: isRailwayBuild 
    ? [] // Railway: 기본 Vite 빌드 (Node.js 호환)
    : [pages()], // Cloudflare: Workers 빌드
  build: {
    outDir: 'dist',
    target: isRailwayBuild ? 'node18' : 'esnext',
    lib: isRailwayBuild ? {
      entry: 'src/index.tsx',
      formats: ['es'],
      fileName: 'index'
    } : undefined,
    rollupOptions: isRailwayBuild ? {
      // Railway: Node.js 환경용 설정
      external: ['@hono/node-server', '@hono/node-server/serve-static'],
      output: {
        format: 'es'
      }
    } : undefined
  }
})
