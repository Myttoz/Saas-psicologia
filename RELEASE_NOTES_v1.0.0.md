# v1.0.0 — Lançamento oficial 🎉

Primeira versão pública do **Gestão de Pacientes**: um lugar simples para
organizar a agenda, os atendimentos e os recebimentos de uma clínica de
psicologia. Feito para abrir no computador e no celular, com os dados
protegidos na nuvem.

**Data:** 23/11/2026 · **Marca:** SaaS by Myttoz

---

## ✨ O que já vem pronto

- **Painel Hoje** — quem falta confirmar, quem deve, valor a receber e botão
  para iniciar/finalizar sessão com cronômetro.
- **Agenda semanal** — grade de segunda a domingo, das 7h às 20h, com
  agendamentos rápidos, repetição de sessões e busca por paciente ou data.
- **Pacientes e convênios** — cadastro com busca, máscara de moeda e
  percentual de repasse por convênio.
- **Lançamentos** — presença, status de pagamento, seleção em massa e busca
  por qualquer coluna.
- **Resumos** — total produzido, ganho e repasse separados por convênio, com
  exportação pronta para o contador em CSV.
- **Recibo em PDF** — nome, CRP `04/74163`, linha para assinar, assinatura
  opcional e logo da profissional como marca d'água.
- **WhatsApp** — confirmação com mensagem pronta, sem API e sem custo.
- **Prontuário** — evoluções por sessão, modelos rápidos, busca e senha de
  acesso com proteção reforçada.
- **Backup** — exportação/importação em JSON, retrato automático e restauração.
- **Instalação no celular (PWA)** — abre como aplicativo e funciona offline.

## 🔒 Segurança e acesso

- Login obrigatório com e-mail e senha criados no Supabase.
- Cada conta vê somente os próprios dados (RLS no banco).
- O bloqueio local do prontuário usa PBKDF2 com sal aleatória.
- Textos de pacientes, convênios e evoluções são exibidos como texto, nunca
  como código — inclusive em nomes com aspas ou `<...>`.
- Backups e dados da nuvem passam por validação antes de entrar no sistema.
- O login com Google confere um número secreto temporário (`state`), e dados
  locais só sobem para a nuvem com confirmação.
- A chave pública `anon` é a única que aparece no site. A chave
  `service_role` nunca é usada no navegador.

## 🚀 Primeiro acesso

1. Abra **https://myttoz.github.io/Saas-psicologia/**
2. Entre com o e-mail e a senha criados no Supabase.
3. Quando perguntado, escolha com atenção entre os dados da nuvem ou os dados
   deste navegador — a escolha substitui a outra.
4. No celular, use **Adicionar à tela inicial** para instalar como aplicativo.

## 📖 Documentação

O passo a passo completo está no [MANUAL.md](MANUAL.md) do repositório.

---

**Gestão de Pacientes** · v1.0.0 · SaaS by Myttoz
