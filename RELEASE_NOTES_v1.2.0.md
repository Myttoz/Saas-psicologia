# v1.2.0 — Verificação em duas etapas sempre disponível

Agora dá para ativar o código de 6 números direto pelo site, mesmo depois de
ter clicado em “Agora não”. Cada conta cadastra o seu próprio celular.

**Data:** 23/11/2026

---

## ✨ Novidades

- Botão permanente **🔐 Verificação em duas etapas** na barra lateral.
  Clique nele, escaneie o QR code no aplicativo autenticador e digite os 6
  números para ativar.
- O mesmo botão permite cadastrar um **segundo aplicativo de reserva** (em outro
  celular ou outro app) sem precisar remover o primeiro.
- As duas contas do sistema podem ativar o seu próprio código: entre com uma,
  configure; saia, entre com a outra e configure de novo. Os códigos não são
  compartilhados entre contas.

## 🔧 Melhorias

- Corrigido o botão “Confirmar ativação”: antes ele gerava o QR mas não
  terminava a ativação. Agora o mesmo botão gera o código e confirma os números.
- Ao digitar os 6 números, a tecla **Enter** também confirma.
- Se você tinha escolhido “Agora não”, o aviso automático não volta a incomodar,
  mas o botão da barra lateral continua disponível.
- Atalhos Linux atualizados para os nomes escolhidos: `subirpsi` e `baixarpsi`
  (em `~/bin`, basta digitar o nome, sem caminho).
- Textos dos atalhos corrigidos para mostrar os nomes novos.

## 🔒 Segurança

- A regra do banco continua exigindo o código (`aal2`) para contas com MFA
  ativo, tanto ao ler como ao gravar dados.
- O segundo fator de reserva deve ser guardado fora do computador — o Supabase
  não fornece códigos de recuperação para usuários do projeto.

## 🚀 Como atualizar

1. Abra o site e recarregue com **Ctrl+F5** (ou Command+R).
2. No celular, feche e abra o aplicativo novamente.
3. Entre com cada conta e use o botão **🔐 Verificação em duas etapas**.

---

SaaS by Myttoz
