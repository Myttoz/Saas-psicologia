# v1.6.0 — Privacidade e LGPD

**Data:** 24/11/2026

Esta versão acrescenta o bloco de privacidade que estava no manual: um aviso
curto, a autorização registrada por paciente e a exclusão completa de dados.

## ✨ Novidades

- **Aviso curto na entrada e na lista de pacientes**: os dados ficam só na sua
  conta e podem ser apagados quando você quiser. O login continua obrigatório e
  com fundo opaco — nada mudou na forma de entrar.
- **Autorização por paciente (LGPD)**: no cadastro, escolha entre *Aguardando
  autorização*, *Autorizado pelo paciente* e *Não autorizado*. A data da mudança
  fica guardada e a situação aparece embaixo do nome na tabela. Pacientes criados
  automaticamente por um atendimento entram como "Aguardando".
- **Botão Apagar dados**: na tabela de pacientes, pede para digitar o nome
  completo, depois a senha da conta e o código de 6 números do celular. Apaga
  cadastro, atendimentos, evoluções do prontuário e encerra sessão com cronômetro.
  A exclusão entra na trilha de acesso com o nome mascarado.

## 🔒 Segurança

- Se o nome não conferir, se você cancelar ou se o prontuário estiver bloqueado,
  nada é apagado. Evoluções cifradas só saem com o prontuário desbloqueado.
- Backups já exportados e a trilha de acesso antiga permanecem (são registros
  históricos). A nuvem é atualizada como em qualquer outra alteração.
- Nenhuma mudança em RLS, MFA, AES-GCM, chave anon ou recibo da Receita Federal.

## 🔧 Compatibilidade

- Backups da versão 6 e anteriores continuam sendo aceitos. Pacientes sem o campo
  novo aparecem como "Aguardando".
- O cache do celular (`saatendimentos-v6`) foi atualizado para que todas as
  pessoas recebam as telas novas sem precisar limpar nada na mão.
- Nova bateria de testes: `tests/teste-privacidade-lgpd.js` (18 baterias no total).

## 🚀 Como conferir

1. Abra https://myttoz.github.io/Saas-psicologia/
2. Em **Pacientes**, abra a ficha de alguém e veja o campo de autorização.
3. Para testar a exclusão, use um paciente de teste: o botão **Apagar dados** vai
   pedir o nome, a senha da conta e o código do celular.
4. O selo **Conferir testes** no GitHub precisa estar verde.

> Não é preciso refazer login nem limpar cache. O CRP continua `04/74163`.

---

SaaS by Myttoz
