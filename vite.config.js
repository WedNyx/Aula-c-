import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // separa o React e as bibliotecas de avatar (@dicebear) do resto do app: como elas
        // quase nunca mudam, o navegador consegue guardar esses pedaços em cache entre uma
        // publicação e outra — só o código do app em si precisa ser baixado de novo
        manualChunks: {
          vendor: ['react', 'react-dom'],
          avatar: ['@dicebear/core', '@dicebear/collection'],
          gsap: ['gsap'],
          confetti: ['canvas-confetti'],
        },
      },
    },
  },
})
