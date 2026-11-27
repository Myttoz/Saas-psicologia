// ============================================================================
// Escalas de rastreio — PHQ-9, GAD-7 e DASS-21.
// Os resultados são cifrados como evoluções do prontuário (AES-GCM), por isso
// precisam do desbloqueio e entram no backup e na nuvem junto do prontuário.
// Não são instrumentos de diagnóstico: são apoio ao acompanhamento clínico.
// ============================================================================

var escalasModulo = {

  ESCALAS: {
    phq9: {
      nome: 'PHQ-9 — depressão',
      tempo: 'Nas últimas 2 semanas, com que frequência você foi incomodado(a) por:',
      opcoes: ['Nenhuma vez', 'Vários dias', 'Mais da metade dos dias', 'Quase todos os dias'],
      perguntas: [
        'Pouco interesse ou prazer em fazer as coisas',
        'Sentimento de tristeza, depressão ou sem esperança',
        'Dificuldade para dormir, manter o sono ou dormir demais',
        'Cansaço ou falta de energia',
        'Perda de apetite ou comer demais',
        'Sentir-se mal consigo mesmo(a), fracassado(a) ou decepcionado(a) consigo ou com a família',
        'Dificuldade de concentração',
        'Movimentar-se ou falar devagar, ou ficar tão agitado(a) que se move muito mais que o normal',
        'Pensamentos de que estaria melhor morto(a) ou de se machucar de alguma forma'
      ],
      faixas: [
        [4, 'Mínima'], [9, 'Leve'], [14, 'Moderada'], [19, 'Moderadamente grave'], [27, 'Grave']
      ],
      max: 27
    },
    gad7: {
      nome: 'GAD-7 — ansiedade',
      tempo: 'Nas últimas 2 semanas, com que frequência você foi incomodado(a) por:',
      opcoes: ['Nenhuma vez', 'Vários dias', 'Mais da metade dos dias', 'Quase todos os dias'],
      perguntas: [
        'Sentir-se nervoso(a), ansioso(a) ou com os nervos em franja',
        'Não conseguir parar ou controlar as preocupações',
        'Preocupar-se demais com diferentes coisas',
        'Dificuldade para relaxar',
        'Ficar tão agitado(a) que tem dificuldade de ficar sentado(a)',
        'Irritar-se ou aborrecer-se com facilidade',
        'Sentir medo, como se algo terrível pudesse acontecer'
      ],
      faixas: [[4, 'Mínima'], [9, 'Leve'], [14, 'Moderada'], [21, 'Grave']],
      max: 21
    },
    dass21: {
      nome: 'DASS-21 — depressão, ansiedade e estresse',
      tempo: 'Nas últimas semanas, com que frequência você sentiu cada afirmação?',
      opcoes: ['Nunca', 'Às vezes', 'Regularmente', 'Sempre'],
      perguntas: [
        'Não consegui sentir nada de positivo',
        'Não consegui sentir prazer',
        'Senti-me desanimado(a) e deprimido(a)',
        'Não consegui encontrar entusiasmo ou motivação',
        'Senti que não valia nada',
        'Senti que a vida não tinha sentido',
        'Não consegui sentir orgulho do que fiz',
        'Senti-me ansioso(a) e preocupado(a)',
        'Preocupe-me com a possibilidade de ter um ataque de pânico',
        'Fiquei com medo sem motivo aparente',
        'Senti-me como se estivesse prestes a surtar',
        'Tive dificuldade em respirar sem motivo',
        'Senti tremores (por exemplo, nas mãos)',
        'Receei que algo terrível acontecesse',
        'Tive dificuldade em relaxar',
        'Fiquei agitado(a) e não consegui ficar quieto(a)',
        'Fiquei facilmente irritado(a) ou aborrecido(a)',
        'Senti-me pressionado(a) por responsabilidades',
        'Fiquei incomodado(a) com coisas que geralmente não me incomodariam',
        'Não consegui lidar com o que tinha de fazer',
        'Senti que as coisas estavam fora do meu controle'
      ],
      subescalas: [
        { nome: 'Depressão', inicio: 0, fim: 7,
          faixas: [[4, 'Normal'], [6, 'Leve'], [10, 'Moderada'], [13, 'Grave'], [99, 'Extremamente grave']] },
        { nome: 'Ansiedade', inicio: 7, fim: 14,
          faixas: [[3, 'Normal'], [5, 'Leve'], [7, 'Moderada'], [10, 'Grave'], [99, 'Extremamente grave']] },
        { nome: 'Estresse', inicio: 14, fim: 21,
          faixas: [[7, 'Normal'], [9, 'Leve'], [12, 'Moderada'], [16, 'Grave'], [99, 'Extremamente grave']] }
      ],
      max: 63
    }
  },

  _atual: null,
  _respostas: [],
  _resultado: null,

  esc: function(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },

  // Escolas prontas ou modelo criado pela profissional (custom:<id>).
  definicao: function(id) {
    var s = String(id || '');
    if (s.indexOf('custom:') !== 0) return this.ESCALAS[s];
    var modelos = (typeof modelosEscalas !== 'undefined') ? modelosEscalas : [];
    for (var i = 0; i < modelos.length; i++) {
      if (String(modelos[i].id) !== s.slice(7)) continue;
      var m = modelos[i];
      var limite = m.perguntas.length * 3;
      return {
        nome: 'Modelo: ' + m.nome,
        tempo: 'Responda cada afirmação de 0 (nunca) a 3 (sempre):',
        opcoes: ['Nunca', 'Às vezes', 'Regularmente', 'Sempre'],
        perguntas: m.perguntas,
        faixas: [
          [Math.round(limite * 0.25), 'Mínima'],
          [Math.round(limite * 0.5), 'Leve'],
          [Math.round(limite * 0.75), 'Moderada'],
          [limite, 'Grave']
        ],
        max: limite
      };
    }
    return null;
  },

  // Cálculo puro: usado pela tela e pelos testes.
  pontuar: function(id, respostas) {
    var def = this.definicao(id);
    if (!def && String(id).indexOf('custom:') === 0) {
      // modelo excluído depois do salvamento: ainda conseguimos ler o registro
      var n = (respostas && respostas.length) || 1;
      var limite = n * 3;
      def = {
        nome: 'Escala salva', tempo: '',
        opcoes: ['Nunca', 'Às vezes', 'Regularmente', 'Sempre'],
        perguntas: new Array(n).fill(''),
        faixas: [
          [Math.round(limite * 0.25), 'Mínima'], [Math.round(limite * 0.5), 'Leve'],
          [Math.round(limite * 0.75), 'Moderada'], [limite, 'Grave']
        ]
      };
    }
    if (!def) return { ok: false, erro: 'Escala ou modelo não encontrado.' };
    var valores = [];
    for (var i = 0; i < def.perguntas.length; i++) {
      var v = Number(respostas && respostas[i]);
      if (v !== 0 && v !== 1 && v !== 2 && v !== 3) {
        return { ok: false, erro: 'Responda todas as questões.', faltam: i + 1 };
      }
      valores.push(v);
    }

    var total = 0;
    for (var j = 0; j < valores.length; j++) total += valores[j];

    function faixa(faixas, valor) {
      for (var k = 0; k < faixas.length; k++) {
        if (valor <= faixas[k][0]) return faixas[k][1];
      }
      return faixas[faixas.length - 1][1];
    }

    var resultado = {
      ok: true, escala: id, nome: def.nome, total: total,
      respostas: valores.slice(), porEscala: [], alerta: ''
    };

    if (def.subescalas) {
      for (var s = 0; s < def.subescalas.length; s++) {
        var sub = def.subescalas[s];
        var soma = 0;
        for (var q = sub.inicio; q < sub.fim; q++) soma += valores[q];
        var pontuacao = soma * 2; // manual da DASS-21: dobrar a soma
        resultado.porEscala.push({
          nome: sub.nome, soma: soma, pontuacao: pontuacao,
          classificacao: faixa(sub.faixas, pontuacao)
        });
      }
      resultado.classificacao = resultado.porEscala[0].classificacao;
    } else {
      resultado.classificacao = faixa(def.faixas, total);
    }

    // PHQ-9, questão 9: qualquer resposta diferente de zero pede avaliação de risco.
    if (id === 'phq9' && valores[8] > 0) {
      resultado.alerta = 'Atenção: a questão sobre pensamentos de morte ou autoagressão ' +
        'foi marcada. Avalie o risco e registre a conduta na evolução.';
    }
    if (id === 'gad7' && total >= 15) {
      resultado.alerta = 'Pontuação alta: considere avaliação mais detalhada e acompanhamento.';
    }
    return resultado;
  },

  // ---------- tela ----------

  preencherPacientes: function(idEscolhido) {
    var sel = document.getElementById('escalaPaciente');
    if (!sel) return;
    sel.innerHTML = '';
    for (var i = 0; i < pacientes.length; i++) {
      var op = document.createElement('option');
      op.value = String(pacientes[i].id);
      op.textContent = String(pacientes[i].nome || '');
      sel.appendChild(op);
    }
    if (idEscolhido !== undefined && idEscolhido !== null) {
      sel.value = String(idEscolhido);
    }
  },

  preparar: function() {
    var sel = document.getElementById('escalaTipo');
    this._atual = sel ? String(sel.value || 'phq9') : 'phq9';
    this._respostas = [];
    this._resultado = null;
    var def = this.definicao(this._atual);
    var area = document.getElementById('escalaQuestoes');
    var resultado = document.getElementById('escalaResultado');
    var salvar = document.getElementById('escalaSalvarBtn');
    if (resultado) resultado.innerHTML = '<div class="portal-muted">Preencha as respostas e clique em Calcular.</div>';
    if (salvar) salvar.style.display = 'none';
    if (!def) {
      if (area) area.innerHTML = '<div class="escala-erro">Modelo excluído. Escolha outra escala.</div>';
      return;
    }
    if (!area) return;

    var html = '<div class="escala-tempo">' + this.esc(def.tempo) + '</div>';
    for (var i = 0; i < def.perguntas.length; i++) {
      html += '<div class="escala-pergunta"><div class="escala-enunciado">' +
        (i + 1) + '. ' + this.esc(def.perguntas[i]) + '</div><div class="escala-opcoes">';
      for (var o = 0; o < def.opcoes.length; o++) {
        html += '<label class="escala-opcao"><input type="radio" name="esc' + i + '" value="' + o +
          '" onchange="escalasModulo.responder(' + i + ', ' + o + ')">' +
          '<span>' + this.esc(def.opcoes[o]) + '</span></label>';
      }
      html += '</div></div>';
    }
    area.innerHTML = html;
  },

  responder: function(indice, valor) {
    this._respostas[Number(indice)] = Number(valor);
  },

  calcular: function() {
    var res = this.pontuar(this._atual, this._respostas);
    var area = document.getElementById('escalaResultado');
    var salvar = document.getElementById('escalaSalvarBtn');
    if (!area) return res;
    if (!res.ok) {
      area.innerHTML = '<div class="escala-erro">' + this.esc(res.erro) + '</div>';
      if (salvar) salvar.style.display = 'none';
      this._resultado = null;
      return res;
    }
    this._resultado = res;
    var html = '<div class="escala-nota"><strong>' + this.esc(res.nome) + '</strong> · ' +
      'Pontuação total: <strong>' + res.total + '</strong> · ' +
      'Classificação: <strong>' + this.esc(res.classificacao) + '</strong></div>';
    for (var i = 0; i < res.porEscala.length; i++) {
      var sub = res.porEscala[i];
      html += '<div class="escala-sub">' + this.esc(sub.nome) + ': <strong>' +
        sub.pontuacao + '</strong> — ' + this.esc(sub.classificacao) + '</div>';
    }
    if (res.alerta) html += '<div class="escala-alerta">' + this.esc(res.alerta) + '</div>';
    html += '<div class="escala-aviso">Instrumento de rastreio: não substitui avaliação clínica.</div>';
    area.innerHTML = html;
    if (salvar) salvar.style.display = '';
    return res;
  },

  // Salva como evolução cifrada, aproveitando backup e nuvem existentes.
  salvar: function() {
    var self = this;
    if (!this._resultado || !this._resultado.ok) {
      app.toast('Calcule a pontuação antes de salvar.');
      return;
    }
    var selPac = document.getElementById('escalaPaciente');
    var nome = '';
    for (var i = 0; i < pacientes.length; i++) {
      if (String(pacientes[i].id) === String(selPac ? selPac.value : '')) nome = pacientes[i].nome;
    }
    if (!nome) { app.toast('Escolha a paciente.'); return; }

    segurancaModulo.exigirAcesso(function() {
      if (!segurancaModulo.estaDesbloqueado() || typeof Cripto === 'undefined') {
        app.toast('Desbloqueie o prontuário antes de salvar.');
        return;
      }
      var res = self._resultado;
      var registro = {
        tipo: 'escala',
        paciente: nome,
        data: hojeStr,
        escala: res.escala,
        nomeEscala: res.nome,
        respostas: res.respostas,
        total: res.total,
        classificacao: res.classificacao,
        porEscala: res.porEscala,
        criadoEm: new Date().toISOString()
      };
      Cripto.cifrar(segurancaModulo.chaveAes, registro).then(function(cifrado) {
        var novo = { id: Date.now() };
        for (var campo in cifrado) {
          if (Object.prototype.hasOwnProperty.call(cifrado, campo)) novo[campo] = cifrado[campo];
        }
        evolucoes.push(novo);
        if (typeof prontuarioModulo !== 'undefined') {
          prontuarioModulo._cache[prontuarioModulo.chaveCache(novo.id)] = registro;
        }
        if (typeof Store !== 'undefined') Store.salvar();
        if (typeof segurancaModulo.registrar === 'function') {
          segurancaModulo.registrar('Escala aplicada', segurancaModulo.mascararNome(nome));
        }
        self._resultado = null;
        self.preencher();
        app.toast('Escala salva. Veja em "Histórico da paciente" nesta página.');
      }).catch(function() {
        app.toast('Não foi possível cifrar a escala. Tente novamente.');
      });
    });
  },

  // ---------- modelos próprios ----------

  alternarQuestoes: function() {
    var area = document.getElementById('escalaQuestoes');
    var btn = document.getElementById('escalaToggleBtn');
    if (!area || !btn) return;
    var oculto = area.classList.toggle('oculto');
    btn.textContent = oculto ? 'Mostrar questões' : 'Ocultar questões';
  },

  salvarModelo: function() {
    var nomeEl = document.getElementById('modeloNome');
    var pergEl = document.getElementById('modeloPerguntas');
    var nome = nomeEl ? String(nomeEl.value || '').trim() : '';
    var perguntas = [];
    if (pergEl) {
      var linhas = String(pergEl.value || '').split(/\r?\n/);
      for (var i = 0; i < linhas.length; i++) {
        var linha = String(linhas[i] || '').trim();
        if (linha) perguntas.push(linha.slice(0, 300));
      }
    }
    if (!nome || !perguntas.length) {
      app.toast('Dê um nome e escreva pelo menos uma pergunta.');
      return;
    }
    if (typeof modelosEscalas === 'undefined') modelosEscalas = [];
    modelosEscalas.push({ id: Date.now(), nome: nome.slice(0, 120), perguntas: perguntas.slice(0, 100) });
    if (nomeEl) nomeEl.value = '';
    if (pergEl) pergEl.value = '';
    if (typeof Store !== 'undefined') Store.salvar();
    this.listarModelos();
    app.toast('Modelo salvo. Clique em Usar para aplicar.');
  },

  listarModelos: function() {
    var area = document.getElementById('modeloLista');
    if (!area) return;
    var modelos = (typeof modelosEscalas !== 'undefined') ? modelosEscalas : [];
    if (!modelos.length) {
      area.innerHTML = '<div class="portal-muted">Nenhum modelo ainda.</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < modelos.length; i++) {
      var m = modelos[i];
      html += '<div class="escala-modelo"><div><strong>' + this.esc(m.nome) + '</strong>' +
        '<div class="cell-sub">' + m.perguntas.length + ' pergunta(s)</div></div>' +
        '<button class="btn btn-outline btn-sm" onclick="escalasModulo.usarModelo(\'' +
          Number(m.id) + '\')">Usar</button>' +
        '<button class="btn btn-outline btn-sm" onclick="escalasModulo.excluirModelo(' +
          Number(m.id) + ')">Excluir</button></div>';
    }
    area.innerHTML = html;
  },

  usarModelo: function(id) {
    var self = this;
    var def = this.definicao('custom:' + id);
    if (!def) { app.toast('Modelo não encontrado.'); return; }
    var sel = document.getElementById('escalaTipo');
    if (sel) {
      var existe = false;
      for (var i = 0; i < sel.children.length; i++) {
        if (String(sel.children[i].value) === 'custom:' + id) existe = true;
      }
      if (!existe) {
        var op = document.createElement('option');
        op.value = 'custom:' + id;
        op.textContent = def.nome;
        sel.appendChild(op);
      }
      sel.value = 'custom:' + id;
    }
    self.preparar();
    app.toast('Modelo carregado. Responda e calcule.');
  },

  excluirModelo: function(id) {
    if (typeof confirm === 'function' && !confirm('Excluir este modelo de perguntas?')) return;
    modelosEscalas = modelosEscalas.filter(function(m) { return Number(m.id) !== Number(id); });
    if (typeof Store !== 'undefined') Store.salvar();
    this.listarModelos();
    app.toast('Modelo excluído.');
  },

  // ---------- histórico ----------

  preencher: function(idEscolhido) {
    this.preencherPacientes(idEscolhido);
    this.mostrarHistorico();
    this.listarModelos();
  },

  // Atualiza só a lista de escalas: NÃO recria o seletor de paciente,
  // senão ele voltaria para o primeiro da lista a cada troca.
  mostrarHistorico: function() {
    var self = this;
    var area = document.getElementById('escalaHistorico');
    if (!area) return;
    if (typeof segurancaModulo === 'undefined' || !segurancaModulo.estaDesbloqueado()) {
      area.innerHTML = '<div class="portal-muted">Desbloqueie o prontuário para ver o histórico de escalas.</div>';
      return;
    }
    if (typeof prontuarioModulo === 'undefined') return;
    prontuarioModulo.garantirCache().then(function() {
      var sel = document.getElementById('escalaPaciente');
      var escolhido = String(sel ? sel.value : '');
      var itens = [];
      for (var i = 0; i < evolucoes.length; i++) {
        var obj = prontuarioModulo.plain(evolucoes[i]);
        if (!obj || obj.tipo !== 'escala') continue;
        for (var p = 0; p < pacientes.length; p++) {
          if (pacientes[p].id != escolhido) continue;
          if (String(pacientes[p].nome).trim().toLowerCase() !== String(obj.paciente || '').trim().toLowerCase()) continue;
          itens.push({ id: evolucoes[i].id, obj: obj });
        }
      }
      if (!itens.length) {
        area.innerHTML = '<div class="portal-muted">Nenhuma escala salva para esta paciente.</div>';
        return;
      }
      var html = '';
      for (var j = 0; j < itens.length; j++) {
        var ev = itens[j];
        html += '<div class="escala-item"><div><strong>' + self.esc(ev.obj.nomeEscala || ev.obj.escala) +
          '</strong><div class="cell-sub">' + self.esc(ev.obj.data || '') +
          ' · ' + self.esc(ev.obj.classificacao || '') +
          ' · total ' + self.esc(ev.obj.total) + '</div></div>' +
          '<button class="btn btn-outline btn-sm" onclick="escalasModulo.ver(' + Number(ev.id) +
          ')">Ver</button></div>';
      }
      area.innerHTML = html;
    });
  },

  ver: function(id) {
    if (typeof prontuarioModulo === 'undefined') return;
    var registro = null;
    var bruto = null;
    for (var i = 0; i < evolucoes.length; i++) {
      if (evolucoes[i].id === id) { bruto = evolucoes[i]; break; }
    }
    if (bruto) registro = prontuarioModulo.plain(bruto);
    if (!registro || registro.tipo !== 'escala') { app.toast('Escala não encontrada.'); return; }

    var self = this;
    this._atual = registro.escala;
    this._respostas = registro.respostas || [];
    this._resultado = this.pontuar(this._atual, this._respostas);
    var def = this.definicao(this._atual);
    if (!def) {
      var respostas = this._respostas || [];
      def = {
        nome: registro.nomeEscala || 'Escala salva',
        tempo: '',
        opcoes: ['Nunca', 'Às vezes', 'Regularmente', 'Sempre'],
        perguntas: respostas.map(function(_, i) { return 'Questão ' + (i + 1); })
      };
    }
    var area = document.getElementById('escalaQuestoes');
    if (area) {
      var html = '';
      for (var q = 0; q < def.perguntas.length; q++) {
        var valor = Number(this._respostas[q]);
        html += '<div class="escala-pergunta"><div class="escala-enunciado">' +
          (q + 1) + '. ' + self.esc(def.perguntas[q]) + '</div>' +
          '<div class="escala-resposta-salva">' + self.esc(def.opcoes[valor] || '-') + '</div></div>';
      }
      area.innerHTML = html;
    }
    this.calcular();
    var salvar = document.getElementById('escalaSalvarBtn');
    if (salvar) salvar.style.display = 'none';
  },

  // Atalho da ficha do paciente: abre Escalas já com a paciente escolhida.
  abrirParaPaciente: function(id) {
    if (typeof app !== 'undefined' && app.trocarPagina) app.trocarPagina('escalas');
    this.preencher(id);
    this.preparar();
  },

  render: function() {
    this.preencher();
  }

};

window.escalasModulo = escalasModulo;
