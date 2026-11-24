// ============================================================================
// Pacientes — cadastro, edição, listagem
// ============================================================================

var pacientesEditId = null; // id do paciente sendo editado, null = novo

// LGPD: a autorização fica guardada com o paciente. Backups antigos não tinham
// esse campo e continuam valendo como "aguardando".
function normalizarConsentimento(valor) {
  var v = String(valor === null || valor === undefined ? '' : valor).trim().toLowerCase();
  return (v === 'aceito' || v === 'recusado') ? v : 'pendente';
}

function textoConsentimento(valor) {
  var v = normalizarConsentimento(valor);
  if (v === 'aceito') return 'Autorizado';
  if (v === 'recusado') return 'Não autorizado';
  return 'Aguardando';
}

// Ficha mais completa. Todos os campos são opcionais: paciente antigo, sem
// esses campos, continua aparecendo normalmente.
function nascimentoValido(valor) {
  var s = String(valor === null || valor === undefined ? '' : valor).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
  var partes = s.split('-');
  var a = parseInt(partes[0], 10), m = parseInt(partes[1], 10), d = parseInt(partes[2], 10);
  if (a < 1900 || a > 2100) return '';
  var teste = new Date(a, m - 1, d);
  if (teste.getFullYear() !== a || teste.getMonth() !== m - 1 || teste.getDate() !== d) return '';
  return teste.getTime() > Date.now() ? '' : s;
}

function textoNascimento(valor) {
  var s = nascimentoValido(valor);
  return s ? (typeof formatarData === 'function' ? formatarData(s) : s.split('-').reverse().join('/')) : '';
}

