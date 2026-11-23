// ============================================================================
// Lançamentos — atendimentos organizados por mês
// ============================================================================

var lancamentosEditId = null;

// rótulos/classes da presença (compatível com lançamentos antigos sem o campo)
var lancPresencaInfo = {
  agendado:   { rotulo: 'Agendado',   classe: 'badge-agendado' },
  compareceu: { rotulo: 'Compareceu', classe: 'badge-compareceu' },
  faltou:     { rotulo: 'Faltou',     classe: 'badge-faltou' },
  cancelou:   { rotulo: 'Cancelou',   classe: 'badge-cancelou' }
};

function lancamentosRender() {
  var tbody = document.getElementById('tbodyHoje');
  if (!tbody) return;

  tbody.innerHTML = '';

  var mes = mesesModulo.mesAtual('lancamentos');
  var titulo = document.getElementById('tituloLancamentos');
  if (titulo) titulo.textContent = 'Atendimentos de ' + mesesModulo.rotulo(mes);

  // ao trocar de mês, a seleção anterior não faz mais sentido
  if (lancamentosModulo.mesAtual !== mes) {
    lancamentosModulo.mesAtual = mes;
    lancamentosModulo.selecionados = { status: {}, presenca: {} };
  }

  // filtrar lançamentos do mês selecionado
  var lista = [];
  for (var i = 0; i < lancamentos.length; i++) {
    if (lancamentos[i].data && lancamentos[i].data.indexOf(mes) === 0) {
      lista.push(lancamentos[i]);
    }
  }

  // ordenar por data e horário
  lista.sort(function(a, b) {
    var d = a.data.localeCompare(b.data);
    return d !== 0 ? d : a.horario.localeCompare(b.horario);
  });

  // aplicar a busca por todas as colunas mostradas (exceto Ação)
  var termo = lancamentosModulo.termo;
  var visiveis = [];
  for (var i = 0; i < lista.length; i++) {
    if (!termo || lancamentosModulo.correspondeBusca(lista[i], termo)) {
      visiveis.push(lista[i]);
    }
  }
  lancamentosModulo.visiveis = visiveis;

  var resumo = document.getElementById('lancBuscaResumo');
  if (resumo) {
    if (termo) {
      resumo.textContent = visiveis.length === 0
        ? 'Nenhum atendimento encontrado neste mês'
        : visiveis.length + (visiveis.length === 1 ? ' atendimento encontrado' : ' atendimentos encontrados');
    } else {
      resumo.textContent = '';
    }
  }

  lancamentosModulo.atualizarCabecalhos();
  lancamentosModulo.atualizarMassa();

  if (visiveis.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; color:var(--text-muted); padding:1.5rem;">' +
      (termo ? 'Nenhum atendimento encontrado para essa busca.' : 'Nenhum atendimento neste mês.') +
      '</td></tr>';
    return;
  }

  for (var i = 0; i < visiveis.length; i++) {
    var l = visiveis[i];

    // buscar fonte
    var f = obterFontePorId(l.fonteId);

    var tipoBadge = (l.tipo === 'avaliacao') ? 'badge-avaliacao' : 'badge-fixed';
    var tipoTexto = (l.tipo === 'avaliacao') ? 'Avaliação' : 'Normal';

    var pagamentoTexto = lancamentosModulo.formaPagamentoTexto(l.pagamento);

    var statusBadge = (l.status === 'pago') ? 'badge-pago' : 'badge-pendente';
    var statusTexto = (l.status === 'pago') ? 'Pago' : 'Pendente';

    // presença (compatível com lançamentos antigos sem o campo)
    var p = lancPresencaInfo[l.presenca] || lancPresencaInfo.agendado;

    var acoes =
      app.botaoAcao('Editar', 'lancamentosModulo.editar(' + Number(l.id) + ')', 'editar') +
      app.botaoAcao('Duplicar', 'lancamentosModulo.duplicar(' + Number(l.id) + ')', 'duplicar');

    if (l.status === 'pago') {
      acoes += app.botaoAcao('Recibo', 'recibosModulo.gerar(' + Number(l.id) + ')', 'editar');
    }

    acoes += app.botaoAcao('Excluir', 'lancamentosModulo.excluir(' + Number(l.id) + ')', 'excluir', true);

    var chkStatus = lancamentosModulo.selecionados.status[l.id] ? ' checked' : '';
    var chkPresenca = lancamentosModulo.selecionados.presenca[l.id] ? ' checked' : '';

    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + formatarData(l.data) + '<br><span class="cell-sub">' + escapeHtml(l.horario) + '</span></td>' +
      '<td><span class="badge ' + tipoBadge + '">' + tipoTexto + '</span></td>' +
      '<td><strong>' + escapeHtml(l.paciente) + '</strong></td>' +
      '<td>' + (f ? escapeHtml(f.nome) : '-') + '</td>' +
      '<td><span class="badge badge-var">' + pagamentoTexto + '</span></td>' +
      '<td class="money">' + formatarMoeda(l.valor) + '</td>' +
      '<td class="money">' + formatarMoeda(l.suaParte) + '</td>' +
      '<td><span class="celula-check"><input type="checkbox" class="chk-lanc" title="Selecionar status" onchange="lancamentosModulo.marcar(' + Number(l.id) + ',\'status\',this.checked)"' + chkStatus + '> ' +
        '<span class="badge ' + statusBadge + '">' + statusTexto + '</span></span></td>' +
      '<td><span class="celula-check"><input type="checkbox" class="chk-lanc" title="Selecionar presença" onchange="lancamentosModulo.marcar(' + Number(l.id) + ',\'presenca\',this.checked)"' + chkPresenca + '> ' +
        '<span class="badge ' + p.classe + '">' + p.rotulo + '</span></span></td>' +
      '<td style="white-space:nowrap;">' + acoes + '</td>';

    tbody.appendChild(tr);
  }
}

