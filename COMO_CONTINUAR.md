# Como continuar — ponto de parada

Projeto: SaaS de gestão de atendimentos (psicóloga). Versão local, ainda sem banco online.

## O que já está pronto (histórico)

**Fase 0 — base (notebook Linux):**
- Interface e regras principais: 8 arquivos JS, HTML válido, cálculos testados.
- Capitalização do nome, borda terracota no Tab, logo com 3 linhas.
- Seção "Avaliações avulsas" no Resumo.

**Fase 1 — segurança dos dados (Windows):**
- ✅ Git inicializado (repositório local, sem remote ainda).
- ✅ `.gitignore` exclui `Livia/` (documentos pessoais) e `backup-*.json`.
- ✅ **Exportar/Importar backup** (JSON) — botões na sidebar. Leva dados entre máquinas.
- ✅ Bloco redundante `percentuais` removido (HTML, modal, JS, CSS, localStorage).
  Agora a única fonte do percentual é o cadastro de convênios.

**Fase 2 — agenda e faltas:**
- ✅ Página **Agenda** (nova, é a inicial): grade segunda a domingo, 7h–22h,
  chips por atendimento coloridos por presença, clique no vazio cria agendamento
  com data/horário pré-preenchidos, clique no chip edita.
- ✅ **Presença**: Agendado / Compareceu / Faltou / Cancelou — campo no modal
  e coluna na tabela de Lançamentos.
- ✅ **Repetição semanal**: criar 4/8/12 sessões semanais de uma vez (retornos
  fixos). Não duplica se já existir sessão no mesmo dia/horário.
- ✅ `duplicar` agora reseta presença para "agendado".

## Testes

- `node --check` em todos os JS: OK.
- Cruzamento IDs HTML × getElementById: OK (61 IDs, 46 usados).
- Handlers onclick × funções existentes: OK.
- Teste funcional (cálculo, série semanal, slots, Store): 28/28 OK.

## Regra de ouro do cálculo

O percentual cadastrado representa **sempre o valor que a profissional recebe**.

- Ganho = valor × percentual
- Repasse = valor − ganho

Convênios iniciais: Clínica 30%, Particular 70%, Cideslestes 40%, Unimed vazia
(enquanto vazia, nenhum cálculo é exibido).

## Próximos blocos (nesta ordem)

1. **Teste da Lívia** no Windows (pedir feedback da agenda e das faltas).
2. **Painel "Hoje"** — visão ao abrir: atendimentos de hoje, pendências, ganho do mês.
3. **Exportar resumo CSV/Excel** para o contador + "quem deve" no mês.
4. **PWA** — instalar no celular, offline de verdade.
5. **Ficha do paciente** — histórico + campo de **observações pessoais**
   (lembretes da psicóloga; nada de dado clínico do paciente — ética/CFP).
6. **Banco online (Supabase) + login + GitHub Pages** — reutilizar a receita
   do projeto `D:\_App_Financas` (schema.sql + RLS + deploy).
   Só depois de validado em uso real ~2 semanas + uso em 2 máquinas.

## Atenção

- Os dados ficam no `localStorage` do navegador. **Copiar a pasta NÃO copia
  pacientes nem lançamentos** — usar **Exportar/Importar backup** da sidebar.
- A pasta `Livia/` é referência pessoal e está no `.gitignore` (nunca publicar).
- Nada foi publicado ainda: sem remote, push, GitHub Pages ou Supabase.
- Nada de Google Script/Google Cloud nesta etapa.
