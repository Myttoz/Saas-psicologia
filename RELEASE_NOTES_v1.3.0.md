# v1.3.0 — Gestão Anual e fechamento da montagem

Com esta versão a montagem do site fecha: anos separados, publicação confiável e um padrão único de versões.

**Data:** 23/11/2026

---

## ✨ Novidades

- **Gestão Anual** no menu **Anos**: crie anos vazios, escolha o ano em uso e veja quantos atendimentos e evoluções existem em cada ano.
- A troca de ano atualiza na hora os botões de meses de Atendimentos, Resumos e Situação — os meses continuam sendo Jan…Dez, agora do ano escolhido.
- **Excluir ano** apaga somente os dados daquele ano. Pedimos para você digitar o ano e depois pedimos a senha da conta e o código do celular. Pacientes e convênios ficam.

## 🔧 Melhorias

- O botão **🔐 Verificação em duas etapas** continua sempre disponível na barra lateral. Cada conta cadastra o próprio QR code e um segundo fator de reserva.
- A tela de login já chega aberta junto com o HTML. Dar F5 ou Ctrl+F5 não mostra mais o fundo do programa por alguns instantes.
- O feed `releases.rss` passou a ser gerado pelas tags do repositório, com todas as versões. O GitHub Pages republica o feed logo após cada release.
- Padrão único de commits e tags: `feat:` é nova função, `fix:`/`docs:`/`style:`/`chore:` são ajustes e `feat!:` fica para mudanças grandes. Os atalhos `subirpsi` e `publicar.ps1` sugerem mensagem e versão sozinhos.
- Backup e nuvem passam para a versão 5 e guardam os anos. Backups antigos continuam sendo aceitos e têm os anos recuperados dos próprios dados.

## 🔒 Segurança

- A criação, a troca e a exclusão de ano entram na trilha `auditoria`. A exclusão exige reautenticação com senha e código do aplicativo.
- A trilha não guarda texto clínico. As evoluções continuam cifradas com AES-GCM antes de ir para a nuvem.

## 🚀 Como atualizar

1. Abra o site e recarregue com **Ctrl+F5** (ou Command+R).
2. Se estiver no celular, feche e abra o aplicativo novamente.
3. No menu **Anos**, confira o ano em uso antes de lançar os atendimentos.

---

SaaS by Myttoz
