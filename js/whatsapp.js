// ============================================================================
// WhatsApp — mensagens prontas para o paciente (sem API/custo)
// Modelos: confirmação, lembrete, agradecimento e mensagem livre.
// Abre o WhatsApp com o texto já pronto; a profissional escolhe o contato.
// ============================================================================

var whatsappModulo = {

  // Modelos disponíveis no modal (o primeiro é o padrão).
  modelos: [
    { id: 'confirmacao', nome: 'Confirmação de presença' },
    { id: 'lembrete', nome: 'Lembrete de sessão' },
    { id: 'agradecimento', nome: 'Agradecimento pós-sessão' },
    { id: 'livre', nome: 'Mensagem livre' }
  ],

  buscar: function(id) {
    for (var i = 0; i < lancamentos.length; i++) {
      if (lancamentos[i].id === id) return lancamentos[i];
    }
    return null;
  },

  buscarPaciente: function(id) {
    for (var i = 0; i < pacientes.length; i++) {
      if (pacientes[i].id === id) return pacientes[i];
    }
    return null;
  },

  primeiroNome: function(nome) {
    var partes = String(nome || '').trim().split(/\s+/);
    return partes[0] || '';
  },

  quando: function(l) {
    return formatarData(l.data) + ' às ' + l.horario;
  },

  tipoSessao: function(l) {
    return (l.tipo === 'avaliacao') ? 'avaliação' : 'sessão de psicologia';
  },

  // Mensagem clássica de confirmação (mantida igual por compatibilidade).
  mensagem: function(l) {
    var primeiroNome = this.primeiroNome(l.paciente);
    var tipo = this.tipoSessao(l);
    var Quando = this.quando(l);

    return 'Olá, ' + primeiroNome + '! ' +
      'Lembrete da sua ' + tipo + ' em ' + Quando + '. ' +
      'Você confirma sua presença? ' +
      'Se precisar remarcar, avise com antecedência. Obrigada!';
  },

  // Monta o texto de um modelo. alvo pode ter { l: atendimento } ou { p: paciente }.
  montar: function(modelo, alvo) {
    alvo = alvo || {};
    var l = alvo.l || null;
    var p = alvo.p || null;
    var nome = this.primeiroNome(l ? l.paciente : (p ? p.nome : ''));
    var ola = nome ? 'Olá, ' + nome + '!' : 'Olá!';
    var oi = nome ? 'Oi, ' + nome + '!' : 'Oi!';

    if (modelo === 'confirmacao') {
      if (l) return this.mensagem(l);
      return ola + ' Você confirma a sua presença na nossa sessão? ' +
        'Se precisar remarcar, avise com antecedência. Obrigada!';
    }

    if (modelo === 'lembrete') {
      if (l) {
        return ola + ' Lembrete da sua ' + this.tipoSessao(l) +
          ' em ' + this.quando(l) + '. Até lá! ' +
          'Se precisar remarcar, avise com antecedência.';
      }
      return ola + ' Passando para lembrar da nossa sessão. ' +
        'Qualquer alteração, me avise com antecedência. Obrigada!';
    }

    if (modelo === 'agradecimento') {
      var deHoje = (l && l.data === hojeStr) ? ' de hoje' : '';
      return oi + ' Obrigada pela nossa sessão' + deHoje + '. ' +
        'Se precisar de qualquer coisa, é só me chamar. Cuide-se!';
    }

    return ''; // mensagem livre: a profissional escreve
  },

  // Destino escolhido no modal: atendimento (l:) ou paciente (p:).
  destino: function() {
    var sel = document.getElementById('waDestino');
    var v = sel ? String(sel.value || '') : '';
    if (v.indexOf('l:') === 0) {
      var l = this.buscar(parseInt(v.slice(2), 10));
      if (l) return { l: l };
    }
    if (v.indexOf('p:') === 0) {
      var p = this.buscarPaciente(parseInt(v.slice(2), 10));
      if (p) return { p: p };
    }
    return {};
  },

  // Preenche o seletor "Para quem": próximos atendimentos e pacientes.
  // Retorna a lista de valores, começando pelo próximo atendimento.
  escolherDestino: function() {
    var sel = document.getElementById('waDestino');
    if (!sel) return [];
    sel.innerHTML = '';

    var ordem = [];

    // atendimentos agendados de hoje em diante, mais próximos primeiro
    var agendados = [];
    for (var i = 0; i < lancamentos.length; i++) {
      var l = lancamentos[i];
      if ((l.presenca || 'agendado') !== 'agendado') continue;
      if (String(l.data) < hojeStr) continue;
      agendados.push(l);
    }
    agendados.sort(function(a, b) {
      return (String(a.data) + String(a.horario))
        .localeCompare(String(b.data) + String(b.horario));
    });

    var grupoAtend = null;
    for (var j = 0; j < agendados.length; j++) {
      var item = agendados[j];
      if (!grupoAtend) {
        grupoAtend = document.createElement('optgroup');
        grupoAtend.label = 'Próximos atendimentos';
        sel.appendChild(grupoAtend);
      }
      var valorL = 'l:' + Number(item.id);
      var opL = document.createElement('option');
      opL.value = valorL;
      opL.textContent = String(item.paciente || '') + ' — ' +
        formatarData(item.data) + ' às ' + item.horario;
      grupoAtend.appendChild(opL);
      ordem.push(valorL);
    }

    var grupoPac = null;
    for (var k = 0; k < pacientes.length; k++) {
      var p = pacientes[k];
      if (!grupoPac) {
        grupoPac = document.createElement('optgroup');
        grupoPac.label = 'Pacientes';
        sel.appendChild(grupoPac);
      }
      var valorP = 'p:' + Number(p.id);
      var opP = document.createElement('option');
      opP.value = valorP;
      opP.textContent = String(p.nome || '');
      grupoPac.appendChild(opP);
      ordem.push(valorP);
    }

    sel.value = ordem[0] || '';
    return ordem;
  },

  status: function(texto) {
    var s = document.getElementById('waStatus');
    if (s) s.textContent = texto;
  },

  // Regenera a prévia quando muda o destino ou o modelo.
  trocar: function() {
    var selModelo = document.getElementById('waModelo');
    var modelo = selModelo ? String(selModelo.value || 'confirmacao') : 'confirmacao';
    var campo = document.getElementById('waTexto');

    var alvo = this.destino();
    var quem = alvo.l
      ? (String(alvo.l.paciente || '') + ' · ' + formatarData(alvo.l.data) + ' às ' + alvo.l.horario)
      : (alvo.p ? String(alvo.p.nome || '') : 'sem destinatário');
    var nomeModelo = '';
    for (var i = 0; i < this.modelos.length; i++) {
      if (this.modelos[i].id === modelo) nomeModelo = this.modelos[i].nome;
    }

    // mensagem livre: não apaga o que a profissional já escreveu
    if (modelo === 'livre') {
      this.status('Modelo: Mensagem livre · ' + quem);
      return;
    }

    var texto = this.montar(modelo, alvo);
    if (campo) campo.value = texto;
    this.status('Modelo: ' + (nomeModelo || modelo) + ' · ' + quem);
  },

  // Abre o modal já com um atendimento escolhido (opcional).
  // Sem escolha, começa no próximo atendimento.
  abrir: function(idLanc) {
    var selModelo = document.getElementById('waModelo');
    if (selModelo) selModelo.value = 'confirmacao';
    this.escolherDestino();
    var sel = document.getElementById('waDestino');
    if (idLanc && sel) sel.value = 'l:' + Number(idLanc);
    this.trocar();
    if (typeof app !== 'undefined' && app.abrirModal) app.abrirModal('modalWhatsApp');
  },

  // Abre o modal para um paciente da ficha (escolhe o próximo atendimento dele).
  abrirParaPaciente: function(idPaciente) {
    var p = this.buscarPaciente(idPaciente);
    if (!p) return;
    var escolhido = null;
    for (var i = 0; i < lancamentos.length; i++) {
      var l = lancamentos[i];
      if (String(l.paciente) !== String(p.nome)) continue;
      if ((l.presenca || 'agendado') !== 'agendado') continue;
      if (String(l.data) < hojeStr) continue;
      if (!escolhido ||
          (String(l.data) + String(l.horario)) < (String(escolhido.data) + String(escolhido.horario))) {
        escolhido = l;
      }
    }
    this.abrir(escolhido ? escolhido.id : null);
    var sel = document.getElementById('waDestino');
    if (sel) sel.value = escolhido ? ('l:' + Number(escolhido.id)) : ('p:' + Number(p.id));
    this.trocar();
  },

  textoModal: function() {
    var campo = document.getElementById('waTexto');
    return campo ? String(campo.value || '') : '';
  },

  copiarModal: function() {
    var texto = this.textoModal();
    if (!texto) {
      app.toast('Escreva uma mensagem primeiro.');
      return;
    }
    this.copiarTexto(texto);
    app.toast('Mensagem copiada.');
  },

  enviarModal: function() {
    var texto = this.textoModal();
    if (!texto) {
      app.toast('Escreva uma mensagem primeiro.');
      return;
    }
    this.enviarTexto(texto);
  },

  // Abre o WhatsApp com o texto pronto; se bloquear, copia para colar.
  enviarTexto: function(texto) {
    var url = 'https://wa.me/?text=' + encodeURIComponent(texto);

    var janela = null;
    try { janela = window.open(url, '_blank', 'noopener,noreferrer'); } catch (e) { janela = null; }

    if (janela) {
      app.toast('Mensagem pronta no WhatsApp. Escolha o contato e envie.');
    } else {
      this.copiarTexto(texto);
      app.toast('WhatsApp não abriu. Mensagem copiada para colar.');
    }
  },

  enviarConfirmacao: function(id) {
    var l = this.buscar(id);
    if (!l) return;
    this.enviarTexto(this.mensagem(l));
  },

  copiar: function(id) {
    var l = this.buscar(id);
    if (!l) return;
    this.copiarTexto(this.mensagem(l));
    app.toast('Mensagem copiada.');
  },

  copiarTexto: function(texto) {
    try {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto);
        return;
      }
    } catch (e) {}

    // fallback para navegadores sem a API de área de transferência
    try {
      var campo = document.createElement('textarea');
      campo.value = texto;
      campo.style.position = 'fixed';
      campo.style.opacity = '0';
      document.body.appendChild(campo);
      campo.select();
      document.execCommand('copy');
      document.body.removeChild(campo);
    } catch (e) {}
  }

};

window.whatsappModulo = whatsappModulo;