function pacientesRender() {
  var tbody = document.getElementById('tbodyPacientes');
  if (!tbody) return;

  tbody.innerHTML = '';

  var termo = normalizarTexto(pacientesModulo.termo).trim();
  var encontrados = 0;

  for (var i = 0; i < pacientes.length; i++) {
    var p = pacientes[i];

    var f = obterFontePorId(p.fonteId);

    // busca por nome do paciente ou nome do convênio
    if (termo) {
      var texto = String(p.nome || '') + ' ' + String(p.cpf || '') + ' ' + (f ? f.nome : '') +
        ' ' + String(p.telefone || '') + ' ' +
        (typeof formatarTelefone === 'function' ? formatarTelefone(p.telefone) : '') +
        ' ' + String(p.responsavel || '') + ' ' + String(p.carteira || '') +
        ' ' + String(p.nascimento || '');
      if (normalizarTexto(texto).indexOf(termo) === -1) continue;
    }
    encontrados++;

    var tipoTexto = (f && f.tipo === 'fixo') ? 'Fixo (do convênio)' : 'Variável';
    var tipoBadge = (f && f.tipo === 'fixo') ? 'badge-fixed' : 'badge-var';

    var valorTexto = (f && f.tipo === 'fixo') ? f.valorFixo : p.valor;
    var valorFormatado = (valorTexto !== null && valorTexto !== undefined)
      ? formatarMoeda(valorTexto)
      : '—';

    var consentimento = normalizarConsentimento(p.consentimento);

    var detalhes = [];
    if (p.nascimento) detalhes.push('Nasc. ' + textoNascimento(p.nascimento));
    if (p.telefone) detalhes.push('Tel ' + (typeof formatarTelefone === 'function'
      ? formatarTelefone(p.telefone) : p.telefone));
    if (p.responsavel) detalhes.push('Resp.: ' + p.responsavel);
    if (p.carteira) detalhes.push('Carteira: ' + p.carteira);

    var acoes =
      app.botaoAcao('Editar', 'pacientesModulo.editar(' + Number(p.id) + ')', 'editar') +
      app.botaoAcao('Excluir', 'pacientesModulo.excluir(' + Number(p.id) + ')', 'excluir', true) +
      app.botaoAcao('Apagar dados', 'pacientesModulo.apagarDados(' + Number(p.id) + ')', 'excluir', true);

    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td><strong>' + escapeHtml(p.nome) + '</strong>' +
        (p.cpf ? '<div class="cell-sub">CPF ' + escapeHtml(formatarCpf(p.cpf)) + '</div>' : '') +
        (detalhes.length ? '<div class="cell-sub">' + escapeHtml(detalhes.join(' · ')) + '</div>' : '') +
        '<div class="cell-sub lgpd-' + consentimento + '">LGPD: ' +
          textoConsentimento(consentimento) + '</div>' +
        '</td>' +
      '<td>' + (f ? escapeHtml(f.nome) : '-') + '</td>' +
      '<td><span class="badge ' + tipoBadge + '">' + tipoTexto + '</span></td>' +
      '<td class="money">' + valorFormatado + '</td>' +
      '<td style="white-space:nowrap;">' + acoes + '</td>';

    tbody.appendChild(tr);
  }

  if (encontrados === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:1.5rem;">' +
      (termo ? 'Nenhum paciente encontrado para essa busca.' : 'Nenhum paciente cadastrado.') +
      '</td></tr>';
  }

  var resumo = document.getElementById('pacBuscaResumo');
  if (resumo) {
    if (termo) {
      resumo.textContent = encontrados + (encontrados === 1 ? ' paciente encontrado' : ' pacientes encontrados');
    } else {
      resumo.textContent = pacientes.length + (pacientes.length === 1 ? ' cadastrado' : ' cadastrados');
    }
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

  termo: '',

  buscar: function(valor) {
    this.termo = String(valor || '').toLowerCase().trim();
    pacientesRender();
  },

  limparBusca: function() {
    this.termo = '';
    var input = document.getElementById('pacBusca');
    if (input) input.value = '';
    pacientesRender();
  },

  abrirModal: function() {
    var form = document.getElementById('formPaciente');
    if (form) form.reset();

    pacientesEditId = null;

    // novo paciente começa sem autorização registrada
    var consentSel = document.getElementById('pacConsentimento');
    if (consentSel) consentSel.value = 'pendente';

    // campos opcionais da ficha começam vazios
    ['pacNascimento', 'pacTelefone', 'pacResponsavel', 'pacCarteira'].forEach(function(id) {
      var campo = document.getElementById(id);
      if (campo) campo.value = '';
    });

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

    var cpfInput = document.getElementById('pacCpf');
    var cpf = String(cpfInput ? cpfInput.value : '').replace(/\D/g, '').slice(0, 11);
    if (cpf && typeof cpfValido === 'function' && !cpfValido(cpf)) {
      app.toast('CPF inválido. Confira os números ou deixe o campo vazio.');
      return false;
    }

    var consentInput = document.getElementById('pacConsentimento');
    var consentimento = normalizarConsentimento(consentInput ? consentInput.value : 'pendente');
    var consentimentoEm = consentimento === 'pendente' ? '' : hojeStr;

    // Ficha completa — campos opcionais, guardados de forma limpa.
    var nascInput = document.getElementById('pacNascimento');
    var nascimento = nascimentoValido(nascInput ? nascInput.value : '');

    var telInput = document.getElementById('pacTelefone');
    var telefone = String(telInput ? telInput.value : '').replace(/\D/g, '').slice(0, 11);

    var respInput = document.getElementById('pacResponsavel');
    var responsavel = String(respInput ? respInput.value : '').trim().slice(0, 120);

    var carteiraInput = document.getElementById('pacCarteira');
    var carteira = String(carteiraInput ? carteiraInput.value : '').trim().slice(0, 120);

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
          var anterior = normalizarConsentimento(pacientes[i].consentimento);
          pacientes[i].nome = nomeInput.value.trim();
          pacientes[i].cpf = cpf;
          pacientes[i].fonteId = f.id;
          pacientes[i].valor = valor;
          pacientes[i].consentimento = consentimento;
          pacientes[i].consentimentoEm = (consentimento === anterior)
            ? (pacientes[i].consentimentoEm || '')
            : consentimentoEm;
          pacientes[i].nascimento = nascimento;
          pacientes[i].telefone = telefone;
          pacientes[i].responsavel = responsavel;
          pacientes[i].carteira = carteira;
          break;
        }
      }
    } else {
      // novo paciente
      var novoId = Date.now();
      pacientes.push({
        id: novoId,
        nome: nomeInput.value.trim(),
        cpf: cpf,
        fonteId: f.id,
        valor: valor,
        consentimento: consentimento,
        consentimentoEm: consentimentoEm,
        nascimento: nascimento,
        telefone: telefone,
        responsavel: responsavel,
        carteira: carteira
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
    var cpfCampo = document.getElementById('pacCpf');
    if (cpfCampo) cpfCampo.value = typeof formatarCpf === 'function' ? formatarCpf(p.cpf) : (p.cpf || '');

    var consentCampo = document.getElementById('pacConsentimento');
    if (consentCampo) consentCampo.value = normalizarConsentimento(p.consentimento);

    var nascCampo = document.getElementById('pacNascimento');
    if (nascCampo) nascCampo.value = p.nascimento || '';
    var telCampo = document.getElementById('pacTelefone');
    if (telCampo) telCampo.value = typeof formatarTelefone === 'function'
      ? formatarTelefone(p.telefone) : (p.telefone || '');
    var respCampo = document.getElementById('pacResponsavel');
    if (respCampo) respCampo.value = p.responsavel || '';
    var carteiraCampo = document.getElementById('pacCarteira');
    if (carteiraCampo) carteiraCampo.value = p.carteira || '';

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
  },

  // Apaga de verdade: cadastro, atendimentos, evoluções e sessão em andamento.
  // Pede senha da conta + código do celular antes de mudar qualquer dado.
  apagarDados: function(id) {
    var paciente = null;
    for (var i = 0; i < pacientes.length; i++) {
      if (pacientes[i].id === id) { paciente = pacientes[i]; break; }
    }
    if (!paciente) return;

    var nome = String(paciente.nome || '').trim();
    var alvo = normalizarTexto(nome);
    if (!alvo) return;

    var atendimentos = 0;
    for (var i = 0; i < lancamentos.length; i++) {
      if (normalizarTexto(lancamentos[i].paciente) === alvo) atendimentos++;
    }

    var aviso = 'Apagar TODOS os dados de ' + nome + '?\n\n' +
      '- cadastro do paciente\n' +
      '- ' + atendimentos + ' atendimento(s)\n' +
      '- evoluções do prontuário deste paciente\n\n' +
      'Depois pedirei a senha da sua conta e o código do celular. ' +
      'Backups já exportados e a trilha de acesso ficam guardados.';
    if (!confirm(aviso)) return;

    var digitado = prompt('Para confirmar, digite o nome completo do paciente:');
    if (normalizarTexto(digitado || '') !== alvo) {
      app.toast('Nome diferente. Nada foi apagado.');
      return;
    }

    if (typeof segurancaModulo !== 'undefined' && segurancaModulo.estaDesbloqueado &&
        !segurancaModulo.estaDesbloqueado()) {
      app.toast('Desbloqueie o prontuário antes de apagar os dados.');
      return;
    }

    function conferirEvolucoes() {
      var evRestantes = [];
      var evApagadas = 0;
      var ilegiveis = 0;

      for (var i = 0; i < evolucoes.length; i++) {
        var ev = evolucoes[i];
        var texto = (typeof prontuarioModulo !== 'undefined' && prontuarioModulo.plain)
          ? prontuarioModulo.plain(ev)
          : (ev.cifrado ? null : ev);

        if (ev.cifrado && !texto) {
          ilegiveis++;
          evRestantes.push(ev);
        } else if (texto && normalizarTexto(texto.paciente) === alvo) {
          evApagadas++;
        } else {
          evRestantes.push(ev);
        }
      }

      if (ilegiveis > 0) {
        app.toast('Não foi possível ler ' + ilegiveis + ' evolução(ões). Desbloqueie o prontuário e tente de novo.');
        return;
      }

      var executar = function() {
        var lRestantes = [];
        var idsLancamentos = [];
        for (var i = 0; i < lancamentos.length; i++) {
          if (normalizarTexto(lancamentos[i].paciente) === alvo) {
            idsLancamentos.push(lancamentos[i].id);
          } else {
            lRestantes.push(lancamentos[i]);
          }
        }

        pacientes = pacientes.filter(function(item) { return item.id !== id; });
        lancamentos = lRestantes;
        evolucoes = evRestantes;

        if (typeof hojeModulo !== 'undefined' && hojeModulo.sessao &&
            idsLancamentos.indexOf(hojeModulo.sessao.id) !== -1) {
          hojeModulo.sessao = null;
          if (hojeModulo.salvarSessao) hojeModulo.salvarSessao();
        }
        if (typeof prontuarioModulo !== 'undefined' && prontuarioModulo.limparCache) {
          prontuarioModulo.limparCache();
        }

        Store.salvar();
        if (typeof segurancaModulo !== 'undefined' && segurancaModulo.registrar) {
          segurancaModulo.registrar('Dados do paciente apagados',
            nome.slice(0, 3) + '*** (' + atendimentos + ' atendimentos, ' +
            evApagadas + ' evoluções)');
        }
        pacientesRender();
        app.toast('Dados de ' + nome + ' apagados.');
      };

      if (typeof backupModulo !== 'undefined' && backupModulo._reautenticar) {
        backupModulo._reautenticar(executar);
      } else {
        executar();
      }
    }

    if (typeof prontuarioModulo !== 'undefined' && prontuarioModulo.garantirCache) {
      prontuarioModulo.garantirCache().then(conferirEvolucoes);
    } else {
      conferirEvolucoes();
    }
  }

};

// expõe globalmente para uso no HTML
window.pacientesModulo = pacientesModulo;

// reage à troca de convênio no formulário
(function setupCampoValorPaciente() {
  var sel = document.getElementById('pacFonte');
  if (sel) sel.addEventListener('change', atualizarCampoValorPaciente);
})();
