# v1.7.0 — Ficha completa e relatório mensal

**Data:** 24/11/2026

Esta versão fecha os dois blocos opcionais que estavam no manual: a ficha do
paciente ficou mais completa e o site passou a baixar um relatório mensal.

## ✨ Novidades

- **Ficha do paciente mais completa**: agora é possível registrar nascimento,
  telefone, responsável e carteira do convênio. Todos os campos são opcionais.
  O telefone é guardado só com números, aparece com máscara `(11) 99999-8888`
  e entra na busca junto com responsável e carteira. Os detalhes aparecem
  embaixo do nome na tabela de pacientes.
- **Relatório mensal (CSV)**: em **Resumos**, o botão **⬇ Relatório mensal (CSV)**
  baixa `relatorio-AAAA-MM.csv` com quatro partes: **RESUMO** (quantidades e
  totais), **ENTRADAS** (pagos), **PENDÊNCIAS** (pendentes que não são falta nem
  cancelamento) e **FALTAS** (presença *Faltou*). Cada linha traz data, horário,
  paciente, contato, convênio, tipo, pagamento, presença, observações e valor.
  O contato vem da ficha de cada paciente, casado pelo nome sem acento.

## 🔧 Compatibilidade

- Backup continua na **versão 6** e o cache do celular continua em
  `saatendimentos-v6`: os campos novos são opcionais e não obrigam limpar nada.
  Pacientes de backups antigos aparecem com os campos em branco.
- O CSV do contador **não mudou** — continua com as mesmas 7 colunas e o nome
  `contador-AAAA-MM.csv`. O relatório é um arquivo separado.
- Nenhuma mudança em login, MFA, RLS, AES-GCM, chave anon, WhatsApp, recibo da
  Receita Federal, CRP `04/74163`, cores ou logo.
- Duas baterias novas: `tests/teste-ficha-completa.js` e
  `tests/teste-relatorio-mensal.js` (20 baterias no total).

## 🚀 Como conferir

1. Abra https://myttoz.github.io/Saas-psicologia/
2. Em **Pacientes**, edite alguém e preencha os campos novos. Depois busque pelo
   telefone ou pelo responsável.
3. Em **Resumos**, escolha um mês com atendimentos e clique em
   **⬇ Relatório mensal (CSV)**. Confira se o contato do paciente apareceu.
4. O selo **Conferir testes** no GitHub precisa estar verde.

> O manual (`MANUAL.md`) explica os dois blocos passo a passo.

---

SaaS by Myttoz
