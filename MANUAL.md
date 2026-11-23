# Manual completo — Gestão de Pacientes

Este arquivo guarda todas as instruções detalhadas do sistema. O `README.md` da
página inicial traz só uma apresentação curta.

> **Histórico e rascunhos:** `COMO_CONTINUAR.md` e `PROMPT_PARA_CASA.md` ficam
> na pasta `Removidos/` e não são publicados. O que vale hoje está neste manual
> e em `supabase/COMO_CONFIGURAR.md`.

## Estrutura do projeto

```
Saas Psicologa/
├── index.html           # Página principal (abra este arquivo no navegador)
├── css/
│   └── style.css        # Estilos visuais
├── js/
│   ├── config.js        # Configuração do Supabase (URL e chave anon)
│   ├── cripto.js        # AES-GCM + PBKDF2 (WebCrypto) das evoluções
│   ├── data.js          # Dados, regra de cálculo e armazenamento local
│   ├── backend.js       # Login, MFA, auditoria e sincronização com Supabase
│   ├── meses.js         # Navegação mensal clicável
│   ├── hoje.js          # Painel Hoje + fluxo de sessão com cronômetro
│   ├── seguranca.js     # Senha do prontuário, chave AES e trilha de acesso
│   ├── app.js           # Navegação, modais, utilitários
│   ├── agenda.js        # Grade semanal
│   ├── pacientes.js     # Cadastro de pacientes
│   ├── fontes.js        # Cadastro de convênios
│   ├── lancamentos.js   # Atendimentos + série semanal
│   ├── situacao.js      # Situação dos pagamentos
│   ├── resumos.js       # Totais mensais por convênio
│   ├── backup.js        # Exportar/importar/restaurar backup (JSON, com evoluções)
│   ├── prontuario.js    # Evoluções por sessão + modelos rápidos
│   ├── whatsapp.js      # Confirmação com mensagem pronta (sem API/custo)
│   └── recibos.js       # Recibo para impressão/PDF + dados profissionais
├── assets/              # Identidade visual + ícones do app (192/512)
├── manifest.webmanifest # Dados para instalar no celular
├── sw.js                # Service worker (deixa o sistema disponível offline)
├── supabase/
│   ├── schema.sql       # Tabelas, RLS, auditoria e regra do MFA
│   └── COMO_CONFIGURAR.md # Guia pessoal: contas, senhas e MFA
├── .github/workflows/
│   ├── deploy.yml       # Publicação automática no GitHub Pages
│   └── release.yml      # Release automática ao empurrar uma tag v*
├── scripts/
│   ├── gerar_feed.py    # Gera os feeds a partir das releases do GitHub
│   ├── publicar.ps1     # Windows 11: commit + push + tag/release
│   └── baixar.ps1       # Windows 11: trazer a versão mais recente
├── releases.rss         # Feed RSS 2.0 recomendado (para o start.me)
├── releases.xml         # Mesmo feed, com extensão .xml
├── Livia/               # Documentos pessoais (NÃO versionar — está no .gitignore)
├── Removidos/           # Histórico/rascunhos pessoais (NÃO versionado)
├── README.md            # Apresentação curta do site
├── MANUAL.md            # Este arquivo
├── RELEASE_NOTES_v*.md   # Notas de cada versão publicada
└── .gitignore           # Arquivos ignorados pelo git
```

## Como usar localmente (passo a passo)

1. Abra a pasta `Saas Psicologa` no computador.
2. Dê um clique duplo no arquivo `index.html`.
3. O sistema abrirá no navegador padrão (Chrome, Safari, Edge, etc.).
4. No celular, envie a pasta para o aparelho e abra o `index.html`.

O sistema funciona **offline** e guarda os dados no próprio navegador (localStorage). Para **instalar no celular e usar sem internet de verdade**, é preciso publicar o site em HTTPS (por exemplo, GitHub Pages) — abrindo o arquivo direto do computador, o navegador não permite essa instalação.

