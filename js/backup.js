// ============================================================================
// Backup — exportar, importar e restaurar o backup automático
//
// O arquivo de backup e a nuvem guardam as evoluções já cifradas e o registro
// da chave AES (nunca a chave em texto). Abrir, baixar, importar ou restaurar
// um backup pede novamente a senha da conta — não basta um confirm().
// ============================================================================

var backupModulo = {

  CHAVE_AUTO: 'saas_backup_auto',
  _importando: false,        // evita que o retrato automático seja sobrescrito ao restaurar
  _pendenteImportacao: null, // arquivo lido, aplicado só depois da reautenticação

  // Dados usados no arquivo baixado, no retrato automático e na nuvem
  montarDados: function() {
    var registroChave = (typeof segurancaModulo !== 'undefined' && segurancaModulo.lerRegistroChave) ?
      (segurancaModulo.lerRegistroChave() || '') : '';
    return {
      app: 'saas-livia',
      versao: 4,
      exportadoEm: new Date().toISOString(),
      fontes: fontes,
      pacientes: pacientes,
      lancamentos: lancamentos,
      evolucoes: evolucoes,
      dadosProfissional: dadosProfissional,
      criptografia: { chave: registroChave }
    };
  },

  // Conta nova: a nuvem manda, o navegador começa sem dados clínicos.
  // A senha local e o registro da chave são mantidos para poder cifrar o que
  // vier a ser digitado; as evoluções antigas não são enviadas.
  aplicarVazio: function() {
    this._importando = true;
    try {
      pacientes = [];
      lancamentos = [];
      evolucoes = [];
      dadosProfissional = { nome: '', crp: CRP_PADRAO, cpf: '', assinatura: '' };
      if (typeof prontuarioModulo !== 'undefined') prontuarioModulo.limparCache();
      if (typeof segurancaModulo !== 'undefined') {
        segurancaModulo.desbloqueado = false;
        segurancaModulo.chaveAes = null;
      }
      if (typeof Store !== 'undefined') Store.salvar();
    } finally {
      this._importando = false;
    }
    var paginaAtiva = document.querySelector('.page.active');
    if (paginaAtiva) app.renderizarPagina(paginaAtiva.id.replace('page-', ''));
    this.atualizarInfoAuto();
  },

  // ---------- Validação de segurança (backup e nuvem) ----------
  // Nada que vem de arquivo ou da nuvem entra no sistema sem passar por aqui.

  LIMITE_ITENS: 10000,
  LIMITE_ARQUIVO: 5 * 1024 * 1024,
  LIMITE_TEXTO: 20000,
  LIMITE_CURTO: 300,
  LIMITE_ASSINATURA: 400000,
  LIMITE_CHAVE: 300,

  _inteiro: function(valor) {
    if (typeof valor !== 'number' && !(typeof valor === 'string' && /^\d+$/.test(valor))) return null;
    var n = Number(valor);
    if (!isFinite(n) || n <= 0 || Math.floor(n) !== n || n > 9007199254740991) return null;
    return n;
  },

  _texto: function(valor, limite) {
    if (valor === null || valor === undefined) return '';
    if (typeof valor === 'string') return valor.slice(0, limite);
    if (typeof valor === 'number' && isFinite(valor)) return String(valor);
    if (typeof valor === 'boolean') return String(valor);
    return ''; // objetos/arrays aninhados são descartados
  },

  _dataIso: function(valor) {
    var s = this._texto(valor, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
    var p = s.split('-');
    var a = parseInt(p[0], 10), m = parseInt(p[1], 10), d = parseInt(p[2], 10);
    var teste = new Date(a, m - 1, d);
    if (teste.getFullYear() !== a || teste.getMonth() !== m - 1 || teste.getDate() !== d) return '';
    return s;
  },

  _assinaturaValida: function(valor) {
    var s = this._texto(valor, this.LIMITE_ASSINATURA);
    return /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(s) ? s : '';
  },

  _chaveValida: function(valor) {
    var s = this._texto(valor, this.LIMITE_CHAVE);
    if (!s) return ''; // backup da versão antiga, sem criptografia
    if (typeof Cripto === 'undefined' || !Cripto.disponivel() || !Cripto.registroValido(s)) {
      throw new Error('O registro da chave de criptografia do backup é inválido.');
    }
    return s;
  },

  // Devolve uma cópia limpa. Lança erro com mensagem clara se o backup for inválido.
  normalizar: function(dados) {
    var self = this;
    if (!dados || typeof dados !== 'object' || Array.isArray(dados) || dados.app !== 'saas-livia') {
      throw new Error('Este arquivo não é um backup do sistema.');
    }
    if (JSON.stringify(dados).length > this.LIMITE_ARQUIVO) {
      throw new Error('Backup muito grande (máximo 5 MB).');
    }

    function lista(valor, nome) {
      if (!Array.isArray(valor)) throw new Error('Backup inválido: ' + nome + '.');
      if (valor.length > self.LIMITE_ITENS) throw new Error('Backup com muitos registros: ' + nome + '.');

      var saida = [];
      for (var i = 0; i < valor.length; i++) {
        var item = valor[i];
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          throw new Error('Registro inválido em ' + nome + '.');
        }
        var limpo = {};
        for (var chave in item) {
          if (!Object.prototype.hasOwnProperty.call(item, chave)) continue;
          if (chave === 'assinatura') {
            limpo[chave] = self._assinaturaValida(item[chave]);
          } else if (chave === 'data') {
            var data = self._dataIso(item[chave]);
            if (!data) throw new Error('Data inválida em ' + nome + '.');
            limpo[chave] = data;
          } else if (chave === 'id' || chave === 'fonteId' || chave === 'lancamentoId') {
            limpo[chave] = self._inteiro(item[chave]);
            if (limpo[chave] === null && chave === 'id') {
              throw new Error('Identificador inválido em ' + nome + '.');
            }
          } else if (chave === 'cifrado' || chave === 'iv' || chave === 'dados') {
            // Campos do texto cifrado: base64 e iv rigorosos.
            if (chave === 'cifrado') {
              if (item[chave] !== true) throw new Error('Registro cifrado inválido em ' + nome + '.');
              limpo[chave] = true;
            } else {
              var texto = self._texto(item[chave], self.LIMITE_TEXTO);
              if (!/^[A-Za-z0-9+/]+={0,2}$/.test(texto)) {
                throw new Error('Registro cifrado inválido em ' + nome + '.');
              }
              limpo[chave] = texto;
            }
          } else if (item[chave] === null) {
            limpo[chave] = null;
          } else if (typeof item[chave] === 'number' || typeof item[chave] === 'boolean') {
            limpo[chave] = item[chave];
          } else {
            var longo = (chave === 'evolucao' || chave === 'queixa' || chave === 'intervencao' ||
              chave === 'plano' || chave === 'obs' || chave === 'conteudo');
            limpo[chave] = self._texto(item[chave], longo ? self.LIMITE_TEXTO : self.LIMITE_CURTO);
          }
        }
        // Uma evolução cifrada precisa ter os três campos juntos.
        if (limpo.cifrado && (!limpo.iv || !limpo.dados)) {
          throw new Error('Evolução cifrada incompleta em ' + nome + '.');
        }
        saida.push(limpo);
      }
      return saida;
    }

    var dp = (dados.dadosProfissional && typeof dados.dadosProfissional === 'object') ? dados.dadosProfissional : {};
    var cripto = (dados.criptografia && typeof dados.criptografia === 'object') ? dados.criptografia : {};
    return {
      app: 'saas-livia',
      versao: 4,
      exportadoEm: this._texto(dados.exportadoEm, 40),
      salvoEm: this._texto(dados.salvoEm, 40),
      atualizadoEm: this._texto(dados.atualizadoEm, 40),
      fontes: lista(dados.fontes, 'convênios'),
      pacientes: lista(dados.pacientes, 'pacientes'),
      lancamentos: lista(dados.lancamentos, 'lançamentos'),
      evolucoes: Array.isArray(dados.evolucoes) ? lista(dados.evolucoes, 'evoluções') : [],
      dadosProfissional: {
        nome: this._texto(dp.nome, this.LIMITE_CURTO),
        crp: this._texto(dp.crp, this.LIMITE_CURTO) || CRP_PADRAO,
        cpf: this._texto(dp.cpf, this.LIMITE_CURTO),
        assinatura: this._assinaturaValida(dp.assinatura)
      },
      criptografia: { chave: this._chaveValida(cripto.chave) }
    };
  },

  valido: function(dados) {
    try {
      this.normalizar(dados);
      return true;
    } catch (e) {
      return false;
    }
  },

  init: function() {
    this.atualizarInfoAuto();
  },

  // Barreira real para ações críticas: senha da conta (e código do app, se houver).
  _reautenticar: function(acao) {
    if (typeof Backend !== 'undefined' && Backend.configurado && Backend.configurado() &&
        Backend.conectado && Backend.conectado()) {
      Backend.reautenticar(acao);
      return;
    }
    acao();
  },

  // ---------- Backup automático (somente neste navegador) ----------

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
    var self = this;
    this._reautenticar(function() {
      self._aplicarDados(dados);
      if (typeof segurancaModulo !== 'undefined') {
        segurancaModulo.registrar('Backup automático restaurado', rotulo);
      }
      app.toast('Backup automático restaurado.');
    });
  },

  // Aplica dados vindos do arquivo, do retrato automático ou da nuvem
  _aplicarDados: function(dados) {
    // Revalida mesmo aqui: a nuvem também chama esta função diretamente.
    var limpos = this.normalizar(dados);

    if (limpos.criptografia.chave && typeof segurancaModulo !== 'undefined') {
      segurancaModulo.aplicarRegistroChave(limpos.criptografia.chave);
    }
    if (typeof prontuarioModulo !== 'undefined') prontuarioModulo.limparCache();

    this._importando = true;
    try {
      fontes = limpos.fontes;
      pacientes = limpos.pacientes;
      lancamentos = limpos.lancamentos;
      evolucoes = limpos.evolucoes;
      dadosProfissional = limpos.dadosProfissional;

      if (typeof Store !== 'undefined') Store.salvar();
    } finally {
      this._importando = false;
    }

    var paginaAtiva = document.querySelector('.page.active');
    if (paginaAtiva) {
      app.renderizarPagina(paginaAtiva.id.replace('page-', ''));
    }
    this.atualizarInfoAuto();
  },

  // ---------- Backup em arquivo ----------

  exportar: function() {
    var self = this;
    this._reautenticar(function() {
      var json = JSON.stringify(self.montarDados(), null, 2);
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

      if (typeof segurancaModulo !== 'undefined') segurancaModulo.registrar('Backup exportado', nome);
      app.toast('Backup exportado: ' + nome);
    });
  },

  importar: function() {
    var input = document.getElementById('backupFileInput');
    if (input) {
      input.value = '';
      input.click();
    }
  },

  // Lê o arquivo escolhido, valida e só aplica depois da reautenticação.
  processarArquivo: function(input) {
    var arquivo = input.files && input.files[0];
    if (!arquivo) return;

    if (arquivo.size > this.LIMITE_ARQUIVO) {
      app.toast('Arquivo muito grande. O limite é 5 MB.');
      return;
    }

    var leitor = new FileReader();
    leitor.onload = function(e) {
      var dados;
      try {
        dados = JSON.parse(e.target.result);
      } catch (err) {
        app.toast('Arquivo inválido: não é um JSON válido.');
        return;
      }

      try {
        dados = backupModulo.normalizar(dados);
      } catch (erro) {
        app.toast(erro.message || 'Este arquivo não é um backup válido.');
        return;
      }

      backupModulo._pendenteImportacao = dados;
      var resumo = dados.pacientes.length + ' paciente(s), ' +
        dados.lancamentos.length + ' lançamento(s) e ' +
        dados.evolucoes.length + ' evolução(ões).';

      backupModulo._reautenticar(function() {
        var pendente = backupModulo._pendenteImportacao;
        backupModulo._pendenteImportacao = null;
        if (!pendente) return;
        backupModulo._aplicarDados(pendente);
        if (typeof segurancaModulo !== 'undefined') {
          segurancaModulo.registrar('Backup importado', resumo);
        }
        if (pendente.criptografia && pendente.criptografia.chave) {
          app.toast('Backup importado. Digite a senha do prontuário para ler as evoluções.');
        } else {
          app.toast('Backup importado com sucesso.');
        }
      });
    };

    leitor.readAsText(arquivo);
  }

};

window.backupModulo = backupModulo;
