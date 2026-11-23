// ============================================================================
// Prontuário — evolução por sessão (queixa, intervenção, evolução e plano)
// Dado clínico sensível: acesso protegido por senha e trilha de acesso.
// ============================================================================

var prontuarioEditId = null;

var prontuarioModulo = {

  termo: '',

  // Modelos curtos para escrever mais rápido — preenchem só os campos vazios
  MODELO: {
    inicial: {
      rotulo: 'Sessão inicial',
      queixa: 'Queixa trazida na primeira sessão: ',
      intervencao: 'Escuta clínica, acolhimento e levantamento de histórico.',
      evolucao: 'Paciente compareceu e participou da entrevista inicial.',
      plano: 'Retorno em 7 dias para dar continuidade ao atendimento.'
    },
    retorno: {
      rotulo: 'Retorno semanal',
      queixa: 'Relato dos eventos da semana: ',
      intervencao: 'Retomada da sessão anterior e discussão sobre a demanda atual.',
      evolucao: 'Paciente engajado no processo, com possibilidade de elaboração.',
      plano: 'Manter os encontros semanais e acompanhar a evolução dos sintomas.'
    },
    ansiedade: {
      rotulo: 'Ansiedade',
      queixa: 'Sintomas de ansiedade relatados nesta sessão: ',
      intervencao: 'Trabalho de identificação de gatilhos e estratégias de regulação emocional.',
      evolucao: 'Paciente relatou melhora gradual e maior compreensão dos próprios sinais.',
      plano: 'Praticar as estratégias combinadas entre as sessões.'
    },
    crianca: {
      rotulo: 'Atendimento infantil',
      queixa: 'Demanda apresentada nesta sessão: ',
      intervencao: 'Atendimento com recursos lúdicos e mediação com a família.',
      evolucao: 'Criança participou das atividades e conseguiu expressar parte da vivência.',
      plano: 'Retorno semanal e reavaliação da demanda com os responsáveis.'
    }
  },

  // ---------- Renderização ----------

  render: function() {
    var lista = document.getElementById('evolucoesLista');
    if (!lista) return;

    var resumo = document.getElementById('evolucoesResumo');
    var subtitulo = document.getElementById('prontuarioSubtitulo');

    if (typeof segurancaModulo === 'undefined' || !segurancaModulo.estaDesbloqueado()) {
      if (subtitulo) subtitulo.textContent = 'Bloqueado';
      lista.innerHTML =
        '<div class="bloqueio-aviso">' +
          '<div class="bloqueio-icone">🔒</div>' +
          '<h3>Prontuário protegido</h3>' +
          '<p>Este conteúdo é sensível. Digite sua senha para consultar ou registrar evoluções.</p>' +
          '<button type="button" class="btn btn-primary" onclick="prontuarioModulo.solicitarAcesso()">' +
            'Desbloquear prontuário</button>' +
        '</div>';
      if (typeof segurancaModulo !== 'undefined') segurancaModulo.renderTrilha();
      return;
    }

    this.preencherPacientes();

    var termo = this.termo.toLowerCase().trim();
    var filtrados = [];
    for (var i = 0; i < evolucoes.length; i++) {
      var ev = evolucoes[i];
      var texto = [ev.paciente, ev.queixa, ev.intervencao, ev.evolucao, ev.plano].join(' ').toLowerCase();
      if (termo === '' || texto.indexOf(termo) !== -1) filtrados.push(ev);
    }

    filtrados.sort(function(a, b) {
      var d = String(b.data || '').localeCompare(String(a.data || ''));
      if (d !== 0) return d;
      return String(b.atualizadoEm || '').localeCompare(String(a.atualizadoEm || ''));
    });

    if (subtitulo) {
      subtitulo.textContent = filtrados.length + (filtrados.length === 1 ? ' evolução' : ' evoluções') +
        (termo ? ' encontrada(s)' : ' registrada(s)');
    }
    if (resumo) {
      resumo.textContent = evolucoes.length + ' no total';
    }

    lista.innerHTML = '';
    if (filtrados.length === 0) {
      lista.innerHTML =
        '<div class="empty">' +
          '<p>' + (termo ? 'Nenhuma evolução encontrada para essa busca.' :
            'Nenhuma evolução registrada ainda.') + '</p>' +
          '<button class="btn btn-outline btn-sm" onclick="prontuarioModulo.abrirModal()">' +
            'Escrever a primeira evolução</button>' +
        '</div>';
    } else {
      for (var i = 0; i < filtrados.length; i++) lista.appendChild(this.card(filtrados[i]));
    }

    segurancaModulo.renderTrilha();
  },

  card: function(ev) {
    var acoes =
      app.botaoAcao('Editar', 'prontuarioModulo.editar(' + Number(ev.id) + ')', 'editar') +
      app.botaoAcao('Excluir', 'prontuarioModulo.excluir(' + Number(ev.id) + ')', 'excluir', true);

    var div = document.createElement('div');
    div.className = 'evolucao-card';
    div.innerHTML =
      '<div class="evolucao-cab">' +
        '<div>' +
          '<div class="evolucao-data">' + formatarData(ev.data) +
            (ev.lancamentoId ? ' <span class="badge badge-agendado">Sessão registrada</span>' : '') +
          '</div>' +
          '<div class="evolucao-paciente">' + this.escapeHtml(ev.paciente) + '</div>' +
        '</div>' +
        '<div class="evolucao-acoes">' + acoes + '</div>' +
      '</div>' +
      '<div class="evolucao-trechos">' +
        this.trecho('Queixa', ev.queixa) +
        this.trecho('Evolução', ev.evolucao) +
      '</div>';
    return div;
  },

  trecho: function(rotulo, texto) {
    if (!texto) return '';
    var limpo = this.escapeHtml(texto);
    if (limpo.length > 150) limpo = limpo.slice(0, 150) + '…';
    return '<div class="evolucao-trecho"><strong>' + rotulo + ':</strong> ' + limpo + '</div>';
  },

  escapeHtml: function(texto) {
    return String(texto === null || texto === undefined ? '' : texto)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  // ---------- Acesso ----------

  solicitarAcesso: function(depois) {
    var self = this;
    segurancaModulo.exigirAcesso(depois || function() { self.render(); });
  },

  // Abre o modal de evolução. Se estiver bloqueado, abre após a senha.
  abrirModal: function(opcoes) {
    var self = this;
    opcoes = opcoes || {};
    segurancaModulo.exigirAcesso(function() { self.mostrarModal(opcoes); });
  },

  // Chamado pelo Painel Hoje ao finalizar/ registrar uma sessão
  abrirDaSessao: function(id) {
    var l = null;
    for (var i = 0; i < lancamentos.length; i++) {
      if (lancamentos[i].id === id) { l = lancamentos[i]; break; }
    }
    if (!l) return;
    this.abrirModal({ paciente: l.paciente, data: l.data, lancamentoId: l.id });
  },

  preencherPacientes: function() {
    var lista = document.getElementById('pacientesEvoList');
    if (!lista) return;
    var html = '';
    for (var i = 0; i < pacientes.length; i++) {
      html += '<option value="' + this.escapeHtml(pacientes[i].nome) + '"></option>';
    }
    lista.innerHTML = html;
  },

  mostrarModal: function(opcoes) {
    if (!segurancaModulo.estaDesbloqueado()) {
      segurancaModulo.exigirAcesso(function() { prontuarioModulo.mostrarModal(opcoes); });
      return;
    }
    segurancaModulo.registrarAtividade();

    var form = document.getElementById('formEvolucao');
    if (form) form.reset();

    prontuarioEditId = opcoes.id || null;
    var ev = prontuarioEditId ? this.buscarPorId(prontuarioEditId) : null;

    var titulo = document.querySelector('#modalEvolucao .modal-title');
    if (titulo) titulo.textContent = ev ? 'Editar evolução' : 'Nova evolução';

    var paciente = document.getElementById('evoPaciente');
    if (paciente) paciente.value = ev ? ev.paciente : (opcoes.paciente || '');

    var data = document.getElementById('evoData');
    if (data) data.value = ev ? ev.data : (opcoes.data || hojeStr);

    var lancId = document.getElementById('evoLancamentoId');
    if (lancId) lancId.value = ev ? (ev.lancamentoId || '') : (opcoes.lancamentoId || '');

    var campos = ['evoQueixa', 'evoIntervencao', 'evoEvolucao', 'evoPlano'];
    var chaves = ['queixa', 'intervencao', 'evolucao', 'plano'];
    for (var i = 0; i < campos.length; i++) {
      var el = document.getElementById(campos[i]);
      if (el) el.value = ev && ev[chaves[i]] ? ev[chaves[i]] : '';
    }

    this.preencherPacientes();
    app.abrirModal('modalEvolucao');
  },

  aplicarModelo: function(chave) {
    var modelo = this.MODELO[chave];
    if (!modelo) return;
    segurancaModulo.registrarAtividade();

    var campos = [
      { id: 'evoQueixa', chave: 'queixa' },
      { id: 'evoIntervencao', chave: 'intervencao' },
      { id: 'evoEvolucao', chave: 'evolucao' },
      { id: 'evoPlano', chave: 'plano' }
    ];

    for (var i = 0; i < campos.length; i++) {
      var campo = campos[i];
      var el = document.getElementById(campo.id);
      if (!el) continue;

      var atual = String(el.value);
      var podeTrocar = !atual.trim();

      // se o texto ainda é o de algum modelo, pode ser substituído por outro
      if (!podeTrocar) {
        for (var nomeModelo in this.MODELO) {
          if (this.MODELO[nomeModelo][campo.chave] === atual) {
            podeTrocar = true;
            break;
          }
        }
      }

      // o que foi digitado manualmente nunca é apagado
      if (podeTrocar) el.value = modelo[campo.chave];
    }

    app.toast('Modelo "' + modelo.rotulo + '" aplicado.');
  },

  // ---------- Registros ----------

  buscarPorId: function(id) {
    for (var i = 0; i < evolucoes.length; i++) {
      if (evolucoes[i].id === id) return evolucoes[i];
    }
    return null;
  },

  salvar: function() {
    var self = this;
    if (!segurancaModulo.estaDesbloqueado()) {
      segurancaModulo.exigirAcesso(function() { self.salvar(); });
      return false;
    }
    segurancaModulo.registrarAtividade();

    var pac = document.getElementById('evoPaciente');
    var data = document.getElementById('evoData');
    var lancId = document.getElementById('evoLancamentoId');

    var nome = pac ? pac.value.trim() : '';
    if (!nome) {
      app.toast('Informe o paciente da evolução.');
      return false;
    }

    var agora = new Date().toISOString();
    var registro = {
      paciente: nome,
      data: data ? data.value : hojeStr,
      lancamentoId: lancId ? (lancId.value || null) : null,
      queixa: this.valor('evoQueixa'),
      intervencao: this.valor('evoIntervencao'),
      evolucao: this.valor('evoEvolucao'),
      plano: this.valor('evoPlano'),
      atualizadoEm: agora
    };

    var editando = !!prontuarioEditId;
    if (editando) {
      var atual = this.buscarPorId(prontuarioEditId);
      if (atual) {
        for (var chave in registro) atual[chave] = registro[chave];
      }
    } else {
      registro.id = Date.now();
      registro.criadoEm = agora;
      evolucoes.push(registro);
    }

    Store.salvar();
    segurancaModulo.registrar(
      editando ? 'Edição de evolução' : 'Nova evolução',
      segurancaModulo.mascararNome(nome)
    );
    this.render();
    app.fecharModal('modalEvolucao');
    app.toast(editando ? 'Evolução atualizada.' : 'Evolução registrada.');
    return false;
  },

  valor: function(id) {
    var el = document.getElementById(id);
    return el ? String(el.value).trim() : '';
  },

  editar: function(id) {
    var self = this;
    var ev = this.buscarPorId(id);
    if (!ev) return;
    // O registro da consulta só entra na trilha depois da senha conferida.
    segurancaModulo.exigirAcesso(function() {
      segurancaModulo.registrar('Consulta de evolução', segurancaModulo.mascararNome(ev.paciente));
      self.mostrarModal({ id: id });
    });
  },

  excluir: function(id) {
    var self = this;
    var ev = this.buscarPorId(id);
    if (!ev) return;
    if (!segurancaModulo.estaDesbloqueado()) {
      segurancaModulo.exigirAcesso(function() { self.excluir(id); });
      return;
    }
    segurancaModulo.registrarAtividade();
    if (!confirm('Excluir esta evolução? Esta ação não pode ser desfeita.')) return;

    var novo = [];
    for (var i = 0; i < evolucoes.length; i++) {
      if (evolucoes[i].id !== id) novo.push(evolucoes[i]);
    }
    evolucoes = novo;

    Store.salvar();
    segurancaModulo.registrar('Exclusão de evolução', segurancaModulo.mascararNome(ev.paciente));
    this.render();
    app.toast('Evolução excluída.');
  }

};

window.prontuarioModulo = prontuarioModulo;
