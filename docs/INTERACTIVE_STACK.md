# Camada interativa da AulaCSharp

## Tecnologias

- Rive: Nyx e pets controlados por máquinas de estados.
- Phaser 3: minijogos 2D com Canvas/WebGL e física Matter integrada.
- Howler.js: música, efeitos e sprites de áudio.
- Supabase Realtime: presença e eventos do futuro Nyx Quiz Live.
- GSAP: já existente no projeto para transições da interface.

## Variáveis da Vercel

O navegador pode receber somente a chave pública `anon`:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
```

Nunca use `SUPABASE_SERVICE_KEY` ou `SUPABASE_SERVICE_ROLE_KEY` no frontend.

## Recursos ainda necessários

Adicione arquivos Rive aprovados em `public/rive/` e áudios licenciados em
`public/audio/`. Os componentes possuem fallback, portanto o deploy continua
funcionando enquanto esses recursos não forem adicionados.

## Segurança do quiz

Broadcasts do Realtime servem para sincronizar a interface, não para calcular
nota. Respostas e pontuação autoritativa devem continuar validadas por uma API
server-side antes de serem gravadas.
