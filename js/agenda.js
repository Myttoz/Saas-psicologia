// ============================================================================
// Agenda — grade semanal de atendimentos
// Segunda a domingo, horários de 7:00 às 20:00 (de 30 em 30 minutos).
// Clique em um horário vazio para criar; clique em um atendimento para editar.
// ============================================================================

var agendaModulo = {

  inicioSemana: null, // Date (segunda-feira) da semana exibida
  termo: '',          // busca por nome do paciente
  filtroData: '',     // data escolhida no filtro (AAAA-MM-DD)

  // ---------- Busca ----------

  buscarNome: function(valor) {
    this.termo = normalizarTexto(valor).trim();
    this.render();
  },

  buscarData: function(valor) {
    this.filtroData = valor || '';
    if (this.filtroData) {
      var partes = this.filtroData.split('-');
      var data = new Date(parseInt(partes[0], 10), parseInt(partes[1], 10) - 1, parseInt(partes[2], 10));
      if (!isNaN(data.getTime())) this.inicioSemana = this.segundaDaSemana(data);
    }
    this.render();
  },

  limparFiltroData: function() {
    this.filtroData = '';
    var input = document.getElementById('agendaBuscaData');
    if (input) input.value = '';
  },

  limparBusca: function() {
    this.termo = '';
    this.limparFiltroData();
    var input = document.getElementById('agendaBusca');
    if (input) input.value = '';
    this.render();
  },

  // ---------- Datas ----------

  segundaDaSemana: function(data) {
    var d = new Date(data.getFullYear(), data.getMonth(), data.getDate());
    var dia = d.getDay(); // 0=domingo .. 6=sábado
    var diff = (dia === 0) ? -6 : 1 - dia;
    d.setDate(d.getDate() + diff);
    return d;
  },

  iso: function(data) {
    return data.getFullYear() + '-' +
      String(data.getMonth() + 1).padStart(2, '0') + '-' +
      String(data.getDate()).padStart(2, '0');
  },

  mudarSemana: function(delta) {
    if (!this.inicioSemana) this.inicioSemana = this.segundaDaSemana(new Date());
    this.inicioSemana.setDate(this.inicioSemana.getDate() + delta * 7);
    this.limparFiltroData();
    this.render();
  },

  irParaHoje: function() {
    this.inicioSemana = this.segundaDaSemana(new Date());
    this.limparFiltroData();
    this.render();
  },

  novoNaSemana: function() {
    var data = this.filtroData || hojeStr;

    // se a semana exibida não contém hoje, usa a segunda-feira dela
    if (this.inicioSemana && !this.filtroData) {
      var fim = new Date(
        this.inicioSemana.getFullYear(),
        this.inicioSemana.getMonth(),
        this.inicioSemana.getDate() + 6
      );
      var hojeISO = this.iso(new Date());
      if (hojeISO < this.iso(this.inicioSemana) || hojeISO > this.iso(fim)) {
        data = this.iso(this.inicioSemana);
      }
    }

    lancamentosModulo.abrirModal({ data: data });
  },

  // Converte "08:40" no slot de 30 min mais próximo (07:00..20:00)
  slotDoHorario: function(horario) {
    var partes = String(horario || '').split(':');
    var h = parseInt(partes[0], 10);
    var m = parseInt(partes[1], 10);
    if (isNaN(h)) h = 7;
    if (isNaN(m)) m = 0;
    if (h < 7) { h = 7; m = 0; }
    // horários acima do expediente aparecem no último slot da grade (20:00)
    if (h > 20) { h = 20; m = 0; }
    if (h === 20) m = 0;
    if (m >= 30) m = 30; else m = 0;
    return (h < 10 ? '0' + h : h) + ':' + (m === 0 ? '00' : '30');
  },

  // ---------- Renderização ----------

  render: function() {
    var grid = document.getElementById('agendaGrid');
    if (!grid) return;

    if (!this.inicioSemana) this.inicioSemana = this.segundaDaSemana(new Date());

    // 7 dias da semana
    var dias = [];
    for (var i = 0; i < 7; i++) {
      dias.push(new Date(
        this.inicioSemana.getFullYear(),
        this.inicioSemana.getMonth(),
        this.inicioSemana.getDate() + i
      ));
    }

    this.renderizarTitulo(dias);

    // quando há data filtrada, mostra só aquele dia da semana
    var diasExibidos = [];
    for (var i = 0; i < dias.length; i++) {
      if (!this.filtroData || this.iso(dias[i]) === this.filtroData) diasExibidos.push(dias[i]);
    }
    if (diasExibidos.length === 0) diasExibidos = dias;
    if (this.filtroData) grid.classList.add('filtrada');
    else grid.classList.remove('filtrada');

    // slots de horário (7:00 às 20:00, de 30 em 30)
    var slots = [];
    for (var h = 7; h <= 20; h++) {
      for (var m = 0; m < 60; m += 30) {
        if (h === 20 && m === 30) continue;
        slots.push((h < 10 ? '0' + h : h) + ':' + (m === 0 ? '00' : '30'));
      }
    }

    // índice: data -> slot -> [lançamentos], já filtrado pelo nome
    var indice = {};
    var total = 0;
    for (var i = 0; i < lancamentos.length; i++) {
      var l = lancamentos[i];
      if (!l.data) continue;
      if (this.termo && normalizarTexto(l.paciente).indexOf(this.termo) === -1) continue;
      var slot = this.slotDoHorario(l.horario);
      if (!indice[l.data]) indice[l.data] = {};
      if (!indice[l.data][slot]) indice[l.data][slot] = [];
      indice[l.data][slot].push(l);
      total++;
    }

    var resumo = document.getElementById('agendaBuscaResumo');
    if (resumo) {
      if (this.termo || this.filtroData) {
        resumo.textContent = total === 0
          ? 'Nenhum agendamento encontrado'
          : total + (total === 1 ? ' agendamento encontrado' : ' agendamentos encontrados');
      } else {
        resumo.textContent = '';
      }
    }

    var nomesDias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    var hojeISO = hojeStr;
    var html = '';

    // linha de cabeçalho: canto + dias exibidos
    html += '<div class="agenda-corner"></div>';
    for (var i = 0; i < diasExibidos.length; i++) {
      var iso = this.iso(diasExibidos[i]);
      var classeHoje = (iso === hojeISO) ? ' hoje' : '';
      html += '<div class="agenda-dia-head' + classeHoje + '">' +
        '<span class="agenda-dia-nome">' + nomesDias[diasExibidos[i].getDay()] + '</span>' +
        '<span class="agenda-dia-num">' + diasExibidos[i].getDate() + '/' + (diasExibidos[i].getMonth() + 1) + '</span>' +
      '</div>';
    }

    // linhas de horário
    for (var s = 0; s < slots.length; s++) {
      var slot = slots[s];
      html += '<div class="agenda-hora">' + slot + '</div>';

      for (var i = 0; i < diasExibidos.length; i++) {
        var iso = this.iso(diasExibidos[i]);
        var classeHoje = (iso === hojeISO) ? ' hoje' : '';
        var itens = (indice[iso] && indice[iso][slot]) ? indice[iso][slot] : [];

        html += '<div class="agenda-cel' + classeHoje + '" ' +
          'onclick="agendaModulo.clicarCelula(\'' + iso + '\',\'' + slot + '\')">';

        for (var j = 0; j < itens.length; j++) {
          html += this.chip(itens[j]);
        }

        html += '</div>';
      }
    }

    grid.innerHTML = html;
  },

  renderizarTitulo: function(dias) {
    var titulo = document.getElementById('agendaSemanaTitulo');
    if (!titulo) return;

    var nomes = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
                 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

    var ini = dias[0];
    var fim = dias[6];
    var texto;

    if (ini.getMonth() === fim.getMonth() && ini.getFullYear() === fim.getFullYear()) {
      texto = ini.getDate() + ' a ' + fim.getDate() + ' de ' +
              nomes[fim.getMonth()] + ' de ' + fim.getFullYear();
    } else {
      texto = ini.getDate() + ' de ' + nomes[ini.getMonth()] +
              ' a ' + fim.getDate() + ' de ' + nomes[fim.getMonth()] +
              ' de ' + fim.getFullYear();
    }

    titulo.textContent = texto;
  },

  chip: function(l) {
    var presenca = l.presenca || 'agendado';
    var f = obterFontePorId(l.fonteId);

    return '<div class="agenda-chip h-' + presenca + '" ' +
      'title="' + l.horario + ' — ' + l.paciente + (f ? ' (' + f.nome + ')' : '') + '" ' +
      'onclick="event.stopPropagation(); lancamentosModulo.editar(' + l.id + ')">' +
      '<span class="chip-hora">' + l.horario + '</span>' +
      '<span class="chip-nome">' + l.paciente + '</span>' +
    '</div>';
  },

  // ---------- Ações ----------

  clicarCelula: function(dataISO, slot) {
    lancamentosModulo.abrirModal({ data: dataISO, horario: slot });
  }

};

window.agendaModulo = agendaModulo;