> **Importante:** a cifragem das evoluções usa WebCrypto, que alguns navegadores
> não liberam quando o arquivo é aberto como `file://`. Para ter criptografia
> garantida, use sempre o endereço publicado em HTTPS:
> https://myttoz.github.io/Saas-psicologia/

## Regra de cálculo

O percentual cadastrado em cada convênio representa **sempre o valor recebido**:

| Convênio | Percentual inicial |
|---|---|
| Clínica | 30% |
| Particular | 70% |
| Cideslestes | 40% |
| Unimed | vazio (informe quando quiser calcular) |

Para cada atendimento de R$ 1.000,00 com 70%:

- **Total produzido**: R$ 1.000,00
- **Total ganho**: R$ 700,00
- **Total repasse**: R$ 300,00

Enquanto o convênio estiver sem percentual, os campos de ganho e repasse mostram `—`.

## O que já está pronto (esta versão)

- **Painel Hoje** (página inicial): atendimentos do dia, quantos aguardam
  confirmação, valor a receber hoje, ganho do mês e os cards **Faltam confirmar**
  (agendados com botão de WhatsApp) e **Quem deve** (pendentes com total e atalho
  "Marcar pago"). Botão **Iniciar sessão** marca "Compareceu", liga um cronômetro
  de 50 minutos (sobrevive a atualizar a página) e **Finalizar sessão** grava a
  duração. **Cancelar** volta para "Agendado".
- **Agenda semanal**: grade seg–dom, 7h–20h, clique no vazio
  cria agendamento com data/horário pré-preenchidos, clique no chip edita,
  navegação de semanas e destaque do dia atual. Busca no topo por **nome do
  paciente** e por **data** (mostra só aquele dia; "Limpar busca" restaura a semana).
- **Presença**: Agendado / Compareceu / Faltou / Cancelou — campo no modal e
  coluna na tabela de Lançamentos. Agendado aparece em cinza verde claro e
  Compareceu em verde forte, para diferenciar de relance.
- **Prontuário/evolução por sessão**: queixa, intervenção, evolução e plano para
  a próxima; 4 modelos rápidos, histórico buscável por paciente ou texto e botão
  "Escrever evolução" no Painel Hoje (já preenche paciente e data). Evoluções
  cifradas com AES-GCM, bloqueio por inatividade e trilha de acesso local e no
  banco.
- **Repetição semanal**: criar 4/8/12 sessões de uma vez (retornos fixos),
  sem duplicar o que já existe.
- **Confirmação pelo WhatsApp**: botão em cada agendado abre o WhatsApp com a
  mensagem pronta (sem API e sem custo). Se não abrir, a mensagem é copiada.
- **Recibo em PDF**: botão "Recibo" nos atendimentos pagos (Painel Hoje,
  Lançamentos e Situação Paciente). Na janela de impressão, escolha
  "Salvar como PDF". O nome e o CPF são configuráveis em **Dados do recibo** na
  sidebar; sem configuração, aparece "Psicóloga". O **CRP já vem impresso como
  `04/74163`** — não há mais campo em branco para preencher à mão. Também é
  possível anexar uma **imagem da assinatura** (PNG/JPG): ela aparece no recibo
  **junto com a linha para assinar** (a linha continua visível), é reduzida
  automaticamente e fica salva só neste navegador. Abaixo do nome e do CRP vai a
  logo como **marca d'água centralizada**. O botão "Remover assinatura" tira só a
  imagem, mantendo a linha.
- **Exportar/Importar backup (JSON)** na sidebar — leva os dados entre máquinas,
  incluindo as evoluções e os dados do recibo (backups antigos continuam sendo
  aceitos).
- **Backup automático**: a cada alteração salva, o sistema guarda um retrato no
  próprio navegador (`saas_backup_auto`). O botão **🕘 Restaurar automático**
  volta para esse último retrato, com confirmação. A sidebar mostra quando ele
  foi salvo. Ele serve para voltar atrás **no mesmo navegador** — para trocar de
  máquina, use Exportar/Importar.
