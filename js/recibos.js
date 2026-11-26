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
  },

  // ---------- PDF para download (sem bibliotecas) ----------

  // Gera os bytes do PDF do comprovante (usado no download e no envio ao portal).
  pdfDoComprovante: function(id) {
    var l = this.buscar(id === undefined ? this._idAtual() : id);
    if (!l) return Promise.reject(new Error('Atendimento não encontrado.'));

    var self = this;
    var assinatura = this.assinaturaValida((dadosProfissional || {}).assinatura);
    return this._carregarImagem('assets/logo.jpeg').then(function(logo) {
      return self._carregarImagem(assinatura).then(function(imgAssinatura) {
        var canvas = self._desenharComprovante(l, logo, imgAssinatura);
        return { bytes: self._pdfDeCanvas(canvas), nome: self._nomePdf(l), lancamento: l };
      });
    });
  },

  // Gera um arquivo PDF do comprovante já com a assinatura cadastrada,
  // a marca da profissional e a identificação do sistema no rodapé.
  baixarPdf: function(id) {
    this.pdfDoComprovante(id).then(function(res) {
      var blob = new Blob([res.bytes], { type: 'application/pdf' });
      var url = URL.createObjectURL(blob);

      var a = document.createElement('a');
      a.href = url;
      a.download = res.nome;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      app.toast('PDF com assinatura baixado. Abra a conversa da paciente no WhatsApp e anexe o arquivo.');
    }).catch(function() {
      app.toast('Não foi possível gerar o PDF. Use "Comprovante simples".');
    });
  },

  // Bytes do PDF em base64 para guardar na tabela portal_recibos.
  _bytesParaBase64: function(bytes) {
    var binario = '';
    var pedacos = 8192;
    for (var i = 0; i < bytes.length; i += pedacos) {
      binario += String.fromCharCode.apply(null, bytes.subarray(i, i + pedacos));
    }
    if (typeof btoa === 'function') return btoa(binario);
    if (typeof Buffer !== 'undefined') return Buffer.from(binario, 'binary').toString('base64');
    return '';
  },

  // Guarda o comprovante gerado no portal da paciente (sem precisar anexar à mão).
  enviarAoPortal: function(id) {
    var self = this;
    if (!Backend || !Backend.configurado || !Backend.configurado() || !Backend.conectado()) {
      app.toast('Entre na sua conta para guardar o recibo no portal.');
      return;
    }
    if (typeof pacientesModulo === 'undefined' || !pacientesModulo._buscarPortalId) return;

    this.pdfDoComprovante(id).then(function(res) {
      var pac = self.buscarPaciente(res.lancamento.paciente);
      if (!pac) throw new Error('Paciente não encontrado na ficha.');
      return pacientesModulo._buscarPortalId(pac).then(function(portalId) {
        if (!portalId) throw new Error('Envie um convite ao paciente primeiro.');
        var rec = (res.lancamento.recibo && typeof res.lancamento.recibo === 'object')
          ? res.lancamento.recibo : {};
        return fetch(Backend.base() + '/rest/v1/portal_recibos', {
          method: 'POST',
          headers: Backend.headers(true),
          body: JSON.stringify({
            paciente_portal_id: portalId,
            nome: res.nome,
            numero: 'Ref. ' + String(res.lancamento.id),
            codigo: rec.codigo || '',
            conteudo_base64: self._bytesParaBase64(res.bytes)
          })
        }).then(function(r) { return Backend._resposta(r); });
      });
    }).then(function() {
      app.toast('Recibo guardado no portal da paciente.');
    }).catch(function(err) {
      app.toast(err.message || 'Não foi possível guardar o recibo no portal.');
    });
  },

  _carregarImagem: function(src) {
    if (!src) return Promise.resolve(null);
    return new Promise(function(resolve) {
      try {
        var img = new Image();
        img.onload = function() { resolve(img); };
        img.onerror = function() { resolve(null); };
        img.src = src;
      } catch (e) {
        resolve(null);
      }
    });
  },

  // Quebra o texto em linhas que caibam na largura disponível.
  _quebrarTexto: function(ctx, texto, maxLargura) {
    var palavras = String(texto || '').split(/\s+/);
    var linhas = [];
    var atual = '';
    for (var i = 0; i < palavras.length; i++) {
      var teste = atual ? atual + ' ' + palavras[i] : palavras[i];
      if (ctx.measureText(teste).width > maxLargura && atual) {
        linhas.push(atual);
        atual = palavras[i];
      } else {
        atual = teste;
      }
    }
    if (atual) linhas.push(atual);
    return linhas;
  },

  // Desenha o comprovante em uma imagem A4 (150 dpi).
  _desenharComprovante: function(l, logo, assinatura) {
    var W = 1240, H = 1754, M = 120;
    var canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext('2d');

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;

    // topo
    ctx.font = 'bold 46px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('COMPROVANTE SIMPLES', M, 165);
    ctx.font = 'bold 28px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Ref. ' + String(l.id), W - M, 163);
    ctx.beginPath(); ctx.moveTo(M, 195); ctx.lineTo(W - M, 195); ctx.stroke();

    var dp = dadosProfissional || {};
    var nome = dp.nome || 'Psicóloga';
    var crp = 'CRP ' + (dp.crp || CRP_PADRAO);
    var cpf = dp.cpf ? 'CPF: ' + dp.cpf : '';
    var tipo = l.tipo === 'avaliacao' ? 'Avaliação psicológica' : 'Atendimento psicológico';
    var referencia = tipo + ' realizado em ' + formatarData(l.data) +
      (l.horario ? ' às ' + l.horario : '');

    var linhas = [
      ['Recebi de', String(l.paciente || '')],
      ['Valor', formatarMoeda(l.valor)],
      ['Forma de pagamento', this.formaPagamento(l.pagamento)],
      ['Referente a', referencia]
    ];

    var y = 275;
    for (var i = 0; i < linhas.length; i++) {
      ctx.font = '28px Arial, Helvetica, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#555555';
      ctx.fillText(linhas[i][0], M, y);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 29px Arial, Helvetica, sans-serif';
      var quebradas = this._quebrarTexto(ctx, linhas[i][1], W - M - M - 330);
      for (var j = 0; j < quebradas.length; j++) {
        ctx.fillText(quebradas[j], M + 330, y + j * 38);
      }
      ctx.strokeStyle = '#DDDDDD';
      ctx.lineWidth = 1;
      var limiteLinha = y + (quebradas.length - 1) * 38 + 18;
      ctx.beginPath(); ctx.moveTo(M, limiteLinha); ctx.lineTo(W - M, limiteLinha); ctx.stroke();
      ctx.strokeStyle = '#000000';
      y += 40 + quebradas.length * 38;
    }

    // quitação
    y += 26;
    ctx.font = '28px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'left';
    var paragrafo = this._quebrarTexto(ctx,
      'Recebido na data abaixo, em moeda corrente deste país, pelo serviço prestado acima, dou quitação.',
      W - 2 * M);
    for (var p = 0; p < paragrafo.length; p++) {
      ctx.fillText(paragrafo[p], M, y + p * 40);
    }
    y += paragrafo.length * 40 + 40;

    // data de emissão
    ctx.textAlign = 'right';
    ctx.fillText('Emitido em ' + formatarData(hojeStr), W - M, y);
    y += 45;

    // assinatura: imagem cadastrada sobre a linha, como no comprovante impresso
    ctx.textAlign = 'center';
    if (assinatura) {
      var maxW = 460, maxH = 130;
      var escala = Math.min(1, maxW / (assinatura.width || maxW), maxH / (assinatura.height || maxH));
      var aw = (assinatura.width || maxW) * escala;
      var ah = (assinatura.height || maxH) * escala;
      ctx.drawImage(assinatura, (W - aw) / 2, y, aw, ah);
      y += ah + 18;
    }
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 280, y + 40);
    ctx.lineTo(W / 2 + 280, y + 40);
    ctx.stroke();
    y += 95;

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 32px Arial, Helvetica, sans-serif';
    ctx.fillText(nome, W / 2, y);
    y += 45;
    ctx.font = '27px Arial, Helvetica, sans-serif';
    ctx.fillText(crp, W / 2, y);
    if (cpf) {
      y += 40;
      ctx.fillText(cpf, W / 2, y);
    }

    // marca da profissional em transparência
    if (logo) {
      var lmaxW = 280, lmaxH = 240;
      var lescala = Math.min(1, lmaxW / (logo.width || lmaxW), lmaxH / (logo.height || lmaxH));
      var lw = (logo.width || lmaxW) * lescala;
      var lh = (logo.height || lmaxH) * lescala;
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.drawImage(logo, (W - lw) / 2, 1290, lw, lh);
      ctx.restore();
    }

    // rodapé
    ctx.strokeStyle = '#AAAAAA';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(M, 1540); ctx.lineTo(W - M, 1540); ctx.stroke();
    ctx.fillStyle = '#444444';
    ctx.textAlign = 'center';
    ctx.font = '23px Arial, Helvetica, sans-serif';
    ctx.fillText('Comprovante simples, sem validade oficial. O recibo válido é emitido pela Receita Federal.', W / 2, 1590);
    ctx.font = '22px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('SaaS by Myttoz', W - M, H - 70);

    return canvas;
  },

  _nomePdf: function(l) {
    var nome = String(l.paciente || '').trim().toLowerCase()
      .replace(/[^a-z0-9à-ú]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'paciente';
    return 'comprovante-' + nome + '-' + String(l.id) + '.pdf';
  },

  _asciiBytes: function(texto) {
    var s = String(texto);
    var out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xFF;
    return out;
  },

  _base64ParaBytes: function(base64) {
    var binario = '';
    try {
      if (typeof atob === 'function') binario = atob(base64);
    } catch (e) {}
    if (!binario && typeof Buffer !== 'undefined') {
      try { binario = Buffer.from(base64, 'base64').toString('binary'); } catch (e) {}
    }
    var out = new Uint8Array(binario.length);
    for (var i = 0; i < binario.length; i++) out[i] = binario.charCodeAt(i) & 0xFF;
    return out;
  },

  // Monta um PDF de uma página com a imagem do comprovante (JPEG embutido).
  _pdfDeCanvas: function(canvas) {
    var self = this;
    var dataUrl = String(canvas.toDataURL('image/jpeg', 0.92));
    var jpeg = this._base64ParaBytes(dataUrl.split(',')[1] || '');
    var W = canvas.width || 1240;
    var H = canvas.height || 1754;
    var largura = 595.28, altura = 841.89;

    var pedacos = [];
    var tamanho = 0;
    var offsets = [0];

    function escrever(texto) {
      var bytes = self._asciiBytes(texto);
      pedacos.push(bytes);
      tamanho += bytes.length;
    }
    function objeto(num, conteudo) {
      offsets[num] = tamanho;
      escrever(num + ' 0 obj\n' + conteudo + '\nendobj\n');
    }

    escrever('%PDF-1.4\n');
    pedacos.push(new Uint8Array([0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A]));
    tamanho += 6;

    objeto(1, '<< /Type /Catalog /Pages 2 0 R >>');
    objeto(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    objeto(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + largura + ' ' + altura +
      '] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');

    offsets[4] = tamanho;
    escrever('4 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + W + ' /Height ' + H +
      ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpeg.length +
      ' >>\nstream\n');
    pedacos.push(jpeg);
    tamanho += jpeg.length;
    escrever('\nendstream\nendobj\n');

    var conteudo = 'q\n' + largura + ' 0 0 ' + altura + ' 0 0 cm\n/Im0 Do\nQ\n';
    offsets[5] = tamanho;
    escrever('5 0 obj\n<< /Length ' + conteudo.length + ' >>\nstream\n' + conteudo +
      'endstream\nendobj\n');

    var inicioXref = tamanho;
    escrever('xref\n0 6\n0000000000 65535 f \n');
    for (var i = 1; i <= 5; i++) {
      escrever(String(offsets[i]).padStart(10, '0') + ' 00000 n \n');
    }
    escrever('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + inicioXref + '\n%%EOF\n');

    var resultado = new Uint8Array(tamanho);
    var pos = 0;
    for (var j = 0; j < pedacos.length; j++) {
      resultado.set(pedacos[j], pos);
      pos += pedacos[j].length;
    }
    return resultado;
  }

};

window.recibosModulo = recibosModulo;
