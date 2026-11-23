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

  escapeHtml: function(texto) {
    return String(texto === null || texto === undefined ? '' : texto)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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

    var atual = this._assinaturaAlterada
      ? this._novaAssinatura
      : (dadosProfissional.assinatura || '');

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
      dadosProfissional.assinatura = this._novaAssinatura || '';
    }
    this._novaAssinatura = null;
    this._assinaturaAlterada = false;

    Store.salvar();
    app.fecharModal('modalDadosRecibo');
    app.toast('Dados do recibo salvos.');
  },

  // ---------- Recibo ----------

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
    var assinatura =
      (dp.assinatura
        ? '<img class="recibo-assinatura-img" src="' + dp.assinatura + '" alt="Assinatura">'
        : '') +
      '<div class="recibo-linha-assinatura"></div>';

    var referencia = (l.tipo === 'avaliacao' ? 'Avaliação psicológica' : 'Atendimento psicológico') +
      ' realizado em ' + formatarData(l.data) +
      (l.horario ? ' às ' + l.horario : '');

    area.innerHTML =
      '<div class="recibo">' +
        '<div class="recibo-topo">' +
          '<div class="recibo-titulo">RECIBO</div>' +
          '<div class="recibo-numero">Nº ' + l.id + '</div>' +
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
