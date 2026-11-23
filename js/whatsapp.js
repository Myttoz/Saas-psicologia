// ============================================================================
// WhatsApp — confirmação de atendimento com mensagem pronta (sem API/custo)
// Abre o WhatsApp com o texto já digitado; a profissional escolhe o contato.
// ============================================================================

var whatsappModulo = {

  buscar: function(id) {
    for (var i = 0; i < lancamentos.length; i++) {
      if (lancamentos[i].id === id) return lancamentos[i];
    }
    return null;
  },

  mensagem: function(l) {
    var partes = String(l.paciente || '').trim().split(/\s+/);
    var primeiroNome = partes[0] || '';
    var tipo = (l.tipo === 'avaliacao') ? 'avaliação' : 'sessão de psicologia';
    var Quando = formatarData(l.data) + ' às ' + l.horario;

    return 'Olá, ' + primeiroNome + '! ' +
      'Lembrete da sua ' + tipo + ' em ' + Quando + '. ' +
      'Você confirma sua presença? ' +
      'Se precisar remarcar, avise com antecedência. Obrigada!';
  },

  enviarConfirmacao: function(id) {
    var l = this.buscar(id);
    if (!l) return;

    var texto = this.mensagem(l);
    var url = 'https://wa.me/?text=' + encodeURIComponent(texto);

    var janela = null;
    try { janela = window.open(url, '_blank'); } catch (e) { janela = null; }

    if (janela) {
      app.toast('Mensagem pronta no WhatsApp. Escolha o contato e envie.');
    } else {
      this.copiarTexto(texto);
      app.toast('WhatsApp não abriu. Mensagem copiada para colar.');
    }
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
