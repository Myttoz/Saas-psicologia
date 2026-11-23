# Manual completo — Gestão de Pacientes

Este arquivo guarda todas as instruções detalhadas do sistema. O `README.md` da
página inicial traz só uma apresentação curta.

> **Vai continuar em outro computador?** Abra `PROMPT_PARA_CASA.md`, copie o texto
> entre `COMEÇO` e `FIM` e cole na IA de lá.

## Estrutura do projeto

```
Saas Psicologa/
├── index.html           # Página principal (abra este arquivo no navegador)
├── css/
│   └── style.css        # Estilos visuais
├── js/
│   ├── config.js        # Configuração do Supabase (URL e chave anon)
│   ├── data.js          # Dados, regra de cálculo e armazenamento local
│   ├── backend.js       # Login e sincronização com Supabase
│   ├── meses.js         # Navegação mensal clicável
│   ├── hoje.js          # Painel Hoje + fluxo de sessão com cronômetro
│   ├── seguranca.js     # Senha PBKDF2 do prontuário + trilha de acesso
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
│   ├── schema.sql       # Tabela + RLS (cada conta vê só seus dados)
│   └── COMO_CONFIGURAR.md # Guia em passos para criar o projeto
├── .github/workflows/
│   └── deploy.yml       # Publicação automática no GitHub Pages
├── Livia/               # Documentos pessoais (NÃO versionar — está no .gitignore)
├── README.md            # Apresentação curta do site
├── MANUAL.md            # Este arquivo
├── COMO_CONTINUAR.md    # Ponto de parada e próximos passos
├── PROMPT_PARA_CASA.md  # Prompt para a IA continuar em outro computador
└── .gitignore           # Arquivos ignorados pelo git
```

## Como usar localmente (passo a passo)

1. Abra a pasta `Saas Psicologa` no computador.
2. Dê um clique duplo no arquivo `index.html`.
3. O sistema abrirá no navegador padrão (Chrome, Safari, Edge, etc.).
4. No celular, envie a pasta para o aparelho e abra o `index.html`.

O sistema funciona **offline** e guarda os dados no próprio navegador (localStorage). Para **instalar no celular e usar sem internet de verdade**, é preciso publicar o site em HTTPS (por exemplo, GitHub Pages) — abrindo o arquivo direto do computador, o navegador não permite essa instalação.

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
  "Escrever evolução" no Painel Hoje (já preenche paciente e data). Acesso
  protegido por senha local, bloqueio por inatividade e trilha de acesso.
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
- **Senha do prontuário com PBKDF2**: guardada como
  `pbkdf2$12000$<sal>$<hash>` — sal aleatória de 16 bytes e hash SHA-256 de
  32 bytes, com 12.000 iterações. A senha em texto nunca é salva. Senhas antigas
  continuam funcionando e são atualizadas no primeiro desbloqueio. Veja os
  limites reais em "Como usar o prontuário", abaixo.
- **PWA**: manifesto, service worker e ícones já incluídos. Depois de publicar em
  HTTPS, use o menu do navegador **Adicionar à tela inicial** / **Instalar app**
  para abrir como aplicativo e usar offline.
- **Nuvem (ligada)**: login com e-mail/senha e sincronização automática via
  Supabase. Ao abrir o sistema, aparece a tela "Entrar na sua conta" — use o
  e-mail e a senha criados no Supabase. O guia está em
  `supabase/COMO_CONFIGURAR.md`.
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

**Como ela fica salva:** no navegador, na chave `saas_seguranca_senha`, no
formato `pbkdf2$12000$<sal em hex>$<hash em hex>`. A sal é sorteada pelo
navegador (`crypto.getRandomValues`) e o código recebe a senha 12.000 vezes com
SHA-256 antes de gerar o hash. A comparação com a senha digitada é feita em
tempo constante. A senha em texto puro **não** fica salva em nenhum lugar.

**O que isso resolve:** impede que alguém que abra o site no mesmo navegador
veja o prontuário sem digitar a senha. Depois de 3 erros, há bloqueio de 30
segundos (que continua mesmo recarregando a página); após 15 minutos parada, o
prontuário tranca sozinho. Trocar a senha exige a senha atual.

**O que isso NÃO resolve (seja honesta com isso):**

- A senha é um **bloqueio da interface**, não criptografia do conteúdo. Quem
  tiver acesso ao computador, ao navegador ou ao arquivo de backup consegue ler
  `saas_evolucoes`, o CPF e a assinatura direto no armazenamento, sem senha.
- As evoluções, o CPF e a assinatura viajam para a nuvem e para o backup em
  texto legível dentro do JSON. O Supabase protege o acesso com login e RLS
  (cada conta vê só os próprios dados), mas não criptografa o conteúdo do JSON
  para a própria profissional.
- 12.000 iterações de PBKDF2 em JavaScript puro estão abaixo da recomendação
  atual (a OWASP sugere ~600.000). Mais iterações deixariam o login lento neste
  projeto, que roda sem servidor e sem bibliotecas. Isso é aceitável como
  tranca local, não como cofre de dados clínicos.
- Se a senha for esquecida, não há recuperação: é preciso apagar a chave
  `saas_seguranca_senha` no navegador e criar outra. As evoluções continuam no
  backup.

Na prática: use uma senha que você não usa em mais nada, mantenha o computador
protegido, guarde os backups em local seguro e nunca compartilhe o arquivo JSON.
Este sistema não substitui prontuário eletrônico certificado, assinatura digital
nem as obrigações do CFP/LGPD.

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
precisar fazer nada. Se esquecer a senha, será preciso limpar a chave
`saas_seguranca_senha` manualmente no navegador (as evoluções continuam no backup).

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

1. ✅ Projeto Supabase criado, tabela `dados` com RLS e usuário de acesso.
2. ✅ `js/config.js` preenchido com a URL do projeto e a chave **anon**;
   `usarBackend: true`. A chave `service_role` não foi usada.
3. ✅ Repositório GitHub criado, primeiro commit feito e push realizado na branch `main`.
4. ⏳ Falta ativar em **GitHub → Settings → Pages → Source = GitHub Actions**
   e conferir o site no ar.
5. ⏳ Ao abrir o endereço publicado, entre com e-mail/senha e escolha se usa os
   dados da nuvem ou os deste navegador.

> A chave anon é pública e pode ficar no site. Cada projeto Supabase tem as
> próprias chaves: as do projeto de Finanças não servem aqui.

## Próximos blocos (a desenvolver)

1. Ativar o GitHub Pages e testar o sistema no ar.
2. Gestão Anual (criação de anos limpos e exclusão com confirmação).

## Versionamento (Git)

O primeiro commit foi feito na branch `main` e contém todas as fases. A partir
de agora, cada etapa concluída gera um novo commit. A pasta `Livia/` continua
fora do versionamento (está no `.gitignore`).

Comandos úteis para conferir o estado:

```bash
git status                  # o que mudou
git diff                    # mudanças ainda não confirmadas
git log --oneline           # histórico dos commits
```

> A pasta `Livia/` (documentos pessoais) e `backup-*.json` estão no
> `.gitignore` e **nunca** vão para o GitHub.

## Suporte

Qualquer ajuste de visual, novo campo ou mudança de fluxo, avise que atualizamos os arquivos correspondentes.
