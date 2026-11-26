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
      app.botaoAcao('Apagar dados', 'pacientesModulo.apagarDados(' + Number(p.id) + ')', 'excluir', true) +
      app.botaoAcao('Convidar portal', 'pacientesModulo.convidarPortal(' + Number(p.id) + ')', 'convidar') +
      app.botaoAcao('Recados', 'pacientesModulo.abrirRecadosPortal(' + Number(p.id) + ')', 'convidar') +
      app.botaoAcao('Recibos', 'pacientesModulo.abrirRecibosPortal(' + Number(p.id) + ')', 'convidar') +
      app.botaoAcao('WhatsApp', 'whatsappModulo.abrirParaPaciente(' + Number(p.id) + ')', 'whatsapp');

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
      '<td style="white-space:nowrap;">' + acoes +
        '<span class="selo-nova-resposta" id="seloRecados-' + Number(p.id) + '"></span></td>';

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

  // Selo "Nova resposta": atualiza a lista quando a nuvem está ligada.
  try {
    if (typeof fetch === 'function' && typeof Backend !== 'undefined' &&
        Backend.configurado && Backend.configurado() &&
        Backend.conectado && Backend.conectado() &&
        typeof pacientesModulo !== 'undefined') {
      pacientesModulo.atualizarSelosNaoLidos();
    }
  } catch (e) {}
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

    var emailInput = document.getElementById('pacEmail');
    var email = String(emailInput ? emailInput.value : '').trim().toLowerCase();
    if (email && typeof Portal !== 'undefined' && Portal.validarEmail && !Portal.validarEmail(email)) {
      app.toast('E-mail inválido. Confira o endereço ou deixe em branco.');
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
          pacientes[i].email = email;
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
        carteira: carteira,
        email: email
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
    var emailCampo = document.getElementById('pacEmail');
    if (emailCampo) emailCampo.value = p.email || '';

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
  },

  // ---------- Portal do paciente (convite por link mágico) ----------

  _portalPacienteId: null,

  _pacientePorId: function(id) {
    for (var i = 0; i < pacientes.length; i++) {
      if (pacientes[i].id === id) return pacientes[i];
    }
    return null;
  },

  _portalMsg: function(texto, erro) {
    var el = document.getElementById('portalConviteStatus');
    if (!el) return;
    el.textContent = texto || '';
    el.style.color = erro ? '#C16A4A' : 'var(--text-muted)';
  },

  convidarPortal: function(id) {
    var self = this;
    var p = this._pacientePorId(id);
    if (!p) return;
    if (!Backend || !Backend.configurado() || !Backend.conectado()) {
      app.toast('Entre na sua conta para convidar o paciente.');
      return;
    }
    this._portalPacienteId = id;
    this._portalPacientePortalId = null;
    var nome = document.getElementById('portalConviteNome');
    if (nome) nome.value = p.nome || '';
    var email = document.getElementById('portalConviteEmail');
    if (email) email.value = p.email || '';
    var btn = document.getElementById('portalConviteBtn');
    if (btn) { btn.disabled = false; btn.textContent = 'Enviar convite'; }
    var btnRevogar = document.getElementById('portalRevogarBtn');
    if (btnRevogar) btnRevogar.style.display = 'none';
    this._portalMsg('Verificando convite...');
    app.abrirModal('modalPortalConvite');
    this._carregarStatusPortal(p).catch(function(erro) {
      self._portalMsg(erro.message || 'Não foi possível verificar o convite.', true);
    });
  },

  _carregarStatusPortal: function(paciente) {
    var self = this;
    var usuario = Backend.usuario();
    if (!usuario || !usuario.id) return Promise.resolve();
    var base = Backend.base();
    var headers = Backend.headers(true);
    var urlPac = base + '/rest/v1/portal_pacientes?select=id,email&profissional_id=eq.' +
      encodeURIComponent(usuario.id) + '&paciente_id=eq.' + encodeURIComponent(String(paciente.id)) + '&limit=1';
    return fetch(urlPac, { headers: headers }).then(function(r) { return Backend._resposta(r); })
      .then(function(linhas) {
        var vinculo = linhas && linhas[0];
        var btnRevogar = document.getElementById('portalRevogarBtn');
        if (!vinculo) {
          self._portalPacientePortalId = null;
          if (btnRevogar) btnRevogar.style.display = 'none';
          self._portalMsg('Status: sem convite. Envie um convite para liberar o portal.');
          return;
        }
        var idPortal = vinculo.id;
        self._portalPacientePortalId = idPortal;
        var urlAcesso = base + '/rest/v1/portal_acessos?select=criado_em&paciente_portal_id=eq.' +
          encodeURIComponent(idPortal) + '&limit=1';
        var urlConvite = base + '/rest/v1/portal_convites?select=criado_em,aceito_em,expira_em,email&paciente_portal_id=eq.' +
          encodeURIComponent(idPortal) + '&order=criado_em.desc&limit=1';
        return Promise.all([
          fetch(urlAcesso, { headers: headers }).then(function(r) { return Backend._resposta(r); }),
          fetch(urlConvite, { headers: headers }).then(function(r) { return Backend._resposta(r); })
        ]).then(function(res) {
          var acesso = res[0] && res[0][0];
          var convite = res[1] && res[1][0];
          var btn = document.getElementById('portalConviteBtn');
          if (btnRevogar) btnRevogar.style.display = acesso ? '' : 'none';
          if (acesso) {
            if (btn) btn.textContent = 'Reenviar acesso';
            self._portalMsg('Status: acesso ativo. O paciente já entrou no portal. Você pode reenviar acesso ou revogar.');
            return;
          }
          if (convite && !convite.aceito_em) {
            var expirou = convite.expira_em && new Date(convite.expira_em).getTime() < Date.now();
            if (btn) btn.textContent = 'Reenviar convite';
            if (expirou) {
              self._portalMsg('Status: convite expirado (' + (convite.email || 'e-mail') + '). Envie um novo convite.');
            } else {
              self._portalMsg('Status: convite enviado para ' + (convite.email || 'o e-mail informado') + '. Aguardando aceite.');
            }
            return;
          }
          self._portalMsg('Status: sem convite pendente. Você pode enviar o convite.');
        });
      });
  },

  enviarConvitePortal: function() {
    var self = this;
    var p = this._pacientePorId(this._portalPacienteId);
    if (!p) { app.toast('Paciente não encontrado.'); return; }
    if (!Backend || !Backend.configurado() || !Backend.conectado()) {
      app.toast('Entre na sua conta para enviar o convite.');
      return;
    }
    var emailInput = document.getElementById('portalConviteEmail');
    var email = String(emailInput ? emailInput.value : '').trim().toLowerCase();
    if (!email || typeof Portal === 'undefined' || !Portal.validarEmail(email)) {
      this._portalMsg('Informe um e-mail válido.', true);
      return;
    }

    // guarda o e-mail no cadastro do paciente
    if (p.email !== email) {
      p.email = email;
      Store.salvar();
      pacientesRender();
    }

    var btn = document.getElementById('portalConviteBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }
    this._portalMsg('Enviando convite...');

    var usuario = Backend.usuario();
    var base = Backend.base();
    var headers = Backend.headers(true);
    var pacientePortalId = null;

    // 1) cria/encontra vínculo portal_pacientes
    var urlBusca = base + '/rest/v1/portal_pacientes?select=id&profissional_id=eq.' +
      encodeURIComponent(usuario.id) + '&paciente_id=eq.' + encodeURIComponent(String(p.id)) + '&limit=1';
    fetch(urlBusca, { headers: headers })
      .then(function(r) { return Backend._resposta(r); })
      .then(function(linhas) {
        if (linhas && linhas[0] && linhas[0].id) return linhas[0].id;
        var hIns = Backend.headers(true);
        hIns['Prefer'] = 'return=representation';
        return fetch(base + '/rest/v1/portal_pacientes', {
          method: 'POST',
          headers: hIns,
          body: JSON.stringify({
            profissional_id: usuario.id,
            paciente_id: String(p.id),
            nome: String(p.nome || '').slice(0, 300),
            email: email
          })
        }).then(function(r) { return Backend._resposta(r); }).then(function(rows) {
          return rows && rows[0] ? rows[0].id : null;
        });
      })
      .then(function(idPortal) {
        pacientePortalId = idPortal;
        if (!pacientePortalId) throw new Error('Não foi possível criar o vínculo do paciente no portal.');
        // atualiza nome/email do vínculo
        return fetch(base + '/rest/v1/portal_pacientes?id=eq.' + encodeURIComponent(pacientePortalId), {
          method: 'PATCH',
          headers: Backend.headers(true),
          body: JSON.stringify({ nome: String(p.nome || '').slice(0, 300), email: email, atualizado_em: new Date().toISOString() })
        }).then(function(r) { if (!r.ok) throw new Error('Não foi possível atualizar o vínculo.'); });
      })
      .then(function() {
        // 2) registra convite
        var hConv = Backend.headers(true);
        hConv['Prefer'] = 'return=minimal';
        return fetch(base + '/rest/v1/portal_convites', {
          method: 'POST',
          headers: hConv,
          body: JSON.stringify({
            profissional_id: usuario.id,
            paciente_portal_id: pacientePortalId,
            email: email
          })
        }).then(function(r) {
          if (r.ok) return;
          return r.json().catch(function() { return {}; }).then(function(d) {
            throw new Error(d.message || d.hint || d.details || 'Não foi possível registrar o convite.');
          });
        });
      })
      .then(function() {
        // 3) envia link mágico por e-mail (anon, sem mexer na sessão da psicóloga)
        var redirectTo = (typeof Portal !== 'undefined' && Portal.urlDeRetorno)
          ? Portal.urlDeRetorno(window.location.href)
          : (window.location.href.replace(/[^/]*$/, '') + 'portal.html');
        // O Supabase lê o retorno como parâmetro da URL (é o que as bibliotecas
        // oficiais fazem); manter também no corpo garante compatibilidade.
        return fetch(base + '/auth/v1/otp?redirect_to=' + encodeURIComponent(redirectTo), {
          method: 'POST',
          headers: {
            'apikey': CONFIG.supabaseAnonKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: email,
            create_user: true,
            data: { portal: true, paciente_portal_id: pacientePortalId },
            redirect_to: redirectTo,
            options: { email_redirect_to: redirectTo }
          })
        }).then(function(r) {
          return r.json().catch(function() { return {}; }).then(function(dados) {
            if (!r.ok) {
              var msg = (dados && (dados.msg || dados.message || dados.error_description)) || 'Não foi possível enviar o e-mail.';
              throw new Error(msg);
            }
            return dados;
          });
        });
      })
      .then(function() {
        if (btn) { btn.disabled = false; btn.textContent = 'Reenviar convite'; }
        self._portalMsg('Convite enviado para ' + email + '. Peça ao paciente para abrir o e-mail e criar a senha.');
        app.toast('Convite enviado para o portal.');
        if (typeof segurancaModulo !== 'undefined') segurancaModulo.registrar('Convite do portal enviado', p.nome ? p.nome.slice(0, 3) + '***' : '');
      })
      .catch(function(erro) {
        if (btn) { btn.disabled = false; btn.textContent = 'Reenviar convite'; }
        var msg = erro && erro.message ? erro.message : 'Não foi possível enviar o convite.';
        try { console.error('Erro convite portal:', erro); } catch (e) {}
        if (/relation .* does not exist|schema cache|Could not find the table/i.test(msg)) {
          msg = 'As tabelas do portal ainda não existem no Supabase (ou o cache do Supabase ainda não atualizou). Abra o SQL Editor, rode o supabase/schema.sql e tente de novo em 1 minuto.';
        }
        self._portalMsg(msg, true);
      });
  },

  revogarAcessoPortal: function() {
    var self = this;
    var p = this._pacientePorId(this._portalPacienteId);
    if (!p || !this._portalPacientePortalId) { this._portalMsg('Nenhum acesso ativo para revogar.', true); return; }
    if (!confirm('Revogar o acesso de ' + (p.nome || 'este paciente') + ' ao portal?\n\nO paciente não vai mais conseguir entrar, mas os dados clínicos continuam no seu sistema. Você pode enviar um novo convite depois.')) return;
    var btnRevogar = document.getElementById('portalRevogarBtn');
    if (btnRevogar) btnRevogar.disabled = true;
    this._portalMsg('Revogando acesso...', 'ok');
    fetch(Backend.base() + '/rest/v1/portal_acessos?paciente_portal_id=eq.' + encodeURIComponent(this._portalPacientePortalId), {
      method: 'DELETE',
      headers: Backend.headers(true)
    }).then(function(r) {
      if (!r.ok) throw new Error('Não foi possível revogar o acesso.');
      if (btnRevogar) { btnRevogar.disabled = false; btnRevogar.style.display = 'none'; }
      self._portalMsg('Acesso revogado. O paciente não consegue mais entrar no portal.');
      app.toast('Acesso do portal revogado.');
      if (typeof segurancaModulo !== 'undefined') segurancaModulo.registrar('Acesso do portal revogado', p.nome ? p.nome.slice(0, 3) + '***' : '');
    }).catch(function(err) {
      if (btnRevogar) btnRevogar.disabled = false;
      self._portalMsg(err.message || 'Não foi possível revogar o acesso.', true);
    });
  },

  // ---------- Selo "Nova resposta" ----------
  _naoLidos: {},

  atualizarSelosNaoLidos: function() {
    var self = this;
    var usuario = Backend.usuario();
    if (!usuario || !usuario.id) return Promise.resolve();
    var base = Backend.base();
    var headers = Backend.headers(true);
    var urlPac = base + '/rest/v1/portal_pacientes?select=id,paciente_id&profissional_id=eq.' +
      encodeURIComponent(usuario.id) + '&limit=200';
    return fetch(urlPac, { headers: headers })
      .then(function(r) { return Backend._resposta(r); })
      .then(function(vinculos) {
        var porPortal = {};
        for (var i = 0; i < vinculos.length; i++) {
          porPortal[String(vinculos[i].id)] = String(vinculos[i].paciente_id);
        }
        var urlNaoLidos = base + '/rest/v1/portal_recados?select=paciente_portal_id,id' +
          '&autor=eq.paciente&lido_em=is.null&limit=500';
        return fetch(urlNaoLidos, { headers: headers })
          .then(function(r) { return Backend._resposta(r); })
          .then(function(linhas) {
            var contagens = {};
            for (var j = 0; j < linhas.length; j++) {
              var idLocal = porPortal[String(linhas[j].paciente_portal_id)];
              if (idLocal) contagens[idLocal] = (contagens[idLocal] || 0) + 1;
            }
            self._naoLidos = contagens;
            self._pintarSelos();
          });
      }).catch(function() {});
  },

  _pintarSelos: function() {
    for (var i = 0; i < pacientes.length; i++) {
      var el = document.getElementById('seloRecados-' + Number(pacientes[i].id));
      if (!el) continue;
      var n = this._naoLidos[String(pacientes[i].id)] || 0;
      el.textContent = n ? ('Nova resposta' + (n > 1 ? ' (' + n + ')' : '')) : '';
      el.style.display = n ? 'inline-block' : 'none';
    }
  },

  _marcarRecadosLidos: function(ids) {
    if (!ids.length) return Promise.resolve();
    var self = this;
    var base = Backend.base();
    var agora = new Date().toISOString();
    var promessas = [];
    for (var i = 0; i < ids.length; i++) {
      promessas.push(
        fetch(base + '/rest/v1/portal_recados?id=eq.' + encodeURIComponent(ids[i]), {
          method: 'PATCH',
          headers: Backend.headers(true),
          body: JSON.stringify({ lido_em: agora })
        }).then(function(r) { return Backend._resposta(r); })
      );
    }
    return Promise.all(promessas).then(function() {
      // o selo da lista some assim que a conversa é aberta
      self.atualizarSelosNaoLidos();
    }).catch(function() {});
  },

  // ---------- Recados do portal (lado da psicóloga) ----------
  _portalRecadosPacienteId: null,
  _portalRecadosPortalId: null,

  abrirRecadosPortal: function(id) {
    var p = this._pacientePorId(id);
    if (!p) return;
    if (!Backend || !Backend.configurado() || !Backend.conectado()) {
      app.toast('Entre na sua conta para ver os recados.');
      return;
    }
    this._portalRecadosPacienteId = id;
    this._portalRecadosPortalId = null;
    var info = document.getElementById('portalRecadosPaciente');
    if (info) info.textContent = 'Paciente: ' + (p.nome || '');
    var lista = document.getElementById('portalRecadosProfLista');
    if (lista) lista.innerHTML = '<div class="portal-muted">Carregando...</div>';
    var status = document.getElementById('portalRecadosProfStatus');
    if (status) status.textContent = '';
    var campo = document.getElementById('portalRecadoProfTexto');
    if (campo) campo.value = '';
    app.abrirModal('modalPortalRecados');
    this._carregarRecadosPortal(p);
  },

  _buscarPortalId: function(paciente) {
    var usuario = Backend.usuario();
    if (!usuario || !usuario.id) return Promise.resolve(null);
    var url = Backend.base() + '/rest/v1/portal_pacientes?select=id&profissional_id=eq.' +
      encodeURIComponent(usuario.id) + '&paciente_id=eq.' + encodeURIComponent(String(paciente.id)) + '&limit=1';
    return fetch(url, { headers: Backend.headers(true) })
      .then(function(r) { return Backend._resposta(r); })
      .then(function(linhas) { return (linhas && linhas[0] && linhas[0].id) || null; });
  },

  _carregarRecadosPortal: function(paciente) {
    var self = this;
    this._buscarPortalId(paciente).then(function(portalId) {
      self._portalRecadosPortalId = portalId;
      var lista = document.getElementById('portalRecadosProfLista');
      if (!portalId) {
        if (lista) lista.innerHTML = '<div class="portal-muted">Este paciente ainda não tem portal. Envie um convite primeiro.</div>';
        return;
      }
      var url = Backend.base() + '/rest/v1/portal_recados?select=id,autor,texto,criado_em,lido_em&paciente_portal_id=eq.' +
        encodeURIComponent(portalId) + '&order=criado_em.asc&limit=200';
      return fetch(url, { headers: Backend.headers(true) })
        .then(function(r) { return Backend._resposta(r); })
        .then(function(recados) {
          self._renderRecadosProf(recados || []);
          var naoLidos = [];
          for (var j = 0; j < (recados || []).length; j++) {
            if (recados[j].autor === 'paciente' && !recados[j].lido_em) naoLidos.push(recados[j].id);
          }
          if (!naoLidos.length) return null;
          // Abrir a conversa já conta como leitura.
          return self._marcarRecadosLidos(naoLidos).then(function() {
            var p = self._pacientePorId(self._portalRecadosPacienteId);
            if (p) return self._carregarRecadosPortal(p);
          });
        });
    }).catch(function(err) {
      var lista = document.getElementById('portalRecadosProfLista');
      if (lista) lista.innerHTML = '<div class="portal-muted">Não foi possível carregar os recados.</div>';
      var status = document.getElementById('portalRecadosProfStatus');
      if (status) { status.textContent = err.message || 'Erro ao carregar.'; status.style.color = '#C16A4A'; }
    });
  },

  _renderRecadosProf: function(recados) {
    var lista = document.getElementById('portalRecadosProfLista');
    if (!lista) return;
    if (!recados.length) { lista.innerHTML = '<div class="portal-muted">Nenhum recado ainda. Envie o primeiro recado para iniciar a conversa.</div>'; return; }
    var html = '';
    for (var i = 0; i < recados.length; i++) {
      var r = recados[i];
      var autor = r.autor === 'paciente' ? 'Paciente' : 'Você';
      var cor = r.autor === 'paciente' ? '#F3F8F5' : '#fff';
      var borda = r.autor === 'paciente' ? '#D7E5DD' : '#E5EAE6';
      var quando = '';
      try { quando = new Date(r.criado_em).toLocaleDateString('pt-BR') + ' ' + new Date(r.criado_em).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'}); } catch(e) {}
      var selo = (r.autor === 'paciente' && !r.lido_em)
        ? '<span class="selo-nova-resposta-inline">Nova resposta</span>' : '';
      html += '<div style="border:1px solid ' + borda + ';background:' + cor + ';border-radius:10px;padding:10px;margin-bottom:8px;">' +
        '<div style="font-size:.78rem;color:#6B7C72;margin-bottom:4px;">' +
          escapeHtml(autor) + ' · ' + escapeHtml(quando) + selo + '</div>' +
        '<div style="white-space:pre-wrap;">' + escapeHtml(r.texto || '') + '</div></div>';
    }
    lista.innerHTML = html;
    lista.scrollTop = lista.scrollHeight;
  },

  enviarRecadoPortal: function() {
    var self = this;
    var texto = ((document.getElementById('portalRecadoProfTexto') || {}).value || '').trim();
    var status = document.getElementById('portalRecadosProfStatus');
    if (!texto) { if (status) { status.textContent = 'Escreva um recado.'; status.style.color = '#C16A4A'; } return; }
    if (!this._portalRecadosPortalId) { if (status) { status.textContent = 'Envie um convite ao paciente primeiro.'; status.style.color = '#C16A4A'; } return; }
    if (status) { status.textContent = 'Enviando...'; status.style.color = '#6B7C72'; }
    fetch(Backend.base() + '/rest/v1/portal_recados', {
      method: 'POST',
      headers: Backend.headers(true),
      body: JSON.stringify({
        paciente_portal_id: this._portalRecadosPortalId,
        autor: 'profissional',
        texto: texto.slice(0, 2000)
      })
    }).then(function(r) { return Backend._resposta(r); }).then(function() {
      var campo = document.getElementById('portalRecadoProfTexto');
      if (campo) campo.value = '';
      if (status) { status.textContent = 'Recado enviado.'; status.style.color = '#2F5D46'; }
      var p = self._pacientePorId(self._portalRecadosPacienteId);
      if (p) self._carregarRecadosPortal(p);
    }).catch(function(err) {
      if (status) { status.textContent = err.message || 'Não foi possível enviar.'; status.style.color = '#C16A4A'; }
    });
  },

  // ---------- Recibos do portal (lado da psicóloga) ----------
  _portalRecibosPacienteId: null,
  _portalRecibosPortalId: null,

  abrirRecibosPortal: function(id) {
    var p = this._pacientePorId(id);
    if (!p) return;
    if (!Backend || !Backend.configurado() || !Backend.conectado()) {
      app.toast('Entre na sua conta para ver os recibos.');
      return;
    }
    this._portalRecibosPacienteId = id;
    this._portalRecibosPortalId = null;
    var info = document.getElementById('portalRecibosPaciente');
    if (info) info.textContent = 'Paciente: ' + (p.nome || '');
    var lista = document.getElementById('portalRecibosProfLista');
    if (lista) lista.innerHTML = '<div class="portal-muted">Carregando...</div>';
    var status = document.getElementById('portalRecibosProfStatus');
    if (status) status.textContent = '';
    var input = document.getElementById('portalReciboArquivo');
    if (input) input.value = '';
    app.abrirModal('modalPortalRecibos');
    this._carregarRecibosPortal(p);
  },

  _portalRecibosMsg: function(texto, erro) {
    var el = document.getElementById('portalRecibosProfStatus');
    if (!el) return;
    el.textContent = texto || '';
    el.style.color = erro ? '#C16A4A' : 'var(--text-muted)';
  },

  _carregarRecibosPortal: function(paciente) {
    var self = this;
    this._buscarPortalId(paciente).then(function(portalId) {
      self._portalRecibosPortalId = portalId;
      if (!portalId) {
        var lista = document.getElementById('portalRecibosProfLista');
        if (lista) lista.innerHTML = '<div class="portal-muted">Este paciente ainda não tem portal. Envie um convite primeiro.</div>';
        return;
      }
      var url = Backend.base() + '/rest/v1/portal_recibos?select=id,nome,numero,codigo,criado_em&paciente_portal_id=eq.' +
        encodeURIComponent(portalId) + '&order=criado_em.desc&limit=50';
      return fetch(url, { headers: Backend.headers(true) })
        .then(function(r) { return Backend._resposta(r); })
        .then(function(itens) { self._renderRecibosProf(itens || []); });
    }).catch(function(err) {
      self._portalRecibosMsg(err.message || 'Não foi possível carregar os recibos.', true);
    });
  },

  _renderRecibosProf: function(itens) {
    var lista = document.getElementById('portalRecibosProfLista');
    if (!lista) return;
    if (!itens.length) {
      lista.innerHTML = '<div class="portal-muted">Nenhum recibo no portal ainda. Envie um PDF abaixo ou use o botão no comprovante.</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < itens.length; i++) {
      var r = itens[i];
      var quando = '';
      try { quando = new Date(r.criado_em).toLocaleDateString('pt-BR'); } catch (e) {}
      html += '<div style="display:flex;align-items:center;gap:.6rem;border:1px solid var(--border);' +
        'border-radius:10px;padding:10px;margin-bottom:8px;background:#F3F8F5;">' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-weight:800;word-break:break-all;">' + escapeHtml(r.nome || 'recibo.pdf') + '</div>' +
          '<div class="cell-sub">' + escapeHtml(quando) +
            (r.numero ? ' · ' + escapeHtml(r.numero) : '') +
            (r.codigo ? ' · Cód. ' + escapeHtml(r.codigo) : '') + '</div>' +
        '</div>' +
        '<button type="button" class="btn btn-outline btn-sm" onclick="pacientesModulo.baixarReciboPortal(\'' +
          escapeHtml(String(r.id)) + '\')">Baixar</button>' +
        '<button type="button" class="btn btn-outline btn-sm perigo" onclick="pacientesModulo.excluirReciboPortal(\'' +
          escapeHtml(String(r.id)) + '\')">Excluir</button>' +
        '</div>';
    }
    lista.innerHTML = html;
  },

  // Envia um PDF qualquer (por exemplo o recibo oficial da Receita) para o portal.
  guardarReciboPortal: function(input) {
    var arquivo = input && input.files && input.files[0];
    if (!arquivo) { this._portalRecibosMsg('Escolha um arquivo PDF antes de guardar.', true); return; }
    var nomeArquivo = String(arquivo.name || '');
    if (!/\.pdf$/i.test(nomeArquivo) && !/pdf/.test(String(arquivo.type || ''))) {
      this._portalRecibosMsg('Escolha um arquivo PDF.', true);
      return;
    }
    if (Number(arquivo.size || 0) > 2.5 * 1024 * 1024) {
      this._portalRecibosMsg('PDF muito grande. O limite é 2,5 MB.', true);
      return;
    }
    if (!this._portalRecibosPortalId) {
      this._portalRecibosMsg('Envie um convite ao paciente primeiro.', true);
      return;
    }

    var self = this;
    var portalId = this._portalRecibosPortalId;
    this._portalRecibosMsg('Guardando recibo...');
    var reader = new FileReader();
    reader.onload = function(ev) {
      var bruto = String((ev.target && ev.target.result) || '');
      var virgula = bruto.indexOf(',');
      var base64 = virgula >= 0 ? bruto.slice(virgula + 1) : bruto;
      fetch(Backend.base() + '/rest/v1/portal_recibos', {
        method: 'POST',
        headers: Backend.headers(true),
        body: JSON.stringify({
          paciente_portal_id: portalId,
          nome: nomeArquivo.slice(0, 120),
          numero: '',
          codigo: '',
          conteudo_base64: base64
        })
      }).then(function(r) { return Backend._resposta(r); }).then(function() {
        self._portalRecibosMsg('Recibo guardado no portal da paciente.');
        if (input) input.value = '';
        var p = self._pacientePorId(self._portalRecibosPacienteId);
        if (p) self._carregarRecibosPortal(p);
      }).catch(function(err) {
        self._portalRecibosMsg(err.message || 'Não foi possível guardar o recibo.', true);
      });
    };
    reader.onerror = function() { self._portalRecibosMsg('Não foi possível ler o arquivo.', true); };
    reader.readAsDataURL(arquivo);
  },

  baixarReciboPortal: function(id) {
    var self = this;
    if (!this._portalRecibosPortalId) return;
    var url = Backend.base() + '/rest/v1/portal_recibos?select=nome,conteudo_base64&id=eq.' +
      encodeURIComponent(id) + '&paciente_portal_id=eq.' +
      encodeURIComponent(this._portalRecibosPortalId) + '&limit=1';
    fetch(url, { headers: Backend.headers(true) })
      .then(function(r) { return Backend._resposta(r); })
      .then(function(linhas) {
        var item = linhas && linhas[0];
        if (!item) { app.toast('Recibo não encontrado.'); return; }
        self._baixarBase64(item.nome || 'recibo.pdf', item.conteudo_base64 || '');
      }).catch(function(err) { app.toast(err.message || 'Não foi possível baixar.'); });
  },

  excluirReciboPortal: function(id) {
    if (!this._portalRecibosPortalId) return;
    if (typeof confirm === 'function' && !confirm('Excluir este recibo do portal da paciente?')) return;
    var self = this;
    var url = Backend.base() + '/rest/v1/portal_recibos?id=eq.' + encodeURIComponent(id) +
      '&paciente_portal_id=eq.' + encodeURIComponent(this._portalRecibosPortalId);
    fetch(url, { method: 'DELETE', headers: Backend.headers(true) })
      .then(function(r) { return Backend._resposta(r); })
      .then(function() {
        app.toast('Recibo removido do portal.');
        var p = self._pacientePorId(self._portalRecibosPacienteId);
        if (p) self._carregarRecibosPortal(p);
      }).catch(function(err) { app.toast(err.message || 'Não foi possível excluir.'); });
  },

  _baixarBase64: function(nome, base64) {
    var binario = '';
    try { binario = atob(base64); } catch (e) { app.toast('Arquivo corrompido.'); return; }
    var bytes = new Uint8Array(binario.length);
    for (var i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i) & 0xFF;
    var blob = new Blob([bytes], { type: 'application/pdf' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = String(nome || 'recibo.pdf');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

};

// expõe globalmente para uso no HTML
window.pacientesModulo = pacientesModulo;

// reage à troca de convênio no formulário
(function setupCampoValorPaciente() {
  var sel = document.getElementById('pacFonte');
  if (sel) sel.addEventListener('change', atualizarCampoValorPaciente);
})();
