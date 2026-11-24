// ============================================================================
// Resumos — totais do mês separados por convênio
// Atendimentos normais e avaliações aparecem em seções separadas
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

    // separa atendimentos normais de avaliações
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

    // seção separada de avaliações
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
          '<h3>' + escapeHtml(f.nome) + '</h3>' +
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

  // ---------- Exportação CSV para o contador ----------

  // Atendimentos do mês selecionado na aba Resumos
  lancamentosDoMes: function() {
    var mes = mesesModulo.mesAtual('resumos');
    var lista = [];
    for (var i = 0; i < lancamentos.length; i++) {
      if (lancamentos[i].data && lancamentos[i].data.indexOf(mes) === 0) {
        lista.push(lancamentos[i]);
      }
    }
    lista.sort(function(a, b) {
      var d = String(a.data).localeCompare(String(b.data));
      return d !== 0 ? d : String(a.horario).localeCompare(String(b.horario));
    });
    return lista;
  },

  // Texto seguro para CSV: protege contra fórmulas e cita ; " quebras de linha
  csvTexto: function(valor) {
    var s = String(valor === null || valor === undefined ? '' : valor);
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    if (/[";\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  },

  // Número no padrão brasileiro: 1234.5 -> "1234,50" (o Excel entende)
  csvNumero: function(valor) {
    if (valor === null || valor === undefined || valor === '') return '';
    var n = parseFloat(valor);
    if (isNaN(n)) return '';
    return (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');
  },

  baixarCsv: function(nome, linhas) {
    // BOM para o Excel reconhecer acentos; CRLF para quebrar linhas corretamente
    var conteudo = '\uFEFF' + linhas.join('\r\n') + '\r\n';
    var blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);

    var a = document.createElement('a');
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    app.toast('Arquivo baixado: ' + nome);
  },

  formaPagamento: function(valor) {
    return { dinheiro: 'Dinheiro', pix: 'Pix', clinica: 'Clínica', cartao: 'Cartão' }[valor] || valor || '-';
  },

  // Arquivo enxuto para o contador: só as colunas que ele realmente usa
  exportarContador: function() {
    var lista = this.lancamentosDoMes();
    if (lista.length === 0) {
      app.toast('Não há atendimentos neste mês para exportar.');
      return;
    }

    var mes = mesesModulo.mesAtual('resumos');
    var linhas = [[
      'Data', 'Convênio', 'Forma de pagamento', 'Valor', 'Ganho', 'Repasse', 'Observações'
    ].join(';')];

    var totalValor = 0;
    var totalGanho = 0;
    var totalRepasse = 0;
    var semPercentual = false;

    for (var i = 0; i < lista.length; i++) {
      var l = lista[i];
      var f = obterFontePorId(l.fonteId);
      var r = calcularValores(f, l.valor);

      totalValor += (parseFloat(l.valor) || 0);
      if (r) {
        totalGanho += r.ganho;
        totalRepasse += r.repasse;
      } else {
        semPercentual = true;
      }

      linhas.push([
        this.csvTexto(formatarData(l.data)),
        this.csvTexto(f ? f.nome : ''),
        this.csvTexto(this.formaPagamento(l.pagamento)),
        this.csvNumero(l.valor),
        (r ? this.csvNumero(r.ganho) : ''),
        (r ? this.csvNumero(r.repasse) : ''),
        this.csvTexto(l.obs || '')
      ].join(';'));
    }

    // linha final: soma das colunas numéricas (as de texto ficam vazias)
    linhas.push([
      this.csvTexto('TOTAL'),
      '',
      '',
      this.csvNumero(totalValor),
      this.csvNumero(totalGanho),
      this.csvNumero(totalRepasse),
      this.csvTexto(semPercentual ? 'Parcial: convênio sem percentual' : '')
    ].join(';'));

    this.baixarCsv('contador-' + mes + '.csv', linhas);
  },

  // ---------- Relatório mensal (resumo + entradas + pendências + faltas) ----------

  // O contato vem da ficha do paciente. O nome é casado sem acento e sem
  // diferença de maiúscula/minúscula; paciente sem ficha aparece em branco.
  contatoPaciente: function(nome) {
    var alvo = normalizarTexto(nome);
    if (!alvo) return '';
    for (var i = 0; i < pacientes.length; i++) {
      var p = pacientes[i];
      if (normalizarTexto(p.nome) !== alvo) continue;
      var partes = [];
      if (p.telefone) {
        partes.push('Tel ' + (typeof formatarTelefone === 'function'
          ? formatarTelefone(p.telefone) : p.telefone));
      }
      if (p.responsavel) partes.push('Resp.: ' + p.responsavel);
      if (p.carteira) partes.push('Carteira: ' + p.carteira);
      if (p.cpf) {
        partes.push('CPF ' + (typeof formatarCpf === 'function' ? formatarCpf(p.cpf) : p.cpf));
      }
      return partes.join(' | ');
    }
    return '';
  },

  presencaRotulo: function(l) {
    var atual = l.presenca || 'agendado';
    var info = (typeof lancPresencaInfo !== 'undefined') ? lancPresencaInfo[atual] : null;
    return info ? info.rotulo : ({ faltou: 'Faltou', cancelou: 'Cancelou' }[atual] || 'Agendado');
  },

  linhaRelatorio: function(l) {
    var f = obterFontePorId(l.fonteId);
    var dataTxt = typeof formatarData === 'function' ? formatarData(l.data) : l.data;
    return [
      this.csvTexto(dataTxt),
      this.csvTexto(l.horario || ''),
      this.csvTexto(l.paciente || ''),
      this.csvTexto(this.contatoPaciente(l.paciente)),
      this.csvTexto(f ? f.nome : ''),
      this.csvTexto(l.tipo === 'avaliacao' ? 'Avaliação' : 'Atendimento'),
      this.csvTexto(this.formaPagamento(l.pagamento)),
      this.csvTexto(this.presencaRotulo(l)),
      this.csvTexto(l.obs || ''),
      this.csvNumero(l.valor)
    ].join(';');
  },

  exportarRelatorio: function() {
    var lista = this.lancamentosDoMes();
    if (lista.length === 0) {
      app.toast('Não há atendimentos neste mês para exportar.');
      return;
    }

    var mes = mesesModulo.mesAtual('resumos');
    var entradas = [];
    var pendencias = [];
    var faltas = [];
    var cancelamentos = 0;
    var totalEntradas = 0;
    var totalPendencias = 0;

    for (var i = 0; i < lista.length; i++) {
      var l = lista[i];
      var valor = parseFloat(l.valor) || 0;
      var presenca = l.presenca || 'agendado';

      if (l.status === 'pago') {
        entradas.push(l);
        totalEntradas += valor;
      }
      // Falta e cancelamento não são dívida em aberto.
      if (l.status === 'pendente' && presenca !== 'faltou' && presenca !== 'cancelou') {
        pendencias.push(l);
        totalPendencias += valor;
      }
      if (presenca === 'faltou') faltas.push(l);
      if (presenca === 'cancelou') cancelamentos++;
    }

    var cabecalho = [
      'Data', 'Horário', 'Paciente', 'Contato', 'Convênio', 'Tipo',
      'Pagamento', 'Presença', 'Observações', 'Valor'
    ].join(';');

    var linhas = [
      ['RELATORIO MENSAL', mes].join(';'),
      'RESUMO',
      ['Atendimentos no mês', String(lista.length)].join(';'),
      ['Entradas (pagos)', String(entradas.length)].join(';'),
      ['Pendências', String(pendencias.length)].join(';'),
      ['Faltas', String(faltas.length)].join(';'),
      ['Cancelamentos', String(cancelamentos)].join(';'),
      ['Total recebido', this.csvNumero(totalEntradas)].join(';'),
      ['Total pendente', this.csvNumero(totalPendencias)].join(';'),
      '',
      'ENTRADAS',
      cabecalho
    ];
    for (var i = 0; i < entradas.length; i++) linhas.push(this.linhaRelatorio(entradas[i]));

    linhas.push('', 'PENDÊNCIAS', cabecalho);
    for (var i = 0; i < pendencias.length; i++) linhas.push(this.linhaRelatorio(pendencias[i]));

    linhas.push('', 'FALTAS', cabecalho);
    for (var i = 0; i < faltas.length; i++) linhas.push(this.linhaRelatorio(faltas[i]));

    this.baixarCsv('relatorio-' + mes + '.csv', linhas);
  },

  statCard: function(label, valor, classe) {
    return '<div class="stat-card">' +
      '<div class="stat-icon ' + escapeHtml(classe) + '">R$</div>' +
      '<div class="stat-info">' +
        '<div class="stat-label">' + escapeHtml(label) + '</div>' +
        '<div class="stat-value">' + escapeHtml(valor) + '</div>' +
      '</div>' +
    '</div>';
  }

};

window.resumosModulo = resumosModulo;
