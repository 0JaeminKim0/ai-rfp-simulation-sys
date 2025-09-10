import { defineConfig } from 'vite'

const isRailwayBuild = process.env.RAILWAY || process.env.RAILWAY_ENVIRONMENT

export default defineConfig({
  build: {
    outDir: 'dist',
    target: 'es2022', // top-level await 지원을 위해 es2022로 변경
    rollupOptions: {
      input: 'src/index.tsx',
      output: {
        format: 'es',
        entryFileNames: 'index.js'
      }
    },
    minify: 'esbuild',
    sourcemap: false
  },
  esbuild: {
    target: 'es2022', // top-level await 지원을 위해 es2022로 변경
    charset: 'utf8'
  }
})