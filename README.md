# Sistema de Atendimentos — Gestão de Pacientes

Sistema web para gestão de atendimentos de psicologia. Roda direto no navegador (PC, notebook, iPhone e Android). Sem necessidade de servidor para começar.

## Estrutura do projeto

```
D:\_App_Saas-Livia\
├── index.html           # Página principal (abra este arquivo no navegador)
├── css/
│   └── style.css        # Estilos visuais
├── js/
│   ├── data.js          # Dados, regra de cálculo e armazenamento local
│   ├── meses.js         # Navegação mensal clicável
│   ├── app.js           # Navegação, modais, utilitários
│   ├── agenda.js        # Grade semanal (página inicial)
│   ├── pacientes.js     # Cadastro de pacientes
│   ├── fontes.js        # Cadastro de convênios
│   ├── lancamentos.js   # Atendimentos + série semanal
│   ├── situacao.js      # Situação dos pagamentos
│   ├── resumos.js       # Totais mensais por convênio
│   └── backup.js        # Exportar/importar backup (JSON)
├── assets/              # Identidade visual
├── Livia/               # Documentos pessoais (NÃO versionar — está no .gitignore)
├── README.md            # Este arquivo
├── COMO_CONTINUAR.md    # Ponto de parada e próximos passos
└── .gitignore           # Arquivos ignorados pelo git
```

## Como usar localmente (passo a passo)

1. Abra a pasta `Saas Psicologa` no computador.
2. Dê um clique duplo no arquivo `index.html`.
3. O sistema abrirá no navegador padrão (Chrome, Safari, Edge, etc.).
4. No celular, envie a pasta para o aparelho e abra o `index.html`.

O sistema funciona **offline** e guarda os dados no próprio navegador (localStorage). Nada é enviado para a internet nesta fase.

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

- **Agenda semanal** (página inicial): grade seg–dom, 7h–22h, clique no vazio
  cria agendamento com data/horário pré-preenchidos, clique no chip edita,
  navegação de semanas e destaque do dia atual.
- **Presença**: Agendado / Compareceu / Faltou / Cancelou — campo no modal e
  coluna na tabela de Lançamentos, com cores na agenda.
- **Repetição semanal**: criar 4/8/12 sessões de uma vez (retornos fixos),
  sem duplicar o que já existe.
- **Exportar/Importar backup (JSON)** na sidebar — leva os dados entre máquinas.
- Menu lateral: Agenda, Resumos, Lançamentos, Convênios, Pacientes e Situação Paciente.
- Cabeçalho de meses clicável (12 meses do ano atual) em Lançamentos, Situação Paciente e Resumos.
- Cadastro de convênios com valor fixo ou variável e percentual recebido
  (percentual editado somente na tabela de convênios — sem bloco duplicado).
- Cadastro de pacientes com capitalização automática do nome e máscara de moeda.
- Lançamentos com data automática, horários de 30 em 30 minutos, autocomplete de pacientes e criação automática de paciente quando o nome não existe.
- Situação Paciente com botão rápido para confirmar ou desfazer pagamentos.
- Resumos com total produzido, ganho e repasse separados por convênio.
- Atalho Ctrl+O (ou Command+O) abre o "novo" da aba ativa.
- Marshal d'água discreta da identidade visual no fundo do sistema.

## Cores da marca

- Verde salvia: `#7A9E8F`
- Terracota: `#C16A4A`
- Fundo off-white: `#F7F6F2`

## Próximos blocos (a desenvolver)

1. Painel "Hoje" — atendimentos do dia, pendências e ganho do mês ao abrir.
2. Exportação dos resumos (CSV/Excel) para o contador + lista "quem deve".
3. PWA — instalar no celular e usar offline de verdade.
4. Ficha do paciente — histórico + observações pessoais da psicóloga
   (sem dado clínico do paciente).
5. Lembretes de pagamentos pendentes.
6. Login e acesso por conta.
7. Banco de dados online (Supabase) + publicação no GitHub Pages.
8. Gestão Anual (criação de anos limpos e exclusão com confirmação).

## Versionamento (Git já inicializado)

O repositório local está criado. Os comandos úteis:

```bash
git status                  # o que mudou
git add -A
git commit -m "descreva a mudança"
git log --oneline           # histórico
```

> A pasta `Livia/` (documentos pessoais) e `backup-*.json` estão no
> `.gitignore` e **nunca** vão para o GitHub.

## Subir para o GitHub (quando estiver usável)

1. Crie um repositório no GitHub (não coloque dados reais).
2. Ligue o repositório remoto e faça push:

```bash
git remote add origin https://github.com/SEU_USUARIO/saas-psicologa.git
git branch -M main
git push -u origin main
```

5. Para publicar como site gratuito, ative o **GitHub Pages** nas configurações do repositório.

## Suporte

Qualquer ajuste de visual, novo campo ou mudança de fluxo, avise que atualizamos os arquivos correspondentes.
