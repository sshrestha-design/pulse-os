import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Split hls.js and lucide-react into separate chunks
            if (id.includes('hls.js')) return 'hls';
            if (id.includes('lucide-react')) return 'icons';
            return 'vendor'; // everything else in vendor
          }
        }
      }
    }
  }
})