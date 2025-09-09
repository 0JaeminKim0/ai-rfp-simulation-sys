import { defineConfig } from 'vite'
import pages from '@hono/vite-cloudflare-pages'
import { build } from '@hono/vite-build'

const isRailwayBuild = process.env.RAILWAY || process.env.RAILWAY_ENVIRONMENT

export default defineConfig({
  plugins: isRailwayBuild 
    ? [build()] // Railway: Node.js 호환 빌드
    : [pages()], // Cloudflare: Workers 빌드
  build: {
    outDir: 'dist',
    target: isRailwayBuild ? 'node18' : 'esnext',
    rollupOptions: isRailwayBuild ? {
      // Railway: Node.js 환경용 설정
      external: ['@hono/node-server'],
    } : undefined
  }
})
