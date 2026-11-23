// ============================================================================
// Situação Paciente — pagamentos por mês com atualização rápida
// ============================================================================

var situacaoModulo = {

  render: function() {
    var tbody = document.getElementById('tbodySituacao');
    if (!tbody) return;

    var mes = mesesModulo.mesAtual('situacao');
    var titulo = document.getElementById('tituloSituacao');
    if (titulo) titulo.textContent = 'Pagamentos de ' + mesesModulo.rotulo(mes);

    tbody.innerHTML = '';

    // filtrar lançamentos do mês selecionado
    var lista = [];
    for (var i = 0; i < lancamentos.length; i++) {
      var l = lancamentos[i];
      if (l.data && l.data.indexOf(mes) === 0) lista.push(l);
    }

    lista.sort(function(a, b) {
      var d = a.data.localeCompare(b.data);
      return d !== 0 ? d : a.horario.localeCompare(b.horario);
    });

    if (lista.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:1.5rem;">Nenhum lançamento neste mês.</td></tr>';
      return;
    }

    for (var i = 0; i < lista.length; i++) {
      var l = lista[i];
      var f = obterFontePorId(l.fonteId);

      var statusBadge = (l.status === 'pago') ? 'badge-pago' : 'badge-pendente';
      var statusTexto = (l.status === 'pago') ? 'Pago' : 'Pendente';

      var acao = (l.status === 'pago')
        ? app.botaoAcao('Voltar para pendente', 'situacaoModulo.marcarPendente(' + Number(l.id) + ')', 'pendente')
        : app.botaoAcao('Marcar como pago', 'situacaoModulo.marcarPago(' + Number(l.id) + ')', 'pago');

      if (l.status === 'pago') {
        acao += app.botaoAcao('Recibo', 'recibosModulo.gerar(' + Number(l.id) + ')', 'editar');
      }

      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + formatarData(l.data) + '<br><span class="cell-sub">' + escapeHtml(l.horario) + '</span></td>' +
        '<td><strong>' + escapeHtml(l.paciente) + '</strong></td>' +
        '<td>' + (f ? escapeHtml(f.nome) : '-') + '</td>' +
        '<td class="money">' + formatarMoeda(l.valor) + '</td>' +
        '<td class="money">' + formatarMoeda(l.suaParte) + '</td>' +
        '<td><span class="badge ' + statusBadge + '">' + statusTexto + '</span></td>' +
        '<td style="white-space:nowrap;">' + acao + '</td>';

      tbody.appendChild(tr);
    }
  },

  marcarPago: function(id) {
    var l = obterLancamento(id);
    if (l) l.status = 'pago';
    Store.salvar();
    this.render();
    app.toast('Pagamento confirmado.');
  },

  marcarPendente: function(id) {
    var l = obterLancamento(id);
    if (l) l.status = 'pendente';
    Store.salvar();
    this.render();
    app.toast('Status alterado para pendente.');
  }

};

function obterLancamento(id) {
  for (var i = 0; i < lancamentos.length; i++) {
    if (lancamentos[i].id === id) return lancamentos[i];
  }
  return null;
}

window.situacaoModulo = situacaoModulo;
