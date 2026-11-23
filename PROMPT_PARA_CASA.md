# Prompt para a IA continuar em casa — ETAPA: NUVEM + PUBLICAÇÃO

> **Como usar:** abra este arquivo, copie **todo** o conteúdo entre `COMEÇO` e
> `FIM` e cole como primeira mensagem no chat da IA no computador de casa.

---

## COMEÇO

Você vai dar continuidade a um sistema local de gestão de atendimentos para uma
psicóloga. Fale sempre em **português do Brasil simples**: a usuária não é
programadora. Vá **passo a passo**, uma coisa por vez, e espere a resposta dela
antes de seguir.

### 1. Onde estamos

O código está pronto e testado. **NÃO refazer, NÃO mexer:** recibo (CRP
`04/74163`, linha para assinar, marca d'água), senha PBKDF2, backup automático e
toda a lógica de sincronização.

A etapa de nuvem **já foi configurada aqui**: projeto Supabase criado, tabela
com RLS, usuário de acesso, `js/config.js` preenchido com URL base e chave anon
(`usarBackend: true`) e primeiro commit feito na branch `main`.

O seu trabalho agora é **guiar a usuária** apenas para:

1. ligar o remoto e dar o **push da branch `main`**,
2. ativar o GitHub Pages (Source = GitHub Actions),
3. abrir o site no ar, entrar com e-mail/senha e escolher a origem dos dados,
4. depois, se ela quiser, seguir com a Gestão Anual.

O guia detalhado já existe no arquivo `supabase/COMO_CONFIGURAR.md`. Use-o como
roteiro, mas **não se limite a mandar ela ler**: conduza a conversa, pergunte uma
etapa por vez e explique cada termo em linguagem simples.

### 2. Onde está o projeto

```
/home/infra/Documentos/Pessoal/Saas Psicologa/
```

Se o caminho mudar no computador de casa, procure a pasta `Saas Psicologa` e
confirme com ela antes de mexer em qualquer arquivo.

Arquivos desta etapa:

```
js/config.js                  # preencher URL, chave anon e usarBackend: true
js/backend.js                 # já pronto: login e sincronização
supabase/schema.sql           # já pronto: tabela + RLS (rodar no Supabase)
supabase/COMO_CONFIGURAR.md   # guia em 6 passos
.github/workflows/deploy.yml  # já pronto: publicação automática
sw.js                         # já cacheia config.js e backend.js
```

### 3. Regras de ouro

1. **Agora o primeiro commit está autorizado** — mas só como parte desta etapa e
   **só depois que a usuária confirmar** que quer publicar. Antes disso, não rode
   `git add`, `git commit` nem `git push`.
2. **Nunca mexer** em `APP Financias` nem em `Livia/`. Essa pasta tem documentos
   pessoais, está no `.gitignore`, e **não pode ser publicada**.
3. **Nada de Google Script nem Google Cloud.** A nuvem é o Supabase.
4. **Nunca peça nem coloque a chave `service_role` no site.** A chave `anon` é
   pública e é a correta. A proteção real é a RLS no banco (`schema.sql`).
5. Não invente URL de projeto nem chave. Se ela não tiver, guie até conseguir.
6. Sem URL e chave preenchidas, o sistema continua 100% local — sem login e sem
   envio de dados. Deixe isso claro para tranquilizá-la.
7. Ao final de cada etapa, diga o que foi feito e **o que ela deve fazer agora**.

### 4. Como conduzir a conversa (sugestão de roteiro)

Comece mais ou menos assim:

> "O recibo já está prontinho. Agora vamos fazer a parte da nuvem: isso vai
> permitir que você use o sistema no computador e no celular, com os dados
> sincronizados. Vou te guiar com calma, uma etapa por vez. Primeiro, você já tem
> uma conta no Supabase ou vamos criar uma?"

Então siga este roteiro:

**Passo A — conta e projeto no Supabase**
- Pergunte se ela já tem conta em https://supabase.com.
- Se não tiver, guie: entrar, "Sign in" → "Sign up" (pode ser com e-mail ou
  GitHub), confirmar e-mail se pedir.
- Depois: **New project** → nome (ex.: `atendimentos-psicologia`), senha do banco,
  região **South America (São Paulo)** → aguardar ficar pronto.
- Explique que o plano gratuito serve e que a senha do banco é só dela.

**Passo B — criar a tabela com segurança**
- Menu lateral → **SQL Editor** → **New query**.
- Copiar todo o conteúdo de `supabase/schema.sql`, colar e clicar **Run**.
- Explicar em uma frase: "isso cria a tabela onde os dados ficam e uma regra para
  cada conta ver só os próprios dados."
- Pode rodar o arquivo mais de uma vez, sem problema.

**Passo C — criar a conta de acesso ao sistema**
- **Authentication → Users → Add user → Create new user**.
- E-mail e senha que ela vai usar para entrar no sistema.
- Marcar **Auto Confirm User** e criar.

**Passo D — pegar as duas informações**
- **Project Settings → API**.
- Copiar **Project URL** (ex.: `https://abcdefgh.supabase.co`).
- Copiar a chave **anon / public** (começa com `eyJ...`).
- Reforçar: a chave `service_role` **nunca** entra no site.

**Passo E — configuração (JÁ FEITA, pular)**
`js/config.js` já está com `usarBackend: true`, URL base e chave anon reais. A URL
veio com `/rest/v1/` e esse final foi removido, porque o `Backend` monta os
caminhos sozinho. A chave foi conferida: `role: anon`, `ref` igual ao da URL. O
`teste-backend.js` foi adaptado para validar a config real sem quebrar os testes
de modo local. Não refazer nada disso.

**Passo F — publicar (próximo passo)**
- O **primeiro commit já foi feito** e a branch local se chama **`main`**.
- O repositório **já foi criado** pela Lívia:
  `https://github.com/Myttoz/Saas-psicologia.git`. Só falta ligar o remoto e dar
  o push da branch `main`:
  ```bash
  git remote add origin https://github.com/Myttoz/Saas-psicologia.git
  git push -u origin main
  ```
- Conferir antes: nada de dado real em `Livia/`, nenhum `backup-*.json`, nenhuma
  chave `service_role`. O `Livia/` está no `.gitignore` e nunca entra no push.
- No GitHub: **Settings → Pages → Source = GitHub Actions**. O workflow dispara
  somente com push na branch `main`.
- O arquivo `.github/workflows/deploy.yml` já publica sozinho e envia somente
  `index.html`, `css`, `js`, `assets`, manifesto e service worker.

**Passo G — testar no ar**
- Abrir o endereço publicado (termo em `.github.io`).
- Entrar com e-mail/senha.
- O sistema pergunta se usa os dados da nuvem ou os deste navegador: explicar que
  ela deve escolher com atenção, pois a opção escolhida substitui a outra.
- Conferir que as alterações salvas aparecem depois de recarregar a página.

### 5. O que já está pronto (contexto — não refazer)

- Recibo com CRP `04/74163`, linha para assinar, logo como marca d'água.
- Agenda, Painel Hoje, pacientes, convênios, lançamentos, resumos, situação,
  prontuário com senha PBKDF2, WhatsApp, backup automático, CSV do contador.
- Login e sincronização Supabase no código, tabela e RLS no SQL, guia e workflow
  de publicação — tudo preparado, faltando só os valores reais e a publicação.

### 6. Validação (rode antes de preencher o config)

```bash
cd /home/infra/Documentos/Pessoal/Saas\ Psicologa
for f in js/*.js sw.js; do node --check "$f" || exit 1; done
python3 -m json.tool manifest.webmanifest > /dev/null
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml', encoding='utf-8'))"
git diff --check
node /tmp/opencode/validar-estrutura.js
for t in teste-hoje teste-prontuario teste-whatsapp-recibos teste-melhorias teste-exportacao-csv teste-seguranca-pwa teste-backend; do
  printf "%s: " "$t"; node "/tmp/opencode/$t.js" | tail -n 1
done
```

Todos devem terminar com "TODOS OS TESTES PASSARAM" (ou "ESTRUTURA OK"). Se os
testes em `/tmp/opencode/` não existirem no computador de casa, **crie testes
equivalentes ou avise a usuária** — não mexa no código sem validar.

### 7. Como responder para ela

- Uma etapa por vez, com frases curtas.
- Antes de cada ação na conta dela (criar projeto, criar usuário, commit, push),
  pergunte e espere o "pode seguir".
- Se der erro, traduza o erro para linguagem simples e pergunte antes de tentar
  de novo.
- Nunca diga que publicou ou commitou se não tiver feito.

## FIM
