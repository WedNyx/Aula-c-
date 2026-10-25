# Migração segura do Supabase para Firebase

A plataforma suporta o Cloud Firestore como banco principal sem expor a conta de serviço ao navegador. A mudança é feita em duas etapas para evitar perda de dados.

## 1. Criar o Firestore

1. Abra o Firebase Console e crie ou selecione o projeto.
2. Entre em **Firestore Database** e crie o banco em modo de produção.
3. Em **Configurações do projeto → Contas de serviço**, gere uma nova chave privada.
4. Guarde o JSON com segurança. Ele concede acesso administrativo e nunca deve ser colocado no código ou enviado ao navegador.

## 2. Configurar a Vercel sem trocar o banco ainda

Adicione em Production e Preview:

- `FIREBASE_SERVICE_ACCOUNT_JSON`: JSON completo em uma linha ou convertido para Base64.
- `FIREBASE_DATABASE_ID`: `(default)`.
- `FIREBASE_COLLECTION`: `kv_store`.
- `DATABASE_PRIMARY`: `supabase`.

Faça um novo deploy. Nesse momento a plataforma continua usando o Supabase normalmente.

## 3. Copiar os dados

No Painel do Professor, abra **Conexão** e clique em **Copiar dados do Supabase para o Firebase**.

A operação:

- exige a senha do professor;
- lê o Supabase em páginas de 1.000 registros;
- grava o Firestore em lotes de 400;
- pode ser repetida com segurança antes da troca;
- não apaga o Supabase.

Confirme a mensagem com a quantidade copiada.

## 4. Ativar o Firebase

Na Vercel, altere `DATABASE_PRIMARY` para `firebase` e faça outro deploy. Use **Verificar agora** no Painel do Professor. O cartão deve mostrar **Firebase conectado**.

## Reversão

Para voltar temporariamente ao Supabase, altere `DATABASE_PRIMARY` para `supabase` e faça um novo deploy. Os registros antigos continuam preservados. Alterações feitas depois da troca para Firebase precisam ser migradas de volta manualmente antes de uma reversão definitiva.

## Arquitetura

- Firebase/Firestore: banco principal após a ativação.
- Upstash Redis: reserva automática e sincronizada.
- Supabase: fonte temporária da migração e possibilidade de reversão durante a transição.
