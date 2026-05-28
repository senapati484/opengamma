import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist-electron/main',
      rollupOptions: {
        external: [
          'onnxruntime-node',
          '@huggingface/transformers',
          '@xenova/transformers',
          'kokoro-js',
          'better-sqlite3'
        ]
      }
    },
    ssr: {
      external: [
        'onnxruntime-node',
        '@huggingface/transformers',
        '@xenova/transformers',
        'kokoro-js',
        'better-sqlite3'
      ]
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist-electron/preload'
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react()],
    build: {
      outDir: 'dist'
    },
    optimizeDeps: {
      exclude: ['reveal.js']
    },
    assetsInclude: ['**/*.md']
  }
})
