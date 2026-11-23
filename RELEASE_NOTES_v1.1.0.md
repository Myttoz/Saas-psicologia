# v1.1.0 — Organização e atalhos de publicação

Arrumamos a pasta do projeto e criamos atalhos para enviar e baixar versões com
mais segurança. O uso diário do site continua exatamente o mesmo.

**Data:** 23/11/2026

---

## ✨ Novidades

- Pasta **Removidos** para guardar rascunhos e arquivos pessoais que não devem
  subir para o GitHub. O material da Lívia continua fora do Git.
- Atalhos novos:
  - Linux: `subirpsicologa` e `baixarpsicologa` (em `~/bin`) — renomeados para
    `subirpsi` e `baixarpsi` na v1.2.0.
  - Windows 11: `scripts/publicar.ps1` e `scripts/baixar.ps1`.

## 🔧 Melhorias

- Os atalhos conferem o ramo `main`, exigem a nota de release antes de criar a
  tag e avisam se a versão já foi publicada.
- A tag agora é criada com descrição (anotada), e nunca é reaproveitada.
- O feed `releases.rss` do start.me continua sendo atualizado sozinho.

## 🔒 Segurança

- Nada de pessoal é enviado: a pasta `Removidos` e a pasta `Livia` ficam
  ignoradas pelo Git.

## 🚀 Como atualizar

1. Abra o site e recarregue com **Ctrl+F5** (ou Command+R).
2. No celular, feche e abra o aplicativo novamente.

---

SaaS by Myttoz
