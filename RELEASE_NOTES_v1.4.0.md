# v1.4.0 — Recibo oficial e CPF do paciente

O recibo válido continua sendo o da Receita Federal. O site agora prepara o texto e guarda o histórico, sem tentar substituir o documento oficial.

**Data:** 23/11/2026

---

## ✨ Novidades

- **CPF do paciente** no cadastro (opcional, com conferência dos números). Aparece na ficha e entra na busca.
- **Preparar recibo**: no atendimento pago, o botão **Recibo** abre uma tela com o texto pronto (nome, CPF, valor, serviço, data e seu CRP), botão para copiar e atalho para o e-CAC da Receita Federal.
- **Código de verificação** da Receita salvo por atendimento, com data de emissão e situação: salvo / enviado ao paciente.
- **Marcar como enviado** monta a mensagem para o WhatsApp já com o código de verificação. O PDF continua sendo anexado por você.
- O botão do atendimento mostra o estado: **Recibo**, **Recibo salvo** ou **Recibo enviado**.

## 🔧 Melhorias

- O antigo recibo impresso pelo site passa a se chamar **Comprovante simples** e traz um aviso de que não tem validade oficial. Ele fica só como plano B.
- A exclusão de ano, o login e a Gestão Anual continuam como antes.

## 🔒 Segurança

- O registro do código e o envio entram na trilha `auditoria`, sem guardar CPF nem texto clínico.
- CPF é validado antes de salvar; o backup e a nuvem guardam só os números e campos conhecidos do recibo. Backup e nuvem passam para a versão 6; arquivos antigos continuam sendo aceitos.

## 🚀 Como atualizar

1. Recarregue o site com **Ctrl+F5** (ou feche e abra o aplicativo no celular).
2. Em **Pacientes**, edite as fichas e preencha o CPF de quem já atende.
3. Em um atendimento pago, clique em **Recibo**, copie o texto, gere o recibo no app da Receita e volte para salvar o código.

---

SaaS by Myttoz
