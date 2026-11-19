// ============================================================================
// Fontes de pagamento — cadastro, listagem, preenchimento de selects
// ============================================================================

function fontesRender() {
  // mantém a faixa de percentuais espelhada no cadastro de convênios
  Store.sincronizarPercentuais();
  var camposPct = {
    'Clínica': 'pctClinica',
    'Particular': 'pctParticular',
    'Cideslestes': 'pctCideslestes',
    'Unimed': 'pctUnimed'
  };
  for (var k = 0; k < fontes.length; k++) {
    var campoId = camposPct[fontes[k].nome];
    var campo = campoId ? document.getElementById(campoId) : null;
    if (campo) campo.value = percentuais[campoId];
  }

  var tbody = document.getElementById('tbodyFontes');
  if (!tbody) return;

  tbody.innerHTML = '';

  for (var i = 0; i < fontes.length; i++) {
    var f = fontes[i];
    var tipoBadge = (f.tipo === 'fixo') ? 'badge-fixed' : 'badge-var';
    var tipoTexto = (f.tipo === 'fixo') ? 'Fixo' : 'Variável';
    var valorFixoTexto = (f.valorFixo !== null && f.valorFixo !== undefined) ? formatarMoeda(f.valorFixo) : '—';
    var percentualTexto = (f.percentual && f.percentual !== '—') ? f.percentual + '%' : '—';

    var acoes =
      app.botaoAcao('Editar', 'fontesModulo.editar(' + f.id + ')', 'editar') +
      app.botaoAcao('Excluir', 'fontesModulo.excluir(' + f.id + ')', 'excluir', true);

    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td><strong>' + f.nome + '</strong></td>' +
      '<td><span class="badge ' + tipoBadge + '">' + tipoTexto + '</span></td>' +
      '<td>' + valorFixoTexto + '</td>' +
      '<td>' + percentualTexto + '</td>' +
      '<td><span class="badge badge-fixed">Ativa</span></td>' +
      '<td style="white-space:nowrap;">' + acoes + '</td>';

    tbody.appendChild(tr);
  }
}

// preenche os selects de fonte (modal paciente e outros)
function preencherFontesSelects() {
  var opts = '';
  for (var i = 0; i < fontes.length; i++) {
    opts = opts + '<option value="' + fontes[i].id + '">' + fontes[i].nome + '</option>';
  }

  var pacFonte = document.getElementById('pacFonte');
  if (pacFonte) pacFonte.innerHTML = opts;

  var lancFonte = document.getElementById('lancFonte');
  if (lancFonte) lancFonte.innerHTML = opts;
}

