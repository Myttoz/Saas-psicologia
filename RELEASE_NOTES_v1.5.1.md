# v1.5.1 — Correção da conferência automática

**Data:** 24/11/2026

Esta versão **não muda nada no site**. Ela corrige só a conferência automática do
GitHub, que tinha ficado vermelha na `v1.5.0`.

## O que aconteceu

Os testes passaram no computador, mas falharam no GitHub. O motivo: os atalhos
`subirpsi` e `baixarpsi` procuravam o projeto pelo endereço
`/home/infra/Documentos/Pessoal/Saas Psicologa`. No GitHub, esse endereço não
existe — cada máquina tem a própria pasta — então a bateria de versões falhava.

## A correção

- Os atalhos agora encontram o projeto **por eles mesmos**, a partir da pasta
  onde estão. Funcionam no seu computador, em outro computador e no GitHub.
- Foi acrescentado um teste que simula outra máquina/outro usuário. Assim esse
  problema não volta a passar despercebido.
- O site, o login, a nuvem, o recibo e a segurança continuam exatamente iguais.

## Como conferir

1. Abra https://github.com/Myttoz/Saas-psicologia/actions
2. A última conferência **Conferir testes** precisa estar verde.
3. No computador: `node tests/rodar.js` → 17 baterias passando.

> Não é preciso limpar cache, refazer login ou mudar a forma de usar `subirpsi`.
> O comando continua o mesmo.

---

SaaS by Myttoz
