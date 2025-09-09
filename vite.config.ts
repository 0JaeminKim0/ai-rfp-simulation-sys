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
    rollupOptions: isRailwayBuild ? {
      // Railway: Node.js 환경용 설정
      external: ['@hono/node-server', 'hono'],
      input: 'src/index.tsx',
      output: {
        format: 'es',
        entryFileNames: '[name].js'
      }
    } : undefined
  }
})