var lancamentosModulo = {

  // ---------- Busca e seleção em massa ----------

  termo: '',                                  // texto digitado na busca
  visiveis: [],                               // lançamentos do mês após a busca
  selecionados: { status: {}, presenca: {} }, // ids marcados em cada coluna
  mesAtual: null,                             // mês da última renderização

  // remove acentos para a busca aceitar "avaliacao" e "avaliação", por exemplo
  normalizar: function(texto) {
    return normalizarTexto(texto);
  },

  formaPagamentoTexto: function(valor) {
    return { dinheiro: 'Dinheiro', pix: 'Pix', clinica: 'Clínica', cartao: 'Cartão' }[valor] || valor || '-';
  },

  presencaRotulo: function(valor) {
    var p = lancPresencaInfo[valor] || lancPresencaInfo.agendado;
    return p.rotulo;
  },

  // busca em todas as colunas da tabela, menos Ação
  correspondeBusca: function(l, termo) {
    var f = obterFontePorId(l.fonteId);
    var campos = [
      l.data || '',
      formatarData(l.data),
      l.horario || '',
      (l.tipo === 'avaliacao') ? 'Avaliação avaliacao' : 'Normal',
      l.paciente || '',
      f ? f.nome : '',
      this.formaPagamentoTexto(l.pagamento),
      formatarMoeda(l.valor),
      l.valor,
      formatarMoeda(l.suaParte),
      l.suaParte,
      (l.status === 'pago') ? 'Pago' : 'Pendente',
      this.presencaRotulo(l.presenca)
    ];

    var texto = '';
    for (var i = 0; i < campos.length; i++) {
      var valor = campos[i];
      if (valor === null || valor === undefined || valor === '') continue;
      texto += ' ' + valor;
    }
    return this.normalizar(texto).indexOf(this.normalizar(termo)) !== -1;
  },

  buscar: function(valor) {
    this.termo = String(valor || '').trim();
    lancamentosRender();
  },

  limparBusca: function() {
    this.termo = '';
    var input = document.getElementById('lancBusca');
    if (input) input.value = '';
    lancamentosRender();
  },

  marcar: function(id, coluna, marcado) {
    if (coluna !== 'status' && coluna !== 'presenca') return;
    if (marcado) this.selecionados[coluna][id] = true;
    else delete this.selecionados[coluna][id];
    this.atualizarCabecalhos();
    this.atualizarMassa();
  },

  marcarTodos: function(coluna, marcado) {
    if (coluna !== 'status' && coluna !== 'presenca') return;
    for (var i = 0; i < this.visiveis.length; i++) {
      var id = this.visiveis[i].id;
      if (marcado) this.selecionados[coluna][id] = true;
      else delete this.selecionados[coluna][id];
    }
    lancamentosRender();
  },

  limparSelecao: function() {
    this.selecionados = { status: {}, presenca: {} };
    lancamentosRender();
    app.toast('Seleção limpa.');
  },

  atualizarCabecalhos: function() {
    var nomes = ['chkTodosStatus', 'chkTodosPresenca'];
    var colunas = ['status', 'presenca'];
    var total = this.visiveis.length;

    for (var i = 0; i < colunas.length; i++) {
      var coluna = colunas[i];
      var chk = document.getElementById(nomes[i]);
      if (!chk) continue;

      var marcados = 0;
      for (var j = 0; j < total; j++) {
        if (this.selecionados[coluna][this.visiveis[j].id]) marcados++;
      }

      chk.checked = total > 0 && marcados === total;
      chk.indeterminate = marcados > 0 && marcados < total;
      chk.title = total > 0
        ? marcados + ' de ' + total + ' selecionados'
        : 'Marcar todos os visíveis';
    }
  },

  atualizarMassa: function() {
    var qtdStatus = Object.keys(this.selecionados.status).length;
    var qtdPresenca = Object.keys(this.selecionados.presenca).length;

    var resumo = document.getElementById('lancMassaResumo');
    if (resumo) {
      if (qtdStatus === 0 && qtdPresenca === 0) {
        resumo.textContent = 'Marque as caixinhas para alterar vários atendimentos de uma vez.';
      } else {
        var partes = [];
        if (qtdStatus > 0) partes.push(qtdStatus + ' status');
        if (qtdPresenca > 0) partes.push(qtdPresenca + (qtdPresenca === 1 ? ' presença' : ' presenças'));
        resumo.textContent = 'Selecionados: ' + partes.join(' e ');
      }
    }

    var btnStatus = document.getElementById('btnAplicarStatus');
    if (btnStatus) btnStatus.disabled = qtdStatus === 0;
    var btnPresenca = document.getElementById('btnAplicarPresenca');
    if (btnPresenca) btnPresenca.disabled = qtdPresenca === 0;
    var btnLimpar = document.getElementById('btnLimparSelecao');
    if (btnLimpar) btnLimpar.disabled = (qtdStatus + qtdPresenca) === 0;
  },

  aplicarEmMassa: function(coluna) {
    if (coluna !== 'status' && coluna !== 'presenca') return;

    var select = document.getElementById(coluna === 'status' ? 'massaStatus' : 'massaPresenca');
    var novoValor = select ? select.value : '';
    if (!novoValor) {
      app.toast(coluna === 'status' ? 'Escolha o novo status.' : 'Escolha a nova presença.');
      return;
    }

    var ids = Object.keys(this.selecionados[coluna]);
    if (ids.length === 0) {
      app.toast('Marque pelo menos um atendimento.');
      return;
    }

    var alterados = 0;
    for (var i = 0; i < lancamentos.length; i++) {
      if (ids.indexOf(String(lancamentos[i].id)) === -1) continue;
      lancamentos[i][coluna] = novoValor;
      alterados++;
    }

    if (alterados === 0) return;

    Store.salvar();
    lancamentosRender();
    if (typeof hojeModulo !== 'undefined') hojeModulo.render();
    if (typeof agendaModulo !== 'undefined') agendaModulo.render();

    var rotulo = (coluna === 'status')
      ? ((novoValor === 'pago') ? 'Pago' : 'Pendente')
      : this.presencaRotulo(novoValor);
    app.toast(alterados + (alterados === 1 ? ' atendimento alterado para ' : ' atendimentos alterados para ') + rotulo + '.');
  },

  abrirModal: function(opcoes) {
    opcoes = opcoes || {};
    var form = document.getElementById('formLancamento');
    if (form) form.reset();

    lancamentosEditId = null;

    // data automática (ou a informada pela agenda)
    var dataInput = document.getElementById('lancData');
    if (dataInput) dataInput.value = opcoes.data || hojeStr;

    // gerar horários pré-cadastrados (7h às 20h, de 30 em 30 min)
    var container = document.getElementById('timePresets');
    if (container) {
      var html = '';
      for (var h = 7; h <= 20; h++) {
        for (var k = 0; k < 2; k++) {
          var m = (k === 0) ? 0 : 30;
          if (h === 20 && m === 30) continue;
          var hh = (h < 10) ? '0' + h : h;
          var mm = (m < 10) ? '0' + m : m;
          var label = hh + ':' + mm;
          html += '<button type="button" class="time-btn" onclick="lancamentosModulo.selecionarHorario(\'' + label + '\')">' + label + '</button>';
        }
      }
      container.innerHTML = html;
    }

    // horário pré-selecionado (vindo da agenda)
    if (opcoes.horario) this.selecionarHorario(opcoes.horario);

    // presença: padrão "agendado"; repetição: visível só na criação
    var presencaInput = document.getElementById('lancPresenca');
    if (presencaInput) presencaInput.value = 'agendado';
    var campoRepetir = document.getElementById('campoRepetir');
    if (campoRepetir) campoRepetir.style.display = 'block';
    var repetirInput = document.getElementById('lancRepetir');
    if (repetirInput) repetirInput.value = '0';

    // título do modal para "novo"
    var tituloNovo = document.querySelector('#modalLancamento .modal-title');
    if (tituloNovo) tituloNovo.textContent = 'Novo atendimento';
    var btnSalvar = document.querySelector('#modalLancamento .modal-footer .btn-primary');
    if (btnSalvar) btnSalvar.textContent = 'Lançar atendimento';

    // limpar autocomplete
    var inputPac = document.getElementById('lancPaciente');
    if (inputPac) inputPac.value = '';
    var listaPac = document.getElementById('autocompletePaciente');
    if (listaPac) listaPac.style.display = 'none';
    var msgPac = document.getElementById('autocompleteMsg');
    if (msgPac) { msgPac.style.display = 'none'; msgPac.textContent = ''; }

    // preencher select de fontes
    preencherFontesSelects();

    // atualiza a prévia com os valores iniciais
    this.atualizarSuaParte();

    app.abrirModal('modalLancamento');
  },

  // recalcula o valor a receber (usado por digitacao, troca de convenio e autocomplete)
  atualizarSuaParte: function() {
    var valorInput = document.getElementById('lancValor');
    var fonteSelect = document.getElementById('lancFonte');
    var campoSuaParte = document.getElementById('campoSuaParte');
    var preview = document.getElementById('suaPartePreview');
    if (!valorInput || !fonteSelect || !campoSuaParte || !preview) return;

    var f = obterFontePorId(parseInt(fonteSelect.value));
    var valor = parseMoeda(valorInput.value);
    var resultado = calcularValores(f, valor);

    // sem percentual informado, nada é calculado/exibido
    if (!resultado || valor <= 0) {
      campoSuaParte.style.display = 'none';
      return;
    }

    preview.textContent = formatarMoeda(resultado.ganho);
    campoSuaParte.style.display = 'block';
  },

  fecharModal: function() {
    app.fecharModal('modalLancamento');
  },

  // volta a data do formulário para hoje
  usarHoje: function() {
    var d = document.getElementById('lancData');
    if (d) d.value = hojeStr;
  },

  selecionarHorario: function(valor) {
    var inp = document.getElementById('lancHora');
    if (inp) inp.value = valor;
    var btns = document.querySelectorAll('.time-btn');
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].textContent === valor) {
        btns[i].classList.add('active');
      } else {
        btns[i].classList.remove('active');
      }
    }
  },

  editar: function(id) {
    var l = null;
    for (var i = 0; i < lancamentos.length; i++) {
      if (lancamentos[i].id === id) { l = lancamentos[i]; break; }
    }
    if (!l) return;

    lancamentosEditId = id;

    // abrir modal
    var form = document.getElementById('formLancamento');
    if (form) form.reset();

    // preencher campos
    var dataInput = document.getElementById('lancData');
    if (dataInput) dataInput.value = l.data;

    var horaInput = document.getElementById('lancHora');
    if (horaInput) horaInput.value = l.horario;

    // gerar horários e marcar o atual
    var container = document.getElementById('timePresets');
    if (container) {
      var html = '';
      for (var h = 7; h <= 20; h++) {
        for (var k = 0; k < 2; k++) {
          var m = (k === 0) ? 0 : 30;
          if (h === 20 && m === 30) continue;
          var hh = (h < 10) ? '0' + h : h;
          var mm = (m < 10) ? '0' + m : m;
          var label = hh + ':' + mm;
          var active = (label === l.horario) ? ' active' : '';
          html += '<button type="button" class="time-btn' + active + '" onclick="lancamentosModulo.selecionarHorario(\'' + label + '\')">' + label + '</button>';
        }
      }
      container.innerHTML = html;
    }

    var pacInput = document.getElementById('lancPaciente');
    if (pacInput) pacInput.value = l.paciente;
    var listaPacEdit = document.getElementById('autocompletePaciente');
    if (listaPacEdit) listaPacEdit.style.display = 'none';
    var msgPacEdit = document.getElementById('autocompleteMsg');
    if (msgPacEdit) { msgPacEdit.style.display = 'none'; msgPacEdit.textContent = ''; }

    var tipoInput = document.getElementById('lancTipo');
    if (tipoInput) tipoInput.value = l.tipo;

    preencherFontesSelects();
    var fonteInput = document.getElementById('lancFonte');
    if (fonteInput) fonteInput.value = l.fonteId;

    var valorInput = document.getElementById('lancValor');
    if (valorInput) valorInput.value = formatarMoeda(l.valor).replace('R$ ', '');

    var pagInput = document.getElementById('lancPagamento');
    if (pagInput) pagInput.value = l.pagamento;

    var statusInput = document.getElementById('lancStatus');
    if (statusInput) statusInput.value = l.status;

    var obsInput = document.getElementById('lancObs');
    if (obsInput) obsInput.value = l.obs || '';

    // presença: carrega o valor salvo (padrão "agendado")
    var presencaInput = document.getElementById('lancPresenca');
    if (presencaInput) presencaInput.value = l.presenca || 'agendado';

    // repetição não se aplica à edição
    var campoRepetir = document.getElementById('campoRepetir');
    if (campoRepetir) campoRepetir.style.display = 'none';

    // alterar título do modal
    var titulo = document.querySelector('#modalLancamento .modal-title');
    if (titulo) titulo.textContent = 'Editar atendimento';
    var btnSalvar = document.querySelector('#modalLancamento .modal-footer .btn-primary');
    if (btnSalvar) btnSalvar.textContent = 'Salvar alterações';

    // recalcula a prévia com os dados que estão sendo editados
    this.atualizarSuaParte();

    app.abrirModal('modalLancamento');
  },

  duplicar: function(id) {
    var l = null;
    for (var i = 0; i < lancamentos.length; i++) {
      if (lancamentos[i].id === id) { l = lancamentos[i]; break; }
    }
    if (!l) return;

    // criar cópia para o próximo dia
    var partes = l.data.split('-');
    var dataOriginal = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
    dataOriginal.setDate(dataOriginal.getDate() + 1);
    var novaData = dataOriginal.getFullYear() + '-' +
      String(dataOriginal.getMonth() + 1).padStart(2, '0') + '-' +
      String(dataOriginal.getDate()).padStart(2, '0');

    var novo = {
      id: Date.now(),
      data: novaData,
      horario: l.horario,
      paciente: l.paciente,
      tipo: l.tipo,
      fonteId: l.fonteId,
      valor: l.valor,
      pagamento: l.pagamento,
      status: 'pendente', // sempre pendente ao duplicar
      obs: l.obs,
      suaParte: l.suaParte,
      presenca: 'agendado' // cópia é uma nova sessão a confirmar
    };

    lancamentos.push(novo);
    Store.salvar();
    lancamentosRender();
    if (typeof agendaModulo !== 'undefined') agendaModulo.render();
    app.toast('Lançamento duplicado para ' + formatarData(novaData) + '.');
  },

  salvar: function() {
    var data = document.getElementById('lancData');
    var horario = document.getElementById('lancHora');
    var paciente = document.getElementById('lancPaciente');
    var tipo = document.getElementById('lancTipo');
    var fonte = document.getElementById('lancFonte');
    var valor = document.getElementById('lancValor');
    var pagamento = document.getElementById('lancPagamento');
    var status = document.getElementById('lancStatus');
    var obs = document.getElementById('lancObs');

    if (!horario || horario.value === '') {
      app.toast('Informe o horário.');
      return false;
    }
    if (!paciente || paciente.value.trim() === '') {
      app.toast('Informe o nome do paciente.');
      return false;
    }
    if (!fonte || fonte.value === '') {
      app.toast('Selecione o convênio.');
      return false;
    }
    if (!valor || valor.value.trim() === '') {
      app.toast('Informe o valor.');
      return false;
    }

    // verificar se paciente existe; se não, criar automaticamente
    var nomePac = paciente.value.trim();
    var pacienteExiste = false;
    for (var i = 0; i < pacientes.length; i++) {
      if (pacientes[i].nome.toLowerCase() === nomePac.toLowerCase()) {
        pacienteExiste = true;
        break;
      }
    }
    if (!pacienteExiste) {
      pacientes.push({
        id: Date.now(),
        nome: nomePac,
        fonteId: parseInt(fonte.value),
        valor: parseMoeda(valor.value)
      });
      Store.salvar();
      app.toast('Novo paciente "' + nomePac + '" criado. Edite os dados na aba Pacientes.');
    }

    // calcular o valor recebido conforme o percentual do convênio
    var fId = parseInt(fonte.value);
    var f = obterFontePorId(fId);
    var valorNum = parseMoeda(valor.value);
    var calculo = calcularValores(f, valorNum);
    var suaParte = calculo ? calculo.ganho : null;

    // presença informada no formulário
    var presencaSelect = document.getElementById('lancPresenca');
    var presenca = presencaSelect ? presencaSelect.value : 'agendado';

    var avisoToast = lancamentosEditId ? 'Atendimento atualizado.' : 'Atendimento lançado.';

    if (lancamentosEditId) {
      // edição
      for (var i = 0; i < lancamentos.length; i++) {
        if (lancamentos[i].id === lancamentosEditId) {
          lancamentos[i].data = data.value;
          lancamentos[i].horario = horario.value;
          lancamentos[i].paciente = paciente.value.trim();
          lancamentos[i].tipo = tipo.value;
          lancamentos[i].fonteId = fId;
          lancamentos[i].valor = valorNum;
          lancamentos[i].pagamento = pagamento.value;
          lancamentos[i].status = status.value;
          lancamentos[i].obs = obs.value;
          lancamentos[i].suaParte = suaParte;
          lancamentos[i].presenca = presenca;
          break;
        }
      }
    } else {
      lancamentos.push({
        id: Date.now(),
        data: data.value,
        horario: horario.value,
        paciente: paciente.value.trim(),
        tipo: tipo.value,
        fonteId: fId,
        valor: valorNum,
        pagamento: pagamento.value,
        status: status.value,
        obs: obs.value || '',
        suaParte: suaParte,
        presenca: presenca
      });

      // criação de série semanal (retornos fixos)
      var repetirSelect = document.getElementById('lancRepetir');
      var totalSessoes = repetirSelect ? (parseInt(repetirSelect.value, 10) || 0) : 0;
      if (totalSessoes > 1) {
        var criadas = this.criarSerieSemanal({
          data: data.value,
          horario: horario.value,
          paciente: paciente.value.trim(),
          tipo: tipo.value,
          fonteId: fId,
          valor: valorNum,
          pagamento: pagamento.value,
          status: status.value,
          obs: obs.value || '',
          suaParte: suaParte
        }, totalSessoes);
        avisoToast = 'Atendimento lançado e ' + criadas + ' sessões semanais criadas.';
      }
    }

    Store.salvar();
    lancamentosRender();
    if (typeof agendaModulo !== 'undefined') agendaModulo.render();
    if (typeof hojeModulo !== 'undefined') hojeModulo.render();
    app.fecharModal('modalLancamento');
    app.toast(avisoToast);
    lancamentosEditId = null;
    return false;
  },

  // cria as cópias semanais a partir da sessão base (retorna quantas criou)
  criarSerieSemanal: function(base, totalSessoes) {
    var partes = base.data.split('-');
    var ano = parseInt(partes[0], 10);
    var mes = parseInt(partes[1], 10) - 1;
    var dia = parseInt(partes[2], 10);

    var criadas = 0;
    for (var w = 1; w < totalSessoes; w++) {
      var d = new Date(ano, mes, dia + (w * 7));
      var novaData = d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');

      // não duplica se já existir sessão do mesmo paciente no mesmo dia/horário
      var existe = false;
      for (var i = 0; i < lancamentos.length; i++) {
        var l = lancamentos[i];
        if (l.data === novaData &&
            l.horario === base.horario &&
            l.paciente.toLowerCase() === base.paciente.toLowerCase()) {
          existe = true;
          break;
        }
      }
      if (existe) continue;

      var copia = {};
      for (var k in base) copia[k] = base[k];
      copia.id = Date.now() + w;
      copia.data = novaData;
      copia.status = 'pendente';
      copia.presenca = 'agendado';
      lancamentos.push(copia);
      criadas++;
    }
    return criadas;
  },

  excluir: function(id) {
    if (!confirm('Excluir este lançamento?')) return;

    var novo = [];
    for (var i = 0; i < lancamentos.length; i++) {
      if (lancamentos[i].id !== id) novo.push(lancamentos[i]);
    }
    lancamentos = novo;

    Store.salvar();
    lancamentosRender();
    if (typeof agendaModulo !== 'undefined') agendaModulo.render();
    if (typeof hojeModulo !== 'undefined') hojeModulo.render();
    app.toast('Lançamento excluído.');
  }

};

