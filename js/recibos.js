// ============================================================================
// Recibos — comprovante de pagamento para impressão/PDF (sem bibliotecas)
// A janela de impressão do navegador permite "Salvar como PDF".
// ============================================================================

var recibosModulo = {

  //Controla a imagem escolhida no modal antes de salvar
  _novaAssinatura: null,      // null = sem alteração; string = nova imagem
  _assinaturaAlterada: false,

  buscar: function(id) {
    for (var i = 0; i < lancamentos.length; i++) {
      if (lancamentos[i].id === id) return lancamentos[i];
    }
    return null;
  },

  escapeHtml: escapeHtml,

  // Aceita somente imagens PNG/JPG em base64. Um backup ou a nuvem pode trazer
  // texto com código escondido; isso nunca deve chegar ao atributo src.
  assinaturaValida: function(valor) {
    var s = String(valor || '');
    if (s.length > 400000) return '';
    return /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(s) ? s : '';
  },

  formaPagamento: function(valor) {
    return { dinheiro: 'Dinheiro', pix: 'Pix', clinica: 'Clínica', cartao: 'Cartão' }[valor] || valor || '-';
  },

  // ---------- Configuração ----------

  abrirConfig: function() {
    var nome = document.getElementById('reciboNome');
    var crp = document.getElementById('reciboCrp');
    var cpf = document.getElementById('reciboCpf');
    if (nome) nome.value = dadosProfissional.nome || '';
    if (crp) crp.value = dadosProfissional.crp || CRP_PADRAO;
    if (cpf) cpf.value = dadosProfissional.cpf || '';

    this._novaAssinatura = null;
    this._assinaturaAlterada = false;
    var input = document.getElementById('reciboAssinatura');
    if (input) input.value = '';

    this.mostrarPreview();
    app.abrirModal('modalDadosRecibo');
  },

  // Lê a imagem escolhida e guarda uma versão reduzida (cabe no navegador)
  processarAssinatura: function(input) {
    var arquivo = input && input.files && input.files[0];
    if (!arquivo) return;
    if (!/^image\//.test(arquivo.type || '')) {
      app.toast('Escolha uma imagem (PNG ou JPG).');
      return;
    }

    var self = this;
    var reader = new FileReader();
    reader.onload = function(ev) {
      var original = ev.target.result;
      self._reduzirImagem(original, function(final) {
        self._novaAssinatura = final;
        self._assinaturaAlterada = true;
        self.mostrarPreview();
        app.toast('Assinatura carregada. Clique em Salvar dados.');
      });
    };
    reader.onerror = function() {
      app.toast('Não foi possível ler a imagem.');
    };
    reader.readAsDataURL(arquivo);
  },

  // Reduz a imagem para não estourar o espaço do navegador
  _reduzirImagem: function(dataUrl, callback) {
    try {
      var img = new Image();
      img.onload = function() {
        try {
          var maxLargura = 340;
          var escala = Math.min(1, maxLargura / (img.width || maxLargura));
          var w = Math.max(1, Math.round((img.width || maxLargura) * escala));
          var h = Math.max(1, Math.round((img.height || 100) * escala));

          var canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          var resultado = canvas.toDataURL('image/png');

          // imagem muito grande: usa JPG com fundo branco
          if (resultado.length > 250000) {
            var canvas2 = document.createElement('canvas');
            canvas2.width = w;
            canvas2.height = h;
            var ctx2 = canvas2.getContext('2d');
            ctx2.fillStyle = '#fff';
            ctx2.fillRect(0, 0, w, h);
            ctx2.drawImage(img, 0, 0, w, h);
            resultado = canvas2.toDataURL('image/jpeg', 0.75);
          }
          callback(resultado);
        } catch (e) {
          callback(dataUrl);
        }
      };
      img.onerror = function() { callback(dataUrl); };
      img.src = dataUrl;
    } catch (e) {
      callback(dataUrl);
    }
  },

  mostrarPreview: function() {
    var preview = document.getElementById('reciboAssinaturaPreview');
    if (!preview) return;

    var atual = this.assinaturaValida(this._assinaturaAlterada
      ? this._novaAssinatura
      : (dadosProfissional.assinatura || ''));

    if (atual) {
      preview.innerHTML = '<img src="' + atual + '" alt="Prévia da assinatura">';
    } else {
      preview.innerHTML = '<span class="preview-vazio">Nenhuma assinatura cadastrada</span>';
    }
  },

  removerAssinatura: function() {
    this._novaAssinatura = '';
    this._assinaturaAlterada = true;
    var input = document.getElementById('reciboAssinatura');
    if (input) input.value = '';
    this.mostrarPreview();
    app.toast('Assinatura removida. Clique em Salvar dados.');
  },

  salvarConfig: function() {
    var nome = document.getElementById('reciboNome');
    var crp = document.getElementById('reciboCrp');
    var cpf = document.getElementById('reciboCpf');
    dadosProfissional.nome = nome ? nome.value.trim() : '';
    dadosProfissional.crp = crp ? crp.value.trim() : '';
    dadosProfissional.cpf = cpf ? cpf.value.trim() : '';

    if (this._assinaturaAlterada) {
      dadosProfissional.assinatura = this.assinaturaValida(this._novaAssinatura);
    }
    this._novaAssinatura = null;
    this._assinaturaAlterada = false;

    Store.salvar();
    app.fecharModal('modalDadosRecibo');
    app.toast('Dados do recibo salvos.');
  },

  // ---------- Recibo oficial (Receita Federal) ----------

  // O recibo válido é emitido no app/e-CAC da Receita. Aqui só preparamos o
  // texto para copiar e guardamos o código de verificação, sem PDF nem arquivo.
  buscarPaciente: function(nome) {
    var alvo = String(nome || '').trim().toLowerCase();
    for (var i = 0; i < pacientes.length; i++) {
      if (String(pacientes[i].nome || '').trim().toLowerCase() === alvo) return pacientes[i];
    }
    return null;
  },

  _idAtual: function() {
    var campo = document.getElementById('reciboLancamentoId');
    var n = parseInt(campo ? campo.value : 0, 10);
    return isFinite(n) && n > 0 ? n : 0;
  },

  _campo: function(id) {
    return document.getElementById(id);
  },

  _cpfDigitado: function() {
    var campo = this._campo('reciboCpfPaciente');
    return String(campo ? campo.value : '').replace(/\D/g, '').slice(0, 11);
  },

  abrir: function(id) {
    var l = this.buscar(id);
    if (!l) return;
    var pac = this.buscarPaciente(l.paciente);
    var rec = (l.recibo && typeof l.recibo === 'object') ? l.recibo : {};
    var cpf = rec.cpf || (pac && pac.cpf) || '';

    var idCampo = this._campo('reciboLancamentoId');
    if (idCampo) idCampo.value = String(l.id);
    var cpfCampo = this._campo('reciboCpfPaciente');
    if (cpfCampo) cpfCampo.value = typeof formatarCpf === 'function' ? formatarCpf(cpf) : cpf;
    var codigoCampo = this._campo('reciboCodigo');
    if (codigoCampo) codigoCampo.value = rec.codigo || '';
    var dataCampo = this._campo('reciboDataEmissao');
    if (dataCampo) dataCampo.value = /^\d{4}-\d{2}-\d{2}$/.test(rec.emitidoEm || '') ? rec.emitidoEm : hojeStr;

    var resumo = this._campo('reciboResumo');
    if (resumo) {
      resumo.innerHTML =
        '<div class="recibo-resumo-nome">' + this.escapeHtml(l.paciente) + '</div>' +
        '<div class="cell-sub">' + this.escapeHtml(formatarData(l.data)) +
        (l.horario ? ' às ' + this.escapeHtml(l.horario) : '') +
        ' · ' + this.escapeHtml(formatarMoeda(l.valor)) + '</div>';
    }

    this._atualizarStatus(l);
    this.atualizarTexto();
    app.abrirModal('modalPrepararRecibo');
  },

  textoPreparado: function(l, cpf) {
    var dp = dadosProfissional || {};
    var crp = dp.crp || CRP_PADRAO;
    var cpfProfissional = dp.cpf ? ' - CPF ' + dp.cpf : '';
    var tipo = l.tipo === 'avaliacao' ? 'avaliação psicológica' : 'atendimento psicológico';
    var linhas = [];
    linhas.push('Recebi de ' + String(l.paciente || '').trim() + '.');
    if (cpf) linhas.push('CPF do paciente: ' + formatarCpf(cpf) + '.');
    linhas.push('Valor: ' + formatarMoeda(l.valor) + '.');
    linhas.push('Referente a ' + tipo + ' realizado em ' + formatarData(l.data) +
      (l.horario ? ' às ' + l.horario : '') + '.');
    linhas.push('');
    linhas.push('Emitente: ' + (dp.nome || 'Psicóloga') + ' - CRP ' + crp + cpfProfissional + '.');
    return linhas.join('\n');
  },

  atualizarTexto: function() {
    var l = this.buscar(this._idAtual());
    var area = this._campo('reciboTexto');
    if (!l || !area) return;
    area.value = this.textoPreparado(l, this._cpfDigitado());
  },

  copiarPreparado: function() {
    var area = this._campo('reciboTexto');
    if (!area || !area.value.trim()) {
      app.toast('Não há texto para copiar.');
      return;
    }
    if (typeof whatsappModulo !== 'undefined') {
      whatsappModulo.copiarTexto(area.value);
    }
    app.toast('Texto copiado. Cole no aplicativo da Receita Federal.');
  },

  abrirReceita: function() {
    var url = 'https://cav.receita.fazenda.gov.br/';
    var janela = null;
    try { janela = window.open(url, '_blank', 'noopener,noreferrer'); } catch (e) { janela = null; }
    app.toast(janela
      ? 'No e-CAC, procure “Emissão de Recibos”. Se usar o aplicativo no celular, ignore esta janela.'
      : 'Abra o aplicativo da Receita Federal no celular.');
  },

  salvarCodigo: function() {
    var l = this.buscar(this._idAtual());
    if (!l) return false;
    var campo = this._campo('reciboCodigo');
    var codigo = String(campo ? campo.value : '').trim().slice(0, 80);
    if (!codigo) {
      app.toast('Digite o código de verificação que a Receita gerou.');
      return false;
    }
    var cpf = this._cpfDigitado();
    if (cpf && typeof cpfValido === 'function' && !cpfValido(cpf)) {
      app.toast('CPF inválido. Confira os números ou deixe o campo vazio.');
      return false;
    }
    var dataCampo = this._campo('reciboDataEmissao');
    var data = (dataCampo && /^\d{4}-\d{2}-\d{2}$/.test(dataCampo.value)) ? dataCampo.value : hojeStr;

    if (!l.recibo || typeof l.recibo !== 'object' || Array.isArray(l.recibo)) l.recibo = {};
    l.recibo.codigo = codigo;
    l.recibo.cpf = cpf;
    l.recibo.emitidoEm = data;

    if (typeof segurancaModulo !== 'undefined') {
      segurancaModulo.registrar('Recibo oficial registrado', 'Atendimento #' + l.id);
    }
    Store.salvar();
    this._atualizarStatus(l);
    if (typeof lancamentosRender === 'function') lancamentosRender();
    app.toast('Código do recibo salvo.');
    return true;
  },

  mensagemEnvio: function(l) {
    var primeiroNome = String(l.paciente || '').trim().split(/\s+/)[0] || '';
    var codigo = (l.recibo && l.recibo.codigo) ? l.recibo.codigo : '';
    return 'Olá, ' + primeiroNome + '! Segue o recibo do atendimento de ' +
      formatarData(l.data) + '. Código de verificação: ' + codigo +
      '. Você pode conferir no site da Receita Federal. Obrigada!';
  },

  marcarEnviado: function() {
    var l = this.buscar(this._idAtual());
    if (!l) return;
    var rec = (l.recibo && typeof l.recibo === 'object') ? l.recibo : {};
    var campo = this._campo('reciboCodigo');
    var codigoAtual = String(campo ? campo.value : '').trim();
    if (codigoAtual && codigoAtual !== rec.codigo) {
      if (!this.salvarCodigo()) return;
      l = this.buscar(this._idAtual());
      rec = l.recibo;
    }
    if (!rec.codigo) {
      app.toast('Salve o código de verificação antes de marcar como enviado.');
      return;
    }

    l.recibo.enviadoEm = hojeStr;
    if (typeof segurancaModulo !== 'undefined') {
      segurancaModulo.registrar('Recibo enviado ao paciente', 'Atendimento #' + l.id);
    }
    Store.salvar();
    this._atualizarStatus(l);
    if (typeof lancamentosRender === 'function') lancamentosRender();

    var texto = this.mensagemEnvio(l);
    var url = 'https://wa.me/?text=' + encodeURIComponent(texto);
    var janela = null;
    try { janela = window.open(url, '_blank', 'noopener,noreferrer'); } catch (e) { janela = null; }
    if (janela) {
      app.toast('Marcado como enviado. Anexe o PDF da Receita no WhatsApp.');
    } else {
      this.copiarTexto(texto);
      app.toast('Marcado como enviado. Mensagem copiada; anexe o PDF da Receita.');
    }
  },

  _atualizarStatus: function(l) {
    var el = this._campo('reciboStatus');
    if (!el) return;
    var rec = (l.recibo && typeof l.recibo === 'object') ? l.recibo : {};
    var partes = [];
    if (rec.codigo) {
      partes.push('Código salvo' + (rec.emitidoEm ? ' em ' + formatarData(rec.emitidoEm) : '') + '.');
    } else {
      partes.push('Código de verificação ainda não salvo.');
    }
    if (rec.enviadoEm) partes.push('Enviado ao paciente em ' + formatarData(rec.enviadoEm) + '.');
    el.textContent = partes.join(' ');
  },

  imprimirSimples: function() {
    this.gerar(this._idAtual());
  },

  // ---------- Comprovante simples (sem validade oficial) ----------

  gerar: function(id) {
    var l = this.buscar(id);
    var area = document.getElementById('areaImpressao');
    if (!l || !area) return;

    var dp = dadosProfissional;
    var nome = dp.nome || 'Psicóloga';
    var crp = 'CRP ' + (dp.crp || CRP_PADRAO);
    var cpf = dp.cpf ? 'CPF: ' + dp.cpf : '';

    // A linha para assinar aparece sempre. Se houver imagem cadastrada,
    // ela vem junto, logo acima da linha.
    var assinaturaImagem = this.assinaturaValida(dp.assinatura);
    var assinatura =
      (assinaturaImagem
        ? '<img class="recibo-assinatura-img" src="' + assinaturaImagem + '" alt="Assinatura">'
        : '') +
      '<div class="recibo-linha-assinatura"></div>';

    var referencia = (l.tipo === 'avaliacao' ? 'Avaliação psicológica' : 'Atendimento psicológico') +
      ' realizado em ' + formatarData(l.data) +
      (l.horario ? ' às ' + l.horario : '');

    area.innerHTML =
      '<div class="recibo">' +
        '<div class="recibo-topo">' +
          '<div class="recibo-titulo">COMPROVANTE SIMPLES</div>' +
          '<div class="recibo-numero">Ref. ' + this.escapeHtml(l.id) + '</div>' +
        '</div>' +
        '<div class="recibo-linha"><span>Recebi de</span><strong>' + this.escapeHtml(l.paciente) + '</strong></div>' +
        '<div class="recibo-linha"><span>Valor</span><strong>' + formatarMoeda(l.valor) + '</strong></div>' +
        '<div class="recibo-linha"><span>Forma de pagamento</span><strong>' + this.escapeHtml(this.formaPagamento(l.pagamento)) + '</strong></div>' +
        '<div class="recibo-linha"><span>Referente a</span><strong>' + this.escapeHtml(referencia) + '</strong></div>' +
        '<p class="recibo-texto">Recebido na data abaixo, em moeda corrente deste país, ' +
          'pelo serviço prestado acima, dou quitação.</p>' +
        '<div class="recibo-data">Emitido em ' + formatarData(hojeStr) + '</div>' +
        '<div class="recibo-assinatura">' +
          assinatura +
          '<strong>' + this.escapeHtml(nome) + '</strong><br>' +
          this.escapeHtml(crp) + (cpf ? '<br>' + this.escapeHtml(cpf) : '') +
          '<img class="recibo-marca" src="assets/logo.jpeg" alt="Marca da profissional">' +
        '</div>' +
        '<div class="recibo-aviso">Comprovante simples, sem validade oficial. ' +
          'O recibo válido é emitido pela Receita Federal.</div>' +
      '</div>';

    // Espera as imagens carregarem para que a assinatura e a marca
    // apareçam também no PDF gerado pela impressão.
    var imagens = area.querySelectorAll('img') || [];
    var faltam = imagens.length;
    var imprimir = function() {
      try { window.print(); } catch (e) {}
      app.toast('Na janela de impressão, escolha "Salvar como PDF".');
    };
    if (faltam === 0) {
      imprimir();
      return;
    }
    var concluido = false;
    var pronto = function() {
      if (concluido) return;
      faltam--;
      if (faltam <= 0) {
        concluido = true;
        imprimir();
      }
    };
    for (var i = 0; i < imagens.length; i++) {
      var img = imagens[i];
      if (img.complete) {
        pronto();
      } else {
        img.onload = pronto;
        img.onerror = pronto;
      }
    }
  }

};

window.recibosModulo = recibosModulo;
