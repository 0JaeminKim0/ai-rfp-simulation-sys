import { defineConfig } from 'vite'

const isRailwayBuild = process.env.RAILWAY || process.env.RAILWAY_ENVIRONMENT

export default defineConfig({
  build: {
    outDir: 'dist',
    target: 'es2020',
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
    target: 'es2020',
    charset: 'utf8'
  }
})