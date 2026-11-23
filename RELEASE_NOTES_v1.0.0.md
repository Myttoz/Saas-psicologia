# v1.0.0 — Lançamento oficial 🎉

Primeira versão pública do **Gestão de Pacientes**: um lugar simples para
organizar a agenda, os atendimentos e os recebimentos de uma clínica de
psicologia. Feito para abrir no computador e no celular, com os dados na nuvem.

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
- **Prontuário** — evoluções cifradas, modelos rápidos, busca, senha de acesso
  e trilha de uso no navegador e no banco.
- **Verificação em duas etapas (MFA)** — código de 6 números no login e nas
  ações críticas, quando ativada na conta.
- **Backup** — exportação/importação em JSON, retrato automático e restauração.
- **Instalação no celular (PWA)** — abre como aplicativo e funciona offline.

## 🔒 Segurança e acesso

- Login obrigatório com e-mail e senha criados pela profissional no Supabase.
  **Google removido**: não há mais botão de login com Google no site.
- Cada conta vê somente os próprios dados (RLS no banco). Contas com MFA ativo
  só leem/gravam depois de passar pelo código de 6 números.
- **A nuvem é a fonte da verdade.** Ao entrar, os dados dela substituem os do
  navegador. Não existe mais subida automática de dados locais: importar um
  backup exige senha da conta e código do aplicativo.
- As evoluções são cifradas com **AES-GCM**; a chave vem da senha do prontuário
  por **PBKDF2-HMAC-SHA256 com 600.000 iterações**. A chave fica só na memória.
  A senha em texto nunca é salva e não tem recuperação.
- Trocar a senha do prontuário é atômica: se a recifração falhar, nada é gravado
  e as evoluções continuam legíveis com a senha antiga.
- Trilha de acesso registrada no banco (`auditoria`), sem texto clínico.
- Textos de pacientes, convênios e evoluções são exibidos como texto, nunca
  como código — inclusive em nomes com aspas ou `<...>`.
- Backups e dados da nuvem passam por validação antes de entrar no sistema.
- CSP rígida e cabeçalhos de segurança impedem frames, objetos e scripts de
  terceiros. A chave pública `anon` é a única que aparece no site; a chave
  `service_role` nunca é usada no navegador.

## 🚀 Primeiro acesso

1. Abra **https://myttoz.github.io/Saas-psicologia/**
2. Entre com o e-mail e a senha criados no Supabase.
3. Se a conta tiver verificação em duas etapas, digite o código do aplicativo.
4. Os dados da nuvem carregam automaticamente. No celular, use **Adicionar à
   tela inicial** para instalar como aplicativo.

## 📖 Documentação

O passo a passo completo está no [MANUAL.md](MANUAL.md) do repositório, e o
guia pessoal de contas e senhas em
[supabase/COMO_CONFIGURAR.md](supabase/COMO_CONFIGURAR.md).

---

**Gestão de Pacientes** · v1.0.0 · SaaS by Myttoz
