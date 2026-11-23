# Configurando a nuvem (Supabase) — passo a passo para você

Este guia resume o que já está pronto no sistema e o que **você faz
pessoalmente** no painel do Supabase. Não é preciso entender programação: são
alguns cliques e três senhas/códigos diferentes.

---

## 1. As três "senhas" (ou códigos) que existem

É importante não confundir. Cada uma tem um lugar e uma função:

| O que é | Onde você cria | Onde usa | Se esquecer |
|---|---|---|---|
| **Senha da conta** (e-mail + senha) | No Supabase: **Authentication → Users → Add user** | Na tela **Bem-vinda** do site | Você mesma redefine em **Authentication → Users**, clicando no usuário e em "Reset password" |
| **Código de 6 números** (verificação em duas etapas / MFA) | No aplicativo autenticador (Google Authenticator, Microsoft Authenticator, 1Password etc.) | Aparece depois da senha, no login e antes de importar backup | Use um dos **códigos de recuperação** que o Supabase mostrou quando você ativou. Guarde-os impressos ou em local seguro |
| **Senha do prontuário** | Dentro do site, na aba **Prontuário**, na primeira vez que abrir uma evolução | Toda vez que o prontuário estiver trancado, e para trocar a senha | **Não há recuperação.** Ela gera a chave que cifra as evoluções; sem ela ninguém lê o conteúdo. Anote em local seguro |

Resumo prático: a **senha da conta** abre o site; o **código de 6 números**
confirma que é você na nuvem; a **senha do prontuário** abre e cifra os textos
clínicos. A senha do prontuário **não** é a mesma do login e não é enviada para
o Supabase.

---

## 2. O que você faz pessoalmente no Supabase (checklist)

### ✅ 2.1 Criar a conta de acesso

1. Entre em https://supabase.com e abra o projeto.
2. No menu lateral, clique em **Authentication → Users**.
3. Clique em **Add user → Create new user**.
4. Informe o **e-mail** e a **senha** que você quer usar no site.
5. Marque **Auto Confirm User** (para não precisar confirmar por e-mail).
6. Clique em **Create user**.
7. Guarde essa senha em local seguro. Se precisar trocar, clique no usuário
   na lista e use **Reset password**.

> Somente contas criadas por você entram. Não use "sign up" aberto nem login
> com Google.

### ✅ 2.2 Bloquear cadastros novos e o Google

1. Em **Authentication → Sign In / Providers**, desligue **Allow new users to
   sign up** e **Allow anonymous sign-ins**.
2. Confirme que **Email** está habilitado.
3. Se o provedor **Google** estiver ligado, **desligue** (você já fez isso).
   O site também removemos o botão do Google — as duas pontas ficam fechadas.

Assim ninguém mais cria conta por conta própria, nem entra pelo Google.

### ✅ 2.3 Ativar a verificação em duas etapas (MFA) na sua conta

1. Ainda em **Authentication → Users**, clique no seu usuário.
2. Procure a seção **Multi-factor Authentication (MFA)** e clique em
   **Enroll / Add factor** escolhendo **TOTP** (aplicativo autenticador).
3. O Supabase mostra um **QR code**. Abra seu aplicativo autenticador no
   celular e escaneie.
4. Digite no painel o **código de 6 números** que o aplicativo mostrou para
   confirmar a ativação. O status do fator deve ficar como **verified**.
5. O Supabase mostra **códigos de recuperação**: copie e guarde fora do
   computador (papel, cofre, gerenciador de senhas). São a única saída se você
   perder o celular.

Depois disso, o site passa a pedir o código de 6 números no login e antes de
importar um backup. O banco também exige o código para ler e gravar dados
(regra `aal2` em `supabase/schema.sql`) — então a proteção não depende só do
site.

> Se quiser, dá para ativar pelo próprio site: menu lateral →
> **Ativar verificação em duas etapas**. O resultado é o mesmo.

### ✅ 2.4 Rodar o SQL de segurança (uma vez)

1. No menu lateral, clique em **SQL Editor → New query**.
2. Copie o conteúdo de `supabase/schema.sql` e cole.
3. Clique em **Run**. Pode rodar de novo sem apagar dados.

Isso cria a tabela `dados`, a tabela `auditoria` (trilha de acesso) e liga a
**RLS**: cada conta vê só o que é seu, e ninguém apaga a trilha pela internet.

### ✅ 2.5 Conferir as chaves (nunca troque pela errada)

Em **Project Settings → API**:

- **Project URL**: `https://wrdkbafdzjsqonyidrwv.supabase.co` (sem `/rest/v1/`).
- **anon / public key**: chave longa que começa com `eyJ...`. É pública e já
  está em `js/config.js`.
- **service_role**: **nunca** use no site. Ela pula a segurança e não aparece
  em nenhum arquivo do navegador.

Se você recriar o projeto, as chaves mudam — aí sim é preciso atualizar
`js/config.js`. No projeto atual, nada disso precisa ser tocado.

---

## 3. Como o site se comporta depois de configurado

- Ao abrir, aparece a tela **Bem-vinda** com fundo opaco. Clicar fora ou apertar
  ESC não abre o sistema; o login é obrigatório.
- Você digita e-mail e senha. Se a conta tiver MFA, digita o código de 6 números.
- **A nuvem é a fonte da verdade**: os dados dela carregam e substituem os do
  navegador. Não existe mais "Continuar sem conectar" nem escolha de dados
  locais na entrada.
- **Nada sobe automático.** Alterações são salvas na nuvem para a sua conta;
  dados que estavam só no computador não são enviados. Para trazer um backup,
  use **Importar backup** na sidebar: o sistema pede a senha da conta e o código
  do aplicativo antes de aceitar o arquivo.
- O botão **Sair** desconecta, apaga os dados locais e tranca o prontuário.
- A trilha de acesso fica salva no banco (tabela `auditoria`), além da trilha
  local, sem guardar texto clínico.

---

## 4. Publicar uma nova versão (release automática)

Quando o código mudar, você só precisa dar o push final. As notas de release
já ficam prontas no arquivo `RELEASE_NOTES_v1.0.0.md`.

1. No terminal da pasta do projeto, rode:

```bash
git add .
git commit -m "sua mensagem"
git push origin main
```

2. Depois, crie a versão e empurre a etiqueta:

```bash
git tag -a v1.0.0 -m "v1.0.0"
git push origin v1.0.0
```

3. O GitHub cria a release sozinho e atualiza o feed:
   https://github.com/Myttoz/Saas-psicologia/releases.atom

Para a **próxima** versão, use `v1.1.0`, `v1.2.0`... e crie um arquivo
`RELEASE_NOTES_v1.1.0.md` com as novidades. Se não houver arquivo de notas, o
GitHub gera um resumo automático. Trocar `main` publica o site; trocar a tag
publica a release. São coisas diferentes.

> Se o `git push` pedir usuário e senha, use um **Personal Access Token** com
> permissões `repo` e `workflow` no lugar da senha da conta do GitHub.

---

## 5. Limites honestos

- O banco guarda um JSON por profissional. Serve para sincronizar entre
  máquinas; não é prontuário eletrônico certificado nem assinatura digital.
- As evoluções são cifradas no navegador antes de ir para a nuvem. Quem tiver a
  senha do prontuário consegue ler; sem ela, nem você.
- Use sempre o endereço publicado em **HTTPS**. Abrindo o `index.html` direto
  do computador (`file://`), alguns navegadores não oferecem WebCrypto e a
  criptografia não pode ser garantida.
- A senha do prontuário não tem recuperação. Guarde-a bem.
