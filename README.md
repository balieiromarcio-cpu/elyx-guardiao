# Guardião Élyx

Hub único de marca e produtos da Élyx Nutrition: onde a marca e cada um dos 10 produtos são
descritos, versionados e distribuídos. Quando um fato muda, todo sistema recebe o mesmo fato,
na mesma hora — nenhum outro sistema digita fato, só lê.

Desenho de referência (o "porquê" e as regras completas): [Manual Élyx](https://claude.ai/code/artifact/4b36bf47-2003-4c78-8335-37701adb6136).

**Ao vivo:** https://elyx-guardiao.vercel.app (admin `elyxnutrition@gmail.com`, senha em `.env` → `ADMIN_PASSWORD`).

## A regra que organiza tudo

O rótulo aprovado é a verdade da fórmula. A Shopify é a verdade comercial (preço, estoque,
variantes — nunca editado aqui). O Guardião é a verdade da marca e a cópia oficial das duas
outras.

| Tipo de fato | Fonte | Como chega | Editável aqui? |
|---|---|---|---|
| Fórmula/rótulo | rótulo aprovado | foto/laudo + confirmação humana | sim, com aprovação e versão datada |
| Comercial | Shopify | webhook + reconciliação diária 6h | não — link "editar na Shopify" |
| Marca, voz, claims | Guardião | escrito por pessoas | sim |

## Telas

| Tela | O que faz |
|---|---|
| Visão geral | contadores, integrações, tarefas pendentes, últimas mudanças |
| Produtos | ficha de cada produto: espelho comercial, ficha vigente, propor/aprovar versão, claims, FAQ |
| Guia da marca | propósito, persona, tom de voz, vocabulário, termos proibidos, disclaimers |
| Tarefas de revisão | abertas sozinhas quando um fato citado muda; correção é sempre humana |
| Changelog | toda mudança — quem, quando, campo, de/para, origem, aprovação. Nunca editado |
| Chaves e assinantes | uma chave por sistema consumidor (007, Sidney, portal…) + webhooks de evento |
| Configurações | importar/registrar webhook da Shopify, trocar senha, usuários |

## Modelo de versão

`ProductVersion` nunca é sobrescrita: `RASCUNHO → PROPOSTA → VIGENTE → ENCERRADA`. Uma versão
proposta exige documento anexado (foto do rótulo/laudo). Aprovação (`approveVersion`,
`src/lib/versioning.ts`) ativa na hora se a vigência já chegou, ou fica "aprovada, aguardando
data" — o cron diário `activate-versions` promove sozinho quando a data chega, fecha a versão
anterior e abre as tarefas de revisão + avisa a equipe.

## Portas pra outros sistemas (007, Sidney, portal, agentes futuros)

Todas exigem `Authorization: Bearer <chave>` (gerada em Chaves e assinantes → hash salvo, chave
mostrada uma única vez).

| Rota | Pra quê |
|---|---|
| `GET /v1/products/:slug` | JSON estruturado (ficha vigente + comercial + claims + FAQ) |
| `GET /v1/products/:slug/context` | bloco de texto pronto pra prompt |
| `GET /v1/brand` / `GET /v1/brand/context` | mesma coisa pra marca |
| `POST /v1/compliance/check` `{text, product}` | lista fixa ANVISA/CONAR + guia + claims |
| `POST /api/webhooks/shopify` | recebido da Shopify (HMAC verificado), não pra terceiros |

Assinantes (`WebhookSubscriber`) recebem `product.updated`, `guide.updated`, `review.requested`
via POST assinado em HMAC-SHA256 (header `X-Guardiao-Signature`).

## Setup

- Neon — projeto **novo**, separado dos outros apps.
- Vercel `elyx-nutrition/elyx-guardiao`. Deploy: `npx vercel deploy --prod --yes`.
- Env (Vercel + `.env` local): ver `.env.example`. Segredos nunca vão pro git.
- Shopify: app customizado na loja, escopo `read_products` + webhooks de produto. Depois do
  primeiro deploy, rode "Registrar webhooks na Shopify" em Configurações (usa a URL de produção).
- E-mail: Resend, mesmo provedor do elyx-associadas (`RESEND_API_KEY`, `EMAIL_FROM`).
- Git: repositório `github.com/balieiromarcio-cpu/elyx-guardiao` (branch `main`).

## Scripts

| Script | Pra quê |
|---|---|
| `npm run seed` | admin + guia da marca padrão + 10 produtos (identidade, sem ficha) + guarda-corpos conhecidos |
| `scripts/migrate-from-007.ts` | traz Product/BrandGuide do 007 como versão 1 (fase 1b, rodar uma vez) |

## Rodando local

```bash
npm install
npm run dev
```
Porta 3002.

## Migração do 007 (fase 1b)

Depois que a estrutura estiver no ar: `Product`/`BrandGuide` do 007 viram cópia de leitura
atualizada via API (o 007 perde a ficha editável, ganha link "editar no Guardião"); Sidney e a
skill `elyx-brand-voice` passam a ler `/v1/brand/context` e `/v1/products/:slug/context`.
