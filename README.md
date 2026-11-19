# Sistema de Atendimentos — Gestão de Pacientes

Sistema web para gestão de atendimentos de psicologia. Roda direto no navegador (PC, notebook, iPhone e Android). Sem necessidade de servidor para começar.

## Estrutura do projeto

```
Saas Psicologa/
├── index.html           # Página principal (abra este arquivo no navegador)
├── css/
│   └── style.css        # Estilos visuais
├── js/
│   ├── data.js          # Dados, regra de cálculo e armazenamento local
│   ├── meses.js         # Navegação mensal clicável
│   ├── app.js           # Navegação, modais, utilitários
│   ├── pacientes.js     # Cadastro de pacientes
│   ├── fontes.js        # Cadastro de convênios
│   ├── lancamentos.js   # Atendimentos
│   ├── situacao.js      # Situação dos pagamentos
│   └── resumos.js       # Totais mensais por convênio
├── assets/              # Identidade visual
├── README.md            # Este arquivo
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

- Menu lateral com: Resumos, Lançamentos, Convênios, Pacientes e Situação Paciente.
- Cabeçalho de meses clicável (12 meses do ano atual) em Lançamentos, Situação Paciente e Resumos.
- Cadastro de convênios com valor fixo ou variável e percentual recebido.
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

1. Exportação dos resumos (PDF/Excel).
2. Backup e restauração dos dados.
3. Lembretes de pagamentos pendentes.
4. Login e acesso por conta.
5. Banco de dados online (Supabase).
6. Gestão Anual (criação de anos limpos e exclusão com confirmação).
7. Publicação no GitHub Pages.

## Subir para o GitHub (quando estiver usável)

1. Instale o Git no computador (se ainda não tiver).
2. Na pasta `Saas Psicologa`, rode:

```bash
git init
git add .
git commit -m "Versão inicial do sistema de atendimentos"
```

3. Crie um repositório no GitHub (não coloque dados reais).
4. Ligue o repositório remoto e faça push:

```bash
git remote add origin https://github.com/SEU_USUARIO/saas-psicologa.git
git branch -M main
git push -u origin main
```

5. Para publicar como site gratuito, ative o **GitHub Pages** nas configurações do repositório.

## Suporte

Qualquer ajuste de visual, novo campo ou mudança de fluxo, avise que atualizamos os arquivos correspondentes.
