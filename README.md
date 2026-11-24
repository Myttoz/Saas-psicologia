# Gestão de Pacientes

![Logo](assets/logo.jpeg)

[![Conferir testes](https://github.com/Myttoz/Saas-psicologia/actions/workflows/testes.yml/badge.svg)](https://github.com/Myttoz/Saas-psicologia/actions/workflows/testes.yml)

Um lugar simples para organizar o dia a dia de uma clínica de psicologia:
agenda, atendimentos, pacientes, convênios e recebimentos — tudo na mesma tela.
Feito para abrir no computador e no celular, com os dados guardados na nuvem.

## O que o site faz

- 📅 **Agenda semanal** com horários de 7h às 20h e criação rápida de sessões.
- 🗓️ **Gestão Anual**: crie anos vazios, troque o ano em uso e exclua um ano só com senha e código.
- ✅ **Painel do dia** com quem falta confirmar, quem deve e o valor a receber.
- 👥 **Pacientes e convênios** cadastrados com busca e percentuais de repasse,
  com ficha ampliada (nascimento, telefone, responsável e carteira).
- 🔒 **Privacidade/LGPD**: autorização registrada por paciente e botão **Apagar dados** (com senha da conta e código do celular).
- 💰 **Lançamentos e resumos** com o ganho e o repasse de cada atendimento.
- 🧾 **Recibo oficial da Receita Federal**: o site prepara o texto com o CPF do
  paciente, guarda o código de verificação e monta a mensagem para envio. O PDF
  é emitido pela Receita e anexado por você.
- 📄 **Comprovante simples** (sem validade oficial) como plano B.
- 📲 **Confirmação pelo WhatsApp** com mensagem pronta, sem custo nem API.
- 📒 **Prontuário cifrado** — as evoluções são escritas com AES-GCM; a senha
  nunca fica salva em texto.
- 📊 **Exportação para o contador** com os dados do mês prontos em planilha.
- 🗂️ **Relatório mensal em CSV** com resumo, entradas pagas, pendências e faltas.
- 📴 **Funciona offline** depois de instalado no celular.

## Como entrar

Acesse **https://myttoz.github.io/Saas-psicologia/**

A tela pede e-mail e senha. Use a conta que você mesma criou no Supabase. Se
ativou a verificação em duas etapas, digite também o código de 6 números do
aplicativo. Se ainda não ativou, use **🔐 Verificação em duas etapas** na barra
lateral: cada conta cadastra o seu próprio QR no celular. Não há botão de
Google: só entram as contas criadas por você.

A **nuvem é a fonte da verdade**: ao entrar, os dados dela substituem os do
navegador. Nada sobe automaticamente do computador para a nuvem. Para trazer
dados de um backup, use **Importar backup** — o sistema pede a senha da conta
e o código do aplicativo antes de aceitar.

## Privacidade

Cada conta vê somente os próprios dados. A autorização de cada paciente fica
registrada na ficha, e qualquer paciente pode ter os dados apagados pelo botão
**Apagar dados** (com senha da conta e código do celular). As evoluções do prontuário são
cifradas com uma chave que existe só na memória enquanto o prontuário está
aberto; sem a senha, ninguém consegue lê-las — nem você. Guarde sua senha em
local seguro, porque não há recuperação. O envio de mensagens pelo WhatsApp é
feito por você: o sistema só prepara o texto.

> Este sistema é uma ferramenta de organização. Ele não substitui as regras do
> CFP, a LGPD nem assinatura digital.

## Conferência automática

O GitHub roda os testes sozinhos a cada publicação. O selo no topo fica **verde**
quando tudo passou. Para ver cada conferência, abra
https://github.com/Myttoz/Saas-psicologia/actions e procure **Conferir testes**.
Se aparecer vermelho, não use aquela versão até eu conferir.

No computador, a conferência também pode ser feita com `node tests/rodar.js`.

## Documentação e novidades

- Passo a passo completo: [MANUAL.md](MANUAL.md)
- Configuração da nuvem e das senhas: [supabase/COMO_CONFIGURAR.md](supabase/COMO_CONFIGURAR.md)
- Novidades de cada versão (feed para widgets como start.me):
  https://myttoz.github.io/Saas-psicologia/releases.rss
- Mesmo feed com extensão `.xml` (alternativa):
  https://myttoz.github.io/Saas-psicologia/releases.xml
- Feed do GitHub (alternativa):
  https://github.com/Myttoz/Saas-psicologia/releases.atom

**Regra de versão:** rode `subirpsi` no Linux (ou `.\scripts\publicar.ps1` no
Windows) no lugar do `git push`. Ele sugere a descrição e a versão sozinhos e
faz commit, push da tag e notas de release. Padrão adotado (exemplo saindo da
`v1.2.0`):

| Começo da mensagem | Quando usar | Versão |
|---|---|---|
| `feat: nova função` | algo novo no site | `v1.3.0` (2º número) |
| `fix: corrige ...` | conserto de algo que já existia | `v1.2.1` (3º número) |
| `security:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:` | segurança, textos, visual, organização, testes, automação | `v1.2.1` |
| `feat!: ...` | muda o jeito de usar / quebra algo | `v2.0.0` (1º número) |

Nunca reaproveite uma versão já publicada. O passo a passo está em
`supabase/COMO_CONFIGURAR.md`.

---

SaaS by Myttoz
