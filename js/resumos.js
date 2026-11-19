// ============================================================================
// Resumos — totais do mês separados por convênio
// Atendimentos normais e avaliações avulsas aparecem em seções separadas
// Produzido = valor dos atendimentos | Ganho = percentual informado
// Repasse = diferença até o total produzido
// ============================================================================

var resumosModulo = {

  render: function() {
    var mes = mesesModulo.mesAtual('resumos');
    var titulo = document.getElementById('resumoTitulo');
    if (titulo) titulo.textContent = mesesModulo.rotulo(mes);

    var doMes = [];
    for (var i = 0; i < lancamentos.length; i++) {
      if (lancamentos[i].data && lancamentos[i].data.indexOf(mes) === 0) {
        doMes.push(lancamentos[i]);
      }
    }

    // separa atendimentos normais de avaliações avulsas
    var normais = [];
    var avaliacoes = [];
    for (var i = 0; i < doMes.length; i++) {
      if (doMes[i].tipo === 'avaliacao') avaliacoes.push(doMes[i]);
      else normais.push(doMes[i]);
    }

    // totais gerais (considera os dois tipos)
    var totalProduzido = 0;
    var totalGanho = 0;
    var totalRepasse = 0;
    var semPercentual = false;

    for (var i = 0; i < doMes.length; i++) {
      var l = doMes[i];
      totalProduzido += (parseFloat(l.valor) || 0);
      var r = calcularValores(obterFontePorId(l.fonteId), l.valor);
      if (r) {
        totalGanho += r.ganho;
        totalRepasse += r.repasse;
      } else {
        semPercentual = true;
      }
    }

    var stats = document.getElementById('statsResumos');
    if (stats) {
      stats.innerHTML =
        this.statCard('Total produzido', formatarMoeda(totalProduzido), 'principal') +
        this.statCard('Total ganho', semPercentual ? '—' : formatarMoeda(totalGanho), 'receita') +
        this.statCard('Total repasse', semPercentual ? '—' : formatarMoeda(totalRepasse), 'accent');
    }

    var aviso = document.getElementById('resumoAviso');
    if (aviso) aviso.style.display = semPercentual ? 'block' : 'none';

    // cards por convênio — atendimentos normais
    this.renderizarCards('resumosPorFonte', normais);

    // seção separada de avaliações avulsas
    var cardAvaliacoes = document.getElementById('cardAvaliacoes');
    if (cardAvaliacoes) {
      cardAvaliacoes.style.display = avaliacoes.length > 0 ? 'block' : 'none';
      var qtd = document.getElementById('avaliacoesQtd');
      if (qtd) {
        qtd.textContent = avaliacoes.length +
          (avaliacoes.length === 1 ? ' avaliação no mês' : ' avaliações no mês');
      }
      this.renderizarCards('resumoAvaliacoes', avaliacoes);
    }
  },

  renderizarCards: function(containerId, lista) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    if (fontes.length === 0) {
      container.innerHTML = '<div class="empty"><p>Nenhum convênio cadastrado.</p></div>';
      return;
    }

    for (var i = 0; i < fontes.length; i++) {
      var f = fontes[i];
      var produzido = 0;
      var ganho = 0;
      var repasse = 0;
      var quantidade = 0;

      for (var j = 0; j < lista.length; j++) {
        if (lista[j].fonteId !== f.id) continue;
        quantidade++;
        produzido += (parseFloat(lista[j].valor) || 0);
        var r = calcularValores(f, lista[j].valor);
        if (r) {
          ganho += r.ganho;
          repasse += r.repasse;
        }
      }

      if (quantidade === 0) continue;

      var pct = percentualDaFonte(f);
      var pctTexto = (pct === null) ? 'sem percentual' : pct + '% recebido';
      var semCalculo = (pct === null);

      var card = document.createElement('div');
      card.className = 'resumo-card' + (semCalculo ? ' sem-calculo' : '');
      card.innerHTML =
        '<div class="resumo-card-header">' +
          '<h3>' + f.nome + '</h3>' +
          '<span class="badge ' + (semCalculo ? 'badge-pendente' : 'badge-fixed') + '">' + pctTexto + '</span>' +
        '</div>' +
        '<div class="resumo-card-body">' +
          '<div class="resumo-linha"><span>Total produzido</span><strong>' + formatarMoeda(produzido) + '</strong></div>' +
          '<div class="resumo-linha destaque"><span>Total ganho</span><strong>' +
            (semCalculo ? '—' : formatarMoeda(ganho)) + '</strong></div>' +
          '<div class="resumo-linha"><span>Total repasse</span><strong>' +
            (semCalculo ? '—' : formatarMoeda(repasse)) + '</strong></div>' +
        '</div>' +
        '<div class="resumo-card-footer">' + quantidade +
          (quantidade === 1 ? ' atendimento no mês' : ' atendimentos no mês') + '</div>';

      container.appendChild(card);
    }

    if (container.children.length === 0) {
      container.innerHTML = '<div class="empty"><p>Nenhum lançamento neste mês.</p></div>';
    }
  },

  statCard: function(label, valor, classe) {
    return '<div class="stat-card">' +
      '<div class="stat-icon ' + classe + '">R$</div>' +
      '<div class="stat-info">' +
        '<div class="stat-label">' + label + '</div>' +
        '<div class="stat-value">' + valor + '</div>' +
      '</div>' +
    '</div>';
  }

};

window.resumosModulo = resumosModulo;
