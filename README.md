# Connect Academy — O mundo ao seu alcance.

> Mirror completo exportado por **VibeCloner** de: https://connectacademy.com.br/?utm_source=organic&utm_campaign=&utm_medium=&utm_content=&utm_term=#universo

Este é um **espelho rodável** do site: HTML, JavaScript, CSS, fontes e imagens
foram baixados exatamente como o servidor entrega (80 arquivo(s) em `mirror/`)
e as URLs foram reescritas para os arquivos locais. O JavaScript foi **mantido**,
então o site roda igual ao original.

## ▶️ Rodar localmente

Precisa de um servidor local (as URLs são absolutas a partir da raiz — não abra
por `file://`):

```bash
npx serve .
# ou
python -m http.server 8000
```

Depois abra `http://localhost:3000` (ou :8000).

## Arquivos

- `index.html` — o mirror rodável (com JS). **Use este.**
- `snapshot.html` — fallback visual estático (DOM já renderizado, sem JS). Útil se algum script do original quebrar offline.
- `mirror/` — todos os recursos (js, css, fontes, imagens, mídia) por host.
- `screenshots/`, `DESIGN.md`, `PROMPT.md` — referências para editar/reconstruir.

## Abrir no Claude Code para editar
```
claude .
```

> ⚠️ Conteúdo dinâmico buscado de uma API ao vivo (feeds, busca, login) mora no
> servidor original e não é copiável offline — essas partes podem ficar vazias
> até você apontar para seus próprios dados.
