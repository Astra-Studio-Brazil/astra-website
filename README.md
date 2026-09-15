# Astra Studio — site

Site de uma dobra só: logo, uma frase e contato, sobre o céu real de São Paulo.

## Rodando

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build && pnpm start
```

## Onde mexer

- **Logo** — `src/components/logo.tsx`, vetorizado a partir do PNG oficial, com a estrela e o nome em caminhos separados para animar. Se chegar o SVG original, basta trocar os dois `d`.
- **Textos** — `src/app/page.tsx`. Cada texto tem versão `en` (padrão) e `pt` via `<T>`.
- **E-mail, endereço e coordenadas** — `src/lib/site.ts`.
- **Cores, fontes e tempos** — `src/app/globals.css` (tokens no topo).
- **Imagem de compartilhamento** — `src/app/opengraph-image.png`. Gere de novo quando o logo oficial entrar.

## O céu

`src/components/sky/` desenha em canvas as 5.080 estrelas visíveis a olho nu (Yale Bright Star Catalogue) na posição em que estão agora sobre a Rua Quatá, 200: projeção a partir do zênite, cores reais (índice B−V) e a Via Láctea ao longo do plano galáctico.

- As estrelas surgem aos poucos, como olhos se acostumando ao escuro.
- O cursor acende as estrelas próximas e revela o nome das mais brilhantes, com a constelação em PT/EN.
- Segurar o clique (ou o dedo) acelera o tempo e deixa rastros; ao soltar, o céu volta ao presente. O relógio acompanha.
- De vez em quando, uma estrela cadente.
- Com `prefers-reduced-motion`, o céu fica estático.

Os dados vêm de `node scripts/build-stars.mjs`, que baixa o catálogo do CDS e grava `src/components/sky/star-catalog.ts`.