- **Senha do prontuário com AES-GCM**: a senha gera, por PBKDF2-HMAC-SHA256 com
  600.000 iterações, uma chave que cifra cada evolução (`cifrado: true, iv,
  dados`). A chave fica só na memória; o que é salvo é um "registro da chave"
  com sal e um texto de conferência. A senha em texto nunca é salva. Senhas
  antigas continuam funcionando e são migradas no primeiro desbloqueio. Veja
  os detalhes em "Como usar o prontuário", abaixo.
- **PWA**: manifesto, service worker e ícones já incluídos. Depois de publicar em
  HTTPS, use o menu do navegador **Adicionar à tela inicial** / **Instalar app**
  para abrir como aplicativo e usar offline.
- **Nuvem (ligada)**: login obrigatório com e-mail/senha (e código de 6 números
  quando o MFA estiver ativo) e sincronização via Supabase. A tela de entrada se
  chama **Bem-vinda**, tem fundo opaco e não pode ser fechada clicando fora ou
  com ESC. **Google removido**: só entram contas criadas por você. A nuvem é a
  fonte da verdade; nada sobe automático do navegador. Guia em
  `supabase/COMO_CONFIGURAR.md`.
- **Verificação em duas etapas sempre disponível**: botão **🔐 Verificação em
  duas etapas** na barra lateral. Cada pessoa entra com a sua conta e cadastra o
  QR no próprio celular; clicando de novo, cadastra um segundo aplicativo de
  reserva. Ter clicado em “Agora não” no aviso automático não esconde o botão.
- Menu lateral: Hoje, Agenda, Resumos, Lançamentos, Convênios, Pacientes,
  Prontuário e Situação Paciente.
- Cabeçalho de meses clicável (12 meses do ano atual) em Lançamentos, Situação Paciente e Resumos.
- Cadastro de convênios com valor fixo ou variável e percentual recebido
  (percentual editado somente na tabela de convênios — sem bloco duplicado).
- Cadastro de pacientes com capitalização automática do nome e máscara de moeda.
  Busca no topo da aba por **nome ou convênio** (sem acento também funciona).
- Lançamentos com data preenchida automaticamente, mas editável (botão "Hoje" restaura a data atual), horários de 30 em 30 minutos das 7h às 20h, autocomplete de pacientes e criação automática de paciente quando o nome não existe.
  Busca no topo por **qualquer coluna visível** (data, horário, tipo, paciente,
  convênio, forma de pagamento, valor, a receber, status e presença — menos a
  coluna Ação). Nas colunas **Status** e **Presença** há uma caixinha em cada
  linha e uma no cabeçalho: marque todas ou só algumas e use a barra acima da
  tabela para alterar várias de uma vez. "Limpar seleção" desmarca tudo.
- Situação Paciente com botão rápido para confirmar ou desfazer pagamentos.
- Resumos com total produzido, ganho e repasse separados por convênio.
- **Exportação para o contador**: na aba Resumos, o botão **Enviar ao contador
  (CSV)** baixa o mês selecionado com apenas 7 colunas: **Data, Convênio, Forma
  de pagamento, Valor, Ganho, Repasse e Observações**. Não inclui paciente,
  horário, status nem presença — são dados desnecessários para a contabilidade.
  A última linha é um **TOTAL** com a soma de Valor, Ganho e Repasse. O arquivo
  abre no Excel com acentos, separador `;` e vírgula decimal.
- Atalho Ctrl+O (ou Command+O) abre o "novo" da aba ativa.
- Marca d'água discreta da identidade visual no fundo do sistema.

## Como usar o prontuário

1. Abra a aba **Prontuário**. Na primeira vez, o sistema pede para criar uma
   senha (mínimo de 4 caracteres) — anote-a em local seguro.
