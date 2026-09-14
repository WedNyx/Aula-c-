# APIs públicas gratuitas

Esta camada reúne serviços úteis para aulas de `HttpClient`, JSON, classes, listas e
requisições, sem colocar chaves privadas no navegador.

| Provedor | Uso na AulaCSharp | Chave |
| --- | --- | --- |
| Open-Meteo | clima e cenário do Santuário Lunar | não |
| REST Countries | países, bandeiras, idiomas e moedas | não |
| Wikipédia | resumos e pesquisa educacional | não |
| PokéAPI | exemplos de consumo de API | não |
| Open Trivia DB | perguntas gerais para protótipos de quiz | não |
| JSONPlaceholder | API simulada para exercícios | não |
| Sunrise-Sunset.org | manhã/noite e horários solares | não |
| Dog CEO API | imagens caninas em eventos e exercícios | não |

## Endpoint da Vercel

Todas as consultas passam por `GET /api/public-content`. Exemplos:

```text
/api/public-content?provider=weather&lat=-23.55&lon=-46.63&days=3
/api/public-content?provider=country&name=Brasil
/api/public-content?provider=wikipedia&q=linguagem%20C%20sharp
/api/public-content?provider=pokemon&id=pikachu
/api/public-content?provider=trivia&amount=5&difficulty=easy
/api/public-content?provider=placeholder&resource=posts&id=1
/api/public-content?provider=sun&lat=-23.55&lon=-46.63
/api/public-content?provider=dog
```

No frontend, importe `publicApis` de `src/lib/publicApis.js`.

## Proteções e limites

O servidor aceita apenas provedores predefinidos: o cliente nunca fornece uma URL externa.
Há validação de parâmetros, timeout de 8 segundos, limite de resposta de 1 MB, cache da
Vercel e limite de 60 consultas por minuto por IP. Cada provedor mantém seus próprios
termos, disponibilidade e limites. Preserve a atribuição devolvida no campo
`attribution`; o plano gratuito do Open-Meteo é destinado a uso não comercial e pede
atribuição, e o conteúdo da Open Trivia DB usa CC BY-SA 4.0.

APIs que exigem chave, cartão, plano pago ou aprovação (NASA, Giphy, Tenor, Mapbox,
Freesound, Pixabay e Unsplash, entre outras) não foram ativadas nesta fase.