// formatar data para exibição (dd/mm/aaaa)
function formatarData(dataStr) {
  var s = String(dataStr || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
  var partes = s.split('-');
  return partes[2] + '/' + partes[1] + '/' + partes[0];
}

// expõe globalmente
window.lancamentosModulo = lancamentosModulo;

// ============================================================================
// Autocomplete de pacientes para lançamento
// ============================================================================

(function setupAutocompleteLancamento() {
  var inputPac = document.getElementById('lancPaciente');
  var listaPac = document.getElementById('autocompletePaciente');
  var msgPac = document.getElementById('autocompleteMsg');
  if (!inputPac || !listaPac) return;

  var indiceAtivo = -1;

  function mostrarMsg(texto, classe) {
    if (!msgPac) return;
    if (!texto) { msgPac.style.display = 'none'; return; }
    msgPac.textContent = texto;
    msgPac.className = 'autocomplete-msg ' + classe;
    msgPac.style.display = 'block';
  }

  function esconderMsg() {
    if (msgPac) { msgPac.style.display = 'none'; }
  }

  function filtrarPacientes() {
    var termo = inputPac.value.toLowerCase().trim();
    listaPac.innerHTML = '';
    indiceAtivo = -1;

    if (termo === '') {
      listaPac.style.display = 'none';
      esconderMsg();
      return;
    }

    var filtrados = [];
    for (var i = 0; i < pacientes.length; i++) {
      if (pacientes[i].nome.toLowerCase().indexOf(termo) !== -1) {
        filtrados.push(pacientes[i]);
      }
    }

    if (filtrados.length === 0) {
      listaPac.style.display = 'none';
      mostrarMsg('Nenhum paciente encontrado. Continue digitando para criar um novo.', 'nenhum');
      return;
    }

    for (var i = 0; i < filtrados.length; i++) {
      var p = filtrados[i];
      var f = null;
      for (var j = 0; j < fontes.length; j++) {
        if (fontes[j].id === p.fonteId) { f = fontes[j]; break; }
      }
      var li = document.createElement('li');
      li.className = 'autocomplete-item';
      li.textContent = p.nome + ' — ' + (f ? f.nome : 'sem convênio');
      li.onclick = (function(pac) { return function() { selecionarPacienteLancamento(pac.nome); }; })(p);
      listaPac.appendChild(li);
    }
    listaPac.style.display = 'block';

    // verificar se há match exato
    var exato = false;
    for (var i = 0; i < pacientes.length; i++) {
      if (pacientes[i].nome.toLowerCase() === termo) { exato = true; break; }
    }
    if (exato) {
      esconderMsg();
    } else {
      mostrarMsg('Paciente não encontrado na base. Continue digitando para criar um novo.', 'novo');
    }
  }

  function selecionarPacienteLancamento(nome) {
    inputPac.value = nome;
    listaPac.style.display = 'none';
    esconderMsg();

    // comparação sem diferenciar maiúsculas/minúsculas
    var alvo = null;
    for (var i = 0; i < pacientes.length; i++) {
      if (pacientes[i].nome.toLowerCase() === nome.toLowerCase()) {
        alvo = pacientes[i];
        break;
      }
    }
    if (!alvo) return;

    var sel = document.getElementById('lancFonte');
    var valInput = document.getElementById('lancValor');
    var f = obterFontePorId(alvo.fonteId);

    if (sel && f) sel.value = f.id;

    if (valInput) {
      if (f && f.tipo === 'fixo' && f.valorFixo) {
        valInput.value = formatarMoeda(f.valorFixo).replace('R$ ', '');
      } else if (alvo.valor) {
        valInput.value = formatarMoeda(alvo.valor).replace('R$ ', '');
      }
    }

    // recalcula na hora (corrige convênios de valor fixo, como Cideslestes)
    if (typeof lancamentosModulo !== 'undefined') lancamentosModulo.atualizarSuaParte();
  }

  inputPac.addEventListener('input', filtrarPacientes);
  inputPac.addEventListener('focus', filtrarPacientes);
  inputPac.addEventListener('keydown', function(e) {
    var itens = listaPac.querySelectorAll('.autocomplete-item');
    if (!itens || itens.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      indiceAtivo = Math.min(indiceAtivo + 1, itens.length - 1);
      atualizarHighlight(itens);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      indiceAtivo = Math.max(indiceAtivo - 1, 0);
      atualizarHighlight(itens);
    } else if (e.key === 'Tab' || e.key === 'Enter') {
      if (indiceAtivo >= 0) {
        e.preventDefault();
        var nomeItem = itens[indiceAtivo].textContent.split(' — ')[0];
        selecionarPacienteLancamento(nomeItem);
      }
    }
  });

  document.addEventListener('click', function(e) {
    if (!inputPac.contains(e.target) && !listaPac.contains(e.target)) {
      listaPac.style.display = 'none';
    }
  });

  function atualizarHighlight(itens) {
    for (var i = 0; i < itens.length; i++) {
      if (i === indiceAtivo) {
        itens[i].classList.add('highlight');
      } else {
        itens[i].classList.remove('highlight');
      }
    }
    if (indiceAtivo >= 0) {
      itens[indiceAtivo].scrollIntoView({ block: 'nearest' });
    }
  }

})();

// ============================================================================
// Listeners únicos do formulário de lançamento
// ============================================================================

(function setupFormularioLancamento() {
  var valor = document.getElementById('lancValor');
  var fonte = document.getElementById('lancFonte');
  var paciente = document.getElementById('lancPaciente');

  if (valor) valor.addEventListener('input', function() { lancamentosModulo.atualizarSuaParte(); });
  if (fonte) fonte.addEventListener('change', function() { lancamentosModulo.atualizarSuaParte(); });
  if (paciente) paciente.addEventListener('input', function() { app.formatarNome(this); });
})();