2. Clique em **+ Nova evolução** (ou Ctrl+O). Escolha um modelo rápido se quiser
   e preencha queixa, intervenção, evolução e plano.
3. Ao finalizar uma sessão no Painel Hoje, use **Escrever evolução**: o paciente
   e a data já vêm preenchidos.
4. Use a busca para encontrar evoluções por nome ou por qualquer palavra do texto.
5. O botão **Bloquear** e o bloqueio automático após 15 minutos protegem o
   acesso. A **trilha de acesso** mostra entradas, saídas, consultas, criações,
   edições e exclusões (com as iniciais do paciente, sem o texto clínico).

### O que a senha do prontuário protege — e o que não protege

**Como funciona:** a senha nunca é guardada em texto. O que fica no navegador é
um registro `pbkdf2$600000$<sal>$<hash>` (sal de 16 bytes, hash SHA-256 de 32
bytes) e um registro da chave AES (`aesgcm$...`). A chave AES de verdade é
derivada da senha quando você desbloqueia e existe **somente na memória**; ao
sair ou trancar, ela é descartada. Cada evolução é salva como
`{ id, cifrado: true, iv, dados }` — o texto clínico não aparece legível no
localStorage, no backup nem no JSON que vai para a nuvem. A cifragem usa
AES-GCM com tag de 128 bits: se alguém alterar um byte do registro cifrado, a
leitura falha em vez de mostrar texto trocado.

**O que isso resolve:**

- Impede que alguém que abra o site no mesmo navegador veja o prontuário sem a
  senha — nem lendo o armazenamento direto.
- As evoluções viajam cifradas para a nuvem e para o backup. Mesmo que o JSON
  vaze, o conteúdo clínico continua fechado sem a senha.
- Depois de 3 erros, há bloqueio de 30 segundos (continua ao recarregar); após
  15 minutos parada, o prontuário tranca sozinho.
- Trocar a senha exige a senha atual **e** a conta da nuvem confirmada com o
  código do aplicativo (reautenticação). A troca é atômica: todas as evoluções
  são recifradas antes de qualquer coisa ser gravada. Se der erro, a senha e a
  chave antigas continuam valendo e nada fica ilegível.
- A trilha de acesso fica no navegador e também no banco (`auditoria`), com as
  iniciais do paciente em vez do texto clínico.

**O que isso NÃO resolve (seja honesta com isso):**

- A senha do prontuário **não tem recuperação**. Ela é a única coisa que abre a
  chave. Se esquecer, não há como decryptar as evoluções — nem você, nem nós.
  Anote-a em local seguro. (Isso não é a senha da conta Supabase, que pode ser
  redefinida no painel.)
- O que não é evolução — por exemplo CPF e assinatura do recibo, nomes e
  valores — continua legível no JSON. O Supabase protege o acesso com login,
  RLS e MFA, mas não cifra esses campos para a própria profissional.
- O sistema roda no navegador, sem servidor de aplicação. A proteção depende de
  você manter o computador protegido, usar o site em HTTPS e guardar bem os
  backups.
- Isto não substitui prontuário eletrônico certificado, assinatura digital nem
  as obrigações do CFP/LGPD.

## Verificação em duas etapas (MFA)

Se você ativou o MFA na sua conta do Supabase, o login passa a pedir um código
de 6 números do aplicativo autenticador. O mesmo código é pedido antes de
**importar um backup** e antes de **trocar a senha do prontuário**
(reautenticação). Isso vale também no banco: as políticas `aal2` em
`supabase/schema.sql` impedem ler ou gravar dados com um token que só passou
pela senha.

- Onde ativar: painel do Supabase → **Authentication → Users** → seu usuário →
  **MFA** → fator **TOTP**. Ou pelo site, em **Ativar verificação em duas
  etapas** na sidebar.
