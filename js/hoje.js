// ============================================================================
// Painel Hoje — visão do dia + fluxo rápido de sessão com cronômetro
// ============================================================================

var hojeModulo = {

  sessao: null,       // { id, inicio } — sessão com cronômetro rodando
  timerHandle: null,
  DURACAO_ALVO: 50 * 60, // 50 minutos, em segundos

  init: function() {
    this.carregarSessao();
    if (this.sessao) this.iniciarTick();
  },

  // ---------- Cronômetro persistente ----------

  chaveSessao: 'saas_sessao_ativa',

  salvarSessao: function() {
    try {
      if (this.sessao) localStorage.setItem(this.chaveSessao, JSON.stringify(this.sessao));
      else localStorage.removeItem(this.chaveSessao);
    } catch (e) {
      // armazenamento indisponível — segue sem persistir
    }
  },

  carregarSessao: function() {
    try {
      var raw = localStorage.getItem(this.chaveSessao);
      if (raw) this.sessao = JSON.parse(raw);
    } catch (e) {
      this.sessao = null;
    }
    // se o lançamento foi apagado, descarta o cronômetro
    if (this.sessao && !this.obterLancamento(this.sessao.id)) {
      this.sessao = null;
      this.salvarSessao();
    }
  },

  obterLancamento: function(id) {
    for (var i = 0; i < lancamentos.length; i++) {
      if (lancamentos[i].id === id) return lancamentos[i];
    }
    return null;
  },

  // ---------- Renderização ----------

  render: function() {
    // se o atendimento com cronômetro foi apagado, encerra o cronômetro
    if (this.sessao && !this.obterLancamento(this.sessao.id)) {
      this.pararTick();
      this.sessao = null;
      this.salvarSessao();
    }

    var dataEl = document.getElementById('hojeData');
    if (dataEl) dataEl.textContent = this.rotuloData();

    var deHoje = [];
    var proximos = [];
    var mesAtual = hojeStr.slice(0, 7);
    var ganhoMes = 0;
    var pendentesMes = 0;

    for (var i = 0; i < lancamentos.length; i++) {
      var l = lancamentos[i];
      if (!l.data) continue;

      if (l.data.indexOf(mesAtual) === 0) {
        ganhoMes += (parseFloat(l.suaParte) || 0);
        if (l.status === 'pendente') pendentesMes++;
      }
      if (l.data === hojeStr) deHoje.push(l);
      else if (l.data > hojeStr) proximos.push(l);
    }

    deHoje.sort(function(a, b) { return a.horario.localeCompare(b.horario); });
    proximos.sort(function(a, b) {
      var d = a.data.localeCompare(b.data);
      return d !== 0 ? d : a.horario.localeCompare(b.horario);
    });

    var aguardando = 0;
    var aReceberHoje = 0;
    for (var i = 0; i < deHoje.length; i++) {
      if ((deHoje[i].presenca || 'agendado') === 'agendado') aguardando++;
      aReceberHoje += (parseFloat(deHoje[i].suaParte) || 0);
    }

    // agendados de hoje em diante que ainda não confirmaram presença
    var faltam = [];
    // pendências de pagamento do mês
    var devem = [];
    for (var i = 0; i < lancamentos.length; i++) {
      var l = lancamentos[i];
      if (!l.data) continue;
      if (l.data >= hojeStr && (l.presenca || 'agendado') === 'agendado') {
        faltam.push(l);
      }
      if (l.data.indexOf(mesAtual) === 0 && l.status === 'pendente') {
        devem.push(l);
      }
    }
    faltam.sort(function(a, b) {
      var d = a.data.localeCompare(b.data);
      return d !== 0 ? d : a.horario.localeCompare(b.horario);
    });
    devem.sort(function(a, b) {
      var d = a.data.localeCompare(b.data);
      return d !== 0 ? d : a.horario.localeCompare(b.horario);
    });

    var stats = document.getElementById('hojeStats');
    if (stats) {
      stats.innerHTML =
        this.statCard('Atendimentos hoje', String(deHoje.length), 'principal') +
        this.statCard('Aguardando confirmação', String(aguardando), 'agenda') +
        this.statCard('A receber hoje', formatarMoeda(aReceberHoje), 'receita') +
        this.statCard('Ganho no mês', formatarMoeda(ganhoMes), 'media');
    }

    var resumo = document.getElementById('hojeResumo');
    if (resumo) {
      resumo.textContent = deHoje.length === 0
        ? 'Nenhum atendimento agendado'
        : deHoje.length + (deHoje.length === 1 ? ' atendimento' : ' atendimentos');
    }

    var lista = document.getElementById('hojeLista');
    if (lista) {
      lista.innerHTML = '';
      if (deHoje.length === 0) {
        lista.innerHTML = '<div class="empty"><p>Nenhum atendimento para hoje.</p>' +
          '<button class="btn btn-outline btn-sm" onclick="app.trocarPagina(\'agenda\')">Ver agenda</button></div>';
      } else {
        for (var i = 0; i < deHoje.length; i++) lista.appendChild(this.item(deHoje[i]));
      }
    }

    var proximosEl = document.getElementById('hojeProximos');
    if (proximosEl) {
      var primeiros = proximos.slice(0, 5);
      proximosEl.innerHTML = '';
      if (primeiros.length === 0) {
        proximosEl.innerHTML = '<p class="texto-vazio">Nada agendado para os próximos dias.</p>';
      } else {
        for (var i = 0; i < primeiros.length; i++) {
          var p = primeiros[i];
          var f = obterFontePorId(p.fonteId);
          var div = document.createElement('div');
          div.className = 'proximo-item';
          div.innerHTML =
            '<div class="proximo-data">' + formatarData(p.data) +
              ' <span>' + escapeHtml(p.horario) + '</span></div>' +
            '<div class="proximo-nome">' + escapeHtml(p.paciente) + '</div>' +
            '<div class="proximo-fonte">' + (f ? escapeHtml(f.nome) : 'Sem convênio') + '</div>';
          proximosEl.appendChild(div);
        }
      }
    }

    var pendEl = document.getElementById('hojePendencias');
    if (pendEl) {
      pendEl.innerHTML =
        '<div class="pendencia-num">' + pendentesMes + '</div>' +
        '<div class="pendencia-texto">pagamento(s) pendente(s) neste mês</div>' +
        '<button class="btn btn-outline btn-sm" onclick="app.trocarPagina(\'situacao\')">Ver situação</button>';
    }

    // card: faltam confirmar (envio rápido pelo WhatsApp)
    var confirEl = document.getElementById('hojeConfirmar');
    if (confirEl) {
      var resumoConf = document.getElementById('hojeConfirmarResumo');
      if (resumoConf) resumoConf.textContent = faltam.length ? faltam.length + ' agendado(s)' : '';
      if (faltam.length === 0) {
        confirEl.innerHTML = '<p class="texto-vazio">Nenhuma confirmação pendente.</p>';
      } else {
        confirEl.innerHTML = '';
        var primeirosConf = faltam.slice(0, 5);
        for (var i = 0; i < primeirosConf.length; i++) {
          var c = primeirosConf[i];
          var divConf = document.createElement('div');
          divConf.className = 'confirmar-item';
          divConf.innerHTML =
            '<div class="confirmar-info">' +
              '<div class="confirmar-nome">' + escapeHtml(c.paciente) + '</div>' +
              '<div class="confirmar-data">' + formatarData(c.data) + ' às ' + escapeHtml(c.horario) + '</div>' +
            '</div>' +
            '<div class="confirmar-acoes">' +
              '<button type="button" class="btn btn-outline btn-sm btn-whatsapp" ' +
                'onclick="whatsappModulo.enviarConfirmacao(' + Number(c.id) + ')" ' +
                'title="Abre o WhatsApp com a mensagem pronta">Enviar</button>' +
              '<button type="button" class="btn btn-outline btn-sm" ' +
                'onclick="whatsappModulo.copiar(' + Number(c.id) + ')" ' +
                'title="Copia a mensagem para colar no WhatsApp">Copiar mensagem</button>' +
            '</div>';
          confirEl.appendChild(divConf);
        }
      }
    }

    // card: quem deve (pendências com atalho para confirmar pagamento)
    var deveEl = document.getElementById('hojeQuemDeve');
    if (deveEl) {
      var resumoDeve = document.getElementById('hojeQuemDeveResumo');
      var totalDeve = 0;
      for (var i = 0; i < devem.length; i++) totalDeve += (parseFloat(devem[i].suaParte) || 0);
      if (resumoDeve) resumoDeve.textContent = devem.length ? formatarMoeda(totalDeve) : '';
      if (devem.length === 0) {
        deveEl.innerHTML = '<p class="texto-vazio">Tudo quitado neste mês.</p>';
      } else {
        deveEl.innerHTML = '';
        var primeirosDeve = devem.slice(0, 5);
        for (var i = 0; i < primeirosDeve.length; i++) {
          var d = primeirosDeve[i];
          var divDeve = document.createElement('div');
          divDeve.className = 'quem-deve-item';
          divDeve.innerHTML =
            '<div class="quem-deve-info">' +
              '<div class="quem-deve-nome">' + escapeHtml(d.paciente) + '</div>' +
              '<div class="quem-deve-valor">' + formatarMoeda(d.suaParte || d.valor) +
                ' · ' + formatarData(d.data) + '</div>' +
            '</div>' +
            '<button type="button" class="btn btn-outline btn-sm" ' +
              'onclick="hojeModulo.marcarPago(' + Number(d.id) + ')" ' +
              'title="Confirma o pagamento">Marcar pago</button>';
          deveEl.appendChild(divDeve);
        }
      }
    }

    this.atualizarCronometro();
  },

  item: function(l) {
    var presenca = l.presenca || 'agendado';
    var info = {
      agendado:   { rotulo: 'Agendado',   classe: 'badge-agendado' },
      compareceu: { rotulo: 'Compareceu', classe: 'badge-compareceu' },
      faltou:     { rotulo: 'Faltou',     classe: 'badge-faltou' },
      cancelou:   { rotulo: 'Cancelou',   classe: 'badge-cancelou' }
    }[presenca] || { rotulo: 'Agendado', classe: 'badge-agendado' };

    var f = obterFontePorId(l.fonteId);
    var ativa = !!(this.sessao && this.sessao.id === l.id);
    var acoes = '';

    var idSeguro = Number(l.id);

    if (ativa) {
      acoes =
        '<button type="button" class="btn btn-primary btn-sm" onclick="hojeModulo.finalizarSessao()">Finalizar sessão</button>' +
        '<button type="button" class="btn btn-outline btn-sm" onclick="hojeModulo.cancelarSessao()">Cancelar</button>';
    } else if (presenca === 'agendado') {
      acoes = '<button type="button" class="btn btn-primary btn-sm" onclick="hojeModulo.iniciarSessao(' + idSeguro + ')">Iniciar sessão</button>' +
        '<button type="button" class="btn btn-outline btn-sm btn-whatsapp" onclick="whatsappModulo.enviarConfirmacao(' + idSeguro + ')">Enviar confirmação</button>' +
        '<button type="button" class="btn btn-outline btn-sm" onclick="whatsappModulo.copiar(' + idSeguro + ')">Copiar mensagem</button>';
    }

    acoes += app.botaoAcao('Editar', 'lancamentosModulo.editar(' + idSeguro + ')', 'editar');

    if (l.status === 'pago') {
      acoes += app.botaoAcao('Recibo', 'recibosModulo.gerar(' + idSeguro + ')', 'editar');
    }

    // atendimento realizado: atalho para escrever a evolução já com paciente e data
    if (presenca === 'compareceu' || l.sessaoFinalizada) {
      acoes += app.botaoAcao('Escrever evolução',
        'prontuarioModulo.abrirDaSessao(' + idSeguro + ')', 'editar');
    }

    if (l.status === 'pendente') {
      acoes += app.botaoAcao('Marcar como pago', 'hojeModulo.marcarPago(' + idSeguro + ')', 'pago');
    }

    var cronometroHtml = '';
    if (ativa) {
      cronometroHtml =
        '<div class="cronometro" id="cronometro-' + idSeguro + '">' +
          '<span class="cronometro-tempo">00:00</span>' +
          '<span class="cronometro-alvo"> / 50:00</span>' +
          '<div class="progresso"><div class="progresso-barra" id="progresso-' + idSeguro + '"></div></div>' +
        '</div>';
    } else if (l.sessaoFinalizada && l.duracao) {
      cronometroHtml = '<div class="cronometro finalizado">Sessão concluída em ' +
        this.formatarDuracao(l.duracao) + '</div>';
    }

    var div = document.createElement('div');
    div.className = 'hoje-item' + (ativa ? ' ativo' : '');
    div.innerHTML =
      '<div class="hoje-hora">' + escapeHtml(l.horario) + '</div>' +
      '<div class="hoje-corpo">' +
        '<div class="hoje-linha-top">' +
          '<span class="hoje-nome">' + escapeHtml(l.paciente) + '</span>' +
          (l.tipo === 'avaliacao' ? '<span class="badge badge-avaliacao">Avaliação</span>' : '') +
          '<span class="badge ' + info.classe + '">' + info.rotulo + '</span>' +
          '<span class="badge ' + (l.status === 'pago' ? 'badge-pago' : 'badge-pendente') + '">' +
            (l.status === 'pago' ? 'Pago' : 'Pendente') + '</span>' +
        '</div>' +
        '<div class="hoje-meta">' +
          (f ? escapeHtml(f.nome) : 'Sem convênio') + ' · ' + formatarMoeda(l.valor) +
          ' · a receber ' + formatarMoeda(l.suaParte) +
        '</div>' +
        cronometroHtml +
        '<div class="hoje-acoes">' + acoes + '</div>' +
      '</div>';
    return div;
  },

  // ---------- Ações do fluxo de sessão ----------

  iniciarSessao: function(id) {
    if (this.sessao && this.sessao.id !== id) {
      app.toast('Finalize a sessão atual antes de iniciar outra.');
      return;
    }
    var l = this.obterLancamento(id);
    if (!l) return;

    l.presenca = 'compareceu';
    Store.salvar();

    this.sessao = { id: id, inicio: Date.now() };
    this.salvarSessao();
    this.iniciarTick();
    this.render();
    app.toast('Sessão iniciada. Bom atendimento!');
  },

  finalizarSessao: function() {
    if (!this.sessao) return;
    var l = this.obterLancamento(this.sessao.id);
    var segundos = Math.max(1, Math.round((Date.now() - this.sessao.inicio) / 1000));

    if (l) {
      l.duracao = segundos;
      l.sessaoFinalizada = true;
      Store.salvar();
    }

    this.pararTick();
    this.sessao = null;
    this.salvarSessao();
    this.render();
    app.toast('Sessão concluída em ' + this.formatarDuracao(segundos) + '.');
  },

  cancelarSessao: function() {
    if (!this.sessao) return;
    var l = this.obterLancamento(this.sessao.id);
    if (l) {
      l.presenca = 'agendado';
      Store.salvar();
    }
    this.pararTick();
    this.sessao = null;
    this.salvarSessao();
    this.render();
    app.toast('Sessão cancelada.');
  },

  marcarPago: function(id) {
    var l = this.obterLancamento(id);
    if (l) l.status = 'pago';
    Store.salvar();
    this.render();
    app.toast('Pagamento confirmado.');
  },

  // ---------- Cronômetro ----------

  formatarDuracao: function(segundos) {
    var m = Math.floor(segundos / 60);
    var s = segundos % 60;
    return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
  },

  iniciarTick: function() {
    this.pararTick();
    var self = this;
    this.timerHandle = setInterval(function() { self.atualizarCronometro(); }, 1000);
    this.atualizarCronometro();
  },

  pararTick: function() {
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  },

  atualizarCronometro: function() {
    if (!this.sessao) return;
    var el = document.getElementById('cronometro-' + this.sessao.id);
    if (!el) return;

    var seg = Math.max(0, Math.floor((Date.now() - this.sessao.inicio) / 1000));
    var tempo = el.querySelector('.cronometro-tempo');
    if (tempo) tempo.textContent = this.formatarDuracao(seg);

    var barra = document.getElementById('progresso-' + this.sessao.id);
    if (barra) {
      barra.style.width = Math.min(100, Math.round((seg / this.DURACAO_ALVO) * 100)) + '%';
      if (seg >= this.DURACAO_ALVO) barra.classList.add('concluido');
    }
    if (seg >= this.DURACAO_ALVO) el.classList.add('passou-alvo');
  },

  // ---------- Apoio ----------

  rotuloData: function() {
    var d = new Date();
    var dias = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira',
                'quinta-feira', 'sexta-feira', 'sábado'];
    var meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
                 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    var texto = dias[d.getDay()] + ', ' + d.getDate() + ' de ' +
                meses[d.getMonth()] + ' de ' + d.getFullYear();
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  },

  statCard: function(label, valor, classe) {
    return '<div class="stat-card">' +
      '<div class="stat-icon ' + escapeHtml(classe) + '">•</div>' +
      '<div class="stat-info">' +
        '<div class="stat-label">' + escapeHtml(label) + '</div>' +
        '<div class="stat-value">' + escapeHtml(valor) + '</div>' +
      '</div>' +
    '</div>';
  }

};

window.hojeModulo = hojeModulo;

// inicia o cronômetro antes do app renderizar a página inicial
(function() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { hojeModulo.init(); });
  } else {
    hojeModulo.init();
  }
})();
