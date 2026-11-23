// ============================================================================
// Backup — exportar, importar e restaurar o backup automático
// Permite levar pacientes, lançamentos e evoluções entre máquinas (notebook e celular).
// O backup automático fica salvo neste navegador e não é enviado para a internet.
// Atenção: o arquivo contém texto clínico — guarde-o em local protegido.
// ============================================================================

var backupModulo = {

  CHAVE_AUTO: 'saas_backup_auto',
  _importando: false, // evita que o backup automático seja sobrescrito ao restaurar

  // Dados usados tanto no arquivo baixado quanto no retrato automático
  montarDados: function() {
    return {
      app: 'saas-livia',
      versao: 3,
      exportadoEm: new Date().toISOString(),
      fontes: fontes,
      pacientes: pacientes,
      lancamentos: lancamentos,
      evolucoes: evolucoes,
      dadosProfissional: dadosProfissional
    };
  },

  valido: function(dados) {
    return !!(dados && dados.app === 'saas-livia' &&
      Array.isArray(dados.fontes) &&
      Array.isArray(dados.pacientes) &&
      Array.isArray(dados.lancamentos));
  },

  init: function() {
    this.atualizarInfoAuto();
  },

  // ---------- Backup automático (somente neste navegador) ----------

  // Chamado pelo Store.salvar(): guarda a versão mais recente dos dados
  registrarAlteracao: function() {
    if (this._importando) return;
    try {
      var retrato = this.montarDados();
      retrato.salvoEm = new Date().toISOString();
      localStorage.setItem(this.CHAVE_AUTO, JSON.stringify(retrato));
      this.atualizarInfoAuto();
    } catch (e) {
      // armazenamento cheio ou indisponível — ignora para não travar o sistema
    }
  },

  lerAuto: function() {
    try {
      var raw = localStorage.getItem(this.CHAVE_AUTO);
      var dados = raw ? JSON.parse(raw) : null;
      return this.valido(dados) ? dados : null;
    } catch (e) {
      return null;
    }
  },

  atualizarInfoAuto: function() {
    var el = document.getElementById('backupAutoInfo');
    if (!el) return;

    var dados = this.lerAuto();
    if (!dados) {
      el.textContent = 'Ainda não há backup automático neste navegador.';
      return;
    }

    var quando = dados.salvoEm || dados.exportadoEm;
    var rotulo = '';
    try { rotulo = new Date(quando).toLocaleString('pt-BR'); } catch (e) { rotulo = quando || ''; }

    el.textContent = 'Último: ' + rotulo + ' · ' +
      dados.lancamentos.length + ' atendimento(s)';
  },

  restaurarAuto: function() {
    var dados = this.lerAuto();
    if (!dados) {
      app.toast('Ainda não há backup automático para restaurar.');
      return;
    }

    var quando = (dados.salvoEm || dados.exportadoEm || '').slice(0, 10);
    var rotulo = quando ? formatarData(quando) : 'data desconhecida';
    var confirmar = confirm(
      'Restaurar o backup automático de ' + rotulo + '?\n\n' +
      'Os dados atuais deste navegador serão substituídos. Continuar?'
    );
    if (!confirmar) return;

    this._aplicarDados(dados);
    app.toast('Backup automático restaurado.');
  },

  // Aplica dados vindos do arquivo ou do retrato automático
  _aplicarDados: function(dados) {
    this._importando = true;
    try {
      fontes = dados.fontes;
      pacientes = dados.pacientes;
      lancamentos = dados.lancamentos;
      // backups antigos não tinham evoluções nem dados do recibo
      evolucoes = Array.isArray(dados.evolucoes) ? dados.evolucoes : [];
      var dp = dados.dadosProfissional || {};
      dadosProfissional = {
        nome: dp.nome || '',
        crp: dp.crp || CRP_PADRAO,
        cpf: dp.cpf || '',
        assinatura: dp.assinatura || ''
      };

      Store.salvar();
    } finally {
      this._importando = false;
    }

    // re-renderiza a página ativa
    var paginaAtiva = document.querySelector('.page.active');
    if (paginaAtiva) {
      app.renderizarPagina(paginaAtiva.id.replace('page-', ''));
    }
    this.atualizarInfoAuto();
  },

  // ---------- Backup em arquivo ----------

  // Baixa um arquivo .json com todos os dados do sistema
  exportar: function() {
    var json = JSON.stringify(this.montarDados(), null, 2);
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

      if (!backupModulo.valido(dados)) {
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
        '• ' + dados.fontes.length + ' convênio(s)\n' +
        '• ' + ((dados.evolucoes || []).length) + ' evolução(ões) clínica(s)\n\n' +
        'Os dados ATUAIS deste navegador serão substituídos. Continuar?'
      );
      if (!confirmar) return;

      backupModulo._aplicarDados(dados);
      app.toast('Backup importado com sucesso.');
    };

    leitor.readAsText(arquivo);
  }

};

window.backupModulo = backupModulo;
