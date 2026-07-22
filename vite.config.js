import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'Aula de C#',
        short_name: 'Aula de C#',
        description: 'Plataforma da aula de programação com o Nyx',
        theme_color: '#5b21b6',
        background_color: '#1a1033',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // não guarda em cache as chamadas de API: o app é online por natureza (turma ao vivo),
        // cachear /api/* faria o aluno ver dados velhos ou travar em telas antigas
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
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
