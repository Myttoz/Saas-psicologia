// ============================================================================
// Backup — exportar e importar dados em JSON
// Permite levar pacientes e lançamentos entre máquinas (notebook e celular)
// ============================================================================

var backupModulo = {

  // Baixa um arquivo .json com todos os dados do sistema
  exportar: function() {
    var dados = {
      app: 'saas-livia',
      versao: 1,
      exportadoEm: new Date().toISOString(),
      fontes: fontes,
      pacientes: pacientes,
      lancamentos: lancamentos
    };

    var json = JSON.stringify(dados, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);

    var hojeBackup = new Date();
    var nome = 'backup-livia-' +
      hojeBackup.getFullYear() + '-' +
      String(hojeBackup.getMonth() + 1).padStart(2, '0') + '-' +
      String(hojeBackup.getDate()).padStart(2, '0') + '.json';

    var a = document.createElement('a');
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    app.toast('Backup exportado: ' + nome);
  },

  // Abre o seletor de arquivo
  importar: function() {
    var input = document.getElementById('backupFileInput');
    if (input) {
      input.value = '';
      input.click();
    }
  },

  // Lê o arquivo escolhido, valida e substitui os dados atuais
  processarArquivo: function(input) {
    var arquivo = input.files && input.files[0];
    if (!arquivo) return;

    var leitor = new FileReader();
    leitor.onload = function(e) {
      var dados;
      try {
        dados = JSON.parse(e.target.result);
      } catch (err) {
        app.toast('Arquivo inválido: não é um JSON válido.');
        return;
      }

      // valida a estrutura do backup
      if (!dados || dados.app !== 'saas-livia' ||
          !Array.isArray(dados.fontes) ||
          !Array.isArray(dados.pacientes) ||
          !Array.isArray(dados.lancamentos)) {
        app.toast('Este arquivo não é um backup do sistema.');
        return;
      }

      var dataExport = (dados.exportadoEm || '').slice(0, 10);
      var rotuloData = dataExport ? formatarData(dataExport) : 'data desconhecida';

      var confirmar = confirm(
        'Importar backup de ' + rotuloData + '?\n\n' +
        'O backup contém:\n' +
        '• ' + dados.pacientes.length + ' paciente(s)\n' +
        '• ' + dados.lancamentos.length + ' lançamento(s)\n' +
        '• ' + dados.fontes.length + ' convênio(s)\n\n' +
        'Os dados ATUAIS deste navegador serão substituídos. Continuar?'
      );
      if (!confirmar) return;

      // substitui os dados
      fontes = dados.fontes;
      pacientes = dados.pacientes;
      lancamentos = dados.lancamentos;

      Store.salvar();

      // re-renderiza a página ativa
      var paginaAtiva = document.querySelector('.page.active');
      if (paginaAtiva) {
        app.renderizarPagina(paginaAtiva.id.replace('page-', ''));
      }

      app.toast('Backup importado com sucesso.');
    };

    leitor.readAsText(arquivo);
  }

};

window.backupModulo = backupModulo;
