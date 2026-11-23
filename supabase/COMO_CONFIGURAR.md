# Como configurar a nuvem (Supabase) — passo a passo

Isto é **preparação**. Enquanto `js/config.js` estiver com os campos vazios, o
sistema continua funcionando somente no navegador, exatamente como hoje.

## 1. Criar o projeto

1. Acesse https://supabase.com e entre (plano gratuito serve).
2. Clique em **New project**.
3. Escolha um nome (ex.: `atendimentos-psicologia`), uma senha de banco e uma
   região próxima (São Paulo: `South America (São Paulo)`).
4. Espere o projeto ficar pronto (leva poucos minutos).

## 2. Criar a tabela com segurança

1. No menu lateral, clique em **SQL Editor**.
2. Clique em **New query**.
3. Copie todo o conteúdo de `supabase/schema.sql` e cole.
4. Clique em **Run**.
5. Confira se apareceu a mensagem de sucesso.

Isso cria a tabela `dados` e liga a **RLS**: cada conta só lê e altera os
próprios registros. Mesmo com a chave pública no site, ninguém mais consegue ver
os dados.

## 3. Criar a conta de acesso

1. No menu lateral, clique em **Authentication → Users**.
2. Clique em **Add user → Create new user**.
3. Informe o e-mail e a senha que você usará para entrar no sistema.
4. Marque **Auto Confirm User** (para não precisar confirmar por e-mail).
5. Clique em **Create user**.

## 4. Pegar as duas informações do projeto

Em **Project Settings → API** você encontra:

- **Project URL** (ex.: `https://abcdefgh.supabase.co`)
- **anon / public key** (uma chave longa que começa com `eyJ...`)

A chave `anon` é própria para ficar no navegador. A chave `service_role`
**nunca** deve ser usada no site — ela pula a segurança.

## 5. Preencher a configuração

Abra `js/config.js` e preencha:

```js
var CONFIG = {
  usarBackend: true,
  supabaseUrl: 'https://SEU-PROJETO.supabase.co',
  supabaseAnonKey: 'COLOQUE_AQUI_A_CHAVE_ANON'
};
```

## 6. Proteger o acesso ao painel do Supabase

- Em **Authentication → Providers**, confirme que **Email** está habilitado.
- Em **Authentication → Policies**, mantenha a RLS ligada na tabela `dados`.
- Se quiser, limite novos cadastros: **Authentication → Providers → Email →
  Allow new users to sign up = desligado** (você já criou a sua conta no passo 3).

## Como funciona depois de configurado

- Ao abrir o sistema, aparece a tela **Entrar na sua conta**.
- Dá para clicar em **Continuar sem conectar** e usar localmente.
- Depois de entrar, o sistema pergunta se prefere os dados da nuvem ou os deste
  navegador (escolha com atenção: a opção escolhida substitui a outra).
- Toda alteração é enviada para a nuvem alguns segundos depois.
- O botão **Sair** desconecta e pede a senha novamente.
- Os botões **Exportar/Importar backup** e **Restaurar automático** continuam
  funcionando como rede de segurança.

> Atenção: este é um banco simples (um registro JSON por profissional). Ele serve
> para sincronizar entre máquinas, mas ainda não é prontuário certificado,
> assinatura digital nem substitui as obrigações do CFP/LGPD.
