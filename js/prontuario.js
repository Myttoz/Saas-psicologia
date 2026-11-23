// ============================================================================
// Prontuário — evolução por sessão (queixa, intervenção, evolução e plano)
//
// O texto clínico NÃO fica legível no navegador, no backup nem na nuvem:
// cada evolução é salva como { id, cifrado:true, iv, dados }. O texto só
// aparece em memória depois que a senha do prontuário abre a chave AES.
// ============================================================================

var prontuarioEditId = null;

var prontuarioModulo = {

  termo: '',
  _cache: {}, // id -> evolução legível (somente em memória)

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

  // ---------- Texto legível (somente na memória) ----------

  limparCache: function() {
    this._cache = {};
  },

  chaveCache: function(id) {
    return String(id);
  },

  // Decifra as evoluções ainda não carregadas. Precisa da chave desbloqueada.
  garantirCache: function() {
    var self = this;
    if (!segurancaModulo.estaDesbloqueado() || typeof Cripto === 'undefined') {
      return Promise.resolve(false);
    }
    var chave = segurancaModulo.chaveAes;
    var promessas = [];

    for (var i = 0; i < evolucoes.length; i++) {
      var ev = evolucoes[i];
      var chaveCache = this.chaveCache(ev.id);
      if (this._cache[chaveCache]) continue;

      if (!ev.cifrado) {
        // Formato antigo: ainda legível; será cifrado na migração.
        this._cache[chaveCache] = this._copia(ev);
        continue;
      }

      (function(registro) {
        promessas.push(
          Cripto.decifrar(chave, registro).then(function(obj) {
            obj.id = registro.id;
            self._cache[self.chaveCache(registro.id)] = obj;
          }).catch(function() {
            self._cache[self.chaveCache(registro.id)] = {
              id: registro.id,
              paciente: '',
              data: '',
              queixa: '',
              intervencao: '',
              evolucao: '',
              plano: '',
              erro: true
            };
          })
        );
      })(ev);
    }

    if (!promessas.length) return Promise.resolve(true);
    return Promise.all(promessas).then(function() { return true; });
  },

  plain: function(ev) {
    if (!ev) return null;
    return this._cache[this.chaveCache(ev.id)] || (ev.cifrado ? null : this._copia(ev));
  },

  _copia: function(obj) {
    var copia = {};
    for (var chave in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, chave)) continue;
      if (chave === 'cifrado' || chave === 'iv' || chave === 'dados') continue;
      copia[chave] = obj[chave];
    }
    return copia;
  },

  // ---------- Migração e troca de chave ----------

  // Cifra evoluções salvas pelas versões antigas em texto legível.
  migrarParaChave: function(chave) {
    var self = this;
    var promessas = [];

    for (var i = 0; i < evolucoes.length; i++) {
      var ev = evolucoes[i];
      if (ev.cifrado) continue;
      (function(registro, indice) {
        promessas.push(Cripto.cifrar(chave, self._copia(registro)).then(function(cifrado) {
          var novo = { id: registro.id };
          for (var chaveCampo in cifrado) {
            if (Object.prototype.hasOwnProperty.call(cifrado, chaveCampo)) novo[chaveCampo] = cifrado[chaveCampo];
          }
          evolucoes[indice] = novo;
        }));
      })(ev, i);
    }

    if (!promessas.length) return Promise.resolve(false);
    return Promise.all(promessas).then(function() {
      self.limparCache();
      if (typeof Store !== 'undefined') Store.salvar();
      return true;
    });
  },

  // Usado quando a senha do prontuário é trocada: lê com a chave antiga e
  // grava tudo com a chave nova. Se qualquer leitura falhar, nada é salvo.
  recifrar: function(chaveAntiga, chaveNova) {
    var self = this;
    var promessas = [];

    for (var i = 0; i < evolucoes.length; i++) {
      var ev = evolucoes[i];
      (function(registro) {
        var leitura = registro.cifrado ?
          Cripto.decifrar(chaveAntiga, registro) :
          Promise.resolve(self._copia(registro));
        promessas.push(leitura.then(function(objeto) {
          objeto.id = registro.id;
          return Cripto.cifrar(chaveNova, objeto);
        }).then(function(cifrado) {
          var novo = { id: registro.id };
          for (var campo in cifrado) {
            if (Object.prototype.hasOwnProperty.call(cifrado, campo)) novo[campo] = cifrado[campo];
          }
          return novo;
        }));
      })(ev);
    }

    // Só substitui a lista depois que TODOS os registros foram recifrados.
    return Promise.all(promessas).then(function(novos) {
      evolucoes = novos;
      self.limparCache();
      if (typeof Store !== 'undefined') Store.salvar();
      return true;
    });
  },

  // ---------- Renderização ----------

  render: function() {
    var lista = document.getElementById('evolucoesLista');
    if (!lista) return;

    var subtitulo = document.getElementById('prontuarioSubtitulo');

    if (typeof segurancaModulo === 'undefined' || !segurancaModulo.estaDesbloqueado()) {
      if (subtitulo) subtitulo.textContent = 'Bloqueado';
      lista.innerHTML =
        '<div class="bloqueio-aviso">' +
          '<div class="bloqueio-icone">🔒</div>' +
          '<h3>Prontuário protegido</h3>' +
          '<p>Este conteúdo é cifrado. Digite sua senha para consultar ou registrar evoluções.</p>' +
          '<button type="button" class="btn btn-primary" onclick="prontuarioModulo.solicitarAcesso()">' +
            'Desbloquear prontuário</button>' +
        '</div>';
      if (typeof segurancaModulo !== 'undefined') segurancaModulo.renderTrilha();
      return;
    }

    var self = this;
    this.garantirCache().then(function() { self._renderComCache(); });
  },

  _renderComCache: function() {
    var lista = document.getElementById('evolucoesLista');
    if (!lista) return;
    var resumo = document.getElementById('evolucoesResumo');
    var subtitulo = document.getElementById('prontuarioSubtitulo');

    this.preencherPacientes();

    var termo = normalizarTexto(this.termo);
    var filtrados = [];
    for (var i = 0; i < evolucoes.length; i++) {
      var ev = this.plain(evolucoes[i]);
      if (!ev) continue;
      var texto = normalizarTexto([ev.paciente, ev.queixa, ev.intervencao, ev.evolucao, ev.plano].join(' '));
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
      for (var j = 0; j < filtrados.length; j++) lista.appendChild(this.card(filtrados[j]));
    }

    segurancaModulo.renderTrilha();
  },

  card: function(ev) {
    var acoes =
      app.botaoAcao('Editar', 'prontuarioModulo.editar(' + Number(ev.id) + ')', 'editar') +
      app.botaoAcao('Excluir', 'prontuarioModulo.excluir(' + Number(ev.id) + ')', 'excluir', true);

    var div = document.createElement('div');
    div.className = 'evolucao-card';
    if (ev.erro) {
      div.innerHTML =
        '<div class="evolucao-cab"><div><div class="evolucao-data">' +
        escapeHtml(ev.data || 'Data desconhecida') + '</div>' +
        '<div class="evolucao-paciente">Evolução indisponível</div></div></div>' +
        '<div class="evolucao-trechos"><p class="texto-vazio">' +
        'Não foi possível abrir este registro com a chave atual.' +
        '</p></div>';
      return div;
    }

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

  abrirModal: function(opcoes) {
    var self = this;
    opcoes = opcoes || {};
    segurancaModulo.exigirAcesso(function() { self.mostrarModal(opcoes); });
  },

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
    var self = this;
    if (!segurancaModulo.estaDesbloqueado()) {
      segurancaModulo.exigirAcesso(function() { self.mostrarModal(opcoes); });
      return;
    }
    segurancaModulo.registrarAtividade();
    this.garantirCache().then(function() { self._mostrarModal(opcoes); });
  },

  _mostrarModal: function(opcoes) {
    opcoes = opcoes || {};
    if (!segurancaModulo.estaDesbloqueado()) return;

    var form = document.getElementById('formEvolucao');
    if (form) form.reset();

    prontuarioEditId = opcoes.id || null;
    var bruto = prontuarioEditId ? this.buscarPorId(prontuarioEditId) : null;
    var ev = bruto ? this.plain(bruto) : null;

    var titulo = document.querySelector('#modalEvolucao .modal-title');
    if (titulo) titulo.textContent = ev && !ev.erro ? 'Editar evolução' : 'Nova evolução';

    var paciente = document.getElementById('evoPaciente');
    if (paciente) paciente.value = ev && !ev.erro ? ev.paciente : (opcoes.paciente || '');

    var data = document.getElementById('evoData');
    if (data) data.value = ev && !ev.erro ? ev.data : (opcoes.data || hojeStr);

    var lancId = document.getElementById('evoLancamentoId');
    if (lancId) lancId.value = ev && !ev.erro ? (ev.lancamentoId || '') : (opcoes.lancamentoId || '');

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

      if (!podeTrocar) {
        for (var nomeModelo in this.MODELO) {
          if (this.MODELO[nomeModelo][campo.chave] === atual) {
            podeTrocar = true;
            break;
          }
        }
      }

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
    var bruto = prontuarioEditId ? this.buscarPorId(prontuarioEditId) : null;
    var anterior = bruto ? this.plain(bruto) : null;
    var editando = !!prontuarioEditId && !!anterior;

    var registro = {
      paciente: nome,
      data: data ? data.value : hojeStr,
      lancamentoId: lancId ? (lancId.value || null) : null,
      queixa: this.valor('evoQueixa'),
      intervencao: this.valor('evoIntervencao'),
      evolucao: this.valor('evoEvolucao'),
      plano: this.valor('evoPlano'),
      criadoEm: anterior && anterior.criadoEm ? anterior.criadoEm : agora,
      atualizadoEm: agora
    };

    var chave = segurancaModulo.chaveAes;
    return Cripto.cifrar(chave, registro).then(function(cifrado) {
      var novo = { id: editando ? bruto.id : Date.now() };
      for (var campo in cifrado) {
        if (Object.prototype.hasOwnProperty.call(cifrado, campo)) novo[campo] = cifrado[campo];
      }

      if (editando) {
        for (var i = 0; i < evolucoes.length; i++) {
          if (evolucoes[i].id === bruto.id) { evolucoes[i] = novo; break; }
        }
      } else {
        evolucoes.push(novo);
      }

      self._cache[self.chaveCache(novo.id)] = registro;
      if (typeof Store !== 'undefined') Store.salvar();
      segurancaModulo.registrar(
        editando ? 'Edição de evolução' : 'Nova evolução',
        segurancaModulo.mascararNome(nome)
      );
      self.render();
      app.fecharModal('modalEvolucao');
      app.toast(editando ? 'Evolução atualizada.' : 'Evolução registrada.');
      return true;
    }).catch(function() {
      app.toast('Não foi possível cifrar a evolução. Tente novamente.');
      return false;
    });
  },

  valor: function(id) {
    var el = document.getElementById(id);
    return el ? String(el.value).trim() : '';
  },

  editar: function(id) {
    var self = this;
    var bruto = this.buscarPorId(id);
    if (!bruto) return;
    // O registro da consulta só entra na trilha depois da senha conferida.
    segurancaModulo.exigirAcesso(function() {
      self.garantirCache().then(function() {
        var ev = self.plain(bruto);
        segurancaModulo.registrar('Consulta de evolução',
          segurancaModulo.mascararNome(ev && ev.paciente));
        self.mostrarModal({ id: id });
      });
    });
  },

  excluir: function(id) {
    var self = this;
    var bruto = this.buscarPorId(id);
    if (!bruto) return;
    if (!segurancaModulo.estaDesbloqueado()) {
      segurancaModulo.exigirAcesso(function() { self.excluir(id); });
      return;
    }
    this.garantirCache().then(function() {
      var ev = self.plain(bruto);
      var nome = ev && ev.paciente;
      segurancaModulo.registrarAtividade();
      if (!confirm('Excluir esta evolução? Esta ação não pode ser desfeita.')) return;

      var novo = [];
      for (var i = 0; i < evolucoes.length; i++) {
        if (evolucoes[i].id !== id) novo.push(evolucoes[i]);
      }
      evolucoes = novo;
      delete self._cache[self.chaveCache(id)];

      if (typeof Store !== 'undefined') Store.salvar();
      segurancaModulo.registrar('Exclusão de evolução', segurancaModulo.mascararNome(nome));
      self.render();
      app.toast('Evolução excluída.');
    });
  }

};

window.prontuarioModulo = prontuarioModulo;
