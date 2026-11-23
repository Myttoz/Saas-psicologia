# Gestão de Pacientes

![Logo](assets/logo.jpeg)

Um lugar simples para organizar o dia a dia de uma clínica de psicologia:
agenda, atendimentos, pacientes, convênios e recebimentos — tudo na mesma tela.
Feito para abrir no computador e no celular, com os dados guardados na nuvem.

## O que o site faz

- 📅 **Agenda semanal** com horários de 7h às 20h e criação rápida de sessões.
- 🗓️ **Gestão Anual**: crie anos vazios, troque o ano em uso e exclua um ano só com senha e código.
- ✅ **Painel do dia** com quem falta confirmar, quem deve e o valor a receber.
- 👥 **Pacientes e convênios** cadastrados com busca e percentuais de repasse.
- 💰 **Lançamentos e resumos** com o ganho e o repasse de cada atendimento.
- 📄 **Recibo em PDF** com nome, CRP `04/74163`, assinatura e logo da profissional.
- 📲 **Confirmação pelo WhatsApp** com mensagem pronta, sem custo nem API.
- 📒 **Prontuário cifrado** — as evoluções são escritas com AES-GCM; a senha
  nunca fica salva em texto.
- 📊 **Exportação para o contador** com os dados do mês prontos em planilha.
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

Cada conta vê somente os próprios dados. As evoluções do prontuário são
cifradas com uma chave que existe só na memória enquanto o prontuário está
aberto; sem a senha, ninguém consegue lê-las — nem você. Guarde sua senha em
local seguro, porque não há recuperação. O envio de mensagens pelo WhatsApp é
feito por você: o sistema só prepara o texto.

> Este sistema é uma ferramenta de organização. Ele não substitui as regras do
> CFP, a LGPD nem assinatura digital.

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