- Cadastre também um **segundo fator TOTP de reserva**, em outro aplicativo ou
  outro celular, e guarde o QR/segredo em local seguro. O Supabase **não** dá
  códigos de recuperação para usuários do projeto; os códigos que aparecem no
  painel são da conta Supabase da administradora, não da conta do site. Cada
  projeto tem seu próprio fator: códigos de outro projeto não servem aqui. Se
  perder todos os fatores, só removendo o fator no painel do Supabase.
- O passo a passo completo está em `supabase/COMO_CONFIGURAR.md`.

## Como funciona a nuvem

- **Login obrigatório:** a tela **Bem-vinda** tem fundo opaco; clicar fora,
  apertar ESC ou usar atalhos não abre o sistema. O título é só "Bem-vinda".
- **Só contas criadas por você:** o Google foi removido do site e desligado no
  Supabase. Não existe "Continuar sem conectar".
- **Nuvem é a fonte da verdade:** ao entrar, os dados da nuvem substituem os do
  navegador. Se a conta for nova, ela começa vazia e recebe um retrato vazio —
  os dados que estavam no computador **não** são enviados.
- **Sem subida automática:** nada do navegador sobe sozinho. Para levar dados,
  use **Importar backup**, que pede senha da conta e código do aplicativo.
- **Sair limpa tudo:** o botão **Sair** apaga os dados locais deste navegador,
  tranca o prontuário e volta para a tela de login.
- **Trilha:** cada ação sensível gera um registro em `public.auditoria`, que não
  pode ser apagado ou editado pelo site.

## Como usar WhatsApp e recibos

**Confirmação:** no Painel Hoje, use **Enviar confirmação** em um agendado (ou o
botão do card **Faltam confirmar**). O WhatsApp abre com o texto já digitado —
basta escolher o contato e enviar. Se o WhatsApp não abrir, a mensagem é copiada
para você colar. **Copiar mensagem** faz só isso, sem abrir o WhatsApp.

**Recibo:** configure uma vez em **🧾 Dados do recibo** (sidebar). Depois clique
em **Recibo** em qualquer atendimento pago. A janela de impressão do navegador
abre: escolha **Salvar como PDF** e salve onde quiser. O recibo traz paciente,
valor, forma de pagamento, referência ao atendimento, quitação, data e sua
assinatura com nome, **CRP `04/74163`** e CPF, além da logo como marca d'água.
Se você já tinha outro CRP salvo no navegador, abra **Dados do recibo** e ajuste
para `04/74163`.

> O envio pelo WhatsApp é feito por você: o sistema apenas prepara o texto e
> abre o aplicativo. Não há integração com API, custo nem envio automático.

## Como exportar para o contador

1. Aba **Resumos**: escolha o mês desejado nos botões de mês.
2. Clique em **⬇ Enviar ao contador (CSV)**.
3. Envie o arquivo `contador-AAAA-MM.csv` ao contador. Ele contém só data,
   convênio, forma de pagamento, valor, ganho, repasse e observações, mais a
   linha **TOTAL** no final com as somas de valor, ganho e repasse.
4. Se as colunas não separarem sozinhas no Excel, use **Dados → Texto para
   Colunas** com delimitador `;`.

> Convênios sem percentual aparecem com ganho/repasse em branco e a linha
> TOTAL avisa que está parcial.

## Backup automático e instalação no celular

**Voltar atrás:** a sidebar mostra a data do último retrato automático. Se
apagar algo por engano, clique em **🕘 Restaurar automático**, confirme e os
dados daquele retrato voltam. O retrato é atualizado sempre que o sistema salva
uma alteração. Ele fica só neste navegador — não substitui o **Exportar backup**.

**Senha:** se você já usava a versão anterior, entre normalmente uma vez. A senha
antiga continua funcionando e é convertida para o formato mais forte sem você
precisar fazer nada; as evoluções legadas são cifradas nessa primeira abertura.
Se esquecer a senha do prontuário, não há recuperação — as evoluções cifradas
continuam no backup, mas sem a senha não podem ser lidas.