var fontesModulo = {

  abrirModalNovaFonte: function() {
    var form = document.getElementById('formNovaFonte');
    if (form) form.reset();

    var campo = document.getElementById('campoValorFixo');
    if (campo) campo.classList.remove('show');

    // padrão: fixo
    var radios = document.querySelectorAll('input[name="fonteTipo"]');
    for (var i = 0; i < radios.length; i++) {
      if (radios[i].value === 'fixo') radios[i].checked = true;
    }

    // adicionar listener para mostrar/esconder campo de valor fixo
    for (var i = 0; i < radios.length; i++) {
      radios[i].addEventListener('change', function() {
        var campoValor = document.getElementById('campoValorFixo');
        if (campoValor) {
          if (this.value === 'fixo') {
            campoValor.classList.add('show');
          } else {
            campoValor.classList.remove('show');
          }
        }
      });
    }

    // mostrar campo de valor fixo inicialmente (pois padrão é fixo)
    if (campo) campo.classList.add('show');

    // restaurar título e botão para "novo"
    var titulo = document.querySelector('#modalNovaFonte .modal-title');
    if (titulo) titulo.textContent = 'Novo convênio';

    var btnSalvar = document.querySelector('#modalNovaFonte .modal-footer .btn-primary');
    if (btnSalvar) {
      btnSalvar.textContent = 'Salvar';
      btnSalvar.onclick = function() { fontesModulo.salvarNovaFonte(); };
    }

    app.abrirModal('modalNovaFonte');
  },

  salvarNovaFonte: function() {
    var nome = document.getElementById('fonteNome');
    if (!nome || nome.value.trim() === '') {
      app.toast('Informe o nome do convênio.');
      return false;
    }

    var tipo = document.querySelector('input[name="fonteTipo"]:checked');
    var valorFixoInput = document.getElementById('fonteValorFixo');
    var percentualInput = document.getElementById('fontePercentual');
    var valorFixo = null;
    var percentual = null;

    if (tipo && tipo.value === 'fixo' && valorFixoInput) {
      valorFixo = parseMoeda(valorFixoInput.value);
    }

    if (percentualInput && percentualInput.value.trim() !== '') {
      percentual = percentualInput.value.trim();
    }

    var novoId = Date.now();
    fontes.push({
      id: novoId,
      nome: nome.value.trim(),
      tipo: (tipo ? tipo.value : 'variavel'),
      valorFixo: valorFixo,
      percentual: percentual
    });

    Store.salvar();
    fontesRender();
    preencherFontesSelects();
    app.fecharModal('modalNovaFonte');
    app.toast('Convênio cadastrado.');
    return false;
  },

  editar: function(id) {
    var f = null;
    for (var i = 0; i < fontes.length; i++) {
      if (fontes[i].id === id) { f = fontes[i]; break; }
    }
    if (!f) return;

    // abrir modal em modo edição
    var form = document.getElementById('formNovaFonte');
    if (form) form.reset();

    // preencher campos
    var nomeInput = document.getElementById('fonteNome');
    if (nomeInput) nomeInput.value = f.nome;

    // definir tipo
    var radios = document.querySelectorAll('input[name="fonteTipo"]');
    for (var i = 0; i < radios.length; i++) {
      if (radios[i].value === f.tipo) {
        radios[i].checked = true;
      }
    }

    // mostrar/esconder campo de valor fixo
    var campo = document.getElementById('campoValorFixo');
    if (campo) {
      if (f.tipo === 'fixo') {
        campo.classList.add('show');
        var valorInput = document.getElementById('fonteValorFixo');
        if (valorInput && f.valorFixo !== null) {
          valorInput.value = formatarMoeda(f.valorFixo).replace('R$ ', '');
        }
      } else {
        campo.classList.remove('show');
      }
    }

    // preencher percentual
    var percentualInput = document.getElementById('fontePercentual');
    if (percentualInput && f.percentual) {
      percentualInput.value = f.percentual;
    }

    // adicionar listener para mostrar/esconder campo de valor fixo
    for (var i = 0; i < radios.length; i++) {
      radios[i].addEventListener('change', function() {
        var campoValor = document.getElementById('campoValorFixo');
        if (campoValor) {
          if (this.value === 'fixo') {
            campoValor.classList.add('show');
          } else {
            campoValor.classList.remove('show');
          }
        }
      });
    }

    // alterar título do modal
    var titulo = document.querySelector('#modalNovaFonte .modal-title');
    if (titulo) titulo.textContent = 'Editar convênio';

    // alterar botão para salvar edição
    var btnSalvar = document.querySelector('#modalNovaFonte .modal-footer .btn-primary');
    if (btnSalvar) {
      btnSalvar.textContent = 'Salvar';
      btnSalvar.onclick = function() { fontesModulo.salvarEdicao(id); };
    }

    app.abrirModal('modalNovaFonte');
  },

  salvarEdicao: function(id) {
    var nome = document.getElementById('fonteNome');
    if (!nome || nome.value.trim() === '') {
      app.toast('Informe o nome do convênio.');
      return false;
    }

    var tipo = document.querySelector('input[name="fonteTipo"]:checked');
    var valorFixoInput = document.getElementById('fonteValorFixo');
    var percentualInput = document.getElementById('fontePercentual');
    var valorFixo = null;
    var percentual = null;

    if (tipo && tipo.value === 'fixo' && valorFixoInput) {
      valorFixo = parseMoeda(valorFixoInput.value);
    }

    if (percentualInput && percentualInput.value.trim() !== '') {
      percentual = percentualInput.value.trim();
    }

    // atualizar fonte
    for (var i = 0; i < fontes.length; i++) {
      if (fontes[i].id === id) {
        fontes[i].nome = nome.value.trim();
        fontes[i].tipo = (tipo ? tipo.value : 'variavel');
        fontes[i].valorFixo = valorFixo;
        fontes[i].percentual = percentual;
        break;
      }
    }

    Store.salvar();
    fontesRender();
    preencherFontesSelects();
    app.fecharModal('modalNovaFonte');
    app.toast('Convênio atualizado.');
    return false;
  },

  excluir: function(id) {
    if (!confirm('Excluir este convênio?')) return;

    // verificar se há pacientes usando esta fonte
    var emUso = false;
    for (var i = 0; i < pacientes.length; i++) {
      if (pacientes[i].fonteId === id) { emUso = true; break; }
    }
    if (emUso) {
      app.toast('Não é possível excluir: há pacientes vinculados.');
      return;
    }

    var novo = [];
    for (var i = 0; i < fontes.length; i++) {
      if (fontes[i].id !== id) novo.push(fontes[i]);
    }
    fontes = novo;

    Store.salvar();
    fontesRender();
    preencherFontesSelects();
    app.toast('Convênio excluído.');
  }

};

window.fontesModulo = fontesModulo;
