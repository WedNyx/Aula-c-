# Banco de reserva

A API usa o Supabase como banco principal e o Upstash Redis como reserva independente.

## Configuração na Vercel

Mantenha as variáveis atuais do Supabase e conecte um banco **Upstash Redis** ao mesmo projeto. A integração deve criar:

- `KV_REST_API_URL` (ou `UPSTASH_REDIS_REST_URL`)
- `KV_REST_API_TOKEN` (ou `UPSTASH_REDIS_REST_TOKEN`)

Depois de publicar novamente, a primeira chamada da API copia o conteúdo atual do Supabase para o Redis. Até essa cópia terminar, a API nunca trata uma reserva vazia como válida.

## Comportamento

- Com os dois bancos disponíveis, toda escrita no Supabase é espelhada no Redis.
- Se o Supabase falhar, leituras e escritas passam automaticamente para o Redis.
- Alterações feitas durante a falha recebem uma marca de reconciliação.
- Quando o Supabase voltar, essas alterações são sincronizadas antes das leituras normais.
- Exclusões usam tombstones, evitando que registros apagados reapareçam após a recuperação.
- Se apenas um banco estiver configurado, a API continua operando no modo simples anterior.

## Verificação

O `POST /api/kv` com `{ "action": "check" }` informa:

- `failoverReady`: a reserva está configurada;
- `primary` e `replica`: bancos ativos;
- `pendingSync`: quantidade de chaves aguardando reconciliação;
- `lastPrimaryFailureAt` e `lastReplicaFailureAt`: última falha observada nesta instância.

O professor pode forçar uma cópia e reconciliação enviando `POST /api/kv` com:

```json
{
  "action": "sync_replica",
  "auth": "SENHA_DO_PROFESSOR"
}
```

Nunca coloque os tokens do Supabase ou do Upstash no frontend. Eles devem existir apenas nas variáveis de ambiente da Vercel.
