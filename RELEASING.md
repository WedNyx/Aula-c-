# Atualizações da plataforma

Uma atualização publicada corresponde a uma versão. Não aumentar a versão a cada commit ou build.

- Correção sem recurso novo: aumentar o terceiro número (1.1.0 → 1.1.1).
- Recurso novo compatível: aumentar o segundo (1.1.0 → 1.2.0).
- Mudança incompatível: planejar migração e aumentar o primeiro.

Antes de publicar:

1. Atualizar `package.json` e a entrada raiz de `package-lock.json`.
2. Adicionar no início de `src/releases.js` a versão, data e mudanças realmente entregues. Não apagar o histórico.
3. Atualizar os tours quando menus ou fluxos mudarem.
4. Executar testes, typecheck e build; conferir a prévia com um cadastro fictício.
5. Abrir um único PR da atualização. Fazer merge somente após revisão.

O botão de versão e o aviso do Nyx Lunar leem a mesma versão. Cada aluno confirma as novidades uma vez por versão.
