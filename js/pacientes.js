// ============================================================================
// Pacientes — cadastro, edição, listagem
// ============================================================================

var pacientesEditId = null; // id do paciente sendo editado, null = novo

function pacientesRender() {
  var tbody = document.getElementById('tbodyPacientes');
  if (!tbody) return;

  tbody.innerHTML = '';

  for (var i = 0; i < pacientes.length; i++) {
    var p = pacientes[i];

    var f = obterFontePorId(p.fonteId);

    var tipoTexto = (f && f.tipo === 'fixo') ? 'Fixo (do convênio)' : 'Variável';
    var tipoBadge = (f && f.tipo === 'fixo') ? 'badge-fixed' : 'badge-var';

    var valorTexto = (f && f.tipo === 'fixo') ? f.valorFixo : p.valor;
    var valorFormatado = (valorTexto !== null && valorTexto !== undefined)
      ? formatarMoeda(valorTexto)
      : '—';

    var acoes =
      app.botaoAcao('Editar', 'pacientesModulo.editar(' + p.id + ')', 'editar') +
      app.botaoAcao('Excluir', 'pacientesModulo.excluir(' + p.id + ')', 'excluir', true);

    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td><strong>' + p.nome + '</strong></td>' +
      '<td>' + (f ? f.nome : '-') + '</td>' +
      '<td><span class="badge ' + tipoBadge + '">' + tipoTexto + '</span></td>' +
      '<td class="money">' + valorFormatado + '</td>' +
      '<td style="white-space:nowrap;">' + acoes + '</td>';

    tbody.appendChild(tr);
  }
}

// mostra ou esconde o campo de valor conforme o convênio selecionado
function atualizarCampoValorPaciente() {
  var select = document.getElementById('pacFonte');
  var campo = document.getElementById('campoValorPaciente');
  if (!select || !campo) return;
  var f = obterFontePorId(parseInt(select.value));
  if (f && f.tipo === 'variavel') {
    campo.classList.add('show');
  } else {
    campo.classList.remove('show');
  }
}

var pacientesModulo = {

  abrirModal: function() {
    var form = document.getElementById('formPaciente');
    if (form) form.reset();

    pacientesEditId = null;

    // popular select de convênios
    preencherFontesSelects();

    // seleciona a primeira fonte por padrão
    var sel = document.getElementById('pacFonte');
    if (sel && fontes.length > 0) sel.value = fontes[0].id;

    // o campo de valor aparece para convênios de valor variável
    var valorInput = document.getElementById('pacValor');
    if (valorInput) valorInput.value = '';
    atualizarCampoValorPaciente();

    // restaurar título para "novo"
    var titulo = document.querySelector('#modalPaciente .modal-title');
    if (titulo) titulo.textContent = 'Novo paciente';

    app.abrirModal('modalPaciente');
  },

  salvar: function() {
    var nomeInput = document.getElementById('pacNome');
    var fonteSelect = document.getElementById('pacFonte');
    var valorInput = document.getElementById('pacValor');

    if (!nomeInput || nomeInput.value.trim() === '') {
      app.toast('Informe o nome do paciente.');
      return false;
    }
    if (!fonteSelect || fonteSelect.value === '') {
      app.toast('Selecione a fonte/plano.');
      return false;
    }

    var fId = parseInt(fonteSelect.value);
    var f = null;
    for (var i = 0; i < fontes.length; i++) {
      if (fontes[i].id === fId) { f = fontes[i]; break; }
    }
    if (!f) {
      app.toast('Fonte não encontrada.');
      return false;
    }

    var valor = null;
    if (f.tipo === 'variavel') {
      if (!valorInput || valorInput.value.trim() === '') {
        app.toast('Informe o valor do atendimento para este paciente.');
        return false;
      }
      valor = parseMoeda(valorInput.value);
    } else {
      valor = f.valorFixo !== null ? f.valorFixo : 0;
    }

    if (pacientesEditId) {
      // edição de paciente existente
      for (var i = 0; i < pacientes.length; i++) {
        if (pacientes[i].id === pacientesEditId) {
          pacientes[i].nome = nomeInput.value.trim();
          pacientes[i].fonteId = f.id;
          pacientes[i].valor = valor;
          break;
        }
      }
    } else {
      // novo paciente
      var novoId = Date.now();
      pacientes.push({
        id: novoId,
        nome: nomeInput.value.trim(),
        fonteId: f.id,
        valor: valor
      });
    }

    Store.salvar();
    pacientesRender();
    app.fecharModal('modalPaciente');
    app.toast(pacientesEditId ? 'Paciente atualizado.' : 'Paciente cadastrado.');
    return false;
  },

  editar: function(id) {
    var p = null;
    for (var i = 0; i < pacientes.length; i++) {
      if (pacientes[i].id === id) { p = pacientes[i]; break; }
    }
    if (!p) return;

    var form = document.getElementById('formPaciente');
    if (form) form.reset();

    pacientesEditId = id;

    document.getElementById('pacNome').value = p.nome;

    // garante que o select esteja preenchido
    preencherFontesSelects();

    var fonteSelect = document.getElementById('pacFonte');
    if (fonteSelect) fonteSelect.value = p.fonteId;

    // mostra o campo de valor conforme o tipo de convênio
    atualizarCampoValorPaciente();
    var valorInput = document.getElementById('pacValor');
    if (valorInput) {
      valorInput.value = (p.valor !== null && p.valor !== undefined)
        ? formatarMoeda(p.valor).replace('R$ ', '')
        : '';
    }

    // alterar título do modal
    var titulo = document.querySelector('#modalPaciente .modal-title');
    if (titulo) titulo.textContent = 'Editar paciente';

    app.abrirModal('modalPaciente');
  },

  excluir: function(id) {
    if (!confirm('Excluir este paciente?')) return;

    var novo = [];
    for (var i = 0; i < pacientes.length; i++) {
      if (pacientes[i].id !== id) novo.push(pacientes[i]);
    }
    pacientes = novo;

    Store.salvar();
    pacientesRender();
    app.toast('Paciente excluído.');
  }

};

// expõe globalmente para uso no HTML
window.pacientesModulo = pacientesModulo;

// reage à troca de convênio no formulário
(function setupCampoValorPaciente() {
  var sel = document.getElementById('pacFonte');
  if (sel) sel.addEventListener('change', atualizarCampoValorPaciente);
})();
