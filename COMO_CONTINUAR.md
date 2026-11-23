# Como continuar — ponto de parada

Projeto: SaaS de gestão de atendimentos (psicóloga). Versão local, ainda sem banco online.

> Para continuar em outro computador: copie o bloco entre `COMEÇO` e `FIM` do
> arquivo `PROMPT_PARA_CASA.md` e cole na IA de lá. Ele foca **somente na próxima
> etapa** — guiar a Lívia na criação do Supabase e na publicação — e deixa claro
> que o recibo (CRP `04/74163`, linha de assinar, marca d'água) já está pronto e
> não deve ser refeito.

## O que já está pronto (histórico)

**Fase 0 — base (notebook Linux):**
- Interface e regras principais: 8 arquivos JS, HTML válido, cálculos testados.
- Capitalização do nome, borda terracota no Tab, logo com 3 linhas.
- Seção "Avaliação" no Resumo.

**Fase 1 — segurança dos dados (Windows):**
- ✅ Git inicializado (repositório local, sem remote ainda).
- ✅ `.gitignore` exclui `Livia/` (documentos pessoais) e `backup-*.json`.
- ✅ **Exportar/Importar backup** (JSON) — botões na sidebar. Leva dados entre máquinas.
- ✅ Bloco redundante `percentuais` removido (HTML, modal, JS, CSS, localStorage).
  Agora a única fonte do percentual é o cadastro de convênios.

**Fase 2 — agenda e faltas:**
- ✅ Página **Agenda** (nova): grade segunda a domingo, 7h–20h,
  chips por atendimento coloridos por presença, clique no vazio cria agendamento
  com data/horário pré-preenchidos, clique no chip edita.
- ✅ **Presença**: Agendado / Compareceu / Faltou / Cancelou — campo no modal
  e coluna na tabela de Lançamentos.
- ✅ **Repetição semanal**: criar 4/8/12 sessões semanais de uma vez (retornos
  fixos). Não duplica se já existir sessão no mesmo dia/horário.
- ✅ `duplicar` agora reseta presença para "agendado".

**Fase 3 — ajustes de uso (volta do Drive):**
- ✅ Horários limitados às 7h–20h (grade da agenda + botões do lançamento).
  O último slot é 20:00; sessões antigas depois disso aparecem nele.
- ✅ Cores separadas: **Agendado** em cinza verde claro e **Compareceu** em verde
  forte, para diferenciar de relance na agenda e no Painel Hoje.
- ✅ Data do lançamento continua automática, mas agora é editável.
  Botão "Hoje" ao lado do campo restaura a data atual.
- ✅ Rótulo único "Avaliação" (sem "avulsas") no Resumo e no tipo de atendimento.

**Fase 4 — Painel Hoje (aprovado pela Lívia, ainda sem commit):**
- ✅ Nova página inicial **Hoje** (`js/hoje.js`): 4 indicadores (atendimentos de
  hoje, aguardando confirmação, a receber hoje e ganho do mês), lista dos
  atendimentos do dia com ações rápidas, próximos atendimentos e pendências.
- ✅ **Fluxo de sessão**: "Iniciar sessão" marca presença `compareceu`, guarda
  `{ id, inicio }` em `localStorage` (`saas_sessao_ativa`) e liga cronômetro de
  50 min que continua correndo após atualizar a página. "Finalizar sessão" grava
  `duracao` + `sessaoFinalizada`; "Cancelar" volta para `agendado`.
- ✅ Não permite duas sessões ao mesmo tempo; sessão órfã (lançamento apagado)
  é descartada automaticamente.
- ✅ `Marcar como pago` direto na lista do Painel + botão "Ver situação".
- ✅ Ao salvar/excluir um lançamento, o Painel Hoje é atualizado junto.
- ✅ Botão **Escrever evolução** nos atendimentos realizados, já com
  paciente/data preenchidos (liga o Painel ao Prontuário).

**Fase 5 — Prontuário/evolução (aprovado pela Lívia, ainda sem commit):**
- ✅ Nova página **Prontuário** com 4 campos curtos por sessão (queixa,
  intervenção, evolução, plano), 4 modelos rápidos e histórico buscável por
  paciente ou texto, com botões editar/excluir.
- ✅ Correção pedida pela Lívia: escolher **outro modelo** troca o texto dos
  campos que vieram de modelo. O que foi digitado manualmente é preservado.
- ✅ `js/seguranca.js`: senha local na primeira entrada, senha guardada como
  hash (não em texto puro), 3 tentativas erradas = espera de 30 s, bloqueio
  manual e bloqueio automático após 15 min de inatividade.
- ✅ **Trilha de acesso**: registra criação/entrada/saída, senha errada,
  consulta, criação, edição e exclusão de evolução. Usa só iniciais do paciente
  e mantém no máximo 500 registros.
- ✅ Evoluções passam a fazer parte do `Store` e do backup; backups antigos,
  sem evoluções, continuam sendo importados normalmente.
- ✅ `app.sair()` bloqueia o prontuário; Ctrl+O na aba abre nova evolução.

**Fase 6 — WhatsApp + recibos (bloco atual, ainda sem commit):**
- ✅ `js/whatsapp.js`: mensagem pronta com primeiro nome, tipo de atendimento,
  data e horário. **Enviar confirmação** abre `https://wa.me/?text=` (sem API e
  sem custo) e **Copiar mensagem** copia o texto. Se o WhatsApp não abrir,
  copia automaticamente como fallback.
- ✅ Botões de WhatsApp nos agendados do Painel Hoje e no card **Faltam
  confirmar** (agendados de hoje em diante, até 5, com atalho de envio).
- ✅ Card **Quem deve**: pendentes do mês com total a receber e atalho
  "Marcar pago" (até 5). Junto com o card de pendências já existente.
- ✅ `js/recibos.js`: recibo para impressão/PDF com paciente, valor, forma de
  pagamento, referência, quitação, data e assinatura. Botão **Recibo** aparece
  só nos atendimentos pagos (Painel Hoje, Lançamentos e Situação Paciente).
- ✅ **Dados do recibo** na sidebar: nome e CPF configuráveis. Sem configuração,
  aparece "Psicóloga". O **CRP é fixo `04/74163`**, informado pela profissional —
  impresso automaticamente, sem campo em branco para preencher à mão.
- ✅ `@media print` mostra só o recibo — na janela de impressão, escolher
  "Salvar como PDF". Nenhuma biblioteca externa foi adicionada.
- ✅ `dadosProfissional` entra no `Store` e no backup, agora **versão 3**.
  Backups v1 e v2 continuam sendo importados (nome/CPF zerados, CRP `04/74163`).

**Fase 7 — melhorias pedidas antes do próximo bloco (ainda sem commit):**
- ✅ **Campo de imagem da assinatura** em **Dados do recibo**: arquivo PNG/JPG,
  prévia, remoção, redução automática da imagem (largura máx. 340 px; se ficar
  grande demais, vira JPG com fundo branco). A imagem aparece no recibo impresso
  **junto com a linha de assinar** (a linha continua visível) e viaja no backup v3
  junto com nome/CRP/CPF.
- ✅ **Busca na Agenda** (`#agendaBusca` + `#agendaBuscaData`): filtra por nome
  do paciente e por uma data específica (a grade mostra só aquele dia), com
  resumo de resultados e botão "Limpar busca".
- ✅ **Busca em Pacientes** (`#pacBusca`): nome ou convênio, aceitando palavras
  digitadas sem acento ("clinica" encontra "Clínica").
- ✅ **Busca em Lançamentos** (`#lancBusca`): percorre todas as colunas da
  tabela, exceto Ação — data (dd/mm/aaaa e AAAA-MM-DD), horário, tipo, paciente,
  convênio, forma de pagamento, valor, a receber, status e presença. Também
  ignora acentos.
- ✅ **Seleção em massa em Lançamentos**: caixinha em Status e Presença em cada
  linha e no cabeçalho da coluna (marca todos os visíveis; estado parcial aparece
  como "meio marcado"). Barra acima da tabela com "Novo status" / "Nova presença",
  opção "Não alterar", botões **Aplicar status**, **Aplicar presença** e
  **Limpar seleção**. Ao trocar de mês, a seleção é descartada. Ao aplicar,
  salva no navegador e atualiza Painel Hoje e Agenda.
- ✅ Buscas usam a função compartilhada `normalizarTexto` (`js/data.js`).

**Fase 8 — exportação para o contador (concluída, ainda sem commit):**
- ✅ Um único botão no topo de **Resumos**: **⬇ Enviar ao contador (CSV)**.
  Usa o mês selecionado na própria aba Resumos.
- ✅ Pedido da Lívia: o contador não precisa de muita informação. O arquivo tem
  **somente 7 colunas**: Data, Convênio, Forma de pagamento, Valor, Ganho,
  Repasse e Observações. Foram removidos paciente, horário, tipo, status,
  presença, percentual, quantidade e linhas de TOTAL.
- ✅ `js/resumos.js`: `exportarContador()` gera uma linha por atendimento do mês,
  com data em `dd/mm/aaaa` e valores no padrão brasileiro.
- ✅ CSV amigável para o Excel: BOM UTF-8, separador `;`, vírgula decimal,
  quebras `\r\n`, aspas dobradas em textos com `;`/`"`/quebra de linha e
  proteção contra fórmulas (texto que começa com `=`, `+`, `-` ou `@`).
- ✅ Última linha **TOTAL** soma apenas as colunas com valor (Valor, Ganho e
  Repasse); colunas de texto ficam vazias. Se houver convênio sem percentual,
  a observação do TOTAL avisa que ganho/repasse estão parciais.
- ✅ Convênios sem percentual ficam com ganho/repasse vazios nas linhas dos
  atendimentos. Mês sem lançamentos avisa e não baixa arquivo.
- ✅ Nome do arquivo: `contador-AAAA-MM.csv` (sem nome pessoal, seguindo a
  regra de linguagem genérica).

**Fase 9 — Segurança + PWA (concluída, ainda sem commit):**
- ✅ Senha do prontuário trocada de hash simples para **PBKDF2-SHA256 puro em
  JavaScript**: sal aleatória de 16 bytes, 12.000 iterações, chave de 32 bytes.
  Formato guardado: `pbkdf2$<iteracoes>$<saltHex>$<hashHex>`.
- ✅ SHA-256, HMAC e PBKDF2 implementados no próprio `js/seguranca.js` (sem
  biblioteca e sem servidor) — funciona até abrindo o `index.html` localmente.
- ✅ Senhas antigas (hash simples) continuam funcionando: na primeira vez que a
  pessoa desbloqueia, o registro é migrado automaticamente para PBKDF2 e a
  trilha registra "Senha atualizada para proteção mais forte".
- ✅ `trocarSenha()` e `criarSenha()` agora geram registros PBKDF2 com sal nova.
  Comparação usa tempo constante para não vazar a senha por tempo de resposta.
- ✅ **Backup automático**: `Store.salvar()` chama `backupModulo.registrarAlteracao()`,
  que guarda um retrato em `localStorage` (`saas_backup_auto`) com fontes,
  pacientes, lançamentos, evoluções e dados do recibo.
- ✅ Botão **🕘 Restaurar automático** na sidebar, com confirmação antes de
  substituir os dados. Texto `backupAutoInfo` mostra a data/hora do último retrato.
- ✅ Flag `_importando` impede que importar um arquivo (ou restaurar) sobrescreva
  o retrato automático antes da confirmação. Retrato corrompido é ignorado.
- ✅ **PWA**: `manifest.webmanifest`, `sw.js` e ícones PNG (192/512) gerados do
  logo real. `index.html` referencia manifest, `theme-color` e ícone Apple.
- ✅ `app.registrarServiceWorker()` só registra quando NÃO é `file://` — ou seja,
  PWA/offline de verdade passa a funcionar somente após publicação em HTTPS.
- ✅ Service worker: cache versionado (`saatendimentos-v2`), remove caches antigos;
  navegação e arquivos com **rede primeiro** (fallback para o cache offline). Isso
  foi ajustado antes do commit: com `cache primeiro`, se a configuração da nuvem
  fosse preenchida depois da publicação, o navegador poderia continuar servindo o
  `config.js` antigo e a nuvem nunca ligaria. Links externos (WhatsApp, gov.br)
  ignorados.
- ✅ Ajuste pedido pela Lívia no recibo: a **linha para assinar voltou** e agora
  aparece sempre (mesmo quando há imagem da assinatura cadastrada). A imagem,
  quando existe, fica logo acima da linha.
- ✅ **Logo como marca d'água** centralizada abaixo de nome/CRP/CPF, usando
  `assets/logo.jpeg` com opacidade baixa e tons de cinza (`.recibo-marca`).
- ✅ O recibo espera as imagens carregarem antes de chamar `window.print()`,
  para que assinatura e marca apareçam também no PDF salvo.
- ✅ **CRP fixo `04/74163`** (informado pela Lívia): criado `CRP_PADRAO` em
  `js/data.js` e usado como fallback no carregamento (`Store.carregar()`) e na
  importação/restauração de backup (`backupModulo._aplicarDados`). O recibo
  imprime `CRP 04/74163` sempre, e a antiga linha `CRP: ____________` foi
  **removida** — não precisa mais preencher à mão. O campo do modal mostra o CRP
  como sugestão (`placeholder`) e, se já houver outro valor salvo no navegador,
  basta abrir **Dados do recibo** e ajustar.
- ✅ A linha de assinar tem agora **área de 34 px com borda embaixo**
  (`.recibo-linha-assinatura`), para caber a assinatura manuscrita na folha
  impressa; antes ela era uma borda em cima, sem espaço.

**Fase 10 — Nuvem + login + GitHub Pages (configurada, aguardando publicação):**
- ✅ `js/config.js`: `usarBackend: true`, URL do projeto e chave anon preenchidas.
  A URL informada pela Lívia veio com o final `/rest/v1/`; foi removido, porque o
  `Backend` monta os caminhos (`/auth/v1/...`, `/rest/v1/...`) a partir da URL
  base. A chave foi decodificada e conferida: `role: anon`, `ref` igual ao da URL.
  A tabela `dados` existe no projeto (consulta anon retornou 401/permissão
  negada, que é o esperado com RLS). Nenhuma chave `service_role` foi usada.
- ✅ `js/backend.js`: login via Supabase Auth (`/auth/v1/token?grant_type=password`),
  token e usuário em `sessionStorage`, verificação de sessão em `/auth/v1/user`.
- ✅ Sincronização em uma linha por usuário na tabela `dados` (JSON): leitura
  com filtro `user_id=eq.<id>` e escrita com upsert (`on_conflict=user_id`,
  `Prefer: resolution=merge-duplicates`). Cabeçalhos `apikey` e `Bearer`.
- ✅ Ao entrar, o sistema compara a data da nuvem com a do navegador
  (`saas_sync_at`) e **pergunta** qual versão usar — nunca substitui sem escolha.
- ✅ `Store.salvar()` registra `saas_sync_at` e chama `Backend.salvarSeConectado()`,
  com intervalo de 1,5 s para agrupar várias alterações em um único envio.
- ✅ Tela de login **Bem-vinda** com logo e fundo próprio da marca. O login é
  obrigatório: clique fora e ESC não fecham a tela, e não existe mais botão para
  entrar sem conectar. `app.sair()` desconecta e volta a pedir login.
- ✅ `supabase/schema.sql`: tabela `dados` + RLS com quatro políticas (select,
  insert, update, delete) usando `auth.uid() = user_id`. Pode ser rodado mais de
  uma vez.
- ✅ `supabase/COMO_CONFIGURAR.md`: guia em 6 passos (criar projeto, rodar SQL,
  criar usuário, copiar URL/chave anon, preencher config, proteger o painel).
- ✅ `.github/workflows/deploy.yml`: publica no GitHub Pages **somente**
  `index.html`, `css`, `js`, `assets`, manifesto e service worker — não publica
  `Livia/`, backups, README nem o guia do Supabase.
- ✅ `sw.js` passou a cachear `config.js` e `backend.js` para não quebrar offline.

## Testes

- `node --check` em todos os 17 JS + `sw.js`: OK.
- HTML válido, sem IDs duplicados e sem IDs faltando no `getElementById`: OK.
- CSS com chaves balanceadas, estilos dos cards e `@media print`: OK.
- Ordem dos scripts e `page-hoje` como página inicial: OK.
- Handlers onclick/onchange/input/submit × funções existentes (80): OK.
- `manifest.webmanifest` é um JSON válido: OK.
- `git diff --check`: OK.
- Teste funcional do Painel Hoje (stats, lista, cronômetro, persistência,
  finalizar/cancelar, pago, sessão órfã): 32/32 OK.
- Teste funcional do Prontuário (senha PBKDF2, trilha, modelos, troca de modelo,
  CRUD, busca, atalho da sessão, bloqueio, backup v1/v2/v3, 20:00): 59/59 OK.
- Teste funcional de WhatsApp/recibos (mensagem, link wa.me, fallback de cópia,
  configuração, impressão, padrão "Psicóloga", escape, cards, botões de recibo,
  backup v3, Store, linha de assinatura e logo como marca d'água): 77/77 OK.
- Teste funcional das melhorias (assinatura imagem, prévia/remoção/backup,
  buscas da Agenda/Pacientes/Lançamentos, caixinhas e alteração em massa de
  status e presença): 43/43 OK.
- Teste funcional da exportação CSV (7 colunas só, linha TOTAL com somas, BOM,
  separador `;`, vírgula decimal, sem percentual, aspas/fórmulas, nome de
  arquivo, mês vazio): 20/20 OK.
- Teste funcional de Segurança/PWA (vetores SHA-256/HMAC/PBKDF2, sais diferentes,
  migração da senha antiga, troca de senha, desbloqueio legado, retrato
  automático, restauração, ícones, manifest, service worker, rede primeiro no
  service worker e versão v2 do cache): 48/48 OK.
- Teste funcional da nuvem (modo local, login, headers, leitura/escrita, upsert,
  debounce do Store, escolha de versão, erro de senha, logout, SQL/RLS, guia,
  workflow e HTML de login): 50/50 OK.

## Regra de ouro do cálculo

O percentual cadastrado representa **sempre o valor que a profissional recebe**.

- Ganho = valor × percentual
- Repasse = valor − ganho

Convênios iniciais: Clínica 30%, Particular 70%, Cideslestes 40%, Unimed vazia
(enquanto vazia, nenhum cálculo é exibido).

## Próximos blocos (nesta ordem)

1. **Publicar (próximo passo)** — o Supabase já está configurado e o repositório
   `https://github.com/Myttoz/Saas-psicologia.git` já foi criado. Falta ligar o
   remoto, dar o **push da branch `main`** (o workflow só dispara em `main`) e
   ativar GitHub Pages (Source = GitHub Actions). Conferir antes se não há dado
   real em `Livia/` nem em backup. O prompt para a IA guiar está em
   `PROMPT_PARA_CASA.md`.
2. **Teste da Lívia** no Windows: conferir o recibo em PDF com a **linha de
   assinar de volta** e a **logo centralizada como marca d'água**, o envio da
   confirmação pelo WhatsApp, os cards "Faltam confirmar"/"Quem deve", a troca
   de modelos rápidos, as buscas e as caixinhas de seleção. Também conferir a
   senha antiga entrando uma vez e o botão **Restaurar automático**. Último
   horário confirmado: 20:00.
3. **Gestão Anual** por último (anos limpos + exclusão com confirmação).

## Atenção

- Os dados ficam no `localStorage` do navegador. **Copiar a pasta NÃO copia
  pacientes nem lançamentos** — usar **Exportar/Importar backup** ou o botão
  **Restaurar automático** da sidebar. O retrato automático fica em
  `saas_backup_auto` e é atualizado a cada salvamento; serve para voltar atrás
  neste mesmo navegador, não para trocar de máquina.
- A pasta `Livia/` é referência pessoal e está no `.gitignore` (nunca publicar).
- A sessão com cronômetro ativo fica só no `localStorage` (`saas_sessao_ativa`);
  o backup JSON não exporta cronômetro em andamento.
- O backup JSON **contém o texto das evoluções** e os dados do recibo (nome,
  CRP, CPF e a imagem da assinatura em base64). Guarde-o em local protegido.
- O WhatsApp **não envia nada automaticamente**: o sistema só abre o aplicativo
  com o texto pronto. Não há API, custo nem Google Script/Cloud.
- O recibo usa a janela de impressão do navegador. Para salvar em PDF, escolher
  **Salvar como PDF** — não é gerado um arquivo automaticamente.
- A senha do prontuário é um bloqueio **local** (`saas_seguranca_senha`, agora
  com PBKDF2-SHA256): protege contra curiosidade, mas não substitui login, RLS,
  LGPD ou as normas do CFP. A trilha (`saas_seguranca_trilha`) guarda só iniciais
  do paciente, nunca o texto clínico. Se perder a senha neste navegador, será
  preciso limpar essa chave manualmente (as evoluções continuam no backup).
- PWA/offline **não funciona abrindo o arquivo local** (`file://`); o navegador
  ignora o service worker. Depois de publicar em HTTPS, instalar pelo menu do
  navegador ("Adicionar à tela inicial" / "Instalar app").
- A nuvem está **ligada**: `js/config.js` tem URL e chave anon reais. Ao abrir o
  sistema, aparece a tela de login. A chave `service_role` do Supabase **nunca**
  pode entrar no site. Cada projeto Supabase tem as próprias chaves — as do
  projeto de Finanças não servem para este.
- A sincronização usa **um JSON por profissional** e não é prontuário
  certificado: continue usando Exportar/Importar backup como rede de segurança.
- A imagem da assinatura é apenas uma foto anexada ao recibo: **não é assinatura
  digital**. Assinatura com gov.br exigiria integração online (HTTPS, credenciais
  e backend), fora desta versão local.
- O **primeiro commit local já foi feito** (fases 1–10 e nuvem ligada). A config
  real entrou em um commit seguinte, antes do push.
- Nada foi **publicado** ainda: o remote foi informado, mas o push e a ativação
  do GitHub Pages são os últimos passos.
- Nada de Google Script/Google Cloud nesta etapa.
