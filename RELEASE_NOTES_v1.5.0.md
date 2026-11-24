# v1.5.0 — Testes automáticos no GitHub

Esta versão não muda o que você vê no site. Ela muda **como a gente tem certeza**
de que o site está bem antes de cada publicação.

**Data:** 24/11/2026

---

## ✨ Novidades

- **17 baterias de teste dentro do projeto**, na pasta `tests/`. Antes ficavam só
  no computador; agora viajam com o código e não se perdem.
- **Conferência automática no GitHub**: a cada publicação, o GitHub roda as
  baterias e verifica sintaxe, IDs da tela, login, backup, nuvem, WhatsApp,
  recibo, segurança e padrão de versões. Se algo quebrar, a conferência fica
  vermelha.
- **Selo verde no `README.md`** mostrando se a última conferência passou.
- Os atalhos `subirpsi` e `baixarpsi` agora moram em `scripts/`, dentro do
  projeto. Quem usa continua digitando `subirpsi` — o atalho só passou a chamar
  o arquivo versionado.

## 🔧 Melhorias

- As baterias que usavam números fixos (quantas versões o feed tem, qual versão
  o atalho sugere) agora se adaptam às tags reais do repositório. Isso evita
  falsos alarmes depois de cada release.
- O feed `releases.rss` e `releases.xml` foi atualizado com a `v1.4.0`.
- `MANUAL.md` ganhou o passo a passo "Como saber se está tudo bem".

## 🔒 Segurança

- Nenhuma mudança nas regras de acesso, MFA, cifra ou RLS. Os testes apenas
  conferem que elas continuam no lugar.

## 🚀 Como conferir

1. Abra https://github.com/Myttoz/Saas-psicologia/actions
2. Procure **Conferir testes** na última publicação.
3. O resultado precisa estar verde. No computador, o comando é
   `node tests/rodar.js`.

> O site continua em https://myttoz.github.io/Saas-psicologia/. Não é preciso
> limpar cache nem refazer login por causa desta versão.

---

SaaS by Myttoz