**Celular:** com o site no ar em HTTPS, abra o endereço no celular e use o menu
do navegador:

- Chrome/Android: **⋮ → Adicionar à tela inicial** ou **Instalar app**.
- Safari/iPhone: **Compartilhar → Adicionar à Tela Inicial**.

Depois disso, o ícone abre como aplicativo e as telas já salvas funcionam sem
internet. As alterações são sincronizadas com a nuvem quando há conexão.

> O service worker (`sw.js`) é ignorado quando você abre o `index.html` direto
> do computador. Isso é uma regra dos navegadores, não um erro do sistema.

## Cores da marca

- Verde salvia: `#7A9E8F`
- Terracota: `#C16A4A`
- Fundo off-white: `#F7F6F2`

## Nuvem e publicação (estado atual)

1. ✅ Projeto Supabase criado; tabelas `dados` e `auditoria` com RLS, função de
   MFA e usuário de acesso criado por você.
2. ✅ Login com e-mail/senha obrigatório, com código de 6 números quando o MFA
   estiver ativo. Google removido do site e desligado no painel.
3. ✅ `js/config.js` preenchido com a URL do projeto e a chave **anon**;
   `usarBackend: true`. A chave `service_role` nunca foi usada.
4. ✅ Nuvem como fonte da verdade: sem "Continuar sem conectar" e sem subida
   automática de dados locais.
5. ✅ Evoluções cifradas (AES-GCM), backup versão 4, trilha no banco e CSP real.
6. ✅ Site publicado em https://myttoz.github.io/Saas-psicologia/ e release
   automática por tag.

> A chave anon é pública e pode ficar no site. Cada projeto Supabase tem as
> próprias chaves: as do projeto de Finanças não servem aqui.

## Novidades de cada versão (release)

Ao empurrar uma tag `v*`, o GitHub cria a release e atualiza o feed publicado
no próprio site (o que o widget do start.me lê):

**https://myttoz.github.io/Saas-psicologia/releases.rss**

O mesmo conteúdo também está em `releases.xml`. O endereço `.rss` é o
recomendado porque o GitHub Pages o entrega como `application/rss+xml`, o tipo
que os leitores de feed esperam. Se o widget continuar "sem artigos", apague o
feed antigo dentro do widget e adicione o endereço acima como novo.

O feed do GitHub (`https://github.com/Myttoz/Saas-psicologia/releases.atom`)
também existe, mas alguns leitores não conseguem acessá-lo.

1. Faça as alterações e rode `git add .`, `git commit -m "mensagem"` e
   `git push origin main` (isso publica o site).
2. Rode `git tag -a v1.0.0 -m "v1.0.0"` e `git push origin v1.0.0`
   (isso publica a release).
3. As notas vêm de `RELEASE_NOTES_v1.0.0.md`. Para a próxima versão, crie
   `RELEASE_NOTES_v1.1.0.md`, use a tag `v1.1.0` e assim por diante.

> Se o `git push` pedir usuário/senha, use um token do GitHub com permissões
> `repo` e `workflow`.

## Próximos blocos (a desenvolver)

1. Gestão Anual (criação de anos limpos e exclusão com confirmação).

## Versionamento (Git)

Cada etapa concluída gera um commit na branch `main`. A pasta `Livia/`
continua fora do versionamento (está no `.gitignore`). Depois do push da
branch, empurre a tag `v*` para gerar a release automática.

Comandos úteis:

```bash
git status                  # o que mudou
git diff                    # mudanças ainda não confirmadas
git log --oneline           # histórico dos commits
git tag -l                  # versões já marcadas
```

> A pasta `Livia/` (documentos pessoais) e `backup-*.json` estão no
> `.gitignore` e **nunca** vão para o GitHub.

## Suporte

Qualquer ajuste de visual, novo campo ou mudança de fluxo, avise que atualizamos os arquivos correspondentes.
