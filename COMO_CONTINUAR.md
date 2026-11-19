# Como continuar — ponto de parada

Projeto: SaaS de gestão de atendimentos (psicóloga). Versão local, ainda sem banco online.

## Onde paramos

Interface e regras principais prontas e validadas: 8 arquivos JS sem erros de sintaxe,
HTML válido, todos os IDs usados existem, cálculos testados.

Última rodada concluída:
- Capitalização automática do nome do paciente (cursor preservado).
- Borda terracota visível ao navegar com Tab em todos os campos e botões.
- Bloco da logo com 3 linhas: Lívia Ferreira / Psicóloga / Gestão de pacientes.
- Logo ampliada (52px).
- "MENU" e separadores em terracota.
- Bug da paciente "ana 2" (convênio de valor fixo) corrigido.
- Seção "Avaliações avulsas" separada no Resumo.

## O que o usuário ia testar

1. Novo lançamento → digitar `ana 2` → selecionar → valor a receber deve calcular
   (ex.: 180,00 no Cideslestes a 40% = R$ 72,00).
2. Apertar Tab entre os campos → borda terracota aparece.
3. Tipo "Avaliação avulsa" → salvar → aba Resumos deve mostrar o card
   "Avaliações avulsas".
4. Sidebar: logo maior, 3 linhas de texto, MENU em terracota.

## Regra de ouro do cálculo

O percentual cadastrado representa **sempre o valor que a profissional recebe**.

- Ganho = valor × percentual
- Repasse = valor − ganho

Percentuais iniciais: Clínica 30%, Particular 70%, Cideslestes 40%, Unimed vazia
(enquanto estiver vazia, nenhum cálculo é exibido).

## Próximos blocos (nesta ordem)

1. Ajustes finais após o teste do usuário.
2. Exportação/backup dos dados (permite levar dados entre máquinas).
3. Banco online (Supabase) + login.
4. Gestão Anual.
5. GitHub + GitHub Pages.

## Atenção

- Os dados ficam no `localStorage` do navegador. **Copiar a pasta NÃO copia
  pacientes nem lançamentos** — ao abrir em outro computador, começa zerado
  (só os convênios padrão).
- A pasta `Livia/` é apenas referência (contém a logo original e documentos
  pessoais). O site usa `assets/logo.jpeg`, então essa pasta não é necessária
  para funcionar.
- Não usar Google Script nem Google Cloud nesta etapa.
- Nada foi publicado ainda: sem commit, push, GitHub ou Supabase.
